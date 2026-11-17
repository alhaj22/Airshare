// Real-Time Deskflow Logging System
// Captures and streams server, client, network, and input events

import type { DeskflowLogEntry, DeskflowLogLevel } from '../types';

type LogListener = (entry: DeskflowLogEntry) => void;

class DeskflowLoggerService {
  private logs: DeskflowLogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs: number = 1000;

  constructor() {
    // Seed initial operational logs
    this.info('system', 'Deskflow cross-platform KVM service initialized');
    this.info('network', 'Default listening port set to 24800 (TCP/TLS)');
  }

  private formatTimestamp(): string {
    const d = new Date();
    const pad = (n: number, z = 2) => n.toString().padStart(z, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  }

  private addLog(
    level: DeskflowLogLevel,
    source: DeskflowLogEntry['source'],
    message: string
  ) {
    const entry: DeskflowLogEntry = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      timestamp: this.formatTimestamp(),
      level,
      source,
      message,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.listeners.forEach((cb) => {
      try {
        cb(entry);
      } catch (err) {
        console.error('Logger listener error:', err);
      }
    });
  }

  public info(source: DeskflowLogEntry['source'], message: string) {
    this.addLog('INFO', source, message);
  }

  public note(source: DeskflowLogEntry['source'], message: string) {
    this.addLog('NOTE', source, message);
  }

  public debug(source: DeskflowLogEntry['source'], message: string) {
    this.addLog('DEBUG', source, message);
  }

  public warn(source: DeskflowLogEntry['source'], message: string) {
    this.addLog('WARNING', source, message);
  }

  public error(source: DeskflowLogEntry['source'], message: string) {
    this.addLog('ERROR', source, message);
  }

  public getLogs(): DeskflowLogEntry[] {
    return [...this.logs];
  }

  public clear() {
    this.logs = [];
    this.info('system', 'Deskflow log buffer cleared');
  }

  public subscribe(cb: LogListener): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }
}

export const deskflowLogger = new DeskflowLoggerService();
