import React, { useState } from 'react';
import { useAirDesk } from '../hooks/useAirDesk';
import { Header } from '../components/Header';
import { HostSection } from '../components/HostSection';
import { JoinSection } from '../components/JoinSection';
import { ScreenArrangement } from '../components/ScreenArrangement';
import { FeaturesBar } from '../components/FeaturesBar';
import { MacPermissionsModal } from '../components/MacPermissionsModal';
import { Apple, Info, Link2, Power, MousePointer2 } from 'lucide-react';

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
    notification,
    startHost,
    joinHost,
    disconnect,
    updateArrangement,
    toggleActiveScreen,
    simulatePeerConnection,
  } = useAirDesk();

  const [showMacModal, setShowMacModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Header */}
      <Header
        systemInfo={systemInfo}
        status={status}
        onToggleActiveScreen={toggleActiveScreen}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Toast Notification Banner */}
        {notification && (
          <div
            className={`flex items-center justify-between rounded-xl px-4 py-3 text-xs font-semibold shadow-lg transition animate-in fade-in slide-in-from-top-2 ${
              notification.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                : notification.type === 'error'
                ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
                : 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
            }`}
          >
            <span>{notification.text}</span>
          </div>
        )}

        {/* Feature Toggles Strip */}
        <FeaturesBar
          mouseSharing={mouseSharing}
          setMouseSharing={setMouseSharing}
          keyboardSharing={keyboardSharing}
          setKeyboardSharing={setKeyboardSharing}
          clipboardSharing={clipboardSharing}
          setClipboardSharing={setClipboardSharing}
        />

        {/* Connected Session Center OR 2-Column Pairing Grid */}
        {status.mode === 'connected' ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-cyan-950/40 p-6 shadow-xl backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-inner">
                  <Link2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Active Session Established
                    </span>
                    {status.session?.session_id && (
                      <span className="rounded bg-black/40 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                        {status.session.session_id}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-white mt-0.5 flex items-center gap-2">
                    <span>{systemInfo?.device_name || 'This Computer'}</span>
                    <span className="text-cyan-400">↔</span>
                    <span>{status.peer_device || 'Remote Laptop'}</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Connected via {status.peer_ip || 'Local LAN'} • Ultra low-latency hardware input sync
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleActiveScreen}
                  className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-200 border border-white/10 transition cursor-pointer"
                >
                  <MousePointer2 className="h-4 w-4 text-cyan-400" />
                  <span>Control: {status.active_screen === 'host' ? 'This Laptop' : 'Remote Laptop'}</span>
                </button>

                <button
                  onClick={disconnect}
                  className="flex items-center gap-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 px-4 py-2.5 text-xs font-bold text-rose-300 hover:text-rose-200 transition cursor-pointer shadow-lg shadow-rose-950/40"
                >
                  <Power className="h-4 w-4" />
                  <span>End Session</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HostSection
              status={status}
              onStartHost={startHost}
              onDisconnect={disconnect}
            />

            <JoinSection
              discoveredDevices={discoveredDevices}
              onJoin={joinHost}
              onSimulateConnect={simulatePeerConnection}
            />
          </div>
        )}

        {/* Interactive Screen Arrangement & Visualizer */}
        <ScreenArrangement
          status={status}
          systemInfo={systemInfo}
          arrangement={screenArrangement}
          onArrangementChange={updateArrangement}
          onSimulateEdgeCross={toggleActiveScreen}
          onDeviceDrop={(dev) => joinHost(dev.ip, 'auto_connect')}
        />

        {/* Bottom Helper Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-cyan-400" />
            <span>
              Pure Local Wi-Fi connection. Zero cloud servers, zero internet latency.
            </span>
          </div>

          <button
            onClick={() => setShowMacModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 px-3 py-1.5 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <Apple className="h-3.5 w-3.5 text-purple-400" />
            <span>MacBook Setup & Permissions</span>
          </button>
        </div>
      </main>

      {/* Mac Accessibility Permission Helper Modal */}
      <MacPermissionsModal
        isOpen={showMacModal}
        onClose={() => setShowMacModal(false)}
      />
    </div>
  );
};
