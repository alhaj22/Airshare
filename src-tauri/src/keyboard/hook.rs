use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
#[allow(unused_imports)]
use log::info;

#[allow(unused_imports)]
use crate::mouse::{get_current_active_screen, set_current_active_screen, ActiveScreen};
#[allow(unused_imports)]
use crate::network::protocol::{KeyEventPayload, NetworkMessage};

lazy_static::lazy_static! {
    static ref KB_HOOK_TX: std::sync::Mutex<Option<mpsc::UnboundedSender<NetworkMessage>>> = std::sync::Mutex::new(None);
    static ref SWITCH_BACK_TX: std::sync::Mutex<Option<mpsc::UnboundedSender<()>>> = std::sync::Mutex::new(None);
    static ref KB_ACTIVE_SCREEN: std::sync::RwLock<ActiveScreen> = std::sync::RwLock::new(ActiveScreen::Host);
}

pub fn set_keyboard_active_screen(screen: ActiveScreen) {
    if let Ok(mut scr) = KB_ACTIVE_SCREEN.write() {
        *scr = screen;
    }
}

pub fn clear_keyboard_hook_sender() {
    if let Ok(mut tx) = KB_HOOK_TX.lock() {
        *tx = None;
    }
    if let Ok(mut sw) = SWITCH_BACK_TX.lock() {
        *sw = None;
    }
}

#[cfg(windows)]
fn vk_to_char(vk_code: u32, shift: bool) -> Option<String> {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
        GetKeyboardState, MapVirtualKeyW, ToUnicode, MAPVK_VK_TO_VSC,
    };
    unsafe {
        let mut key_state = [0u8; 256];
        GetKeyboardState(key_state.as_mut_ptr());
        if shift {
            key_state[0x10] = 0x80; // VK_SHIFT
        }
        let scan_code = MapVirtualKeyW(vk_code, MAPVK_VK_TO_VSC);
        let mut buff = [0u16; 8];
        let res = ToUnicode(
            vk_code,
            scan_code,
            key_state.as_ptr(),
            buff.as_mut_ptr(),
            buff.len() as i32,
            0,
        );
        if res > 0 {
            String::from_utf16(&buff[..res as usize]).ok()
        } else {
            None
        }
    }
}

pub struct KeyboardHookManager {
    is_running: Arc<AtomicBool>,
    active_screen: Arc<RwLock<ActiveScreen>>,
}

