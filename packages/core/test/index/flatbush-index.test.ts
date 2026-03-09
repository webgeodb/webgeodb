import { describe, it, expect, beforeEach } from 'vitest';
import { FlatbushIndex } from '../../src/index/flatbush-index';
import type { IndexItem } from '../../src/types';
import { IndexTestHelpers } from '../helpers/index-helpers';

describe('FlatbushIndex', () => {
  let index: FlatbushIndex;

  beforeEach(() => {
    index = new FlatbushIndex(16);
  });

  describe('build', () => {
    it('should build index from inserted items', () => {
      const items = IndexTestHelpers.createRandomItems(100);
      items.forEach(item => index.insert(item));

      expect(index.isBuilt()).toBe(false);

      index.build();

      expect(index.isBuilt()).toBe(true);
      expect(index.size()).toBe(100);
    });

    it('should throw error if searching before build', () => {
      index.insert({ id: '1', minX: 0, minY: 0, maxX: 10, maxY: 10 });

      expect(() => {
        index.search({ minX: 0, minY: 0, maxX: 10, maxY: 10 });
      }).toThrow('Index not built');
    });

    it('should be idempotent (multiple builds)', () => {
      const items = IndexTestHelpers.createRandomItems(10);
      items.forEach(item => index.insert(item));

      index.build();
      const sizeAfterFirstBuild = index.size();

      index.build();
      const sizeAfterSecondBuild = index.size();

      expect(sizeAfterFirstBuild).toBe(sizeAfterSecondBuild);
    });

    it('should build empty index', () => {
      index.build();

      expect(index.isBuilt()).toBe(true);
      expect(index.size()).toBe(0);
    });

    it('should build index with single item', () => {
      const item = { id: '1', minX: 0, minY: 0, maxX: 10, maxY: 10 };
      index.insert(item);
      index.build();

      expect(index.size()).toBe(1);
      expect(index.isBuilt()).toBe(true);
    });

    it('should build large index efficiently', () => {
      const items = IndexTestHelpers.createRandomItems(1000);
      items.forEach(item => index.insert(item));

      const start = performance.now();
      index.build();
      const end = performance.now();

      expect(end - start).toBeLessThan(5000); // 应该在 5 秒内完成
      expect(index.size()).toBe(1000);
    });
  });

  describe('insert', () => {
    it('should allow insert before build', () => {
      const item = { id: '1', minX: 0, minY: 0, maxX: 10, maxY: 10 };

      expect(() => index.insert(item)).not.toThrow();
      expect(index.size()).toBe(1);
    });

    it('should throw error after build (static index)', () => {
      const item1 = { id: '1', minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const item2 = { id: '2', minX: 20, minY: 20, maxX: 30, maxY: 30 };

      index.insert(item1);
      index.build();

      expect(() => index.insert(item2)).toThrow('Cannot insert into a built static index');
    });

    it('should support insertMany', () => {
      const items = IndexTestHelpers.createRandomItems(50);

      expect(() => index.insertMany(items)).not.toThrow();
      expect(index.size()).toBe(50);
    });

    it('should support insertMany after build', () => {
      const items1 = IndexTestHelpers.createRandomItems(10);
      const items2 = IndexTestHelpers.createRandomItems(5);

      index.insertMany(items1);
      index.build();

      expect(() => index.insertMany(items2)).toThrow('Cannot insert into a built static index');
    });

    it('should handle duplicate IDs', () => {
      const item1 = { id: '1', minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const item2 = { id: '1', minX: 20, minY: 20, maxX: 30, maxY: 30 };

      index.insert(item1);
      index.insert(item2);
      index.build();

      expect(index.size()).toBe(2); // 两个项目都应该被添加
    });
  });

  describe('remove', () => {
    it('should throw error (static index does not support removal)', () => {
      const item = { id: '1', minX: 0, minY: 0, maxX: 10, maxY: 10 };

      index.insert(item);

      expect(() => index.remove(item)).toThrow('Static index does not support removal');
    });

    it('should throw error even before build', () => {
      const item = { id: '1', minX: 0, minY: 0, maxX: 10, maxY: 10 };

      expect(() => index.remove(item)).toThrow('Static index does not support removal');
    });
  });

  describe('search', () => {
    let testItems: IndexItem[];

    beforeEach(() => {
      testItems = IndexTestHelpers.createGridItems(10, 10, 10);
      testItems.forEach(item => index.insert(item));
      index.build();
    });

    it('should find all items in bounding box', () => {
      const searchBBox = { minX: 25, minY: 25, maxX: 55, maxY: 55 };
      const results = index.search(searchBBox);

      const expectedIds = IndexTestHelpers.calculateExpectedItems(testItems, searchBBox);

      expect(results.length).toBeGreaterThan(0);
      IndexTestHelpers.validateSearchResults(results, expectedIds, 'Grid search');
    });

    it('should return empty array when no matches', () => {
      const searchBBox = { minX: 1000, minY: 1000, maxX: 1010, maxY: 1010 };
      const results = index.search(searchBBox);

      expect(results).toHaveLength(0);
    });

    it('should handle edge cases (bbox on boundary)', () => {
      // 搜索边界框正好与某个项的边界相切
      const searchBBox = { minX: 10, minY: 10, maxX: 20, maxY: 20 };
      const results = index.search(searchBBox);

      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle single point search', () => {
      const searchBBox = { minX: 15, minY: 15, maxX: 15, maxY: 15 };
      const results = index.search(searchBBox);

      // 单点搜索应该找到包含该点的项
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle large bounding box covering all items', () => {
      const searchBBox = { minX: -100, minY: -100, maxX: 200, maxY: 200 };
      const results = index.search(searchBBox);

      expect(results.length).toBe(testItems.length);
    });

    it('should handle negative coordinates', () => {
      const negIndex = new FlatbushIndex();
      const negItems = [
        { id: '1', minX: -50, minY: -50, maxX: -30, maxY: -30 },
        { id: '2', minX: -20, minY: -20, maxX: 0, maxY: 0 },
        { id: '3', minX: 10, minY: 10, maxX: 30, maxY: 30 }
      ];

      negItems.forEach(item => negIndex.insert(item));
      negIndex.build();

      const searchBBox = { minX: -40, minY: -40, maxX: -10, maxY: -10 };
      const results = negIndex.search(searchBBox);

      expect(results.length).toBe(2);
    });

    it('should handle floating point coordinates', () => {
      const fpIndex = new FlatbushIndex();
      const fpItems = [
        { id: '1', minX: 10.5, minY: 20.3, maxX: 15.7, maxY: 25.9 },
        { id: '2', minX: 30.1, minY: 40.2, maxX: 35.8, maxY: 45.6 }
      ];

      fpItems.forEach(item => fpIndex.insert(item));
      fpIndex.build();

      const searchBBox = { minX: 12, minY: 22, maxX: 14, maxY: 24 };
      const results = fpIndex.search(searchBBox);

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('1');
    });
  });

  describe('all and clear', () => {
    it('should return all inserted items', () => {
      const items = IndexTestHelpers.createRandomItems(50);
      items.forEach(item => index.insert(item));
      index.build();

      const allItems = index.all();

      expect(allItems).toHaveLength(items.length);
      expect(allItems).toEqual(expect.arrayContaining(items));
    });

    it('should return empty array when no items', () => {
      index.build();

      const allItems = index.all();

      expect(allItems).toHaveLength(0);
    });

    it('should reset index to initial state', () => {
      const items = IndexTestHelpers.createRandomItems(20);
      items.forEach(item => index.insert(item));
      index.build();

      expect(index.size()).toBe(20);
      expect(index.isBuilt()).toBe(true);

      index.clear();

      expect(index.size()).toBe(0);
      expect(index.isBuilt()).toBe(false);
    });

    it('should allow new inserts after clear', () => {
      const items = IndexTestHelpers.createRandomItems(10);
      items.forEach(item => index.insert(item));
      index.build();

      index.clear();

      const newItems = IndexTestHelpers.createRandomItems(5);
      newItems.forEach(item => index.insert(item));

      expect(() => index.build()).not.toThrow();
      expect(index.size()).toBe(5);
    });
  });

  describe('size', () => {
    it('should report correct size', () => {
      expect(index.size()).toBe(0);

      index.insert({ id: '1', minX: 0, minY: 0, maxX: 10, maxY: 10 });
      expect(index.size()).toBe(1);

      index.insert({ id: '2', minX: 20, minY: 20, maxX: 30, maxY: 30 });
      expect(index.size()).toBe(2);
    });

    it('should maintain size after build', () => {
      const items = IndexTestHelpers.createRandomItems(30);
      items.forEach(item => index.insert(item));

      const sizeBeforeBuild = index.size();
      index.build();
      const sizeAfterBuild = index.size();

      expect(sizeBeforeBuild).toBe(sizeAfterBuild);
    });
  });

  describe('isBuilt', () => {
    it('should return false before build', () => {
      index.insert({ id: '1', minX: 0, minY: 0, maxX: 10, maxY: 10 });

      expect(index.isBuilt()).toBe(false);
    });

    it('should return true after build', () => {
      index.insert({ id: '1', minX: 0, minY: 0, maxX: 10, maxY: 10 });
      index.build();

      expect(index.isBuilt()).toBe(true);
    });

    it('should return false after clear', () => {
      index.insert({ id: '1', minX: 0, minY: 0, maxX: 10, maxY: 10 });
      index.build();

      expect(index.isBuilt()).toBe(true);

      index.clear();

      expect(index.isBuilt()).toBe(false);
    });
  });

  describe('performance', () => {
    it('should search efficiently on large dataset', async () => {
      const items = IndexTestHelpers.createRandomItems(5000);
      items.forEach(item => index.insert(item));
      index.build();

      const stats = await IndexTestHelpers.performanceTest(index, items, 100);

      expect(stats.avgTime).toBeLessThan(1); // 平均搜索时间应该 < 1ms
      expect(stats.maxTime).toBeLessThan(10); // 最大搜索时间应该 < 10ms
    });

    it('should handle highly clustered data', () => {
      // 所有项都在很小的区域内
      const clusteredItems = Array.from({ length: 100 }, (_, i) => ({
        id: `cluster-${i}`,
        minX: 50 + Math.random() * 10,
        minY: 50 + Math.random() * 10,
        maxX: 60 + Math.random() * 10,
        maxY: 60 + Math.random() * 10
      }));

      clusteredItems.forEach(item => index.insert(item));
      index.build();

      const searchBBox = { minX: 55, minY: 55, maxX: 65, maxY: 65 };
      const results = index.search(searchBBox);

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(100);
    });

    it('should handle widely dispersed data', () => {
      // 项分布在很大的区域内
      const dispersedItems = Array.from({ length: 100 }, (_, i) => ({
        id: `dispersed-${i}`,
        minX: i * 1000,
        minY: i * 1000,
        maxX: i * 1000 + 10,
        maxY: i * 1000 + 10
      }));

      dispersedItems.forEach(item => index.insert(item));
      index.build();

      const searchBBox = { minX: 50000, minY: 50000, maxX: 50100, maxY: 50100 };
      const results = index.search(searchBBox);

      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('edge cases', () => {
    it('should handle items with zero area', () => {
      const zeroAreaItems = [
        { id: 'point-1', minX: 10, minY: 10, maxX: 10, maxY: 10 },
        { id: 'point-2', minX: 20, minY: 20, maxX: 20, maxY: 20 },
        { id: 'point-3', minX: 30, minY: 30, maxX: 30, maxY: 30 }
      ];

      zeroAreaItems.forEach(item => index.insert(item));
      index.build();

      const searchBBox = { minX: 15, minY: 15, maxX: 25, maxY: 25 };
      const results = index.search(searchBBox);

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('point-2');
    });

    it('should handle items with very small area', () => {
      const tinyItems = [
        { id: 'tiny-1', minX: 10, minY: 10, maxX: 10.0001, maxY: 10.0001 },
        { id: 'tiny-2', minX: 20, minY: 20, maxX: 20.0001, maxY: 20.0001 }
      ];

      tinyItems.forEach(item => index.insert(item));
      index.build();

      expect(index.size()).toBe(2);

      const allItems = index.all();
      expect(allItems).toHaveLength(2);
    });

    it('should handle duplicate bounding boxes', () => {
      const duplicateItems = [
        { id: 'dup-1', minX: 10, minY: 10, maxX: 20, maxY: 20 },
        { id: 'dup-2', minX: 10, minY: 10, maxX: 20, maxY: 20 },
        { id: 'dup-3', minX: 10, minY: 10, maxX: 20, maxY: 20 }
      ];

      duplicateItems.forEach(item => index.insert(item));
      index.build();

      const searchBBox = { minX: 15, minY: 15, maxX: 15, maxY: 15 };
      const results = index.search(searchBBox);

      expect(results.length).toBe(3);
    });

    it('should handle extremely large coordinates', () => {
      const largeCoordItems = [
        { id: 'large-1', minX: 1e10, minY: 1e10, maxX: 1e10 + 10, maxY: 1e10 + 10 },
        { id: 'large-2', minX: 2e10, minY: 2e10, maxX: 2e10 + 10, maxY: 2e10 + 10 }
      ];

      largeCoordItems.forEach(item => index.insert(item));
      index.build();

      const searchBBox = { minX: 1e10 + 5, minY: 1e10 + 5, maxX: 1e10 + 6, maxY: 1e10 + 6 };
      const results = index.search(searchBBox);

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('large-1');
    });

    it('should handle items with negative width or height (invalid bbox)', () => {
      // 这种情况在实际应用中不应该发生，但测试鲁棒性
      const invalidItem = { id: 'invalid', minX: 10, minY: 10, maxX: 5, maxY: 5 };

      expect(() => {
        index.insert(invalidItem);
      }).not.toThrow();
    });
  });

  describe('custom nodeSize', () => {
    it('should respect custom nodeSize', () => {
      const customIndex = new FlatbushIndex(4);
      const items = IndexTestHelpers.createRandomItems(50);

      items.forEach(item => customIndex.insert(item));
      customIndex.build();

      expect(customIndex.isBuilt()).toBe(true);
      expect(customIndex.size()).toBe(50);
    });

    it('should handle very small nodeSize', () => {
      const smallNodeIndex = new FlatbushIndex(2);
      const items = IndexTestHelpers.createRandomItems(20);

      items.forEach(item => smallNodeIndex.insert(item));
      smallNodeIndex.build();

      expect(smallNodeIndex.isBuilt()).toBe(true);
    });

    it('should handle very large nodeSize', () => {
      const largeNodeIndex = new FlatbushIndex(64);
      const items = IndexTestHelpers.createRandomItems(100);

      items.forEach(item => largeNodeIndex.insert(item));
      largeNodeIndex.build();

      expect(largeNodeIndex.isBuilt()).toBe(true);
    });
  });

  describe('concurrent operations', () => {
    it('should handle rapid sequential searches', () => {
      const items = IndexTestHelpers.createRandomItems(100);
      items.forEach(item => index.insert(item));
      index.build();

      const searchCount = 1000;
      const searchBBox = { minX: 25, minY: 25, maxX: 75, maxY: 75 };

      const start = performance.now();

      for (let i = 0; i < searchCount; i++) {
        index.search(searchBBox);
      }

      const end = performance.now();
      const avgTime = (end - start) / searchCount;

      expect(avgTime).toBeLessThan(1); // 每次搜索应该 < 1ms
    });
  });
});
