/**
 * Phase 5: Custom Engine Implementation Tests
 *
 * 测试自定义引擎实现和集成
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SpatialEngine,
  EngineCapabilities
} from '../src/spatial/spatial-engine';
import { EngineRegistry } from '../src/spatial/engine-registry';
import type {
  Geometry,
  Point,
  LineString,
  Polygon,
  Feature
} from '../src/types';

/**
 * 简单自定义引擎 - 仅支持 Point 几何
 */
class SimplePointEngine implements SpatialEngine {
  readonly name = 'simple-point-engine';
  readonly capabilities: EngineCapabilities = {
    supportedPredicates: ['intersects', 'equals', 'disjoint'],
    supportedGeometryTypes: ['Point'],
    supportsTopology: false,
    supportsDistance: true,
    precision: 'approximate' as const
  };

  intersects(g1: Geometry, g2: Geometry): boolean {
    if (g1.type !== 'Point' || g2.type !== 'Point') {
      throw new Error('SimplePointEngine only supports Point geometries');
    }

    const p1 = g1.coordinates;
    const p2 = g2.coordinates;

    // 简单距离检查
    const distance = Math.sqrt(
      Math.pow(p2[0] - p1[0], 2) +
      Math.pow(p2[1] - p1[1], 2)
    );

    return distance < 0.0001;
  }

  equals(g1: Geometry, g2: Geometry): boolean {
    if (g1.type !== 'Point' || g2.type !== 'Point') {
      throw new Error('SimplePointEngine only supports Point geometries');
    }

    const p1 = g1.coordinates;
    const p2 = g2.coordinates;

    return p1[0] === p2[0] && p1[1] === p2[1];
  }

  disjoint(g1: Geometry, g2: Geometry): boolean {
    return !this.intersects(g1, g2);
  }

  // 不支持的谓词
  contains(g1: Geometry, g2: Geometry): boolean {
    throw new Error('Not implemented');
  }

  within(g1: Geometry, g2: Geometry): boolean {
    throw new Error('Not implemented');
  }

  crosses(g1: Geometry, g2: Geometry): boolean {
    throw new Error('Not implemented');
  }

  touches(g1: Geometry, g2: Geometry): boolean {
    throw new Error('Not implemented');
  }

  overlaps(g1: Geometry, g2: Geometry): boolean {
    throw new Error('Not implemented');
  }

  buffer(geometry: Geometry, distance: number): Geometry {
    if (geometry.type !== 'Point') {
      throw new Error('SimplePointEngine only supports Point geometries');
    }

    const [x, y] = geometry.coordinates;
    return {
      type: 'Polygon',
      coordinates: [[
        [x - distance, y - distance],
        [x + distance, y - distance],
        [x + distance, y + distance],
        [x - distance, y + distance],
        [x - distance, y - distance]
      ]]
    };
  }

  intersection(g1: Geometry, g2: Geometry): Geometry | null {
    throw new Error('Not implemented');
  }

  union(g1: Geometry, g2: Geometry): Geometry | null {
    throw new Error('Not implemented');
  }

  difference(g1: Geometry, g2: Geometry): Geometry | null {
    throw new Error('Not implemented');
  }

  toFeature<G extends Geometry, P = any>(geometry: G, properties?: P): Feature<G, P> {
    return {
      type: 'Feature',
      geometry,
      properties: properties || {} as P
    };
  }

  distance(g1: Geometry, g2: Geometry): number {
    if (g1.type !== 'Point' || g2.type !== 'Point') {
      throw new Error('SimplePointEngine only supports Point geometries');
    }

    const p1 = g1.coordinates;
    const p2 = g2.coordinates;

    return Math.sqrt(
      Math.pow(p2[0] - p1[0], 2) +
      Math.pow(p2[1] - p1[1], 2)
    );
  }

  area(geometry: Geometry): number {
    throw new Error('Not implemented');
  }

  length(geometry: Geometry): number {
    throw new Error('Not implemented');
  }

  bbox(geometry: Geometry): [number, number, number, number] {
    if (geometry.type === 'Point') {
      const [x, y] = geometry.coordinates;
      return [x, y, x, y];
    }
    throw new Error('SimplePointEngine only supports Point geometries');
  }

  centroid(geometry: Geometry): Geometry {
    if (geometry.type !== 'Point') {
      throw new Error('SimplePointEngine only supports Point geometries');
    }
    return geometry;
  }

  simplify(geometry: Geometry, tolerance: number): Geometry {
    return geometry;
  }
}

/**
 * 高级自定义引擎 - 支持多种几何类型
 */
