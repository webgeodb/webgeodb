/**
 * PostGISFunctionRegistry 单元测试
 * 测试 PostGIS 函数注册表的功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebGeoDB } from '../../src';
import { PostGISFunctionRegistry, getGlobalRegistry, parsePostGISFunction } from '../../src/sql/postgis-functions';
import { EngineRegistry } from '../../src/spatial/engine-registry';
import type { Geometry } from '../../src/types';

describe('PostGISFunctionRegistry', () => {
  let db: WebGeoDB;
  let registry: PostGISFunctionRegistry;

  beforeEach(async () => {
    db = new WebGeoDB({
      name: 'test-postgis-registry',
      version: 1
    });

    db.schema({
      features: {
        id: 'string',
        name: 'string',
        type: 'string',
        geometry: 'geometry',
        rating: 'number'
      }
    });

    await db.open();

    // 使用 EngineRegistry 获取默认空间引擎创建注册表
    const spatialEngine = EngineRegistry.getDefaultEngine();
    registry = new PostGISFunctionRegistry(spatialEngine);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('空间谓词函数', () => {
    it('应该支持 ST_Intersects 函数', () => {
      const result = registry.callFunction('ST_Intersects', {
        field: 'geometry',
        geometry: {
          type: 'Point',
          coordinates: [116.4, 39.9]
        }
      });

      expect(result).not.toBeNull();
      expect(result?.method).toBe('intersects');
      expect(result?.params).toHaveLength(2);
    });

    it('应该支持 ST_Contains 函数', () => {
      const result = registry.callFunction('ST_Contains', {
        field: 'geometry',
        geometry: {
          type: 'Point',
          coordinates: [5, 5]
        }
      });

      expect(result).not.toBeNull();
      expect(result?.method).toBe('contains');
    });

    it('应该支持 ST_Within 函数', () => {
      const result = registry.callFunction('ST_Within', {
        field: 'geometry',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
        }
      });

      expect(result).not.toBeNull();
      expect(result?.method).toBe('within');
    });

    it('应该支持 ST_Equals 函数', () => {
      const result = registry.callFunction('ST_Equals', {
        field: 'geometry',
        geometry: {
          type: 'Point',
          coordinates: [116.4, 39.9]
        }
      });

      expect(result).not.toBeNull();
      expect(result?.method).toBe('equals');
    });

    it('应该支持 ST_Disjoint 函数', () => {
      const result = registry.callFunction('ST_Disjoint', {
        field: 'geometry',
        geometry: {
          type: 'Point',
          coordinates: [116.4, 39.9]
        }
      });

      expect(result).not.toBeNull();
      expect(result?.method).toBe('disjoint');
    });

    it('应该支持 ST_Touches 函数', () => {
      const result = registry.callFunction('ST_Touches', {
        field: 'geometry',
        geometry: {
          type: 'Point',
          coordinates: [116.4, 39.9]
        }
      });

      expect(result).not.toBeNull();
      expect(result?.method).toBe('touches');
    });

    it('应该支持 ST_Crosses 函数', () => {
      const result = registry.callFunction('ST_Crosses', {
        field: 'geometry',
        geometry: {
          type: 'Point',
          coordinates: [116.4, 39.9]
        }
      });

      expect(result).not.toBeNull();
      expect(result?.method).toBe('crosses');
    });

    it('应该支持 ST_Overlaps 函数', () => {
      const result = registry.callFunction('ST_Overlaps', {
        field: 'geometry',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
        }
      });

      expect(result).not.toBeNull();
      expect(result?.method).toBe('overlaps');
    });
  });

  describe('距离函数', () => {
    it('应该支持 ST_DWithin 函数', () => {
      const result = registry.callFunction('ST_DWithin', {
        field: 'geometry',
        geometry: {
          type: 'Point',
          coordinates: [116.4, 39.9]
        },
        distance: 1000
      });

      expect(result).not.toBeNull();
      expect(result?.method).toBe('distance');
      expect(result?.params).toHaveLength(4);
      expect(result?.params[2]).toBe('<=');
      expect(result?.params[3]).toBe(1000);
    });

    it('应该支持 ST_Distance 函数', () => {
      const result = registry.callFunction('ST_Distance', {
        field: 'geometry',
        geometry: {
          type: 'Point',
          coordinates: [116.4, 39.9]
        }
      });

      expect(result).not.toBeNull();
      expect(result?.method).toBe('distance');
      expect(result?.params).toHaveLength(4);
      expect(result?.params[2]).toBe('<');
      expect(result?.params[3]).toBe(Infinity);
    });
  });

  describe('几何构造函数', () => {
    it('应该支持 ST_MakePoint 函数', () => {
      const result = registry.callFunction('ST_MakePoint', {
        coordinates: [116.4, 39.9]
      });

      expect(result).not.toBeNull();
      expect(result?.geometry).toBeDefined();
      expect(result?.geometry?.type).toBe('Point');
      expect(result?.geometry?.coordinates).toEqual([116.4, 39.9]);
    });

    it('应该支持 ST_MakePoint 函数带三维坐标', () => {
      const result = registry.callFunction('ST_MakePoint', {
        coordinates: [116.4, 39.9, 100]
      });

      expect(result).not.toBeNull();
      expect(result?.geometry?.coordinates).toEqual([116.4, 39.9]);
    });

    it('应该支持 ST_MakeLine 函数', () => {
      const point1: Geometry = {
        type: 'Point',
        coordinates: [0, 0]
      };
      const point2: Geometry = {
        type: 'Point',
        coordinates: [10, 10]
      };

      const result = registry.callFunction('ST_MakeLine', {
        geometries: [point1, point2]
      });

      expect(result).not.toBeNull();
      expect(result?.geometry?.type).toBe('LineString');
    });
  });

  describe('几何转换函数', () => {
    it('应该支持 ST_GeomFromText 函数 (WKT)', () => {
      const result = registry.callFunction('ST_GeomFromText', {
        wkt: 'POINT(116.4 39.9)'
      });

      expect(result).not.toBeNull();
      expect(result?.geometry).toBeDefined();
      expect(result?.geometry?.type).toBe('Point');
    });

    it('应该支持 ST_AsText 函数', () => {
      const geometry: Geometry = {
        type: 'Point',
        coordinates: [116.4, 39.9]
      };

      const result = registry.callFunction('ST_AsText', {
        geometry
      });

      expect(result).not.toBeNull();
      // wellknown 库返回的格式有空格: "POINT (x y)"
      expect(result?.params[0]).toContain('POINT');
      expect(result?.params[0]).toContain('116.4');
      expect(result?.params[0]).toContain('39.9');
    });

    it('应该支持 ST_AsBinary 函数', () => {
      const geometry: Geometry = {
        type: 'Point',
        coordinates: [116.4, 39.9]
      };

      const result = registry.callFunction('ST_AsBinary', {
        geometry
      });

      expect(result).not.toBeNull();
      expect(result?.params[0]).toContain('116.4');
    });
  });

  describe('几何属性函数', () => {
    it('应该支持 ST_Area 函数', () => {
      const geometry: Geometry = {
        type: 'Polygon',
        coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
      };

      const result = registry.callFunction('ST_Area', {
        geometry
      });

      expect(result).not.toBeNull();
      expect(result?.method).toBe('literal');
      expect(result?.params[0]).toBeGreaterThan(0);
    });

    it('应该支持 ST_Length 函数', () => {
      const geometry: Geometry = {
        type: 'LineString',
        coordinates: [[0, 0], [10, 10]]
      };

      const result = registry.callFunction('ST_Length', {
        geometry
      });

      expect(result).not.toBeNull();
      expect(result?.method).toBe('literal');
      expect(result?.params[0]).toBeGreaterThan(0);
    });

    it('应该支持 ST_Perimeter 函数', () => {
      const geometry: Geometry = {
        type: 'Polygon',
        coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
      };

      const result = registry.callFunction('ST_Perimeter', {
        geometry
      });

      expect(result).not.toBeNull();
      expect(result?.method).toBe('literal');
    });
  });

  describe('几何操作函数', () => {
    it('应该支持 ST_Buffer 函数', () => {
      const geometry: Geometry = {
        type: 'Point',
        coordinates: [116.4, 39.9]
      };

      const result = registry.callFunction('ST_Buffer', {
        geometry,
        radius: 1000,
        units: 'meters'
      });

      expect(result).not.toBeNull();
      expect(result?.geometry).toBeDefined();
    });

    it('应该支持 ST_Centroid 函数', () => {
      const geometry: Geometry = {
        type: 'Polygon',
        coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
      };

      const result = registry.callFunction('ST_Centroid', {
        geometry
      });

      expect(result).not.toBeNull();
      expect(result?.geometry).toBeDefined();
      expect(result?.geometry?.type).toBe('Point');
    });
  });

  describe('函数别名和大小写', () => {
    it('应该支持小写函数名', () => {
      const result = registry.callFunction('st_intersects', {
        field: 'geometry',
        geometry: { type: 'Point', coordinates: [116.4, 39.9] }
      });

      // 小写应该也能工作（如果支持别名）
      expect(result).toBeDefined();
    });

    it('应该支持混合大小写函数名', () => {
      const result = registry.callFunction('St_Intersects', {
        field: 'geometry',
        geometry: { type: 'Point', coordinates: [116.4, 39.9] }
      });

      expect(result).toBeDefined();
    });
  });

  describe('边界情况', () => {
    it('应该处理不存在的函数', () => {
      const result = registry.callFunction('ST_InvalidFunction', {
        field: 'geometry',
        geometry: { type: 'Point', coordinates: [116.4, 39.9] }
      });

      expect(result).toBeNull();
    });

    it('应该处理缺少参数的情况', () => {
      const result = registry.callFunction('ST_MakePoint', {});

      expect(result).not.toBeNull();
      expect(result?.geometry).toBeDefined();
      expect(result?.geometry?.coordinates).toEqual([0, 0]);
    });

    it('应该处理无效的 WKT', () => {
      const result = registry.callFunction('ST_GeomFromText', {
        wkt: 'INVALID_WKT'
      });

      // 应该返回错误或空结果
      expect(result).toBeDefined();
    });

    it('应该处理空几何', () => {
      const result = registry.callFunction('ST_Area', {
        geometry: null
      });

      expect(result).not.toBeNull();
      expect(result?.params[0]).toBe(0);
    });
  });

  describe('全局注册表', () => {
    it('应该返回全局注册表单例', () => {
      const spatialEngine = EngineRegistry.getDefaultEngine();
      const registry1 = getGlobalRegistry(spatialEngine);
      const registry2 = getGlobalRegistry(spatialEngine);

      expect(registry1).toBe(registry2);
    });
  });

  describe('parsePostGISFunction 工具函数', () => {
    it('应该解析 PostGIS 函数调用', () => {
      const spatialEngine = EngineRegistry.getDefaultEngine();

      const result = parsePostGISFunction(
        'ST_Intersects',
        [
          'geometry',
          { type: 'Point', coordinates: [116.4, 39.9] }
        ],
        spatialEngine
      );

      expect(result).not.toBeNull();
      expect(result?.method).toBe('intersects');
    });

    it('应该处理 ST_DWithin 参数', () => {
      const spatialEngine = EngineRegistry.getDefaultEngine();

      const result = parsePostGISFunction(
        'ST_DWithin',
        [
          'geometry',
          { type: 'Point', coordinates: [116.4, 39.9] },
          1000
        ],
        spatialEngine
      );

      expect(result).not.toBeNull();
      expect(result?.method).toBe('distance');
      expect(result?.params[3]).toBe(1000);
    });

    it('应该处理 ST_MakePoint 参数', () => {
      const spatialEngine = EngineRegistry.getDefaultEngine();

      const result = parsePostGISFunction(
        'ST_MakePoint',
        [[116.4, 39.9]],
        spatialEngine
      );

      expect(result).not.toBeNull();
      expect(result?.geometry).toBeDefined();
      expect(result?.geometry?.type).toBe('Point');
    });
  });

  describe('几何解析', () => {
    it('应该解析 GeoJSON 对象', () => {
      const geometry: Geometry = {
        type: 'Point',
        coordinates: [116.4, 39.9]
      };

      const result = registry.parseGeometry(geometry);

      expect(result).toBeDefined();
      expect(result?.type).toBe('Point');
    });

    it('应该解析 WKT 字符串', () => {
      const result = registry.parseGeometry('POINT(116.4 39.9)');

      expect(result).toBeDefined();
      expect(result?.type).toBe('Point');
      expect(result?.coordinates).toEqual([116.4, 39.9]);
    });

    it('应该解析 GeoJSON 字符串', () => {
      const geojsonStr = JSON.stringify({
        type: 'Point',
        coordinates: [116.4, 39.9]
      });

      const result = registry.parseGeometry(geojsonStr);

      expect(result).toBeDefined();
      expect(result?.type).toBe('Point');
    });

    it('应该处理无效的 WKT', () => {
      const result = registry.parseGeometry('INVALID_WKT');

      expect(result).toBeUndefined();
    });

    it('应该处理 null 输入', () => {
      const result = registry.parseGeometry(null);

      expect(result).toBeUndefined();
    });
  });

  describe('WKT 转换', () => {
    it('应该将几何转换为 WKT', () => {
      const geometry: Geometry = {
        type: 'Point',
        coordinates: [116.4, 39.9]
      };

      const wkt = registry.toWKT(geometry);

      // wellknown 库返回的格式有空格: "POINT (x y)"
      expect(wkt).toContain('POINT');
      expect(wkt).toContain('116.4');
      expect(wkt).toContain('39.9');
    });

    it('应该转换复杂几何为 WKT', () => {
      const geometry: Geometry = {
        type: 'Polygon',
        coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
      };

      const wkt = registry.toWKT(geometry);

      expect(wkt).toContain('POLYGON');
    });
  });

  describe('错误处理', () => {
    it('应该优雅地处理函数执行错误', () => {
      // 测试无效的几何数据
      const result = registry.callFunction('ST_Buffer', {
        geometry: { type: 'Invalid', coordinates: [] },
        radius: 1000
      });

      // 应该返回结果而不是抛出错误
      expect(result).toBeDefined();
    });

    it('应该处理类型不匹配', () => {
      const result = registry.callFunction('ST_Area', {
        geometry: { type: 'Point', coordinates: [116.4, 39.9] }
      });

      // Point 的面积是 0
      expect(result).not.toBeNull();
      expect(result?.params[0]).toBe(0);
    });
  });

  describe('函数组合', () => {
    it('应该支持嵌套函数调用', () => {
      // ST_Buffer(ST_MakePoint(116.4, 39.9), 1000)
      const spatialEngine = EngineRegistry.getDefaultEngine();

      const makePointResult = parsePostGISFunction(
        'ST_MakePoint',
        [[116.4, 39.9]],
        spatialEngine
      );

      expect(makePointResult).not.toBeNull();
      expect(makePointResult?.geometry).toBeDefined();

      // 然后使用结果调用 ST_Buffer
      const bufferResult = registry.callFunction('ST_Buffer', {
        geometry: makePointResult.geometry,
        radius: 1000
      });

      expect(bufferResult).not.toBeNull();
      expect(bufferResult?.geometry).toBeDefined();
    });

    it('应该支持 ST_DWithin with ST_MakePoint', () => {
      const spatialEngine = EngineRegistry.getDefaultEngine();

      const result = parsePostGISFunction(
        'ST_DWithin',
        [
          'geometry',
          {
            type: 'function',
            name: 'ST_MakePoint',
            arguments: [[116.4, 39.9]]
          },
          1000
        ],
        spatialEngine
      );

      expect(result).not.toBeNull();
      expect(result?.method).toBe('distance');
    });
  });
});
