/**
 * SQL 查询执行器
 * 执行解析后的 SQL 语句并返回结果
 */

import type { IndexedDBStorage } from '../storage';
import type { SpatialIndex } from '../index/spatial-index';
import type { SpatialEngine } from '../spatial/spatial-engine';
import type { QueryBuilder } from '../query/query-builder';
import type {
  SQLStatement,
  SQLSelectStatement,
  SQLInsertStatement,
  SQLUpdateStatement,
  SQLDeleteStatement,
  SQLParseResult,
  QueryPlan
} from './ast-nodes';
import { Parser } from './sql-parser';
import { SQLToQueryBuilderTranslator } from './query-translator';
import { SQLQueryCache, getGlobalCache } from './cache';
import { PostGISFunctionRegistry, parsePostGISFunction } from './postgis-functions';
import { AggregateFunctionProcessor } from './aggregate-functions';
import { ErrorFactory, SQLError, DatabaseError, StorageError, ErrorCode } from '../errors';

/**
 * SQL 执行选项
 */
export interface SQLExecuteOptions {
  /** 是否使用缓存 */
  useCache?: boolean;
  /** 参数化查询参数 */
  params?: any[];
  /** 空间引擎 */
  spatialEngine?: SpatialEngine;
  /** 预解析的结果（用于预编译语句） */
  parseResult?: SQLParseResult;
}

/**
 * SQL 执行结果
 */
export interface SQLExecuteResult {
  /** 结果数据 */
  data: any[];
  /** 执行时间（毫秒） */
  duration: number;
  /** 是否来自缓存 */
  fromCache?: boolean;
  /** 影响的行数 */
  rowsAffected?: number;
  /** 查询计划 */
  plan?: QueryPlan;
}

/**
 * 预编译语句
 */
export class PreparedSQLStatement {
  private sql: string;
  private parseResult: SQLParseResult;
  private storage: IndexedDBStorage;
  private spatialIndex: SpatialIndex | null;
  private spatialEngine: SpatialEngine;
  private cache: SQLQueryCache;

  constructor(
    sql: string,
    parseResult: SQLParseResult,
    storage: IndexedDBStorage,
    spatialIndex: SpatialIndex | null,
    spatialEngine: SpatialEngine,
    cache: SQLQueryCache
  ) {
    this.sql = sql;
    this.parseResult = parseResult;
    this.storage = storage;
    this.spatialIndex = spatialIndex;
    this.spatialEngine = spatialEngine;
    this.cache = cache;
  }

  /**
   * 执行预编译语句
   */
  async execute(params?: any[]): Promise<SQLExecuteResult> {
    const options: SQLExecuteOptions = {
      params,
      spatialEngine: this.spatialEngine,
      parseResult: this.parseResult
    };

    return SQLExecutor.execute(
      this.sql,
      this.storage,
      this.spatialIndex,
      this.spatialEngine,
      options
    );
  }

  /**
   * 获取查询计划
   */
  explain(): QueryPlan {
    return SQLExecutor.explain(this.parseResult);
  }

  /**
   * 获取原始 SQL
   */
  getSQL(): string {
    return this.sql;
  }

  /**
   * 获取参数数量
   */
  getParameterCount(): number {
    return this.parseResult.parameters.length;
  }
}

/**
 * SQL 执行器类
 */
export class SQLExecutor {
  private static cache: SQLQueryCache = getGlobalCache();
  private static translator: SQLToQueryBuilderTranslator = new SQLToQueryBuilderTranslator();

  /**
   * 执行 SQL 查询
   */
  static async execute(
    sql: string,
    storage: IndexedDBStorage,
    spatialIndex: SpatialIndex | null,
    spatialEngine: SpatialEngine,
    options: SQLExecuteOptions = {}
  ): Promise<SQLExecuteResult> {
    const startTime = performance.now();
    const useCache = options.useCache !== false;

    // 解析 SQL（如果未提供预解析结果）
    let parseResult = options.parseResult;
    if (!parseResult) {
      const parser = new Parser();
      parseResult = parser.parse(sql);
    }

    // 应用参数化查询参数
    if (options.params && options.params.length > 0) {
      this.applyParameters(parseResult, options.params);
    }

    // 创建执行器
    const executor = async (): Promise<any[]> => {
      const statement = parseResult.statement;

      switch (statement.type) {
        case 'select':
          return this.executeSelect(
            statement as SQLSelectStatement,
            storage,
            spatialIndex,
            spatialEngine
          );

        case 'insert':
          return this.executeInsert(
            statement as SQLInsertStatement,
            storage,
            spatialIndex
          );

        case 'update':
          return this.executeUpdate(
            statement as SQLUpdateStatement,
            storage,
            spatialIndex
          );

        case 'delete':
          return this.executeDelete(
            statement as SQLDeleteStatement,
            storage,
            spatialIndex
          );

        default:
          throw new SQLError(
            'SQL_NOT_SUPPORTED' as any,
            `不支持的语句类型: ${(statement as any).type}`,
            { query: sql }
          );
      }
    };

    // 使用缓存执行
    const tables = this.extractTables(parseResult);
    let result: any[];

    if (useCache) {
      result = await this.cache.execute(sql, executor, tables);
    } else {
      result = await executor();
    }

    const duration = performance.now() - startTime;

    return {
      data: result,
      duration,
      fromCache: false
    };
  }

