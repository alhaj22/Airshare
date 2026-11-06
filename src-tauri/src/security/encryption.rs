use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use hkdf::Hkdf;
use sha2::Sha256;

pub struct CipherSession {
    key: [u8; 32],
    nonce_counter: u64,
}

impl CipherSession {
    /// Derive a shared 256-bit AES key from the 6-digit PIN and shared salt
    pub fn from_pin(pin: &str, salt: &[u8]) -> Self {
        let hk = Hkdf::<Sha256>::new(Some(salt), pin.trim().as_bytes());
        let mut key = [0u8; 32];
        hk.expand(b"airdesk-aes256-gcm-v1", &mut key)
            .expect("32 bytes is valid length for HKDF expansion");

        Self {
            key,
            nonce_counter: 0,
        }
    }

    /// Encrypt plaintext with AES-256-GCM. Prepends 12-byte nonce.
    pub fn encrypt(&mut self, plaintext: &[u8]) -> Result<Vec<u8>, String> {
        self.nonce_counter = self.nonce_counter.wrapping_add(1);
        let mut nonce_bytes = [0u8; 12];
        nonce_bytes[4..12].copy_from_slice(&self.nonce_counter.to_be_bytes());

        let cipher = Aes256Gcm::new_from_slice(&self.key).map_err(|e| e.to_string())?;
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher.encrypt(nonce, plaintext).map_err(|e| e.to_string())?;

        let mut packet = Vec::with_capacity(12 + ciphertext.len());
        packet.extend_from_slice(&nonce_bytes);
        packet.extend_from_slice(&ciphertext);
        Ok(packet)
    }

    /// Decrypt ciphertext with AES-256-GCM using prepended 12-byte nonce
    pub fn decrypt(&self, packet: &[u8]) -> Result<Vec<u8>, String> {
        if packet.len() < 12 + 16 {
            return Err("Packet too short for AES-GCM tag and nonce".to_string());
        }

        let nonce_bytes = &packet[..12];
        let ciphertext = &packet[12..];

        let cipher = Aes256Gcm::new_from_slice(&self.key).map_err(|e| e.to_string())?;
        let nonce = Nonce::from_slice(nonce_bytes);

        cipher.decrypt(nonce, ciphertext).map_err(|e| format!("Decryption failed: {}", e))
    }
}
