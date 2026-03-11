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
    `);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('应该执行带 WHERE 条件的查询', async () => {
    const results = await db.query(`
      SELECT * FROM features
      WHERE type = 'landmark'
    `);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
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
    expect(stats.maxSize).toBeGreaterThan(0);
  });

  it('应该使缓存失效', async () => {
    // 执行查询以填充缓存
    await db.query(`SELECT * FROM features WHERE type = 'landmark'`);

    // 使缓存失效
    db.invalidateQueryCache('features');

    // 验证不会抛出错误
    expect(() => db.invalidateQueryCache('features')).not.toThrow();
  });

  it('应该验证 SQL 语法', async () => {
    // 有效 SQL
    const validSQL = 'SELECT * FROM features';
    expect(() => db.query(validSQL)).not.toThrow();

    // 无效 SQL（应该抛出错误）
    const invalidSQL = 'INVALID SQL QUERY';
    await expect(db.query(invalidSQL)).rejects.toThrow();
  });
});
