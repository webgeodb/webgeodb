/**
 * 几何缓存系统测试
 *
 * 验证几何缓存系统的正确性和性能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GeometryCache, globalGeometryCache } from '../../src/spatial/geometry-cache';
import type { Geometry, Point, Polygon } from '../../src/types';

describe('几何缓存系统测试', () => {
  let cache: GeometryCache;

  beforeEach(() => {
    cache = new GeometryCache(10, 1000); // 小池大小用于测试
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Feature 对象池', () => {
    it('应该能够创建和获取 Feature', () => {
      const point: Point = { type: 'Point', coordinates: [0, 0] };
      const factory = (g: typeof point, p: any) => ({
        type: 'Feature',
        geometry: g,
        properties: p
      });

      const feature1 = cache.acquireFeature(point, {}, factory);
      const feature2 = cache.acquireFeature(point, {}, factory);

      expect(feature1.type).toBe('Feature');
      expect(feature2.type).toBe('Feature');
    });

    it('应该能够释放 Feature 回池中', () => {
      const point: Point = { type: 'Point', coordinates: [0, 0] };
      const factory = (g: typeof point, p: any) => ({
        type: 'Feature',
        geometry: g,
        properties: p
      });

      const feature1 = cache.acquireFeature(point, {}, factory);
      cache.releaseFeature(feature1);

      const stats = cache.getStats();
      expect(stats.poolSize).toBe(1);
    });

    it('应该在池满时拒绝新对象', () => {
      const point: Point = { type: 'Point', coordinates: [0, 0] };
      const factory = (g: typeof point, p: any) => ({
        type: 'Feature',
        geometry: g,
        properties: p
      });

      // 填满池
      const features = [];
      for (let i = 0; i < 20; i++) {
        const feature = cache.acquireFeature(point, {}, factory);
        features.push(feature);
      }

      // 释放所有对象
      features.forEach(f => cache.releaseFeature(f));

      const stats = cache.getStats();
      // 池大小应该不超过最大值
      expect(stats.poolSize).toBeLessThanOrEqual(10);
    });
  });

  describe('坐标缓存', () => {
    it('应该能够缓存和获取坐标', () => {
      const point: Point = { type: 'Point', coordinates: [0, 0] };
      const extractor = (g: typeof point) => [g.coordinates];

      const coords1 = cache.getCoordinates(point, extractor);
      const coords2 = cache.getCoordinates(point, extractor);

      expect(coords1).toEqual(coords2);

      const stats = cache.getStats();
      expect(stats.coordinateCacheHits).toBe(1);
    });

    it('应该能够清除特定几何的坐标缓存', () => {
      const point: Point = { type: 'Point', coordinates: [0, 0] };
      const extractor = (g: typeof point) => [g.coordinates];

      cache.getCoordinates(point, extractor);
      cache.clearCoordinateCache(point);

      const stats = cache.getStats();
      // WeakMap 无法准确统计，这里只测试不会抛出错误
      expect(stats.coordinateCacheMisses).toBe(1);
    });
  });

  describe('边界框缓存', () => {
    it('应该能够缓存和获取边界框', () => {
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
      };

      const bbox1 = cache.getBBox(polygon);
      const bbox2 = cache.getBBox(polygon);

      expect(bbox1).toEqual(bbox2);
      expect(bbox1.minX).toBe(0);
      expect(bbox1.minY).toBe(0);
      expect(bbox1.maxX).toBe(1);
      expect(bbox1.maxY).toBe(1);

      const stats = cache.getStats();
      expect(stats.bboxCacheHits).toBe(1);
    });

    it('应该能够清除特定几何的边界框缓存', () => {
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
      };

      cache.getBBox(polygon);
      cache.clearBBoxCache(polygon);

      const stats = cache.getStats();
      expect(stats.bboxCacheMisses).toBe(1);
    });
  });

  describe('缓存统计', () => {
    it('应该正确统计缓存命中和未命中', () => {
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
      };

      // 第一次调用（未命中）
      cache.getBBox(polygon);

      // 第二次调用（命中）
      cache.getBBox(polygon);

      const stats = cache.getStats();
      expect(stats.bboxCacheMisses).toBe(1);
      expect(stats.bboxCacheHits).toBe(1);
    });

    it('应该能够重置统计信息', () => {
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
      };

      cache.getBBox(polygon);
      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.bboxCacheMisses).toBe(0);
      expect(stats.bboxCacheHits).toBe(0);
    });
  });

  describe('缓存清理', () => {
    it('应该能够清空所有缓存', () => {
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
      };

      cache.getBBox(polygon);
      cache.clear();

      const stats = cache.getStats();
      expect(stats.poolSize).toBe(0);
    });
  });

  describe('日志记录', () => {
    it('应该能够记录日志而不抛出错误', () => {
      expect(() => cache.logStats()).not.toThrow();
    });
  });
});

describe('全局几何缓存测试', () => {
  it('应该有一个全局缓存实例', () => {
    expect(globalGeometryCache).toBeDefined();
    expect(globalGeometryCache instanceof GeometryCache).toBe(true);
  });

  it('应该能够使用全局缓存', () => {
    const polygon: Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
    };

    const bbox = globalGeometryCache.getBBox(polygon);
    expect(bbox).toBeDefined();
  });
});
