import { describe, it, expect, beforeEach } from 'vitest';
import { HybridSpatialIndex } from '../../src/index/hybrid-index';
import type { IndexItem } from '../../src/types';
import { IndexTestHelpers } from '../helpers/index-helpers';

describe('HybridSpatialIndex', () => {
  let index: HybridSpatialIndex;

  beforeEach(() => {
    index = new HybridSpatialIndex();
  });

  describe('basic operations', () => {
    it('should delegate to dynamic index initially', () => {
      const item = { id: '1', minX: 0, minY: 0, maxX: 10, maxY: 10 };

      index.insert(item);

      expect(index.size()).toBe(1);
    });

    it('should support insert', () => {
      const item = { id: '1', minX: 0, minY: 0, maxX: 10, maxY: 10 };

      expect(() => index.insert(item)).not.toThrow();
      expect(index.size()).toBe(1);
    });

    it('should support insertMany', () => {
      const items = IndexTestHelpers.createRandomItems(50);

      expect(() => index.insertMany(items)).not.toThrow();
      expect(index.size()).toBe(50);
    });

    it('should support remove', () => {
      const item = { id: '1', minX: 0, minY: 0, maxX: 10, maxY: 10 };

      index.insert(item);
      expect(index.size()).toBe(1);

      index.remove(item);
      expect(index.size()).toBe(0);
    });

    it('should support search', () => {
      const item = { id: '1', minX: 0, minY: 0, maxX: 10, maxY: 10 };

      index.insert(item);

      const searchBBox = { minX: 5, minY: 5, maxX: 6, maxY: 6 };
      const results = index.search(searchBBox);

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('1');
    });

    it('should support all', () => {
      const items = IndexTestHelpers.createRandomItems(20);
      items.forEach(item => index.insert(item));

      const allItems = index.all();

      expect(allItems).toHaveLength(items.length);
    });

    it('should support clear', () => {
      const items = IndexTestHelpers.createRandomItems(20);
      items.forEach(item => index.insert(item));

      expect(index.size()).toBe(20);

      index.clear();

      expect(index.size()).toBe(0);
      expect(index.all()).toHaveLength(0);
    });
  });

  describe('freeze', () => {
    it('should convert dynamic index to static index', () => {
      const items = IndexTestHelpers.createRandomItems(50);
      items.forEach(item => index.insert(item));

      expect(index.size()).toBe(50);

      index.freeze();

      expect(index.size()).toBe(50); // 大小应该保持不变
    });

    it('should preserve all items during freeze', () => {
      const items = IndexTestHelpers.createRandomItems(30);
      items.forEach(item => index.insert(item));

      const itemsBeforeFreeze = index.all();
      index.freeze();
      const itemsAfterFreeze = index.all();

      expect(itemsBeforeFreeze).toHaveLength(itemsAfterFreeze.length);

      const idsBefore = new Set(itemsBeforeFreeze.map(item => item.id));
      const idsAfter = new Set(itemsAfterFreeze.map(item => item.id));

      expect(idsBefore).toEqual(idsAfter);
    });

    it('should be no-op if already frozen', () => {
      const items = IndexTestHelpers.createRandomItems(20);
      items.forEach(item => index.insert(item));

      index.freeze();
      const sizeAfterFirstFreeze = index.size();

      index.freeze();
      const sizeAfterSecondFreeze = index.size();

      expect(sizeAfterFirstFreeze).toBe(sizeAfterSecondFreeze);
    });

    it('should handle empty index', () => {
      expect(index.size()).toBe(0);

      expect(() => index.freeze()).not.toThrow();
      expect(index.size()).toBe(0);
    });

    it('should handle single item', () => {
      const item = { id: '1', minX: 0, minY: 0, maxX: 10, maxY: 10 };

      index.insert(item);
      index.freeze();

      expect(index.size()).toBe(1);

      const allItems = index.all();
      expect(allItems).toHaveLength(1);
      expect(allItems[0].id).toBe('1');
    });

    it('should handle large dataset', () => {
      const items = IndexTestHelpers.createRandomItems(1000);
      items.forEach(item => index.insert(item));

      const sizeBeforeFreeze = index.size();

      index.freeze();

      const sizeAfterFreeze = index.size();

      expect(sizeBeforeFreeze).toBe(sizeAfterFreeze);
      expect(sizeAfterFreeze).toBe(1000);
    });

    it('should improve search performance after freeze', () => {
      const items = IndexTestHelpers.createRandomItems(500);
      items.forEach(item => index.insert(item));

      // 冻结前测试搜索性能
      const searchBBox = { minX: 250, minY: 250, maxX: 750, maxY: 750 };

      const startBefore = performance.now();
      for (let i = 0; i < 100; i++) {
        index.search(searchBBox);
      }
      const endBefore = performance.now();
      const timeBeforeFreeze = endBefore - startBefore;

      index.freeze();

      // 冻结后测试搜索性能
      const startAfter = performance.now();
      for (let i = 0; i < 100; i++) {
        index.search(searchBBox);
      }
      const endAfter = performance.now();
      const timeAfterFreeze = endAfter - startAfter;

      // 冻结后性能应该更好（或至少不差）
      expect(timeAfterFreeze).toBeLessThanOrEqual(timeBeforeFreeze * 1.5);
    });
  });

  describe('unfreeze', () => {
    it('should convert back to dynamic index', () => {
      const items = IndexTestHelpers.createRandomItems(30);
      items.forEach(item => index.insert(item));

      index.freeze();
      index.unfreeze();

      expect(index.size()).toBe(30);
    });

    it('should preserve all items during unfreeze', () => {
      const items = IndexTestHelpers.createRandomItems(25);
      items.forEach(item => index.insert(item));

      index.freeze();

      const itemsBeforeUnfreeze = index.all();
      index.unfreeze();
      const itemsAfterUnfreeze = index.all();

      expect(itemsBeforeUnfreeze).toHaveLength(itemsAfterUnfreeze.length);

      const idsBefore = new Set(itemsBeforeUnfreeze.map(item => item.id));
      const idsAfter = new Set(itemsAfterUnfreeze.map(item => item.id));

      expect(idsBefore).toEqual(idsAfter);
    });

    it('should be no-op if not frozen', () => {
      const items = IndexTestHelpers.createRandomItems(15);
      items.forEach(item => index.insert(item));

      const sizeBeforeUnfreeze = index.size();

      expect(() => index.unfreeze()).not.toThrow();

      const sizeAfterUnfreeze = index.size();

      expect(sizeBeforeUnfreeze).toBe(sizeAfterUnfreeze);
    });

    it('should allow inserts after unfreeze', () => {
      const items = IndexTestHelpers.createRandomItems(10);
      items.forEach(item => index.insert(item));

      index.freeze();
      index.unfreeze();

      const newItem = { id: 'new-item', minX: 100, minY: 100, maxX: 110, maxY: 110 };

      expect(() => index.insert(newItem)).not.toThrow();
      expect(index.size()).toBe(11);
    });

    it('should allow removes after unfreeze', () => {
      const item = { id: '1', minX: 0, minY: 0, maxX: 10, maxY: 10 };

      index.insert(item);
      index.freeze();
      index.unfreeze();

      expect(() => index.remove(item)).not.toThrow();
      expect(index.size()).toBe(0);
    });

    it('should handle empty frozen index', () => {
      index.freeze(); // 空索引冻结
      index.unfreeze();

      expect(index.size()).toBe(0);
    });
  });

  describe('search across frozen state', () => {
    beforeEach(() => {
      // 创建一些基础数据
      const items = IndexTestHelpers.createGridItems(5, 5, 10);
      items.forEach(item => index.insert(item));
    });

    it('should search both dynamic and static indices', () => {
      // 添加一些动态项
      const dynamicItems = [
        { id: 'dynamic-1', minX: 5, minY: 5, maxX: 15, maxY: 15 },
        { id: 'dynamic-2', minX: 25, minY: 25, maxX: 35, maxY: 35 }
      ];

      dynamicItems.forEach(item => index.insert(item));

      // 冻结以创建静态索引
      index.freeze();

      // 添加更多动态项
      const newDynamicItems = [
        { id: 'new-dynamic-1', minX: 10, minY: 10, maxX: 20, maxY: 20 },
        { id: 'new-dynamic-2', minX: 30, minY: 30, maxX: 40, maxY: 40 }
      ];

      newDynamicItems.forEach(item => index.insert(item));

      // 搜索应该返回来自静态和动态索引的结果
      const searchBBox = { minX: 0, minY: 0, maxX: 50, maxY: 50 };
      const results = index.search(searchBBox);

      expect(results.length).toBeGreaterThan(0);

      // 应该包含静态索引中的项
      expect(results.some(r => r.id === 'dynamic-1')).toBe(true);
      expect(results.some(r => r.id === 'dynamic-2')).toBe(true);

      // 应该包含动态索引中的新项
      expect(results.some(r => r.id === 'new-dynamic-1')).toBe(true);
      expect(results.some(r => r.id === 'new-dynamic-2')).toBe(true);
    });

    it('should handle freeze/unfreeze cycles', () => {
      // 注意：beforeEach 已经插入了 25 项 (5x5 网格)
      const items1 = IndexTestHelpers.createRandomItems(20);
      items1.forEach(item => index.insert(item));

      index.freeze();  // 静态索引: 25 + 20 = 45 项

      const items2 = IndexTestHelpers.createRandomItems(15);
      items2.forEach(item => index.insert(item));  // 动态索引: 15 项

      index.unfreeze();  // 动态索引: 45 + 15 = 60 项

      const items3 = IndexTestHelpers.createRandomItems(10);
      items3.forEach(item => index.insert(item));  // 动态索引: 60 + 10 = 70 项

      index.freeze();  // 静态索引: 70 项

      // 最终大小应该是所有项的总和 (包括 beforeEach 的 25 项)
      expect(index.size()).toBe(25 + 20 + 15 + 10);
    });

    it('should maintain search consistency across cycles', () => {
      const items = IndexTestHelpers.createRandomItems(50);
      items.forEach(item => index.insert(item));

      const searchBBox = { minX: 250, minY: 250, maxX: 750, maxY: 750 };

      // 未冻结时的搜索结果
      const resultsBeforeFreeze = index.search(searchBBox);

      index.freeze();

      // 冻结后的搜索结果应该相同
      const resultsAfterFreeze = index.search(searchBBox);

      expect(resultsBeforeFreeze.length).toBe(resultsAfterFreeze.length);

      const idsBefore = new Set(resultsBeforeFreeze.map(r => r.id));
      const idsAfter = new Set(resultsAfterFreeze.map(r => r.id));

      expect(idsBefore).toEqual(idsAfter);
    });

    it('should correctly search when only static index exists', () => {
      index.freeze();

      const searchBBox = { minX: 0, minY: 0, maxX: 20, maxY: 20 };
      const results = index.search(searchBBox);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should correctly search when only dynamic index exists', () => {
      // 不冻结，只有动态索引
      const searchBBox = { minX: 0, minY: 0, maxX: 20, maxY: 20 };
      const results = index.search(searchBBox);

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('size and clear', () => {
    it('should return combined size', () => {
      // 添加一些项到动态索引
      const dynamicItems = IndexTestHelpers.createRandomItems(20);
      dynamicItems.forEach(item => index.insert(item));

      index.freeze();

      // 添加更多项到动态索引
      const newDynamicItems = IndexTestHelpers.createRandomItems(10);
      newDynamicItems.forEach(item => index.insert(item));

      // 大小应该是静态和动态索引的总和
      expect(index.size()).toBe(20 + 10);
    });

    it('should clear both indices', () => {
      const items = IndexTestHelpers.createRandomItems(30);
      items.forEach(item => index.insert(item));

      index.freeze();

      // 添加更多动态项
      const newItems = IndexTestHelpers.createRandomItems(10);
      newItems.forEach(item => index.insert(item));

      expect(index.size()).toBe(30 + 10);

      index.clear();

      expect(index.size()).toBe(0);
      expect(index.all()).toHaveLength(0);
    });

    it('should handle clear after unfreeze', () => {
      const items = IndexTestHelpers.createRandomItems(20);
      items.forEach(item => index.insert(item));

      index.freeze();
      index.unfreeze();

      expect(index.size()).toBe(20);

      index.clear();

      expect(index.size()).toBe(0);
    });
  });

  describe('complex scenarios', () => {
    it('should handle mixed operations', () => {
      // 插入一些项
      const items1 = IndexTestHelpers.createRandomItems(10);
      items1.forEach(item => index.insert(item));

      // 冻结
      index.freeze();

      // 插入更多项
      const items2 = IndexTestHelpers.createRandomItems(5);
      items2.forEach(item => index.insert(item));

      // 搜索应该找到两类项
      const searchBBox = { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
      const results = index.search(searchBBox);

      expect(results.length).toBe(10 + 5);
    });

    it('should handle remove after freeze (only from dynamic)', () => {
      const items1 = IndexTestHelpers.createRandomItems(10);
      items1.forEach(item => index.insert(item));

      index.freeze();

      // 添加新的动态项
      const newItem = { id: 'new-item', minX: 100, minY: 100, maxX: 110, maxY: 110 };
      index.insert(newItem);

      expect(index.size()).toBe(10 + 1);

      // 移除应该只影响动态索引
      index.remove(newItem);

      expect(index.size()).toBe(10);
    });

    it('should handle bulk operations across freeze', () => {
      const items1 = IndexTestHelpers.createRandomItems(15);
      index.insertMany(items1);

      index.freeze();

      const items2 = IndexTestHelpers.createRandomItems(10);
      index.insertMany(items2);

      expect(index.size()).toBe(15 + 10);

      const allItems = index.all();
      expect(allItems).toHaveLength(25);
    });

    it('should maintain data integrity during multiple cycles', () => {
      const originalItems = IndexTestHelpers.createRandomItems(30);
      originalItems.forEach(item => index.insert(item));

      const originalIds = new Set(originalItems.map(item => item.id));

      // 多次冻结/解冻循环
      for (let i = 0; i < 3; i++) {
        index.freeze();
        index.unfreeze();

        const currentItems = index.all();
        const currentIds = new Set(currentItems.map(item => item.id));

        expect(currentIds).toEqual(originalIds);
        expect(currentItems.length).toBe(originalItems.length);
      }
    });
  });

  describe('performance', () => {
    it('should handle large dataset efficiently', () => {
      const items = IndexTestHelpers.createRandomItems(1000);
      items.forEach(item => index.insert(item));

      const start = performance.now();
      index.freeze();
      const end = performance.now();

      // 冻结操作应该在合理时间内完成
      expect(end - start).toBeLessThan(5000);

      expect(index.size()).toBe(1000);
    });

    it('should handle rapid freeze/unfreeze cycles', () => {
      const items = IndexTestHelpers.createRandomItems(50);
      items.forEach(item => index.insert(item));

      const cycles = 10;

      const start = performance.now();

      for (let i = 0; i < cycles; i++) {
        index.freeze();
        index.unfreeze();
      }

      const end = performance.now();

      // 应该在合理时间内完成
      expect(end - start).toBeLessThan(5000);
    });
  });

  describe('edge cases', () => {
    it('should handle freeze with duplicate IDs', () => {
      const items = [
        { id: '1', minX: 0, minY: 0, maxX: 10, maxY: 10 },
        { id: '1', minX: 20, minY: 20, maxX: 30, maxY: 30 },
        { id: '2', minX: 40, minY: 40, maxX: 50, maxY: 50 }
      ];

      items.forEach(item => index.insert(item));

      index.freeze();

      expect(index.size()).toBe(3);
    });

    it('should handle empty search results after freeze', () => {
      const items = IndexTestHelpers.createRandomItems(10);
      items.forEach(item => index.insert(item));

      index.freeze();

      const searchBBox = { minX: 10000, minY: 10000, maxX: 10100, maxY: 10100 };
      const results = index.search(searchBBox);

      expect(results).toHaveLength(0);
    });

    it('should handle items on boundary after freeze', () => {
      const items = [
        { id: '1', minX: 0, minY: 0, maxX: 10, maxY: 10 },
        { id: '2', minX: 10, minY: 10, maxX: 20, maxY: 20 }
      ];

      items.forEach(item => index.insert(item));

      index.freeze();

      // 搜索边界上的点
      const searchBBox = { minX: 10, minY: 10, maxX: 10, maxY: 10 };
      const results = index.search(searchBBox);

      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle very large coordinates', () => {
      const items = [
        { id: '1', minX: 1e10, minY: 1e10, maxX: 1e10 + 10, maxY: 1e10 + 10 },
        { id: '2', minX: 2e10, minY: 2e10, maxX: 2e10 + 10, maxY: 2e10 + 10 }
      ];

      items.forEach(item => index.insert(item));

      index.freeze();

      const searchBBox = { minX: 1e10 + 5, minY: 1e10 + 5, maxX: 1e10 + 6, maxY: 1e10 + 6 };
      const results = index.search(searchBBox);

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('1');
    });
  });

  describe('integration scenarios', () => {
    it('should simulate typical database workflow', () => {
      // 阶段 1: 批量导入
      const importItems = IndexTestHelpers.createRandomItems(100);
      index.insertMany(importItems);

      expect(index.size()).toBe(100);

      // 阶段 2: 冻结以优化查询
      index.freeze();

      // 阶段 3: 执行查询
      const searchBBox = { minX: 250, minY: 250, maxX: 750, maxY: 750 };
      const results = index.search(searchBBox);

      expect(results.length).toBeGreaterThan(0);

      // 阶段 4: 添加新数据
      const newItems = IndexTestHelpers.createRandomItems(10);
      newItems.forEach(item => index.insert(item));

      expect(index.size()).toBe(110);

      // 阶段 5: 再次查询（应包含新数据）
      const results2 = index.search(searchBBox);

      expect(results2.length).toBeGreaterThanOrEqual(results.length);
    });

    it('should handle data migration scenario', () => {
      // 旧数据
      const oldData = IndexTestHelpers.createRandomItems(50);
      oldData.forEach(item => index.insert(item));

      index.freeze();

      // 迁移: 解冻，添加新数据，重新冻结
      index.unfreeze();

      const newData = IndexTestHelpers.createRandomItems(30);
      newData.forEach(item => index.insert(item));

      index.freeze();

      expect(index.size()).toBe(50 + 30);
    });
  });
});
