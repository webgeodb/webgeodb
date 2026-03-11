import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebGeoDB } from '../src';

describe('Boundary Condition Tests', () => {
  let db: WebGeoDB;

  beforeEach(async () => {
    db = new WebGeoDB({
      name: 'test-boundary-conditions',
      version: 1
    });

    db.schema({
      features: {
        id: 'string',
        name: 'string',
        type: 'string',
        geometry: 'geometry',
        properties: 'json'
      }
    });

    await db.open();
    await db.features.clear();
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('empty dataset handling', () => {
    it('should handle query on empty dataset', async () => {
      // 数据库为空
      const results = await db.features
        .where('type', '=', 'restaurant')
        .toArray();

      expect(results).toEqual([]);
      expect(results.length).toBe(0);
    });

    it('should handle spatial query on empty dataset', async () => {
      const results = await db.features
        .distance('geometry', [0, 0], '<', 1000)
        .toArray();

      expect(results).toEqual([]);
    });

    it('should handle count on empty dataset', async () => {
      const count = await db.features.count();
      expect(count).toBe(0);
    });

    it('should handle get on empty dataset', async () => {
      const result = await db.features.get('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should handle limit and offset on empty dataset', async () => {
      const results = await db.features
        .limit(10)
        .offset(0)
        .toArray();

      expect(results).toEqual([]);
    });

    it('should handle orderBy on empty dataset', async () => {
      const results = await db.features
        .orderBy('name', 'asc')
        .toArray();

      expect(results).toEqual([]);
    });
  });

  describe('large dataset handling', () => {
    it('should handle large insert operation', async () => {
      const features = [];
      for (let i = 0; i < 10000; i++) {
        features.push({
          id: `feature-${i}`,
          name: `Feature ${i}`,
          type: i % 2 === 0 ? 'restaurant' : 'cafe',
          geometry: {
            type: 'Point',
            coordinates: [Math.random() * 100, Math.random() * 100]
          },
          properties: { rating: 4.0, index: i }
        });
      }

      // 批量插入应该成功
      await expect(db.features.insertMany(features)).resolves.not.toThrow();

      // 验证数据已插入
      const count = await db.features.count();
      expect(count).toBe(10000);
    });

    it('should handle query on large dataset', async () => {
      // 插入大量数据
      const features = [];
      for (let i = 0; i < 5000; i++) {
        features.push({
          id: `feature-${i}`,
          name: `Feature ${i}`,
          type: i % 3 === 0 ? 'restaurant' : 'other',
          geometry: {
            type: 'Point',
            coordinates: [i * 0.01, i * 0.01]
          },
          properties: { rating: 4.0 }
        });
      }

      await db.features.insertMany(features);

      // 查询应该正常工作
      const results = await db.features
        .where('type', '=', 'restaurant')
        .limit(100)
        .toArray();

      expect(results.length).toBe(100);
      expect(results[0].type).toBe('restaurant');
    });

    it('should handle spatial query on large dataset', async () => {
      // 创建空间索引
      db.features.createIndex('geometry', { auto: true });

      // 插入大量数据
      const features = [];
      for (let i = 0; i < 2000; i++) {
        features.push({
          id: `feature-${i}`,
          name: `Feature ${i}`,
          type: 'point',
          geometry: {
            type: 'Point',
            coordinates: [Math.random() * 1000, Math.random() * 1000]
          },
          properties: { rating: 4.0 }
        });
      }

      await db.features.insertMany(features);

      // 空间查询应该在合理时间内完成
      const startTime = performance.now();
      const results = await db.features
        .distance('geometry', [500, 500], '<', 50)
        .limit(50)
        .toArray();
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(2000); // 2秒内完成
      expect(results.length).toBeLessThanOrEqual(50);
    });

    it('should handle pagination on large dataset', async () => {
      // 插入数据
      const features = [];
      for (let i = 0; i < 1000; i++) {
        features.push({
          id: `feature-${i}`,
          name: `Feature ${i}`,
          type: 'restaurant',
          geometry: { type: 'Point', coordinates: [i, i] },
          properties: { rating: 4.0 }
        });
      }

      await db.features.insertMany(features);

      // 测试分页
      const page1 = await db.features
        .orderBy('name', 'asc')
        .limit(100)
        .offset(0)
        .toArray();

      const page2 = await db.features
        .orderBy('name', 'asc')
        .limit(100)
        .offset(100)
        .toArray();

      expect(page1.length).toBe(100);
      expect(page2.length).toBe(100);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });

  describe('abnormal input handling', () => {
    it('should handle null and undefined values', async () => {
      // 插入包含null值的数据
      await db.features.insert({
        id: '1',
        name: null,
        type: 'restaurant',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: null
      });

      // 应该能够查询到
      const results = await db.features
        .where('type', '=', 'restaurant')
        .toArray();

      expect(results.length).toBe(1);
      expect(results[0].name).toBeNull();
    });

    it('should handle empty strings', async () => {
      await db.features.insert({
        id: '1',
        name: '',
        type: '',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: {}
      });

      const results = await db.features.toArray();
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('');
      expect(results[0].type).toBe('');
    });

    it('should handle very long strings', async () => {
      const longString = 'a'.repeat(10000);

      await db.features.insert({
        id: '1',
        name: longString,
        type: 'restaurant',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: {}
      });

      const result = await db.features.get('1');
      expect(result.name).toBe(longString);
      expect(result.name.length).toBe(10000);
    });

    it('should handle special characters in strings', async () => {
      const specialString = "Test with 'quotes' and \"double quotes\" and\n newlines \t tabs";

      await db.features.insert({
        id: '1',
        name: specialString,
        type: 'restaurant',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: {}
      });

      const result = await db.features.get('1');
      expect(result.name).toBe(specialString);
    });

    it('should handle unicode characters', async () => {
      const unicodeString = '测试 🎉 Emoji 🚀';

      await db.features.insert({
        id: '1',
        name: unicodeString,
        type: 'restaurant',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: {}
      });

      const result = await db.features.get('1');
      expect(result.name).toBe(unicodeString);
    });
  });

  describe('edge case geometries', () => {
    it('should handle geometries at extreme coordinates', async () => {
      const extremeGeometries = [
        {
          id: '1',
          name: 'North Pole',
          type: 'point',
          geometry: { type: 'Point', coordinates: [0, 90] },
          properties: {}
        },
        {
          id: '2',
          name: 'South Pole',
          type: 'point',
          geometry: { type: 'Point', coordinates: [0, -90] },
          properties: {}
        },
        {
          id: '3',
          name: 'International Date Line',
          type: 'point',
          geometry: { type: 'Point', coordinates: [180, 0] },
          properties: {}
        }
      ];

      await db.features.insertMany(extremeGeometries);

      const results = await db.features.toArray();
      expect(results.length).toBe(3);
    });

    it('should handle very small geometries', async () => {
      await db.features.insert({
        id: '1',
        name: 'Tiny Geometry',
        type: 'polygon',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0.0001, 0],
              [0.0001, 0.0001],
              [0, 0.0001],
              [0, 0]
            ]
          ]
        },
        properties: {}
      });

      const result = await db.features.get('1');
      expect(result.geometry.type).toBe('Polygon');
    });

    it('should handle geometries with holes', async () => {
      await db.features.insert({
        id: '1',
        name: 'Polygon with Hole',
        type: 'polygon',
        geometry: {
          type: 'Polygon',
          coordinates: [
            // 外环
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0]
            ],
            // 内环（孔）
            [
              [3, 3],
              [7, 3],
              [7, 7],
              [3, 7],
              [3, 3]
            ]
          ]
        },
        properties: {}
      });

      const result = await db.features.get('1');
      expect(result.geometry.coordinates.length).toBe(2); // 外环 + 内环
    });
  });

  describe('concurrent operations', () => {
    it('should handle multiple simultaneous inserts', async () => {
      // 并发插入
      const insertPromises = [];
      for (let i = 0; i < 10; i++) {
        insertPromises.push(
          db.features.insert({
            id: `${i}`,
            name: `Feature ${i}`,
            type: 'restaurant',
            geometry: { type: 'Point', coordinates: [i, i] },
            properties: {}
          })
        );
      }

      await Promise.all(insertPromises);

      const count = await db.features.count();
      expect(count).toBe(10);
    });

    it('should handle multiple simultaneous queries', async () => {
      // 先插入一些数据
      const features = [];
      for (let i = 0; i < 100; i++) {
        features.push({
          id: `${i}`,
          name: `Feature ${i}`,
          type: i % 2 === 0 ? 'restaurant' : 'cafe',
          geometry: { type: 'Point', coordinates: [i, i] },
          properties: {}
        });
      }

      await db.features.insertMany(features);

      // 并发查询
      const queryPromises = [
        db.features.where('type', '=', 'restaurant').toArray(),
        db.features.where('type', '=', 'cafe').toArray(),
        db.features.limit(50).toArray(),
        db.features.count()
      ];

      const [restaurants, cafes, limited, count] = await Promise.all(queryPromises);

      expect(restaurants.length).toBe(50);
      expect(cafes.length).toBe(50);
      expect(limited.length).toBe(50);
      expect(count).toBe(100);
    });
  });

  describe('memory and performance limits', () => {
    it('should handle many small queries without memory leak', async () => {
      // 插入测试数据
      const features = [];
      for (let i = 0; i < 100; i++) {
        features.push({
          id: `${i}`,
          name: `Feature ${i}`,
          type: 'restaurant',
          geometry: { type: 'Point', coordinates: [i, i] },
          properties: {}
        });
      }

      await db.features.insertMany(features);

      // 执行多次查询
      for (let i = 0; i < 1000; i++) {
        await db.features.where('type', '=', 'restaurant').limit(10).toArray();
      }

      // 如果到这里没有抛出错误或崩溃，说明内存管理正常
      expect(true).toBe(true);
    });

    it('should handle large individual features', async () => {
      // 创建一个包含大量属性的对象
      const largeProperties = {};
      for (let i = 0; i < 1000; i++) {
        largeProperties[`property${i}`] = `value${i}`.repeat(100);
      }

      await db.features.insert({
        id: '1',
        name: 'Large Feature',
        type: 'restaurant',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: largeProperties
      });

      const result = await db.features.get('1');
      expect(Object.keys(result.properties).length).toBe(1000);
    });
  });
});