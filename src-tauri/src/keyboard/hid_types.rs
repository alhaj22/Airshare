//! Universal USB HID Usage Table & Platform Keycode Mapping
//! Conforms to USB-IF HID Usage Tables for Universal Input Devices (Class 0x03)
#![allow(dead_code)]

use serde::{Deserialize, Serialize};

pub const HID_USAGE_PAGE_GENERIC_DESKTOP: u16 = 0x0001;
pub const HID_USAGE_PAGE_KEYBOARD: u16        = 0x0007;
pub const HID_USAGE_PAGE_CONSUMER: u16        = 0x000C;
pub const HID_USAGE_PAGE_VENDOR_GAMING: u16   = 0xFF00;

// Modifier Bitflags (Standard Normalized Cross-Platform)
pub const MOD_FLAG_NONE: u8    = 0;
pub const MOD_FLAG_SHIFT: u8   = 1 << 0; // 1
pub const MOD_FLAG_CTRL: u8    = 1 << 1; // 2
pub const MOD_FLAG_ALT: u8     = 1 << 2; // 4
pub const MOD_FLAG_META: u8    = 1 << 3; // 8 (Windows / Command / Super)
pub const MOD_FLAG_FN: u8      = 1 << 4; // 16
pub const MOD_FLAG_ALTGR: u8   = 1 << 5; // 32
pub const MOD_FLAG_CAPSLOCK: u8= 1 << 6; // 64
pub const MOD_FLAG_NUMLOCK: u8 = 1 << 7; // 128

/// Standard Page 0x07 Keyboard Usages
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u16)]
pub enum HidKeyboardKey {
    // Letters
    KeyA = 0x04, KeyB = 0x05, KeyC = 0x06, KeyD = 0x07, KeyE = 0x08,
    KeyF = 0x09, KeyG = 0x0A, KeyH = 0x0B, KeyI = 0x0C, KeyJ = 0x0D,
    KeyK = 0x0E, KeyL = 0x0F, KeyM = 0x10, KeyN = 0x11, KeyO = 0x12,
    KeyP = 0x13, KeyQ = 0x14, KeyR = 0x15, KeyS = 0x16, KeyT = 0x17,
    KeyU = 0x18, KeyV = 0x19, KeyW = 0x1A, KeyX = 0x1B, KeyY = 0x1C,
    KeyZ = 0x1D,

    // Numbers
    Key1 = 0x1E, Key2 = 0x1F, Key3 = 0x20, Key4 = 0x21, Key5 = 0x22,
    Key6 = 0x23, Key7 = 0x24, Key8 = 0x25, Key9 = 0x26, Key0 = 0x27,

    // Controls & Whitespace
    ReturnOrEnter    = 0x28,
    Escape           = 0x29,
    DeleteOrBackspace= 0x2A,
    Tab              = 0x2B,
    Spacebar         = 0x2C,
    HyphenOrMinus    = 0x2D,
    EqualSign        = 0x2E,
    OpenBracket      = 0x2F,
    CloseBracket     = 0x30,
    BackslashAnsi    = 0x31,
    NonUsHashTilde   = 0x32,
    Semicolon        = 0x33,
    Quote            = 0x34,
    GraveAccentTilde = 0x35,
    Comma            = 0x36,
    Period           = 0x37,
    Slash            = 0x38,
    CapsLock         = 0x39,

    // Function keys
    F1 = 0x3A, F2 = 0x3B, F3 = 0x3C, F4 = 0x3D, F5 = 0x3E, F6 = 0x3F,
    F7 = 0x40, F8 = 0x41, F9 = 0x42, F10= 0x43, F11= 0x44, F12= 0x45,
    F13= 0x68, F14= 0x69, F15= 0x6A, F16= 0x6B, F17= 0x6C, F18= 0x6D,
    F19= 0x6E, F20= 0x6F, F21= 0x70, F22= 0x71, F23= 0x72, F24= 0x73,

