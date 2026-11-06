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

#[cfg(windows)]
lazy_static::lazy_static! {
    static ref MOUSE_HOOK_TX: std::sync::Mutex<Option<mpsc::UnboundedSender<NetworkMessage>>> = std::sync::Mutex::new(None);
    static ref UI_EVENT_TX: std::sync::Mutex<Option<mpsc::UnboundedSender<String>>> = std::sync::Mutex::new(None);
    static ref CURRENT_ARRANGEMENT: std::sync::RwLock<ScreenArrangement> = std::sync::RwLock::new(ScreenArrangement::HostLeftClientRight);
    static ref CURRENT_ACTIVE_SCREEN: std::sync::RwLock<ActiveScreen> = std::sync::RwLock::new(ActiveScreen::Host);
    static ref SCREEN_DIMENSIONS: std::sync::RwLock<(i32, i32)> = std::sync::RwLock::new((1920, 1080));
    static ref LAST_CURSOR: std::sync::RwLock<(i32, i32)> = std::sync::RwLock::new((0, 0));
}

pub struct MouseEdgeMonitor {
    _screen_width: u32,
    _screen_height: u32,
    arrangement: Arc<RwLock<ScreenArrangement>>,
    active_screen: Arc<RwLock<ActiveScreen>>,
    is_running: Arc<AtomicBool>,
}

impl MouseEdgeMonitor {
    pub fn new(screen_width: u32, screen_height: u32) -> Self {
        #[cfg(windows)]
        {
            if let Ok(mut dims) = SCREEN_DIMENSIONS.write() {
                *dims = (screen_width as i32, screen_height as i32);
            }
        }

        Self {
            _screen_width: screen_width,
            _screen_height: screen_height,
            arrangement: Arc::new(RwLock::new(ScreenArrangement::HostLeftClientRight)),
            active_screen: Arc::new(RwLock::new(ActiveScreen::Host)),
            is_running: Arc::new(AtomicBool::new(false)),
        }
    }

    pub async fn set_arrangement(&self, arrangement: ScreenArrangement) {
        *self.arrangement.write().await = arrangement;
        #[cfg(windows)]
        {
            if let Ok(mut arr) = CURRENT_ARRANGEMENT.write() {
                *arr = arrangement;
            }
        }
    }

    pub async fn get_active_screen(&self) -> ActiveScreen {
        *self.active_screen.read().await
    }

    pub async fn set_active_screen(&self, screen: ActiveScreen) {
        *self.active_screen.write().await = screen;
        #[cfg(windows)]
        {
            if let Ok(mut scr) = CURRENT_ACTIVE_SCREEN.write() {
                *scr = screen;
            }
            if screen == ActiveScreen::Host {
                unsafe {
                    windows_sys::Win32::UI::WindowsAndMessaging::ClipCursor(std::ptr::null());
                }
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
        {
            if let Ok(mut tx) = MOUSE_HOOK_TX.lock() {
                *tx = Some(network_tx);
            }
            if let Ok(mut ui_tx) = UI_EVENT_TX.lock() {
                *ui_tx = Some(ui_event_tx);
            }
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

                        let active_screen = CURRENT_ACTIVE_SCREEN.read().map(|s| *s).unwrap_or(ActiveScreen::Host);
                        let arrangement = CURRENT_ARRANGEMENT.read().map(|a| *a).unwrap_or(ScreenArrangement::HostLeftClientRight);
                        let (screen_w, screen_h) = SCREEN_DIMENSIONS.read().map(|d| *d).unwrap_or((1920, 1080));

                        if active_screen == ActiveScreen::Host {
                            // Boundary detection
                            let crossed = match arrangement {
                                ScreenArrangement::HostLeftClientRight => x >= screen_w - 2,
                                ScreenArrangement::HostRightClientLeft => x <= 1,
                                ScreenArrangement::HostTopClientBottom => y >= screen_h - 2,
                                ScreenArrangement::HostBottomClientTop => y <= 1,
                            };

                            if crossed {
                                let y_ratio = (y as f32 / screen_h as f32).clamp(0.0, 1.0);
                                if let Ok(mut s) = CURRENT_ACTIVE_SCREEN.write() {
                                    *s = ActiveScreen::Client;
                                }
                                if let Ok(mut last) = LAST_CURSOR.write() {
                                    *last = (x, y);
                                }

                                if let Ok(tx_guard) = MOUSE_HOOK_TX.lock() {
                                    if let Some(tx) = &*tx_guard {
                                        let _ = tx.send(NetworkMessage::SwitchScreen(SwitchScreenPayload {
                                            active_device: "client".to_string(),
                                            entry_y_ratio: y_ratio,
                                        }));
                                    }
                                }

                                if let Ok(ui_guard) = UI_EVENT_TX.lock() {
                                    if let Some(ui_tx) = &*ui_guard {
                                        let _ = ui_tx.send("active_screen:client".to_string());
                                    }
                                }

                                return 1; // Suppress event on host
                            }
                        } else {
                            // Client is active: stream events and swallow locally
                            let (last_x, last_y) = LAST_CURSOR.read().map(|l| *l).unwrap_or((0, 0));

                            if let Ok(tx_guard) = MOUSE_HOOK_TX.lock() {
                                if let Some(tx) = &*tx_guard {
                                    match w_param as u32 {
                                        WM_MOUSEMOVE => {
                                            let dx = x - last_x;
                                            let dy = y - last_y;
                                            if dx != 0 || dy != 0 {
                                                let _ = tx.send(NetworkMessage::MouseMove(MouseMovePayload {
                                                    dx,
                                                    dy,
                                                    abs_x: None,
                                                    abs_y: None,
                                                }));
                                            }
                                            if let Ok(mut last) = LAST_CURSOR.write() {
                                                *last = (x, y);
                                            }
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
