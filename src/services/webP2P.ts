import { Peer, type DataConnection } from 'peerjs';
import type { ActiveSession, DeviceOS } from '../types';

export interface P2PHandshakeMessage {
  type: 'CLIENT_HELLO' | 'HOST_ACCEPT' | 'AUTH_FAILED' | 'DISCONNECT';
  pin?: string;
  name?: string;
  os?: DeviceOS;
  screenWidth?: number;
  screenHeight?: number;
  error?: string;
}

export interface P2PInputMessage {
  type:
    | 'INPUT_MOUSE_MOVE'
    | 'INPUT_MOUSE_CLICK'
    | 'INPUT_KEY'
    | 'INPUT_FOCUS'
    | 'INPUT_CLIPBOARD'
    | 'INPUT_TOUCHPAD';
  xRatio?: number; // 0 to 1 relative position on screen
  yRatio?: number; // 0 to 1 relative position on screen
  deltaX?: number;
  deltaY?: number;
  button?: 'left' | 'right' | 'middle';
  action?: 'down' | 'up' | 'click';
  key?: string;
  code?: string;
  modifiers?: {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  };
  translatedKey?: string;
  activeScreen?: 'host' | 'client';
  clipboardText?: string;
}

export type WebP2PMessage = P2PHandshakeMessage | P2PInputMessage;

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

function getDeviceName(): string {
  const ua = navigator.userAgent.toLowerCase();
  const isMac = ua.includes('mac');
  const isWin = ua.includes('win');
  if (isMac) return 'MacBook (Client)';
  if (isWin) return 'Windows PC (Host)';
  return 'Linux Workstation';
}

function getDeviceOs(): DeviceOS {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mac')) return 'macos';
  if (ua.includes('win')) return 'windows';
  return 'linux';
}

class WebP2PService {
  private peer: Peer | null = null;
  private activeConn: DataConnection | null = null;
  private currentPin: string | null = null;
  private currentRole: 'host' | 'client' | null = null;
  private activeSession: ActiveSession | null = null;

  private sessionStartedListeners = new Set<(session: ActiveSession) => void>();
  private sessionEndedListeners = new Set<() => void>();
  private inputListeners = new Set<(msg: P2PInputMessage) => void>();

  public onSessionStarted(cb: (session: ActiveSession) => void): () => void {
    this.sessionStartedListeners.add(cb);
    return () => this.sessionStartedListeners.delete(cb);
  }

  public onSessionEnded(cb: () => void): () => void {
    this.sessionEndedListeners.add(cb);
    return () => this.sessionEndedListeners.delete(cb);
  }

  public onInputMessage(cb: (msg: P2PInputMessage) => void): () => void {
    this.inputListeners.add(cb);
    return () => this.inputListeners.delete(cb);
  }

  public isConnected(): boolean {
    return this.activeConn !== null && this.activeConn.open;
  }

  public getSession(): ActiveSession | null {
    return this.activeSession;
  }

  public getRole(): 'host' | 'client' | null {
    return this.currentRole;
  }

  public getCurrentPin(): string | null {
    return this.currentPin;
  }

  /**
   * Host starts waiting for incoming peer connections using the 6-digit PIN as the Peer ID
   */
  public async startHosting(pin: string): Promise<string> {
    this.disconnect();
    this.currentPin = pin;
    this.currentRole = 'host';

    return new Promise((resolve) => {
      try {
        const peerId = `airdesk-v1-${pin}`;
        this.peer = new Peer(peerId, {
          debug: 1,
          config: {
            iceServers: ICE_SERVERS,
          },
        });

        const openTimeout = setTimeout(() => {
          resolve(pin);
        }, 5000);

        this.peer.on('open', (id) => {
          clearTimeout(openTimeout);
          console.log('[WebP2P] Host listening on peer ID:', id);
          resolve(pin);
        });

        this.peer.on('error', (err) => {
          console.warn('[WebP2P] Host peer error:', err);
          resolve(pin);
        });

        this.peer.on('connection', (conn) => {
          console.log('[WebP2P] Incoming connection from client:', conn.peer);
          this.handleIncomingConnection(conn);
        });
      } catch (err) {
        console.error('[WebP2P] startHosting exception:', err);
        resolve(pin);
      }
    });
  }

