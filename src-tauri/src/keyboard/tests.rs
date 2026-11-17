//! Comprehensive Automated Tests for Universal Cross-Platform Gaming Keyboard & HID Engine
//! Tests HID usage conversion, Page disambiguation, physical layouts (ANSI/ISO/JIS),
//! international AltGr support, gaming adapters, NKRO tracking, and zero-stuck-key recovery.

#[cfg(test)]
mod tests {
    use super::super::hid_types::*;
    use super::super::layout_engine::{KeyboardLayoutEngine, LayoutCalibrationData, PhysicalLayoutType};
    use super::super::gaming_adapters::{GamingBrand, GamingDeviceAdapter, RgbLightingMode};
    use super::super::state_manager::InputStateManager;

    // =========================================================================
    // 1. HID Usage to Platform Virtual Keycodes & Usages
    // =========================================================================

    #[test]
    fn test_hid_usage_to_windows_vk_mapping() {
        // Letters
        assert_eq!(hid_usage_to_win_vk(0x04), (0x41, false)); // A
        assert_eq!(hid_usage_to_win_vk(0x1D), (0x5A, false)); // Z
        assert_eq!(hid_usage_to_win_vk(0x10), (0x4D, false)); // M

        // Numbers & Basic controls
        assert_eq!(hid_usage_to_win_vk(0x1E), (0x31, false)); // 1
        assert_eq!(hid_usage_to_win_vk(0x27), (0x30, false)); // 0
        assert_eq!(hid_usage_to_win_vk(0x28), (0x0D, false)); // Enter
        assert_eq!(hid_usage_to_win_vk(0x29), (0x1B, false)); // Escape
        assert_eq!(hid_usage_to_win_vk(0x2A), (0x08, false)); // Backspace
        assert_eq!(hid_usage_to_win_vk(0x2B), (0x09, false)); // Tab
        assert_eq!(hid_usage_to_win_vk(0x2C), (0x20, false)); // Space

        // Function keys F1 - F24
        assert_eq!(hid_usage_to_win_vk(0x3A), (0x70, false)); // F1
        assert_eq!(hid_usage_to_win_vk(0x45), (0x7B, false)); // F12
        assert_eq!(hid_usage_to_win_vk(0x68), (0x7C, false)); // F13
        assert_eq!(hid_usage_to_win_vk(0x73), (0x87, false)); // F24

        // Modifiers (Page 0x07)
        assert_eq!(hid_usage_to_win_vk(0xE0), (0xA2, false)); // Left Ctrl
        assert_eq!(hid_usage_to_win_vk(0xE1), (0xA0, false)); // Left Shift
        assert_eq!(hid_usage_to_win_vk(0xE2), (0xA4, false)); // Left Alt
        assert_eq!(hid_usage_to_win_vk(0xE3), (0x5B, true));  // Left Win (Extended)
        assert_eq!(hid_usage_to_win_vk(0xE4), (0xA3, true));  // Right Ctrl (Extended)
        assert_eq!(hid_usage_to_win_vk(0xE5), (0xA1, false)); // Right Shift
        assert_eq!(hid_usage_to_win_vk(0xE6), (0xA5, true));  // Right Alt (AltGr, Extended)
        assert_eq!(hid_usage_to_win_vk(0xE7), (0x5C, true));  // Right Win (Extended)

        // ISO Specific 102nd Key
        assert_eq!(hid_usage_to_win_vk(0x64), (0xE2, false)); // VK_OEM_102 (< > | \)
    }

    #[test]
    fn test_hid_usage_page_disambiguation() {
        // Page 0x07 (Keyboard) usage 0xE2 MUST map to Left Alt
        let (vk_alt, _) = hid_usage_to_win_vk_paged(0x07, 0x00E2);
        assert_eq!(vk_alt, 0xA4, "Page 0x07 0xE2 must map to VK_LMENU (Left Alt)");

        // Page 0x0C (Consumer) usage 0x00E2 MUST map to Volume Mute
        let (vk_mute, ext) = hid_usage_to_win_vk_paged(0x0C, 0x00E2);
        assert_eq!(vk_mute, 0xAD, "Page 0x0C 0x00E2 must map to VK_VOLUME_MUTE");
        assert!(ext, "Consumer keys should have extended key flag");

        // Consumer Media Keys
        let (vk_voldown, _) = hid_usage_to_win_vk_paged(0x0C, 0x00EA);
        assert_eq!(vk_voldown, 0xAE); // VK_VOLUME_DOWN
        let (vk_volup, _) = hid_usage_to_win_vk_paged(0x0C, 0x00E9);
        assert_eq!(vk_volup, 0xAF); // VK_VOLUME_UP
        let (vk_play, _) = hid_usage_to_win_vk_paged(0x0C, 0x00CD);
        assert_eq!(vk_play, 0xB3); // VK_MEDIA_PLAY_PAUSE

        // Linux evdev disambiguation
        assert_eq!(hid_usage_to_linux_code_paged(0x07, 0x00E2), 56);  // KEY_LEFTALT
        assert_eq!(hid_usage_to_linux_code_paged(0x0C, 0x00E2), 113); // KEY_MUTE
        assert_eq!(hid_usage_to_linux_code_paged(0x0C, 0x00E9), 115); // KEY_VOLUMEUP
        assert_eq!(hid_usage_to_linux_code_paged(0x0C, 0x00EA), 114); // KEY_VOLUMEDOWN
    }

