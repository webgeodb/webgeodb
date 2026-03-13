/**
 * WebGeoDB 错误处理模块
 * 提供完整的错误类型定义和错误处理工具
 */

/**
 * 错误代码枚举
 */
export enum ErrorCode {
  // 数据库错误 (1xxx)
  DATABASE_NOT_OPEN = 'DATABASE_NOT_OPEN',
  DATABASE_ALREADY_OPEN = 'DATABASE_ALREADY_OPEN',
  DATABASE_CLOSED = 'DATABASE_CLOSED',
  DATABASE_VERSION_MISMATCH = 'DATABASE_VERSION_MISMATCH',
  DATABASE_INIT_FAILED = 'DATABASE_INIT_FAILED',

  // 表错误 (2xxx)
  TABLE_NOT_FOUND = 'TABLE_NOT_FOUND',
  TABLE_ALREADY_EXISTS = 'TABLE_ALREADY_EXISTS',
  TABLE_SCHEMA_INVALID = 'TABLE_SCHEMA_INVALID',

  // 查询错误 (3xxx)
  QUERY_INVALID = 'QUERY_INVALID',
  QUERY_PARSE_FAILED = 'QUERY_PARSE_FAILED',
  QUERY_EXECUTION_FAILED = 'QUERY_EXECUTION_FAILED',
  QUERY_TIMEOUT = 'QUERY_TIMEOUT',
  UNSUPPORTED_OPERATOR = 'UNSUPPORTED_OPERATOR',

  // 验证错误 (4xxx)
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_GEOMETRY = 'INVALID_GEOMETRY',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  INVALID_SCHEMA = 'INVALID_SCHEMA',

  // 事务错误 (5xxx)
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  TRANSACTION_ABORTED = 'TRANSACTION_ABORTED',
  TRANSACTION_CONFLICT = 'TRANSACTION_CONFLICT',

  // 索引错误 (6xxx)
  INDEX_NOT_FOUND = 'INDEX_NOT_FOUND',
  INDEX_ALREADY_EXISTS = 'INDEX_ALREADY_EXISTS',
  INDEX_CREATE_FAILED = 'INDEX_CREATE_FAILED',
  INDEX_CORRUPTED = 'INDEX_CORRUPTED',
  INDEX_NOT_AVAILABLE = 'INDEX_NOT_AVAILABLE',

  // 存储错误 (7xxx)
  STORAGE_ERROR = 'STORAGE_ERROR',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_NOT_AVAILABLE = 'STORAGE_NOT_AVAILABLE',
  STORAGE_WRITE_FAILED = 'STORAGE_WRITE_FAILED',

  // SQL 错误 (8xxx)
  SQL_SYNTAX_ERROR = 'SQL_SYNTAX_ERROR',
  SQL_NOT_SUPPORTED = 'SQL_NOT_SUPPORTED',
  SQL_PARAMETER_MISSING = 'SQL_PARAMETER_MISSING',
  SQL_FUNCTION_NOT_FOUND = 'SQL_FUNCTION_NOT_FOUND',

  // 空间错误 (9xxx)
  SPATIAL_ENGINE_NOT_FOUND = 'SPATIAL_ENGINE_NOT_FOUND',
  SPATIAL_ENGINE_REQUIRED = 'SPATIAL_ENGINE_REQUIRED',
  SPATIAL_ENGINE_ERROR = 'SPATIAL_ENGINE_ERROR',
  SPATIAL_OPERATION_FAILED = 'SPATIAL_OPERATION_FAILED',
  SPATIAL_INVALID_COORDINATE = 'SPATIAL_INVALID_COORDINATE',
  UNKNOWN_SPATIAL_PREDICATE = 'UNKNOWN_SPATIAL_PREDICATE',

  // 缓存错误 (10xxx)
  CACHE_ERROR = 'CACHE_ERROR',
  CACHE_INVALIDATION_FAILED = 'CACHE_INVALIDATION_FAILED',

  // 网络错误 (11xxx)
  NETWORK_ERROR = 'NETWORK_ERROR',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT'
}

/**
 * 错误严重级别
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 错误上下文信息
 */
export interface ErrorContext {
  /** 错误发生的位置 */
  location?: string;
  /** 相关的表名 */
  tableName?: string;
  /** 相关的字段名 */
  fieldName?: string;
  /** 相关的查询语句 */
  query?: string;
  /** 相关的参数 */
  params?: any[];
  /** 原始错误对象 */
  originalError?: Error;
  /** 其他上下文信息 */
  [key: string]: any;
}

