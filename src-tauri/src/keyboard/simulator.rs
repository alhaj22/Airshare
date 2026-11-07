pub const AIRDESK_EXTRA_INFO: usize = 0xA12DE5C0;
#[allow(dead_code)]
pub const AIRDESK_MAC_MAGIC: i64 = 0x41495244; // 'AIRD'

#[cfg(windows)]
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
    MapVirtualKeyW, SendInput, INPUT, INPUT_KEYBOARD, KEYEVENTF_EXTENDEDKEY, KEYEVENTF_KEYUP,
    KEYEVENTF_UNICODE, KEYBDINPUT, MAPVK_VK_TO_VSC,
};

#[cfg(target_os = "macos")]
mod macos {
    use std::os::raw::c_void;

    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        pub fn CGEventSourceCreate(stateID: i32) -> *mut c_void;
        pub fn CGEventCreateKeyboardEvent(
            source: *mut c_void,
            virtualKey: u16,
            keyDown: bool,
        ) -> *mut c_void;
        pub fn CGEventSetType(event: *mut c_void, eventType: u32);
        pub fn CGEventKeyboardSetUnicodeString(
            event: *mut c_void,
            stringLength: usize,
            unicodeString: *const u16,
        );
        pub fn CGEventSetFlags(event: *mut c_void, flags: u64);
        pub fn CGEventSetIntegerValueField(event: *mut c_void, field: u32, value: i64);
        pub fn CGEventPost(tap: u32, event: *mut c_void);
        pub fn CFRelease(cf: *mut c_void);
    }

    pub fn win_vk_to_mac_key(vk: u32) -> u16 {
        match vk {
            // Letters A-Z
            0x41 => 0,   // A
            0x42 => 11,  // B
            0x43 => 8,   // C
            0x44 => 2,   // D
            0x45 => 14,  // E
            0x46 => 3,   // F
            0x47 => 5,   // G
            0x48 => 4,   // H
            0x49 => 34,  // I
            0x4A => 38,  // J
            0x4B => 40,  // K
            0x4C => 37,  // L
            0x4D => 46,  // M
            0x4E => 45,  // N
            0x4F => 31,  // O
            0x50 => 35,  // P
            0x51 => 12,  // Q
            0x52 => 15,  // R
            0x53 => 1,   // S
            0x54 => 17,  // T
            0x55 => 32,  // U
            0x56 => 9,   // V
            0x57 => 13,  // W
            0x58 => 7,   // X
            0x59 => 16,  // Y
            0x5A => 6,   // Z

            // Numbers 0-9
            0x30 => 29,  // 0
            0x31 => 18,  // 1
            0x32 => 19,  // 2
            0x33 => 20,  // 3
            0x34 => 21,  // 4
            0x35 => 23,  // 5
            0x36 => 22,  // 6
            0x37 => 26,  // 7
            0x38 => 28,  // 8
            0x39 => 25,  // 9

            // Controls & Whitespace
            0x08 => 51,  // Backspace -> Mac Delete
            0x09 => 48,  // Tab
            0x0D => 36,  // Enter / Return
            0x14 => 57,  // CapsLock
            0x1B => 53,  // Escape
            0x20 => 49,  // Spacebar

            // Arrows & Navigation
            0x25 => 123, // Left Arrow
            0x26 => 126, // Up Arrow
            0x27 => 124, // Right Arrow
            0x28 => 125, // Down Arrow
            0x2E => 117, // Delete -> Forward Delete
            0x24 => 115, // Home
            0x23 => 119, // End
            0x21 => 116, // PageUp
            0x22 => 121, // PageDown
            0x2D => 114, // Insert -> Help

            // Function Keys F1 - F12
            0x70 => 122, // F1
            0x71 => 120, // F2
            0x72 => 99,  // F3
            0x73 => 118, // F4
            0x74 => 96,  // F5
            0x75 => 97,  // F6
            0x76 => 98,  // F7
            0x77 => 100, // F8
            0x78 => 101, // F9
            0x79 => 109, // F10
            0x7A => 103, // F11
            0x7B => 111, // F12

            // Numpad Keys
            0x60 => 82, // Numpad 0
            0x61 => 83, // Numpad 1
            0x62 => 84, // Numpad 2
            0x63 => 85, // Numpad 3
            0x64 => 86, // Numpad 4
            0x65 => 87, // Numpad 5
            0x66 => 88, // Numpad 6
            0x67 => 89, // Numpad 7
            0x68 => 91, // Numpad 8
            0x69 => 92, // Numpad 9
            0x6A => 67, // Numpad *
            0x6B => 69, // Numpad +
            0x6D => 78, // Numpad -
            0x6E => 65, // Numpad .
            0x6F => 75, // Numpad /

            // Modifiers (Normalized):
            0x5B => 55,        // Win / Meta -> Mac Command (55)
            0x5C => 54,        // Right Win / Meta -> Mac Right Command (54)
            0x11 | 0xA2 => 59, // Left Ctrl -> Mac Control (59)
            0xA3 => 62,        // Right Ctrl -> Mac Right Control (62)
            0x10 | 0xA0 => 56, // Left Shift -> Mac Left Shift (56)
            0xA1 => 60,        // Right Shift -> Mac Right Shift (60)
            0x12 | 0xA4 => 58, // Left Alt -> Mac Option (58)
            0xA5 => 61,        // Right Alt -> Mac Right Option (61)

            // Symbols & Punctuation
            0xBA => 41, // ;
            0xBB => 24, // =
            0xBC => 43, // ,
            0xBD => 27, // -
            0xBE => 47, // .
            0xBF => 44, // /
            0xC0 => 50, // `
            0xDB => 33, // [
            0xDC => 42, // \
            0xDD => 30, // ]
            0xDE => 39, // '

            _ => 0xFFFF,
        }
    }
}

