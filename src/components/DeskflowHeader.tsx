import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  ExternalLink,
} from 'lucide-react';
import type { DeskflowMode } from '../types';

interface DeskflowHeaderProps {
  mode?: DeskflowMode;
  isRunning: boolean;
  onToggleStartStop: () => void;
  onApply: () => void;
  onOpenConfigureServer: () => void;
  onOpenPreferences: () => void;
  onToggleLog: () => void;
  onOpenShortcuts?: () => void;
  onOpenHardware?: () => void;
  isCursorLocked: boolean;
  onToggleCursorLock: () => void;
  activeNavTab: string;
  onSelectNavTab: (tab: 'main' | 'hardware' | 'shortcuts') => void;
}

export const DeskflowHeader: React.FC<DeskflowHeaderProps> = ({
  isRunning,
  onToggleStartStop,
  onApply,
  onOpenConfigureServer,
  onOpenPreferences,
  onToggleLog,
  isCursorLocked,
  onToggleCursorLock,
  activeNavTab,
  onSelectNavTab,
}) => {
  const [openMenu, setOpenMenu] = useState<'file' | 'edit' | 'view' | 'help' | null>(null);

  const closeMenu = () => setOpenMenu(null);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#07080a]/90 backdrop-blur-xl select-none">
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
        {/* Left: Deskflow Monogram & Menu Bar */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono font-bold text-xs tracking-wider">
              DF
            </div>
            <span className="font-semibold text-sm tracking-tight text-zinc-100">
              Deskflow
            </span>
          </div>

          {/* Desktop Classic Menu Bar */}
          <nav className="flex items-center gap-1 text-xs font-mono relative">
            {/* File Menu */}
            <div className="relative">
              <button
                onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
                className={`px-2.5 py-1 rounded hover:bg-white/[0.08] transition-colors ${
                  openMenu === 'file' ? 'bg-white/[0.08] text-white' : 'text-zinc-400'
                }`}
              >
                File
              </button>
              {openMenu === 'file' && (
                <div
                  onMouseLeave={closeMenu}
                  className="absolute top-full left-0 mt-1 w-44 rounded-xl p-1.5 glass-panel border border-white/[0.12] bg-[#0c0d12]/98 shadow-2xl z-50 space-y-0.5 text-xs font-sans"
                >
                  <button
                    onClick={() => {
                      onToggleStartStop();
                      closeMenu();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-200 flex items-center justify-between"
                  >
                    <span>{isRunning ? 'Stop' : 'Start'}</span>
                    <kbd className="text-[10px] font-mono text-zinc-500">Ctrl+S</kbd>
                  </button>
                  <button
                    onClick={() => {
                      onApply();
                      closeMenu();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-200"
                  >
                    Apply Config
                  </button>
                </div>
              )}
            </div>

            {/* Edit Menu */}
            <div className="relative">
              <button
                onClick={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')}
                className={`px-2.5 py-1 rounded hover:bg-white/[0.08] transition-colors ${
                  openMenu === 'edit' ? 'bg-white/[0.08] text-white' : 'text-zinc-400'
                }`}
              >
                Edit
              </button>
              {openMenu === 'edit' && (
                <div
                  onMouseLeave={closeMenu}
                  className="absolute top-full left-0 mt-1 w-48 rounded-xl p-1.5 glass-panel border border-white/[0.12] bg-[#0c0d12]/98 shadow-2xl z-50 space-y-0.5 text-xs font-sans"
                >
                  <button
                    onClick={() => {
                      onOpenConfigureServer();
                      closeMenu();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-200"
                  >
                    Configure Server...
                  </button>
                  <button
                    onClick={() => {
                      onOpenPreferences();
                      closeMenu();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-200"
                  >
                    Preferences...
                  </button>
                </div>
              )}
            </div>

            {/* View Menu */}
            <div className="relative">
              <button
                onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
                className={`px-2.5 py-1 rounded hover:bg-white/[0.08] transition-colors ${
                  openMenu === 'view' ? 'bg-white/[0.08] text-white' : 'text-zinc-400'
                }`}
              >
                View
              </button>
              {openMenu === 'view' && (
                <div
                  onMouseLeave={closeMenu}
                  className="absolute top-full left-0 mt-1 w-48 rounded-xl p-1.5 glass-panel border border-white/[0.12] bg-[#0c0d12]/98 shadow-2xl z-50 space-y-0.5 text-xs font-sans"
                >
                  <button
                    onClick={() => {
                      onToggleLog();
                      closeMenu();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-200"
                  >
                    Toggle Log Window
                  </button>
                  <button
                    onClick={() => {
                      onSelectNavTab('hardware');
                      closeMenu();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-200"
                  >
                    Hardware & DDC Telemetry
                  </button>
                  <button
                    onClick={() => {
                      onSelectNavTab('shortcuts');
                      closeMenu();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-200"
                  >
                    Keyboard Shortcuts
                  </button>
                </div>
              )}
            </div>

            {/* Help Menu */}
            <div className="relative">
              <button
                onClick={() => setOpenMenu(openMenu === 'help' ? null : 'help')}
                className={`px-2.5 py-1 rounded hover:bg-white/[0.08] transition-colors ${
                  openMenu === 'help' ? 'bg-white/[0.08] text-white' : 'text-zinc-400'
                }`}
              >
                Help
              </button>
              {openMenu === 'help' && (
                <div
                  onMouseLeave={closeMenu}
                  className="absolute top-full left-0 mt-1 w-48 rounded-xl p-1.5 glass-panel border border-white/[0.12] bg-[#0c0d12]/98 shadow-2xl z-50 space-y-0.5 text-xs font-sans"
                >
                  <a
                    href="https://github.com/deskflow/deskflow"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-200 flex items-center justify-between"
                  >
                    <span>Deskflow GitHub</span>
                    <ExternalLink className="h-3 w-3 text-zinc-400" />
                  </a>
                  <button
                    onClick={() => {
                      alert('Deskflow KVM Engine v0.1.0\nUniversal Cross-Platform Keyboard & Mouse Sharing\nSupports Windows, macOS & Linux');
                      closeMenu();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-200"
                  >
                    About Deskflow
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Center: Quick Mode Navigator */}
        <div className="hidden md:flex items-center p-0.5 rounded-lg border border-white/[0.06] bg-black/40">
          <button
            onClick={() => onSelectNavTab('main')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeNavTab === 'main'
                ? 'bg-white/[0.1] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Deskflow KVM
          </button>
          <button
            onClick={() => onSelectNavTab('hardware')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeNavTab === 'hardware'
                ? 'bg-white/[0.1] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Hardware & DDC
          </button>
          <button
            onClick={() => onSelectNavTab('shortcuts')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeNavTab === 'shortcuts'
                ? 'bg-white/[0.1] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Shortcuts
          </button>
        </div>

        {/* Right: Lock Cursor & Running Status Pill */}
        <div className="flex items-center gap-2">
          {/* Cursor Lock Button */}
          <button
            onClick={onToggleCursorLock}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all ${
              isCursorLocked
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                : 'border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-zinc-200'
            }`}
            title="Lock cursor to current screen (ScrollLock / Toggle)"
          >
            {isCursorLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
            <span className="hidden sm:inline">
              {isCursorLocked ? 'Locked' : 'Unlocked'}
            </span>
          </button>

          {/* Running Status Pill */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.02] font-mono text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
              }`}
            />
            <span className="text-zinc-300">
              {isRunning ? 'Running' : 'Stopped'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
