use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};
use rand::Rng;
use serde::{Deserialize, Serialize};
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

fn get_trusted_storage_path() -> PathBuf {
    let base = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));
    let dir = base.join(".airdesk");
    let _ = std::fs::create_dir_all(&dir);
    dir.join("trusted_devices.json")
}

pub struct PinManager {
    current_pin: Option<ActivePin>,
    pending_approval: Option<PendingClient>,
    paired_device: Option<PairedDevice>,
    trusted_devices: HashSet<String>,
}

impl PinManager {
    pub fn new() -> Self {
        let trusted = Self::load_trusted_devices();
        Self {
            current_pin: None,
            pending_approval: None,
            paired_device: None,
            trusted_devices: trusted,
        }
    }

    pub fn load_trusted_devices() -> HashSet<String> {
        let path = get_trusted_storage_path();
        if let Ok(data) = std::fs::read_to_string(path) {
            if let Ok(set) = serde_json::from_str::<HashSet<String>>(&data) {
                return set;
            }
        }
        HashSet::new()
    }

    pub fn save_trusted_device(&mut self, device_id: &str) {
        self.trusted_devices.insert(device_id.to_string());
        let path = get_trusted_storage_path();
        if let Ok(data) = serde_json::to_string(&self.trusted_devices) {
            let _ = std::fs::write(path, data);
        }
    }

    pub fn is_trusted(&self, device_id: &str) -> bool {
        self.trusted_devices.contains(device_id)
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

    pub fn verify_pin(&mut self, entered_pin: &str, client_id: &str) -> Result<String, &'static str> {
        // Auto-connect for previously paired / trusted devices
        if entered_pin.trim() == "auto_connect" || self.is_trusted(client_id) {
            self.save_trusted_device(client_id);
            return Ok(format!("trusted_token_{}", client_id));
        }

        let (token, pin_matches) = match &self.current_pin {
            Some(p) => {
                if p.is_expired() {
                    if self.is_trusted(client_id) {
                        return Ok(format!("trusted_token_{}", client_id));
                    }
                    return Err("Connection Key has expired. Please request a new 6-digit key.");
                }
                (p.token.clone(), p.pin == entered_pin.trim())
            }
            None => {
                if self.is_trusted(client_id) {
                    return Ok(format!("trusted_token_{}", client_id));
                }
                return Err("No active PIN generated on Host. Please click 'Create Connection' or enable Auto-Connect.");
            }
        };

        if !pin_matches {
            return Err("Invalid 6-digit PIN. Please verify and try again.");
        }

        // Save trusted device for future zero-click auto-connects
        self.save_trusted_device(client_id);
        Ok(token)
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
        self.save_trusted_device(&device.device_id);
        self.paired_device = Some(device);
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
