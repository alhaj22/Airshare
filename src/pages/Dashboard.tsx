import React, { useState, useEffect } from 'react';
import { useAirDesk } from '../hooks/useAirDesk';
import { api } from '../services/tauriBridge';
import { deskflowLogger } from '../services/deskflowLogger';
import { DeskflowHeader } from '../components/DeskflowHeader';
import { DeskflowScreenGrid } from '../components/DeskflowScreenGrid';
import { DeskflowConfigureServerModal } from '../components/DeskflowConfigureServerModal';
import { DeskflowPreferencesModal } from '../components/DeskflowPreferencesModal';
import { DeskflowLogConsole } from '../components/DeskflowLogConsole';
import { HardwareTelemetry } from '../components/HardwareTelemetry';
import { KeyboardShortcutsSettings } from '../components/KeyboardShortcutsSettings';
import { MacPermissionsModal } from '../components/MacPermissionsModal';
import type {
  DeskflowClientSettings,
  DeskflowMode,
  DeskflowScreen,
  DeskflowServerSettings,
  DeviceOS,
} from '../types';
import {
  Play,
  Square,
  Sliders,
  Terminal,
  RotateCw,
  Copy,
  Check,
  Shield,
  Monitor,
  Lock,
  Unlock,
  Server,
  Laptop,
} from 'lucide-react';

