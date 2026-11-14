use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;
use log::{error, info};

use crate::network::protocol::{ClipboardSyncPayload, NetworkMessage};

fn calculate_hash(text: &str) -> u64 {
    let mut hasher = DefaultHasher::new();
    text.hash(&mut hasher);
    hasher.finish()
}

lazy_static::lazy_static! {
    static ref CLIPBOARD_LOCK: Mutex<()> = Mutex::new(());
    static ref CLIPBOARD_TX: Mutex<Option<mpsc::UnboundedSender<NetworkMessage>>> = Mutex::new(None);
}

pub struct ClipboardWatcher {
    is_running: Arc<AtomicBool>,
    last_hash: Arc<AtomicU64>,
}

impl ClipboardWatcher {
    pub fn new() -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            last_hash: Arc::new(AtomicU64::new(0)),
        }
    }

    pub fn start(&self, network_tx: mpsc::UnboundedSender<NetworkMessage>) {
        if let Ok(mut tx) = CLIPBOARD_TX.lock() {
            *tx = Some(network_tx);
        }

        // Idempotency: if the watcher thread is already running, updating the sender is sufficient.
        if self.is_running.swap(true, Ordering::SeqCst) {
            return;
        }

        let is_running = self.is_running.clone();
        let last_hash = self.last_hash.clone();

        std::thread::spawn(move || {
            // Give system time to settle
            std::thread::sleep(std::time::Duration::from_millis(1000));

            while is_running.load(Ordering::SeqCst) {
                {
                    let _lock = CLIPBOARD_LOCK.lock();
                    if let Ok(mut clipboard) = arboard::Clipboard::new() {
                        if let Ok(text) = clipboard.get_text() {
                            if !text.trim().is_empty() {
                                let hash = calculate_hash(&text);
                                let prev = last_hash.load(Ordering::SeqCst);
                                if hash != prev {
                                    last_hash.store(hash, Ordering::SeqCst);
                                    info!("Clipboard updated locally ({} chars). Syncing...", text.len());
                                    if let Ok(tx_guard) = CLIPBOARD_TX.lock() {
                                        if let Some(ref tx) = *tx_guard {
                                            let _ = tx.send(NetworkMessage::ClipboardSync(ClipboardSyncPayload {
                                                text,
                                                hash,
                                            }));
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Poll every 1000ms - gentle on OS clipboard daemon and avoiding NSPasteboard crashes
                std::thread::sleep(std::time::Duration::from_millis(1000));
            }

            info!("Clipboard watcher thread terminated gracefully.");
        });
    }

    pub async fn apply_incoming_text(&self, text: &str, hash: u64) {
        self.last_hash.store(hash, Ordering::SeqCst);
        let text_to_set = text.to_string();

        // Synchronize clipboard write to avoid concurrent access with watcher
        tokio::task::spawn_blocking(move || {
            let _lock = CLIPBOARD_LOCK.lock();
            if let Ok(mut clipboard) = arboard::Clipboard::new() {
                if let Err(e) = clipboard.set_text(text_to_set) {
                    error!("Failed to write to local clipboard: {}", e);
                } else {
                    info!("Clipboard updated from remote device");
                }
            }
        }).await.ok();
    }

    pub fn stop(&self) {
        if let Ok(mut tx) = CLIPBOARD_TX.lock() {
            *tx = None;
        }
    }
}
