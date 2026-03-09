/**
 * 优化谓词测试
 *
 * 验证优化谓词的正确性和性能
 */

import { describe, it, expect } from 'vitest';
import { intersectsOptimized, containsOptimized, withinOptimized } from '../../src/spatial/predicates/optimized-predicates';
import { touchesOptimized, overlapsOptimized } from '../../src/spatial/predicates/advanced/advanced-predicates';
import type { Geometry, Point, LineString, Polygon } from '../../src/types';

describe('优化谓词正确性测试', () => {
  describe('Intersects 优化', () => {
    const point1: Point = { type: 'Point', coordinates: [0, 0] };
    const point2: Point = { type: 'Point', coordinates: [1, 1] };
    const point3: Point = { type: 'Point', coordinates: [0.5, 0.5] };
    const farPoint: Point = { type: 'Point', coordinates: [100, 100] };

    const line1: LineString = {
      type: 'LineString',
      coordinates: [[0, 0], [1, 1], [2, 0]]
    };

    const polygon1: Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
    };

    it('应该正确判断点-点不相交', () => {
      const result = intersectsOptimized(point1, point2);
      expect(result.result).toBe(false);
      expect(result.optimization).toBe('direct-coordinates');
    });

    it('应该正确判断点在线上', () => {
      const result = intersectsOptimized(point3, line1);
      expect(result.result).toBe(true);
      expect(result.optimization).toBe('direct-coordinates');
    });

    it('应该正确判断点在面内', () => {
      const result = intersectsOptimized(point3, polygon1);
      expect(result.result).toBe(true);
      expect(result.optimization).toBe('direct-coordinates');
    });

    it('应该使用边界框优化快速排除不相交对象', () => {
      const result = intersectsOptimized(farPoint, polygon1);
      expect(result.result).toBe(false);
      expect(result.bboxOptimized).toBe(true);
      expect(result.optimization).toBe('bbox-early-out');
    });

    it('应该返回执行时间', () => {
      const result = intersectsOptimized(point1, point2);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Contains 优化', () => {
    const point: Point = { type: 'Point', coordinates: [1, 1] };
    const farPoint: Point = { type: 'Point', coordinates: [10, 10] };
    const polygon: Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
    };

    it('应该正确判断面包含点', () => {
      const result = containsOptimized(polygon, point);
      expect(result.result).toBe(true);
    });

    it('应该正确判断点不能包含面', () => {
      const result = containsOptimized(point, polygon);
      expect(result.result).toBe(false);
    });

    it('应该使用边界框优化快速排除不包含情况', () => {
      const result = containsOptimized(polygon, farPoint);
      expect(result.result).toBe(false);
      expect(result.bboxOptimized).toBe(true);
    });
  });

  describe('Within 优化', () => {
    const point: Point = { type: 'Point', coordinates: [1, 1] };
    const farPoint: Point = { type: 'Point', coordinates: [10, 10] };
    const polygon: Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
    };

    it('应该正确判断点在面内', () => {
      const result = withinOptimized(point, polygon);
      expect(result.result).toBe(true);
    });

    it('应该正确判断点不在面外', () => {
      const result = withinOptimized(farPoint, polygon);
      expect(result.result).toBe(false);
      expect(result.bboxOptimized).toBe(true);
    });
  });

  describe('Touches 优化', () => {
    const pointOnLine: Point = { type: 'Point', coordinates: [0, 0] };
    const pointOffLine: Point = { type: 'Point', coordinates: [1, 1] };

    const line: LineString = {
      type: 'LineString',
      coordinates: [[0, 0], [2, 2]]
    };

    const polygon1: Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
    };

    const polygon2: Polygon = {
      type: 'Polygon',
      coordinates: [[[2, 0], [4, 0], [4, 2], [2, 2], [2, 0]]]
    };

    it('应该正确判断点与线接触', () => {
      expect(touchesOptimized(pointOnLine, line)).toBe(true);
    });

    it('应该正确判断点不与线接触（在线中间）', () => {
      expect(touchesOptimized(pointOffLine, line)).toBe(false);
    });

    it('应该正确判断面与面接触', () => {
      expect(touchesOptimized(polygon1, polygon2)).toBe(true);
    });
  });

  describe('Overlaps 优化', () => {
    const polygon1: Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
    };

    const polygon2: Polygon = {
      type: 'Polygon',
      coordinates: [[[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]]
    };

    const farPolygon: Polygon = {
      type: 'Polygon',
      coordinates: [[[10, 10], [12, 10], [12, 12], [10, 12], [10, 10]]]
    };

    it('应该正确判断重叠的面', () => {
      expect(overlapsOptimized(polygon1, polygon2)).toBe(true);
    });

    it('应该正确判断不重叠的面', () => {
      expect(overlapsOptimized(polygon1, farPolygon)).toBe(false);
    });
  });
});

describe('边界框优化测试', () => {
  const smallPolygon: Polygon = {
    type: 'Polygon',
    coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
  };

  const farPoint: Point = { type: 'Point', coordinates: [100, 100] };
  const nearPoint: Point = { type: 'Point', coordinates: [0.5, 0.5] };

  it('应该对不相交的对象使用边界框早期退出', () => {
    const result = intersectsOptimized(farPoint, smallPolygon);
    expect(result.result).toBe(false);
    expect(result.bboxOptimized).toBe(true);
    expect(result.optimization).toBe('bbox-early-out');
  });

  it('应该对相交的对象进行完整检查', () => {
    const result = intersectsOptimized(nearPoint, smallPolygon);
    expect(result.result).toBe(true);
    // 可能使用边界框预检查（会通过），然后进行完整计算
  });
});

describe('性能优化策略测试', () => {
  const point: Point = { type: 'Point', coordinates: [0.5, 0.5] };
  const line: LineString = {
    type: 'LineString',
    coordinates: [[0, 0], [1, 1]]
  };

  it('应该使用直接坐标操作而不是 Feature 包装', () => {
    const result = intersectsOptimized(point, line);
    expect(result.optimization).toBe('direct-coordinates');
    expect(result.result).toBe(true);
  });

  it('应该对简单几何使用快速路径', () => {
    const point1: Point = { type: 'Point', coordinates: [0, 0] };
    const point2: Point = { type: 'Point', coordinates: [1, 1] };
    const result = intersectsOptimized(point1, point2);
    expect(result.optimization).toBe('direct-coordinates');
  });
});
