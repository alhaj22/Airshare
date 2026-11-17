#![allow(unused_imports)]
pub mod hook;
pub mod simulator;

pub use hook::{
    clear_mouse_hook_sender, get_current_active_screen, set_current_active_screen,
    set_remote_screen_size, ActiveScreen, MouseEdgeMonitor, ScreenArrangement,
    is_cursor_locked, set_cursor_locked, set_dead_corners, set_switch_delay_ms,
};
pub use simulator::MouseSimulator;
