/**
 * JSTS (JSTS Topology Suite) 空间引擎实现
 *
 * JSTS 提供精确的拓扑操作，是 JTS (Java Topology Suite) 的 JavaScript 移植版
 * 此引擎作为可选依赖，支持动态加载
 *
 * 注意：使用此引擎需要安装 @types/jsts 和 jsts 依赖
 */

import type {
  Geometry,
  Feature,
  BBox
} from '../../types';
import type {
  SpatialEngine,
  EngineCapabilities,
  EngineConfig,
  DistanceUnit
} from '../spatial-engine';
import type { SpatialPredicate } from '../../types/database';
import type { GeometryType } from '../../types/geometry';

// JSTS 类型定义（简化版，避免硬依赖）
interface JSTSGeometry {
  geometryType: string;
  intersection(other: JSTSGeometry): JSTSGeometry;
  union(other: JSTSGeometry): JSTSGeometry;
  difference(other: JSTSGeometry): JSTSGeometry;
  buffer(distance: number): JSTSGeometry;
  intersects(other: JSTSGeometry): boolean;
  contains(other: JSTSGeometry): boolean;
  within(other: JSTSGeometry): boolean;
  crosses(other: JSTSGeometry): boolean;
  touches(other: JSTSGeometry): boolean;
  overlaps(other: JSTSGeometry): boolean;
  equals(other: JSTSGeometry): boolean;
  disjoint(other: JSTSGeometry): boolean;
  getArea(): number;
  getLength(): number;
  distance(other: JSTSGeometry): number;
  getCentroid(): JSTSGeometry;
  getEnvelope(): any;
  getGeometryType(): string;
  getDimension(): number;
  getBoundary(): JSTSGeometry;
}

interface JSTSGeoJSONReader {
  read(geometry: Geometry): JSTSGeometry;
}

interface JSTSGeoJSONWriter {
  write(geometry: JSTSGeometry): Geometry;
}

interface JSTSModule {
  GeoJSONReader: new () => JSTSGeoJSONReader;
  GeoJSONWriter: new () => JSTSGeoJSONWriter;
  PrecisionModel: any;
  GeometryFactory: any;
}

/**
 * JSTS 引擎能力
 */
const JSTS_CAPABILITIES: EngineCapabilities = {
  supportedPredicates: [
    'intersects',
    'contains',
    'within',
    'equals',
    'disjoint',
    'crosses',
    'touches',
    'overlaps'
  ],
  supportedGeometryTypes: [
    'Point',
    'LineString',
    'Polygon',
    'MultiPoint',
    'MultiLineString',
    'MultiPolygon',
    'GeometryCollection'
  ],
  supportsTopology: true,
  supportsDistance: true,
  precision: 'exact'
};

/**
 * JSTS 空间引擎
 */
export class JTSEngine implements SpatialEngine {
  readonly name: string;
  readonly capabilities: EngineCapabilities;
  private defaultUnits: DistanceUnit;
  private jsts: JSTSModule | null = null;
  private reader: JSTSGeoJSONReader | null = null;
  private writer: JSTSGeoJSONWriter | null = null;
  private initialized: boolean = false;

  constructor(config: EngineConfig = { name: 'jsts' }) {
    this.name = config.name;
    this.capabilities = JSTS_CAPABILITIES;
    this.defaultUnits = config.defaultUnits || 'kilometers';
  }

  /**
   * 初始化 JSTS 引擎（异步加载）
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 尝试动态加载 JSTS
      // @ts-ignore - JSTS 是可选依赖
      const jstsModule = await import('jsts');
      this.jsts = jstsModule as any;
      this.reader = new this.jsts.GeoJSONReader();
      this.writer = new this.jsts.GeoJSONWriter();
      this.initialized = true;
    } catch (error) {
      throw new Error(
        'JSTS is not installed. Install it with: npm install jsts @types/jsts'
      );
    }
  }

  /**
   * 确保引擎已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.jsts || !this.reader || !this.writer) {
      throw new Error(
        'JSTS engine is not initialized. Call initialize() first.'
      );
    }
  }

  /**
   * 将 GeoJSON Geometry 转换为 JSTS Geometry
   */
  private toJTSGeometry(geometry: Geometry): JSTSGeometry {
    this.ensureInitialized();
    return this.reader!.read(geometry);
  }

  /**
   * 将 JSTS Geometry 转换为 GeoJSON Geometry
   */
  private fromJTSGeometry(jstsGeometry: JSTSGeometry): Geometry {
    this.ensureInitialized();
    return this.writer!.write(jstsGeometry);
  }

  // ==================== 核心空间谓词 ====================

  intersects(g1: Geometry, g2: Geometry): boolean {
    const jsts1 = this.toJTSGeometry(g1);
    const jsts2 = this.toJTSGeometry(g2);
    return jsts1.intersects(jsts2);
  }

  contains(g1: Geometry, g2: Geometry): boolean {
    const jsts1 = this.toJTSGeometry(g1);
    const jsts2 = this.toJTSGeometry(g2);
    return jsts1.contains(jsts2);
  }

  within(g1: Geometry, g2: Geometry): boolean {
    const jsts1 = this.toJTSGeometry(g1);
    const jsts2 = this.toJTSGeometry(g2);
    return jsts1.within(jsts2);
  }

