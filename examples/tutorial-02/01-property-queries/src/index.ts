/**
 * WebGeoDB 教程示例
 *
 * 章节: 第2章 - 空间查询基础
 * 示例: 属性查询进阶
 *
 * 学习目标:
 * 1. 掌握多条件组合查询的使用方法
 * 2. 学习嵌套属性的访问和查询
 * 3. 理解排序和分页的实现
 * 4. 构建复杂的查询条件
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
 * 章节: 第2章 - 空间查询基础
 * 示例: 属性查询进阶
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
 * 步骤 5: 插入测试数据...
 * ✅ 测试数据插入成功
 *
 * 示例 1: 多条件组合查询
 * 查找类型为'餐厅'且评分>=4.0的场所
 * ✅ 查询成功
 *
 * 示例 2: 嵌套属性查询
 * 查找营业中的场所
 * ✅ 查询成功
 *
 * 示例 3: 排序和分页
 * 按评分降序排列，获取前3个结果
 * ✅ 查询成功
 *
 * 示例 4: 复杂查询构建
 * 查找营业中、类型为餐厅或咖啡馆、评分>=4.0的场所
 * ✅ 查询成功
 *
 * 清理: 关闭数据库...
 * ✅ 数据库已关闭
 *
 * === 示例执行完成 ===
 * ```
 */

import { WebGeoDB } from '@webgeodb/core';

// ============================================
// 类型定义
// ============================================

interface Place {
  id: string;
  name: string;
  type: string;
  rating: number;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    isOpen: boolean;
    openHours: string;
    priceRange: string;
    tags: string[];
  };
  createdAt: Date;
}

// ============================================
// 配置
// ============================================

const DB_CONFIG = {
  name: 'tutorial-02-01-property-queries',
  version: 1
};

// ============================================
// 测试数据
// ============================================

