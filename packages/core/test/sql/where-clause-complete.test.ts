/**
 * WHERE 子句转换完整测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebGeoDB } from '../../src';

describe('WHERE 子句转换完整测试', () => {
  let db: WebGeoDB;

  beforeEach(async () => {
    db = new WebGeoDB({
      name: 'test-where-clause-complete',
      version: 1
    });

    db.schema({
      features: {
        id: 'string',
        name: 'string',
        type: 'string',
        value: 'number',
        active: 'boolean',
        rating: 'number'
      }
    });

    await db.open();
    await db.features.clear();

    // 插入测试数据
    await db.features.bulkAdd([
      { id: '1', name: 'Restaurant A', type: 'restaurant', value: 100, active: true, rating: 4.5 },
      { id: '2', name: 'Cafe B', type: 'cafe', value: 200, active: true, rating: 4.0 },
      { id: '3', name: 'Shop C', type: 'shop', value: 300, active: false, rating: 3.5 },
      { id: '4', name: 'Hotel D', type: 'hotel', value: 150, active: true, rating: 5.0 },
      { id: '5', name: 'Park E', type: 'park', value: 50, active: false, rating: 4.8 }
    ]);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('比较运算符', () => {
    it('should handle = operator', async () => {
      const results = await db.query("SELECT * FROM features WHERE type = 'restaurant'");
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('restaurant');
    });

    it('should handle != operator', async () => {
      const results = await db.query("SELECT * FROM features WHERE type != 'restaurant'");
      expect(results).toHaveLength(4);
    });

    it('should handle > operator', async () => {
      const results = await db.query('SELECT * FROM features WHERE value > 150');
      expect(results).toHaveLength(2);
      expect(results.every(r => r.value > 150)).toBe(true);
    });

    it('should handle >= operator', async () => {
      const results = await db.query('SELECT * FROM features WHERE value >= 150');
      expect(results).toHaveLength(3);
    });

    it('should handle < operator', async () => {
      const results = await db.query('SELECT * FROM features WHERE value < 150');
      expect(results).toHaveLength(2);
    });

    it('should handle <= operator', async () => {
      const results = await db.query('SELECT * FROM features WHERE value <= 150');
      expect(results).toHaveLength(3);
    });
  });

  describe('逻辑运算符', () => {
    it('should handle AND', async () => {
      const results = await db.query("SELECT * FROM features WHERE type = 'restaurant' AND value > 50");
      expect(results).toHaveLength(1);
    });

    it('should handle OR', async () => {
      const results = await db.query("SELECT * FROM features WHERE type = 'restaurant' OR type = 'cafe'");
      expect(results).toHaveLength(2);
    });

    it('should handle multiple AND conditions', async () => {
      const results = await db.query("SELECT * FROM features WHERE active = true AND value > 100 AND value < 300");
      expect(results).toHaveLength(2);
    });
  });

  describe('IN 和 NOT IN', () => {
    it('should handle IN with strings', async () => {
      const results = await db.query("SELECT * FROM features WHERE type IN ('restaurant', 'cafe')");
      expect(results).toHaveLength(2);
    });

    it('should handle IN with numbers', async () => {
      const results = await db.query('SELECT * FROM features WHERE value IN (100, 200, 300)');
      expect(results).toHaveLength(3);
    });

    it('should handle NOT IN', async () => {
      const results = await db.query("SELECT * FROM features WHERE type NOT IN ('park')");
      expect(results).toHaveLength(4);
    });
  });

  describe('LIKE 和 NOT LIKE', () => {
    it('should handle LIKE', async () => {
      const results = await db.query("SELECT * FROM features WHERE name LIKE 'Restaurant'");
      expect(results).toHaveLength(1);
    });

    it('should handle NOT LIKE', async () => {
      const results = await db.query("SELECT * FROM features WHERE name NOT LIKE 'Unknown'");
      expect(results).toHaveLength(5);
    });
  });

  describe('BETWEEN', () => {
    it('should handle BETWEEN', async () => {
      const results = await db.query('SELECT * FROM features WHERE value BETWEEN 100 AND 200');
      expect(results).toHaveLength(3);
    });
  });

  describe('IS NULL 和 IS NOT NULL', () => {
    it('should handle IS NULL', async () => {
      // 先添加一个 null 值的记录
      await db.features.add({
        id: '6',
        name: 'Test',
        type: 'test',
        value: 0,
        rating: null
      });

      const results = await db.query('SELECT * FROM features WHERE rating IS NULL');
      expect(results).toHaveLength(1);
      expect(results[0].rating).toBeNull();
    });

    it('should handle IS NOT NULL', async () => {
      const results = await db.query('SELECT * FROM features WHERE rating IS NOT NULL');
      expect(results).toHaveLength(5);
      expect(results.every(r => r.rating !== null)).toBe(true);
    });
  });
});
