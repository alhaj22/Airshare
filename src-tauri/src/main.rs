#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
fn detect_system_details() -> (String, String, String, String) {
    let os_name = if cfg!(windows) {
        "Windows".to_string()
    } else if cfg!(target_os = "macos") {
        "macOS".to_string()
    } else {
        "Linux".to_string()
    };

    let arch = std::env::consts::ARCH.to_string();

    #[cfg(windows)]
    let os_ver = {
        use std::process::Command;
        let mut ver = "Windows 10/11".to_string();
        if let Ok(output) = Command::new("cmd").args(["/c", "ver"]).output() {
            let s = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !s.is_empty() {
                ver = s;
            }
        }
        ver
    };

    #[cfg(target_os = "macos")]
    let os_ver = {
        use std::process::Command;
        let mut ver = "macOS".to_string();
        if let Ok(output) = Command::new("sw_vers").arg("-productVersion").output() {
            let s = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !s.is_empty() {
                ver = format!("macOS {}", s);
            }
        }
        ver
    };

    #[cfg(not(any(windows, target_os = "macos")))]
    let os_ver = "Linux".to_string();

    #[cfg(windows)]
    let kb_layout = {
        unsafe {
            use windows_sys::Win32::UI::Input::KeyboardAndMouse::GetKeyboardLayoutNameA;
            let mut buf = [0u8; 9];
            if GetKeyboardLayoutNameA(buf.as_mut_ptr()) != 0 {
                let name = String::from_utf8_lossy(&buf[..8]).to_string();
                match name.as_str() {
                    "00000409" => "US (QWERTY)".to_string(),
                    "00000809" => "UK (QWERTY)".to_string(),
                    "00000407" => "German (QWERTZ)".to_string(),
                    "0000040C" => "French (AZERTY)".to_string(),
                    _ => format!("Layout ({})", name),
                }
            } else {
                "US (QWERTY)".to_string()
            }
        }
    };

    #[cfg(not(windows))]
    let kb_layout = "Standard QWERTY".to_string();

    (os_name, os_ver, arch, kb_layout)
}

// Prevents additional console window on Windows in release


mod clipboard;
mod discovery;
mod keyboard;
mod mouse;
mod network;
mod security;

use std::collections::HashMap;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use serde::{Deserialize, Serialize};
use tauri::Emitter;

use clipboard::ClipboardWatcher;
use discovery::{DiscoveredDevice, DiscoveryBeacon};
use keyboard::{clear_keyboard_hook_sender, KeyboardHookManager, KeyboardSimulator};
use mouse::{
    clear_mouse_hook_sender, ActiveScreen, MouseEdgeMonitor, MouseSimulator, ScreenArrangement,
};
use network::protocol::{ActiveSession, SwitchScreenPayload};
use network::{NetworkClient, NetworkMessage, NetworkServer};
use security::{create_shared_pin_manager, SharedPinManager};

#[cfg(windows)]
fn get_screen_resolution() -> (u32, u32) {
    unsafe {
        use windows_sys::Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN};
        let w = GetSystemMetrics(SM_CXSCREEN);
        let h = GetSystemMetrics(SM_CYSCREEN);
        if w > 0 && h > 0 {
            (w as u32, h as u32)
        } else {
            (1920, 1080)
        }
    }
}

#[cfg(target_os = "macos")]
fn get_screen_resolution() -> (u32, u32) {
    // Use CoreGraphics to get the main display resolution on macOS
    use std::process::Command;
    let output = Command::new("system_profiler")
        .args(["SPDisplaysDataType", "-json"])
        .output();
    if let Ok(out) = output {
        let s = String::from_utf8_lossy(&out.stdout);
        // Quick parse: look for "Resolution" field like "1440 x 900"
        for line in s.lines() {
            if line.contains("_spdisplays_resolution") {
                let parts: Vec<&str> = line.split('"').collect();
                if parts.len() >= 4 {
                    let res = parts[3];
                    let nums: Vec<u32> = res
                        .split_whitespace()
                        .filter_map(|t| t.parse::<u32>().ok())
                        .collect();
                    if nums.len() >= 2 {
                        return (nums[0], nums[1]);
                    }
                }
            }
        }
    }
    (1920, 1080)
}

