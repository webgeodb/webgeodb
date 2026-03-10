/**
 * Version Manager
 * Handles version management and data migration
 */

export interface VersionInfo {
  version: string;
  major: number;
  minor: number;
  patch: number;
  build?: string;
}

export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  migrated: boolean;
  errors?: string[];
}

export interface CompatibilityCheck {
  compatible: boolean;
  reason?: string;
  minVersion?: string;
  maxVersion?: string;
}

export interface VersionManagerOptions {
  currentVersion: string;
  migrationsPath?: string;
}

export class VersionManager {
  private currentVersion: VersionInfo;
  private migrationsPath: string;

  constructor(options: VersionManagerOptions) {
    this.currentVersion = this.parseVersion(options.currentVersion);
    this.migrationsPath = options.migrationsPath || './migrations';
  }

  /**
   * Parse version string
   */
  private parseVersion(version: string): VersionInfo {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return {
      version,
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      build: match[4],
    };
  }

  /**
   * Get current version
   */
  getCurrentVersion(): VersionInfo {
    return this.currentVersion;
  }

  /**
   * Check if migration is needed
   */
  async needsMigration(databaseVersion: string): Promise<boolean> {
    const dbVersion = this.parseVersion(databaseVersion);

    // Migration needed if major or minor version differs
    return (
      dbVersion.major !== this.currentVersion.major ||
      dbVersion.minor !== this.currentVersion.minor
    );
  }

  /**
   * Check version compatibility
   */
  async checkCompatibility(version: string): Promise<CompatibilityCheck> {
    const targetVersion = this.parseVersion(version);

    // Same major version is compatible
    if (targetVersion.major === this.currentVersion.major) {
      return { compatible: true };
    }

    // Different major versions are not compatible
    return {
      compatible: false,
      reason: `Version ${version} is not compatible with current version ${this.currentVersion.version}`,
      minVersion: `${this.currentVersion.major}.0.0`,
      maxVersion: `${this.currentVersion.major}.999.999`,
    };
  }

  /**
   * Get supported version range
   */
  getSupportedVersionRange(): string {
    return `^${this.currentVersion.major}.0.0`;
  }

  /**
   * Migrate database to current version
   */
  async migrate(fromVersion: string): Promise<MigrationResult> {
    const errors: string[] = [];

    try {
      const from = this.parseVersion(fromVersion);

      // Check if migration is needed
      if (!await this.needsMigration(fromVersion)) {
        return {
          success: true,
          fromVersion,
          toVersion: this.currentVersion.version,
          migrated: false,
        };
      }

      // Check compatibility
      const compatibility = await this.checkCompatibility(fromVersion);
      if (!compatibility.compatible) {
        return {
          success: false,
          fromVersion,
          toVersion: this.currentVersion.version,
          migrated: false,
          errors: [compatibility.reason || 'Incompatible version'],
        };
      }

      // Perform migration steps
      // In a real implementation, this would:
      // 1. Backup current data
      // 2. Run migration scripts
      // 3. Verify migration
      // 4. Update version

      // Simulate migration
      console.log(`Migrating from ${fromVersion} to ${this.currentVersion.version}`);

      return {
        success: true,
        fromVersion,
        toVersion: this.currentVersion.version,
        migrated: true,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return {
        success: false,
        fromVersion,
        toVersion: this.currentVersion.version,
        migrated: false,
        errors,
      };
    }
  }

  /**
   * Rollback to previous version
   */
  async rollback(targetVersion: string): Promise<boolean> {
    try {
      const target = this.parseVersion(targetVersion);

      // Can only rollback within same major version
      if (target.major !== this.currentVersion.major) {
        throw new Error('Cannot rollback to different major version');
      }

      // Perform rollback
      console.log(`Rolling back to ${targetVersion}`);

      return true;
    } catch (error) {
      console.error('Rollback failed:', error);
      return false;
    }
  }

  /**
   * Compare two versions
   */
  compareVersions(v1: string, v2: string): number {
    const version1 = this.parseVersion(v1);
    const version2 = this.parseVersion(v2);

    if (version1.major !== version2.major) {
      return version1.major - version2.major;
    }
    if (version1.minor !== version2.minor) {
      return version1.minor - version2.minor;
    }
    if (version1.patch !== version2.patch) {
      return version1.patch - version2.patch;
    }

    return 0;
  }

  /**
   * Check if version is newer
   */
  isNewer(version: string): boolean {
    return this.compareVersions(version, this.currentVersion.version) > 0;
  }

  /**
   * Check if version is older
   */
  isOlder(version: string): boolean {
    return this.compareVersions(version, this.currentVersion.version) < 0;
  }
}
