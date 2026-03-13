/**
 * 插件加载器
 *
 * 动态加载空间谓词和引擎插件，支持依赖解析和版本管理
 */

import type { Geometry } from '../types';
import type { SpatialEngine } from '../spatial/spatial-engine';
import type { SpatialPredicate } from '../types/database';
import type { PredicatePlugin, PredicatePluginMetadata } from './predicates/predicate-registry';

/**
 * 插件加载状态
 */
export type PluginLoadStatus = 'loading' | 'loaded' | 'failed' | 'unloaded';

/**
 * 插件信息
 */
export interface PluginInfo {
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version: string;
  /** 加载状态 */
  status: PluginLoadStatus;
  /** 加载时间（毫秒） */
  loadTime?: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 插件加载配置
 */
export interface PluginLoaderConfig {
  /** 基础路径 */
  basePath?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 是否启用缓存 */
  enableCache?: boolean;
}

/**
 * 插件加载器类
 */
export class PluginLoader {
  private loadedPlugins: Map<string, any> = new Map();
  private loadingPromises: Map<string, Promise<any>> = new Map();
  private pluginCache: Map<string, PluginInfo> = new Map();
  private config: Required<PluginLoaderConfig>;

  constructor(config: PluginLoaderConfig = {}) {
    this.config = {
      basePath: config.basePath || '/plugins',
      timeout: config.timeout || 10000,
      retries: config.retries || 3,
      enableCache: config.enableCache !== false
    };
  }

  /**
   * 加载谓词插件
   * @param pluginNameOrPath - 插件名称或路径
   */
  async loadPredicatePlugin(pluginNameOrPath: string): Promise<PredicatePlugin> {
    const cacheKey = `predicate:${pluginNameOrPath}`;

    // 检查缓存
    if (this.config.enableCache && this.loadedPlugins.has(cacheKey)) {
      return this.loadedPlugins.get(cacheKey);
    }

    // 检查是否正在加载
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    // 开始加载
    const loadPromise = this.loadPluginInternal(pluginNameOrPath, 'predicate');
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      const plugin = await loadPromise;
      this.loadedPlugins.set(cacheKey, plugin);
      this.loadingPromises.delete(cacheKey);
      return plugin;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      throw error;
    }
  }