    // Navigation & Editing
    PrintScreen   = 0x46,
    ScrollLock    = 0x47,
    PauseBreak    = 0x48,
    Insert        = 0x49,
    Home          = 0x4A,
    PageUp        = 0x4B,
    ForwardDelete = 0x4C,
    End           = 0x4D,
    PageDown      = 0x4E,
    RightArrow    = 0x4F,
    LeftArrow     = 0x50,
    DownArrow     = 0x51,
    UpArrow       = 0x52,

    // Keypad
    KeypadNumLock = 0x53,
    KeypadSlash   = 0x54,
    KeypadAsterisk= 0x55,
    KeypadMinus   = 0x56,
    KeypadPlus    = 0x57,
    KeypadEnter   = 0x58,
    Keypad1       = 0x59, Keypad2 = 0x5A, Keypad3 = 0x5B, Keypad4 = 0x5C,
    Keypad5       = 0x5D, Keypad6 = 0x5E, Keypad7 = 0x5F, Keypad8 = 0x60,
    Keypad9       = 0x61, Keypad0 = 0x62, KeypadPeriod = 0x63,

    // International & Layout-Specific
    NonUsBackslash = 0x64, // ISO keyboard key next to Left Shift (e.g. <> on German/French, \| on UK)
    ApplicationMenu= 0x65, // Context Menu key
    Power          = 0x66,
    KeypadEqual    = 0x67,
    International1 = 0x87, // JIS Ro / Backslash
    International2 = 0x88, // JIS Katakana/Hiragana
    International3 = 0x89, // JIS Yen
    International4 = 0x8A, // JIS Henkan
    International5 = 0x8B, // JIS Muhenkan

    // Standard Modifiers (0xE0 - 0xE7)
    LeftControl = 0xE0,
    LeftShift   = 0xE1,
    LeftAlt     = 0xE2,
    LeftMeta    = 0xE3, // Left Win / Left Command / Left Super
    RightControl= 0xE4,
    RightShift  = 0xE5,
    RightAlt    = 0xE6, // Right Alt / AltGr
    RightMeta   = 0xE7, // Right Win / Right Command / Right Super

    Unknown = 0xFFFF,
}

/// Standard Page 0x0C Consumer Usages (Media, Audio, Brightness)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u16)]
pub enum HidConsumerKey {
    MediaPlayPause    = 0x00CD,
    MediaStop         = 0x00B7,
    MediaNextTrack    = 0x00B5,
    MediaPrevTrack    = 0x00B6,
    MediaVolumeMute   = 0x00E2,
    MediaVolumeUp     = 0x00E9,
    MediaVolumeDown   = 0x00EA,
    DisplayBrightnessUp   = 0x006F,
    DisplayBrightnessDown = 0x0070,
    Unknown = 0xFFFF,
}