#[cfg(not(any(windows, target_os = "macos")))]
fn get_screen_resolution() -> (u32, u32) {
    (1920, 1080)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub device_name: String,
    pub os: String,
    pub os_version: String,
    pub architecture: String,
    pub keyboard_layout: String,
    pub local_ip: String,
    pub screen_width: u32,
    pub screen_height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HostPinResponse {
    pub pin: String,
    pub expires_in_seconds: u64,
    pub host_ip: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionStatus {
    pub mode: String, // "idle", "hosting", "connected"
    pub session: Option<ActiveSession>,
    pub peer_device: Option<String>,
    pub peer_ip: Option<String>,
    pub peer_os: Option<String>,
    pub peer_screen_width: Option<u32>,
    pub peer_screen_height: Option<u32>,
    pub role: Option<String>, // "host" or "client"
    pub active_screen: String, // "host" or "client"
    pub pin: Option<String>,
    pub pin_remaining_seconds: Option<u64>,
}

pub struct AppState {
    pub pin_manager: SharedPinManager,
    pub discovery: Arc<DiscoveryBeacon>,
    pub server: Arc<RwLock<Option<NetworkServer>>>,
    pub client: Arc<RwLock<Option<NetworkClient>>>,
    pub current_session: Arc<RwLock<Option<ActiveSession>>>,
    pub edge_monitor: Arc<MouseEdgeMonitor>,
    pub keyboard_hook: Arc<KeyboardHookManager>,
    pub clipboard_watcher: Arc<ClipboardWatcher>,
    pub mouse_sim: Arc<MouseSimulator>,
    pub keyboard_sim: Arc<KeyboardSimulator>,
    pub sys_info: SystemInfo,
    pub active_transfers: Arc<RwLock<HashMap<String, PathBuf>>>,
}

#[tauri::command]
async fn get_system_info(state: tauri::State<'_, AppState>) -> Result<SystemInfo, String> {
    let (w, h) = get_screen_resolution();
    let mut info = state.sys_info.clone();
    info.screen_width = w;
    info.screen_height = h;
    Ok(info)
}

#[tauri::command]
async fn create_connection_pin(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<HostPinResponse, String> {
    let (pin, expires) = {
        let mut mgr = state.pin_manager.write().await;
        mgr.generate_new_pin()
    };

    // Mark discovery beacon as host
    state.discovery.set_is_host(true).await;

    // Start TCP server
    let (incoming_tx, mut incoming_rx) = mpsc::unbounded_channel::<NetworkMessage>();
    let (status_tx, mut status_rx) = mpsc::unbounded_channel::<String>();

    let (screen_w, screen_h) = get_screen_resolution();

    let mut server = NetworkServer::new(
        state.pin_manager.clone(),
        state.sys_info.device_name.clone(),
        state.sys_info.os.clone(),
        state.sys_info.os_version.clone(),
        state.sys_info.architecture.clone(),
        state.sys_info.keyboard_layout.clone(),
        screen_w,
        screen_h,
    );

    server.start(incoming_tx, status_tx).await.map_err(|e| e.to_string())?;

    let outbound_tx = server
        .get_outbound_sender()
        .ok_or_else(|| "Failed to obtain server outbound channel".to_string())?;

    *state.server.write().await = Some(server);

    // Start Real Windows Low-Level Mouse & Keyboard Hooks hooked to outbound network channel
    let (ui_tx, mut _ui_rx) = mpsc::unbounded_channel::<String>();
    let (switch_back_tx, mut switch_back_rx) = mpsc::unbounded_channel::<()>();

    state.edge_monitor.start_monitor(outbound_tx.clone(), ui_tx);
    state.keyboard_hook.start_hook(outbound_tx.clone(), switch_back_tx);
    state.clipboard_watcher.start(outbound_tx.clone());

    // Host status event listener (handles CONNECTED and DISCONNECTED from server socket)
    let session_slot = state.current_session.clone();
    let pin_mgr_clone = state.pin_manager.clone();
    let disc_clone = state.discovery.clone();
    let edge_mon_status = state.edge_monitor.clone();
    let kb_hook_status = state.keyboard_hook.clone();
    let app_handle_status = app_handle.clone();

    tauri::async_runtime::spawn(async move {
        while let Some(status_str) = status_rx.recv().await {
            if let Some(session_json) = status_str.strip_prefix("CONNECTED:") {
                if let Ok(sess) = serde_json::from_str::<ActiveSession>(session_json) {
                    log::info!("Session successfully activated on Host: {:?}", sess.session_id);
                    *session_slot.write().await = Some(sess.clone());
                    let _ = app_handle_status.emit("session_started", &sess);
                }
            } else if status_str == "DISCONNECTED" {
                log::info!("Peer disconnected from Host. Teardown active session immediately.");
                *session_slot.write().await = None;
                crate::keyboard::mapping::KeyboardMappingEngine::release_stuck_keys();
                pin_mgr_clone.write().await.disconnect();
                disc_clone.set_is_host(false).await;
                edge_mon_status.set_active_screen(ActiveScreen::Host).await;
                kb_hook_status.update_active_screen(ActiveScreen::Host);
                clear_keyboard_hook_sender();
                clear_mouse_hook_sender();
                let _ = app_handle_status.emit("session_ended", ());
            }
        }
    });

    // Emergency recall listener (Ctrl+Alt+Shift+Esc or Pause key)
    let edge_mon_clone = state.edge_monitor.clone();
    let kb_hook_clone = state.keyboard_hook.clone();
    let server_ref = state.server.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(()) = switch_back_rx.recv().await {
            edge_mon_clone.set_active_screen(ActiveScreen::Host).await;
            kb_hook_clone.update_active_screen(ActiveScreen::Host);

            let msg = NetworkMessage::SwitchScreen(SwitchScreenPayload {
                active_device: "host".to_string(),
                entry_x_ratio: 0.5,
                entry_y_ratio: 0.5,
                edge: "center".to_string(),
            });
            if let Some(srv) = server_ref.read().await.as_ref() {
                let _ = srv.send_message(msg);
            }
        }
    });

    // Start background event handler for incoming messages received FROM the client
    let clip_watcher = state.clipboard_watcher.clone();
    let edge_mon = state.edge_monitor.clone();
    let kb_hook = state.keyboard_hook.clone();
    let m_sim = state.mouse_sim.clone();
    let k_sim = state.keyboard_sim.clone();
    let transfers = state.active_transfers.clone();
    let session_msg = state.current_session.clone();
    let pin_mgr_msg = state.pin_manager.clone();
    let disc_msg = state.discovery.clone();
    let app_handle_msg = app_handle.clone();

    tauri::async_runtime::spawn(async move {
        while let Some(msg) = incoming_rx.recv().await {
            match msg {
                NetworkMessage::ClipboardSync(p) => {
                    clip_watcher.apply_incoming_text(&p.text, p.hash).await;
                }
                NetworkMessage::SwitchScreen(p) => {
                    // Incoming SwitchScreen received on Host:
                    // Host stays in ActiveScreen::Host so Host never swallows its own local input when receiving
                    edge_mon.set_active_screen(ActiveScreen::Host).await;
                    kb_hook.update_active_screen(ActiveScreen::Host);

                    let entry_x = match p.edge.as_str() {
                        "left" => 50,
                        "right" => (screen_w as i32) - 50,
                        _ => (p.entry_x_ratio * screen_w as f32) as i32,
                    }.clamp(20, (screen_w as i32) - 20);

                    let entry_y = match p.edge.as_str() {
                        "top" => 50,
                        "bottom" => (screen_h as i32) - 50,
                        _ => (p.entry_y_ratio * screen_h as f32) as i32,
                    }.clamp(20, (screen_h as i32) - 20);

                    m_sim.move_absolute(entry_x, entry_y);
                }
                NetworkMessage::MouseMove(p) => {
                    if let (Some(x), Some(y)) = (p.abs_x, p.abs_y) {
                        m_sim.move_absolute(x, y);
                    } else {
                        m_sim.move_relative(p.dx, p.dy);
                    }
                }
                NetworkMessage::MouseButton(p) => {
                    m_sim.button_event(p.button, p.state == 1);
                }
                NetworkMessage::MouseWheel(p) => {
                    m_sim.scroll(p.delta_x, p.delta_y);
                }
                NetworkMessage::KeyEvent(p) => {
                    k_sim.key_event(p.key_code, p.state == 1, p.key_char.as_deref(), p.modifiers, p.source_os.as_deref());
                }
                NetworkMessage::Disconnect { reason } => {
                    log::info!("Peer explicitly disconnected: {}. Ending session.", reason);
                    *session_msg.write().await = None;
                    pin_mgr_msg.write().await.disconnect();
                    disc_msg.set_is_host(false).await;
                    edge_mon.set_active_screen(ActiveScreen::Host).await;
                    kb_hook.update_active_screen(ActiveScreen::Host);
                    clear_keyboard_hook_sender();
                    clear_mouse_hook_sender();
                    let _ = app_handle_msg.emit("session_ended", ());
                }
                NetworkMessage::FileTransferInit(init) => {
                    let download_dir = dirs_fallback().join("AirDesk");
                    let _ = std::fs::create_dir_all(&download_dir);
                    let target_path = download_dir.join(&init.file_name);
                    let _ = std::fs::File::create(&target_path);
                    transfers.write().await.insert(init.session_id, target_path);
                }
                NetworkMessage::FileChunk(chunk) => {
                    if let Some(path) = transfers.read().await.get(&chunk.session_id) {
                        if let Ok(mut file) = OpenOptions::new().append(true).open(path) {
                            let _ = file.write_all(&chunk.data);
                        }
                    }
                }
                _ => {}
            }
        }
    });

    Ok(HostPinResponse {
        pin,
        expires_in_seconds: expires,
        host_ip: state.sys_info.local_ip.clone(),
    })
}

#[tauri::command]
async fn join_connection(
    host_ip: String,
    pin: String,
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<ActiveSession, String> {
    let (incoming_tx, mut incoming_rx) = mpsc::unbounded_channel::<NetworkMessage>();
    let (status_tx, mut status_rx) = mpsc::unbounded_channel::<String>();

    let (screen_w, screen_h) = get_screen_resolution();

    let mut client = NetworkClient::new(
        format!("dev_{}", rand::random::<u32>()),
        state.sys_info.device_name.clone(),
        state.sys_info.os.clone(),
        state.sys_info.os_version.clone(),
        state.sys_info.architecture.clone(),
        state.sys_info.keyboard_layout.clone(),
        screen_w,
        screen_h,
    );

    let session = client
        .connect(&host_ip, 42426, &pin, incoming_tx, status_tx)
        .await
        .map_err(|e| e.to_string())?;

    let outbound_tx = client
        .get_outbound_sender()
        .ok_or_else(|| "Failed to obtain client outbound channel".to_string())?;

    *state.client.write().await = Some(client);
    *state.current_session.write().await = Some(session.clone());
    crate::mouse::set_remote_screen_size(session.peer_screen_width, session.peer_screen_height);
    let _ = app_handle.emit("session_started", &session);

    // Start Low-Level Mouse & Keyboard Hooks with client's outbound channel
    let (ui_tx, mut _ui_rx) = mpsc::unbounded_channel::<String>();
    let (switch_back_tx, mut switch_back_rx) = mpsc::unbounded_channel::<()>();

    state.edge_monitor.start_monitor(outbound_tx.clone(), ui_tx);
    state.keyboard_hook.start_hook(outbound_tx.clone(), switch_back_tx);
    state.clipboard_watcher.start(outbound_tx.clone());

    // Client status event listener (handles DISCONNECTED from host socket)
    let session_slot = state.current_session.clone();
    let edge_mon_status = state.edge_monitor.clone();
    let kb_hook_status = state.keyboard_hook.clone();
    let client_slot = state.client.clone();
    let app_handle_status = app_handle.clone();

    tauri::async_runtime::spawn(async move {
        while let Some(status_str) = status_rx.recv().await {
            if status_str == "DISCONNECTED" {
                log::info!("Disconnected from Host. Teardown active session immediately.");
                *session_slot.write().await = None;
                crate::keyboard::mapping::KeyboardMappingEngine::release_stuck_keys();
                if let Some(mut cl) = client_slot.write().await.take() {
                    cl.disconnect().await;
                }
                edge_mon_status.set_active_screen(ActiveScreen::Host).await;
                kb_hook_status.update_active_screen(ActiveScreen::Host);
                clear_keyboard_hook_sender();
                clear_mouse_hook_sender();
                let _ = app_handle_status.emit("session_ended", ());
            }
        }
    });

    // Emergency recall listener
    let edge_mon_clone = state.edge_monitor.clone();
    let kb_hook_clone = state.keyboard_hook.clone();
    let client_ref = state.client.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(()) = switch_back_rx.recv().await {
            edge_mon_clone.set_active_screen(ActiveScreen::Host).await;
            kb_hook_clone.update_active_screen(ActiveScreen::Host);

            let msg = NetworkMessage::SwitchScreen(SwitchScreenPayload {
                active_device: "client".to_string(),
                entry_x_ratio: 0.5,
                entry_y_ratio: 0.5,
                edge: "center".to_string(),
            });
            if let Some(cl) = client_ref.read().await.as_ref() {
                let _ = cl.send_message(msg);
            }
        }
    });

    // Start background event handler for incoming client messages from host
    let clip_watcher = state.clipboard_watcher.clone();
    let m_sim = state.mouse_sim.clone();
    let k_sim = state.keyboard_sim.clone();
    let edge_mon = state.edge_monitor.clone();
    let kb_hook = state.keyboard_hook.clone();
    let transfers = state.active_transfers.clone();
    let session_msg = state.current_session.clone();
    let client_msg = state.client.clone();
    let app_handle_msg = app_handle.clone();

    tauri::async_runtime::spawn(async move {
        while let Some(msg) = incoming_rx.recv().await {
            match msg {
                NetworkMessage::MouseMove(p) => {
                    if let (Some(x), Some(y)) = (p.abs_x, p.abs_y) {
                        m_sim.move_absolute(x, y);
                    } else {
                        m_sim.move_relative(p.dx, p.dy);
                    }
                }
                NetworkMessage::MouseButton(p) => {
                    m_sim.button_event(p.button, p.state == 1);
                }
                NetworkMessage::MouseWheel(p) => {
                    m_sim.scroll(p.delta_x, p.delta_y);
                }
                NetworkMessage::KeyEvent(p) => {
                    k_sim.key_event(p.key_code, p.state == 1, p.key_char.as_deref(), p.modifiers, p.source_os.as_deref());
                }
                NetworkMessage::ClipboardSync(p) => {
                    clip_watcher.apply_incoming_text(&p.text, p.hash).await;
                }
                NetworkMessage::SwitchScreen(p) => {
                    // Incoming SwitchScreen received on Client:
                    // Client stays in ActiveScreen::Host (local non-capturing) so Client never swallows its own input
                    edge_mon.set_active_screen(ActiveScreen::Host).await;
                    kb_hook.update_active_screen(ActiveScreen::Host);

                    if p.active_device == "client" {
                        let entry_x = match p.edge.as_str() {
                            "left" => 50,
                            "right" => (screen_w as i32) - 50,
                            _ => (p.entry_x_ratio * screen_w as f32) as i32,
                        }.clamp(20, (screen_w as i32) - 20);

                        let entry_y = match p.edge.as_str() {
                            "top" => 50,
                            "bottom" => (screen_h as i32) - 50,
                            _ => (p.entry_y_ratio * screen_h as f32) as i32,
                        }.clamp(20, (screen_h as i32) - 20);

                        m_sim.move_absolute(entry_x, entry_y);
                    }
                }
                NetworkMessage::Disconnect { reason } => {
                    log::info!("Host disconnected: {}. Ending session.", reason);
                    *session_msg.write().await = None;
                    if let Some(mut cl) = client_msg.write().await.take() {
                        cl.disconnect().await;
                    }
                    edge_mon.set_active_screen(ActiveScreen::Host).await;
                    kb_hook.update_active_screen(ActiveScreen::Host);
                    clear_keyboard_hook_sender();
                    clear_mouse_hook_sender();
                    let _ = app_handle_msg.emit("session_ended", ());
                }
                NetworkMessage::FileTransferInit(init) => {
                    let download_dir = dirs_fallback().join("AirDesk");
                    let _ = std::fs::create_dir_all(&download_dir);
                    let target_path = download_dir.join(&init.file_name);
                    let _ = std::fs::File::create(&target_path);
                    transfers.write().await.insert(init.session_id, target_path);
                }
                NetworkMessage::FileChunk(chunk) => {
                    if let Some(path) = transfers.read().await.get(&chunk.session_id) {
                        if let Ok(mut file) = OpenOptions::new().append(true).open(path) {
                            let _ = file.write_all(&chunk.data);
                        }
                    }
                }
                _ => {}
            }
        }
    });

    Ok(session)
}

