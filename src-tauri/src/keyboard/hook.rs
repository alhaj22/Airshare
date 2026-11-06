use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use log::info;

use crate::mouse::{get_current_active_screen, set_current_active_screen, ActiveScreen};
use crate::network::protocol::{KeyEventPayload, NetworkMessage};

#[cfg(windows)]
lazy_static::lazy_static! {
    static ref KB_HOOK_TX: std::sync::Mutex<Option<mpsc::UnboundedSender<NetworkMessage>>> = std::sync::Mutex::new(None);
    static ref SWITCH_BACK_TX: std::sync::Mutex<Option<mpsc::UnboundedSender<()>>> = std::sync::Mutex::new(None);
    static ref KB_ACTIVE_SCREEN: std::sync::RwLock<ActiveScreen> = std::sync::RwLock::new(ActiveScreen::Host);
}

pub fn set_keyboard_active_screen(screen: ActiveScreen) {
    #[cfg(windows)]
    {
        if let Ok(mut scr) = KB_ACTIVE_SCREEN.write() {
            *scr = screen;
        }
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

        #[cfg(windows)]
        {
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
        }

        std::thread::spawn(move || {
            #[cfg(windows)]
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
                            let mut sent = false;

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

                                    let ch = if is_down { vk_to_char(vk_code, shift_pressed) } else { None };

                                    if tx.send(NetworkMessage::KeyEvent(KeyEventPayload {
                                        key_code: vk_code,
                                        key_char: ch,
                                        state: if is_down { 1 } else { 0 },
                                        modifiers,
                                    })).is_ok() {
                                        sent = true;
                                    }
                                }
                            }

                            if sent {
                                return 1; // Block event from typing locally on host ONLY when transmitted
                            } else {
                                // Channel closed / disconnected: immediately restore typing locally on Windows!
                                set_current_active_screen(ActiveScreen::Host);
                            }
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
                while is_running.load(Ordering::SeqCst) && GetMessageW(&mut msg, 0, 0, 0) > 0 {
                    DispatchMessageW(&msg);
                }

                UnhookWindowsHookEx(hook);
            }
        });
    }

    pub fn stop(&self) {
        self.is_running.store(false, Ordering::SeqCst);
    }
}
