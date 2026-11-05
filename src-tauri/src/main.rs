// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod clipboard;
mod discovery;
mod keyboard;
mod mouse;
mod network;
mod security;

use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use serde::{Deserialize, Serialize};

use clipboard::ClipboardWatcher;
use discovery::{DiscoveredDevice, DiscoveryBeacon};
use keyboard::{KeyboardHookManager, KeyboardSimulator};
use mouse::{ActiveScreen, MouseEdgeMonitor, MouseSimulator, ScreenArrangement};
use network::{NetworkClient, NetworkMessage, NetworkServer};
use security::{create_shared_pin_manager, PairedDevice, SharedPinManager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub device_name: String,
    pub os: String,
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
    pub mode: String, // "idle", "hosting", "client", "connected"
    pub peer_device: Option<String>,
    pub peer_ip: Option<String>,
    pub active_screen: String, // "host" or "client"
    pub pin: Option<String>,
    pub pin_remaining_seconds: Option<u64>,
}

pub struct AppState {
    pub pin_manager: SharedPinManager,
    pub discovery: Arc<DiscoveryBeacon>,
    pub server: Arc<RwLock<Option<NetworkServer>>>,
    pub client: Arc<RwLock<Option<NetworkClient>>>,
    pub edge_monitor: Arc<MouseEdgeMonitor>,
    pub clipboard_watcher: Arc<ClipboardWatcher>,
    pub mouse_sim: Arc<MouseSimulator>,
    pub keyboard_sim: Arc<KeyboardSimulator>,
    pub sys_info: SystemInfo,
}

#[tauri::command]
async fn get_system_info(state: tauri::State<'_, AppState>) -> Result<SystemInfo, String> {
    Ok(state.sys_info.clone())
}

