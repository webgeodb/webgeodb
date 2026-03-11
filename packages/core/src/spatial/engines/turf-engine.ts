/**
 * Turf.js 空间引擎实现
 *
 * 包装 Turf.js 库，实现 SpatialEngine 接口
 * 这是默认的空间计算引擎
 */

import * as turf from '@turf/turf';
import type {
  Geometry,
  Feature,
  BBox,
  Point,
  LineString,
  Polygon,
  MultiPoint,
  MultiLineString,
  MultiPolygon,
  GeometryCollection
} from '../../types';
import type {
  SpatialEngine,
  EngineCapabilities,
  EngineConfig,
  DistanceUnit
} from '../spatial-engine';
import type { SpatialPredicate } from '../../types/database';
import type { GeometryType } from '../../types/geometry';
import { isEmptyGeometry } from '../../utils/bbox';

/**
 * Turf.js 引擎能力
 */
const TURF_CAPABILITIES: EngineCapabilities = {
  supportedPredicates: [
    'intersects',
    'contains',
    'within',
    'equals',
    'disjoint',
    'crosses',
    // touches 和 overlaps 需要通过 DE-9IM 实现，Turf.js 没有直接支持
    // 我们会在下面的实现中提供基于 DE-9IM 的版本
    'touches',
    'overlaps'
  ],
  supportedGeometryTypes: [
    'Point',
    'LineString',
    'Polygon',
    'MultiPoint',
    'MultiLineString',
    'MultiPolygon',
    'GeometryCollection'
  ],
  supportsTopology: true,
  supportsDistance: true,
  precision: 'exact'
};

/**
 * Turf.js 空间引擎
 */
export class TurfEngine implements SpatialEngine {
  readonly name: string;
  readonly capabilities: EngineCapabilities;
  private defaultUnits: DistanceUnit;

  constructor(config: EngineConfig = { name: 'turf' }) {
    this.name = config.name;
    this.capabilities = TURF_CAPABILITIES;
    this.defaultUnits = config.defaultUnits || 'kilometers';
  }

  /**
   * 初始化（Turf.js 不需要异步初始化）
   */
  async initialize(): Promise<void> {
    // Turf.js 是同步的，不需要初始化
  }

  // ==================== 核心空间谓词 ====================

  intersects(g1: Geometry, g2: Geometry): boolean {
    const f1 = this.toFeature(g1);
    const f2 = this.toFeature(g2);
    return !turf.booleanDisjoint(f1, f2);
  }

  contains(g1: Geometry, g2: Geometry): boolean {
    // 对于 Point，不能用 contains（点不能包含其他几何）
    if (g1.type === 'Point') {
      return false;
    }

    // 检查是否为空几何体
    if (isEmptyGeometry(g1) || isEmptyGeometry(g2)) {
      return false;
    }

    // 检查是否为自包含（相同的几何对象）
    // 在空间查询中，自包含应该返回 false
    try {
      if (this.equals(g1, g2)) {
        return false;
      }
    } catch {
      // equals 可能对某些无效几何抛出错误，忽略并继续
    }

    const f1 = this.toFeature(g1);
    const f2 = this.toFeature(g2);

    try {
      return turf.booleanContains(f1, f2);
    } catch (error) {
      // Turf.js 不支持某些几何类型组合
      // 回退到边界框检查
      const bbox1 = this.bbox(g1);
      const bbox2 = this.bbox(g2);
      return this.bboxContains(bbox1, bbox2);
    }
  }

  within(g1: Geometry, g2: Geometry): boolean {
    // 检查是否为空几何体
    if (isEmptyGeometry(g1) || isEmptyGeometry(g2)) {
      return false;
    }

    // 检查是否为自包含（相同的几何对象）
    // 在空间查询中，自包含应该返回 false
    try {
      if (this.equals(g1, g2)) {
        return false;
      }
    } catch {
      // equals 可能对某些无效几何抛出错误，忽略并继续
    }

    const f1 = this.toFeature(g1);
    const f2 = this.toFeature(g2);

    try {
      return turf.booleanWithin(f1, f2);
    } catch (error) {
      // Turf.js 不支持某些几何类型组合
      // 对于 Point-Point 的情况，检查坐标是否相同
      if (g1.type === 'Point' && g2.type === 'Point') {
        const coords1 = (g1 as Point).coordinates;
        const coords2 = (g2 as Point).coordinates;
        return coords1[0] === coords2[0] && coords1[1] === coords2[1];
      }

      // 回退到边界框检查
      const bbox1 = this.bbox(g1);
      const bbox2 = this.bbox(g2);
      return this.bboxContains(bbox2, bbox1);
    }
  }

