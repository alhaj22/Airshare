import React from 'react';
import { Command, MousePointer } from 'lucide-react';
import type { ConnectionStatus, SystemInfo } from '../types';

interface HeaderProps {
  systemInfo: SystemInfo | null;
  status: ConnectionStatus;
  onToggleActiveScreen: () => void;
  onOpenShortcuts?: () => void;
  activeTab?: string;
  onSelectTab?: (tab: 'canvas' | 'pairing' | 'hardware' | 'shortcuts') => void;
  onDisconnect?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  systemInfo,
  status,
  onToggleActiveScreen,
  onOpenShortcuts,
  activeTab = 'canvas',
  onSelectTab,
  onDisconnect,
}) => {
  const isConnected = status.mode === 'connected';
  const isHosting = status.mode === 'hosting';
  const isRemoteActive = status.active_screen === 'client';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.07] bg-[#08090a]/80 backdrop-blur-xl select-none">
      <div className="max-w-6xl mx-auto px-4 h-13 flex items-center justify-between gap-4">
        {/* Left: Brand Monogram & Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05] border border-white/[0.1] shadow-inner text-white font-mono font-bold text-xs tracking-wider">
            AD
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-zinc-100">
              AirDesk
            </span>
            <span className="hidden sm:inline-flex items-center text-[10px] font-mono px-1.5 py-0.2 rounded border border-white/[0.08] bg-white/[0.03] text-zinc-400">
              v0.1.0 • KVM
            </span>
          </div>
        </div>

        {/* Center: Segmented Navigation (Linear Style) */}
        {onSelectTab && (
          <nav className="hidden md:flex items-center p-0.5 rounded-lg border border-white/[0.06] bg-black/40 backdrop-blur-md">
            <button
              onClick={() => onSelectTab('canvas')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeTab === 'canvas'
                  ? 'bg-white/[0.1] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Virtual Canvas
            </button>
            <button
              onClick={() => onSelectTab('pairing')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeTab === 'pairing'
                  ? 'bg-white/[0.1] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Session & PIN
            </button>
            <button
              onClick={() => onSelectTab('hardware')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeTab === 'hardware'
                  ? 'bg-white/[0.1] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Hardware & DDC
            </button>
            <button
              onClick={() => onSelectTab('shortcuts')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeTab === 'shortcuts'
                  ? 'bg-white/[0.1] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Shortcuts (60+)
            </button>
          </nav>
        )}

        {/* Right: Status Pill & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Connection Status Pill */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.02]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isConnected
                  ? 'bg-emerald-400 animate-pulse'
                  : isHosting
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-zinc-500'
              }`}
            />
            <span className="text-xs text-zinc-300 font-medium">
              {isConnected
                ? status.peer_device || 'Peer Connected'
                : isHosting
                ? `Hosting (PIN: ${status.pin || '...'}`
                : systemInfo?.local_ip || 'Ready'}
            </span>
          </div>

          {/* Screen Focus Toggle (When Connected) */}
          {isConnected && (
            <button
              onClick={onToggleActiveScreen}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                isRemoteActive
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-sm'
                  : 'border-white/[0.1] bg-white/[0.04] text-zinc-300 hover:text-white'
              }`}
              title="Toggle input control between local and remote screen"
            >
              <MousePointer className="h-3 w-3" />
              <span>{isRemoteActive ? 'Remote Focus' : 'Local Focus'}</span>
              <kbd className="kbd-key ml-0.5">Tab</kbd>
            </button>
          )}

          {/* Shortcuts Quick Palette Button */}
          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.15] text-xs transition-colors"
              title="Open Universal Shortcuts Palette"
            >
              <Command className="h-3 w-3" />
              <span className="hidden lg:inline text-[11px]">Shortcuts</span>
              <kbd className="kbd-key hidden sm:inline">⌘K</kbd>
            </button>
          )}

          {/* Disconnect quick button if connected */}
          {isConnected && onDisconnect && (
            <button
              onClick={onDisconnect}
              className="btn-danger text-xs !py-1 !px-2"
              title="Disconnect active session"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
