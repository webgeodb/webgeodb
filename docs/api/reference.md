# WebGeoDB API 参考文档

## 核心类

### SpatialEngine

空间引擎的抽象接口，所有空间引擎必须实现此接口。

```typescript
interface SpatialEngine {
  readonly name: string;
  readonly capabilities: EngineCapabilities;
  initialize?(): Promise<void>;

  // 核心谓词
  intersects(g1: Geometry, g2: Geometry): boolean;
  contains(g1: Geometry, g2: Geometry): boolean;
  within(g1: Geometry, g2: Geometry): boolean;
  equals(g1: Geometry, g2: Geometry): boolean;
  disjoint(g1: Geometry, g2: Geometry): boolean;
  crosses(g1: Geometry, g2: Geometry): boolean;
  touches(g1: Geometry, g2: Geometry): boolean;
  overlaps(g1: Geometry, g2: Geometry): boolean;

  // 拓扑操作
  buffer(geometry: Geometry, distance: number, units?: DistanceUnit): Geometry;
  intersection(g1: Geometry, g2: Geometry): Geometry | null;
  union(g1: Geometry, g2: Geometry): Geometry | null;
  difference(g1: Geometry, g2: Geometry): Geometry | null;

  // 工具方法
  distance(g1: Geometry, g2: Geometry, units?: DistanceUnit): number;
  area(geometry: Geometry): number;
  length(geometry: Geometry): number;
  bbox(geometry: Geometry): BBox;
  centroid(geometry: Geometry): Geometry;
  toFeature<G extends Geometry, P>(geometry: G, properties?: P): Feature<G, P>;
  simplify(geometry: Geometry, tolerance: number, highQuality?: boolean): Geometry;
}
```

### EngineRegistry

全局引擎注册表，管理所有空间引擎实例。

```typescript
class EngineRegistryClass {
  // 注册引擎
  register(engine: SpatialEngine): void;

  // 注销引擎
  unregister(name: string): void;

  // 获取引擎
  getEngine(name?: string): SpatialEngine;
  getDefaultEngine(): SpatialEngine;

  // 设置默认引擎
  setDefaultEngine(name: string): void;

  // 查询方法
  getEngineNames(): string[];
  hasEngine(name: string): boolean;
  getEnginesForPredicate(predicate: SpatialPredicate): SpatialEngine[];
  getEnginesForGeometryType(geometryType: GeometryType): SpatialEngine[];
  getBestEngineForPredicate(predicate: SpatialPredicate): SpatialEngine;

  // 信息获取
  getEnginesInfo(): EngineInfo[];

  // 清理
  clear(): void;
}

// 全局实例
export const EngineRegistry: EngineRegistryClass;
```

### GeometryCache

几何缓存系统，优化空间计算性能。

```typescript
class GeometryCache {
  constructor(maxPoolSize?: number, poolTTL?: number);

  // Feature 对象池
  acquireFeature<G extends Geometry, P>(
    geometry: G,
    properties: P,
    featureFactory: (g: G, p: P) => Feature<G, P>
  ): Feature<G, P>;
  releaseFeature<G extends Geometry, P>(feature: Feature<G, P>): void;

  // 坐标缓存
  getCoordinates<G extends Geometry>(
    geometry: G,
    extractor: (g: G) => any[][]
  ): any[][];
  clearCoordinateCache(geometry?: Geometry): void;

  // 边界框缓存
  getBBox(geometry: Geometry): BBox;
  clearBBoxCache(geometry?: Geometry): void;

  // 缓存管理
  clear(): void;
  getStats(): CacheStats;
  resetStats(): void;
  logStats(): void;
}

// 全局实例
export const globalGeometryCache: GeometryCache;
```

## 类型定义

### Geometry

```typescript
type Geometry =
  | Point
  | LineString
  | Polygon
  | MultiPoint
  | MultiLineString
  | MultiPolygon
  | GeometryCollection;

interface Point {
  type: 'Point';
  coordinates: Position;
}

interface LineString {
  type: 'LineString';
  coordinates: Position[];
}

interface Polygon {
  type: 'Polygon';
  coordinates: Position[][];
}

// ... 其他几何类型
```

### SpatialPredicate

```typescript
type SpatialPredicate =
  | 'intersects'
  | 'contains'
  | 'within'
  | 'equals'
  | 'disjoint'
  | 'crosses'
  | 'touches'
  | 'overlaps';
```

