/**
 * 几何计算工具函数
 */

import type { Point, Polygon, LineString } from '../database/schema.js';

/**
 * 计算两点间距离（米）
 * 使用Haversine公式
 */
export function calculateDistance(
  from: [number, number],
  to: [number, number]
): number {
  const R = 6371e3; // 地球半径（米）
  const φ1 = (from[1] * Math.PI) / 180;
  const φ2 = (to[1] * Math.PI) / 180;
  const Δφ = ((to[1] - from[1]) * Math.PI) / 180;
  const Δλ = ((to[0] - from[0]) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 计算点到点列表的最近距离
 */
export function findNearestPoint(
  target: [number, number],
  points: Array<[number, number]>
): { point: [number, number]; distance: number } {
  let minDistance = Infinity;
  let nearest = points[0];

  for (const point of points) {
    const distance = calculateDistance(target, point);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = point;
    }
  }

  return { point: nearest, distance: minDistance };
}

/**
 * 计算多边形面积（平方米）
 * 使用Shoelace公式
 */
export function calculatePolygonArea(polygon: Polygon): number {
  const coords = polygon.coordinates[0];
  let area = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area) / 2;
}

/**
 * 计算线段总长度（米）
 */
export function calculateLineStringLength(linestring: LineString): number {
  let total = 0;
  const coords = linestring.coordinates;

  for (let i = 0; i < coords.length - 1; i++) {
    total += calculateDistance(coords[i], coords[i + 1]);
  }

  return total;
}

/**
 * 判断点是否在多边形内
 * 使用射线法
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: Polygon
): boolean {
  const [x, y] = point;
  const coords = polygon.coordinates[0];
  let inside = false;

  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const [xi, yi] = coords[i];
    const [xj, yj] = coords[j];

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * 计算点集的边界
 */
export function calculateBounds(
  points: Array<[number, number]>
): [number, number, number, number] {
  if (points.length === 0) {
    return [0, 0, 0, 0];
  }

  const lngs = points.map(p => p[0]);
  const lats = points.map(p => p[1]);

  return [
    Math.min(...lngs),
    Math.min(...lats),
    Math.max(...lngs),
    Math.max(...lats)
  ];
}

/**
 * 生成凸包（Graham扫描算法）
 */
export function convexHull(points: Array<[number, number]>): Polygon {
  if (points.length < 3) {
    return {
      type: 'Polygon',
      coordinates: [[...points, points[0]]]
    };
  }

  // 找到最下方的点
  let bottom = 0;
  for (let i = 1; i < points.length; i++) {
    if (
      points[i][1] < points[bottom][1] ||
      (points[i][1] === points[bottom][1] && points[i][0] < points[bottom][0])
    ) {
      bottom = i;
    }
  }

  // 按极角排序
  const sorted = points.slice();
  const pivot = sorted[bottom];
  sorted.splice(bottom, 1);

  sorted.sort((a, b) => {
    const angleA = Math.atan2(a[1] - pivot[1], a[0] - pivot[0]);
    const angleB = Math.atan2(b[1] - pivot[1], b[0] - pivot[0]);
    return angleA - angleB;
  });

  // Graham扫描
  const hull: Array<[number, number]> = [pivot];
  for (const point of sorted) {
    while (hull.length > 1) {
      const top = hull[hull.length - 1];
      const second = hull[hull.length - 2];

      const cross =
        (top[0] - second[0]) * (point[1] - second[1]) -
        (top[1] - second[1]) * (point[0] - second[0]);

      if (cross <= 0) {
        hull.pop();
      } else {
        break;
      }
    }
    hull.push(point);
  }

  return {
    type: 'Polygon',
    coordinates: [[...hull, hull[0]]]
  };
}

/**
 * 估算配送时间（秒）
 * 假设平均速度 30km/h
 */
export function estimateDeliveryTime(distance: number): number {
  const averageSpeed = (30 * 1000) / 3600; // 30km/h 转 m/s
  return distance / averageSpeed;
}

/**
 * 格式化时间
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * 格式化距离
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  } else {
    return `${meters.toFixed(0)} m`;
  }
}
