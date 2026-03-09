/**
 * 高级空间谓词优化实现
 *
 * 基于 DE-9IM 模型实现 touches 和 overlaps 谓词的优化版本
 */

import type { Geometry, Point, LineString, Polygon, BBox, Position } from '../../../types';
import { getBBox, bboxIntersects } from '../../../utils';
import { intersectsOptimized } from '../optimized-predicates';

/**
 * DE-9IM 矩阵
 *
 * Dimensionally Extended nine-Intersection Model
 * 用于描述两个几何对象之间的拓扑关系
 */
interface DE9IMMatrix {
  II: number; // Interior-Interior
  IB: number; // Interior-Boundary
  IE: number; // Interior-Exterior
  BI: number; // Boundary-Interior
  BB: number; // Boundary-Boundary
  BE: number; // Boundary-Exterior
  EI: number; // Exterior-Interior
  EB: number; // Exterior-Boundary
  EE: number; // Exterior-Exterior
}

/**
 * 计算两个几何对象的 DE-9IM 矩阵
 *
 * 注意：这是一个简化实现，完整的实现需要使用 JSTS 或其他库
 */
function computeDE9IM(g1: Geometry, g2: Geometry): DE9IMMatrix {
  // 简化实现：返回默认值
  // 实际实现需要：
  // 1. 计算两个几何对象的内部、边界、外部
  // 2. 计算这些部分的交集维度
  // 3. 返回 DE-9IM 矩阵

  return {
    II: -1, IB: -1, IE: 2,
    BI: -1, BB: -1, BE: 2,
    EI: 2,  EB: 2,  EE: 2
  };
}

/**
 * Touches 谓词优化版本
 *
 * DE-9IM 条件：
 * - 至少有一个公共边界点
 * - 没有内部点相交
 *
 * 优化策略：
 * 1. 边界框预检查
 * 2. 点-线特殊处理
 * 3. 线-线端点检查
 * 4. 面-面边界检查
 */
export function touchesOptimized(g1: Geometry, g2: Geometry): boolean {
  // 策略 1: 如果不相交，则不可能 touches
  const intersectResult = intersectsOptimized(g1, g2);
  if (!intersectResult.result) {
    return false;
  }

  const dim1 = getGeometryDimension(g1);
  const dim2 = getGeometryDimension(g2);

  // 策略 2: 点-线、点-面特殊处理
  if (dim1 === 0 && dim2 === 1) {
    return pointTouchesLine(g1 as Point, g2 as LineString);
  }
  if (dim1 === 1 && dim2 === 0) {
    return pointTouchesLine(g2 as Point, g1 as LineString);
  }

  if (dim1 === 0 && dim2 === 2) {
    return pointTouchesPolygon(g1 as Point, g2 as Polygon);
  }
  if (dim1 === 2 && dim2 === 0) {
    return pointTouchesPolygon(g2 as Point, g1 as Polygon);
  }

  // 策略 3: 线-线特殊处理
  if (dim1 === 1 && dim2 === 1) {
    return lineTouchesLine(g1 as LineString, g2 as LineString);
  }

  // 策略 4: 面-面特殊处理
  if (dim1 === 2 && dim2 === 2) {
    return polygonTouchesPolygon(g1 as Polygon, g2 as Polygon);
  }

  // 策略 5: 使用 DE-9IM 完整检查
  return touchesByDE9IM(g1, g2);
}

/**
 * Overlaps 谓词优化版本
 *
 * DE-9IM 条件：
 * 1. 两个几何对象相交
 * 2. 交集维度与原几何对象相同
 * 3. 交集不等于任何一个几何对象
 *
 * 优化策略：
 * 1. 维度预检查
 * 2. 面积/长度比较
 * 3. 边界框预检查
 */