### DistanceUnit

```typescript
type DistanceUnit =
  | 'kilometers'
  | 'miles'
  | 'degrees'
  | 'radians'
  | 'inches'
  | 'yards'
  | 'meters'
  | 'centimeters';
```

### EngineCapabilities

```typescript
interface EngineCapabilities {
  supportedPredicates: SpatialPredicate[];
  supportedGeometryTypes: GeometryType[];
  supportsTopology: boolean;
  supportsDistance: boolean;
  precision: 'exact' | 'approximate';
}
```

### BBox

```typescript
interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
```

## 内置引擎

### TurfEngine

Turf.js 引擎实现。

```typescript
class TurfEngine implements SpatialEngine {
  constructor(config?: EngineConfig);
}
```

**配置选项：**
```typescript
interface EngineConfig {
  name: string;
  isDefault?: boolean;
  defaultUnits?: DistanceUnit;
  options?: Record<string, any>;
}
```

**使用示例：**
```typescript
import { TurfEngine } from '@webgeodb/core';

const engine = new TurfEngine({
  name: 'turf',
  defaultUnits: 'kilometers'
});
```

### JTSEngine

JSTS 引擎实现（可选依赖）。

```typescript
class JTSEngine implements SpatialEngine {
  constructor(config?: EngineConfig);
  initialize(): Promise<void>;
}
```

**加载函数：**
```typescript
async function loadJTSEngine(): Promise<JTSEngine | null>;
```

**使用示例：**
```typescript
import { loadJTSEngine } from '@webgeodb/core';

const engine = await loadJTSEngine();
if (engine) {
  EngineRegistry.register(engine);
}
```

## 查询构建器

### QueryBuilder

增强的查询构建器，支持空间引擎。

```typescript
class QueryBuilder<T = any> {
  constructor(
    tableName: string,
    storage: IndexedDBStorage,
    spatialIndex?: SpatialIndex | null,
    spatialEngine?: SpatialEngine
  );

  // 空间查询方法
  intersects(field: string, geometry: Geometry): this;
  contains(field: string, geometry: Geometry): this;
  within(field: string, geometry: Geometry): this;
  distance(
    field: string,
    point: [number, number],
    operator: '<' | '<=' | '>' | '>=',
    distance: number
  ): this;

  // 引擎选择
  withEngine(engine: SpatialEngine): this;
  useEngine(engineName: string): this;

  // 其他查询方法
  where(field: string, operator: QueryOperator, value: any): this;
  orderBy(field: string, direction?: 'asc' | 'desc'): this;
  limit(n: number): this;
  offset(n: number): this;

  // 执行查询
  toArray(): Promise<T[]>;
}
```

## SQL 查询 API 🆕

### WebGeoDB SQL 方法

WebGeoDB 提供完整的 PostgreSQL/PostGIS 兼容 SQL 查询接口。

```typescript
class WebGeoDB {
  /**
   * 执行 SQL 查询
   * @param sql SQL 语句
   * @param options 执行选项
   */
  async query(
    sql: string,
    options?: SQLExecuteOptions
  ): Promise<any[]>;

  /**
   * 创建预编译语句
   * @param sql SQL 语句模板
   */
  prepare(sql: string): PreparedSQLStatement;

  /**
   * 分析查询计划
   * @param sql SQL 语句
   */
  explain(sql: string): QueryPlan;

  /**
   * 使查询缓存失效
   * @param tableName 表名（可选，不传则清空所有缓存）
   */
  invalidateQueryCache(tableName?: string): void;

  /**
   * 获取缓存统计
   */
  getQueryCacheStats(): SQLCacheStats;
}
```

### SQLExecuteOptions

SQL 查询执行选项。

```typescript
interface SQLExecuteOptions {
  /**
   * 参数化查询参数
   * PostgreSQL 风格：$1, $2, $3...
   */
  params?: any[];

  /**
   * 是否使用缓存（默认 true）
   */
  useCache?: boolean;

  /**
   * 查询超时时间（毫秒）
   */
  timeout?: number;
}
```

### PreparedSQLStatement

预编译语句，用于重复执行相同结构的查询。

```typescript
class PreparedSQLStatement {
  /**
   * 执行预编译语句
   * @param params 参数数组
   */
  async execute(params?: any[]): Promise<any[]>;

  /**
   * 获取查询计划
   */
  explain(): QueryPlan;

  /**
   * 获取原始 SQL
   */
  getSQL(): string;
}
```