    #[test]
    fn test_hid_usage_to_macos_carbon_keycodes() {
        // A -> Mac 0
        assert_eq!(hid_usage_to_mac_key(0x04), 0);
        // S -> Mac 1
        assert_eq!(hid_usage_to_mac_key(0x16), 1);
        // D -> Mac 2
        assert_eq!(hid_usage_to_mac_key(0x07), 2);
        // Enter -> Mac 36
        assert_eq!(hid_usage_to_mac_key(0x28), 36);
        // Space -> Mac 49
        assert_eq!(hid_usage_to_mac_key(0x2C), 49);
        // Escape -> Mac 53
        assert_eq!(hid_usage_to_mac_key(0x29), 53);

        // Modifiers
        assert_eq!(hid_usage_to_mac_key(0xE0), 59); // Left Control
        assert_eq!(hid_usage_to_mac_key(0xE1), 56); // Left Shift
        assert_eq!(hid_usage_to_mac_key(0xE2), 58); // Left Option (Alt)
        assert_eq!(hid_usage_to_mac_key(0xE3), 55); // Left Command (Win/Meta)
        assert_eq!(hid_usage_to_mac_key(0xE4), 62); // Right Control
        assert_eq!(hid_usage_to_mac_key(0xE5), 60); // Right Shift
        assert_eq!(hid_usage_to_mac_key(0xE6), 61); // Right Option
        assert_eq!(hid_usage_to_mac_key(0xE7), 54); // Right Command

        // Round-trip verification: Mac key 55 (Command) -> HID 0xE3 -> Mac key 55
        let hid = mac_key_to_hid_usage(55);
        assert_eq!(hid, 0xE3);
        assert_eq!(hid_usage_to_mac_key(hid), 55);

        // Round-trip verification: Mac key 0 (A) -> HID 0x04 -> Mac key 0
        let hid_a = mac_key_to_hid_usage(0);
        assert_eq!(hid_a, 0x04);
        assert_eq!(hid_usage_to_mac_key(hid_a), 0);
    }

    #[test]
    fn test_hid_usage_to_linux_evdev_codes() {
        assert_eq!(hid_usage_to_linux_code(0x04), 30);  // KEY_A
        assert_eq!(hid_usage_to_linux_code(0x1D), 44);  // KEY_Z
        assert_eq!(hid_usage_to_linux_code(0x28), 28);  // KEY_ENTER
        assert_eq!(hid_usage_to_linux_code(0x29), 1);   // KEY_ESC
        assert_eq!(hid_usage_to_linux_code(0x2C), 57);  // KEY_SPACE
        assert_eq!(hid_usage_to_linux_code(0x64), 86);  // KEY_102ND (Non-US \)
        assert_eq!(hid_usage_to_linux_code(0xE0), 29);  // KEY_LEFTCTRL
        assert_eq!(hid_usage_to_linux_code(0xE1), 42);  // KEY_LEFTSHIFT
        assert_eq!(hid_usage_to_linux_code(0xE2), 56);  // KEY_LEFTALT
        assert_eq!(hid_usage_to_linux_code(0xE3), 125); // KEY_LEFTMETA (Super)
    }

    // =========================================================================
    // 2. International Layouts & Physical Type (ANSI / ISO / JIS)
    // =========================================================================

    #[test]
    fn test_physical_layout_detection() {
        // Standard ANSI keyboard (US English, no ISO key)
        assert_eq!(
            KeyboardLayoutEngine::detect_physical_layout("Standard Keyboard", "US (QWERTY)", false),
            PhysicalLayoutType::Ansi
        );

        // ISO keyboard (German / French or presence of 0x64 ISO key)
        assert_eq!(
            KeyboardLayoutEngine::detect_physical_layout("Keyboard", "German (QWERTZ)", false),
            PhysicalLayoutType::Iso
        );
        assert_eq!(
            KeyboardLayoutEngine::detect_physical_layout("Generic Keyboard", "US", true),
            PhysicalLayoutType::Iso
        );

        // JIS keyboard (Japanese language or JIS in name)
        assert_eq!(
            KeyboardLayoutEngine::detect_physical_layout("JIS Mechanical Keyboard", "Japanese", false),
            PhysicalLayoutType::Jis
        );

        // Layout discriminator key checks
        assert!(KeyboardLayoutEngine::is_layout_discriminator(0x64)); // Non-US backslash
        assert!(KeyboardLayoutEngine::is_layout_discriminator(0x87)); // Japanese Ro
        assert!(!KeyboardLayoutEngine::is_layout_discriminator(0x04)); // A
    }