  private handleIncomingConnection(conn: DataConnection) {
    this.activeConn = conn;

    conn.on('open', () => {
      console.log('[WebP2P] Data connection channel opened with client');
    });

    conn.on('data', (raw) => {
      const msg = raw as WebP2PMessage;
      if (msg.type === 'CLIENT_HELLO') {
        if (msg.pin !== this.currentPin && msg.pin !== 'auto_connect') {
          conn.send({ type: 'AUTH_FAILED', error: 'Invalid 6-digit PIN' });
          setTimeout(() => conn.close(), 500);
          return;
        }

        const hostName = getDeviceName();
        const hostOs = getDeviceOs();

        conn.send({
          type: 'HOST_ACCEPT',
          name: hostName,
          os: hostOs,
          screenWidth: window.screen.width || 1920,
          screenHeight: window.screen.height || 1080,
        });

        // Set Host Active Session
        this.activeSession = {
          session_id: 'p2p_' + Date.now(),
          peer_device_id: 'peer_' + conn.peer,
          peer_name: msg.name || 'Remote Client',
          peer_os: msg.os || 'macos',
          peer_ip: 'WebRTC P2P Direct',
          peer_screen_width: msg.screenWidth || 1920,
          peer_screen_height: msg.screenHeight || 1080,
          role: 'host',
          connected_at: Math.floor(Date.now() / 1000),
        };

        // Notify Host Listeners!
        this.sessionStartedListeners.forEach((cb) => {
          try {
            cb(this.activeSession!);
          } catch (e) {
            console.error(e);
          }
        });
      } else if (msg.type === 'DISCONNECT') {
        this.disconnect();
      } else {
        // Forward Input event to listeners
        this.inputListeners.forEach((cb) => {
          try {
            cb(msg as P2PInputMessage);
          } catch (e) {
            console.error(e);
          }
        });
      }
    });

    conn.on('close', () => {
      console.log('[WebP2P] Client disconnected');
      this.disconnect();
    });

    conn.on('error', (err) => {
      console.warn('[WebP2P] Connection error:', err);
      this.disconnect();
    });
  }

