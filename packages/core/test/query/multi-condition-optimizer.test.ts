/**
 * 多条件优化器测试
 *
 * 验证 BBox 合并策略和条件优先级排序功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MultiConditionOptimizer, optimizeMultiConditions, getOptimizationAdvice } from '../../src/query/multi-condition-optimizer';
import type { SpatialQueryCondition, Geometry, Point, Polygon } from '../../src/types';

describe('多条件优化器测试', () => {
  let optimizer: MultiConditionOptimizer;

  const testPoint: Point = { type: 'Point', coordinates: [1, 1] };
  const testPolygon1: Polygon = {
    type: 'Polygon',
    coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
  };

  const testPolygon2: Polygon = {
    type: 'Polygon',
    coordinates: [[[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]]
  };

  const testPolygon3: Polygon = {
    type: 'Polygon',
    coordinates: [[[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]]]
  };

  beforeEach(() => {
    optimizer = new MultiConditionOptimizer();
  });

  describe('单条件优化', () => {
    it('应该处理单条件情况', () => {
      const conditions: SpatialQueryCondition[] = [
        {
          field: 'geometry',
          predicate: 'intersects',
          geometry: testPolygon1
        }
      ];

      const result = optimizer.optimize(conditions);

      expect(result.strategy).toBe('single-condition');
      expect(result.executionOrder).toEqual([0]);
      expect(result.mergedBBox).toBeDefined();
      expect(result.expectedImprovement).toBe(0);
    });
  });

  describe('多条件优化 - 交集策略', () => {
    it('应该正确识别相交条件并使用交集策略', () => {
      const conditions: SpatialQueryCondition[] = [
        {
          field: 'geometry',
          predicate: 'intersects',
          geometry: testPolygon1
        },
        {
          field: 'geometry',
          predicate: 'intersects',
          geometry: testPolygon2
        }
      ];

      const result = optimizer.optimize(conditions);

      expect(result.strategy).toBe('intersection-merge');
      expect(result.mergedBBox).toBeDefined();
      expect(result.executionOrder.length).toBe(2);
      expect(result.expectedImprovement).toBeGreaterThan(1);
    });

    it('应该正确计算交集边界框', () => {
      const conditions: SpatialQueryCondition[] = [
        {
          field: 'geometry',
          predicate: 'intersects',
          geometry: testPolygon1
        },
        {
          field: 'geometry',
          predicate: 'intersects',
          geometry: testPolygon2
        }
      ];

      const result = optimizer.optimize(conditions);

      if (result.mergedBBox) {
        // 交集应该在两个多边形的重叠区域
        expect(result.mergedBBox.minX).toBeGreaterThan(0);
        expect(result.mergedBBox.maxX).toBeLessThan(3);
        expect(result.mergedBBox.minY).toBeGreaterThan(0);
        expect(result.mergedBBox.maxY).toBeLessThan(3);
      }
    });
  });

  describe('多条件优化 - 混合策略', () => {
    it('应该处理混合谓词类型', () => {
      const conditions: SpatialQueryCondition[] = [
        {
          field: 'geometry',
          predicate: 'intersects',
          geometry: testPolygon1
        },
        {
          field: 'geometry',
          predicate: 'contains',
          geometry: testPolygon2
        }
      ];

      const result = optimizer.optimize(conditions);

      expect(result.strategy).toBe('hybrid-merge');
      expect(result.mergedBBox).toBeDefined();
    });

    it('应该处理包含分离条件的查询', () => {
      const conditions: SpatialQueryCondition[] = [
        {
          field: 'geometry',
          predicate: 'intersects',
          geometry: testPolygon1
        },
        {
          field: 'geometry',
          predicate: 'disjoint',
          geometry: testPolygon3 // 远离的多边形
        }
      ];

      const result = optimizer.optimize(conditions);

      expect(result.strategy).toBe('hybrid-merge');
      expect(result.mergedBBox).toBeDefined();
    });
  });

  describe('条件优先级排序', () => {
    it('应该按选择性排序条件', () => {
      const conditions: SpatialQueryCondition[] = [
        {
          field: 'geometry',
          predicate: 'intersects', // 中等选择性
          geometry: testPolygon1
        },
        {
          field: 'geometry',
          predicate: 'equals', // 高选择性
          geometry: testPoint
        },
        {
          field: 'geometry',
          predicate: 'disjoint', // 低选择性
          geometry: testPolygon3
        }
      ];

      const result = optimizer.optimize(conditions);

      // equals 应该先于 intersects
      const equalsIndex = result.executionOrder.indexOf(1);
      const intersectsIndex = result.executionOrder.indexOf(0);

      expect(equalsIndex).toBeLessThan(intersectsIndex);
    });

    it('应该优化执行顺序以提升性能', () => {
      const conditions: SpatialQueryCondition[] = [
        {
          field: 'geometry',
          predicate: 'intersects',
          geometry: testPolygon1
        },
        {
          field: 'geometry',
          predicate: 'within',
          geometry: testPolygon2
        }
      ];

      const result = optimizer.optimize(conditions);

      expect(result.executionOrder.length).toBe(2);
      expect(result.expectedImprovement).toBeGreaterThan(1);
    });
  });

  describe('优化建议', () => {
    it('应该提供有用的优化建议', () => {
      const conditions: SpatialQueryCondition[] = [
        {
          field: 'geometry',
          predicate: 'intersects',
          geometry: testPolygon1
        },
        {
          field: 'geometry',
          predicate: 'contains',
          geometry: testPolygon2
        }
      ];

      const advice = optimizer.getOptimizationAdvice(conditions);

      expect(advice.advice).toBeDefined();
      expect(advice.reasons.length).toBeGreaterThan(0);
      expect(advice.suggestions.length).toBeGreaterThan(0);
    });

    it('应该针对高选择性条件给出建议', () => {
      const conditions: SpatialQueryCondition[] = [
        {
          field: 'geometry',
          predicate: 'equals',
          geometry: testPoint
        },
        {
          field: 'geometry',
          predicate: 'intersects',
          geometry: testPolygon1
        }
      ];

      const advice = optimizer.getOptimizationAdvice(conditions);

      expect(advice.reasons.some(r => r.includes('高选择性'))).toBe(true);
      expect(advice.suggestions.some(s => s.includes('优先执行'))).toBe(true);
    });
  });

  describe('性能预期', () => {
    it('应该正确计算预期性能提升', () => {
      const conditions: SpatialQueryCondition[] = [
        {
          field: 'geometry',
          predicate: 'intersects',
          geometry: testPolygon1
        },
        {
          field: 'geometry',
          predicate: 'intersects',
          geometry: testPolygon2
        }
      ];

      const result = optimizer.optimize(conditions);

      expect(result.expectedImprovement).toBeGreaterThanOrEqual(1.0);
      expect(result.expectedImprovement).toBeLessThanOrEqual(3.0);
    });

    it('多条件查询应该有显著性能提升', () => {
      const conditions: SpatialQueryCondition[] = [
        {
          field: 'geometry',
          predicate: 'contains',
          geometry: testPolygon1
        },
        {
          field: 'geometry',
          predicate: 'within',
          geometry: testPolygon2
        },
        {
          field: 'geometry',
          predicate: 'intersects',
          geometry: testPolygon1
        }
      ];

      const result = optimizer.optimize(conditions);

      // 3个条件应该有显著的性能提升
      expect(result.expectedImprovement).toBeGreaterThan(1.5);
    });
  });

  describe('边界情况', () => {
    it('应该处理空条件数组', () => {
      const result = optimizer.optimize([]);

      expect(result.strategy).toBe('single-condition');
      expect(result.mergedBBox).toBeNull();
      expect(result.executionOrder).toEqual([]);
      expect(result.expectedImprovement).toBe(0);
    });

    it('应该处理不重叠的条件', () => {
      const farPolygon: Polygon = {
        type: 'Polygon',
        coordinates: [[[100, 100], [102, 100], [102, 102], [100, 102], [100, 100]]]
      };

      const conditions: SpatialQueryCondition[] = [
        {
          field: 'geometry',
          predicate: 'intersects',
          geometry: testPolygon1
        },
        {
          field: 'geometry',
          predicate: 'intersects',
          geometry: farPolygon
        }
      ];

      const result = optimizer.optimize(conditions);

      // 应该回退到并集策略
      expect(result.mergedBBox).toBeDefined();
      expect(result.expectedImprovement).toBeGreaterThan(0);
    });
  });
});

describe('快速优化函数测试', () => {
  it('optimizeMultiConditions 应该提供简化的接口', () => {
    const conditions: SpatialQueryCondition[] = [
      {
        field: 'geometry',
        predicate: 'intersects',
        geometry: { type: 'Point', coordinates: [1, 1] }
      }
    ];

    const result = optimizeMultiConditions(conditions);

    expect(result).toBeDefined();
    expect(result.strategy).toBe('single-condition');
  });

  it('getOptimizationAdvice 应该提供优化建议', () => {
    const conditions: SpatialQueryCondition[] = [
      {
        field: 'geometry',
        predicate: 'intersects',
        geometry: { type: 'Point', coordinates: [1, 1] }
      },
      {
        field: 'geometry',
        predicate: 'contains',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
        }
      }
    ];

    const advice = getOptimizationAdvice(conditions);

    expect(advice.advice).toBeDefined();
    expect(advice.reasons).toBeDefined();
    expect(advice.suggestions).toBeDefined();
  });
});
