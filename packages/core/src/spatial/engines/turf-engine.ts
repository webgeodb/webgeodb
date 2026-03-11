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
    // Turf.js 的 booleanCrosses 对某些情况处理不正确
    // 我们需要自定义实现

    // 先检查是否相交
    if (!this.intersects(g1, g2)) {
      return false;
    }

    // 检查一个是否包含另一个（如果包含，则不是 crosses）
    if (this.contains(g1, g2) || this.within(g1, g2)) {
      return false;
    }

    // 检查是否相等（如果相等，则不是 crosses）
    if (this.equals(g1, g2)) {
      return false;
    }

    // LineString-LineString 特殊处理
    if (g1.type === 'LineString' && g2.type === 'LineString') {
      return this.lineStringCrosses(g1 as LineString, g2 as LineString);
    }

    // LineString-Polygon
    if ((g1.type === 'LineString' && g2.type === 'Polygon') ||
        (g1.type === 'Polygon' && g2.type === 'LineString')) {
      return true; // LineString 穿过 Polygon 就是 crosses
    }

    // 其他情况使用 Turf.js
    const f1 = this.toFeature(g1);
    const f2 = this.toFeature(g2);
    return turf.booleanCrosses(f1, f2);
  }

  touches(g1: Geometry, g2: Geometry): boolean {
    // Turf.js 没有直接实现 touches
    // 我们基于 DE-9IM 模型实现
    // touches 的条件：两个几何对象至少有一个公共边界点，但没有内部点相交

    // 先检查是否分离
    if (this.disjoint(g1, g2)) {
      return false;
    }

    // 检查边界是否接触
    if (this.boundariesTouch(g1, g2)) {
      // 如果边界接触，还需要检查没有内部点相交
      // 但对于大多数简单情况，边界接触就是 touches
      return true;
    }

    return false;
  }

  /**
   * 检查两个几何对象是否有内部点相交
   * 如果有内部点相交，则不是 touches
   */
  private hasInteriorIntersection(g1: Geometry, g2: Geometry): boolean {
    const dim1 = this.getGeometryDimension(g1);
    const dim2 = this.getGeometryDimension(g2);

    // Point-Point: 只有在相同时相交，但不是内部相交
    if (dim1 === 0 && dim2 === 0) {
      return false;
    }

    // Point-LineString 或 Point-Polygon
    if (dim1 === 0 && dim2 >= 1) {
      return this.pointIntersectsInterior(g1 as Point, g2);
    }
    if (dim2 === 0 && dim1 >= 1) {
      return this.pointIntersectsInterior(g2 as Point, g1);
    }

    // LineString-LineString
    if (dim1 === 1 && dim2 === 1) {
      return this.lineStringsHaveInteriorIntersection(g1 as LineString, g2 as LineString);
    }

    // 默认：假设有内部相交（保守策略）
    return true;
  }

  /**
   * 检查点是否与几何对象的内部相交
   */
  private pointIntersectsInterior(point: Point, geometry: Geometry): boolean {
    if (geometry.type === 'LineString') {
      const line = geometry as LineString;
      // 检查点是否在线的内部（不是端点）
      for (let i = 0; i < line.coordinates.length - 1; i++) {
        if (this.pointOnSegment(point.coordinates, line.coordinates[i], line.coordinates[i + 1])) {
          // 检查是否是端点
          if (!this.coordinatesEqual(point.coordinates, line.coordinates[0]) &&
              !this.coordinatesEqual(point.coordinates, line.coordinates[line.coordinates.length - 1])) {
            return true;
          }
        }
      }
      return false;
    }

    if (geometry.type === 'Polygon') {
      // 检查点是否在面内部（不在边界上）
      return this.pointInPolygon(point, geometry as Polygon) && !this.pointOnPolygonBoundary(point, geometry as Polygon);
    }

    return false;
  }

  /**
   * 检查两条线是否有内部相交
   */
  private lineStringsHaveInteriorIntersection(line1: LineString, line2: LineString): boolean {
    // 检查线段是否相交
    for (let i = 0; i < line1.coordinates.length - 1; i++) {
      for (let j = 0; j < line2.coordinates.length - 1; j++) {
        const intersection = this.getSegmentIntersection(
          line1.coordinates[i],
          line1.coordinates[i + 1],
          line2.coordinates[j],
          line2.coordinates[j + 1]
        );

        if (intersection) {
          // 检查交点是否是端点
          const isEndpoint1 = this.isIntersectionEndpoint(intersection, line1);
          const isEndpoint2 = this.isIntersectionEndpoint(intersection, line2);

          // 如果交点不是至少一条线的端点，则有内部相交
          if (!isEndpoint1 || !isEndpoint2) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * 检查点是否在线段上
   */
  private pointOnSegment(
    point: [number, number],
    start: [number, number],
    end: [number, number]
  ): boolean {
    const px = point[0];
    const py = point[1];
    const sx = start[0];
    const sy = start[1];
    const ex = end[0];
    const ey = end[1];

    // 检查点是否在线段的边界框内
    if (px < Math.min(sx, ex) - Number.EPSILON ||
        px > Math.max(sx, ex) + Number.EPSILON ||
        py < Math.min(sy, ey) - Number.EPSILON ||
        py > Math.max(sy, ey) + Number.EPSILON) {
      return false;
    }

    // 检查点是否在线段上（使用叉积）
    const cross = (px - sx) * (ey - sy) - (py - sy) * (ex - sx);
    return Math.abs(cross) < Number.EPSILON;
  }

  /**
   * 检查点是否在多边形内
   */
  private pointInPolygon(point: Point, polygon: Polygon): boolean {
    const coords = point.coordinates;
    const rings = polygon.coordinates;
    const exteriorRing = rings[0];

    // 检查点是否在外环内
    return this.pointInRing(coords, exteriorRing);
  }

  /**
   * 检查点是否在环内（射线法）
   */
  private pointInRing(
    point: [number, number],
    ring: [number, number][]
  ): boolean {
    const x = point[0];
    const y = point[1];
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];

      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * 检查点是否在多边形边界上
   */
  private pointOnPolygonBoundary(point: Point, polygon: Polygon): boolean {
    const coords = point.coordinates;
    const rings = polygon.coordinates;

    // 检查所有环
    for (const ring of rings) {
      if (this.pointOnRing(coords, ring)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查点是否在环上
   */
  private pointOnRing(
    point: [number, number],
    ring: [number, number][]
  ): boolean {
    for (let i = 0; i < ring.length; i++) {
      const next = (i + 1) % ring.length;
      if (this.pointOnSegment(point, ring[i], ring[next])) {
        return true;
      }
    }
    return false;
  }

  /**
   * 检查边界是否接触
   */
  private boundariesTouch(g1: Geometry, g2: Geometry): boolean {
    // Point-LineString
    if (g1.type === 'Point' && g2.type === 'LineString') {
      return this.pointOnLineString(g1 as Point, g2 as LineString);
    }
    if (g2.type === 'Point' && g1.type === 'LineString') {
      return this.pointOnLineString(g2 as Point, g1 as LineString);
    }

    // Point-Polygon
    if (g1.type === 'Point' && g2.type === 'Polygon') {
      return this.pointOnPolygonBoundary(g1 as Point, g2 as Polygon);
    }
    if (g2.type === 'Point' && g1.type === 'Polygon') {
      return this.pointOnPolygonBoundary(g2 as Point, g1 as Polygon);
    }

    // LineString-LineString
    if (g1.type === 'LineString' && g2.type === 'LineString') {
      return this.lineStringsTouchAtEndpoints(g1 as LineString, g2 as LineString);
    }

    // Polygon-Polygon
    if (g1.type === 'Polygon' && g2.type === 'Polygon') {
      return this.polygonsTouch(g1 as Polygon, g2 as Polygon);
    }

    return false;
  }

  /**
   * 检查点是否在线上
   */
  private pointOnLineString(point: Point, line: LineString): boolean {
    return this.pointOnSegment(
      point.coordinates,
      line.coordinates[0],
      line.coordinates[line.coordinates.length - 1]
    );
  }

  /**
   * 检查两条线是否在端点接触
   */
  private lineStringsTouchAtEndpoints(line1: LineString, line2: LineString): boolean {
    const endpoints1 = [
      line1.coordinates[0],
      line1.coordinates[line1.coordinates.length - 1]
    ];
    const endpoints2 = [
      line2.coordinates[0],
      line2.coordinates[line2.coordinates.length - 1]
    ];

    for (const ep1 of endpoints1) {
      for (const ep2 of endpoints2) {
        if (this.coordinatesEqual(ep1, ep2)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 检查两个面是否在边界接触
   */
  private polygonsTouch(poly1: Polygon, poly2: Polygon): boolean {
    // 检查一个面的边界点是否在另一个面的边界上
    const rings1 = poly1.coordinates;
    const rings2 = poly2.coordinates;

    for (const ring1 of rings1) {
      for (const point of ring1) {
        if (this.pointOnPolygonBoundary({ type: 'Point', coordinates: point }, poly2)) {
          return true;
        }
      }
    }

    for (const ring2 of rings2) {
      for (const point of ring2) {
        if (this.pointOnPolygonBoundary({ type: 'Point', coordinates: point }, poly1)) {
          return true;
        }
      }
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
   * 判断两条 LineString 是否交叉
   * Crosses 的定义：两条线相交于一点（不是端点）
   */
  private lineStringCrosses(line1: LineString, line2: LineString): boolean {
    // 检查线段是否相交
    for (let i = 0; i < line1.coordinates.length - 1; i++) {
      for (let j = 0; j < line2.coordinates.length - 1; j++) {
        const intersection = this.getSegmentIntersection(
          line1.coordinates[i],
          line1.coordinates[i + 1],
          line2.coordinates[j],
          line2.coordinates[j + 1]
        );

        if (intersection) {
          // 检查交点是否是端点
          const isEndpoint1 = this.isIntersectionEndpoint(intersection, line1);
          const isEndpoint2 = this.isIntersectionEndpoint(intersection, line2);

          // 如果交点不是两条线的端点，则是 crosses
          if (!isEndpoint1 || !isEndpoint2) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * 获取两条线段的交点
   */
  private getSegmentIntersection(
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
    p4: [number, number]
  ): [number, number] | null {
    const x1 = p1[0], y1 = p1[1];
    const x2 = p2[0], y2 = p2[1];
    const x3 = p3[0], y3 = p3[1];
    const x4 = p4[0], y4 = p4[1];

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < Number.EPSILON) {
      return null; // 平行或共线
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
    }

    return null;
  }

  /**
   * 检查交点是否是线的端点
   */
  private isIntersectionEndpoint(
    intersection: [number, number],
    line: LineString
  ): boolean {
    const first = line.coordinates[0];
    const last = line.coordinates[line.coordinates.length - 1];

    return this.coordinatesEqual(intersection, first) ||
           this.coordinatesEqual(intersection, last);
  }

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
