# 自定义空间引擎开发指南

## 概述

本指南将帮助您创建自定义的空间计算引擎，并集成到 WebGeoDB 的插件系统中。

## 为什么创建自定义引擎？

- **性能优化**: 针对特定场景优化算法
- **功能扩展**: 添加特殊的空间计算功能
- **库集成**: 集成其他空间库（如 GEOS、CGAL 等）
- **特殊需求**: 满足特定的业务需求

## 基础实现

### 1. 创建引擎类

```typescript
import type {
  Geometry,
  Feature,
  BBox,
  Point,
  LineString,
  Polygon
} from '@webgeodb/core';
import type {
  SpatialEngine,
  EngineCapabilities,
  EngineConfig
} from '@webgeodb/core';

class MyCustomEngine implements SpatialEngine {
  readonly name = 'my-custom-engine';
  readonly capabilities: EngineCapabilities = {
    supportedPredicates: [
      'intersects',
      'contains',
      'within',
      'equals',
      'disjoint'
    ],
    supportedGeometryTypes: [
      'Point',
      'Polygon'
    ],
    supportsTopology: true,
    supportsDistance: true,
    precision: 'exact'
  };

  constructor(config?: EngineConfig) {
    // 初始化代码
  }

  // 必须实现的谓词方法
  intersects(g1: Geometry, g2: Geometry): boolean {
    // 自定义实现
  }

  contains(g1: Geometry, g2: Geometry): boolean {
    // 自定义实现
  }

  within(g1: Geometry, g2: Geometry): boolean {
    // 自定义实现
  }

  equals(g1: Geometry, g2: Geometry): boolean {
    // 自定义实现
  }

  disjoint(g1: Geometry, g2: Geometry): boolean {
    // 自定义实现
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

  // 拓扑操作
  buffer(geometry: Geometry, distance: number, units?: string): Geometry {
    // 自定义实现
  }

  intersection(g1: Geometry, g2: Geometry): Geometry | null {
    // 自定义实现
  }

  union(g1: Geometry, g2: Geometry): Geometry | null {
    // 自定义实现
  }

  difference(g1: Geometry, g2: Geometry): Geometry | null {
    // 自定义实现
  }

  // 工具方法
  distance(g1: Geometry, g2: Geometry, units?: string): number {
    // 自定义实现
  }

  area(geometry: Geometry): number {
    // 自定义实现
  }

  length(geometry: Geometry): number {
    // 自定义实现
  }

  bbox(geometry: Geometry): BBox {
    // 自定义实现
  }

  centroid(geometry: Geometry): Geometry {
    // 自定义实现
  }

  toFeature<G extends Geometry, P = any>(
    geometry: G,
    properties?: P
  ): Feature<G, P> {
    return {
      type: 'Feature',
      geometry,
      properties: properties || {} as P
    };
  }

  simplify(geometry: Geometry, tolerance: number, highQuality?: boolean): Geometry {
    // 自定义实现
  }
}
```

### 2. 注册引擎

```typescript
import { EngineRegistry } from '@webgeodb/core';

const engine = new MyCustomEngine();
EngineRegistry.register(engine);
```

### 3. 使用引擎

```typescript
import { QueryBuilder } from '@webgeodb/core';

const queryBuilder = new QueryBuilder('places', storage, spatialIndex)
  .withEngine(engine)
  .intersects('geometry', searchPolygon);
```

## 高级实现

### 异步初始化

如果您的引擎需要异步加载依赖：

```typescript
class AsyncEngine implements SpatialEngine {
  readonly name = 'async-engine';
  readonly capabilities: EngineCapabilities = { /* ... */ };

  private loaded = false;

  async initialize(): Promise<void> {
    if (this.loaded) return;

    // 加载外部库
    const module = await import('external-spatial-lib');
    this.lib = module;
    this.loaded = true;
  }

  private ensureInitialized() {
    if (!this.loaded) {
      throw new Error('Engine not initialized');
    }
  }

  intersects(g1: Geometry, g2: Geometry): boolean {
    this.ensureInitialized();
    return this.lib.intersects(g1, g2);
  }
}

// 使用
const engine = new AsyncEngine();
await engine.initialize();
EngineRegistry.register(engine);
```

### Web Worker 支持

在 Web Worker 中运行计算：

```typescript
class WorkerEngine implements SpatialEngine {
  readonly name = 'worker-engine';
  readonly capabilities: EngineCapabilities = { /* ... */ };
  private worker: Worker;

  constructor() {
    this.worker = new Worker('spatial-worker.js');
  }

  async initialize(): Promise<void> {
    return new Promise((resolve) => {
      this.worker.onmessage = (e) => {
        if (e.data.type === 'ready') {
          resolve();
        }
      };
    });
  }

  intersects(g1: Geometry, g2: Geometry): boolean {
    return new Promise((resolve) => {
      const id = this.generateId();

      this.worker.onmessage = (e) => {
        if (e.data.id === id) {
          resolve(e.data.result);
        }
      };

      this.worker.postMessage({
        id,
        method: 'intersects',
        args: [g1, g2]
      });
    });
  }
}
```