/**
 * WebGeoDB 基础错误类
 */
export class WebGeoDBError extends Error {
  /** 错误代码 */
  public readonly code: ErrorCode;

  /** 错误严重级别 */
  public readonly severity: ErrorSeverity;

  /** 错误上下文 */
  public readonly context: ErrorContext;

  /** 时间戳 */
  public readonly timestamp: number;

  constructor(
    code: ErrorCode,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: ErrorContext = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.severity = severity;
    this.context = context;
    this.timestamp = Date.now();

    // 保持正确的原型链
    Object.setPrototypeOf(this, WebGeoDBError.prototype);

    // 捕获堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 获取错误的详细信息
   */
  getDetails(): string {
    const parts = [
      `[${this.code}]`,
      this.message,
      this.severity !== ErrorSeverity.MEDIUM ? `(${this.severity})` : ''
    ].filter(Boolean);

    let details = parts.join(' ');

    if (Object.keys(this.context).length > 0) {
      const contextStr = Object.entries(this.context)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
          if (key === 'originalError') {
            return `${key}: ${value instanceof Error ? value.message : value}`;
          }
          if (typeof value === 'object') {
            return `${key}: ${JSON.stringify(value)}`;
          }
          return `${key}: ${value}`;
        })
        .join(', ');
      details += `\n  Context: { ${contextStr} }`;
    }

    return details;
  }

  /**
   * 转换为 JSON 对象
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * 从错误对象创建 WebGeoDBError
   */
  static fromError(error: unknown, defaultCode: ErrorCode = ErrorCode.STORAGE_ERROR): WebGeoDBError {
    if (error instanceof WebGeoDBError) {
      return error;
    }

    if (error instanceof Error) {
      return new WebGeoDBError(
        defaultCode,
        error.message,
        ErrorSeverity.MEDIUM,
        { originalError: error }
      );
    }

    return new WebGeoDBError(
      defaultCode,
      String(error),
      ErrorSeverity.MEDIUM
    );
  }
}

/**
 * 数据库错误
 */
export class DatabaseError extends WebGeoDBError {
  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext = {}
  ) {
    super(code, message, ErrorSeverity.HIGH, context);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * 表错误
 */
export class TableError extends WebGeoDBError {
  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext = {}
  ) {
    super(code, message, ErrorSeverity.MEDIUM, context);
    Object.setPrototypeOf(this, TableError.prototype);
  }
}

/**
 * 查询错误
 */
export class QueryError extends WebGeoDBError {
  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext = {}
  ) {
    super(code, message, ErrorSeverity.MEDIUM, context);
    Object.setPrototypeOf(this, QueryError.prototype);
  }
}

/**
 * 验证错误
 */
export class ValidationError extends WebGeoDBError {
  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext = {}
  ) {
    super(code, message, ErrorSeverity.LOW, context);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 事务错误
 */
export class TransactionError extends WebGeoDBError {
  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext = {}
  ) {
    super(code, message, ErrorSeverity.HIGH, context);
    Object.setPrototypeOf(this, TransactionError.prototype);
  }
}

/**
 * 索引错误
 */
export class IndexError extends WebGeoDBError {
  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext = {}
  ) {
    super(code, message, ErrorSeverity.MEDIUM, context);
    Object.setPrototypeOf(this, IndexError.prototype);
  }
}

/**
 * 存储错误
 */
export class StorageError extends WebGeoDBError {
  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext = {}
  ) {
    super(code, message, ErrorSeverity.HIGH, context);
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}

/**
 * SQL 错误
 */
export class SQLError extends WebGeoDBError {
  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext = {}
  ) {
    super(code, message, ErrorSeverity.MEDIUM, context);
    Object.setPrototypeOf(this, SQLError.prototype);
  }
}

/**
 * 空间错误
 */
export class SpatialError extends WebGeoDBError {
  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext = {}
  ) {
    super(code, message, ErrorSeverity.MEDIUM, context);
    Object.setPrototypeOf(this, SpatialError.prototype);
  }
}

/**
 * 错误工厂函数
 */
export class ErrorFactory {
  /**
   * 创建数据库错误
   */
  static databaseError(
    code: ErrorCode,
    message: string,
    context: ErrorContext = {}
  ): DatabaseError {
    return new DatabaseError(code, message, context);
  }

