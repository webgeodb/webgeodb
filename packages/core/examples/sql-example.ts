/**
 * WebGeoDB SQL 查询示例
 *
 * 这个示例演示了如何使用 SQL 查询功能
 */

import { WebGeoDB } from '@webgeodb/core';

async function sqlExample() {
  // 创建数据库实例
  const db = new WebGeoDB({
    name: 'webgeodb-sql-example',
    version: 1
  });

  // 定义表结构
  db.schema({
    features: {
      id: 'string',
      name: 'string',
      type: 'string',
      rating: 'number',
      geometry: 'geometry'
    }
  });

  // 打开数据库
  await db.open();

  // 清空现有数据
  await db.features.clear();

  // 创建空间索引
  db.features.createIndex('geometry');

  // 插入测试数据
  await db.features.insertMany([
    {
      id: '1',
      name: '天安门广场',
      type: 'landmark',
      rating: 5,
      geometry: {
        type: 'Point',
        coordinates: [116.397128, 39.916527]
      }
    },
    {
      id: '2',
      name: '故宫博物院',
      type: 'landmark',
      rating: 5,
      geometry: {
        type: 'Point',
        coordinates: [116.397477, 39.918058]
      }
    },
    {
      id: '3',
      name: '颐和园',
      type: 'park',
      rating: 4,
      geometry: {
        type: 'Point',
        coordinates: [116.273, 39.999]
      }
    },
    {
      id: '4',
      name: '天坛公园',
      type: 'park',
      rating: 4,
      geometry: {
        type: 'Point',
        coordinates: [116.4074, 39.8822]
      }
    }
  ]);

  console.log('✅ 测试数据已插入');

  // ========== 示例 1: 简单 SELECT 查询 ==========
  console.log('\n=== 示例 1: 简单 SELECT 查询 ===');
  const landmarks = await db.query(`
    SELECT * FROM features
    WHERE type = 'landmark'
  `);
  console.log('地标:', landmarks.map((f: any) => f.name));

  // ========== 示例 2: 使用参数化查询 ==========
  console.log('\n=== 示例 2: 参数化查询 ===');
  const parks = await db.query(`
    SELECT * FROM features
    WHERE type = ? AND rating >= ?
  `, ['park', 4]);
  console.log('高评分公园:', parks.map((f: any) => f.name));

  // ========== 示例 3: 使用预编译语句 ==========
  console.log('\n=== 示例 3: 预编译语句 ===');
  const stmt = db.prepare(`
    SELECT * FROM features
    WHERE rating >= ?
  `);
  const highlyRated = await stmt.execute([4]);
  console.log('高评分景点:', highlyRated.map((f: any) => f.name));

  // ========== 示例 4: 空间查询 - ST_DWithin ==========
  console.log('\n=== 示例 4: 空间距离查询 ===');
  const nearby = await db.query(`
    SELECT * FROM features
    WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 5000)
  `);
  console.log('5公里内的景点:', nearby.map((f: any) => f.name));

  // ========== 示例 5: ORDER BY 和 LIMIT ==========
  console.log('\n=== 示例 5: 排序和限制 ===');
  const topRated = await db.query(`
    SELECT name, rating
    FROM features
    ORDER BY rating DESC
    LIMIT 2
  `);
  console.log('评分最高的2个景点:', topRated);

  // ========== 示例 6: 查询计划分析 ==========
  console.log('\n=== 示例 6: 查询计划分析 ===');
  const plan = db.explain(`
    SELECT * FROM features WHERE type = ?
  `);
  console.log('查询计划:', plan);

  // ========== 示例 7: 缓存统计 ==========
  console.log('\n=== 示例 7: 缓存统计 ===');
  const cacheStats = db.getQueryCacheStats();
  console.log('缓存统计:', cacheStats);

  // 关闭数据库
  await db.close();
  console.log('\n✅ 示例完成');
}

// 运行示例
sqlExample().catch(console.error);
