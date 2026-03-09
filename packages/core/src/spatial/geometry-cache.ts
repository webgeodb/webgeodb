/**
 * 几何缓存系统
 *
 * 通过对象池、坐标缓存和边界框缓存优化空间计算性能
 * 减少 Feature 对象创建和坐标提取的开销
 */

import type { Geometry, Feature, BBox } from '../types';
import { getBBox } from '../utils';

/**
 * 缓存统计信息
 */
export interface CacheStats {
  /** Feature 对象池命中次数 */
  featurePoolHits: number;
  /** Feature 对象池未命中次数 */
  featurePoolMisses: number;
  /** 坐标缓存命中次数 */
  coordinateCacheHits: number;
  /** 坐标缓存未命中次数 */
  coordinateCacheMisses: number;
  /** 边界框缓存命中次数 */
  bboxCacheHits: number;
  /** 边界框缓存未命中次数 */
  bboxCacheMisses: number;
  /** 当前池中的对象数量 */
  poolSize: number;
}

/**
 * Feature 对象池项
 */
interface PooledFeature<G extends Geometry = Geometry, P = any> {
  feature: Feature<G, P>;
  inUse: boolean;
  lastUsed: number;
}

/**
 * 几何缓存系统
 */
export class GeometryCache {
  private featurePool: Map<string, PooledFeature[]> = new Map();
  private coordinateCache: WeakMap<Geometry, any[][]> = new WeakMap();
  private bboxCache: WeakMap<Geometry, BBox> = new WeakMap();
  private stats: CacheStats = {
    featurePoolHits: 0,
    featurePoolMisses: 0,
    coordinateCacheHits: 0,
    coordinateCacheMisses: 0,
    bboxCacheHits: 0,
    bboxCacheMisses: 0,
    poolSize: 0
  };
  private maxPoolSize: number = 100;
  private poolTTL: number = 60000; // 60 秒

  constructor(maxPoolSize: number = 100, poolTTL: number = 60000) {
    this.maxPoolSize = maxPoolSize;
    this.poolTTL = poolTTL;

    // 定期清理过期对象
    setInterval(() => this.cleanup(), 30000); // 每 30 秒清理一次
  }

  // ==================== Feature 对象池 ====================

  /**
   * 获取或创建 Feature 对象
   * @param geometry - 几何对象
   * @param properties - 属性对象
   * @param featureFactory - Feature 创建函数
   */
  acquireFeature<G extends Geometry = Geometry, P = any>(
    geometry: G,
    properties: P,
    featureFactory: (g: G, p: P) => Feature<G, P>
  ): Feature<G, P> {
    const geometryType = geometry.type;
    const pool = this.featurePool.get(geometryType);

    if (pool && pool.length > 0) {
      // 从池中获取对象
      const pooled = pool.pop() as PooledFeature<G, P>;
      pooled.inUse = true;
      pooled.lastUsed = Date.now();

      // 更新几何和属性
      pooled.feature.geometry = geometry;
      (pooled.feature as any).properties = properties;

      this.stats.featurePoolHits++;
      this.stats.poolSize--;

      return pooled.feature;
    }

    // 池中没有可用对象，创建新对象
    this.stats.featurePoolMisses++;
    return featureFactory(geometry, properties);
  }

  /**
   * 释放 Feature 对象回池中
   * @param feature - Feature 对象
   */
  releaseFeature<G extends Geometry = Geometry, P = any>(feature: Feature<G, P>): void {
    const geometryType = feature.geometry.type;
    let pool = this.featurePool.get(geometryType);

    if (!pool) {
      pool = [];
      this.featurePool.set(geometryType, pool);
    }

    // 检查池大小限制
    if (pool.length >= this.maxPoolSize) {
      // 池已满，直接丢弃
      return;
    }

    const pooled: PooledFeature<G, P> = {
      feature,
      inUse: false,
      lastUsed: Date.now()
    };

    pool.push(pooled);
    this.stats.poolSize++;
  }

  // ==================== 坐标缓存 ====================

  /**
   * 获取几何对象的坐标
   * @param geometry - 几何对象
   * @param extractor - 坐标提取函数
   */
  getCoordinates<G extends Geometry = Geometry>(
    geometry: G,
    extractor: (g: G) => any[][]
  ): any[][] {
    const cached = this.coordinateCache.get(geometry);
    if (cached) {
      this.stats.coordinateCacheHits++;
      return cached;
    }

    this.stats.coordinateCacheMisses++;
    const coordinates = extractor(geometry);
    this.coordinateCache.set(geometry, coordinates);
    return coordinates;
  }

