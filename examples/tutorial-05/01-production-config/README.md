# WebGeoDB 生产环境配置示例

## 概述

本示例展示如何为 WebGeoDB 配置生产环境，包括版本管理、环境变量、存储配额管理等关键配置。

## 功能特性

- ✅ 版本管理和迁移策略
- ✅ 环境变量配置和验证
- ✅ 存储配额管理
- ✅ 配置验证和类型安全
- ✅ 生产环境检查清单
- ✅ 性能优化配置
- ✅ 错误处理和降级策略

## 文件结构

```
src/
├── config/
│   ├── index.ts                 # 配置入口
│   ├── schema.ts                # 配置模式定义
│   ├── validator.ts             # 配置验证器
│   └── defaults.ts              # 默认配置
├── version/
│   ├── index.ts                 # 版本管理
│   ├── migration.ts             # 数据迁移
│   └── compatibility.ts         # 版本兼容性检查
├── storage/
│   ├── index.ts                 # 存储配额管理
│   ├── monitor.ts               # 存储监控
│   └── cleanup.ts               # 清理策略
├── env/
│   ├── index.ts                 # 环境变量管理
│   ├── loader.ts                # 环境变量加载器
│   └── validator.ts             # 环境变量验证
├── production/
│   ├── index.ts                 # 生产环境检查
│   ├── checklist.ts             # 检查清单
│   └── optimizer.ts             # 性能优化器
└── index.ts                     # 主入口
```

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 运行示例

```bash
# 开发模式
pnpm dev

# 构建
pnpm build

# 运行测试
pnpm test
```

### 基本使用

```typescript
import { ProductionConfig } from '@webgeodb/tutorial-05-01-production-config';

// 创建生产配置
const config = new ProductionConfig({
  environment: 'production',
  version: '1.0.0',
  storageQuota: 50 * 1024 * 1024, // 50MB
  enableCompression: true,
  enableEncryption: true,
  cacheSize: 1000,
  indexPath: '/data/geo-index'
});

// 初始化配置
await config.initialize();

// 验证配置
const isValid = await config.validate();
if (!isValid) {
  throw new Error('Invalid configuration');
}

// 获取配置
const dbConfig = config.getDatabaseConfig();
```

## 配置选项

### 核心配置

```typescript
interface ProductionConfigOptions {
  environment: 'development' | 'staging' | 'production';
  version: string;
  storageQuota: number;           // 字节
  enableCompression: boolean;
  enableEncryption: boolean;
  cacheSize: number;
  indexPath: string;
  backupPath?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}
```

### 环境变量

```bash
# .env.production
WEBGEODB_ENVIRONMENT=production
WEBGEODB_VERSION=1.0.0
WEBGEODB_STORAGE_QUOTA=52428800
WEBGEODB_ENABLE_COMPRESSION=true
WEBGEODB_ENABLE_ENCRYPTION=true
WEBGEODB_CACHE_SIZE=1000
WEBGEODB_INDEX_PATH=/data/geo-index
WEBGEODB_LOG_LEVEL=info
```

## 版本管理

### 版本迁移

```typescript
import { VersionManager } from '@webgeodb/tutorial-05-01-production-config';

const versionManager = new VersionManager({
  currentVersion: '1.0.0',
  database: db
});

// 检查是否需要迁移
const needsMigration = await versionManager.needsMigration();

// 执行迁移
if (needsMigration) {
  await versionManager.migrate();
}
```

### 兼容性检查

```typescript
// 检查版本兼容性
const isCompatible = await versionManager.checkCompatibility('1.0.0');

// 获取支持的版本范围
const versionRange = versionManager.getSupportedVersionRange();
```

## 存储管理

### 配额管理

```typescript
import { StorageManager } from '@webgeodb/tutorial-05-01-production-config';

const storageManager = new StorageManager({
  quota: 50 * 1024 * 1024,  // 50MB
  warningThreshold: 0.8,     // 80% 警告
  database: db
});

// 检查存储使用情况
const usage = await storageManager.getUsage();
console.log(`Used: ${usage.used} bytes`);
console.log(`Available: ${usage.available} bytes`);
console.log(`Percentage: ${usage.percentage}%`);

// 清理旧数据
await storageManager.cleanupOldData({ olderThan: 30 }); // 30天前
```

### 存储监控

```typescript
// 监控存储使用情况
storageManager.on('quota-warning', (usage) => {
  console.warn(`Storage quota warning: ${usage.percentage}% used`);
});

storageManager.on('quota-exceeded', (usage) => {
  console.error('Storage quota exceeded!');
  // 触发清理或告警
});
```

