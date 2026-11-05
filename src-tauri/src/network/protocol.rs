use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum NetworkMessage {
    PairRequest(PairRequestPayload),
    PairResponse(PairResponsePayload),
    PairApprovalNeeded(PendingClientPayload),
    PairDecision(PairDecisionPayload),

    // Mouse events
    MouseMove(MouseMovePayload),
    MouseButton(MouseButtonPayload),
    MouseWheel(MouseWheelPayload),

    // Keyboard events
    KeyEvent(KeyEventPayload),

    // Screen focus control
    SwitchScreen(SwitchScreenPayload),

    // Clipboard synchronization
    ClipboardSync(ClipboardSyncPayload),

    // Keepalive and teardown
    Ping { timestamp: u64 },
    Pong { timestamp: u64 },
    Disconnect { reason: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairRequestPayload {
    pub pin: String,
    pub client_id: String,
    pub device_name: String,
    pub os: String,
    pub screen_width: u32,
    pub screen_height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairResponsePayload {
    pub success: bool,
    pub reason: Option<String>,
    pub session_token: Option<String>,
    pub host_name: String,
    pub host_os: String,
    pub host_screen_width: u32,
    pub host_screen_height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingClientPayload {
    pub client_id: String,
    pub device_name: String,
    pub os: String,
    pub ip: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairDecisionPayload {
    pub approved: bool,
    pub token: Option<String>,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MouseMovePayload {
    pub dx: i32,
    pub dy: i32,
    pub abs_x: Option<i32>,
    pub abs_y: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MouseButtonPayload {
    pub button: u8, // 0 = Left, 1 = Right, 2 = Middle
    pub state: u8,  // 0 = Up, 1 = Down
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MouseWheelPayload {
    pub delta_x: i32,
    pub delta_y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyEventPayload {
    pub key_code: u32,
    pub key_char: Option<String>,
    pub state: u8, // 0 = Up, 1 = Down
    pub modifiers: u8, // Bitflags: 1=Shift, 2=Ctrl, 4=Alt, 8=Meta/Cmd
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwitchScreenPayload {
    pub active_device: String, // "host" or "client"
    pub entry_y_ratio: f32,    // 0.0 to 1.0 relative cursor Y
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardSyncPayload {
    pub text: String,
    pub hash: u64,
}

// Framing helper: encode message as length-prefixed JSON byte stream
pub fn serialize_message(msg: &NetworkMessage) -> Result<Vec<u8>, serde_json::Error> {
    let json_bytes = serde_json::to_vec(msg)?;
    let len = (json_bytes.len() as u32).to_be_bytes();
    let mut framed = Vec::with_capacity(4 + json_bytes.len());
    framed.extend_from_slice(&len);
    framed.extend_from_slice(&json_bytes);
    Ok(framed)
}
