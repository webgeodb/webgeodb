/**
 * 数据库配置
 */

import type { GeometryType } from './geometry';

export interface DatabaseConfig {
  /** 数据库名称 */
  name: string;
  /** 数据库版本 */
  version: number;
  /** 存储适配器类型 */
  adapter?: 'indexeddb' | 'sqlite' | 'duckdb' | 'memory';
  /** 是否使用 Web Worker */
  worker?: boolean;
  /** 缓存配置 */
  cache?: CacheConfig;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  /** 是否启用缓存 */
  enabled: boolean;
  /** 最大缓存条目数 */
  maxSize: number;
}

/**
 * 表结构定义
 */
export interface TableSchema {
  [field: string]: FieldType;
}

/**
 * 字段类型
 */
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'json'
  | 'geometry';

/**
 * 索引配置
 */
export interface IndexConfig {
  /** 索引类型 */
  type?: 'rtree' | 'quadtree' | 'kdtree' | 'h3' | 'geohash';
  /** 是否自动维护 */
  auto?: boolean;
}

/**
 * 查询操作符
 */
export type QueryOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'in'
  | 'not in'
  | 'like'
  | 'not like';

/**
 * 空间谓词
 */
export type SpatialPredicate =
  | 'intersects'
  | 'contains'
  | 'within'
  | 'equals'
  | 'disjoint'
  | 'touches'
  | 'crosses'
  | 'overlaps';

/**
 * 查询条件
 */
export interface QueryCondition {
  field: string;
  operator: QueryOperator;
  value: any;
}

/**
 * 空间查询条件
 */
export interface SpatialQueryCondition {
  field: string;
  predicate: SpatialPredicate;
  geometry: any;
}

/**
 * 排序配置
 */
export interface OrderByConfig {
  field: string;
  direction: 'asc' | 'desc';
}
