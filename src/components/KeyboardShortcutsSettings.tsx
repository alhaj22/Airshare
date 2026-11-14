import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Sparkles,
  Zap,
  Sliders,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  Check,
  Command,
  Layout,
  Folder,
  Camera,
  Globe,
  Type,
  Settings,
  Monitor,
} from 'lucide-react';
import { api } from '../services/tauriBridge';
import { SHORTCUT_CATEGORIES, SHORTCUT_REGISTRY } from '../services/shortcutRegistry';
import { OsIcon } from './OsIcon';
import type {
  ActiveSession,
  CustomModifierConfig,
  DeviceOS,
  MappingMode,
  ShortcutCategory,
  SystemInfo,
} from '../types';

interface KeyboardShortcutsSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  systemInfo: SystemInfo | null;
  session?: ActiveSession;
}

function getCategoryIcon(iconKey: string) {
  switch (iconKey) {
    case 'zap': return <Zap className="h-3 w-3" />;
    case 'layout': return <Layout className="h-3 w-3" />;
    case 'folder': return <Folder className="h-3 w-3" />;
    case 'camera': return <Camera className="h-3 w-3" />;
    case 'globe': return <Globe className="h-3 w-3" />;
    case 'type': return <Type className="h-3 w-3" />;
    case 'settings': return <Settings className="h-3 w-3" />;
    case 'monitor': return <Monitor className="h-3 w-3" />;
    default: return <Command className="h-3 w-3" />;
  }
}