  static databaseNotFound(dbName: string): DatabaseError {
    return new DatabaseError(
      ErrorCode.DATABASE_NOT_OPEN,
      `Database '${dbName}' is not open. Please call open() first.`,
      { dbName }
    );
  }

  static databaseAlreadyOpen(dbName: string): DatabaseError {
    return new DatabaseError(
      ErrorCode.DATABASE_ALREADY_OPEN,
      `Database '${dbName}' is already open.`,
      { dbName }
    );
  }

  static databaseClosed(): DatabaseError {
    return new DatabaseError(
      ErrorCode.DATABASE_CLOSED,
      'Database operation failed: Database is closed.'
    );
  }

  static databaseInitFailed(dbName: string, originalError?: Error): DatabaseError {
    return new DatabaseError(
      ErrorCode.DATABASE_INIT_FAILED,
      `Failed to initialize database '${dbName}'.`,
      { dbName, originalError }
    );
  }

  /**
   * 创建表错误
   */
  static tableNotFound(tableName: string): TableError {
    return new TableError(
      ErrorCode.TABLE_NOT_FOUND,
      `Table '${tableName}' not found in schema.`,
      { tableName }
    );
  }

  static tableAlreadyExists(tableName: string): TableError {
    return new TableError(
      ErrorCode.TABLE_ALREADY_EXISTS,
      `Table '${tableName}' already exists.`,
      { tableName }
    );
  }

  static invalidSchema(tableName: string, reason: string): TableError {
    return new TableError(
      ErrorCode.TABLE_SCHEMA_INVALID,
      `Invalid schema for table '${tableName}': ${reason}`,
      { tableName, reason }
    );
  }

  /**
   * 创建查询错误
   */
  static queryError(
    message: string,
    context: ErrorContext = {},
    originalError?: Error
  ): QueryError {
    const queryError = new QueryError(
      ErrorCode.QUERY_EXECUTION_FAILED,
      message,
      { ...context, originalError }
    );
    return queryError;
  }

  static queryInvalid(message: string, query?: string): QueryError {
    return new QueryError(
      ErrorCode.QUERY_INVALID,
      message,
      { query }
    );
  }

  static queryParseFailed(sql: string, originalError?: Error): QueryError {
    return new QueryError(
      ErrorCode.QUERY_PARSE_FAILED,
      `Failed to parse query: ${originalError?.message || 'unknown error'}`,
      { query: sql, originalError }
    );
  }

  static queryExecutionFailed(message: string, context?: ErrorContext): QueryError {
    return new QueryError(
      ErrorCode.QUERY_EXECUTION_FAILED,
      message,
      context
    );
  }

  /**
   * 创建验证错误
   */
  static validationError(
    code: ErrorCode,
    message: string,
    context: ErrorContext = {}
  ): ValidationError {
    return new ValidationError(code, message, context);
  }

  static invalidGeometry(fieldName: string, reason: string): ValidationError {
    return new ValidationError(
      ErrorCode.INVALID_GEOMETRY,
      `Invalid geometry for field '${fieldName}': ${reason}`,
      { fieldName, reason }
    );
  }

  static invalidParameter(paramName: string, reason: string): ValidationError {
    return new ValidationError(
      ErrorCode.INVALID_PARAMETER,
      `Invalid parameter '${paramName}': ${reason}`,
      { paramName, reason }
    );
  }

  static validationFailed(message: string, context?: ErrorContext): ValidationError {
    return new ValidationError(
      ErrorCode.VALIDATION_FAILED,
      message,
      context
    );
  }

  /**
   * 创建事务错误
   */
  static transactionFailed(reason: string, originalError?: Error): TransactionError {
    return new TransactionError(
      ErrorCode.TRANSACTION_FAILED,
      `Transaction failed: ${reason}`,
      { originalError }
    );
  }

  /**
   * 创建索引错误
   */
  static indexError(
    code: ErrorCode,
    message: string,
    context: ErrorContext = {},
    originalError?: Error
  ): IndexError {
    const indexError = new IndexError(
      code,
      message,
      { ...context, originalError }
    );
    return indexError;
  }

  static indexNotFound(tableName: string, fieldName?: string): IndexError {
    const message = fieldName
      ? `Spatial index not found for field '${fieldName}' in table '${tableName}'.`
      : `Spatial index not found for table '${tableName}'.`;

    return new IndexError(
      ErrorCode.INDEX_NOT_FOUND,
      message,
      { tableName, fieldName }
    );
  }

