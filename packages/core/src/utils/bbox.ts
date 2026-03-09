import type { Geometry, BBox, Position } from '../types';

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
