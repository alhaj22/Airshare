//! Gaming Keyboard Adapter Layer
//! Extensible hardware adapters for gaming keyboards (Logitech, Razer, Corsair, SteelSeries, HyperX, Redragon, Keychron)
//! Manages high-polling rates (1000Hz - 8000Hz), N-Key Rollover (NKRO), dedicated macro keys,
//! volume rollers, and a dedicated RGB lighting subsystem.

#![allow(unused)]

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GamingBrand {
    LogitechG,
    Razer,
    Corsair,
    SteelSeries,
    HyperX,
    Redragon,
    Keychron,
    Standard,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GamingKeyboardCapabilities {
    pub brand: GamingBrand,
    pub model_name: String,
    pub vendor_id: u16,
    pub product_id: u16,
    pub supports_nkro: bool,
    pub max_polling_rate_hz: u32,
    pub has_dedicated_macro_keys: bool,
    pub macro_key_count: u8,
    pub has_volume_wheel: bool,
    pub has_rgb_subsystem: bool,
    pub rgb_protocol: Option<String>,
    pub onboard_profiles_supported: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RgbLightingMode {
    Off,
    StaticColor { r: u8, g: u8, b: u8 },
    Breathing { r: u8, g: u8, b: u8, speed: u8 },
    RainbowWave { speed: u8 },
    Reactive { r: u8, g: u8, b: u8 },
}

pub struct GamingDeviceAdapter;

impl GamingDeviceAdapter {
    /// Inspect VID, PID, and interface descriptors to detect gaming hardware capabilities
    pub fn identify_gaming_device(vid: u16, pid: u16, product_name: &str) -> GamingKeyboardCapabilities {
        let name_lower = product_name.to_lowercase();

        // 1. Logitech G (VID: 0x046D)
        if vid == 0x046D || name_lower.contains("logitech g") || name_lower.contains("g915") || name_lower.contains("g815") || name_lower.contains("g pro") {
            let has_macros = name_lower.contains("g915") || name_lower.contains("g815") || name_lower.contains("g510") || name_lower.contains("g710");
            let has_wheel = name_lower.contains("g915") || name_lower.contains("g815") || name_lower.contains("g512") || name_lower.contains("g810");

            return GamingKeyboardCapabilities {
                brand: GamingBrand::LogitechG,
                model_name: if product_name.is_empty() { "Logitech G Gaming Keyboard".to_string() } else { product_name.to_string() },
                vendor_id: vid,
                product_id: pid,
                supports_nkro: true,
                max_polling_rate_hz: 1000,
                has_dedicated_macro_keys: has_macros,
                macro_key_count: if has_macros { 5 } else { 0 },
                has_volume_wheel: has_wheel,
                has_rgb_subsystem: true,
                rgb_protocol: Some("logitech_hidpp20".to_string()),
                onboard_profiles_supported: true,
            };
        }

        // 2. Razer (VID: 0x1532)
        if vid == 0x1532 || name_lower.contains("razer") || name_lower.contains("blackwidow") || name_lower.contains("huntsman") {
            let is_huntsman = name_lower.contains("huntsman");
            return GamingKeyboardCapabilities {
                brand: GamingBrand::Razer,
                model_name: if product_name.is_empty() { "Razer Chroma Keyboard".to_string() } else { product_name.to_string() },
                vendor_id: vid,
                product_id: pid,
                supports_nkro: true,
                max_polling_rate_hz: if is_huntsman { 8000 } else { 1000 },
                has_dedicated_macro_keys: name_lower.contains("blackwidow v4") || name_lower.contains("chroma v2"),
                macro_key_count: 5,
                has_volume_wheel: true,
                has_rgb_subsystem: true,
                rgb_protocol: Some("razer_chroma".to_string()),
                onboard_profiles_supported: true,
            };
        }

        // 3. Corsair (VID: 0x1B1C)
        if vid == 0x1B1C || name_lower.contains("corsair") || name_lower.contains("k70") || name_lower.contains("k95") || name_lower.contains("k100") {
            let is_k100 = name_lower.contains("k100");
            let has_gkeys = name_lower.contains("k95") || name_lower.contains("k100");
            return GamingKeyboardCapabilities {
                brand: GamingBrand::Corsair,
                model_name: if product_name.is_empty() { "Corsair Gaming Keyboard".to_string() } else { product_name.to_string() },
                vendor_id: vid,
                product_id: pid,
                supports_nkro: true,
                max_polling_rate_hz: if is_k100 { 8000 } else { 1000 },
                has_dedicated_macro_keys: has_gkeys,
                macro_key_count: if has_gkeys { 6 } else { 0 },
                has_volume_wheel: true,
                has_rgb_subsystem: true,
                rgb_protocol: Some("corsair_cue".to_string()),
                onboard_profiles_supported: true,
            };
        }

        // 4. SteelSeries (VID: 0x1038)
        if vid == 0x1038 || name_lower.contains("steelseries") || name_lower.contains("apex") {
            return GamingKeyboardCapabilities {
                brand: GamingBrand::SteelSeries,
                model_name: if product_name.is_empty() { "SteelSeries Apex Keyboard".to_string() } else { product_name.to_string() },
                vendor_id: vid,
                product_id: pid,
                supports_nkro: true,
                max_polling_rate_hz: 1000,
                has_dedicated_macro_keys: false,
                macro_key_count: 0,
                has_volume_wheel: true,
                has_rgb_subsystem: true,
                rgb_protocol: Some("steelseries_engine".to_string()),
                onboard_profiles_supported: true,
            };
        }

        // 5. Keychron QMK/VIA (VID: 0x3434)
        if vid == 0x3434 || name_lower.contains("keychron") {
            return GamingKeyboardCapabilities {
                brand: GamingBrand::Keychron,
                model_name: if product_name.is_empty() { "Keychron Mechanical Keyboard".to_string() } else { product_name.to_string() },
                vendor_id: vid,
                product_id: pid,
                supports_nkro: true,
                max_polling_rate_hz: 1000,
                has_dedicated_macro_keys: false,
                macro_key_count: 0,
                has_volume_wheel: name_lower.contains("knob"),
                has_rgb_subsystem: true,
                rgb_protocol: Some("qmk_via_rawhid".to_string()),
                onboard_profiles_supported: true,
            };
        }

        // 6. HyperX (VID: 0x0951 or 0x03F0)
        if (vid == 0x0951 || vid == 0x03F0) && (name_lower.contains("hyperx") || name_lower.contains("alloy")) {
            return GamingKeyboardCapabilities {
                brand: GamingBrand::HyperX,
                model_name: if product_name.is_empty() { "HyperX Alloy Keyboard".to_string() } else { product_name.to_string() },
                vendor_id: vid,
                product_id: pid,
                supports_nkro: true,
                max_polling_rate_hz: 1000,
                has_dedicated_macro_keys: false,
                macro_key_count: 0,
                has_volume_wheel: name_lower.contains("elite"),
                has_rgb_subsystem: true,
                rgb_protocol: Some("hyperx_ngenuity".to_string()),
                onboard_profiles_supported: true,
            };
        }

        // 7. Redragon (VID: 0x0C45 or 0x258A)
        if (vid == 0x0C45 || vid == 0x258A) || name_lower.contains("redragon") || name_lower.contains("kumara") {
            return GamingKeyboardCapabilities {
                brand: GamingBrand::Redragon,
                model_name: if product_name.is_empty() { "Redragon Gaming Keyboard".to_string() } else { product_name.to_string() },
                vendor_id: vid,
                product_id: pid,
                supports_nkro: true,
                max_polling_rate_hz: 1000,
                has_dedicated_macro_keys: false,
                macro_key_count: 0,
                has_volume_wheel: false,
                has_rgb_subsystem: true,
                rgb_protocol: Some("redragon_hid".to_string()),
                onboard_profiles_supported: false,
            };
        }

        // Standard Non-Gaming Keyboard Fallback
        GamingKeyboardCapabilities {
            brand: GamingBrand::Standard,
            model_name: if product_name.is_empty() { "Standard HID Keyboard".to_string() } else { product_name.to_string() },
            vendor_id: vid,
            product_id: pid,
            supports_nkro: false,
            max_polling_rate_hz: 125,
            has_dedicated_macro_keys: false,
            macro_key_count: 0,
            has_volume_wheel: false,
            has_rgb_subsystem: false,
            rgb_protocol: None,
            onboard_profiles_supported: false,
        }
    }

    /// Process gaming-specific volume wheel delta tick
    pub fn handle_volume_wheel_tick(delta: i16) -> (u16, bool) {
        if delta > 0 {
            (0x00E9, true) // Page 0x0C Consumer Volume Increment
        } else {
            (0x00EA, true) // Page 0x0C Consumer Volume Decrement
        }
    }

    /// Set RGB lighting profile via hardware vendor protocol (safe decoupled mock / adapter execution)
    pub fn apply_rgb_lighting(
        caps: &GamingKeyboardCapabilities,
        mode: &RgbLightingMode,
    ) -> Result<String, String> {
        if !caps.has_rgb_subsystem {
            return Err("This keyboard hardware does not possess an RGB lighting subsystem".to_string());
        }

        match caps.brand {
            GamingBrand::LogitechG => {
                log::info!("[GamingAdapter:Logitech] Applying {:?} via HID++ 2.0 Feature 0x8070 to PID 0x{:04X}", mode, caps.product_id);
                Ok("Applied Logitech G LIGHTSYNC profile".to_string())
            }
            GamingBrand::Razer => {
                log::info!("[GamingAdapter:Razer] Applying {:?} via Razer Chroma report packet to PID 0x{:04X}", mode, caps.product_id);
                Ok("Applied Razer Chroma lighting profile".to_string())
            }
            GamingBrand::Corsair => {
                log::info!("[GamingAdapter:Corsair] Applying {:?} via Corsair Lighting protocol to PID 0x{:04X}", mode, caps.product_id);
                Ok("Applied Corsair iCUE lighting profile".to_string())
            }
            GamingBrand::Keychron => {
                log::info!("[GamingAdapter:Keychron] Applying {:?} via QMK/VIA RawHID Page 0xFF60 to PID 0x{:04X}", mode, caps.product_id);
                Ok("Applied QMK/VIA lighting profile".to_string())
            }
            _ => {
                log::info!("[GamingAdapter:Generic] Applying {:?} to device {:04X}:{:04X}", mode, caps.vendor_id, caps.product_id);
                Ok("Applied hardware lighting profile".to_string())
            }
        }
    }
}
