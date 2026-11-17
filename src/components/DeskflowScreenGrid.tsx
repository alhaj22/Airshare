import React, { useState } from 'react';
import type { DeskflowScreen, DeviceOS } from '../types';
import {
  Monitor,
  Trash2,
  Plus,
  Settings2,
  Check,
  X,
} from 'lucide-react';
import { OsIcon } from './OsIcon';

interface DeskflowScreenGridProps {
  screens: DeskflowScreen[];
  onScreensChange: (screens: DeskflowScreen[]) => void;
  serverHostname: string;
  serverOs: DeviceOS;
  interactive?: boolean;
}

export const DeskflowScreenGrid: React.FC<DeskflowScreenGridProps> = ({
  screens,
  onScreensChange,
  serverHostname,
  serverOs,
  interactive = true,
}) => {
  const [editingScreen, setEditingScreen] = useState<DeskflowScreen | null>(null);
  const [draggedScreenId, setDraggedScreenId] = useState<string | null>(null);
  const [draggedFromTray, setDraggedFromTray] = useState(false);

  // Helper to locate screen at row, col
  const getScreenAt = (r: number, c: number) => {
    return screens.find((s) => s.row === r && s.col === c);
  };

  const handleCellClick = (r: number, c: number) => {
    if (!interactive) return;
    const existing = getScreenAt(r, c);
    if (existing) {
      setEditingScreen(existing);
    } else {
      // Add a new client screen at this cell
      const newScreen: DeskflowScreen = {
        id: 'screen_' + Math.random().toString(36).substring(2, 9),
        name: `Client-${screens.length}`,
        isServer: false,
        row: r,
        col: c,
        os: 'macos',
        deadCorners: {
          topLeft: false,
          topRight: false,
          bottomLeft: false,
          bottomRight: false,
        },
        cornerSizePx: 15,
        switchDelayMs: 0,
      };
      onScreensChange([...screens, newScreen]);
      setEditingScreen(newScreen);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!interactive) return;
    e.dataTransfer.setData('text/plain', id);
    setDraggedScreenId(id);
    setDraggedFromTray(false);
  };

  const handleTrayDragStart = (e: React.DragEvent) => {
    if (!interactive) return;
    e.dataTransfer.setData('text/plain', '__NEW_SCREEN__');
    setDraggedFromTray(true);
    setDraggedScreenId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropCell = (r: number, c: number) => {
    if (!interactive) return;
    const targetExisting = getScreenAt(r, c);

    if (draggedFromTray) {
      if (targetExisting) return; // Cell occupied
      const newScreen: DeskflowScreen = {
        id: 'screen_' + Math.random().toString(36).substring(2, 9),
        name: `Client-${screens.length}`,
        isServer: false,
        row: r,
        col: c,
        os: 'macos',
        deadCorners: {
          topLeft: false,
          topRight: false,
          bottomLeft: false,
          bottomRight: false,
        },
        cornerSizePx: 15,
        switchDelayMs: 0,
      };
      onScreensChange([...screens, newScreen]);
      setEditingScreen(newScreen);
      setDraggedFromTray(false);
      return;
    }

    if (draggedScreenId) {
      if (targetExisting && targetExisting.id !== draggedScreenId) {
        // Swap positions
        const updated = screens.map((s) => {
          if (s.id === draggedScreenId) {
            return { ...s, row: r, col: c };
          }
          if (s.id === targetExisting.id) {
            const origin = screens.find((x) => x.id === draggedScreenId);
            return { ...s, row: origin ? origin.row : r, col: origin ? origin.col : c };
          }
          return s;
        });
        onScreensChange(updated);
      } else {
        // Move to empty cell
        const updated = screens.map((s) =>
          s.id === draggedScreenId ? { ...s, row: r, col: c } : s
        );
        onScreensChange(updated);
      }
      setDraggedScreenId(null);
    }
  };

  const handleDropTrash = () => {
    if (!draggedScreenId) return;
    const target = screens.find((s) => s.id === draggedScreenId);
    if (target?.isServer) {
      alert('Cannot remove the Server screen from the layout.');
      setDraggedScreenId(null);
      return;
    }
    onScreensChange(screens.filter((s) => s.id !== draggedScreenId));
    setDraggedScreenId(null);
  };

  const handleSaveEdit = (updated: DeskflowScreen) => {
    onScreensChange(screens.map((s) => (s.id === updated.id ? updated : s)));
    setEditingScreen(null);
  };

  const handleDeleteEditing = () => {
    if (!editingScreen) return;
    if (editingScreen.isServer) {
      alert('Cannot remove the Server screen from the layout.');
      return;
    }
    onScreensChange(screens.filter((s) => s.id !== editingScreen.id));
    setEditingScreen(null);
  };

  return (
    <div className="space-y-3">
      {/* Tray & Controls Bar */}
      {interactive && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08]">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-zinc-400">Add Screen:</span>
            <div
              draggable
              onDragStart={handleTrayDragStart}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] text-xs font-medium text-zinc-200 cursor-grab hover:bg-white/[0.08] active:cursor-grabbing transition-all select-none"
              title="Drag this screen icon onto any empty grid cell"
            >
              <Monitor className="h-3.5 w-3.5 text-blue-400" />
              <span>New Screen</span>
            </div>
          </div>

          <div
            onDragOver={handleDragOver}
            onDrop={handleDropTrash}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-red-500/30 bg-red-500/5 text-xs text-red-300 font-mono"
            title="Drag a screen here to remove it"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
            <span>Trash</span>
          </div>
        </div>
      )}

      {/* 5x5 Grid Matrix (Deskflow Standard) */}
      <div className="p-3 sm:p-4 rounded-2xl bg-[#07080a] border border-white/[0.08] shadow-inner select-none">
        <div className="grid grid-cols-5 gap-2 sm:gap-2.5 aspect-[5/3.2] max-w-2xl mx-auto">
          {[0, 1, 2, 3, 4].map((r) =>
            [0, 1, 2, 3, 4].map((c) => {
              const sc = getScreenAt(r, c);
              const isCenter = r === 2 && c === 2;

              return (
                <div
                  key={`${r}-${c}`}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDropCell(r, c)}
                  onClick={() => handleCellClick(r, c)}
                  className={`relative rounded-xl border flex flex-col items-center justify-center p-2 text-center transition-all cursor-pointer ${
                    sc
                      ? sc.isServer
                        ? 'border-blue-500/40 bg-blue-500/[0.08] hover:border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.12)]'
                        : 'border-white/[0.12] bg-white/[0.04] hover:border-white/[0.22] hover:bg-white/[0.06]'
                      : isCenter
                      ? 'border-dashed border-blue-500/20 bg-blue-500/[0.02]'
                      : 'border-dashed border-white/[0.05] bg-white/[0.01] hover:border-white/[0.15] hover:bg-white/[0.03]'
                  }`}
                >
                  {sc ? (
                    <div
                      draggable={interactive}
                      onDragStart={(e) => handleDragStart(e, sc.id)}
                      className="w-full h-full flex flex-col items-center justify-center gap-1"
                    >
                      <div className="relative">
                        <Monitor
                          className={`h-5 w-5 sm:h-6 sm:w-6 ${
                            sc.isServer ? 'text-blue-400' : 'text-zinc-300'
                          }`}
                        />
                        {(sc.os || (sc.isServer ? serverOs : undefined)) && (
                          <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-black/90 border border-white/20">
                            <OsIcon os={sc.os || serverOs} className="h-2.5 w-2.5 text-zinc-300" />
                          </div>
                        )}
                      </div>

                      <span
                        className={`text-[10px] sm:text-xs font-semibold truncate max-w-[85%] ${
                          sc.isServer ? 'text-blue-200' : 'text-zinc-200'
                        }`}
                        title={sc.name}
                      >
                        {sc.name || (sc.isServer ? serverHostname : 'Client')}
                      </span>

                      {sc.isServer && (
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded border border-blue-500/30 bg-blue-500/10 text-blue-300">
                          SERVER
                        </span>
                      )}

                      {!sc.isServer && sc.isConnected && (
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                          ONLINE
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="opacity-0 hover:opacity-100 flex flex-col items-center gap-0.5 text-zinc-500 transition-opacity">
                      <Plus className="h-3 w-3" />
                      <span className="text-[9px] font-mono">Add</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Screen Properties / Settings Modal */}
      {editingScreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl p-6 glass-panel border border-white/[0.12] bg-[#0c0d12]/95 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-zinc-100">
                  Screen Settings ({editingScreen.name})
                </h3>
              </div>
              <button
                onClick={() => setEditingScreen(null)}
                className="btn-ghost !p-1 text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Screen Name Input */}
              <div>
                <label className="text-zinc-400 font-mono block mb-1">
                  Screen Name (must match client hostname)
                </label>
                <input
                  type="text"
                  value={editingScreen.name}
                  onChange={(e) =>
                    setEditingScreen({ ...editingScreen, name: e.target.value })
                  }
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                  placeholder="e.g. MacBook-Air or DESKTOP-PC"
                />
              </div>

              {/* OS Type */}
              <div>
                <label className="text-zinc-400 font-mono block mb-1">
                  Operating System
                </label>
                <select
                  value={editingScreen.os || 'windows'}
                  onChange={(e) =>
                    setEditingScreen({
                      ...editingScreen,
                      os: e.target.value as DeviceOS,
                    })
                  }
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-zinc-100 font-mono focus:outline-none focus:border-blue-500"
                >
                  <option value="windows" className="bg-[#12131a]">Windows</option>
                  <option value="macos" className="bg-[#12131a]">macOS</option>
                  <option value="linux" className="bg-[#12131a]">Linux</option>
                </select>
              </div>

              {/* Dead Corners Configuration (Deskflow Specialty) */}
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-zinc-300 font-medium">
                    Dead Corners
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Prevents accidental edge switching
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono">
                  <label className="glass-card p-2 flex items-center justify-between cursor-pointer">
                    <span className="text-zinc-300">Top-Left</span>
                    <input
                      type="checkbox"
                      checked={editingScreen.deadCorners.topLeft}
                      onChange={(e) =>
                        setEditingScreen({
                          ...editingScreen,
                          deadCorners: {
                            ...editingScreen.deadCorners,
                            topLeft: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-zinc-700 bg-zinc-800 text-blue-500"
                    />
                  </label>

                  <label className="glass-card p-2 flex items-center justify-between cursor-pointer">
                    <span className="text-zinc-300">Top-Right</span>
                    <input
                      type="checkbox"
                      checked={editingScreen.deadCorners.topRight}
                      onChange={(e) =>
                        setEditingScreen({
                          ...editingScreen,
                          deadCorners: {
                            ...editingScreen.deadCorners,
                            topRight: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-zinc-700 bg-zinc-800 text-blue-500"
                    />
                  </label>

                  <label className="glass-card p-2 flex items-center justify-between cursor-pointer">
                    <span className="text-zinc-300">Bottom-Left</span>
                    <input
                      type="checkbox"
                      checked={editingScreen.deadCorners.bottomLeft}
                      onChange={(e) =>
                        setEditingScreen({
                          ...editingScreen,
                          deadCorners: {
                            ...editingScreen.deadCorners,
                            bottomLeft: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-zinc-700 bg-zinc-800 text-blue-500"
                    />
                  </label>

                  <label className="glass-card p-2 flex items-center justify-between cursor-pointer">
                    <span className="text-zinc-300">Bottom-Right</span>
                    <input
                      type="checkbox"
                      checked={editingScreen.deadCorners.bottomRight}
                      onChange={(e) =>
                        setEditingScreen({
                          ...editingScreen,
                          deadCorners: {
                            ...editingScreen.deadCorners,
                            bottomRight: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-zinc-700 bg-zinc-800 text-blue-500"
                    />
                  </label>
                </div>
              </div>

              {/* Corner Size & Switch Delay */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-zinc-400 font-mono block mb-1">
                    Corner Size (px)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={editingScreen.cornerSizePx}
                    onChange={(e) =>
                      setEditingScreen({
                        ...editingScreen,
                        cornerSizePx: parseInt(e.target.value, 10) || 15,
                      })
                    }
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-1.5 text-zinc-100 font-mono"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 font-mono block mb-1">
                    Switch Delay (ms)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={2000}
                    step={50}
                    value={editingScreen.switchDelayMs}
                    onChange={(e) =>
                      setEditingScreen({
                        ...editingScreen,
                        switchDelayMs: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-1.5 text-zinc-100 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
              {!editingScreen.isServer ? (
                <button
                  onClick={handleDeleteEditing}
                  className="btn-ghost !text-red-400 hover:!bg-red-500/10 text-xs flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove Screen</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingScreen(null)}
                  className="btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveEdit(editingScreen)}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
