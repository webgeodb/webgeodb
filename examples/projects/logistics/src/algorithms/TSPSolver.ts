/**
 * TSP（旅行商问题）求解器
 *
 * 使用最近邻算法和2-opt优化求解旅行商问题，用于优化配送路线
 */

import type { Point, LineString } from '../database/schema.js';
import { calculateDistance, estimateDeliveryTime } from '../utils/geometry.js';

export interface TSPSolution {
  route: Point[];
  totalDistance: number;
  estimatedTime: number;
}

/**
 * TSP求解器类
 */
export class TSPSolver {
  /**
   * 求解TSP问题
   *
   * @param points - 需要访问的点
   * @param startPoint - 起点（可选）
   * @param endPoint - 终点（可选）
   * @param maxIterations - 最大优化迭代次数
   * @returns 最优路径
   */
  solve(
    points: Point[],
    startPoint?: Point,
    endPoint?: Point,
    maxIterations: number = 100
  ): TSPSolution {
    if (points.length === 0) {
      return {
        route: [],
        totalDistance: 0,
        estimatedTime: 0
      };
    }

    if (points.length === 1) {
      const distance = startPoint
        ? calculateDistance(startPoint.coordinates, points[0].coordinates)
        : 0;

      return {
        route: points,
        totalDistance: distance,
        estimatedTime: estimateDeliveryTime(distance)
      };
    }

    console.log(`🔄 开始求解TSP，点数: ${points.length}`);

    // 使用最近邻算法生成初始解
    let route = this.nearestNeighbor(points, startPoint);
    let totalDistance = this.calculateRouteDistance(route);

    console.log(`✅ 初始解生成完成，距离: ${totalDistance.toFixed(0)}m`);

    // 使用2-opt优化
    let improved = true;
    let iterations = 0;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      for (let i = 1; i < route.length - 2; i++) {
        for (let j = i + 1; j < route.length - 1; j++) {
          const newRoute = this.twoOptSwap(route, i, j);
          const newDistance = this.calculateRouteDistance(newRoute);

          if (newDistance < totalDistance) {
            route = newRoute;
            totalDistance = newDistance;
            improved = true;
          }
        }
      }
    }

    console.log(`✅ 2-opt优化完成，迭代: ${iterations}次`);

    const estimatedTime = estimateDeliveryTime(totalDistance);

    console.log(`✅ TSP求解完成，最终距离: ${totalDistance.toFixed(0)}m`);

    return {
      route,
      totalDistance,
      estimatedTime
    };
  }

  /**
   * 最近邻算法
   *
   * 贪心算法，每次选择最近的未访问点
   */
  private nearestNeighbor(points: Point[], startPoint?: Point): Point[] {
    const unvisited = [...points];
    const route: Point[] = [];

    let current: Point;

    if (startPoint) {
      current = startPoint;
      route.push(current); // 起点不在访问点列表中
    } else {
      current = unvisited.shift()!;
      route.push(current);
    }

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const distance = calculateDistance(
          current.coordinates,
          unvisited[i].coordinates
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }

      current = unvisited[nearestIndex];
      route.push(current);
      unvisited.splice(nearestIndex, 1);
    }

    return route;
  }

  /**
   * 2-opt交换
   *
   * 通过交换边来优化路径
   */
  private twoOptSwap(route: Point[], i: number, j: number): Point[] {
    const newRoute = route.slice(0, i);
    const reversed = route.slice(i, j + 1).reverse();
    const remaining = route.slice(j + 1);

    return [...newRoute, ...reversed, ...remaining];
  }

  /**
   * 计算路径总距离
   */
  private calculateRouteDistance(route: Point[]): number {
    if (route.length < 2) return 0;

    let total = 0;
    for (let i = 0; i < route.length - 1; i++) {
      total += calculateDistance(
        route[i].coordinates,
        route[i + 1].coordinates
      );
    }

    return total;
  }

  /**
   * 生成路线几何对象
   */
  createRouteGeometry(route: Point[], startPoint?: Point): LineString {
    const coordinates: Array<[number, number]> = [];

    if (startPoint) {
      coordinates.push(startPoint.coordinates);
    }

    coordinates.push(...route.map(p => p.coordinates));

    return {
      type: 'LineString',
      coordinates
    };
  }

  /**
   * 批量求解多个TSP问题
   *
   * @param pointGroups - 点分组
   * @param startPoint - 共同起点
   * @returns 每个分组的解
   */
  solveBatch(
    pointGroups: Point[][],
    startPoint?: Point
  ): TSPSolution[] {
    console.log(`🔄 批量求解TSP，分组数: ${pointGroups.length}`);

    const solutions: TSPSolution[] = [];

    for (let i = 0; i < pointGroups.length; i++) {
      console.log(`\n处理分组 ${i + 1}/${pointGroups.length}`);
      const solution = this.solve(pointGroups[i], startPoint);
      solutions.push(solution);
    }

    console.log(`\n✅ 批量求解完成`);

    return solutions;
  }
}