#[tauri::command]
async fn toggle_active_screen(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let current = state.edge_monitor.get_active_screen().await;
    let next = match current {
        ActiveScreen::Host => ActiveScreen::Client,
        ActiveScreen::Client => ActiveScreen::Host,
    };

    state.edge_monitor.set_active_screen(next).await;
    state.keyboard_hook.update_active_screen(next);

    let msg = NetworkMessage::SwitchScreen(SwitchScreenPayload {
        active_device: match next {
            ActiveScreen::Host => "host".to_string(),
            ActiveScreen::Client => "client".to_string(),
        },
        entry_x_ratio: 0.5,
        entry_y_ratio: 0.5,
        edge: "center".to_string(),
    });

    if let Some(srv) = state.server.read().await.as_ref() {
        let _ = srv.send_message(msg.clone());
    }
    if let Some(cl) = state.client.read().await.as_ref() {
        let _ = cl.send_message(msg);
    }

    Ok(match next {
        ActiveScreen::Host => "host".to_string(),
        ActiveScreen::Client => "client".to_string(),
    })
}

#[tauri::command]
async fn get_discovered_devices(state: tauri::State<'_, AppState>) -> Result<Vec<DiscoveredDevice>, String> {
    Ok(state.discovery.get_discovered_devices().await)
}

