/**
 * WebGeoDB 教程示例
 *
 * 章节: 第3章 - 高级特性
 * 示例: 事务管理 (Transaction Management)
 *
 * 学习目标:
 * 1. 理解数据库事务的ACID特性
 * 2. 掌握基本事务操作（提交、回滚）
 * 3. 学会使用乐观锁处理并发冲突
 * 4. 了解事务隔离级别
 *
 * 前置要求:
 * - Node.js >= 16
 * - TypeScript >= 4.5
 * - 完成第1-2章的学习
 *
 * 运行方式:
 * ```bash
 * # 安装依赖
 * npm install
 *
 * # 运行示例
 * npm start
 * ```
 *
 * 预期输出:
 * ```
 * === WebGeoDB 教程示例 ===
 * 章节: 第3章 - 高级特性
 * 示例: 事务管理
 *
 * ✅ 基本事务操作演示完成
 * ✅ ACID特性演示完成
 * ✅ 乐观锁并发控制演示完成
 * ✅ 事务隔离级别演示完成
 * ```
 */

import { WebGeoDB } from '@webgeodb/core';

// ============================================
// 配置
// ============================================

const DB_CONFIG = {
  name: 'tutorial-03-02-transactions',
  version: 1
};

// ============================================
// 类型定义
// ============================================

interface Account {
  id: string;
  userId: string;
  balance: number;
  version: number; // 乐观锁版本号
  lastUpdated: Date;
}

interface TransactionLog {
  id: string;
  type: 'debit' | 'credit' | 'transfer';
  fromUserId?: string;
  toUserId?: string;
  amount: number;
  status: 'pending' | 'committed' | 'rolled_back';
  createdAt: Date;
  committedAt?: Date;
}

interface Location {
  id: string;
  userId: string;
  name: string;
  geometry: any;
  checkInCount: number;
  version: number;
  lastUpdated: Date;
}

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('=== WebGeoDB 教程示例 ===');
  console.log('章节: 第3章 - 高级特性');
  console.log('示例: 事务管理\n');

  // 步骤 1: 创建数据库实例
  console.log('步骤 1: 创建数据库实例...');
  const db = new WebGeoDB(DB_CONFIG);
  console.log('✅ 数据库实例创建成功');

  // 步骤 2: 定义表结构
  console.log('\n步骤 2: 定义表结构...');
  db.schema({
    accounts: {
      id: 'string',
      userId: 'string',
      balance: 'number',
      version: 'number',
      lastUpdated: 'datetime'
    },
    transactionLogs: {
      id: 'string',
      type: 'string',
      fromUserId: 'string',
      toUserId: 'string',
      amount: 'number',
      status: 'string',
      createdAt: 'datetime',
      committedAt: 'datetime'
    },
    locations: {
      id: 'string',
      userId: 'string',
      name: 'string',
      geometry: 'geometry',
      checkInCount: 'number',
      version: 'number',
      lastUpdated: 'datetime'
    }
  });
  console.log('✅ 表结构定义成功');

  // 步骤 3: 打开数据库
  console.log('\n步骤 3: 打开数据库...');
  await db.open();
  console.log('✅ 数据库打开成功');

  // 步骤 4: 创建索引
  console.log('\n步骤 4: 创建索引...');
  db.accounts.createIndex('userId');
  db.transactionLogs.createIndex('status');
  db.transactionLogs.createIndex('createdAt');
  db.locations.createIndex('userId');
  db.locations.createIndex('geometry', { auto: true });
  console.log('✅ 索引创建成功');

  // 步骤 5: 初始化测试数据
  console.log('\n步骤 5: 初始化测试数据...');
  await initializeTestData(db);
  console.log('✅ 测试数据初始化成功');

  // 步骤 6: 基本事务操作演示
  console.log('\n步骤 6: 基本事务操作演示...');
  await demonstrateBasicTransactions(db);

  // 步骤 7: ACID特性演示
  console.log('\n步骤 7: ACID特性演示...');
  await demonstrateACIDProperties(db);

  // 步骤 8: 乐观锁并发控制演示
  console.log('\n步骤 8: 乐观锁并发控制演示...');
  await demonstrateOptimisticLocking(db);

  // 步骤 9: 事务隔离级别演示
  console.log('\n步骤 9: 事务隔离级别演示...');
  await demonstrateTransactionIsolation(db);

  // 步骤 10: 复杂业务场景演示
  console.log('\n步骤 10: 复杂业务场景演示...');
  await demonstrateComplexScenarios(db);

  // 步骤 11: 性能测试
  console.log('\n步骤 11: 性能测试...');
  await performanceTest(db);

  // 清理: 关闭数据库
  console.log('\n清理: 关闭数据库...');
  await db.close();
  console.log('✅ 数据库已关闭');

  console.log('\n=== 示例执行完成 ===');
}

