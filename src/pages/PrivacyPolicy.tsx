import React from 'react';
import { Shield, ArrowLeft, Lock, HardDrive, Wifi, EyeOff } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#08090a] text-zinc-300 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="ambient-background" />
      <div className="max-w-3xl mx-auto relative z-10">
        <button
          onClick={onBack}
          className="btn-ghost mb-8 text-xs !py-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to AirDesk</span>
        </button>

        <div className="glass-panel p-8 sm:p-10 border border-white/[0.08]">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Privacy Policy</h1>
              <p className="text-xs text-slate-400">Effective Date: November 14, 2026</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                <EyeOff className="h-4 w-4 text-sky-400" />
                1. Core Privacy Architecture: Zero Telemetry
              </h2>
              <p>
                AirDesk is built with a strict local-first architecture. We do not operate tracking servers,
                remote telemetry collectors, analytics platforms, or profiling pipelines. Your keystrokes,
                mouse movements, clipboard contents, IP addresses, and device identifiers remain strictly
                within your local network and are never transmitted to external cloud servers.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                <Wifi className="h-4 w-4 text-sky-400" />
                2. Local Network Communication
              </h2>
              <p>
                All data transmission occurs directly between your paired devices across your Local Area Network
                (LAN) via direct TCP and UDP sockets. Connection pairing is negotiated locally using a dynamic
                6-digit PIN and mutual token verification. Traffic does not traverse any third-party relay or cloud broker.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                <Lock className="h-4 w-4 text-sky-400" />
                3. Input Capture and Clipboard Data
              </h2>
              <p>
                To provide seamless cross-device control, AirDesk captures low-level input events (mouse cursor coordinates,
                button clicks, scroll delta, and keyboard key codes) exclusively when the cursor crosses over to the remote display:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
                <li><strong className="text-slate-200">Keyboard Input:</strong> Keystrokes are captured only while an active session controls the remote screen. Key events are discarded immediately after socket delivery.</li>
                <li><strong className="text-slate-200">Clipboard Data:</strong> When enabled, text copied to the system clipboard is hashed locally and forwarded to the paired device. No history or persistent clipboard database is stored.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-sky-400" />
                4. Operating System Permissions
              </h2>
              <p>
                On macOS, AirDesk requires Accessibility permissions in System Settings strictly to synthesize mouse
                movement and key event taps via CoreGraphics APIs. On Windows, low-level hooks (WH_MOUSE_LL and WH_KEYBOARD_LL)
                are utilized. These privileges are utilized solely for user-directed real-time control.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-2">
                5. Changes to This Policy
              </h2>
              <p>
                Any updates to this policy will be reflected in the application release notes and updated repository
                documentation.
              </p>
            </section>

            <div className="pt-6 border-t border-white/10 text-xs text-slate-500">
              For security disclosures or architecture verification, inspect the open-source codebase directly.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