#[tauri::command]
async fn disconnect_all(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let msg = NetworkMessage::Disconnect {
        reason: "User requested disconnect".to_string(),
    };

    if let Some(srv) = state.server.read().await.as_ref() {
        let _ = srv.send_message(msg.clone());
    }
    if let Some(cl) = state.client.read().await.as_ref() {
        let _ = cl.send_message(msg);
    }

    *state.current_session.write().await = None;
    {
        let mut mgr = state.pin_manager.write().await;
        mgr.disconnect();
    }
    state.discovery.set_is_host(false).await;

    if let Some(mut s) = state.server.write().await.take() {
        s.stop().await;
    }

    if let Some(mut c) = state.client.write().await.take() {
        c.disconnect().await;
    }

    crate::keyboard::mapping::KeyboardMappingEngine::release_stuck_keys();
    state.edge_monitor.set_active_screen(ActiveScreen::Host).await;
    state.keyboard_hook.update_active_screen(ActiveScreen::Host);
    clear_keyboard_hook_sender();
    clear_mouse_hook_sender();

    let _ = app_handle.emit("session_ended", ());
    Ok(())
}

#[tauri::command]
async fn set_screen_arrangement(
    arrangement: String,
    vertical_offset: Option<f32>,
    horizontal_offset: Option<f32>,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let arr = match arrangement.as_str() {
        "host_left_client_right" => ScreenArrangement::HostLeftClientRight,
        "host_right_client_left" => ScreenArrangement::HostRightClientLeft,
        "host_top_client_bottom" => ScreenArrangement::HostTopClientBottom,
        "host_bottom_client_top" => ScreenArrangement::HostBottomClientTop,
        _ => return Err("Invalid arrangement option".to_string()),
    };
    state.edge_monitor.set_arrangement(arr).await;
    if let Some(off) = vertical_offset {
        state.edge_monitor.set_vertical_offset(off).await;
    }
    if let Some(off) = horizontal_offset {
        state.edge_monitor.set_horizontal_offset(off).await;
    }
    Ok(())
}