## 生产环境检查

### 运行检查清单

```typescript
import { ProductionChecklist } from '@webgeodb/tutorial-05-01-production-config';

const checklist = new ProductionChecklist(config);

// 运行所有检查
const results = await checklist.runAll();

results.forEach(result => {
  console.log(`${result.name}: ${result.status}`);
  if (result.errors.length > 0) {
    console.error('Errors:', result.errors);
  }
});

// 检查是否通过所有检查
const isReady = results.every(r => r.status === 'passed');
```

### 性能优化

```typescript
import { PerformanceOptimizer } from '@webgeodb/tutorial-05-01-production-config';

const optimizer = new PerformanceOptimizer(config);

// 应用生产环境优化
await optimizer.optimize();

// 优化项包括：
// - 索引优化
// - 缓存配置
// - 批处理大小
// - 连接池设置
// - 内存管理
```

## 配置验证

### 使用 Zod 进行模式验证

```typescript
import { ConfigSchema } from '@webgeodb/tutorial-05-01-production-config';

// 验证配置对象
const result = ConfigSchema.safeParse(config);

if (!result.success) {
  console.error('Configuration errors:', result.error.errors);
  throw new Error('Invalid configuration');
}

// 使用验证后的配置
const validConfig = result.data;
```

### 环境变量验证

```typescript
import { EnvValidator } from '@webgeodb/tutorial-05-01-production-config';

// 验证环境变量
const env = await EnvValidator.validate();

if (!env.isValid) {
  console.error('Environment variable errors:', env.errors);
  throw new Error('Invalid environment configuration');
}
```

## 最佳实践

### 1. 版本管理

- 使用语义化版本 (Semantic Versioning)
- 维护版本迁移脚本
- 在生产环境变更前备份
- 使用事务执行迁移

### 2. 环境配置

- 使用环境变量管理敏感信息
- 不同环境使用不同配置
- 验证所有环境变量
- 提供合理的默认值

### 3. 存储管理

- 设置合理的存储配额
- 实施定期清理策略
- 监控存储使用情况
- 在接近配额时告警

### 4. 性能优化

- 根据数据量调整缓存大小
- 使用批量操作提高效率
- 定期优化索引
- 监控性能指标

### 5. 错误处理

- 捕获并记录所有错误
- 提供有意义的错误消息
- 实施降级策略
- 定期审查错误日志

## 生产环境部署清单

### 部署前检查

- [ ] 配置已验证
- [ ] 环境变量已设置
- [ ] 存储配额已配置
- [ ] 版本迁移脚本已准备
- [ ] 备份策略已配置
- [ ] 监控已启用
- [ ] 日志已配置
- [ ] 错误处理已测试

### 部署后验证

- [ ] 应用启动正常
- [ ] 数据库连接成功
- [ ] 存储配额正常
- [ ] 性能指标正常
- [ ] 日志输出正常
- [ ] 错误率在预期范围内
- [ ] 备份正常运行
- [ ] 监控告警正常

## 故障排查

### 常见问题

**问题：配置验证失败**
```bash
# 检查配置文件
cat .env.production

# 验证环境变量
pnpm run validate:env
```

**问题：存储配额超出**
```typescript
// 检查存储使用情况
const usage = await storageManager.getUsage();
console.log(usage);

// 清理旧数据
await storageManager.cleanupOldData({ olderThan: 30 });
```

**问题：版本迁移失败**
```typescript
// 检查迁移状态
const status = await versionManager.getMigrationStatus();
console.log(status);

// 回滚迁移
await versionManager.rollback();
```

## 性能指标

### 典型生产环境配置

- **存储配额**: 50-500MB
- **缓存大小**: 1000-10000 条记录
- **批处理大小**: 100-1000 条记录
- **连接池**: 5-20 个连接
- **索引数量**: 根据查询模式优化

### 性能优化建议

- 使用批量操作提高吞吐量
- 合理设置缓存大小
- 定期优化索引
- 监控慢查询
- 使用连接池

## 测试

运行测试套件：

```bash
# 运行所有测试
pnpm test

# 运行测试并查看覆盖率
pnpm test:coverage

# 运行特定测试文件
pnpm test -- config.test.ts
```

## 相关文档

- [WebGeoDB 核心文档](../../packages/core/README.md)
- [教程 5.2: 安全性](../02-security/README.md)
- [教程 5.3: 性能监控](../03-monitoring/README.md)

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
