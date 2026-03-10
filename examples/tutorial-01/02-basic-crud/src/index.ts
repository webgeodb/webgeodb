/**
 * WebGeoDB 教程示例
 *
 * 章节: 第1章 - 快速入门
 * 示例: CRUD基础操作
 *
 * 学习目标:
 * 1. 掌握数据的插入操作（单条和批量）
 * 2. 学会各种查询方法（单条、条件、排序、分页）
 * 3. 理解数据更新和删除操作
 *
 * 前置要求:
 * - Node.js >= 16
 * - TypeScript >= 4.5
 * - 完成 01-first-database 示例
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
 * 章节: 第1章 - 快速入门
 * 示例: CRUD基础操作
 *
 * 步骤 1: 初始化数据库...
 * ✅ 数据库初始化完成
 *
 * 步骤 2: 插入数据（单条）...
 * ✅ 成功插入 1 条记录
 *
 * 步骤 3: 插入数据（批量）...
 * ✅ 成功插入 3 条记录
 *
 * 步骤 4: 查询数据（单条）...
 * ✅ 查询结果: 北京天安门
 *
 * 步骤 5: 查询数据（条件查询）...
 * ✅ 找到 2 个餐厅
 * ...
 * ```
 */

import { WebGeoDB } from '@webgeodb/core';

// ============================================
// 配置
// ============================================

const DB_CONFIG = {
  name: 'tutorial-01-basic-crud',
  version: 1
};

// ============================================
// 数据类型定义
// ============================================

interface Feature {
  id: string;
  name: string;
  type: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    category?: string;
    rating?: number;
    price?: string;
    description?: string;
  };
  createdAt: Date;
}

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('=== WebGeoDB 教程示例 ===');
  console.log('章节: 第1章 - 快速入门');
  console.log('示例: CRUD基础操作\n');

  // 步骤 1: 初始化数据库
  console.log('步骤 1: 初始化数据库...');
  const db = new WebGeoDB(DB_CONFIG);
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
  await db.open();
  db.features.createIndex('geometry', { auto: true });
  console.log('✅ 数据库初始化完成\n');

  // 步骤 2: 插入数据（单条）
  console.log('步骤 2: 插入数据（单条）...');
  const feature1: Feature = {
    id: '1',
    name: '北京天安门',
    type: 'landmark',
    geometry: {
      type: 'Point',
      coordinates: [116.397428, 39.90923]
    },
    properties: {
      description: '中国的象征，位于北京市中心',
      rating: 5.0
    },
    createdAt: new Date()
  };
  await db.features.insert(feature1);
  console.log('✅ 成功插入 1 条记录');
  console.log(`   ID: ${feature1.id}`);
  console.log(`   名称: ${feature1.name}\n`);

  // 步骤 3: 插入数据（批量）
  console.log('步骤 3: 插入数据（批量）...');
  const features: Feature[] = [
    {
      id: '2',
      name: '全聚德烤鸭店',
      type: 'restaurant',
      geometry: {
        type: 'Point',
        coordinates: [116.407526, 39.904989]
      },
      properties: {
        category: 'chinese',
        rating: 4.5,
        price: '$$$'
      },
      createdAt: new Date()
    },
    {
      id: '3',
      name: '星巴克咖啡',
      type: 'cafe',
      geometry: {
        type: 'Point',
        coordinates: [116.417526, 39.914989]
      },
      properties: {
        category: 'coffee',
        rating: 4.2,
        price: '$$'
      },
      createdAt: new Date()
    },
    {
      id: '4',
      name: '海底捞火锅',
      type: 'restaurant',
      geometry: {
        type: 'Point',
        coordinates: [116.427526, 39.924989]
      },
      properties: {
        category: 'chinese',
        rating: 4.8,
        price: '$$'
      },
      createdAt: new Date()
    }
  ];
  await db.features.insertMany(features);
  console.log('✅ 成功插入 3 条记录\n');

  // 步骤 4: 查询数据（单条 - 通过ID）
  console.log('步骤 4: 查询数据（单条）...');
  const found = await db.features.get('1');
  if (found) {
    console.log('✅ 查询结果:');
    console.log(`   ID: ${found.id}`);
    console.log(`   名称: ${found.name}`);
    console.log(`   类型: ${found.type}\n`);
  }

  // 步骤 5: 查询数据（条件查询）
  console.log('步骤 5: 查询数据（条件查询）...');
  const restaurants = await db.features
    .where('type', '=', 'restaurant')
    .toArray();
  console.log(`✅ 找到 ${restaurants.length} 个餐厅:`);
  restaurants.forEach(r => {
    console.log(`   - ${r.name} (${r.properties.category}) - ${r.properties.rating}⭐`);
  });
  console.log();

  // 步骤 6: 查询数据（复杂条件）
  console.log('步骤 6: 查询数据（复杂条件）...');
  const highRated = await db.features
    .where('properties.rating', '>', 4.5)
    .orderBy('properties.rating', 'desc')
    .toArray();
  console.log(`✅ 找到 ${highRated.length} 个高评分地点 (>4.5⭐):`);
  highRated.forEach(r => {
    console.log(`   - ${r.name}: ${r.properties.rating}⭐`);
  });
  console.log();

  // 步骤 7: 查询数据（分页）
  console.log('步骤 7: 查询数据（分页）...');
  const page1 = await db.features
    .orderBy('createdAt', 'desc')
    .offset(0)
    .limit(2)
    .toArray();
  console.log('✅ 第1页 (每页2条):');
  page1.forEach(r => {
    console.log(`   - ${r.name}`);
  });
  console.log();

  // 步骤 8: 查询数据（统计）
  console.log('步骤 8: 查询数据（统计）...');
  const totalCount = await db.features.count();
  const restaurantCount = await db.features
    .where('type', '=', 'restaurant')
    .count();
  console.log('✅ 统计信息:');
  console.log(`   总记录数: ${totalCount}`);
  console.log(`   餐厅数量: ${restaurantCount}`);
  console.log(`   其他地点: ${totalCount - restaurantCount}\n`);

  // 步骤 9: 更新数据
  console.log('步骤 9: 更新数据...');
  await db.features.update('1', {
    properties: {
      ...feature1.properties,
      visitors: 1000000
    }
  });
  const updated = await db.features.get('1');
  console.log('✅ 更新成功:');
  console.log(`   ID: ${updated.id}`);
  console.log(`   名称: ${updated.name}`);
  console.log(`   访客数: ${updated.properties.visitors}\n`);

  // 步骤 10: 删除数据
  console.log('步骤 10: 删除数据...');
  const beforeDelete = await db.features.count();
  await db.features.delete('1');
  const afterDelete = await db.features.count();
  console.log('✅ 删除成功:');
  console.log(`   删除前: ${beforeDelete} 条记录`);
  console.log(`   删除后: ${afterDelete} 条记录\n`);

  // 清理: 关闭数据库
  console.log('清理: 关闭数据库...');
  await db.close();
  console.log('✅ 数据库已关闭');

  console.log('\n=== 示例执行完成 ===');
  console.log('\n💡 提示:');
  console.log('   - 你已经掌握了 WebGeoDB 的基本 CRUD 操作');
  console.log('   - insert/insertMany: 插入数据');
  console.log('   - get: 获取单条数据');
  console.log('   - where: 条件查询');
  console.log('   - orderBy: 排序');
  console.log('   - offset/limit: 分页');
  console.log('   - count: 统计');
  console.log('   - update: 更新数据');
  console.log('   - delete: 删除数据');
  console.log('   - 下一步: 学习空间查询和实际应用');
  console.log('   - 继续学习: 03-place-markers 示例');
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
