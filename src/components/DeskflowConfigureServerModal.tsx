import React, { useState } from 'react';
import type {
  DeskflowActionType,
  DeskflowHotkeyAction,
  DeskflowScreen,
  DeskflowServerSettings,
  DeviceOS,
} from '../types';
import { DeskflowScreenGrid } from './DeskflowScreenGrid';
import {
  X,
  Layers,
  Keyboard,
  Sliders,
  Plus,
  Trash2,
  Check,
  ArrowRight,
} from 'lucide-react';

interface DeskflowConfigureServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  screens: DeskflowScreen[];
  onScreensChange: (screens: DeskflowScreen[]) => void;
  settings: DeskflowServerSettings;
  onSettingsChange: (settings: DeskflowServerSettings) => void;
  serverHostname: string;
  serverOs: DeviceOS;
}

export const DeskflowConfigureServerModal: React.FC<
  DeskflowConfigureServerModalProps
> = ({
  isOpen,
  onClose,
  screens,
  onScreensChange,
  settings,
  onSettingsChange,
  serverHostname,
  serverOs,
}) => {
  const [activeTab, setActiveTab] = useState<'screens' | 'hotkeys' | 'advanced'>('screens');

  // Hotkeys state
  const [hotkeys, setHotkeys] = useState<DeskflowHotkeyAction[]>([
    {
      id: 'hk_1',
      hotkey: 'Ctrl+Alt+Left',
      action: 'switchInDirection',
      direction: 'left',
      description: 'Switch to screen on left',
    },
    {
      id: 'hk_2',
      hotkey: 'Ctrl+Alt+Right',
      action: 'switchInDirection',
      direction: 'right',
      description: 'Switch to screen on right',
    },
    {
      id: 'hk_3',
      hotkey: 'ScrollLock',
      action: 'lockCursorToScreen',
      description: 'Lock cursor to current screen (Toggle)',
    },
  ]);

  const [newKey, setNewKey] = useState('');
  const [newAction, setNewAction] = useState<DeskflowActionType>('switchInDirection');
  const [newTargetScreen, setNewTargetScreen] = useState('');
  const [newDirection, setNewDirection] = useState<'left' | 'right' | 'up' | 'down'>('left');

  if (!isOpen) return null;

  const handleAddHotkey = () => {
    if (!newKey.trim()) return;
    const item: DeskflowHotkeyAction = {
      id: 'hk_' + Math.random().toString(36).substring(2, 9),
      hotkey: newKey.trim(),
      action: newAction,
      targetScreen: newAction === 'switchToScreen' ? newTargetScreen : undefined,
      direction: newAction === 'switchInDirection' ? newDirection : undefined,
      description:
        newAction === 'lockCursorToScreen'
          ? 'Lock cursor to current screen (Toggle)'
          : newAction === 'toggleSharing'
          ? 'Toggle mouse & keyboard sharing'
          : newAction === 'switchToScreen'
          ? `Switch directly to ${newTargetScreen || 'screen'}`
          : `Switch in direction ${newDirection}`,
    };
    setHotkeys([...hotkeys, item]);
    setNewKey('');
  };

  const handleRemoveHotkey = (id: string) => {
    setHotkeys(hotkeys.filter((h) => h.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl rounded-2xl flex flex-col max-h-[90vh] overflow-hidden glass-panel border border-white/[0.12] bg-[#0c0d12]/95 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] select-none">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.05] text-zinc-200">
              <Sliders className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
                  Server Configuration
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-white/[0.08] text-zinc-400">
                  Deskflow Core
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Configure screen links, keyboard hotkeys & boundary transition delays
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-ghost !p-1.5 text-zinc-400 hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-white/[0.06] select-none">
          <button
            onClick={() => setActiveTab('screens')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'screens'
                ? 'border-blue-500 text-blue-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Screens and links</span>
          </button>

          <button
            onClick={() => setActiveTab('hotkeys')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'hotkeys'
                ? 'border-blue-500 text-blue-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Keyboard className="h-3.5 w-3.5" />
            <span>Hotkeys & Actions</span>
          </button>

          <button
            onClick={() => setActiveTab('advanced')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'advanced'
                ? 'border-blue-500 text-blue-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Advanced Server Settings</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'screens' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">
                Drag and place screen icons relative to each other on the 5×5 grid.
                Double click any screen to configure aliases and dead corners.
              </p>
              <DeskflowScreenGrid
                screens={screens}
                onScreensChange={onScreensChange}
                serverHostname={serverHostname}
                serverOs={serverOs}
                interactive={true}
              />
            </div>
          )}

          {activeTab === 'hotkeys' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">
                Define global hotkeys to switch screens instantly, lock the cursor, or toggle sharing.
              </p>

              {/* Hotkeys List */}
              <div className="space-y-2">
                {hotkeys.map((h) => (
                  <div
                    key={h.id}
                    className="glass-card p-3 flex items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div className="flex items-center gap-3">
                      <kbd className="px-2 py-1 rounded bg-white/[0.08] border border-white/[0.12] text-zinc-100 font-semibold">
                        {h.hotkey}
                      </kbd>
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="text-zinc-300">{h.description}</span>
                    </div>

                    <button
                      onClick={() => handleRemoveHotkey(h.id)}
                      className="btn-ghost !p-1 text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Hotkey Form */}
              <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-3">
                <h4 className="text-xs font-semibold text-zinc-200">Add New Hotkey</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                      Hotkey Combination
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ctrl+Alt+1"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-1.5 text-zinc-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                      Action Type
                    </label>
                    <select
                      value={newAction}
                      onChange={(e) => setNewAction(e.target.value as DeskflowActionType)}
                      className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-1.5 text-zinc-100 font-mono"
                    >
                      <option value="switchInDirection" className="bg-[#12131a]">Switch in Direction</option>
                      <option value="switchToScreen" className="bg-[#12131a]">Switch to Screen</option>
                      <option value="lockCursorToScreen" className="bg-[#12131a]">Lock Cursor (Toggle)</option>
                      <option value="toggleSharing" className="bg-[#12131a]">Toggle Sharing</option>
                    </select>
                  </div>

                  {newAction === 'switchInDirection' && (
                    <div>
                      <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                        Direction
                      </label>
                      <select
                        value={newDirection}
                        onChange={(e) => setNewDirection(e.target.value as any)}
                        className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-1.5 text-zinc-100 font-mono"
                      >
                        <option value="left" className="bg-[#12131a]">Left</option>
                        <option value="right" className="bg-[#12131a]">Right</option>
                        <option value="up" className="bg-[#12131a]">Up</option>
                        <option value="down" className="bg-[#12131a]">Down</option>
                      </select>
                    </div>
                  )}

                  {newAction === 'switchToScreen' && (
                    <div>
                      <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                        Target Screen
                      </label>
                      <select
                        value={newTargetScreen}
                        onChange={(e) => setNewTargetScreen(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-1.5 text-zinc-100 font-mono"
                      >
                        <option value="">Select Screen...</option>
                        {screens.map((s) => (
                          <option key={s.id} value={s.name} className="bg-[#12131a]">
                            {s.name} {s.isServer ? '(Server)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleAddHotkey}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  <Plus className="h-3 w-3" />
                  <span>Register Hotkey</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card p-4 space-y-2">
                  <label className="text-zinc-300 block font-semibold">
                    Switch after waiting
                  </label>
                  <p className="text-[11px] text-zinc-500">
                    Delay in milliseconds before pushing cursor off screen edge
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={2000}
                      step={50}
                      value={settings.switchDelayMs}
                      onChange={(e) =>
                        onSettingsChange({
                          ...settings,
                          switchDelayMs: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-28 bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-1.5 text-zinc-100"
                    />
                    <span className="text-zinc-400">ms</span>
                  </div>
                </div>

                <div className="glass-card p-4 space-y-2">
                  <label className="text-zinc-300 block font-semibold">
                    Switch on double-tap within
                  </label>
                  <p className="text-[11px] text-zinc-500">
                    Require double bump into screen boundary to cross
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      step={25}
                      value={settings.doubleTapSwitchMs}
                      onChange={(e) =>
                        onSettingsChange({
                          ...settings,
                          doubleTapSwitchMs: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-28 bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-1.5 text-zinc-100"
                    />
                    <span className="text-zinc-400">ms</span>
                  </div>
                </div>
              </div>

              {/* Clipboard & Screensaver Sync */}
              <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-3">
                <h4 className="text-zinc-200 font-semibold">Clipboard & Session Integration</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.clipboardSharing}
                      onChange={(e) =>
                        onSettingsChange({
                          ...settings,
                          clipboardSharing: e.target.checked,
                        })
                      }
                      className="rounded border-zinc-700 bg-zinc-800 text-blue-500"
                    />
                    <span className="text-zinc-200">Synchronize clipboards automatically</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.syncScreensavers}
                      onChange={(e) =>
                        onSettingsChange({
                          ...settings,
                          syncScreensavers: e.target.checked,
                        })
                      }
                      className="rounded border-zinc-700 bg-zinc-800 text-blue-500"
                    />
                    <span className="text-zinc-200">Synchronize screensavers across all screens</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.08] select-none">
          <button onClick={onClose} className="btn-primary text-xs flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
