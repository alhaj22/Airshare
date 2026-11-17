//! Universal HID Device Manager
//! Detects and tracks multiple connected USB, Bluetooth, 2.4GHz wireless, mechanical,
//! and gaming keyboards in real-time with full Usage Page and capabilities metadata.

#![allow(unused)]

use std::collections::HashMap;
use std::sync::RwLock;
use serde::{Deserialize, Serialize};

use super::gaming_adapters::{GamingDeviceAdapter, GamingKeyboardCapabilities};
use super::layout_engine::{KeyboardLayoutEngine, PhysicalLayoutType};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HidDeviceInfo {
    pub device_id: String,
    pub name: String,
    pub vendor_id: u16,
    pub product_id: u16,
    pub usage_page: u16,
    pub usage_id: u16,
    pub interface_number: i32,
    pub connection_type: String, // USB, Bluetooth, Wireless24G, Internal
    pub physical_layout: PhysicalLayoutType,
    pub is_mac_keyboard: bool,
    pub is_gaming_keyboard: bool,
    pub gaming_capabilities: Option<GamingKeyboardCapabilities>,
    pub active_language_layout: String,
    pub is_connected: bool,
}

pub struct HidDeviceManager {
    devices: RwLock<HashMap<String, HidDeviceInfo>>,
}

lazy_static::lazy_static! {
    pub static ref GLOBAL_HID_MANAGER: HidDeviceManager = HidDeviceManager::new();
}

impl HidDeviceManager {
    pub fn new() -> Self {
        Self {
            devices: RwLock::new(HashMap::new()),
        }
    }

    /// Update or register a detected HID keyboard device
    pub fn register_device(&self, dev: HidDeviceInfo) {
        if let Ok(mut map) = self.devices.write() {
            map.insert(dev.device_id.clone(), dev);
        }
    }

    /// Mark a device disconnected upon hot-unplug
    pub fn mark_disconnected(&self, device_id: &str) {
        if let Ok(mut map) = self.devices.write() {
            if let Some(dev) = map.get_mut(device_id) {
                dev.is_connected = false;
            }
        }
    }

    /// Get all currently connected keyboards
    pub fn get_connected_keyboards(&self) -> Vec<HidDeviceInfo> {
        if let Ok(map) = self.devices.read() {
            map.values()
                .filter(|d| d.is_connected)
                .cloned()
                .collect()
        } else {
            Vec::new()
        }
    }

    /// Get a specific device by its hardware ID
    pub fn get_device(&self, device_id: &str) -> Option<HidDeviceInfo> {
        self.devices.read().ok().and_then(|map| map.get(device_id).cloned())
    }

    /// Populate devices using native platform detection
    pub fn refresh_all_devices(&self) -> Vec<HidDeviceInfo> {
        let platform_devices = crate::platform::windows::get_keyboards();

        let mut enriched_list = Vec::new();
        for pd in platform_devices {
            let is_apple = pd.vendor_id == 0x05AC || pd.name.to_lowercase().contains("apple");
            let gaming_caps = GamingDeviceAdapter::identify_gaming_device(pd.vendor_id, pd.product_id, &pd.name);
            let is_gaming = gaming_caps.brand != super::gaming_adapters::GamingBrand::Standard;

            let physical_layout = KeyboardLayoutEngine::detect_physical_layout(
                &pd.name,
                &pd.active_language_layout,
                pd.layout_type == "ISO",
            );

            let hid_dev = HidDeviceInfo {
                device_id: pd.device_id.clone(),
                name: pd.name.clone(),
                vendor_id: pd.vendor_id,
                product_id: pd.product_id,
                usage_page: super::hid_types::HID_USAGE_PAGE_KEYBOARD,
                usage_id: 6, // Keyboard
                interface_number: 0,
                connection_type: pd.connection_type.clone(),
                physical_layout,
                is_mac_keyboard: is_apple,
                is_gaming_keyboard: is_gaming,
                gaming_capabilities: if is_gaming { Some(gaming_caps) } else { None },
                active_language_layout: pd.active_language_layout.clone(),
                is_connected: true,
            };

            self.register_device(hid_dev.clone());
            enriched_list.push(hid_dev);
        }

        enriched_list
    }
}
