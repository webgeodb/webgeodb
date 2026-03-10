/**
 * WebGeoDB 教程示例
 *
 * 章节: 第{N}章 - {章节标题}
 * 示例: {示例名称}
 *
 * 学习目标:
 * 1. {学习目标1}
 * 2. {学习目标2}
 * 3. {学习目标3}
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
 * {预期的控制台输出}
 * ```
 */

import { WebGeoDB } from '@webgeodb/core';

// ============================================
// 配置
// ============================================

const DB_CONFIG = {
  name: 'tutorial-{N:02d}-{example-slug}',
  version: 1
};

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('=== WebGeoDB 教程示例 ===');
  console.log('章节: 第{N}章 - {章节标题}');
  console.log('示例: {示例名称}\n');

  // 步骤 1: 创建数据库实例
  console.log('步骤 1: 创建数据库实例...');
  const db = new WebGeoDB(DB_CONFIG);
  console.log('✅ 数据库实例创建成功');

  // 步骤 2: 定义表结构
  console.log('\n步骤 2: 定义表结构...');
  db.schema({
    // 表结构定义
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

  // 步骤 3: 打开数据库
  console.log('\n步骤 3: 打开数据库...');
  await db.open();
  console.log('✅ 数据库打开成功');

  // 步骤 4: 创建索引
  console.log('\n步骤 4: 创建空间索引...');
  db.features.createIndex('geometry', { auto: true });
  console.log('✅ 空间索引创建成功');

  // 步骤 5+: 实现示例逻辑
  console.log('\n步骤 5: {步骤描述}...');
  // 实现具体的示例逻辑

  // 清理: 关闭数据库
  console.log('\n清理: 关闭数据库...');
  await db.close();
  console.log('✅ 数据库已关闭');

  console.log('\n=== 示例执行完成 ===');
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

// ============================================
// 工具函数（如果需要）
// ============================================

/**
 * 工具函数说明
 *
 * @param param - 参数说明
 * @returns 返回值说明
 */
function utilityFunction(param: any): any {
  // 实现
}
