/**
 * Voronoi图生成器
 *
 * 根据种子点（仓库位置）生成Voronoi图，用于划分配送区域
 */

import type { Point, Polygon } from '../database/schema.js';
import { calculateDistance, convexHull, calculateBounds } from '../utils/geometry.js';

export interface VoronoiCell {
  seed: Point;
  polygon: Polygon;
}

/**
 * Voronoi图生成器类
 */
export class VoronoiDiagramGenerator {
  /**
   * 生成Voronoi图
   *
   * @param seeds - 种子点数组（仓库位置）
   * @param bounds - 边界范围 [minLng, minLat, maxLng, maxLat]
   * @param cellSize - 网格大小（度），默认0.001（约100米）
   * @returns Voronoi多边形数组
   */
  generate(
    seeds: Point[],
    bounds: [number, number, number, number],
    cellSize: number = 0.001
  ): VoronoiCell[] {
    if (seeds.length === 0) {
      throw new Error('至少需要一个种子点');
    }

    console.log(`🔄 开始生成Voronoi图，种子点数量: ${seeds.length}`);

    // 生成网格
    const grid = this.createGrid(bounds, cellSize);
    console.log(`✅ 网格生成完成，点数: ${grid.length}`);

    // 为每个网格点分配最近的种子点
    const seedCells = new Map<number, Array<[number, number]>>();

    for (const point of grid) {
      const nearestSeed = this.findNearestSeed(point, seeds);
      const seedIndex = seeds.indexOf(nearestSeed);

      if (!seedCells.has(seedIndex)) {
        seedCells.set(seedIndex, []);
      }
      seedCells.get(seedIndex)!.push(point);
    }

    console.log(`✅ 网格点分配完成，区域数量: ${seedCells.size}`);

    // 为每个种子点生成凸包
    const cells: VoronoiCell[] = [];

    for (const [seedIndex, points] of seedCells) {
      const seed = seeds[seedIndex];
      const polygon = convexHull(points);

      cells.push({
        seed,
        polygon: this.clipToBounds(polygon, bounds)
      });
    }

    console.log(`✅ Voronoi图生成完成`);

    return cells;
  }

  /**
   * 创建网格点
   */
  private createGrid(
    bounds: [number, number, number, number],
    cellSize: number
  ): Array<[number, number]> {
    const [minX, minY, maxX, maxY] = bounds;
    const points: Array<[number, number]> = [];

    for (let x = minX; x <= maxX; x += cellSize) {
      for (let y = minY; y <= maxY; y += cellSize) {
        points.push([x, y]);
      }
    }

    return points;
  }

  /**
   * 查找最近的种子点
   */
  private findNearestSeed(point: [number, number], seeds: Point[]): Point {
    let minDistance = Infinity;
    let nearest = seeds[0];

    for (const seed of seeds) {
      const distance = calculateDistance(point, seed.coordinates);

      if (distance < minDistance) {
        minDistance = distance;
        nearest = seed;
      }
    }

    return nearest;
  }

  /**
   * 裁剪多边形到边界
   *
   * 简化实现：确保多边形的顶点在边界内
   * 实际应用中应使用完整的Sutherland-Hodgman算法
   */
  private clipToBounds(
    polygon: Polygon,
    bounds: [number, number, number, number]
  ): Polygon {
    const [minX, minY, maxX, maxY] = bounds;
    const coords = polygon.coordinates[0];

    // 过滤出边界内的点
    const clipped = coords.filter(([x, y]) => {
      return x >= minX && x <= maxX && y >= minY && y <= maxY;
    });

    // 如果所有点都被过滤掉了，返回边界的矩形
    if (clipped.length < 3) {
      return {
        type: 'Polygon',
        coordinates: [
          [
            [minX, minY],
            [maxX, minY],
            [maxX, maxY],
            [minX, maxY],
            [minX, minY]
          ]
        ]
      };
    }

    return {
      type: 'Polygon',
      coordinates: [[...clipped, clipped[0]]]
    };
  }

  /**
   * 从点集生成Voronoi图（自动计算边界）
   */
  generateFromPoints(seeds: Point[], padding: number = 0.01): VoronoiCell[] {
    if (seeds.length === 0) {
      throw new Error('至少需要一个种子点');
    }

    // 计算边界
    const bounds = calculateBounds(seeds.map(s => s.coordinates));

    // 添加内边距
    const paddedBounds: [number, number, number, number] = [
      bounds[0] - padding,
      bounds[1] - padding,
      bounds[2] + padding,
      bounds[3] + padding
    ];

    return this.generate(seeds, paddedBounds);
  }
}
