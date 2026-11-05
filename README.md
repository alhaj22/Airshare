# 🚀 AirDesk — Universal Mouse & Keyboard Sharing

> **One Mouse + One Keyboard to Control Windows and MacBook Together.**  
> Seamless, low-latency, zero-cloud input & clipboard sharing over local Wi-Fi with **Secure 6-Digit Key Pairing**.

---

## 🌟 Overview & Workflow

**AirDesk** is a lightweight, cross-platform desktop application designed specifically to bridge a **Windows Laptop** and an **Apple Silicon MacBook (M1/M2/M3)** using a single physical mouse and keyboard.

```
       [ Windows Laptop (Host) ]                  [ MacBook Air M1 (Client) ]
       ┌───────────────────────┐                  ┌─────────────────────────┐
       │                       │  Edge Boundary   │                         │
       │   [ 1920 × 1080 ]     │ ───────────────> │    [ 2560 × 1600 ]      │
       │                       │   (Cursor Cross) │                         │
       └───────────────────────┘                  └─────────────────────────┘
                   │                                           │
                   └─────────── Local Wi-Fi (LAN) ─────────────┘
                             (Port 42426 TCP / 42425 UDP)
                               6-Digit PIN Handshake
```

---

## 🔑 6-Digit Connection Key Pairing (Secure Device Pairing)

1. **Host Laptop (Windows or Mac)**:
   - Click **Create Connection**.
   - AirDesk generates a random, cryptographically secure **6-Digit Key** (e.g., `582941`).
   - The key is valid for **5 minutes** (countdown displayed with animated progress bar).
   - Starts local TCP server on port `42426` and broadcasts UDP discovery beacons on port `42425`.

2. **Second Laptop (MacBook Air or Windows)**:
   - Selects **Join Connection**.
   - Either clicks on the auto-detected Host from the Wi-Fi list or enters the Host IP.
   - Types the **6-Digit Key** into the 6-digit input boxes.
   - Clicks **Connect to Host**.

3. **Handshake & Verification**:
   - The client connects via TCP and sends `PairRequest { pin: "582941", device_info }`.
   - Host validates the PIN against the active session and expiration timer.
   - If valid, host responds with `PairResponse { success: true, session_token }`.
   - Active PIN is automatically retired to prevent replay attacks.
   - Disconnecting immediately tears down the session.

---

## 🎯 Features

| Feature | Description |
| :--- | :--- |
| **Automatic Device Discovery** | Discovers nearby AirDesk laptops on the same Wi-Fi using UDP broadcast (`0.0.0.0:42425`). |
| **Secure 6-Digit Pairing** | Temporary 5-minute PIN for easy 1-click pairing with zero passwords or cloud accounts. |
| **Mouse Edge Crossing** | Move cursor to screen edge (e.g. Right edge of Windows) to seamlessly jump to MacBook. |
| **Keyboard Forwarding** | All keystrokes and modifier shortcuts (Ctrl, Alt, Shift, Cmd/Win) flow to whichever screen is active. |
| **Clipboard Sync** | Copy text on Windows (`Ctrl + C`) and paste immediately on MacBook (`Cmd + V`), and vice versa. |
| **Screen Arrangement** | Configurable layouts: `[Windows Left \| Mac Right]` or `[Mac Left \| Windows Right]`. |
| **Emergency Recall** | Press `Ctrl + Alt + Shift + Escape` anytime to instantly pull cursor back to Host. |
| **100% Local & Private** | Zero internet or cloud servers required. Works completely offline on your home/office Wi-Fi. |

---

## 📁 Project Structure

