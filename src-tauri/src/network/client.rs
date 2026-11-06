use std::net::SocketAddr;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::sync::{mpsc, RwLock};
use log::info;

use super::protocol::{
    serialize_message, NetworkMessage, PairRequestPayload,
};

pub struct NetworkClient {
    outbound_tx: Option<mpsc::UnboundedSender<NetworkMessage>>,
    is_connected: Arc<RwLock<bool>>,
    client_id: String,
    device_name: String,
    os_name: String,
    screen_width: u32,
    screen_height: u32,
}

impl NetworkClient {
    pub fn new(
        client_id: String,
        device_name: String,
        os_name: String,
        screen_width: u32,
        screen_height: u32,
    ) -> Self {
        Self {
            outbound_tx: None,
            is_connected: Arc::new(RwLock::new(false)),
            client_id,
            device_name,
            os_name,
            screen_width,
            screen_height,
        }
    }

    pub async fn connect(
        &mut self,
        host_ip: &str,
        host_port: u16,
        pin: &str,
        incoming_tx: mpsc::UnboundedSender<NetworkMessage>,
        status_tx: mpsc::UnboundedSender<String>,
    ) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        let addr: SocketAddr = format!("{}:{}", host_ip, host_port).parse()?;
        info!("Connecting to AirDesk Host at {}", addr);

        let mut stream = TcpStream::connect(addr).await?;

        // 1. Send PairRequest with entered 6-digit PIN
        let req = NetworkMessage::PairRequest(PairRequestPayload {
            pin: pin.trim().to_string(),
            client_id: self.client_id.clone(),
            device_name: self.device_name.clone(),
            os: self.os_name.clone(),
            screen_width: self.screen_width,
            screen_height: self.screen_height,
        });

        let encoded = serialize_message(&req)?;
        stream.write_all(&encoded).await?;

        // 2. Read PairResponse
        let mut len_buf = [0u8; 4];
        stream.read_exact(&mut len_buf).await?;
        let len = u32::from_be_bytes(len_buf) as usize;

        let mut body_buf = vec![0u8; len];
        stream.read_exact(&mut body_buf).await?;
        let response_msg: NetworkMessage = serde_json::from_slice(&body_buf)?;

        let pair_resp = match response_msg {
            NetworkMessage::PairResponse(resp) => resp,
            _ => return Err("Unexpected response message from host".into()),
        };

        if !pair_resp.success {
            let reason = pair_resp.reason.unwrap_or_else(|| "Connection rejected by host".to_string());
            return Err(reason.into());
        }

        let token = pair_resp.session_token.unwrap_or_default();
        info!("Successfully paired with host '{}' ({})", pair_resp.host_name, pair_resp.host_os);

        *self.is_connected.write().await = true;
        let is_connected_clone = self.is_connected.clone();

        let (outbound_tx, mut outbound_rx) = mpsc::unbounded_channel::<NetworkMessage>();
        self.outbound_tx = Some(outbound_tx);

        let (mut reader, mut writer) = stream.into_split();

        // Writer task
        tokio::spawn(async move {
            while let Some(msg) = outbound_rx.recv().await {
                if let Ok(bytes) = serialize_message(&msg) {
                    if writer.write_all(&bytes).await.is_err() {
                        break;
                    }
                }
            }
        });

        // Reader task
        let status_tx_clone = status_tx.clone();
        tokio::spawn(async move {
            let mut l_buf = [0u8; 4];
            loop {
                if reader.read_exact(&mut l_buf).await.is_err() {
                    break;
                }
                let msg_len = u32::from_be_bytes(l_buf) as usize;
                let mut b_buf = vec![0u8; msg_len];
                if reader.read_exact(&mut b_buf).await.is_err() {
                    break;
                }
                if let Ok(msg) = serde_json::from_slice::<NetworkMessage>(&b_buf) {
                    let _ = incoming_tx.send(msg);
                }
            }
            *is_connected_clone.write().await = false;
            let _ = status_tx_clone.send("Disconnected from host".to_string());
        });

        let _ = status_tx.send(format!("Connected to {}", pair_resp.host_name));
        Ok(token)
    }

    pub fn get_outbound_sender(&self) -> Option<mpsc::UnboundedSender<NetworkMessage>> {
        self.outbound_tx.clone()
    }

    pub fn send_message(&self, msg: NetworkMessage) -> Result<(), &'static str> {
        if let Some(tx) = &self.outbound_tx {
            tx.send(msg).map_err(|_| "Failed to send message: channel closed")
        } else {
            Err("Client not currently connected")
        }
    }

    pub async fn disconnect(&mut self) {
        *self.is_connected.write().await = false;
        self.outbound_tx = None;
    }
}
