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

/**
 * WebGeoDB 核心类
 */
export class WebGeoDB {
  private config: DatabaseConfig;
  private storage: IndexedDBStorage;
  private spatialIndices: Map<string, HybridSpatialIndex> = new Map();
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
    await this.storage.open();
  }

  /**
   * 关闭数据库
   */
  async close(): Promise<void> {
    await this.storage.close();
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
      },

      /**
       * 批量插入
       */
      async insertMany(items: any[]): Promise<void> {
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
          const indexItems: IndexItem[] = items
            .filter(item => item.geometry)
            .map(item => {
              const bbox = getBBox(item.geometry);
              return { id: item.id, ...bbox };
            });

          spatialIndex.insertMany(indexItems);
        }
      },

      /**
       * 获取单条数据
       */
      async get(id: string): Promise<any> {
        const table = self.storage.getTable(tableName);
        return table.get(id);
      },

      /**
       * 更新数据
       */
      async update(id: string, data: any): Promise<void> {
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
        if (spatialIndex && data.geometry) {
          // 删除旧索引
          const oldItem = await table.get(id);
          if (oldItem && oldItem.geometry) {
            const oldBBox = getBBox(oldItem.geometry);
            spatialIndex.remove({ id, ...oldBBox });
          }

          // 添加新索引
          const newBBox = getBBox(data.geometry);
          spatialIndex.insert({ id, ...newBBox });
        }
      },

      /**
       * 删除数据
       */
      async delete(id: string): Promise<void> {
        const table = self.storage.getTable(tableName);

        // 删除空间索引
        const spatialIndex = self.spatialIndices.get(tableName);
        if (spatialIndex) {
          const item = await table.get(id);
          if (item && item.geometry) {
            const bbox = getBBox(item.geometry);
            spatialIndex.remove({ id, ...bbox });
          }
        }

        await table.delete(id);
      },

      /**
       * 批量删除
       */
      async deleteMany(ids: string[]): Promise<void> {
        const table = self.storage.getTable(tableName);

        // 删除空间索引
        const spatialIndex = self.spatialIndices.get(tableName);
        if (spatialIndex) {
          for (const id of ids) {
            const item = await table.get(id);
            if (item && item.geometry) {
              const bbox = getBBox(item.geometry);
              spatialIndex.remove({ id, ...bbox });
            }
          }
        }

        await table.bulkDelete(ids);
      },

      /**
       * 创建空间索引
       */
      createIndex(field: string, config?: IndexConfig): void {
        const schema = self.schemas[tableName];
        if (schema[field] !== 'geometry') {
          throw new Error(`Field ${field} is not a geometry field`);
        }

        const spatialIndex = new HybridSpatialIndex();
        self.spatialIndices.set(tableName, spatialIndex);

        // 如果配置了自动维护,加载现有数据
        if (config?.auto !== false) {
          self.loadSpatialIndex(tableName, field);
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
        const table = self.storage.getTable(tableName);
        return table.toArray();
      },

      /**
       * 获取数量
       */
      async count(): Promise<number> {
        const table = self.storage.getTable(tableName);
        return table.count();
      },

      /**
       * 清空表
       */
      async clear(): Promise<void> {
        const table = self.storage.getTable(tableName);
        await table.clear();

        // 清空空间索引
        const spatialIndex = self.spatialIndices.get(tableName);
        if (spatialIndex) {
          spatialIndex.clear();
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
   * const results = await db.query('SELECT * FROM features WHERE type = ?', ['poi']);
   *
   * // 空间查询
   * const nearby = await db.query(`
   *   SELECT * FROM features
   *   WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 1000)
   * `);
   *
   * // 使用参数化查询
   * const stmt = db.prepare('SELECT * FROM features WHERE type = ? AND rating >= ?');
   * const pois = await stmt.execute(['restaurant', 4.0]);
   * ```
   */
  async query(sql: string, options?: SQLExecuteOptions): Promise<any[]> {
    // 获取默认空间引擎
    const spatialEngine = EngineRegistry.getDefaultEngine();

    const result = await SQLExecutor.execute(
      sql,
      this.storage,
      null, // 不使用空间索引（在查询构建器中处理）
      spatialEngine,
      options || {}
    );

    return result.data;
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
    const spatialEngine = EngineRegistry.getDefaultEngine();

    return SQLExecutor.prepare(
      sql,
      this.storage,
      null, // 不使用空间索引（在查询构建器中处理）
      spatialEngine
    );
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
    const parser = new Parser();
    const parseResult = parser.parse(sql);

    return SQLExecutor.explain(parseResult);
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
}