  static indexCreateFailed(tableName: string, fieldName: string, originalError?: Error): IndexError {
    return new IndexError(
      ErrorCode.INDEX_CREATE_FAILED,
      `Failed to create spatial index for field '${fieldName}' in table '${tableName}'.`,
      { tableName, fieldName, originalError }
    );
  }

  /**
   * 创建存储错误
   */
  static storageError(message: string, originalError?: Error): StorageError {
    return new StorageError(
      ErrorCode.STORAGE_ERROR,
      message,
      { originalError }
    );
  }

  static storageQuotaExceeded(): StorageError {
    return new StorageError(
      ErrorCode.STORAGE_QUOTA_EXCEEDED,
      'Storage quota exceeded. Please free up some space.'
    );
  }

  /**
   * 创建 SQL 错误
   */
  static sqlSyntaxError(sql: string, reason: string): SQLError {
    return new SQLError(
      ErrorCode.SQL_SYNTAX_ERROR,
      `SQL syntax error: ${reason}`,
      { query: sql }
    );
  }

  static sqlNotSupported(feature: string): SQLError {
    return new SQLError(
      ErrorCode.SQL_NOT_SUPPORTED,
      `SQL feature not supported: ${feature}`
    );
  }

  static sqlParameterMissing(index: number): SQLError {
    return new SQLError(
      ErrorCode.SQL_PARAMETER_MISSING,
      `SQL parameter ${index} is missing.`
    );
  }

  /**
   * 创建空间错误
   */
  static spatialEngineNotFound(engineName: string): SpatialError {
    return new SpatialError(
      ErrorCode.SPATIAL_ENGINE_NOT_FOUND,
      `Spatial engine '${engineName}' not found.`
    );
  }

  static spatialOperationFailed(operation: string, originalError?: Error): SpatialError {
    return new SpatialError(
      ErrorCode.SPATIAL_OPERATION_FAILED,
      `Spatial operation '${operation}' failed.`,
      { operation, originalError }
    );
  }
}

/**
 * 错误处理工具函数
 */
export class ErrorHandler {
  /**
   * 包装异步函数，自动捕获和转换错误
   */
  static async handleAsync<T>(
    fn: () => Promise<T>,
    context?: ErrorContext
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      throw WebGeoDBError.fromError(error, ErrorCode.STORAGE_ERROR);
    }
  }

  /**
   * 包装同步函数，自动捕获和转换错误
   */
  static handle<T>(
    fn: () => T,
    context?: ErrorContext
  ): T {
    try {
      return fn();
    } catch (error) {
      throw WebGeoDBError.fromError(error, ErrorCode.STORAGE_ERROR);
    }
  }

  /**
   * 判断是否为 WebGeoDB 错误
   */
  static isWebGeoDBError(error: unknown): error is WebGeoDBError {
    return error instanceof WebGeoDBError;
  }

  /**
   * 判断是否为特定类型的错误
   */
  static isErrorOfType<T extends WebGeoDBError>(
    error: unknown,
    errorClass: new (...args: any[]) => T
  ): error is T {
    return error instanceof errorClass;
  }

  /**
   * 记录错误
   */
  static log(error: unknown, level: 'error' | 'warn' | 'info' = 'error'): void {
    const message = error instanceof Error ? error.message : String(error);

    if (level === 'error') {
      console.error(message);
      if (error instanceof WebGeoDBError && Object.keys(error.context).length > 0) {
        console.error('  Context:', error.context);
      }
      if (error instanceof Error && error.stack) {
        console.error('  Stack:', error.stack);
      }
    } else if (level === 'warn') {
      console.warn(message);
    } else {
      console.info(message);
    }
  }
}

/**
 * 全局错误处理器
 */
export class GlobalErrorHandler {
  private static handlers: Array<(error: WebGeoDBError) => void> = [];

  /**
   * 注册错误处理器
   */
  static on_error(handler: (error: WebGeoDBError) => void): void {
    this.handlers.push(handler);
  }

  /**
   * 触发错误处理器
   */
  static trigger(error: WebGeoDBError): void {
    this.handlers.forEach(handler => {
      try {
        handler(error);
      } catch (err) {
        console.error('Error in error handler:', err);
      }
    });
  }

  /**
   * 清除所有处理器
   */
  static clear(): void {
    this.handlers = [];
  }
}
