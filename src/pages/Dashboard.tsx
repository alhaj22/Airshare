import React, { useState, useEffect } from 'react';
import { useAirDesk } from '../hooks/useAirDesk';
import { api } from '../services/tauriBridge';
import { Header } from '../components/Header';
import { HostSection } from '../components/HostSection';
import { JoinSection } from '../components/JoinSection';
import { ScreenArrangement } from '../components/ScreenArrangement';
import { FeaturesBar } from '../components/FeaturesBar';
import { MacPermissionsModal } from '../components/MacPermissionsModal';
import { KeyboardShortcutsSettings } from '../components/KeyboardShortcutsSettings';
import { OsIcon } from '../components/OsIcon';
import {
  Power,
  MousePointer2,
  Clock,
  Monitor,
  Command,
  Settings2,
  CheckCircle2,
  AlertCircle,
  Info,
  Shuffle,
  Lock,
  Shield,
  FileText,
} from 'lucide-react';

interface DashboardProps {
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

function formatUptime(connectedAt?: number): string {
  if (!connectedAt) return '0s';
  const diff = Math.floor(Date.now() / 1000 - connectedAt);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenPrivacy,
  onOpenTerms,
}) => {
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
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
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
        onOpenShortcuts={() => setShowShortcutsModal(true)}
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
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
          ) : notification.type === 'error' ? (
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
          ) : (
            <Info className="h-4 w-4 flex-shrink-0 text-sky-400" />
          )}
          <span className="flex-1">{notification.text}</span>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 space-y-4">

        {/* Active Session Banner (when connected) */}
        {isConnected && (
          <div
            className="rounded-xl p-4 fade-in"
            style={{
              background: '#0f1722',
              border: '1px solid rgba(16,185,129,0.25)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Left: session info */}
              <div className="flex items-center gap-4">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0 text-slate-200"
                  style={{
                    background: 'rgba(16,185,129,0.12)',
                    border: '1px solid rgba(16,185,129,0.25)',
                  }}
                >
                  <OsIcon os={status.peer_os} className="h-5 w-5" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {status.peer_device || 'Connected Peer'}
                    </span>
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold"
                      style={{
                        background: 'rgba(16,185,129,0.15)',
                        color: '#6ee7b7',
                        border: '1px solid rgba(16,185,129,0.3)',
                      }}
                    >
                      {status.role === 'host' ? 'Host (Master)' : 'Client (Joined)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs mt-1 text-slate-400">
                    <span className="font-mono">{status.peer_ip}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Monitor className="h-3 w-3" />
                      {status.peer_screen_width && status.peer_screen_height
                        ? `${status.peer_screen_width}×${status.peer_screen_height}`
                        : 'Remote Screen'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatUptime(status.session?.connected_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Active Screen indicator and Disconnect */}
              <div className="flex items-center gap-3">
                {/* Active screen button */}
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
                  title="Click to toggle mouse and keyboard control to other screen"
                >
                  <MousePointer2 className="h-3.5 w-3.5" />
                  <span>
                    Control:{' '}
                    <strong className={status.active_screen === 'client' ? 'text-emerald-400' : 'text-sky-400'}>
                      {status.active_screen === 'client' ? 'Remote Computer' : 'Local Computer'}
                    </strong>
                  </span>
                  <span
                    className="text-[10px] font-mono px-1 rounded"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                  >
                    Tab / Edge
                  </span>
                </button>

                {/* Disconnect button */}
                <button
                  onClick={disconnect}
                  className="btn-danger"
                  title="End current connection"
                >
                  <Power className="h-3.5 w-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feature Toggles Toolbar */}
        <FeaturesBar
          mouseSharing={mouseSharing}
          setMouseSharing={setMouseSharing}
          keyboardSharing={keyboardSharing}
          setKeyboardSharing={setKeyboardSharing}
          clipboardSharing={clipboardSharing}
          setClipboardSharing={setClipboardSharing}
          keyboardMapping={keyboardMapping}
          setKeyboardMapping={setKeyboardMapping}
          onOpenShortcuts={() => setShowShortcutsModal(true)}
        />

        {/* Visual Monitor Canvas (Interactive Drag-and-Drop) */}
        <ScreenArrangement
          status={status}
          systemInfo={systemInfo}
          arrangement={screenArrangement}
          onArrangementChange={updateArrangement}
          onSimulateEdgeCross={toggleActiveScreen}
          onDeviceDrop={simulatePeerConnection}
        />

        {/* Host & Join Control Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Universal Cross-Platform Keyboard Mapping Status */}
        {keyboardMapping && (
          <div
            className="rounded-xl p-4 transition-all"
            style={{
              background: 'rgba(245,158,11,0.04)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0 mt-0.5">
                  <Shuffle className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-amber-300">
                      Universal Keyboard Mapping Active
                    </p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      Cross-Platform KVM
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed mt-0.5 text-slate-400">
                    {status.peer_os?.toLowerCase().includes('mac')
                      ? 'Windows Ctrl translates to Mac Command (⌘), Alt to Option (⌥), Win to Control (⌃). Application Switcher, Redo, and Task navigation map automatically.'
                      : 'Mac Command (⌘) translates to Windows Ctrl, Option (⌥) to Alt, Control (⌃) to Win key. Shortcuts map dynamically to Windows conventions.'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-black/40 border border-white/5 text-amber-200">Ctrl+C ↔ ⌘C</span>
                    <span className="px-1.5 py-0.5 rounded bg-black/40 border border-white/5 text-amber-200">Ctrl+V ↔ ⌘V</span>
                    <span className="px-1.5 py-0.5 rounded bg-black/40 border border-white/5 text-amber-200">Alt+Tab ↔ ⌘Tab</span>
                    <span className="px-1.5 py-0.5 rounded bg-black/40 border border-white/5 text-amber-200">Ctrl+Shift+Esc ↔ ⌘OptEsc</span>
                    <span className="px-1.5 py-0.5 rounded bg-black/40 border border-white/5 text-amber-200">Win+D ↔ F11 Desktop</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowShortcutsModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer select-none self-end sm:self-auto"
                style={{
                  background: 'rgba(245,158,11,0.15)',
                  color: '#fbbf24',
                  border: '1px solid rgba(245,158,11,0.3)',
                }}
              >
                <Settings2 className="h-3.5 w-3.5" />
                <span>Configure & View All (60+)</span>
              </button>
            </div>
          </div>
        )}

        {/* Bottom Footer Bar */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 pt-3 pb-6"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-sky-400" />
              Direct Local Network (Port 42426)
            </span>
            <span>•</span>
            <span>No External Relay</span>
          </div>

          <div className="flex items-center gap-3">
            {onOpenPrivacy && (
              <button
                onClick={onOpenPrivacy}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <Shield className="h-3 w-3" />
                Privacy Policy
              </button>
            )}

            {onOpenTerms && (
              <button
                onClick={onOpenTerms}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <FileText className="h-3 w-3" />
                Terms & Conditions
              </button>
            )}

            <button
              onClick={() => setShowShortcutsModal(true)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs border border-white/10 text-slate-300 hover:border-amber-400/40 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <Command className="h-3 w-3 text-amber-400" />
              <span>Shortcuts (60+)</span>
            </button>

            <button
              onClick={() => setShowMacModal(true)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs border border-white/10 text-slate-300 hover:border-sky-400/40 hover:text-sky-300 transition-colors cursor-pointer"
            >
              <OsIcon os="macos" className="h-3 w-3 text-slate-400" />
              <span>macOS Permissions</span>
            </button>
          </div>
        </div>
      </main>

      {/* Mac Permissions Modal */}
      <MacPermissionsModal isOpen={showMacModal} onClose={() => setShowMacModal(false)} />

      {/* Universal Keyboard Shortcuts Settings Modal */}
      <KeyboardShortcutsSettings
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        systemInfo={systemInfo}
        session={status.session}
      />
    </div>
  );
};
