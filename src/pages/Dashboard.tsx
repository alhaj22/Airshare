import React, { useState } from 'react';
import { useAirDesk } from '../hooks/useAirDesk';
import { Header } from '../components/Header';
import { HostSection } from '../components/HostSection';
import { JoinSection } from '../components/JoinSection';
import { ScreenArrangement } from '../components/ScreenArrangement';
import { FeaturesBar } from '../components/FeaturesBar';
import { MacPermissionsModal } from '../components/MacPermissionsModal';
import { Apple, Info } from 'lucide-react';

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

        {/* 2-Column Pairing Grid: Host (Generate 6-Digit Key) vs Join (Enter 6-Digit Key) */}
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

        {/* Interactive Screen Arrangement & Visualizer */}
        <ScreenArrangement
          status={status}
          arrangement={screenArrangement}
          onArrangementChange={updateArrangement}
          onSimulateEdgeCross={toggleActiveScreen}
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
