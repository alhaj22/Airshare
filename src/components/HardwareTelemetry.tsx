import React, { useState } from 'react';
import type {
  HidDeviceInfo,
  KeyboardDeviceInfo,
  LayoutCalibrationData,
  MonitorInfo,
  PhysicalLayoutType,
  RgbLightingMode,
  SystemHardwareMetrics,
} from '../types';
import { api } from '../services/tauriBridge';
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
  Sparkles,
  Palette,
  Sliders,
  CheckCircle2,
  X,
  Zap,
} from 'lucide-react';

interface HardwareTelemetryProps {
  monitors: MonitorInfo[];
  keyboards: KeyboardDeviceInfo[];
  hidKeyboards?: HidDeviceInfo[];
  hardwareMetrics: SystemHardwareMetrics | null;
  onBrightnessChange: (monitorId: string, brightness: number) => void;
  onContrastChange: (monitorId: string, contrast: number) => void;
  onRefresh: () => void;
}

const BRAND_BADGE_STYLE: Record<
  string,
  { label: string; border: string; bg: string; text: string }
> = {
  logitech_g: {
    label: 'Logitech G LIGHTSPEED',
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-300',
  },
  razer: {
    label: 'Razer Chroma RGB',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-300',
  },
  corsair: {
    label: 'Corsair iCUE',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
  },
  steel_series: {
    label: 'SteelSeries Engine',
    border: 'border-orange-500/30',
    bg: 'bg-orange-500/10',
    text: 'text-orange-300',
  },
  hyper_x: {
    label: 'HyperX NGENUITY',
    border: 'border-red-500/30',
    bg: 'bg-red-500/10',
    text: 'text-red-300',
  },
  keychron: {
    label: 'Keychron QMK/VIA',
    border: 'border-indigo-500/30',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-300',
  },
  redragon: {
    label: 'Redragon Gaming',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/10',
    text: 'text-rose-300',
  },
  standard: {
    label: 'Standard HID',
    border: 'border-white/10',
    bg: 'bg-white/5',
    text: 'text-zinc-300',
  },
};

