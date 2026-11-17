import React, { useState, useEffect } from 'react';
import { useAirDesk } from '../hooks/useAirDesk';
import { api } from '../services/tauriBridge';
import { Header } from '../components/Header';
import { HostSection } from '../components/HostSection';
import { JoinSection } from '../components/JoinSection';
import { ScreenArrangement } from '../components/ScreenArrangement';
import { FeaturesBar } from '../components/FeaturesBar';
import { HardwareTelemetry } from '../components/HardwareTelemetry';
import { MacPermissionsModal } from '../components/MacPermissionsModal';
import { KeyboardShortcutsSettings } from '../components/KeyboardShortcutsSettings';
import { OsIcon } from '../components/OsIcon';
import {
  Power,
  MousePointer2,
  Clock,
  Monitor,
  Command,
  Shuffle,
  Shield,
  FileText,
  CheckCircle2,
  AlertCircle,
  Info,
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
    monitors,
    keyboards,
    hidKeyboards,
    hardwareMetrics,
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
    updateMonitorBrightness,
    updateMonitorContrast,
    refreshHardware,
    isTauri,
  } = useAirDesk();

  const [activeTab, setActiveTab] = useState<'canvas' | 'pairing' | 'hardware' | 'shortcuts'>('canvas');
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
    <div className="min-h-screen flex flex-col bg-[#08090a] text-zinc-100 relative">
      {/* Ambient background glow */}
      <div className="ambient-background" />

      {/* Top Header */}
      <Header
        systemInfo={systemInfo}
        status={status}
        onToggleActiveScreen={toggleActiveScreen}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'shortcuts') {
            setShowShortcutsModal(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onDisconnect={disconnect}
      />

      {/* Toast Notification */}
      {notification && (
        <div
          className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-medium shadow-2xl glass-panel max-w-sm w-full transition-all"
          style={{
            borderColor:
              notification.type === 'success'
                ? 'rgba(16,185,129,0.3)'
                : notification.type === 'error'
                ? 'rgba(239,68,68,0.3)'
                : 'rgba(255,255,255,0.15)',
          }}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
          ) : notification.type === 'error' ? (
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
          ) : (
            <Info className="h-4 w-4 flex-shrink-0 text-zinc-300" />
          )}
          <span className="flex-1 text-zinc-200">{notification.text}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-4 relative z-10">
        {/* Active Session Ribbon (when connected) */}
        {isConnected && (
          <div className="glass-panel p-4 border-emerald-500/20 bg-emerald-500/[0.03]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  <OsIcon os={status.peer_os} className="h-5 w-5" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white tracking-tight">
                      {status.peer_device || 'Connected Remote Machine'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-medium">
                      {status.role === 'host' ? 'Master Host' : 'Client Joined'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs mt-0.5 text-zinc-400 font-mono">
                    <span>{status.peer_ip}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Monitor className="h-3 w-3" />
                      {status.peer_screen_width && status.peer_screen_height
                        ? `${status.peer_screen_width}×${status.peer_screen_height}`
                        : 'Remote Display'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatUptime(status.session?.connected_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Focus Toggle & Disconnect Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={toggleActiveScreen}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    status.active_screen === 'client'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-white/[0.1] bg-white/[0.04] text-zinc-300 hover:text-white'
                  }`}
                  title="Toggle mouse and keyboard focus to other machine"
                >
                  <MousePointer2 className="h-3.5 w-3.5" />
                  <span>
                    Focus:{' '}
                    <strong>
                      {status.active_screen === 'client' ? 'Remote Computer' : 'Local Computer'}
                    </strong>
                  </span>
                  <kbd className="kbd-key ml-1">Tab</kbd>
                </button>

                <button onClick={disconnect} className="btn-danger !py-1.5 text-xs">
                  <Power className="h-3.5 w-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top Feature Toggles Dock */}
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

        {/* Tab Content Rendering */}
        {activeTab === 'canvas' && (
          <div className="space-y-4">
            {/* Visual Virtual Monitor Canvas */}
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
          </div>
        )}

        {activeTab === 'pairing' && (
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
        )}

        {activeTab === 'hardware' && (
          <HardwareTelemetry
            monitors={monitors}
            keyboards={keyboards}
            hidKeyboards={hidKeyboards}
            hardwareMetrics={hardwareMetrics}
            onBrightnessChange={updateMonitorBrightness}
            onContrastChange={updateMonitorContrast}
            onRefresh={refreshHardware}
          />
        )}

        {/* Universal Cross-Platform Keyboard Mapping Status Banner */}
        {keyboardMapping && (
          <div className="glass-panel p-4 border-white/[0.08]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white/[0.05] text-zinc-200 border border-white/[0.08] flex-shrink-0 mt-0.5">
                  <Shuffle className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-zinc-100">
                      Universal Keyboard Mapping Active
                    </p>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono border border-white/[0.1] text-zinc-400">
                      Cross-Platform KVM
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                    {status.peer_os?.toLowerCase().includes('mac')
                      ? 'Windows Ctrl maps to Mac ⌘ Command, Alt to ⌥ Option, Win to ⌃ Control. App switch, Undo/Redo & task navigation translate dynamically.'
                      : 'Mac ⌘ Command maps to Windows Ctrl, ⌥ Option to Alt, ⌃ Control to Win key. Media and function keys pass through natively.'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-mono">
                    <span className="kbd-key">Ctrl+C ↔ ⌘C</span>
                    <span className="kbd-key">Ctrl+V ↔ ⌘V</span>
                    <span className="kbd-key">Alt+Tab ↔ ⌘Tab</span>
                    <span className="kbd-key">Ctrl+Shift+Esc ↔ ⌘OptEsc</span>
                    <span className="kbd-key">Win+D ↔ F11</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowShortcutsModal(true)}
                className="btn-ghost !py-1.5 text-xs whitespace-nowrap self-end sm:self-auto"
              >
                <span>View All 60+ Shortcuts</span>
              </button>
            </div>
          </div>
        )}

        {/* Bottom Minimal Footer Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 pb-8 border-t border-white/[0.06] text-xs text-zinc-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              Port: 42426 (Direct LAN P2P)
            </span>
            <span>•</span>
            <span className="text-[11px]">
              {isTauri ? 'Native Hardware Drivers' : 'Web Preview Engine'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {onOpenPrivacy && (
              <button
                onClick={onOpenPrivacy}
                className="hover:text-zinc-300 transition-colors flex items-center gap-1 text-[11px]"
              >
                <Shield className="h-3 w-3" />
                Privacy
              </button>
            )}

            {onOpenTerms && (
              <button
                onClick={onOpenTerms}
                className="hover:text-zinc-300 transition-colors flex items-center gap-1 text-[11px]"
              >
                <FileText className="h-3 w-3" />
                Terms
              </button>
            )}

            <button
              onClick={() => setShowShortcutsModal(true)}
              className="hover:text-zinc-300 transition-colors flex items-center gap-1 text-[11px]"
            >
              <Command className="h-3 w-3" />
              <span>Shortcuts</span>
            </button>

            <button
              onClick={() => setShowMacModal(true)}
              className="hover:text-zinc-300 transition-colors flex items-center gap-1 text-[11px]"
            >
              <OsIcon os="macos" className="h-3 w-3 text-zinc-400" />
              <span>macOS Permissions</span>
            </button>
          </div>
        </div>
      </main>

      {/* macOS Accessibility Permissions Modal */}
      <MacPermissionsModal
        isOpen={showMacModal}
        onClose={() => setShowMacModal(false)}
      />

      {/* Universal Keyboard Shortcuts Palette */}
      <KeyboardShortcutsSettings
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        systemInfo={systemInfo}
        session={status.session}
      />
    </div>
  );
};