impl KeyboardHookManager {
    pub fn new(active_screen: Arc<RwLock<ActiveScreen>>) -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            active_screen,
        }
    }

    pub fn update_active_screen(&self, screen: ActiveScreen) {
        set_keyboard_active_screen(screen);
    }

    pub fn start_hook(
        &self,
        network_tx: mpsc::UnboundedSender<NetworkMessage>,
        switch_back_tx: mpsc::UnboundedSender<()>,
    ) {
        self.is_running.store(true, Ordering::SeqCst);
        let is_running = self.is_running.clone();

        if let Ok(mut tx) = KB_HOOK_TX.lock() {
            *tx = Some(network_tx);
        }
        if let Ok(mut sw_tx) = SWITCH_BACK_TX.lock() {
            *sw_tx = Some(switch_back_tx);
        }
        if let Ok(init_screen) = self.active_screen.try_read() {
            if let Ok(mut scr) = KB_ACTIVE_SCREEN.write() {
                *scr = *init_screen;
            }
        }

        #[cfg(windows)]
        {
            let running = is_running.clone();
            std::thread::spawn(move || {
                unsafe {
                    use windows_sys::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
                    use windows_sys::Win32::System::LibraryLoader::GetModuleHandleW;
                    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
                        GetAsyncKeyState, VK_CONTROL, VK_ESCAPE, VK_MENU, VK_SHIFT,
                    };
                    use windows_sys::Win32::UI::WindowsAndMessaging::{
                        CallNextHookEx, DispatchMessageW, GetMessageW, SetWindowsHookExW,
                        UnhookWindowsHookEx, KBDLLHOOKSTRUCT, MSG, WH_KEYBOARD_LL,
                        WM_KEYDOWN, WM_KEYUP, WM_SYSKEYDOWN, WM_SYSKEYUP,
                    };

                    unsafe extern "system" fn low_level_keyboard_proc(
                        n_code: i32,
                        w_param: WPARAM,
                        l_param: LPARAM,
                    ) -> LRESULT {
                        if n_code >= 0 {
                            let kb = *(l_param as *const KBDLLHOOKSTRUCT);
                            let vk_code = kb.vkCode;
                            let msg_type = w_param as u32;

                            let is_down = msg_type == WM_KEYDOWN || msg_type == WM_SYSKEYDOWN;
                            let is_up = msg_type == WM_KEYUP || msg_type == WM_SYSKEYUP;

                            // Emergency escape shortcut: Ctrl + Alt + Shift + Escape OR Ctrl + Alt + Escape OR Pause key
                            if (vk_code == VK_ESCAPE as u32 && is_down) || (vk_code == 0x13 && is_down) {
                                let ctrl = (GetAsyncKeyState(VK_CONTROL as i32) as u16 & 0x8000) != 0;
                                let alt = (GetAsyncKeyState(VK_MENU as i32) as u16 & 0x8000) != 0;

                                if (ctrl && alt) || vk_code == 0x13 {
                                    info!("Emergency recall activated! Returning control to Host.");
                                    set_current_active_screen(ActiveScreen::Host);
                                    if let Ok(sw_guard) = SWITCH_BACK_TX.lock() {
                                        if let Some(sw_tx) = &*sw_guard {
                                            let _ = sw_tx.send(());
                                        }
                                    }
                                    return 1; // Swallow escape/pause key
                                }
                            }

                            let active = get_current_active_screen();

                            // If remote client is active: intercept keystrokes and send them over network
                            if active == ActiveScreen::Client && (is_down || is_up) {
                                if let Ok(tx_guard) = KB_HOOK_TX.lock() {
                                    if let Some(tx) = &*tx_guard {
                                        let mut modifiers: u8 = 0;
                                        let shift_pressed = (GetAsyncKeyState(VK_SHIFT as i32) as u16 & 0x8000) != 0;
                                        if shift_pressed {
                                            modifiers |= 1;
                                        }
                                        if (GetAsyncKeyState(VK_CONTROL as i32) as u16 & 0x8000) != 0 {
                                            modifiers |= 2;
                                        }
                                        if (GetAsyncKeyState(VK_MENU as i32) as u16 & 0x8000) != 0 {
                                            modifiers |= 4;
                                        }
                                        if (GetAsyncKeyState(0x5B) as u16 & 0x8000) != 0 || (GetAsyncKeyState(0x5C) as u16 & 0x8000) != 0 {
                                            modifiers |= 8;
                                        }

                                        let ch = if is_down { vk_to_char(vk_code, shift_pressed) } else { None };

                                        let _ = tx.send(NetworkMessage::KeyEvent(KeyEventPayload {
                                            key_code: vk_code,
                                            key_char: ch,
                                            state: if is_down { 1 } else { 0 },
                                            modifiers,
                                        }));
                                        return 1; // Intercepted: swallow event from typing locally on Windows!
                                    }
                                }

                                // Channel closed / disconnected: immediately restore typing locally on Windows
                                set_current_active_screen(ActiveScreen::Host);
                            }
                        }

                        CallNextHookEx(0, n_code, w_param, l_param)
                    }

                    let hook = SetWindowsHookExW(
                        WH_KEYBOARD_LL,
                        Some(low_level_keyboard_proc),
                        GetModuleHandleW(std::ptr::null()),
                        0,
                    );

                    if hook == 0 {
                        log::error!("Failed to install low-level keyboard hook");
                        return;
                    }

                    let mut msg: MSG = std::mem::zeroed();
                    while running.load(Ordering::SeqCst) && GetMessageW(&mut msg, 0, 0, 0) > 0 {
                        DispatchMessageW(&msg);
                    }

                    UnhookWindowsHookEx(hook);
                }
            });
        }

        #[cfg(target_os = "macos")]
        {
            let running = is_running.clone();
            std::thread::spawn(move || {
                macos_keyboard::run_macos_keyboard_loop(running);
            });
        }
    }

    pub fn stop(&self) {
        self.is_running.store(false, Ordering::SeqCst);
    }
}

#[cfg(target_os = "macos")]
mod macos_keyboard {
    use std::os::raw::c_void;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Arc;
    use crate::mouse::{get_current_active_screen, set_current_active_screen, ActiveScreen};
    use crate::network::protocol::{KeyEventPayload, NetworkMessage};
    use super::{KB_HOOK_TX, SWITCH_BACK_TX};
    use crate::keyboard::simulator::mac_key_to_win_vk;

    pub type CGEventTapProxy = *mut c_void;
    pub type CGEventRef = *mut c_void;
    pub type CFMachPortRef = *mut c_void;
    pub type CFRunLoopSourceRef = *mut c_void;
    pub type CFRunLoopRef = *mut c_void;