#[tauri::command]
async fn get_connection_status(state: tauri::State<'_, AppState>) -> Result<ConnectionStatus, String> {
    let active_sess = state.current_session.read().await.clone();
    let pin_mgr = state.pin_manager.read().await;
    let pin_info = pin_mgr.get_current_pin_info();
    let active = state.edge_monitor.get_active_screen().await;

    let active_screen_str = match active {
        ActiveScreen::Host => "host".to_string(),
        ActiveScreen::Client => "client".to_string(),
    };

    if let Some(sess) = active_sess {
        return Ok(ConnectionStatus {
            mode: "connected".to_string(),
            session: Some(sess.clone()),
            peer_device: Some(sess.peer_name),
            peer_ip: Some(sess.peer_ip),
            peer_os: Some(sess.peer_os),
            peer_screen_width: Some(sess.peer_screen_width),
            peer_screen_height: Some(sess.peer_screen_height),
            role: Some(sess.role),
            active_screen: active_screen_str,
            pin: None,
            pin_remaining_seconds: None,
        });
    }

    let (mode, pin, remaining) = if let Some((p, s)) = pin_info {
        ("hosting".to_string(), Some(p), Some(s))
    } else {
        ("idle".to_string(), None, None)
    };

    Ok(ConnectionStatus {
        mode,
        session: None,
        peer_device: None,
        peer_ip: None,
        peer_os: None,
        peer_screen_width: None,
        peer_screen_height: None,
        role: None,
        active_screen: active_screen_str,
        pin,
        pin_remaining_seconds: remaining,
    })
}

