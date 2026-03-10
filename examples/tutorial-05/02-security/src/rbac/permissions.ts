/**
 * Permissions Definition
 * Defines all system permissions
 */

export interface PermissionDefinition {
  permissions?: string[];
  metadata?: Record<string, any>;
}

export const Permissions = {
  // Point permissions
  POINTS_READ: 'points.read',
  POINTS_WRITE: 'points.write',
  POINTS_DELETE: 'points.delete',

  // Query permissions
  QUERIES_EXECUTE: 'queries.execute',
  QUERIES_ADVANCED: 'queries.advanced',

  // User management
  USERS_MANAGE: 'users.manage',
  USERS_READ: 'users.read',

  // Configuration
  CONFIG_MANAGE: 'config.manage',
  CONFIG_READ: 'config.read',

  // Audit
  AUDIT_READ: 'audit.read',

  // System
  SYSTEM_MANAGE: 'system.manage'
};

export const PermissionCategories = {
  DATA: ['points.read', 'points.write', 'points.delete'],
  QUERY: ['queries.execute', 'queries.advanced'],
  USER: ['users.manage', 'users.read'],
  CONFIG: ['config.manage', 'config.read'],
  AUDIT: ['audit.read'],
  SYSTEM: ['system.manage']
};