export function overlapsOptimized(g1: Geometry, g2: Geometry): boolean {
  const dim1 = getGeometryDimension(g1);
  const dim2 = getGeometryDimension(g2);

  // 策略 1: 如果维度不同，则不可能 overlaps
  if (dim1 !== dim2) {
    return false;
  }

  // 策略 2: 边界框预检查
  const bbox1 = getBBox(g1);
  const bbox2 = getBBox(g2);

  if (!bboxIntersects(bbox1, bbox2)) {
    return false;
  }

  // 策略 3: 检查包含关系（如果包含，则不是 overlaps）
  // 这里简化处理，实际需要调用引擎

  // 策略 4: 根据维度进行特定检查
  if (dim1 === 2) {
    // 面-面 overlaps
    return polygonOverlapsPolygon(g1 as Polygon, g2 as Polygon);
  } else if (dim1 === 1) {
    // 线-线 overlaps
    return lineOverlapsLine(g1 as LineString, g2 as LineString);
  } else if (dim1 === 0) {
    // 点-点 overlaps（不同点）
    return pointOverlapsPoint(g1 as Point, g2 as Point);
  }

  // 策略 5: 使用 DE-9IM 完整检查
  return overlapsByDE9IM(g1, g2);
}

// ==================== Touches 辅助函数 ====================

/**
 * 判断点是否与线接触（点在线的端点上）
 */
function pointTouchesLine(point: Point, line: LineString): boolean {
  const coords = point.coordinates;
  const lineCoords = line.coordinates;

  // 检查点是否在线的端点上
  return coordinatesEqual(coords, lineCoords[0]) ||
         coordinatesEqual(coords, lineCoords[lineCoords.length - 1]);
}

/**
 * 判断点是否与面接触（点在面的边界上）
 */
function pointTouchesPolygon(point: Point, polygon: Polygon): boolean {
  const coords = point.coordinates;
  const rings = polygon.coordinates;

  // 检查点是否在任意环的边界上
  for (const ring of rings) {
    if (pointOnRing(coords, ring)) {
      return true;
    }
  }

  return false;
}

/**
 * 判断两条线是否接触（端点相交）
 */