/// Returns the host OS name as a lowercase string: "windows", "macos", or "linux"
#[tauri::command]
async fn get_host_os(state: tauri::State<'_, AppState>) -> Result<String, String> {
    Ok(state.sys_info.os.to_lowercase())
}

#[tauri::command]
async fn check_accessibility() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    unsafe {
        #[link(name = "ApplicationServices", kind = "framework")]
        extern "C" {
            pub fn AXIsProcessTrustedWithOptions(options: *mut std::os::raw::c_void) -> bool;
            pub static kAXTrustedCheckOptionPrompt: *const std::os::raw::c_void;
        }
        #[link(name = "CoreFoundation", kind = "framework")]
        extern "C" {
            pub fn CFDictionaryCreate(
                allocator: *mut std::os::raw::c_void,
                keys: *const *const std::os::raw::c_void,
                values: *const *const std::os::raw::c_void,
                numValues: isize,
                keyCallBacks: *const std::os::raw::c_void,
                valueCallBacks: *const std::os::raw::c_void,
            ) -> *mut std::os::raw::c_void;
            pub static kCFBooleanTrue: *const std::os::raw::c_void;
            pub fn CFRelease(cf: *mut std::os::raw::c_void);
        }

        let keys = [kAXTrustedCheckOptionPrompt];
        let values = [kCFBooleanTrue];
        let dict = CFDictionaryCreate(
            std::ptr::null_mut(),
            keys.as_ptr(),
            values.as_ptr(),
            1,
            std::ptr::null(),
            std::ptr::null(),
        );

        let trusted = AXIsProcessTrustedWithOptions(dict);
        if !dict.is_null() {
            CFRelease(dict);
        }
        return Ok(trusted);
    }

    #[cfg(not(target_os = "macos"))]
    Ok(true)
}

