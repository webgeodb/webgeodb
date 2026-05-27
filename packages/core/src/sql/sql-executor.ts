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
import wellknown from 'wellknown';

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
  /** 表 schema 定义（用于列验证） */
  tableSchemas?: Record<string, Record<string, string>>;
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
  private spatialIndices: Map<string, SpatialIndex> | null;
  private spatialEngine: SpatialEngine;
  private cache: SQLQueryCache;

  constructor(
    sql: string,
    parseResult: SQLParseResult,
    storage: IndexedDBStorage,
    spatialIndices: Map<string, SpatialIndex> | null,
    spatialEngine: SpatialEngine,
    cache: SQLQueryCache
  ) {
    this.sql = sql;
    this.parseResult = parseResult;
    this.storage = storage;
    this.spatialIndices = spatialIndices;
    this.spatialEngine = spatialEngine;
    this.cache = cache;
  }

  /**
   * 执行预编译语句
   */
  async execute(params?: any[]): Promise<any[]> {
    // 深拷贝 AST 以避免多次执行时参数互相污染
    const clonedParseResult = JSON.parse(JSON.stringify(this.parseResult));

    const options: SQLExecuteOptions = {
      params,
      spatialEngine: this.spatialEngine,
      parseResult: clonedParseResult,
      useCache: false // 参数化查询不使用缓存
    };

    const result = await SQLExecutor.execute(
      this.sql,
      this.storage,
      this.spatialIndices,
      this.spatialEngine,
      options
    );

    return result.data;
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
    spatialIndices: Map<string, SpatialIndex> | null,
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
            spatialIndices,
            spatialEngine,
            options.tableSchemas
          );

        case 'insert':
          return this.executeInsert(
            statement as SQLInsertStatement,
            storage,
            spatialIndices
          );

        case 'update':
          return this.executeUpdate(
            statement as SQLUpdateStatement,
            storage,
            spatialIndices
          );

        case 'delete':
          return this.executeDelete(
            statement as SQLDeleteStatement,
            storage,
            spatialIndices
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
    spatialIndices: Map<string, SpatialIndex> | null,
    spatialEngine: SpatialEngine,
    tableSchemas?: Record<string, Record<string, string>>
  ): Promise<any[]> {
    // 检查数据库是否已关闭
    if (!storage.isOpen) {
      throw ErrorFactory.databaseError(ErrorCode.DATABASE_CLOSED, 'Database is closed, cannot execute SELECT query');
    }

    // 验证列是否存在
    if (tableSchemas) {
      const tableSchema = tableSchemas[statement.from];
      if (tableSchema) {
        const validColumns = new Set(Object.keys(tableSchema));
        for (const col of statement.columns) {
          // Columns are converted to { type: 'column', name: 'fieldName' } by sql-parser
          if (col.type === 'column') {
            const colName = col.name || '';
            if (colName && colName !== '*' && !validColumns.has(colName)) {
              throw ErrorFactory.queryError(
                `Invalid column name: '${colName}' does not exist in table '${statement.from}'`,
                { column: colName, table: statement.from, validColumns: Array.from(validColumns) }
              );
            }
          }
        }
      }
    }

    try {
      // 检查是否包含聚合函数
      const hasAggregateFunctions = this.hasAggregateFunctions(statement);

      // 解析该表对应的空间索引
      const spatialIndex = spatialIndices?.get(statement.from) ?? null;

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
        // 在聚合前先预计算非聚合的函数列（如 ST_GeometryType），以便 GROUP BY 可用
        const nonAggregateFunctionCols = statement.columns.filter((col: any) =>
          col.type === 'function' && !AggregateFunctionProcessor.isAggregateFunction(col)
        );
        if (nonAggregateFunctionCols.length > 0) {
          results = results.map(row => {
            const enriched = { ...row };
            nonAggregateFunctionCols.forEach((col: any) => {
              const alias = col.alias || col.name || 'computed';
              enriched[alias] = this.evaluateFunction(col, row, spatialEngine);
            });
            return enriched;
          });
        }
        results = this.processAggregateFunctions(results, statement);
      } else {
        // 处理列选择
        if (statement.columns.length > 0 && !this.isWildcardSelect(statement.columns)) {
          results = this.projectColumns(results, statement.columns, spatialEngine);
        }
      }
      // 处理 DISTINCT
      if (statement.distinct) {
        results = this.distinct(results);
      }

      // 处理 GROUP BY（仅在没有聚合函数时，聚合函数已在 processAggregateFunctions 中处理了分组）
      if (!hasAggregateFunctions && statement.groupBy && statement.groupBy.length > 0) {
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
    spatialIndices: Map<string, SpatialIndex> | null
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
    spatialIndices: Map<string, SpatialIndex> | null
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
    spatialIndices: Map<string, SpatialIndex> | null
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
  private static projectColumns(results: any[], columns: any[], spatialEngine: SpatialEngine): any[] {
    console.log('[SQL Executor] projectColumns called with', columns.length, 'columns');
    columns.forEach((col, i) => {
      // 安全地序列化列对象
      const safeCol = JSON.parse(JSON.stringify(col, (key, value) => {
        if (typeof value === 'function') {
          return '[Function]';
        }
        return value;
      }));
      console.log(`[SQL Executor] Column ${i}:`, JSON.stringify(safeCol));
    });

    return results.map(row => {
      const projected: any = {};

      columns.forEach((col: any) => {
        if (col.type === 'wildcard') {
          Object.assign(projected, row);
        } else if (col.type === 'column') {
          // 检查 name 字段是否是对象（函数调用）
          if (col.name && typeof col.name === 'object') {
            console.log('[SQL Executor] Column type is "column" but name is an object, evaluating as function');
            const result = this.evaluateFunction(col.name, row, spatialEngine);
            const colName = col.alias || 'computed';
            console.log('[SQL Executor] Function evaluation result:', { colName, result });
            projected[colName] = result;
          } else {
            const value = col.table ? row[col.table]?.[col.name] : row[col.name];
            projected[col.alias || col.name] = value;
          }
        } else if (col.type === 'function') {
          // 处理函数调用
          console.log('[SQL Executor] Processing function column:', col);
          const result = this.evaluateFunction(col, row, spatialEngine);
          const colName = col.alias || this.getFunctionName(col);
          console.log('[SQL Executor] Function result:', { colName, result });
          projected[colName] = result;
        } else {
          // 未知的列类型 - 尝试检查 name 字段是否是对象
          console.log('[SQL Executor] Unknown column type:', col.type, 'with structure:', JSON.parse(JSON.stringify(col, (key, value) => {
            if (typeof value === 'function') return '[Function]';
            return value;
          })));

          // 检查 name 字段是否包含函数调用
          if (col.name && typeof col.name === 'object') {
            console.log('[SQL Executor] Column name is an object, likely a function call');
            const result = this.evaluateFunction(col.name, row, spatialEngine);
            const colName = col.alias || 'computed';
            projected[colName] = result;
          } else {
            projected[col.alias || col.name || 'unknown'] = null;
          }
        }
      });

      return projected;
    });
  }

  /**
   * 计算函数值
   */
  private static evaluateFunction(func: any, row: any, spatialEngine: SpatialEngine): any {
    const funcName = this.getFunctionName(func);
    // 参数可能在多个位置：直接属性、expression 子对象中
    const args = func.args || func.arguments || func.expression?.arguments || func.expression?.args || [];

    console.log(`[SQL Executor] Evaluating function: ${funcName} with args:`, args);

    switch (funcName) {
      case 'ST_Distance': {
        // ST_Distance(geometry, point)
        if (args.length < 2) return null;

        const geomExpr = args[0];
        const pointExpr = args[1];

        // 获取几何数据
        let geom = this.extractGeometryValue(geomExpr, row);
        const point = this.extractPointValue(pointExpr);

        if (!geom || !point) return null;

        // turf.distance 要求两个参数都是 Point，非 Point 几何先取质心
        if (geom.type !== 'Point') {
          try {
            geom = spatialEngine.centroid(geom);
          } catch {
            return null;
          }
        }

        // Use SpatialEngine distance, converted to kilometers for geographic CRS
        const distInDegrees = spatialEngine.distance(geom, point);
        // Convert degrees to kilometers (approximate: 1 deg ≈ 111.32 km at equator)
        const distInKm = distInDegrees * 111.32;
        return distInKm;
      }

      case 'ST_GeometryType': {
        // ST_GeometryType(geometry)
        if (args.length < 1) return null;

        const geomExpr = args[0];
        const geom = this.extractGeometryValue(geomExpr, row);

        if (!geom) return null;

        const geomType = geom.type || 'Unknown';
        console.log(`[SQL Executor] ST_GeometryType result:`, geomType);
        return geomType;
      }

      case 'ST_BoundingBox': {
        // ST_BoundingBox(geometry)
        if (args.length < 1) return null;

        const geomExpr = args[0];
        const geom = this.extractGeometryValue(geomExpr, row);

        if (!geom || !geom.coordinates) return null;

        // 计算边界框
        const bbox = this.calculateBoundingBox(geom);
        console.log(`[SQL Executor] ST_BoundingBox result:`, bbox);
        return bbox;
      }

      case 'ST_MakePoint': {
        // ST_MakePoint(x, y)
        if (args.length < 2) return null;

        const x = this.extractLiteralValue(args[0]);
        const y = this.extractLiteralValue(args[1]);

        if (x === null || y === null) return null;

        const point = { type: 'Point', coordinates: [x, y] };
        console.log(`[SQL Executor] ST_MakePoint result:`, point);
        return point;
      }

      case 'ST_AsText': {
        // ST_AsText(geometry) — GeoJSON → WKT
        if (args.length < 1) return null;

        const geomExpr = args[0];
        const geom = this.extractGeometryValue(geomExpr, row);

        if (!geom) return null;

        try {
          const wkt = wellknown.stringify(geom);
          return wkt;
        } catch {
          return null;
        }
      }

      case 'ST_AsBinary': {
        // ST_AsBinary(geometry) — GeoJSON → WKB (placeholder via JSON)
        if (args.length < 1) return null;

        const geomExpr = args[0];
        const geom = this.extractGeometryValue(geomExpr, row);

        if (!geom) return null;
        return JSON.stringify(geom);
      }

      default:
        console.warn(`[SQL Executor] Unsupported function: ${funcName}`);
        return null;
    }
  }

  /**
   * 获取函数名称
   */
  private static getFunctionName(func: any): string {
    return SQLExecutor.extractNameFromRaw(func.name || func.fn);
  }

  private static extractNameFromRaw(raw: any): string {
    if (!raw) return 'unknown';
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) {
      const first = raw[0];
      if (!first) return 'unknown';
      return typeof first === 'string' ? first : (first.value || first.name || 'unknown');
    }
    if (typeof raw === 'object') {
      // { name: [...] } 格式
      if (Array.isArray(raw.name)) return SQLExecutor.extractNameFromRaw(raw.name);
      if (typeof raw.name === 'string') return raw.name;
      if (typeof raw.value === 'string') return raw.value;
    }
    return 'unknown';
  }

  /**
   * 从 column_ref AST 节点提取列名
   */
  private static extractColumnName(col: any): string {
    if (col.type !== 'column_ref') return '';
    const column = col.column;
    if (!column) return '';
    if (typeof column === 'string') return column;
    if (typeof column === 'object') {
      // PostgreSQL 模式: { expr: { type: 'default', value: 'fieldName' } }
      if (column.expr && typeof column.expr === 'object') {
        return column.expr.value || '';
      }
      // 直接值
      if (typeof column.value === 'string') return column.value;
    }
    return '';
  }

  /**
   * 提取几何值
   */
  private static extractGeometryValue(expr: any, row: any): any {
    if (expr.type === 'column_ref') {
      // expr.column 可能是字符串或嵌套对象 {expr:{type:'default', value:'geometry'}}
      let colName: string;
      if (typeof expr.column === 'string') {
        colName = expr.column;
      } else if (expr.column?.expr?.value) {
        colName = expr.column.expr.value;
      } else if (expr.column?.value) {
        colName = expr.column.value;
      } else {
        colName = expr.value || '';
      }
      return row[colName];
    }
    return null;
  }

  /**
   * 提取点值
   */
  private static extractPointValue(expr: any): any {
    // 处理 ST_MakePoint(x, y) 或 ST_Point(x, y) 函数调用
    const funcName = expr.type === 'function' ? this.getFunctionName(expr) : null;
    const isPointFunc = funcName === 'ST_MakePoint' || funcName === 'ST_Point';

    if (expr.type === 'function' && isPointFunc) {
      const args = expr.args || expr.arguments || expr.expression?.arguments || expr.expression?.args || [];
      const x = this.extractLiteralValue(args[0]);
      const y = this.extractLiteralValue(args[1]);
      if (x !== null && y !== null) {
        return { type: 'Point', coordinates: [x, y] };
      }
    }
    return null;
  }

  /**
   * 提取字面量值
   */
  private static extractLiteralValue(expr: any): any {
    if (expr.type === 'single_quote_string' || expr.type === 'string') {
      return expr.value;
    }
    if (expr.type === 'number') {
      return Number(expr.value);
    }
    if (expr.type === 'bool') {
      return expr.value;
    }
    if (expr.type === 'null') {
      return null;
    }
    if (expr.value !== undefined) {
      return expr.value;
    }
    return null;
  }

  /**
   * 计算边界框
   */
  private static calculateBoundingBox(geom: any): any {
    if (!geom.coordinates) return null;

    const coords = geom.coordinates;
    let minX: number, minY: number, maxX: number, maxY: number;

    switch (geom.type) {
      case 'Point':
        [minX, minY] = coords;
        [maxX, maxY] = coords;
        break;

      case 'LineString':
        minX = Math.min(...coords.map((c: number[]) => c[0]));
        minY = Math.min(...coords.map((c: number[]) => c[1]));
        maxX = Math.max(...coords.map((c: number[]) => c[0]));
        maxY = Math.max(...coords.map((c: number[]) => c[1]));
        return { minX, minY, maxX, maxY };

      case 'Polygon':
        const ring = coords[0];
        minX = Math.min(...ring.map((c: number[]) => c[0]));
        minY = Math.min(...ring.map((c: number[]) => c[1]));
        maxX = Math.max(...ring.map((c: number[]) => c[0]));
        maxY = Math.max(...ring.map((c: number[]) => c[1]));
        return { minX, minY, maxX, maxY };

      default:
        return null;
    }

    return { minX, minY, maxX, maxY };
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
    return results.filter(row => this.evaluateHavingExpression(having, row));
  }

  /**
   * 递归评估 HAVING 表达式
   */
  private static evaluateHavingExpression(expr: any, row: any): boolean {
    if (!expr || typeof expr !== 'object') return true;

    // 处理逻辑运算符 AND/OR（convertExpression 将 binary_expr 转为 type: 'binary'）
    if ((expr.type === 'binary' || expr.type === 'binary_expr') && (expr.operator === 'AND' || expr.operator === 'OR')) {
      const leftResult = this.evaluateHavingExpression(expr.left, row);
      const rightResult = this.evaluateHavingExpression(expr.right, row);
      return expr.operator === 'AND' ? (leftResult && rightResult) : (leftResult || rightResult);
    }

    // 处理比较运算符
    if (expr.type === 'binary' || expr.type === 'binary_expr') {
      const left = this.evaluateHavingOperand(expr.left, row);
      const right = this.evaluateHavingOperand(expr.right, row);

      switch (expr.operator) {
        case '=': return left == right;
        case '!=':
        case '<>': return left != right;
        case '>': return left > right;
        case '>=': return left >= right;
        case '<': return left < right;
        case '<=': return left <= right;
        default: return true;
      }
    }

    return true;
  }

  /**
   * 评估 HAVING 操作数
   */
  private static evaluateHavingOperand(operand: any, row: any): any {
    if (!operand || typeof operand !== 'object') return operand;

    if (operand.type === 'column_ref') {
      // convertExpression preserves column_ref with column as-is (may be string or object)
      const colName = typeof operand.column === 'string'
        ? operand.column
        : (operand.column?.expr?.value || operand.column?.value || '');
      return row[colName];
    }

    if (operand.type === 'literal') {
      return operand.value;
    }

    if (operand.type === 'number' || operand.type === 'string') {
      return operand.value;
    }

    return operand.value;
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

          const paramValue = params[paramIndex++];
          return {
            type: 'literal',
            value: paramValue
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

        // 处理 expr_list (IN/BETWEEN 的参数列表)
        if (node.type === 'expr_list' && Array.isArray(node.value)) {
          node.value = node.value.map(replaceParameter);
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
   * Convert parameter values for type coercion (e.g., numeric strings → numbers)
   */
  private static convertParamValue(value: any): any {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed !== '' && !isNaN(Number(trimmed))) {
        return Number(trimmed);
      }
    }
    return value;
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
    spatialIndices: Map<string, SpatialIndex> | null,
    spatialEngine: SpatialEngine
  ): PreparedSQLStatement {
    const parser = new Parser();
    const parseResult = parser.parse(sql);

    return new PreparedSQLStatement(
      sql,
      parseResult,
      storage,
      spatialIndices,
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
