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
import wellknown from 'wellknown';

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

    // 处理 AND/OR 逻辑运算符（必须在函数调用检查之前！）
    // 否则 AND 一侧有函数时会被误路由到 translateFunctionExpression
    if (operator === 'AND' || operator === 'OR') {
      this.translateLogicalExpression(expr, builder);
      return;
    }

    // 检查是否是空间函数调用
    if (this.isSpatialFunctionCall(left, right)) {
      this.translateSpatialFunction(expr, builder);
      return;
    }

    // 检查是否是函数调用（如 ST_Distance(...) < N）
    if (this.isFunctionCall(left) || this.isFunctionCall(right)) {
      this.translateFunctionExpression(expr, builder);
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

    if (operator === 'AND') {
      // AND: 递归处理两侧，条件独立推入
      this.translateWhere(expr.left, builder);
      this.translateWhere(expr.right, builder);
    } else if (operator === 'OR') {
      // OR: 将两侧条件标记为 orGroup，交给 QueryBuilder 的全表扫描处理
      this.translateOrCondition(expr, builder);
    } else if (expr.type === 'logical') {
      // 处理我们的逻辑表达式
      expr.operands.forEach((operand: ASTExpression) => {
        this.translateWhere(operand, builder);
      });
    }
  }

  /**
   * 转换 OR 条件
   * OR 条件需要标记为 _orGroup，让 QueryBuilder 走全表扫描路径
   */
  private translateOrCondition(
    expr: any,
    builder: QueryBuilder
  ): void {
    // 将 OR 两侧的条件都标记为 orGroup 后推入 builder
    this.pushOrCondition(expr.left, builder);
    this.pushOrCondition(expr.right, builder);
  }

  /**
   * 将表达式作为 OR 条件推入 builder
   */
  private pushOrCondition(expr: ASTExpression, builder: QueryBuilder): void {
    // 如果是简单的比较表达式（binary），直接推入带 _orGroup 标记的条件
    if (this.isBinaryExpression(expr)) {
      const { operator, left, right } = expr;

      // AND/OR 嵌套 — 递归处理
      if (operator === 'AND' || operator === 'OR') {
        this.translateLogicalExpression(expr, builder);
        return;
      }

      // 普通比较 — 推入带 orGroup 标记的条件
      if (this.isColumnReference(left) && this.isLiteral(right)) {
        const field = this.extractFieldName(left);
        const value = this.extractLiteralValue(right);
        const mappedOperator = this.mapOperator(operator);
        if (mappedOperator) {
          (builder as any).conditions.push({
            field,
            operator: mappedOperator,
            value,
            _orGroup: true
          });
        }
        return;
      }

      if (this.isLiteral(left) && this.isColumnReference(right)) {
        const field = this.extractFieldName(right);
        const value = this.extractLiteralValue(left);
        const reversedOperator = this.reverseOperator(operator);
        if (reversedOperator) {
          (builder as any).conditions.push({
            field,
            operator: reversedOperator,
            value,
            _orGroup: true
          });
        }
        return;
      }
    }

    // 函数调用（如空间函数）：不走 orGroup，走标准翻译路径
    // 空间函数会被添加为 spatialCondition，由 applySpatialFilters 处理
    if (this.isFunctionCall(expr)) {
      this.translateWhere(expr, builder);
      return;
    }

    // 其他情况：尝试标准翻译
    this.translateWhere(expr, builder);
  }

  /**
   * 转换函数调用
   * 处理 WHERE 子句中直接使用的空间函数（非比较表达式包裹的情况）
   * 例如：ST_DWithin(geometry, point, distance)
   */
  private translateFunctionCall(
    expr: FunctionCall,
    builder: QueryBuilder
  ): void {
    const { arguments: args } = expr;
    const funcName = this.extractFunctionName(expr.name);

    // ST_DWithin 裸调用：ST_DWithin(geometry, point, distance)
    if (funcName === 'ST_DWithin' && args.length >= 3) {
      const field = this.extractFieldFromArgs(args);
      const geometry = this.extractGeometryFromArgs(args.slice(1, 3));
      const distanceArg = args[2];
      const distance = this.extractLiteralValue(distanceArg);
      if (field && geometry && typeof distance === 'number') {
        builder.distance(field, this.geometryToPoint(geometry), '<=', distance);
      }
      return;
    }

    // ST_Distance 裸调用：在比较表达式中已处理，此处作为 fallback
    if (funcName === 'ST_Distance' && args.length >= 2) {
      // ST_Distance 裸调用通常出现在比较表达式中 (ST_Distance(...) < N)
      // 如果直接作为 boolean 使用，说明距离 > 0，即存在
      const field = this.extractFieldFromArgs(args);
      const geometry = this.extractGeometryFromArgs(args.slice(1, 3));
      if (field && geometry) {
        builder.distance(field, this.geometryToPoint(geometry), '<', Infinity);
      }
      return;
    }

    // 其他空间谓词函数（ST_Intersects、ST_Equals 等）
    if (funcName in POSTGIS_FUNCTION_MAP) {
      let predicate = POSTGIS_FUNCTION_MAP[funcName];
      const field = this.extractFieldFromArgs(args);
      const geometry = this.extractGeometryFromArgs(args);
      if (field && geometry) {
        // 如果字段名在 args[1] 位置，contains/within 语义需要反转
        // ST_Contains(geom, field) → field 是被包含的 → 应该用 within
        const fieldIndex = this.getFieldIndex(args);
        if (fieldIndex === 1) {
          if (predicate === 'contains') predicate = 'within';
          else if (predicate === 'within') predicate = 'contains';
        }
        (builder as any).spatialConditions.push({
          field,
          predicate,
          geometry
        });
      }
      return;
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
    const funcName = this.extractFunctionName(func?.name);

    if (func && funcName && POSTGIS_FUNCTION_MAP[funcName]) {
      const predicate = POSTGIS_FUNCTION_MAP[funcName];

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
    const funcName = this.extractFunctionName(func.name);
    const predicate = POSTGIS_FUNCTION_MAP[funcName];
    if (!predicate) return;

    const args = func.arguments;
    const field = this.extractFieldFromArgs(args);
    const geometry = this.extractGeometryFromArgs(args);

    if (field && geometry) {
      // 如果字段名在 args[1] 位置，contains/within 语义需要反转
      let predicate = POSTGIS_FUNCTION_MAP[funcName];
      const fieldIndex = this.getFieldIndex(args);
      if (fieldIndex === 1) {
        if (predicate === 'contains') predicate = 'within';
        else if (predicate === 'within') predicate = 'contains';
      }
      (builder as any).spatialConditions.push({
        field,
        predicate,
        geometry
      });
    }
  }

  /**
   * 从函数参数中提取字段名
   */
  private extractFieldFromArgs(args: ASTExpression[]): string | undefined {
    if (args.length === 0) return undefined;

    // 检查所有参数，找到第一个列引用（字段名）
    for (const arg of args) {
      if (this.isColumnReference(arg)) {
        return this.extractFieldName(arg);
      }
    }

    return undefined;
  }

  /**
   * 获取列引用在参数中的位置索引
   */
  private getFieldIndex(args: ASTExpression[]): number {
    for (let i = 0; i < args.length; i++) {
      if (this.isColumnReference(args[i])) {
        return i;
      }
    }
    return -1;
  }

  /**
   * 从函数参数中提取几何对象
   */
  private extractGeometryFromArgs(args: ASTExpression[]): Geometry | undefined {
    if (args.length === 0) return undefined;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      // 检查是否是 ST_MakePoint 或 ST_Point 函数
      if (this.isFunctionNamed(arg, 'ST_MakePoint') || this.isFunctionNamed(arg, 'ST_Point')) {
        return this.extractGeometryFromMakePoint(arg as FunctionCall);
      }

    // 检查是否是 ST_BoundingBox 函数
    if (this.isFunctionNamed(arg, 'ST_BoundingBox')) {
      return this.extractGeometryFromBoundingBox(arg as FunctionCall);
    }

    // 检查是否是 ST_GeomFromText 函数
    if (this.isFunctionNamed(arg, 'ST_GeomFromText')) {
      return this.extractGeometryFromWKT(arg as FunctionCall);
    }

    // 检查是否是 ST_Buffer 函数
    if (this.isFunctionNamed(arg, 'ST_Buffer')) {
      return this.extractGeometryFromBuffer(arg as FunctionCall);
    }

    // 检查是否是字面量对象
    if (this.isLiteral(arg)) {
      const value = (arg as LiteralValue).value;
      if (this.isGeometry(value)) {
        return value;
      }
    }
    }

    return undefined;
  }

  /**
   * 从 ST_Buffer 函数提取 buffer 几何
   */
  private extractGeometryFromBuffer(func: FunctionCall): Geometry | undefined {
    const args = func.arguments;
    if (args.length < 2) return undefined;

    const geometry = this.extractGeometryFromArgs(args.slice(0, 1));
    const distance = this.extractLiteralValue(args[1]);

    if (!geometry || typeof distance !== 'number' || geometry.type !== 'Point') return undefined;

    // 近似 buffer：简单的正方形（1 米 ≈ 1/111320 度）
    const dDeg = distance / 111320;
    const [x, y] = geometry.coordinates;

    return {
      type: 'Polygon',
      coordinates: [[
        [x - dDeg, y - dDeg],
        [x + dDeg, y - dDeg],
        [x + dDeg, y + dDeg],
        [x - dDeg, y + dDeg],
        [x - dDeg, y - dDeg]
      ]]
    };
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
   * 从 ST_BoundingBox(minX, minY, maxX, maxY) 提取多边形几何（矩形）
   */
  private extractGeometryFromBoundingBox(func: FunctionCall): Geometry {
    const [minX, minY, maxX, maxY] = func.arguments.map(arg =>
      this.extractLiteralValue(arg)
    ) as [number, number, number, number];

    return {
      type: 'Polygon',
      coordinates: [[
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
        [minX, minY]
      ]]
    };
  }

  /**
   * 从 ST_GeomFromText 提取几何
   */
  private extractGeometryFromWKT(func: FunctionCall): Geometry | undefined {
    const wktArg = func.arguments[0];
    // 使用 extractLiteralValue 获取字符串值（处理各种 AST 格式）
    const wkt = this.extractLiteralValue(wktArg);
    if (typeof wkt === 'string') {
      try {
        const parsed = wellknown.parse(wkt);
        return parsed ?? undefined;
      } catch {
        return undefined;
      }
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

    const funcName = this.extractFunctionName((expr as FunctionCall).name);
    const nameArray = Array.isArray(names) ? names : [names];
    return nameArray.includes(funcName);
  }

  /**
   * 从嵌套名称格式中提取函数名
   * 支持: string, { name: string }, { name: [...] }, [{ type: 'default', value: '...' }]
   */
  private extractFunctionName(name: any): string {
    if (!name) return '';
    if (typeof name === 'string') return name;
    if (Array.isArray(name)) {
      const first = name[0];
      if (!first) return '';
      if (typeof first === 'string') return first;
      return first.value || first.name || '';
    }
    if (typeof name === 'object') {
      if (Array.isArray(name.name)) return this.extractFunctionName(name.name);
      if (typeof name.name === 'string') return name.name;
      if (typeof name.value === 'string') return name.value;
    }
    return '';
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
