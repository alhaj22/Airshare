import React from 'react';
import type { KeyboardDeviceInfo, MonitorInfo, SystemHardwareMetrics } from '../types';
import {
  Monitor,
  Keyboard,
  Cpu,
  HardDrive,
  Battery,
  Sun,
  Contrast,
  RotateCw,
  Tv,
} from 'lucide-react';

interface HardwareTelemetryProps {
  monitors: MonitorInfo[];
  keyboards: KeyboardDeviceInfo[];
  hardwareMetrics: SystemHardwareMetrics | null;
  onBrightnessChange: (monitorId: string, brightness: number) => void;
  onContrastChange: (monitorId: string, contrast: number) => void;
  onRefresh: () => void;
}

export const HardwareTelemetry: React.FC<HardwareTelemetryProps> = ({
  monitors,
  keyboards,
  hardwareMetrics,
  onBrightnessChange,
  onContrastChange,
  onRefresh,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
            Hardware & Platform Telemetry
          </h2>
          <p className="text-xs text-zinc-500">
            Real-time monitor DDC/CI controls, keyboard HID profiles & system diagnostics
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="btn-ghost !py-1 !px-2.5 text-xs flex items-center gap-1.5"
          title="Refresh hardware status"
        >
          <RotateCw className="h-3 w-3 text-zinc-400" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ─── Connected Monitors & DDC/CI Controls ─── */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-300">
                <Monitor className="h-3.5 w-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-100 tracking-tight">
                  Connected Displays ({monitors.length})
                </h3>
                <p className="text-[11px] text-zinc-500">
                  DDC/CI hardware brightness & contrast
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/[0.08] text-zinc-400">
              DXVA2 / CoreGraphics
            </span>
          </div>

          {monitors.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              Scanning for connected displays...
            </div>
          ) : (
            <div className="space-y-3.5">
              {monitors.map((m) => (
                <div key={m.id} className="glass-card p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-zinc-200">
                          {m.name}
                        </span>
                        {m.is_primary && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-blue-500/30 bg-blue-500/10 text-blue-300">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                        {m.width}×{m.height} @ {m.refresh_rate}Hz • {m.manufacturer} {m.model}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-[10px] font-mono text-zinc-400">
                        Scale: {(m.scale_factor * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* DDC/CI Hardware Sliders */}
                  {m.ddc_ci_supported && (
                    <div className="pt-2 border-t border-white/[0.05] space-y-2.5">
                      {/* Brightness */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                          <span className="flex items-center gap-1.5">
                            <Sun className="h-3 w-3 text-amber-400" /> Brightness
                          </span>
                          <span>{m.current_brightness ?? 75}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={m.current_brightness ?? 75}
                          onChange={(e) =>
                            onBrightnessChange(m.id, parseInt(e.target.value, 10))
                          }
                          className="w-full h-1 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>

                      {/* Contrast */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                          <span className="flex items-center gap-1.5">
                            <Contrast className="h-3 w-3 text-blue-400" /> Contrast
                          </span>
                          <span>{m.current_contrast ?? 50}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={m.current_contrast ?? 50}
                          onChange={(e) =>
                            onContrastChange(m.id, parseInt(e.target.value, 10))
                          }
                          className="w-full h-1 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Connected Keyboards & HID Profiles ─── */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-300">
                <Keyboard className="h-3.5 w-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-100 tracking-tight">
                  Connected Keyboards ({keyboards.length})
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Raw Input & HID device inspection
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/[0.08] text-zinc-400">
              Hot-Plug Aware
            </span>
          </div>

          {keyboards.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              Detecting active keyboard devices...
            </div>
          ) : (
            <div className="space-y-2.5">
              {keyboards.map((kb) => (
                <div key={kb.device_id} className="glass-card p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-200 truncate">
                        {kb.name}
                      </span>
                      {kb.is_mac_keyboard ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-purple-500/30 bg-purple-500/10 text-purple-300">
                          Mac Layout (⌘)
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-blue-500/30 bg-blue-500/10 text-blue-300">
                          PC Layout (Win)
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] font-mono text-zinc-500 mt-1">
                      VID: 0x{kb.vendor_id.toString(16).padStart(4, '0')} • PID: 0x{kb.product_id.toString(16).padStart(4, '0')} • {kb.connection_type}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.03] text-zinc-300">
                      {kb.layout_type} ({kb.active_language_layout})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* System Hardware Diagnostics Card */}
          {hardwareMetrics && (
            <div className="pt-3 border-t border-white/[0.07] space-y-2.5">
              <h4 className="text-[11px] uppercase tracking-wider text-zinc-500 font-mono">
                System Diagnostics
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="glass-card p-2.5">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
                    <Cpu className="h-3 w-3 text-zinc-400" /> CPU
                  </div>
                  <p className="text-zinc-200 mt-1 truncate text-[11px]">
                    {hardwareMetrics.cpu_name}
                  </p>
                  <p className="text-zinc-500 text-[10px]">{hardwareMetrics.cpu_cores} Cores</p>
                </div>

                <div className="glass-card p-2.5">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
                    <HardDrive className="h-3 w-3 text-zinc-400" /> RAM
                  </div>
                  <p className="text-zinc-200 mt-1 text-[11px]">
                    {Math.round(hardwareMetrics.available_ram_mb / 1024)}GB Free
                  </p>
                  <p className="text-zinc-500 text-[10px]">
                    / {Math.round(hardwareMetrics.total_ram_mb / 1024)}GB Total
                  </p>
                </div>

                <div className="glass-card p-2.5">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
                    <Tv className="h-3 w-3 text-zinc-400" /> GPU
                  </div>
                  <p className="text-zinc-200 mt-1 truncate text-[11px]">
                    {hardwareMetrics.gpu_name}
                  </p>
                </div>

                <div className="glass-card p-2.5">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
                    <Battery className="h-3 w-3 text-zinc-400" /> Battery
                  </div>
                  <p className="text-zinc-200 mt-1 text-[11px]">
                    {hardwareMetrics.battery_percentage !== undefined
                      ? `${hardwareMetrics.battery_percentage}%`
                      : 'AC Power'}
                    {hardwareMetrics.is_charging && ' (Charging)'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
