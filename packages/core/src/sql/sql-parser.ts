/**
 * SQL 解析器
 * 封装 node-sql-parser，提供 PostgreSQL 兼容的 SQL 解析功能
 */

import { Parser as SQLParser } from 'node-sql-parser';
import type {
  SQLStatement,
  SQLParseResult,
  SQLParseOptions,
  ColumnSelector,
  OrderByNode,
  ASTExpression,
  ParameterPlaceholder
} from './ast-nodes';

/**
 * SQL 解析器类
 */
export class Parser {
  private parser: SQLParser;
  private options: SQLParseOptions;

  constructor(options: SQLParseOptions = {}) {
    this.options = {
      database: 'postgresql',
      ...options
    };
    this.parser = new SQLParser();
  }

  /**
   * 解析 SQL 语句
   */
  parse(sql: string): SQLParseResult {
    try {
      const options = {
        database: this.options.database || 'postgresql'
      };
      const ast = this.parser.astify(sql, options);
      const parameters = this.extractParameters(sql);
      const statement = this.convertToStatement(ast);

      return {
        statement,
        ast,
        parameters
      };
    } catch (error) {
      throw new Error(`SQL 解析失败: ${(error as Error).message}`);
    }
  }

  /**
   * 将 AST 转换为标准语句格式
   */
  private convertToStatement(ast: any): SQLStatement {
    if (!ast || typeof ast !== 'object') {
      throw new Error('无效的 AST');
    }

    // 处理数组形式的 AST（node-sql-parser 可能返回数组）
    const stmt = Array.isArray(ast) ? ast[0] : ast;

    switch (stmt.type) {
      case 'select':
        return this.convertSelectStatement(stmt);
      case 'insert':
        return this.convertInsertStatement(stmt);
      case 'update':
        return this.convertUpdateStatement(stmt);
      case 'delete':
        return this.convertDeleteStatement(stmt);
      default:
        throw new Error(`不支持的语句类型: ${stmt.type}`);
    }
  }

  /**
   * 转换 SELECT 语句
   */
  private convertSelectStatement(ast: any): SQLStatement {
    const columns = this.convertColumns(ast.columns);
    const from = this.extractTableName(ast.from);
    const where = ast.where ? this.convertExpression(ast.where) : undefined;
    const orderBy = ast.orderby ? this.convertOrderBy(ast.orderby) : undefined;

    // 处理 LIMIT 和 OFFSET
    let limit: number | undefined = undefined;
    let offset: number | undefined = undefined;

    if (ast.limit) {
      if (ast.limit.seperator === 'offset' && Array.isArray(ast.limit.value) && ast.limit.value.length === 2) {
        // LIMIT x OFFSET y
        limit = this.convertLimit(ast.limit.value[0]);
        offset = this.convertOffset(ast.limit.value[1]);
      } else {
        // 只有 LIMIT
        limit = this.convertLimit(ast.limit);
      }
    }

    if (ast.offset !== undefined) {
      offset = this.convertOffset(ast.offset);
    }

    const distinct = ast.distinct !== undefined;
    const groupBy = ast.groupby ? this.convertGroupBy(ast.groupby) : undefined;
    const having = ast.having ? this.convertExpression(ast.having) : undefined;

    return {
      type: 'select',
      columns,
      from,
      where,
      orderBy,
      limit,
      offset,
      distinct,
      groupBy,
      having
    };
  }

  /**
   * 转换 INSERT 语句
   */
  private convertInsertStatement(ast: any): SQLStatement {
    const table = this.extractTableName(ast.table);
    const columns = ast.columns ? [...ast.columns] : undefined;
    const values = this.convertValues(ast.values);

    return {
      type: 'insert',
      table,
      columns,
      values
    };
  }

  /**
   * 转换 UPDATE 语句
   */
  private convertUpdateStatement(ast: any): SQLStatement {
    const table = this.extractTableName(ast.table);
    const set = this.convertSet(ast.set);
    const where = ast.where ? this.convertExpression(ast.where) : undefined;

    return {
      type: 'update',
      table,
      set,
      where
    };
  }

