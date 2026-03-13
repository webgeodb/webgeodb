/**
 * SQL 到 QueryBuilder 转换器
 * 将解析后的 SQL AST 转换为 QueryBuilder 调用
 */

import type { QueryBuilder } from '../query/query-builder';
import type {
  SQLSelectStatement,
  ASTExpression,
  BinaryExpression,
  FunctionCall,
  ColumnReference,
  LiteralValue
} from './ast-nodes';
import type { Geometry } from '../types';

/**
 * PostGIS 函数映射表
 */
const POSTGIS_FUNCTION_MAP: Record<string, string> = {
  // 空间关系谓词 → QueryBuilder 方法
  'ST_Intersects': 'intersects',
  'ST_Contains': 'contains',
  'ST_Within': 'within',
  'ST_Equals': 'equals',
  'ST_Disjoint': 'disjoint',
  'ST_Touches': 'touches',
  'ST_Crosses': 'crosses',
  'ST_Overlaps': 'overlaps'
};

/**
 * SQL 到 QueryBuilder 转换器类
 */
export class SQLToQueryBuilderTranslator {
  /**
   * 转换 SELECT 语句为 QueryBuilder
   */
  translate(
    statement: SQLSelectStatement,
    builder: QueryBuilder
  ): QueryBuilder {
    // 转换 WHERE 子句
    if (statement.where) {
      this.translateWhere(statement.where, builder);
    }

    // 转换 ORDER BY
    statement.orderBy?.forEach(order => {
      builder.orderBy(order.field, order.direction);
    });

    // 转换 LIMIT/OFFSET
    if (statement.limit) {
      builder.limit(statement.limit);
    }

    if (statement.offset) {
      builder.offset(statement.offset);
    }

    return builder;
  }

  /**
   * 转换 WHERE 子句
   */
  private translateWhere(expr: ASTExpression, builder: QueryBuilder): void {
    if (this.isBinaryExpression(expr)) {
      this.translateBinaryExpression(expr, builder);
    } else if (this.isLogicalExpression(expr)) {
      this.translateLogicalExpression(expr, builder);
    } else if (this.isFunctionCall(expr)) {
      this.translateFunctionCall(expr, builder);
    }
  }

  /**
   * 转换二元表达式
   */
  private translateBinaryExpression(
    expr: BinaryExpression,
    builder: QueryBuilder
  ): void {
    const { operator, left, right } = expr;

    // 检查是否是空间函数调用
    if (this.isSpatialFunctionCall(left, right)) {
      this.translateSpatialFunction(expr, builder);
      return;
    }

    // 检查是否是函数调用
    if (this.isFunctionCall(left) || this.isFunctionCall(right)) {
      this.translateFunctionExpression(expr, builder);
      return;
    }

    // 处理 AND/OR 逻辑运算符
    if (operator === 'AND' || operator === 'OR') {
      this.translateLogicalExpression(expr, builder);
      return;
    }

    // 处理 IN 和 NOT IN 操作符
    if (operator === 'IN' || operator === 'NOT IN') {
      if (this.isColumnReference(left)) {
        const field = this.extractFieldName(left);
        const values = this.extractArrayFromExprList(right);
        if (values && values.length > 0) {
          const mappedOperator = this.mapOperator(operator);
          if (mappedOperator) {
            builder.where(field, mappedOperator as any, values);
          }
        }
      }
      return;
    }

    // 处理 BETWEEN 操作符
    if (operator === 'BETWEEN') {
      this.translateBetween(expr, builder);
      return;
    }

    // 处理 IS NULL 和 IS NOT NULL
    if (operator === 'IS' || operator === 'IS NOT') {
      this.translateIsNull(expr, builder);
      return;
    }

    // 处理普通比较操作
    // 先检查是否是字面量，避免将字符串字面量误识别为列引用
    if (this.isLiteral(left) && this.isColumnReference(right)) {
      // 反向比较：value = column
      const field = this.extractFieldName(right);
      const value = this.extractLiteralValue(left);
      const reversedOperator = this.reverseOperator(operator);
      if (reversedOperator) {
        builder.where(field, reversedOperator as any, value);
      }
      return;
    } else if (this.isColumnReference(left) && this.isLiteral(right)) {
      // 正常比较：column = value
      const field = this.extractFieldName(left);
      const value = this.extractLiteralValue(right);
      const mappedOperator = this.mapOperator(operator);
      if (mappedOperator) {
        builder.where(field, mappedOperator as any, value);
      }
      return;
    } else if (this.isColumnReference(left) && this.isColumnReference(right)) {
      // 列对列的比较，暂时不支持
      console.warn('列对列的比较暂不支持');
    }
  }

