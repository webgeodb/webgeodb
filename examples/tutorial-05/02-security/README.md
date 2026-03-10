# WebGeoDB 安全性示例

## 概述

本示例展示如何为 WebGeoDB 实施全面的安全措施，包括输入验证、XSS防护、数据加密、RBAC权限管理和安全审计日志。

## 功能特性

- ✅ 输入验证和清理
- ✅ XSS 攻击防护
- ✅ 数据加密（AES-256-GCM）
- ✅ RBAC 权限管理
- ✅ 安全审计日志
- ✅ 速率限制
- ✅ CSRF 保护
- ✅ 安全头部配置
- ✅ 敏感数据脱敏

## 文件结构

```
src/
├── validation/
│   ├── index.ts                 # 输入验证器
│   ├── schema.ts                # 验证模式
│   ├── sanitizer.ts             # 数据清理
│   └── guards.ts                # 验证守卫
├── encryption/
│   ├── index.ts                 # 加密管理器
│   ├── crypto.ts                # 加密工具
│   ├── key-manager.ts           # 密钥管理
│   └── hashing.ts               # 哈希函数
├── rbac/
│   ├── index.ts                 # 权限管理器
│   ├── roles.ts                 # 角色定义
│   ├── permissions.ts           # 权限定义
│   └── policies.ts              # 访问策略
├── audit/
│   ├── index.ts                 # 审计日志
│   ├── logger.ts                # 日志记录器
│   ├── events.ts                # 事件定义
│   └── reporter.ts              # 报告生成器
├── xss/
│   ├── index.ts                 # XSS 防护
│   ├── cleaner.ts               # HTML 清理
│   └── policy.ts                # 内容安全策略
├── rate-limit/
│   ├── index.ts                 # 速率限制
│   ├── limiter.ts               # 限制器
│   └── store.ts                 # 存储后端
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

#### 输入验证

```typescript
import { InputValidator } from '@webgeodb/tutorial-05-02-security';

const validator = new InputValidator();

// 验证地理坐标
const result = validator.validateCoordinates({
  latitude: 37.7749,
  longitude: -122.4194
});

if (!result.valid) {
  console.error('Invalid coordinates:', result.errors);
}

// 验证查询参数
const queryResult = validator.validateQuery({
  type: 'near',
  center: [37.7749, -122.4194],
  radius: 1000
});
```

#### 数据加密

```typescript
import { EncryptionManager } from '@webgeodb/tutorial-05-02-security';

const encryption = new EncryptionManager({
  key: 'your-32-character-encryption-key',
  algorithm: 'AES-256-GCM'
});

// 加密数据
const encrypted = await encryption.encrypt({
  type: 'Point',
  coordinates: [37.7749, -122.4194]
});

// 解密数据
const decrypted = await encryption.decrypt(encrypted);
```

#### RBAC 权限管理

```typescript
import { RBACManager } from '@webgeodb/tutorial-05-02-security';

const rbac = new RBACManager();

// 定义角色
await rbac.createRole('admin', {
  permissions: ['read', 'write', 'delete', 'manage']
});

await rbac.createRole('user', {
  permissions: ['read', 'write']
});

// 分配角色给用户
await rbac.assignRole('user-123', 'user');

// 检查权限
const canDelete = await rbac.checkPermission('user-123', 'delete');
console.log(canDelete); // false

// 检查访问权限
const canAccess = await rbac.checkAccess('user-123', 'read', 'points');
```

#### 审计日志

```typescript
import { AuditLogger } from '@webgeodb/tutorial-05-02-security';

const audit = new AuditLogger({
  enabled: true,
  logLevel: 'info'
});

// 记录事件
await audit.logEvent({
  type: 'data_access',
  action: 'read',
  resource: 'points',
  userId: 'user-123',
  timestamp: Date.now(),
  metadata: {
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...'
  }
});

// 生成报告
const report = await audit.generateReport({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  userId: 'user-123'
});
```

## 安全特性详解

### 1. 输入验证

所有用户输入都必须经过严格验证：

```typescript
import { ValidationSchema } from '@webgeodb/tutorial-05-02-security';

// 定义验证模式
const pointSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['Point'] },
    coordinates: {
      type: 'array',
      items: { type: 'number' },
      minItems: 2,
      maxItems: 2
    }
  },
  required: ['type', 'coordinates']
};

