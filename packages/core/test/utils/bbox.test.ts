import { describe, it, expect, beforeEach } from 'vitest';
import {
  getBBox,
  bboxContains,
  bboxIntersects,
  bboxIntersection,
  bboxUnion,
  bboxArea,
  bboxExpand
} from '../../src/utils/bbox';
import type { Geometry } from '../../src/types';
import {
  createPoint,
  createLineString,
  createPolygon,
  createMultiPolygon,
  createGeometryCollection
} from '../helpers/geometry-helpers';

describe('BBox Utilities', () => {
  describe('getBBox', () => {
    it('should calculate bbox for Point', () => {
      const point = createPoint(30, 10);
      const bbox = getBBox(point);

      expect(bbox).toEqual({
        minX: 30,
        minY: 10,
        maxX: 30,
        maxY: 10
      });
    });

    it('should calculate bbox for LineString', () => {
      const lineString = createLineString([
        [0, 0],
        [10, 10],
        [5, 15]
      ]);
      const bbox = getBBox(lineString);

      expect(bbox.minX).toBe(0);
      expect(bbox.minY).toBe(0);
      expect(bbox.maxX).toBe(10);
      expect(bbox.maxY).toBe(15);
    });

    it('should calculate bbox for Polygon', () => {
      const polygon = createPolygon([
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0]
        ]
      ]);
      const bbox = getBBox(polygon);

      expect(bbox).toEqual({
        minX: 0,
        minY: 0,
        maxX: 10,
        maxY: 10
      });
    });

    it('should calculate bbox for MultiPolygon', () => {
      const multiPolygon = createMultiPolygon([
        [
          [
            [0, 0],
            [5, 0],
            [5, 5],
            [0, 5],
            [0, 0]
          ]
        ],
        [
          [
            [10, 10],
            [15, 10],
            [15, 15],
            [10, 15],
            [10, 10]
          ]
        ]
      ]);
      const bbox = getBBox(multiPolygon);

      expect(bbox.minX).toBe(0);
      expect(bbox.minY).toBe(0);
      expect(bbox.maxX).toBe(15);
      expect(bbox.maxY).toBe(15);
    });

    it('should calculate bbox for GeometryCollection', () => {
      const collection = createGeometryCollection([
        createPoint(5, 5),
        createLineString([
          [0, 0],
          [10, 10]
        ]),
        createPolygon([
          [
            [2, 2],
            [8, 2],
            [8, 8],
            [2, 8],
            [2, 2]
          ]
        ])
      ]);
      const bbox = getBBox(collection);

      expect(bbox.minX).toBe(0);
      expect(bbox.minY).toBe(0);
      expect(bbox.maxX).toBe(10);
      expect(bbox.maxY).toBe(10);
    });

    it('should handle negative coordinates', () => {
      const point = createPoint(-30, -10);
      const bbox = getBBox(point);

      expect(bbox).toEqual({
        minX: -30,
        minY: -10,
        maxX: -30,
        maxY: -10
      });
    });

    it('should handle mixed positive and negative coordinates', () => {
      const lineString = createLineString([
        [-10, -10],
        [10, 10]
      ]);
      const bbox = getBBox(lineString);

      expect(bbox).toEqual({
        minX: -10,
        minY: -10,
        maxX: 10,
        maxY: 10
      });
    });

    it('should handle floating point coordinates', () => {
      const point = createPoint(30.567, 10.891);
      const bbox = getBBox(point);

      expect(bbox.minX).toBeCloseTo(30.567);
      expect(bbox.minY).toBeCloseTo(10.891);
      expect(bbox.maxX).toBeCloseTo(30.567);
      expect(bbox.maxY).toBeCloseTo(10.891);
    });

    it('should handle polygon with holes', () => {
      const polygonWithHole = createPolygon([
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0]
        ],
        [
          [3, 3],
          [7, 3],
          [7, 7],
          [3, 7],
          [3, 3]
        ]
      ]);
      const bbox = getBBox(polygonWithHole);

      // 孔不应该影响边界框
      expect(bbox).toEqual({
        minX: 0,
        minY: 0,
        maxX: 10,
        maxY: 10
      });
    });

    it('should handle very large coordinates', () => {
      const point = createPoint(1e10, 1e10);
      const bbox = getBBox(point);

      expect(bbox.minX).toBe(1e10);
      expect(bbox.minY).toBe(1e10);
      expect(bbox.maxX).toBe(1e10);
      expect(bbox.maxY).toBe(1e10);
    });

    it('should handle very small coordinates', () => {
      const point = createPoint(1e-10, 1e-10);
      const bbox = getBBox(point);

      expect(bbox.minX).toBeCloseTo(1e-10, 10);
      expect(bbox.minY).toBeCloseTo(1e-10, 10);
      expect(bbox.maxX).toBeCloseTo(1e-10, 10);
      expect(bbox.maxY).toBeCloseTo(1e-10, 10);
    });

    it('should throw error for empty geometry', () => {
      const emptyPolygon = createPolygon([
        [] as any
      ]);

      expect(() => getBBox(emptyPolygon)).toThrow('Invalid geometry: no coordinates');
    });
  });

  describe('bboxContains', () => {
    it('should return true when bbox a contains bbox b', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 2, minY: 2, maxX: 8, maxY: 8 };

      expect(bboxContains(bboxA, bboxB)).toBe(true);
    });

    it('should return false when bbox a does not contain bbox b', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 8, minY: 8, maxX: 15, maxY: 15 };

      expect(bboxContains(bboxA, bboxB)).toBe(false);
    });

    it('should return true when bboxes are equal', () => {
      const bbox = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

      expect(bboxContains(bbox, bbox)).toBe(true);
    });

    it('should return false when bbox b extends beyond bbox a on left', () => {
      const bboxA = { minX: 5, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 0, minY: 2, maxX: 8, maxY: 8 };

      expect(bboxContains(bboxA, bboxB)).toBe(false);
    });

    it('should return false when bbox b extends beyond bbox a on right', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 5, minY: 2, maxX: 15, maxY: 8 };

      expect(bboxContains(bboxA, bboxB)).toBe(false);
    });

    it('should return false when bbox b extends beyond bbox a on top', () => {
      const bboxA = { minX: 0, minY: 5, maxX: 10, maxY: 10 };
      const bboxB = { minX: 2, minY: 0, maxX: 8, maxY: 8 };

      expect(bboxContains(bboxA, bboxB)).toBe(false);
    });

    it('should return false when bbox b extends beyond bbox a on bottom', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 2, minY: 5, maxX: 8, maxY: 15 };

      expect(bboxContains(bboxA, bboxB)).toBe(false);
    });

    it('should handle negative coordinates', () => {
      const bboxA = { minX: -10, minY: -10, maxX: 10, maxY: 10 };
      const bboxB = { minX: -5, minY: -5, maxX: 5, maxY: 5 };

      expect(bboxContains(bboxA, bboxB)).toBe(true);
    });

    it('should handle zero-area bboxes', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 5, minY: 5, maxX: 5, maxY: 5 };

      expect(bboxContains(bboxA, bboxB)).toBe(true);
    });
  });

  describe('bboxIntersects', () => {
    it('should return true when bboxes overlap', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 5, minY: 5, maxX: 15, maxY: 15 };

      expect(bboxIntersects(bboxA, bboxB)).toBe(true);
    });

    it('should return true when bbox a contains bbox b', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 2, minY: 2, maxX: 8, maxY: 8 };

      expect(bboxIntersects(bboxA, bboxB)).toBe(true);
    });

    it('should return true when bbox b contains bbox a', () => {
      const bboxA = { minX: 2, minY: 2, maxX: 8, maxY: 8 };
      const bboxB = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

      expect(bboxIntersects(bboxA, bboxB)).toBe(true);
    });

    it('should return true when bboxes are equal', () => {
      const bbox = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

      expect(bboxIntersects(bbox, bbox)).toBe(true);
    });

    it('should return true when bboxes touch on edge', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 10, minY: 0, maxX: 20, maxY: 10 };

      expect(bboxIntersects(bboxA, bboxB)).toBe(true);
    });

    it('should return true when bboxes touch on corner', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 10, minY: 10, maxX: 20, maxY: 20 };

      expect(bboxIntersects(bboxA, bboxB)).toBe(true);
    });

    it('should return false when bboxes are disjoint horizontally', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 15, minY: 0, maxX: 25, maxY: 10 };

      expect(bboxIntersects(bboxA, bboxB)).toBe(false);
    });

    it('should return false when bboxes are disjoint vertically', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 0, minY: 15, maxX: 10, maxY: 25 };

      expect(bboxIntersects(bboxA, bboxB)).toBe(false);
    });

    it('should return false when bboxes are disjoint diagonally', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 15, minY: 15, maxX: 25, maxY: 25 };

      expect(bboxIntersects(bboxA, bboxB)).toBe(false);
    });

    it('should handle negative coordinates', () => {
      const bboxA = { minX: -10, minY: -10, maxX: 0, maxY: 0 };
      const bboxB = { minX: -5, minY: -5, maxX: 5, maxY: 5 };

      expect(bboxIntersects(bboxA, bboxB)).toBe(true);
    });
  });

  describe('bboxIntersection', () => {
    it('should calculate intersection of two overlapping bboxes', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 5, minY: 5, maxX: 15, maxY: 15 };

      const intersection = bboxIntersection(bboxA, bboxB);

      expect(intersection).toEqual({
        minX: 5,
        minY: 5,
        maxX: 10,
        maxY: 10
      });
    });

    it('should return null when bboxes do not intersect', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 15, minY: 15, maxX: 25, maxY: 25 };

      const intersection = bboxIntersection(bboxA, bboxB);

      expect(intersection).toBeNull();
    });

    it('should handle containment (one bbox inside another)', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 2, minY: 2, maxX: 8, maxY: 8 };

      const intersection1 = bboxIntersection(bboxA, bboxB);
      const intersection2 = bboxIntersection(bboxB, bboxA);

      expect(intersection1).toEqual(bboxB);
      expect(intersection2).toEqual(bboxB);
    });

    it('should handle edge-touching bboxes', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 10, minY: 0, maxX: 20, maxY: 10 };

      const intersection = bboxIntersection(bboxA, bboxB);

      expect(intersection).toEqual({
        minX: 10,
        minY: 0,
        maxX: 10,
        maxY: 10
      });
    });

    it('should handle corner-touching bboxes', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 10, minY: 10, maxX: 20, maxY: 20 };

      const intersection = bboxIntersection(bboxA, bboxB);

      expect(intersection).toEqual({
        minX: 10,
        minY: 10,
        maxX: 10,
        maxY: 10
      });
    });

    it('should handle identical bboxes', () => {
      const bbox = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

      const intersection = bboxIntersection(bbox, bbox);

      expect(intersection).toEqual(bbox);
    });

    it('should handle zero-area intersection', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 15, minY: 0, maxX: 25, maxY: 10 };

      const intersection = bboxIntersection(bboxA, bboxB);

      expect(intersection).toBeNull();
    });

    it('should handle negative coordinates', () => {
      const bboxA = { minX: -10, minY: -10, maxX: 0, maxY: 0 };
      const bboxB = { minX: -5, minY: -5, maxX: 5, maxY: 5 };

      const intersection = bboxIntersection(bboxA, bboxB);

      expect(intersection).toEqual({
        minX: -5,
        minY: -5,
        maxX: 0,
        maxY: 0
      });
    });
  });

  describe('bboxUnion', () => {
    it('should calculate union of two bboxes', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 5, minY: 5, maxX: 15, maxY: 15 };

      const union = bboxUnion(bboxA, bboxB);

      expect(union).toEqual({
        minX: 0,
        minY: 0,
        maxX: 15,
        maxY: 15
      });
    });

    it('should handle disjoint bboxes', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 20, minY: 20, maxX: 30, maxY: 30 };

      const union = bboxUnion(bboxA, bboxB);

      expect(union).toEqual({
        minX: 0,
        minY: 0,
        maxX: 30,
        maxY: 30
      });
    });

    it('should handle identical bboxes', () => {
      const bbox = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

      const union = bboxUnion(bbox, bbox);

      expect(union).toEqual(bbox);
    });

    it('should handle containment', () => {
      const bboxA = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bboxB = { minX: 2, minY: 2, maxX: 8, maxY: 8 };

      const union1 = bboxUnion(bboxA, bboxB);
      const union2 = bboxUnion(bboxB, bboxA);

      expect(union1).toEqual(bboxA);
      expect(union2).toEqual(bboxA);
    });

    it('should handle negative coordinates', () => {
      const bboxA = { minX: -10, minY: -10, maxX: 0, maxY: 0 };
      const bboxB = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

      const union = bboxUnion(bboxA, bboxB);

      expect(union).toEqual({
        minX: -10,
        minY: -10,
        maxX: 10,
        maxY: 10
      });
    });

    it('should handle multiple unions', () => {
      const bbox1 = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bbox2 = { minX: 15, minY: 0, maxX: 25, maxY: 10 };
      const bbox3 = { minX: 5, minY: 15, maxX: 20, maxY: 25 };

      const union12 = bboxUnion(bbox1, bbox2);
      const union123 = bboxUnion(union12, bbox3);

      expect(union123).toEqual({
        minX: 0,
        minY: 0,
        maxX: 25,
        maxY: 25
      });
    });
  });

  describe('bboxArea', () => {
    it('should calculate area of bbox', () => {
      const bbox = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

      const area = bboxArea(bbox);

      expect(area).toBe(100);
    });

    it('should calculate area of non-square bbox', () => {
      const bbox = { minX: 0, minY: 0, maxX: 20, maxY: 10 };

      const area = bboxArea(bbox);

      expect(area).toBe(200);
    });

    it('should handle zero-area bbox', () => {
      const bbox = { minX: 5, minY: 5, maxX: 5, maxY: 5 };

      const area = bboxArea(bbox);

      expect(area).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const bbox = { minX: -10, minY: -10, maxX: 0, maxY: 0 };

      const area = bboxArea(bbox);

      expect(area).toBe(100);
    });

    it('should handle mixed positive and negative coordinates', () => {
      const bbox = { minX: -10, minY: -5, maxX: 10, maxY: 5 };

      const area = bboxArea(bbox);

      expect(area).toBe(200); // 20 * 10
    });

    it('should handle very large coordinates', () => {
      const bbox = { minX: 0, minY: 0, maxX: 1e10, maxY: 1e10 };

      const area = bboxArea(bbox);

      expect(area).toBe(1e20);
    });

    it('should handle very small coordinates', () => {
      const bbox = { minX: 0, minY: 0, maxX: 1e-10, maxY: 1e-10 };

      const area = bboxArea(bbox);

      // 使用 toBeCloseTo 处理浮点精度问题
      expect(area).toBeCloseTo(1e-20, 15);
    });
  });

  describe('bboxExpand', () => {
    it('should expand bbox by given distance', () => {
      const bbox = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const expanded = bboxExpand(bbox, 5);

      expect(expanded).toEqual({
        minX: -5,
        minY: -5,
        maxX: 15,
        maxY: 15
      });
    });

    it('should handle zero expansion', () => {
      const bbox = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const expanded = bboxExpand(bbox, 0);

      expect(expanded).toEqual(bbox);
    });

    it('should handle negative expansion (shrink)', () => {
      const bbox = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const expanded = bboxExpand(bbox, -2);

      expect(expanded).toEqual({
        minX: 2,
        minY: 2,
        maxX: 8,
        maxY: 8
      });
    });

    it('should handle expansion that results in negative dimensions', () => {
      const bbox = { minX: 5, minY: 5, maxX: 5, maxY: 5 };
      const expanded = bboxExpand(bbox, -10);

      // 结果是有效的边界框（虽然尺寸为负）
      expect(expanded).toEqual({
        minX: 15,
        minY: 15,
        maxX: -5,
        maxY: -5
      });
    });

    it('should handle large expansion', () => {
      const bbox = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const expanded = bboxExpand(bbox, 100);

      expect(expanded).toEqual({
        minX: -100,
        minY: -100,
        maxX: 110,
        maxY: 110
      });
    });

    it('should handle negative coordinates', () => {
      const bbox = { minX: -10, minY: -10, maxX: 0, maxY: 0 };
      const expanded = bboxExpand(bbox, 5);

      expect(expanded).toEqual({
        minX: -15,
        minY: -15,
        maxX: 5,
        maxY: 5
      });
    });

    it('should handle floating point distances', () => {
      const bbox = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const expanded = bboxExpand(bbox, 2.5);

      expect(expanded).toEqual({
        minX: -2.5,
        minY: -2.5,
        maxX: 12.5,
        maxY: 12.5
      });
    });

    it('should not mutate original bbox', () => {
      const bbox = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const originalMinX = bbox.minX;

      bboxExpand(bbox, 5);

      expect(bbox.minX).toBe(originalMinX);
    });
  });

  describe('combined operations', () => {
    it('should handle complex bbox operations', () => {
      const bbox1 = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bbox2 = { minX: 5, minY: 5, maxX: 15, maxY: 15 };

      // 计算交集
      const intersection = bboxIntersection(bbox1, bbox2);
      expect(intersection).toBeDefined();

      // 计算并集
      const union = bboxUnion(bbox1, bbox2);
      expect(union).toBeDefined();

      // 检查包含关系
      expect(bboxContains(union, bbox1)).toBe(true);
      expect(bboxContains(union, bbox2)).toBe(true);

      // 检查相交关系
      expect(bboxIntersects(bbox1, bbox2)).toBe(true);
    });

    it('should calculate area of union', () => {
      const bbox1 = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bbox2 = { minX: 5, minY: 5, maxX: 15, maxY: 15 };

      const union = bboxUnion(bbox1, bbox2);
      const area = bboxArea(union);

      expect(area).toBe(225); // 15 * 15
    });

    it('should expand and then check containment', () => {
      const bbox1 = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
      const bbox2 = { minX: 12, minY: 12, maxX: 15, maxY: 15 };

      // 原始不包含
      expect(bboxContains(bbox1, bbox2)).toBe(false);

      // 扩展后包含
      const expanded = bboxExpand(bbox1, 5);
      expect(bboxContains(expanded, bbox2)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle very small bboxes', () => {
      const bbox = { minX: 0, minY: 0, maxX: 0.0001, maxY: 0.0001 };

      const area = bboxArea(bbox);
      expect(area).toBeCloseTo(1e-8);

      const expanded = bboxExpand(bbox, 0.0001);
      expect(expanded.minX).toBeCloseTo(-0.0001);
    });

    it('should handle very large bboxes', () => {
      const bbox = { minX: -1e10, minY: -1e10, maxX: 1e10, maxY: 1e10 };

      const area = bboxArea(bbox);
      expect(area).toBe(4e20);
    });

    it('should handle bboxes with extreme aspect ratios', () => {
      const tallBBox = { minX: 0, minY: 0, maxX: 1, maxY: 1000 };
      const wideBBox = { minX: 0, minY: 0, maxX: 1000, maxY: 1 };

      expect(bboxArea(tallBBox)).toBe(1000);
      expect(bboxArea(wideBBox)).toBe(1000);
    });
  });
});
