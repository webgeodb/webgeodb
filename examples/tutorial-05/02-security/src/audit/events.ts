/**
 * Audit Event Types
 * Defines all possible audit event types
 */

export type AuditEventType =
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILURE'
  | 'DATA_READ'
  | 'DATA_WRITE'
  | 'DATA_DELETE'
  | 'PERMISSION_CHANGE'
  | 'ROLE_CHANGE'
  | 'CONFIG_CHANGE'
  | 'SECURITY_ALERT'
  | 'SYSTEM_EVENT'
  | 'ERROR';

export const AuditEventDescriptions: Record<AuditEventType, string> = {
  AUTH_SUCCESS: 'User successfully authenticated',
  AUTH_FAILURE: 'Authentication attempt failed',
  DATA_READ: 'Data was read',
  DATA_WRITE: 'Data was created or updated',
  DATA_DELETE: 'Data was deleted',
  PERMISSION_CHANGE: 'User permissions were changed',
  ROLE_CHANGE: 'User role was changed',
  CONFIG_CHANGE: 'Configuration was changed',
  SECURITY_ALERT: 'Security-related event detected',
  SYSTEM_EVENT: 'System-level event',
  ERROR: 'Error occurred'
};

export function getEventDescription(type: AuditEventType): string {
  return AuditEventDescriptions[type] || 'Unknown event type';
}
