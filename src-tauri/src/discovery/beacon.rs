use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::{Duration, Instant};
use log::{debug, error, info, warn};
use serde::{Deserialize, Serialize};
use tokio::net::UdpSocket;
use tokio::sync::RwLock;

pub const DISCOVERY_PORT: u16 = 42425;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredDevice {
    pub device_id: String,
    pub device_name: String,
    pub os: String,
    pub ip: String,
    pub port: u16,
    pub is_host: bool,
    #[serde(skip)]
    pub last_seen: Option<Instant>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct BeaconPacket {
    pub service: String,
    pub device_id: String,
    pub device_name: String,
    pub os: String,
    pub is_host: bool,
    pub port: u16,
}

pub struct DiscoveryBeacon {
    device_id: String,
    device_name: String,
    os: String,
    tcp_port: u16,
    is_host: Arc<RwLock<bool>>,
    is_running: Arc<RwLock<bool>>,
    devices: Arc<RwLock<HashMap<String, DiscoveredDevice>>>,
}

impl DiscoveryBeacon {
    pub fn new(device_id: String, device_name: String, os: String, tcp_port: u16) -> Self {
        Self {
            device_id,
            device_name,
            os,
            tcp_port,
            is_host: Arc::new(RwLock::new(false)),
            is_running: Arc::new(RwLock::new(false)),
            devices: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn set_is_host(&self, host: bool) {
        *self.is_host.write().await = host;
    }

    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        *self.is_running.write().await = true;

        let socket = UdpSocket::bind(format!("0.0.0.0:{}", DISCOVERY_PORT)).await?;
        socket.set_broadcast(true)?;
        let socket = Arc::new(socket);

        let device_id = self.device_id.clone();
        let device_name = self.device_name.clone();
        let os = self.os.clone();
        let tcp_port = self.tcp_port;
        let is_host_flag = self.is_host.clone();
        let is_running_flag = self.is_running.clone();
        let devices_map = self.devices.clone();

        // 1. Broadcaster task
        let send_socket = socket.clone();
        let send_running = is_running_flag.clone();
        tokio::spawn(async move {
            let broadcast_addr: SocketAddr = format!("255.255.255.255:{}", DISCOVERY_PORT)
                .parse()
                .unwrap();

            while *send_running.read().await {
                let packet = BeaconPacket {
                    service: "airdesk".to_string(),
                    device_id: device_id.clone(),
                    device_name: device_name.clone(),
                    os: os.clone(),
                    is_host: *is_host_flag.read().await,
                    port: tcp_port,
                };

                if let Ok(json_bytes) = serde_json::to_vec(&packet) {
                    let _ = send_socket.send_to(&json_bytes, broadcast_addr).await;
                }

                tokio::time::sleep(Duration::from_millis(1500)).await;
            }
        });

        // 2. Receiver task
        let recv_socket = socket.clone();
        let my_id = self.device_id.clone();
        tokio::spawn(async move {
            let mut buf = [0u8; 1024];
            while *is_running_flag.read().await {
                if let Ok((len, src_addr)) = recv_socket.recv_from(&mut buf).await {
                    if let Ok(packet) = serde_json::from_slice::<BeaconPacket>(&buf[..len]) {
                        if packet.service == "airdesk" && packet.device_id != my_id {
                            let mut map = devices_map.write().await;
                            map.insert(
                                packet.device_id.clone(),
                                DiscoveredDevice {
                                    device_id: packet.device_id,
                                    device_name: packet.device_name,
                                    os: packet.os,
                                    ip: src_addr.ip().to_string(),
                                    port: packet.port,
                                    is_host: packet.is_host,
                                    last_seen: Some(Instant::now()),
                                },
                            );
                        }
                    }
                }
            }
        });

        Ok(())
    }

    pub async fn get_discovered_devices(&self) -> Vec<DiscoveredDevice> {
        let mut map = self.devices.write().await;
        // Purge devices not heard from in 8 seconds
        let timeout = Duration::from_secs(8);
        map.retain(|_, dev| {
            if let Some(t) = dev.last_seen {
                t.elapsed() < timeout
            } else {
                false
            }
        });

        map.values().cloned().collect()
    }

    pub async fn stop(&self) {
        *self.is_running.write().await = false;
    }
}
