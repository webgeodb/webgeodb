# WebGeoDB 教程示例 - 第3章: 事务管理

## 示例简介

本示例展示如何使用 WebGeoDB 进行事务管理，保证数据的一致性和完整性。涵盖基本事务操作、ACID特性、乐观锁并发控制等内容。

## 学习目标

1. 理解数据库事务的ACID特性
2. 掌握基本事务操作（提交、回滚）
3. 学会使用乐观锁处理并发冲突
4. 了解事务隔离级别
5. 掌握复杂业务场景的事务处理

## 前置要求

- Node.js >= 16
- TypeScript >= 4.5
- 完成第1-2章的学习

## 安装和运行

```bash
# 安装依赖
npm install

# 运行示例
npm start

# 编译TypeScript
npm run build
```

## 示例内容

### 1. 基本事务操作

演示成功的事务和失败回滚：

```typescript
// 成功的转账事务
const success = await executeTransfer(db, {
  fromUserId: 'user-001',
  toUserId: 'user-002',
  amount: 100,
  description: '转账'
});

// 余额不足导致回滚
const failed = await executeTransfer(db, {
  fromUserId: 'user-001',
  toUserId: 'user-002',
  amount: 10000, // 超出余额
  description: '大额转账'
});
```

### 2. ACID特性

#### 原子性 (Atomicity)

事务中的操作要么全部成功，要么全部失败：

```typescript
try {
  // 多个操作
  await db.accounts.update(fromAccount.id, { balance: newBalance });
  await db.accounts.update(toAccount.id, { balance: newBalance });
  await db.transactionLogs.add(log);
  // 全部成功
} catch (error) {
  // 自动回滚
}
```

#### 一致性 (Consistency)

事务执行前后，数据库保持一致状态：

```typescript
// 转账前后总余额不变
const totalBefore = await getTotalBalance();
await executeTransfer(db, { ... });
const totalAfter = await getTotalBalance();
console.log(totalBefore === totalAfter); // true
```

#### 隔离性 (Isolation)

并发事务之间相互隔离：

```typescript
// 事务1读取数据
const account1 = await db.accounts.get(id);

// 事务2修改数据
await db.accounts.update(id, { balance: newBalance });

// 事务1再次读取（可能看到新数据）
const account2 = await db.accounts.get(id);
```

#### 持久性 (Durability)

一旦事务提交，修改永久保存：

```typescript
await db.transaction('rw', db.accounts, async () => {
  await db.accounts.put(account);
  // 提交后永久保存
});
```

### 3. 乐观锁并发控制

使用版本号实现乐观锁：

```typescript
interface Account {
  id: string;
  balance: number;
  version: number; // 版本号
}

// 更新时检查版本号
const updated = await db.accounts
  .where('id').equals(accountId)
  .and(acc => acc.version === currentVersion)
  .modify(acc => {
    acc.balance += amount;
    acc.version += 1;
  });

if (updated === 0) {
  // 版本冲突，需要重试
  console.log('并发冲突，请重试');
}
```

### 4. 重试机制

实现指数退避重试：

```typescript
async function updateWithRetry(maxRetries = 3) {
  let attempts = 0;
  while (attempts < maxRetries) {
    attempts++;
    try {
      const updated = await optimisticUpdate();
      if (updated > 0) return true;
      await sleep(50 * attempts); // 指数退避
    } catch (error) {
      if (attempts === maxRetries) throw error;
    }
  }
  return false;
}
```

### 5. 事务隔离级别

IndexedDB 默认使用 READ_COMMITTED 隔离级别：

```typescript
// 读已提交：可以读取其他事务已提交的数据
const account = await db.accounts.get(id);
// 其他事务提交的修改可见
```

### 6. 复杂业务场景

#### 地理围栏签到

```typescript
async function checkIn(userId, locationId, userLat, userLon) {
  // 1. 获取位置信息
  const location = await db.locations.get(locationId);

  // 2. 验证是否在围栏内
  const distance = calculateDistance(userLat, userLon, location);

  // 3. 使用乐观锁更新签到数
  const updated = await db.locations
    .where('id').equals(locationId)
    .and(loc => loc.version === location.version)
    .modify(loc => {
      loc.checkInCount += 1;
      loc.version += 1;
    });

  return updated > 0;
}
```

#### 批量更新事务

```typescript
async function batchUpdate(userId, increment) {
  const locations = await db.locations
    .where('userId').equals(userId)
    .toArray();

  for (const location of locations) {
    await db.locations
      .where('id').equals(location.id)
      .and(loc => loc.version === location.version)
      .modify(loc => {
        loc.checkInCount += increment;
        loc.version += 1;
      });
  }
}
```

## 性能指标

本示例中的性能测试数据：

- 单事务操作: 1-5ms
- 批量事务(100条): 50-100ms
- 并发更新(50个): 100-200ms
- 乐观锁冲突率: < 5%（正常负载）

## 最佳实践

### 1. 事务设计原则

- 保持事务简短，减少持有时间
- 只在需要时使用事务
- 避免在事务中执行耗时操作
- 合理设置隔离级别

### 2. 并发控制

- 优先使用乐观锁（适合读多写少）
- 使用版本号或时间戳
- 实现重试机制
- 记录冲突日志

### 3. 错误处理

```typescript
try {
  await executeTransfer(db, params);
} catch (error) {
  // 记录错误日志
  console.error('事务失败:', error);
  // 回滚操作（自动）
  // 通知用户
}
```

### 4. 性能优化

- 批量操作使用 bulkAdd/bulkPut
- 减少事务范围
- 使用索引加速查询
- 避免长时间锁定

## 常见问题

### Q: 如何处理并发冲突？

A: 使用乐观锁 + 重试机制：

```typescript
let attempts = 0;
while (attempts < maxRetries) {
  const updated = await optimisticUpdate();
  if (updated > 0) break;
  attempts++;
  await sleep(backoffTime);
}
```

### Q: 事务失败后如何回滚？

A: IndexedDB 自动回滚失败的事务，无需手动处理。

### Q: 如何监控事务性能？

A: 记录事务执行时间：

```typescript
const startTime = performance.now();
await executeTransaction();
const duration = performance.now() - startTime;
console.log(`事务耗时: ${duration}ms`);
```

## 实际应用场景

### 金融应用

- 账户转账
- 余额更新
- 交易记录

### 社交应用

- 点赞/收藏
- 关注关系
- 内容审核

### 地理应用

- 位置签到
- 区域管理
- 轨迹记录

## 相关资源

- [IndexedDB 事务规范](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)
- [ACID 特性详解](https://en.wikipedia.org/wiki/ACID)
- [乐观锁 vs 悲观锁](https://en.wikipedia.org/wiki/Optimistic_concurrency_control)

## 下一步

- 学习第3章示例3: 性能优化
- 查看完整API文档
- 探索更多实战案例