### QueryPlan

查询执行计划，包含性能分析信息。

```typescript
interface QueryPlan {
  /**
   * 表名
   */
  table: string;

  /**
   * 选择的列
   */
  columns: string[];

  /**
   * 属性条件
   */
  attributeConditions: AttributeQueryCondition[];

  /**
   * 空间条件
   */
  spatialConditions: SQLSpatialQueryCondition[];

  /**
   * 排序规则
   */
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  }[];

  /**
   * 限制数量
   */
  limit?: number;

  /**
   * 偏移量
   */
  offset?: number;

  /**
   * 预估查询成本
   */
  estimatedCost: number;

  /**
   * 使用的索引
   */
  indexes: string[];
}
```

### SQLCacheStats

查询缓存统计信息。

```typescript
interface SQLCacheStats {
  /**
   * 缓存大小
   */
  size: number;

  /**
   * 最大缓存大小
   */
  maxSize: number;

  /**
   * 缓存命中次数
   */
  hits: number;

  /**
   * 缓存未命中次数
   */
  misses: number;

  /**
   * 命中率
   */
  hitRate: number;
}
```

### PostGIS 函数支持

支持的空间函数列表：

**空间关系谓词：**
- `ST_Intersects(geom1, geom2)` - 相交判断
- `ST_Contains(geom1, geom2)` - 包含判断
- `ST_Within(geom1, geom2)` - 在内部判断
- `ST_Equals(geom1, geom2)` - 相等判断
- `ST_Disjoint(geom1, geom2)` - 分离判断
- `ST_Touches(geom1, geom2)` - 接触判断
- `ST_Crosses(geom1, geom2)` - 交叉判断
- `ST_Overlaps(geom1, geom2)` - 重叠判断

**距离函数：**
- `ST_DWithin(geom, point, distance)` - 距离内判断
- `ST_Distance(geom1, geom2)` - 距离计算

**几何构造：**
- `ST_MakePoint(x, y)` - 创建点
- `ST_MakeLine(point1, point2)` - 创建线
- `ST_Buffer(geom, radius, units)` - 缓冲区
- `ST_Centroid(geom)` - 质心计算

**几何转换：**
- `ST_GeomFromText(wkt)` - WKT 转几何
- `ST_AsText(geom)` - 几何转 WKT
- `ST_AsBinary(geom)` - 几何转 WKB

### SQL 使用示例

```typescript
import { WebGeoDB } from '@webgeodb/core';

const db = new WebGeoDB({ name: 'my-db' });
await db.open();

// 简单查询
const results = await db.query(`
  SELECT * FROM features WHERE type = 'poi'
`);

// 参数化查询
const pois = await db.query(`
  SELECT * FROM features
  WHERE type = $1 AND rating >= $2
`, { params: ['restaurant', 4.0] });

// PostGIS 空间查询
const nearby = await db.query(`
  SELECT * FROM features
  WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 1000)
`);

// 预编译语句
const stmt = db.prepare(`
  SELECT * FROM features WHERE rating >= $1
`);
const highlyRated = await stmt.execute([4.0]);
const topRated = await stmt.execute([5.0]);

// 查询计划分析
const plan = db.explain('SELECT * FROM features WHERE type = $1');
console.log('预估成本:', plan.estimatedCost);
```

## 优化谓词

### 优化的核心谓词

```typescript
// 相交判断（带性能信息）
export function intersectsOptimized(
  g1: Geometry,
  g2: Geometry
): PredicateResult;

// 包含判断（带性能信息）
export function containsOptimized(
  g1: Geometry,
  g2: Geometry
): PredicateResult;

// 在内部判断（带性能信息）
export function withinOptimized(
  g1: Geometry,
  g2: Geometry
): PredicateResult;

interface PredicateResult {
  result: boolean;
  executionTime: number;
  bboxOptimized: boolean;
  optimization: 'bbox-early-out' | 'direct-coordinates' | 'full-computation' | 'none';
}
```

### 高级谓词

```typescript
// 接触判断（优化版本）
export function touchesOptimized(
  g1: Geometry,
  g2: Geometry
): boolean;

// 重叠判断（优化版本）
export function overlapsOptimized(
  g1: Geometry,
  g2: Geometry
): boolean;
```

