import type { Geometry, BBox, Position } from '../types';

// 导入 isEmptyGeometry 以便在模块内使用
// 注意：由于循环依赖，需要在实际需要的地方延迟导入或内联实现

/**
 * 计算几何对象的边界框
 */
export function getBBox(geometry: Geometry): BBox {
  const coords = extractCoordinates(geometry);

  if (coords.length === 0) {
    throw new Error('Invalid geometry: no coordinates');
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x, y] of coords) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  return { minX, minY, maxX, maxY };
}

/**
 * 提取几何对象的所有坐标
 */
function extractCoordinates(geometry: Geometry): Position[] {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates];

    case 'LineString':
    case 'MultiPoint':
      return geometry.coordinates;

    case 'Polygon':
      return geometry.coordinates.flat();

    case 'MultiLineString':
      return geometry.coordinates.flat();

    case 'MultiPolygon':
      return geometry.coordinates.flat(2);

    case 'GeometryCollection':
      return geometry.geometries.flatMap(extractCoordinates);

    default:
      throw new Error(`Unknown geometry type: ${(geometry as any).type}`);
  }
}

/**
 * 检查两个边界框是否相交
 */
export function bboxIntersects(a: BBox, b: BBox): boolean {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  );
}

/**
 * 检查边界框 a 是否包含边界框 b
 */
export function bboxContains(a: BBox, b: BBox): boolean {
  return (
    a.minX <= b.minX &&
    a.minY <= b.minY &&
    a.maxX >= b.maxX &&
    a.maxY >= b.maxY
  );
}

/**
 * 计算两个边界框的交集
 */
export function bboxIntersection(a: BBox, b: BBox): BBox | null {
  if (!bboxIntersects(a, b)) {
    return null;
  }

  return {
    minX: Math.max(a.minX, b.minX),
    minY: Math.max(a.minY, b.minY),
    maxX: Math.min(a.maxX, b.maxX),
    maxY: Math.min(a.maxY, b.maxY)
  };
}

/**
 * 计算两个边界框的并集
 */
export function bboxUnion(a: BBox, b: BBox): BBox {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY)
  };
}

/**
 * 计算边界框的面积
 */
export function bboxArea(bbox: BBox): number {
  return (bbox.maxX - bbox.minX) * (bbox.maxY - bbox.minY);
}

/**
 * 扩展边界框
 */
export function bboxExpand(bbox: BBox, distance: number): BBox {
  return {
    minX: bbox.minX - distance,
    minY: bbox.minY - distance,
    maxX: bbox.maxX + distance,
    maxY: bbox.maxY + distance
  };
}

/**
 * 检查几何对象是否为空
 *
 * 空几何体的定义：
 * - Polygon/MultiPolygon: 面积为 0 或所有顶点相同
 * - LineString/MultiLineString: 长度为 0 或所有顶点相同
 * - Point/MultiPoint: 有效的点不为空
 * - GeometryCollection: 所有子几何都为空
 */
export function isEmptyGeometry(geometry: Geometry): boolean {
  switch (geometry.type) {
    case 'Point':
      // 有效点不为空
      return false;

    case 'MultiPoint':
      return geometry.coordinates.length === 0;

    case 'LineString':
      return isLineStringEmpty(geometry.coordinates);

    case 'MultiLineString':
      return geometry.coordinates.every(line => isLineStringEmpty(line));

    case 'Polygon':
      return isPolygonEmpty(geometry.coordinates);

    case 'MultiPolygon':
      return geometry.coordinates.every(polygon => isPolygonEmpty(polygon));

    case 'GeometryCollection':
      return geometry.geometries.every(isEmptyGeometry);

    default:
      return false;
  }
}

/**
 * 检查线是否为空（所有顶点相同）
 */
function isLineStringEmpty(coordinates: Position[]): boolean {
  if (coordinates.length < 2) {
    return true;
  }

  const first = coordinates[0];
  return coordinates.every(coord =>
    coord[0] === first[0] && coord[1] === first[1]
  );
}

/**
 * 检查多边形是否为空（面积为 0 或所有顶点相同）
 */
function isPolygonEmpty(rings: Position[][]): boolean {
  if (rings.length === 0) {
    return true;
  }

  // 检查外环
  const exteriorRing = rings[0];
  if (exteriorRing.length < 4) {
    return true;
  }

  // 检查所有顶点是否相同
  const first = exteriorRing[0];
  const allSame = exteriorRing.every(coord =>
    coord[0] === first[0] && coord[1] === first[1]
  );

  if (allSame) {
    return true;
  }

  // 检查是否为退化多边形（面积为 0）
  // 使用简单的面积计算
  let area = 0;
  const n = exteriorRing.length - 1; // 最后一个点与第一个相同
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += exteriorRing[i][0] * exteriorRing[j][1];
    area -= exteriorRing[j][0] * exteriorRing[i][1];
  }

  return Math.abs(area / 2) < Number.EPSILON;
}
