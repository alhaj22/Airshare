use std::time::{Duration, Instant};
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;

pub const PIN_VALIDITY_SECONDS: u64 = 300; // 5 minutes

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingClient {
    pub client_id: String,
    pub device_name: String,
    pub os: String,
    pub ip: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairedDevice {
    pub device_id: String,
    pub device_name: String,
    pub os: String,
    pub ip: String,
    pub paired_at: u64,
    pub token: String,
}

#[derive(Debug, Clone)]
pub struct ActivePin {
    pub pin: String,
    pub created_at: Instant,
    pub duration: Duration,
    pub token: String,
}

impl ActivePin {
    pub fn is_expired(&self) -> bool {
        self.created_at.elapsed() >= self.duration
    }

    pub fn remaining_seconds(&self) -> u64 {
        let elapsed = self.created_at.elapsed();
        if elapsed >= self.duration {
            0
        } else {
            (self.duration - elapsed).as_secs()
        }
    }
}

pub struct PinManager {
    current_pin: Option<ActivePin>,
    pending_approval: Option<PendingClient>,
    paired_device: Option<PairedDevice>,
}

impl PinManager {
    pub fn new() -> Self {
        Self {
            current_pin: None,
            pending_approval: None,
            paired_device: None,
        }
    }

    pub fn generate_new_pin(&mut self) -> (String, u64) {
        let mut rng = rand::thread_rng();
        let pin_num: u32 = rng.gen_range(100_000..999_999);
        let pin_str = pin_num.to_string();

        let token: String = (0..32)
            .map(|_| {
                let idx = rng.gen_range(0..16);
                b"0123456789abcdef"[idx] as char
            })
            .collect();

        let pin_entry = ActivePin {
            pin: pin_str.clone(),
            created_at: Instant::now(),
            duration: Duration::from_secs(PIN_VALIDITY_SECONDS),
            token,
        };

        self.current_pin = Some(pin_entry);
        self.pending_approval = None;
        (pin_str, PIN_VALIDITY_SECONDS)
    }

    pub fn verify_pin(&self, entered_pin: &str) -> Result<String, &'static str> {
        let active = match &self.current_pin {
            Some(p) => p,
            None => return Err("No active PIN generated on Host. Please click 'Create Connection'."),
        };

        if active.is_expired() {
            return Err("Connection Key has expired. Please request a new 6-digit key.");
        }

        if active.pin != entered_pin.trim() {
            return Err("Invalid 6-digit PIN. Please verify and try again.");
        }

        Ok(active.token.clone())
    }

    pub fn set_pending_client(&mut self, client: PendingClient) {
        self.pending_approval = Some(client);
    }

    pub fn get_pending_client(&self) -> Option<PendingClient> {
        self.pending_approval.clone()
    }

    pub fn clear_pending_client(&mut self) {
        self.pending_approval = None;
    }

    pub fn set_paired_device(&mut self, device: PairedDevice) {
        self.paired_device = Some(device);
        // Clear active PIN once successfully paired to prevent reuse
        self.current_pin = None;
        self.pending_approval = None;
    }

    pub fn get_paired_device(&self) -> Option<PairedDevice> {
        self.paired_device.clone()
    }

    pub fn disconnect(&mut self) {
        self.current_pin = None;
        self.pending_approval = None;
        self.paired_device = None;
    }

    pub fn get_current_pin_info(&self) -> Option<(String, u64)> {
        if let Some(active) = &self.current_pin {
            if !active.is_expired() {
                return Some((active.pin.clone(), active.remaining_seconds()));
            }
        }
        None
    }
}

pub type SharedPinManager = Arc<RwLock<PinManager>>;

pub fn create_shared_pin_manager() -> SharedPinManager {
    Arc::new(RwLock::new(PinManager::new()))
}