  equals(g1: Geometry, g2: Geometry): boolean {
    const f1 = this.toFeature(g1);
    const f2 = this.toFeature(g2);
    return turf.booleanEqual(f1, f2);
  }

  disjoint(g1: Geometry, g2: Geometry): boolean {
    const f1 = this.toFeature(g1);
    const f2 = this.toFeature(g2);
    return turf.booleanDisjoint(f1, f2);
  }

  crosses(g1: Geometry, g2: Geometry): boolean {
    const f1 = this.toFeature(g1);
    const f2 = this.toFeature(g2);
    return turf.booleanCrosses(f1, f2);
  }

  touches(g1: Geometry, g2: Geometry): boolean {
    // Turf.js 没有直接实现 touches
    // 我们基于 DE-9IM 模型实现
    // touches 的条件：两个几何对象至少有一个公共边界点，但没有内部点相交

    // 先检查是否相交
    if (this.disjoint(g1, g2)) {
      return false;
    }

    // 检查是否有内部点相交
    // 如果有内部点相交，则不是 touches
    const intersection = this.intersection(g1, g2);
    if (!intersection) {
      return false;
    }

    // 计算交集的维度
    const intersectionDim = this.getGeometryDimension(intersection);

    // 如果交集维度 ≥ 1（线或面），说明有内部点相交，不是 touches
    // touches 的交集维度应该 < max(dim(g1), dim(g2))
    const dim1 = this.getGeometryDimension(g1);
    const dim2 = this.getGeometryDimension(g2);

    if (intersectionDim >= Math.max(dim1, dim2)) {
      return false;
    }

    // 检查交集是否在边界上
    // 对于 Point-LineString, Point-Polygon 等组合，Point 在边界上即为 touches
    if (this.isIntersectionOnBoundary(g1, g2, intersection)) {
      return true;
    }

    return false;
  }

  overlaps(g1: Geometry, g2: Geometry): boolean {
    // Turf.js 没有直接实现 overlaps
    // 我们基于 DE-9IM 模型实现
    // overlaps 的条件：
    // 1. 两个几何对象相交
    // 2. 交集维度与两个几何对象相同
    // 3. 交集不等于任何一个几何对象

    // 先检查是否相交
    if (this.disjoint(g1, g2)) {
      return false;
    }

    // 检查是否一个包含另一个
    if (this.contains(g1, g2) || this.within(g1, g2)) {
      return false;
    }

    const dim1 = this.getGeometryDimension(g1);
    const dim2 = this.getGeometryDimension(g2);

    // 如果维度不同，不能 overlaps
    if (dim1 !== dim2) {
      return false;
    }

    // 计算交集
    const intersection = this.intersection(g1, g2);
    if (!intersection) {
      return false;
    }

    const intersectionDim = this.getGeometryDimension(intersection);

    // 检查交集维度是否与原几何对象相同
    if (intersectionDim === dim1 && intersectionDim === dim2) {
      // 还需要确保交集不等于任何一个几何对象
      // 通过检查面积或长度来判断
      if (dim1 === 2) {
        // 多边形：检查交集面积
        const area1 = this.area(g1);
        const area2 = this.area(g2);
        const intersectionArea = this.area(intersection);
        return intersectionArea > 0 &&
               intersectionArea < area1 &&
               intersectionArea < area2;
      } else if (dim1 === 1) {
        // 线：检查交集长度
        const length1 = this.length(g1);
        const length2 = this.length(g2);
        const intersectionLength = this.length(intersection);
        return intersectionLength > 0 &&
               intersectionLength < length1 &&
               intersectionLength < length2;
      } else if (dim1 === 0) {
        // 点：检查是否是不同的点集
        const f1 = this.toFeature(g1);
        const f2 = this.toFeature(g2);
        const fInt = this.toFeature(intersection);
        return !turf.booleanEqual(f1, fInt) && !turf.booleanEqual(f2, fInt);
      }
    }

    return false;
  }

  // ==================== 拓扑操作 ====================

  buffer(geometry: Geometry, distance: number, units?: DistanceUnit): Geometry {
    const feature = this.toFeature(geometry) as any;
    const buffered = turf.buffer(feature, distance, {
      units: (units || this.defaultUnits) as turf.Units
    });
    return buffered.geometry as any;
  }

  intersection(g1: Geometry, g2: Geometry): Geometry | null {
    try {
      const f1 = this.toFeature(g1) as any;
      const f2 = this.toFeature(g2) as any;
      const intersected = turf.intersect(f1, f2);
      return intersected ? (intersected.geometry as any) : null;
    } catch (error) {
      // Turf.js 可能无法计算某些几何类型的交集
      return null;
    }
  }