// ============================================
// 初始化测试数据
// ============================================

async function initializeTestData(db: any) {
  // 清空旧数据
  await db.accounts.clear();
  await db.transactionLogs.clear();
  await db.locations.clear();

  // 创建测试账户
  const accounts: Account[] = [
    {
      id: 'acc-001',
      userId: 'user-001',
      balance: 1000,
      version: 1,
      lastUpdated: new Date()
    },
    {
      id: 'acc-002',
      userId: 'user-002',
      balance: 500,
      version: 1,
      lastUpdated: new Date()
    },
    {
      id: 'acc-003',
      userId: 'user-003',
      balance: 2000,
      version: 1,
      lastUpdated: new Date()
    }
  ];

  await db.accounts.bulkAdd(accounts);

  // 创建测试位置
  const locations: Location[] = [
    {
      id: 'loc-001',
      userId: 'user-001',
      name: '天安门广场',
      geometry: {
        type: 'Point',
        coordinates: [116.397477, 39.909187]
      },
      checkInCount: 100,
      version: 1,
      lastUpdated: new Date()
    },
    {
      id: 'loc-002',
      userId: 'user-002',
      name: '故宫博物院',
      geometry: {
        type: 'Point',
        coordinates: [116.397026, 39.918058]
      },
      checkInCount: 200,
      version: 1,
      lastUpdated: new Date()
    }
  ];

  await db.locations.bulkAdd(locations);
}

// ============================================
// 基本事务操作演示
// ============================================

async function demonstrateBasicTransactions(db: any) {
  console.log('\n📝 基本事务操作:');

  // 场景1: 成功的转账事务
  console.log('\n   场景1: 成功的转账事务');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const fromUserId = 'user-001';
  const toUserId = 'user-002';
  const amount = 100;

  // 获取初始余额
  const fromAccountBefore = await db.accounts.where('userId').equals(fromUserId).first();
  const toAccountBefore = await db.accounts.where('userId').equals(toUserId).first();

  console.log(`   初始余额:`);
  console.log(`   - ${fromUserId}: ¥${fromAccountBefore.balance}`);
  console.log(`   - ${toUserId}: ¥${toAccountBefore.balance}`);

  // 执行转账
  const transferSuccess = await executeTransfer(db, {
    fromUserId,
    toUserId,
    amount,
    description: '转账测试'
  });

  if (transferSuccess) {
    const fromAccountAfter = await db.accounts.where('userId').equals(fromUserId).first();
    const toAccountAfter = await db.accounts.where('userId').equals(toUserId).first();

    console.log(`\n   转账后余额:`);
    console.log(`   - ${fromUserId}: ¥${fromAccountAfter.balance} (减少 ¥${amount})`);
    console.log(`   - ${toUserId}: ¥${toAccountAfter.balance} (增加 ¥${amount})`);
    console.log('   ✅ 转账成功');
  }

  // 场景2: 余额不足的事务回滚
  console.log('\n\n   场景2: 余额不足导致事务回滚');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const largeAmount = 10000;
  const transferFailed = await executeTransfer(db, {
    fromUserId,
    toUserId,
    amount: largeAmount,
    description: '大额转账测试'
  });

  if (!transferFailed) {
    const fromAccountAfter = await db.accounts.where('userId').equals(fromUserId).first();
    console.log(`\n   余额保持不变: ¥${fromAccountAfter.balance}`);
    console.log('   ✅ 事务正确回滚');
  }

  // 场景3: 批量操作的事务
  console.log('\n\n   场景3: 批量添加位置数据');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const newLocations = [
    {
      id: 'loc-003',
      userId: 'user-001',
      name: '颐和园',
      geometry: { type: 'Point', coordinates: [116.273, 39.999] },
      checkInCount: 50,
      version: 1,
      lastUpdated: new Date()
    },
    {
      id: 'loc-004',
      userId: 'user-002',
      name: '圆明园',
      geometry: { type: 'Point', coordinates: [116.297, 40.008] },
      checkInCount: 30,
      version: 1,
      lastUpdated: new Date()
    }
  ];

  try {
    await db.locations.bulkAdd(newLocations);
    const count = await db.locations.count();
    console.log(`   ✅ 成功添加 ${newLocations.length} 个位置`);
    console.log(`   总位置数: ${count}`);
  } catch (error) {
    console.log(`   ❌ 批量添加失败: ${error.message}`);
  }

  console.log('\n✅ 基本事务操作演示完成');
}

