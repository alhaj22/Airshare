//! Universal Keyboard Layout Engine
//! Separates physical HID key identity from logical character interpretation.
//! Handles ANSI, ISO, and JIS physical hardware, alongside international logical layouts.

#![allow(unused)]

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PhysicalLayoutType {
    Ansi, // US standard: wide left shift, rectangular single-row Enter
    Iso,  // European standard: short left shift + NonUsBackslash (0x64), tall L-shaped Enter
    Jis,  // Japanese standard: short spacebar, Henkan/Muhenkan/Yen/Ro keys
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct KeyboardLayoutProfile {
    pub id: String,
    pub name: String,
    pub physical: PhysicalLayoutType,
    pub has_altgr: bool,
    pub language_code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutCalibrationData {
    pub key_0x64_present: bool,      // Non-US backslash next to left Shift (indicates ISO)
    pub enter_is_iso: bool,          // Tall Enter
    pub has_ro_key: bool,            // JIS Ro key (0x87)
    pub has_yen_key: bool,           // JIS Yen key (0x89)
    pub detected_physical: PhysicalLayoutType,
}

pub struct KeyboardLayoutEngine;

impl KeyboardLayoutEngine {
    /// Detect physical hardware type based on device inspection & HID capabilities
    pub fn detect_physical_layout(
        name: &str,
        active_lang: &str,
        has_iso_key: bool,
    ) -> PhysicalLayoutType {
        let name_lower = name.to_lowercase();
        let lang_lower = active_lang.to_lowercase();

        if lang_lower.contains("jis") || lang_lower.contains("japanese") || name_lower.contains("jis") {
            return PhysicalLayoutType::Jis;
        }

        if has_iso_key
            || lang_lower.contains("german")
            || lang_lower.contains("french")
            || lang_lower.contains("uk")
            || lang_lower.contains("iso")
            || lang_lower.contains("nordic")
            || lang_lower.contains("spanish")
            || lang_lower.contains("italian")
        {
            return PhysicalLayoutType::Iso;
        }

        if lang_lower.contains("us") || lang_lower.contains("ansi") {
            return PhysicalLayoutType::Ansi;
        }

        PhysicalLayoutType::Ansi
    }

    /// Check if a logical layout uses AltGr (Level 3 Shift) for currency and brackets
    pub fn uses_altgr(layout_id: &str) -> bool {
        let l = layout_id.to_lowercase();
        l.contains("german")
            || l.contains("french")
            || l.contains("spanish")
            || l.contains("italian")
            || l.contains("polish")
            || l.contains("nordic")
            || l.contains("uk")
            || l.contains("qwertz")
            || l.contains("azerty")
    }

    /// Calibrate unknown layout from user test events
    pub fn calibrate(calibration: LayoutCalibrationData) -> KeyboardLayoutProfile {
        let physical = if calibration.has_ro_key || calibration.has_yen_key {
            PhysicalLayoutType::Jis
        } else if calibration.key_0x64_present || calibration.enter_is_iso {
            PhysicalLayoutType::Iso
        } else {
            PhysicalLayoutType::Ansi
        };

        KeyboardLayoutProfile {
            id: format!("custom_{:?}", physical).to_lowercase(),
            name: match physical {
                PhysicalLayoutType::Ansi => "Calibrated ANSI (US-Style)",
                PhysicalLayoutType::Iso  => "Calibrated ISO (European-Style)",
                PhysicalLayoutType::Jis  => "Calibrated JIS (Japanese-Style)",
                PhysicalLayoutType::Unknown => "Standard Hardware",
            }.to_string(),
            physical,
            has_altgr: physical == PhysicalLayoutType::Iso,
            language_code: "auto".to_string(),
        }
    }

    /// Check if a key is a physical layout discriminator
    pub fn is_layout_discriminator(hid_usage: u16) -> bool {
        matches!(
            hid_usage,
            0x31 | 0x32 | 0x64 | 0x87 | 0x88 | 0x89 | 0x8A | 0x8B
        )
    }

    /// Resolve dead-key or AltGr unicode character generation when applicable
    pub fn resolve_altgr_character(
        hid_usage: u16,
        layout_name: &str,
    ) -> Option<&'static str> {
        let l = layout_name.to_lowercase();
        if l.contains("german") || l.contains("qwertz") {
            match hid_usage {
                0x14 => Some("@"), // AltGr + Q = @
                0x08 => Some("€"), // AltGr + E = €
                0x24 => Some("{"), // AltGr + 7 = {
                0x25 => Some("["), // AltGr + 8 = [
                0x26 => Some("]"), // AltGr + 9 = ]
                0x27 => Some("}"), // AltGr + 0 = }
                0x2D => Some("\\"), // AltGr + ß = \
                0x1B => Some("~"), // AltGr + + = ~
                _ => None,
            }
        } else if l.contains("french") || l.contains("azerty") {
            match hid_usage {
                0x08 => Some("€"), // AltGr + E = €
                0x21 => Some("#"), // AltGr + 4 = #
                0x22 => Some("{"), // AltGr + 5 = {
                0x1E => Some("~"), // AltGr + 2 = ~
                0x23 => Some("["), // AltGr + 6 = [
                0x24 => Some("|"), // AltGr + 7 = |
                0x25 => Some("`"), // AltGr + 8 = `
                0x26 => Some("\\"),// AltGr + 9 = \
                0x27 => Some("^"), // AltGr + 0 = ^
                0x2D => Some("@"), // AltGr + ) = @
                0x2E => Some("]"), // AltGr + = = ]
                _ => None,
            }
        } else {
            None
        }
    }
}
