/**
 * 优化距离计算
 *
 * 提供多种距离计算策略，根据精度要求选择最优算法
 * - 欧氏距离：适用于小范围平面坐标
 * - 球面距离：适用于大范围地理坐标
 * - 快速过滤：基于边界框的快速距离估算
 */

import type { Geometry, Point, BBox } from '../../types';
import { getBBox } from '../../utils';
import type { SpatialEngine, DistanceUnit } from '../spatial-engine';

/**
 * 距离计算策略
 */
export type DistanceStrategy = 'euclidean' | 'haversine' | 'fast-estimate';

/**
 * 距离计算结果（包含性能信息）
 */
export interface DistanceResult {
  /** 距离值 */
  distance: number;
  /** 使用的策略 */
  strategy: DistanceStrategy;
  /** 单位 */
  unit: DistanceUnit;
  /** 执行时间（微秒） */
  executionTime: number;
}

/**
 * 地球半径（米）
 */
const EARTH_RADIUS = 6371000;

/**
 * 优化距离计算类
 */
export class OptimizedDistance {
  private engine: SpatialEngine;
  private defaultStrategy: DistanceStrategy;
  private defaultUnit: DistanceUnit;

  constructor(
    engine: SpatialEngine,
    strategy: DistanceStrategy = 'haversine',
    unit: DistanceUnit = 'meters'
  ) {
    this.engine = engine;
    this.defaultStrategy = strategy;
    this.defaultUnit = unit;
  }

  /**
   * 计算两个几何对象之间的距离
   * @param g1 - 第一个几何对象
   * @param g2 - 第二个几何对象
   * @param strategy - 距离计算策略（可选）
   * @param unit - 距离单位（可选）
   */
  distance(
    g1: Geometry,
    g2: Geometry,
    strategy?: DistanceStrategy,
    unit?: DistanceUnit
  ): DistanceResult {
    const startTime = performance.now();
    const effectiveStrategy = strategy || this.defaultStrategy;
    const effectiveUnit = unit || this.defaultUnit;

    let distance: number;

    switch (effectiveStrategy) {
      case 'euclidean':
        distance = this.euclideanDistance(g1, g2);
        break;
      case 'haversine':
        distance = this.haversineDistance(g1, g2);
        break;
      case 'fast-estimate':
        distance = this.fastEstimate(g1, g2);
        break;
      default:
        distance = this.haversineDistance(g1, g2);
    }

    // 转换单位
    const finalDistance = this.convertUnit(distance, effectiveUnit);

    return {
      distance: finalDistance,
      strategy: effectiveStrategy,
      unit: effectiveUnit,
      executionTime: (performance.now() - startTime) * 1000
    };
  }

  /**
   * 批量距离计算
   * @param origin - 原点几何对象
   * @param targets - 目标几何对象数组
   * @param strategy - 距离计算策略（可选）
   */
  batchDistance(
    origin: Geometry,
    targets: Geometry[],
    strategy?: DistanceStrategy
  ): DistanceResult[] {
    return targets.map(target => this.distance(origin, target, strategy));
  }

  /**
   * 距离过滤
   * 返回距离小于指定阈值的目标
   * @param origin - 原点几何对象
   * @param targets - 目标几何对象数组
   * @param maxDistance - 最大距离（米）
   * @param strategy - 距离计算策略（可选）
   */
  distanceFilter(
    origin: Geometry,
    targets: Geometry[],
    maxDistance: number,
    strategy?: DistanceStrategy
  ): { target: Geometry; distance: DistanceResult }[] {
    const results = this.batchDistance(origin, targets, strategy);

    return results
      .map((result, index) => ({
        target: targets[index],
        distance: result
      }))
      .filter(item => item.distance.distance <= maxDistance)
      .sort((a, b) => a.distance.distance - b.distance.distance);
  }

  // ==================== 私有方法 ====================

