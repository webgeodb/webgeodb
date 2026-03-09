/**
 * Phase 5 Final Validation Test
 *
 * 验证插件系统核心功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  EngineRegistry
} from '../src/spatial/engine-registry';
import {
  globalPredicateRegistry,
  registerPredicatePlugin,
  executePredicate,
  PredicatePluginBase
} from '../src/spatial/predicates/predicate-registry';
import {
  globalPluginLoader
} from '../src/spatial/plugin-loader';
import type {
  SpatialEngine,
  EngineCapabilities
} from '../src/spatial/spatial-engine';
import type { Geometry, Point } from '../src/types';

/**
 * 测试引擎
 */
class TestEngine implements SpatialEngine {
  readonly name = 'test-engine';
  readonly capabilities: EngineCapabilities = {
    supportedPredicates: ['intersects', 'contains'],
    supportedGeometryTypes: ['Point'],
    supportsTopology: false,
    supportsDistance: false,
    precision: 'approximate' as const
  };

  intersects(g1: Geometry, g2: Geometry): boolean { return true; }
  contains(g1: Geometry, g2: Geometry): boolean { return true; }
  within(g1: Geometry, g2: Geometry): boolean { return true; }
  equals(g1: Geometry, g2: Geometry): boolean { return true; }
  disjoint(g1: Geometry, g2: Geometry): boolean { return false; }
  crosses(g1: Geometry, g2: Geometry): boolean { return false; }
  touches(g1: Geometry, g2: Geometry): boolean { return false; }
  overlaps(g1: Geometry, g2: Geometry): boolean { return false; }

  buffer(geometry: Geometry): Geometry { return geometry; }
  intersection(g1: Geometry, g2: Geometry): Geometry | null { return g1; }
  union(g1: Geometry, g2: Geometry): Geometry | null { return g1; }
  difference(g1: Geometry, g2: Geometry): Geometry | null { return g1; }

  toFeature(geometry: Geometry): any {
    return { type: 'Feature', geometry, properties: {} };
  }
  distance(g1: Geometry, g2: Geometry): number { return 0; }
  area(geometry: Geometry): number { return 0; }
  length(geometry: Geometry): number { return 0; }
  bbox(geometry: Geometry): [number, number, number, number] { return [0, 0, 1, 1]; }
  centroid(geometry: Geometry): Geometry { return geometry; }
  simplify(geometry: Geometry): number { return 0; }
}

/**
 * 测试插件
 */
class TestPlugin extends PredicatePluginBase {
  metadata = {
    name: 'test-plugin',
    version: '1.0.0',
    description: 'Test plugin',
    predicates: ['intersects' as const],
    supportedGeometryTypes: [['Point', 'Point']]
  };

  execute(g1: Geometry, g2: Geometry): boolean {
    return true;
  }
}

