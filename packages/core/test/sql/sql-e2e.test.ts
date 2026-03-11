/**
 * SQL 功能端到端验证测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebGeoDB } from '../../src/index';

describe('SQL 功能端到端验证', () => {
  let db: WebGeoDB;

  beforeEach(async () => {
    db = new WebGeoDB({
      name: 'sql-e2e-test',
      version: 1
    });

    db.schema({
      features: {
        id: 'string',
        name: 'string',
        type: 'string',
        rating: 'number',
        geometry: 'geometry'
      }
    });

    await db.open();

    // 清空并插入测试数据
    await db.features.clear();

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
  });

  afterEach(async () => {
    await db.close();
  });

  it('应该执行简单的 SELECT 查询', async () => {
    const results = await db.query(`
      SELECT * FROM features
      WHERE type = 'landmark'
    `);

    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('天安门广场');
    expect(results[1].name).toBe('故宫博物院');
  });

  it('应该执行带参数的查询', async () => {
    const results = await db.query(`
      SELECT * FROM features
      WHERE rating >= $1
    `, [5]);

    expect(results).toHaveLength(2);
    expect(results.every((r: any) => r.rating >= 5)).toBe(true);
  });

  it('应该执行 ORDER BY 查询', async () => {
    const results = await db.query(`
      SELECT name, rating FROM features
      ORDER BY rating DESC
      LIMIT 2
    `);

    expect(results).toHaveLength(2);
    expect(results[0].rating).toBeGreaterThanOrEqual(results[1].rating);
  });

  it('应该创建预编译语句', async () => {
    const stmt = db.prepare(`
      SELECT * FROM features
      WHERE type = $1
    `);

    expect(stmt).toBeDefined();
    expect(typeof stmt.execute).toBe('function');
    expect(typeof stmt.explain).toBe('function');
    expect(typeof stmt.getSQL).toBe('function');
  });

  it('应该执行预编译语句', async () => {
    const stmt = db.prepare(`
      SELECT * FROM features
      WHERE rating >= $1
    `);

    const results = await stmt.execute([4]);

    expect(results).toHaveLength(4);
    expect(results.every((r: any) => r.rating >= 4)).toBe(true);
  });

  it('应该分析查询计划', async () => {
    const plan = db.explain(`
      SELECT * FROM features WHERE type = $1
    `);

    expect(plan).toBeDefined();
    expect(plan.table).toBe('features');
    expect(plan.columns).toBeDefined();
    expect(Array.isArray(plan.columns)).toBe(true);
  });

  it('应该支持缓存管理', async () => {
    // 第一次查询
    await db.query(`SELECT * FROM features WHERE type = 'landmark'`);

    // 获取缓存统计
    const stats = db.getQueryCacheStats();

    expect(stats).toBeDefined();
    expect(stats.size).toBeGreaterThan(0);
    expect(stats.maxSize).toBeGreaterThan(0);
  });

  it('应该使缓存失效', async () => {
    // 执行查询以填充缓存
    await db.query(`SELECT * FROM features WHERE type = 'landmark'`);

    // 使缓存失效
    db.invalidateQueryCache('features');

    // 获取缓存统计（应该被清空）
    const stats = db.getQueryCacheStats();
    expect(stats.size).toBe(0);
  });

  it('应该与链式 API 返回相同结果', async () => {
    // SQL 查询
    const sqlResults = await db.query(`
      SELECT * FROM features
      WHERE type = 'park'
    `);

    // 链式 API 查询
    const apiResults = await db.features
      .where('type', '=', 'park')
      .toArray();

    // 验证结果数量相同
    expect(sqlResults).toHaveLength(apiResults.length);

    // 验证结果内容一致（可能有顺序差异）
    const sqlIds = sqlResults.map((r: any) => r.id).sort();
    const apiIds = apiResults.map((r: any) => r.id).sort();
    expect(sqlIds).toEqual(apiIds);
  });

  it('应该验证 SQL 语法', async () => {
    // 有效 SQL
    const validSQL = 'SELECT * FROM features';
    expect(() => db.query(validSQL)).not.toThrow();

    // 无效 SQL（应该抛出错误）
    const invalidSQL = 'INVALID SQL QUERY';
    await expect(db.query(invalidSQL)).rejects.toThrow();
  });

  it('应该支持复杂的 WHERE 条件', async () => {
    const results = await db.query(`
      SELECT * FROM features
      WHERE type = 'landmark' AND rating >= 5
    `);

    expect(results).toHaveLength(2);
    expect(results.every((r: any) => r.type === 'landmark' && r.rating >= 5)).toBe(true);
  });
});
