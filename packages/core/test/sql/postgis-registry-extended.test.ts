/**
 * PostGIS 函数注册表扩展测试
 *
 * 测试 PostGIS 函数的注册、调用和覆盖：
 * - 函数注册
 * - 函数调用
 * - 函数覆盖
 * - 自定义函数
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PostGISRegistry } from '../../src/sql/postgis-registry';
import { registerDefaultFunctions } from '../../src/sql/postgis-functions';
import type { Geometry, Point, Polygon, LineString } from '../../src/types';

describe('PostGIS Registry - 函数注册', () => {
  let registry: PostGISRegistry;

  beforeEach(() => {
    registry = new PostGISRegistry();
    registerDefaultFunctions(registry);
  });

  describe('函数查询', () => {
    it('should check if function exists', () => {
      expect(registry.hasFunction('ST_Distance')).toBe(true);
      expect(registry.hasFunction('ST_Buffer')).toBe(true);
      expect(registry.hasFunction('NonExistent')).toBe(false);
    });

    it('should get function implementation', () => {
      const func = registry.getFunction('ST_Distance');

      expect(func).toBeDefined();
      expect(typeof func).toBe('function');
    });

    it('should throw when getting non-existent function', () => {
      expect(() => registry.getFunction('NonExistent')).toThrow();
    });

    it('should list all registered functions', () => {
      const functions = registry.listFunctions();

      expect(functions).toContain('ST_Distance');
      expect(functions).toContain('ST_Buffer');
      expect(functions).toContain('ST_Intersects');
    });

    it('should get function count', () => {
      const count = registry.getFunctionCount();

      expect(count).toBeGreaterThan(10);
    });
  });

  describe('函数调用', () => {
    it('should call ST_Distance with points', () => {
      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [10, 0] };

      const func = registry.getFunction('ST_Distance');
      const distance = func(point1, point2);

      expect(distance).toBeGreaterThan(0);
    });

    it('should call ST_Buffer with point', () => {
      const point: Point = { type: 'Point', coordinates: [0, 0] };

      const func = registry.getFunction('ST_Buffer');
      const buffered = func(point, 1, 'kilometers');

      expect(buffered).toBeDefined();
      expect(buffered.type).toBe('Polygon');
    });

    it('should call ST_Intersects with geometries', () => {
      const point: Point = { type: 'Point', coordinates: [5, 5] };
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };

      const func = registry.getFunction('ST_Intersects');
      const intersects = func(point, polygon);

      expect(intersects).toBe(true);
    });

    it('should call ST_Contains with geometries', () => {
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };
      const point: Point = { type: 'Point', coordinates: [5, 5] };

      const func = registry.getFunction('ST_Contains');
      const contains = func(polygon, point);

      expect(contains).toBe(true);
    });

    it('should call ST_Within with geometries', () => {
      const point: Point = { type: 'Point', coordinates: [5, 5] };
      const polygon: Polygon = {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
        ]
      };

      const func = registry.getFunction('ST_Within');
      const within = func(point, polygon);

      expect(within).toBe(true);
    });
  });

  describe('函数覆盖', () => {
    it('should override existing function', () => {
      const originalFunc = registry.getFunction('ST_Distance');

      // 注册新函数
      registry.registerFunction('ST_Distance', () => 999);

      const newFunc = registry.getFunction('ST_Distance');
      const result = newFunc({ type: 'Point', coordinates: [0, 0] }, { type: 'Point', coordinates: [1, 1] });

      expect(result).toBe(999);

      // 恢复原函数
      registry.registerFunction('ST_Distance', originalFunc);
    });

    it('should register new function', () => {
      const customFunc = (geom: Geometry) => geom.type;

      registry.registerFunction('ST_GetType', customFunc);

      expect(registry.hasFunction('ST_GetType')).toBe(true);

      const func = registry.getFunction('ST_GetType');
      const point: Point = { type: 'Point', coordinates: [0, 0] };
      const result = func(point);

      expect(result).toBe('Point');
    });

    it('should unregister function', () => {
      registry.registerFunction('ST_Temp', () => true);

      expect(registry.hasFunction('ST_Temp')).toBe(true);

      registry.unregisterFunction('ST_Temp');

      expect(registry.hasFunction('ST_Temp')).toBe(false);
    });
  });

  describe('函数元数据', () => {
    it('should store function metadata', () => {
      registry.registerFunction('ST_Test', () => true, {
        description: 'Test function',
        parameters: ['geom'],
        returns: 'boolean'
      });

      const metadata = registry.getFunctionMetadata('ST_Test');

      expect(metadata).toBeDefined();
      expect(metadata.description).toBe('Test function');
    });

    it('should return undefined for non-existent metadata', () => {
      const metadata = registry.getFunctionMetadata('NonExistent');

      expect(metadata).toBeUndefined();
    });
  });

  describe('边界情况', () => {
    it('should handle function with no arguments', () => {
      registry.registerFunction('ST_NoArgs', () => 'result');

      const func = registry.getFunction('ST_NoArgs');
      const result = func();

      expect(result).toBe('result');
    });

    it('should handle function with multiple arguments', () => {
      registry.registerFunction('ST_MultiArgs', (a: number, b: number, c: number) => a + b + c);

      const func = registry.getFunction('ST_MultiArgs');
      const result = func(1, 2, 3);

      expect(result).toBe(6);
    });

    it('should handle function throwing error', () => {
      registry.registerFunction('ST_Error', () => {
        throw new Error('Test error');
      });

      const func = registry.getFunction('ST_Error');

      expect(() => func()).toThrow('Test error');
    });

    it('should handle function returning null', () => {
      registry.registerFunction('ST_Null', () => null);

      const func = registry.getFunction('ST_Null');
      const result = func();

      expect(result).toBeNull();
    });

    it('should handle function returning undefined', () => {
      registry.registerFunction('ST_Undefined', () => undefined);

      const func = registry.getFunction('ST_Undefined');
      const result = func();

      expect(result).toBeUndefined();
    });
  });

  describe('函数组合', () => {
    it('should compose functions', () => {
      // ST_Buffer(ST_MakePoint(0, 0), 1)
      const makePointFunc = registry.getFunction('ST_MakePoint');
      const bufferFunc = registry.getFunction('ST_Buffer');

      const point = makePointFunc(0, 0);
      const buffered = bufferFunc(point, 1, 'kilometers');

      expect(buffered.type).toBe('Polygon');
    });

    it('should chain spatial operations', () => {
      // ST_Distance(ST_Buffer(ST_MakePoint(0, 0), 1), ST_MakePoint(10, 0))
      const makePointFunc = registry.getFunction('ST_MakePoint');
      const bufferFunc = registry.getFunction('ST_Buffer');
      const distanceFunc = registry.getFunction('ST_Distance');

      const point1 = makePointFunc(0, 0);
      const buffered = bufferFunc(point1, 1, 'kilometers');
      const point2 = makePointFunc(10, 0);
      const distance = distanceFunc(buffered, point2);

      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('性能测试', () => {
    it('should call function efficiently', () => {
      const func = registry.getFunction('ST_Distance');
      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [10, 0] };

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        func(point1, point2);
      }

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(100); // 1000 次调用应该在 100ms 内完成
    });

    it('should handle concurrent function calls', async () => {
      const func = registry.getFunction('ST_Distance');
      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [10, 0] };

      const promises = Array.from({ length: 100 }, () =>
        Promise.resolve(func(point1, point2))
      );

      const startTime = performance.now();

      await Promise.all(promises);

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(50);
    });
  });
});