describe('Phase 5 Final Validation', () => {
  beforeEach(() => {
    EngineRegistry.clear();
    globalPredicateRegistry.clear();
    globalPluginLoader.clear();
  });

  afterEach(() => {
    EngineRegistry.clear();
    globalPredicateRegistry.clear();
    globalPluginLoader.clear();
  });

  describe('Engine Registry', () => {
    it('should register engine', () => {
      const engine = new TestEngine();
      EngineRegistry.register(engine);

      expect(EngineRegistry.hasEngine('test-engine')).toBe(true);
    });

    it('should get engine', () => {
      const engine = new TestEngine();
      EngineRegistry.register(engine);

      const retrieved = EngineRegistry.getEngine('test-engine');
      expect(retrieved.name).toBe('test-engine');
    });

    it('should get all engines', () => {
      const engine = new TestEngine();
      EngineRegistry.register(engine);

      const engines = EngineRegistry.getAllEngines();
      expect(engines.length).toBeGreaterThan(0);
      expect(engines.some(e => e.name === 'test-engine')).toBe(true);
    });

    it('should check predicate support', () => {
      const engine = new TestEngine();
      EngineRegistry.register(engine);

      expect(EngineRegistry.supportsPredicate('intersects')).toBe(true);
    });

    it('should check geometry type support', () => {
      const engine = new TestEngine();
      EngineRegistry.register(engine);

      expect(EngineRegistry.supportsGeometryType('Point')).toBe(true);
    });

    it('should get stats', () => {
      const engine = new TestEngine();
      EngineRegistry.register(engine);

      const stats = EngineRegistry.getStats();
      expect(stats.totalEngines).toBeGreaterThan(0);
      expect(stats.supportedPredicates).toContain('intersects');
    });

    it('should set default engine', () => {
      const engine = new TestEngine();
      EngineRegistry.register(engine);
      EngineRegistry.setDefaultEngine('test-engine');

      const defaultEngine = EngineRegistry.getDefaultEngine();
      expect(defaultEngine.name).toBe('test-engine');
    });

    it('should get best engine for predicate', () => {
      const engine = new TestEngine();
      EngineRegistry.register(engine);

      const bestEngine = EngineRegistry.getBestEngineForPredicate('intersects');
      expect(bestEngine.name).toBe('test-engine');
    });
  });

  describe('Predicate Registry', () => {
    it('should register plugin', async () => {
      const plugin = new TestPlugin();
      await globalPredicateRegistry.register(plugin);

      expect(globalPredicateRegistry.hasPlugin('test-plugin')).toBe(true);
    });

    it('should get plugin', async () => {
      const plugin = new TestPlugin();
      await globalPredicateRegistry.register(plugin);

      const retrieved = globalPredicateRegistry.getPlugin('test-plugin');
      expect(retrieved).toBe(plugin);
    });

    it('should get plugins for predicate', async () => {
      const plugin = new TestPlugin();
      await globalPredicateRegistry.register(plugin);

      const plugins = globalPredicateRegistry.getPluginsForPredicate('intersects');
      expect(plugins.length).toBeGreaterThan(0);
      expect(plugins[0].metadata.name).toBe('test-plugin');
    });

    it('should execute predicate', async () => {
      const plugin = new TestPlugin();
      await globalPredicateRegistry.register(plugin);

      const engine = new TestEngine();
      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [1, 1] };

      const result = await executePredicate('intersects', point1, point2, engine);

      expect(result.result).toBe(true);
      expect(result.plugin).toBe('test-plugin');
    });

    it('should get plugins info', async () => {
      const plugin = new TestPlugin();
      await globalPredicateRegistry.register(plugin);

      const infos = globalPredicateRegistry.getPluginsInfo();
      expect(infos.length).toBeGreaterThan(0);
      expect(infos[0].name).toBe('test-plugin');
    });

    it('should get stats', async () => {
      const plugin = new TestPlugin();
      await globalPredicateRegistry.register(plugin);

      const stats = globalPredicateRegistry.getStats();
      expect(stats.totalPlugins).toBe(1);
      expect(stats.predicatesSupported).toBeGreaterThan(0);
    });

    it('should unregister plugin', async () => {
      const plugin = new TestPlugin();
      await globalPredicateRegistry.register(plugin);

      globalPredicateRegistry.unregister('test-plugin');

      expect(globalPredicateRegistry.hasPlugin('test-plugin')).toBe(false);
    });
  });

  describe('Plugin Loader', () => {
    it('should get loader stats', () => {
      const stats = globalPluginLoader.getStats();

      expect(stats).toHaveProperty('loadedPlugins');
      expect(stats).toHaveProperty('loadingPlugins');
      expect(stats).toHaveProperty('cachedPlugins');
      expect(stats).toHaveProperty('failedPlugins');
    });

    it('should clear plugins', () => {
      globalPluginLoader.clear();

      const stats = globalPluginLoader.getStats();
      expect(stats.loadedPlugins).toBe(0);
    });
  });

  describe('Integration', () => {
    it('should work with engine and plugin together', async () => {
      // 注册引擎
      const engine = new TestEngine();
      EngineRegistry.register(engine);
      EngineRegistry.setDefaultEngine('test-engine');

      // 注册插件
      const plugin = new TestPlugin();
      await registerPredicatePlugin(plugin);

      // 验证系统状态
      expect(EngineRegistry.hasEngine('test-engine')).toBe(true);
      expect(globalPredicateRegistry.hasPlugin('test-plugin')).toBe(true);

      // 执行查询
      const defaultEngine = EngineRegistry.getDefaultEngine();
      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [1, 1] };

      const result = await executePredicate('intersects', point1, point2, defaultEngine);

      expect(result.result).toBe(true);
      expect(result.plugin).toBe('test-plugin');
    });

    it('should fallback to engine when plugin not available', async () => {
      const engine = new TestEngine();
      EngineRegistry.register(engine);

      const point1: Point = { type: 'Point', coordinates: [0, 0] };
      const point2: Point = { type: 'Point', coordinates: [1, 1] };

      const result = await executePredicate('intersects', point1, point2, engine);

      expect(result.result).toBe(true);
      expect(result.plugin).toBe('engine');
    });
  });
});
