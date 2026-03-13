/**
 * SQL 聚合函数
 * 
 * 支持：COUNT, SUM, AVG, MIN, MAX
 */

import type { ASTExpression } from './ast-nodes';

/**
 * 聚合函数类型
 */
export type AggregateFunctionType = 
  | 'COUNT'
  | 'SUM'
  | 'AVG'
  | 'MIN'
  | 'MAX';

/**
 * 聚合函数定义
 */
export interface AggregateFunction {
  type: AggregateFunctionType;
  column?: string;
  alias?: string;
  distinct?: boolean;
}

/**
 * 聚合函数处理器
 */
export class AggregateFunctionProcessor {
  /**
   * 检测是否是聚合函数
   */
  static isAggregateFunction(expr: any): boolean {
    if (!expr || expr.type !== 'function') {
      return false;
    }

    const name = expr.name?.toUpperCase();
    return ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'].includes(name);
  }

  /**
   * 提取聚合函数信息
   */
  static extractAggregateFunction(expr: any): AggregateFunction | null {
    if (!this.isAggregateFunction(expr)) {
      return null;
    }

    const name = expr.name?.toUpperCase() as AggregateFunctionType;

    // 参数可能在 expr.arguments 或 expr.expression.arguments 中
    let args = expr.arguments || [];
    if (args.length === 0 && expr.expression?.arguments) {
      args = expr.expression.arguments;
    }

    let column: string | undefined;
    let distinct = false;

    if (name === 'COUNT') {
      // COUNT(*) 或 COUNT(column)
      if (args.length === 0) {
        // COUNT(*) - 处理所有列
        column = undefined;
      } else {
        const firstArg = args[0];
        if (firstArg?.type === 'wildcard') {
          // COUNT(*)
          column = undefined;
        } else if (firstArg?.type === 'column_ref') {
          // COUNT(column)
          column = this.extractColumnName(firstArg);
          distinct = firstArg.distinct || false;
        }
      }
    } else {
      // SUM, AVG, MIN, MAX 需要列名
      if (args.length > 0) {
        const firstArg = args[0];
        if (firstArg?.type === 'column_ref') {
          column = this.extractColumnName(firstArg);
          distinct = firstArg.distinct || false;
        } else if (firstArg?.type === 'literal' && firstArg.value === '*') {
          // 处理 SUM(*) 的情况（虽然不合理）
          column = undefined;
        }
      }
    }

    return {
      type: name,
      column,
      alias: expr.alias || expr.expression?.as,
      distinct
    };
  }

  /**
   * 从 column_ref 中提取列名
   * 处理 node-sql-parser 的嵌套结构
   */
  private static extractColumnName(columnRef: any): string | undefined {
    if (!columnRef || !columnRef.column) {
      return undefined;
    }

    // 如果 column 是字符串，直接返回
    if (typeof columnRef.column === 'string') {
      return columnRef.column;
    }

    // 如果 column 是对象，提取嵌套的值
    if (typeof columnRef.column === 'object') {
      const column = columnRef.column;

      // 处理 { expr: { type: 'default', value: 'price' } } 结构
      if (column.expr && column.expr.value) {
        return column.expr.value;
      }

      // 处理 { value: 'price' } 结构
      if (column.value) {
        return column.value;
      }
    }

    return undefined;
  }

  /**
   * 执行聚合函数
   */
  static executeAggregate(
    func: AggregateFunction,
    data: any[]
  ): number {
    switch (func.type) {
      case 'COUNT':
        return this.count(data, func.column, func.distinct);
      
      case 'SUM':
        return this.sum(data, func.column, func.distinct);
      
      case 'AVG':
        return this.avg(data, func.column, func.distinct);
      
      case 'MIN':
        return this.min(data, func.column);
      
      case 'MAX':
        return this.max(data, func.column);
      
      default:
        throw new Error(`不支持的聚合函数: ${func.type}`);
    }
  }

  /**
   * COUNT 函数
   */
  private static count(
    data: any[],
    column?: string,
    distinct?: boolean
  ): number {
    if (!column) {
      // COUNT(*)
      return distinct ? new Set(data.map(row => JSON.stringify(row))).size : data.length;
    }

    // COUNT(column)
    const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined);
    
    if (distinct) {
      return new Set(values).size;
    }
    
    return values.length;
  }

  /**
   * SUM 函数
   */
  private static sum(
    data: any[],
    column?: string,
    distinct?: boolean
  ): number {
    if (!column) {
      throw new Error('SUM 函数需要指定列名');
    }

    let values = data.map(row => row[column]).filter(v => v !== null && v !== undefined);
    
    // 转换为数字
    values = values.map(v => typeof v === 'number' ? v : parseFloat(v)).filter(v => !isNaN(v));
    
    if (distinct) {
      values = Array.from(new Set(values));
    }
    
    return values.reduce((sum, val) => sum + val, 0);
  }

  /**
   * AVG 函数
   */
  private static avg(
    data: any[],
    column?: string,
    distinct?: boolean
  ): number {
    if (!column) {
      throw new Error('AVG 函数需要指定列名');
    }

    let values = data.map(row => row[column]).filter(v => v !== null && v !== undefined);
    
    // 转换为数字
    values = values.map(v => typeof v === 'number' ? v : parseFloat(v)).filter(v => !isNaN(v));
    
    if (distinct) {
      values = Array.from(new Set(values));
    }
    
    if (values.length === 0) {
      return 0;
    }
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * MIN 函数
   */
  private static min(data: any[], column?: string): number {
    if (!column) {
      throw new Error('MIN 函数需要指定列名');
    }

    const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined);
    
    // 转换为数字
    const numbers = values.map(v => typeof v === 'number' ? v : parseFloat(v)).filter(v => !isNaN(v));
    
    if (numbers.length === 0) {
      return 0;
    }
    
    return Math.min(...numbers);
  }

  /**
   * MAX 函数
   */
  private static max(data: any[], column?: string): number {
    if (!column) {
      throw new Error('MAX 函数需要指定列名');
    }

    const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined);
    
    // 转换为数字
    const numbers = values.map(v => typeof v === 'number' ? v : parseFloat(v)).filter(v => !isNaN(v));
    
    if (numbers.length === 0) {
      return 0;
    }
    
    return Math.max(...numbers);
  }
}
