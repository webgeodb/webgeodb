import type {
  DatabaseConfig,
  TableSchema,
  IndexConfig,
  Geometry,
  IndexItem
} from './types';
import { IndexedDBStorage } from './storage';
import { HybridSpatialIndex } from './index/hybrid-index';
import { QueryBuilder } from './query';
import { getBBox } from './utils';
import {
  SQLExecutor,
  PreparedSQLStatement,
  SQLExecuteOptions,
  SQLExecuteResult,
  QueryPlan,
  Parser
} from './sql';
import { EngineRegistry } from './spatial/engine-registry';
import type { SpatialEngine } from './spatial/spatial-engine';
import {
  ErrorFactory,
  DatabaseError,
  TableError,
  IndexError,
  QueryError
} from './errors';

/**
 * WebGeoDB 核心类
 */
export class WebGeoDB {
  private config: DatabaseConfig;
  private storage: IndexedDBStorage;
  private spatialIndices: Map<string, HybridSpatialIndex> = new Map();
  private spatialIndexFields: Map<string, string> = new Map();
  private schemas: Record<string, TableSchema> = {};

  [key: string]: any;

  constructor(config: DatabaseConfig) {
    this.config = {
      adapter: 'indexeddb',
      worker: false,
      cache: {
        enabled: true,
        maxSize: 1000
      },
      ...config
    };

    this.storage = new IndexedDBStorage(config.name, config.version);
  }

  /**
   * 定义表结构
   */
  schema(schemas: Record<string, TableSchema>): this {
    this.schemas = { ...this.schemas, ...schemas };
    this.storage.defineSchema(schemas);

    // 为每个表创建访问器
    for (const tableName of Object.keys(schemas)) {
      this.createTableAccessor(tableName);
    }

    return this;
  }

