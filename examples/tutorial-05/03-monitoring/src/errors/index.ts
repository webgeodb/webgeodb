/**
 * Error Monitor
 * Captures and tracks errors for monitoring and analysis
 */

import { EventEmitter } from 'events';

export interface ErrorInfo {
  id: string;
  message: string;
  stack?: string;
  type: string;
  timestamp: number;
  context?: {
    operation?: string;
    userId?: string;
    metadata?: Record<string, any>;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorSummary {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  recentErrors: ErrorInfo[];
  topErrors: Array<{ error: string; count: number }>;
}

export interface ErrorMonitorOptions {
  enabled?: boolean;
  maxErrors?: number;
  retentionMs?: number;
  notifyOnCritical?: boolean;
}

export class ErrorMonitor extends EventEmitter {
  private errors: ErrorInfo[] = [];
  private errorCounts: Map<string, number> = new Map();
  private options: Required<ErrorMonitorOptions>;

  constructor(options: ErrorMonitorOptions = {}) {
    super();
    this.options = {
      enabled: options.enabled ?? true,
      maxErrors: options.maxErrors ?? 10000,
      retentionMs: options.retentionMs ?? 86400000, // 24 hours
      notifyOnCritical: options.notifyOnCritical ?? true
    };
  }

  /**
   * Capture error
   */
  captureError(
    error: Error | string,
    context?: {
      operation?: string;
      userId?: string;
      metadata?: Record<string, any>;
    }
  ): void {
    if (!this.options.enabled) {
      return;
    }

    const message = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'string' ? undefined : error.stack;
    const type = this.getErrorType(error);
    const severity = this.getErrorSeverity(type, message);

    const errorInfo: ErrorInfo = {
      id: this.generateErrorId(),
      message,
      stack,
      type,
      timestamp: Date.now(),
      context,
      severity
    };

    this.addError(errorInfo);

    if (severity === 'critical' && this.options.notifyOnCritical) {
      this.emit('critical-error', errorInfo);
    }
  }

  /**
   * Add error to collection
   */
  private addError(error: ErrorInfo): void {
    this.errors.push(error);

    // Update count
    const key = `${error.type}:${error.message}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);

    // Trim old errors
    const cutoff = Date.now() - this.options.retentionMs;
    this.errors = this.errors.filter(e => e.timestamp > cutoff);

    // Limit max errors
    if (this.errors.length > this.options.maxErrors) {
      const removed = this.errors.shift()!;
      const key = `${removed.type}:${removed.message}`;
      const count = this.errorCounts.get(key)!;
      if (count === 1) {
        this.errorCounts.delete(key);
      } else {
        this.errorCounts.set(key, count - 1);
      }
    }

    this.emit('error', error);
  }

  /**
   * Get error type
   */
  private getErrorType(error: Error | string): string {
    if (typeof error === 'string') {
      return 'GenericError';
    }
    return error.name || 'Error';
  }

  /**
   * Get error severity
   */
  private getErrorSeverity(type: string, message: string): ErrorInfo['severity'] {
    if (type === 'SecurityError' || message.includes('security')) {
      return 'critical';
    }
    if (type === 'ValidationError') {
      return 'low';
    }
    if (type === 'NetworkError') {
      return 'medium';
    }
    return 'high';
  }

  /**
   * Get error summary
   */
  getErrorSummary(): ErrorSummary {
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};

    for (const error of this.errors) {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    }

    const topErrors = Array.from(this.errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors: this.errors.length,
      errorsByType,
      errorsBySeverity,
      recentErrors: this.errors.slice(-10),
      topErrors
    };
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type: string): ErrorInfo[] {
    return this.errors.filter(e => e.type === type);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorInfo['severity']): ErrorInfo[] {
    return this.errors.filter(e => e.severity === severity);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): ErrorInfo[] {
    return this.errors.slice(-limit);
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors = [];
    this.errorCounts.clear();
  }

  /**
   * Get error count
   */
  getErrorCount(): number {
    return this.errors.length;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
