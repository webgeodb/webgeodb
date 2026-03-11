/**
 * SQL 查询缓存
 * 使用 LRU 缓存策略提升重复查询性能
 */

interface SQLCacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  accessCount: number;
}

/**
 * LRU 缓存实现
 */
export class SQLQueryLRUCache<T> {
  private cache: Map<string, SQLCacheEntry<T>>;
  private maxSize: number;
  private currentSize: number = 0;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * 获取缓存项
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (entry) {
      // 更新访问计数和时间戳
      entry.accessCount++;
      entry.timestamp = Date.now();
      return entry.value;
    }

    return undefined;
  }

  /**
   * 设置缓存项
   */
  set(key: string, value: T): void {
    // 如果已存在，更新值
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.value = value;
      entry.timestamp = Date.now();
      entry.accessCount++;
      return;
    }

    // 检查是否超过最大容量
    if (this.currentSize >= this.maxSize) {
      this.evict();
    }

    // 添加新项
    this.cache.set(key, {
      key,
      value,
      timestamp: Date.now(),
      accessCount: 1
    });

    this.currentSize++;
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.currentSize--;
    }
    return deleted;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  /**
   * 检查键是否存在
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.currentSize;
  }

  /**
   * 获取缓存键列表
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 驱逐最少使用的缓存项
   */
  private evict(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.currentSize--;
    }
  }

  /**
   * 基于表名的缓存失效
   */
  invalidateByTable(tableName: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      // 检查键是否包含表名
      if (key.includes(`FROM ${tableName}`) || key.includes(`from ${tableName}`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): SQLCacheStats {
    let totalAccessCount = 0;
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;

    for (const entry of this.cache.values()) {
      totalAccessCount += entry.accessCount;
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
      if (entry.timestamp > newestTimestamp) {
        newestTimestamp = entry.timestamp;
      }
    }

    return {
      size: this.currentSize,
      maxSize: this.maxSize,
      totalAccessCount,
      oldestEntry: oldestTimestamp === Infinity ? undefined : oldestTimestamp,
      newestEntry: newestTimestamp === 0 ? undefined : newestTimestamp
    };
  }
}

/**
 * 缓存统计信息
 */
export interface SQLCacheStats {
  size: number;
  maxSize: number;
  totalAccessCount: number;
  oldestEntry?: number;
  newestEntry?: number;
}

/**
 * SQL 查询结果缓存
 */
export class SQLQueryCache {
  private cache: SQLQueryLRUCache<Promise<any[]>>;
  private tableSubscriptions: Map<string, Set<string>> = new Map();

  constructor(maxSize: number = 1000) {
    this.cache = new SQLQueryLRUCache<Promise<any[]>>(maxSize);
  }

  /**
   * 执行查询（带缓存）
   */
  async execute(
    sql: string,
    executor: () => Promise<any[]>,
    tables?: string[]
  ): Promise<any[]> {
    // 生成缓存键
    const cacheKey = this.generateCacheKey(sql);

    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('🎯 缓存命中:', sql.substring(0, 50));
      return cached;
    }

    // 执行查询
    const promise = executor();
    this.cache.set(cacheKey, promise);

    // 订阅相关表的变更
    if (tables) {
      tables.forEach(table => this.subscribeToTable(table, cacheKey));
    }

    return promise;
  }

  /**
   * 使表的缓存失效
   */
  invalidateTable(tableName: string): void {
    this.cache.invalidateByTable(tableName);

    // 清理订阅
    this.tableSubscriptions.delete(tableName);
  }

  /**
   * 使所有缓存失效
   */
  invalidateAll(): void {
    this.cache.clear();
    this.tableSubscriptions.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): SQLCacheStats {
    return this.cache.getStats();
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(sql: string): string {
    // 规范化 SQL（去除多余空格，转换为大写）
    return sql.trim().replace(/\s+/g, ' ');
  }

  /**
   * 订阅表变更
   */
  private subscribeToTable(tableName: string, cacheKey: string): void {
    if (!this.tableSubscriptions.has(tableName)) {
      this.tableSubscriptions.set(tableName, new Set());
    }

    this.tableSubscriptions.get(tableName)!.add(cacheKey);
  }

  /**
   * 获取表的缓存键
   */
  getTableKeys(tableName: string): string[] {
    const subscriptions = this.tableSubscriptions.get(tableName);
    return subscriptions ? Array.from(subscriptions) : [];
  }
}

/**
 * 全局查询缓存实例
 */
let globalCache: SQLQueryCache | null = null;

/**
 * 获取全局查询缓存
 */
export function getGlobalCache(maxSize?: number): SQLQueryCache {
  if (!globalCache) {
    globalCache = new SQLQueryCache(maxSize);
  }
  return globalCache;
}

/**
 * 重置全局缓存
 */
export function resetGlobalCache(): void {
  if (globalCache) {
    globalCache.invalidateAll();
  }
}
