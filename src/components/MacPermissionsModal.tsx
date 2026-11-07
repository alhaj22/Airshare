import React, { useState } from 'react';
import { X, Apple, Shield, ExternalLink, CheckCircle } from 'lucide-react';
import { api } from '../services/tauriBridge';

interface MacPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MacPermissionsModal: React.FC<MacPermissionsModalProps> = ({ isOpen, onClose }) => {
  const [isChecked, setIsChecked] = useState(false);

  if (!isOpen) return null;

  const handleOpenSettings = async () => {
    await api.openAccessibilitySettings();
  };

  const handleVerify = async () => {
    const trusted = await api.checkAccessibility();
    if (trusted) {
      setIsChecked(true);
      setTimeout(() => {
        onClose();
      }, 800);
    } else {
      alert('Accessibility permission is still not granted. In System Settings > Privacy & Security > Accessibility, make sure the switch for Terminal or AirDesk is toggled ON.');
    }
  };

  const steps = [
    {
      num: 1,
      title: 'Open System Settings',
      desc: 'Click the button below to directly open Accessibility Settings on this Mac.',
      icon: <Apple className="h-4 w-4" />,
    },
    {
      num: 2,
      title: 'Privacy & Security → Accessibility',
      desc: 'Look for "AirDesk" or "Terminal" / "iTerm" in the Accessibility list.',
      icon: <Shield className="h-4 w-4" />,
    },
    {
      num: 3,
      title: 'Toggle Switch to ON',
      desc: 'Turn the switch ON (enter your Mac password if asked). If already in the list, toggle it OFF and back ON.',
      icon: <CheckCircle className="h-4 w-4" />,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-6 fade-in shadow-2xl border border-sky-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)' }}
            >
              <Apple className="h-6 w-6 text-sky-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">macOS Accessibility Setup</h2>
              <p className="text-xs text-sky-300">Required to receive mouse clicks & keyboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Important Alert */}
        <div className="rounded-lg p-3 mb-4 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 leading-relaxed">
          ⚠️ <strong>Required for clicks & typing:</strong> macOS blocks all simulated mouse clicks and keyboard keystrokes until Accessibility permission is granted in System Settings.
        </div>

        {/* Steps */}
        <div className="space-y-3.5 mb-6">
          {steps.map((step) => (
            <div key={step.num} className="flex gap-3 items-start">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                {step.num}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  {step.title}
                </p>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleOpenSettings}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-all cursor-pointer shadow-lg shadow-sky-500/20"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Open System Settings Now</span>
          </button>

          <button
            onClick={handleVerify}
            className="w-full py-2 px-4 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 transition-all cursor-pointer border border-white/10"
          >
            {isChecked ? '✓ Permission Granted!' : 'I Have Enabled It (Verify & Continue)'}
          </button>
        </div>
      </div>
    </div>
  );
};
