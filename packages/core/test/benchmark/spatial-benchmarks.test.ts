/**
 * 空间谓词性能基准测试
 *
 * 测试各个空间谓词的性能，验证优化效果
 */

import { describe, bench, beforeAll } from 'vitest';
import { TurfEngine } from '../../src/spatial/engines/turf-engine';
import { intersectsOptimized, containsOptimized, withinOptimized } from '../../src/spatial/predicates/optimized-predicates';
import { touchesOptimized, overlapsOptimized } from '../../src/spatial/predicates/advanced/advanced-predicates';
import type { Geometry, Point, LineString, Polygon } from '../../src/types';

// 创建测试引擎
const engine = new TurfEngine();

// 测试几何数据
const point1: Point = { type: 'Point', coordinates: [0, 0] };
const point2: Point = { type: 'Point', coordinates: [1, 1] };
const point3: Point = { type: 'Point', coordinates: [0.5, 0.5] };

const line1: LineString = {
  type: 'LineString',
  coordinates: [[0, 0], [1, 1], [2, 0]]
};

const line2: LineString = {
  type: 'LineString',
  coordinates: [[0, 1], [1, 0], [2, 1]]
};

const polygon1: Polygon = {
  type: 'Polygon',
  coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
};

const polygon2: Polygon = {
  type: 'Polygon',
  coordinates: [[[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]]
};

const complexPolygon: Polygon = {
  type: 'Polygon',
  coordinates: [
    // 外环（100个顶点）
    Array.from({ length: 100 }, (_, i) => {
      const angle = (i / 100) * Math.PI * 2;
      return [
        Math.cos(angle) * 10,
        Math.sin(angle) * 10
      ];
    })
  ]
};

// 大型测试数据集
const largePointSet: Point[] = Array.from({ length: 1000 }, (_, i) => ({
  type: 'Point',
  coordinates: [Math.random() * 100, Math.random() * 100]
}));

const largeLineSet: LineString[] = Array.from({ length: 100 }, (_, i) => ({
  type: 'LineString',
  coordinates: [
    [Math.random() * 100, Math.random() * 100],
    [Math.random() * 100, Math.random() * 100],
    [Math.random() * 100, Math.random() * 100]
  ]
}));

describe('空间谓词性能基准测试', () => {
  describe('Intersects 谓词', () => {
    bench('点-点相交（引擎）', () => {
      engine.intersects(point1, point2);
    });

    bench('点-点相交（优化）', () => {
      intersectsOptimized(point1, point2);
    });

    bench('点-线相交（引擎）', () => {
      engine.intersects(point1, line1);
    });

    bench('点-线相交（优化）', () => {
      intersectsOptimized(point1, line1);
    });

    bench('面-面相交（引擎）', () => {
      engine.intersects(polygon1, polygon2);
    });

    bench('面-面相交（优化）', () => {
      intersectsOptimized(polygon1, polygon2);
    });

    bench('复杂面相交（引擎）', () => {
      engine.intersects(complexPolygon, polygon1);
    });

    bench('复杂面相交（优化）', () => {
      intersectsOptimized(complexPolygon, polygon1);
    });
  });

  describe('Contains 谓词', () => {
    bench('面包含点（引擎）', () => {
      engine.contains(polygon1, point3);
    });

    bench('面包含点（优化）', () => {
      containsOptimized(polygon1, point3);
    });

    bench('面包含线（引擎）', () => {
      engine.contains(polygon1, line1);
    });

    bench('面包含线（优化）', () => {
      containsOptimized(polygon1, line1);
    });
  });

  describe('Within 谓词', () => {
    bench('点在面内（引擎）', () => {
      engine.within(point3, polygon1);
    });

    bench('点在面内（优化）', () => {
      withinOptimized(point3, polygon1);
    });

    bench('面在面内（引擎）', () => {
      engine.within(polygon1, polygon2);
    });

    bench('面在面内（优化）', () => {
      withinOptimized(polygon1, polygon2);
    });
  });

  describe('Touches 谓词', () => {
    bench('点-线接触（引擎）', () => {
      engine.touches(point1, line1);
    });

    bench('点-线接触（优化）', () => {
      touchesOptimized(point1, line1);
    });

    bench('线-线接触（引擎）', () => {
      engine.touches(line1, line2);
    });

    bench('线-线接触（优化）', () => {
      touchesOptimized(line1, line2);
    });
  });

  describe('Overlaps 谓词', () => {
    bench('面-面重叠（引擎）', () => {
      engine.overlaps(polygon1, polygon2);
    });

    bench('面-面重叠（优化）', () => {
      overlapsOptimized(polygon1, polygon2);
    });
  });

  describe('批量操作性能', () => {
    bench('1000个点相交检查（引擎）', () => {
      for (const point of largePointSet) {
        engine.intersects(point, polygon1);
      }
    });

    bench('1000个点相交检查（优化）', () => {
      for (const point of largePointSet) {
        intersectsOptimized(point, polygon1);
      }
    });

    bench('100条线相交检查（引擎）', () => {
      for (const line of largeLineSet) {
        engine.intersects(line, polygon1);
      }
    });

    bench('100条线相交检查（优化）', () => {
      for (const line of largeLineSet) {
        intersectsOptimized(line, polygon1);
      }
    });
  });

  describe('边界框优化效果', () => {
    // 不相交的几何对象（应该触发边界框早期退出）
    const farPoint: Point = { type: 'Point', coordinates: [1000, 1000] };
    const farLine: LineString = {
      type: 'LineString',
      coordinates: [[1000, 1000], [1100, 1100]]
    };

    bench('不相交点-面（引擎）', () => {
      engine.intersects(farPoint, polygon1);
    });

    bench('不相交点-面（优化）', () => {
      intersectsOptimized(farPoint, polygon1);
    });

    bench('不相交线-面（引擎）', () => {
      engine.intersects(farLine, polygon1);
    });

    bench('不相交线-面（优化）', () => {
      intersectsOptimized(farLine, polygon1);
    });
  });

  describe('内存使用效率', () => {
    bench('连续调用 Intersects（引擎）', () => {
      for (let i = 0; i < 1000; i++) {
        engine.intersects(point1, line1);
      }
    });

    bench('连续调用 Intersects（优化）', () => {
      for (let i = 0; i < 1000; i++) {
        intersectsOptimized(point1, line1);
      }
    });
  });
});

/**
 * 性能基准测试总结
 *
 * 运行方式：
 * npm run test -- benchmark/spatial-benchmarks.test.ts
 *
 * 预期结果：
 * - 优化版本应该比引擎版本快 50-70%
 * - 边界框早期退出应该有显著效果
 * - 批量操作应该显示出更大的性能优势
 *
 * 性能指标：
 * - 简单几何： < 1ms
 * - 复杂几何： < 10ms
 * - 批量操作：线性增长
 */
