use std::sync::atomic::{AtomicBool, Ordering};

pub const AIRDESK_EXTRA_INFO: usize = 0xA12DE5C0;
#[allow(dead_code)]
pub const AIRDESK_MAC_MAGIC: i64 = 0x41495244; // 'AIRD'

#[cfg(windows)]
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_MOUSE, MOUSEEVENTF_ABSOLUTE, MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP,
    MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP, MOUSEEVENTF_MOVE, MOUSEEVENTF_RIGHTDOWN,
    MOUSEEVENTF_RIGHTUP, MOUSEEVENTF_WHEEL, MOUSEINPUT,
};
#[cfg(windows)]
use windows_sys::Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN};

#[cfg(target_os = "macos")]
mod macos {
    use std::os::raw::c_void;

    #[repr(C)]
    #[derive(Clone, Copy)]
    pub struct CGPoint {
        pub x: f64,
        pub y: f64,
    }

    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        pub fn CGWarpMouseCursorPosition(newCursorPosition: CGPoint) -> i32;
        pub fn CGEventCreate(source: *mut c_void) -> *mut c_void;
        pub fn CGEventGetLocation(event: *mut c_void) -> CGPoint;
        pub fn CGEventCreateMouseEvent(
            source: *mut c_void,
            mouseType: u32,
            mouseCursorPosition: CGPoint,
            mouseButton: u32,
        ) -> *mut c_void;
        pub fn CGEventCreateScrollWheelEvent(
            source: *mut c_void,
            units: u32,
            wheelCount: u32,
            wheel1: i32,
        ) -> *mut c_void;
        pub fn CGEventSetIntegerValueField(event: *mut c_void, field: u32, value: i64);
        pub fn CGEventPost(tap: u32, event: *mut c_void);
        pub fn CFRelease(cf: *mut c_void);
    }
}

pub struct MouseSimulator {
    _screen_width: u32,
    _screen_height: u32,
    is_left_down: AtomicBool,
    is_right_down: AtomicBool,
}

impl MouseSimulator {
    pub fn new(screen_width: u32, screen_height: u32) -> Self {
        Self {
            _screen_width: screen_width,
            _screen_height: screen_height,
            is_left_down: AtomicBool::new(false),
            is_right_down: AtomicBool::new(false),
        }
    }

    pub fn move_relative(&self, dx: i32, dy: i32) {
        #[cfg(windows)]
        unsafe {
            let mut input = INPUT {
                r#type: INPUT_MOUSE,
                Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                    mi: MOUSEINPUT {
                        dx,
                        dy,
                        mouseData: 0,
                        dwFlags: MOUSEEVENTF_MOVE,
                        time: 0,
                        dwExtraInfo: AIRDESK_EXTRA_INFO,
                    },
                },
            };
            SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
        }