## 常量

### 几何类型

```typescript
type GeometryType =
  | 'Point'
  | 'LineString'
  | 'Polygon'
  | 'MultiPoint'
  | 'MultiLineString'
  | 'MultiPolygon'
  | 'GeometryCollection';
```

### 查询操作符

```typescript
type QueryOperator =
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
```

## 工具函数

### BBox 工具

```typescript
// 计算边界框
export function getBBox(geometry: Geometry): BBox;

// 边界框相交
export function bboxIntersects(a: BBox, b: BBox): boolean;

// 边界框包含
export function bboxContains(a: BBox, b: BBox): boolean;

// 边界框交集
export function bboxIntersection(a: BBox, b: BBox): BBox | null;

// 边界框并集
export function bboxUnion(a: BBox, b: BBox): BBox;

// 边界框面积
export function bboxArea(bbox: BBox): number;

// 扩展边界框
export function bboxExpand(bbox: BBox, distance: number): BBox;
```

### 缓存装饰器

```typescript
// 缓存结果装饰器
export function cachedResult<G extends Geometry, R>(
  cache: WeakMap<G, R>,
  keyExtractor: (...args: any[]) => G
): MethodDecorator;
```

## 性能监控 API 🆕

WebGeoDB 提供完整的性能监控系统，帮助您识别和优化性能瓶颈。

### 监控方法

```typescript
class WebGeoDB {
  /**
   * 启用或禁用性能分析
   * @param enabled 是否启用
   */
  async enableProfiling(enabled: boolean): Promise<void>;

  /**
   * 获取性能统计信息
   */
  async getStats(): Promise<PerformanceStats>;

  /**
   * 获取慢查询列表
   * @param threshold 慢查询阈值（毫秒）
   */
  async getSlowQueries(threshold: number): Promise<SlowQuery[]>;

  /**
   * 生成性能报告
   */
  async getPerformanceReport(): Promise<PerformanceReport>;

  /**
   * 重置性能统计
   */
  async resetStats(): Promise<void>;

  /**
   * 获取查询缓存统计
   */
  getQueryCacheStats(): SQLCacheStats;
}
```

### PerformanceStats

性能统计信息。

```typescript
interface PerformanceStats {
  /**
   * 查询总次数
   */
  queryCount: number;

  /**
   * 平均查询时间（毫秒）
   */
  avgQueryTime: number;

  /**
   * 最小查询时间（毫秒）
   */
  minQueryTime: number;

  /**
   * 最大查询时间（毫秒）
   */
  maxQueryTime: number;

  /**
   * 索引命中率（0-1）
   */
  indexHitRate: number;

  /**
   * 缓存命中率（0-1）
   */
  cacheHitRate: number;

  /**
   * 内存使用（字节）
   */
  memoryUsage: number;

  /**
   * 慢查询数量
   */
  slowQueryCount: number;
}
```

### SlowQuery

慢查询记录。

```typescript
interface SlowQuery {
  /**
   * SQL 语句
   */
  sql: string;

  /**
   * 执行时间（毫秒）
   */
  duration: number;

  /**
   * 执行时间戳
   */
  timestamp: number;

  /**
   * 查询参数
   */
  params?: any[];

  /**
   * 查询计划
   */
  plan?: QueryPlan;
}
```

### PerformanceReport

完整的性能报告。

```typescript
interface PerformanceReport {
  /**
   * 统计信息
   */
  stats: PerformanceStats;

  /**
   * 慢查询列表
   */
  slowQueries: SlowQuery[];

  /**
   * 缓存统计
   */
  cacheStats: SQLCacheStats;

  /**
   * 索引使用情况
   */
  indexUsage: IndexUsageStats[];

  /**
   * 建议
   */
  recommendations: string[];
}
```

### 使用示例

```typescript
import { WebGeoDB } from 'webgeodb-core';

const db = new WebGeoDB('my-db');
await db.open();

// 启用性能分析
await db.enableProfiling(true);

// 执行一些查询
await db.query('SELECT * FROM features WHERE type = $1', ['restaurant']);

// 获取统计信息
const stats = await db.getStats();
console.log(`平均查询时间: ${stats.avgQueryTime}ms`);
console.log(`索引命中率: ${(stats.indexHitRate * 100).toFixed(1)}%`);

// 获取慢查询
const slowQueries = await db.getSlowQueries(100);
console.log(`发现 ${slowQueries.length} 个慢查询`);

// 生成完整报告
const report = await db.getPerformanceReport();
console.log('性能报告:', report);

// 重置统计
await db.resetStats();
```

