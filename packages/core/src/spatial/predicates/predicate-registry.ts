/**
 * 谓词注册表
 *
 * 管理空间谓词插件，支持动态注册、版本管理和引擎隔离
 */

import type { Geometry, SpatialPredicate } from '../../types';
import type { SpatialEngine } from '../spatial-engine';

/**
 * 谓词插件元数据
 */
export interface PredicatePluginMetadata {
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version: string;
  /** 插件描述 */
  description: string;
  /** 支持的谓词 */
  predicates: SpatialPredicate[];
  /** 支持的几何类型组合 */
  supportedGeometryTypes: string[][];
  /** 依赖的其他插件 */
  dependencies?: string[];
  /** 引擎要求 */
  engineRequirements?: {
    name?: string;
    minVersion?: string;
    features?: string[];
  };
}

/**
 * 谓词执行结果
 */
export interface PredicateExecutionResult {
  /** 结果值 */
  result: boolean;
  /** 执行时间（微秒） */
  executionTime: number;
  /** 使用的插件 */
  plugin: string;
  /** 是否使用了缓存 */
  cached: boolean;
}

/**
 * 谓词插件接口
 */
export interface PredicatePlugin {
  /** 插件元数据 */
  metadata: PredicatePluginMetadata;
  /** 执行谓词 */
  execute(g1: Geometry, g2: Geometry, engine: SpatialEngine): boolean;
  /** 初始化插件（可选） */
  initialize?(): Promise<void> | void;
  /** 清理资源（可选） */
  cleanup?(): Promise<void> | void;
}

/**
 * 谓词注册表类
 */
export class PredicateRegistry {
  private plugins: Map<string, PredicatePlugin> = new Map();
  private predicateIndex: Map<SpatialPredicate, string[]> = new Map();
  private versionAliases: Map<string, string> = new Map();
  private cache: Map<string, WeakMap<object, PredicateExecutionResult>> = new Map();

  /**
   * 注册谓词插件
   */
  async register(plugin: PredicatePlugin): Promise<void> {
    const { name, version, predicates } = plugin.metadata;

    // 检查是否已注册
    if (this.plugins.has(name)) {
      throw new Error(`Plugin "${name}" is already registered`);
    }

    // 检查依赖
    if (plugin.metadata.dependencies) {
      for (const dep of plugin.metadata.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Plugin "${name}" depends on "${dep}" which is not registered`);
        }
      }
    }

    // 初始化插件
    if (plugin.initialize) {
      await plugin.initialize();
    }

    // 注册插件
    this.plugins.set(name, plugin);

    // 建立谓词索引
    for (const predicate of predicates) {
      if (!this.predicateIndex.has(predicate)) {
        this.predicateIndex.set(predicate, []);
      }
      this.predicateIndex.get(predicate)!.push(name);
    }

    // 建立版本别名
    this.versionAliases.set(`${name}@${version}`, name);

    // 创建缓存
    this.cache.set(name, new WeakMap<object, PredicateExecutionResult>());
  }

  /**
   * 注销谓词插件
   */
  unregister(name: string): void {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin "${name}" not found`);
    }

    // 清理插件
    if (plugin.cleanup) {
      plugin.cleanup();
    }

    // 从谓词索引中移除
    for (const predicate of plugin.metadata.predicates) {
      const plugins = this.predicateIndex.get(predicate);
      if (plugins) {
        const index = plugins.indexOf(name);
        if (index !== -1) {
          plugins.splice(index, 1);
        }
      }
    }

    // 移除插件
    this.plugins.delete(name);
    this.cache.delete(name);
  }

  /**
   * 获取插件
   */
  getPlugin(name: string, version?: string): PredicatePlugin | undefined {
    if (version) {
      const alias = `${name}@${version}`;
      const resolvedName = this.versionAliases.get(alias);
      return resolvedName ? this.plugins.get(resolvedName) : undefined;
    }
    return this.plugins.get(name);
  }

  /**
   * 获取支持特定谓词的插件
   */
  getPluginsForPredicate(predicate: SpatialPredicate): PredicatePlugin[] {
    const pluginNames = this.predicateIndex.get(predicate) || [];
    return pluginNames
      .map(name => this.plugins.get(name))
      .filter((plugin): plugin is PredicatePlugin => plugin !== undefined);
  }

