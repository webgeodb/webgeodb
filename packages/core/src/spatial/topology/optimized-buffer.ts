/**
 * 优化缓冲策略
 *
 * 实现分级缓冲策略，根据使用场景选择最优的缓冲算法
 * - 近似缓冲：基于边界框扩展，纳秒级性能
 * - 精确缓冲：基于引擎实现，毫秒级性能
 * - 自适应选择：根据几何类型和精度要求自动选择
 */

import type { Geometry, Point, BBox } from '../../types';
import { getBBox, bboxExpand } from '../../utils';
import type { SpatialEngine } from '../spatial-engine';

/**
 * 缓冲精度级别
 */
export type BufferPrecision = 'approximate' | 'balanced' | 'exact';

/**
 * 缓冲策略配置
 */
export interface BufferStrategyConfig {
  /** 精度级别 */
  precision: BufferPrecision;
  /** 是否针对 Point 使用圆形逼近 */
  useCircularApproximation: boolean;
  /** 近似缓冲的距离阈值（米） */
  approximateThreshold: number;
  /** 圆形逼近的分段数 */
  circleSegments: number;
}

/**
 * 缓冲结果（包含性能信息）
 */
export interface BufferedGeometry {
  /** 缓冲后的几何对象 */
  geometry: Geometry;
  /** 使用的策略 */
  strategy: 'bbox-approximate' | 'circular-approximation' | 'exact-engine';
  /** 执行时间（微秒） */
  executionTime: number;
  /** 精度级别 */
  precision: BufferPrecision;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: BufferStrategyConfig = {
  precision: 'balanced',
  useCircularApproximation: true,
  approximateThreshold: 100, // 100米以内使用近似
  circleSegments: 32 // 圆形逼近的分段数
};

/**
 * 优化缓冲类
 */
export class OptimizedBuffer {
  private engine: SpatialEngine;
  private config: BufferStrategyConfig;

  constructor(engine: SpatialEngine, config: Partial<BufferStrategyConfig> = {}) {
    this.engine = engine;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 计算缓冲区
   * @param geometry - 输入几何对象
   * @param distance - 缓冲距离（米）
   * @param precision - 精度级别（可选，覆盖配置）
   */
  buffer(geometry: Geometry, distance: number, precision?: BufferPrecision): BufferedGeometry {
    const startTime = performance.now();
    const effectivePrecision = precision || this.config.precision;

    // 策略 1: 近似缓冲（边界框扩展）
    if (effectivePrecision === 'approximate' ||
        (effectivePrecision === 'balanced' && distance <= this.config.approximateThreshold)) {
      return this.bboxApproximate(geometry, distance, startTime, effectivePrecision);
    }

    // 策略 2: Point 使用圆形逼近
    if (this.config.useCircularApproximation && geometry.type === 'Point') {
      return this.circularApproximation(geometry as Point, distance, startTime, effectivePrecision);
    }

    // 策略 3: 精确缓冲（使用引擎）
    return this.exactBuffer(geometry, distance, startTime, effectivePrecision);
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<BufferStrategyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): BufferStrategyConfig {
    return { ...this.config };
  }

  // ==================== 私有方法 ====================

  /**
   * 边界框近似缓冲
   * 最快但精度最低，适用于快速过滤
   */
  private bboxApproximate(
    geometry: Geometry,
    distance: number,
    startTime: number,
    precision: BufferPrecision
  ): BufferedGeometry {
    const bbox = getBBox(geometry);
    const expandedBBox = bboxExpand(bbox, distance);

    // 将边界框转换为多边形
    const polygon = this.bboxToPolygon(expandedBBox);

    return {
      geometry: polygon,
      strategy: 'bbox-approximate',
      executionTime: (performance.now() - startTime) * 1000,
      precision
    };
  }

  /**
   * 圆形逼近缓冲
   * 针对 Point 优化，使用正多边形逼近圆形
   */
  private circularApproximation(
    point: Point,
    distance: number,
    startTime: number,
    precision: BufferPrecision
  ): BufferedGeometry {
    const [cx, cy] = point.coordinates;
    const segments = this.config.circleSegments;
    const coordinates: [number, number][] = [];

    // 生成圆周上的点
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = cx + distance * Math.cos(angle);
      const y = cy + distance * Math.sin(angle);
      coordinates.push([x, y]);
    }

    const polygon: Geometry = {
      type: 'Polygon',
      coordinates: [coordinates]
    };

    return {
      geometry: polygon,
      strategy: 'circular-approximation',
      executionTime: (performance.now() - startTime) * 1000,
      precision
    };
  }

