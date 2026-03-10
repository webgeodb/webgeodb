/**
 * Version Compatibility Checker
 * Checks compatibility between different versions
 */

import { VersionManager } from './index.js';

export interface CompatibilityMatrix {
  [version: string]: {
    compatible: boolean;
    features: string[];
    deprecated?: string[];
    breakingChanges?: string[];
  };
}

export class CompatibilityChecker {
  private matrix: CompatibilityMatrix;

  constructor() {
    this.matrix = {
      '1.0.0': {
        compatible: true,
        features: [
          'Basic spatial indexing',
          'Point storage',
          'Range queries',
          'IndexedDB storage',
        ],
      },
      '1.1.0': {
        compatible: true,
        features: [
          'Polygon support',
          'Circle queries',
          'Bulk operations',
        ],
        deprecated: [
          'Old query format (use new query builder)',
        ],
      },
      '1.2.0': {
        compatible: true,
        features: [
          'Compression',
          'Encryption',
          'Performance optimizations',
        ],
      },
      '2.0.0': {
        compatible: false,
        features: [
          'New storage engine',
          'Advanced indexing',
          'Multi-threading support',
        ],
        breakingChanges: [
          'Database format changed - migration required',
          'API changes - check migration guide',
          'Storage structure changed',
        ],
      },
    };
  }

  /**
   * Check if version is compatible
   */
  isCompatible(version: string): boolean {
    const info = this.matrix[version];
    return info ? info.compatible : false;
  }

  /**
   * Get version information
   */
  getVersionInfo(version: string): CompatibilityMatrix[string] | undefined {
    return this.matrix[version];
  }

  /**
   * Get breaking changes for version
   */
  getBreakingChanges(version: string): string[] {
    const info = this.matrix[version];
    return info?.breakingChanges || [];
  }

  /**
   * Get deprecated features for version
   */
  getDeprecatedFeatures(version: string): string[] {
    const info = this.matrix[version];
    return info?.deprecated || [];
  }

  /**
   * Check if feature is available in version
   */
  hasFeature(version: string, feature: string): boolean {
    const info = this.matrix[version];
    return info ? info.features.includes(feature) : false;
  }

  /**
   * Get all compatible versions
   */
  getCompatibleVersions(): string[] {
    return Object.keys(this.matrix).filter(v => this.matrix[v].compatible);
  }

  /**
   * Add version to matrix
   */
  addVersion(
    version: string,
    info: Omit<CompatibilityMatrix[string], 'compatible'> & { compatible?: boolean }
  ): void {
    this.matrix[version] = {
      compatible: info.compatible ?? true,
      features: info.features || [],
      deprecated: info.deprecated || [],
      breakingChanges: info.breakingChanges || [],
    };
  }

  /**
   * Generate compatibility report
   */
  generateReport(fromVersion: string, toVersion: string): string {
    const from = this.matrix[fromVersion];
    const to = this.matrix[toVersion];

    if (!from || !to) {
      return `Unknown version: ${!from ? fromVersion : toVersion}`;
    }

    let report = `Migration Report: ${fromVersion} → ${toVersion}\n`;
    report += '='.repeat(50) + '\n\n';

    // Compatibility check
    report += `Compatible: ${to.compatible ? 'Yes' : 'No'}\n\n`;

    // New features
    const newFeatures = to.features.filter(f => !from.features.includes(f));
    if (newFeatures.length > 0) {
      report += 'New Features:\n';
      newFeatures.forEach(f => report += `  + ${f}\n`);
      report += '\n';
    }

    // Deprecated features
    if (to.deprecated && to.deprecated.length > 0) {
      report += 'Deprecated Features:\n';
      to.deprecated.forEach(d => report += `  - ${d}\n`);
      report += '\n';
    }

    // Breaking changes
    if (to.breakingChanges && to.breakingChanges.length > 0) {
      report += 'Breaking Changes:\n';
      to.breakingChanges.forEach(b => report += `  ! ${b}\n`);
      report += '\n';
    }

    return report;
  }
}
