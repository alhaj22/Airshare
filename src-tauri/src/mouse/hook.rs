use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use serde::{Deserialize, Serialize};

#[allow(unused_imports)]
use crate::network::protocol::{MouseButtonPayload, MouseMovePayload, MouseWheelPayload, NetworkMessage, SwitchScreenPayload};
#[allow(unused_imports)]
use crate::mouse::simulator::{AIRDESK_EXTRA_INFO, AIRDESK_MAC_MAGIC};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ScreenArrangement {
    HostLeftClientRight,
    HostRightClientLeft,
    HostTopClientBottom,
    HostBottomClientTop,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActiveScreen {
    Host,
    Client,
}

lazy_static::lazy_static! {
    static ref MOUSE_HOOK_TX: std::sync::Mutex<Option<mpsc::UnboundedSender<NetworkMessage>>> = std::sync::Mutex::new(None);
    static ref UI_EVENT_TX: std::sync::Mutex<Option<mpsc::UnboundedSender<String>>> = std::sync::Mutex::new(None);
    static ref CURRENT_ARRANGEMENT: std::sync::RwLock<ScreenArrangement> = std::sync::RwLock::new(ScreenArrangement::HostLeftClientRight);
    static ref CURRENT_ACTIVE_SCREEN: std::sync::RwLock<ActiveScreen> = std::sync::RwLock::new(ActiveScreen::Host);
    static ref SCREEN_DIMENSIONS: std::sync::RwLock<(i32, i32)> = std::sync::RwLock::new((1366, 768));
    static ref REMOTE_SCREEN_SIZE: std::sync::RwLock<(f32, f32)> = std::sync::RwLock::new((1440.0, 900.0));
    static ref LAST_CURSOR: std::sync::RwLock<(i32, i32)> = std::sync::RwLock::new((0, 0));
    static ref VERTICAL_OFFSET_RATIO: std::sync::RwLock<f32> = std::sync::RwLock::new(0.0);
    static ref HORIZONTAL_OFFSET_RATIO: std::sync::RwLock<f32> = std::sync::RwLock::new(0.0);
    static ref VIRTUAL_REMOTE_POS: std::sync::RwLock<(f32, f32)> = std::sync::RwLock::new((0.0, 0.5));
    static ref LAST_SWITCH_TIME: std::sync::RwLock<Option<std::time::Instant>> = std::sync::RwLock::new(None);
}

pub fn get_current_active_screen() -> ActiveScreen {
    CURRENT_ACTIVE_SCREEN.read().map(|s| *s).unwrap_or(ActiveScreen::Host)
}

pub fn set_current_active_screen(screen: ActiveScreen) {
    if let Ok(mut s) = CURRENT_ACTIVE_SCREEN.write() {
        *s = screen;
    }
    if let Ok(mut t) = LAST_SWITCH_TIME.write() {
        *t = Some(std::time::Instant::now());
    }
    crate::keyboard::set_keyboard_active_screen(screen);
}

pub fn clear_mouse_hook_sender() {
    if let Ok(mut tx) = MOUSE_HOOK_TX.lock() {
        *tx = None;
    }
    if let Ok(mut ui) = UI_EVENT_TX.lock() {
        *ui = None;
    }
}

pub fn set_remote_screen_size(width: u32, height: u32) {
    if let Ok(mut rem) = REMOTE_SCREEN_SIZE.write() {
        *rem = (width.max(800) as f32, height.max(600) as f32);
    }
}

pub struct MouseEdgeMonitor {
    _screen_width: u32,
    _screen_height: u32,
    arrangement: Arc<RwLock<ScreenArrangement>>,
    active_screen: Arc<RwLock<ActiveScreen>>,
    is_running: Arc<AtomicBool>,
}

impl MouseEdgeMonitor {
    pub fn new(screen_width: u32, screen_height: u32) -> Self {
        if let Ok(mut dims) = SCREEN_DIMENSIONS.write() {
            *dims = (screen_width as i32, screen_height as i32);
        }

        Self {
            _screen_width: screen_width,
            _screen_height: screen_height,
            arrangement: Arc::new(RwLock::new(ScreenArrangement::HostLeftClientRight)),
            active_screen: Arc::new(RwLock::new(ActiveScreen::Host)),
            is_running: Arc::new(AtomicBool::new(false)),
        }
    }

    pub async fn set_arrangement(&self, arrangement: ScreenArrangement) {
        *self.arrangement.write().await = arrangement;
        if let Ok(mut arr) = CURRENT_ARRANGEMENT.write() {
            *arr = arrangement;
        }
    }

    pub async fn set_vertical_offset(&self, offset: f32) {
        if let Ok(mut off) = VERTICAL_OFFSET_RATIO.write() {
            *off = offset;
        }
    }

    pub async fn set_horizontal_offset(&self, offset: f32) {
        if let Ok(mut off) = HORIZONTAL_OFFSET_RATIO.write() {
            *off = offset;
        }
    }

    pub async fn get_active_screen(&self) -> ActiveScreen {
        get_current_active_screen()
    }

    pub async fn set_active_screen(&self, screen: ActiveScreen) {
        *self.active_screen.write().await = screen;
        set_current_active_screen(screen);

        #[cfg(windows)]
        {
            let (screen_w, screen_h) = SCREEN_DIMENSIONS.read().map(|d| *d).unwrap_or((1366, 768));
            let center_x = screen_w / 2;
            let center_y = screen_h / 2;
            unsafe {
                windows_sys::Win32::UI::WindowsAndMessaging::SetCursorPos(center_x, center_y);
            }
        }

        #[cfg(target_os = "macos")]
        {
            let (screen_w, screen_h) = SCREEN_DIMENSIONS.read().map(|d| *d).unwrap_or((1440, 900));
            let center_x = screen_w / 2;
            let center_y = screen_h / 2;
            unsafe {
                macos_mouse::CGWarpMouseCursorPosition(macos_mouse::CGPoint {
                    x: center_x as f64,
                    y: center_y as f64,
                });
            }
        }
    }

    pub fn start_monitor(
        &self,
        network_tx: mpsc::UnboundedSender<NetworkMessage>,
        ui_event_tx: mpsc::UnboundedSender<String>,
    ) {
        self.is_running.store(true, Ordering::SeqCst);
        let is_running = self.is_running.clone();

        if let Ok(mut tx) = MOUSE_HOOK_TX.lock() {
            *tx = Some(network_tx);
        }
        if let Ok(mut ui_tx) = UI_EVENT_TX.lock() {
            *ui_tx = Some(ui_event_tx);
        }

        #[cfg(target_os = "macos")]
        {
            let running = is_running.clone();
            std::thread::spawn(move || {
                macos_mouse::run_macos_mouse_loop(running);
            });
        }

        std::thread::spawn(move || {
            #[cfg(windows)]
            unsafe {
                use windows_sys::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
                use windows_sys::Win32::System::LibraryLoader::GetModuleHandleW;
                use windows_sys::Win32::UI::WindowsAndMessaging::{
                    CallNextHookEx, DispatchMessageW, GetMessageW, GetSystemMetrics, SetCursorPos,
                    SetWindowsHookExW, UnhookWindowsHookEx, MSG, MSLLHOOKSTRUCT, SM_CXSCREEN,
                    SM_CYSCREEN, WH_MOUSE_LL, WM_LBUTTONDOWN, WM_LBUTTONUP, WM_MBUTTONDOWN,
                    WM_MBUTTONUP, WM_MOUSEMOVE, WM_MOUSEWHEEL, WM_RBUTTONDOWN, WM_RBUTTONUP,
                };

                unsafe extern "system" fn low_level_mouse_proc(
                    n_code: i32,
                    w_param: WPARAM,
                    l_param: LPARAM,
                ) -> LRESULT {
                    if n_code >= 0 {
                        let ms = *(l_param as *const MSLLHOOKSTRUCT);

                        // If the event was generated by AirDesk's own simulator, do NOT intercept it!
                        if ms.dwExtraInfo == AIRDESK_EXTRA_INFO {
                            return CallNextHookEx(0, n_code, w_param, l_param);
                        }

                        let x = ms.pt.x;
                        let y = ms.pt.y;

                        // Query real-time physical screen dimensions
                        let real_w = GetSystemMetrics(SM_CXSCREEN);
                        let real_h = GetSystemMetrics(SM_CYSCREEN);
                        let (stored_w, stored_h) = SCREEN_DIMENSIONS.read().map(|d| *d).unwrap_or((1366, 768));
                        let screen_w = if real_w > 0 { real_w } else { stored_w };
                        let screen_h = if real_h > 0 { real_h } else { stored_h };

                        let active_screen = CURRENT_ACTIVE_SCREEN.read().map(|s| *s).unwrap_or(ActiveScreen::Host);
                        let arrangement = CURRENT_ARRANGEMENT.read().map(|a| *a).unwrap_or(ScreenArrangement::HostLeftClientRight);
                        let (rem_w, rem_h) = REMOTE_SCREEN_SIZE.read().map(|d| *d).unwrap_or((1440.0, 900.0));
                        let v_off = VERTICAL_OFFSET_RATIO.read().map(|o| *o).unwrap_or(0.0);
                        let h_off = HORIZONTAL_OFFSET_RATIO.read().map(|o| *o).unwrap_or(0.0);

                        let in_cooldown = if let Ok(t_guard) = LAST_SWITCH_TIME.read() {
                            t_guard.map(|t| t.elapsed().as_millis() < 400).unwrap_or(false)
                        } else {
                            false
                        };

                        if active_screen == ActiveScreen::Host {
                            if in_cooldown {
                                return CallNextHookEx(0, n_code, w_param, l_param);
                            }

                            // Precise geometric boundary detection to cross over to remote device
                            let (crossed, entry_edge, entry_x_ratio, entry_y_ratio) = match arrangement {
                                ScreenArrangement::HostLeftClientRight => {
                                    let at_edge = x >= screen_w - 4;
                                    let rel_y = (y as f32) - (v_off * screen_h as f32);
                                    let y_ratio = (rel_y / rem_h).clamp(0.05, 0.95);
                                    (at_edge, "left", 0.05f32, y_ratio)
                                }
                                ScreenArrangement::HostRightClientLeft => {
                                    let at_edge = x <= 3;
                                    let rel_y = (y as f32) - (v_off * screen_h as f32);
                                    let y_ratio = (rel_y / rem_h).clamp(0.05, 0.95);
                                    (at_edge, "right", 0.95f32, y_ratio)
                                }
                                ScreenArrangement::HostTopClientBottom => {
                                    let at_edge = y >= screen_h - 4;
                                    let rel_x = (x as f32) - (h_off * screen_w as f32);
                                    let x_ratio = (rel_x / rem_w).clamp(0.05, 0.95);
                                    (at_edge, "top", x_ratio, 0.05f32)
                                }
                                ScreenArrangement::HostBottomClientTop => {
                                    let at_edge = y <= 3;
                                    let rel_x = (x as f32) - (h_off * screen_w as f32);
                                    let x_ratio = (rel_x / rem_w).clamp(0.05, 0.95);
                                    (at_edge, "bottom", x_ratio, 0.95f32)
                                }
                            };

                            if crossed {
                                // Initialize virtual remote cursor safely inside the remote monitor
                                let init_x = match arrangement {
                                    ScreenArrangement::HostLeftClientRight => 40.0f32,
                                    ScreenArrangement::HostRightClientLeft => rem_w - 40.0f32,
                                    _ => entry_x_ratio * rem_w,
                                };
                                let init_y = match arrangement {
                                    ScreenArrangement::HostTopClientBottom => 40.0f32,
                                    ScreenArrangement::HostBottomClientTop => rem_h - 40.0f32,
                                    _ => entry_y_ratio * rem_h,
                                };

                                if let Ok(mut rpos) = VIRTUAL_REMOTE_POS.write() {
                                    *rpos = (init_x, init_y);
                                }

                                set_current_active_screen(ActiveScreen::Client);

                                let center_x = screen_w / 2;
                                let center_y = screen_h / 2;
                                if let Ok(mut last) = LAST_CURSOR.write() {
                                    *last = (center_x, center_y);
                                }
                                SetCursorPos(center_x, center_y);

                                if let Ok(tx_guard) = MOUSE_HOOK_TX.lock() {
                                    if let Some(tx) = &*tx_guard {
                                        let _ = tx.send(NetworkMessage::SwitchScreen(SwitchScreenPayload {
                                            active_device: "client".to_string(),
                                            entry_x_ratio,
                                            entry_y_ratio,
                                            edge: entry_edge.to_string(),
                                        }));
                                    }
                                }

                                if let Ok(ui_guard) = UI_EVENT_TX.lock() {
                                    if let Some(ui_tx) = &*ui_guard {
                                        let _ = ui_tx.send("active_screen:client".to_string());
                                    }
                                }

                                return 1; // Suppress event on host
                            }
                        } else {
                            // Client is active: stream mouse moves to remote client and detect return seamlessly
                            let center_x = screen_w / 2;
                            let center_y = screen_h / 2;

                            let mut has_sender = false;
                            if let Ok(tx_guard) = MOUSE_HOOK_TX.lock() {
                                if let Some(tx) = &*tx_guard {
                                    has_sender = true;
                                    match w_param as u32 {
                                        WM_MOUSEMOVE => {
                                            let dx = x - center_x;
                                            let dy = y - center_y;

                                            if dx != 0 || dy != 0 {
                                                let mut should_switch_back = false;
                                                let mut return_x_ratio = 0.5f32;
                                                let mut return_y_ratio = 0.5f32;
                                                let mut return_edge = "right";

                                                if !in_cooldown {
                                                    if let Ok(mut rpos) = VIRTUAL_REMOTE_POS.write() {
                                                        let next_x = rpos.0 + dx as f32;
                                                        let next_y = rpos.1 + dy as f32;

                                                        match arrangement {
                                                            ScreenArrangement::HostLeftClientRight => {
                                                                // Returning from Client's left edge into Host's right edge
                                                                if next_x <= 5.0 && dx < 0 {
                                                                    should_switch_back = true;
                                                                    return_edge = "right";
                                                                }
                                                            }
                                                            ScreenArrangement::HostRightClientLeft => {
                                                                // Returning from Client's right edge into Host's left edge
                                                                if next_x >= rem_w - 5.0 && dx > 0 {
                                                                    should_switch_back = true;
                                                                    return_edge = "left";
                                                                }
                                                            }
                                                            ScreenArrangement::HostTopClientBottom => {
                                                                // Returning from Client's top edge into Host's bottom edge
                                                                if next_y <= 5.0 && dy < 0 {
                                                                    should_switch_back = true;
                                                                    return_edge = "bottom";
                                                                }
                                                            }
                                                            ScreenArrangement::HostBottomClientTop => {
                                                                // Returning from Client's bottom edge into Host's top edge
                                                                if next_y >= rem_h - 5.0 && dy > 0 {
                                                                    should_switch_back = true;
                                                                    return_edge = "top";
                                                                }
                                                            }
                                                        }

                                                        rpos.0 = next_x.clamp(0.0, rem_w);
                                                        rpos.1 = next_y.clamp(0.0, rem_h);

                                                        // Map return position back to Host coordinates including offsets!
                                                        let host_y = (rpos.1 + (v_off * screen_h as f32)).clamp(20.0, (screen_h - 20) as f32);
                                                        let host_x = (rpos.0 + (h_off * screen_w as f32)).clamp(20.0, (screen_w - 20) as f32);
                                                        return_y_ratio = host_y / (screen_h as f32);
                                                        return_x_ratio = host_x / (screen_w as f32);
                                                    }
                                                }

                                                if should_switch_back {
                                                    // Return cursor and keyboard control to Host!
                                                    set_current_active_screen(ActiveScreen::Host);

                                                    let return_y = (return_y_ratio * screen_h as f32) as i32;
                                                    let return_x = (return_x_ratio * screen_w as f32) as i32;

                                                    // Position cursor 50px inside Host screen to prevent immediate re-crossing
                                                    match arrangement {
                                                        ScreenArrangement::HostLeftClientRight => {
                                                            SetCursorPos(screen_w - 50, return_y.clamp(20, screen_h - 20));
                                                        }
                                                        ScreenArrangement::HostRightClientLeft => {
                                                            SetCursorPos(50, return_y.clamp(20, screen_h - 20));
                                                        }
                                                        ScreenArrangement::HostTopClientBottom => {
                                                            SetCursorPos(return_x.clamp(20, screen_w - 20), screen_h - 50);
                                                        }
                                                        ScreenArrangement::HostBottomClientTop => {
                                                            SetCursorPos(return_x.clamp(20, screen_w - 20), 50);
                                                        }
                                                    }

                                                    let _ = tx.send(NetworkMessage::SwitchScreen(SwitchScreenPayload {
                                                        active_device: "host".to_string(),
                                                        entry_x_ratio: return_x_ratio,
                                                        entry_y_ratio: return_y_ratio,
                                                        edge: return_edge.to_string(),
                                                    }));

                                                    if let Ok(ui_guard) = UI_EVENT_TX.lock() {
                                                        if let Some(ui_tx) = &*ui_guard {
                                                            let _ = ui_tx.send("active_screen:host".to_string());
                                                        }
                                                    }

                                                    return 1;
                                                }

                                                let _ = tx.send(NetworkMessage::MouseMove(MouseMovePayload {
                                                    dx,
                                                    dy,
                                                    abs_x: None,
                                                    abs_y: None,
                                                }));

                                                SetCursorPos(center_x, center_y);
                                            }
                                            return 1;
                                        }
                                        WM_LBUTTONDOWN => {
                                            let _ = tx.send(NetworkMessage::MouseButton(MouseButtonPayload { button: 0, state: 1 }));
                                            return 1;
                                        }
                                        WM_LBUTTONUP => {
                                            let _ = tx.send(NetworkMessage::MouseButton(MouseButtonPayload { button: 0, state: 0 }));
                                            return 1;
                                        }
                                        WM_RBUTTONDOWN => {
                                            let _ = tx.send(NetworkMessage::MouseButton(MouseButtonPayload { button: 1, state: 1 }));
                                            return 1;
                                        }
                                        WM_RBUTTONUP => {
                                            let _ = tx.send(NetworkMessage::MouseButton(MouseButtonPayload { button: 1, state: 0 }));
                                            return 1;
                                        }
                                        WM_MBUTTONDOWN => {
                                            let _ = tx.send(NetworkMessage::MouseButton(MouseButtonPayload { button: 2, state: 1 }));
                                            return 1;
                                        }
                                        WM_MBUTTONUP => {
                                            let _ = tx.send(NetworkMessage::MouseButton(MouseButtonPayload { button: 2, state: 0 }));
                                            return 1;
                                        }
                                        WM_MOUSEWHEEL => {
                                            let delta = ((ms.mouseData >> 16) as i16 as i32) / 120;
                                            let _ = tx.send(NetworkMessage::MouseWheel(MouseWheelPayload { delta_x: 0, delta_y: delta }));
                                            return 1;
                                        }
                                        _ => {}
                                    }
                                }
                            }

                            if !has_sender {
                                set_current_active_screen(ActiveScreen::Host);
                                return CallNextHookEx(0, n_code, w_param, l_param);
                            }

                            return 1;
                        }
                    }

                    CallNextHookEx(0, n_code, w_param, l_param)
                }

                let hook = SetWindowsHookExW(
                    WH_MOUSE_LL,
                    Some(low_level_mouse_proc),
                    GetModuleHandleW(std::ptr::null()),
                    0,
                );

                if hook == 0 {
                    log::error!("Failed to install low-level mouse hook");
                    return;
                }

                let mut msg: MSG = std::mem::zeroed();
                while is_running.load(Ordering::SeqCst) && GetMessageW(&mut msg, 0, 0, 0) > 0 {
                    DispatchMessageW(&msg);
                }

                UnhookWindowsHookEx(hook);
            }
        });
    }

    pub fn stop(&self) {
        self.is_running.store(false, Ordering::SeqCst);
    }
}

#[cfg(target_os = "macos")]
mod macos_mouse {
    use std::os::raw::c_void;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Arc;
    use crate::network::protocol::{
        MouseButtonPayload, MouseMovePayload, MouseWheelPayload, NetworkMessage,
        SwitchScreenPayload,
    };
    use super::{
        set_current_active_screen, ActiveScreen, ScreenArrangement,
        CURRENT_ACTIVE_SCREEN, CURRENT_ARRANGEMENT, LAST_SWITCH_TIME, MOUSE_HOOK_TX,
        REMOTE_SCREEN_SIZE, SCREEN_DIMENSIONS, UI_EVENT_TX, VERTICAL_OFFSET_RATIO,
        HORIZONTAL_OFFSET_RATIO, VIRTUAL_REMOTE_POS,
    };
    use crate::mouse::simulator::AIRDESK_MAC_MAGIC;

    #[repr(C)]
    #[derive(Clone, Copy)]
    pub struct CGPoint {
        pub x: f64,
        pub y: f64,
    }

    pub type CGEventTapProxy = *mut c_void;
    pub type CGEventRef = *mut c_void;
    pub type CFMachPortRef = *mut c_void;
    pub type CFRunLoopSourceRef = *mut c_void;
    pub type CFRunLoopRef = *mut c_void;

    pub type CGEventTapCallback = extern "C" fn(
        proxy: CGEventTapProxy,
        event_type: u32,
        event: CGEventRef,
        refcon: *mut c_void,
    ) -> CGEventRef;

    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        pub fn CGEventTapCreate(
            tap: u32,
            place: u32,
            options: u32,
            eventsOfInterest: u64,
            callback: CGEventTapCallback,
            refcon: *mut c_void,
        ) -> CFMachPortRef;
        pub fn CGEventTapEnable(tap: CFMachPortRef, enable: bool);
        pub fn CGEventGetLocation(event: CGEventRef) -> CGPoint;
        pub fn CGEventGetIntegerValueField(event: CGEventRef, field: u32) -> i64;
        pub fn CGWarpMouseCursorPosition(newCursorPosition: CGPoint) -> i32;
    }

    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        pub fn CFMachPortCreateRunLoopSource(
            allocator: *mut c_void,
            port: CFMachPortRef,
            order: isize,
        ) -> CFRunLoopSourceRef;
        pub fn CFRunLoopGetCurrent() -> CFRunLoopRef;
        pub fn CFRunLoopAddSource(rl: CFRunLoopRef, source: CFRunLoopSourceRef, mode: *const c_void);
        pub fn CFRunLoopRun();
        pub fn CFRelease(cf: *mut c_void);
        pub static kCFRunLoopCommonModes: *const c_void;
    }

    pub extern "C" fn mouse_tap_proc(
        _proxy: CGEventTapProxy,
        event_type: u32,
        event: CGEventRef,
        _refcon: *mut c_void,
    ) -> CGEventRef {
        // Ignore synthetic events generated by AirDesk simulator
        let user_data = unsafe { CGEventGetIntegerValueField(event, 55 /* kCGEventSourceUserData */) };
        if user_data == AIRDESK_MAC_MAGIC {
            return event;
        }

        let active_screen = CURRENT_ACTIVE_SCREEN.read().map(|s| *s).unwrap_or(ActiveScreen::Host);
        let arrangement = CURRENT_ARRANGEMENT.read().map(|a| *a).unwrap_or(ScreenArrangement::HostLeftClientRight);
        let (screen_w, screen_h) = SCREEN_DIMENSIONS.read().map(|d| *d).unwrap_or((1440, 900));
        let (rem_w, rem_h) = REMOTE_SCREEN_SIZE.read().map(|d| *d).unwrap_or((1366.0, 768.0));
        let v_off = VERTICAL_OFFSET_RATIO.read().map(|o| *o).unwrap_or(0.0);
        let h_off = HORIZONTAL_OFFSET_RATIO.read().map(|o| *o).unwrap_or(0.0);

        let loc = unsafe { CGEventGetLocation(event) };
        let x = loc.x as i32;
        let y = loc.y as i32;

        let in_cooldown = if let Ok(t_guard) = LAST_SWITCH_TIME.read() {
            t_guard.map(|t| t.elapsed().as_millis() < 400).unwrap_or(false)
        } else {
            false
        };

        if active_screen == ActiveScreen::Host {
            if in_cooldown {
                return event;
            }

            let (crossed, entry_edge, entry_x_ratio, entry_y_ratio) = match arrangement {
                ScreenArrangement::HostLeftClientRight => {
                    let at_edge = x >= screen_w - 4;
                    let rel_y = (y as f32) - (v_off * screen_h as f32);
                    let y_ratio = (rel_y / rem_h).clamp(0.05, 0.95);
                    (at_edge, "left", 0.05f32, y_ratio)
                }
                ScreenArrangement::HostRightClientLeft => {
                    let at_edge = x <= 3;
                    let rel_y = (y as f32) - (v_off * screen_h as f32);
                    let y_ratio = (rel_y / rem_h).clamp(0.05, 0.95);
                    (at_edge, "right", 0.95f32, y_ratio)
                }
                ScreenArrangement::HostTopClientBottom => {
                    let at_edge = y >= screen_h - 4;
                    let rel_x = (x as f32) - (h_off * screen_w as f32);
                    let x_ratio = (rel_x / rem_w).clamp(0.05, 0.95);
                    (at_edge, "top", x_ratio, 0.05f32)
                }
                ScreenArrangement::HostBottomClientTop => {
                    let at_edge = y <= 3;
                    let rel_x = (x as f32) - (h_off * screen_w as f32);
                    let x_ratio = (rel_x / rem_w).clamp(0.05, 0.95);
                    (at_edge, "bottom", x_ratio, 0.95f32)
                }
            };

            if crossed {
                let init_x = match arrangement {
                    ScreenArrangement::HostLeftClientRight => 40.0f32,
                    ScreenArrangement::HostRightClientLeft => rem_w - 40.0f32,
                    _ => entry_x_ratio * rem_w,
                };
                let init_y = match arrangement {
                    ScreenArrangement::HostTopClientBottom => 40.0f32,
                    ScreenArrangement::HostBottomClientTop => rem_h - 40.0f32,
                    _ => entry_y_ratio * rem_h,
                };

                if let Ok(mut rpos) = VIRTUAL_REMOTE_POS.write() {
                    *rpos = (init_x, init_y);
                }

                set_current_active_screen(ActiveScreen::Client);

                let center_x = screen_w / 2;
                let center_y = screen_h / 2;
                unsafe {
                    CGWarpMouseCursorPosition(CGPoint { x: center_x as f64, y: center_y as f64 });
                }

                if let Ok(tx_guard) = MOUSE_HOOK_TX.lock() {
                    if let Some(tx) = &*tx_guard {
                        let _ = tx.send(NetworkMessage::SwitchScreen(SwitchScreenPayload {
                            active_device: "client".to_string(),
                            entry_x_ratio,
                            entry_y_ratio,
                            edge: entry_edge.to_string(),
                        }));
                    }
                }

                if let Ok(ui_guard) = UI_EVENT_TX.lock() {
                    if let Some(ui_tx) = &*ui_guard {
                        let _ = ui_tx.send("active_screen:client".to_string());
                    }
                }

                return std::ptr::null_mut(); // Swallow event
            }

            return event;
        }

        // ActiveScreen::Client: stream events to remote peer
        let center_x = screen_w / 2;
        let center_y = screen_h / 2;

        let mut has_sender = false;
        if let Ok(tx_guard) = MOUSE_HOOK_TX.lock() {
            if let Some(tx) = &*tx_guard {
                has_sender = true;
                match event_type {
                    5 /* MouseMoved */ | 6 /* LeftMouseDragged */ | 7 /* RightMouseDragged */ => {
                        let dx = x - center_x;
                        let dy = y - center_y;

                        if dx != 0 || dy != 0 {
                            let mut should_switch_back = false;
                            let mut return_x_ratio = 0.5f32;
                            let mut return_y_ratio = 0.5f32;
                            let mut return_edge = "right";

                            if !in_cooldown {
                                if let Ok(mut rpos) = VIRTUAL_REMOTE_POS.write() {
                                    let next_x = rpos.0 + dx as f32;
                                    let next_y = rpos.1 + dy as f32;

                                    match arrangement {
                                        ScreenArrangement::HostLeftClientRight => {
                                            if next_x <= 5.0 && dx < 0 {
                                                should_switch_back = true;
                                                return_edge = "right";
                                            }
                                        }
                                        ScreenArrangement::HostRightClientLeft => {
                                            if next_x >= rem_w - 5.0 && dx > 0 {
                                                should_switch_back = true;
                                                return_edge = "left";
                                            }
                                        }
                                        ScreenArrangement::HostTopClientBottom => {
                                            if next_y <= 5.0 && dy < 0 {
                                                should_switch_back = true;
                                                return_edge = "bottom";
                                            }
                                        }
                                        ScreenArrangement::HostBottomClientTop => {
                                            if next_y >= rem_h - 5.0 && dy > 0 {
                                                should_switch_back = true;
                                                return_edge = "top";
                                            }
                                        }
                                    }

                                    rpos.0 = next_x.clamp(0.0, rem_w);
                                    rpos.1 = next_y.clamp(0.0, rem_h);

                                    let host_y = (rpos.1 + (v_off * screen_h as f32)).clamp(20.0, (screen_h - 20) as f32);
                                    let host_x = (rpos.0 + (h_off * screen_w as f32)).clamp(20.0, (screen_w - 20) as f32);
                                    return_y_ratio = host_y / (screen_h as f32);
                                    return_x_ratio = host_x / (screen_w as f32);
                                }
                            }

                            if should_switch_back {
                                set_current_active_screen(ActiveScreen::Host);

                                let return_y = (return_y_ratio * screen_h as f32) as i32;
                                let return_x = (return_x_ratio * screen_w as f32) as i32;

                                unsafe {
                                    match arrangement {
                                        ScreenArrangement::HostLeftClientRight => {
                                            CGWarpMouseCursorPosition(CGPoint { x: (screen_w - 50) as f64, y: return_y as f64 });
                                        }
                                        ScreenArrangement::HostRightClientLeft => {
                                            CGWarpMouseCursorPosition(CGPoint { x: 50.0, y: return_y as f64 });
                                        }
                                        ScreenArrangement::HostTopClientBottom => {
                                            CGWarpMouseCursorPosition(CGPoint { x: return_x as f64, y: (screen_h - 50) as f64 });
                                        }
                                        ScreenArrangement::HostBottomClientTop => {
                                            CGWarpMouseCursorPosition(CGPoint { x: return_x as f64, y: 50.0 });
                                        }
                                    }
                                }

                                let _ = tx.send(NetworkMessage::SwitchScreen(SwitchScreenPayload {
                                    active_device: "host".to_string(),
                                    entry_x_ratio: return_x_ratio,
                                    entry_y_ratio: return_y_ratio,
                                    edge: return_edge.to_string(),
                                }));

                                if let Ok(ui_guard) = UI_EVENT_TX.lock() {
                                    if let Some(ui_tx) = &*ui_guard {
                                        let _ = ui_tx.send("active_screen:host".to_string());
                                    }
                                }

                                return std::ptr::null_mut();
                            }

                            let _ = tx.send(NetworkMessage::MouseMove(MouseMovePayload {
                                dx,
                                dy,
                                abs_x: None,
                                abs_y: None,
                            }));

                            unsafe {
                                CGWarpMouseCursorPosition(CGPoint { x: center_x as f64, y: center_y as f64 });
                            }
                        }
                        return std::ptr::null_mut();
                    }
                    1 /* LeftMouseDown */ => {
                        let _ = tx.send(NetworkMessage::MouseButton(MouseButtonPayload { button: 0, state: 1 }));
                        return std::ptr::null_mut();
                    }
                    2 /* LeftMouseUp */ => {
                        let _ = tx.send(NetworkMessage::MouseButton(MouseButtonPayload { button: 0, state: 0 }));
                        return std::ptr::null_mut();
                    }
                    3 /* RightMouseDown */ => {
                        let _ = tx.send(NetworkMessage::MouseButton(MouseButtonPayload { button: 1, state: 1 }));
                        return std::ptr::null_mut();
                    }
                    4 /* RightMouseUp */ => {
                        let _ = tx.send(NetworkMessage::MouseButton(MouseButtonPayload { button: 1, state: 0 }));
                        return std::ptr::null_mut();
                    }
                    25 /* OtherMouseDown */ => {
                        let _ = tx.send(NetworkMessage::MouseButton(MouseButtonPayload { button: 2, state: 1 }));
                        return std::ptr::null_mut();
                    }
                    26 /* OtherMouseUp */ => {
                        let _ = tx.send(NetworkMessage::MouseButton(MouseButtonPayload { button: 2, state: 0 }));
                        return std::ptr::null_mut();
                    }
                    22 /* ScrollWheel */ => {
                        let delta_y = unsafe { CGEventGetIntegerValueField(event, 96 /* kCGScrollWheelEventDeltaAxis1 */) } as i32;
                        let delta_x = unsafe { CGEventGetIntegerValueField(event, 97 /* kCGScrollWheelEventDeltaAxis2 */) } as i32;
                        let _ = tx.send(NetworkMessage::MouseWheel(MouseWheelPayload { delta_x, delta_y }));
                        return std::ptr::null_mut();
                    }
                    _ => {}
                }
            }
        }

        if !has_sender {
            set_current_active_screen(ActiveScreen::Host);
            return event;
        }

        std::ptr::null_mut()
    }

    pub fn run_macos_mouse_loop(is_running: Arc<AtomicBool>) {
        unsafe {
            let mask = (1 << 5)   // MouseMoved
                | (1 << 6)        // LeftMouseDragged
                | (1 << 7)        // RightMouseDragged
                | (1 << 1)        // LeftMouseDown
                | (1 << 2)        // LeftMouseUp
                | (1 << 3)        // RightMouseDown
                | (1 << 4)        // RightMouseUp
                | (1 << 25)       // OtherMouseDown
                | (1 << 26)       // OtherMouseUp
                | (1 << 22);      // ScrollWheel

            let tap = CGEventTapCreate(
                0, // kCGHIDEventTap
                0, // kCGHeadInsertEventTap
                0, // kCGEventTapOptionDefault
                mask,
                mouse_tap_proc,
                std::ptr::null_mut(),
            );

            if tap.is_null() {
                log::warn!("Failed to create macOS mouse CGEventTap. Ensure Accessibility permissions are granted.");
                return;
            }

            let source = CFMachPortCreateRunLoopSource(std::ptr::null_mut(), tap, 0);
            if source.is_null() {
                CFRelease(tap);
                return;
            }

            let current_rl = CFRunLoopGetCurrent();
            CFRunLoopAddSource(current_rl, source, kCFRunLoopCommonModes);
            CGEventTapEnable(tap, true);

            while is_running.load(Ordering::SeqCst) {
                CFRunLoopRun();
            }

            CFRelease(source);
            CFRelease(tap);
        }
    }
}
