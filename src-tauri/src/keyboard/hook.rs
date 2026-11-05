use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use log::info;

use crate::mouse::ActiveScreen;
use crate::network::protocol::{KeyEventPayload, NetworkMessage};

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

    pub fn start_hook(
        &self,
        network_tx: mpsc::UnboundedSender<NetworkMessage>,
        switch_back_tx: mpsc::UnboundedSender<()>,
    ) {
        self.is_running.store(true, Ordering::SeqCst);
        let is_running = self.is_running.clone();
        let active_screen = self.active_screen.clone();

        std::thread::spawn(move || {
            #[cfg(windows)]
            {
                use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
                    GetAsyncKeyState, VK_ESCAPE, VK_CONTROL, VK_MENU, VK_SHIFT
                };

                // Safety hotkey monitor: Ctrl + Alt + Shift + Escape triggers instant emergency recall
                while is_running.load(Ordering::SeqCst) {
                    unsafe {
                        let ctrl_down = (GetAsyncKeyState(VK_CONTROL as i32) as u16 & 0x8000) != 0;
                        let alt_down = (GetAsyncKeyState(VK_MENU as i32) as u16 & 0x8000) != 0;
                        let shift_down = (GetAsyncKeyState(VK_SHIFT as i32) as u16 & 0x8000) != 0;
                        let esc_down = (GetAsyncKeyState(VK_ESCAPE as i32) as u16 & 0x8000) != 0;

                        if ctrl_down && alt_down && shift_down && esc_down {
                            info!("Emergency shortcut (Ctrl+Alt+Shift+Esc) triggered! Returning control to Host.");
                            let _ = switch_back_tx.send(());
                            std::thread::sleep(std::time::Duration::from_millis(500));
                        }
                    }
                    std::thread::sleep(std::time::Duration::from_millis(15));
                }
            }
        });
    }

    pub fn stop(&self) {
        self.is_running.store(false, Ordering::SeqCst);
    }
}
