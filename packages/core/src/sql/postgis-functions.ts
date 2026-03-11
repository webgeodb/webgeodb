/**
 * PostGIS 函数映射表
 * 将 PostGIS 函数映射到 WebGeoDB 的空间引擎和 Turf.js
 */

import wellknown from 'wellknown';
import type { Geometry } from '../types';
import type { SpatialEngine } from '../spatial/spatial-engine';

/**
 * 空间函数参数
 */
export interface SpatialFunctionArgs {
  field?: string;
  geometry?: Geometry;
  distance?: number;
  units?: string;
  radius?: number;
  coordinates?: [number, number] | [number, number, number];
  wkt?: string;
  geometries?: Geometry[];
}

/**
 * 空间函数转换结果
 */
export interface SpatialFunctionResult {
  method: string;
  params: any[];
  geometry?: Geometry;
}

/**
 * PostGIS 函数注册表
 */
export class PostGISFunctionRegistry {
  private spatialEngine: SpatialEngine;

  constructor(spatialEngine: SpatialEngine) {
    this.spatialEngine = spatialEngine;
  }

  /**
   * 调用 PostGIS 函数
   */
  callFunction(name: string, args: SpatialFunctionArgs): SpatialFunctionResult | null {
    const func = this.getFunction(name);
    if (func) {
      return func.call(this, args);
    }
    return null;
  }

  /**
   * 获取函数定义
   */
  private getFunction(name: string): PostGISFunction | null {
    const registry = this.getRegistry();
    return registry[name] || null;
  }

  /**
   * 获取函数注册表
   */
  private getRegistry(): Record<string, PostGISFunction> {
    return {
      // 空间关系谓词
      'ST_Intersects': new SpatialPredicateFunction('intersects'),
      'ST_Contains': new SpatialPredicateFunction('contains'),
      'ST_Within': new SpatialPredicateFunction('within'),
      'ST_Equals': new SpatialPredicateFunction('equals'),
      'ST_Disjoint': new SpatialPredicateFunction('disjoint'),
      'ST_Touches': new SpatialPredicateFunction('touches'),
      'ST_Crosses': new SpatialPredicateFunction('crosses'),
      'ST_Overlaps': new SpatialPredicateFunction('overlaps'),

      // 距离函数
      'ST_DWithin': new STDWithinFunction(),
      'ST_Distance': new STDistanceFunction(),

      // 几何构造
      'ST_MakePoint': new STMakePointFunction(),
      'ST_MakeLine': new STMakeLineFunction(),
      'ST_Buffer': new STBufferFunction(this.spatialEngine),
      'ST_Centroid': new STCentroidFunction(this.spatialEngine),

      // 几何转换
      'ST_GeomFromText': new STGeomFromTextFunction(),
      'ST_AsText': new STAsTextFunction(),
      'ST_AsBinary': new STAsBinaryFunction(),

      // 几何属性
      'ST_Area': new STAreaFunction(this.spatialEngine),
      'ST_Length': new STLengthFunction(this.spatialEngine),
      'ST_Perimeter': new STPerimeterFunction(this.spatialEngine),

      // 几何操作
      'ST_Union': new STUnionFunction(this.spatialEngine),
      'ST_Intersection': new STIntersectionFunction(this.spatialEngine),
      'ST_Difference': new STDifferenceFunction(this.spatialEngine)
    };
  }

  /**
   * 解析几何对象
   */
  parseGeometry(input: any): Geometry | undefined {
    // 已经是 GeoJSON 对象
    if (input && typeof input === 'object' && 'type' in input && 'coordinates' in input) {
      return input as Geometry;
    }

    // 字符串：先尝试 GeoJSON，再尝试 WKT
    if (typeof input === 'string') {
      // 先尝试解析为 GeoJSON 字符串
      try {
        const parsed = JSON.parse(input);
        if (parsed && typeof parsed === 'object' && 'type' in parsed && 'coordinates' in parsed) {
          return parsed as Geometry;
        }
      } catch (error) {
        // JSON.parse 失败，继续尝试 WKT
      }

      // 再尝试解析为 WKT 字符串
      try {
        const parsed = wellknown.parse(input);
        return parsed ?? undefined;
      } catch (error) {
        console.error('几何解析失败 (尝试了 GeoJSON 和 WKT):', error);
        return undefined;
      }
    }

    return undefined;
  }

  /**
   * 将几何对象转换为 WKT
   */
  toWKT(geometry: Geometry): string {
    return wellknown.stringify(geometry);
  }
}

/**
 * PostGIS 函数接口
 */
interface PostGISFunction {
  call(registry: PostGISFunctionRegistry, args: SpatialFunctionArgs): SpatialFunctionResult | null;
}

/**
 * 空间谓词函数
 */
class SpatialPredicateFunction implements PostGISFunction {
  constructor(private predicate: string) {}