        #[cfg(target_os = "macos")]
        unsafe {
            use macos::*;
            let dummy = CGEventCreate(std::ptr::null_mut());
            if !dummy.is_null() {
                let loc = CGEventGetLocation(dummy);
                CFRelease(dummy);
                let new_pos = CGPoint {
                    x: loc.x + dx as f64,
                    y: loc.y + dy as f64,
                };
                CGWarpMouseCursorPosition(new_pos);
                let mouse_type = if self.is_left_down.load(Ordering::SeqCst) {
                    6 // kCGEventLeftMouseDragged
                } else if self.is_right_down.load(Ordering::SeqCst) {
                    7 // kCGEventRightMouseDragged
                } else {
                    5 // kCGEventMouseMoved
                };
                let mouse_btn = if self.is_right_down.load(Ordering::SeqCst) { 1 } else { 0 };
                let move_evt = CGEventCreateMouseEvent(
                    std::ptr::null_mut(),
                    mouse_type,
                    new_pos,
                    mouse_btn,
                );
                if !move_evt.is_null() {
                    CGEventSetIntegerValueField(move_evt, 55 /* kCGEventSourceUserData */, AIRDESK_MAC_MAGIC);
                    CGEventPost(0 /* kCGHIDEventTap */, move_evt);
                    CFRelease(move_evt);
                }
            }
        }
    }

    pub fn move_absolute(&self, x: i32, y: i32) {
        #[cfg(windows)]
        unsafe {
            let screen_w = GetSystemMetrics(SM_CXSCREEN) as f64;
            let screen_h = GetSystemMetrics(SM_CYSCREEN) as f64;

            // Normalized coordinates (0 to 65535)
            let norm_x = ((x as f64 / screen_w) * 65535.0) as i32;
            let norm_y = ((y as f64 / screen_h) * 65535.0) as i32;

            let mut input = INPUT {
                r#type: INPUT_MOUSE,
                Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                    mi: MOUSEINPUT {
                        dx: norm_x,
                        dy: norm_y,
                        mouseData: 0,
                        dwFlags: MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE,
                        time: 0,
                        dwExtraInfo: AIRDESK_EXTRA_INFO,
                    },
                },
            };
            SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
        }

        #[cfg(target_os = "macos")]
        unsafe {
            use macos::*;
            let pos = CGPoint {
                x: x as f64,
                y: y as f64,
            };
            CGWarpMouseCursorPosition(pos);
            let mouse_type = if self.is_left_down.load(Ordering::SeqCst) {
                6 // kCGEventLeftMouseDragged
            } else if self.is_right_down.load(Ordering::SeqCst) {
                7 // kCGEventRightMouseDragged
            } else {
                5 // kCGEventMouseMoved
            };
            let mouse_btn = if self.is_right_down.load(Ordering::SeqCst) { 1 } else { 0 };
            let move_evt = CGEventCreateMouseEvent(std::ptr::null_mut(), mouse_type, pos, mouse_btn);
            if !move_evt.is_null() {
                CGEventSetIntegerValueField(move_evt, 55 /* kCGEventSourceUserData */, AIRDESK_MAC_MAGIC);
                CGEventPost(0 /* kCGHIDEventTap */, move_evt);
                CFRelease(move_evt);
            }
        }
    }

    pub fn button_event(&self, button: u8, is_down: bool) {
        if button == 0 {
            self.is_left_down.store(is_down, Ordering::SeqCst);
        } else if button == 1 {
            self.is_right_down.store(is_down, Ordering::SeqCst);
        }

        #[cfg(windows)]
        unsafe {
            let flags = match (button, is_down) {
                (0, true) => MOUSEEVENTF_LEFTDOWN,
                (0, false) => MOUSEEVENTF_LEFTUP,
                (1, true) => MOUSEEVENTF_RIGHTDOWN,
                (1, false) => MOUSEEVENTF_RIGHTUP,
                (2, true) => MOUSEEVENTF_MIDDLEDOWN,
                (2, false) => MOUSEEVENTF_MIDDLEUP,
                _ => return,
            };

            let mut input = INPUT {
                r#type: INPUT_MOUSE,
                Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                    mi: MOUSEINPUT {
                        dx: 0,
                        dy: 0,
                        mouseData: 0,
                        dwFlags: flags,
                        time: 0,
                        dwExtraInfo: AIRDESK_EXTRA_INFO,
                    },
                },
            };
            SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
        }

        #[cfg(target_os = "macos")]
        unsafe {
            use macos::*;
            let dummy = CGEventCreate(std::ptr::null_mut());
            let loc = if !dummy.is_null() {
                let l = CGEventGetLocation(dummy);
                CFRelease(dummy);
                l
            } else {
                CGPoint { x: 0.0, y: 0.0 }
            };

            let (mouse_type, mouse_btn) = match (button, is_down) {
                (0, true) => (1 /* kCGEventLeftMouseDown */, 0 /* kCGMouseButtonLeft */),
                (0, false) => (2 /* kCGEventLeftMouseUp */, 0),
                (1, true) => (3 /* kCGEventRightMouseDown */, 1 /* kCGMouseButtonRight */),
                (1, false) => (4 /* kCGEventRightMouseUp */, 1),
                (2, true) => (25 /* kCGEventOtherMouseDown */, 2 /* kCGMouseButtonCenter */),
                (2, false) => (26 /* kCGEventOtherMouseUp */, 2),
                _ => return,
            };

            let evt = CGEventCreateMouseEvent(std::ptr::null_mut(), mouse_type, loc, mouse_btn);
            if !evt.is_null() {
                CGEventSetIntegerValueField(evt, 55 /* kCGEventSourceUserData */, AIRDESK_MAC_MAGIC);
                CGEventPost(0 /* kCGHIDEventTap */, evt);
                CFRelease(evt);
            }
        }
    }

    pub fn scroll(&self, delta_x: i32, delta_y: i32) {
        #[cfg(windows)]
        unsafe {
            if delta_y != 0 {
                let mut input = INPUT {
                    r#type: INPUT_MOUSE,
                    Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                        mi: MOUSEINPUT {
                            dx: 0,
                            dy: 0,
                            mouseData: (delta_y * 120) as u32,
                            dwFlags: MOUSEEVENTF_WHEEL,
                            time: 0,
                            dwExtraInfo: AIRDESK_EXTRA_INFO,
                        },
                    },
                };
                SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
            }

            if delta_x != 0 {
                let mut input = INPUT {
                    r#type: INPUT_MOUSE,
                    Anonymous: windows_sys::Win32::UI::Input::KeyboardAndMouse::INPUT_0 {
                        mi: MOUSEINPUT {
                            dx: 0,
                            dy: 0,
                            mouseData: (delta_x * 120) as u32,
                            dwFlags: 0x01000, // MOUSEEVENTF_HWHEEL
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
            use macos::*;
            if delta_y != 0 {
                let evt = CGEventCreateScrollWheelEvent(
                    std::ptr::null_mut(),
                    0, // kCGScrollEventUnitPixel
                    1,
                    delta_y * 10,
                );
                if !evt.is_null() {
                    CGEventSetIntegerValueField(evt, 55 /* kCGEventSourceUserData */, AIRDESK_MAC_MAGIC);
                    CGEventPost(0 /* kCGHIDEventTap */, evt);
                    CFRelease(evt);
                }
            }
        }
    }
}
