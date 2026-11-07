import React from 'react';
import { Mouse, Keyboard, Clipboard, Shuffle } from 'lucide-react';

interface FeaturesBarProps {
  mouseSharing: boolean;
  setMouseSharing: (v: boolean) => void;
  keyboardSharing: boolean;
  setKeyboardSharing: (v: boolean) => void;
  clipboardSharing: boolean;
  setClipboardSharing: (v: boolean) => void;
  keyboardMapping: boolean;
  setKeyboardMapping: (v: boolean) => void;
}

interface FeatureToggle {
  icon: React.ReactNode;
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  color: string;
  glowColor: string;
}

export const FeaturesBar: React.FC<FeaturesBarProps> = ({
  mouseSharing,
  setMouseSharing,
  keyboardSharing,
  setKeyboardSharing,
  clipboardSharing,
  setClipboardSharing,
  keyboardMapping,
  setKeyboardMapping,
}) => {
  const features: FeatureToggle[] = [
    {
      icon: <Mouse className="h-4 w-4" />,
      label: 'Mouse',
      desc: 'Pointer, clicks & scroll',
      value: mouseSharing,
      onChange: setMouseSharing,
      color: '#0ea5e9',
      glowColor: 'rgba(14,165,233,0.15)',
    },
    {
      icon: <Keyboard className="h-4 w-4" />,
      label: 'Keyboard',
      desc: 'Keystrokes & shortcuts',
      value: keyboardSharing,
      onChange: setKeyboardSharing,
      color: '#a78bfa',
      glowColor: 'rgba(167,139,250,0.15)',
    },
    {
      icon: <Clipboard className="h-4 w-4" />,
      label: 'Clipboard',
      desc: 'Ctrl+C / Cmd+V sync',
      value: clipboardSharing,
      onChange: setClipboardSharing,
      color: '#10b981',
      glowColor: 'rgba(16,185,129,0.15)',
    },
    {
      icon: <Shuffle className="h-4 w-4" />,
      label: 'Key Mapping',
      desc: 'Win↔Mac shortcut translate',
      value: keyboardMapping,
      onChange: setKeyboardMapping,
      color: '#f59e0b',
      glowColor: 'rgba(245,158,11,0.15)',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {features.map((f) => (
        <button
          key={f.label}
          onClick={() => f.onChange(!f.value)}
          className="flex items-center gap-3 rounded-xl p-3 text-left transition-all duration-150 cursor-pointer select-none w-full"
          style={{
            background: f.value ? f.glowColor : 'rgba(255,255,255,0.02)',
            border: `1px solid ${f.value ? f.color + '44' : 'rgba(255,255,255,0.07)'}`,
          }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 transition-colors"
            style={{
              background: f.value ? f.color + '22' : 'rgba(255,255,255,0.05)',
              color: f.value ? f.color : '#475569',
            }}
          >
            {f.icon}
          </div>
          <div className="min-w-0">
            <p
              className="text-xs font-semibold truncate"
              style={{ color: f.value ? '#f1f5f9' : '#64748b' }}
            >
              {f.label}
            </p>
            <p className="text-[10px] truncate" style={{ color: '#475569' }}>
              {f.desc}
            </p>
          </div>
          {/* Toggle dot */}
          <div className="ml-auto flex-shrink-0">
            <div
              className="h-4 w-4 rounded-full border-2 transition-all"
              style={{
                background: f.value ? f.color : 'transparent',
                borderColor: f.value ? f.color : '#334155',
                boxShadow: f.value ? `0 0 8px ${f.color}66` : 'none',
              }}
            />
          </div>
        </button>
      ))}
    </div>
  );
};
