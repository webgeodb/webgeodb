# WebGeoDB 性能监控示例

## 概述

本示例展示如何为 WebGeoDB 实施全面的性能监控，包括性能指标采集、错误监控、结构化日志、实时监控仪表板和告警系统。

## 功能特性

- ✅ 性能指标采集（查询时间、吞吐量、缓存命中率）
- ✅ 错误监控和跟踪
- ✅ 结构化日志记录
- ✅ 实时监控仪表板
- ✅ 告警系统
- ✅ 性能分析工具
- ✅ 自定义指标支持
- ✅ 数据导出和报告

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

#### 性能监控

```typescript
import { PerformanceMonitor } from '@webgeodb/tutorial-05-03-monitoring';

const monitor = new PerformanceMonitor({
  enabled: true,
  samplingRate: 1.0
});

// 监控操作
await monitor.trackOperation('query', async () => {
  return await database.query({
    type: 'near',
    center: [37.7749, -122.4194],
    radius: 1000
  });
});

// 获取性能指标
const metrics = monitor.getMetrics();
console.log(metrics);
```

#### 错误监控

```typescript
import { ErrorMonitor } from '@webgeodb/tutorial-05-03-monitoring';

const errorMonitor = new ErrorMonitor();

// 监控错误
try {
  await database.insert(point);
} catch (error) {
  errorMonitor.captureError(error, {
    context: 'insert',
    userId: 'user-123',
    metadata: { pointId: point.id }
  });
}

// 获取错误摘要
const summary = errorMonitor.getErrorSummary();
```

#### 结构化日志

```typescript
import { StructuredLogger } from '@webgeodb/tutorial-05-03-monitoring';

const logger = new StructuredLogger({
  level: 'info',
  format: 'json'
});

// 记录日志
logger.info('Query executed', {
  queryType: 'near',
  resultCount: 10,
  duration: 45
});

logger.error('Query failed', {
  error: error.message,
  query: queryData
});
```

#### 实时监控

```typescript
import { MonitoringDashboard } from '@webgeodb/tutorial-05-03-monitoring';

const dashboard = new MonitoringDashboard();

// 启动监控
dashboard.start();

// 订阅实时更新
dashboard.on('metrics-update', (metrics) => {
  console.log('Current metrics:', metrics);
});
```

## 监控指标

### 性能指标

- **查询延迟**: 查询执行时间
- **吞吐量**: 每秒操作数
- **缓存命中率**: 缓存效率
- **存储使用**: 存储空间使用情况
- **索引大小**: 索引数据大小
- **内存使用**: 内存占用

### 错误指标

- **错误率**: 错误百分比
- **错误类型**: 错误分类
- **错误频率**: 错误发生频率
- **影响范围**: 受影响的用户/操作

### 业务指标

- **活跃用户**: 当前活跃用户数
- **查询分布**: 不同查询类型分布
- **数据增长**: 数据量增长趋势
- **API调用**: API调用统计

## 告警规则

### 预定义告警

```typescript
import { AlertManager } from '@webgeodb/tutorial-05-03-monitoring';

const alertManager = new AlertManager();

// 高查询延迟告警
alertManager.createRule({
  name: 'High Query Latency',
  condition: (metrics) => metrics.queryLatency > 1000,
  severity: 'warning',
  message: 'Query latency exceeds 1000ms'
});

// 高错误率告警
alertManager.createRule({
  name: 'High Error Rate',
  condition: (metrics) => metrics.errorRate > 0.05,
  severity: 'critical',
  message: 'Error rate exceeds 5%'
});

// 存储空间告警
alertManager.createRule({
  name: 'Storage Space',
  condition: (metrics) => metrics.storageUsage > 0.9,
  severity: 'critical',
  message: 'Storage usage exceeds 90%'
});
```

## 最佳实践

### 1. 监控策略

- **设置合理的采样率**: 避免过度监控影响性能
- **关注关键指标**: 优先监控业务关键指标
- **设置合适的告警阈值**: 避免告警疲劳

### 2. 日志管理

- **使用结构化日志**: 便于查询和分析
- **设置合理的日志级别**: 平衡详细程度和性能
- **定期清理旧日志**: 避免存储空间耗尽

### 3. 错误处理

- **捕获所有错误**: 包括未预期的错误
- **提供足够的上下文**: 便于调试和分析
- **设置错误告警**: 及时响应严重错误

### 4. 性能优化

- **定期审查性能指标**: 识别性能瓶颈
- **分析慢查询**: 优化查询性能
- **监控缓存效率**: 调整缓存策略

## 测试

运行测试套件：

```bash
# 运行所有测试
pnpm test

# 运行测试并查看覆盖率
pnpm test:coverage
```

## 相关文档

- [WebGeoDB 核心文档](../../packages/core/README.md)
- [教程 5.1: 生产环境配置](../01-production-config/README.md)
- [教程 5.2: 安全性](../02-security/README.md)

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