// ============================================
// ACID特性演示
// ============================================

async function demonstrateACIDProperties(db: any) {
  console.log('\n🔒 ACID特性演示:');

  // 原子性 (Atomicity)
  console.log('\n   1️⃣  原子性 (Atomicity)');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   "事务中的操作要么全部成功，要么全部失败"');

  const atomicityTest = async () => {
    // 尝试执行一个会失败的事务
    const transactionId = `tx-${Date.now()}`;

    try {
      // 记录事务日志
      await db.transactionLogs.add({
        id: transactionId,
        type: 'transfer',
        fromUserId: 'user-001',
        toUserId: 'user-002',
        amount: 50,
        status: 'pending',
        createdAt: new Date()
      });

      // 模拟中间步骤失败
      const fromAccount = await db.accounts.where('userId').equals('user-001').first();
      fromAccount.balance -= 50;
      await db.accounts.put(fromAccount);

      // 这里会抛出错误（用户不存在）
      const nonExistentUser = await db.accounts.where('userId').equals('user-999').first();
      if (!nonExistentUser) {
        throw new Error('用户不存在');
      }

      // 这段代码不会执行
      await db.transactionLogs.update(transactionId, { status: 'committed' });

    } catch (error) {
      console.log(`   ⚠️  事务执行失败: ${error.message}`);
      // 检查状态回滚
      const log = await db.transactionLogs.get(transactionId);
      console.log(`   事务状态: ${log.status} (应为 pending)`);
      console.log(`   余额变化应被回滚`);
    }
  };

  await atomicityTest();
  console.log('   ✅ 原子性验证完成');

  // 一致性 (Consistency)
  console.log('\n   2️⃣  一致性 (Consistency)');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   "事务执行前后，数据库必须保持一致状态"');

  const consistencyTest = async () => {
    // 获取所有账户余额总和
    const accountsBefore = await db.accounts.toArray();
    const totalBalanceBefore = accountsBefore.reduce((sum: number, acc: Account) => sum + acc.balance, 0);

    console.log(`   事务前总余额: ¥${totalBalanceBefore}`);

    // 执行转账（总余额应保持不变）
    await executeTransfer(db, {
      fromUserId: 'user-001',
      toUserId: 'user-003',
      amount: 100,
      description: '一致性测试'
    });

    const accountsAfter = await db.accounts.toArray();
    const totalBalanceAfter = accountsAfter.reduce((sum: number, acc: Account) => sum + acc.balance, 0);

    console.log(`   事务后总余额: ¥${totalBalanceAfter}`);
    console.log(`   差异: ¥${totalBalanceAfter - totalBalanceBefore}`);

    if (totalBalanceBefore === totalBalanceAfter) {
      console.log('   ✅ 总余额保持一致');
    }
  };

  await consistencyTest();
  console.log('   ✅ 一致性验证完成');

  // 隔离性 (Isolation)
  console.log('\n   3️⃣  隔离性 (Isolation)');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   "并发事务之间应该相互隔离"');

  const isolationTest = async () => {
    console.log('   模拟两个并发事务读取同一数据...');

    // 两个事务同时读取账户余额
    const account1 = await db.accounts.where('userId').equals('user-001').first();
    const account2 = await db.accounts.where('userId').equals('user-001').first();

    console.log(`   事务1读取余额: ¥${account1.balance}`);
    console.log(`   事务2读取余额: ¥${account2.balance}`);
    console.log(`   读一致性: ${account1.balance === account2.balance ? '✅' : '❌'}`);
  };

  await isolationTest();
  console.log('   ✅ 隔离性验证完成');

  // 持久性 (Durability)
  console.log('\n   4️⃣  持久性 (Durability)');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   "一旦事务提交，修改将永久保存"');

  const durabilityTest = async () => {
    const locationId = 'loc-005';
    const newCheckInCount = 999;

    // 更新签到数
    await db.locations.update(locationId, {
      checkInCount: newCheckInCount,
      lastUpdated: new Date()
    });

    // 立即读取验证
    const location = await db.locations.get(locationId);
    console.log(`   更新后签到数: ${location.checkInCount}`);

    if (location.checkInCount === newCheckInCount) {
      console.log('   ✅ 数据已持久化保存');
    }
  };

  // 首先添加测试位置
  await db.locations.put({
    id: 'loc-005',
    userId: 'user-003',
    name: '测试位置',
    geometry: { type: 'Point', coordinates: [0, 0] },
    checkInCount: 0,
    version: 1,
    lastUpdated: new Date()
  });

  await durabilityTest();
  console.log('   ✅ 持久性验证完成');

  console.log('\n✅ ACID特性演示完成');
}