---

## 错误处理 API 🆕

WebGeoDB 提供完整的错误处理体系，包含 6 种结构化错误类型。

### 错误类型

```typescript
/**
 * 基础错误类
 */
class WebGeoDBError extends Error {
  /**
   * 错误代码
   */
  code: ErrorCode;

  /**
   * 错误上下文
   */
  context?: Record<string, any>;

  /**
   * 原始错误
   */
  originalError?: Error;

  constructor(
    code: ErrorCode,
    message: string,
    context?: Record<string, any>,
    originalError?: Error
  );
}

/**
 * 数据库错误
 */
class DatabaseError extends WebGeoDBError {
  // 数据库打开、关闭、连接等错误
}

/**
 * 查询错误
 */
class QueryError extends WebGeoDBError {
  // 查询构建、执行等错误
}

/**
 * 验证错误
 */
class ValidationError extends WebGeoDBError {
  // 数据验证、类型检查等错误
}

/**
 * 索引错误
 */
class IndexError extends WebGeoDBError {
  // 索引创建、维护等错误
}

/**
 * SQL 错误
 */
class SQLError extends WebGeoDBError {
  // SQL 解析、执行等错误
}

/**
 * 存储错误
 */
class StorageError extends WebGeoDBError {
  // IndexedDB 存储相关错误
}
```

### ErrorCode 枚举

```typescript
enum ErrorCode {
  // 数据库错误
  DATABASE_CLOSED = 'DATABASE_CLOSED',
  DATABASE_NOT_FOUND = 'DATABASE_NOT_FOUND',
  DATABASE_VERSION_ERROR = 'DATABASE_VERSION_ERROR',

  // 查询错误
  QUERY_EXECUTION_FAILED = 'QUERY_EXECUTION_FAILED',
  INVALID_QUERY = 'INVALID_QUERY',
  UNSUPPORTED_OPERATOR = 'UNSUPPORTED_OPERATOR',

  // 验证错误
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_GEOMETRY = 'INVALID_GEOMETRY',
  INVALID_FIELD = 'INVALID_FIELD',

  // 索引错误
  INDEX_NOT_FOUND = 'INDEX_NOT_FOUND',
  INDEX_NOT_AVAILABLE = 'INDEX_NOT_AVAILABLE',
  INDEX_CREATION_FAILED = 'INDEX_CREATION_FAILED',

  // SQL 错误
  SQL_PARSE_ERROR = 'SQL_PARSE_ERROR',
  SQL_EXECUTION_ERROR = 'SQL_EXECUTION_ERROR',
  UNKNOWN_SPATIAL_PREDICATE = 'UNKNOWN_SPATIAL_PREDICATE',

  // 存储错误
  STORAGE_ERROR = 'STORAGE_ERROR',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',

  // 空间引擎错误
  SPATIAL_ENGINE_REQUIRED = 'SPATIAL_ENGINE_REQUIRED',
  SPATIAL_ENGINE_ERROR = 'SPATIAL_ENGINE_ERROR',

  // 其他
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

### ErrorFactory

错误工厂，用于创建结构化错误。

```typescript
class ErrorFactory {
  /**
   * 创建数据库错误
   */
  static databaseError(
    code: ErrorCode,
    message: string,
    context?: Record<string, any>,
    originalError?: Error
  ): DatabaseError;

  /**
   * 创建查询错误
   */
  static queryError(
    code: ErrorCode,
    message: string,
    context?: Record<string, any>,
    originalError?: Error
  ): QueryError;

  /**
   * 创建验证错误
   */
  static validationError(
    code: ErrorCode,
    message: string,
    context?: Record<string, any>,
    originalError?: Error
  ): ValidationError;

  /**
   * 创建索引错误
   */
  static indexError(
    code: ErrorCode,
    message: string,
    context?: Record<string, any>,
    originalError?: Error
  ): IndexError;

  /**
   * 创建 SQL 错误
   */
  static sqlError(
    code: ErrorCode,
    message: string,
    context?: Record<string, any>,
    originalError?: Error
  ): SQLError;