    #[test]
    fn test_altgr_and_layout_calibration() {
        // AltGr active layouts
        assert!(KeyboardLayoutEngine::uses_altgr("German (QWERTZ)"));
        assert!(KeyboardLayoutEngine::uses_altgr("French (AZERTY)"));
        assert!(!KeyboardLayoutEngine::uses_altgr("US (QWERTY)"));

        // AltGr character resolution on German layout (AltGr+Q = @)
        let char_at = KeyboardLayoutEngine::resolve_altgr_character(0x14, "German (QWERTZ)");
        assert_eq!(char_at, Some("@"));

        // AltGr character resolution on German layout (AltGr+E = €)
        let char_euro = KeyboardLayoutEngine::resolve_altgr_character(0x08, "German (QWERTZ)");
        assert_eq!(char_euro, Some("€"));

        // Calibration data round-trip
        let cal = LayoutCalibrationData {
            key_0x64_present: true,
            enter_is_iso: true,
            has_ro_key: false,
            has_yen_key: false,
            detected_physical: PhysicalLayoutType::Iso,
        };
        let json = serde_json::to_string(&cal).expect("Serialization failed");
        let deserialized: LayoutCalibrationData = serde_json::from_str(&json).expect("Deserialization failed");
        assert_eq!(deserialized.detected_physical, PhysicalLayoutType::Iso);
        assert!(deserialized.key_0x64_present);
        assert!(deserialized.enter_is_iso);
    }

    // =========================================================================
    // 3. Gaming Device Hardware Adapters & Capabilities
    // =========================================================================

    #[test]
    fn test_gaming_brand_identification() {
        // Logitech G (VID 0x046D)
        let logi_g915 = GamingDeviceAdapter::identify_gaming_device(0x046D, 0xC33F, "Logitech G915 Lightspeed");
        assert_eq!(logi_g915.brand, GamingBrand::LogitechG);
        assert!(logi_g915.supports_nkro);
        assert!(logi_g915.has_dedicated_macro_keys);
        assert!(logi_g915.has_volume_wheel);

        // Razer (VID 0x1532)
        let razer_huntsman = GamingDeviceAdapter::identify_gaming_device(0x1532, 0x022A, "Razer Huntsman Mini");
        assert_eq!(razer_huntsman.brand, GamingBrand::Razer);
        assert_eq!(razer_huntsman.max_polling_rate_hz, 8000);
        assert!(razer_huntsman.supports_nkro);

        // Corsair (VID 0x1B1C)
        let corsair_k100 = GamingDeviceAdapter::identify_gaming_device(0x1B1C, 0x1B89, "Corsair K100 RGB");
        assert_eq!(corsair_k100.brand, GamingBrand::Corsair);
        assert_eq!(corsair_k100.max_polling_rate_hz, 8000);
        assert!(corsair_k100.has_dedicated_macro_keys);
        assert!(corsair_k100.has_volume_wheel);

        // SteelSeries (VID 0x1038)
        let ss_apex = GamingDeviceAdapter::identify_gaming_device(0x1038, 0x1610, "SteelSeries Apex Pro");
        assert_eq!(ss_apex.brand, GamingBrand::SteelSeries);

        // HyperX (VID 0x0951)
        let hyperx = GamingDeviceAdapter::identify_gaming_device(0x0951, 0x16DE, "HyperX Alloy Origins");
        assert_eq!(hyperx.brand, GamingBrand::HyperX);

        // Keychron (VID 0x3434)
        let keychron_q1 = GamingDeviceAdapter::identify_gaming_device(0x3434, 0x0240, "Keychron Q1 Pro");
        assert_eq!(keychron_q1.brand, GamingBrand::Keychron);

        // Standard Generic Keyboard (VID 0x0000)
        let generic = GamingDeviceAdapter::identify_gaming_device(0x0000, 0x0000, "Generic USB Keyboard");
        assert_eq!(generic.brand, GamingBrand::Standard);
        assert_eq!(generic.max_polling_rate_hz, 125); // Standard USB 8ms / 125Hz
        assert!(!generic.supports_nkro);
    }