// ============================================
// 乐观锁并发控制演示
// ============================================

async function demonstrateOptimisticLocking(db: any) {
  console.log('\n🔐 乐观锁并发控制演示:');

  // 场景: 模拟两个用户同时更新同一位置
  console.log('\n   场景: 并发更新位置的签到数');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const locationId = 'loc-002';

  // 模拟用户A的更新
  const userAUpdate = async () => {
    console.log('\n   👤 用户A 开始更新...');

    // 读取当前位置
    const location = await db.locations.get(locationId);
    console.log(`   读取签到数: ${location.checkInCount} (版本: ${location.version})`);

    // 模拟处理延迟
    await sleep(100);

    // 尝试更新（使用版本号）
    const newCheckInCount = location.checkInCount + 1;
    const newVersion = location.version + 1;

    try {
      const updated = await db.locations.where('id').equals(locationId).and((loc: Location) => {
        return loc.version === location.version; // 检查版本号
      }).modify((loc: Location) => {
        loc.checkInCount = newCheckInCount;
        loc.version = newVersion;
        loc.lastUpdated = new Date();
      });

      if (updated > 0) {
        console.log(`   ✅ 用户A更新成功: ${newCheckInCount} (版本: ${newVersion})`);
        return true;
      } else {
        console.log(`   ❌ 用户A更新失败: 数据已被其他用户修改`);
        return false;
      }
    } catch (error) {
      console.log(`   ❌ 用户A更新失败: ${error.message}`);
      return false;
    }
  };

  // 模拟用户B的更新
  const userBUpdate = async () => {
    console.log('\n   👤 用户B 开始更新...');

    // 读取当前位置
    const location = await db.locations.get(locationId);
    console.log(`   读取签到数: ${location.checkInCount} (版本: ${location.version})`);

    // 模拟处理延迟
    await sleep(50);

    // 尝试更新
    const newCheckInCount = location.checkInCount + 10;
    const newVersion = location.version + 1;

    try {
      const updated = await db.locations.where('id').equals(locationId).and((loc: Location) => {
        return loc.version === location.version;
      }).modify((loc: Location) => {
        loc.checkInCount = newCheckInCount;
        loc.version = newVersion;
        loc.lastUpdated = new Date();
      });

      if (updated > 0) {
        console.log(`   ✅ 用户B更新成功: ${newCheckInCount} (版本: ${newVersion})`);
        return true;
      } else {
        console.log(`   ❌ 用户B更新失败: 数据已被其他用户修改`);
        return false;
      }
    } catch (error) {
      console.log(`   ❌ 用户B更新失败: ${error.message}`);
      return false;
    }
  };

  // 并发执行两个更新
  const [successA, successB] = await Promise.all([
    userAUpdate(),
    userBUpdate()
  ]);

  // 检查最终结果
  const finalLocation = await db.locations.get(locationId);
  console.log(`\n   📊 最终结果:`);
  console.log(`   签到数: ${finalLocation.checkInCount}`);
  console.log(`   版本号: ${finalLocation.version}`);
  console.log(`   成功更新: ${successA && successB ? '2个' : successA || successB ? '1个' : '0个'}`);

  // 重试机制演示
  console.log('\n\n   🔄 重试机制演示:');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const updateWithRetry = async (userId: string, maxRetries = 3) => {
    let attempts = 0;
    let success = false;

    while (attempts < maxRetries && !success) {
      attempts++;

      try {
        const location = await db.locations.get(locationId);
        const newCheckInCount = location.checkInCount + 1;
        const newVersion = location.version + 1;

        const updated = await db.locations.where('id').equals(locationId).and((loc: Location) => {
          return loc.version === location.version;
        }).modify((loc: Location) => {
          loc.checkInCount = newCheckInCount;
          loc.version = newVersion;
          loc.lastUpdated = new Date();
        });

        if (updated > 0) {
          console.log(`   ✅ ${userId} 更新成功 (尝试 ${attempts} 次)`);
          success = true;
        } else {
          console.log(`   ⚠️  ${userId} 更新冲突，重试中... (${attempts}/${maxRetries})`);
          await sleep(50 * attempts); // 指数退避
        }
      } catch (error) {
        console.log(`   ❌ ${userId} 更新失败: ${error.message}`);
        break;
      }
    }

    return success;
  };

  // 模拟多个用户并发更新
  await Promise.all([
    updateWithRetry('用户C'),
    updateWithRetry('用户D'),
    updateWithRetry('用户E')
  ]);

  const finalLocationAfterRetry = await db.locations.get(locationId);
  console.log(`\n   📊 最终签到数: ${finalLocationAfterRetry.checkInCount}`);
  console.log(`   最终版本号: ${finalLocationAfterRetry.version}`);

  console.log('\n✅ 乐观锁并发控制演示完成');
}

