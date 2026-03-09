import { describe, it, expect, beforeEach } from 'vitest';
import { LRUCache } from '../../src/utils/cache';

describe('LRUCache', () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    cache = new LRUCache(3); // 使用小容量便于测试
  });

  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 100);
      expect(cache.get('key1')).toBe(100);
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should check existence with has()', () => {
      cache.set('key1', 100);
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should update existing key', () => {
      cache.set('key1', 100);
      cache.set('key1', 200);
      expect(cache.get('key1')).toBe(200);
      expect(cache.size).toBe(1);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used item when at capacity', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);

      expect(cache.size).toBe(3);

      // 添加第4个项，应该驱逐 key1
      cache.set('key4', 400);

      expect(cache.size).toBe(3);
      expect(cache.has('key1')).toBe(false);
      expect(cache.get('key2')).toBe(200);
      expect(cache.get('key3')).toBe(300);
      expect(cache.get('key4')).toBe(400);
    });

    it('should update access order on get', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);

      // 访问 key1，使其变为最近使用
      cache.get('key1');

      // 添加新项，应该驱逐 key2（而不是 key1）
      cache.set('key4', 400);

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    it('should update access order on set (existing key)', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);

      // 更新 key1，使其变为最近使用
      cache.set('key1', 150);

      // 添加新项，应该驱逐 key2（而不是 key1）
      cache.set('key4', 400);

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    it('should handle multiple evictions correctly', () => {
      const cache = new LRUCache<string, number>(2);

      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);
      cache.set('key4', 400);

      expect(cache.size).toBe(2);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
      expect(cache.get('key3')).toBe(300);
      expect(cache.get('key4')).toBe(400);
    });
  });

  describe('delete and clear', () => {
    it('should delete specific item', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);

      expect(cache.size).toBe(2);

      cache.delete('key1');

      expect(cache.size).toBe(1);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
    });

    it('should return true when deleting existing item', () => {
      cache.set('key1', 100);

      expect(cache.delete('key1')).toBe(true);
    });

    it('should return false when deleting non-existent item', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });

    it('should clear all items', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);

      expect(cache.size).toBe(3);

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(false);
    });
  });

  describe('size tracking', () => {
    it('should report correct size', () => {
      expect(cache.size).toBe(0);

      cache.set('key1', 100);
      expect(cache.size).toBe(1);

      cache.set('key2', 200);
      expect(cache.size).toBe(2);

      cache.set('key3', 300);
      expect(cache.size).toBe(3);
    });

    it('should maintain size after updates', () => {
      cache.set('key1', 100);
      cache.set('key1', 200);

      expect(cache.size).toBe(1);
    });

    it('should maintain size after deletion', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);

      cache.delete('key1');

      expect(cache.size).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle maxSize of 1', () => {
      const cache = new LRUCache<string, number>(1);

      cache.set('key1', 100);
      cache.set('key2', 200);

      expect(cache.size).toBe(1);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe(200);
    });

    it('should handle rapid insert/delete cycles', () => {
      for (let i = 0; i < 100; i++) {
        cache.set(`key${i}`, i);
      }

      expect(cache.size).toBe(3);
      expect(cache.get('key97')).toBeDefined();
      expect(cache.get('key98')).toBeDefined();
      expect(cache.get('key99')).toBeDefined();
    });

    it('should handle undefined and null values', () => {
      cache.set('undefined', undefined);
      cache.set('null', null);

      expect(cache.has('undefined')).toBe(true);
      expect(cache.has('null')).toBe(true);
      expect(cache.get('undefined')).toBeUndefined();
      expect(cache.get('null')).toBeNull();
    });

    it('should handle complex key types', () => {
      const numberCache = new LRUCache<number, string>(3);

      numberCache.set(1, 'one');
      numberCache.set(2, 'two');
      numberCache.set(3, 'three');

      expect(numberCache.get(1)).toBe('one');
      expect(numberCache.get(2)).toBe('two');
      expect(numberCache.get(3)).toBe('three');
    });

    it('should handle object keys (with object references)', () => {
      const objCache = new LRUCache<{ id: number }, string>(3);

      const key1 = { id: 1 };
      const key2 = { id: 2 };

      objCache.set(key1, 'value1');
      objCache.set(key2, 'value2');

      expect(objCache.get(key1)).toBe('value1');
      expect(objCache.get(key2)).toBe('value2');
    });

    it('should treat different object references as different keys', () => {
      const objCache = new LRUCache<{ id: number }, string>(3);

      objCache.set({ id: 1 }, 'value1');
      objCache.set({ id: 1 }, 'value2');

      expect(objCache.size).toBe(2);
    });

    it('should handle very large maxSize', () => {
      const largeCache = new LRUCache<string, number>(10000);

      for (let i = 0; i < 1000; i++) {
        largeCache.set(`key${i}`, i);
      }

      expect(largeCache.size).toBe(1000);
    });

    it('should handle maxSize of 0 (edge case)', () => {
      const zeroCache = new LRUCache<string, number>(0);

      zeroCache.set('key1', 100);

      // 容量为 0 时，任何添加都应该立即被驱逐
      expect(zeroCache.size).toBe(0);
      expect(zeroCache.get('key1')).toBeUndefined();
    });
  });

  describe('access patterns', () => {
    it('should handle sequential access pattern', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);

      // 依次访问，维持相同顺序
      cache.get('key1');
      cache.get('key2');
      cache.get('key3');

      cache.set('key4', 400);

      // key1 应该被驱逐（最久未使用）
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    it('should handle reverse access pattern', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);

      // 反向访问，改变顺序
      cache.get('key3');
      cache.get('key2');
      cache.get('key1');

      cache.set('key4', 400);

      // key3 应该被驱逐
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(true);
      expect(cache.has('key3')).toBe(false);
      expect(cache.has('key4')).toBe(true);
    });

    it('should handle random access pattern', () => {
      const cache = new LRUCache<string, number>(5);

      cache.set('key1', 100);  // 顺序: [key1]
      cache.set('key2', 200);  // 顺序: [key1, key2]
      cache.set('key3', 300);  // 顺序: [key1, key2, key3]
      cache.set('key4', 400);  // 顺序: [key1, key2, key3, key4]
      cache.set('key5', 500);  // 顺序: [key1, key2, key3, key4, key5]

      // 随机访问 - 每次访问将项移到末尾
      cache.get('key3');       // 顺序: [key1, key2, key4, key5, key3]
      cache.get('key1');       // 顺序: [key2, key4, key5, key3, key1]
      cache.get('key4');       // 顺序: [key2, key5, key3, key1, key4]

      cache.set('key6', 600);  // 驱逐 key2，顺序: [key5, key3, key1, key4, key6]

      // key2 应该被驱逐（最久未使用）
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
      expect(cache.has('key5')).toBe(true);   // 修正：key5 仍然存在
      expect(cache.has('key6')).toBe(true);
    });
  });

  describe('performance', () => {
    it('should handle large number of operations efficiently', () => {
      const cache = new LRUCache<number, number>(1000);

      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        cache.set(i, i * 10);
        cache.get(i - 100); // 访问一些旧项
      }

      const end = performance.now();

      expect(end - start).toBeLessThan(1000); // 应该在 1 秒内完成
      expect(cache.size).toBe(1000);
    });

    it('should handle rapid eviction cycles', () => {
      const cache = new LRUCache<string, number>(10);

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        cache.set(`key${i}`, i);
      }

      const end = performance.now();

      expect(end - start).toBeLessThan(100);
      expect(cache.size).toBe(10);
    });
  });

  describe('concurrent scenarios', () => {
    it('should handle mixed read/write operations', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);

      // 混合读写
      cache.get('key1');
      cache.set('key4', 400);
      cache.get('key2');
      cache.set('key5', 500);
      cache.get('key3');
      cache.set('key6', 600);

      // 最终缓存中应该有 key4, key5, key6
      expect(cache.has('key1')).toBe(false);  // 被 key6 驱逐
      expect(cache.has('key2')).toBe(false);  // 被 key4 驱逐
      expect(cache.has('key3')).toBe(false);  // 被 key5 驱逐
      expect(cache.has('key4')).toBe(true);
      expect(cache.has('key5')).toBe(true);
      expect(cache.has('key6')).toBe(true);
      expect(cache.size).toBe(3);
    });

    it('should handle update after eviction', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);

      // 驱逐 key1
      cache.set('key4', 400);

      expect(cache.has('key1')).toBe(false);

      // 重新添加 key1
      cache.set('key1', 150);

      expect(cache.has('key1')).toBe(true);
      expect(cache.get('key1')).toBe(150);
    });
  });

  describe('type safety', () => {
    it('should handle different value types', () => {
      const stringCache = new LRUCache<string, string>(3);
      stringCache.set('key1', 'value1');
      expect(stringCache.get('key1')).toBe('value1');

      const objectCache = new LRUCache<string, { value: number }>(3);
      objectCache.set('key1', { value: 100 });
      expect(objectCache.get('key1')?.value).toBe(100);

      const arrayCache = new LRUCache<string, number[]>(3);
      arrayCache.set('key1', [1, 2, 3]);
      expect(arrayCache.get('key1')).toEqual([1, 2, 3]);
    });
  });

  describe('default maxSize', () => {
    it('should use default maxSize of 1000', () => {
      const defaultCache = new LRUCache<string, number>();

      // 添加超过默认大小的项
      for (let i = 0; i < 1100; i++) {
        defaultCache.set(`key${i}`, i);
      }

      // 应该限制在默认大小
      expect(defaultCache.size).toBe(1000);
    });
  });

  describe('special cases', () => {
    it('should handle same key with different values', () => {
      cache.set('key', 'value1');
      expect(cache.get('key')).toBe('value1');

      cache.set('key', 'value2');
      expect(cache.get('key')).toBe('value2');

      cache.set('key', 'value3');
      expect(cache.get('key')).toBe('value3');

      expect(cache.size).toBe(1);
    });

    it('should handle get of non-existent key without affecting LRU order', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);

      // 访问不存在的键
      cache.get('nonexistent');

      // 添加新项，应该驱逐 key1（LRU 顺序未改变）
      cache.set('key4', 400);

      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    it('should handle has without affecting LRU order', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);

      // 检查存在性
      cache.has('key1');

      // 添加新项，应该驱逐 key1（has 不改变 LRU 顺序）
      cache.set('key4', 400);

      expect(cache.has('key1')).toBe(false);
    });

    it('should handle delete without affecting LRU order of remaining items', () => {
      cache.set('key1', 100);  // 顺序: [key1]
      cache.set('key2', 200);  // 顺序: [key1, key2]
      cache.set('key3', 300);  // 顺序: [key1, key2, key3]

      // 删除 key2，不改变其他项的 LRU 顺序
      cache.delete('key2');    // 顺序: [key1, key3]

      // 添加新项，由于容量为 3 且当前只有 2 项，不会驱逐
      cache.set('key4', 400);  // 顺序: [key1, key3, key4]

      // key1 应该仍然存在（未被驱逐）
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });
  });
});