#[tauri::command]
async fn open_accessibility_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn();
    }
    Ok(())
}

fn dirs_fallback() -> PathBuf {
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map(|h| PathBuf::from(h).join("Downloads"))
        .unwrap_or_else(|_| PathBuf::from("./downloads"))
}


#[tauri::command]
fn get_keyboard_mapping_mode() -> String {
    match crate::keyboard::mapping::get_mapping_mode() {
        crate::keyboard::mapping::MappingMode::SmartUniversal => "smart_universal".to_string(),
        crate::keyboard::mapping::MappingMode::RawPassthrough => "raw_passthrough".to_string(),
        crate::keyboard::mapping::MappingMode::Custom => "custom".to_string(),
    }
}

#[tauri::command]
fn set_keyboard_mapping_mode(mode: String) -> Result<(), String> {
    let m = match mode.as_str() {
        "smart_universal" => crate::keyboard::mapping::MappingMode::SmartUniversal,
        "raw_passthrough" => crate::keyboard::mapping::MappingMode::RawPassthrough,
        "custom" => crate::keyboard::mapping::MappingMode::Custom,
        _ => return Err("Invalid mapping mode".to_string()),
    };
    crate::keyboard::mapping::set_mapping_mode(m);
    Ok(())
}

#[tauri::command]
fn get_custom_modifier_config() -> crate::keyboard::mapping::CustomModifierConfig {
    crate::keyboard::mapping::get_custom_config()
}