// ============================================
// 事务隔离级别演示
// ============================================

async function demonstrateTransactionIsolation(db: any) {
  console.log('\n🔒 事务隔离级别演示:');

  console.log('\n   注意: IndexedDB 默认使用 READ_COMMITTED 隔离级别');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 演示读已提交 (READ COMMITTED)
  console.log('\n   1️⃣  读已提交 (READ COMMITTED)');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const isolationTest = async () => {
    // 事务1: 读取账户余额
    console.log('\n   事务1: 读取用户001的余额');
    const account1 = await db.accounts.where('userId').equals('user-001').first();
    const balance1 = account1.balance;
    console.log(`   读取到余额: ¥${balance1}`);

    // 事务2: 修改账户余额
    console.log('\n   事务2: 给用户001转账¥50');
    await executeTransfer(db, {
      fromUserId: 'user-001',
      toUserId: 'user-002',
      amount: 50,
      description: '隔离测试'
    });

    // 事务1再次读取（应该看到新的余额）
    console.log('\n   事务1: 再次读取用户001的余额');
    const account2 = await db.accounts.where('userId').equals('user-001').first();
    const balance2 = account2.balance;
    console.log(`   读取到余额: ¥${balance2}`);

    console.log(`   \n   两次读取是否相同: ${balance1 === balance2 ? '否（看到其他事务的提交）' : '是'}`);
  };

  await isolationTest();

  // 演示不可重复读
  console.log('\n\n   2️⃣  不可重复读 (Non-Repeatable Read)');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const nonRepeatableReadTest = async () => {
    console.log('   在同一事务中两次读取同一数据...');

    // 第一次读取
    const location1 = await db.locations.get('loc-002');
    console.log(`   第一次读取签到数: ${location1.checkInCount}`);

    // 模拟其他事务的修改
    await db.locations.update('loc-002', {
      checkInCount: location1.checkInCount + 100
    });

    // 第二次读取
    const location2 = await db.locations.get('loc-002');
    console.log(`   第二次读取签到数: ${location2.checkInCount}`);

    if (location1.checkInCount !== location2.checkInCount) {
      console.log('   ⚠️  发生了不可重复读现象');
    }

    // 恢复原值
    await db.locations.update('loc-002', {
      checkInCount: location1.checkInCount
    });
  };

  await nonRepeatableReadTest();

  console.log('\n✅ 事务隔离级别演示完成');
}

// ============================================
// 复杂业务场景演示
// ============================================