interface DashboardProps {
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
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
    startHost,
    joinHost,
    disconnect,
    updateMonitorBrightness,
    updateMonitorContrast,
    refreshHardware,
    isTauri,
  } = useAirDesk();

  // ─── Deskflow Core State ───
  const [deskflowMode, setDeskflowMode] = useState<DeskflowMode>('server');
  const [navTab, setNavTab] = useState<'main' | 'hardware' | 'shortcuts'>('main');

  // Network & System Info
  const [ipAddresses, setIpAddresses] = useState<string[]>(['127.0.0.1']);
  const [serverFingerprint, setServerFingerprint] = useState<string>('4A:8C:9B:1F:72:03:DD:91:EE:54:30:AC:67:12:F4:9E');
  const [copiedIp, setCopiedIp] = useState(false);
  const [isCursorLocked, setIsCursorLocked] = useState(false);

  // Modals & Panels
  const [showConfigureServerModal, setShowConfigureServerModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showLogConsole, setShowLogConsole] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showMacModal, setShowMacModal] = useState(false);

  // Deskflow Server Settings
  const [serverSettings, setServerSettings] = useState<DeskflowServerSettings>({
    port: 24800,
    interfaceBinding: '0.0.0.0',
    switchDelayMs: 0,
    doubleTapSwitchMs: 250,
    cornerSizePx: 15,
    deadCorners: {
      topLeft: false,
      topRight: false,
      bottomLeft: false,
      bottomRight: false,
    },
    clipboardSharing: true,
    maxClipboardSizeKb: 3072,
    syncScreensavers: true,
    checkClientAliveMs: 3000,
    enableTls: true,
    requireClientCert: false,
  });

  // Deskflow Client Settings
  const [clientSettings, setClientSettings] = useState<DeskflowClientSettings>({
    screenName: '',
    autoConfig: true,
    serverAddress: '',
    enableTls: true,
    trustedServerFingerprints: [],
  });

  // Deskflow Screens Matrix (Screens and links)
  const [screens, setScreens] = useState<DeskflowScreen[]>([]);

  const isConnected = status.mode === 'connected';
  const isHosting = status.mode === 'hosting';
  const isRunning = isHosting || isConnected;

  // Initialize Host Screen Name, IP list, and Fingerprint
  useEffect(() => {
    const initNetwork = async () => {
      const [ips, fp] = await Promise.all([
        api.getLocalIpList(),
        api.getServerFingerprint(),
      ]);
      setIpAddresses(ips);
      setServerFingerprint(fp);

      if (ips.length > 0 && !clientSettings.serverAddress) {
        setClientSettings((prev) => ({
          ...prev,
          serverAddress: `${ips[0]}:24800`,
        }));
      }
    };
    initNetwork();
  }, []);

  // Sync default screens when systemInfo arrives
  useEffect(() => {
    if (!systemInfo) return;
    const hostName = systemInfo.device_name || 'Deskflow-Server';
    const hostOs = (systemInfo.os.toLowerCase().includes('mac')
      ? 'macos'
      : systemInfo.os.toLowerCase().includes('win')
      ? 'windows'
      : 'linux') as DeviceOS;

    setClientSettings((prev) => ({
      ...prev,
      screenName: prev.screenName || hostName,
    }));

    setScreens((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          id: 'server_screen',
          name: hostName,
          isServer: true,
          row: 2,
          col: 2,
          os: hostOs,
          deadCorners: {
            topLeft: false,
            topRight: false,
            bottomLeft: false,
            bottomRight: false,
          },
          cornerSizePx: 15,
          switchDelayMs: 0,
        },
        {
          id: 'client_screen_demo',
          name: hostOs === 'macos' ? 'Windows-PC' : 'MacBook-Pro',
          isServer: false,
          row: 2,
          col: 3,
          os: hostOs === 'macos' ? 'windows' : 'macos',
          isConnected: isConnected,
          deadCorners: {
            topLeft: false,
            topRight: false,
            bottomLeft: false,
            bottomRight: false,
          },
          cornerSizePx: 15,
          switchDelayMs: 0,
        },
      ];
    });
  }, [systemInfo, isConnected]);

  // Check Mac Permissions
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

  // Copy IP handler
  const handleCopyIp = () => {
    navigator.clipboard.writeText(ipAddresses.join(', '));
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  // Start / Stop toggle
  const handleToggleStartStop = async () => {
    if (isRunning) {
      await disconnect();
      deskflowLogger.note('system', 'Deskflow engine stopped');
    } else {
      if (deskflowMode === 'server') {
        deskflowLogger.info('server', `Starting Deskflow server on port ${serverSettings.port}...`);
        await startHost();
        deskflowLogger.info('network', `Server listening on ${ipAddresses.join(', ')}:${serverSettings.port}`);
      } else {
        const addr = clientSettings.serverAddress || '127.0.0.1:24800';
        const parts = addr.split(':');
        const ip = parts[0] || '127.0.0.1';
        const port = parseInt(parts[1], 10) || 24800;
        deskflowLogger.info('client', `Connecting to Deskflow server at ${ip}:${port}...`);
        await joinHost(ip, '000000');
      }
    }
  };

  // Apply Configuration
  const handleApplyConfig = async () => {
    await api.setDeadCorners(
      serverSettings.deadCorners.topLeft,
      serverSettings.deadCorners.topRight,
      serverSettings.deadCorners.bottomLeft,
      serverSettings.deadCorners.bottomRight,
      serverSettings.cornerSizePx
    );
    await api.setSwitchDelayMs(serverSettings.switchDelayMs);
    deskflowLogger.info('server', 'Configuration applied and synchronized');
  };

  // Toggle Cursor Lock
  const handleToggleCursorLock = async () => {
    const next = !isCursorLocked;
    const res = await api.setCursorLocked(next);
    setIsCursorLocked(res);
    deskflowLogger.note('input', res ? 'Cursor locked to screen (ScrollLock active)' : 'Cursor unlocked');
  };

  const serverHostname = systemInfo?.device_name || 'Deskflow-Server';
  const serverOs = (systemInfo?.os.toLowerCase().includes('mac')
    ? 'macos'
    : 'windows') as DeviceOS;

  return (
    <div className="min-h-screen flex flex-col bg-[#07080a] text-zinc-100 relative font-sans select-none">
      {/* Ambient background glow */}
      <div className="ambient-background" />

      {/* Deskflow Classic Header / Menu Bar */}
      <DeskflowHeader
        mode={deskflowMode}
        isRunning={isRunning}
        onToggleStartStop={handleToggleStartStop}
        onApply={handleApplyConfig}
        onOpenConfigureServer={() => setShowConfigureServerModal(true)}
        onOpenPreferences={() => setShowPreferencesModal(true)}
        onToggleLog={() => setShowLogConsole(!showLogConsole)}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onOpenHardware={() => setNavTab('hardware')}
        isCursorLocked={isCursorLocked}
        onToggleCursorLock={handleToggleCursorLock}
        activeNavTab={navTab}
        onSelectNavTab={(tab) => {
          if (tab === 'shortcuts') {
            setShowShortcutsModal(true);
          } else {
            setNavTab(tab);
          }
        }}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 space-y-4 relative z-10">
        {navTab === 'hardware' ? (
          <HardwareTelemetry
            monitors={monitors}
            keyboards={keyboards}
            hidKeyboards={hidKeyboards}
            hardwareMetrics={hardwareMetrics}
            onBrightnessChange={updateMonitorBrightness}
            onContrastChange={updateMonitorContrast}
            onRefresh={refreshHardware}
          />
        ) : (
          <div className="space-y-4">
            {/* ─── Mode Selection: Server vs Client ─── */}
            <div className="glass-panel p-5 space-y-4 border border-white/[0.08]">
              {/* Radio Group Header */}
              <div className="space-y-3 pb-3 border-b border-white/[0.06]">
                <label
                  onClick={() => setDeskflowMode('server')}
                  className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-all ${
                    deskflowMode === 'server'
                      ? 'border-blue-500/40 bg-blue-500/[0.06]'
                      : 'border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.03]'
                  }`}
                >
                  <input
                    type="radio"
                    name="deskflow_mode"
                    checked={deskflowMode === 'server'}
                    onChange={() => setDeskflowMode('server')}
                    className="mt-0.5 text-blue-500 focus:ring-0 bg-zinc-900 border-zinc-700"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-blue-400" />
                      <span className="text-xs font-semibold text-zinc-100">
                        Server (share this computer's mouse and keyboard)
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Use this computer's physical mouse & keyboard to seamlessly control other adjacent computers.
                    </p>
                  </div>
                </label>

                <label
                  onClick={() => setDeskflowMode('client')}
                  className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-all ${
                    deskflowMode === 'client'
                      ? 'border-blue-500/40 bg-blue-500/[0.06]'
                      : 'border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.03]'
                  }`}
                >
                  <input
                    type="radio"
                    name="deskflow_mode"
                    checked={deskflowMode === 'client'}
                    onChange={() => setDeskflowMode('client')}
                    className="mt-0.5 text-blue-500 focus:ring-0 bg-zinc-900 border-zinc-700"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <Laptop className="h-4 w-4 text-purple-400" />
                      <span className="text-xs font-semibold text-zinc-100">
                        Client (use another computer's mouse and keyboard)
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Receive mouse and keyboard input remotely from a designated Deskflow server computer.
                    </p>
                  </div>
                </label>
              </div>

              {/* Mode Specific Body */}
              {deskflowMode === 'server' ? (
                /* ─── SERVER MODE PANEL ─── */
                <div className="space-y-4 pt-1">
                  {/* IP Addresses Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-black/40 border border-white/[0.06] text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">IP addresses:</span>
                      <span className="text-blue-300 font-semibold selection:bg-blue-500/30">
                        {ipAddresses.join(', ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">Port: {serverSettings.port}</span>
                      <button
                        onClick={handleCopyIp}
                        className="btn-ghost !py-1 !px-2 text-[11px] flex items-center gap-1 text-zinc-300 hover:text-white"
                        title="Copy IP addresses"
                      >
                        {copiedIp ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        <span>{copiedIp ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Server Screen Grid Preview & Configure Button */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-blue-400" />
                        <span className="text-xs font-semibold text-zinc-200">
                          Server Screen Grid (Screens and links)
                        </span>
                      </div>

                      <button
                        onClick={() => setShowConfigureServerModal(true)}
                        className="btn-secondary !py-1 !px-3 text-xs flex items-center gap-1.5"
                      >
                        <Sliders className="h-3.5 w-3.5 text-blue-400" />
                        <span>Configure Server...</span>
                      </button>
                    </div>

                    {/* Embedded 5x5 Grid */}
                    <DeskflowScreenGrid
                      screens={screens}
                      onScreensChange={setScreens}
                      serverHostname={serverHostname}
                      serverOs={serverOs}
                      interactive={true}
                    />
                  </div>
                </div>
              ) : (
                /* ─── CLIENT MODE PANEL ─── */
                <div className="space-y-4 pt-1 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Screen Name Input */}
                    <div className="space-y-1.5 font-mono">
                      <label className="text-zinc-400 block text-[11px]">
                        Screen name:
                      </label>
                      <input
                        type="text"
                        value={clientSettings.screenName}
                        onChange={(e) =>
                          setClientSettings({
                            ...clientSettings,
                            screenName: e.target.value,
                          })
                        }
                        placeholder={systemInfo?.device_name || 'Client-Device'}
                        className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                      />
                      <p className="text-[10px] text-zinc-500">
                        Must match the screen name configured in the server's screen grid.
                      </p>
                    </div>

                    {/* Server IP Input & Auto-Config */}
                    <div className="space-y-1.5 font-mono">
                      <div className="flex items-center justify-between">
                        <label className="text-zinc-400 block text-[11px]">
                          Server IP or hostname:
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-zinc-400 text-[10px]">
                          <input
                            type="checkbox"
                            checked={clientSettings.autoConfig}
                            onChange={(e) =>
                              setClientSettings({
                                ...clientSettings,
                                autoConfig: e.target.checked,
                              })
                            }
                            className="rounded border-zinc-700 bg-zinc-800 text-blue-500"
                          />
                          <span>Auto config</span>
                        </label>
                      </div>

                      <input
                        type="text"
                        value={clientSettings.serverAddress}
                        onChange={(e) =>
                          setClientSettings({
                            ...clientSettings,
                            serverAddress: e.target.value,
                          })
                        }
                        placeholder="192.168.1.15:24800"
                        className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                      />

                      {/* Auto-Discovered Servers Quick-Select */}
                      {discoveredDevices.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-zinc-500">Discovered:</span>
                          {discoveredDevices.map((d) => (
                            <button
                              key={d.device_id}
                              onClick={() =>
                                setClientSettings({
                                  ...clientSettings,
                                  serverAddress: `${d.ip}:${d.port || 24800}`,
                                })
                              }
                              className="px-1.5 py-0.5 rounded border border-white/[0.08] bg-white/[0.04] text-[10px] text-zinc-300 hover:text-white hover:border-white/[0.2] transition-colors"
                            >
                              {d.device_name} ({d.ip})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Deskflow Primary Control Bar ─── */}
            <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-3 border border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                {/* Start / Stop Button */}
                <button
                  onClick={handleToggleStartStop}
                  className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition-all ${
                    isRunning
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30'
                      : 'bg-emerald-500 text-zinc-950 font-bold hover:bg-emerald-400 shadow-emerald-500/20'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Square className="h-3.5 w-3.5 fill-current" />
                      <span>Stop Deskflow</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Start Deskflow</span>
                    </>
                  )}
                </button>

                {/* Apply Button */}
                <button
                  onClick={handleApplyConfig}
                  className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5 text-zinc-300 hover:text-white"
                  title="Reload and apply current screen layout"
                >
                  <RotateCw className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Apply</span>
                </button>

                {/* Configure Server Button */}
                {deskflowMode === 'server' && (
                  <button
                    onClick={() => setShowConfigureServerModal(true)}
                    className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5 text-zinc-300 hover:text-white"
                  >
                    <Sliders className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Configure Server...</span>
                  </button>
                )}
              </div>

              {/* Show Log Toggle */}
              <button
                onClick={() => setShowLogConsole(!showLogConsole)}
                className={`btn-ghost text-xs px-3 py-2 flex items-center gap-1.5 transition-all ${
                  showLogConsole ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>{showLogConsole ? 'Hide Log' : 'Show Log'}</span>
              </button>
            </div>

            {/* ─── Real-Time Log Console (Deskflow Style) ─── */}
            {showLogConsole && (
              <DeskflowLogConsole
                isOpen={showLogConsole}
                isEmbedded={true}
                onClose={() => setShowLogConsole(false)}
              />
            )}

            {/* ─── Bottom Deskflow Status Ribbon ─── */}
            <div className="glass-panel p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono border border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                  }`}
                />
                <span className="text-zinc-200">
                  {isRunning
                    ? deskflowMode === 'server'
                      ? `Deskflow is running (Server Active on port ${serverSettings.port})`
                      : `Connected to Deskflow Server at ${clientSettings.serverAddress}`
                    : 'Deskflow is stopped'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-zinc-400 text-[11px]">
                {/* Fingerprint */}
                <div
                  className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-200"
                  onClick={() => setShowPreferencesModal(true)}
                  title="TLS Certificate Fingerprint"
                >
                  <Shield className="h-3 w-3 text-emerald-400" />
                  <span>
                    Fingerprint: {serverFingerprint.substring(0, 14)}...
                  </span>
                </div>

                {/* Cursor Lock status */}
                <div
                  className="flex items-center gap-1 cursor-pointer hover:text-zinc-200"
                  onClick={handleToggleCursorLock}
                >
                  {isCursorLocked ? (
                    <Lock className="h-3 w-3 text-amber-400" />
                  ) : (
                    <Unlock className="h-3 w-3 text-zinc-500" />
                  )}
                  <span>{isCursorLocked ? 'Cursor Locked' : 'Cursor Free'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer className="mt-auto border-t border-white/[0.05] py-3 px-4 flex flex-wrap items-center justify-between text-[11px] text-zinc-600 font-mono select-none">
        <span>Deskflow Cross-Platform Software KVM • {isTauri ? 'Native Backend' : 'Web P2P Backend'} • Zero Stuck Keys</span>
        <div className="flex items-center gap-3">
          {onOpenPrivacy && (
            <button onClick={onOpenPrivacy} className="hover:text-zinc-400 transition-colors">
              Privacy Policy
            </button>
          )}
          {onOpenTerms && (
            <button onClick={onOpenTerms} className="hover:text-zinc-400 transition-colors">
              Terms & Conditions
            </button>
          )}
        </div>
      </footer>

      {/* ─── Modals ─── */}
      <DeskflowConfigureServerModal
        isOpen={showConfigureServerModal}
        onClose={() => setShowConfigureServerModal(false)}
        screens={screens}
        onScreensChange={setScreens}
        settings={serverSettings}
        onSettingsChange={setServerSettings}
        serverHostname={serverHostname}
        serverOs={serverOs}
      />

      <DeskflowPreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
        serverSettings={serverSettings}
        onServerSettingsChange={setServerSettings}
        clientSettings={clientSettings}
        onClientSettingsChange={setClientSettings}
        serverFingerprint={serverFingerprint}
      />

      <KeyboardShortcutsSettings
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        systemInfo={systemInfo}
      />

      <MacPermissionsModal
        isOpen={showMacModal}
        onClose={() => setShowMacModal(false)}
      />
    </div>
  );
};