/// Convert Windows Virtual-Key (VK) to standard USB HID Usage
pub fn win_vk_to_hid_usage(vk: u32, is_extended: bool) -> u16 {
    match vk {
        // Letters A-Z
        0x41..=0x5A => (0x04 + (vk - 0x41)) as u16,

        // Numbers 0-9
        0x31..=0x39 => (0x1E + (vk - 0x31)) as u16,
        0x30 => 0x27,

        // Numpad
        0x60 => 0x62, // Num 0
        0x61..=0x69 => (0x59 + (vk - 0x61)) as u16,
        0x6A => 0x55, // *
        0x6B => 0x57, // +
        0x6D => 0x56, // -
        0x6E => 0x63, // .
        0x6F => 0x54, // /

        // Function keys F1-F12
        0x70..=0x7B => (0x3A + (vk - 0x70)) as u16,
        // Function keys F13-F24
        0x7C..=0x87 => (0x68 + (vk - 0x7C)) as u16,

        // Standard Navigation / Editing
        0x08 => 0x2A, // Backspace
        0x09 => 0x2B, // Tab
        0x0D => if is_extended { 0x58 } else { 0x28 }, // Enter (Keypad vs Main)
        0x1B => 0x29, // Escape
        0x20 => 0x2C, // Space
        0x14 => 0x39, // CapsLock

        0x24 => 0x4A, // Home
        0x23 => 0x4D, // End
        0x21 => 0x4B, // PageUp
        0x22 => 0x4E, // PageDown
        0x2D => 0x49, // Insert
        0x2E => 0x4C, // Delete
        0x25 => 0x50, // Left Arrow
        0x26 => 0x52, // Up Arrow
        0x27 => 0x4F, // Right Arrow
        0x28 => 0x51, // Down Arrow

        // Modifiers
        0x10 | 0xA0 => 0xE1, // Left Shift
        0xA1        => 0xE5, // Right Shift
        0x11 | 0xA2 => 0xE0, // Left Ctrl
        0xA3        => 0xE4, // Right Ctrl
        0x12 | 0xA4 => 0xE2, // Left Alt
        0xA5        => 0xE6, // Right Alt (AltGr)
        0x5B        => 0xE3, // Left Win (Meta)
        0x5C        => 0xE7, // Right Win (Meta)
        0x5D        => 0x65, // Apps / Context Menu

        // Symbols & Punctuation
        0xBA => 0x33, // ;:
        0xBB => 0x2E, // =+
        0xBC => 0x36, // ,<
        0xBD => 0x2D, // -_
        0xBE => 0x37, // .>
        0xBF => 0x38, // /?
        0xC0 => 0x35, // `~
        0xDB => 0x2F, // [{
        0xDC => 0x31, // \|
        0xDD => 0x30, // ]}
        0xDE => 0x34, // '"
        0xE2 => 0x64, // Non-US \ (OEM_102)

        // Locks & Special
        0x2C => 0x46, // PrintScreen
        0x91 => 0x47, // ScrollLock
        0x13 => 0x48, // Pause
        0x90 => 0x53, // NumLock

        // Media & Consumer Keys (Consumer Page 0x0C)
        0xAD => 0x00E2, // Mute
        0xAE => 0x00EA, // Volume Down
        0xAF => 0x00E9, // Volume Up
        0xB0 => 0x00B5, // Next Track
        0xB1 => 0x00B6, // Prev Track
        0xB2 => 0x00B7, // Stop
        0xB3 => 0x00CD, // Play/Pause

        _ => 0xFFFF,
    }
}

