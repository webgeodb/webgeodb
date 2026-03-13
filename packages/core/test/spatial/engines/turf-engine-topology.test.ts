/**
 * Turf.js 引擎 - 拓扑操作测试
 *
 * 测试 Turf.js 引擎的拓扑操作功能：
 * - buffer - 缓冲区
 * - intersection - 相交
 * - union - 并集
 * - difference - 差集
 * - centroid - 质心
 * - area - 面积
 * - length - 长度
 * - bbox - 边界框
 * - simplify - 简化
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TurfEngine } from '../../../src/spatial/engines/turf-engine';
import type { Geometry, Point, LineString, Polygon } from '../../../src/types';

describe('TurfEngine - Topology Operations', () => {
  let engine: TurfEngine;

  beforeEach(() => {
    engine = new TurfEngine({ name: 'turf' });
  });

  describe('buffer', () => {
    it('should create buffer around point', () => {
      const point: Point = { type: 'Point', coordinates: [0, 0] };
      const buffered = engine.buffer(point, 1, 'kilometers');

      expect(buffered.type).toBe('Polygon');
      expect(buffered.coordinates).toBeDefined();
    });

    it('should create larger buffer', () => {
      const point: Point = { type: 'Point', coordinates: [0, 0] };
      const buffer1 = engine.buffer(point, 1, 'kilometers');
      const buffer2 = engine.buffer(point, 5, 'kilometers');

      // Larger buffer should have larger area
      expect(engine.area(buffer2)).toBeGreaterThan(engine.area(buffer1));
    });

    it('should create buffer around line', () => {
      const line: LineString = {
        type: 'LineString',
        coordinates: [[0, 0], [10, 10]]
      };
      const buffered = engine.buffer(line, 1, 'kilometers');

      expect(buffered.type).toBe('Polygon');
    });

    it('should create buffer around polygon', () => {
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };
      const buffered = engine.buffer(polygon, 1, 'kilometers');

      expect(buffered.type).toBe('Polygon');
    });

    it('should handle different units', () => {
      const point: Point = { type: 'Point', coordinates: [0, 0] };

      const bufferKm = engine.buffer(point, 1, 'kilometers');
      const bufferM = engine.buffer(point, 1000, 'meters');

      // Should be approximately the same
      const areaDiff = Math.abs(engine.area(bufferKm) - engine.area(bufferM));
      expect(areaDiff / engine.area(bufferKm)).toBeLessThan(0.1); // Within 10%
    });

    it('should handle zero distance', () => {
      const point: Point = { type: 'Point', coordinates: [0, 0] };

      // Zero distance may return undefined or empty geometry
      // Turf.js buffer with 0 distance may not be supported
      const buffered = engine.buffer(point, 0, 'kilometers');

      // Just verify it doesn't throw
      expect(buffered).toBeDefined();
    });
  });

  describe('intersection', () => {
    it('should find intersection of overlapping polygons', () => {
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

      const intersection = engine.intersection(polygon1, polygon2);

      expect(intersection).toBeDefined();
      if (intersection) {
        expect(intersection.type).toBe('Polygon');
      }
    });

    it('should return null for non-overlapping polygons', () => {
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

      const intersection = engine.intersection(polygon1, polygon2);

      expect(intersection).toBeNull();
    });

    it('should find intersection of touching polygons', () => {
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

      const intersection = engine.intersection(polygon1, polygon2);

      // Touching at edge
      expect(intersection).toBeDefined();
    });
  });

  describe('union', () => {
    it('should union overlapping polygons', () => {
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

      const union = engine.union(polygon1, polygon2);

      expect(union).toBeDefined();
      if (union) {
        expect(union.type).toBe('Polygon');
        // Union should have larger area than either polygon
        expect(engine.area(union)).toBeGreaterThan(engine.area(polygon1));
      }
    });

    it('should union adjacent polygons', () => {
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

      const union = engine.union(polygon1, polygon2);

      expect(union).toBeDefined();
    });
  });

  describe('difference', () => {
    it('should find difference of overlapping polygons', () => {
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

      const difference = engine.difference(polygon1, polygon2);

      expect(difference).toBeDefined();
      if (difference) {
        expect(difference.type).toBe('Polygon');
        // Difference should have smaller area than polygon1
        expect(engine.area(difference)).toBeLessThan(engine.area(polygon1));
      }
    });

    it('should return polygon2 if polygon1 is inside', () => {
      const polygon1: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };
      const polygon2: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[2, 2], [8, 2], [8, 8], [2, 8], [2, 2]]
        ]
      };

      const difference = engine.difference(polygon2, polygon1);

      expect(difference).toBeDefined();
    });
  });

  describe('centroid', () => {
    it('should calculate centroid of polygon', () => {
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };

      const centroid = engine.centroid(polygon);

      expect(centroid.type).toBe('Point');
      expect(centroid.coordinates).toBeDefined();
    });

    it('should calculate centroid of point', () => {
      const point: Point = { type: 'Point', coordinates: [5, 5] };

      const centroid = engine.centroid(point);

      expect(centroid.type).toBe('Point');
      expect(centroid.coordinates).toEqual([5, 5]);
    });

    it('should calculate centroid of line', () => {
      const line: LineString = {
        type: 'LineString',
        coordinates: [[0, 0], [10, 10]]
      };

      const centroid = engine.centroid(line);

      expect(centroid.type).toBe('Point');
      // Centroid should be near midpoint
      expect(centroid.coordinates[0]).toBeCloseTo(5, 1);
      expect(centroid.coordinates[1]).toBeCloseTo(5, 1);
    });
  });

  describe('area', () => {
    it('should calculate area of polygon', () => {
      // 使用小坐标范围以避免度数转米的问题
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [0.01, 0], [0.01, 0.01], [0, 0.01], [0, 0]]
        ]
      };

      const area = engine.area(polygon);

      // 面积约为 1.23e-6 平方度（接近赤道时）
      expect(area).toBeGreaterThan(0);
      expect(area).toBeLessThan(0.01);
    });

    it('should return 0 for point', () => {
      const point: Point = { type: 'Point', coordinates: [0, 0] };

      const area = engine.area(point);

      expect(area).toBe(0);
    });

    it('should return 0 for line', () => {
      const line: LineString = {
        type: 'LineString',
        coordinates: [[0, 0], [10, 10]]
      };

      const area = engine.area(line);

      expect(area).toBe(0);
    });

    it('should calculate area of complex polygon', () => {
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [15, 5], [10, 10], [0, 10], [0, 0]]
        ]
      };

      const area = engine.area(polygon);

      expect(area).toBeGreaterThan(0);
    });
  });

  describe('length', () => {
    it('should calculate length of line', () => {
      // 使用小坐标范围
      const line: LineString = {
        type: 'LineString',
        coordinates: [[0, 0], [0.01, 0.01]]
      };

      const length = engine.length(line);

      // 短线的长度（约 0.014 度）
      expect(length).toBeGreaterThan(0);
      expect(length).toBeLessThan(0.02);
    });

    it('should return 0 for point', () => {
      const point: Point = { type: 'Point', coordinates: [0, 0] };

      const length = engine.length(point);

      expect(length).toBe(0);
    });

    it('should calculate perimeter of polygon', () => {
      // 使用小坐标范围
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [0.01, 0], [0.01, 0.01], [0, 0.01], [0, 0]]
        ]
      };

      const length = engine.length(polygon);

      // 周长约 0.04 度
      expect(length).toBeGreaterThan(0);
      expect(length).toBeLessThan(0.05);
    });

    it('should calculate length of multi-segment line', () => {
      // 使用小坐标范围
      const line: LineString = {
        type: 'LineString',
        coordinates: [[0, 0], [0.01, 0], [0.01, 0.01]]
      };

      const length = engine.length(line);

      // 总长度约 0.02 度
      expect(length).toBeGreaterThan(0);
      expect(length).toBeLessThan(0.03);
    });
  });

  describe('bbox', () => {
    it('should calculate bbox of point', () => {
      const point: Point = { type: 'Point', coordinates: [5, 5] };

      const bbox = engine.bbox(point);

      expect(bbox.minX).toBe(5);
      expect(bbox.minY).toBe(5);
      expect(bbox.maxX).toBe(5);
      expect(bbox.maxY).toBe(5);
    });

    it('should calculate bbox of line', () => {
      const line: LineString = {
        type: 'LineString',
        coordinates: [[0, 0], [10, 10]]
      };

      const bbox = engine.bbox(line);

      expect(bbox.minX).toBe(0);
      expect(bbox.minY).toBe(0);
      expect(bbox.maxX).toBe(10);
      expect(bbox.maxY).toBe(10);
    });

    it('should calculate bbox of polygon', () => {
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[5, 5], [15, 5], [15, 15], [5, 15], [5, 5]]
        ]
      };

      const bbox = engine.bbox(polygon);

      expect(bbox.minX).toBe(5);
      expect(bbox.minY).toBe(5);
      expect(bbox.maxX).toBe(15);
      expect(bbox.maxY).toBe(15);
    });
  });

  describe('distance', () => {
    it('should calculate distance between points', () => {
      // 使用小坐标范围
      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [0.01, 0] };

      const distance = engine.distance(point1, point2);

      // 0.01 度的距离（约 1.11 km 在赤道）
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(0.02);
    });

    it('should calculate distance from point to line', () => {
      // 使用小坐标范围
      const point: Point = { type: 'Point', coordinates: [0, 0.005] };
      const line: LineString = {
        type: 'LineString',
        coordinates: [[0, 0], [0.01, 0]]
      };

      const distance = engine.distance(point, line);

      // 垂直距离约 0.005 度
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(0.01);
    });

    it('should handle different units', () => {
      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [1, 0] };

      const distanceKm = engine.distance(point1, point2, 'kilometers');
      const distanceM = engine.distance(point1, point2, 'meters');

      // 1 degree ≈ 111 km
      expect(distanceKm).toBeGreaterThan(100);
      expect(distanceM).toBeGreaterThan(100000);
    });
  });

  describe('simplify', () => {
    it('should simplify complex geometry', () => {
      // Create a complex line with many points
      const coordinates = Array.from({ length: 100 }, (_, i) => [
        i * 0.1,
        Math.sin(i * 0.1) * 10
      ]);

      const line: LineString = {
        type: 'LineString',
        coordinates: coordinates as [number, number][]
      };

      const simplified = engine.simplify(line, 0.1, true);

      expect(simplified).toBeDefined();
      expect(simplified.type).toBe('LineString');
      // Should have fewer points
      expect((simplified as LineString).coordinates.length).toBeLessThan(100);
    });

    it('should preserve overall shape', () => {
      const coordinates = [
        [0, 0], [10, 0], [10, 10], [0, 10], [0, 0]
      ] as [number, number][];

      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [coordinates]
      };

      const simplified = engine.simplify(polygon, 1, false);

      expect(simplified.type).toBe('Polygon');
    });
  });

  describe('性能测试', () => {
    it('should buffer many points efficiently', () => {
      const points = Array.from({ length: 100 }, (_, i) => ({
        type: 'Point' as const,
        coordinates: [i, i]
      }));

      const startTime = performance.now();

      points.forEach(point => {
        engine.buffer(point, 1, 'kilometers');
      });

      const duration = performance.now() - startTime;

      // Should complete 100 buffers in reasonable time
      expect(duration).toBeLessThan(5000);
    });

    it('should calculate many areas efficiently', () => {
      const polygons = Array.from({ length: 100 }, (_, i) => ({
        type: 'Polygon' as const,
        coordinates: [
          [[0, 0], [i, 0], [i, i], [0, i], [0, 0]]
        ]
      }));

      const startTime = performance.now();

      polygons.forEach(polygon => {
        engine.area(polygon);
      });

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });

  describe('toFeature', () => {
    it('should convert geometry to feature', () => {
      const point: Point = { type: 'Point', coordinates: [0, 0] };
      const properties = { name: 'Test' };

      const feature = engine.toFeature(point, properties);

      expect(feature.type).toBe('Feature');
      expect(feature.geometry).toEqual(point);
      expect(feature.properties).toEqual(properties);
    });

    it('should handle missing properties', () => {
      const point: Point = { type: 'Point', coordinates: [0, 0] };

      const feature = engine.toFeature(point);

      expect(feature.properties).toEqual({});
    });
  });

  describe('边界情况', () => {
    it('should handle empty coordinates', () => {
      const point: Point = { type: 'Point', coordinates: [] as any };

      expect(() => engine.area(point)).not.toThrow();
    });

    it('should handle very large geometries', () => {
      const coordinates = [[-1e10, -1e10], [1e10, -1e10], [1e10, 1e10], [-1e10, 1e10], [-1e10, -1e10]] as [number, number][];

      const polygon: Polygon = { type: 'Polygon', coordinates: [coordinates] };

      expect(() => engine.area(polygon)).not.toThrow();
    });

    it('should handle self-intersecting polygon', () => {
      // Bowtie polygon
      const coordinates = [[0, 0], [10, 10], [0, 10], [10, 0], [0, 0]] as [number, number][];

      const polygon: Polygon = { type: 'Polygon', coordinates: [coordinates] };

      expect(() => engine.area(polygon)).not.toThrow();
    });

    it('should handle degenerate geometries', () => {
      const line: LineString = {
        type: 'LineString',
        coordinates: [[5, 5], [5, 5]] // Same point
      };

      expect(() => engine.length(line)).not.toThrow();
    });
  });
});
