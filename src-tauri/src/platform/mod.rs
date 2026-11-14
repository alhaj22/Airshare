#![allow(dead_code)]
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OSKind {
    Windows,
    MacOS,
    Linux,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LinuxDisplayServer {
    X11,
    Wayland,
    None,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitorInfo {
    pub id: String,
    pub name: String,
    pub is_primary: bool,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub refresh_rate: u32,
    pub scale_factor: f32,
    pub orientation: String,
    pub manufacturer: String,
    pub model: String,
    pub serial_number: String,
    pub ddc_ci_supported: bool,
    pub current_brightness: Option<u32>,
    pub current_contrast: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyboardDeviceInfo {
    pub device_id: String,
    pub name: String,
    pub vendor_id: u16,
    pub product_id: u16,
    pub is_mac_keyboard: bool,
    pub layout_type: String, // ANSI, ISO, JIS, Standard
    pub connection_type: String, // USB, Bluetooth, WirelessDongle, Internal
    pub active_language_layout: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemHardwareMetrics {
    pub cpu_name: String,
    pub cpu_cores: u32,
    pub total_ram_mb: u64,
    pub available_ram_mb: u64,
    pub gpu_name: String,
    pub battery_percentage: Option<u8>,
    pub is_charging: Option<bool>,
    pub os_name: String,
    pub os_version: String,
    pub architecture: String,
    pub display_server: Option<String>,
}

pub fn detect_current_os() -> OSKind {
    if cfg!(windows) {
        OSKind::Windows
    } else if cfg!(target_os = "macos") {
        OSKind::MacOS
    } else if cfg!(target_os = "linux") {
        OSKind::Linux
    } else {
        OSKind::Unknown
    }
}

pub fn detect_linux_display_server() -> LinuxDisplayServer {
    if let Ok(val) = std::env::var("XDG_SESSION_TYPE") {
        match val.to_lowercase().as_str() {
            "wayland" => return LinuxDisplayServer::Wayland,
            "x11" => return LinuxDisplayServer::X11,
            _ => {}
        }
    }
    if std::env::var("WAYLAND_DISPLAY").is_ok() {
        return LinuxDisplayServer::Wayland;
    }
    if std::env::var("DISPLAY").is_ok() {
        return LinuxDisplayServer::X11;
    }
    LinuxDisplayServer::None
}

// Module re-exports
#[cfg(windows)]
pub mod windows;
#[cfg(target_os = "macos")]
pub mod macos;
#[cfg(target_os = "linux")]
pub mod linux;

// Fallback stubs for platforms when compiling on others
#[cfg(not(windows))]
pub mod windows {
    use super::*;
    pub fn get_monitors() -> Vec<MonitorInfo> { Vec::new() }
    pub fn set_brightness(_id: &str, _val: u32) -> Result<(), String> { Err("Not Windows".to_string()) }
    pub fn set_contrast(_id: &str, _val: u32) -> Result<(), String> { Err("Not Windows".to_string()) }
    pub fn set_input_source(_id: &str, _val: u32) -> Result<(), String> { Err("Not Windows".to_string()) }
    pub fn get_keyboards() -> Vec<KeyboardDeviceInfo> { Vec::new() }
    pub fn get_hardware() -> SystemHardwareMetrics {
        SystemHardwareMetrics {
            cpu_name: "Unknown".to_string(),
            cpu_cores: 1,
            total_ram_mb: 0,
            available_ram_mb: 0,
            gpu_name: "Unknown".to_string(),
            battery_percentage: None,
            is_charging: None,
            os_name: "Windows (Emulated)".to_string(),
            os_version: "".to_string(),
            architecture: "".to_string(),
            display_server: None,
        }
    }
}

#[cfg(not(target_os = "macos"))]
pub mod macos {
    use super::*;
    pub fn get_monitors() -> Vec<MonitorInfo> { Vec::new() }
    pub fn set_brightness(_id: &str, _val: u32) -> Result<(), String> { Err("Not macOS".to_string()) }
    pub fn set_contrast(_id: &str, _val: u32) -> Result<(), String> { Err("Not macOS".to_string()) }
    pub fn set_input_source(_id: &str, _val: u32) -> Result<(), String> { Err("Not macOS".to_string()) }
    pub fn get_keyboards() -> Vec<KeyboardDeviceInfo> { Vec::new() }
    pub fn get_hardware() -> SystemHardwareMetrics {
        SystemHardwareMetrics {
            cpu_name: "Unknown".to_string(),
            cpu_cores: 1,
            total_ram_mb: 0,
            available_ram_mb: 0,
            gpu_name: "Unknown".to_string(),
            battery_percentage: None,
            is_charging: None,
            os_name: "macOS (Emulated)".to_string(),
            os_version: "".to_string(),
            architecture: "".to_string(),
            display_server: None,
        }
    }
}

#[cfg(not(target_os = "linux"))]
pub mod linux {
    use super::*;
    pub fn get_monitors() -> Vec<MonitorInfo> { Vec::new() }
    pub fn set_brightness(_id: &str, _val: u32) -> Result<(), String> { Err("Not Linux".to_string()) }
    pub fn set_contrast(_id: &str, _val: u32) -> Result<(), String> { Err("Not Linux".to_string()) }
    pub fn set_input_source(_id: &str, _val: u32) -> Result<(), String> { Err("Not Linux".to_string()) }
    pub fn get_keyboards() -> Vec<KeyboardDeviceInfo> { Vec::new() }
    pub fn get_hardware() -> SystemHardwareMetrics {
        SystemHardwareMetrics {
            cpu_name: "Unknown".to_string(),
            cpu_cores: 1,
            total_ram_mb: 0,
            available_ram_mb: 0,
            gpu_name: "Unknown".to_string(),
            battery_percentage: None,
            is_charging: None,
            os_name: "Linux (Emulated)".to_string(),
            os_version: "".to_string(),
            architecture: "".to_string(),
            display_server: None,
        }
    }
}

pub fn get_all_monitors() -> Vec<MonitorInfo> {
    #[cfg(windows)]
    return windows::get_monitors();
    #[cfg(target_os = "macos")]
    return macos::get_monitors();
    #[cfg(target_os = "linux")]
    return linux::get_monitors();
    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    return Vec::new();
}

pub fn set_display_brightness(monitor_id: &str, val: u32) -> Result<(), String> {
    #[cfg(windows)]
    return windows::set_brightness(monitor_id, val);
    #[cfg(target_os = "macos")]
    return macos::set_brightness(monitor_id, val);
    #[cfg(target_os = "linux")]
    return linux::set_brightness(monitor_id, val);
    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    return Err("Unsupported OS".to_string());
}

pub fn set_display_contrast(monitor_id: &str, val: u32) -> Result<(), String> {
    #[cfg(windows)]
    return windows::set_contrast(monitor_id, val);
    #[cfg(target_os = "macos")]
    return macos::set_contrast(monitor_id, val);
    #[cfg(target_os = "linux")]
    return linux::set_contrast(monitor_id, val);
    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    return Err("Unsupported OS".to_string());
}

pub fn set_display_input_source(monitor_id: &str, source: u32) -> Result<(), String> {
    #[cfg(windows)]
    return windows::set_input_source(monitor_id, source);
    #[cfg(target_os = "macos")]
    return macos::set_input_source(monitor_id, source);
    #[cfg(target_os = "linux")]
    return linux::set_input_source(monitor_id, source);
    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    return Err("Unsupported OS".to_string());
}

pub fn get_all_keyboards() -> Vec<KeyboardDeviceInfo> {
    #[cfg(windows)]
    return windows::get_keyboards();
    #[cfg(target_os = "macos")]
    return macos::get_keyboards();
    #[cfg(target_os = "linux")]
    return linux::get_keyboards();
    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    return Vec::new();
}

pub fn get_hardware_metrics() -> SystemHardwareMetrics {
    #[cfg(windows)]
    return windows::get_hardware();
    #[cfg(target_os = "macos")]
    return macos::get_hardware();
    #[cfg(target_os = "linux")]
    return linux::get_hardware();
    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    return SystemHardwareMetrics {
        cpu_name: "Unknown".to_string(),
        cpu_cores: 1,
        total_ram_mb: 0,
        available_ram_mb: 0,
        gpu_name: "Unknown".to_string(),
        battery_percentage: None,
        is_charging: None,
        os_name: "Unknown".to_string(),
        os_version: "".to_string(),
        architecture: "".to_string(),
        display_server: None,
    };
}
