use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use log::info;

use crate::mouse::ActiveScreen;
use crate::network::protocol::{KeyEventPayload, NetworkMessage};

#[cfg(windows)]
lazy_static::lazy_static! {
    static ref KB_HOOK_TX: std::sync::Mutex<Option<mpsc::UnboundedSender<NetworkMessage>>> = std::sync::Mutex::new(None);
    static ref SWITCH_BACK_TX: std::sync::Mutex<Option<mpsc::UnboundedSender<()>>> = std::sync::Mutex::new(None);
    static ref KB_ACTIVE_SCREEN: std::sync::RwLock<ActiveScreen> = std::sync::RwLock::new(ActiveScreen::Host);
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
        #[cfg(windows)]
        {
            if let Ok(mut scr) = KB_ACTIVE_SCREEN.write() {
                *scr = screen;
            }
        }
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

                        // Emergency escape shortcut: Ctrl + Alt + Shift + Escape
                        if vk_code == VK_ESCAPE as u32 && is_down {
                            let ctrl = (GetAsyncKeyState(VK_CONTROL as i32) as u16 & 0x8000) != 0;
                            let alt = (GetAsyncKeyState(VK_MENU as i32) as u16 & 0x8000) != 0;
                            let shift = (GetAsyncKeyState(VK_SHIFT as i32) as u16 & 0x8000) != 0;

                            if ctrl && alt && shift {
                                info!("Emergency recall activated! Returning control to Host.");
                                if let Ok(mut scr) = KB_ACTIVE_SCREEN.write() {
                                    *scr = ActiveScreen::Host;
                                }
                                if let Ok(sw_guard) = SWITCH_BACK_TX.lock() {
                                    if let Some(sw_tx) = &*sw_guard {
                                        let _ = sw_tx.send(());
                                    }
                                }
                                return 1; // Swallow escape key
                            }
                        }

                        let active = KB_ACTIVE_SCREEN.read().map(|s| *s).unwrap_or(ActiveScreen::Host);

                        // If remote client is active: intercept all keystrokes and send them over network
                        if active == ActiveScreen::Client && (is_down || is_up) {
                            let mut modifiers: u8 = 0;
                            if (GetAsyncKeyState(VK_SHIFT as i32) as u16 & 0x8000) != 0 {
                                modifiers |= 1;
                            }
                            if (GetAsyncKeyState(VK_CONTROL as i32) as u16 & 0x8000) != 0 {
                                modifiers |= 2;
                            }
                            if (GetAsyncKeyState(VK_MENU as i32) as u16 & 0x8000) != 0 {
                                modifiers |= 4;
                            }

                            if let Ok(tx_guard) = KB_HOOK_TX.lock() {
                                if let Some(tx) = &*tx_guard {
                                    let _ = tx.send(NetworkMessage::KeyEvent(KeyEventPayload {
                                        key_code: vk_code,
                                        key_char: None,
                                        state: if is_down { 1 } else { 0 },
                                        modifiers,
                                    }));
                                }
                            }

                            return 1; // Block event from typing locally on host!
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