    pub type CGEventTapCallback = extern "C" fn(
        proxy: CGEventTapProxy,
        event_type: u32,
        event: CGEventRef,
        refcon: *mut c_void,
    ) -> CGEventRef;

    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        pub fn CGEventTapCreate(
            tap: u32,
            place: u32,
            options: u32,
            eventsOfInterest: u64,
            callback: CGEventTapCallback,
            refcon: *mut c_void,
        ) -> CFMachPortRef;
        pub fn CGEventTapEnable(tap: CFMachPortRef, enable: bool);
        pub fn CGEventGetIntegerValueField(event: CGEventRef, field: u32) -> i64;
        pub fn CGEventGetFlags(event: CGEventRef) -> u64;
    }

    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        pub fn CFMachPortCreateRunLoopSource(
            allocator: *mut c_void,
            port: CFMachPortRef,
            order: isize,
        ) -> CFRunLoopSourceRef;
        pub fn CFRunLoopGetCurrent() -> CFRunLoopRef;
        pub fn CFRunLoopAddSource(rl: CFRunLoopRef, source: CFRunLoopSourceRef, mode: *const c_void);
        pub fn CFRunLoopRun();
        pub fn CFRelease(cf: *mut c_void);
        pub static kCFRunLoopCommonModes: *const c_void;
    }

    pub extern "C" fn keyboard_tap_proc(
        _proxy: CGEventTapProxy,
        event_type: u32,
        event: CGEventRef,
        _refcon: *mut c_void,
    ) -> CGEventRef {
        let mac_key = unsafe { CGEventGetIntegerValueField(event, 9 /* kCGKeyboardEventKeycode */) } as u16;
        let flags = unsafe { CGEventGetFlags(event) };

        let is_down = event_type == 10; // kCGEventKeyDown
        let is_up = event_type == 11;   // kCGEventKeyUp
        let is_flags = event_type == 12; // kCGEventFlagsChanged

        // Emergency escape: Escape (53) + Command (0x00100000) + Option (0x00080000)
        // OR Control (0x00040000) + Option (0x00080000) + Escape (53)
        if mac_key == 53 && (is_down || is_flags) {
            let cmd_or_ctrl = (flags & 0x00140000) != 0;
            let alt = (flags & 0x00080000) != 0;
            if cmd_or_ctrl && alt {
                log::info!("Emergency recall activated! Returning control to Host.");
                set_current_active_screen(ActiveScreen::Host);
                if let Ok(sw_guard) = SWITCH_BACK_TX.lock() {
                    if let Some(sw_tx) = &*sw_guard {
                        let _ = sw_tx.send(());
                    }
                }
                return std::ptr::null_mut(); // Swallow escape
            }
        }

        let active = get_current_active_screen();

        if active == ActiveScreen::Client {
            // Build cross-platform modifier bitmask
            // Bit 0: Shift
            // Bit 1: Cmd/Ctrl (Mac Command translates to Ctrl for Windows shortcuts!)
            // Bit 2: Option/Alt (Mac Option translates to Alt!)
            // Bit 3: Control/Win (Mac Control translates to Win key!)
            let mut modifiers: u8 = 0;
            if (flags & 0x00020000) != 0 {
                modifiers |= 1; // Shift
            }
            if (flags & 0x00100000) != 0 {
                modifiers |= 2; // Command -> Ctrl
            }
            if (flags & 0x00080000) != 0 {
                modifiers |= 4; // Option -> Alt
            }
            if (flags & 0x00040000) != 0 {
                modifiers |= 8; // Control -> Win
            }

            let vk = mac_key_to_win_vk(mac_key);

            if is_flags {
                let mod_down = match mac_key {
                    56 | 60 => (flags & 0x00020000) != 0, // Shift
                    55 | 54 => (flags & 0x00100000) != 0, // Command
                    58 | 61 => (flags & 0x00080000) != 0, // Option
                    59 | 62 => (flags & 0x00040000) != 0, // Control
                    _ => false,
                };

                if let Ok(tx_guard) = KB_HOOK_TX.lock() {
                    if let Some(tx) = &*tx_guard {
                        let _ = tx.send(NetworkMessage::KeyEvent(KeyEventPayload {
                            key_code: vk,
                            key_char: None,
                            state: if mod_down { 1 } else { 0 },
                            modifiers,
                        }));
                        return std::ptr::null_mut();
                    }
                }
            } else if is_down || is_up {
                if let Ok(tx_guard) = KB_HOOK_TX.lock() {
                    if let Some(tx) = &*tx_guard {
                        let _ = tx.send(NetworkMessage::KeyEvent(KeyEventPayload {
                            key_code: vk,
                            key_char: None,
                            state: if is_down { 1 } else { 0 },
                            modifiers,
                        }));
                        return std::ptr::null_mut();
                    }
                }
            }

            // Channel closed / disconnected
            set_current_active_screen(ActiveScreen::Host);
        }

        event
    }

    pub fn run_macos_keyboard_loop(is_running: Arc<AtomicBool>) {
        unsafe {
            let mask = (1 << 10)
                | (1 << 11)
                | (1 << 12);

            let tap = CGEventTapCreate(
                0,
                0,
                0,
                mask,
                keyboard_tap_proc,
                std::ptr::null_mut(),
            );

            if tap.is_null() {
                log::warn!("Failed to create macOS keyboard CGEventTap. Ensure Accessibility permissions are granted.");
                return;
            }

            let source = CFMachPortCreateRunLoopSource(std::ptr::null_mut(), tap, 0);
            if source.is_null() {
                CFRelease(tap);
                return;
            }

            let current_rl = CFRunLoopGetCurrent();
            CFRunLoopAddSource(current_rl, source, kCFRunLoopCommonModes);
            CGEventTapEnable(tap, true);

            while is_running.load(Ordering::SeqCst) {
                CFRunLoopRun();
                break;
            }

            CFRelease(source);
            CFRelease(tap);
        }
    }
}
