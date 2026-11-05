use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use serde::{Deserialize, Serialize};
use log::info;

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

impl MouseEdgeMonitor {
    pub fn new(screen_width: u32, screen_height: u32) -> Self {
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
    }

    pub async fn get_active_screen(&self) -> ActiveScreen {
        *self.active_screen.read().await
    }

    pub async fn set_active_screen(&self, screen: ActiveScreen) {
        *self.active_screen.write().await = screen;
    }

    pub fn start_monitor(
        &self,
        network_tx: mpsc::UnboundedSender<NetworkMessage>,
        ui_event_tx: mpsc::UnboundedSender<String>,
    ) {
        self.is_running.store(true, Ordering::SeqCst);
        let is_running = self.is_running.clone();
        let arrangement_arc = self.arrangement.clone();
        let active_screen_arc = self.active_screen.clone();
        let screen_w = self.screen_width as i32;
        let screen_h = self.screen_height as i32;

        std::thread::spawn(move || {
            #[cfg(windows)]
            {
                use windows_sys::Win32::Foundation::POINT;
                use windows_sys::Win32::UI::WindowsAndMessaging::{GetCursorPos, SetCursorPos};

                let mut last_pos = POINT { x: 0, y: 0 };
                unsafe { GetCursorPos(&mut last_pos); }

                while is_running.load(Ordering::SeqCst) {
                    let mut current_pos = POINT { x: 0, y: 0 };
                    unsafe {
                        if GetCursorPos(&mut current_pos) != 0 {
                            let active = {
                                let rt = tokio::runtime::Handle::try_current();
                                match rt {
                                    Ok(h) => h.block_on(async { *active_screen_arc.read().await }),
                                    Err(_) => ActiveScreen::Host,
                                }
                            };

                            let arr = {
                                let rt = tokio::runtime::Handle::try_current();
                                match rt {
                                    Ok(h) => h.block_on(async { *arrangement_arc.read().await }),
                                    Err(_) => ScreenArrangement::HostLeftClientRight,
                                }
                            };

                            if active == ActiveScreen::Host {
                                // Check if mouse crossed edge towards Client
                                let crossed = match arr {
                                    ScreenArrangement::HostLeftClientRight => current_pos.x >= screen_w - 2,
                                    ScreenArrangement::HostRightClientLeft => current_pos.x <= 1,
                                    ScreenArrangement::HostTopClientBottom => current_pos.y >= screen_h - 2,
                                    ScreenArrangement::HostBottomClientTop => current_pos.y <= 1,
                                };

                                if crossed {
                                    let y_ratio = (current_pos.y as f32 / screen_h as f32).clamp(0.0, 1.0);
                                    info!("Cursor crossed boundary to Client! Y-ratio: {}", y_ratio);

                                    // Switch active screen to Client
                                    if let Ok(h) = tokio::runtime::Handle::try_current() {
                                        h.block_on(async {
                                            *active_screen_arc.write().await = ActiveScreen::Client;
                                        });
                                    }

                                    let _ = network_tx.send(NetworkMessage::SwitchScreen(SwitchScreenPayload {
                                        active_device: "client".to_string(),
                                        entry_y_ratio: y_ratio,
                                    }));
                                    let _ = ui_event_tx.send("active_screen:client".to_string());

                                    // Park cursor at boundary center
                                    SetCursorPos(screen_w / 2, screen_h / 2);
                                    last_pos.x = screen_w / 2;
                                    last_pos.y = screen_h / 2;
                                }
                            } else {
                                // Active screen is Client: capture local mouse movements as deltas and stream them
                                let dx = current_pos.x - last_pos.x;
                                let dy = current_pos.y - last_pos.y;

                                if dx != 0 || dy != 0 {
                                    let _ = network_tx.send(NetworkMessage::MouseMove(MouseMovePayload {
                                        dx,
                                        dy,
                                        abs_x: None,
                                        abs_y: None,
                                    }));

                                    // Keep host cursor pinned in center of host screen while controlling client
                                    SetCursorPos(screen_w / 2, screen_h / 2);
                                    last_pos.x = screen_w / 2;
                                    last_pos.y = screen_h / 2;
                                }
                            }
                        }
                    }

                    std::thread::sleep(std::time::Duration::from_millis(5));
                }
            }
        });
    }

    pub fn stop(&self) {
        self.is_running.store(false, Ordering::SeqCst);
    }
}