// 验证输入
const result = validator.validate(input, pointSchema);
```

### 2. XSS 防护

防止跨站脚本攻击：

```typescript
import { XSSCleaner } from '@webgeodb/tutorial-05-02-security';

const cleaner = new XSSCleaner();

// 清理用户输入
const clean = cleaner.clean userInput;

// 清理 HTML
const cleanHtml = cleaner.cleanHtml(userInput);
```

### 3. 数据加密

使用 AES-256-GCM 加密敏感数据：

```typescript
// 加密位置数据
const encryptedLocation = await encryption.encrypt({
  latitude: 37.7749,
  longitude: -122.4194,
  metadata: {
    userId: 'user-123',
    timestamp: Date.now()
  }
});

// 存储加密数据
await database.store('encrypted_location', encryptedLocation);
```

### 4. RBAC 权限管理

实现基于角色的访问控制：

```typescript
// 定义权限
const permissions = {
  'points.read': 'Read point data',
  'points.write': 'Create/update point data',
  'points.delete': 'Delete point data',
  'users.manage': 'Manage users'
};

// 定义角色
const roles = {
  admin: Object.keys(permissions),
  user: ['points.read', 'points.write'],
  guest: ['points.read']
};

// 检查权限
const hasPermission = await rbac.checkPermission(userId, 'points.delete');
```

### 5. 审计日志

记录所有安全相关事件：

```typescript
// 记录认证事件
await audit.logAuthEvent({
  type: 'login',
  userId: 'user-123',
  success: true,
  ip: '192.168.1.1',
  timestamp: Date.now()
});

// 记录数据访问
await audit.logDataAccess({
  action: 'read',
  resource: 'points',
  userId: 'user-123',
  recordCount: 10
});

// 记录权限变更
await audit.logPermissionChange({
  userId: 'user-123',
  oldRole: 'user',
  newRole: 'admin',
  changedBy: 'admin-456'
});
```

### 6. 速率限制

防止暴力攻击：

```typescript
import { RateLimiter } from '@webgeodb/tutorial-05-02-security';

const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000 // 1 minute
});

// 检查限制
const allowed = await limiter.check('user-123');
if (!allowed) {
  throw new Error('Rate limit exceeded');
}
```

## 安全最佳实践

### 1. 数据验证

- **永远不要信任用户输入**
- **在多个层次验证数据**（客户端、服务器、数据库）
- **使用白名单而非黑名单**
- **验证数据类型、格式和范围**

### 2. 加密

- **使用标准加密算法**（AES-256-GCM）
- **正确管理加密密钥**
- **加密敏感数据**（位置、个人信息）
- **使用 HTTPS 传输数据**

### 3. 访问控制

- **实施最小权限原则**
- **使用 RBAC 管理权限**
- **定期审查和更新权限**
- **记录所有访问尝试**

### 4. 审计

- **记录所有安全事件**
- **定期审查审计日志**
- **设置告警机制**
- **保护审计日志不被篡改**

### 5. 防御

- **实施速率限制**
- **使用 CSP 防止 XSS**
- **启用 CSRF 保护**
- **定期安全审计**

## 安全检查清单

### 部署前检查

- [ ] 所有输入都经过验证
- [ ] 敏感数据已加密
- [ ] RBAC 已配置
- [ ] 审计日志已启用
- [ ] 速率限制已配置
- [ ] CSP 已启用
- [ ] HTTPS 已配置
- [ ] 密钥管理已设置

### 运行时检查

- [ ] 审计日志正常记录
- [ ] 速率限制正常工作
- [ ] 加密/解密正常
- [ ] 权限检查正常
- [ ] XSS 防护有效
- [ ] 无安全漏洞

## 测试

运行测试套件：

```bash
# 运行所有测试
pnpm test

# 运行测试并查看覆盖率
pnpm test:coverage

# 运行特定测试文件
pnpm test -- validation.test.ts
```

## 相关文档

- [WebGeoDB 核心文档](../../packages/core/README.md)
- [教程 5.1: 生产环境配置](../01-production-config/README.md)
- [教程 5.3: 性能监控](../03-monitoring/README.md)

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