#[allow(dead_code)]
pub fn mac_key_to_win_vk(mac_key: u16) -> u32 {
    match mac_key {
        // Letters A-Z
        0 => 0x41,  // A
        11 => 0x42, // B
        8 => 0x43,  // C
        2 => 0x44,  // D
        14 => 0x45, // E
        3 => 0x46,  // F
        5 => 0x47,  // G
        4 => 0x48,  // H
        34 => 0x49, // I
        38 => 0x4A, // J
        40 => 0x4B, // K
        37 => 0x4C, // L
        46 => 0x4D, // M
        45 => 0x4E, // N
        31 => 0x4F, // O
        35 => 0x50, // P
        12 => 0x51, // Q
        15 => 0x52, // R
        1 => 0x53,  // S
        17 => 0x54, // T
        32 => 0x55, // U
        9 => 0x56,  // V
        13 => 0x57, // W
        7 => 0x58,  // X
        16 => 0x59, // Y
        6 => 0x5A,  // Z

        // Numbers 0-9
        29 => 0x30, // 0
        18 => 0x31, // 1
        19 => 0x32, // 2
        20 => 0x33, // 3
        21 => 0x34, // 4
        23 => 0x35, // 5
        22 => 0x36, // 6
        26 => 0x37, // 7
        28 => 0x38, // 8
        25 => 0x39, // 9

        // Controls & Whitespace
        51 => 0x08, // Delete/Backspace -> VK_BACK
        48 => 0x09, // Tab -> VK_TAB
        36 => 0x0D, // Return/Enter -> VK_RETURN
        57 => 0x14, // CapsLock -> VK_CAPITAL
        53 => 0x1B, // Escape -> VK_ESCAPE
        49 => 0x20, // Space -> VK_SPACE

        // Navigation & Arrows
        123 => 0x25, // Left Arrow
        126 => 0x26, // Up Arrow
        124 => 0x27, // Right Arrow
        125 => 0x28, // Down Arrow
        117 => 0x2E, // Forward Delete -> VK_DELETE
        115 => 0x24, // Home -> VK_HOME
        119 => 0x23, // End -> VK_END
        116 => 0x21, // PageUp -> VK_PRIOR
        121 => 0x22, // PageDown -> VK_NEXT
        114 => 0x2D, // Help/Insert -> VK_INSERT

        // Function Keys F1 - F12
        122 => 0x70, // F1
        120 => 0x71, // F2
        99 => 0x72,  // F3
        118 => 0x73, // F4
        96 => 0x74,  // F5
        97 => 0x75,  // F6
        98 => 0x76,  // F7
        100 => 0x77, // F8
        101 => 0x78, // F9
        109 => 0x79, // F10
        103 => 0x7A, // F11
        111 => 0x7B, // F12

        // Modifiers (Normalized):
        55 => 0x5B, // Mac Left Command -> VK_LWIN (Meta)
        54 => 0x5C, // Mac Right Command -> VK_RWIN (Meta)
        58 => 0xA4, // Mac Left Option -> VK_LMENU (Alt)
        61 => 0xA5, // Mac Right Option -> VK_RMENU (Alt)
        59 => 0xA2, // Mac Left Control -> VK_LCONTROL
        62 => 0xA3, // Mac Right Control -> VK_RCONTROL
        56 => 0xA0, // Mac Left Shift -> VK_LSHIFT
        60 => 0xA1, // Mac Right Shift -> VK_RSHIFT

        // Symbols & Punctuation
        41 => 0xBA, // ;
        24 => 0xBB, // =
        43 => 0xBC, // ,
        27 => 0xBD, // -
        47 => 0xBE, // .
        44 => 0xBF, // /
        50 => 0xC0, // `
        33 => 0xDB, // [
        42 => 0xDC, // \
        30 => 0xDD, // ]
        39 => 0xDE, // '

        // Numpad
        82 => 0x60, // Num 0
        83 => 0x61, // Num 1
        84 => 0x62, // Num 2
        85 => 0x63, // Num 3
        86 => 0x64, // Num 4
        87 => 0x65, // Num 5
        88 => 0x66, // Num 6
        89 => 0x67, // Num 7
        91 => 0x68, // Num 8
        92 => 0x69, // Num 9
        67 => 0x6A, // Num *
        69 => 0x6B, // Num +
        78 => 0x6D, // Num -
        65 => 0x6E, // Num .
        75 => 0x6F, // Num /
        76 => 0x0D, // Num Enter

        _ => 0,
    }
}

