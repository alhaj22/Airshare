import React from 'react';
import { Wifi, Laptop, Monitor, ArrowRightLeft } from 'lucide-react';
import type { ConnectionStatus, SystemInfo } from '../types';

interface HeaderProps {
  systemInfo: SystemInfo | null;
  status: ConnectionStatus;
  onToggleActiveScreen: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  systemInfo,
  status,
  onToggleActiveScreen,
}) => {
  const isConnected = status.mode === 'connected';
  const isHosting = status.mode === 'hosting';

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-black/40 px-6 py-4 backdrop-blur-md">
      {/* Brand & Tagline */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-600 shadow-lg shadow-cyan-500/20">
          <ArrowRightLeft className="h-6 w-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">AirDesk</h1>
            <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-500/30">
              v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400">
            One Mouse + One Keyboard • Windows & Mac
          </p>
        </div>
      </div>

      {/* Middle: Active Focus / Connection Status */}
      <div className="flex items-center gap-3">
        {isConnected ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-emerald-300">
              Connected with {status.peer_device || 'Peer Device'}
            </span>

            {/* Quick switcher button */}
            <button
              onClick={onToggleActiveScreen}
              title="Click to simulate switching cursor between laptops"
              className="ml-2 flex items-center gap-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-200 transition cursor-pointer"
            >
              <span>Control:</span>
              <span className="underline decoration-dotted font-bold">
                {status.active_screen === 'host' ? 'This Laptop' : status.peer_device || 'MacBook'}
              </span>
            </button>
          </div>
        ) : isHosting ? (
          <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="text-xs font-medium text-amber-300">
              Host Active • Waiting for 6-Digit PIN pairing
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-500"></span>
            <span className="text-xs font-medium text-slate-400">Ready to Connect</span>
          </div>
        )}
      </div>

      {/* Right: Local IP & OS info */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-lg bg-slate-800/60 border border-white/5 px-3 py-1.5 text-xs text-slate-300">
          <Wifi className="h-3.5 w-3.5 text-cyan-400" />
          <span>{systemInfo?.local_ip || '192.168.1.x'}</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-slate-800/60 border border-white/5 px-3 py-1.5 text-xs text-slate-300">
          {systemInfo?.os === 'macOS' ? (
            <Laptop className="h-3.5 w-3.5 text-purple-400" />
          ) : (
            <Monitor className="h-3.5 w-3.5 text-blue-400" />
          )}
          <span>{systemInfo?.device_name || 'My Computer'}</span>
        </div>
      </div>
    </header>
  );
};
