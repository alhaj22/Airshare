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
} from 'lucide-react';
import { api } from '../services/tauriBridge';
import { SHORTCUT_CATEGORIES, SHORTCUT_REGISTRY } from '../services/shortcutRegistry';
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

function getOsIcon(os?: string) {
  const o = (os || '').toLowerCase();
  if (o.includes('mac')) return '🍎';
  if (o.includes('win')) return '🪟';
  if (o.includes('linux')) return '🐧';
  return '💻';
}

function renderKeyBadges(keyStr: string) {
  const parts = keyStr.split('+').map((s) => s.trim());
  return (
    <div className="flex flex-wrap items-center gap-1">
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          <kbd
            className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-mono font-semibold rounded shadow-sm select-none"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#f8fafc',
            }}
          >
            {p}
          </kbd>
          {i < parts.length - 1 && (
            <span className="text-[10px] text-slate-500 font-mono">+</span>
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

  const targetOsName = (session?.peer_os || (hostOs === 'windows' ? 'macOS' : 'Windows')).toLowerCase();
  const hostOsName = (systemInfo?.os || (hostOs === 'windows' ? 'Windows' : 'macOS')).toLowerCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      style={{
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="relative w-full max-w-5xl rounded-2xl flex flex-col max-h-[92vh] overflow-hidden shadow-2xl border"
        style={{
          background: 'rgba(15,20,30,0.98)',
          borderColor: 'rgba(255,255,255,0.08)',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.7), 0 0 30px rgba(14,165,233,0.1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b select-none"
          style={{
            borderColor: 'rgba(255,255,255,0.06)',
            background: 'linear-gradient(180deg, rgba(30,41,59,0.4) 0%, rgba(15,20,30,0.2) 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
              }}
            >
              <Command className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Universal Cross-Platform Keyboard Shortcuts
                </h2>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: 'rgba(245,158,11,0.15)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245,158,11,0.3)',
                  }}
                >
                  Intelligent KVM
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Native translation across Windows, macOS, and Linux with zero missed keystrokes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-white transition-all cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar">
          {/* OS Pair Banner */}
          <div
            className="rounded-xl p-4 border"
            style={{
              background: 'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(99,102,241,0.05) 100%)',
              borderColor: 'rgba(14,165,233,0.2)',
            }}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Host device */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  {getOsIcon(systemInfo?.os)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">Source (Host):</span>
                    <span className="text-xs font-bold text-white truncate max-w-[150px]">
                      {systemInfo?.device_name || 'This Computer'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span className="px-1.5 py-0.2 rounded font-mono bg-white/5 border border-white/10">
                      {systemInfo?.os || 'Windows'}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-slate-400">{systemInfo?.architecture || 'x86_64'}</span>
                    <span>•</span>
                    <span className="text-slate-400">{systemInfo?.keyboard_layout || 'US QWERTY'}</span>
                  </div>
                </div>
              </div>

              {/* Translation badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 shadow-inner">
                <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  {mappingMode === 'smart_universal'
                    ? 'Translates to'
                    : mappingMode === 'raw_passthrough'
                    ? 'Direct Passthrough'
                    : 'Custom Mapped'}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </div>

              {/* Peer device */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  {getOsIcon(session?.peer_os || (hostOs === 'windows' ? 'macOS' : 'Windows'))}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">Target (Peer):</span>
                    <span className="text-xs font-bold text-white truncate max-w-[150px]">
                      {session?.peer_name || 'Remote Peer Computer'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span className="px-1.5 py-0.2 rounded font-mono bg-white/5 border border-white/10">
                      {session?.peer_os || (hostOs === 'windows' ? 'macOS' : 'Windows')}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-slate-400">{session?.peer_architecture || 'Universal'}</span>
                    <span>•</span>
                    <span className="text-slate-400">{session?.peer_keyboard_layout || 'Native Layout'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Keyboard Translation Engine Mode
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Smart Universal */}
              <button
                onClick={() => handleModeChange('smart_universal')}
                className="flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer relative"
                style={{
                  background:
                    mappingMode === 'smart_universal'
                      ? 'rgba(245,158,11,0.1)'
                      : 'rgba(255,255,255,0.02)',
                  borderColor:
                    mappingMode === 'smart_universal'
                      ? '#f59e0b'
                      : 'rgba(255,255,255,0.08)',
                  boxShadow:
                    mappingMode === 'smart_universal'
                      ? '0 0 15px rgba(245,158,11,0.2)'
                      : 'none',
                }}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Smart Universal</span>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Automatically translates shortcuts to target OS conventions (Windows Ctrl+C → Mac ⌘+C, Alt+Tab → ⌘+Tab, Ctrl+Shift+Esc → Force Quit).
                </p>
              </button>

              {/* Raw Passthrough */}
              <button
                onClick={() => handleModeChange('raw_passthrough')}
                className="flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer"
                style={{
                  background:
                    mappingMode === 'raw_passthrough'
                      ? 'rgba(14,165,233,0.1)'
                      : 'rgba(255,255,255,0.02)',
                  borderColor:
                    mappingMode === 'raw_passthrough'
                      ? '#0ea5e9'
                      : 'rgba(255,255,255,0.08)',
                  boxShadow:
                    mappingMode === 'raw_passthrough'
                      ? '0 0 15px rgba(14,165,233,0.2)'
                      : 'none',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-sky-400" />
                  <span className="text-xs font-bold text-white">Raw 1:1 Passthrough</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Sends raw physical keys without mapping. Use when both computers have identical OS or when running virtual machines.
                </p>
              </button>

              {/* Custom Overrides */}
              <button
                onClick={() => handleModeChange('custom')}
                className="flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer"
                style={{
                  background:
                    mappingMode === 'custom'
                      ? 'rgba(167,139,250,0.1)'
                      : 'rgba(255,255,255,0.02)',
                  borderColor:
                    mappingMode === 'custom'
                      ? '#a78bfa'
                      : 'rgba(255,255,255,0.08)',
                  boxShadow:
                    mappingMode === 'custom'
                      ? '0 0 15px rgba(167,139,250,0.2)'
                      : 'none',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sliders className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-bold text-white">Custom Overrides</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Configure specific modifier key behaviors such as swapping Ctrl/Alt, Command/Option, or remap CapsLock.
                </p>
              </button>
            </div>
          </div>

          {/* Custom Overrides Toggles */}
          {mappingMode === 'custom' && (
            <div
              className="p-4 rounded-xl border space-y-3 slide-down"
              style={{
                background: 'rgba(167,139,250,0.05)',
                borderColor: 'rgba(167,139,250,0.2)',
              }}
            >
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Sliders className="h-3.5 w-3.5 text-purple-400" />
                Custom Modifier Key Mappings
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => handleToggleCustom('swap_ctrl_alt')}
                  className="flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all"
                  style={{
                    background: customConfig.swap_ctrl_alt ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)',
                    borderColor: customConfig.swap_ctrl_alt ? '#a78bfa' : 'rgba(255,255,255,0.1)',
                    color: customConfig.swap_ctrl_alt ? '#f1f5f9' : '#94a3b8',
                  }}
                >
                  <span>Swap Ctrl ↔ Alt</span>
                  <div
                    className="h-3.5 w-3.5 rounded-full border"
                    style={{
                      background: customConfig.swap_ctrl_alt ? '#a78bfa' : 'transparent',
                      borderColor: customConfig.swap_ctrl_alt ? '#a78bfa' : '#475569',
                    }}
                  />
                </button>

                <button
                  onClick={() => handleToggleCustom('swap_cmd_alt')}
                  className="flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all"
                  style={{
                    background: customConfig.swap_cmd_alt ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)',
                    borderColor: customConfig.swap_cmd_alt ? '#a78bfa' : 'rgba(255,255,255,0.1)',
                    color: customConfig.swap_cmd_alt ? '#f1f5f9' : '#94a3b8',
                  }}
                >
                  <span>Swap Cmd ↔ Option (Alt)</span>
                  <div
                    className="h-3.5 w-3.5 rounded-full border"
                    style={{
                      background: customConfig.swap_cmd_alt ? '#a78bfa' : 'transparent',
                      borderColor: customConfig.swap_cmd_alt ? '#a78bfa' : '#475569',
                    }}
                  />
                </button>

                <button
                  onClick={() => handleToggleCustom('capslock_as_ctrl')}
                  className="flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all"
                  style={{
                    background: customConfig.capslock_as_ctrl ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)',
                    borderColor: customConfig.capslock_as_ctrl ? '#a78bfa' : 'rgba(255,255,255,0.1)',
                    color: customConfig.capslock_as_ctrl ? '#f1f5f9' : '#94a3b8',
                  }}
                >
                  <span>CapsLock as Control</span>
                  <div
                    className="h-3.5 w-3.5 rounded-full border"
                    style={{
                      background: customConfig.capslock_as_ctrl ? '#a78bfa' : 'transparent',
                      borderColor: customConfig.capslock_as_ctrl ? '#a78bfa' : '#475569',
                    }}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Emergency Stuck Keys Rescue Bar */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border"
            style={{
              background: 'rgba(239,68,68,0.06)',
              borderColor: 'rgba(239,68,68,0.2)',
            }}
          >
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <ShieldAlert className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span>
                Accidental stuck Shift/Ctrl/Alt keys? Tap{' '}
                <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-white/10 border border-white/20 text-white">
                  Esc 3 times
                </kbd>{' '}
                or use the un-stuck button:
              </span>
            </div>

            <button
              onClick={handleReleaseStuckKeys}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none"
              style={{
                background: stuckReleased ? '#10b981' : 'rgba(239,68,68,0.15)',
                color: stuckReleased ? '#ffffff' : '#fca5a5',
                border: `1px solid ${stuckReleased ? '#10b981' : 'rgba(239,68,68,0.3)'}`,
              }}
            >
              {stuckReleased ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Modifiers Released!</span>
                </>
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Release Stuck Keys Now</span>
                </>
              )}
            </button>
          </div>

          {/* Search & Category Tabs */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search input */}
              <div
                className="relative flex-1 flex items-center rounded-xl px-3 py-2 border"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <Search className="h-4 w-4 text-slate-400 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search 60+ shortcuts by action, key combination..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-white text-xs px-1"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Match count */}
              <div className="text-xs text-slate-400 font-mono self-center sm:self-auto">
                {filteredShortcuts.length} shortcuts found
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              <button
                onClick={() => setSelectedCategory('all')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer"
                style={{
                  background: selectedCategory === 'all' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.03)',
                  color: selectedCategory === 'all' ? '#fbbf24' : '#94a3b8',
                  border: `1px solid ${selectedCategory === 'all' ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                All Categories
              </button>
              {SHORTCUT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer"
                  style={{
                    background: selectedCategory === cat.id ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.03)',
                    color: selectedCategory === cat.id ? '#fbbf24' : '#94a3b8',
                    border: `1px solid ${selectedCategory === cat.id ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Comparison Table */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              borderColor: 'rgba(255,255,255,0.08)',
              background: 'rgba(10,14,22,0.6)',
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    className="text-[11px] uppercase tracking-wider font-semibold border-b"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderColor: 'rgba(255,255,255,0.08)',
                      color: '#94a3b8',
                    }}
                  >
                    <th className="py-3 px-4 w-[28%]">Shortcut Action</th>
                    <th className="py-3 px-4 w-[24%]">
                      <div className="flex items-center gap-1.5">
                        <span>🪟</span>
                        <span>Windows</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 w-[24%]">
                      <div className="flex items-center gap-1.5">
                        <span>🍎</span>
                        <span>macOS</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 w-[24%]">
                      <div className="flex items-center gap-1.5">
                        <span>🐧</span>
                        <span>Linux</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {filteredShortcuts.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white group-hover:text-amber-300 transition-colors">
                          {s.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                          {s.description}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div
                          className={`p-1 rounded ${
                            hostOsName.includes('win')
                              ? 'bg-sky-500/10 border border-sky-500/20'
                              : ''
                          }`}
                        >
                          {renderKeyBadges(s.windows)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div
                          className={`p-1 rounded ${
                            targetOsName.includes('mac') || hostOsName.includes('mac')
                              ? 'bg-amber-500/10 border border-amber-500/20'
                              : ''
                          }`}
                        >
                          {renderKeyBadges(s.macos)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div
                          className={`p-1 rounded ${
                            targetOsName.includes('linux') || hostOsName.includes('linux')
                              ? 'bg-emerald-500/10 border border-emerald-500/20'
                              : ''
                          }`}
                        >
                          {renderKeyBadges(s.linux)}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredShortcuts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-500">
                        No shortcuts match your search query. Try another term.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="flex items-center justify-between px-6 py-3 border-t select-none"
          style={{
            borderColor: 'rgba(255,255,255,0.06)',
            background: 'rgba(10,13,20,0.8)',
          }}
        >
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>
              Real-time hardware injection active. Modifier states sync automatically.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 transition-all cursor-pointer shadow-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
