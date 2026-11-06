use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use serde::{Deserialize, Serialize};

use crate::network::protocol::{MouseButtonPayload, MouseMovePayload, MouseWheelPayload, NetworkMessage, SwitchScreenPayload};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ScreenArrangement {
    HostLeftClientRight,
    HostRightClientLeft,
    HostTopClientBottom,
    HostBottomClientTop,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActiveScreen {
    Host,
    Client,
}

pub struct MouseEdgeMonitor {
    screen_width: u32,
    screen_height: u32,
    arrangement: Arc<RwLock<ScreenArrangement>>,
    active_screen: Arc<RwLock<ActiveScreen>>,
    is_running: Arc<AtomicBool>,
}

#[cfg(windows)]
static mut MOUSE_HOOK_TX: Option<mpsc::UnboundedSender<NetworkMessage>> = None;
#[cfg(windows)]
static mut UI_EVENT_TX: Option<mpsc::UnboundedSender<String>> = None;
#[cfg(windows)]
static mut CURRENT_ARRANGEMENT: ScreenArrangement = ScreenArrangement::HostLeftClientRight;
#[cfg(windows)]
static mut CURRENT_ACTIVE_SCREEN: ActiveScreen = ActiveScreen::Host;
#[cfg(windows)]
static mut SCREEN_W: i32 = 1920;
#[cfg(windows)]
static mut SCREEN_H: i32 = 1080;
#[cfg(windows)]
static mut LAST_CURSOR_X: i32 = 0;
#[cfg(windows)]
static mut LAST_CURSOR_Y: i32 = 0;

impl MouseEdgeMonitor {
    pub fn new(screen_width: u32, screen_height: u32) -> Self {
        #[cfg(windows)]
        unsafe {
            SCREEN_W = screen_width as i32;
            SCREEN_H = screen_height as i32;
        }

        Self {
            screen_width,
            screen_height,
            arrangement: Arc::new(RwLock::new(ScreenArrangement::HostLeftClientRight)),
            active_screen: Arc::new(RwLock::new(ActiveScreen::Host)),
            is_running: Arc::new(AtomicBool::new(false)),
        }
    }

    pub async fn set_arrangement(&self, arrangement: ScreenArrangement) {
        *self.arrangement.write().await = arrangement;
        #[cfg(windows)]
        unsafe {
            CURRENT_ARRANGEMENT = arrangement;
        }
    }

    pub async fn get_active_screen(&self) -> ActiveScreen {
        *self.active_screen.read().await
    }

    pub async fn set_active_screen(&self, screen: ActiveScreen) {
        *self.active_screen.write().await = screen;
        #[cfg(windows)]
        unsafe {
            CURRENT_ACTIVE_SCREEN = screen;
            if screen == ActiveScreen::Host {
                // Unpark host cursor
                windows_sys::Win32::UI::WindowsAndMessaging::ClipCursor(std::ptr::null());
            }
        }
    }

    pub fn start_monitor(
        &self,
        network_tx: mpsc::UnboundedSender<NetworkMessage>,
        ui_event_tx: mpsc::UnboundedSender<String>,
    ) {
        self.is_running.store(true, Ordering::SeqCst);
        let is_running = self.is_running.clone();

        #[cfg(windows)]
        unsafe {
            MOUSE_HOOK_TX = Some(network_tx);
            UI_EVENT_TX = Some(ui_event_tx);
            CURRENT_ARRANGEMENT = *self.arrangement.blocking_read();
            CURRENT_ACTIVE_SCREEN = *self.active_screen.blocking_read();
        }

        std::thread::spawn(move || {
            #[cfg(windows)]
            unsafe {
                use windows_sys::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
                use windows_sys::Win32::System::LibraryLoader::GetModuleHandleW;
                use windows_sys::Win32::UI::WindowsAndMessaging::{
                    CallNextHookEx, DispatchMessageW, GetMessageW, SetWindowsHookExW,
                    UnhookWindowsHookEx, MSG, MSLLHOOKSTRUCT, WH_MOUSE_LL,
                    WM_LBUTTONDOWN, WM_LBUTTONUP, WM_MBUTTONDOWN, WM_MBUTTONUP,
                    WM_MOUSEMOVE, WM_MOUSEWHEEL, WM_RBUTTONDOWN, WM_RBUTTONUP,
                };

                unsafe extern "system" fn low_level_mouse_proc(
                    n_code: i32,
                    w_param: WPARAM,
                    l_param: LPARAM,
                ) -> LRESULT {
                    if n_code >= 0 {
                        let ms = *(l_param as *const MSLLHOOKSTRUCT);
                        let x = ms.pt.x;
                        let y = ms.pt.y;

                        if CURRENT_ACTIVE_SCREEN == ActiveScreen::Host {
                            // Boundary detection
                            let crossed = match CURRENT_ARRANGEMENT {
                                ScreenArrangement::HostLeftClientRight => x >= SCREEN_W - 2,
                                ScreenArrangement::HostRightClientLeft => x <= 1,
                                ScreenArrangement::HostTopClientBottom => y >= SCREEN_H - 2,
                                ScreenArrangement::HostBottomClientTop => y <= 1,
                            };

                            if crossed {
                                let y_ratio = (y as f32 / SCREEN_H as f32).clamp(0.0, 1.0);
                                CURRENT_ACTIVE_SCREEN = ActiveScreen::Client;
                                LAST_CURSOR_X = x;
                                LAST_CURSOR_Y = y;

                                if let Some(tx) = &MOUSE_HOOK_TX {
                                    let _ = tx.send(NetworkMessage::SwitchScreen(SwitchScreenPayload {
                                        active_device: "client".to_string(),
                                        entry_y_ratio: y_ratio,
                                    }));
                                }

                                if let Some(ui_tx) = &UI_EVENT_TX {
                                    let _ = ui_tx.send("active_screen:client".to_string());
                                }

                                return 1; // Suppress event on host
                            }
                        } else {
                            // Client is active: stream events and swallow locally
                            if let Some(tx) = &MOUSE_HOOK_TX {
                                match w_param as u32 {
                                    WM_MOUSEMOVE => {
                                        let dx = x - LAST_CURSOR_X;
                                        let dy = y - LAST_CURSOR_Y;
                                        if dx != 0 || dy != 0 {
                                            let _ = tx.send(NetworkMessage::MouseMove(MouseMovePayload {
                                                dx,
                                                dy,
                                                abs_x: None,
                                                abs_y: None,
                                            }));
                                        }
                                        LAST_CURSOR_X = x;
                                        LAST_CURSOR_Y = y;
                                        return 1;
                                    }
                                    WM_LBUTTONDOWN => {
                                        let _ = tx.send(NetworkMessage::MouseButton(MouseButtonPayload { button: 0, state: 1 }));
                                        return 1;
                                    }
                                    WM_LBUTTONUP => {
                                        let _ = tx.send(NetworkMessage::MouseButton(MouseButtonPayload { button: 0, state: 0 }));
                                        return 1;
                                    }
                                    WM_RBUTTONDOWN => {
                                        let _ = tx.send(NetworkMessage::MouseButton(MouseButtonPayload { button: 1, state: 1 }));
                                        return 1;
                                    }
                                    WM_RBUTTONUP => {
                                        let _ = tx.send(NetworkMessage::MouseButton(MouseButtonPayload { button: 1, state: 0 }));
                                        return 1;
                                    }
                                    WM_MBUTTONDOWN => {
                                        let _ = tx.send(NetworkMessage::MouseButton(MouseButtonPayload { button: 2, state: 1 }));
                                        return 1;
                                    }
                                    WM_MBUTTONUP => {
                                        let _ = tx.send(NetworkMessage::MouseButton(MouseButtonPayload { button: 2, state: 0 }));
                                        return 1;
                                    }
                                    WM_MOUSEWHEEL => {
                                        let delta = ((ms.mouseData >> 16) as i16 as i32) / 120;
                                        let _ = tx.send(NetworkMessage::MouseWheel(MouseWheelPayload { delta_x: 0, delta_y: delta }));
                                        return 1;
                                    }
                                    _ => {}
                                }
                            }
                        }
                    }

                    CallNextHookEx(0, n_code, w_param, l_param)
                }

                let hook = SetWindowsHookExW(
                    WH_MOUSE_LL,
                    Some(low_level_mouse_proc),
                    GetModuleHandleW(std::ptr::null()),
                    0,
                );

                if hook == 0 {
                    log::error!("Failed to install low-level mouse hook");
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
