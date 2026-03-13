/**
 * 引擎注册表测试
 *
 * 测试空间引擎的注册、获取、切换功能：
 * - registerEngine - 注册引擎
 * - unregisterEngine - 注销引擎
 * - getEngine - 获取引擎
 * - getDefaultEngine - 获取默认引擎
 * - setDefaultEngine - 设置默认引擎
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EngineRegistryClass } from '../../src/spatial/engine-registry';
import { TurfEngine } from '../../src/spatial/engines/turf-engine';
import type { SpatialEngine } from '../../src/spatial/spatial-engine';

describe('EngineRegistry', () => {
  let registry: EngineRegistryClass;

  beforeEach(() => {
    registry = new EngineRegistryClass();
  });

  afterEach(() => {
    // 清理注册的引擎
    const engines = registry.getEngineNames();
    engines.forEach(name => {
      try {
        registry.unregister(name);
      } catch {
        // 忽略默认引擎无法注销的错误
      }
    });
  });

  describe('引擎注册', () => {
    it('should register new engine', () => {
      const engine = new TurfEngine({ name: 'test-turf' });
      registry.register(engine);

      const retrieved = registry.getEngine('test-turf');
      expect(retrieved).toBe(engine);
    });

    it('should register multiple engines', () => {
      const engine1 = new TurfEngine({ name: 'turf1' });
      const engine2 = new TurfEngine({ name: 'turf2' });

      registry.register(engine1);
      registry.register(engine2);

      expect(registry.getEngine('turf1')).toBe(engine1);
      expect(registry.getEngine('turf2')).toBe(engine2);
    });

    it('should throw when registering duplicate name', () => {
      const engine1 = new TurfEngine({ name: 'duplicate' });
      const engine2 = new TurfEngine({ name: 'duplicate' });

      registry.register(engine1);

      expect(() => registry.register(engine2)).toThrow();
    });

    it('should throw when registering with empty name', () => {
      const engine = new TurfEngine({ name: '' });

      expect(() => registry.register(engine)).toThrow();
    });
  });

  describe('引擎获取', () => {
    it('should get registered engine', () => {
      const engine = new TurfEngine({ name: 'test-turf' });
      registry.register(engine);

      const retrieved = registry.getEngine('test-turf');

      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('test-turf');
    });

    it('should throw when getting non-existent engine', () => {
      expect(() => registry.getEngine('nonexistent')).toThrow();
    });

    it('should return engine if exists', () => {
      const engine = new TurfEngine({ name: 'test-turf' });
      registry.register(engine);

      const retrieved = registry.getEngine('test-turf');

      expect(retrieved).toBe(engine);
    });
  });

  describe('引擎注销', () => {
    it('should unregister engine', () => {
      const engine = new TurfEngine({ name: 'test-turf' });
      registry.register(engine);

      registry.unregister('test-turf');

      expect(() => registry.getEngine('test-turf')).toThrow();
    });

    it('should throw when unregistering non-existent engine', () => {
      expect(() => registry.unregister('nonexistent')).toThrow();
    });

    it('should not affect other engines when unregistering', () => {
      const engine1 = new TurfEngine({ name: 'turf1' });
      const engine2 = new TurfEngine({ name: 'turf2' });

      registry.register(engine1);
      registry.register(engine2);

      registry.unregister('turf1');

      expect(() => registry.getEngine('turf1')).toThrow();
      expect(registry.getEngine('turf2')).toBe(engine2);
    });

    it('should handle unregistering default engine', () => {
      const engine1 = new TurfEngine({ name: 'turf1' });
      const engine2 = new TurfEngine({ name: 'turf2' });

      registry.register(engine1);
      registry.register(engine2);
      registry.setDefaultEngine('turf1');

      expect(() => registry.unregister('turf1')).toThrow();
    });
  });

  describe('默认引擎', () => {
    it('should have default turf engine', () => {
      const defaultEngine = registry.getDefaultEngine();

      expect(defaultEngine).toBeDefined();
      expect(defaultEngine.name).toBe('turf');
    });

    it('should get default engine', () => {
      const engine = registry.getDefaultEngine();

      expect(engine).toBeInstanceOf(TurfEngine);
    });

    it('should set new default engine', () => {
      const engine = new TurfEngine({ name: 'custom-turf' });
      registry.register(engine);
      registry.setDefaultEngine('custom-turf');

      const defaultEngine = registry.getDefaultEngine();

      expect(defaultEngine.name).toBe('custom-turf');
    });

    it('should throw when setting non-existent engine as default', () => {
      expect(() => registry.setDefaultEngine('nonexistent')).toThrow();
    });

    it('should throw when default engine is not set', () => {
      const customRegistry = new EngineRegistryClass();

      // Remove default engine
      customRegistry.clear();

      expect(() => customRegistry.getDefaultEngine()).toThrow();
    });
  });

  describe('引擎列表', () => {
    it('should list all registered engines', () => {
      const engine1 = new TurfEngine({ name: 'turf1' });
      const engine2 = new TurfEngine({ name: 'turf2' });

      registry.register(engine1);
      registry.register(engine2);

      const engines = registry.getEngineNames();

      expect(engines).toContain('turf');
      expect(engines).toContain('turf1');
      expect(engines).toContain('turf2');
    });

    it('should return empty array when no engines registered', () => {
      const customRegistry = new EngineRegistryClass();
      customRegistry.clear();

      const engines = customRegistry.getEngineNames();

      expect(engines).toEqual([]);
    });

    it('should reflect current state after registration', () => {
      const engines1 = registry.getEngineNames();
      expect(engines1).toContain('turf');

      const engine = new TurfEngine({ name: 'new-turf' });
      registry.register(engine);

      const engines2 = registry.getEngineNames();
      expect(engines2).toContain('new-turf');
      expect(engines2.length).toBe(engines1.length + 1);
    });

    it('should reflect current state after unregistration', () => {
      const engine = new TurfEngine({ name: 'temp-turf' });
      registry.register(engine);

      const engines1 = registry.getEngineNames();
      expect(engines1).toContain('temp-turf');

      registry.unregister('temp-turf');

      const engines2 = registry.getEngineNames();
      expect(engines2).not.toContain('temp-turf');
    });
  });

  describe('引擎检查', () => {
    it('should check if engine exists', () => {
      const engine = new TurfEngine({ name: 'test-turf' });

      expect(registry.hasEngine('test-turf')).toBe(false);

      registry.register(engine);

      expect(registry.hasEngine('test-turf')).toBe(true);
    });

    it('should return false for non-existent engine', () => {
      expect(registry.hasEngine('nonexistent')).toBe(false);
    });

    it('should check default engine', () => {
      const engine = new TurfEngine({ name: 'custom-turf' });
      registry.register(engine);

      const defaultEngine = registry.getDefaultEngine();
      expect(defaultEngine.name).toBe('turf');

      registry.setDefaultEngine('custom-turf');
      const newDefaultEngine = registry.getDefaultEngine();
      expect(newDefaultEngine.name).toBe('custom-turf');
    });
  });

  describe('引擎能力', () => {
    it('should get engine capabilities', () => {
      const engineInfo = registry.getEnginesInfo();
      const turfInfo = engineInfo.find(e => e.name === 'turf');

      expect(turfInfo).toBeDefined();
      expect(turfInfo?.capabilities.supportedPredicates).toBeInstanceOf(Array);
      expect(turfInfo?.capabilities.supportedGeometryTypes).toBeInstanceOf(Array);
    });

    it('should return correct capabilities for turf engine', () => {
      const engineInfo = registry.getEnginesInfo();
      const turfInfo = engineInfo.find(e => e.name === 'turf');

      expect(turfInfo?.capabilities.supportedPredicates).toContain('intersects');
      expect(turfInfo?.capabilities.supportedPredicates).toContain('contains');
      expect(turfInfo?.capabilities.supportedPredicates).toContain('within');
      expect(turfInfo?.capabilities.supportedGeometryTypes).toContain('Point');
      expect(turfInfo?.capabilities.supportedGeometryTypes).toContain('LineString');
      expect(turfInfo?.capabilities.supportedGeometryTypes).toContain('Polygon');
    });
  });

  describe('引擎切换', () => {
    it('should switch between engines', () => {
      const engine1 = new TurfEngine({ name: 'turf1' });
      const engine2 = new TurfEngine({ name: 'turf2' });

      registry.register(engine1);
      registry.register(engine2);

      registry.setDefaultEngine('turf1');
      expect(registry.getDefaultEngine().name).toBe('turf1');

      registry.setDefaultEngine('turf2');
      expect(registry.getDefaultEngine().name).toBe('turf2');
    });

    it('should maintain separate engine instances', () => {
      const engine1 = new TurfEngine({ name: 'turf1' });
      const engine2 = new TurfEngine({ name: 'turf2' });

      registry.register(engine1);
      registry.register(engine2);

      const retrieved1 = registry.getEngine('turf1');
      const retrieved2 = registry.getEngine('turf2');

      expect(retrieved1).not.toBe(retrieved2);
      expect(retrieved1.name).toBe('turf1');
      expect(retrieved2.name).toBe('turf2');
    });
  });

  describe('全局注册表', () => {
    it('should support multiple instances', () => {
      const registry1 = new EngineRegistryClass();
      const registry2 = new EngineRegistryClass();

      const engine = new TurfEngine({ name: 'shared-turf' });
      registry1.register(engine);

      expect(registry2.hasEngine('shared-turf')).toBe(false);
      expect(registry1.getEngine('shared-turf')).toBe(engine);
    });
  });

  describe('边界情况', () => {
    it('should handle engine name with special characters', () => {
      const engine = new TurfEngine({ name: 'turf-engine-v1' });

      registry.register(engine);

      expect(registry.hasEngine('turf-engine-v1')).toBe(true);
      registry.unregister('turf-engine-v1');
    });

    it('should handle rapid register/unregister', () => {
      for (let i = 0; i < 10; i++) {
        const engine = new TurfEngine({ name: `temp-${i}` });
        registry.register(engine);
        registry.unregister(`temp-${i}`);
      }

      // Should not throw
      expect(registry.getEngineNames()).toContain('turf');
    });

    it('should handle getting engine after unregister', () => {
      const engine = new TurfEngine({ name: 'temp-turf' });
      registry.register(engine);

      expect(registry.getEngine('temp-turf')).toBe(engine);

      registry.unregister('temp-turf');

      expect(() => registry.getEngine('temp-turf')).toThrow();
    });
  });

  describe('错误处理', () => {
    it('should provide meaningful error messages', () => {
      try {
        registry.getEngine('nonexistent');
      } catch (error: any) {
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
        expect(error.message).toContain('nonexistent');
      }
    });

    it('should include engine name in error', () => {
      try {
        registry.getEngine('missing-engine');
      } catch (error: any) {
        expect(error.message).toContain('missing-engine');
      }
    });
  });

  describe('性能测试', () => {
    it('should handle many engine registrations efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        const engine = new TurfEngine({ name: `perf-${i}` });
        registry.register(engine);
      }

      const duration = performance.now() - startTime;

      // Should register 100 engines quickly
      expect(duration).toBeLessThan(1000);

      // Cleanup
      for (let i = 0; i < 100; i++) {
        registry.unregister(`perf-${i}`);
      }
    });

    it('should handle many engine lookups efficiently', () => {
      const engine = new TurfEngine({ name: 'lookup-test' });
      registry.register(engine);

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        registry.getEngine('lookup-test');
      }

      const duration = performance.now() - startTime;

      // Should complete 1000 lookups quickly
      expect(duration).toBeLessThan(100);

      registry.unregister('lookup-test');
    });
  });

  describe('并发安全', () => {
    it('should handle concurrent registrations', async () => {
      const engines = Array.from({ length: 10 }, (_, i) =>
        new TurfEngine({ name: `concurrent-${i}` })
      );

      // Register all engines
      await Promise.all(
        engines.map(engine => {
          registry.register(engine);
          return Promise.resolve();
        })
      );

      // Verify all are registered
      engines.forEach(engine => {
        expect(registry.hasEngine(engine.name)).toBe(true);
      });

      // Cleanup
      engines.forEach(engine => {
        registry.unregister(engine.name);
      });
    });
  });
});