  /**
   * 欧氏距离（平面距离）
   * 适用于小范围区域或投影坐标系
   */
  private euclideanDistance(g1: Geometry, g2: Geometry): number {
    const c1 = this.extractPoint(g1);
    const c2 = this.extractPoint(g2);

    const dx = c2[0] - c1[0];
    const dy = c2[1] - c1[1];
    const dz = (c2[2] || 0) - (c1[2] || 0);

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Haversine 距离（球面距离）
   * 适用于大范围地理坐标
   */
  private haversineDistance(g1: Geometry, g2: Geometry): number {
    const c1 = this.extractPoint(g1);
    const c2 = this.extractPoint(g2);

    const lat1 = this.toRadians(c1[1]);
    const lat2 = this.toRadians(c2[1]);
    const deltaLat = this.toRadians(c2[1] - c1[1]);
    const deltaLon = this.toRadians(c2[0] - c1[0]);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS * c;
  }

  /**
   * 快速距离估算
   * 基于边界框的快速距离估算
   */
  private fastEstimate(g1: Geometry, g2: Geometry): number {
    const bbox1 = getBBox(g1);
    const bbox2 = getBBox(g2);

    // 计算边界框中心点之间的距离
    const cx1 = (bbox1.minX + bbox1.maxX) / 2;
    const cy1 = (bbox1.minY + bbox1.maxY) / 2;
    const cx2 = (bbox2.minX + bbox2.maxX) / 2;
    const cy2 = (bbox2.minY + bbox2.maxY) / 2;

    return this.haversineDistance(
      { type: 'Point', coordinates: [cx1, cy1] },
      { type: 'Point', coordinates: [cx2, cy2] }
    );
  }

  /**
   * 提取几何对象的坐标点
   * 对于复杂几何，返回质心
   */
  private extractPoint(geometry: Geometry): [number, number, number?] {
    if (geometry.type === 'Point') {
      return geometry.coordinates;
    }

    // 对于其他几何类型，使用引擎计算质心
    const centroid = this.engine.centroid(geometry);
    return (centroid as Point).coordinates;
  }

  /**
   * 角度转弧度
   */
  private toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  /**
   * 单位转换
   */
  private convertUnit(meters: number, unit: DistanceUnit): number {
    switch (unit) {
      case 'meters':
        return meters;
      case 'kilometers':
        return meters / 1000;
      case 'miles':
        return meters * 0.000621371;
      case 'nauticalmiles':
        return meters * 0.000539957;
      default:
        return meters;
    }
  }
}

/**
 * 快速距离计算函数
 * @param g1 - 第一个几何对象
 * @param g2 - 第二个几何对象
 * @param engine - 空间引擎
 * @param strategy - 距离计算策略（可选）
 */
export function fastDistance(
  g1: Geometry,
  g2: Geometry,
  engine: SpatialEngine,
  strategy?: DistanceStrategy
): number {
  const calculator = new OptimizedDistance(engine, strategy);
  const result = calculator.distance(g1, g2);
  return result.distance;
}

/**
 * 批量距离计算函数
 * @param origin - 原点几何对象
 * @param targets - 目标几何对象数组
 * @param engine - 空间引擎
 * @param strategy - 距离计算策略（可选）
 */
export function batchFastDistance(
  origin: Geometry,
  targets: Geometry[],
  engine: SpatialEngine,
  strategy?: DistanceStrategy
): number[] {
  const calculator = new OptimizedDistance(engine, strategy);
  const results = calculator.batchDistance(origin, targets, strategy);
  return results.map(r => r.distance);
}

/**
 * 最近邻搜索
 * @param origin - 原点几何对象
 * @param targets - 目标几何对象数组
 * @param engine - 空间引擎
 * @param count - 返回的最近邻数量
 */
export function nearestNeighbors(
  origin: Geometry,
  targets: Geometry[],
  engine: SpatialEngine,
  count: number = 1
): { target: Geometry; distance: number }[] {
  const calculator = new OptimizedDistance(engine);
  const results = calculator.batchDistance(origin, targets);

  return results
    .map((result, index) => ({
      target: targets[index],
      distance: result.distance
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}