  /**
   * 清除坐标缓存
   * @param geometry - 可选，指定要清除的几何对象
   */
  clearCoordinateCache(geometry?: Geometry): void {
    if (geometry) {
      this.coordinateCache.delete(geometry);
    } else {
      // WeakMap 无法清空所有，只能等待 GC
      this.coordinateCache = new WeakMap();
    }
  }

  // ==================== 边界框缓存 ====================

  /**
   * 获取几何对象的边界框
   * @param geometry - 几何对象
   */
  getBBox(geometry: Geometry): BBox {
    const cached = this.bboxCache.get(geometry);
    if (cached) {
      this.stats.bboxCacheHits++;
      return cached;
    }

    this.stats.bboxCacheMisses++;
    const bbox = getBBox(geometry);
    this.bboxCache.set(geometry, bbox);
    return bbox;
  }

  /**
   * 清除边界框缓存
   * @param geometry - 可选，指定要清除的几何对象
   */
  clearBBoxCache(geometry?: Geometry): void {
    if (geometry) {
      this.bboxCache.delete(geometry);
    } else {
      // WeakMap 无法清空所有，只能等待 GC
      this.bboxCache = new WeakMap();
    }
  }

  // ==================== 缓存管理 ====================

  /**
   * 清理过期的池对象
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [geometryType, pool] of this.featurePool.entries()) {
      // 过滤掉过期对象
      const validItems = pool.filter(item => {
        if (now - item.lastUsed > this.poolTTL) {
          cleanedCount++;
          this.stats.poolSize--;
          return false;
        }
        return true;
      });

      if (validItems.length === 0) {
        this.featurePool.delete(geometryType);
      } else {
        this.featurePool.set(geometryType, validItems);
      }
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    // 清空对象池
    this.featurePool.clear();
    this.stats.poolSize = 0;

    // 清空 WeakMap 缓存
    this.coordinateCache = new WeakMap();
    this.bboxCache = new WeakMap();
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 重置缓存统计信息
   */
  resetStats(): void {
    this.stats = {
      featurePoolHits: 0,
      featurePoolMisses: 0,
      coordinateCacheHits: 0,
      coordinateCacheMisses: 0,
      bboxCacheHits: 0,
      bboxCacheMisses: 0,
      poolSize: this.stats.poolSize
    };
  }

  /**
   * 打印缓存统计信息（用于调试）
   */
  logStats(): void {
    const stats = this.getStats();
    const totalHits = stats.featurePoolHits + stats.coordinateCacheHits + stats.bboxCacheHits;
    const totalMisses = stats.featurePoolMisses + stats.coordinateCacheMisses + stats.bboxCacheMisses;
    const hitRate = totalHits + totalMisses > 0
      ? (totalHits / (totalHits + totalMisses) * 100).toFixed(2)
      : '0.00';

    console.group('🚀 Geometry Cache Stats');
    console.log(`Feature Pool:`, {
      hits: stats.featurePoolHits,
      misses: stats.featurePoolMisses,
      poolSize: stats.poolSize
    });
    console.log(`Coordinate Cache:`, {
      hits: stats.coordinateCacheHits,
      misses: stats.coordinateCacheMisses
    });
    console.log(`BBox Cache:`, {
      hits: stats.bboxCacheHits,
      misses: stats.bboxCacheMisses
    });
    console.log(`Overall Hit Rate: ${hitRate}%`);
    console.groupEnd();
  }
}

/**
 * 全局几何缓存实例
 */
export const globalGeometryCache = new GeometryCache();

/**
 * 缓存装饰器工厂
 * 用于缓存方法的返回值
 */
export function cachedResult<G extends Geometry, R>(
  cache: WeakMap<G, R>,
  keyExtractor: (...args: any[]) => G
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (this: any, ...args: any[]): R {
      const key = keyExtractor(...args);
      const cached = cache.get(key);

      if (cached !== undefined) {
        return cached;
      }

      const result = originalMethod.apply(this, args);
      cache.set(key, result);
      return result;
    };

    return descriptor;
  };
}
