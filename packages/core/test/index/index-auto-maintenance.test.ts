import { describe, it, expect, beforeEach } from 'vitest';
import { WebGeoDB } from '../../src';

describe('Spatial Index Auto-Maintenance', () => {
  let db: WebGeoDB;

  beforeEach(async () => {
    db = new WebGeoDB({
      name: 'test-index-auto',
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

  describe('auto index creation', () => {
    it('should auto-create spatial index with auto=true', async () => {
      // 创建索引，设置auto=true
      db.features.createIndex('geometry', { auto: true });

      // 插入测试数据
      await db.features.insertMany([
        {
          id: '1',
          name: 'Feature 1',
          type: 'point',
          geometry: {
            type: 'Point',
            coordinates: [0, 0]
          }
        },
        {
          id: '2',
          name: 'Feature 2',
          type: 'point',
          geometry: {
            type: 'Point',
            coordinates: [1, 1]
          }
        }
      ]);

      // 验证数据已插入
      const count = await db.features.count();
      expect(count).toBe(2);

      // 使用空间查询，验证索引工作正常
      const results = await db.features
        .distance('geometry', [0, 0], '<', 1000)
        .toArray();

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('1');
    });

    it('should maintain index after multiple inserts', async () => {
      db.features.createIndex('geometry', { auto: true });

      // 分批插入数据
      const batch1 = [
        {
          id: '1',
          name: 'Feature 1',
          type: 'point',
          geometry: { type: 'Point', coordinates: [0, 0] }
        },
        {
          id: '2',
          name: 'Feature 2',
          type: 'point',
          geometry: { type: 'Point', coordinates: [1, 1] }
        }
      ];

      const batch2 = [
        {
          id: '3',
          name: 'Feature 3',
          type: 'point',
          geometry: { type: 'Point', coordinates: [2, 2] }
        },
        {
          id: '4',
          name: 'Feature 4',
          type: 'point',
          geometry: { type: 'Point', coordinates: [3, 3] }
        }
      ];

      await db.features.insertMany(batch1);
      await db.features.insertMany(batch2);

      // 验证所有数据都可以通过空间查询找到
      const results = await db.features
        .distance('geometry', [1, 1], '<', 5000)
        .toArray();

      expect(results.length).toBe(4);
    });

    it('should maintain index after updates', async () => {
      db.features.createIndex('geometry', { auto: true });

      // 插入初始数据
      await db.features.insert({
        id: '1',
        name: 'Feature 1',
        type: 'point',
        geometry: { type: 'Point', coordinates: [0, 0] }
      });

      // 更新几何数据
      await db.features.update('1', {
        geometry: { type: 'Point', coordinates: [5, 5] }
      });

      // 验证更新后的位置可以通过空间查询找到
      const results = await db.features
        .distance('geometry', [5, 5], '<', 100)
        .toArray();

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('1');
    });

    it('should maintain index after deletes', async () => {
      db.features.createIndex('geometry', { auto: true });

      // 插入多条数据
      await db.features.insertMany([
        {
          id: '1',
          name: 'Feature 1',
          type: 'point',
          geometry: { type: 'Point', coordinates: [0, 0] }
        },
        {
          id: '2',
          name: 'Feature 2',
          type: 'point',
          geometry: { type: 'Point', coordinates: [1, 1] }
        },
        {
          id: '3',
          name: 'Feature 3',
          type: 'point',
          geometry: { type: 'Point', coordinates: [2, 2] }
        }
      ]);

      // 删除一条数据
      await db.features.delete('2');

      // 验证剩余数据可以通过空间查询找到
      const results = await db.features
        .distance('geometry', [1, 1], '<', 2000)
        .toArray();

      expect(results.length).toBe(2);
      expect(results.every(r => r.id !== '2')).toBe(true);
    });
  });

  describe('index performance', () => {
    it('should handle large dataset with auto index', async () => {
      db.features.createIndex('geometry', { auto: true });

      // 插入大量数据
      const features = [];
      for (let i = 0; i < 1000; i++) {
        features.push({
          id: `feature-${i}`,
          name: `Feature ${i}`,
          type: 'point',
          geometry: {
            type: 'Point',
            coordinates: [Math.random() * 100, Math.random() * 100]
          }
        });
      }

      await db.features.insertMany(features);

      // 验证查询性能
      const startTime = performance.now();
      const results = await db.features
        .distance('geometry', [50, 50], '<', 10)
        .toArray();
      const endTime = performance.now();

      const duration = endTime - startTime;

      // 查询应该在合理时间内完成
      expect(duration).toBeLessThan(1000); // 1秒内完成

      // 应该找到一些结果
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('index with different geometry types', () => {
    it('should maintain index for mixed geometry types', async () => {
      db.features.createIndex('geometry', { auto: true });

      // 插入不同类型的几何
      await db.features.insertMany([
        {
          id: '1',
          name: 'Point',
          type: 'point',
          geometry: {
            type: 'Point',
            coordinates: [0, 0]
          }
        },
        {
          id: '2',
          name: 'LineString',
          type: 'line',
          geometry: {
            type: 'LineString',
            coordinates: [[1, 1], [2, 2], [3, 3]]
          }
        },
        {
          id: '3',
          name: 'Polygon',
          type: 'polygon',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [[10, 10], [20, 10], [20, 20], [10, 20], [10, 10]]
            ]
          }
        }
      ]);

      // 验证所有类型的几何都可以通过空间查询找到
      const pointResults = await db.features
        .distance('geometry', [0, 0], '<', 100)
        .toArray();

      expect(pointResults.length).toBeGreaterThan(0);

      // 验证Polygon的相交查询
      const polygon = {
        type: 'Polygon',
        coordinates: [
          [[5, 5], [25, 5], [25, 25], [5, 25], [5, 5]]
        ]
      };

      const intersectResults = await db.features
        .intersects('geometry', polygon)
        .toArray();

      expect(intersectResults.some(r => r.id === '3')).toBe(true);
    });
  });
});