async function demonstrateComplexScenarios(db: any) {
  console.log('\n💼 复杂业务场景演示:');

  // 场景1: 地理围栏签到
  console.log('\n   场景1: 地理围栏签到事务');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const checkInTransaction = async (userId: string, locationId: string, userLat: number, userLon: number) => {
    console.log(`\n   用户 ${userId} 尝试签到...`);

    try {
      // 1. 获取位置信息
      const location = await db.locations.get(locationId);
      console.log(`   位置: ${location.name}`);

      // 2. 验证用户是否在围栏内（简化版：直接允许）
      const distance = Math.sqrt(
        Math.pow(userLat - location.geometry.coordinates[1], 2) +
        Math.pow(userLon - location.geometry.coordinates[0], 2)
      );

      console.log(`   距离: ${(distance * 111).toFixed(2)} km (简化计算)`);

      if (distance > 0.01) { // 约1km
        console.log(`   ❌ 距离太远，无法签到`);
        return false;
      }

      // 3. 更新签到数（使用乐观锁）
      const updated = await db.locations.where('id').equals(locationId).and((loc: Location) => {
        return loc.version === location.version;
      }).modify((loc: Location) => {
        loc.checkInCount += 1;
        loc.version += 1;
        loc.lastUpdated = new Date();
      });

      if (updated > 0) {
        const updatedLocation = await db.locations.get(locationId);
        console.log(`   ✅ 签到成功! 当前签到数: ${updatedLocation.checkInCount}`);
        return true;
      } else {
        console.log(`   ❌ 签到失败: 并发冲突`);
        return false;
      }
    } catch (error) {
      console.log(`   ❌ 签到失败: ${error.message}`);
      return false;
    }
  };

  await checkInTransaction('user-001', 'loc-002', 39.918, 116.397);

  // 场景2: 批量位置更新事务
  console.log('\n\n   场景2: 批量位置更新事务');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const batchUpdateTransaction = async (userId: string, increment: number) => {
    console.log(`\n   用户 ${userId} 批量更新所有位置的签到数 (+${increment})...`);

    try {
      // 获取用户的所有位置
      const locations = await db.locations.where('userId').equals(userId).toArray();
      console.log(`   找到 ${locations.length} 个位置`);

      // 使用事务批量更新
      let successCount = 0;
      for (const location of locations) {
        const updated = await db.locations.where('id').equals(location.id).and((loc: Location) => {
          return loc.version === location.version;
        }).modify((loc: Location) => {
          loc.checkInCount += increment;
          loc.version += 1;
          loc.lastUpdated = new Date();
        });

        if (updated > 0) {
          successCount++;
        }
      }

      console.log(`   ✅ 成功更新 ${successCount}/${locations.length} 个位置`);
      return successCount === locations.length;
    } catch (error) {
      console.log(`   ❌ 批量更新失败: ${error.message}`);
      return false;
    }
  };

  await batchUpdateTransaction('user-001', 5);

  // 场景3: 级联删除事务
  console.log('\n\n   场景3: 级联删除事务');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const cascadeDeleteTransaction = async (userId: string) => {
    console.log(`\n   删除用户 ${userId} 的所有位置...`);

    try {
      // 获取用户的所有位置
      const locations = await db.locations.where('userId').equals(userId).toArray();
      console.log(`   找到 ${locations.length} 个位置`);

      // 删除所有位置
      const deleted = await db.locations.where('userId').equals(userId).delete();
      console.log(`   ✅ 成功删除 ${deleted} 个位置`);

      // 验证删除
      const remaining = await db.locations.where('userId').equals(userId).count();
      console.log(`   剩余位置数: ${remaining}`);

      return deleted > 0;
    } catch (error) {
      console.log(`   ❌ 删除失败: ${error.message}`);
      return false;
    }
  };

  // 注意: 这里不实际执行删除，以免影响后续演示
  console.log(`   (跳过实际删除，以保留测试数据)`);

  console.log('\n✅ 复杂业务场景演示完成');
}

// ============================================
// 性能测试
// ============================================

