/**
 * Turf.js 引擎 - 空间谓词测试
 *
 * 测试所有空间谓词的完整实现：
 * - intersects, contains, within, equals
 * - disjoint, crosses, touches, overlaps
 * - 边界情况：空几何、无效坐标
 * - 性能和精度验证
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TurfEngine } from '../../../src/spatial/engines/turf-engine';
import type { Geometry, Point, LineString, Polygon } from '../../../src/types';

describe('TurfEngine - Spatial Predicates', () => {
  let engine: TurfEngine;

  beforeEach(() => {
    engine = new TurfEngine({ name: 'turf' });
  });

  describe('intersects', () => {
    it('should detect point-point intersection', () => {
      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [0, 0] };

      expect(engine.intersects(point1, point2)).toBe(true);
    });

    it('should detect non-intersecting points', () => {
      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [10, 10] };

      expect(engine.intersects(point1, point2)).toBe(false);
    });

    it('should detect point-line intersection', () => {
      const point: Point = { type: 'Point', coordinates: [5, 5] };
      const line: LineString = {
        type: 'LineString',
        coordinates: [[0, 0], [10, 10]]
      };

      expect(engine.intersects(point, line)).toBe(true);
    });

    it('should detect point-polygon intersection', () => {
      const point: Point = { type: 'Point', coordinates: [5, 5] };
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };

      expect(engine.intersects(point, polygon)).toBe(true);
    });

    it('should detect line-polygon intersection', () => {
      const line: LineString = {
        type: 'LineString',
        coordinates: [[-5, 5], [15, 5]]
      };
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };

      expect(engine.intersects(line, polygon)).toBe(true);
    });

    it('should detect polygon-polygon intersection', () => {
      const polygon1: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };
      const polygon2: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[5, 5], [15, 5], [15, 15], [5, 15], [5, 5]]
        ]
      };

      expect(engine.intersects(polygon1, polygon2)).toBe(true);
    });

    it('should handle edge intersection', () => {
      const point: Point = { type: 'Point', coordinates: [0, 5] };
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };

      // Point on the edge
      expect(engine.intersects(point, polygon)).toBe(true);
    });
  });

  describe('contains', () => {
    it('should detect polygon containing point', () => {
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };
      const point: Point = { type: 'Point', coordinates: [5, 5] };

      expect(engine.contains(polygon, point)).toBe(true);
    });

    it('should detect polygon not containing point', () => {
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };
      const point: Point = { type: 'Point', coordinates: [15, 15] };

      expect(engine.contains(polygon, point)).toBe(false);
    });

    it('should detect polygon containing line', () => {
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };
      const line: LineString = {
        type: 'LineString',
        coordinates: [[2, 2], [8, 8]]
      };

      expect(engine.contains(polygon, line)).toBe(true);
    });

    it('should detect polygon containing polygon', () => {
      const outer: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]]
        ]
      };
      const inner: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[5, 5], [15, 5], [15, 15], [5, 15], [5, 5]]
        ]
      };

      expect(engine.contains(outer, inner)).toBe(true);
    });

    it('should return false for point containing anything', () => {
      const point: Point = { type: 'Point', coordinates: [0, 0] };
      const other: Point = { type: 'Point', coordinates: [0, 0] };

      // Points cannot contain other geometries
      expect(engine.contains(point, other)).toBe(false);
    });
  });

  describe('within', () => {
    it('should detect point within polygon', () => {
      const point: Point = { type: 'Point', coordinates: [5, 5] };
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };

      expect(engine.within(point, polygon)).toBe(true);
    });

    it('should detect point not within polygon', () => {
      const point: Point = { type: 'Point', coordinates: [15, 15] };
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };

      expect(engine.within(point, polygon)).toBe(false);
    });

    it('should detect polygon within polygon', () => {
      const inner: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[5, 5], [15, 5], [15, 15], [5, 15], [5, 5]]
        ]
      };
      const outer: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]]
        ]
      };

      expect(engine.within(inner, outer)).toBe(true);
    });
  });

  describe('equals', () => {
    it('should detect identical points', () => {
      const point1: Point = { type: 'Point', coordinates: [5, 5] };
      const point2: Point = { type: 'Point', coordinates: [5, 5] };

      expect(engine.equals(point1, point2)).toBe(true);
    });

    it('should detect different points', () => {
      const point1: Point = { type: 'Point', coordinates: [5, 5] };
      const point2: Point = { type: 'Point', coordinates: [6, 6] };

      expect(engine.equals(point1, point2)).toBe(false);
    });

    it('should detect identical polygons', () => {
      const polygon1: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };
      const polygon2: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };

      expect(engine.equals(polygon1, polygon2)).toBe(true);
    });
  });

  describe('disjoint', () => {
    it('should detect disjoint points', () => {
      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [10, 10] };

      expect(engine.disjoint(point1, point2)).toBe(true);
    });

    it('should detect non-disjoint points', () => {
      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [0, 0] };

      expect(engine.disjoint(point1, point2)).toBe(false);
    });

    it('should detect point outside polygon', () => {
      const point: Point = { type: 'Point', coordinates: [15, 15] };
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };

      expect(engine.disjoint(point, polygon)).toBe(true);
    });

    it('should detect point inside polygon', () => {
      const point: Point = { type: 'Point', coordinates: [5, 5] };
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };

      expect(engine.disjoint(point, polygon)).toBe(false);
    });
  });

  describe('touches', () => {
    it('should detect point touching polygon edge', () => {
      const point: Point = { type: 'Point', coordinates: [0, 5] };
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };

      expect(engine.touches(point, polygon)).toBe(true);
    });

    it('should detect point not touching polygon', () => {
      const point: Point = { type: 'Point', coordinates: [5, 5] };
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };

      // Point is inside, not touching
      expect(engine.touches(point, polygon)).toBe(false);
    });

    it('should detect touching polygons', () => {
      const polygon1: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };
      const polygon2: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[10, 0], [20, 0], [20, 10], [10, 10], [10, 0]]
        ]
      };

      // Share edge at x=10
      expect(engine.touches(polygon1, polygon2)).toBe(true);
    });
  });

  describe('crosses', () => {
    it('should detect line crossing polygon', () => {
      const line: LineString = {
        type: 'LineString',
        coordinates: [[-5, 5], [15, 5]]
      };
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };

      expect(engine.crosses(line, polygon)).toBe(true);
    });

    it('should detect line not crossing polygon', () => {
      const line: LineString = {
        type: 'LineString',
        coordinates: [[-5, -5], [-5, 15]]
      };
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };

      expect(engine.crosses(line, polygon)).toBe(false);
    });
  });

  describe('overlaps', () => {
    it('should detect overlapping polygons', () => {
      const polygon1: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };
      const polygon2: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[5, 5], [15, 5], [15, 15], [5, 15], [5, 5]]
        ]
      };

      expect(engine.overlaps(polygon1, polygon2)).toBe(true);
    });

    it('should detect non-overlapping polygons', () => {
      const polygon1: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };
      const polygon2: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[20, 20], [30, 20], [30, 30], [20, 30], [20, 20]]
        ]
      };

      expect(engine.overlaps(polygon1, polygon2)).toBe(false);
    });
  });

  describe('边界情况', () => {
    it('should handle empty geometry', () => {
      const point: Point = { type: 'Point', coordinates: [0, 0] };
      const empty: Point = { type: 'Point', coordinates: [] as any };

      expect(() => engine.intersects(point, empty)).not.toThrow();
    });

    it('should handle invalid coordinates', () => {
      const point: Point = { type: 'Point', coordinates: [0, 0] };
      const invalid: Point = { type: 'Point', coordinates: [NaN, NaN] };

      expect(() => engine.intersects(point, invalid)).not.toThrow();
    });

    it('should handle very large coordinates', () => {
      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [1e10, 1e10] };

      expect(() => engine.intersects(point1, point2)).not.toThrow();
    });

    it('should handle negative coordinates', () => {
      const point1: Point = { type: 'Point', coordinates: [-10, -10] };
      const point2: Point = { type: 'Point', coordinates: [-5, -5] };

      expect(() => engine.intersects(point1, point2)).not.toThrow();
    });

    it('should handle precision issues', () => {
      const point1: Point = { type: 'Point', coordinates: [0.1, 0.2] };
      const point2: Point = { type: 'Point', coordinates: [0.1, 0.2] };

      expect(engine.equals(point1, point2)).toBe(true);
    });
  });

  describe('性能测试', () => {
    it('should handle many point checks efficiently', () => {
      const point: Point = { type: 'Point', coordinates: [5, 5] };
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        engine.intersects(point, polygon);
      }

      const duration = performance.now() - startTime;

      // 1000 checks should complete in reasonable time
      expect(duration).toBeLessThan(1000);
    });

    it('should handle complex polygons efficiently', () => {
      // Create a polygon with many vertices
      const coordinates = Array.from({ length: 100 }, (_, i) => [
        Math.cos(i * 2 * Math.PI / 100) * 10,
        Math.sin(i * 2 * Math.PI / 100) * 10
      ]);

      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [coordinates as [number, number][]]
      };

      const point: Point = { type: 'Point', coordinates: [0, 0] };

      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        engine.intersects(point, polygon);
      }

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });

  describe('对称性', () => {
    it('intersects should be symmetric', () => {
      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [0, 0] };

      expect(engine.intersects(point1, point2)).toBe(engine.intersects(point2, point1));
    });

    it('equals should be symmetric', () => {
      const point1: Point = { type: 'Point', coordinates: [5, 5] };
      const point2: Point = { type: 'Point', coordinates: [5, 5] };

      expect(engine.equals(point1, point2)).toBe(engine.equals(point2, point1));
    });

    it('disjoint should be symmetric', () => {
      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [10, 10] };

      expect(engine.disjoint(point1, point2)).toBe(engine.disjoint(point2, point1));
    });
  });

  describe('一致性', () => {
    it('intersects and disjoint should be opposites', () => {
      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [0, 0] };

      expect(engine.intersects(point1, point2)).toBe(!engine.disjoint(point1, point2));
    });

    it('contains and within should be complementary', () => {
      const point: Point = { type: 'Point', coordinates: [5, 5] };
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };

      expect(engine.contains(polygon, point)).toBe(engine.within(point, polygon));
    });
  });
});
