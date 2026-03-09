/**
 * 空间引擎抽象层
 *
 * 定义了空间计算引擎的统一接口，支持多种实现（Turf.js、JSTS、自定义）
 */

import type { Geometry, Feature, BBox } from '../types';
import type { SpatialPredicate } from '../types/database';
import type { GeometryType } from '../types/geometry';

/**
 * 距离单位
 */
export type DistanceUnit = 'kilometers' | 'miles' | 'degrees' | 'radians' | 'inches' | 'yards' | 'meters' | 'centimeters' | 'nauticalmiles';

/**
 * 引擎能力
 */
export interface EngineCapabilities {
  /** 支持的空间谓词 */
  supportedPredicates: SpatialPredicate[];
  /** 支持的几何类型 */
  supportedGeometryTypes: GeometryType[];
  /** 是否支持拓扑操作（buffer, intersection, union 等） */
  supportsTopology: boolean;
  /** 是否支持距离计算 */
  supportsDistance: boolean;
  /** 计算精度 ('exact' | 'approximate') */
  precision: 'exact' | 'approximate';
}

/**
 * 引擎配置
 */
export interface EngineConfig {
  /** 引擎名称 */
  name: string;
  /** 是否为默认引擎 */
  isDefault?: boolean;
  /** 距离计算默认单位 */
  defaultUnits?: DistanceUnit;
  /** 其他配置选项 */
  options?: Record<string, any>;
}

/**
 * 空间引擎接口
 *
 * 所有空间计算引擎必须实现此接口
 */
export interface SpatialEngine {
  /**
   * 引擎名称
   */
  readonly name: string;

  /**
   * 引擎能力
   */
  readonly capabilities: EngineCapabilities;

  /**
   * 初始化引擎（用于异步加载依赖）
   */
  initialize?(): Promise<void>;

  // ==================== 核心空间谓词 ====================

  /**
   * 相交判断
   * 两个几何对象是否有任何公共点
   */
  intersects(g1: Geometry, g2: Geometry): boolean;

  /**
   * 包含判断
   * g1 是否完全包含 g2
   */
  contains(g1: Geometry, g2: Geometry): boolean;

  /**
   * 在内部判断
   * g1 是否完全在 g2 内部
   */
  within(g1: Geometry, g2: Geometry): boolean;

  /**
   * 相等判断
   * 两个几何对象在拓扑上是否相等
   */
  equals(g1: Geometry, g2: Geometry): boolean;

  /**
   * 分离判断
   * 两个几何对象是否没有任何公共点
   */
  disjoint(g1: Geometry, g2: Geometry): boolean;

  /**
   * 交叉判断
   * g1 是否在内部交叉 g2（维度相同且不在边界内）
   */
  crosses(g1: Geometry, g2: Geometry): boolean;

  /**
   * 接触判断
   * 两个几何对象是否至少有一个公共边界点，但没有内部点相交
   */
  touches(g1: Geometry, g2: Geometry): boolean;

  /**
   * 重叠判断
   * 两个几何对象是否相交且有相同的维度，但彼此不完全包含
   */
  overlaps(g1: Geometry, g2: Geometry): boolean;

  // ==================== 拓扑操作 ====================

  /**
   * 缓冲区
   * 创建一个几何对象的缓冲区
   * @param geometry - 输入几何对象
   * @param distance - 缓冲距离
   * @param units - 距离单位
   */
  buffer(geometry: Geometry, distance: number, units?: DistanceUnit): Geometry;

  /**
   * 交集
   * 计算两个几何对象的交集
   * @returns 交集几何对象，如果无交集则返回 null
   */
  intersection(g1: Geometry, g2: Geometry): Geometry | null;

  /**
   * 并集
   * 计算两个几何对象的并集
   * @returns 并集几何对象，如果无法计算则返回 null
   */
  union(g1: Geometry, g2: Geometry): Geometry | null;

  /**
   * 差集
   * 计算 g1 减去 g2 的几何对象
   * @returns 差集几何对象，如果无法计算则返回 null
   */
  difference(g1: Geometry, g2: Geometry): Geometry | null;

  // ==================== 工具方法 ====================

  /**
   * 距离计算
   * 计算两个几何对象之间的最短距离
   * @param g1 - 第一个几何对象
   * @param g2 - 第二个几何对象
   * @param units - 距离单位
   */
  distance(g1: Geometry, g2: Geometry, units?: DistanceUnit): number;

  /**
   * 面积计算
   * 计算几何对象的面积（仅适用于 Polygon 和 MultiPolygon）
   * @param geometry - 输入几何对象
   */
  area(geometry: Geometry): number;

  /**
   * 长度计算
   * 计算几何对象的长度（适用于 LineString, MultiLineString, Polygon, MultiPolygon）
   * @param geometry - 输入几何对象
   */
  length(geometry: Geometry): number;

  /**
   * 边界框
   * 计算几何对象的边界框
   * @param geometry - 输入几何对象
   */
  bbox(geometry: Geometry): BBox;

  /**
   * 质心
   * 计算几何对象的质心
   * @param geometry - 输入几何对象
   */
  centroid(geometry: Geometry): Geometry;

  /**
   * 转换为 Feature
   * 将几何对象转换为 GeoJSON Feature
   * @param geometry - 输入几何对象
   * @param properties - 可选的属性对象
   */
  toFeature<G extends Geometry = Geometry, P = any>(
    geometry: G,
    properties?: P
  ): Feature<G, P>;

  /**
   * 简化
   * 简化几何对象（减少顶点数量）
   * @param geometry - 输入几何对象
   * @param tolerance - 简化容差（单位与坐标系相关）
   * @param highQuality - 是否使用高质量算法（较慢但更准确）
   */
  simplify(geometry: Geometry, tolerance: number, highQuality?: boolean): Geometry;
}

/**
 * 谓词执行结果
 */
export interface PredicateResult {
  /** 结果值 */
  result: boolean;
  /** 使用的引擎 */
  engine: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 是否使用了缓存 */
  cached: boolean;
}

/**
 * 谓词插件接口
 */
export interface PredicatePlugin {
  /** 谓词名称 */
  name: SpatialPredicate;
  /** 引擎实例 */
  engine: SpatialEngine;
  /** 复杂度 */
  complexity: 'simple' | 'medium' | 'complex';
  /** 支持的几何类型组合 */
  supportedGeometryTypes: [GeometryType, GeometryType][];
  /** 执行谓词 */
  execute(g1: Geometry, g2: Geometry): boolean;
}
