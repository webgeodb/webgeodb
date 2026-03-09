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

## 错误处理

### 常见错误

```typescript
// 引擎未找到
class EngineNotFoundError extends Error {
  constructor(engineName: string);
}

// 引擎未初始化
class EngineNotInitializedError extends Error {
  constructor(engineName: string);
}

// 不支持的谓词
class UnsupportedPredicateError extends Error {
  constructor(predicate: string, engineName: string);
}

// 几何类型不支持
class UnsupportedGeometryTypeError extends Error {
  constructor(geometryType: string, engineName: string);
}
```

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