```
AirDesk/
│
├── src/                         # React 19 + TypeScript + Tailwind Frontend
│   ├── components/
│   │   ├── Header.tsx           # Status bar, IP display, active screen badge
│   │   ├── HostSection.tsx      # Create connection, 6-digit PIN display, countdown
│   │   ├── JoinSection.tsx      # Auto-discovered Wi-Fi devices, 6-digit PIN boxes
│   │   ├── ScreenArrangement.tsx# Interactive 2-monitor canvas & boundary line
│   │   ├── FeaturesBar.tsx      # Mouse, Keyboard & Clipboard toggles
│   │   └── MacPermissionsModal.tsx # macOS Accessibility permissions guide
│   ├── hooks/
│   │   └── useAirDesk.ts        # Custom React hook for state & timers
│   ├── services/
│   │   └── tauriBridge.ts       # Bridge for native Tauri commands + dev simulation
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces
│   ├── App.tsx                  # App root
│   ├── main.tsx                 # React entry point
│   └── index.css                # Tailwind CSS v4 styling
│
├── src-tauri/                   # Rust Native Desktop Engine
│   ├── src/
│   │   ├── security/            # 6-Digit PIN generation, expiration & auth
│   │   ├── network/             # TCP server, client & length-framed protocol
│   │   ├── discovery/           # UDP LAN beacon announcer & receiver
│   │   ├── mouse/               # Edge-detection monitor & SendInput/CoreGraphics
│   │   ├── keyboard/            # Low-level hook & SendInput/CoreGraphics simulator
│   │   ├── clipboard/           # arboard cross-platform clipboard synchronizer
│   │   └── main.rs              # Tauri command handlers & application state
│   ├── Cargo.toml               # Rust dependencies
│   ├── tauri.conf.json          # Tauri v2 window & build configuration
│   └── build.rs                 # Tauri build script
│
├── package.json                 # Node dependencies & scripts
├── vite.config.ts               # Vite + Tailwind + React configuration
└── README.md                    # Documentation & setup guide
```

---

## 🛠️ Prerequisites & Setup

### 1. Prerequisites
- **Node.js**: v18+ (Node 24 recommended)
- **Rust toolchain** (for compiling native desktop binaries):
  - Windows: [rustup.rs](https://rustup.rs/) with Visual Studio C++ Build Tools (`Desktop development with C++`).
  - macOS: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

---

## 🚀 Running the Application

### Option A: Quick Development Preview (Instant UI & Network Simulation)
Run the Vite development server to test the UI, pairing flow, 6-digit key generator, device discovery, and screen edge animations right in your browser or webview:

```bash
cd AirDesk
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

---

### Option B: Running as Native Desktop App (Tauri)

#### On Windows:
```powershell
cd AirDesk
npm install
npm run tauri dev
```

#### On MacBook Air (M1/M2/M3):
```bash
cd AirDesk
npm install
npm run tauri dev
```

---

## 🍏 MacBook Accessibility Permissions Setup

On macOS, simulating cursor movements and keyboard clicks requires granting Accessibility permissions to the app:

1. Open **System Settings** on your MacBook.
2. Go to **Privacy & Security → Accessibility**.
3. Enable the toggle for **AirDesk**.
4. Go to **Privacy & Security → Input Monitoring** and ensure **AirDesk** is enabled.

> **Tip**: If you re-install or recompile the app on macOS, you can reset permissions in Terminal:
> ```bash
> tccutil reset Accessibility com.airdesk.app
> ```

---

## 📦 Building Installers

### Windows (`.exe` / `.msi`):
```powershell
npm run tauri build
```
The installer will be generated at `src-tauri/target/release/bundle/msi/AirDesk_1.0.0_x64_en-US.msi`.

### macOS (`.dmg` for Apple Silicon):
```bash
npm run tauri build
```
The universal Apple Silicon DMG will be generated at `src-tauri/target/release/bundle/dmg/AirDesk_1.0.0_aarch64.dmg`.

---

## 🔒 Security Guarantee
- **Local Wi-Fi Only**: All mouse coordinates, keystrokes, and clipboard text remain strictly on your local subnet.
- **PIN Expiry**: Each 6-digit key expires in 5 minutes and cannot be reused after pairing.
- **No Telemetry**: No third-party servers, tracking, or cloud infrastructure.