pub struct KeyboardSimulator;

impl KeyboardSimulator {
    pub fn new() -> Self {
        Self
    }

        pub fn release_all_modifiers(&self) {
        crate::keyboard::mapping::KeyboardMappingEngine::release_stuck_keys();
    }

    pub fn key_event(
        &self,
        vk_code: u32,
        is_down: bool,
        key_char: Option<&str>,
        raw_modifiers: u8,
        source_os: Option<&str>,
    ) {
        let target_os = if cfg!(windows) {
            "windows"
        } else if cfg!(target_os = "macos") {
            "macos"
        } else {
            "linux"
        };

        let source = source_os.unwrap_or(if target_os == "macos" { "windows" } else { "macos" });
        let mode = crate::keyboard::mapping::get_mapping_mode();

        let (translated_vk, _translated_mods) = crate::keyboard::mapping::KeyboardMappingEngine::translate_key_combination(
            vk_code,
            is_down,
            raw_modifiers,
            source,
            target_os,
            mode,
        );

        #[cfg(windows)]
        unsafe {
            if translated_vk > 0 {
                let is_extended = matches!(
                    translated_vk,
                    0x21..=0x28 | 0x2D | 0x2E | 0x5B | 0x5C | 0xA3 | 0xA5
                );
                let scan = MapVirtualKeyW(translated_vk, MAPVK_VK_TO_VSC) as u16;

                let mut flags = if is_down { 0 } else { KEYEVENTF_KEYUP };
                if is_extended {
                    flags |= KEYEVENTF_EXTENDEDKEY;
                }

                let mut input = INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: translated_vk as u16,
                            wScan: scan,
                            dwFlags: flags,
                            time: 0,
                            dwExtraInfo: AIRDESK_EXTRA_INFO,
                        },
                    },
                };
                SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
            } else if let Some(ch) = key_char {
                for c in ch.encode_utf16() {
                    let flags = if is_down { KEYEVENTF_UNICODE } else { KEYEVENTF_UNICODE | KEYEVENTF_KEYUP };
                    let mut input = INPUT {
                        r#type: INPUT_KEYBOARD,
                        Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                            ki: KEYBDINPUT {
                                wVk: 0,
                                wScan: c,
                                dwFlags: flags,
                                time: 0,
                                dwExtraInfo: AIRDESK_EXTRA_INFO,
                            },
                        },
                    };
                    SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
                }
            }
        }

        #[cfg(target_os = "macos")]
        unsafe {
            use macos::*;
            let mac_code = win_vk_to_mac_key(translated_vk);

            let mut cg_flags: u64 = 0;
            if (_translated_mods & crate::keyboard::mapping::MOD_SHIFT) != 0 { cg_flags |= 0x00020000; } // Shift
            if (_translated_mods & crate::keyboard::mapping::MOD_CTRL)  != 0 { cg_flags |= 0x00040000; } // Control (^)
            if (_translated_mods & crate::keyboard::mapping::MOD_ALT)   != 0 { cg_flags |= 0x00080000; } // Option (⌥)
            if (_translated_mods & crate::keyboard::mapping::MOD_META)  != 0 { cg_flags |= 0x00100000; } // Command (⌘)

            let is_modifier_key = matches!(mac_code, 54..=62);
            let source = CGEventSourceCreate(1 /* kCGEventSourceStateHIDSystemState */);

            if is_modifier_key {
                // Ensure modifier flag state is exact:
                match mac_code {
                    54 | 55 => {
                        if is_down { cg_flags |= 0x00100000; } else { cg_flags &= !0x00100000; }
                    }
                    56 | 60 => {
                        if is_down { cg_flags |= 0x00020000; } else { cg_flags &= !0x00020000; }
                    }
                    58 | 61 => {
                        if is_down { cg_flags |= 0x00080000; } else { cg_flags &= !0x00080000; }
                    }
                    59 | 62 => {
                        if is_down { cg_flags |= 0x00040000; } else { cg_flags &= !0x00040000; }
                    }
                    _ => {}
                }

                let evt = CGEventCreateKeyboardEvent(source, mac_code, is_down);
                if !evt.is_null() {
                    CGEventSetIntegerValueField(evt, 42 /* kCGEventSourceUserData */, AIRDESK_MAC_MAGIC);
                    CGEventSetType(evt, 12 /* kCGEventFlagsChanged */);
                    CGEventSetFlags(evt, cg_flags);
                    CGEventPost(0 /* kCGHIDEventTap */, evt);
                    CFRelease(evt);
                }
            } else if mac_code != 0xFFFF {
                let is_shortcut = (cg_flags & (0x00100000 /* Cmd */ | 0x00040000 /* Ctrl */)) != 0;
                let is_control_key = matches!(
                    mac_code,
                    36   // Return
                    | 48   // Tab
                    | 51   // Delete / Backspace
                    | 53   // Escape
                    | 117  // Forward Delete
                    | 114  // Insert
                    | 115  // Home
                    | 119  // End
                    | 116  // Page Up
                    | 121  // Page Down
                    | 123..=126 // Arrows
                    | 96..=103 | 109 | 111 | 118 | 120 | 122 // F1-F12
                );

                let evt = CGEventCreateKeyboardEvent(source, mac_code, is_down);
                if !evt.is_null() {
                    CGEventSetIntegerValueField(evt, 42 /* kCGEventSourceUserData */, AIRDESK_MAC_MAGIC);
                    CGEventSetFlags(evt, cg_flags);

                    // Only attach Unicode string if it's text typing (not a shortcut, not a navigation key)
                    if !is_shortcut && !is_control_key && is_down {
                        if let Some(ch) = key_char {
                            let utf16: Vec<u16> = ch.encode_utf16().collect();
                            if !utf16.is_empty() {
                                CGEventKeyboardSetUnicodeString(evt, utf16.len(), utf16.as_ptr());
                            }
                        }
                    }

                    CGEventPost(0 /* kCGHIDEventTap */, evt);
                    CFRelease(evt);
                }
            } else if let Some(ch) = key_char {
                let evt = CGEventCreateKeyboardEvent(source, 0, is_down);
                if !evt.is_null() {
                    CGEventSetIntegerValueField(evt, 42 /* kCGEventSourceUserData */, AIRDESK_MAC_MAGIC);
                    CGEventSetFlags(evt, cg_flags);
                    if is_down {
                        let utf16: Vec<u16> = ch.encode_utf16().collect();
                        if !utf16.is_empty() {
                            CGEventKeyboardSetUnicodeString(evt, utf16.len(), utf16.as_ptr());
                        }
                    }
                    CGEventPost(0 /* kCGHIDEventTap */, evt);
                    CFRelease(evt);
                }
            }

            if !source.is_null() {
                CFRelease(source);
            }
        }
    }
}
