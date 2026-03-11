/**
 * SQL AST 类型定义
 */

/**
 * SQL 语句类型
 */
export type SQLStatement =
  | SQLSelectStatement
  | SQLInsertStatement
  | SQLUpdateStatement
  | SQLDeleteStatement;

/**
 * SELECT 语句
 */
export interface SQLSelectStatement {
  type: 'select';
  columns: ColumnSelector[];
  from: string;
  where?: ASTExpression;
  orderBy?: OrderByNode[];
  limit?: number;
  offset?: number;
  distinct?: boolean;
  groupBy?: string[];
  having?: ASTExpression;
}

/**
 * INSERT 语句
 */
export interface SQLInsertStatement {
  type: 'insert';
  table: string;
  columns?: string[];
  values: any[][];
}

/**
 * UPDATE 语句
 */
export interface SQLUpdateStatement {
  type: 'update';
  table: string;
  set: Record<string, any>;
  where?: ASTExpression;
}

/**
 * DELETE 语句
 */
export interface SQLDeleteStatement {
  type: 'delete';
  table: string;
  where?: ASTExpression;
}

/**
 * 列选择器
 */
export interface ColumnSelector {
  type: 'column' | 'function' | 'wildcard';
  name?: string;
  alias?: string;
  expression?: ASTExpression;
  table?: string;
}

/**
 * ORDER BY 节点
 */
export interface OrderByNode {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * AST 表达式
 */
export type ASTExpression =
  | BinaryExpression
  | UnaryExpression
  | FunctionCall
  | LiteralValue
  | ColumnReference
  | LogicalExpression;

/**
 * 二元表达式
 */
export interface BinaryExpression {
  type: 'binary';
  operator: BinaryOperator;
  left: ASTExpression;
  right: ASTExpression;
}

/**
 * 二元操作符
 */
export type BinaryOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'AND'
  | 'OR'
  | 'LIKE'
  | 'NOT LIKE'
  | 'IN'
  | 'NOT IN'
  | 'BETWEEN'
  | 'IS'
  | 'IS NOT';

/**
 * 一元表达式
 */
export interface UnaryExpression {
  type: 'unary';
  operator: 'NOT' | 'EXISTS' | '-';
  argument: ASTExpression;
}

/**
 * 逻辑表达式
 */
export interface LogicalExpression {
  type: 'logical';
  operator: 'AND' | 'OR';
  operands: ASTExpression[];
}

/**
 * 函数调用
 */
export interface FunctionCall {
  type: 'function';
  name: string;
  arguments: ASTExpression[];
  distinct?: boolean;
  isAggregate?: boolean;
}

/**
 * 空间函数调用
 */
export interface SpatialFunctionCall {
  type: 'spatial_function';
  name: SpatialFunctionName;
  arguments: SpatialFunctionArguments;
}

/**
 * 空间函数名称
 */
export type SpatialFunctionName =
  | 'ST_Intersects'
  | 'ST_Contains'
  | 'ST_Within'
  | 'ST_Equals'
  | 'ST_Disjoint'
  | 'ST_Touches'
  | 'ST_Crosses'
  | 'ST_Overlaps'
  | 'ST_DWithin'
  | 'ST_Distance'
  | 'ST_Buffer'
  | 'ST_Centroid'
  | 'ST_MakePoint'
  | 'ST_MakeLine'
  | 'ST_GeomFromText'
  | 'ST_AsText'
  | 'ST_AsBinary'
  | 'ST_Area'
  | 'ST_Length'
  | 'ST_Perimeter'
  | 'ST_Union'
  | 'ST_Intersection'
  | 'ST_Difference';

/**
 * 空间函数参数
 */
export interface SpatialFunctionArguments {
  field?: string;
  geometry?: any;
  distance?: number;
  units?: string;
  radius?: number;
  coordinates?: [number, number] | [number, number, number];
  wkt?: string;
  geometries?: any[];
}

/**
 * 字面量值
 */
export interface LiteralValue {
  type: 'literal';
  value: any;
  dataType?: 'string' | 'number' | 'boolean' | 'null';
}

/**
 * 列引用
 */
export interface ColumnReference {
  type: 'column_ref';
  table?: string;
  column: string;
}

/**
 * 参数占位符
 */
export interface ParameterPlaceholder {
  type: 'param';
  value: string | number; // ? 或 $1, $2 等
}

/**
 * SQL 解析选项
 */
export interface SQLParseOptions {
  database?: 'postgresql' | 'mysql' | 'sqlite';
}

/**
 * SQL 解析结果
 */
export interface SQLParseResult {
  statement: SQLStatement;
  ast: any;
  parameters: ParameterPlaceholder[];
}

/**
 * 查询计划
 */
export interface QueryPlan {
  sql: string;
  table: string;
  columns: string[];
  where: any;
  spatialConditions: SQLSpatialQueryCondition[];
  orderBy: OrderByNode[];
  limit?: number;
  offset?: number;
  estimatedCost?: number;
  optimizationStrategy?: string;
  expectedImprovement?: number;
}

/**
 * 空间查询条件（用于查询计划）
 */
export interface SQLSpatialQueryCondition {
  field: string;
  predicate: string;
  geometry?: any;
  distance?: number;
  operator?: string;
}
