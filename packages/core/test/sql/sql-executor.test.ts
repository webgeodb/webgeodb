/**
 * SQL 执行器测试
 *
 * 测试 SQLExecutor 的核心功能：
 * - 参数化查询
 * - 错误处理
 * - 事务管理
 * - 结果集处理
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebGeoDB } from '../../src';

describe('SQL Executor', () => {
  let db: WebGeoDB;

  beforeEach(async () => {
    db = new WebGeoDB({
      name: 'test-sql-executor',
      version: 1
    });

    db.schema({
      features: {
        id: 'string',
        name: 'string',
        type: 'string',
        value: 'number',
        geometry: 'geometry',
        properties: 'json'
      }
    });

    await db.open();
    await db.features.clear();

    // 插入测试数据
    await db.features.insertMany([
      {
        id: '1',
        name: 'Feature 1',
        type: 'point',
        value: 100,
        geometry: { type: 'Point', coordinates: [10, 10] },
        properties: { key: 'value1' }
      },
      {
        id: '2',
        name: 'Feature 2',
        type: 'line',
        value: 200,
        geometry: { type: 'LineString', coordinates: [[0, 0], [20, 20]] },
        properties: { key: 'value2' }
      },
      {
        id: '3',
        name: 'Feature 3',
        type: 'polygon',
        value: 300,
        geometry: {
          type: 'Polygon',
          coordinates: [
            [[0, 0], [30, 0], [30, 30], [0, 30], [0, 0]]
          ]
        },
        properties: { key: 'value3' }
      }
    ]);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('参数化查询', () => {
    it('should execute query with positional parameters', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE type = $1',
        ['point']
      );

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('point');
    });

    it('should execute query with multiple parameters', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE type = $1 AND value > $2',
        ['point', 50]
      );

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });

    it('should handle parameter type conversion', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE value = $1',
        ['100'] // 字符串参数
      );

      expect(results).toHaveLength(1);
      expect(results[0].value).toBe(100);
    });

    it('should handle null parameters', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE type = $1',
        [null]
      );

      expect(results).toHaveLength(0);
    });

    it('should handle empty parameter array', async () => {
      const results = await db.query(
        'SELECT * FROM features'
      );

      expect(results).toHaveLength(3);
    });
  });

  describe('结果集处理', () => {
    it('should return empty array for no matches', async () => {
      const results = await db.query(
        "SELECT * FROM features WHERE type = 'nonexistent'"
      );

      expect(results).toEqual([]);
    });

    it('should return single result', async () => {
      const results = await db.query(
        "SELECT * FROM features WHERE id = '1'"
      );

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Feature 1');
    });

    it('should return multiple results', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE value > 50'
      );

      expect(results).toHaveLength(3);
    });

    it('should preserve geometry objects', async () => {
      const results = await db.query(
        "SELECT * FROM features WHERE id = '1'"
      );

      expect(results[0].geometry).toEqual({
        type: 'Point',
        coordinates: [10, 10]
      });
    });

    it('should preserve JSON properties', async () => {
      const results = await db.query(
        "SELECT * FROM features WHERE id = '1'"
      );

      expect(results[0].properties).toEqual({ key: 'value1' });
    });
  });

  describe('错误处理', () => {
    it('should throw error for invalid SQL syntax', async () => {
      await expect(
        db.query('SELCT * FROM features')
      ).rejects.toThrow();
    });

    it('should throw error for invalid table name', async () => {
      await expect(
        db.query('SELECT * FROM nonexistent_table')
      ).rejects.toThrow();
    });

    it('should throw error for invalid column name', async () => {
      await expect(
        db.query('SELECT nonexistent_column FROM features')
      ).rejects.toThrow();
    });

    it('should handle database closed error gracefully', async () => {
      await db.close();

      await expect(
        db.query('SELECT * FROM features')
      ).rejects.toThrow();
    });

    it('should provide meaningful error messages', async () => {
      try {
        await db.query('SELECT * FROM nonexistent_table');
      } catch (error: any) {
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('WHERE 子句', () => {
    it('should handle = operator', async () => {
      const results = await db.query(
        "SELECT * FROM features WHERE type = 'point'"
      );

      expect(results).toHaveLength(1);
    });

    it('should handle != operator', async () => {
      const results = await db.query(
        "SELECT * FROM features WHERE type != 'point'"
      );

      expect(results).toHaveLength(2);
    });

    it('should handle > operator', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE value > 150'
      );

      expect(results).toHaveLength(2);
    });

    it('should handle >= operator', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE value >= 200'
      );

      expect(results).toHaveLength(2);
    });

    it('should handle < operator', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE value < 200'
      );

      expect(results).toHaveLength(1);
    });

    it('should handle <= operator', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE value <= 200'
      );

      expect(results).toHaveLength(2);
    });

    it('should handle IN operator', async () => {
      const results = await db.query(
        "SELECT * FROM features WHERE type IN ('point', 'line')"
      );

      expect(results).toHaveLength(2);
    });

    it('should handle NOT IN operator', async () => {
      const results = await db.query(
        "SELECT * FROM features WHERE type NOT IN ('polygon')"
      );

      expect(results).toHaveLength(2);
    });

    it('should handle LIKE operator', async () => {
      const results = await db.query(
        "SELECT * FROM features WHERE name LIKE 'Feature'"
      );

      expect(results).toHaveLength(3);
    });

    it('should handle NOT LIKE operator', async () => {
      const results = await db.query(
        "SELECT * FROM features WHERE name NOT LIKE 'Unknown'"
      );

      expect(results).toHaveLength(3);
    });
  });

  describe('ORDER BY 子句', () => {
    it('should handle single column ascending', async () => {
      const results = await db.query(
        'SELECT * FROM features ORDER BY value ASC'
      );

      expect(results[0].value).toBe(100);
      expect(results[1].value).toBe(200);
      expect(results[2].value).toBe(300);
    });

    it('should handle single column descending', async () => {
      const results = await db.query(
        'SELECT * FROM features ORDER BY value DESC'
      );

      expect(results[0].value).toBe(300);
      expect(results[1].value).toBe(200);
      expect(results[2].value).toBe(100);
    });

    it('should handle multiple columns', async () => {
      await db.features.insert({
        id: '4',
        name: 'Feature 4',
        type: 'point',
        value: 150,
        geometry: { type: 'Point', coordinates: [15, 15] }
      });

      const results = await db.query(
        'SELECT * FROM features ORDER BY type ASC, value ASC'
      );

      // First should be line (type=line, value=200)
      // Then points sorted by value (150, then 100? no, 100, 150)
      // Actually sorting is lexical, so 'line' < 'point' < 'polygon'
      expect(results[0].type).toBe('line');
    });
  });

  describe('LIMIT 和 OFFSET', () => {
    it('should handle LIMIT', async () => {
      const results = await db.query(
        'SELECT * FROM features LIMIT 2'
      );

      expect(results).toHaveLength(2);
    });

    it('should handle OFFSET', async () => {
      const results = await db.query(
        'SELECT * FROM features OFFSET 1'
      );

      expect(results).toHaveLength(2);
    });

    it('should handle LIMIT and OFFSET combination', async () => {
      const results = await db.query(
        'SELECT * FROM features LIMIT 2 OFFSET 1'
      );

      expect(results).toHaveLength(2);
    });

    it('should handle LIMIT larger than result count', async () => {
      const results = await db.query(
        'SELECT * FROM features LIMIT 100'
      );

      expect(results).toHaveLength(3);
    });

    it('should handle OFFSET larger than result count', async () => {
      const results = await db.query(
        'SELECT * FROM features OFFSET 10'
      );

      expect(results).toHaveLength(0);
    });
  });

  describe('聚合函数', () => {
    it('should handle COUNT(*)', async () => {
      const results = await db.query(
        'SELECT COUNT(*) as count FROM features'
      );

      expect(results[0].count).toBe(3);
    });

    it('should handle COUNT(column)', async () => {
      const results = await db.query(
        'SELECT COUNT(id) as count FROM features'
      );

      expect(results[0].count).toBe(3);
    });

    it('should handle SUM', async () => {
      const results = await db.query(
        'SELECT SUM(value) as total FROM features'
      );

      expect(results[0].total).toBe(600);
    });

    it('should handle AVG', async () => {
      const results = await db.query(
        'SELECT AVG(value) as average FROM features'
      );

      expect(results[0].average).toBeCloseTo(200);
    });

    it('should handle MIN', async () => {
      const results = await db.query(
        'SELECT MIN(value) as minimum FROM features'
      );

      expect(results[0].minimum).toBe(100);
    });

    it('should handle MAX', async () => {
      const results = await db.query(
        'SELECT MAX(value) as maximum FROM features'
      );

      expect(results[0].maximum).toBe(300);
    });
  });

  describe('复杂查询', () => {
    it('should handle multiple conditions in WHERE', async () => {
      const results = await db.query(
        "SELECT * FROM features WHERE type = 'point' AND value > 50"
      );

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });

    it('should handle WHERE with ORDER BY', async () => {
      const results = await db.query(
        "SELECT * FROM features WHERE value > 100 ORDER BY value DESC"
      );

      expect(results).toHaveLength(2);
      expect(results[0].value).toBe(300);
      expect(results[1].value).toBe(200);
    });

    it('should handle WHERE with LIMIT', async () => {
      const results = await db.query(
        "SELECT * FROM features WHERE value > 100 LIMIT 1"
      );

      expect(results).toHaveLength(1);
    });

    it('should handle complete query with all clauses', async () => {
      const results = await db.query(
        "SELECT * FROM features WHERE value > 50 ORDER BY value ASC LIMIT 2 OFFSET 1"
      );

      expect(results).toHaveLength(2);
      expect(results[0].value).toBe(200);
      expect(results[1].value).toBe(300);
    });
  });

  describe('事务管理', () => {
    it('should maintain data consistency', async () => {
      // 开始事务
      const transaction = db.transaction('features');
      await transaction.start();

      try {
        await db.features.insert({
          id: '4',
          name: 'Feature 4',
          type: 'test',
          value: 400,
          geometry: { type: 'Point', coordinates: [40, 40] }
        });

        const results = await db.query(
          "SELECT * FROM features WHERE id = '4'"
        );

        expect(results).toHaveLength(1);

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });

    it('should rollback on error', async () => {
      const initialCount = await db.features.count();

      try {
        await db.features.insert({
          id: 'invalid',
          // 缺少必需字段
          name: 'Invalid'
        });
      } catch (error) {
        // 预期错误
      }

      const finalCount = await db.features.count();
      expect(finalCount).toBe(initialCount);
    });
  });
});