  /**
   * 转换 DELETE 语句
   */
  private convertDeleteStatement(ast: any): SQLStatement {
    const table = this.extractTableName(ast.table);
    const where = ast.where ? this.convertExpression(ast.where) : undefined;

    return {
      type: 'delete',
      table,
      where
    };
  }

  /**
   * 转换列定义
   */
  private convertColumns(columns: any): ColumnSelector[] {
    if (columns === '*') {
      return [{ type: 'wildcard' }];
    }

    if (!Array.isArray(columns)) {
      columns = [columns];
    }

    return columns.map((col: any) => {
      if (col === '*') {
        return { type: 'wildcard' };
      }

      if (col.type === 'column_ref') {
        return {
          type: 'column',
          table: col.table,
          name: col.column,
          alias: col.as
        };
      }

      if (col.type === 'function') {
        return {
          type: 'function',
          name: col.name,
          alias: col.as,
          expression: this.convertExpression(col)
        };
      }

      return {
        type: 'column',
        name: String(col),
        alias: col.as
      };
    });
  }

  /**
   * 转换 ORDER BY 子句
   */
  private convertOrderBy(orderBy: any): OrderByNode[] {
    if (!Array.isArray(orderBy)) {
      orderBy = [orderBy];
    }

    return orderBy.map((order: any) => {
      // expr 的可能格式：
      // 1. { type: 'column_ref', column: 'rating' } 或 { type: 'column_ref', column: { expr: { type: 'default', value: 'rating' } } }
      // 2. { type: 'default', value: 'rating' }
      // 3. 'rating' (字符串)

      let field: string;

      if (!order || !order.expr) {
        field = 'unknown';
      } else if (typeof order.expr === 'string') {
        field = order.expr;
      } else {
        // 处理对象类型的 expr
        const expr = order.expr;

        if (expr.type === 'column_ref') {
          // column 可能是字符串或嵌套对象
          if (typeof expr.column === 'string') {
            field = expr.column;
          } else if (expr.column && expr.column.expr && expr.column.expr.value) {
            field = expr.column.expr.value;
          } else if (expr.column && expr.column.value) {
            field = expr.column.value;
          } else {
            field = 'unknown';
          }
        } else if (expr.type === 'default') {
          field = expr.value || expr.column || 'unknown';
        } else {
          // 尝试直接提取值
          field = expr.column || expr.value || String(expr);
        }
      }

      const direction = order.type === 'DESC' ? 'desc' : 'asc';
      return { field, direction };
    });
  }

  /**
   * 转换 LIMIT 子句
   */
  private convertLimit(limit: any): number {
    // limit 可能是 { value: [{ type: 'number', value: 10 }] }
    // 也可能是 { value: 10 }
    if (limit && limit.value) {
      if (Array.isArray(limit.value) && limit.value[0]) {
        return Number(limit.value[0].value);
      }
      return Number(limit.value);
    }
    return Number(limit);
  }

  /**
   * 转换 OFFSET 子句
   */
  private convertOffset(offset: any): number {
    // offset 的结构与 limit 类似
    if (offset && offset.value) {
      if (Array.isArray(offset.value) && offset.value[0]) {
        return Number(offset.value[0].value);
      }
      return Number(offset.value);
    }
    return Number(offset);
  }

  /**
   * 转换 GROUP BY 子句
   */
  private convertGroupBy(groupBy: any): string[] {
    if (!Array.isArray(groupBy)) {
      groupBy = [groupBy];
    }

    return groupBy.map((col: any) => col.column || col.value || String(col));
  }

  /**
   * 转换 VALUES 子句
   */
  private convertValues(values: any): any[][] {
    if (!Array.isArray(values)) {
      values = [values];
    }

    return values.map((valueSet: any) => {
      if (!Array.isArray(valueSet)) {
        valueSet = [valueSet];
      }
      return valueSet.map((v: any) => this.extractLiteralValue(v));
    });
  }

  /**
   * 转换 SET 子句
   */
  private convertSet(set: any): Record<string, any> {
    const result: Record<string, any> = {};

    if (!Array.isArray(set)) {
      set = [set];
    }

    set.forEach((item: any) => {
      const column = item.column;
      const value = this.extractLiteralValue(item.value);
      result[column] = value;
    });

    return result;
  }

