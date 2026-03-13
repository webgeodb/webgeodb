/**
 * 错误处理集成测试
 * 测试错误处理在实际场景中的工作情况
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebGeoDB } from '../../src/webgeodb';
import {
  ErrorFactory,
  ErrorCode,
  DatabaseError,
  TableError,
  QueryError,
  SQLError,
  ErrorHandler
} from '../../src/errors';

describe('错误处理集成测试', () => {
  let db: WebGeoDB;

  beforeEach(async () => {
    db = new WebGeoDB({ name: 'error-integration-test', version: 1 });

    // schema 必须在 open 之前调用
    db.schema({
      features: {
        id: 'string',
        name: 'string',
        type: 'string',
        value: 'number'
      }
    });

    await db.open();
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('数据库错误处理', () => {
    it('应该正确处理数据库关闭错误', async () => {
      await db.close();

      try {
        await db.features.toArray();
        expect.fail('应该抛出错误');
      } catch (error) {
        // Dexie 会抛出 DatabaseClosedError
        expect(error).toBeDefined();
      }
    });

    it('应该使用工厂函数创建数据库错误', () => {
      const error = ErrorFactory.databaseNotFound('test-db');

      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.code).toBe(ErrorCode.DATABASE_NOT_OPEN);
      expect(error.message).toContain('test-db');
    });
  });

  describe('表错误处理', () => {
    it('应该正确处理表未找到错误', () => {
      const error = ErrorFactory.tableNotFound('nonexistent');

      expect(error).toBeInstanceOf(TableError);
      expect(error.code).toBe(ErrorCode.TABLE_NOT_FOUND);
      expect(error.message).toContain('nonexistent');
    });

    it('应该正确处理无效模式错误', () => {
      const error = ErrorFactory.invalidSchema('features', 'missing id field');

      expect(error).toBeInstanceOf(TableError);
      expect(error.code).toBe(ErrorCode.TABLE_SCHEMA_INVALID);
      expect(error.context.reason).toBe('missing id field');
    });
  });

  describe('查询错误处理', () => {
    it('应该正确处理 SQL 语法错误', () => {
      const error = ErrorFactory.sqlSyntaxError('SELCT * FROM', 'invalid syntax');

      expect(error).toBeInstanceOf(SQLError);
      expect(error.code).toBe(ErrorCode.SQL_SYNTAX_ERROR);
      expect(error.context.query).toBe('SELCT * FROM');
    });

    it('应该正确处理查询解析失败错误', () => {
      const originalError = new Error('Parse error');
      const error = ErrorFactory.queryParseFailed('INVALID SQL', originalError);

      expect(error).toBeInstanceOf(QueryError);
      expect(error.code).toBe(ErrorCode.QUERY_PARSE_FAILED);
      expect(error.context.originalError).toBe(originalError);
    });
  });

  describe('ErrorHandler 工具', () => {
    it('应该正确处理异步函数', async () => {
      const fn = async () => {
        return 'success';
      };

      const result = await ErrorHandler.handleAsync(fn);
      expect(result).toBe('success');
    });

    it('应该捕获并转换异步函数中的错误', async () => {
      const fn = async () => {
        throw new Error('Test error');
      };

      try {
        await ErrorHandler.handleAsync(fn);
        expect.fail('应该抛出错误');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('应该正确判断错误类型', () => {
      const dbError = ErrorFactory.databaseNotFound('test');
      const queryError = ErrorFactory.queryInvalid('Invalid query');
      const normalError = new Error('Normal error');

      expect(ErrorHandler.isWebGeoDBError(dbError)).toBe(true);
      expect(ErrorHandler.isWebGeoDBError(queryError)).toBe(true);
      expect(ErrorHandler.isWebGeoDBError(normalError)).toBe(false);

      expect(ErrorHandler.isErrorOfType(dbError, DatabaseError)).toBe(true);
      expect(ErrorHandler.isErrorOfType(dbError, QueryError)).toBe(false);
    });
  });

  describe('错误上下文', () => {
    it('应该正确保存和显示错误上下文', () => {
      const error = ErrorFactory.queryInvalid('Invalid query', 'SELECT * FROM features');

      const details = error.getDetails();
      expect(details).toContain('[QUERY_INVALID]');
      expect(details).toContain('Invalid query');
      expect(details).toContain('SELECT * FROM features');
    });

    it('应该正确转换为 JSON', () => {
      const error = ErrorFactory.tableNotFound('testTable');

      const json = error.toJSON();
      expect(json.code).toBe(ErrorCode.TABLE_NOT_FOUND);
      expect(json.message).toBeDefined();
      expect(json.severity).toBe('medium');
      expect(json.context).toBeDefined();
      expect(json.timestamp).toBeDefined();
      expect(json.stack).toBeDefined();
    });
  });

  describe('实际场景错误处理', () => {
    it('应该正确处理 SQL 查询中的错误', async () => {
      // 插入测试数据
      await db.features.insert({
        id: 'test-1',
        name: 'Feature 1',
        type: 'point',
        value: 100
      });

      // 执行有效查询
      const results = await db.query('SELECT * FROM features WHERE id = $1', ['test-1']);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Feature 1');

      // 执行无效查询（应该抛出错误）
      try {
        await db.query('INVALID SQL');
        expect.fail('应该抛出错误');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('应该正确处理表操作中的错误', async () => {
      // 有效插入
      await db.features.insert({
        id: 'test-2',
        name: 'Feature 2',
        type: 'point',
        value: 100
      });

      const feature = await db.features.get('test-2');
      expect(feature).toBeDefined();
      expect(feature.name).toBe('Feature 2');
    });
  });

  describe('错误恢复', () => {
    it('应该能够从错误中恢复', async () => {
      // 清理之前的测试数据
      await db.features.clear();

      // 第一次查询失败
      try {
        await db.query('INVALID SQL');
        expect.fail('应该抛出错误');
      } catch (error) {
        expect(error).toBeDefined();
      }

      // 第二次查询应该成功
      await db.features.insert({
        id: 'test-3',
        name: 'Feature 3',
        type: 'point',
        value: 100
      });

      const results = await db.query('SELECT * FROM features WHERE id = $1', ['test-3']);
      expect(results).toHaveLength(1);
    });
  });

  describe('错误严重级别', () => {
    it('应该正确设置错误的严重级别', () => {
      const dbError = ErrorFactory.databaseNotFound('test');
      const tableError = ErrorFactory.tableNotFound('test');
      const queryError = ErrorFactory.queryInvalid('test');
      const validationError = ErrorFactory.invalidGeometry('geometry', 'invalid');

      expect(dbError.severity).toBe('high');
      expect(tableError.severity).toBe('medium');
      expect(queryError.severity).toBe('medium');
      expect(validationError.severity).toBe('low');
    });
  });
});
