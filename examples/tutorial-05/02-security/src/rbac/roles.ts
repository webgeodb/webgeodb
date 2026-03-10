/**
 * Roles Definition
 * Defines system roles and their permissions
 */

export interface RoleDefinition {
  name?: string;
  permissions: string[];
  metadata?: Record<string, any>;
}

export const Roles = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest',
  MODERATOR: 'moderator'
};

export const RolePermissions = {
  [Roles.ADMIN]: [
    'points.read',
    'points.write',
    'points.delete',
    'queries.execute',
    'users.manage',
    'config.manage',
    'audit.read',
    'system.manage'
  ],

  [Roles.MODERATOR]: [
    'points.read',
    'points.write',
    'queries.execute',
    'audit.read'
  ],

  [Roles.USER]: [
    'points.read',
    'points.write',
    'queries.execute'
  ],

  [Roles.GUEST]: [
    'points.read',
    'queries.execute'
  ]
};
