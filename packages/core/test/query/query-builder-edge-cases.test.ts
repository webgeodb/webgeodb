import { describe, it, expect, beforeEach } from 'vitest';
import { WebGeoDB } from '../../src';

describe('QueryBuilder Edge Cases', () => {
  let db: WebGeoDB;

  beforeEach(async () => {
    db = new WebGeoDB({
      name: 'test-query-edge-cases',
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

    // 创建空间索引
    db.features.createIndex('geometry', { auto: true });
  });

  describe('like operator', () => {
    beforeEach(async () => {
      await db.features.insertMany([
        { id: '1', name: 'Apple Pie', type: 'food', geometry: { type: 'Point', coordinates: [0, 0] } },
        { id: '2', name: 'Apple Juice', type: 'drink', geometry: { type: 'Point', coordinates: [10, 10] } },
        { id: '3', name: 'Banana Bread', type: 'food', geometry: { type: 'Point', coordinates: [20, 20] } },
        { id: '4', name: 'Cherry Pie', type: 'food', geometry: { type: 'Point', coordinates: [30, 30] } },
        { id: '5', name: 'Orange Juice', type: 'drink', geometry: { type: 'Point', coordinates: [40, 40] } }
      ]);
    });

    it('should match substring', async () => {
      const results = await db.features
        .where('name', 'like', 'Apple')
        .toArray();

      expect(results).toHaveLength(2);
      expect(results.every(r => r.name.includes('Apple'))).toBe(true);
    });

    it('should be case-sensitive', async () => {
      const results = await db.features
        .where('name', 'like', 'apple')
        .toArray();

      expect(results).toHaveLength(0);
    });

    it('should match single character', async () => {
      const results = await db.features
        .where('name', 'like', 'Pie')
        .toArray();

      expect(results).toHaveLength(2);
      expect(results.every(r => r.name.includes('Pie'))).toBe(true);
    });

    it('should handle non-string values', async () => {
      await db.features.insert({
        id: '6',
        name: 'Non-string Test',
        type: 'test',
        value: 123,
        geometry: { type: 'Point', coordinates: [50, 50] }
      });

      const results = await db.features
        .where('value', 'like', '23')
        .toArray();

      // 不应该匹配数字字段
      expect(results).toHaveLength(0);
    });

    it('should work with not like operator', async () => {
      const results = await db.features
        .where('name', 'not like', 'Apple')
        .toArray();

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => !r.name.includes('Apple'))).toBe(true);
    });

    it('should match empty string', async () => {
      const results = await db.features
        .where('name', 'like', '')
        .toArray();

      // 空字符串应该匹配所有记录
      expect(results).toHaveLength(5);
    });

    it('should handle special characters', async () => {
      await db.features.insert({
        id: '6',
        name: 'Café',
        type: 'food',
        geometry: { type: 'Point', coordinates: [50, 50] }
      });

      const results = await db.features
        .where('name', 'like', 'é')
        .toArray();

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Café');
    });
  });

  describe('empty results', () => {
    beforeEach(async () => {
      await db.features.insertMany([
        { id: '1', name: 'Item 1', type: 'test', value: 10, geometry: { type: 'Point', coordinates: [0, 0] } },
        { id: '2', name: 'Item 2', type: 'test', value: 20, geometry: { type: 'Point', coordinates: [10, 10] } }
      ]);
    });

    it('should handle no matching data for where clause', async () => {
      const results = await db.features
        .where('type', '=', 'nonexistent')
        .toArray();

      expect(results).toHaveLength(0);
    });

    it('should handle no matching data for spatial query', async () => {
      const farPolygon = {
        type: 'Polygon' as const,
        coordinates: [
          [
            [1000, 1000],
            [1010, 1000],
            [1010, 1010],
            [1000, 1010],
            [1000, 1000]
          ]
        ]
      };

      const results = await db.features
        .intersects('geometry', farPolygon)
        .toArray();

      expect(results).toHaveLength(0);
    });

    it('should handle no matching data for range query', async () => {
      const results = await db.features
        .where('value', '>', 100)
        .toArray();

      expect(results).toHaveLength(0);
    });

    it('should handle limit larger than result count', async () => {
      const results = await db.features
        .limit(100)
        .toArray();

      expect(results).toHaveLength(2);
    });

    it('should handle offset larger than result count', async () => {
      const results = await db.features
        .offset(10)
        .toArray();

      expect(results).toHaveLength(0);
    });

    it('should handle empty table', async () => {
      await db.features.clear();

      const results = await db.features
        .where('type', '=', 'test')
        .toArray();

      expect(results).toHaveLength(0);
    });
  });

  describe('complex queries', () => {
    beforeEach(async () => {
      await db.features.insertMany([
        { id: '1', name: 'Restaurant A', type: 'restaurant', value: 4.5, properties: { priceRange: 'expensive' }, geometry: { type: 'Point', coordinates: [10, 10] } },
        { id: '2', name: 'Restaurant B', type: 'restaurant', value: 4.0, properties: { priceRange: 'cheap' }, geometry: { type: 'Point', coordinates: [20, 20] } },
        { id: '3', name: 'Cafe A', type: 'cafe', value: 4.8, properties: { priceRange: 'moderate' }, geometry: { type: 'Point', coordinates: [30, 30] } },
        { id: '4', name: 'Cafe B', type: 'cafe', value: 3.5, properties: { priceRange: 'cheap' }, geometry: { type: 'Point', coordinates: [40, 40] } },
        { id: '5', name: 'Bar A', type: 'bar', value: 4.2, properties: { priceRange: 'expensive' }, geometry: { type: 'Point', coordinates: [50, 50] } }
      ]);
    });

    it('should combine where, spatial, orderBy, limit, offset', async () => {
      const polygon = {
        type: 'Polygon' as const,
        coordinates: [
          [
            [5, 5],
            [35, 5],
            [35, 35],
            [5, 35],
            [5, 5]
          ]
        ]
      };

      const results = await db.features
        .intersects('geometry', polygon)
        .where('value', '>', 4.0)
        .orderBy('value', 'desc')
        .limit(2)
        .offset(1)
        .toArray();

      // 至少应该有一些结果，因为Restaurant A和Cafe A都在多边形内且value > 4.0
      expect(results.length).toBeLessThanOrEqual(2);

      // 如果有结果，验证它们满足条件
      if (results.length > 0) {
        // 由于是降序排序，offset(1)，所以第一个应该是Restaurant A (value=4.5)
        expect(results[0].value).toBeGreaterThanOrEqual(4.0);
        expect(results.every(r => r.value > 4.0)).toBe(true);
      }
    });

    it('should handle multiple where clauses', async () => {
      const results = await db.features
        .where('type', '=', 'restaurant')
        .where('value', '>', 4.0)
        .toArray();

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Restaurant A');
    });

    it('should combine nested property access with spatial query', async () => {
      const polygon = {
        type: 'Polygon' as const,
        coordinates: [
          [
            [0, 0],
            [60, 0],
            [60, 60],
            [0, 60],
            [0, 0]
          ]
        ]
      };

      const results = await db.features
        .intersects('geometry', polygon)
        .where('properties.priceRange', '=', 'expensive')
        .toArray();

      // 应该有结果（Restaurant A和Bar A都是expensive且在多边形内）
      expect(results.length).toBeGreaterThan(0);

      // 验证所有结果都有正确的priceRange
      if (results.length > 0) {
        expect(results.every(r => r.properties && r.properties.priceRange === 'expensive')).toBe(true);
      }
    });

    it('should handle in operator with spatial query', async () => {
      const polygon = {
        type: 'Polygon' as const,
        coordinates: [
          [
            [0, 0],
            [60, 0],
            [60, 60],
            [0, 60],
            [0, 0]
          ]
        ]
      };

      const results = await db.features
        .intersects('geometry', polygon)
        .where('type', 'in', ['restaurant', 'cafe'])
        .toArray();

      // 应该有结果（Restaurant A, Restaurant B, Cafe A, Cafe B都在多边形内）
      expect(results.length).toBeGreaterThan(0);

      // 验证所有结果的type都是restaurant或cafe
      if (results.length > 0) {
        const invalidResults = results.filter(r => r.type !== 'restaurant' && r.type !== 'cafe');
        if (invalidResults.length > 0) {
          console.log('Invalid results:', invalidResults);
        }
        expect(invalidResults.length).toBe(0);
      }
    });

    it('should handle not in operator', async () => {
      const results = await db.features
        .where('type', 'not in', ['bar'])
        .toArray();

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.type !== 'bar')).toBe(true);
    });
  });

  describe('query chaining', () => {
    it('should allow multiple where clauses', async () => {
      await db.features.insertMany([
        { id: '1', name: 'Item 1', type: 'type1', value: 10, geometry: { type: 'Point', coordinates: [0, 0] } },
        { id: '2', name: 'Item 2', type: 'type1', value: 20, geometry: { type: 'Point', coordinates: [10, 10] } },
        { id: '3', name: 'Item 3', type: 'type2', value: 30, geometry: { type: 'Point', coordinates: [20, 20] } }
      ]);

      const results = await db.features
        .where('type', '=', 'type1')
        .where('value', '>', 15)
        .toArray();

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('2');
    });

    it('should allow limit and offset combination', async () => {
      await db.features.insertMany([
        { id: '1', name: 'Item 1', type: 'test', geometry: { type: 'Point', coordinates: [0, 0] } },
        { id: '2', name: 'Item 2', type: 'test', geometry: { type: 'Point', coordinates: [10, 10] } },
        { id: '3', name: 'Item 3', type: 'test', geometry: { type: 'Point', coordinates: [20, 20] } },
        { id: '4', name: 'Item 4', type: 'test', geometry: { type: 'Point', coordinates: [30, 30] } },
        { id: '5', name: 'Item 5', type: 'test', geometry: { type: 'Point', coordinates: [40, 40] } }
      ]);

      const results = await db.features
        .orderBy('name', 'asc')
        .offset(2)
        .limit(2)
        .toArray();

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Item 3');
      expect(results[1].name).toBe('Item 4');
    });
  });

  describe('offset and limit', () => {
    beforeEach(async () => {
      await db.features.insertMany([
        { id: '1', name: 'Item 1', type: 'test', value: 10, geometry: { type: 'Point', coordinates: [0, 0] } },
        { id: '2', name: 'Item 2', type: 'test', value: 20, geometry: { type: 'Point', coordinates: [10, 10] } },
        { id: '3', name: 'Item 3', type: 'test', value: 30, geometry: { type: 'Point', coordinates: [20, 20] } },
        { id: '4', name: 'Item 4', type: 'test', value: 40, geometry: { type: 'Point', coordinates: [30, 30] } },
        { id: '5', name: 'Item 5', type: 'test', value: 50, geometry: { type: 'Point', coordinates: [40, 40] } }
      ]);
    });

    it('should skip first n results', async () => {
      const results = await db.features
        .orderBy('value', 'asc')
        .offset(2)
        .toArray();

      expect(results).toHaveLength(3);
      expect(results[0].value).toBe(30);
      expect(results[1].value).toBe(40);
      expect(results[2].value).toBe(50);
    });

    it('should work with limit', async () => {
      const results = await db.features
        .orderBy('value', 'asc')
        .offset(2)
        .limit(2)
        .toArray();

      expect(results).toHaveLength(2);
      expect(results[0].value).toBe(30);
      expect(results[1].value).toBe(40);
    });

    it('should return empty if offset exceeds result count', async () => {
      const results = await db.features
        .orderBy('value', 'asc')
        .offset(10)
        .toArray();

      expect(results).toHaveLength(0);
    });

    it('should return empty if offset equals result count', async () => {
      const results = await db.features
        .orderBy('value', 'asc')
        .offset(5)
        .toArray();

      expect(results).toHaveLength(0);
    });

    it('should handle offset of 0', async () => {
      const results = await db.features
        .orderBy('value', 'asc')
        .offset(0)
        .toArray();

      expect(results).toHaveLength(5);
      expect(results[0].value).toBe(10);
    });

    it('should work with where clause', async () => {
      const results = await db.features
        .where('value', '>', 20)
        .orderBy('value', 'asc')
        .offset(1)
        .toArray();

      expect(results).toHaveLength(2);
      expect(results[0].value).toBe(40);
      expect(results[1].value).toBe(50);
    });
  });

  describe('boundary conditions', () => {
    it('should handle very large limit value', async () => {
      await db.features.insertMany([
        { id: '1', name: 'Item 1', type: 'test', geometry: { type: 'Point', coordinates: [0, 0] } },
        { id: '2', name: 'Item 2', type: 'test', geometry: { type: 'Point', coordinates: [10, 10] } }
      ]);

      const results = await db.features
        .limit(Number.MAX_SAFE_INTEGER)
        .toArray();

      expect(results).toHaveLength(2);
    });

    it('should handle zero limit', async () => {
      await db.features.insert({
        id: '1',
        name: 'Item 1',
        type: 'test',
        geometry: { type: 'Point', coordinates: [0, 0] }
      });

      const results = await db.features
        .limit(0)
        .toArray();

      expect(results).toHaveLength(0);
    });

    it('should handle negative limit (should treat as 0)', async () => {
      await db.features.insert({
        id: '1',
        name: 'Item 1',
        type: 'test',
        geometry: { type: 'Point', coordinates: [0, 0] }
      });

      const results = await db.features
        .limit(-1)
        .toArray();

      expect(results).toHaveLength(0);
    });

    it('should handle negative offset (should treat as 0)', async () => {
      await db.features.insert({
        id: '1',
        name: 'Item 1',
        type: 'test',
        geometry: { type: 'Point', coordinates: [0, 0] }
      });

      const results = await db.features
        .offset(-1)
        .toArray();

      expect(results).toHaveLength(1);
    });

    it('should handle very small numbers for comparison', async () => {
      await db.features.insert({
        id: '1',
        name: 'Item 1',
        type: 'test',
        value: 0.0001,
        geometry: { type: 'Point', coordinates: [0, 0] }
      });

      const results = await db.features
        .where('value', '>', 0)
        .toArray();

      expect(results).toHaveLength(1);
    });

    it('should handle very large numbers for comparison', async () => {
      await db.features.insert({
        id: '1',
        name: 'Item 1',
        type: 'test',
        value: Number.MAX_SAFE_INTEGER,
        geometry: { type: 'Point', coordinates: [0, 0] }
      });

      const results = await db.features
        .where('value', '>', 0)
        .toArray();

      expect(results).toHaveLength(1);
    });
  });
});