  union(g1: Geometry, g2: Geometry): Geometry | null {
    try {
      const f1 = this.toFeature(g1) as any;
      const f2 = this.toFeature(g2) as any;
      const united = turf.union(f1, f2);
      return united ? (united.geometry as any) : null;
    } catch (error) {
      // Turf.js 可能无法计算某些几何类型的并集
      return null;
    }
  }

  difference(g1: Geometry, g2: Geometry): Geometry | null {
    try {
      const f1 = this.toFeature(g1) as any;
      const f2 = this.toFeature(g2) as any;
      const differed = turf.difference(f1, f2);
      return differed ? (differed.geometry as any) : null;
    } catch (error) {
      // Turf.js 可能无法计算某些几何类型的差集
      return null;
    }
  }

  // ==================== 工具方法 ====================

  distance(g1: Geometry, g2: Geometry, units?: DistanceUnit): number {
    const f1 = this.toFeature(g1) as any;
    const f2 = this.toFeature(g2) as any;
    return turf.distance(f1, f2, {
      units: (units || this.defaultUnits) as turf.Units
    });
  }

  area(geometry: Geometry): number {
    const feature = this.toFeature(geometry) as any;
    return turf.area(feature);
  }

  length(geometry: Geometry): number {
    const feature = this.toFeature(geometry) as any;
    return turf.length(feature, { units: this.defaultUnits as turf.Units });
  }

  bbox(geometry: Geometry): BBox {
    const feature = this.toFeature(geometry) as any;
    const [minX, minY, maxX, maxY] = turf.bbox(feature);
    return { minX, minY, maxX, maxY };
  }

  centroid(geometry: Geometry): Geometry {
    const feature = this.toFeature(geometry) as any;
    const cent = turf.centroid(feature);
    return cent.geometry as any;
  }

  toFeature<G extends Geometry = Geometry, P = any>(
    geometry: G,
    properties?: P
  ): Feature<G, P> {
    return turf.feature(geometry, properties) as Feature<G, P>;
  }

  simplify(geometry: Geometry, tolerance: number, highQuality: boolean = false): Geometry {
    const feature = this.toFeature(geometry) as any;
    const simplified = turf.simplify(feature, {
      tolerance,
      highQuality
    });
    return simplified.geometry as any;
  }

  // ==================== 辅助方法 ====================

  /**
   * 获取几何对象的维度
   * Point: 0, LineString: 1, Polygon: 2
   */
  private getGeometryDimension(geometry: Geometry): number {
    switch (geometry.type) {
      case 'Point':
      case 'MultiPoint':
        return 0;
      case 'LineString':
      case 'MultiLineString':
        return 1;
      case 'Polygon':
      case 'MultiPolygon':
        return 2;
      case 'GeometryCollection':
        const maxDim = Math.max(
          ...geometry.geometries.map(g => this.getGeometryDimension(g))
        );
        return maxDim;
      default:
        return -1;
    }
  }

  /**
   * 检查交集是否在边界上
   */
  private isIntersectionOnBoundary(
    g1: Geometry,
    g2: Geometry,
    intersection: Geometry
  ): boolean {
    // 这是一个简化的实现
    // 完整的实现需要检查交集是否在两个几何对象的边界上

    // 对于 Point 和其他几何的组合
    if (intersection.type === 'Point') {
      const point = intersection as Point;

      // 检查点是否在线的端点
      if (g1.type === 'LineString') {
        const line = g1 as LineString;
        const coords = line.coordinates;
        const pointCoords = point.coordinates;
        return this.coordinatesEqual(coords[0], pointCoords) ||
               this.coordinatesEqual(coords[coords.length - 1], pointCoords);
      }

      if (g2.type === 'LineString') {
        const line = g2 as LineString;
        const coords = line.coordinates;
        const pointCoords = point.coordinates;
        return this.coordinatesEqual(coords[0], pointCoords) ||
               this.coordinatesEqual(coords[coords.length - 1], pointCoords);
      }
    }

    return false;
  }

  /**
   * 比较两个坐标是否相等
   */
  private coordinatesEqual(
    coords1: [number, number] | [number, number, number],
    coords2: [number, number] | [number, number, number]
  ): boolean {
    if (coords1.length !== coords2.length) {
      return false;
    }
    for (let i = 0; i < coords1.length; i++) {
      if (coords1[i] !== coords2[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * 边界框包含检查
   */
  private bboxContains(bbox1: BBox, bbox2: BBox): boolean {
    return (
      bbox1.minX <= bbox2.minX &&
      bbox1.minY <= bbox2.minY &&
      bbox1.maxX >= bbox2.maxX &&
      bbox1.maxY >= bbox2.maxY
    );
  }
}