  /**
   * 转换逻辑表达式（AND/OR）
   */
  private translateLogicalExpression(
    expr: any,
    builder: QueryBuilder
  ): void {
    const operator = expr.operator;

    if (operator === 'AND' || operator === 'OR') {
      // 递归处理左侧和右侧
      this.translateWhere(expr.left, builder);
      this.translateWhere(expr.right, builder);
    } else if (expr.type === 'logical') {
      // 处理我们的逻辑表达式
      expr.operands.forEach((operand: ASTExpression) => {
        this.translateWhere(operand, builder);
      });
    }
  }

  /**
   * 转换函数调用
   */
  private translateFunctionCall(
    expr: FunctionCall,
    builder: QueryBuilder
  ): void {
    const { name, arguments: args } = expr;

    // 检查是否是 PostGIS 函数
    if (name in POSTGIS_FUNCTION_MAP) {
      const predicate = POSTGIS_FUNCTION_MAP[name];
      // PostGIS 函数应该在 WHERE 子句中处理
      console.warn(`PostGIS 函数 ${name} 应该在 WHERE 子句中使用`);
    }
  }

  /**
   * 转换函数表达式（包含函数的比较）
   */
  private translateFunctionExpression(
    expr: BinaryExpression,
    builder: QueryBuilder
  ): void {
    const { operator, left, right } = expr;

    // ST_DWithin(geometry, ST_MakePoint(x, y), distance)
    if (this.isFunctionNamed(left, 'ST_DWithin')) {
      this.translateSTDWithin(left as FunctionCall, right, builder);
      return;
    }

    // ST_Distance(geometry, point) < distance
    if (this.isFunctionNamed(left, 'ST_Distance')) {
      this.translateSTDistance(left as FunctionCall, operator, right, builder);
      return;
    }

    // 其他空间函数
    if (this.isFunctionNamed(left, Object.keys(POSTGIS_FUNCTION_MAP))) {
      this.translateSpatialPredicate(left as FunctionCall, right, builder);
      return;
    }
  }

  /**
   * 转换空间函数调用
   */
  private translateSpatialFunction(
    expr: BinaryExpression,
    builder: QueryBuilder
  ): void {
    const func = expr.left as FunctionCall;
    const args = expr.right as any;

    if (func && func.name && POSTGIS_FUNCTION_MAP[func.name]) {
      const predicate = POSTGIS_FUNCTION_MAP[func.name];

      // 解析几何参数
      const geometry = this.extractGeometryFromArgs(func.arguments);
      const field = this.extractFieldFromArgs(func.arguments);

      if (field && geometry) {
        (builder as any)[predicate](field, geometry);
      }
    }
  }

  /**
   * 转换 ST_DWithin
   */
  private translateSTDWithin(
    func: FunctionCall,
    distanceExpr: ASTExpression,
    builder: QueryBuilder
  ): void {
    const args = func.arguments;
    if (args.length < 2) return;

    const field = this.extractFieldFromArgs(args);
    const geometry = this.extractGeometryFromArgs(args.slice(1));
    const distance = this.extractLiteralValue(distanceExpr);

    if (field && geometry && typeof distance === 'number') {
      builder.distance(field, this.geometryToPoint(geometry), '<=', distance);
    }
  }

  /**
   * 转换 ST_Distance
   */
  private translateSTDistance(
    func: FunctionCall,
    operator: string,
    distanceExpr: ASTExpression,
    builder: QueryBuilder
  ): void {
    const args = func.arguments;
    if (args.length < 2) return;

    const field = this.extractFieldFromArgs(args);
    const geometry = this.extractGeometryFromArgs(args.slice(1));
    const distance = this.extractLiteralValue(distanceExpr);

    if (field && geometry && typeof distance === 'number') {
      builder.distance(
        field,
        this.geometryToPoint(geometry),
        operator as any,
        distance
      );
    }
  }

  /**
   * 转换空间谓词
   */
  private translateSpatialPredicate(
    func: FunctionCall,
    valueExpr: ASTExpression,
    builder: QueryBuilder
  ): void {
    const predicate = POSTGIS_FUNCTION_MAP[func.name];
    if (!predicate) return;

    const args = func.arguments;
    const field = this.extractFieldFromArgs(args);
    const geometry = this.extractGeometryFromArgs(args.slice(1));

    if (field && geometry) {
      (builder as any)[predicate](field, geometry);
    }
  }

  /**
   * 从函数参数中提取字段名
   */
  private extractFieldFromArgs(args: ASTExpression[]): string | undefined {
    if (args.length === 0) return undefined;

    const firstArg = args[0];
    if (this.isColumnReference(firstArg)) {
      return firstArg.column;
    }

    return undefined;
  }

