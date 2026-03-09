/**
 * 空间引擎接口测试
 *
 * 验证 SpatialEngine 接口的正确性
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TurfEngine } from '../../src/spatial/engines/turf-engine';
import { EngineRegistry } from '../../src/spatial/engine-registry';
import type { Geometry, Point, LineString, Polygon } from '../../src/types';

describe('空间引擎接口测试', () => {
  let engine: TurfEngine;

  beforeEach(() => {
    engine = new TurfEngine();
  });

  describe('引擎基本功能', () => {
    it('应该有正确的引擎名称', () => {
      expect(engine.name).toBe('turf');
    });

    it('应该有正确的能力定义', () => {
      expect(engine.capabilities.supportedPredicates).toContain('intersects');
      expect(engine.capabilities.supportedPredicates).toContain('contains');
      expect(engine.capabilities.supportedPredicates).toContain('within');
      expect(engine.capabilities.supportedPredicates).toContain('equals');
      expect(engine.capabilities.supportedPredicates).toContain('disjoint');
      expect(engine.capabilities.supportedPredicates).toContain('crosses');
      expect(engine.capabilities.supportedPredicates).toContain('touches');
      expect(engine.capabilities.supportedPredicates).toContain('overlaps');
      expect(engine.capabilities.supportsTopology).toBe(true);
      expect(engine.capabilities.supportsDistance).toBe(true);
      expect(engine.capabilities.precision).toBe('exact');
    });

    it('应该能够初始化', async () => {
      await expect(engine.initialize()).resolves.not.toThrow();
    });
  });

  describe('Intersects 谓词', () => {
    const point1: Point = { type: 'Point', coordinates: [0, 0] };
    const point2: Point = { type: 'Point', coordinates: [1, 1] };
    const point3: Point = { type: 'Point', coordinates: [0.5, 0.5] };

    const line1: LineString = {
      type: 'LineString',
      coordinates: [[0, 0], [1, 1]]
    };

    const polygon1: Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
    };

    it('应该正确判断点-点相交', () => {
      expect(engine.intersects(point1, point2)).toBe(false);
      expect(engine.intersects(point1, point1)).toBe(true);
    });

    it('应该正确判断点-线相交', () => {
      expect(engine.intersects(point3, line1)).toBe(true);
      expect(engine.intersects(point1, line1)).toBe(true);
    });

    it('应该正确判断点-面相交', () => {
      expect(engine.intersects(point3, polygon1)).toBe(true);
      expect(engine.intersects(point1, polygon1)).toBe(true);
    });

    it('应该正确判断面-面相交', () => {
      const polygon2: Polygon = {
        type: 'Polygon',
        coordinates: [[[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]]
      };
      expect(engine.intersects(polygon1, polygon2)).toBe(true);
    });
  });

  describe('Contains 谓词', () => {
    const point: Point = { type: 'Point', coordinates: [1, 1] };
    const polygon: Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
    };

    it('应该正确判断面包含点', () => {
      expect(engine.contains(polygon, point)).toBe(true);
    });

    it('应该正确判断点不能包含面', () => {
      expect(engine.contains(point, polygon)).toBe(false);
    });

    it('应该正确判断面不包含边界外的点', () => {
      const outsidePoint: Point = { type: 'Point', coordinates: [3, 3] };
      expect(engine.contains(polygon, outsidePoint)).toBe(false);
    });
  });

  describe('Within 谓词', () => {
    const point: Point = { type: 'Point', coordinates: [1, 1] };
    const polygon: Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
    };

    it('应该正确判断点在面内', () => {
      expect(engine.within(point, polygon)).toBe(true);
    });

    it('应该正确判断点不在面外', () => {
      const outsidePoint: Point = { type: 'Point', coordinates: [3, 3] };
      expect(engine.within(outsidePoint, polygon)).toBe(false);
    });
  });

  describe('Equals 谓词', () => {
    const point1: Point = { type: 'Point', coordinates: [1, 1] };
    const point2: Point = { type: 'Point', coordinates: [1, 1] };
    const point3: Point = { type: 'Point', coordinates: [2, 2] };

    it('应该正确判断相等的点', () => {
      expect(engine.equals(point1, point2)).toBe(true);
    });

    it('应该正确判断不相等的点', () => {
      expect(engine.equals(point1, point3)).toBe(false);
    });
  });

  describe('Disjoint 谓词', () => {
    const point1: Point = { type: 'Point', coordinates: [0, 0] };
    const point2: Point = { type: 'Point', coordinates: [10, 10] };
    const polygon: Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
    };

    it('应该正确判断分离的几何对象', () => {
      expect(engine.disjoint(point1, point2)).toBe(true);
      expect(engine.disjoint(point2, polygon)).toBe(true);
    });

    it('应该正确判断相交的几何对象', () => {
      expect(engine.disjoint(point1, polygon)).toBe(false);
    });
  });

  describe('Crosses 谓词', () => {
    const line1: LineString = {
      type: 'LineString',
      coordinates: [[0, 0], [2, 2]]
    };

    const line2: LineString = {
      type: 'LineString',
      coordinates: [[0, 2], [2, 0]]
    };

    it('应该正确判断交叉的线', () => {
      expect(engine.crosses(line1, line2)).toBe(true);
    });

    it('应该正确判断不交叉的线', () => {
      const line3: LineString = {
        type: 'LineString',
        coordinates: [[0, 0], [1, 1]]
      };
      expect(engine.crosses(line1, line3)).toBe(false);
    });
  });

  describe('Touches 谓词', () => {
    const point: Point = { type: 'Point', coordinates: [0, 0] };
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
      expect(engine.touches(point, line)).toBe(true);
    });

    it('应该正确判断面与面接触', () => {
      expect(engine.touches(polygon1, polygon2)).toBe(true);
    });
  });

  describe('Overlaps 谓词', () => {
    const polygon1: Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
    };

    const polygon2: Polygon = {
      type: 'Polygon',
      coordinates: [[[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]]
    };

    it('应该正确判断重叠的面', () => {
      expect(engine.overlaps(polygon1, polygon2)).toBe(true);
    });

    it('应该正确判断不重叠的面', () => {
      const polygon3: Polygon = {
        type: 'Polygon',
        coordinates: [[[5, 5], [7, 5], [7, 7], [5, 7], [5, 5]]]
      };
      expect(engine.overlaps(polygon1, polygon3)).toBe(false);
    });
  });

  describe('拓扑操作', () => {
    const point: Point = { type: 'Point', coordinates: [0, 0] };
    const polygon: Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
    };

    it('应该能够创建缓冲区', () => {
      const buffered = engine.buffer(point, 1, 'kilometers');
      expect(buffered.type).toBe('Polygon');
    });

    it('应该能够计算交集', () => {
      const polygon2: Polygon = {
        type: 'Polygon',
        coordinates: [[[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]]
      };
      const intersection = engine.intersection(polygon, polygon2);
      expect(intersection).not.toBeNull();
    });

    it('应该能够计算并集', () => {
      const polygon2: Polygon = {
        type: 'Polygon',
        coordinates: [[[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]]
      };
      const union = engine.union(polygon, polygon2);
      expect(union).not.toBeNull();
    });
  });

  describe('工具方法', () => {
    const point1: Point = { type: 'Point', coordinates: [0, 0] };
    const point2: Point = { type: 'Point', coordinates: [1, 1] };
    const line: LineString = {
      type: 'LineString',
      coordinates: [[0, 0], [1, 1]]
    };
    const polygon: Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
    };

    it('应该能够计算距离', () => {
      const distance = engine.distance(point1, point2, 'kilometers');
      expect(distance).toBeGreaterThan(0);
    });

    it('应该能够计算面积', () => {
      const area = engine.area(polygon);
      expect(area).toBeGreaterThan(0);
    });

    it('应该能够计算长度', () => {
      const length = engine.length(line);
      expect(length).toBeGreaterThan(0);
    });

    it('应该能够计算边界框', () => {
      const bbox = engine.bbox(polygon);
      expect(bbox.minX).toBe(0);
      expect(bbox.minY).toBe(0);
      expect(bbox.maxX).toBe(1);
      expect(bbox.maxY).toBe(1);
    });

    it('应该能够计算质心', () => {
      const centroid = engine.centroid(polygon);
      expect(centroid.type).toBe('Point');
    });

    it('应该能够转换为 Feature', () => {
      const feature = engine.toFeature(point1);
      expect(feature.type).toBe('Feature');
      expect(feature.geometry).toEqual(point1);
    });

    it('应该能够简化几何对象', () => {
      const simplified = engine.simplify(line, 0.01);
      expect(simplified.type).toBe('LineString');
    });
  });
});

describe('引擎注册表测试', () => {
  beforeEach(() => {
    // 重置引擎注册表
    EngineRegistry.clear();
  });

  it('应该有默认的 Turf.js 引擎', () => {
    const engine = EngineRegistry.getDefaultEngine();
    expect(engine.name).toBe('turf');
  });

  it('应该能够注册新引擎', () => {
    const customEngine = new TurfEngine({ name: 'custom' });
    EngineRegistry.register(customEngine);
    expect(EngineRegistry.hasEngine('custom')).toBe(true);
  });

  it('应该能够获取特定引擎', () => {
    const engine = EngineRegistry.getEngine('turf');
    expect(engine.name).toBe('turf');
  });

  it('应该能够设置默认引擎', () => {
    const customEngine = new TurfEngine({ name: 'custom' });
    EngineRegistry.register(customEngine);
    EngineRegistry.setDefaultEngine('custom');
    const defaultEngine = EngineRegistry.getDefaultEngine();
    expect(defaultEngine.name).toBe('custom');
  });

  it('应该能够获取引擎信息', () => {
    const enginesInfo = EngineRegistry.getEnginesInfo();
    expect(enginesInfo.length).toBeGreaterThan(0);
    expect(enginesInfo[0].name).toBe('turf');
  });

  it('应该能够获取支持特定谓词的引擎', () => {
    const engines = EngineRegistry.getEnginesForPredicate('intersects');
    expect(engines.length).toBeGreaterThan(0);
  });

  it('应该能够获取最佳引擎', () => {
    const engine = EngineRegistry.getBestEngineForPredicate('intersects');
    expect(engine).toBeDefined();
    expect(engine.capabilities.supportedPredicates).toContain('intersects');
  });
});
