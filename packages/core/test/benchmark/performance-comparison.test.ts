/**
 * 性能基准对比测试
 *
 * 对比优化前后的性能，验证性能提升目标
 */

import { describe, bench, beforeAll } from 'vitest';
import { TurfEngine } from '../../../src/spatial/engines/turf-engine';
import { EngineRegistry } from '../../../src/spatial/engine-registry';
import { intersectsOptimized, containsOptimized, withinOptimized } from '../../../src/spatial/predicates/optimized-predicates';
import { touchesOptimized, overlapsOptimized } from '../../../src/spatial/predicates/advanced/advanced-predicates';
import { OptimizedBuffer, OptimizedDistance } from '../../../src/spatial/topology/optimized-buffer';
import type { Geometry, Point, LineString, Polygon } from '../../../src/types';

describe('性能基准对比测试', () => {
  let engine: TurfEngine;
  let optimizedBuffer: OptimizedBuffer;
  let optimizedDistance: OptimizedDistance;

  beforeAll(() => {
    engine = new TurfEngine();
    optimizedBuffer = new OptimizedBuffer(engine);
    optimizedDistance = new OptimizedDistance(engine);
  });

  // 测试数据
  const point1: Point = { type: 'Point', coordinates: [0, 0] };
  const point2: Point = { type: 'Point', coordinates: [1, 1] };
  const point3: Point = { type: 'Point', coordinates: [0.5, 0.5] };

  const line1: LineString = {
    type: 'LineString',
    coordinates: [[0, 0], [1, 1], [2, 0]]
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
      Array.from({ length: 100 }, (_, i) => {
        const angle = (i / 100) * Math.PI * 2;
        return [Math.cos(angle) * 10, Math.sin(angle) * 10] as [number, number];
      })
    ]
  };

  // 大型测试数据集
  const largePointSet: Point[] = Array.from({ length: 1000 }, (_, i) => ({
    type: 'Point',
    coordinates: [Math.random() * 100, Math.random() * 100]
  }));

  describe('Intersects 性能对比', () => {
    describe('点-点相交', () => {
      bench('引擎版本', () => {
        engine.intersects(point1, point2);
      });

      bench('优化版本', () => {
        intersectsOptimized(point1, point2);
      });
    });

    describe('点-线相交', () => {
      bench('引擎版本', () => {
        engine.intersects(point3, line1);
      });

      bench('优化版本', () => {
        intersectsOptimized(point3, line1);
      });
    });

    describe('点-面相交', () => {
      bench('引擎版本', () => {
        engine.intersects(point3, polygon1);
      });

      bench('优化版本', () => {
        intersectsOptimized(point3, polygon1);
      });
    });

    describe('面-面相交', () => {
      bench('引擎版本', () => {
        engine.intersects(polygon1, polygon2);
      });

      bench('优化版本', () => {
        intersectsOptimized(polygon1, polygon2);
      });
    });
  });

  describe('Contains 性能对比', () => {
    describe('面包含点', () => {
      bench('引擎版本', () => {
        engine.contains(polygon1, point3);
      });

      bench('优化版本', () => {
        containsOptimized(polygon1, point3);
      });
    });

    describe('面包含线', () => {
      bench('引擎版本', () => {
        engine.contains(polygon1, line1);
      });

      bench('优化版本', () => {
        containsOptimized(polygon1, line1);
      });
    });
  });

  describe('Within 性能对比', () => {
    describe('点在面内', () => {
      bench('引擎版本', () => {
        engine.within(point3, polygon1);
      });

      bench('优化版本', () => {
        withinOptimized(point3, polygon1);
      });
    });
  });

  describe('高级谓词性能对比', () => {
    describe('Touches 谓词', () => {
      bench('引擎版本', () => {
        engine.touches(point1, line1);
      });

      bench('优化版本', () => {
        touchesOptimized(point1, line1);
      });
    });

    describe('Overlaps 谓词', () => {
      bench('引擎版本', () => {
        engine.overlaps(polygon1, polygon2);
      });

      bench('优化版本', () => {
        overlapsOptimized(polygon1, polygon2);
      });
    });
  });

  describe('Buffer 操作性能对比', () => {
    describe('小距离缓冲（近似）', () => {
      bench('引擎版本', () => {
        engine.buffer(point1, 50, 'meters');
      });

      bench('优化版本（近似）', () => {
        optimizedBuffer.buffer(point1, 50, 'approximate');
      });
    });

    describe('中等距离缓冲（平衡）', () => {
      bench('引擎版本', () => {
        engine.buffer(point1, 200, 'meters');
      });

      bench('优化版本（平衡）', () => {
        optimizedBuffer.buffer(point1, 200, 'balanced');
      });
    });

    describe('大距离缓冲（精确）', () => {
      bench('引擎版本', () => {
        engine.buffer(point1, 1000, 'meters');
      });

      bench('优化版本（精确）', () => {
        optimizedBuffer.buffer(point1, 1000, 'exact');
      });
    });
  });

  describe('距离计算性能对比', () => {
    describe('点-点距离（欧氏）', () => {
      bench('引擎版本', () => {
        engine.distance(point1, point2, 'meters');
      });

      bench('优化版本（欧氏）', () => {
        optimizedDistance.distance(point1, point2, 'euclidean');
      });
    });

    describe('点-点距离（Haversine）', () => {
      bench('引擎版本', () => {
        engine.distance(point1, point2, 'meters');
      });

      bench('优化版本（Haversine）', () => {
        optimizedDistance.distance(point1, point2, 'haversine');
      });
    });
  });

  describe('批量操作性能对比', () => {
    describe('1000个点相交检查', () => {
      bench('引擎版本', () => {
        for (const point of largePointSet) {
          engine.intersects(point, polygon1);
        }
      });

      bench('优化版本', () => {
        for (const point of largePointSet) {
          intersectsOptimized(point, polygon1);
        }
      });
    });

    describe('100个点距离计算', () => {
      const samplePoints = largePointSet.slice(0, 100);

      bench('引擎版本', () => {
        for (const point of samplePoints) {
          engine.distance(point1, point, 'meters');
        }
      });

      bench('优化版本', () => {
        optimizedDistance.batchDistance(point1, samplePoints);
      });
    });
  });

  describe('边界框优化效果', () => {
    const farPoint: Point = { type: 'Point', coordinates: [1000, 1000] };

    describe('不相交对象（早期退出）', () => {
      bench('引擎版本', () => {
        engine.intersects(farPoint, polygon1);
      });

      bench('优化版本', () => {
        intersectsOptimized(farPoint, polygon1);
      });
    });
  });

  describe('内存使用效率', () => {
    describe('连续调用 Intersects', () => {
      bench('引擎版本', () => {
        for (let i = 0; i < 1000; i++) {
          engine.intersects(point1, line1);
        }
      });

      bench('优化版本', () => {
        for (let i = 0; i < 1000; i++) {
          intersectsOptimized(point1, line1);
        }
      });
    });
  });
});

/**
 * 性能基准测试总结
 *
 * 运行方式：
 * npm run test -- benchmark/performance-comparison.test.ts
 *
 * 预期结果：
 * - 简单几何（点-点、点-线）：2-5x 性能提升
 * - 复杂几何（面-面）：1.5-3x 性能提升
 * - 批量操作：3-5x 性能提升
 * - 边界框优化：5-10x 性能提升
 * - Buffer 操作：2-4x 性能提升
 * - 距离计算：3-5x 性能提升
 *
 * 性能指标：
 * - 简单谓词：< 1ms（优化前 < 5ms）
 * - 复杂谓词：< 10ms（优化前 < 30ms）
 * - 批量操作：线性增长，内存使用稳定
 */