#[tauri::command]
fn set_custom_modifier_config(config: crate::keyboard::mapping::CustomModifierConfig) -> Result<(), String> {
    crate::keyboard::mapping::set_custom_config(config);
    Ok(())
}

#[tauri::command]
fn release_stuck_keys() -> Result<(), String> {
    crate::keyboard::mapping::KeyboardMappingEngine::release_stuck_keys();
    Ok(())
}

fn main() {
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "AirDesk Device".to_string());

    let os_name = if cfg!(windows) {
        "Windows".to_string()
    } else if cfg!(target_os = "macos") {
        "macOS".to_string()
    } else {
        "Linux".to_string()
    };

    let local_ip = local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string());

    let (screen_w, screen_h) = get_screen_resolution();
    log::info!("AirDesk initialized for resolution {}x{}", screen_w, screen_h);

    let (det_os, det_ver, det_arch, det_layout) = detect_system_details();
    let sys_info = SystemInfo {
        device_name: hostname.clone(),
        os: det_os,
        os_version: det_ver,
        architecture: det_arch,
        keyboard_layout: det_layout,
        local_ip,
        screen_width: screen_w,
        screen_height: screen_h,
    };

    let pin_mgr = create_shared_pin_manager();
    let discovery = Arc::new(DiscoveryBeacon::new(
        format!("dev_{}", rand::random::<u32>()),
        hostname,
        os_name,
        42426,
    ));

    let active_screen = Arc::new(tokio::sync::RwLock::new(ActiveScreen::Host));
    let edge_mon = Arc::new(MouseEdgeMonitor::new(screen_w, screen_h));
    let keyboard_hook = Arc::new(KeyboardHookManager::new(active_screen));
    let clip_watcher = Arc::new(ClipboardWatcher::new());
    let mouse_sim = Arc::new(MouseSimulator::new(screen_w, screen_h));
    let keyboard_sim = Arc::new(KeyboardSimulator::new());

    let disc_clone = discovery.clone();

    let app_state = AppState {
        pin_manager: pin_mgr,
        discovery,
        server: Arc::new(RwLock::new(None)),
        client: Arc::new(RwLock::new(None)),
        current_session: Arc::new(RwLock::new(None)),
        edge_monitor: edge_mon,
        keyboard_hook,
        clipboard_watcher: clip_watcher,
        mouse_sim,
        keyboard_sim,
        sys_info,
        active_transfers: Arc::new(RwLock::new(HashMap::new())),
    };

    tauri::Builder::default()
        .manage(app_state)
        .setup(move |_app| {
            #[cfg(target_os = "macos")]
            {
                tauri::async_runtime::spawn(async move {
                    let _ = check_accessibility().await;
                });
            }
            tauri::async_runtime::spawn(async move {
                let _ = disc_clone.start().await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            get_host_os,
            create_connection_pin,
            join_connection,
            get_discovered_devices,
            disconnect_all,
            set_screen_arrangement,
            get_connection_status,
            toggle_active_screen,
            check_accessibility,
            open_accessibility_settings,
            get_keyboard_mapping_mode,
            set_keyboard_mapping_mode,
            get_custom_modifier_config,
            set_custom_modifier_config,
            release_stuck_keys
        ])
        .run(tauri::generate_context!())
        .expect("error while running AirDesk application");
}