/// Convert standard USB HID Usage (with page context) to Windows Virtual-Key (VK)
pub fn hid_usage_to_win_vk_paged(page: u16, usage: u16) -> (u32, bool) {
    if page == HID_USAGE_PAGE_CONSUMER {
        let vk = match usage {
            0x00E2 => 0xAD, // Mute
            0x00EA => 0xAE, // Vol Down
            0x00E9 => 0xAF, // Vol Up
            0x00B5 => 0xB0, // Next
            0x00B6 => 0xB1, // Prev
            0x00B7 => 0xB2, // Stop
            0x00CD => 0xB3, // Play/Pause
            _ => 0,
        };
        return (vk, true);
    }

    // Default: Keyboard Page 0x07
    let (vk, is_ext) = match usage {
        // Letters A-Z
        0x04..=0x1D => (0x41 + (usage - 0x04) as u32, false),

        // Numbers 1-9, 0
        0x1E..=0x26 => (0x31 + (usage - 0x1E) as u32, false),
        0x27 => (0x30, false),

        // Controls
        0x28 => (0x0D, false), // Enter
        0x29 => (0x1B, false), // Escape
        0x2A => (0x08, false), // Backspace
        0x2B => (0x09, false), // Tab
        0x2C => (0x20, false), // Space
        0x2D => (0xBD, false), // -
        0x2E => (0xBB, false), // =
        0x2F => (0xDB, false), // [
        0x30 => (0xDD, false), // ]
        0x31 => (0xDC, false), // \
        0x32 => (0xE2, false), // Non-US #
        0x33 => (0xBA, false), // ;
        0x34 => (0xDE, false), // '
        0x35 => (0xC0, false), // `
        0x36 => (0xBC, false), // ,
        0x37 => (0xBE, false), // .
        0x38 => (0xBF, false), // /
        0x39 => (0x14, false), // CapsLock

        // Function keys F1-F12
        0x3A..=0x45 => (0x70 + (usage - 0x3A) as u32, false),
        // F13-F24
        0x68..=0x73 => (0x7C + (usage - 0x68) as u32, false),

        // Navigation
        0x46 => (0x2C, false), // PrintScreen
        0x47 => (0x91, false), // ScrollLock
        0x48 => (0x13, false), // Pause
        0x49 => (0x2D, true),  // Insert (Extended)
        0x4A => (0x24, true),  // Home
        0x4B => (0x21, true),  // PageUp
        0x4C => (0x2E, true),  // Delete
        0x4D => (0x23, true),  // End
        0x4E => (0x22, true),  // PageDown
        0x4F => (0x27, true),  // Right
        0x50 => (0x25, true),  // Left
        0x51 => (0x28, true),  // Down
        0x52 => (0x26, true),  // Up

        // Keypad
        0x53 => (0x90, true),  // NumLock
        0x54 => (0x6F, true),  // /
        0x55 => (0x6A, false), // *
        0x56 => (0x6D, false), // -
        0x57 => (0x6B, false), // +
        0x58 => (0x0D, true),  // Keypad Enter
        0x59..=0x61 => (0x61 + (usage - 0x59) as u32, false), // 1-9
        0x62 => (0x60, false), // 0
        0x63 => (0x6E, false), // .
        0x64 => (0xE2, false), // ISO Backslash (OEM_102)
        0x65 => (0x5D, true),  // Apps

        // Modifiers
        0xE0 => (0xA2, false), // Left Ctrl
        0xE1 => (0xA0, false), // Left Shift
        0xE2 => (0xA4, false), // Left Alt
        0xE3 => (0x5B, true),  // Left Win
        0xE4 => (0xA3, true),  // Right Ctrl
        0xE5 => (0xA1, false), // Right Shift
        0xE6 => (0xA5, true),  // Right Alt (AltGr)
        0xE7 => (0x5C, true),  // Right Win

        _ => (0, false),
    };
    (vk, is_ext)
}

/// Convenience fallback assuming Page 0x07 unless matching consumer range
pub fn hid_usage_to_win_vk(usage: u16) -> (u32, bool) {
    if matches!(usage, 0x00CD | 0x00B5 | 0x00B6 | 0x00B7 | 0x00E9 | 0x00EA) {
        hid_usage_to_win_vk_paged(HID_USAGE_PAGE_CONSUMER, usage)
    } else {
        hid_usage_to_win_vk_paged(HID_USAGE_PAGE_KEYBOARD, usage)
    }
}