  /**
   * 转换表达式
   */
  private convertExpression(expr: any): ASTExpression {
    if (!expr || typeof expr !== 'object') {
      return {
        type: 'literal',
        value: expr
      };
    }

    switch (expr.type) {
      case 'binary_expr':
        return {
          type: 'binary',
          operator: expr.operator,
          left: this.convertExpression(expr.left),
          right: this.convertExpression(expr.right)
        };

      case 'unary_expr':
        return {
          type: 'unary',
          operator: expr.operator,
          argument: this.convertExpression(expr.argument)
        };

      case 'function':
        return {
          type: 'function',
          name: expr.name,
          arguments: expr.args.expr_list ? expr.args.expr_list.map((arg: any) => this.convertExpression(arg)) : []
        };

      case 'column_ref':
        return {
          type: 'column_ref',
          table: expr.table,
          column: expr.column
        };

      case 'single_quote_string':
      case 'double_quote_string':
        return {
          type: 'literal',
          value: expr.value,
          dataType: 'string'
        };

      case 'number':
        return {
          type: 'literal',
          value: Number(expr.value),
          dataType: 'number'
        };

      case 'boolean':
        return {
          type: 'literal',
          value: expr.value,
          dataType: 'boolean'
        };

      case 'null':
        return {
          type: 'literal',
          value: null,
          dataType: 'null'
        };

      case 'param':
        return {
          type: 'param',
          value: expr.value || expr.name
        } as any;

      case 'var':
        // PostgreSQL 参数占位符 ($1, $2, etc.)
        return {
          type: 'param',
          value: `${expr.prefix || ''}${expr.name}`
        } as any;

      default:
        // 处理值类型
        if (expr.value !== undefined) {
          return {
            type: 'literal',
            value: expr.value
          };
        }

        throw new Error(`不支持的表达式类型: ${expr.type}`);
    }
  }

  /**
   * 提取表名
   */
  private extractTableName(from: any): string {
    if (typeof from === 'string') {
      return from;
    }

    if (from?.type === 'table') {
      return from.table;
    }

    // node-sql-parser 返回数组: [{ db: null, table: 'features', as: null }]
    if (Array.isArray(from) && from[0]) {
      return from[0].table || String(from[0]);
    }

    return String(from);
  }

  /**
   * 提取字面量值
   */
  private extractLiteralValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'object') {
      if (value.type === 'single_quote_string' || value.type === 'double_quote_string') {
        return value.value;
      }

      if (value.type === 'number') {
        return Number(value.value);
      }

      if (value.type === 'boolean') {
        return value.value;
      }

      if (value.type === 'null') {
        return null;
      }

      if (value.type === 'param') {
        return { type: 'param', value: value.value || value.name };
      }

      return value;
    }

    return value;
  }

  /**
   * 提取参数占位符
   */
  private extractParameters(sql: string): ParameterPlaceholder[] {
    const parameters: ParameterPlaceholder[] = [];
    const regex = /\?|\$\d+/g;
    let match;
    let index = 0;

    while ((match = regex.exec(sql)) !== null) {
      parameters.push({
        type: 'param',
        value: match[0] === '?' ? index++ : parseInt(match[0].slice(1))
      });
    }

    return parameters;
  }

  /**
   * 验证 SQL 语法
   */
  validate(sql: string): { valid: boolean; error?: string } {
    try {
      this.parse(sql);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * 格式化 SQL（用于调试）
   */
  format(sql: string): string {
    try {
      const options = {
        database: this.options.database || 'postgresql'
      };
      const ast = this.parser.astify(sql, options);
      return this.parser.sqlify(ast, options) as string;
    } catch (error) {
      return sql;
    }
  }
}

/**
 * 单例解析器实例
 */
let defaultParser: Parser | null = null;

/**
 * 获取默认解析器实例
 */
export function getDefaultParser(): Parser {
  if (!defaultParser) {
    defaultParser = new Parser({ database: 'postgresql' });
  }
  return defaultParser;
}

/**
 * 快捷解析函数
 */
export function parseSQL(sql: string): SQLParseResult {
  return getDefaultParser().parse(sql);
}

/**
 * 快捷验证函数
 */
export function validateSQL(sql: string): { valid: boolean; error?: string } {
  return getDefaultParser().validate(sql);
}
