use std::net::SocketAddr;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, Mutex, RwLock};
use log::{error, info, warn};

use super::protocol::{
    serialize_message, NetworkMessage, PairResponsePayload,
};
use crate::security::{PairedDevice, SharedPinManager};

pub const DEFAULT_PORT: u16 = 42426;

pub struct NetworkServer {
    pin_manager: SharedPinManager,
    outbound_tx: Option<mpsc::UnboundedSender<NetworkMessage>>,
    is_running: Arc<RwLock<bool>>,
    host_name: String,
    host_os: String,
    screen_width: u32,
    screen_height: u32,
}

impl NetworkServer {
    pub fn new(
        pin_manager: SharedPinManager,
        host_name: String,
        host_os: String,
        screen_width: u32,
        screen_height: u32,
    ) -> Self {
        Self {
            pin_manager,
            outbound_tx: None,
            is_running: Arc::new(RwLock::new(false)),
            host_name,
            host_os,
            screen_width,
            screen_height,
        }
    }

    pub async fn start(
        &mut self,
        incoming_msg_tx: mpsc::UnboundedSender<NetworkMessage>,
        connection_status_tx: mpsc::UnboundedSender<String>,
    ) -> Result<u16, Box<dyn std::error::Error + Send + Sync>> {
        let listener = TcpListener::bind(format!("0.0.0.0:{}", DEFAULT_PORT)).await?;
        let local_addr = listener.local_addr()?;
        info!("AirDesk Server listening on TCP port {}", local_addr.port());

        *self.is_running.write().await = true;
        let is_running_clone = self.is_running.clone();
        let pin_mgr_clone = self.pin_manager.clone();
        let (outbound_tx, outbound_rx) = mpsc::unbounded_channel::<NetworkMessage>();
        let shared_outbound_rx = Arc::new(Mutex::new(outbound_rx));
        self.outbound_tx = Some(outbound_tx);

        let host_name = self.host_name.clone();
        let host_os = self.host_os.clone();
        let screen_w = self.screen_width;
        let screen_h = self.screen_height;

        tokio::spawn(async move {
            while *is_running_clone.read().await {
                match listener.accept().await {
                    Ok((stream, client_addr)) => {
                        info!("Incoming connection from {}", client_addr);
                        let pin_mgr = pin_mgr_clone.clone();
                        let in_tx = incoming_msg_tx.clone();
                        let status_tx = connection_status_tx.clone();
                        let out_rx = shared_outbound_rx.clone();
                        let h_name = host_name.clone();
                        let h_os = host_os.clone();

                        tokio::spawn(async move {
                            if let Err(e) = Self::handle_client(
                                stream,
                                client_addr,
                                pin_mgr,
                                in_tx,
                                status_tx,
                                out_rx,
                                h_name,
                                h_os,
                                screen_w,
                                screen_h,
                            ).await {
                                warn!("Client connection closed: {}", e);
                            }
                        });
                    }
                    Err(e) => {
                        if *is_running_clone.read().await {
                            error!("Error accepting client connection: {}", e);
                        }
                        break;
                    }
                }
            }
        });

        Ok(local_addr.port())
    }

    pub fn send_message(&self, msg: NetworkMessage) -> Result<(), &'static str> {
        if let Some(tx) = &self.outbound_tx {
            tx.send(msg).map_err(|_| "Failed to send message: channel closed")
        } else {
            Err("Server not currently connected to client")
        }
    }

    pub async fn stop(&mut self) {
        *self.is_running.write().await = false;
        self.outbound_tx = None;
    }

    async fn handle_client(
        mut stream: TcpStream,
        addr: SocketAddr,
        pin_manager: SharedPinManager,
        incoming_tx: mpsc::UnboundedSender<NetworkMessage>,
        status_tx: mpsc::UnboundedSender<String>,
        outbound_rx: Arc<Mutex<mpsc::UnboundedReceiver<NetworkMessage>>>,
        host_name: String,
        host_os: String,
        screen_w: u32,
        screen_h: u32,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Step 1: Read PairRequest
        let mut len_buf = [0u8; 4];
        stream.read_exact(&mut len_buf).await?;
        let len = u32::from_be_bytes(len_buf) as usize;

        if len > 10 * 1024 * 1024 {
            return Err("Payload too large".into());
        }

        let mut body_buf = vec![0u8; len];
        stream.read_exact(&mut body_buf).await?;
        let msg: NetworkMessage = serde_json::from_slice(&body_buf)?;

        let pair_request = match msg {
            NetworkMessage::PairRequest(req) => req,
            _ => return Err("Expected PairRequest as initial message".into()),
        };

        // Step 2: Validate 6-digit PIN
        let pin_verify_result = {
            let mgr = pin_manager.read().await;
            mgr.verify_pin(&pair_request.pin)
        };

        match pin_verify_result {
            Ok(token) => {
                // PIN matches! Register paired device
                {
                    let mut mgr = pin_manager.write().await;
                    mgr.set_paired_device(PairedDevice {
                        device_id: pair_request.client_id.clone(),
                        device_name: pair_request.device_name.clone(),
                        os: pair_request.os.clone(),
                        ip: addr.ip().to_string(),
                        paired_at: std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs(),
                        token: token.clone(),
                    });
                }

                // Send success response
                let response = NetworkMessage::PairResponse(PairResponsePayload {
                    success: true,
                    reason: None,
                    session_token: Some(token),
                    host_name,
                    host_os,
                    host_screen_width: screen_w,
                    host_screen_height: screen_h,
                });
                let encoded = serialize_message(&response)?;
                stream.write_all(&encoded).await?;

                let _ = status_tx.send(format!("Connected to {}", pair_request.device_name));

                // Step 3: Stream message handling loop
                let (mut reader, mut writer) = stream.into_split();

                // Writer task
                let out_rx_clone = outbound_rx.clone();
                tokio::spawn(async move {
                    loop {
                        let maybe_msg = {
                            let mut rx = out_rx_clone.lock().await;
                            rx.recv().await
                        };

                        if let Some(msg) = maybe_msg {
                            if let Ok(bytes) = serialize_message(&msg) {
                                if writer.write_all(&bytes).await.is_err() {
                                    break;
                                }
                            }
                        } else {
                            break;
                        }
                    }
                });

                // Reader loop
                let in_tx = incoming_tx.clone();
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
                        if let Ok(incoming) = serde_json::from_slice::<NetworkMessage>(&b_buf) {
                            let _ = in_tx.send(incoming);
                        }
                    }
                    let _ = status_tx_clone.send("Disconnected".to_string());
                });

                Ok(())
            }
            Err(err_msg) => {
                let response = NetworkMessage::PairResponse(PairResponsePayload {
                    success: false,
                    reason: Some(err_msg.to_string()),
                    session_token: None,
                    host_name,
                    host_os,
                    host_screen_width: 0,
                    host_screen_height: 0,
                });
                let encoded = serialize_message(&response)?;
                stream.write_all(&encoded).await?;
                Err(err_msg.into())
            }
        }
    }
}