/// Convert standard USB HID Usage to macOS Carbon/Cocoa Virtual Keycode
pub fn hid_usage_to_mac_key(usage: u16) -> u16 {
    match usage {
        // Letters A-Z
        0x04 => 0,   // A
        0x05 => 11,  // B
        0x06 => 8,   // C
        0x07 => 2,   // D
        0x08 => 14,  // E
        0x09 => 3,   // F
        0x0A => 5,   // G
        0x0B => 4,   // H
        0x0C => 34,  // I
        0x0D => 38,  // J
        0x0E => 40,  // K
        0x0F => 37,  // L
        0x10 => 46,  // M
        0x11 => 45,  // N
        0x12 => 31,  // O
        0x13 => 35,  // P
        0x14 => 12,  // Q
        0x15 => 15,  // R
        0x16 => 1,   // S
        0x17 => 17,  // T
        0x18 => 32,  // U
        0x19 => 9,   // V
        0x1A => 13,  // W
        0x1B => 7,   // X
        0x1C => 16,  // Y
        0x1D => 6,   // Z

        // Numbers 1-9, 0
        0x1E => 18, // 1
        0x1F => 19, // 2
        0x20 => 20, // 3
        0x21 => 21, // 4
        0x22 => 23, // 5
        0x23 => 22, // 6
        0x24 => 26, // 7
        0x25 => 28, // 8
        0x26 => 25, // 9
        0x27 => 29, // 0

        // Controls
        0x28 => 36,  // Return
        0x29 => 53,  // Escape
        0x2A => 51,  // Delete (Backspace)
        0x2B => 48,  // Tab
        0x2C => 49,  // Space
        0x2D => 27,  // -
        0x2E => 24,  // =
        0x2F => 33,  // [
        0x30 => 30,  // ]
        0x31 => 42,  // \
        0x32 => 10,  // Non-US ISO #
        0x33 => 41,  // ;
        0x34 => 39,  // '
        0x35 => 50,  // `
        0x36 => 43,  // ,
        0x37 => 47,  // .
        0x38 => 44,  // /
        0x39 => 57,  // CapsLock
        0x64 => 10,  // Non-US ISO Backslash (Section / Paragraph on Mac)

        // Function Keys F1-F12
        0x3A => 122, // F1
        0x3B => 120, // F2
        0x3C => 99,  // F3
        0x3D => 118, // F4
        0x3E => 96,  // F5
        0x3F => 97,  // F6
        0x40 => 98,  // F7
        0x41 => 100, // F8
        0x42 => 101, // F9
        0x43 => 109, // F10
        0x44 => 103, // F11
        0x45 => 111, // F12
        0x68 => 105, // F13 (PrintScreen equivalent)
        0x69 => 107, // F14 (ScrollLock equivalent)
        0x6A => 113, // F15 (Pause equivalent)

        // Navigation
        0x49 => 114, // Help / Insert
        0x4A => 115, // Home
        0x4B => 116, // PageUp
        0x4C => 117, // Forward Delete
        0x4D => 119, // End
        0x4E => 121, // PageDown
        0x4F => 124, // Right Arrow
        0x50 => 123, // Left Arrow
        0x51 => 125, // Down Arrow
        0x52 => 126, // Up Arrow

        // Keypad
        0x53 => 71, // Clear / NumLock
        0x54 => 75, // Keypad /
        0x55 => 67, // Keypad *
        0x56 => 78, // Keypad -
        0x57 => 69, // Keypad +
        0x58 => 76, // Keypad Enter
        0x59 => 83, 0x5A => 84, 0x5B => 85, // 1, 2, 3
        0x5C => 86, 0x5D => 87, 0x5E => 88, // 4, 5, 6
        0x5F => 89, 0x60 => 91, 0x61 => 92, // 7, 8, 9
        0x62 => 82, // Keypad 0
        0x63 => 65, // Keypad .
        0x67 => 81, // Keypad =

        // Modifiers (Normalized):
        0xE0 => 59, // Left Control
        0xE1 => 56, // Left Shift
        0xE2 => 58, // Left Option (Alt)
        0xE3 => 55, // Left Command
        0xE4 => 62, // Right Control
        0xE5 => 60, // Right Shift
        0xE6 => 61, // Right Option (Alt)
        0xE7 => 54, // Right Command

        _ => 0xFFFF,
    }
}

