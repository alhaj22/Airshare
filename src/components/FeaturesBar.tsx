import React from 'react';
import { MousePointer, Keyboard, ClipboardCheck, Shuffle, Sliders } from 'lucide-react';

interface FeaturesBarProps {
  mouseSharing: boolean;
  setMouseSharing: (v: boolean) => void;
  keyboardSharing: boolean;
  setKeyboardSharing: (v: boolean) => void;
  clipboardSharing: boolean;
  setClipboardSharing: (v: boolean) => void;
  keyboardMapping: boolean;
  setKeyboardMapping: (v: boolean) => void;
  onOpenShortcuts?: () => void;
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
  onOpenShortcuts,
}) => {
  const items = [
    {
      id: 'mouse',
      label: 'Mouse Sharing',
      sub: 'Smooth sub-pixel pointer & clicks',
      icon: <MousePointer className="h-4 w-4" />,
      active: mouseSharing,
      toggle: () => setMouseSharing(!mouseSharing),
    },
    {
      id: 'keyboard',
      label: 'Keyboard Input',
      sub: 'Low-latency keystroke stream',
      icon: <Keyboard className="h-4 w-4" />,
      active: keyboardSharing,
      toggle: () => setKeyboardSharing(!keyboardSharing),
    },
    {
      id: 'clipboard',
      label: 'Clipboard Sync',
      sub: 'Bidirectional text & rich copy',
      icon: <ClipboardCheck className="h-4 w-4" />,
      active: clipboardSharing,
      toggle: () => setClipboardSharing(!clipboardSharing),
    },
    {
      id: 'mapping',
      label: 'Universal Key Remap',
      sub: 'Auto-translate Win ↔ Mac shortcuts',
      icon: <Shuffle className="h-4 w-4" />,
      active: keyboardMapping,
      toggle: () => {
        if (onOpenShortcuts) {
          onOpenShortcuts();
        } else {
          setKeyboardMapping(!keyboardMapping);
        }
      },
      hasConfig: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      {items.map((item) => (
        <div
          key={item.id}
          onClick={item.toggle}
          className={`glass-card p-3 flex items-center justify-between gap-3 cursor-pointer select-none transition-all ${
            item.active
              ? 'border-white/[0.12] bg-white/[0.035]'
              : 'border-white/[0.05] bg-transparent opacity-60 hover:opacity-100'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
                item.active
                  ? 'border-white/[0.15] bg-white/[0.08] text-white'
                  : 'border-white/[0.06] bg-black/30 text-zinc-500'
              }`}
            >
              {item.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-zinc-200 tracking-tight truncate">
                  {item.label}
                </span>
                {item.hasConfig && (
                  <Sliders className="h-3 w-3 text-zinc-500 hover:text-zinc-300" />
                )}
              </div>
              <p className="text-[10px] text-zinc-500 truncate">{item.sub}</p>
            </div>
          </div>

          {/* Micro switch */}
          <div className={`switch-track ${item.active ? 'active' : ''}`}>
            <span className="switch-thumb" />
          </div>
        </div>
      ))}
    </div>
  );
};