class AdvancedEngine implements SpatialEngine {
  readonly name = 'advanced-engine';
  readonly capabilities: EngineCapabilities = {
    supportedPredicates: [
      'intersects', 'contains', 'within', 'equals', 'disjoint',
      'crosses', 'touches', 'overlaps'
    ],
    supportedGeometryTypes: ['Point', 'LineString', 'Polygon'],
    supportsTopology: true,
    supportsDistance: true,
    precision: 'exact' as const
  };

  private cache: Map<string, any> = new Map();

  intersects(g1: Geometry, g2: Geometry): boolean {
    // 使用边界框预检查
    const bbox1 = this.bbox(g1);
    const bbox2 = this.bbox(g2);

    if (!this.bboxIntersects(bbox1, bbox2)) {
      return false;
    }

    // 简化实现：总是返回 true
    return true;
  }

  contains(g1: Geometry, g2: Geometry): boolean {
    return this.intersects(g1, g2);
  }

  within(g1: Geometry, g2: Geometry): boolean {
    return this.contains(g2, g1);
  }

  equals(g1: Geometry, g2: Geometry): boolean {
    return JSON.stringify(g1) === JSON.stringify(g2);
  }

  disjoint(g1: Geometry, g2: Geometry): boolean {
    return !this.intersects(g1, g2);
  }

  crosses(g1: Geometry, g2: Geometry): boolean {
    return false;
  }

  touches(g1: Geometry, g2: Geometry): boolean {
    return false;
  }

  overlaps(g1: Geometry, g2: Geometry): boolean {
    return false;
  }

  buffer(geometry: Geometry, distance: number): Geometry {
    const bbox = this.bbox(geometry);
    const [minX, minY, maxX, maxY] = bbox;

    return {
      type: 'Polygon',
      coordinates: [[
        [minX - distance, minY - distance],
        [maxX + distance, minY - distance],
        [maxX + distance, maxY + distance],
        [minX - distance, maxY + distance],
        [minX - distance, minY - distance]
      ]]
    };
  }

  intersection(g1: Geometry, g2: Geometry): Geometry | null {
    return g1;
  }

  union(g1: Geometry, g2: Geometry): Geometry | null {
    return g1;
  }

  difference(g1: Geometry, g2: Geometry): Geometry | null {
    return g1;
  }

  toFeature<G extends Geometry, P = any>(geometry: G, properties?: P): Feature<G, P> {
    return {
      type: 'Feature',
      geometry,
      properties: properties || {} as P
    };
  }

  distance(g1: Geometry, g2: Geometry): number {
    const bbox1 = this.bbox(g1);
    const bbox2 = this.bbox(g2);

    const cx1 = (bbox1[0] + bbox1[2]) / 2;
    const cy1 = (bbox1[1] + bbox1[3]) / 2;
    const cx2 = (bbox2[0] + bbox2[2]) / 2;
    const cy2 = (bbox2[1] + bbox2[3]) / 2;

    return Math.sqrt(
      Math.pow(cx2 - cx1, 2) +
      Math.pow(cy2 - cy1, 2)
    );
  }

  area(geometry: Geometry): number {
    const bbox = this.bbox(geometry);
    return (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]);
  }

  length(geometry: Geometry): number {
    const bbox = this.bbox(geometry);
    return (bbox[2] - bbox[0]) + (bbox[3] - bbox[1]);
  }

  bbox(geometry: Geometry): [number, number, number, number] {
    const cacheKey = JSON.stringify(geometry);

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let bbox: [number, number, number, number];

    if (geometry.type === 'Point') {
      const [x, y] = geometry.coordinates;
      bbox = [x, y, x, y];
    } else if (geometry.type === 'LineString') {
      const coords = geometry.coordinates;
      const xs = coords.map(c => c[0]);
      const ys = coords.map(c => c[1]);
      bbox = [
        Math.min(...xs),
        Math.min(...ys),
        Math.max(...xs),
        Math.max(...ys)
      ];
    } else {
      // 简化实现
      bbox = [0, 0, 1, 1];
    }

    this.cache.set(cacheKey, bbox);
    return bbox;
  }

  centroid(geometry: Geometry): Geometry {
    const bbox = this.bbox(geometry);
    const cx = (bbox[0] + bbox[2]) / 2;
    const cy = (bbox[1] + bbox[3]) / 2;

    return {
      type: 'Point',
      coordinates: [cx, cy]
    };
  }

  simplify(geometry: Geometry, tolerance: number): Geometry {
    return geometry;
  }

  private bboxIntersects(
    bbox1: [number, number, number, number],
    bbox2: [number, number, number, number]
  ): boolean {
    return !(bbox1[2] < bbox2[0] ||
             bbox1[0] > bbox2[2] ||
             bbox1[3] < bbox2[1] ||
             bbox1[1] > bbox2[3]);
  }
}