function lineTouchesLine(line1: LineString, line2: LineString): boolean {
  const coords1 = line1.coordinates;
  const coords2 = line2.coordinates;

  // 检查线1的端点是否在线2的端点上
  const endpoints1 = [coords1[0], coords1[coords1.length - 1]];
  const endpoints2 = [coords2[0], coords2[coords2.length - 1]];

  for (const ep1 of endpoints1) {
    for (const ep2 of endpoints2) {
      if (coordinatesEqual(ep1, ep2)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 判断两个面是否接触（边界相交但内部不相交）
 */
function polygonTouchesPolygon(poly1: Polygon, poly2: Polygon): boolean {
  // 简化实现：检查边界框是否接触
  const bbox1 = getBBox(poly1);
  const bbox2 = getBBox(poly2);

  // 检查边界框是否只接触边界
  const xOverlap = bbox1.maxX === bbox2.minX || bbox1.minX === bbox2.maxX;
  const yOverlap = bbox1.maxY === bbox2.minY || bbox1.minY === bbox2.maxY;

  return xOverlap || yOverlap;
}

// ==================== Overlaps 辅助函数 ====================

/**
 * 判断两个点是否重叠（实际上是判断是否为不同点）
 */
function pointOverlapsPoint(point1: Point, point2: Point): boolean {
  return !coordinatesEqual(point1.coordinates, point2.coordinates);
}

/**
 * 判断两条线是否重叠
 */
function lineOverlapsLine(line1: LineString, line2: LineString): boolean {
  // 简化实现：检查是否有共同部分但不完全相同
  const length1 = lineStringLength(line1);
  const length2 = lineStringLength(line2);

  // 如果长度相同且坐标相同，则不是 overlaps（是 equals）
  if (length1 === length2 && linesEqual(line1, line2)) {
    return false;
  }

  // 这里需要更复杂的逻辑来判断是否有重叠部分
  // 简化版本返回 false
  return false;
}

/**
 * 判断两个面是否重叠
 */
function polygonOverlapsPolygon(poly1: Polygon, poly2: Polygon): boolean {
  // 简化实现：检查面积
  const area1 = polygonArea(poly1);
  const area2 = polygonArea(poly2);

  // 如果一个面完全包含另一个，则不是 overlaps
  const bbox1 = getBBox(poly1);
  const bbox2 = getBBox(poly2);

  if (bboxContains(bbox1, bbox2) || bboxContains(bbox2, bbox1)) {
    return false;
  }

  // 这里需要更复杂的逻辑来判断是否有重叠区域
  // 简化版本返回 true（如果边界框相交）
  return bboxIntersects(bbox1, bbox2);
}

// ==================== DE-9IM 完整检查 ====================

/**
 * 使用 DE-9IM 矩阵判断 touches
 */
function touchesByDE9IM(g1: Geometry, g2: Geometry): boolean {
  const matrix = computeDE9IM(g1, g2);

  // Touches 的 DE-9IM 条件：
  // II = FALSE (内部不相交)
  // 且至少有一个边界相交
  return matrix.II === -1 &&
         (matrix.BB !== -1 || matrix.IB !== -1 || matrix.BI !== -1);
}

/**
 * 使用 DE-9IM 矩阵判断 overlaps
 */
function overlapsByDE9IM(g1: Geometry, g2: Geometry): boolean {
  const matrix = computeDE9IM(g1, g2);
  const dim1 = getGeometryDimension(g1);
  const dim2 = getGeometryDimension(g2);

  // Overlaps 的 DE-9IM 条件：
  // II = TRUE (内部相交)
  // 且交集维度与原几何对象相同
  return matrix.II === dim1 &&
         matrix.II === dim2 &&
         matrix.II !== -1;
}

// ==================== 辅助工具函数 ====================

/**
 * 获取几何对象的维度
 */
function getGeometryDimension(geometry: Geometry): number {
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
        ...geometry.geometries.map(g => getGeometryDimension(g))
      );
      return maxDim;
    default:
      return -1;
  }
}

/**
 * 判断点是否在环上
 */
function pointOnRing(
  point: Position,
  ring: Position[]
): boolean {
  for (let i = 0; i < ring.length; i++) {
    if (coordinatesEqual(point, ring[i])) {
      return true;
    }
  }
  return false;
}

/**
 * 判断两个坐标是否相等
 */
function coordinatesEqual(
  c1: Position,
  c2: Position
): boolean {
  if (c1.length !== c2.length) {
    return false;
  }

  for (let i = 0; i < c1.length; i++) {
    if (Math.abs(c1[i] - c2[i]) > Number.EPSILON) {
      return false;
    }
  }

  return true;
}

/**
 * 计算线长度
 */
function lineStringLength(line: LineString): number {
  let length = 0;
  const coords = line.coordinates;

  for (let i = 0; i < coords.length - 1; i++) {
    const dx = coords[i + 1][0] - coords[i][0];
    const dy = coords[i + 1][1] - coords[i][1];
    length += Math.sqrt(dx * dx + dy * dy);
  }

  return length;
}

/**
 * 判断两条线是否相等
 */
function linesEqual(line1: LineString, line2: LineString): boolean {
  const coords1 = line1.coordinates;
  const coords2 = line2.coordinates;

  if (coords1.length !== coords2.length) {
    return false;
  }

  for (let i = 0; i < coords1.length; i++) {
    if (!coordinatesEqual(coords1[i], coords2[i])) {
      return false;
    }
  }

  return true;
}

/**
 * 计算多边形面积（简化的鞋带公式）
 */
function polygonArea(polygon: Polygon): number {
  const exteriorRing = polygon.coordinates[0];
  let area = 0;

  for (let i = 0; i < exteriorRing.length - 1; i++) {
    const j = (i + 1) % exteriorRing.length;
    area += exteriorRing[i][0] * exteriorRing[j][1];
    area -= exteriorRing[j][0] * exteriorRing[i][1];
  }

  return Math.abs(area / 2);
}

/**
 * 边界框包含检查
 */
function bboxContains(bbox1: BBox, bbox2: BBox): boolean {
  return (
    bbox1.minX <= bbox2.minX &&
    bbox1.minY <= bbox2.minY &&
    bbox1.maxX >= bbox2.maxX &&
    bbox1.maxY >= bbox2.maxY
  );
}
