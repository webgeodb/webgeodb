/**
 * Query Translator 扩展测试
 *
 * 测试 SQL 到查询构建器的转换功能：
 * - WHERE 子句转换
 * - ORDER BY 转换
 * - LIMIT/OFFSET 转换
 * - 复杂查询转换
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebGeoDB } from '../../src';
import type { Geometry, Point, Polygon } from '../../src/types';

describe('Query Translator - WHERE Clause', () => {
  let db: WebGeoDB;

  beforeEach(async () => {
    db = new WebGeoDB({
      name: 'test-query-translator',
      version: 1
    });

    db.schema({
      features: {
        id: 'string',
        name: 'string',
        type: 'string',
        value: 'number',
        active: 'boolean',
        geometry: 'geometry'
      }
    });

    await db.open();
    await db.features.clear();

    // 插入测试数据
    await db.features.bulkAdd([
      {
        id: '1',
        name: 'Restaurant A',
        type: 'restaurant',
        value: 100,
        active: true,
        geometry: { type: 'Point', coordinates: [0, 0] }
      },
      {
        id: '2',
        name: 'Cafe B',
        type: 'cafe',
        value: 200,
        active: true,
        geometry: { type: 'Point', coordinates: [10, 10] }
      },
      {
        id: '3',
        name: 'Shop C',
        type: 'shop',
        value: 300,
        active: false,
        geometry: { type: 'Point', coordinates: [20, 20] }
      }
    ]);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('比较运算符', () => {
    it('should translate = operator', async () => {
      const results = await db.features
        .where('type', '=', 'restaurant')
        .toArray();

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('restaurant');
    });

    it('should translate > operator', async () => {
      const results = await db.features
        .where('value', '>', 150)
        .toArray();

      expect(results).toHaveLength(2);
      expect(results.every(r => r.value > 150)).toBe(true);
    });
  });

  describe('ORDER BY', () => {
    it('should translate ORDER BY column ASC', async () => {
      const results = await db.features
        .orderBy('name')
        .toArray();

      expect(results).toHaveLength(3);
    });

    it('should translate ORDER BY column DESC', async () => {
      const results = await db.features
        .orderBy('name')
        .reverse()
        .toArray();

      expect(results).toHaveLength(3);
    });
  });

  describe('LIMIT and OFFSET', () => {
    it('should translate LIMIT', async () => {
      const results = await db.features
        .limit(2)
        .toArray();

      expect(results).toHaveLength(2);
    });

    it('should translate OFFSET', async () => {
      const results = await db.features
        .offset(1)
        .toArray();

      expect(results).toHaveLength(2);
    });

    it('should translate LIMIT with OFFSET', async () => {
      const results = await db.features
        .offset(1)
        .limit(1)
        .toArray();

      expect(results).toHaveLength(1);
    });
  });
});