  /**
   * 从函数参数中提取几何对象
   */
  private extractGeometryFromArgs(args: ASTExpression[]): Geometry | undefined {
    if (args.length === 0) return undefined;

    const arg = args[0];

    // 检查是否是 ST_MakePoint 函数
    if (this.isFunctionNamed(arg, 'ST_MakePoint')) {
      return this.extractGeometryFromMakePoint(arg as FunctionCall);
    }

    // 检查是否是 ST_GeomFromText 函数
    if (this.isFunctionNamed(arg, 'ST_GeomFromText')) {
      return this.extractGeometryFromWKT(arg as FunctionCall);
    }

    // 检查是否是字面量对象
    if (this.isLiteral(arg)) {
      const value = (arg as LiteralValue).value;
      if (this.isGeometry(value)) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * 从 ST_MakePoint 提取点几何
   */
  private extractGeometryFromMakePoint(func: FunctionCall): Geometry {
    const coords = func.arguments.map(arg =>
      this.extractLiteralValue(arg)
    ) as [number, number, number?];

    return {
      type: 'Point',
      coordinates: coords.slice(0, 2) as [number, number]
    };
  }

  /**
   * 从 ST_GeomFromText 提取几何
   */
  private extractGeometryFromWKT(func: FunctionCall): Geometry | undefined {
    const wktArg = func.arguments[0];
    if (this.isLiteral(wktArg)) {
      const wkt = (wktArg as LiteralValue).value;
      // 这里需要使用 wellknown 库解析 WKT
      // 为了避免循环依赖，我们在 postgis-functions.ts 中实现
      console.warn('WKT 解析需要在 postgis-functions.ts 中实现');
      return undefined;
    }

    return undefined;
  }

  /**
   * 将几何对象转换为点坐标
   */
  private geometryToPoint(geometry: Geometry): [number, number] {
    if (geometry.type === 'Point') {
      return geometry.coordinates as [number, number];
    }

    throw new Error('需要 Point 类型的几何对象');
  }

  /**
   * 提取字面量值
   */
  private extractLiteralValue(expr: ASTExpression): any {
    if (expr.type === 'literal') {
      return (expr as LiteralValue).value;
    }

    // Handle node-sql-parser's nested column_ref structure for string literals
    if (expr.type === 'column_ref') {
      const columnRef = expr as ColumnReference;
      if (columnRef.column && typeof columnRef.column === 'object') {
        const column = columnRef.column as any;
        if (column.expr && typeof column.expr === 'object') {
          const nestedExpr = column.expr;
          const type = nestedExpr.type;
          const value = nestedExpr.value;

          if (type === 'single_quote_string' || type === 'double_quote_string') {
            return value;
          }
          if (type === 'number') {
            return Number(value);
          }
          if (type === 'boolean') {
            return Boolean(value);
          }
          if (type === 'null') {
            return null;
          }
        }
      }
    }

    // 处理其他字面量类型
    const type = (expr as any).type;
    const value = (expr as any).value;

    if (type === 'single_quote_string' || type === 'double_quote_string') {
      return value;
    }

    if (type === 'number') {
      return Number(value);
    }

    if (type === 'boolean') {
      return Boolean(value);
    }

    if (type === 'null') {
      return null;
    }

    // 默认返回原始值
    return value !== undefined ? value : expr;
  }

  /**
   * 映射操作符
   */
  private mapOperator(op: string): string | null {
    const opMap: Record<string, string> = {
      '=': '=',
      '!=': '!=',
      '>': '>',
      '>=': '>=',
      '<': '<',
      '<=': '<=',
      'IN': 'in',
      'NOT IN': 'not in',
      'LIKE': 'like',
      'NOT LIKE': 'not like'
    };

    return opMap[op] || null;
  }

  /**
   * 反向操作符（用于 column = value 变为 value = column）
   */
  private reverseOperator(op: string): string | null {
    const reverseMap: Record<string, string> = {
      '=': '=',
      '!=': '!=',
      '>': '<',
      '>=': '<=',
      '<': '>',
      '<=': '>='
    };

    return reverseMap[op] || null;
  }

  // 类型检查辅助方法

  private isBinaryExpression(expr: ASTExpression): expr is BinaryExpression {
    return expr.type === 'binary';
  }

  private isLogicalExpression(expr: ASTExpression): boolean {
    return expr.type === 'logical' ||
      (expr.type === 'binary' && (expr.operator === 'AND' || expr.operator === 'OR'));
  }

  private isFunctionCall(expr: ASTExpression): expr is FunctionCall {
    return expr.type === 'function';
  }

  private isFunctionNamed(expr: ASTExpression, names: string | string[]): boolean {
    if (!this.isFunctionCall(expr)) return false;

    const nameArray = Array.isArray(names) ? names : [names];
    return nameArray.includes((expr as FunctionCall).name);
  }

  private isColumnReference(expr: ASTExpression): expr is ColumnReference {
    return expr.type === 'column_ref';
  }

  private isLiteral(expr: ASTExpression): expr is LiteralValue {
    if (expr.type === 'literal') {
      return true;
    }

    // Handle node-sql-parser's string literal parsing
    // String literals are often parsed as column_ref with nested expression
    if (expr.type === 'column_ref') {
      const columnRef = expr as ColumnReference;
      if (columnRef.column && typeof columnRef.column === 'object') {
        const column = columnRef.column as any;
        if (column.expr && typeof column.expr === 'object') {
          const exprType = column.expr.type;
          // Check if it's a literal type (string, number, boolean)
          // Note: 'default' type is for column names, not literals!
          return [
            'single_quote_string',
            'double_quote_string',
            'number',
            'boolean',
            'null'
          ].includes(exprType);
        }
      }
    }

    return false;
  }

  private isGeometry(value: any): value is Geometry {
    return value &&
      typeof value === 'object' &&
      'type' in value &&
      'coordinates' in value;
  }

  private isSpatialFunctionCall(left: ASTExpression, right: ASTExpression): boolean {
    return false; // 简化版本，实际需要更复杂的判断
  }

  /**
   * 从列引用中提取字段名
   */
  private extractFieldName(expr: ASTExpression): string {
    if (!this.isColumnReference(expr)) {
      return String(expr);
    }

    let field: string = (expr as ColumnReference).column;

    // 处理嵌套的 column 对象
    if (typeof field !== 'string' && (field as any)) {
      if ((field as any).expr && (field as any).expr.value) {
        field = (field as any).expr.value;
      } else if ((field as any).value) {
        field = (field as any).value;
      } else if ((field as any).column) {
        field = (field as any).column;
      }
    }

    return field;
  }

  /**
   * 从表达式中提取数组值（用于 IN 操作符）
   */
  private extractArrayFromExprList(expr: ASTExpression): any[] | undefined {
    // 检查 node-sql-parser 的 expr_list 结构
    if ((expr as any).type === 'expr_list') {
      const list = (expr as any).value;
      if (Array.isArray(list)) {
        return list.map((item: any) => this.extractLiteralValue(item));
      }
    }

    // 检查是否直接是数组
    if (Array.isArray(expr)) {
      return expr.map((item: any) => this.extractLiteralValue(item));
    }

    // 检查是否是包含数组的字面量
    if (this.isLiteral(expr) && Array.isArray(expr.value)) {
      return expr.value;
    }

    return undefined;
  }

  /**
   * 从表达式中提取数组值（用于 IN 操作符）- 已废弃，使用 extractArrayFromExprList
   * @deprecated
   */
  private extractArrayValue(expr: ASTExpression): any[] | undefined {
    return this.extractArrayFromExprList(expr);
  }

  /**
   * 转换 BETWEEN 操作符
   */
  private translateBetween(expr: BinaryExpression, builder: QueryBuilder): void {
    const { left, right } = expr;
    const field = this.extractFieldName(left);

    // BETWEEN 的右侧应该是一个包含两个值的数组
    if ((right as any).type === 'expr_list' && Array.isArray((right as any).value)) {
      const values = (right as any).value;
      if (values.length >= 2) {
        const minValue = this.extractLiteralValue(values[0]);
        const maxValue = this.extractLiteralValue(values[1]);

        // BETWEEN 等价于 field >= min AND field <= max
        builder.where(field, '>=', minValue);
        builder.where(field, '<=', maxValue);
      }
    }
  }

  /**
   * 转换 IS NULL 和 IS NOT NULL 操作符
   */
  private translateIsNull(expr: BinaryExpression, builder: QueryBuilder): void {
    const { operator, left, right } = expr;
    const field = this.extractFieldName(left);

    // 检查右侧是否是 NULL
    if (this.isLiteral(right) && (right as LiteralValue).value === null) {
      if (operator === 'IS') {
        builder.where(field, '=', null);
      } else if (operator === 'IS NOT') {
        builder.where(field, '!=', null);
      }
    }
  }
}

/**
 * 单例转换器实例
 */
let defaultTranslator: SQLToQueryBuilderTranslator | null = null;

/**
 * 获取默认转换器实例
 */
export function getDefaultTranslator(): SQLToQueryBuilderTranslator {
  if (!defaultTranslator) {
    defaultTranslator = new SQLToQueryBuilderTranslator();
  }
  return defaultTranslator;
}

/**
 * 快捷转换函数
 */
export function translateSQL(
  statement: SQLSelectStatement,
  builder: QueryBuilder
): QueryBuilder {
  return getDefaultTranslator().translate(statement, builder);
}
