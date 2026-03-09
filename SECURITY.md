# 安全策略

## 支持版本

WebGeoDB 项目当前仅支持最新版本。安全更新将应用于最新版本。

## 报告漏洞

如果您发现安全漏洞，请不要公开 issue。请发送邮件至：security@example.com

请尽可能包含以下信息：
- 漏洞描述
- 受影响的版本
- 复现步骤
- 潜在影响
- 建议的修复方案

## 安全最佳实践

### 对于用户

1. **输入验证**
   - 始终验证用户输入
   - 对几何数据进行格式检查
   - 清理和转义用户提供的字符串

2. **敏感数据**
   - 不要在 IndexedDB 中存储敏感信息
   - 考虑对敏感数据进行加密
   - 使用环境变量管理配置

3. **存储配额**
   - 定期检查存储使用情况
   - 实施数据清理策略
   - 监控存储配额

### 对于开发者

1. **依赖管理**
   - 定期更新依赖包
   - 使用 `pnpm audit` 检查已知漏洞
   - 审查新添加的依赖

2. **代码审查**
   - 所有代码更改需要经过审查
   - 特别注意空间查询和索引代码
   - 验证错误处理的完整性

3. **测试**
   - 确保新功能有相应的测试
   - 维护测试覆盖率在 80% 以上
   - 包含安全相关的测试用例

## 安全政策

### 更新承诺

- 关键安全问题将在 72 小时内修复
- 高优先级问题将在 7 天内修复
- 中等优先级问题将在 30 天内修复
- 低优先级问题将在下一个版本中修复

### 安全版本

版本号格式：`MAJOR.MINOR.PATCH`

- **MAJOR**: 重大变更，可能包含不兼容的 API 更改
- **MINOR**: 新功能，向后兼容
- **PATCH**: Bug 修复和安全更新

安全更新将使用 PATCH 版本号。

## 已知问题

### 当前版本 (0.1.0)

- 无已知严重安全漏洞

### 历史版本

所有历史版本的安全问题已在当前版本中修复。

## 最佳实践

### 数据验证

```typescript
// 验证几何数据
function validateGeometry(geometry: any): boolean {
  if (!geometry || typeof geometry !== 'object') {
    return false;
  }

  const validTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];
  if (!validTypes.includes(geometry.type)) {
    return false;
  }

  if (!Array.isArray(geometry.coordinates)) {
    return false;
  }

  return true;
}

// 使用验证
await db.features.insert({
  id: '1',
  name: 'Feature',
  geometry: validatedGeometry,
  properties: {}
});
```

### 错误处理

```typescript
try {
  await db.open();
} catch (error) {
  // 安全的错误处理
  console.error('Database error:', error.message);
  // 不要泄露敏感信息
  notifyUser('数据库初始化失败，请刷新页面');
}
```

### 存储管理

```typescript
// 定期检查存储使用情况
async function checkStorageUsage() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const usagePercent = (estimate.usage / estimate.quota) * 100;

    if (usagePercent > 80) {
      console.warn('存储空间不足，请清理数据');
      // 自动清理旧数据
      await cleanupOldData();
    }
  }
}
```

## 联系方式

- 安全问题：security@example.com
- 一般问题：[GitHub Issues](https://github.com/zhyt1985/webgeodb/issues)
- 项目维护：zhyt1985

## 致谢

感谢所有报告安全问题的研究者。您的贡献帮助我们构建更安全的软件。
