pub mod client;
pub mod protocol;
pub mod server;

pub use client::NetworkClient;
pub use protocol::{
    ClipboardSyncPayload, FileChunkPayload, FileTransferAckPayload, FileTransferInitPayload,
    KeyEventPayload, MouseButtonPayload, MouseMovePayload, MouseWheelPayload, NetworkMessage,
    PairRequestPayload, PairResponsePayload, SwitchScreenPayload,
};
pub use server::NetworkServer;