  /**
   * 加载空间引擎
   * @param engineNameOrPath - 引擎名称或路径
   */
  async loadEngine(engineNameOrPath: string): Promise<SpatialEngine> {
    const cacheKey = `engine:${engineNameOrPath}`;

    // 检查缓存
    if (this.config.enableCache && this.loadedPlugins.has(cacheKey)) {
      return this.loadedPlugins.get(cacheKey);
    }

    // 检查是否正在加载
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    // 开始加载
    const loadPromise = this.loadPluginInternal(engineNameOrPath, 'engine');
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      const engine = await loadPromise;
      this.loadedPlugins.set(cacheKey, engine);
      this.loadingPromises.delete(cacheKey);
      return engine;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      throw error;
    }
  }

  /**
   * 批量加载插件
   * @param pluginNames - 插件名称数组
   */
  async loadPlugins(pluginNames: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    for (const name of pluginNames) {
      try {
        const plugin = await this.loadPredicatePlugin(name);
        results.set(name, plugin);
      } catch (error) {
        console.error(`Failed to load plugin "${name}":`, error);
        results.set(name, null);
      }
    }

    return results;
  }

  /**
   * 内部加载插件实现
   */
  private async loadPluginInternal(
    nameOrPath: string,
    type: 'predicate' | 'engine'
  ): Promise<any> {
    const startTime = performance.now();
    let lastError: Error | null = null;

    // 尝试多次加载
    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        // 动态导入
        const module = await this.dynamicImport(nameOrPath, type);
        const loadTime = performance.now() - startTime;

        // 更新插件信息
        const info: PluginInfo = {
          name: nameOrPath,
          version: this.extractVersion(module),
          status: 'loaded',
          loadTime
        };
        this.pluginCache.set(nameOrPath, info);

        // 提取插件实例
        const plugin = this.extractPluginInstance(module, type);
        return plugin;

      } catch (error) {
        lastError = error as Error;
        // 等待后重试
        if (attempt < this.config.retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    // 所有尝试都失败
    const info: PluginInfo = {
      name: nameOrPath,
      version: 'unknown',
      status: 'failed',
      error: lastError?.message || 'Unknown error'
    };
    this.pluginCache.set(nameOrPath, info);

    throw new Error(
      `Failed to load ${type} "${nameOrPath}" after ${this.config.retries} attempts: ${lastError?.message}`
    );
  }

  /**
   * 动态导入模块
   */
  private async dynamicImport(
    nameOrPath: string,
    type: 'predicate' | 'engine'
  ): Promise<any> {
    // 超时控制
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Plugin load timeout')), this.config.timeout);
    });

    // 动态导入
    const importPromise = this.performDynamicImport(nameOrPath, type);

    return Promise.race([importPromise, timeoutPromise]) as Promise<any>;
  }

  /**
   * 执行动态导入
   */
  private async performDynamicImport(
    nameOrPath: string,
    type: 'predicate' | 'engine'
  ): Promise<any> {
    // 构建模块路径
    let modulePath: string;

    if (nameOrPath.startsWith('./') || nameOrPath.startsWith('../')) {
      // 相对路径
      modulePath = nameOrPath;
    } else {
      // 插件名称，构建默认路径
      if (type === 'predicate') {
        modulePath = `${this.config.basePath}/predicates/${nameOrPath}`;
      } else {
        modulePath = `${this.config.basePath}/engines/${nameOrPath}`;
      }
    }

    // 动态导入
    try {
      const module = await import(modulePath);
      return module;
    } catch (error) {
      // 尝试其他路径
      const alternativePaths = [
        `./${nameOrPath}`,
        `../spatial/${nameOrPath}`,
        `@webgeodb/core/plugins/${nameOrPath}`
      ];

      for (const path of alternativePaths) {
        try {
          const module = await import(path);
          return module;
        } catch (e) {
          // 继续尝试下一个路径
        }
      }

      throw error;
    }
  }

  /**
   * 提取插件实例
   */
  private extractPluginInstance(module: any, type: 'predicate' | 'engine'): any {
    if (type === 'predicate') {
      // 插件模块应该导出 default 插件或插件工厂
      if (module.default) {
        return module.default;
      } else if (module.plugin) {
        return module.plugin;
      } else if (module.createPlugin) {
        return module.createPlugin();
      } else {
        // 返回整个模块作为插件
        return module;
      }
    } else {
      // 引擎模块应该导出 default 引擎或引擎类
      if (module.default) {
        return module.default;
      } else if (module.engine) {
        return module.engine;
      } else if (module.Engine) {
        return module.Engine;
      } else {
        return module;
      }
    }
  }

  /**
   * 提取版本信息
   */
  private extractVersion(module: any): string {
    if (module.version) {
      return module.version;
    } else if (module.VERSION) {
      return module.VERSION;
    } else {
      return '1.0.0';
    }
  }

  /**
   * 获取插件信息
   */
  getPluginInfo(name: string): PluginInfo | undefined {
    return this.pluginCache.get(name);
  }

  /**
   * 获取所有已加载插件信息
   */
  getAllPluginsInfo(): PluginInfo[] {
    return Array.from(this.pluginCache.values());
  }

  /**
   * 检查插件是否已加载
   */
  isPluginLoaded(name: string): boolean {
    return this.loadedPlugins.has(name);
  }

  /**
   * 卸载插件
   */
  async unloadPlugin(name: string): Promise<void> {
    if (!this.loadedPlugins.has(name)) {
      throw new Error(`Plugin "${name}" is not loaded`);
    }

    this.loadedPlugins.delete(name);
    this.pluginCache.delete(name);
  }

  /**
   * 清空所有插件
   */
  clear(): void {
    this.loadedPlugins.clear();
    this.loadingPromises.clear();
    this.pluginCache.clear();
  }

  /**
   * 获取加载器统计信息
   */
  getStats(): {
    loadedPlugins: number;
    loadingPlugins: number;
    cachedPlugins: number;
    failedPlugins: number;
  } {
    let failedPlugins = 0;
    let cachedPlugins = 0;

    for (const info of this.pluginCache.values()) {
      if (info.status === 'loaded') {
        cachedPlugins++;
      } else if (info.status === 'failed') {
        failedPlugins++;
      }
    }

    return {
      loadedPlugins: this.loadedPlugins.size,
      loadingPlugins: this.loadingPromises.size,
      cachedPlugins,
      failedPlugins
    };
  }
}

/**
 * 全局插件加载器实例
 */
export const globalPluginLoader = new PluginLoader();

/**
 * 快速加载谓词插件
 * @param pluginName - 插件名称
 */
export async function loadPlugin(pluginName: string): Promise<PredicatePlugin> {
  return globalPluginLoader.loadPredicatePlugin(pluginName);
}

/**
 * 快速加载引擎
 * @param engineName - 引擎名称
 */
export async function loadEngine(engineName: string): Promise<SpatialEngine> {
  return globalPluginLoader.loadEngine(engineName);
}

/**
 * 批量加载插件
 * @param pluginNames - 插件名称数组
 */
export async function loadPlugins(pluginNames: string[]): Promise<Map<string, any>> {
  return globalPluginLoader.loadPlugins(pluginNames);
}