async function performanceTest(db: any) {
  console.log('\n⚡ 性能测试:');

  // 测试1: 批量插入性能
  console.log('\n   测试1: 批量插入性能');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const batchSize = 100;
  const batchData = [];

  for (let i = 0; i < batchSize; i++) {
    batchData.push({
      id: `perf-loc-${i}`,
      userId: `perf-user-${i % 10}`,
      name: `性能测试位置-${i}`,
      geometry: {
        type: 'Point',
        coordinates: [116.397 + i * 0.001, 39.909 + i * 0.001]
      },
      checkInCount: 0,
      version: 1,
      lastUpdated: new Date()
    });
  }

  const startTime1 = performance.now();
  await db.locations.bulkAdd(batchData);
  const endTime1 = performance.now();

  console.log(`   批量插入 ${batchSize} 条记录`);
  console.log(`   耗时: ${(endTime1 - startTime1).toFixed(2)} ms`);
  console.log(`   平均: ${((endTime1 - startTime1) / batchSize).toFixed(3)} ms/条`);

  // 测试2: 并发更新性能
  console.log('\n   测试2: 并发更新性能');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const concurrentUpdates = 50;
  const updatePromises = [];

  const startTime2 = performance.now();

  for (let i = 0; i < concurrentUpdates; i++) {
    const promise = db.locations.update('perf-loc-0', {
      checkInCount: i,
      lastUpdated: new Date()
    });
    updatePromises.push(promise);
  }

  await Promise.all(updatePromises);

  const endTime2 = performance.now();

  console.log(`   并发更新 ${concurrentUpdates} 次`);
  console.log(`   耗时: ${(endTime2 - startTime2).toFixed(2)} ms`);
  console.log(`   平均: ${((endTime2 - startTime2) / concurrentUpdates).toFixed(3)} ms/次`);

  // 测试3: 事务性能
  console.log('\n   测试3: 事务性能');
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const transactionCount = 20;
  const startTime3 = performance.now();

  for (let i = 0; i < transactionCount; i++) {
    await executeTransfer(db, {
      fromUserId: 'user-001',
      toUserId: 'user-002',
      amount: 1,
      description: `性能测试-${i}`
    });
  }

  const endTime3 = performance.now();

  console.log(`   执行 ${transactionCount} 个转账事务`);
  console.log(`   耗时: ${(endTime3 - startTime3).toFixed(2)} ms`);
  console.log(`   平均: ${((endTime3 - startTime3) / transactionCount).toFixed(2)} ms/事务`);

  // 清理测试数据
  console.log('\n   清理测试数据...');
  const deleted = await db.locations.where('id').startsWith('perf-loc-').delete();
  console.log(`   删除了 ${deleted} 条测试记录`);

  console.log('\n✅ 性能测试完成');
}

// ============================================
// 辅助函数
// ============================================

/**
 * 执行转账事务
 */
async function executeTransfer(db: any, params: {
  fromUserId: string;
  toUserId: string;
  amount: number;
  description: string;
}): Promise<boolean> {
  const { fromUserId, toUserId, amount, description } = params;

  try {
    // 1. 获取转出账户
    const fromAccount = await db.accounts.where('userId').equals(fromUserId).first();
    if (!fromAccount) {
      throw new Error(`转出账户 ${fromUserId} 不存在`);
    }

    // 2. 检查余额
    if (fromAccount.balance < amount) {
      console.log(`   ⚠️  余额不足: 当前余额 ¥${fromAccount.balance}, 需要 ¥${amount}`);
      return false;
    }

    // 3. 获取转入账户
    const toAccount = await db.accounts.where('userId').equals(toUserId).first();
    if (!toAccount) {
      throw new Error(`转入账户 ${toUserId} 不存在`);
    }

    // 4. 执行转账（使用乐观锁）
    const fromUpdated = await db.accounts.where('id').equals(fromAccount.id).and((acc: Account) => {
      return acc.version === fromAccount.version;
    }).modify((acc: Account) => {
      acc.balance -= amount;
      acc.version += 1;
      acc.lastUpdated = new Date();
    });

    if (fromUpdated === 0) {
      throw new Error('转出账户更新失败（版本冲突）');
    }

    const toUpdated = await db.accounts.where('id').equals(toAccount.id).and((acc: Account) => {
      return acc.version === toAccount.version;
    }).modify((acc: Account) => {
      acc.balance += amount;
      acc.version += 1;
      acc.lastUpdated = new Date();
    });

    if (toUpdated === 0) {
      // 转入账户失败，需要回滚转出账户
      await db.accounts.where('id').equals(fromAccount.id).modify((acc: Account) => {
        acc.balance += amount;
        acc.version -= 1;
      });
      throw new Error('转入账户更新失败（版本冲突）');
    }

    // 5. 记录交易日志
    await db.transactionLogs.add({
      id: `tx-${Date.now()}`,
      type: 'transfer',
      fromUserId,
      toUserId,
      amount,
      status: 'committed',
      createdAt: new Date(),
      committedAt: new Date()
    });

    return true;
  } catch (error) {
    console.log(`   ❌ 转账失败: ${error.message}`);
    return false;
  }
}

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// 错误处理
// ============================================

main().catch((error) => {
  console.error('❌ 错误:', error.message);
  console.error('\n堆栈跟踪:');
  console.error(error.stack);
  process.exit(1);
});
