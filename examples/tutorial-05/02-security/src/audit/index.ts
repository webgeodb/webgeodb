/**
 * Audit Logger
 * Records security-related events for compliance and monitoring
 */

import { EventEmitter } from 'events';
import { AuditEventType } from './events.js';

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  userId?: string;
  resource?: string;
  action?: string;
  success: boolean;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface AuditLogOptions {
  enabled?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  retentionDays?: number;
}

export interface AuditReport {
  startDate: Date;
  endDate: Date;
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByUser: Record<string, number>;
  failedEvents: number;
  successEvents: number;
}

export class AuditLogger extends EventEmitter {
  private events: AuditEvent[] = [];
  private options: Required<AuditLogOptions>;
  private maxEvents: number = 10000;

  constructor(options: AuditLogOptions = {}) {
    super();
    this.options = {
      enabled: options.enabled ?? true,
      logLevel: options.logLevel ?? 'info',
      retentionDays: options.retentionDays ?? 90
    };
  }

  /**
   * Log authentication event
   */
  async logAuthEvent(event: {
    type: 'login' | 'logout' | 'failed_login';
    userId: string;
    success: boolean;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.logEvent({
      type: event.type === 'failed_login' ? 'AUTH_FAILURE' : 'AUTH_SUCCESS',
      userId: event.userId,
      action: event.type,
      success: event.success,
      timestamp: Date.now(),
      metadata: {
        ip: event.ip,
        userAgent: event.userAgent
      }
    });
  }

  /**
   * Log data access event
   */
  async logDataAccess(event: {
    action: 'read' | 'write' | 'delete';
    resource: string;
    userId: string;
    recordCount?: number;
    filters?: Record<string, any>;
  }): Promise<void> {
    await this.logEvent({
      type: event.action === 'read' ? 'DATA_READ' : 'DATA_WRITE',
      userId: event.userId,
      resource: event.resource,
      action: event.action,
      success: true,
      timestamp: Date.now(),
      metadata: {
        recordCount: event.recordCount,
        filters: event.filters
      }
    });
  }

  /**
   * Log permission change event
   */
  async logPermissionChange(event: {
    userId: string;
    oldRole: string;
    newRole: string;
    changedBy: string;
  }): Promise<void> {
    await this.logEvent({
      type: 'PERMISSION_CHANGE',
      userId: event.userId,
      resource: 'roles',
      action: 'update',
      success: true,
      timestamp: Date.now(),
      metadata: {
        oldRole: event.oldRole,
        newRole: event.newRole,
        changedBy: event.changedBy
      }
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(event: {
    type: 'intrusion_attempt' | 'rate_limit_exceeded' | 'suspicious_activity';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    userId?: string;
    ip?: string;
  }): Promise<void> {
    await this.logEvent({
      type: 'SECURITY_ALERT',
      userId: event.userId,
      resource: 'system',
      action: event.type,
      success: false,
      timestamp: Date.now(),
      metadata: {
        severity: event.severity,
        description: event.description,
        ip: event.ip
      }
    });
  }

  /**
   * Log generic event
   */
  async logEvent(event: Omit<AuditEvent, 'id'>): Promise<void> {
    if (!this.options.enabled) {
      return;
    }

    const auditEvent: AuditEvent = {
      ...event,
      id: this.generateEventId()
    };

    // Add to events list
    this.events.push(auditEvent);

    // Trim events if exceeds max
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Emit event
    this.emit('event', auditEvent);

    // Emit specific type events
    if (event.type === 'AUTH_FAILURE') {
      this.emit('auth-failure', auditEvent);
    } else if (event.type === 'SECURITY_ALERT') {
      this.emit('security-alert', auditEvent);
    }
  }

  /**
   * Query events
   */
  queryEvents(filter: {
    userId?: string;
    type?: AuditEventType;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
  }): AuditEvent[] {
    return this.events.filter(event => {
      if (filter.userId && event.userId !== filter.userId) return false;
      if (filter.type && event.type !== filter.type) return false;
      if (filter.startDate && event.timestamp < filter.startDate.getTime()) return false;
      if (filter.endDate && event.timestamp > filter.endDate.getTime()) return false;
      if (filter.success !== undefined && event.success !== filter.success) return false;
      return true;
    });
  }

  /**
   * Generate audit report
   */
  async generateReport(options: {
    startDate: Date;
    endDate: Date;
    userId?: string;
  }): Promise<AuditReport> {
    let events = this.queryEvents({
      startDate: options.startDate,
      endDate: options.endDate,
      userId: options.userId
    });

    const eventsByType: Record<string, number> = {};
    const eventsByUser: Record<string, number> = {};
    let failedEvents = 0;
    let successEvents = 0;

    for (const event of events) {
      // Count by type
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

      // Count by user
      if (event.userId) {
        eventsByUser[event.userId] = (eventsByUser[event.userId] || 0) + 1;
      }

      // Count success/failure
      if (event.success) {
        successEvents++;
      } else {
        failedEvents++;
      }
    }

    return {
      startDate: options.startDate,
      endDate: options.endDate,
      totalEvents: events.length,
      eventsByType,
      eventsByUser,
      failedEvents,
      successEvents
    };
  }

  /**
   * Clean up old events
   */
  cleanupOldEvents(): number {
    const cutoffDate = Date.now() - (this.options.retentionDays * 24 * 60 * 60 * 1000);
    const beforeCount = this.events.length;
    this.events = this.events.filter(e => e.timestamp > cutoffDate);
    return beforeCount - this.events.length;
  }

  /**
   * Get event count
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Get all events
   */
  getAllEvents(): AuditEvent[] {
    return [...this.events];
  }

  /**
   * Clear all events
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