    #[test]
    fn test_volume_wheel_delta_translation() {
        // Upward scroll tick (+1) -> Volume Up (Page 0x0C Usage 0x00E9)
        let (usage_up, is_consumer) = GamingDeviceAdapter::handle_volume_wheel_tick(1);
        assert_eq!(usage_up, 0x00E9);
        assert!(is_consumer);

        // Downward scroll tick (-1) -> Volume Down (Page 0x0C Usage 0x00EA)
        let (usage_down, is_consumer) = GamingDeviceAdapter::handle_volume_wheel_tick(-1);
        assert_eq!(usage_down, 0x00EA);
        assert!(is_consumer);
    }

    #[test]
    fn test_rgb_lighting_subsystem() {
        let corsair_caps = GamingDeviceAdapter::identify_gaming_device(0x1B1C, 0x1B89, "Corsair K100 RGB");
        let static_mode = RgbLightingMode::StaticColor { r: 255, g: 128, b: 0 };
        let res = GamingDeviceAdapter::apply_rgb_lighting(&corsair_caps, &static_mode);
        assert!(res.is_ok());

        let razer_caps = GamingDeviceAdapter::identify_gaming_device(0x1532, 0x022A, "Razer Huntsman");
        let breathe_mode = RgbLightingMode::Breathing { r: 0, g: 255, b: 128, speed: 5 };
        let res_breathe = GamingDeviceAdapter::apply_rgb_lighting(&razer_caps, &breathe_mode);
        assert!(res_breathe.is_ok());
    }

    // =========================================================================
    // 4. Input State Manager: NKRO, Sequencing, & Stuck-Key Recovery
    // =========================================================================

    #[test]
    fn test_input_state_manager_nkro_tracking() {
        let mgr = InputStateManager::new();

        // Simulate 8-key simultaneous chord (Gaming N-Key Rollover)
        let keys_to_press = [0x04, 0x16, 0x07, 0x09, 0x0A, 0x0B, 0x0C, 0x2C]; // A, S, D, F, G, H, I, Space
        for &k in &keys_to_press {
            mgr.record_key_down(k, 0x01); // with Shift modifier
        }

        for &k in &keys_to_press {
            assert!(mgr.is_key_pressed(k), "Key 0x{:02X} must be tracked as pressed", k);
        }
        assert_eq!(mgr.get_active_modifiers(), 0x01);

        // Sequence numbering must be strictly increasing
        let seq1 = mgr.next_sequence();
        let seq2 = mgr.next_sequence();
        assert!(seq2 > seq1);

        // Releasing a key
        mgr.record_key_up(0x04, 0x01);
        assert!(!mgr.is_key_pressed(0x04));
        assert!(mgr.is_key_pressed(0x16)); // S is still pressed
    }

    #[test]
    fn test_input_state_manager_drain_all_pressed_zero_stuck_keys() {
        let mgr = InputStateManager::new();

        // Simulate holding Alt, Shift, and several keys
        mgr.record_key_down(0xE1, 0x01); // Left Shift
        mgr.record_key_down(0xE2, 0x05); // Left Alt (modifiers: Shift + Alt)
        mgr.record_key_down(0x04, 0x05); // A
        mgr.record_key_down(0x28, 0x05); // Enter

        // Verify state is populated
        assert!(mgr.is_key_pressed(0x04));
        assert!(mgr.is_key_pressed(0x28));
        assert_eq!(mgr.get_active_modifiers(), 0x05);

        // Simulate screen boundary transition or network disconnection:
        // drain_all_pressed() must return all stuck keys and cleanly reset modifiers to 0!
        let (drained_keys, drained_mods) = mgr.drain_all_pressed();
        assert_eq!(drained_mods, 0x05);
        assert!(drained_keys.contains(&0x04));
        assert!(drained_keys.contains(&0x28));
        assert!(drained_keys.contains(&0xE1));
        assert!(drained_keys.contains(&0xE2));

        // After drain, zero keys must remain pressed!
        assert!(!mgr.is_key_pressed(0x04));
        assert!(!mgr.is_key_pressed(0x28));
        assert_eq!(mgr.get_active_modifiers(), 0);
        assert!(mgr.get_active_keys().is_empty());
    }

    #[test]
    fn test_sequence_number_acceptance() {
        let mgr = InputStateManager::new();

        // First packet seq 10 accepted
        assert!(mgr.accept_sequence(10));
        // Next packet seq 11 accepted
        assert!(mgr.accept_sequence(11));
        // Out-of-order/retransmitted packet seq 9 rejected!
        assert!(!mgr.accept_sequence(9));
        // Re-sent packet seq 11 rejected!
        assert!(!mgr.accept_sequence(11));
        // Next packet seq 12 accepted
        assert!(mgr.accept_sequence(12));
    }
}