  /**
   * 精确缓冲
   * 使用空间引擎实现
   */
  private exactBuffer(
    geometry: Geometry,
    distance: number,
    startTime: number,
    precision: BufferPrecision
  ): BufferedGeometry {
    const buffered = this.engine.buffer(geometry, distance, 'meters');

    return {
      geometry: buffered,
      strategy: 'exact-engine',
      executionTime: (performance.now() - startTime) * 1000,
      precision
    };
  }

  /**
   * 将边界框转换为多边形
   */
  private bboxToPolygon(bbox: BBox): Geometry {
    const { minX, minY, maxX, maxY } = bbox;

    return {
      type: 'Polygon',
      coordinates: [[
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
        [minX, minY]
      ]]
    };
  }
}

/**
 * 快速缓冲函数（使用默认配置）
 * @param geometry - 输入几何对象
 * @param distance - 缓冲距离（米）
 * @param engine - 空间引擎
 * @param precision - 精度级别（可选）
 */
export function optimizedBuffer(
  geometry: Geometry,
  distance: number,
  engine: SpatialEngine,
  precision?: BufferPrecision
): Geometry {
  const buffer = new OptimizedBuffer(engine);
  const result = buffer.buffer(geometry, distance, precision);
  return result.geometry;
}

/**
 * 批量缓冲函数
 * 优化处理大量几何对象的缓冲操作
 * @param geometries - 几何对象数组
 * @param distance - 缓冲距离（米）
 * @param engine - 空间引擎
 * @param precision - 精度级别（可选）
 */
export function batchBuffer(
  geometries: Geometry[],
  distance: number,
  engine: SpatialEngine,
  precision?: BufferPrecision
): BufferedGeometry[] {
  const buffer = new OptimizedBuffer(engine);

  return geometries.map(geometry => buffer.buffer(geometry, distance, precision));
}

/**
 * 自适应缓冲
 * 根据几何类型和距离自动选择最优策略
 * @param geometry - 输入几何对象
 * @param distance - 缓冲距离（米）
 * @param engine - 空间引擎
 */
export function adaptiveBuffer(
  geometry: Geometry,
  distance: number,
  engine: SpatialEngine
): BufferedGeometry {
  // Point 且距离较小 -> 圆形逼近
  if (geometry.type === 'Point' && distance < 500) {
    const buffer = new OptimizedBuffer(engine, {
      precision: 'balanced',
      useCircularApproximation: true
    });
    return buffer.buffer(geometry, distance);
  }

  // 距离很小 -> 边界框近似
  if (distance < 50) {
    const buffer = new OptimizedBuffer(engine, {
      precision: 'approximate'
    });
    return buffer.buffer(geometry, distance);
  }

  // 其他情况 -> 精确缓冲
  const buffer = new OptimizedBuffer(engine, {
    precision: 'exact'
  });
  return buffer.buffer(geometry, distance);
}

/**
 * 缓冲策略建议
 * 根据使用场景推荐最佳策略
 * @param useCase - 使用场景
 */
export function recommendBufferStrategy(useCase: 'fast-filter' | 'balanced' | 'high-precision'): BufferStrategyConfig {
  switch (useCase) {
    case 'fast-filter':
      return {
        precision: 'approximate',
        useCircularApproximation: false,
        approximateThreshold: 1000,
        circleSegments: 16
      };

    case 'balanced':
      return {
        precision: 'balanced',
        useCircularApproximation: true,
        approximateThreshold: 100,
        circleSegments: 32
      };

    case 'high-precision':
      return {
        precision: 'exact',
        useCircularApproximation: false,
        approximateThreshold: 0,
        circleSegments: 64
      };

    default:
      return DEFAULT_CONFIG;
  }
}