export const HardwareTelemetry: React.FC<HardwareTelemetryProps> = ({
  monitors,
  keyboards,
  hidKeyboards = [],
  hardwareMetrics,
  onBrightnessChange,
  onContrastChange,
  onRefresh,
}) => {
  // Calibration Modal State
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calIsoKey, setCalIsoKey] = useState(false);
  const [calEnterIso, setCalEnterIso] = useState(false);
  const [calRoKey, setCalRoKey] = useState(false);
  const [calYenKey, setCalYenKey] = useState(false);
  const [calStatusMsg, setCalStatusMsg] = useState<string | null>(null);

  // RGB Control Modal State
  const [selectedRgbDevice, setSelectedRgbDevice] = useState<HidDeviceInfo | null>(null);
  const [rgbColor, setRgbColor] = useState('#00e5ff');
  const [rgbMode, setRgbMode] = useState<'static_color' | 'breathing' | 'rainbow_wave' | 'reactive' | 'off'>('rainbow_wave');
  const [rgbFeedback, setRgbFeedback] = useState<string | null>(null);

  const handleApplyRgb = async () => {
    if (!selectedRgbDevice) return;
    try {
      const hex = rgbColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;

      let modePayload: RgbLightingMode;
      if (rgbMode === 'static_color') {
        modePayload = { type: 'static_color', r, g, b };
      } else if (rgbMode === 'breathing') {
        modePayload = { type: 'breathing', r, g, b, speed: 5 };
      } else if (rgbMode === 'rainbow_wave') {
        modePayload = { type: 'rainbow_wave', speed: 8 };
      } else if (rgbMode === 'reactive') {
        modePayload = { type: 'reactive', r, g, b };
      } else {
        modePayload = { type: 'off' };
      }

      const res = await api.setGamingRgbMode(selectedRgbDevice.device_id, modePayload);
      setRgbFeedback(res);
      setTimeout(() => setRgbFeedback(null), 3000);
    } catch (err) {
      setRgbFeedback(String(err));
      setTimeout(() => setRgbFeedback(null), 4000);
    }
  };

  const handleExecuteCalibration = async () => {
    let physical: PhysicalLayoutType = 'ansi';
    if (calRoKey || calYenKey) {
      physical = 'jis';
    } else if (calIsoKey || calEnterIso) {
      physical = 'iso';
    }

    const payload: LayoutCalibrationData = {
      key_0x64_present: calIsoKey,
      enter_is_iso: calEnterIso,
      has_ro_key: calRoKey,
      has_yen_key: calYenKey,
      detected_physical: physical,
    };

    try {
      const profile = await api.calibrateKeyboardLayout(payload);
      setCalStatusMsg(`Successfully calibrated: ${profile.name} (${profile.physical.toUpperCase()})`);
      setTimeout(() => {
        setIsCalibrating(false);
        setCalStatusMsg(null);
        onRefresh();
      }, 1800);
    } catch (err) {
      setCalStatusMsg(`Calibration failed: ${err}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
            Hardware & Platform Telemetry
          </h2>
          <p className="text-xs text-zinc-500">
            Real-time monitor DDC/CI controls, gaming HID profiles & universal layout detection
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCalibrating(true)}
            className="btn-secondary !py-1 !px-2.5 text-xs flex items-center gap-1.5"
            title="Calibrate physical keyboard layout (ANSI/ISO/JIS)"
          >
            <Sliders className="h-3 w-3 text-blue-400" />
            <span>Calibrate Layout</span>
          </button>

          <button
            onClick={onRefresh}
            className="btn-ghost !py-1 !px-2.5 text-xs flex items-center gap-1.5"
            title="Refresh hardware status"
          >
            <RotateCw className="h-3 w-3 text-zinc-400" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ─── Connected Displays & DDC/CI Controls ─── */}
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

        {/* ─── Connected Keyboards & Gaming HID Profiles ─── */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-300">
                <Keyboard className="h-3.5 w-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-100 tracking-tight">
                  Universal Gaming & HID Keyboards ({Math.max(keyboards.length, hidKeyboards.length)})
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Raw Input, NKRO, 8000Hz polling & ANSI/ISO/JIS engines
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/[0.08] text-zinc-400">
              Hot-Plug Aware
            </span>
          </div>

          {keyboards.length === 0 && hidKeyboards.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              Detecting active keyboard devices...
            </div>
          ) : (
            <div className="space-y-3">
              {/* If hidKeyboards is available from backend, display detailed hardware cards */}
              {hidKeyboards.length > 0
                ? hidKeyboards.map((dev) => {
                    const caps = dev.gaming_capabilities;
                    const brandStyle =
                      BRAND_BADGE_STYLE[caps?.brand || 'standard'] ||
                      BRAND_BADGE_STYLE.standard;

                    return (
                      <div
                        key={dev.device_id}
                        className="glass-card p-3 space-y-2 border border-white/[0.06] hover:border-white/[0.12] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-zinc-100 truncate">
                                {dev.name}
                              </span>

                              {caps && (
                                <span
                                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${brandStyle.border} ${brandStyle.bg} ${brandStyle.text}`}
                                >
                                  {brandStyle.label}
                                </span>
                              )}

                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-white/[0.08] bg-white/[0.03] text-zinc-300 uppercase">
                                {dev.physical_layout} Layout
                              </span>
                            </div>

                            <p className="text-[10px] font-mono text-zinc-500 mt-1">
                              VID: 0x{dev.vendor_id.toString(16).padStart(4, '0')} • PID: 0x{dev.product_id.toString(16).padStart(4, '0')} • Usage Page: 0x{dev.usage_page.toString(16).padStart(2, '0')}
                            </p>
                          </div>

                          {/* RGB Action Button if Supported */}
                          {caps?.has_rgb_subsystem && (
                            <button
                              onClick={() => setSelectedRgbDevice(dev)}
                              className="btn-ghost !p-1.5 text-zinc-400 hover:text-amber-300"
                              title="Configure Hardware RGB Lighting"
                            >
                              <Palette className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Gaming Capabilities Badges */}
                        {caps && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/[0.04]">
                            {caps.max_polling_rate_hz >= 1000 && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 flex items-center gap-1">
                                <Zap className="h-2.5 w-2.5" /> {caps.max_polling_rate_hz}Hz
                              </span>
                            )}
                            {caps.supports_nkro && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-blue-500/25 bg-blue-500/10 text-blue-300">
                                NKRO (N-Key Rollover)
                              </span>
                            )}
                            {caps.has_dedicated_macro_keys && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-purple-500/25 bg-purple-500/10 text-purple-300">
                                {caps.macro_key_count} Dedicated Macro Keys
                              </span>
                            )}
                            {caps.has_volume_wheel && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-amber-500/25 bg-amber-500/10 text-amber-300">
                                Volume Wheel Active
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                : keyboards.map((kb) => (
                    <div
                      key={kb.device_id}
                      className="glass-card p-3 flex items-center justify-between gap-3"
                    >
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

      {/* ─── Layout Calibration Modal ─── */}
      {isCalibrating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-2xl p-6 glass-panel border border-white/[0.12] bg-[#0c0d12]/95 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-zinc-100">
                  Keyboard Layout Calibration
                </h3>
              </div>
              <button
                onClick={() => setIsCalibrating(false)}
                className="btn-ghost !p-1 text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              AirDesk auto-detects standard ANSI, European ISO, and Japanese JIS hardware.
              Test or toggle specific discriminator keys below to tune your hardware profile:
            </p>

            <div className="space-y-3 font-mono text-xs">
              <label className="glass-card p-3 flex items-center justify-between cursor-pointer hover:border-white/[0.15] transition-colors">
                <div>
                  <p className="text-zinc-200 font-medium">Non-US Backslash Key (&lt; &gt; |)</p>
                  <p className="text-[11px] text-zinc-500">Key 0x64 between Left Shift and Z (ISO characteristic)</p>
                </div>
                <input
                  type="checkbox"
                  checked={calIsoKey}
                  onChange={(e) => setCalIsoKey(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-0"
                />
              </label>

              <label className="glass-card p-3 flex items-center justify-between cursor-pointer hover:border-white/[0.15] transition-colors">
                <div>
                  <p className="text-zinc-200 font-medium">Tall L-Shaped Enter Key</p>
                  <p className="text-[11px] text-zinc-500">2-row Enter key found on UK, German & European ISO boards</p>
                </div>
                <input
                  type="checkbox"
                  checked={calEnterIso}
                  onChange={(e) => setCalEnterIso(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-0"
                />
              </label>

              <label className="glass-card p-3 flex items-center justify-between cursor-pointer hover:border-white/[0.15] transition-colors">
                <div>
                  <p className="text-zinc-200 font-medium">Japanese Ro (ろ) / Yen (¥) Keys</p>
                  <p className="text-[11px] text-zinc-500">JIS-specific conversion and currency keys (0x87, 0x89)</p>
                </div>
                <input
                  type="checkbox"
                  checked={calRoKey}
                  onChange={(e) => {
                    setCalRoKey(e.target.checked);
                    setCalYenKey(e.target.checked);
                  }}
                  className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-0"
                />
              </label>
            </div>

            {calStatusMsg && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>{calStatusMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                onClick={() => setIsCalibrating(false)}
                className="btn-ghost text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteCalibration}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Apply Calibration</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── RGB Lighting Control Modal ─── */}
      {selectedRgbDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl p-6 glass-panel border border-white/[0.12] bg-[#0c0d12]/95 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-zinc-100">
                  Hardware RGB Subsystem
                </h3>
              </div>
              <button
                onClick={() => setSelectedRgbDevice(null)}
                className="btn-ghost !p-1 text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Controlling lighting on <span className="text-zinc-200 font-medium">{selectedRgbDevice.name}</span>
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1.5">
                  Lighting Mode
                </label>
                <select
                  value={rgbMode}
                  onChange={(e) => setRgbMode(e.target.value as any)}
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-blue-500"
                >
                  <option value="rainbow_wave" className="bg-[#12131a]">Rainbow Wave</option>
                  <option value="static_color" className="bg-[#12131a]">Static Color</option>
                  <option value="breathing" className="bg-[#12131a]">Breathing</option>
                  <option value="reactive" className="bg-[#12131a]">Reactive Typing</option>
                  <option value="off" className="bg-[#12131a]">LEDs Off</option>
                </select>
              </div>

              {(rgbMode === 'static_color' || rgbMode === 'breathing' || rgbMode === 'reactive') && (
                <div>
                  <label className="text-xs font-mono text-zinc-400 block mb-1.5">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={rgbColor}
                      onChange={(e) => setRgbColor(e.target.value)}
                      className="h-8 w-12 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-xs font-mono text-zinc-300">{rgbColor.toUpperCase()}</span>
                  </div>
                </div>
              )}
            </div>

            {rgbFeedback && (
              <p className="text-xs font-mono text-amber-300 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                {rgbFeedback}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                onClick={() => setSelectedRgbDevice(null)}
                className="btn-ghost text-xs"
              >
                Close
              </button>
              <button
                onClick={handleApplyRgb}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <Palette className="h-3.5 w-3.5" />
                <span>Apply RGB</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