### WASM 引擎

使用 WebAssembly 加速：

```typescript
class WASMEngine implements SpatialEngine {
  readonly name = 'wasm-engine';
  readonly capabilities: EngineCapabilities = { /* ... */ };
  private wasmModule: any;

  async initialize(): Promise<void> {
    const response = await fetch('spatial.wasm');
    const buffer = await response.arrayBuffer();
    this.wasmModule = await WebAssembly.instantiate(buffer);
  }

  intersects(g1: Geometry, g2: Geometry): boolean {
    const result = this.wasmModule.exports.intersects(
      this.serializeGeometry(g1),
      this.serializeGeometry(g2)
    );
    return result === 1;
  }
}
```

## 插件开发

### 创建谓词插件

```typescript
import {
  PredicatePluginBase,
  registerPredicatePlugin
} from '@webgeodb/core';
import type { Geometry } from '@webgeodb/core';

interface FastTouchesPluginMetadata {
  name: 'fast-touches';
  version: '1.0.0';
  description: '快速 touches 谓词实现';
  predicates: ['touches'];
  supportedGeometryTypes: [['Point', 'LineString']];
}

class FastTouchesPlugin extends PredicatePluginBase {
  metadata: FastTouchesPluginMetadata = {
    name: 'fast-touches',
    version: '1.0.0',
    description: '快速 touches 谓词实现',
    predicates: ['touches'],
    supportedGeometryTypes: [['Point', 'LineString']]
  };

  execute(g1: Geometry, g2: Geometry): boolean {
    // 快速实现
    if (g1.type !== 'Point' || g2.type !== 'LineString') {
      return false;
    }

    const point = g1.coordinates;
    const line = g2.coordinates;

    // 检查点是否在线的端点
    return this.coordinatesEqual(point, line[0]) ||
           this.coordinatesEqual(point, line[line.length - 1]);
  }

  private coordinatesEqual(
    c1: [number, number] | [number, number, number],
    c2: [number, number] | [number, number, number]
  ): boolean {
    if (c1.length !== c2.length) return false;
    for (let i = 0; i < c1.length; i++) {
      if (Math.abs(c1[i] - c2[i]) > 0.000001) return false;
    }
    return true;
  }
}

// 注册插件
registerPredicatePlugin(new FastTouchesPlugin());
```

## 测试

### 单元测试

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyCustomEngine } from './my-custom-engine';

describe('MyCustomEngine', () => {
  let engine: MyCustomEngine;

  beforeEach(() => {
    engine = new MyCustomEngine();
  });

  it('should correctly check intersection', () => {
    const point1: Point = { type: 'Point', coordinates: [0, 0] };
    const point2: Point = { type: 'Point', coordinates: [1, 1] };

    expect(engine.intersects(point1, point2)).toBe(false);
    expect(engine.intersects(point1, point1)).toBe(true);
  });

  it('should calculate distance', () => {
    const point1: Point = { type: 'Point', coordinates: [0, 0] };
    const point2: Point = { type: 'Point', coordinates: [1, 1] };

    const distance = engine.distance(point1, point2);
    expect(distance).toBeGreaterThan(0);
  });
});
```

### 性能测试

```typescript
import { bench, describe } from 'vitest';

describe('MyCustomEngine Performance', () => {
  const engine = new MyCustomEngine();
  const testGeometries = createTestGeometries();

  bench('Intersection performance', () => {
    for (const [g1, g2] of testGeometries) {
      engine.intersects(g1, g2);
    }
  });
});
```

## 部署

### NPM 包

```typescript
// package.json
{
  "name": "webgeodb-engine-myengine",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@webgeodb/core": "^1.0.0"
  }
}
```

### 使用方式

```typescript
import { EngineRegistry } from '@webgeodb/core';
import { MyCustomEngine } from 'webgeodb-engine-myengine';

// 注册引擎
const engine = new MyCustomEngine();
EngineRegistry.register(engine);

// 使用引擎
const queryBuilder = new QueryBuilder('places', storage, spatialIndex)
  .useEngine('my-custom-engine')
  .intersects('geometry', searchPolygon);