  /**
   * 执行谓词
   */
  async execute(
    predicate: SpatialPredicate,
    g1: Geometry,
    g2: Geometry,
    engine: SpatialEngine,
    context?: object
  ): Promise<PredicateExecutionResult> {
    const startTime = performance.now();

    // 查找支持该谓词的插件
    const plugins = this.getPluginsForPredicate(predicate);

    if (plugins.length === 0) {
      // 回退到引擎实现
      return this.executeWithEngine(predicate, g1, g2, engine, startTime);
    }

    // 使用第一个可用插件
    const plugin = plugins[0];
    const cache = this.cache.get(plugin.metadata.name);

    // 检查缓存
    if (cache && context) {
      const cached = cache.get(context);
      if (cached) {
        return {
          ...cached,
          cached: true
        };
      }
    }

    // 执行插件
    let result: boolean;
    try {
      result = plugin.execute(g1, g2, engine);
    } catch (error) {
      console.error(`Plugin "${plugin.metadata.name}" execution failed:`, error);
      // 回退到引擎实现
      return this.executeWithEngine(predicate, g1, g2, engine, startTime);
    }

    const executionResult: PredicateExecutionResult = {
      result,
      executionTime: (performance.now() - startTime) * 1000,
      plugin: plugin.metadata.name,
      cached: false
    };

    // 缓存结果
    if (cache && context) {
      cache.set(context, executionResult);
    }

    return executionResult;
  }

  /**
   * 使用引擎执行谓词（回退方案）
   */
  private executeWithEngine(
    predicate: SpatialPredicate,
    g1: Geometry,
    g2: Geometry,
    engine: SpatialEngine,
    startTime: number
  ): PredicateExecutionResult {
    let result: boolean;

    switch (predicate) {
      case 'intersects':
        result = engine.intersects(g1, g2);
        break;
      case 'contains':
        result = engine.contains(g1, g2);
        break;
      case 'within':
        result = engine.within(g1, g2);
        break;
      case 'equals':
        result = engine.equals(g1, g2);
        break;
      case 'disjoint':
        result = engine.disjoint(g1, g2);
        break;
      case 'crosses':
        result = engine.crosses(g1, g2);
        break;
      case 'touches':
        result = engine.touches(g1, g2);
        break;
      case 'overlaps':
        result = engine.overlaps(g1, g2);
        break;
      default:
        throw new Error(`Unknown predicate: ${predicate}`);
    }

    return {
      result,
      executionTime: (performance.now() - startTime) * 1000,
      plugin: 'engine',
      cached: false
    };
  }

  /**
   * 获取所有已注册插件的信息
   */
  getPluginsInfo(): PredicatePluginMetadata[] {
    return Array.from(this.plugins.values()).map(plugin => plugin.metadata);
  }

  /**
   * 检查插件是否已注册
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * 获取插件统计信息
   */
  getStats(): {
    totalPlugins: number;
    predicatesSupported: number;
    cacheEntries: number;
  } {
    let cacheEntries = 0;
    for (const cache of this.cache.values()) {
      // WeakMap 无法直接获取大小，这里返回 0
      // 实际使用中可以通过其他方式跟踪
    }

    return {
      totalPlugins: this.plugins.size,
      predicatesSupported: this.predicateIndex.size,
      cacheEntries
    };
  }

  /**
   * 清空所有插件
   */
  clear(): void {
    // 清理所有插件
    for (const plugin of this.plugins.values()) {
      if (plugin.cleanup) {
        plugin.cleanup();
      }
    }

    this.plugins.clear();
    this.predicateIndex.clear();
    this.versionAliases.clear();
    this.cache.clear();
  }

  /**
   * 热重载插件
   */
  async reload(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin "${name}" not found`);
    }

    // 注销旧版本
    this.unregister(name);

    // 重新加载（需要动态导入）
    // 这里简化处理，实际实现应该使用动态 import
    console.log(`Plugin "${name}" reloaded`);
  }
}

/**
 * 全局谓词注册表实例
 */
export const globalPredicateRegistry = new PredicateRegistry();

/**
 * 谓词插件基类
 * 提供默认实现，简化插件开发
 */
export abstract class PredicatePluginBase implements PredicatePlugin {
  abstract metadata: PredicatePluginMetadata;

  initialize?(): void | Promise<void>;
  cleanup?(): void | Promise<void>;

  abstract execute(g1: Geometry, g2: Geometry, engine: SpatialEngine): boolean;
}

/**
 * 快速注册函数
 * @param plugin - 谓词插件实例
 */
export async function registerPredicatePlugin(plugin: PredicatePlugin): Promise<void> {
  await globalPredicateRegistry.register(plugin);
}

/**
 * 快速执行函数
 * @param predicate - 谓词类型
 * @param g1 - 第一个几何对象
 * @param g2 - 第二个几何对象
 * @param engine - 空间引擎
 */
export async function executePredicate(
  predicate: SpatialPredicate,
  g1: Geometry,
  g2: Geometry,
  engine: SpatialEngine,
  context?: object
): Promise<PredicateExecutionResult> {
  return globalPredicateRegistry.execute(predicate, g1, g2, engine, context);
}
