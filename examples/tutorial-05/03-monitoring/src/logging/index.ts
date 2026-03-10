/**
 * Structured Logger
 * Provides structured logging with multiple levels and formats
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
  };
}

export interface LogOptions {
  level?: LogLevel;
  format?: 'json' | 'text';
  includeTimestamp?: boolean;
  includeContext?: boolean;
  maxEntries?: number;
}

export class StructuredLogger {
  private entries: LogEntry[] = [];
  private options: Required<LogOptions>;
  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  constructor(options: LogOptions = {}) {
    this.options = {
      level: options.level ?? 'info',
      format: options.format ?? 'json',
      includeTimestamp: options.includeTimestamp ?? true,
      includeContext: options.includeContext ?? true,
      maxEntries: options.maxEntries ?? 10000
    };
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | Record<string, any>): void {
    const errorInfo = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;

    this.log('error', message, errorInfo);
  }

  /**
   * Log message
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context: this.options.includeContext ? context : undefined
    };

    this.addEntry(entry);
  }

  /**
   * Check if message should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.options.level];
  }

  /**
   * Add log entry
   */
  private addEntry(entry: LogEntry): void {
    this.entries.push(entry);

    // Limit entries
    if (this.entries.length > this.options.maxEntries) {
      this.entries.shift();
    }

    // Output log
    this.outputLog(entry);
  }

  /**
   * Output log entry
   */
  private outputLog(entry: LogEntry): void {
    const output = this.formatEntry(entry);

    switch (entry.level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }

  /**
   * Format log entry
   */
  private formatEntry(entry: LogEntry): string {
    if (this.options.format === 'json') {
      return JSON.stringify(entry);
    }

    const timestamp = this.options.includeTimestamp
      ? `[${new Date(entry.timestamp).toISOString()}] `
      : '';
    const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const error = entry.error ? ` Error: ${entry.error.message}` : '';

    return `${timestamp}[${entry.level.toUpperCase()}] ${entry.message}${context}${error}`;
  }

  /**
   * Get all entries
   */
  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries by level
   */
  getEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.entries.filter(e => e.level === level);
  }

  /**
   * Query entries
   */
  queryEntries(filter: {
    level?: LogLevel;
    startDate?: Date;
    endDate?: Date;
    message?: string;
  }): LogEntry[] {
    return this.entries.filter(entry => {
      if (filter.level && entry.level !== filter.level) return false;
      if (filter.startDate && entry.timestamp < filter.startDate.getTime()) return false;
      if (filter.endDate && entry.timestamp > filter.endDate.getTime()) return false;
      if (filter.message && !entry.message.includes(filter.message)) return false;
      return true;
    });
  }

  /**
   * Clear all entries
   */
  clearEntries(): void {
    this.entries = [];
  }

  /**
   * Get entry count
   */
  getEntryCount(): number {
    return this.entries.length;
  }

  /**
   * Export logs as JSON
   */
  exportJSON(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  /**
   * Export logs as CSV
   */
  exportCSV(): string {
    const headers = ['timestamp', 'level', 'message', 'context'];
    const rows = this.entries.map(entry => [
      entry.timestamp,
      entry.level,
      entry.message,
      JSON.stringify(entry.context || {})
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }
}