```

## 最佳实践

### 1. 错误处理

```typescript
class RobustEngine implements SpatialEngine {
  intersects(g1: Geometry, g2: Geometry): boolean {
    try {
      return this.computeIntersects(g1, g2);
    } catch (error) {
      console.error('Intersection computation failed:', error);
      // 回退到边界框检查
      return this.bboxIntersects(
        this.computeBBox(g1),
        this.computeBBox(g2)
      );
    }
  }
}
```

### 2. 类型检查

```typescript
class TypeSafeEngine implements SpatialEngine {
  intersects(g1: Geometry, g2: Geometry): boolean {
    // 检查几何类型
    if (!this.supportsGeometry(g1)) {
      throw new Error(`Unsupported geometry type: ${g1.type}`);
    }

    if (!this.supportsGeometry(g2)) {
      throw new Error(`Unsupported geometry type: ${g2.type}`);
    }

    return this.computeIntersects(g1, g2);
  }

  private supportsGeometry(geometry: Geometry): boolean {
    return this.capabilities.supportedGeometryTypes.includes(geometry.type);
  }
}
```

### 3. 性能优化

```typescript
class OptimizedEngine implements SpatialEngine {
  private cache = new Map<string, any>();

  bbox(geometry: Geometry): BBox {
    // 检查缓存
    const cacheKey = JSON.stringify(geometry);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const bbox = this.computeBBox(geometry);
    this.cache.set(cacheKey, bbox);
    return bbox;
  }
}
```

### 4. 日志记录

```typescript
class LoggingEngine implements SpatialEngine {
  private log(method: string, args: any[], result: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.name}.${method}]`, {
        args,
        result,
        time: Date.now()
      });
    }
  }

  intersects(g1: Geometry, g2: Geometry): boolean {
    const result = this.computeIntersects(g1, g2);
    this.log('intersects', [g1, g2], result);
    return result;
  }
}
```

## 完整示例

### 简单引擎示例

```typescript
import { SpatialEngine, EngineCapabilities } from '@webgeodb/core';

class SimpleEngine implements SpatialEngine {
  readonly name = 'simple';
  readonly capabilities: EngineCapabilities = {
    supportedPredicates: ['intersects', 'disjoint'],
    supportedGeometryTypes: ['Point'],
    supportsTopology: false,
    supportsDistance: true,
    precision: 'approximate'
  };

  intersects(g1: Geometry, g2: Geometry): boolean {
    if (g1.type !== 'Point' || g2.type !== 'Point') {
      throw new Error('Only Point geometry is supported');
    }

    const p1 = g1.coordinates;
    const p2 = g2.coordinates;

    // 简单距离检查
    const distance = Math.sqrt(
      Math.pow(p2[0] - p1[0], 2) +
      Math.pow(p2[1] - p1[1], 2)
    );

    return distance < 0.0001; // 阈值
  }

  // ... 其他方法
}
```

### 高级引擎示例

```typescript
import { SpatialEngine, EngineCapabilities } from '@webgeodb/core';

class AdvancedEngine implements SpatialEngine {
  readonly name = 'advanced';
  readonly capabilities: EngineCapabilities = {
    supportedPredicates: [
      'intersects', 'contains', 'within', 'equals',
      'disjoint', 'crosses', 'touches', 'overlaps'
    ],
    supportedGeometryTypes: [
      'Point', 'LineString', 'Polygon',
      'MultiPoint', 'MultiLineString', 'MultiPolygon'
    ],
    supportsTopology: true,
    supportsDistance: true,
    precision: 'exact'
  };

  private cache: Map<string, any> = new Map();

  async initialize(): Promise<void> {
    // 异步初始化
  }

  intersects(g1: Geometry, g2: Geometry): boolean {
    // 使用缓存
    const cacheKey = JSON.stringify({ g1, g2 });
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const result = this.computeIntersects(g1, g2);
    this.cache.set(cacheKey, result);
    return result;
  }

  // ... 其他方法
}
```

## 故障排除

### 常见问题

**Q: 如何处理不支持的几何类型？**
```typescript
if (!this.capabilities.supportedGeometryTypes.includes(geometry.type)) {
  throw new Error(`Unsupported geometry type: ${geometry.type}`);
}
```

**Q: 如何优化性能？**
```typescript
// 1. 使用边界框预检查
// 2. 缓存计算结果
// 3. 使用 Web Worker
// 4. 考虑 WASM 实现
```

**Q: 如何调试？**
```typescript
class DebugEngine implements SpatialEngine {
  intersects(g1: Geometry, g2: Geometry): boolean {
    console.log('Computing intersection:', { g1, g2 });
    const result = this.computeIntersects(g1, g2);
    console.log('Result:', result);
    return result;
  }
}
```

## 贡献

欢迎将您的自定义引擎贡献给社区！请查看[贡献指南](../CONTRIBUTING.md)。

## 资源

- [OGC 简单要素规范](https://www.ogc.org/standards/sfa)
- [DE-9IM 模型](https://en.wikipedia.org/wiki/DE-9IM)
- [GeoJSON 规范](https://geojson.org/)
- [WebAssembly](https://webassembly.org/)
- [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
