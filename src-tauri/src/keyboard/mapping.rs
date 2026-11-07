use serde::{Deserialize, Serialize};

pub const MOD_SHIFT: u8 = 1;
pub const MOD_CTRL: u8  = 2;
pub const MOD_ALT: u8   = 4;
pub const MOD_META: u8  = 8; // Win on Windows, Command on macOS, Super on Linux

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MappingMode {
    SmartUniversal,
    RawPassthrough,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomModifierConfig {
    pub swap_ctrl_alt: bool,
    pub swap_cmd_alt: bool,
    pub capslock_as_ctrl: bool,
    pub enabled: bool,
}

lazy_static::lazy_static! {
    pub static ref CURRENT_MAPPING_MODE: std::sync::RwLock<MappingMode> = std::sync::RwLock::new(MappingMode::SmartUniversal);
    pub static ref CUSTOM_CONFIG: std::sync::RwLock<CustomModifierConfig> = std::sync::RwLock::new(CustomModifierConfig {
        swap_ctrl_alt: false,
        swap_cmd_alt: false,
        capslock_as_ctrl: false,
        enabled: true,
    });
}

pub fn get_mapping_mode() -> MappingMode {
    CURRENT_MAPPING_MODE.read().map(|m| *m).unwrap_or(MappingMode::SmartUniversal)
}

pub fn set_mapping_mode(mode: MappingMode) {
    if let Ok(mut m) = CURRENT_MAPPING_MODE.write() {
        *m = mode;
    }
}

pub fn get_custom_config() -> CustomModifierConfig {
    CUSTOM_CONFIG.read().map(|c| c.clone()).unwrap_or_else(|_| CustomModifierConfig {
        swap_ctrl_alt: false,
        swap_cmd_alt: false,
        capslock_as_ctrl: false,
        enabled: true,
    })
}

pub fn set_custom_config(cfg: CustomModifierConfig) {
    if let Ok(mut c) = CUSTOM_CONFIG.write() {
        *c = cfg;
    }
}

/// Centralized Cross-Platform Keyboard Mapping Engine
pub struct KeyboardMappingEngine;

impl KeyboardMappingEngine {
    /// Translates raw modifiers according to the target operating system.
    ///
    /// Key principles:
    /// - Never blindly forward Ctrl as Command or Command as Ctrl without checking target OS.
    /// - If target is macOS, common control shortcuts (Ctrl+C, Ctrl+V, etc.) expect Command (Meta).
    /// - If target is Windows/Linux, incoming Command (Meta) from macOS maps to Control (Ctrl).
    /// - If source and target are the same OS, 1:1 pass-through is preserved.
    pub fn translate_modifiers(
        raw_mods: u8,
        source_os: &str,
        target_os: &str,
        mode: MappingMode,
    ) -> u8 {
        let src = source_os.to_lowercase();
        let tgt = target_os.to_lowercase();

        // 1. Raw Passthrough Mode: preserve exact modifier flags
        if mode == MappingMode::RawPassthrough {
            return raw_mods;
        }

        // 2. Custom User Overrides
        if mode == MappingMode::Custom {
            let mut out = raw_mods;
            let cfg = get_custom_config();
            if cfg.enabled {
                if cfg.swap_ctrl_alt {
                    let has_ctrl = (out & MOD_CTRL) != 0;
                    let has_alt = (out & MOD_ALT) != 0;
                    out &= !(MOD_CTRL | MOD_ALT);
                    if has_ctrl { out |= MOD_ALT; }
                    if has_alt { out |= MOD_CTRL; }
                }
                if cfg.swap_cmd_alt {
                    let has_cmd = (out & MOD_META) != 0;
                    let has_alt = (out & MOD_ALT) != 0;
                    out &= !(MOD_META | MOD_ALT);
                    if has_cmd { out |= MOD_ALT; }
                    if has_alt { out |= MOD_META; }
                }
            }
            return out;
        }

        // 3. Smart Universal Mode
        // Same OS: exact 1:1 pass-through
        if (src.contains("win") && tgt.contains("win"))
            || (src.contains("mac") && tgt.contains("mac"))
            || (src.contains("linux") && tgt.contains("linux"))
        {
            return raw_mods;
        }

        let shift = (raw_mods & MOD_SHIFT) != 0;
        let ctrl  = (raw_mods & MOD_CTRL)  != 0;
        let alt   = (raw_mods & MOD_ALT)   != 0;
        let meta  = (raw_mods & MOD_META)  != 0;

        let mut translated: u8 = 0;
        if shift { translated |= MOD_SHIFT; }

        if src.contains("win") && tgt.contains("mac") {
            // Windows Host -> macOS Client:
            // Windows Ctrl (Copy, Paste, Undo, etc.) maps to Mac Command (Meta)
            // Windows Alt maps to Mac Option (Alt)
            // Windows Win key maps to Mac Control (Ctrl)
            if ctrl { translated |= MOD_META; }
            if alt  { translated |= MOD_ALT;  }
            if meta { translated |= MOD_CTRL; }
        } else if src.contains("mac") && tgt.contains("win") {
            // macOS Host -> Windows Client:
            // Mac Command (Meta) maps to Windows Ctrl
            // Mac Option (Alt) maps to Windows Alt
            // Mac Control maps to Windows Win key (Meta)
            if meta { translated |= MOD_CTRL; }
            if alt  { translated |= MOD_ALT;  }
            if ctrl { translated |= MOD_META; }
        } else if src.contains("win") && tgt.contains("linux") {
            // Windows -> Linux:
            // Ctrl -> Ctrl, Alt -> Alt, Win -> Super (Meta)
            if ctrl { translated |= MOD_CTRL; }
            if alt  { translated |= MOD_ALT;  }
            if meta { translated |= MOD_META; }
        } else if src.contains("mac") && tgt.contains("linux") {
            // macOS -> Linux:
            // Command (Meta) maps to Ctrl for standard shortcuts (Copy/Paste)
            // Option maps to Alt
            // Control maps to Super (Meta)
            if meta { translated |= MOD_CTRL; }
            if alt  { translated |= MOD_ALT;  }
            if ctrl { translated |= MOD_META; }
        } else if src.contains("linux") && tgt.contains("mac") {
            // Linux -> macOS:
            // Ctrl maps to Command (Meta)
            // Alt maps to Option (Alt)
            // Super maps to Control (Ctrl)
            if ctrl { translated |= MOD_META; }
            if alt  { translated |= MOD_ALT;  }
            if meta { translated |= MOD_CTRL; }
        } else {
            // Fallback: 1:1
            return raw_mods;
        }

        translated
    }

    /// Translates key event combinations across operating systems.
    ///
    /// For example:
    /// - Redo on Windows (Ctrl+Y) translates to Mac Redo (Cmd+Shift+Z).
    /// - Redo on Mac (Cmd+Shift+Z) translates to Windows Redo (Ctrl+Y).
    /// - App Switcher (Alt+Tab on Win/Linux) translates to Mac (Cmd+Tab).
    /// - App Switcher (Cmd+Tab on Mac) translates to Win/Linux (Alt+Tab).
    /// - Lock Screen (Win+L) translates to Mac (Ctrl+Cmd+Q).
    /// - Task Manager (Ctrl+Shift+Esc) translates to Mac (Cmd+Opt+Esc Force Quit).
    pub fn translate_key_combination(
        key_code: u32,
        modifiers: u8,
        source_os: &str,
        target_os: &str,
        mode: MappingMode,
    ) -> (u32, u8) {
        if mode != MappingMode::SmartUniversal {
            let translated_mods = Self::translate_modifiers(modifiers, source_os, target_os, mode);
            return (key_code, translated_mods);
        }

        let src = source_os.to_lowercase();
        let tgt = target_os.to_lowercase();

        // Same OS: no combination override
        if (src.contains("win") && tgt.contains("win"))
            || (src.contains("mac") && tgt.contains("mac"))
            || (src.contains("linux") && tgt.contains("linux"))
        {
            return (key_code, modifiers);
        }

        let shift = (modifiers & MOD_SHIFT) != 0;
        let ctrl  = (modifiers & MOD_CTRL)  != 0;
        let alt   = (modifiers & MOD_ALT)   != 0;
        let meta  = (modifiers & MOD_META)  != 0;

        // --- Windows to macOS ---
        if src.contains("win") && tgt.contains("mac") {
            // Standalone modifier keys
            if key_code == 0x11 || key_code == 0xA2 {
                return (0x5B, MOD_META); // Win/Cmd key on Mac
            }
            if key_code == 0xA3 {
                return (0x5C, MOD_META);
            }
            if key_code == 0x5B || key_code == 0x5C {
                return (0x11, MOD_CTRL);
            }
            if key_code == 0x12 || key_code == 0xA4 || key_code == 0xA5 {
                return (key_code, MOD_ALT);
            }

            // 1. Redo: Windows Ctrl + Y -> Mac Cmd + Shift + Z
            if key_code == 0x59 && ctrl && !shift && !alt && !meta {
                // Key 'Z' is 0x5A, with Command (MOD_META) + Shift (MOD_SHIFT)
                return (0x5A, MOD_META | MOD_SHIFT);
            }

            // 2. App Switcher: Windows Alt + Tab -> Mac Cmd + Tab
            if key_code == 0x09 && alt && !ctrl && !meta {
                // Tab (0x09) with Command (MOD_META)
                return (0x09, MOD_META | (if shift { MOD_SHIFT } else { 0 }));
            }

            // 3. Task Manager: Windows Ctrl + Shift + Esc -> Mac Cmd + Opt + Esc (Force Quit)
            if key_code == 0x1B && ctrl && shift && !alt && !meta {
                return (0x1B, MOD_META | MOD_ALT);
            }

            // 4. Show Desktop: Windows Win + D -> Mac F11 (0x7A)
            if key_code == 0x44 && meta && !ctrl && !alt && !shift {
                return (0x7A, 0);
            }
        }

        // --- macOS to Windows ---
        if src.contains("mac") && tgt.contains("win") {
            // Standalone modifier keys
            if key_code == 0x5B {
                return (0x11, MOD_CTRL);
            }
            if key_code == 0x5C {
                return (0xA3, MOD_CTRL);
            }
            if key_code == 0x11 || key_code == 0xA2 {
                return (0x5B, MOD_META);
            }
            if key_code == 0xA3 {
                return (0x5C, MOD_META);
            }
            if key_code == 0x12 || key_code == 0xA4 || key_code == 0xA5 {
                return (key_code, MOD_ALT);
            }

            // 1. Redo: Mac Cmd + Shift + Z -> Windows Ctrl + Y
            if key_code == 0x5A && meta && shift && !ctrl && !alt {
                // Key 'Y' is 0x59 with Ctrl (MOD_CTRL)
                return (0x59, MOD_CTRL);
            }

            // 2. App Switcher: Mac Cmd + Tab -> Windows Alt + Tab
            if key_code == 0x09 && meta && !ctrl && !alt {
                // Tab with Alt (MOD_ALT)
                return (0x09, MOD_ALT | (if shift { MOD_SHIFT } else { 0 }));
            }

            // 3. Force Quit: Mac Cmd + Opt + Esc -> Windows Ctrl + Shift + Esc (Task Manager)
            if key_code == 0x1B && meta && alt && !ctrl && !shift {
                return (0x1B, MOD_CTRL | MOD_SHIFT);
            }
        }

        // Default modifier mapping
        let translated_mods = Self::translate_modifiers(modifiers, source_os, target_os, mode);
        (key_code, translated_mods)
    }

    /// Releases all stuck modifiers on the local system.
    /// Called on session termination, disconnect, or emergency escape.
    pub fn release_stuck_keys() {
        #[cfg(windows)]
        unsafe {
            use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
                SendInput, INPUT, INPUT_KEYBOARD, KEYEVENTF_KEYUP, KEYBDINPUT,
                VK_CONTROL, VK_LWIN, VK_MENU, VK_RWIN, VK_SHIFT,
            };
            use crate::mouse::simulator::AIRDESK_EXTRA_INFO;

            let keys_to_release = [VK_SHIFT, VK_CONTROL, VK_MENU, VK_LWIN, VK_RWIN];
            for vk in keys_to_release {
                let mut input = INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: vk,
                            wScan: 0,
                            dwFlags: KEYEVENTF_KEYUP,
                            time: 0,
                            dwExtraInfo: AIRDESK_EXTRA_INFO,
                        },
                    },
                };
                SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
            }
        }

        #[cfg(target_os = "macos")]
        unsafe {
            use crate::mouse::simulator::AIRDESK_MAC_MAGIC;
            #[link(name = "CoreGraphics", kind = "framework")]
            extern "C" {
                pub fn CGEventSourceCreate(stateID: i32) -> *mut std::os::raw::c_void;
                pub fn CGEventCreateKeyboardEvent(
                    source: *mut std::os::raw::c_void,
                    virtualKey: u16,
                    keyDown: bool,
                ) -> *mut std::os::raw::c_void;
                pub fn CGEventSetType(event: *mut std::os::raw::c_void, eventType: u32);
                pub fn CGEventSetFlags(event: *mut std::os::raw::c_void, flags: u64);
                pub fn CGEventSetIntegerValueField(event: *mut std::os::raw::c_void, field: u32, value: i64);
                pub fn CGEventPost(tap: u32, event: *mut std::os::raw::c_void);
                pub fn CFRelease(cf: *mut std::os::raw::c_void);
            }

            let source = CGEventSourceCreate(1);
            // Release modifier keys: Shift (56, 60), Cmd (55, 54), Opt (58, 61), Ctrl (59, 62)
            let mod_keys: [u16; 8] = [56, 60, 55, 54, 58, 61, 59, 62];
            for k in mod_keys {
                let evt = CGEventCreateKeyboardEvent(source, k, false);
                if !evt.is_null() {
                    CGEventSetType(evt, 12 /* kCGEventFlagsChanged */);
                    CGEventSetFlags(evt, 0);
                    CGEventSetIntegerValueField(evt, 42, AIRDESK_MAC_MAGIC);
                    CGEventPost(0, evt);
                    CFRelease(evt);
                }
            }
            if !source.is_null() {
                CFRelease(source);
            }
        }
    }
}
