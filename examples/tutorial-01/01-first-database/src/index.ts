/**
 * WebGeoDB 教程示例
 *
 * 章节: 第1章 - 快速入门
 * 示例: 创建第一个数据库
 *
 * 学习目标:
 * 1. 理解 WebGeoDB 的基本概念
 * 2. 学会创建和初始化数据库
 * 3. 掌握表结构定义和索引创建
 *
 * 前置要求:
 * - Node.js >= 16
 * - TypeScript >= 4.5
 *
 * 运行方式:
 * ```bash
 * # 安装依赖
 * npm install
 *
 * # 运行示例
 * npm start
 *
 * # 运行测试
 * npm test
 * ```
 *
 * 预期输出:
 * ```
 * === WebGeoDB 教程示例 ===
 * 章节: 第1章 - 快速入门
 * 示例: 创建第一个数据库
 *
 * 步骤 1: 创建数据库实例...
 * ✅ 数据库实例创建成功
 *
 * 步骤 2: 定义表结构...
 * ✅ 表结构定义成功
 *
 * 步骤 3: 打开数据库...
 * ✅ 数据库打开成功
 *
 * 步骤 4: 创建空间索引...
 * ✅ 空间索引创建成功
 *
 * 步骤 5: 验证表结构...
 * ✅ 表结构验证成功
 *
 * 清理: 关闭数据库...
 * ✅ 数据库已关闭
 *
 * === 示例执行完成 ===
 * ```
 */

import { WebGeoDB } from '@webgeodb/core';

// ============================================
// 配置
// ============================================

const DB_CONFIG = {
  name: 'tutorial-01-first-database',
  version: 1
};

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('=== WebGeoDB 教程示例 ===');
  console.log('章节: 第1章 - 快速入门');
  console.log('示例: 创建第一个数据库\n');

  // 步骤 1: 创建数据库实例
  console.log('步骤 1: 创建数据库实例...');
  const db = new WebGeoDB(DB_CONFIG);
  console.log('✅ 数据库实例创建成功');
  console.log(`   数据库名称: ${DB_CONFIG.name}`);
  console.log(`   版本: ${DB_CONFIG.version}`);

  // 步骤 2: 定义表结构
  console.log('\n步骤 2: 定义表结构...');
  db.schema({
    features: {
      id: 'string',
      name: 'string',
      type: 'string',
      geometry: 'geometry',
      properties: 'json',
      createdAt: 'datetime'
    }
  });
  console.log('✅ 表结构定义成功');
  console.log('   表名: features');
  console.log('   字段:');
  console.log('     - id: string (主键)');
  console.log('     - name: string (名称)');
  console.log('     - type: string (类型)');
  console.log('     - geometry: geometry (几何对象)');
  console.log('     - properties: json (属性对象)');
  console.log('     - createdAt: datetime (创建时间)');

  // 步骤 3: 打开数据库
  console.log('\n步骤 3: 打开数据库...');
  await db.open();
  console.log('✅ 数据库打开成功');
  console.log(`   数据库位置: 浏览器 IndexedDB 或 文件系统`);

  // 步骤 4: 创建索引
  console.log('\n步骤 4: 创建空间索引...');
  db.features.createIndex('geometry', { auto: true });
  console.log('✅ 空间索引创建成功');
  console.log('   索引字段: geometry');
  console.log('   索引类型: R-tree 空间索引');

  // 步骤 5: 验证表结构
  console.log('\n步骤 5: 验证表结构...');
  const count = await db.features.count();
  console.log('✅ 表结构验证成功');
  console.log(`   当前数据量: ${count} 条记录`);

  // 清理: 关闭数据库
  console.log('\n清理: 关闭数据库...');
  await db.close();
  console.log('✅ 数据库已关闭');

  console.log('\n=== 示例执行完成 ===');
  console.log('\n💡 提示:');
  console.log('   - 你已经成功创建了第一个 WebGeoDB 数据库');
  console.log('   - 下一步: 学习如何进行 CRUD 操作');
  console.log('   - 继续学习: 02-basic-crud 示例');
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