  call(registry: PostGISFunctionRegistry, args: SpatialFunctionArgs): SpatialFunctionResult {
    return {
      method: this.predicate,
      params: [args.field, args.geometry]
    };
  }
}

/**
 * ST_DWithin 函数
 */
class STDWithinFunction implements PostGISFunction {
  call(registry: PostGISFunctionRegistry, args: SpatialFunctionArgs): SpatialFunctionResult {
    return {
      method: 'distance',
      params: [
        args.field,
        args.geometry ? registry.parseGeometry(args.geometry) : undefined,
        '<=',
        args.distance
      ]
    };
  }
}

/**
 * ST_Distance 函数
 */
class STDistanceFunction implements PostGISFunction {
  call(registry: PostGISFunctionRegistry, args: SpatialFunctionArgs): SpatialFunctionResult {
    return {
      method: 'distance',
      params: [
        args.field,
        args.geometry ? registry.parseGeometry(args.geometry) : undefined,
        '<',
        Infinity
      ]
    };
  }
}

/**
 * ST_MakePoint 函数
 */
class STMakePointFunction implements PostGISFunction {
  call(registry: PostGISFunctionRegistry, args: SpatialFunctionArgs): SpatialFunctionResult {
    const coords = args.coordinates || [0, 0];
    const geometry: Geometry = {
      type: 'Point',
      coordinates: coords.slice(0, 2) as [number, number]
    };

    return {
      method: 'literal',
      params: [geometry],
      geometry
    };
  }
}

/**
 * ST_MakeLine 函数
 */
class STMakeLineFunction implements PostGISFunction {
  call(registry: PostGISFunctionRegistry, args: SpatialFunctionArgs): SpatialFunctionResult {
    const points = args.geometries || [];

    const geometry: Geometry = {
      type: 'LineString',
      coordinates: points.map(p => {
        const geom = registry.parseGeometry(p);
        return geom && geom.type === 'Point' ? geom.coordinates : [0, 0];
      })
    };

    return {
      method: 'literal',
      params: [geometry],
      geometry
    };
  }
}

/**
 * ST_Buffer 函数
 */
class STBufferFunction implements PostGISFunction {
  constructor(private spatialEngine: SpatialEngine) {}

  call(registry: PostGISFunctionRegistry, args: SpatialFunctionArgs): SpatialFunctionResult {
    const geometry = args.geometry ? registry.parseGeometry(args.geometry) : undefined;
    const radius = args.radius || 0;
    const units = args.units || 'meters';

    if (geometry) {
      try {
        const buffered = this.spatialEngine.buffer(geometry, radius, units as 'meters' | 'kilometers' | 'miles' | 'degrees' | 'radians' | 'inches' | 'yards' | 'centimeters' | 'nauticalmiles' | undefined);
        return {
          method: 'literal',
          params: [buffered],
          geometry: buffered
        };
      } catch (error) {
        // 无效几何类型或其他错误，返回空结果
        return {
          method: 'literal',
          params: [undefined],
          geometry: undefined
        };
      }
    }

    return {
      method: 'literal',
      params: [undefined],
      geometry: undefined
    };
  }
}

/**
 * ST_Centroid 函数
 */
class STCentroidFunction implements PostGISFunction {
  constructor(private spatialEngine: SpatialEngine) {}

  call(registry: PostGISFunctionRegistry, args: SpatialFunctionArgs): SpatialFunctionResult {
    const geometry = args.geometry ? registry.parseGeometry(args.geometry) : undefined;

    if (geometry) {
      const centroid = this.spatialEngine.centroid(geometry);
      return {
        method: 'literal',
        params: [centroid],
        geometry: centroid
      };
    }

    return {
      method: 'literal',
      params: [undefined],
      geometry: undefined
    };
  }
}

/**
 * ST_GeomFromText 函数
 */
class STGeomFromTextFunction implements PostGISFunction {
  call(registry: PostGISFunctionRegistry, args: SpatialFunctionArgs): SpatialFunctionResult {
    const wkt = args.wkt || (args.geometry as any);
    const geometry = registry.parseGeometry(wkt);

    return {
      method: 'literal',
      params: [geometry],
      geometry
    };
  }
}

/**
 * ST_AsText 函数
 */
class STAsTextFunction implements PostGISFunction {
  call(registry: PostGISFunctionRegistry, args: SpatialFunctionArgs): SpatialFunctionResult {
    const geometry = args.geometry ? registry.parseGeometry(args.geometry) : undefined;
    const wkt = geometry ? registry.toWKT(geometry) : null;

    return {
      method: 'literal',
      params: [wkt]
    };
  }
}

/**
 * ST_AsBinary 函数
 */
class STAsBinaryFunction implements PostGISFunction {
  call(registry: PostGISFunctionRegistry, args: SpatialFunctionArgs): SpatialFunctionResult {
    // WKB 格式转换需要 wkx 库
    const geometry = args.geometry;
    const wkb = geometry ? JSON.stringify(geometry) : null;

    return {
      method: 'literal',
      params: [wkb]
    };
  }
}