describe('Custom Engine Implementation', () => {
  beforeEach(() => {
    // Clear registry before each test
    EngineRegistry.clear();
  });

  describe('SimplePointEngine', () => {
    let engine: SimplePointEngine;

    beforeEach(() => {
      engine = new SimplePointEngine();
    });

    it('should have correct name and capabilities', () => {
      expect(engine.name).toBe('simple-point-engine');
      expect(engine.capabilities.supportedPredicates).toContain('intersects');
      expect(engine.capabilities.supportedGeometryTypes).toContain('Point');
      expect(engine.capabilities.precision).toBe('approximate');
    });

    it('should check intersection between points', () => {
      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [0.00001, 0.00001] };
      const point3: Point = { type: 'Point', coordinates: [1, 1] };

      expect(engine.intersects(point1, point2)).toBe(true);
      expect(engine.intersects(point1, point3)).toBe(false);
    });

    it('should check equality between points', () => {
      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [0, 0] };
      const point3: Point = { type: 'Point', coordinates: [1, 1] };

      expect(engine.equals(point1, point2)).toBe(true);
      expect(engine.equals(point1, point3)).toBe(false);
    });

    it('should calculate distance between points', () => {
      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [3, 4] };

      const distance = engine.distance(point1, point2);
      expect(distance).toBe(5);
    });

    it('should create buffer around point', () => {
      const point: Point = { type: 'Point', coordinates: [0, 0] };
      const buffered = engine.buffer(point, 1);

      expect(buffered.type).toBe('Polygon');
    });

    it('should throw error for unsupported geometry types', () => {
      const line: LineString = {
        type: 'LineString',
        coordinates: [[0, 0], [1, 1]]
      };
      const point: Point = { type: 'Point', coordinates: [0, 0] };

      expect(() => {
        engine.intersects(line, point);
      }).toThrow('SimplePointEngine only supports Point geometries');
    });

    it('should throw error for unsupported predicates', () => {
      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [1, 1] };

      expect(() => {
        engine.contains(point1, point2);
      }).toThrow('Not implemented');
    });
  });

  describe('AdvancedEngine', () => {
    let engine: AdvancedEngine;

    beforeEach(() => {
      engine = new AdvancedEngine();
    });

    it('should have correct name and capabilities', () => {
      expect(engine.name).toBe('advanced-engine');
      expect(engine.capabilities.supportedPredicates).toHaveLength(8);
      expect(engine.capabilities.supportedGeometryTypes).toContain('Point');
      expect(engine.capabilities.supportedGeometryTypes).toContain('LineString');
      expect(engine.capabilities.supportsTopology).toBe(true);
      expect(engine.capabilities.precision).toBe('exact');
    });

    it('should check intersection with bbox pre-check', () => {
      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [0.0001, 0.0001] }; // 非常接近的点
      const point3: Point = { type: 'Point', coordinates: [10, 10] };    // 远处的点

      // 由于bbox预检查，非常接近的点应该返回true
      // 但实际上对于点来说，即使接近也不是真正的相交
      // 这里测试的是bbox预检查的快速失败功能
      expect(engine.intersects(point1, point3)).toBe(false); // bbox不相交，快速返回false

      // 对于非常接近的点，虽然bbox可能不重叠，但自定义引擎简化实现返回true
      // 我们主要测试快速失败的情况
      const overlappingPoint: Point = { type: 'Point', coordinates: [0, 0] }; // 完全相同的点
      expect(engine.intersects(point1, overlappingPoint)).toBe(true); // 相同点应该相交
    });

    it('should cache bbox calculations', () => {
      const point: Point = { type: 'Point', coordinates: [0, 0] };

      const bbox1 = engine.bbox(point);
      const bbox2 = engine.bbox(point);

      expect(bbox1).toEqual(bbox2);
    });

    it('should calculate centroid', () => {
      const line: LineString = {
        type: 'LineString',
        coordinates: [[0, 0], [2, 2]]
      };

      const centroid = engine.centroid(line);

      expect(centroid.type).toBe('Point');
      expect(centroid.coordinates).toEqual([1, 1]);
    });

    it('should create buffer with bbox expansion', () => {
      const point: Point = { type: 'Point', coordinates: [0, 0] };
      const buffered = engine.buffer(point, 1);

      expect(buffered.type).toBe('Polygon');
    });

    it('should calculate area using bbox', () => {
      const line: LineString = {
        type: 'LineString',
        coordinates: [[0, 0], [2, 2]]
      };

      const area = engine.area(line);
      expect(area).toBe(4);
    });

    it('should calculate length using bbox', () => {
      const line: LineString = {
        type: 'LineString',
        coordinates: [[0, 0], [2, 2]]
      };

      const length = engine.length(line);
      expect(length).toBe(4);
    });
  });

  describe('Engine Registration', () => {
    it('should register custom engine', () => {
      const engine = new SimplePointEngine();
      EngineRegistry.register(engine);

      const retrieved = EngineRegistry.getEngine('simple-point-engine');
      expect(retrieved).toBe(engine);
    });

    it('should set custom engine as default', () => {
      const engine = new SimplePointEngine();
      EngineRegistry.register(engine);
      EngineRegistry.setDefaultEngine('simple-point-engine');

      const defaultEngine = EngineRegistry.getDefaultEngine();
      expect(defaultEngine.name).toBe('simple-point-engine');
    });

    it('should list all registered engines', () => {
      const engine1 = new SimplePointEngine();
      const engine2 = new AdvancedEngine();

      EngineRegistry.register(engine1);
      EngineRegistry.register(engine2);

      const engines = EngineRegistry.getAllEngines();
      expect(engines).toHaveLength(2);
      expect(engines.map(e => e.name)).toContain('simple-point-engine');
      expect(engines.map(e => e.name)).toContain('advanced-engine');
    });

    it('should check engine capabilities', () => {
      const engine1 = new SimplePointEngine();
      const engine2 = new AdvancedEngine();

      EngineRegistry.register(engine1);
      EngineRegistry.register(engine2);

      expect(EngineRegistry.supportsPredicate('intersects')).toBe(true);
      expect(EngineRegistry.supportsPredicate('touches')).toBe(true);

      expect(EngineRegistry.supportsGeometryType('Point')).toBe(true);
      expect(EngineRegistry.supportsGeometryType('LineString')).toBe(true);
    });
  });

  describe('Engine Switching', () => {
    it('should get best engine for predicate', () => {
      const engine1 = new SimplePointEngine();
      const engine2 = new AdvancedEngine();

      EngineRegistry.register(engine1);
      EngineRegistry.register(engine2);
      EngineRegistry.setDefaultEngine('simple-point-engine');

      const bestForIntersects = EngineRegistry.getBestEngineForPredicate('intersects');
      const bestForTouches = EngineRegistry.getBestEngineForPredicate('touches');

      // touches is only supported by advanced engine
      expect(bestForTouches.name).toBe('advanced-engine');
    });

    it('should throw error for unsupported predicate', () => {
      const engine = new SimplePointEngine();
      EngineRegistry.register(engine);

      expect(() => {
        EngineRegistry.getBestEngineForPredicate('touches');
      }).toThrow();
    });
  });

  describe('Engine Integration', () => {
    it('should support engine chaining', () => {
      const simpleEngine = new SimplePointEngine();
      const advancedEngine = new AdvancedEngine();

      EngineRegistry.register(simpleEngine);
      EngineRegistry.register(advancedEngine);

      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [1, 1] };

      // Use simple engine for points
      const simpleResult = simpleEngine.distance(point1, point2);

      // Use advanced engine for points
      const advancedResult = advancedEngine.distance(point1, point2);

      expect(simpleResult).toBe(Math.sqrt(2));
      expect(advancedResult).toBe(Math.sqrt(2));
    });

    it('should support engine fallback', () => {
      const simpleEngine = new SimplePointEngine();
      const advancedEngine = new AdvancedEngine();

      EngineRegistry.register(simpleEngine);
      EngineRegistry.register(advancedEngine);

      // Simple engine doesn't support touches, fallback to advanced
      const bestEngine = EngineRegistry.getBestEngineForPredicate('touches');
      expect(bestEngine.name).toBe('advanced-engine');
    });
  });

  describe('Feature Conversion', () => {
    it('should convert geometry to feature', () => {
      const engine = new SimplePointEngine();
      const point: Point = { type: 'Point', coordinates: [0, 0] };

      const feature = engine.toFeature(point, { name: 'test' });

      expect(feature.type).toBe('Feature');
      expect(feature.geometry).toBe(point);
      expect(feature.properties).toEqual({ name: 'test' });
    });

    it('should handle empty properties', () => {
      const engine = new SimplePointEngine();
      const point: Point = { type: 'Point', coordinates: [0, 0] };

      const feature = engine.toFeature(point);

      expect(feature.properties).toEqual({});
    });
  });
});