#[tauri::command]
async fn create_connection_pin(state: tauri::State<'_, AppState>) -> Result<HostPinResponse, String> {
    let (pin, expires) = {
        let mut mgr = state.pin_manager.write().await;
        mgr.generate_new_pin()
    };

    // Mark discovery beacon as host
    state.discovery.set_is_host(true).await;

    // Start TCP server
    let (msg_tx, mut msg_rx) = mpsc::unbounded_channel::<NetworkMessage>();
    let (status_tx, mut status_rx) = mpsc::unbounded_channel::<String>();

    let mut server = NetworkServer::new(
        state.pin_manager.clone(),
        state.sys_info.device_name.clone(),
        state.sys_info.os.clone(),
        state.sys_info.screen_width,
        state.sys_info.screen_height,
    );

    server.start(msg_tx, status_tx).await.map_err(|e| e.to_string())?;
    *state.server.write().await = Some(server);

    // Start background event handler for incoming server messages
    let clip_watcher = state.clipboard_watcher.clone();
    let edge_mon = state.edge_monitor.clone();
    let m_sim = state.mouse_sim.clone();
    let k_sim = state.keyboard_sim.clone();

    tokio::spawn(async move {
        while let Some(msg) = msg_rx.recv().await {
            match msg {
                NetworkMessage::ClipboardSync(p) => {
                    clip_watcher.apply_incoming_text(&p.text, p.hash).await;
                }
                NetworkMessage::SwitchScreen(p) => {
                    let target = if p.active_device == "host" {
                        ActiveScreen::Host
                    } else {
                        ActiveScreen::Client
                    };
                    edge_mon.set_active_screen(target).await;
                }
                NetworkMessage::MouseMove(p) => {
                    m_sim.move_relative(p.dx, p.dy);
                }
                NetworkMessage::MouseButton(p) => {
                    m_sim.button_event(p.button, p.state == 1);
                }
                NetworkMessage::MouseWheel(p) => {
                    m_sim.scroll(p.delta_x, p.delta_y);
                }
                NetworkMessage::KeyEvent(p) => {
                    k_sim.key_event(p.key_code, p.state == 1, p.key_char.as_deref());
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
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let (incoming_tx, mut incoming_rx) = mpsc::unbounded_channel::<NetworkMessage>();
    let (status_tx, _status_rx) = mpsc::unbounded_channel::<String>();

    let mut client = NetworkClient::new(
        format!("dev_{}", rand::random::<u32>()),
        state.sys_info.device_name.clone(),
        state.sys_info.os.clone(),
        state.sys_info.screen_width,
        state.sys_info.screen_height,
    );

    let token = client
        .connect(&host_ip, 42426, &pin, incoming_tx, status_tx)
        .await
        .map_err(|e| e.to_string())?;

    *state.client.write().await = Some(client);

    // Start background event handler for incoming client messages
    let clip_watcher = state.clipboard_watcher.clone();
    let m_sim = state.mouse_sim.clone();
    let k_sim = state.keyboard_sim.clone();
    let edge_mon = state.edge_monitor.clone();

    tokio::spawn(async move {
        while let Some(msg) = incoming_rx.recv().await {
            match msg {
                NetworkMessage::MouseMove(p) => {
                    m_sim.move_relative(p.dx, p.dy);
                }
                NetworkMessage::MouseButton(p) => {
                    m_sim.button_event(p.button, p.state == 1);
                }
                NetworkMessage::MouseWheel(p) => {
                    m_sim.scroll(p.delta_x, p.delta_y);
                }
                NetworkMessage::KeyEvent(p) => {
                    k_sim.key_event(p.key_code, p.state == 1, p.key_char.as_deref());
                }
                NetworkMessage::ClipboardSync(p) => {
                    clip_watcher.apply_incoming_text(&p.text, p.hash).await;
                }
                NetworkMessage::SwitchScreen(p) => {
                    let target = if p.active_device == "host" {
                        ActiveScreen::Host
                    } else {
                        ActiveScreen::Client
                    };
                    edge_mon.set_active_screen(target).await;
                }
                _ => {}
            }
        }
    });

    Ok(token)
}

#[tauri::command]
async fn get_discovered_devices(state: tauri::State<'_, AppState>) -> Result<Vec<DiscoveredDevice>, String> {
    Ok(state.discovery.get_discovered_devices().await)
}

#[tauri::command]
async fn disconnect_all(state: tauri::State<'_, AppState>) -> Result<(), String> {
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

    Ok(())
}

#[tauri::command]
async fn set_screen_arrangement(
    arrangement: String,
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
    Ok(())
}

#[tauri::command]
async fn get_connection_status(state: tauri::State<'_, AppState>) -> Result<ConnectionStatus, String> {
    let pin_mgr = state.pin_manager.read().await;
    let pin_info = pin_mgr.get_current_pin_info();
    let paired = pin_mgr.get_paired_device();
    let active = state.edge_monitor.get_active_screen().await;

    let (mode, peer_name, peer_ip) = if let Some(dev) = paired {
        ("connected".to_string(), Some(dev.device_name), Some(dev.ip))
    } else if pin_info.is_some() {
        ("hosting".to_string(), None, None)
    } else if state.client.read().await.is_some() {
        ("client".to_string(), None, None)
    } else {
        ("idle".to_string(), None, None)
    };

    Ok(ConnectionStatus {
        mode,
        peer_device: peer_name,
        peer_ip,
        active_screen: match active {
            ActiveScreen::Host => "host".to_string(),
            ActiveScreen::Client => "client".to_string(),
        },
        pin: pin_info.as_ref().map(|(p, _)| p.clone()),
        pin_remaining_seconds: pin_info.map(|(_, s)| s),
    })
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

    let sys_info = SystemInfo {
        device_name: hostname.clone(),
        os: os_name.clone(),
        local_ip,
        screen_width: 1920,
        screen_height: 1080,
    };

    let pin_mgr = create_shared_pin_manager();
    let discovery = Arc::new(DiscoveryBeacon::new(
        format!("dev_{}", rand::random::<u32>()),
        hostname,
        os_name,
        42426,
    ));

    let edge_mon = Arc::new(MouseEdgeMonitor::new(1920, 1080));
    let clip_watcher = Arc::new(ClipboardWatcher::new());
    let mouse_sim = Arc::new(MouseSimulator::new(1920, 1080));
    let keyboard_sim = Arc::new(KeyboardSimulator::new());

    // Start local discovery beacon listener
    let disc_clone = discovery.clone();
    tokio::spawn(async move {
        let _ = disc_clone.start().await;
    });

    let app_state = AppState {
        pin_manager: pin_mgr,
        discovery,
        server: Arc::new(RwLock::new(None)),
        client: Arc::new(RwLock::new(None)),
        edge_monitor: edge_mon,
        clipboard_watcher: clip_watcher,
        mouse_sim,
        keyboard_sim,
        sys_info,
    };

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            create_connection_pin,
            join_connection,
            get_discovered_devices,
            disconnect_all,
            set_screen_arrangement,
            get_connection_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running AirDesk application");
}