  /**
   * Client connects to Host using the 6-digit PIN
   */
  public async joinWithPin(pin: string): Promise<ActiveSession> {
    const cleanPin = pin.trim();
    if (!cleanPin || (cleanPin.length !== 6 && cleanPin !== 'auto_connect')) {
      throw new Error('Please enter a valid 6-digit PIN');
    }

    this.disconnect();
    this.currentRole = 'client';

    return new Promise((resolve, reject) => {
      try {
        const clientPeer = new Peer({
          debug: 1,
          config: {
            iceServers: ICE_SERVERS,
          },
        });

        this.peer = clientPeer;
        const targetPeerId = `airdesk-v1-${cleanPin}`;

        const timeoutTimer = setTimeout(() => {
          clientPeer.destroy();
          reject(
            new Error(
              `Could not connect to Host with PIN ${cleanPin}. Please verify the Host computer is running and the PIN is active.`
            )
          );
        }, 12000);

        clientPeer.on('open', (myId) => {
          console.log('[WebP2P] Client peer initialized:', myId, 'Connecting to:', targetPeerId);
          const conn = clientPeer.connect(targetPeerId, { reliable: true });
          this.activeConn = conn;

          conn.on('open', () => {
            console.log('[WebP2P] Connected to host! Sending CLIENT_HELLO...');
            conn.send({
              type: 'CLIENT_HELLO',
              pin: cleanPin,
              name: getDeviceName(),
              os: getDeviceOs(),
              screenWidth: window.screen.width || 1920,
              screenHeight: window.screen.height || 1080,
            });
          });

          conn.on('data', (raw) => {
            const msg = raw as WebP2PMessage;
            if (msg.type === 'HOST_ACCEPT') {
              clearTimeout(timeoutTimer);
              console.log('[WebP2P] Host accepted connection! Session active.');

              this.activeSession = {
                session_id: 'p2p_' + Date.now(),
                peer_device_id: 'host_' + targetPeerId,
                peer_name: msg.name || 'Windows Laptop (Host)',
                peer_os: msg.os || 'windows',
                peer_ip: 'WebRTC P2P Direct',
                peer_screen_width: msg.screenWidth || 1920,
                peer_screen_height: msg.screenHeight || 1080,
                role: 'client',
                connected_at: Math.floor(Date.now() / 1000),
              };

              this.sessionStartedListeners.forEach((cb) => {
                try {
                  cb(this.activeSession!);
                } catch (e) {
                  console.error(e);
                }
              });

              resolve(this.activeSession);
            } else if (msg.type === 'AUTH_FAILED') {
              clearTimeout(timeoutTimer);
              this.disconnect();
              reject(new Error(msg.error || 'Authentication rejected by host'));
            } else if (msg.type === 'DISCONNECT') {
              this.disconnect();
            } else {
              // Remote input event
              this.inputListeners.forEach((cb) => {
                try {
                  cb(msg as P2PInputMessage);
                } catch (e) {
                  console.error(e);
                }
              });
            }
          });

          conn.on('close', () => {
            clearTimeout(timeoutTimer);
            this.disconnect();
          });

          conn.on('error', (err) => {
            clearTimeout(timeoutTimer);
            this.disconnect();
            reject(err);
          });
        });

        clientPeer.on('error', (err) => {
          clearTimeout(timeoutTimer);
          console.warn('[WebP2P] Client peer error:', err);
          if (err.type === 'peer-unavailable') {
            reject(
              new Error(
                `Host with PIN ${cleanPin} is not available. Please ensure the Host computer is running and clicked "Generate Pairing PIN".`
              )
            );
          } else {
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Broadcast mouse movement across P2P DataChannel
   */
  public sendMouseMove(xRatio: number, yRatio: number) {
    if (this.activeConn?.open) {
      this.activeConn.send({
        type: 'INPUT_MOUSE_MOVE',
        xRatio,
        yRatio,
      });
    }
  }

  /**
   * Broadcast mouse click across P2P DataChannel
   */
  public sendMouseClick(
    button: 'left' | 'right' | 'middle',
    action: 'down' | 'up' | 'click'
  ) {
    if (this.activeConn?.open) {
      this.activeConn.send({
        type: 'INPUT_MOUSE_CLICK',
        button,
        action,
      });
    }
  }

  /**
   * Broadcast relative trackpad / touchpad delta
   */
  public sendTouchpadDelta(deltaX: number, deltaY: number) {
    if (this.activeConn?.open) {
      this.activeConn.send({
        type: 'INPUT_TOUCHPAD',
        deltaX,
        deltaY,
      });
    }
  }

  /**
   * Broadcast keyboard events across P2P DataChannel
   */
  public sendKey(
    key: string,
    code: string,
    modifiers: { ctrl: boolean; alt: boolean; shift: boolean; meta: boolean },
    translatedKey?: string
  ) {
    if (this.activeConn?.open) {
      this.activeConn.send({
        type: 'INPUT_KEY',
        key,
        code,
        modifiers,
        translatedKey,
      });
    }
  }

  /**
   * Broadcast screen focus toggle
   */
  public sendFocusSwitch(activeScreen: 'host' | 'client') {
    if (this.activeConn?.open) {
      this.activeConn.send({
        type: 'INPUT_FOCUS',
        activeScreen,
      });
    }
  }

  /**
   * Broadcast clipboard text across P2P
   */
  public sendClipboard(clipboardText: string) {
    if (this.activeConn?.open) {
      this.activeConn.send({
        type: 'INPUT_CLIPBOARD',
        clipboardText,
      });
    }
  }

  /**
   * Disconnect current session and cleanup P2P channel
   */
  public disconnect() {
    if (this.activeConn) {
      try {
        if (this.activeConn.open) {
          this.activeConn.send({ type: 'DISCONNECT' });
        }
        this.activeConn.close();
      } catch {
        // ignore
      }
      this.activeConn = null;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // ignore
      }
      this.peer = null;
    }

    this.currentPin = null;
    this.currentRole = null;
    this.activeSession = null;

    this.sessionEndedListeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error(e);
      }
    });
  }
}

export const webP2P = new WebP2PService();
