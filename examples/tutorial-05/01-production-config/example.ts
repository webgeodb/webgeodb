/**
 * Production Configuration Example Usage
 *
 * This example demonstrates how to use the production configuration system
 */

import { ProductionConfig } from './src/config/index.js';
import { VersionManager } from './src/version/index.js';
import { StorageManager } from './src/storage/index.js';
import { ProductionChecklist } from './src/production/index.js';
import { PerformanceOptimizer } from './src/production/optimizer.js';

async function main() {
  console.log('=== WebGeoDB Production Configuration Example ===\n');

  // 1. Create production configuration
  console.log('1. Creating production configuration...');
  const config = new ProductionConfig({
    environment: 'production',
    version: '1.0.0',
    storageQuota: 100 * 1024 * 1024, // 100MB
    indexPath: '/data/webgeodb/production',
    enableCompression: true,
    enableEncryption: true,
    encryptionKey: 'your-secure-encryption-key-32-characters-long',
    cacheSize: 2000,
    logLevel: 'info'
  });

  await config.initialize();
  console.log('✓ Configuration initialized\n');

  // 2. Validate configuration
  console.log('2. Validating configuration...');
  const isValid = await config.validate();
  if (isValid) {
    console.log('✓ Configuration is valid\n');
  } else {
    console.log('✗ Configuration validation failed\n');
    return;
  }

  // 3. Get configuration details
  console.log('3. Configuration details:');
  const coreConfig = config.getCoreConfig();
  console.log(`   Environment: ${coreConfig.environment}`);
  console.log(`   Version: ${coreConfig.version}`);
  console.log(`   Log Level: ${coreConfig.logLevel}\n`);

  // 4. Version management
  console.log('4. Version management:');
  const versionManager = config.getVersionManager();
  const currentVersion = versionManager.getCurrentVersion();
  console.log(`   Current version: ${currentVersion.version}`);

  const needsMigration = await versionManager.needsMigration('0.9.0');
  console.log(`   Needs migration from 0.9.0: ${needsMigration ? 'Yes' : 'No'}\n`);

  // 5. Storage management
  console.log('5. Storage management:');
  const storageManager = config.getStorageManager();
  const storageSummary = await storageManager.getSummary();
  console.log(`   Status: ${storageSummary.status}`);
  console.log(`   Used: ${storageSummary.formatted.used}`);
  console.log(`   Total: ${storageSummary.formatted.total}\n`);

  // 6. Production checklist
  console.log('6. Running production checklist...');
  const checklist = new ProductionChecklist(config);
  const report = await checklist.generateReport();
  console.log(report);

  // 7. Performance optimization
  console.log('7. Applying performance optimizations...');
  const optimizer = new PerformanceOptimizer(config);
  const optimizations = await optimizer.optimize();
  optimizations.forEach(opt => {
    console.log(`   ${opt.applied ? '✓' : '✗'} ${opt.name}`);
  });
  console.log();

  console.log('=== Example completed successfully ===');
}

// Run the example
main().catch(console.error);
