/**
 * RBAC Manager
 * Implements Role-Based Access Control
 */

import { RoleDefinition } from './roles.js';
import { PermissionDefinition } from './permissions.js';

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  metadata?: Record<string, any>;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface AccessPolicy {
  userId: string;
  role: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export class RBACManager {
  private roles: Map<string, Role> = new Map();
  private permissions: Map<string, Permission> = new Map();
  private userRoles: Map<string, string> = new Map();
  private policies: Map<string, AccessPolicy> = new Map();

  constructor() {
    this.initializeDefaultRoles();
    this.initializeDefaultPermissions();
  }

  /**
   * Initialize default roles
   */
  private initializeDefaultRoles(): void {
    // Admin role
    this.createRole('admin', {
      permissions: ['*'],
      metadata: { description: 'Full system access' }
    });

    // User role
    this.createRole('user', {
      permissions: [
        'points.read',
        'points.write',
        'queries.execute'
      ],
      metadata: { description: 'Standard user access' }
    });

    // Guest role
    this.createRole('guest', {
      permissions: ['points.read'],
      metadata: { description: 'Read-only guest access' }
    });
  }

  /**
   * Initialize default permissions
   */
  private initializeDefaultPermissions(): void {
    // Point permissions
    this.createPermission({
      id: 'points.read',
      name: 'Read Points',
      description: 'Read point data',
      resource: 'points',
      action: 'read'
    });

    this.createPermission({
      id: 'points.write',
      name: 'Write Points',
      description: 'Create and update point data',
      resource: 'points',
      action: 'write'
    });

    this.createPermission({
      id: 'points.delete',
      name: 'Delete Points',
      description: 'Delete point data',
      resource: 'points',
      action: 'delete'
    });

    // Query permissions
    this.createPermission({
      id: 'queries.execute',
      name: 'Execute Queries',
      description: 'Execute spatial queries',
      resource: 'queries',
      action: 'execute'
    });

    // User management permissions
    this.createPermission({
      id: 'users.manage',
      name: 'Manage Users',
      description: 'Manage user accounts',
      resource: 'users',
      action: 'manage'
    });
  }

  /**
   * Create role
   */
  async createRole(id: string, definition: RoleDefinition): Promise<Role> {
    const role: Role = {
      id,
      name: definition.name || id,
      permissions: definition.permissions || [],
      metadata: definition.metadata
    };

    this.roles.set(id, role);
    return role;
  }

  /**
   * Create permission
   */
  createPermission(permission: Permission): void {
    this.permissions.set(permission.id, permission);
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleId: string): Promise<void> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Role not found: ${roleId}`);
    }

    this.userRoles.set(userId, roleId);
  }

  /**
   * Get user role
   */
  getUserRole(userId: string): Role | undefined {
    const roleId = this.userRoles.get(userId);
    return roleId ? this.roles.get(roleId) : undefined;
  }

  /**
   * Check if user has permission
   */
  async checkPermission(userId: string, permission: string): Promise<boolean> {
    const role = this.getUserRole(userId);
    if (!role) {
      return false;
    }

    // Check for wildcard permission
    if (role.permissions.includes('*')) {
      return true;
    }

    return role.permissions.includes(permission);
  }

  /**
   * Check if user can access resource
   */
  async checkAccess(
    userId: string,
    action: string,
    resource: string
  ): Promise<boolean> {
    const permission = `${resource}.${action}`;
    return this.checkPermission(userId, permission);
  }

  /**
   * Create access policy
   */
  createPolicy(policy: AccessPolicy): void {
    this.policies.set(`${policy.userId}:${policy.resource}`, policy);
  }

  /**
   * Get policy for user and resource
   */
  getPolicy(userId: string, resource: string): AccessPolicy | undefined {
    return this.policies.get(`${userId}:${resource}`);
  }

  /**
   * Remove user role
   */
  removeUserRole(userId: string): void {
    this.userRoles.delete(userId);
  }

  /**
   * List all roles
   */
  listRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * List all permissions
   */
  listPermissions(): Permission[] {
    return Array.from(this.permissions.values());
  }

  /**
   * Get role permissions
   */
  getRolePermissions(roleId: string): string[] {
    const role = this.roles.get(roleId);
    return role?.permissions || [];
  }
}
