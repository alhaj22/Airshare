import type { ActiveSession, DeviceOS } from '../types';

// Standalone WebRTC PeerJS interfaces so Vite & TypeScript never fail if peerjs is missing
export interface Peer {
  id?: string;
  destroyed?: boolean;
  on(event: 'open', cb: (id: string) => void): void;
  on(event: 'disconnected', cb: () => void): void;
  on(event: 'error', cb: (err: any) => void): void;
  on(event: 'connection', cb: (conn: DataConnection) => void): void;
  on(event: string, cb: (...args: any[]) => void): void;
  connect(id: string, options?: { reliable?: boolean }): DataConnection;
  destroy(): void;
  reconnect(): void;
}

export interface DataConnection {
  peer: string;
  open: boolean;
  on(event: 'open', cb: () => void): void;
  on(event: 'data', cb: (data: unknown) => void): void;
  on(event: 'close', cb: () => void): void;
  on(event: 'error', cb: (err: any) => void): void;
  on(event: string, cb: (...args: any[]) => void): void;
  send(data: any): void;
  close(): void;
}

let cachedPeerConstructor: any = null;

async function getPeerConstructor(): Promise<any> {
  if (cachedPeerConstructor) return cachedPeerConstructor;

  // 1. Check if Peer is already in window scope (e.g. injected or CDN script tag)
  if (typeof window !== 'undefined' && (window as any).Peer) {
    cachedPeerConstructor = (window as any).Peer;
    return cachedPeerConstructor;
  }

  // 2. Try importing local peerjs package with @vite-ignore to prevent Vite build/dev analysis crash
  try {
    // @ts-ignore
    const mod = await import(/* @vite-ignore */ 'peerjs');
    cachedPeerConstructor = mod.Peer || mod.default || mod;
    return cachedPeerConstructor;
  } catch {
    // 3. Fallback to esm.sh CDN so browser/web mode works out-of-the-box without manual npm install
    try {
      // @ts-ignore
      const cdn = await import(/* @vite-ignore */ 'https://esm.sh/peerjs@1.5.5?bundle');
      cachedPeerConstructor = cdn.Peer || cdn.default || cdn;
      return cachedPeerConstructor;
    } catch (err) {
      console.warn('[WebP2P] PeerJS is unavailable. Run `npm install peerjs` or verify network connection.', err);
      return null;
    }
  }
}

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
   * Internal reset of peer & data connections WITHOUT notifying session ended listeners
   */
  private cleanupPeer() {
    if (this.activeConn) {
      try {
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
  }

  /**
   * Host starts waiting for incoming peer connections using the 6-digit PIN as the Peer ID
   */
  public async startHosting(pin: string): Promise<string> {
    this.cleanupPeer();
    this.currentPin = pin;
    this.currentRole = 'host';

    const Peer = await getPeerConstructor();
    if (!Peer) {
      console.warn('[WebP2P] Peer constructor unavailable. Operating in standalone network mode.');
      return pin;
    }

    return new Promise((resolve) => {
      try {
        const peerId = `airdesk-v1-${pin}`;
        const hostPeer = new Peer(peerId, {
          debug: 1,
          config: {
            iceServers: ICE_SERVERS,
          },
        });
        this.peer = hostPeer;

        const openTimeout = setTimeout(() => {
          resolve(pin);
        }, 5000);

        hostPeer.on('open', (id: string) => {
          clearTimeout(openTimeout);
          console.log('[WebP2P] Host listening on peer ID:', id);
          resolve(pin);
        });

        hostPeer.on('disconnected', () => {
          console.log('[WebP2P] Host peer disconnected from signaling, reconnecting...');
          if (this.peer && !this.peer.destroyed) {
            try {
              this.peer.reconnect();
            } catch (err) {
              console.warn('[WebP2P] Reconnect error:', err);
            }
          }
        });

        hostPeer.on('error', (err: any) => {
          console.warn('[WebP2P] Host peer error:', err);
          resolve(pin);
        });

        hostPeer.on('connection', (conn: DataConnection) => {
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

    conn.on('data', (raw: unknown) => {
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
      console.log('[WebP2P] Client connection closed');
      if (this.activeSession) {
        this.disconnect();
      } else {
        this.activeConn = null;
      }
    });

    conn.on('error', (err: any) => {
      console.warn('[WebP2P] Connection error:', err);
      if (this.activeSession) {
        this.disconnect();
      } else {
        this.activeConn = null;
      }
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

    this.cleanupPeer();
    this.currentRole = 'client';

    const Peer = await getPeerConstructor();
    if (!Peer) {
      throw new Error('WebRTC P2P service is unavailable. Please run `npm install` or check your internet connection.');
    }

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

        clientPeer.on('open', (myId: string) => {
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

          conn.on('data', (raw: unknown) => {
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

          conn.on('error', (err: any) => {
            clearTimeout(timeoutTimer);
            this.disconnect();
            reject(err);
          });
        });

        clientPeer.on('error', (err: any) => {
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
   * Disconnect current active session and cleanup P2P channel
   */
  public disconnect() {
    const hadActiveSession = this.activeSession !== null;

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

    // Only notify listeners if an active connected session was genuinely running
    if (hadActiveSession) {
      this.sessionEndedListeners.forEach((cb) => {
        try {
          cb();
        } catch (e) {
          console.error(e);
        }
      });
    }
  }
}

export const webP2P = new WebP2PService();
