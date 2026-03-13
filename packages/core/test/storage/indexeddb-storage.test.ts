/**
 * IndexedDB 存储层测试
 *
 * 测试 IndexedDB 存储适配器的功能：
 * - 数据库初始化
 * - 表结构定义
 * - 空间索引
 * - 版本管理
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IndexedDBStorage } from '../../src/storage/indexeddb-storage';
import type { TableSchema } from '../../src/types';

describe('IndexedDB Storage', () => {
  let storage: IndexedDBStorage;

  beforeEach(() => {
    storage = new IndexedDBStorage('test-storage', 1);
  });

  afterEach(async () => {
    await storage.delete();
  });

  describe('数据库初始化', () => {
    it('should create database with name and version', () => {
      expect(storage.name).toBe('test-storage');
      expect(storage.verno).toBe(1);
    });

    it('should open database successfully', async () => {
      await storage.open();
      expect(storage.isOpen()).toBe(true);
      await storage.close();
    });

    it('should handle multiple open calls', async () => {
      await storage.open();
      await storage.open(); // Should not throw
      expect(storage.isOpen()).toBe(true);
      await storage.close();
    });
  });

  describe('表结构定义', () => {
    it('should define schema with geometry field', async () => {
      const schemas: Record<string, TableSchema> = {
        features: {
          id: 'string',
          name: 'string',
          type: 'string',
          geometry: 'geometry'
        }
      };

      await storage.open();
      storage.defineSchema(schemas);

      // Verify table exists
      const table = storage.getTable('features');
      expect(table).toBeDefined();
      await storage.close();
    });

    it('should define schema with multiple geometry fields', async () => {
      const schemas: Record<string, TableSchema> = {
        features: {
          id: 'string',
          geometry: 'geometry',
          bbox: 'geometry'
        }
      };

      await storage.open();
      storage.defineSchema(schemas);

      const table = storage.getTable('features');
      expect(table).toBeDefined();
      await storage.close();
    });

    it('should define schema with json field', async () => {
      const schemas: Record<string, TableSchema> = {
        features: {
          id: 'string',
          properties: 'json',
          metadata: 'json'
        }
      };

      await storage.open();
      storage.defineSchema(schemas);

      const table = storage.getTable('features');
      expect(table).toBeDefined();
      await storage.close();
    });

    it('should define multiple tables', async () => {
      const schemas: Record<string, TableSchema> = {
        features: {
          id: 'string',
          name: 'string',
          geometry: 'geometry'
        },
        labels: {
          id: 'string',
          text: 'string',
          position: 'geometry'
        }
      };

      await storage.open();
      storage.defineSchema(schemas);

      const featuresTable = storage.getTable('features');
      const labelsTable = storage.getTable('labels');
      expect(featuresTable).toBeDefined();
      expect(labelsTable).toBeDefined();
      await storage.close();
    });

    it('should create spatial indexes for geometry fields', async () => {
      const schemas: Record<string, TableSchema> = {
        features: {
          id: 'string',
          name: 'string',
          geometry: 'geometry'
        }
      };

      await storage.open();
      storage.defineSchema(schemas);

      // BBox index should be created: [minX+minY+maxX+maxY]
      const table = storage.getTable('features');
      expect(table).toBeDefined();

      // Verify by checking table schema
      await storage.close();
    });
  });

  describe('CRUD 操作', () => {
    beforeEach(async () => {
      await storage.open();
      storage.defineSchema({
        features: {
          id: 'string',
          name: 'string',
          type: 'string',
          geometry: 'geometry'
        }
      });
    });

    afterEach(async () => {
      await storage.close();
    });

    it('should add item to table', async () => {
      const table = storage.getTable('features');

      await table.add({
        id: '1',
        name: 'Feature 1',
        type: 'point',
        geometry: { type: 'Point', coordinates: [0, 0] }
      });

      const retrieved = await table.get('1');
      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('Feature 1');
    });

    it('should bulk add items', async () => {
      const table = storage.getTable('features');

      const items = [
        { id: '1', name: 'Feature 1', type: 'point', geometry: { type: 'Point', coordinates: [0, 0] } },
        { id: '2', name: 'Feature 2', type: 'line', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } },
        { id: '3', name: 'Feature 3', type: 'polygon', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } }
      ];

      await table.bulkAdd(items);

      const count = await table.count();
      expect(count).toBe(3);
    });

    it('should update item', async () => {
      const table = storage.getTable('features');

      await table.add({
        id: '1',
        name: 'Feature 1',
        type: 'point',
        geometry: { type: 'Point', coordinates: [0, 0] }
      });

      await table.update('1', { name: 'Updated Feature' });

      const retrieved = await table.get('1');
      expect(retrieved.name).toBe('Updated Feature');
    });

    it('should delete item', async () => {
      const table = storage.getTable('features');

      await table.add({
        id: '1',
        name: 'Feature 1',
        type: 'point',
        geometry: { type: 'Point', coordinates: [0, 0] }
      });

      await table.delete('1');

      const retrieved = await table.get('1');
      expect(retrieved).toBeUndefined();
    });

    it('should clear table', async () => {
      const table = storage.getTable('features');

      await table.bulkAdd([
        { id: '1', name: 'Feature 1', type: 'point', geometry: { type: 'Point', coordinates: [0, 0] } },
        { id: '2', name: 'Feature 2', type: 'line', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } }
      ]);

      await table.clear();

      const count = await table.count();
      expect(count).toBe(0);
    });

    it('should query with where clause', async () => {
      const table = storage.getTable('features');

      await table.bulkAdd([
        { id: '1', name: 'Restaurant', type: 'point', geometry: { type: 'Point', coordinates: [0, 0] } },
        { id: '2', name: 'Cafe', type: 'point', geometry: { type: 'Point', coordinates: [1, 1] } },
        { id: '3', name: 'Shop', type: 'polygon', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } }
      ]);

      const results = await table.where('type').equals('point').toArray();

      expect(results).toHaveLength(2);
      expect(results.every(r => r.type === 'point')).toBe(true);
    });

    it('should query with bbox range', async () => {
      const table = storage.getTable('features');

      await table.bulkAdd([
        { id: '1', name: 'Feature 1', type: 'point', geometry: { type: 'Point', coordinates: [0, 0] } },
        { id: '2', name: 'Feature 2', type: 'point', geometry: { type: 'Point', coordinates: [10, 10] } }
      ]);

      // Query features near origin (bbox: [0, 0, 1, 1])
      const results = await table
        .where('[minX+minY+maxX+maxY]')
        .between([0, 0, 1, 1], [1, 1, 2, 2])
        .toArray();

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('边界情况', () => {
    it('should handle empty schema', async () => {
      await storage.open();
      storage.defineSchema({});

      // Should not throw
      await storage.close();
    });

    it('should handle schema with only id field', async () => {
      await storage.open();
      storage.defineSchema({
        features: { id: 'string' }
      });

      const table = storage.getTable('features');
      expect(table).toBeDefined();
      await storage.close();
    });

    it('should handle geometry without coordinates', async () => {
      await storage.open();
      storage.defineSchema({
        features: {
          id: 'string',
          geometry: 'geometry'
        }
      });

      const table = storage.getTable('features');

      // Add feature with null geometry
      await table.add({
        id: '1',
        geometry: null
      });

      const retrieved = await table.get('1');
      expect(retrieved.geometry).toBeNull();
      await storage.close();
    });

    it('should handle large dataset', async () => {
      await storage.open();
      storage.defineSchema({
        features: {
          id: 'string',
          name: 'string',
          geometry: 'geometry'
        }
      });

      const table = storage.getTable('features');

      // Add 1000 features
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: String(i),
        name: `Feature ${i}`,
        geometry: { type: 'Point', coordinates: [i % 100, Math.floor(i / 100)] }
      }));

      await table.bulkAdd(items);

      const count = await table.count();
      expect(count).toBe(1000);
      await storage.close();
    });

    it('should handle special characters in id', async () => {
      await storage.open();
      storage.defineSchema({
        features: {
          id: 'string',
          name: 'string'
        }
      });

      const table = storage.getTable('features');

      const specialId = "id-with'\"`\\special";

      await table.add({
        id: specialId,
        name: 'Special ID Feature'
      });

      const retrieved = await table.get(specialId);
      expect(retrieved).toBeDefined();
      await storage.close();
    });

    it('should handle unicode characters', async () => {
      await storage.open();
      storage.defineSchema({
        features: {
          id: 'string',
          name: 'string'
        }
      });

      const table = storage.getTable('features');

      await table.add({
        id: '1',
        name: '功能 特征 Café'
      });

      const retrieved = await table.get('1');
      expect(retrieved.name).toBe('功能 特征 Café');
      await storage.close();
    });
  });

  describe('版本管理', () => {
    it('should handle database upgrade', async () => {
      // Create version 1
      await storage.open();
      storage.defineSchema({
        features: {
          id: 'string',
          name: 'string'
        }
      });
      await storage.close();

      // Upgrade to version 2
      const storage2 = new IndexedDBStorage('test-storage', 2);
      await storage2.open();
      storage2.defineSchema({
        features: {
          id: 'string',
          name: 'string',
          type: 'string' // New field
        }
      });

      const table = storage2.getTable('features');
      expect(table).toBeDefined();
      await storage2.close();
      await storage2.delete();
    });

    it('should handle version downgrade error', async () => {
      await storage.open();
      await storage.close();

      // Try to open with lower version
      const storage2 = new IndexedDBStorage('test-storage', 0);

      await expect(storage2.open()).rejects.toThrow();
      await storage2.delete();
    });
  });

  describe('错误处理', () => {
    it('should throw on invalid table name', async () => {
      await storage.open();
      storage.defineSchema({
        features: { id: 'string', name: 'string' }
      });

      expect(() => storage.getTable('nonexistent')).toThrow();
      await storage.close();
    });

    it('should throw on duplicate id', async () => {
      await storage.open();
      storage.defineSchema({
        features: { id: 'string', name: 'string' }
      });

      const table = storage.getTable('features');

      await table.add({ id: '1', name: 'Feature 1' });

      await expect(table.add({ id: '1', name: 'Feature 2' })).rejects.toThrow();
      await storage.close();
    });

    it('should throw on missing required fields', async () => {
      await storage.open();
      storage.defineSchema({
        features: { id: 'string', name: 'string' }
      });

      const table = storage.getTable('features');

      // Missing 'name' field
      await expect(table.add({ id: '1' })).rejects.toThrow();
      await storage.close();
    });

    it('should handle database close during transaction', async () => {
      await storage.open();
      storage.defineSchema({
        features: { id: 'string', name: 'string' }
      });

      const table = storage.getTable('features');

      // Start transaction
      const promise = table.add({ id: '1', name: 'Feature 1' });

      // Close database immediately
      await storage.close();

      // Transaction should fail or complete
      await expect(promise).resolves.toBeDefined();
    });
  });

  describe('性能测试', () => {
    it('should handle bulk insert efficiently', async () => {
      await storage.open();
      storage.defineSchema({
        features: {
          id: 'string',
          name: 'string',
          geometry: 'geometry'
        }
      });

      const table = storage.getTable('features');

      const startTime = performance.now();

      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: String(i),
        name: `Feature ${i}`,
        geometry: { type: 'Point', coordinates: [i % 100, Math.floor(i / 100)] }
      }));

      await table.bulkAdd(items);

      const duration = performance.now() - startTime;

      // Should complete 1000 inserts in reasonable time
      expect(duration).toBeLessThan(5000);

      const count = await table.count();
      expect(count).toBe(1000);
      await storage.close();
    });

    it('should handle bulk read efficiently', async () => {
      await storage.open();
      storage.defineSchema({
        features: {
          id: 'string',
          name: 'string',
          type: 'string'
        }
      });

      const table = storage.getTable('features');

      // Insert 1000 items
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: String(i),
        name: `Feature ${i}`,
        type: i % 2 === 0 ? 'even' : 'odd'
      }));

      await table.bulkAdd(items);

      const startTime = performance.now();

      const results = await table.where('type').equals('even').toArray();

      const duration = performance.now() - startTime;

      expect(results).toHaveLength(500);
      expect(duration).toBeLessThan(1000);
      await storage.close();
    });
  });
});