  /**
   * 打开数据库
   */
  async open(): Promise<void> {
    try {
      await this.storage.open();
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.databaseInitFailed(this.config.name, error);
      }
      throw error;
    }
  }

  /**
   * 关闭数据库
   */
  async close(): Promise<void> {
    // 先清除查询缓存，避免 DatabaseClosedError
    try {
      SQLExecutor.invalidateCache();
    } catch (error) {
      // 忽略缓存清理错误，继续关闭数据库
      console.warn('Query cache cleanup failed:', error);
    }

    // 关闭数据库
    try {
      await this.storage.close();
    } catch (error) {
      if (error instanceof Error) {
        throw new DatabaseError(
          'DATABASE_CLOSED' as any,
          `Failed to close database: ${error.message}`,
          { originalError: error }
        );
      }
      throw error;
    }
  }

  /**
   * 创建表访问器
   */
  private createTableAccessor(tableName: string): void {
    const self = this;

    this[tableName] = {
      /**
       * 插入数据
       */
      async insert(data: any): Promise<string> {
        try {
          const table = self.storage.getTable(tableName);

          // 如果有几何字段,计算边界框
          const schema = self.schemas[tableName];
          for (const [field, type] of Object.entries(schema)) {
            if (type === 'geometry' && data[field]) {
              const bbox = getBBox(data[field]);
              Object.assign(data, bbox);
            }
          }

          const id = await table.add(data);

          // 更新空间索引
          const spatialIndex = self.spatialIndices.get(tableName);
          if (spatialIndex && data.geometry) {
            const bbox = getBBox(data.geometry);
            spatialIndex.insert({ id: data.id, ...bbox });
          }

          return id as string;
        } catch (error) {
          if (error instanceof Error) {
            throw ErrorFactory.storageError(`Failed to insert data into table '${tableName}': ${error.message}`, error);
          }
          throw error;
        }
      },

      /**
       * 批量插入
       */
      async insertMany(items: any[]): Promise<void> {
        try {
          const table = self.storage.getTable(tableName);

          // 计算边界框
          const schema = self.schemas[tableName];
          for (const item of items) {
            for (const [field, type] of Object.entries(schema)) {
              if (type === 'geometry' && item[field]) {
                const bbox = getBBox(item[field]);
                Object.assign(item, bbox);
              }
            }
          }

          await table.bulkAdd(items);

          // 更新空间索引
          const spatialIndex = self.spatialIndices.get(tableName);
          if (spatialIndex) {
            const indexField = self.spatialIndexFields.get(tableName);
            if (indexField) {
              const indexItems: IndexItem[] = items
                .filter(item => item[indexField])
                .map(item => {
                  const bbox = getBBox(item[indexField]);
                  return { id: item.id, ...bbox };
                });

              spatialIndex.insertMany(indexItems);
            }
          }
        } catch (error) {
          if (error instanceof Error) {
            throw ErrorFactory.storageError(`Failed to bulk insert into table '${tableName}': ${error.message}`, error);
          }
          throw error;
        }
      },

      /**
       * 获取单条数据
       */
      async get(id: string): Promise<any> {
        try {
          const table = self.storage.getTable(tableName);
          return await table.get(id);
        } catch (error) {
          if (error instanceof Error) {
            throw ErrorFactory.storageError(`Failed to get record '${id}' from table '${tableName}': ${error.message}`, error);
          }
          throw error;
        }
      },

      /**
       * 更新数据
       */
      async update(id: string, data: any): Promise<void> {
        try {
          const table = self.storage.getTable(tableName);

          // 如果有几何字段,重新计算边界框
          const schema = self.schemas[tableName];
          for (const [field, type] of Object.entries(schema)) {
            if (type === 'geometry' && data[field]) {
              const bbox = getBBox(data[field]);
              Object.assign(data, bbox);
            }
          }

          await table.update(id, data);

          // 更新空间索引
          const spatialIndex = self.spatialIndices.get(tableName);
          const indexField = self.spatialIndexFields.get(tableName);
          if (spatialIndex && indexField && data[indexField]) {
            // 删除旧索引
            const oldItem = await table.get(id);
            if (oldItem && oldItem[indexField]) {
              const oldBBox = getBBox(oldItem[indexField]);
              spatialIndex.remove({ id, ...oldBBox });
            }

            // 添加新索引
            const newBBox = getBBox(data[indexField]);
            spatialIndex.insert({ id, ...newBBox });
          }
        } catch (error) {
          if (error instanceof Error) {
            throw ErrorFactory.storageError(`Failed to update record '${id}' in table '${tableName}': ${error.message}`, error);
          }
          throw error;
        }
      },

      /**
       * 删除数据
       */
      async delete(id: string): Promise<void> {
        try {
          const table = self.storage.getTable(tableName);

          // 删除空间索引
          const spatialIndex = self.spatialIndices.get(tableName);
          const indexField = self.spatialIndexFields.get(tableName);
          if (spatialIndex && indexField) {
            const item = await table.get(id);
            if (item && item[indexField]) {
              const bbox = getBBox(item[indexField]);
              spatialIndex.remove({ id, ...bbox });
            }
          }

          await table.delete(id);
        } catch (error) {
          if (error instanceof Error) {
            throw ErrorFactory.storageError(`Failed to delete record '${id}' from table '${tableName}': ${error.message}`, error);
          }
          throw error;
        }
      },

      /**
       * 批量删除
       */
      async deleteMany(ids: string[]): Promise<void> {
        try {
          const table = self.storage.getTable(tableName);

          // 删除空间索引
          const spatialIndex = self.spatialIndices.get(tableName);
          const indexField = self.spatialIndexFields.get(tableName);
          if (spatialIndex && indexField) {
            for (const id of ids) {
              const item = await table.get(id);
              if (item && item[indexField]) {
                const bbox = getBBox(item[indexField]);
                spatialIndex.remove({ id, ...bbox });
              }
            }
          }

          await table.bulkDelete(ids);
        } catch (error) {
          if (error instanceof Error) {
            throw ErrorFactory.storageError(`Failed to bulk delete from table '${tableName}': ${error.message}`, error);
          }
          throw error;
        }
      },

      /**
       * 创建空间索引
       */
      async createIndex(field: string, config?: IndexConfig): Promise<void> {
        try {
          const schema = self.schemas[tableName];
          if (schema[field] !== 'geometry') {
            throw ErrorFactory.invalidSchema(tableName, `Field '${field}' is not a geometry field`);
          }

          const spatialIndex = new HybridSpatialIndex();
          self.spatialIndices.set(tableName, spatialIndex);

          // 保存索引对应的字段名
          self.spatialIndexFields.set(tableName, field);

          // 如果配置了自动维护,加载现有数据
          if (config?.auto !== false) {
            await self.loadSpatialIndex(tableName, field);
          }
        } catch (error) {
          if (error instanceof Error) {
            throw ErrorFactory.indexCreateFailed(tableName, field, error);
          }
          throw error;
        }
      },

      /**
       * 查询构建器
       */
      where(field: string, operator: any, value: any): QueryBuilder {
        const spatialIndex = self.spatialIndices.get(tableName);
        const builder = new QueryBuilder(tableName, self.storage, spatialIndex);
        // 添加第一个条件并返回 builder，支持链式调用
        return builder.where(field, operator, value);
      },

      /**
       * 空间查询
       */
      intersects(field: string, geometry: Geometry): QueryBuilder {
        const spatialIndex = self.spatialIndices.get(tableName);
        const builder = new QueryBuilder(tableName, self.storage, spatialIndex);
        return builder.intersects(field, geometry);
      },

      contains(field: string, geometry: Geometry): QueryBuilder {
        const spatialIndex = self.spatialIndices.get(tableName);
        const builder = new QueryBuilder(tableName, self.storage, spatialIndex);
        return builder.contains(field, geometry);
      },

      within(field: string, geometry: Geometry): QueryBuilder {
        const spatialIndex = self.spatialIndices.get(tableName);
        const builder = new QueryBuilder(tableName, self.storage, spatialIndex);
        return builder.within(field, geometry);
      },

      distance(
        field: string,
        point: [number, number],
        operator: '<' | '<=' | '>' | '>=',
        distance: number
      ): QueryBuilder {
        const spatialIndex = self.spatialIndices.get(tableName);
        const builder = new QueryBuilder(tableName, self.storage, spatialIndex);
        return builder.distance(field, point, operator, distance);
      },

      /**
       * 获取所有数据
       */
      async toArray(): Promise<any[]> {
        try {
          const table = self.storage.getTable(tableName);
          return await table.toArray();
        } catch (error) {
          if (error instanceof Error) {
            throw ErrorFactory.storageError(`Failed to get all records from table '${tableName}': ${error.message}`, error);
          }
          throw error;
        }
      },

      /**
       * 获取数量
       */
      async count(): Promise<number> {
        try {
          const table = self.storage.getTable(tableName);
          return await table.count();
        } catch (error) {
          if (error instanceof Error) {
            throw ErrorFactory.storageError(`Failed to count records in table '${tableName}': ${error.message}`, error);
          }
          throw error;
        }
      },

      /**
       * 清空表
       */
      async clear(): Promise<void> {
        try {
          const table = self.storage.getTable(tableName);
          await table.clear();

          // 清空空间索引
          const spatialIndex = self.spatialIndices.get(tableName);
          if (spatialIndex) {
            spatialIndex.clear();
          }
        } catch (error) {
          if (error instanceof Error) {
            throw ErrorFactory.storageError(`Failed to clear table '${tableName}': ${error.message}`, error);
          }
          throw error;
        }
      },

      /**
       * 排序
       */
      orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): QueryBuilder {
        const spatialIndex = self.spatialIndices.get(tableName);
        const builder = new QueryBuilder(tableName, self.storage, spatialIndex);
        return builder.orderBy(field, direction);
      },

      /**
       * 限制数量
       */
      limit(n: number): QueryBuilder {
        const spatialIndex = self.spatialIndices.get(tableName);
        const builder = new QueryBuilder(tableName, self.storage, spatialIndex);
        return builder.limit(n);
      },

      /**
       * 偏移
       */
      offset(n: number): QueryBuilder {
        const spatialIndex = self.spatialIndices.get(tableName);
        const builder = new QueryBuilder(tableName, self.storage, spatialIndex);
        return builder.offset(n);
      }
    };
  }

  /**
   * 加载空间索引
   */
  private async loadSpatialIndex(
    tableName: string,
    field: string
  ): Promise<void> {
    try {
      const table = this.storage.getTable(tableName);
      const items = await table.toArray();

      const spatialIndex = this.spatialIndices.get(tableName);
      if (!spatialIndex) {
        return;
      }

      const indexItems: IndexItem[] = items
        .filter(item => item[field])
        .map(item => {
          const bbox = getBBox(item[field]);
          return { id: item.id, ...bbox };
        });

      spatialIndex.insertMany(indexItems);
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.indexCreateFailed(
          tableName,
          field,
          error
        );
      }
      throw error;
    }
  }

  /**
   * SQL 查询
   * @param sql SQL 语句
   * @param options 执行选项
   * @returns 查询结果
   *
   * @example
   * ```typescript
   * // 简单查询
   * const results = await db.query('SELECT * FROM features WHERE type = $1', ['restaurant']);
   *
   * // 空间查询
   * const nearby = await db.query(`
   *   SELECT * FROM features
   *   WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 1000)
   * `);
   *
   * // 使用参数化查询
   * const stmt = db.prepare('SELECT * FROM features WHERE type = $1 AND rating >= $2');
   * const pois = await stmt.execute(['restaurant', 4.0]);
   * ```
   */
  async query(sql: string, options?: SQLExecuteOptions | any[]): Promise<any[]> {
    try {
      // 获取默认空间引擎
      const spatialEngine = EngineRegistry.getDefaultEngine();

      // 支持两种调用方式：
      // 1. db.query(sql, { params: [...] })
      // 2. db.query(sql, [...])
      let executeOptions: SQLExecuteOptions;
      if (Array.isArray(options)) {
        executeOptions = { params: options };
      } else {
        executeOptions = options || {};
      }

      const result = await SQLExecutor.execute(
        sql,
        this.storage,
        null, // 不使用空间索引（在查询构建器中处理）
        spatialEngine,
        executeOptions
      );

      return result.data;
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.queryError(
          `SQL query failed: ${error.message}`,
          { sql, options }
        );
      }
      throw error;
    }
  }

  /**
   * 创建预编译 SQL 语句
   * @param sql SQL 语句模板
   * @returns 预编译语句
   *
   * @example
   * ```typescript
   * const stmt = db.prepare('SELECT * FROM features WHERE type = ? AND rating >= ?');
   * const pois = await stmt.execute(['restaurant', 4.0]);
   *
   * // 查看查询计划
   * const plan = stmt.explain();
   * console.log(plan);
   * ```
   */
  prepare(sql: string): PreparedSQLStatement {
    try {
      const spatialEngine = EngineRegistry.getDefaultEngine();

      return SQLExecutor.prepare(
        sql,
        this.storage,
        null, // 不使用空间索引（在查询构建器中处理）
        spatialEngine
      );
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.queryError(
          `Failed to prepare SQL statement: ${error.message}`,
          { sql }
        );
      }
      throw error;
    }
  }

  /**
   * 分析查询计划
   * @param sql SQL 语句
   * @returns 查询计划
   *
   * @example
   * ```typescript
   * const plan = db.explain('SELECT * FROM features WHERE type = ?');
   * console.log('表:', plan.table);
   * console.log('列:', plan.columns);
   * console.log('估算成本:', plan.estimatedCost);
   * ```
   */
  explain(sql: string): QueryPlan {
    try {
      const parser = new Parser();
      const parseResult = parser.parse(sql);

      return SQLExecutor.explain(parseResult);
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.queryError(
          `Failed to explain SQL query: ${error.message}`,
          { sql }
        );
      }
      throw error;
    }
  }

  /**
   * 使 SQL 查询缓存失效
   * @param tableName 表名（可选，不提供则清空所有缓存）
   *
   * @example
   * ```typescript
   * // 使特定表的缓存失效
   * db.invalidateQueryCache('features');
   *
   * // 使所有缓存失效
   * db.invalidateQueryCache();
   * ```
   */
  invalidateQueryCache(tableName?: string): void {
    SQLExecutor.invalidateCache(tableName);
  }

  /**
   * 获取 SQL 查询缓存统计
   * @returns 缓存统计信息
   *
   * @example
   * ```typescript
   * const stats = db.getQueryCacheStats();
   * console.log('缓存大小:', stats.size);
   * console.log('最大容量:', stats.maxSize);
   * console.log('总访问次数:', stats.totalAccessCount);
   * ```
   */
  getQueryCacheStats() {
    return SQLExecutor.getCacheStats();
  }

  /**
   * 获取性能统计信息
   * @returns 性能统计数据
   *
   * @example
   * ```typescript
   * const stats = db.getStats();
   * console.log('总查询次数:', stats.queryCount);
   * console.log('平均查询时间:', stats.avgQueryTime, 'ms');
   * console.log('索引命中率:', (stats.indexHitRate * 100).toFixed(1), '%');
   * console.log('缓存命中率:', (stats.cacheHitRate * 100).toFixed(1), '%');
   * console.log('内存使用:', (stats.memoryUsage / 1024 / 1024).toFixed(2), 'MB');
   * ```
   */
  async getStats() {
    const { getGlobalPerformanceMonitor } = await import('./monitoring');
    const monitor = getGlobalPerformanceMonitor();
    return monitor.getStats();
  }

  /**
   * 启用或禁用性能分析
   * @param enabled 是否启用性能分析
   *
   * @example
   * ```typescript
   * // 启用性能分析
   * db.enableProfiling(true);
   *
   * // 禁用性能分析
   * db.enableProfiling(false);
   * ```
   */
  async enableProfiling(enabled: boolean): Promise<void> {
    const { getGlobalPerformanceMonitor } = await import('./monitoring');
    const monitor = getGlobalPerformanceMonitor();
    monitor.enableProfiling(enabled);
  }

  /**
   * 获取慢查询日志
   * @param threshold 慢查询阈值（毫秒），可选，默认使用当前设置的阈值
   * @returns 慢查询列表
   *
   * @example
   * ```typescript
   * // 获取所有慢查询（使用默认阈值）
   * const slowQueries = await db.getSlowQueries();
   *
   * // 获取超过 200ms 的查询
   * const verySlowQueries = await db.getSlowQueries(200);
   *
   * // 分析慢查询
   * slowQueries.forEach(q => {
   *   console.log(`${q.type}: ${q.query} - ${q.duration}ms`);
   * });
   * ```
   */
  async getSlowQueries(threshold?: number) {
    const { getGlobalPerformanceMonitor } = await import('./monitoring');
    const monitor = getGlobalPerformanceMonitor();
    return monitor.getSlowQueries(threshold);
  }

  /**
   * 重置性能统计信息
   *
   * @example
   * ```typescript
   * // 重置统计
   * await db.resetStats();
   * ```
   */
  async resetStats(): Promise<void> {
    const { getGlobalPerformanceMonitor } = await import('./monitoring');
    const monitor = getGlobalPerformanceMonitor();
    monitor.resetStats();
  }

  /**
   * 设置慢查询阈值
   * @param threshold 慢查询阈值（毫秒）
   *
   * @example
   * ```typescript
   * // 将慢查询阈值设置为 50ms
   * await db.setSlowQueryThreshold(50);
   * ```
   */
  async setSlowQueryThreshold(threshold: number): Promise<void> {
    const { getGlobalPerformanceMonitor } = await import('./monitoring');
    const monitor = getGlobalPerformanceMonitor();
    monitor.setSlowQueryThreshold(threshold);
  }

  /**
   * 获取性能报告
   * @returns 格式化的性能报告字符串
   *
   * @example
   * ```typescript
   * // 打印性能报告
   * const report = await db.getPerformanceReport();
   * console.log(report);
   * ```
   */
  async getPerformanceReport(): Promise<string> {
    const { getGlobalPerformanceMonitor } = await import('./monitoring');
    const monitor = getGlobalPerformanceMonitor();
    return monitor.getReport();
  }
}
