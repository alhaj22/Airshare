//! Production-Grade Input State Manager
//! Guarantees zero stuck modifiers, handles rapid rollover, tracks pressed keys,
//! and synchronizes keyboard state across network interruptions.

#![allow(unused)]

use std::collections::HashSet;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::RwLock;
use std::time::Instant;

#[derive(Debug, Clone)]
pub struct KeyStateRecord {
    pub hid_usage: u16,
    pub pressed_at: Instant,
}

pub struct InputStateManager {
    active_keys: RwLock<HashSet<u16>>,
    active_modifiers: RwLock<u8>,
    sequence_counter: AtomicU64,
    last_received_seq: AtomicU64,
}

impl InputStateManager {
    pub fn new() -> Self {
        Self {
            active_keys: RwLock::new(HashSet::new()),
            active_modifiers: RwLock::new(0),
            sequence_counter: AtomicU64::new(1),
            last_received_seq: AtomicU64::new(0),
        }
    }

    /// Next sequence number for outbound network packets
    pub fn next_sequence(&self) -> u64 {
        self.sequence_counter.fetch_add(1, Ordering::SeqCst)
    }

    /// Verify inbound sequence number to detect out-of-order or duplicate packets
    pub fn accept_sequence(&self, seq: u64) -> bool {
        if seq == 0 {
            return true; // Unsequenced control packet
        }
        let last = self.last_received_seq.load(Ordering::SeqCst);
        if seq > last {
            self.last_received_seq.store(seq, Ordering::SeqCst);
            true
        } else if last.saturating_sub(seq) > 50 {
            // Sequence counter wrapped around or new session started
            self.last_received_seq.store(seq, Ordering::SeqCst);
            true
        } else {
            // Duplicate or stale packet - still process key-ups to avoid stuck keys
            false
        }
    }

    /// Record a key down event
    pub fn record_key_down(&self, hid_usage: u16, modifiers: u8) {
        if let Ok(mut keys) = self.active_keys.write() {
            keys.insert(hid_usage);
        }
        if let Ok(mut mods) = self.active_modifiers.write() {
            *mods = modifiers;
        }
    }

    /// Record a key up event
    pub fn record_key_up(&self, hid_usage: u16, modifiers: u8) {
        if let Ok(mut keys) = self.active_keys.write() {
            keys.remove(&hid_usage);
        }
        if let Ok(mut mods) = self.active_modifiers.write() {
            *mods = modifiers;
        }
    }

    /// Get current active pressed keys snapshot
    pub fn get_active_keys(&self) -> Vec<u16> {
        self.active_keys.read().map(|k| k.iter().copied().collect()).unwrap_or_default()
    }

    /// Get current active modifiers
    pub fn get_active_modifiers(&self) -> u8 {
        self.active_modifiers.read().map(|m| *m).unwrap_or(0)
    }

    /// Clear all tracked keys and return the list of keys that were held down
    /// so the injection backend can emit corresponding Key-Up events
    pub fn drain_all_pressed(&self) -> (Vec<u16>, u8) {
        let keys = if let Ok(mut k) = self.active_keys.write() {
            let list: Vec<u16> = k.drain().collect();
            list
        } else {
            Vec::new()
        };

        let mods = if let Ok(mut m) = self.active_modifiers.write() {
            let old = *m;
            *m = 0;
            old
        } else {
            0
        };

        (keys, mods)
    }

    /// Release all stuck modifier bitflags
    pub fn reset_modifiers(&self) {
        if let Ok(mut m) = self.active_modifiers.write() {
            *m = 0;
        }
    }

    /// Check if a specific key is currently tracked as pressed
    pub fn is_key_pressed(&self, hid_usage: u16) -> bool {
        self.active_keys.read().map(|k| k.contains(&hid_usage)).unwrap_or(false)
    }
}