/// Convert macOS Carbon/Cocoa Virtual Keycode to standard USB HID Usage
pub fn mac_key_to_hid_usage(mac_key: u16) -> u16 {
    match mac_key {
        // Letters A-Z
        0  => 0x04, // A
        11 => 0x05, // B
        8  => 0x06, // C
        2  => 0x07, // D
        14 => 0x08, // E
        3  => 0x09, // F
        5  => 0x0A, // G
        4  => 0x0B, // H
        34 => 0x0C, // I
        38 => 0x0D, // J
        40 => 0x0E, // K
        37 => 0x0F, // L
        46 => 0x10, // M
        45 => 0x11, // N
        31 => 0x12, // O
        35 => 0x13, // P
        12 => 0x14, // Q
        15 => 0x15, // R
        1  => 0x16, // S
        17 => 0x17, // T
        32 => 0x18, // U
        9  => 0x19, // V
        13 => 0x1A, // W
        7  => 0x1B, // X
        16 => 0x1C, // Y
        6  => 0x1D, // Z

        // Numbers
        18 => 0x1E, 19 => 0x1F, 20 => 0x20, 21 => 0x21, 23 => 0x22,
        22 => 0x23, 26 => 0x24, 28 => 0x25, 25 => 0x26, 29 => 0x27,

        // Controls
        36 => 0x28, // Return
        53 => 0x29, // Escape
        51 => 0x2A, // Delete (Backspace)
        48 => 0x2B, // Tab
        49 => 0x2C, // Space
        27 => 0x2D, // -
        24 => 0x2E, // =
        33 => 0x2F, // [
        30 => 0x30, // ]
        42 => 0x31, // \
        10 => 0x64, // Non-US ISO Backslash
        41 => 0x33, // ;
        39 => 0x34, // '
        50 => 0x35, // `
        43 => 0x36, // ,
        47 => 0x37, // .
        44 => 0x38, // /
        57 => 0x39, // CapsLock

        // Function Keys
        122 => 0x3A, 120 => 0x3B, 99 => 0x3C, 118 => 0x3D,
        96  => 0x3E, 97  => 0x3F, 98 => 0x40, 100 => 0x41,
        101 => 0x42, 109 => 0x43, 103=> 0x44, 111 => 0x45,

        // Navigation
        114 => 0x49, // Help / Insert
        115 => 0x4A, // Home
        116 => 0x4B, // PageUp
        117 => 0x4C, // Forward Delete
        119 => 0x4D, // End
        121 => 0x4E, // PageDown
        124 => 0x4F, // Right Arrow
        123 => 0x50, // Left Arrow
        125 => 0x51, // Down Arrow
        126 => 0x52, // Up Arrow

        // Modifiers
        59 => 0xE0, // Left Control
        56 => 0xE1, // Left Shift
        58 => 0xE2, // Left Option (Alt)
        55 => 0xE3, // Left Command (Meta)
        62 => 0xE4, // Right Control
        60 => 0xE5, // Right Shift
        61 => 0xE6, // Right Option (Alt)
        54 => 0xE7, // Right Command (Meta)

        // Keypad
        71 => 0x53, // Clear
        75 => 0x54, 67 => 0x55, 78 => 0x56, 69 => 0x57, 76 => 0x58,
        83 => 0x59, 84 => 0x5A, 85 => 0x5B, 86 => 0x5C, 87 => 0x5D,
        88 => 0x5E, 89 => 0x5F, 91 => 0x60, 92 => 0x61, 82 => 0x62,
        65 => 0x63, 81 => 0x67,

        _ => 0xFFFF,
    }
}

