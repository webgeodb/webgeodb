/**
 * 几何类型定义
 */

export type Position = [number, number] | [number, number, number];

/**
 * 几何类型
 */
export type GeometryType =
  | 'Point'
  | 'LineString'
  | 'Polygon'
  | 'MultiPoint'
  | 'MultiLineString'
  | 'MultiPolygon'
  | 'GeometryCollection';

export interface Point {
  type: 'Point';
  coordinates: Position;
}

export interface LineString {
  type: 'LineString';
  coordinates: Position[];
}

export interface Polygon {
  type: 'Polygon';
  coordinates: Position[][];
}

export interface MultiPoint {
  type: 'MultiPoint';
  coordinates: Position[];
}

export interface MultiLineString {
  type: 'MultiLineString';
  coordinates: Position[][];
}

export interface MultiPolygon {
  type: 'MultiPolygon';
  coordinates: Position[][][];
}

export interface GeometryCollection {
  type: 'GeometryCollection';
  geometries: Geometry[];
}

export type Geometry =
  | Point
  | LineString
  | Polygon
  | MultiPoint
  | MultiLineString
  | MultiPolygon
  | GeometryCollection;

/**
 * GeoJSON Feature
 */
export interface Feature<G extends Geometry = Geometry, P = any> {
  type: 'Feature';
  id?: string | number;
  geometry: G;
  properties: P;
}

export interface FeatureCollection<G extends Geometry = Geometry, P = any> {
  type: 'FeatureCollection';
  features: Feature<G, P>[];
}

/**
 * 边界框 (BBox)
 */
export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * 空间索引项
 */
export interface IndexItem extends BBox {
  id: string | number;
  /**
   * 完整数据存储（可选）
   * 当设置此字段时，查询可直接从索引返回数据，无需回查 IndexedDB
   */
  data?: any;
  /**
   * 仅存储几何数据（内存优化选项）
   */
  geometry?: Geometry;
  /**
   * 仅存储属性数据（内存优化选项）
   */
  properties?: Record<string, any>;
}
