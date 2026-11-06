use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use log::{error, info};

use crate::network::protocol::{ClipboardSyncPayload, NetworkMessage};

fn calculate_hash(text: &str) -> u64 {
    let mut hasher = DefaultHasher::new();
    text.hash(&mut hasher);
    hasher.finish()
}

pub struct ClipboardWatcher {
    is_running: Arc<AtomicBool>,
    last_hash: Arc<RwLock<u64>>,
}

impl ClipboardWatcher {
    pub fn new() -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            last_hash: Arc::new(RwLock::new(0)),
        }
    }

    pub fn start(&self, network_tx: mpsc::UnboundedSender<NetworkMessage>) {
        self.is_running.store(true, Ordering::SeqCst);
        let is_running = self.is_running.clone();
        let last_hash = self.last_hash.clone();

        std::thread::spawn(move || {
            let mut clipboard = match arboard::Clipboard::new() {
                Ok(cb) => cb,
                Err(e) => {
                    error!("Failed to initialize clipboard watcher: {}", e);
                    return;
                }
            };

            while is_running.load(Ordering::SeqCst) {
                if let Ok(text) = clipboard.get_text() {
                    let hash = calculate_hash(&text);
                    let current_hash = {
                        let rt = tokio::runtime::Handle::try_current();
                        match rt {
                            Ok(h) => h.block_on(async { *last_hash.read().await }),
                            Err(_) => 0,
                        }
                    };

                    if hash != current_hash && !text.trim().is_empty() {
                        if let Ok(h) = tokio::runtime::Handle::try_current() {
                            h.block_on(async {
                                *last_hash.write().await = hash;
                            });
                        }

                        info!("Clipboard updated locally. Syncing {} characters...", text.len());
                        let _ = network_tx.send(NetworkMessage::ClipboardSync(ClipboardSyncPayload {
                            text,
                            hash,
                        }));
                    }
                }

                std::thread::sleep(std::time::Duration::from_millis(500));
            }
        });
    }

    pub async fn apply_incoming_text(&self, text: &str, hash: u64) {
        *self.last_hash.write().await = hash;
        if let Ok(mut clipboard) = arboard::Clipboard::new() {
            if let Err(e) = clipboard.set_text(text.to_string()) {
                error!("Failed to write to local clipboard: {}", e);
            } else {
                info!("Clipboard updated from remote device ({} chars)", text.len());
            }
        }
    }

    pub fn stop(&self) {
        self.is_running.store(false, Ordering::SeqCst);
    }
}