/// Convert standard USB HID Usage to Linux evdev KEY_* codes with usage page disambiguation
pub fn hid_usage_to_linux_code_paged(usage_page: u16, usage: u16) -> u16 {
    if usage_page == 0x0C {
        match usage {
            0x00E2 => 113, // KEY_MUTE
            0x00EA => 114, // KEY_VOLUMEDOWN
            0x00E9 => 115, // KEY_VOLUMEUP
            0x00CD => 164, // KEY_PLAYPAUSE
            0x00B5 => 163, // KEY_NEXTSONG
            0x00B6 => 165, // KEY_PREVIOUSSONG
            0x00B7 => 166, // KEY_STOPCD
            _ => 0,
        }
    } else {
        match usage {
            0x04..=0x1D => match usage {
                0x04 => 30, // KEY_A
                0x05 => 48, // KEY_B
                0x06 => 46, // KEY_C
                0x07 => 32, // KEY_D
                0x08 => 18, // KEY_E
                0x09 => 33, // KEY_F
                0x0A => 34, // KEY_G
                0x0B => 35, // KEY_H
                0x0C => 23, // KEY_I
                0x0D => 36, // KEY_J
                0x0E => 37, // KEY_K
                0x0F => 38, // KEY_L
                0x10 => 50, // KEY_M
                0x11 => 49, // KEY_N
                0x12 => 24, // KEY_O
                0x13 => 25, // KEY_P
                0x14 => 16, // KEY_Q
                0x15 => 19, // KEY_R
                0x16 => 31, // KEY_S
                0x17 => 20, // KEY_T
                0x18 => 22, // KEY_U
                0x19 => 47, // KEY_V
                0x1A => 17, // KEY_W
                0x1B => 45, // KEY_X
                0x1C => 21, // KEY_Y
                0x1D => 44, // KEY_Z
                _ => 0,
            },
            0x1E => 2, 0x1F => 3, 0x20 => 4, 0x21 => 5, 0x22 => 6, // 1-5
            0x23 => 7, 0x24 => 8, 0x25 => 9, 0x26 => 10, 0x27 => 11, // 6-0

            0x28 => 28,  // KEY_ENTER
            0x29 => 1,   // KEY_ESC
            0x2A => 14,  // KEY_BACKSPACE
            0x2B => 15,  // KEY_TAB
            0x2C => 57,  // KEY_SPACE
            0x2D => 12,  // KEY_MINUS
            0x2E => 13,  // KEY_EQUAL
            0x2F => 26,  // KEY_LEFTBRACE
            0x30 => 27,  // KEY_RIGHTBRACE
            0x31 => 43,  // KEY_BACKSLASH
            0x33 => 39,  // KEY_SEMICOLON
            0x34 => 40,  // KEY_APOSTROPHE
            0x35 => 41,  // KEY_GRAVE
            0x36 => 51,  // KEY_COMMA
            0x37 => 52,  // KEY_DOT
            0x38 => 53,  // KEY_SLASH
            0x39 => 58,  // KEY_CAPSLOCK
            0x64 => 86,  // KEY_102ND (Non-US \)

            0x3A..=0x45 => (59 + (usage - 0x3A)) as u16, // F1-F12

            0x49 => 110, // KEY_INSERT
            0x4A => 102, // KEY_HOME
            0x4B => 104, // KEY_PAGEUP
            0x4C => 111, // KEY_DELETE
            0x4D => 107, // KEY_END
            0x4E => 109, // KEY_PAGEDOWN
            0x4F => 106, // KEY_RIGHT
            0x50 => 105, // KEY_LEFT
            0x51 => 108, // KEY_DOWN
            0x52 => 103, // KEY_UP

            // Modifiers
            0xE0 => 29,  // KEY_LEFTCTRL
            0xE1 => 42,  // KEY_LEFTSHIFT
            0xE2 => 56,  // KEY_LEFTALT
            0xE3 => 125, // KEY_LEFTMETA (Super)
            0xE4 => 97,  // KEY_RIGHTCTRL
            0xE5 => 54,  // KEY_RIGHTSHIFT
            0xE6 => 100, // KEY_RIGHTALT (AltGr)
            0xE7 => 126, // KEY_RIGHTMETA (Super)

            _ => 0,
        }
    }
}

/// Convert standard USB HID Usage to Linux evdev KEY_* codes (defaults to Page 0x07)
pub fn hid_usage_to_linux_code(usage: u16) -> u16 {
    hid_usage_to_linux_code_paged(0x07, usage)
}