/**
 * ST_Area 函数
 */
class STAreaFunction implements PostGISFunction {
  constructor(private spatialEngine: SpatialEngine) {}

  call(registry: PostGISFunctionRegistry, args: SpatialFunctionArgs): SpatialFunctionResult {
    const geometry = args.geometry ? registry.parseGeometry(args.geometry) : undefined;
    const area = geometry ? this.spatialEngine.area(geometry) : 0;

    return {
      method: 'literal',
      params: [area]
    };
  }
}

/**
 * ST_Length 函数
 */
class STLengthFunction implements PostGISFunction {
  constructor(private spatialEngine: SpatialEngine) {}

  call(registry: PostGISFunctionRegistry, args: SpatialFunctionArgs): SpatialFunctionResult {
    const geometry = args.geometry ? registry.parseGeometry(args.geometry) : undefined;
    const length = geometry ? this.spatialEngine.length(geometry) : 0;

    return {
      method: 'literal',
      params: [length]
    };
  }
}

/**
 * ST_Perimeter 函数
 */
class STPerimeterFunction implements PostGISFunction {
  constructor(private spatialEngine: SpatialEngine) {}

  call(registry: PostGISFunctionRegistry, args: SpatialFunctionArgs): SpatialFunctionResult {
    const geometry = args.geometry ? registry.parseGeometry(args.geometry) : undefined;
    // 使用 length 计算周长（对于 Polygon，length 返回周长）
    const perimeter = geometry ? this.spatialEngine.length(geometry) : 0;

    return {
      method: 'literal',
      params: [perimeter]
    };
  }
}

/**
 * ST_Union 函数
 */
class STUnionFunction implements PostGISFunction {
  constructor(private spatialEngine: SpatialEngine) {}

  call(registry: PostGISFunctionRegistry, args: SpatialFunctionArgs): SpatialFunctionResult {
    const geometries = args.geometries || [];

    if (geometries.length >= 2) {
      const parsed = geometries.map(g => registry.parseGeometry(g)).filter((g): g is Geometry => g !== undefined);
      const union = this.spatialEngine.union(parsed[0], parsed[1]);

      return {
        method: 'literal',
        params: [union],
        geometry: union ?? undefined
      };
    }

    return {
      method: 'literal',
      params: [undefined],
      geometry: undefined
    };
  }
}

/**
 * ST_Intersection 函数
 */
class STIntersectionFunction implements PostGISFunction {
  constructor(private spatialEngine: SpatialEngine) {}

  call(registry: PostGISFunctionRegistry, args: SpatialFunctionArgs): SpatialFunctionResult {
    const geometries = args.geometries || [];

    if (geometries.length >= 2) {
      const parsed = geometries.map(g => registry.parseGeometry(g)).filter((g): g is Geometry => g !== undefined);
      const intersection = this.spatialEngine.intersection(parsed[0], parsed[1]);

      return {
        method: 'literal',
        params: [intersection],
        geometry: intersection ?? undefined
      };
    }

    return {
      method: 'literal',
      params: [undefined],
      geometry: undefined
    };
  }
}

/**
 * ST_Difference 函数
 */
class STDifferenceFunction implements PostGISFunction {
  constructor(private spatialEngine: SpatialEngine) {}

  call(registry: PostGISFunctionRegistry, args: SpatialFunctionArgs): SpatialFunctionResult {
    const geometries = args.geometries || [];

    if (geometries.length >= 2) {
      const parsed = geometries.map(g => registry.parseGeometry(g)).filter((g): g is Geometry => g !== undefined);
      const difference = this.spatialEngine.difference(parsed[0], parsed[1]);

      return {
        method: 'literal',
        params: [difference],
        geometry: difference ?? undefined
      };
    }

    return {
      method: 'literal',
      params: [undefined],
      geometry: undefined
    };
  }
}

/**
 * 全局 PostGIS 函数注册表（延迟初始化）
 */
let globalRegistry: PostGISFunctionRegistry | null = null;

/**
 * 获取全局 PostGIS 函数注册表
 */
export function getGlobalRegistry(spatialEngine: SpatialEngine): PostGISFunctionRegistry {
  if (!globalRegistry) {
    globalRegistry = new PostGISFunctionRegistry(spatialEngine);
  }
  return globalRegistry;
}

/**
 * 解析 PostGIS 函数
 */
export function parsePostGISFunction(
  name: string,
  args: any[],
  spatialEngine: SpatialEngine
): SpatialFunctionResult | null {
  const registry = getGlobalRegistry(spatialEngine);
  const functionArgs: SpatialFunctionArgs = {
    field: args[0],
    geometry: args[1],
    distance: args[2],
    units: args[3] || 'meters',
    radius: args[1],
    coordinates: args[0],
    wkt: args[0],
    geometries: args
  };

  return registry.callFunction(name, functionArgs);
}
