/**
 * 空间引擎注册表
 *
 * 管理多个空间引擎实例，提供引擎切换和能力查询功能
 */

import type { SpatialEngine, EngineConfig } from './spatial-engine';
import type { SpatialPredicate } from '../types/database';
import type { GeometryType } from '../types/geometry';
import { TurfEngine } from './engines/turf-engine';

/**
 * 引擎注册表
 */
class EngineRegistryClass {
  private engines: Map<string, SpatialEngine> = new Map();
  private defaultEngineName: string = 'turf';

  constructor() {
    // 默认注册 Turf.js 引擎
    this.register(new TurfEngine({ name: 'turf', isDefault: true }));
  }

  /**
   * 注册引擎
   * @param engine - 空间引擎实例
   */
  register(engine: SpatialEngine): void {
    this.engines.set(engine.name, engine);

    // 如果是默认引擎，更新默认引擎名称
    const config = engine as any;
    if (config.isDefault || config.name === 'turf') {
      this.defaultEngineName = engine.name;
    }
  }

  /**
   * 注销引擎
   * @param name - 引擎名称
   */
  unregister(name: string): void {
    if (name === this.defaultEngineName) {
      throw new Error(`Cannot unregister default engine: ${name}`);
    }
    this.engines.delete(name);
  }

  /**
   * 获取引擎
   * @param name - 引擎名称，默认返回默认引擎
   */
  getEngine(name?: string): SpatialEngine {
    const engineName = name || this.defaultEngineName;
    const engine = this.engines.get(engineName);

    if (!engine) {
      throw new Error(`Engine not found: ${engineName}`);
    }

    return engine;
  }

  /**
   * 获取默认引擎
   */
  getDefaultEngine(): SpatialEngine {
    return this.getEngine(this.defaultEngineName);
  }

  /**
   * 设置默认引擎
   * @param name - 引擎名称
   */
  setDefaultEngine(name: string): void {
    if (!this.engines.has(name)) {
      throw new Error(`Cannot set unknown engine as default: ${name}`);
    }
    this.defaultEngineName = name;
  }

  /**
   * 获取所有已注册引擎的名称
   */
  getEngineNames(): string[] {
    return Array.from(this.engines.keys());
  }

  /**
   * 检查引擎是否已注册
   * @param name - 引擎名称
   */
  hasEngine(name: string): boolean {
    return this.engines.has(name);
  }

  /**
   * 获取支持指定谓词的引擎
   * @param predicate - 空间谓词
   */
  getEnginesForPredicate(predicate: SpatialPredicate): SpatialEngine[] {
    return Array.from(this.engines.values()).filter(engine =>
      engine.capabilities.supportedPredicates.includes(predicate)
    );
  }

  /**
   * 获取支持指定几何类型的引擎
   * @param geometryType - 几何类型
   */
  getEnginesForGeometryType(geometryType: GeometryType): SpatialEngine[] {
    return Array.from(this.engines.values()).filter(engine =>
      engine.capabilities.supportedGeometryTypes.includes(geometryType)
    );
  }

  /**
   * 获取最佳引擎用于指定操作
   * 优先级：
   * 1. 精度高的引擎
   * 2. 支持该操作的引擎
   * 3. 默认引擎
   *
   * @param predicate - 空间谓词
   */
  getBestEngineForPredicate(predicate: SpatialPredicate): SpatialEngine {
    // 查找支持该谓词的所有引擎
    const engines = this.getEnginesForPredicate(predicate);

    if (engines.length === 0) {
      throw new Error(`No engine supports predicate: ${predicate}`);
    }

    // 如果只有一个引擎，直接返回
    if (engines.length === 1) {
      return engines[0];
    }

    // 优先选择精确引擎
    const exactEngine = engines.find(e => e.capabilities.precision === 'exact');
    if (exactEngine) {
      return exactEngine;
    }

    // 否则返回第一个引擎
    return engines[0];
  }

  /**
   * 获取所有引擎的信息
   */
  getEnginesInfo(): Array<{
    name: string;
    isDefault: boolean;
    capabilities: {
      supportedPredicates: SpatialPredicate[];
      supportedGeometryTypes: GeometryType[];
      supportsTopology: boolean;
      supportsDistance: boolean;
      precision: 'exact' | 'approximate';
    };
  }> {
    return Array.from(this.engines.values()).map(engine => ({
      name: engine.name,
      isDefault: engine.name === this.defaultEngineName,
      capabilities: engine.capabilities
    }));
  }

  /**
   * 获取所有已注册的引擎实例
   */
  getAllEngines(): SpatialEngine[] {
    return Array.from(this.engines.values());
  }

  /**
   * 检查是否有任何引擎支持指定谓词
   * @param predicate - 空间谓词
   */
  supportsPredicate(predicate: SpatialPredicate): boolean {
    return this.getEnginesForPredicate(predicate).length > 0;
  }

  /**
   * 检查是否有任何引擎支持指定几何类型
   * @param geometryType - 几何类型
   */
  supportsGeometryType(geometryType: GeometryType): boolean {
    return this.getEnginesForGeometryType(geometryType).length > 0;
  }

  /**
   * 获取注册表统计信息
   */
  getStats(): {
    totalEngines: number;
    defaultEngine: string;
    supportedPredicates: SpatialPredicate[];
    supportedGeometryTypes: GeometryType[];
  } {
    const allPredicates = new Set<SpatialPredicate>();
    const allGeometryTypes = new Set<GeometryType>();

    for (const engine of this.engines.values()) {
      for (const predicate of engine.capabilities.supportedPredicates) {
        allPredicates.add(predicate);
      }
      for (const geometryType of engine.capabilities.supportedGeometryTypes) {
        allGeometryTypes.add(geometryType);
      }
    }

    return {
      totalEngines: this.engines.size,
      defaultEngine: this.defaultEngineName,
      supportedPredicates: Array.from(allPredicates),
      supportedGeometryTypes: Array.from(allGeometryTypes)
    };
  }

  /**
   * 清空所有引擎（除了默认引擎）
   */
  clear(): void {
    const defaultEngine = this.getDefaultEngine();
    this.engines.clear();
    this.register(defaultEngine);
  }
}

/**
 * 全局引擎注册表实例
 */
export const EngineRegistry = new EngineRegistryClass();

/**
 * 导出引擎注册表类，以便测试和扩展
 */
export { EngineRegistryClass };