const PLACES_DATA: Place[] = [
  {
    id: '1',
    name: '美味餐厅',
    type: '餐厅',
    rating: 4.5,
    geometry: {
      type: 'Point',
      coordinates: [116.4074, 39.9042] // 北京天安门附近
    },
    properties: {
      isOpen: true,
      openHours: '10:00-22:00',
      priceRange: '¥¥',
      tags: ['中餐', '火锅', '聚餐']
    },
    createdAt: new Date('2024-01-01')
  },
  {
    id: '2',
    name: '星空咖啡馆',
    type: '咖啡馆',
    rating: 4.2,
    geometry: {
      type: 'Point',
      coordinates: [116.4075, 39.9043]
    },
    properties: {
      isOpen: true,
      openHours: '08:00-20:00',
      priceRange: '¥',
      tags: ['咖啡', '甜品', '阅读']
    },
    createdAt: new Date('2024-01-02')
  },
  {
    id: '3',
    name: '快捷酒店',
    type: '酒店',
    rating: 3.8,
    geometry: {
      type: 'Point',
      coordinates: [116.4076, 39.9044]
    },
    properties: {
      isOpen: false,
      openHours: '24小时',
      priceRange: '¥¥¥',
      tags: ['住宿', '商务']
    },
    createdAt: new Date('2024-01-03')
  },
  {
    id: '4',
    name: '购物中心',
    type: '购物中心',
    rating: 4.7,
    geometry: {
      type: 'Point',
      coordinates: [116.4077, 39.9045]
    },
    properties: {
      isOpen: true,
      openHours: '10:00-22:00',
      priceRange: '¥¥¥',
      tags: ['购物', '娱乐', '餐饮']
    },
    createdAt: new Date('2024-01-04')
  },
  {
    id: '5',
    name: '街角小吃',
    type: '餐厅',
    rating: 3.9,
    geometry: {
      type: 'Point',
      coordinates: [116.4078, 39.9046]
    },
    properties: {
      isOpen: true,
      openHours: '11:00-21:00',
      priceRange: '¥',
      tags: ['快餐', '小吃']
    },
    createdAt: new Date('2024-01-05')
  },
  {
    id: '6',
    name: '艺术画廊',
    type: '文化场所',
    rating: 4.6,
    geometry: {
      type: 'Point',
      coordinates: [116.4079, 39.9047]
    },
    properties: {
      isOpen: false,
      openHours: '09:00-17:00',
      priceRange: '¥¥',
      tags: ['艺术', '展览']
    },
    createdAt: new Date('2024-01-06')
  }
];

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('=== WebGeoDB 教程示例 ===');
  console.log('章节: 第2章 - 空间查询基础');
  console.log('示例: 属性查询进阶\n');

  // 步骤 1: 创建数据库实例
  console.log('步骤 1: 创建数据库实例...');
  const db = new WebGeoDB(DB_CONFIG);
  console.log('✅ 数据库实例创建成功');

  // 步骤 2: 定义表结构
  console.log('\n步骤 2: 定义表结构...');
  db.schema({
    places: {
      id: 'string',
      name: 'string',
      type: 'string',
      rating: 'number',
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

  // 步骤 4: 创建空间索引
  console.log('\n步骤 4: 创建空间索引...');
  db.places.createIndex('geometry', { auto: true });
  console.log('✅ 空间索引创建成功');

  // 步骤 5: 插入测试数据
  console.log('\n步骤 5: 插入测试数据...');
  await db.places.insertMany(PLACES_DATA);
  console.log(`✅ 测试数据插入成功 (${PLACES_DATA.length} 条记录)`);

  // ============================================
  // 示例 1: 多条件组合查询
  // ============================================

  console.log('\n示例 1: 多条件组合查询');
  console.log('查找类型为\'餐厅\'且评分>=4.0的场所');

  const result1 = await db.places
    .where('type', '=', '餐厅')
    .where('rating', '>=', 4.0)
    .find();

  console.log('✅ 查询成功');
  console.log(`找到 ${result1.length} 个结果:`);
  result1.forEach((place: any) => {
    console.log(`  - ${place.name} (${place.type}): 评分 ${place.rating}`);
  });

  // ============================================
  // 示例 2: 嵌套属性查询
  // ============================================

  console.log('\n示例 2: 嵌套属性查询');
  console.log('查找营业中的场所');

  const result2 = await db.places
    .where('properties.isOpen', '=', true)
    .find();

  console.log('✅ 查询成功');
  console.log(`找到 ${result2.length} 个结果:`);
  result2.forEach((place: any) => {
    console.log(`  - ${place.name}: ${place.properties.isOpen ? '营业中' : '已关闭'}`);
  });

  // ============================================
  // 示例 3: 排序和分页
  // ============================================

  console.log('\n示例 3: 排序和分页');
  console.log('按评分降序排列，获取前3个结果');

  const result3 = await db.places
    .where('rating', '>=', 0)
    .orderBy('rating', 'desc')
    .limit(3)
    .find();

  console.log('✅ 查询成功');
  console.log(`找到 ${result3.length} 个结果:`);
  result3.forEach((place: any, index: number) => {
    console.log(`  ${index + 1}. ${place.name}: 评分 ${place.rating}`);
  });

  // ============================================
  // 示例 4: 复杂查询构建
  // ============================================

  console.log('\n示例 4: 复杂查询构建');
  console.log('查找营业中、类型为餐厅或咖啡馆、评分>=4.0的场所');

  // 注意: 由于当前实现不支持 OR 条件，这里使用多次查询模拟
  const result4a = await db.places
    .where('type', '=', '餐厅')
    .where('properties.isOpen', '=', true)
    .where('rating', '>=', 4.0)
    .find();

  const result4b = await db.places
    .where('type', '=', '咖啡馆')
    .where('properties.isOpen', '=', true)
    .where('rating', '>=', 4.0)
    .find();

  // 合并结果并去重
  const result4 = [...result4a, ...result4b];
  const uniqueResult4 = Array.from(
    new Map(result4.map((item: any) => [item.id, item])).values()
  );

  console.log('✅ 查询成功');
  console.log(`找到 ${uniqueResult4.length} 个结果:`);
  uniqueResult4.forEach((place: any) => {
    console.log(`  - ${place.name} (${place.type}): 评分 ${place.rating}, ${place.properties.isOpen ? '营业中' : '已关闭'}`);
  });

  // ============================================
  // 示例 5: 使用分页获取所有结果
  // ============================================

  console.log('\n示例 5: 使用分页获取所有结果');
  console.log('每页2条记录，获取第2页');

  const pageSize = 2;
  const pageNumber = 2;

  const result5 = await db.places
    .orderBy('rating', 'desc')
    .limit(pageSize)
    .offset((pageNumber - 1) * pageSize)
    .find();

  console.log('✅ 查询成功');
  console.log(`第 ${pageNumber}页，每页 ${pageSize} 条:`);
  result5.forEach((place: any, index: number) => {
    console.log(`  ${index + 1}. ${place.name}: 评分 ${place.rating}`);
  });

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