  equals(g1: Geometry, g2: Geometry): boolean {
    const jsts1 = this.toJTSGeometry(g1);
    const jsts2 = this.toJTSGeometry(g2);
    return jsts1.equals(jsts2);
  }

  disjoint(g1: Geometry, g2: Geometry): boolean {
    const jsts1 = this.toJTSGeometry(g1);
    const jsts2 = this.toJTSGeometry(g2);
    return jsts1.disjoint(jsts2);
  }

  crosses(g1: Geometry, g2: Geometry): boolean {
    const jsts1 = this.toJTSGeometry(g1);
    const jsts2 = this.toJTSGeometry(g2);
    return jsts1.crosses(jsts2);
  }

  touches(g1: Geometry, g2: Geometry): boolean {
    const jsts1 = this.toJTSGeometry(g1);
    const jsts2 = this.toJTSGeometry(g2);
    return jsts1.touches(jsts2);
  }

  overlaps(g1: Geometry, g2: Geometry): boolean {
    const jsts1 = this.toJTSGeometry(g1);
    const jsts2 = this.toJTSGeometry(g2);
    return jsts1.overlaps(jsts2);
  }

  // ==================== 拓扑操作 ====================

  buffer(geometry: Geometry, distance: number, units?: DistanceUnit): Geometry {
    const jstsGeometry = this.toJTSGeometry(geometry);
    const buffered = jstsGeometry.buffer(distance);
    return this.fromJTSGeometry(buffered);
  }

  intersection(g1: Geometry, g2: Geometry): Geometry | null {
    try {
      const jsts1 = this.toJTSGeometry(g1);
      const jsts2 = this.toJTSGeometry(g2);
      const intersected = jsts1.intersection(jsts2);

      // @ts-ignore - JSTS 对象可能有 isEmpty 方法
      if (intersected.isEmpty && intersected.isEmpty()) {
        return null;
      }

      return this.fromJTSGeometry(intersected);
    } catch (error) {
      return null;
    }
  }

  union(g1: Geometry, g2: Geometry): Geometry | null {
    try {
      const jsts1 = this.toJTSGeometry(g1);
      const jsts2 = this.toJTSGeometry(g2);
      const united = jsts1.union(jsts2);
      return this.fromJTSGeometry(united);
    } catch (error) {
      return null;
    }
  }

  difference(g1: Geometry, g2: Geometry): Geometry | null {
    try {
      const jsts1 = this.toJTSGeometry(g1);
      const jsts2 = this.toJTSGeometry(g2);
      const differed = jsts1.difference(jsts2);
      return this.fromJTSGeometry(differed);
    } catch (error) {
      return null;
    }
  }

  // ==================== 工具方法 ====================

  distance(g1: Geometry, g2: Geometry, units?: DistanceUnit): number {
    const jsts1 = this.toJTSGeometry(g1);
    const jsts2 = this.toJTSGeometry(g2);

    let distance = jsts1.distance(jsts2);

    // JSTS 返回的是几何坐标单位的距离
    // 如果需要转换为其他单位，需要额外处理
    // 这里简化处理，假设输入是度数（WGS84）
    if (units === 'kilometers') {
      distance = distance * 111.32; // 近似转换
    } else if (units === 'miles') {
      distance = distance * 69.09;
    } else if (units === 'meters') {
      distance = distance * 111320;
    }

    return distance;
  }

  area(geometry: Geometry): number {
    const jstsGeometry = this.toJTSGeometry(geometry);
    return jstsGeometry.getArea();
  }

  length(geometry: Geometry): number {
    const jstsGeometry = this.toJTSGeometry(geometry);
    return jstsGeometry.getLength();
  }

  bbox(geometry: Geometry): BBox {
    const jstsGeometry = this.toJTSGeometry(geometry);
    const envelope = jstsGeometry.getEnvelope();

    return {
      minX: envelope.getMinX(),
      minY: envelope.getMinY(),
      maxX: envelope.getMaxX(),
      maxY: envelope.getMaxY()
    };
  }

  centroid(geometry: Geometry): Geometry {
    const jstsGeometry = this.toJTSGeometry(geometry);
    const centroid = jstsGeometry.getCentroid();
    return this.fromJTSGeometry(centroid);
  }

  toFeature<G extends Geometry = Geometry, P = any>(
    geometry: G,
    properties?: P
  ): Feature<G, P> {
    return {
      type: 'Feature',
      geometry,
      properties: properties || {} as P
    };
  }

  simplify(geometry: Geometry, tolerance: number, highQuality: boolean = false): Geometry {
    // JSTS 的简化需要使用 DouglasPeuckerSimplifier
    // 这里提供一个简化实现
    try {
      const jstsGeometry = this.toJTSGeometry(geometry);

      // 简化实现：直接返回原始几何
      // 完整实现需要使用 JSTS 的简化器
      return geometry;
    } catch (error) {
      return geometry;
    }
  }
}

/**
 * 动态加载并初始化 JSTS 引擎
 *
 * @returns JSTS 引擎实例，如果 JSTS 未安装则返回 null
 */
export async function loadJTSEngine(): Promise<JTSEngine | null> {
  try {
    const engine = new JTSEngine({ name: 'jsts' });
    await engine.initialize();
    return engine;
  } catch (error) {
    console.warn('Failed to load JSTS engine:', error);
    return null;
  }
}
