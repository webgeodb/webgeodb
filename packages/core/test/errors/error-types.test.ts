/**
 * 错误处理模块测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ErrorCode,
  ErrorSeverity,
  WebGeoDBError,
  DatabaseError,
  TableError,
  QueryError,
  ValidationError,
  TransactionError,
  IndexError,
  StorageError,
  SQLError,
  SpatialError,
  ErrorFactory,
  ErrorHandler,
  GlobalErrorHandler
} from '../../src/errors';

describe('错误处理模块', () => {
  describe('ErrorCode', () => {
    it('应该包含所有错误代码', () => {
      expect(ErrorCode.DATABASE_NOT_OPEN).toBe('DATABASE_NOT_OPEN');
      expect(ErrorCode.TABLE_NOT_FOUND).toBe('TABLE_NOT_FOUND');
      expect(ErrorCode.QUERY_INVALID).toBe('QUERY_INVALID');
      expect(ErrorCode.INVALID_GEOMETRY).toBe('INVALID_GEOMETRY');
      expect(ErrorCode.TRANSACTION_FAILED).toBe('TRANSACTION_FAILED');
      expect(ErrorCode.INDEX_NOT_FOUND).toBe('INDEX_NOT_FOUND');
      expect(ErrorCode.STORAGE_ERROR).toBe('STORAGE_ERROR');
      expect(ErrorCode.SQL_SYNTAX_ERROR).toBe('SQL_SYNTAX_ERROR');
    });
  });

  describe('ErrorSeverity', () => {
    it('应该包含所有严重级别', () => {
      expect(ErrorSeverity.LOW).toBe('low');
      expect(ErrorSeverity.MEDIUM).toBe('medium');
      expect(ErrorSeverity.HIGH).toBe('high');
      expect(ErrorSeverity.CRITICAL).toBe('critical');
    });
  });

  describe('WebGeoDBError', () => {
    it('应该创建基本错误', () => {
      const error = new WebGeoDBError(
        ErrorCode.DATABASE_NOT_OPEN,
        'Database not open',
        ErrorSeverity.HIGH,
        { tableName: 'test' }
      );

      expect(error.code).toBe(ErrorCode.DATABASE_NOT_OPEN);
      expect(error.message).toBe('Database not open');
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.context).toEqual({ tableName: 'test' });
      expect(error.timestamp).toBeGreaterThan(0);
      expect(error.name).toBe('WebGeoDBError');
    });

    it('应该正确获取详细信息', () => {
      const error = new WebGeoDBError(
        ErrorCode.DATABASE_NOT_OPEN,
        'Database not open',
        ErrorSeverity.HIGH,
        { tableName: 'test', fieldName: 'id' }
      );

      const details = error.getDetails();
      expect(details).toContain('[DATABASE_NOT_OPEN]');
      expect(details).toContain('Database not open');
      expect(details).toContain('(high)');
      expect(details).toContain('tableName: test');
      expect(details).toContain('fieldName: id');
    });

    it('应该正确转换为 JSON', () => {
      const error = new WebGeoDBError(
        ErrorCode.DATABASE_NOT_OPEN,
        'Database not open',
        ErrorSeverity.HIGH,
        { tableName: 'test' }
      );

      const json = error.toJSON();
      expect(json.code).toBe(ErrorCode.DATABASE_NOT_OPEN);
      expect(json.message).toBe('Database not open');
      expect(json.severity).toBe('high');
      expect(json.context).toEqual({ tableName: 'test' });
      expect(json.timestamp).toBeGreaterThan(0);
      expect(json.stack).toBeDefined();
    });

    it('应该从普通错误创建 WebGeoDBError', () => {
      const originalError = new Error('Original error');
      const webGeoDBError = WebGeoDBError.fromError(originalError);

      expect(webGeoDBError).toBeInstanceOf(WebGeoDBError);
      expect(webGeoDBError.code).toBe(ErrorCode.STORAGE_ERROR);
      expect(webGeoDBError.message).toBe('Original error');
      expect(webGeoDBError.context.originalError).toBe(originalError);
    });

    it('应该直接返回 WebGeoDBError', () => {
      const originalError = new WebGeoDBError(
        ErrorCode.DATABASE_NOT_OPEN,
        'Database not open'
      );
      const webGeoDBError = WebGeoDBError.fromError(originalError);

      expect(webGeoDBError).toBe(originalError);
    });

    it('应该从非错误对象创建 WebGeoDBError', () => {
      const webGeoDBError = WebGeoDBError.fromError('Some error message');

      expect(webGeoDBError).toBeInstanceOf(WebGeoDBError);
      expect(webGeoDBError.message).toBe('Some error message');
    });
  });

  describe('DatabaseError', () => {
    it('应该创建数据库错误', () => {
      const error = new DatabaseError(
        ErrorCode.DATABASE_NOT_OPEN,
        'Database not open',
        { dbName: 'test' }
      );

      expect(error).toBeInstanceOf(WebGeoDBError);
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.code).toBe(ErrorCode.DATABASE_NOT_OPEN);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.name).toBe('DatabaseError');
    });
  });

  describe('TableError', () => {
    it('应该创建表错误', () => {
      const error = new TableError(
        ErrorCode.TABLE_NOT_FOUND,
        'Table not found',
        { tableName: 'test' }
      );

      expect(error).toBeInstanceOf(WebGeoDBError);
      expect(error).toBeInstanceOf(TableError);
      expect(error.code).toBe(ErrorCode.TABLE_NOT_FOUND);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.name).toBe('TableError');
    });
  });

  describe('QueryError', () => {
    it('应该创建查询错误', () => {
      const error = new QueryError(
        ErrorCode.QUERY_INVALID,
        'Query invalid',
        { query: 'SELECT * FROM test' }
      );

      expect(error).toBeInstanceOf(WebGeoDBError);
      expect(error).toBeInstanceOf(QueryError);
      expect(error.code).toBe(ErrorCode.QUERY_INVALID);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.name).toBe('QueryError');
    });
  });

  describe('ValidationError', () => {
    it('应该创建验证错误', () => {
      const error = new ValidationError(
        ErrorCode.INVALID_GEOMETRY,
        'Invalid geometry',
        { fieldName: 'geometry' }
      );

      expect(error).toBeInstanceOf(WebGeoDBError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.code).toBe(ErrorCode.INVALID_GEOMETRY);
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('TransactionError', () => {
    it('应该创建事务错误', () => {
      const error = new TransactionError(
        ErrorCode.TRANSACTION_FAILED,
        'Transaction failed'
      );

      expect(error).toBeInstanceOf(WebGeoDBError);
      expect(error).toBeInstanceOf(TransactionError);
      expect(error.code).toBe(ErrorCode.TRANSACTION_FAILED);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.name).toBe('TransactionError');
    });
  });

  describe('IndexError', () => {
    it('应该创建索引错误', () => {
      const error = new IndexError(
        ErrorCode.INDEX_NOT_FOUND,
        'Index not found',
        { tableName: 'test', fieldName: 'geometry' }
      );

      expect(error).toBeInstanceOf(WebGeoDBError);
      expect(error).toBeInstanceOf(IndexError);
      expect(error.code).toBe(ErrorCode.INDEX_NOT_FOUND);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.name).toBe('IndexError');
    });
  });

  describe('StorageError', () => {
    it('应该创建存储错误', () => {
      const error = new StorageError(
        ErrorCode.STORAGE_ERROR,
        'Storage error'
      );

      expect(error).toBeInstanceOf(WebGeoDBError);
      expect(error).toBeInstanceOf(StorageError);
      expect(error.code).toBe(ErrorCode.STORAGE_ERROR);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.name).toBe('StorageError');
    });
  });

  describe('SQLError', () => {
    it('应该创建 SQL 错误', () => {
      const error = new SQLError(
        ErrorCode.SQL_SYNTAX_ERROR,
        'SQL syntax error',
        { query: 'SELECT * FROM' }
      );

      expect(error).toBeInstanceOf(WebGeoDBError);
      expect(error).toBeInstanceOf(SQLError);
      expect(error.code).toBe(ErrorCode.SQL_SYNTAX_ERROR);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.name).toBe('SQLError');
    });
  });

  describe('SpatialError', () => {
    it('应该创建空间错误', () => {
      const error = new SpatialError(
        ErrorCode.SPATIAL_OPERATION_FAILED,
        'Spatial operation failed'
      );

      expect(error).toBeInstanceOf(WebGeoDBError);
      expect(error).toBeInstanceOf(SpatialError);
      expect(error.code).toBe(ErrorCode.SPATIAL_OPERATION_FAILED);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.name).toBe('SpatialError');
    });
  });

  describe('ErrorFactory', () => {
    describe('数据库错误', () => {
      it('应该创建数据库未找到错误', () => {
        const error = ErrorFactory.databaseNotFound('testDB');

        expect(error).toBeInstanceOf(DatabaseError);
        expect(error.code).toBe(ErrorCode.DATABASE_NOT_OPEN);
        expect(error.message).toContain('testDB');
        expect(error.context.dbName).toBe('testDB');
      });

      it('应该创建数据库已打开错误', () => {
        const error = ErrorFactory.databaseAlreadyOpen('testDB');

        expect(error).toBeInstanceOf(DatabaseError);
        expect(error.code).toBe(ErrorCode.DATABASE_ALREADY_OPEN);
        expect(error.message).toContain('testDB');
      });

      it('应该创建数据库已关闭错误', () => {
        const error = ErrorFactory.databaseClosed();

        expect(error).toBeInstanceOf(DatabaseError);
        expect(error.code).toBe(ErrorCode.DATABASE_CLOSED);
        expect(error.message).toContain('closed');
      });

      it('应该创建数据库初始化失败错误', () => {
        const originalError = new Error('Init failed');
        const error = ErrorFactory.databaseInitFailed('testDB', originalError);

        expect(error).toBeInstanceOf(DatabaseError);
        expect(error.code).toBe(ErrorCode.DATABASE_INIT_FAILED);
        expect(error.context.originalError).toBe(originalError);
      });
    });

    describe('表错误', () => {
      it('应该创建表未找到错误', () => {
        const error = ErrorFactory.tableNotFound('testTable');

        expect(error).toBeInstanceOf(TableError);
        expect(error.code).toBe(ErrorCode.TABLE_NOT_FOUND);
        expect(error.message).toContain('testTable');
      });

      it('应该创建表已存在错误', () => {
        const error = ErrorFactory.tableAlreadyExists('testTable');

        expect(error).toBeInstanceOf(TableError);
        expect(error.code).toBe(ErrorCode.TABLE_ALREADY_EXISTS);
      });

      it('应该创建无效模式错误', () => {
        const error = ErrorFactory.invalidSchema('testTable', 'missing id field');

        expect(error).toBeInstanceOf(TableError);
        expect(error.code).toBe(ErrorCode.TABLE_SCHEMA_INVALID);
        expect(error.context.reason).toBe('missing id field');
      });
    });

    describe('查询错误', () => {
      it('应该创建无效查询错误', () => {
        const error = ErrorFactory.queryInvalid('Query is invalid', 'SELECT * FROM');

        expect(error).toBeInstanceOf(QueryError);
        expect(error.code).toBe(ErrorCode.QUERY_INVALID);
        expect(error.context.query).toBe('SELECT * FROM');
      });

      it('应该创建查询解析失败错误', () => {
        const originalError = new Error('Parse error');
        const error = ErrorFactory.queryParseFailed('SELECT * FROM', originalError);

        expect(error).toBeInstanceOf(QueryError);
        expect(error.code).toBe(ErrorCode.QUERY_PARSE_FAILED);
        expect(error.context.originalError).toBe(originalError);
      });
    });

    describe('验证错误', () => {
      it('应该创建无效几何错误', () => {
        const error = ErrorFactory.invalidGeometry('geometry', 'invalid coordinates');

        expect(error).toBeInstanceOf(ValidationError);
        expect(error.code).toBe(ErrorCode.INVALID_GEOMETRY);
        expect(error.context.fieldName).toBe('geometry');
        expect(error.context.reason).toBe('invalid coordinates');
      });

      it('应该创建无效参数错误', () => {
        const error = ErrorFactory.invalidParameter('limit', 'must be positive');

        expect(error).toBeInstanceOf(ValidationError);
        expect(error.code).toBe(ErrorCode.INVALID_PARAMETER);
        expect(error.context.paramName).toBe('limit');
      });
    });

    describe('事务错误', () => {
      it('应该创建事务失败错误', () => {
        const originalError = new Error('Transaction failed');
        const error = ErrorFactory.transactionFailed('conflict', originalError);

        expect(error).toBeInstanceOf(TransactionError);
        expect(error.code).toBe(ErrorCode.TRANSACTION_FAILED);
        expect(error.context.originalError).toBe(originalError);
      });
    });

    describe('索引错误', () => {
      it('应该创建索引未找到错误', () => {
        const error = ErrorFactory.indexNotFound('testTable', 'geometry');

        expect(error).toBeInstanceOf(IndexError);
        expect(error.code).toBe(ErrorCode.INDEX_NOT_FOUND);
        expect(error.context.tableName).toBe('testTable');
        expect(error.context.fieldName).toBe('geometry');
      });

      it('应该创建索引创建失败错误', () => {
        const originalError = new Error('Create failed');
        const error = ErrorFactory.indexCreateFailed('testTable', 'geometry', originalError);

        expect(error).toBeInstanceOf(IndexError);
        expect(error.code).toBe(ErrorCode.INDEX_CREATE_FAILED);
        expect(error.context.originalError).toBe(originalError);
      });
    });

    describe('存储错误', () => {
      it('应该创建存储错误', () => {
        const originalError = new Error('Storage error');
        const error = ErrorFactory.storageError('Storage failed', originalError);

        expect(error).toBeInstanceOf(StorageError);
        expect(error.code).toBe(ErrorCode.STORAGE_ERROR);
        expect(error.context.originalError).toBe(originalError);
      });

      it('应该创建存储配额超出错误', () => {
        const error = ErrorFactory.storageQuotaExceeded();

        expect(error).toBeInstanceOf(StorageError);
        expect(error.code).toBe(ErrorCode.STORAGE_QUOTA_EXCEEDED);
      });
    });

    describe('SQL 错误', () => {
      it('应该创建 SQL 语法错误', () => {
        const error = ErrorFactory.sqlSyntaxError('SELECT * FROM', 'missing table name');

        expect(error).toBeInstanceOf(SQLError);
        expect(error.code).toBe(ErrorCode.SQL_SYNTAX_ERROR);
        expect(error.context.query).toBe('SELECT * FROM');
      });

      it('应该创建 SQL 不支持错误', () => {
        const error = ErrorFactory.sqlNotSupported('WINDOW functions');

        expect(error).toBeInstanceOf(SQLError);
        expect(error.code).toBe(ErrorCode.SQL_NOT_SUPPORTED);
      });

      it('应该创建 SQL 参数缺失错误', () => {
        const error = ErrorFactory.sqlParameterMissing(1);

        expect(error).toBeInstanceOf(SQLError);
        expect(error.code).toBe(ErrorCode.SQL_PARAMETER_MISSING);
      });
    });

    describe('空间错误', () => {
      it('应该创建空间引擎未找到错误', () => {
        const error = ErrorFactory.spatialEngineNotFound('customEngine');

        expect(error).toBeInstanceOf(SpatialError);
        expect(error.code).toBe(ErrorCode.SPATIAL_ENGINE_NOT_FOUND);
      });

      it('应该创建空间操作失败错误', () => {
        const originalError = new Error('Buffer failed');
        const error = ErrorFactory.spatialOperationFailed('buffer', originalError);

        expect(error).toBeInstanceOf(SpatialError);
        expect(error.code).toBe(ErrorCode.SPATIAL_OPERATION_FAILED);
        expect(error.context.originalError).toBe(originalError);
      });
    });
  });

  describe('ErrorHandler', () => {
    it('应该正确处理异步函数', async () => {
      const fn = async () => 'success';
      const result = await ErrorHandler.handleAsync(fn);
      expect(result).toBe('success');
    });

    it('应该捕获并转换异步函数中的错误', async () => {
      const fn = async () => {
        throw new Error('Async error');
      };

      await expect(ErrorHandler.handleAsync(fn)).rejects.toThrow(WebGeoDBError);
    });

    it('应该正确处理同步函数', () => {
      const fn = () => 'success';
      const result = ErrorHandler.handle(fn);
      expect(result).toBe('success');
    });

    it('应该捕获并转换同步函数中的错误', () => {
      const fn = () => {
        throw new Error('Sync error');
      };

      expect(() => ErrorHandler.handle(fn)).toThrow(WebGeoDBError);
    });

    it('应该正确判断是否为 WebGeoDBError', () => {
      const webGeoDBError = new WebGeoDBError(ErrorCode.DATABASE_NOT_OPEN, 'test');
      const normalError = new Error('test');

      expect(ErrorHandler.isWebGeoDBError(webGeoDBError)).toBe(true);
      expect(ErrorHandler.isWebGeoDBError(normalError)).toBe(false);
    });

    it('应该正确判断是否为特定类型的错误', () => {
      const databaseError = new DatabaseError(ErrorCode.DATABASE_NOT_OPEN, 'test');
      const queryError = new QueryError(ErrorCode.QUERY_INVALID, 'test');

      expect(ErrorHandler.isErrorOfType(databaseError, DatabaseError)).toBe(true);
      expect(ErrorHandler.isErrorOfType(databaseError, QueryError)).toBe(false);
      expect(ErrorHandler.isErrorOfType(queryError, QueryError)).toBe(true);
    });
  });

  describe('GlobalErrorHandler', () => {
    beforeEach(() => {
      GlobalErrorHandler.clear();
    });

    it('应该注册和触发错误处理器', () => {
      let capturedError: WebGeoDBError | null = null;

      GlobalErrorHandler.on_error((error) => {
        capturedError = error;
      });

      const error = new WebGeoDBError(ErrorCode.DATABASE_NOT_OPEN, 'test');
      GlobalErrorHandler.trigger(error);

      expect(capturedError).toBe(error);
    });

    it('应该支持多个错误处理器', () => {
      const errors: WebGeoDBError[] = [];

      GlobalErrorHandler.on_error((error) => {
        errors.push(error);
      });

      GlobalErrorHandler.on_error((error) => {
        errors.push(error);
      });

      const error = new WebGeoDBError(ErrorCode.DATABASE_NOT_OPEN, 'test');
      GlobalErrorHandler.trigger(error);

      expect(errors.length).toBe(2);
      expect(errors[0]).toBe(error);
      expect(errors[1]).toBe(error);
    });

    it('应该清除所有处理器', () => {
      GlobalErrorHandler.on_error(() => {});
      GlobalErrorHandler.clear();

      const error = new WebGeoDBError(ErrorCode.DATABASE_NOT_OPEN, 'test');
      expect(() => GlobalErrorHandler.trigger(error)).not.toThrow();
    });

    it('应该捕获处理器中的错误', () => {
      GlobalErrorHandler.on_error(() => {
        throw new Error('Handler error');
      });

      const error = new WebGeoDBError(ErrorCode.DATABASE_NOT_OPEN, 'test');
      expect(() => GlobalErrorHandler.trigger(error)).not.toThrow();
    });
  });

  describe('错误上下文', () => {
    it('应该正确处理原始错误', () => {
      const originalError = new Error('Original error message');
      const error = new WebGeoDBError(
        ErrorCode.DATABASE_NOT_OPEN,
        'Wrapper error',
        ErrorSeverity.MEDIUM,
        { originalError }
      );

      const details = error.getDetails();
      expect(details).toContain('Original error message');
    });

    it('应该正确处理复杂上下文', () => {
      const context = {
        tableName: 'test',
        fieldName: 'geometry',
        query: 'SELECT * FROM test',
        params: [1, 2, 3],
        nested: { value: 'test' }
      };

      const error = new WebGeoDBError(
        ErrorCode.QUERY_INVALID,
        'Test error',
        ErrorSeverity.MEDIUM,
        context
      );

      expect(error.context).toEqual(context);
    });
  });
});
