import React, { useState, useEffect, useRef } from 'react';
import type { DeskflowLogEntry, DeskflowLogLevel } from '../types';
import { deskflowLogger } from '../services/deskflowLogger';
import {
  Terminal,
  Trash2,
  Copy,
  Check,
  Search,
  X,
} from 'lucide-react';

interface DeskflowLogConsoleProps {
  isOpen: boolean;
  onClose?: () => void;
  isEmbedded?: boolean;
}

const LEVEL_COLORS: Record<DeskflowLogLevel, { text: string; bg: string }> = {
  INFO: { text: 'text-blue-400', bg: 'bg-blue-500/10' },
  NOTE: { text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  DEBUG: { text: 'text-zinc-400', bg: 'bg-zinc-500/10' },
  DEBUG1: { text: 'text-zinc-500', bg: 'bg-zinc-500/5' },
  WARNING: { text: 'text-amber-400', bg: 'bg-amber-500/10' },
  ERROR: { text: 'text-red-400', bg: 'bg-red-500/10' },
};

export const DeskflowLogConsole: React.FC<DeskflowLogConsoleProps> = ({
  isOpen,
  onClose,
  isEmbedded = false,
}) => {
  const [logs, setLogs] = useState<DeskflowLogEntry[]>(() => deskflowLogger.getLogs());
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = deskflowLogger.subscribe((newEntry) => {
      setLogs((prev) => [...prev, newEntry]);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.source.toLowerCase().includes(q) ||
        log.level.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level}] [${l.source}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    deskflowLogger.clear();
    setLogs(deskflowLogger.getLogs());
  };

  if (!isOpen) return null;

  return (
    <div
      className={
        isEmbedded
          ? 'glass-panel p-4 space-y-3'
          : 'fixed inset-x-4 bottom-4 z-40 max-w-5xl mx-auto rounded-2xl glass-panel border border-white/[0.12] bg-[#07080a]/95 shadow-2xl overflow-hidden'
      }
    >
      {/* Console Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08] select-none">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-300">
            <Terminal className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-zinc-100 tracking-tight font-mono">
                Deskflow Log Window
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-white/[0.08] text-zinc-400">
                {filteredLogs.length} events
              </span>
            </div>
          </div>
        </div>

        {/* Filter Controls & Actions */}
        <div className="flex items-center gap-2 text-xs font-mono">
          {/* Level Filter */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-zinc-300 focus:outline-none"
          >
            <option value="ALL" className="bg-[#12131a]">ALL Levels</option>
            <option value="INFO" className="bg-[#12131a]">INFO</option>
            <option value="NOTE" className="bg-[#12131a]">NOTE</option>
            <option value="DEBUG" className="bg-[#12131a]">DEBUG</option>
            <option value="WARNING" className="bg-[#12131a]">WARNING</option>
            <option value="ERROR" className="bg-[#12131a]">ERROR</option>
          </select>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Filter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-28 sm:w-36 bg-white/[0.04] border border-white/[0.08] rounded-lg pl-6 pr-2 py-1 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:w-44 transition-all"
            />
            <Search className="h-3 w-3 absolute left-2 top-2 text-zinc-500" />
          </div>

          <label className="hidden sm:flex items-center gap-1.5 cursor-pointer text-zinc-400 text-[11px]">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-800 text-blue-500"
            />
            <span>Scroll</span>
          </label>

          <button
            onClick={handleCopyLogs}
            className="btn-ghost !p-1.5 text-zinc-400 hover:text-zinc-200"
            title="Copy logs to clipboard"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          <button
            onClick={handleClear}
            className="btn-ghost !p-1.5 text-zinc-400 hover:text-red-400"
            title="Clear logs"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="btn-ghost !p-1.5 text-zinc-400 hover:text-zinc-200"
              title="Close log viewer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Output Area */}
      <div
        ref={scrollRef}
        className="h-44 sm:h-52 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1 p-2 rounded-xl bg-black/60 border border-white/[0.04] select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-zinc-600">
            No matching log entries.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const style = LEVEL_COLORS[log.level] || LEVEL_COLORS.INFO;
            return (
              <div key={log.id} className="flex items-start gap-2 text-zinc-300">
                <span className="text-zinc-500 select-none flex-shrink-0">
                  [{log.timestamp}]
                </span>
                <span
                  className={`px-1 rounded text-[9px] font-bold select-none flex-shrink-0 ${style.text} ${style.bg}`}
                >
                  {log.level}
                </span>
                <span className="text-zinc-500 text-[10px] select-none flex-shrink-0">
                  [{log.source}]
                </span>
                <span className="break-all flex-1 text-zinc-200">
                  {log.message}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