function renderKeyBadges(keyStr: string) {
  const parts = keyStr.split('+').map((s) => s.trim());
  return (
    <div className="flex flex-wrap items-center gap-1">
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          <kbd className="kbd-key">
            {p}
          </kbd>
          {i < parts.length - 1 && (
            <span className="text-[10px] text-zinc-500 font-mono">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export const KeyboardShortcutsSettings: React.FC<KeyboardShortcutsSettingsProps> = ({
  isOpen,
  onClose,
  systemInfo,
  session,
}) => {
  const [mappingMode, setMappingMode] = useState<MappingMode>('smart_universal');
  const [customConfig, setCustomConfig] = useState<CustomModifierConfig>({
    swap_ctrl_alt: false,
    swap_cmd_alt: false,
    capslock_as_ctrl: false,
    enabled: true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory | 'all'>('all');
  const [stuckReleased, setStuckReleased] = useState(false);
  const [hostOs, setHostOs] = useState<DeviceOS>('windows');

  useEffect(() => {
    if (!isOpen) return;

    const loadSettings = async () => {
      const mode = await api.getKeyboardMappingMode();
      setMappingMode(mode);

      const cfg = await api.getCustomModifierConfig();
      setCustomConfig(cfg);

      const os = await api.getHostOs();
      setHostOs(os);
    };

    loadSettings();
  }, [isOpen]);

  const handleModeChange = async (mode: MappingMode) => {
    setMappingMode(mode);
    await api.setKeyboardMappingMode(mode);
  };

  const handleToggleCustom = async (key: keyof CustomModifierConfig) => {
    const updated = {
      ...customConfig,
      [key]: !customConfig[key],
    };
    setCustomConfig(updated);
    await api.setCustomModifierConfig(updated);
  };

  const handleReleaseStuckKeys = async () => {
    await api.releaseStuckKeys();
    setStuckReleased(true);
    setTimeout(() => setStuckReleased(false), 2000);
  };

  const filteredShortcuts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return SHORTCUT_REGISTRY.filter((s) => {
      const matchesCat = selectedCategory === 'all' || s.category === selectedCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.windows.toLowerCase().includes(q) ||
        s.macos.toLowerCase().includes(q) ||
        s.linux.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-5xl rounded-2xl flex flex-col max-h-[92vh] overflow-hidden glass-panel border border-white/[0.12] bg-[#0c0d12]/95 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] select-none">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.05] text-zinc-200">
              <Command className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
                  Universal Cross-Platform Keyboard Shortcuts
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-white/[0.08] text-zinc-400">
                  Target OS Translation
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Automatic shortcut mapping between Windows, macOS, and Linux
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Translation Direction Ribbon */}
          <div className="glass-card p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300">
                <OsIcon os={systemInfo?.os} className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">
                  Source Keyboard
                </span>
                <p className="text-xs font-medium text-zinc-200">
                  {systemInfo?.device_name || 'This Computer'} ({systemInfo?.os || 'Windows'})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-zinc-300 text-xs">
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>
                {mappingMode === 'smart_universal'
                  ? 'Translates to Native Shortcuts'
                  : mappingMode === 'raw_passthrough'
                  ? 'Raw Passthrough'
                  : 'Custom Modifiers'}
              </span>
              <ArrowRight className="h-3 w-3 text-zinc-500" />
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300">
                <OsIcon os={session?.peer_os || (hostOs === 'windows' ? 'macOS' : 'Windows')} className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">
                  Target Controlled OS
                </span>
                <p className="text-xs font-medium text-zinc-200">
                  {session?.peer_name || 'Remote Peer'} ({session?.peer_os || (hostOs === 'windows' ? 'macOS' : 'Windows')})
                </p>
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">
              Mapping Mode
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <button
                onClick={() => handleModeChange('smart_universal')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  mappingMode === 'smart_universal'
                    ? 'border-white/[0.2] bg-white/[0.06] text-white shadow-sm'
                    : 'border-white/[0.06] bg-transparent text-zinc-400 hover:border-white/[0.12]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-zinc-100 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-amber-400" /> Smart Universal
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-white/[0.1] text-zinc-400">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Translates modifier keys dynamically: Ctrl+C ↔ ⌘C, Alt+Tab ↔ ⌘Tab, Ctrl+Shift+Esc ↔ ⌘OptEsc.
                </p>
              </button>

              <button
                onClick={() => handleModeChange('raw_passthrough')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  mappingMode === 'raw_passthrough'
                    ? 'border-white/[0.2] bg-white/[0.06] text-white shadow-sm'
                    : 'border-white/[0.06] bg-transparent text-zinc-400 hover:border-white/[0.12]'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-xs font-medium text-zinc-100">
                  <Zap className="h-3 w-3 text-blue-400" /> Raw 1:1 Passthrough
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Sends raw unmapped scan codes. Best for identical operating systems or remote desktop VM clients.
                </p>
              </button>

              <button
                onClick={() => handleModeChange('custom')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  mappingMode === 'custom'
                    ? 'border-white/[0.2] bg-white/[0.06] text-white shadow-sm'
                    : 'border-white/[0.06] bg-transparent text-zinc-400 hover:border-white/[0.12]'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-xs font-medium text-zinc-100">
                  <Sliders className="h-3 w-3 text-purple-400" /> Custom Modifiers
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Allows manually swapping Control, Option, Command, Alt, or using CapsLock as Control.
                </p>
              </button>
            </div>
          </div>

          {/* Custom Modifiers Toggle Box */}
          {mappingMode === 'custom' && (
            <div className="glass-card p-3 border-purple-500/20 bg-purple-500/[0.03] grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={() => handleToggleCustom('swap_ctrl_alt')}
                className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-all ${
                  customConfig.swap_ctrl_alt
                    ? 'border-purple-500/40 bg-purple-500/15 text-purple-200'
                    : 'border-white/[0.08] text-zinc-400'
                }`}
              >
                <span>Swap Ctrl ↔ Alt</span>
                <span className="font-mono text-[10px]">{customConfig.swap_ctrl_alt ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => handleToggleCustom('swap_cmd_alt')}
                className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-all ${
                  customConfig.swap_cmd_alt
                    ? 'border-purple-500/40 bg-purple-500/15 text-purple-200'
                    : 'border-white/[0.08] text-zinc-400'
                }`}
              >
                <span>Swap Cmd ↔ Option (Alt)</span>
                <span className="font-mono text-[10px]">{customConfig.swap_cmd_alt ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => handleToggleCustom('capslock_as_ctrl')}
                className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-all ${
                  customConfig.capslock_as_ctrl
                    ? 'border-purple-500/40 bg-purple-500/15 text-purple-200'
                    : 'border-white/[0.08] text-zinc-400'
                }`}
              >
                <span>CapsLock as Control</span>
                <span className="font-mono text-[10px]">{customConfig.capslock_as_ctrl ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          )}

          {/* Emergency Stuck Keys Rescue */}
          <div className="glass-card p-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-red-500/20 bg-red-500/[0.02]">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <ShieldAlert className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
              <span>
                Stuck modifier keys? Press <kbd className="kbd-key">Esc</kbd> 3× or use:
              </span>
            </div>

            <button
              onClick={handleReleaseStuckKeys}
              className="btn-danger !py-1 text-xs"
            >
              {stuckReleased ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span>Keys Released!</span>
                </>
              ) : (
                <>
                  <RotateCcw className="h-3 w-3" />
                  <span>Release Stuck Keys</span>
                </>
              )}
            </button>
          </div>

          {/* Search & Categories */}
          <div className="space-y-2.5 pt-1">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search 60+ shortcuts (e.g. copy, paste, desktop, switch, lock)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="glass-input !pl-8"
                />
              </div>
              <span className="text-xs font-mono text-zinc-500 self-center">
                {filteredShortcuts.length} matching
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                All (60+)
              </button>
              {SHORTCUT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                      : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  {getCategoryIcon(cat.icon)}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="glass-panel overflow-hidden border border-white/[0.08]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] font-mono uppercase text-zinc-500">
                  <th className="py-2.5 px-4 w-[28%] font-semibold">Action</th>
                  <th className="py-2.5 px-4 w-[24%] font-semibold">Windows</th>
                  <th className="py-2.5 px-4 w-[24%] font-semibold">macOS</th>
                  <th className="py-2.5 px-4 w-[24%] font-semibold">Linux</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredShortcuts.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-zinc-200">{s.name}</div>
                      <div className="text-[10px] text-zinc-500 truncate max-w-[200px]">
                        {s.description}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">{renderKeyBadges(s.windows)}</td>
                    <td className="py-2.5 px-4">{renderKeyBadges(s.macos)}</td>
                    <td className="py-2.5 px-4">{renderKeyBadges(s.linux)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.08] select-none bg-black/40">
          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Target OS translations applied dynamically with zero delay</span>
          </div>

          <button onClick={onClose} className="btn-action !py-1 text-xs">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
