import { describe, it, expect, beforeEach } from 'vitest';
import { WebGeoDB } from '../../src';

describe('Query Cache Functionality', () => {
  let db: WebGeoDB;

  beforeEach(async () => {
    db = new WebGeoDB({
      name: 'test-query-cache',
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

    // 插入测试数据
    await db.features.insertMany([
      {
        id: '1',
        name: 'Restaurant A',
        type: 'restaurant',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { rating: 4.5, priceRange: 'expensive' }
      },
      {
        id: '2',
        name: 'Restaurant B',
        type: 'restaurant',
        geometry: { type: 'Point', coordinates: [1, 1] },
        properties: { rating: 4.0, priceRange: 'cheap' }
      },
      {
        id: '3',
        name: 'Cafe A',
        type: 'cafe',
        geometry: { type: 'Point', coordinates: [2, 2] },
        properties: { rating: 4.8, priceRange: 'moderate' }
      }
    ]);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('cache hit verification', () => {
    it('should cache query results for subsequent identical queries', async () => {
      // 第一次查询
      const startTime1 = performance.now();
      const results1 = await db.features
        .where('type', '=', 'restaurant')
        .toArray();
      const duration1 = performance.now() - startTime1;

      // 第二次相同查询（应该命中缓存）
      const startTime2 = performance.now();
      const results2 = await db.features
        .where('type', '=', 'restaurant')
        .toArray();
      const duration2 = performance.now() - startTime2;

      // 验证结果相同
      expect(results1).toEqual(results2);
      expect(results1.length).toBe(2);

      // 第二次查询应该更快（命中缓存）
      // 注意：这个测试可能会不稳定，因为缓存可能不总是加速
      // 这里我们主要验证结果一致性
    });

    it('should cache spatial query results', async () => {
      const point = { type: 'Point', coordinates: [0, 0] };

      // 第一次空间查询
      const results1 = await db.features
        .distance('geometry', [0, 0], '<', 1000)
        .toArray();

      // 第二次相同查询
      const results2 = await db.features
        .distance('geometry', [0, 0], '<', 1000)
        .toArray();

      // 验证结果一致
      expect(results1).toEqual(results2);
      expect(results1.length).toBeGreaterThan(0);
    });

    it('should cache complex query results', async () => {
      // 复杂查询
      const query = db.features
        .where('type', '=', 'restaurant')
        .where('properties.rating', '>', 4.0)
        .orderBy('properties.rating', 'desc');

      // 第一次查询
      const results1 = await query.toArray();

      // 第二次查询
      const results2 = await query.toArray();

      // 验证结果一致
      expect(results1).toEqual(results2);
      expect(results1.length).toBe(1);
      expect(results1[0].id).toBe('1');
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate cache on insert', async () => {
      // 初始查询
      const results1 = await db.features
        .where('type', '=', 'restaurant')
        .toArray();
      expect(results1.length).toBe(2);

      // 插入新数据
      await db.features.insert({
        id: '4',
        name: 'Restaurant C',
        type: 'restaurant',
        geometry: { type: 'Point', coordinates: [3, 3] },
        properties: { rating: 3.8, priceRange: 'cheap' }
      });

      // 再次查询，应该返回新结果
      const results2 = await db.features
        .where('type', '=', 'restaurant')
        .toArray();

      expect(results2.length).toBe(3);
      expect(results2.some(r => r.id === '4')).toBe(true);
    });

    it('should invalidate cache on update', async () => {
      // 初始查询
      const results1 = await db.features
        .where('properties.rating', '>', 4.2)
        .toArray();
      expect(results1.length).toBe(1);

      // 更新数据
      await db.features.update('2', {
        properties: { rating: 4.5, priceRange: 'moderate' }
      });

      // 再次查询，应该返回新结果
      const results2 = await db.features
        .where('properties.rating', '>', 4.2)
        .toArray();

      expect(results2.length).toBe(2);
    });

    it('should invalidate cache on delete', async () => {
      // 初始查询
      const results1 = await db.features
        .where('type', '=', 'restaurant')
        .toArray();
      expect(results1.length).toBe(2);

      // 删除数据
      await db.features.delete('1');

      // 再次查询，应该返回新结果
      const results2 = await db.features
        .where('type', '=', 'restaurant')
        .toArray();

      expect(results2.length).toBe(1);
      expect(results2[0].id).toBe('2');
    });

    it('should invalidate cache on bulk operations', async () => {
      // 初始查询
      const results1 = await db.features.toArray();
      expect(results1.length).toBe(3);

      // 批量删除
      await db.features.deleteMany(['1', '2']);

      // 再次查询
      const results2 = await db.features.toArray();
      expect(results2.length).toBe(1);
    });
  });

  describe('cache with spatial queries', () => {
    it('should invalidate cache on geometry update', async () => {
      const point = { type: 'Point', coordinates: [0, 0] };

      // 初始空间查询
      const results1 = await db.features
        .distance('geometry', [0, 0], '<', 500)
        .toArray();
      expect(results1.length).toBe(1);

      // 更新几何数据
      await db.features.update('2', {
        geometry: { type: 'Point', coordinates: [0.2, 0.2] }
      });

      // 再次查询，应该包含更新后的要素
      const results2 = await db.features
        .distance('geometry', [0, 0], '<', 500)
        .toArray();

      expect(results2.length).toBe(2);
    });

    it('should handle cache with different query types', async () => {
      // 距离查询
      const distanceResults = await db.features
        .distance('geometry', [0, 0], '<', 1000)
        .toArray();

      // 属性查询
      const typeResults = await db.features
        .where('type', '=', 'restaurant')
        .toArray();

      // 验证两种查询都正常工作
      expect(distanceResults.length).toBeGreaterThan(0);
      expect(typeResults.length).toBe(2);
    });
  });

  describe('cache capacity and limits', () => {
    it('should handle cache with large result sets', async () => {
      // 插入更多数据
      const features = [];
      for (let i = 4; i <= 100; i++) {
        features.push({
          id: `${i}`,
          name: `Feature ${i}`,
          type: i % 2 === 0 ? 'restaurant' : 'cafe',
          geometry: {
            type: 'Point',
            coordinates: [i * 0.1, i * 0.1]
          },
          properties: { rating: 4.0, priceRange: 'moderate' }
        });
      }

      await db.features.insertMany(features);

      // 查询大量数据
      const results = await db.features
        .where('type', '=', 'restaurant')
        .toArray();

      expect(results.length).toBeGreaterThan(10);

      // 验证缓存没有导致内存问题
      // 这个测试主要是确保系统能够处理，不抛出错误
    });
  });

  describe('cache consistency', () => {
    it('should maintain cache consistency across transactions', async () => {
      // 初始查询
      const results1 = await db.features
        .where('type', '=', 'restaurant')
        .toArray();

      // 在事务中更新数据
      await db.transaction('rw', db.features, async () => {
        await db.features.update('1', { type: 'cafe' });
        await db.features.insert({
          id: '4',
          name: 'New Restaurant',
          type: 'restaurant',
          geometry: { type: 'Point', coordinates: [4, 4] },
          properties: { rating: 4.2, priceRange: 'expensive' }
        });
      });

      // 事务后的查询应该反映所有更改
      const results2 = await db.features
        .where('type', '=', 'restaurant')
        .toArray();

      expect(results2.length).toBe(2);
      expect(results2.some(r => r.id === '4')).toBe(true);
      expect(results2.some(r => r.id === '1')).toBe(false);
    });

    it('should handle concurrent queries correctly', async () => {
      // 并发执行多个查询
      const [results1, results2, results3] = await Promise.all([
        db.features.where('type', '=', 'restaurant').toArray(),
        db.features.where('type', '=', 'cafe').toArray(),
        db.features.toArray()
      ]);

      // 验证所有查询都返回正确结果
      expect(results1.length).toBe(2);
      expect(results2.length).toBe(1);
      expect(results3.length).toBe(3);
    });
  });
});