  /**
   * 执行 SELECT 语句
   */
  private static async executeSelect(
    statement: SQLSelectStatement,
    storage: IndexedDBStorage,
    spatialIndex: SpatialIndex | null,
    spatialEngine: SpatialEngine
  ): Promise<any[]> {
    // 检查数据库是否已关闭
    if (!storage.isOpen) {
      throw ErrorFactory.databaseError(ErrorCode.DATABASE_CLOSED, 'Database is closed, cannot execute SELECT query');
    }

    try {
      // 检查是否包含聚合函数
      const hasAggregateFunctions = this.hasAggregateFunctions(statement);

      // 创建 QueryBuilder
      const QueryBuilderClass = (await import('../query/query-builder')).QueryBuilder;
      const builder = new QueryBuilderClass(
        statement.from,
        storage,
        spatialIndex,
        spatialEngine
      );

      // 使用转换器将 SQL 转换为 QueryBuilder 调用
      this.translator.translate(statement, builder);

      // 执行查询
      let results = await builder.toArray();

      // 处理列选择
      // 如果包含聚合函数，使用聚合处理器
      if (hasAggregateFunctions) {
        results = this.processAggregateFunctions(results, statement);
      } else {
        // 处理列选择
        if (statement.columns.length > 0 && !this.isWildcardSelect(statement.columns)) {
          results = this.projectColumns(results, statement.columns);
        }
      }
      // 处理 DISTINCT
      if (statement.distinct) {
        results = this.distinct(results);
      }

      // 处理 GROUP BY
      if (statement.groupBy && statement.groupBy.length > 0) {
        results = this.groupBy(results, statement.groupBy);
      }

      // 处理 HAVING
      if (statement.having) {
        results = this.applyHaving(results, statement.having);
      }

      return results;
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.queryError(
          `Failed to execute SELECT query on table '${statement.from}': ${error.message}`,
          { table: statement.from, statement },
          error
        );
      }
      throw error;
    }
  }

  /**
   * 执行 INSERT 语句
   */
  private static async executeInsert(
    statement: SQLInsertStatement,
    storage: IndexedDBStorage,
    spatialIndex: SpatialIndex | null
  ): Promise<any[]> {
    // 检查数据库是否已关闭
    if (!storage.isOpen) {
      throw ErrorFactory.databaseError(ErrorCode.DATABASE_CLOSED, 'Database is closed, cannot execute INSERT query');
    }

    try {
      const table = storage.getTable(statement.table);
      const results: string[] = [];

      for (const row of statement.values) {
        const data: any = {};

        if (statement.columns) {
          statement.columns.forEach((col, index) => {
            data[col] = row[index];
          });
        } else {
          Object.assign(data, row);
        }

        const id = await table.add(data);
        results.push(id);
      }

      return results;
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.storageError(
          `Failed to execute INSERT query on table '${statement.table}': ${error.message}`,
          error
        );
      }
      throw error;
    }
  }

  /**
   * 执行 UPDATE 语句
   */
  private static async executeUpdate(
    statement: SQLUpdateStatement,
    storage: IndexedDBStorage,
    spatialIndex: SpatialIndex | null
  ): Promise<any[]> {
    // 检查数据库是否已关闭
    if (!storage.isOpen) {
      throw ErrorFactory.databaseError(ErrorCode.DATABASE_CLOSED, 'Database is closed, cannot execute UPDATE query');
    }

    try {
      const table = storage.getTable(statement.table);

      // 如果没有 WHERE 子句，更新所有行
      if (!statement.where) {
        const allItems = await table.toArray();
        await Promise.all(allItems.map(item => table.update(item.id, statement.set)));
        return allItems;
      }

      // TODO: 实现 WHERE 子句的过滤
      // 目前简化为全表更新
      const allItems = await table.toArray();
      await Promise.all(allItems.map(item => table.update(item.id, statement.set)));

      return allItems;
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.storageError(
          `Failed to execute UPDATE query on table '${statement.table}': ${error.message}`,
          error
        );
      }
      throw error;
    }
  }

  /**
   * 执行 DELETE 语句
   */
  private static async executeDelete(
    statement: SQLDeleteStatement,
    storage: IndexedDBStorage,
    spatialIndex: SpatialIndex | null
  ): Promise<any[]> {
    // 检查数据库是否已关闭
    if (!storage.isOpen) {
      throw ErrorFactory.databaseError(ErrorCode.DATABASE_CLOSED, 'Database is closed, cannot execute DELETE query');
    }

    try {
      const table = storage.getTable(statement.table);

      // 如果没有 WHERE 子句，删除所有行
      if (!statement.where) {
        const allItems = await table.toArray();
        await table.clear();
        return allItems;
      }

      // TODO: 实现 WHERE 子句的过滤
      // 目前简化为全表删除
      const allItems = await table.toArray();
      await table.clear();

      return allItems;
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.storageError(
          `Failed to execute DELETE query on table '${statement.table}': ${error.message}`,
          error
        );
      }
      throw error;
    }
  }

  /**
   * 投影列
   */
  private static projectColumns(results: any[], columns: any[]): any[] {
    return results.map(row => {
      const projected: any = {};

      columns.forEach((col: any) => {
        if (col.type === 'wildcard') {
          Object.assign(projected, row);
        } else if (col.type === 'column') {
          const value = col.table ? row[col.table]?.[col.name] : row[col.name];
          projected[col.alias || col.name] = value;
        } else if (col.type === 'function') {
          // TODO: 处理函数调用
          projected[col.alias || col.name] = null;
        }
      });

      return projected;
    });
  }

  /**
   * 检查是否是通配符选择
   */
  private static isWildcardSelect(columns: any[]): boolean {
    return columns.length === 1 && columns[0].type === 'wildcard';
  }

  /**
   * 去重
   */
  private static distinct(results: any[]): any[] {
    const seen = new Set();
    return results.filter(row => {
      const key = JSON.stringify(row);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 分组
   */
  private static groupBy(results: any[], groupBy: string[]): any[] {
    const groups = new Map();

    results.forEach(row => {
      const key = groupBy.map(col => row[col]).join('|');

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push(row);
    });

    return Array.from(groups.values()).map(group => {
      const result: any = {};
      groupBy.forEach(col => {
        result[col] = group[0][col];
      });
      result.count = group.length;
      return result;
    });
  }

  /**
   * 应用 HAVING 子句
   */
  private static applyHaving(results: any[], having: any): any[] {
    // TODO: 实现 HAVING 子句
    return results;
  }

  /**
   * 应用参数化查询参数
   */
  private static applyParameters(parseResult: SQLParseResult, params: any[]): void {
    try {
      let paramIndex = 0;

      const replaceParameter = (node: any): any => {
        if (!node || typeof node !== 'object') {
          return node;
        }

        if (node.type === 'param') {
          if (paramIndex >= params.length) {
            throw ErrorFactory.queryError(
              `Insufficient parameters: need ${paramIndex + 1}, provided ${params.length}`,
              { params, paramIndex }
            );
          }

          return {
            type: 'literal',
            value: params[paramIndex++]
          };
        }

        // 递归处理子节点
        if (node.left) {
          node.left = replaceParameter(node.left);
        }

        if (node.right) {
          node.right = replaceParameter(node.right);
        }

        if (node.arguments) {
          node.arguments = node.arguments.map(replaceParameter);
        }

        if (node.operands) {
          node.operands = node.operands.map(replaceParameter);
        }

        // 处理 SELECT 语句的 WHERE 子句
        if (node.where) {
          node.where = replaceParameter(node.where);
        }

        // 处理其他可能的子节点
        if (node.columns) {
          node.columns = node.columns.map(replaceParameter);
        }

        return node;
      };

      // 替换 AST 中的参数
      parseResult.statement = replaceParameter(parseResult.statement) as SQLStatement;
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.queryError(
          `Failed to apply parameters to SQL query: ${error.message}`,
          { params },
          error
        );
      }
      throw error;
    }
  }

  /**
   * 提取表名
   */
  private static extractTables(parseResult: SQLParseResult): string[] {
    const statement = parseResult.statement;

    switch (statement.type) {
      case 'select':
        return [statement.from];

      case 'insert':
        return [statement.table];

      case 'update':
        return [statement.table];

      case 'delete':
        return [statement.table];

      default:
        return [];
    }
  }

  /**
   * 分析查询计划
   */
  static explain(parseResult: SQLParseResult): QueryPlan {
    const statement = parseResult.statement;

    if (statement.type !== 'select') {
      throw new Error('只能分析 SELECT 语句');
    }

    const selectStmt = statement as SQLSelectStatement;

    return {
      sql: '', // 可以从原始 SQL 获取
      table: selectStmt.from,
      columns: selectStmt.columns.map((col: any) => {
        if (col.type === 'wildcard') return '*';
        if (col.type === 'column') return col.name;
        if (col.type === 'function') return col.name;
        return String(col);
      }),
      where: selectStmt.where,
      spatialConditions: [], // TODO: 从 WHERE 子句提取空间条件
      orderBy: selectStmt.orderBy || [],
      limit: selectStmt.limit,
      offset: selectStmt.offset
    };
  }

  /**
   * 创建预编译语句
   */
  static prepare(
    sql: string,
    storage: IndexedDBStorage,
    spatialIndex: SpatialIndex | null,
    spatialEngine: SpatialEngine
  ): PreparedSQLStatement {
    const parser = new Parser();
    const parseResult = parser.parse(sql);

    return new PreparedSQLStatement(
      sql,
      parseResult,
      storage,
      spatialIndex,
      spatialEngine,
      this.cache
    );
  }

  /**
   * 使缓存失效
   */
  static invalidateCache(tableName?: string): void {
    if (tableName) {
      this.cache.invalidateTable(tableName);
    } else {
      this.cache.invalidateAll();
    }
  }

  /**
   * 获取缓存统计
   */
  static getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * 检查是否包含聚合函数
   */
  private static hasAggregateFunctions(statement: SQLSelectStatement): boolean {
    return statement.columns.some((col: any) => 
      AggregateFunctionProcessor.isAggregateFunction(col)
    );
  }

  /**
   * 处理聚合函数
   */
  private static processAggregateFunctions(results: any[], statement: SQLSelectStatement): any[] {
    // 如果没有 GROUP BY，返回单行聚合结果
    if (!statement.groupBy || statement.groupBy.length === 0) {
      return this.computeAggregates(results, statement.columns);
    }

    // 如果有 GROUP BY，先分组再聚合
    return this.groupByAndAggregate(results, statement.groupBy, statement.columns);
  }

  /**
   * 计算聚合函数结果
   */
  private static computeAggregates(data: any[], columns: any[]): any[] {
    const result: any = {};

    columns.forEach((col: any) => {
      const aggFunc = AggregateFunctionProcessor.extractAggregateFunction(col);
      if (aggFunc) {
        result[col.alias || aggFunc.type.toLowerCase()] = AggregateFunctionProcessor.executeAggregate(aggFunc, data);
      } else if (col.type === 'column') {
        // 如果没有聚合函数，使用第一行的值
        result[col.alias || col.name] = data.length > 0 ? data[0][col.name] : null;
      } else if (col.type === 'wildcard') {
        // 通配符，使用第一行
        if (data.length > 0) {
          Object.assign(result, data[0]);
        }
      }
    });

    return [result];
  }

  /**
   * 分组并聚合
   */
  private static groupByAndAggregate(data: any[], groupBy: string[], columns: any[]): any[] {
    const groups = new Map<string, any[]>();

    // 分组
    data.forEach(row => {
      const key = groupBy.map(col => row[col]).join('|');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(row);
    });

    // 对每个组应用聚合函数
    return Array.from(groups.values()).map(groupData => {
      const result: any = {};

      // 添加 GROUP BY 列
      groupBy.forEach(col => {
        result[col] = groupData[0][col];
      });

      // 计算聚合函数
      columns.forEach((col: any) => {
        const aggFunc = AggregateFunctionProcessor.extractAggregateFunction(col);
        if (aggFunc) {
          result[col.alias || aggFunc.type.toLowerCase()] = AggregateFunctionProcessor.executeAggregate(aggFunc, groupData);
        } else if (col.type === 'column' && groupBy.includes(col.name)) {
          // GROUP BY 列已经在上面处理了
        }
      });

      return result;
    });
  }
}
