import React, { useState, useEffect } from 'react';
import { useAirDesk } from '../hooks/useAirDesk';
import { api } from '../services/tauriBridge';
import { Header } from '../components/Header';
import { HostSection } from '../components/HostSection';
import { JoinSection } from '../components/JoinSection';
import { ScreenArrangement } from '../components/ScreenArrangement';
import { FeaturesBar } from '../components/FeaturesBar';
import { MacPermissionsModal } from '../components/MacPermissionsModal';
import {
  Link2,
  Power,
  MousePointer2,
  Apple,
  Activity,
  Clock,
  Monitor,
  Cpu,
} from 'lucide-react';

function getOsIcon(os?: string) {
  const o = (os || '').toLowerCase();
  if (o.includes('mac')) return '🍎';
  if (o.includes('win')) return '🪟';
  if (o.includes('linux')) return '🐧';
  return '💻';
}

function formatUptime(connectedAt?: number): string {
  if (!connectedAt) return '—';
  const diff = Math.floor(Date.now() / 1000 - connectedAt);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export const Dashboard: React.FC = () => {
  const {
    systemInfo,
    status,
    discoveredDevices,
    screenArrangement,
    mouseSharing,
    setMouseSharing,
    keyboardSharing,
    setKeyboardSharing,
    clipboardSharing,
    setClipboardSharing,
    keyboardMapping,
    setKeyboardMapping,
    notification,
    startHost,
    joinHost,
    disconnect,
    updateArrangement,
    toggleActiveScreen,
    simulatePeerConnection,
  } = useAirDesk();

  const [showMacModal, setShowMacModal] = useState(false);
  const isConnected = status.mode === 'connected';

  // Automatically check if running on macOS and accessibility permission is granted
  useEffect(() => {
    const checkMacAccess = async () => {
      const os = await api.getHostOs();
      if (os === 'macos') {
        const isTrusted = await api.checkAccessibility();
        if (!isTrusted) {
          setShowMacModal(true);
        }
      }
    };
    checkMacAccess();
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-bg-primary)' }}
    >
      {/* Top Header */}
      <Header
        systemInfo={systemInfo}
        status={status}
        onToggleActiveScreen={toggleActiveScreen}
      />

      {/* Toast Notification */}
      {notification && (
        <div
          className="fixed top-14 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold shadow-2xl slide-down max-w-sm w-full"
          style={{
            background:
              notification.type === 'success'
                ? 'rgba(16,185,129,0.12)'
                : notification.type === 'error'
                ? 'rgba(239,68,68,0.12)'
                : 'rgba(14,165,233,0.12)',
            border: `1px solid ${
              notification.type === 'success'
                ? 'rgba(16,185,129,0.3)'
                : notification.type === 'error'
                ? 'rgba(239,68,68,0.3)'
                : 'rgba(14,165,233,0.3)'
            }`,
            color:
              notification.type === 'success'
                ? '#6ee7b7'
                : notification.type === 'error'
                ? '#fca5a5'
                : '#7dd3fc',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span className="text-base">
            {notification.type === 'success' ? '✓' : notification.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <span className="flex-1">{notification.text}</span>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 space-y-4">

        {/* ─── Active Session Banner (when connected) ─── */}
        {isConnected && (
          <div
            className="rounded-xl p-4 fade-in"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(14,165,233,0.04) 100%)',
              border: '1px solid rgba(16,185,129,0.2)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Left — session info */}
              <div className="flex items-center gap-4">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                  <Link2 className="h-5 w-5" style={{ color: '#10b981' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        background: '#10b981',
                        boxShadow: '0 0 6px #10b981',
                        animation: 'dot-pulse-anim 2s infinite',
                      }}
                    />
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#10b981' }}>
                      Session Active
                    </span>
                    {status.session?.session_id && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-mono"
                        style={{ background: 'rgba(0,0,0,0.4)', color: '#475569' }}
                      >
                        {status.session.session_id.slice(0, 12)}…
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold flex items-center gap-2 flex-wrap" style={{ color: '#f1f5f9' }}>
                    <span>{getOsIcon(systemInfo?.os)} {systemInfo?.device_name || 'This Computer'}</span>
                    <span style={{ color: '#38bdf8' }}>⟷</span>
                    <span>{getOsIcon(status.peer_os)} {status.peer_device || 'Remote Device'}</span>
                  </h2>
                </div>
              </div>

              {/* Right — stats + actions */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Stats */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: '#64748b' }}>
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatUptime(status.session?.connected_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: '#64748b' }}>
                    <Monitor className="h-3.5 w-3.5" />
                    <span>
                      {status.peer_screen_width}×{status.peer_screen_height}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: '#64748b' }}>
                    <Cpu className="h-3.5 w-3.5" />
                    <span>
                      {status.peer_ip}
                    </span>
                  </div>
                </div>

                {/* Switch screen btn */}
                <button
                  onClick={toggleActiveScreen}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all cursor-pointer"
                  style={{
                    background: status.active_screen === 'client'
                      ? 'rgba(16,185,129,0.12)'
                      : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${status.active_screen === 'client' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    color: status.active_screen === 'client' ? '#6ee7b7' : '#94a3b8',
                  }}
                >
                  <MousePointer2 className="h-3.5 w-3.5" />
                  <span>
                    {status.active_screen === 'client'
                      ? `Controlling: ${status.peer_device || 'Remote'}`
                      : 'Control: This Computer'}
                  </span>
                </button>

                {/* Activity indicator */}
                <div className="flex items-center gap-1.5 text-xs" style={{ color: '#10b981' }}>
                  <Activity className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Input Sharing Active</span>
                </div>

                {/* Disconnect */}
                <button onClick={disconnect} className="btn-danger">
                  <Power className="h-3.5 w-3.5" />
                  <span>End Session</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Feature Toggles ─── */}
        <FeaturesBar
          mouseSharing={mouseSharing}
          setMouseSharing={setMouseSharing}
          keyboardSharing={keyboardSharing}
          setKeyboardSharing={setKeyboardSharing}
          clipboardSharing={clipboardSharing}
          setClipboardSharing={setClipboardSharing}
          keyboardMapping={keyboardMapping}
          setKeyboardMapping={setKeyboardMapping}
        />

        {/* ─── Connect Grid (shown when not connected) ─── */}
        {!isConnected && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <HostSection
              status={status}
              onStartHost={startHost}
              onDisconnect={disconnect}
            />
            <JoinSection
              status={status}
              discoveredDevices={discoveredDevices}
              onJoin={joinHost}
              onSimulateConnect={simulatePeerConnection}
            />
          </div>
        )}

        {/* ─── Screen Arrangement ─── */}
        <ScreenArrangement
          status={status}
          systemInfo={systemInfo}
          arrangement={screenArrangement}
          onArrangementChange={updateArrangement}
          onSimulateEdgeCross={toggleActiveScreen}
          onDeviceDrop={(dev) => joinHost(dev.ip, 'auto_connect')}
        />

        {/* ─── OS Keyboard Mapping Info (when connected cross-platform) ─── */}
        {isConnected && keyboardMapping && status.peer_os && status.peer_os !== (systemInfo?.os?.toLowerCase()) && (
          <div
            className="rounded-xl p-4 fade-in"
            style={{
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.15)',
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">🔀</span>
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: '#fcd34d' }}>
                  Cross-Platform Keyboard Mapping Active
                </p>
                <p className="text-xs leading-relaxed" style={{ color: '#78716c' }}>
                  {status.peer_os?.toLowerCase().includes('mac')
                    ? 'Your Windows Ctrl key is mapped to Mac Command (⌘). Alt → Option. Win key → Control. Shortcuts like Ctrl+C become Cmd+C automatically.'
                    : 'Mac Command (⌘) is mapped to Windows Ctrl. Option → Alt. Control → Win key. Shortcuts like Cmd+C become Ctrl+C automatically.'}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs font-mono">
                  {status.peer_os?.toLowerCase().includes('mac') ? (
                    <>
                      <span style={{ color: '#94a3b8' }}>Ctrl+C → ⌘C</span>
                      <span style={{ color: '#94a3b8' }}>Ctrl+V → ⌘V</span>
                      <span style={{ color: '#94a3b8' }}>Alt+Tab → ⌘Tab</span>
                      <span style={{ color: '#94a3b8' }}>Win → ⌃ Ctrl</span>
                    </>
                  ) : (
                    <>
                      <span style={{ color: '#94a3b8' }}>⌘C → Ctrl+C</span>
                      <span style={{ color: '#94a3b8' }}>⌘V → Ctrl+V</span>
                      <span style={{ color: '#94a3b8' }}>⌘Tab → Alt+Tab</span>
                      <span style={{ color: '#94a3b8' }}>⌃ → Win</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Bottom Footer Bar ─── */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 pt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-4 text-xs" style={{ color: '#334155' }}>
            <span>🔒 Local LAN only • No cloud servers</span>
            <span>Port 42426</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMacModal(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: '#475569',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = '#94a3b8';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.14)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = '#475569';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
              }}
            >
              <Apple className="h-3.5 w-3.5" style={{ color: '#a78bfa' }} />
              <span>macOS Permissions</span>
            </button>
          </div>
        </div>
      </main>

      {/* Mac Permissions Modal */}
      <MacPermissionsModal isOpen={showMacModal} onClose={() => setShowMacModal(false)} />
    </div>
  );
};