  /**
   * 创建存储错误
   */
  static storageError(
    code: ErrorCode,
    message: string,
    context?: Record<string, any>,
    originalError?: Error
  ): StorageError;
}
```

### 错误处理示例

```typescript
import {
  WebGeoDB,
  DatabaseError,
  QueryError,
  ValidationError,
  SQLError,
  ErrorCode
} from 'webgeodb-core';

const db = new WebGeoDB('my-db');

try {
  await db.open();
} catch (error) {
  if (error instanceof DatabaseError) {
    console.error('数据库错误:', error.code, error.message);
    console.error('上下文:', error.context);

    if (error.code === ErrorCode.DATABASE_CLOSED) {
      // 处理数据库关闭错误
    }
  }
}

try {
  await db.insert('features', invalidData);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('验证错误:', error.message);
    console.error('无效字段:', error.context?.field);
  }
}

try {
  await db.query('SELECT * FROM invalid_table');
} catch (error) {
  if (error instanceof SQLError) {
    console.error('SQL 错误:', error.message);
    console.error('SQL 语句:', error.context?.sql);
  }
}

// 通用错误处理
try {
  await db.table('features').toArray();
} catch (error) {
  if (error instanceof WebGeoDBError) {
    console.error('WebGeoDB 错误:');
    console.error('- 代码:', error.code);
    console.error('- 消息:', error.message);
    console.error('- 上下文:', error.context);
    console.error('- 原始错误:', error.originalError);
  } else {
    console.error('未知错误:', error);
  }
}
```

### 常见错误

| 错误类型 | 错误代码 | 原因 | 解决方案 |
|---------|---------|------|----------|
| DatabaseError | DATABASE_CLOSED | 数据库未打开或已关闭 | 调用 `db.open()` |
| QueryError | QUERY_EXECUTION_FAILED | 查询执行失败 | 检查查询语法和数据 |
| ValidationError | INVALID_GEOMETRY | 几何对象无效 | 使用有效的 GeoJSON 格式 |
| IndexError | INDEX_NOT_FOUND | 索引不存在 | 先创建索引 |
| SQLError | SQL_PARSE_ERROR | SQL 解析失败 | 检查 SQL 语法 |
| StorageError | STORAGE_QUOTA_EXCEEDED | 存储配额已满 | 清理旧数据 |

## 事件

### 引擎事件

```typescript
// 引擎注册事件
EngineRegistry.on('engine:registered', (engine: SpatialEngine) => {
  console.log(`Engine ${engine.name} registered`);
});

// 引擎注销事件
EngineRegistry.on('engine:unregistered', (engineName: string) => {
  console.log(`Engine ${engineName} unregistered`);
});

// 默认引擎更改事件
EngineRegistry.on('default-engine:changed', (engineName: string) => {
  console.log(`Default engine changed to ${engineName}`);
});
```

### 缓存事件

```typescript
// 缓存命中事件
globalGeometryCache.on('cache:hit', (type: string) => {
  console.log(`Cache hit: ${type}`);
});

// 缓存未命中事件
globalGeometryCache.on('cache:miss', (type: string) => {
  console.log(`Cache miss: ${type}`);
});

// 缓存清理事件
globalGeometryCache.on('cache:cleared', () => {
  console.log('Cache cleared');
});
```

## 配置

### 全局配置

```typescript
interface WebGeoDBConfig {
  // 默认引擎
  defaultEngine?: string;

  // 缓存配置
  cache?: {
    maxPoolSize?: number;
    poolTTL?: number;
    enabled?: boolean;
  };

  // 性能配置
  performance?: {
    useOptimizedPredicates?: boolean;
    enableBBoxPrecheck?: boolean;
    batchSize?: number;
  };

  // 引擎配置
  engines?: {
    turf?: EngineConfig;
    jsts?: EngineConfig;
  };
}
```

## TypeScript 支持

所有 API 都有完整的 TypeScript 类型定义。

```typescript
import type {
  SpatialEngine,
  Geometry,
  SpatialPredicate,
  EngineCapabilities
} from '@webgeodb/core';
```

## 浏览器兼容性

- Chrome/Edge: ✅ 完全支持
- Firefox: ✅ 完全支持
- Safari: ✅ 完全支持
- IE11: ❌ 不支持

## Node.js 支持

所有功能都支持 Node.js 环境（需要 polyfill IndexedDB）。

```typescript
import { polyfill } from 'fake-indexeddb';

global.IndexedDB = polyfill();
```
