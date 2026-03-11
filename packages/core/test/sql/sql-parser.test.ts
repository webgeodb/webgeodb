/**
 * SQL 解析器单元测试
 */

import { describe, it, expect } from 'vitest';
import { Parser, parseSQL, validateSQL } from '../../src/sql/sql-parser';

describe('SQLParser', () => {
  describe('parse', () => {
    it('应该解析简单的 SELECT 语句', () => {
      const parser = new Parser();
      const result = parser.parse('SELECT * FROM features');

      expect(result.statement).toBeDefined();
      expect(result.statement.type).toBe('select');
      expect(result.statement.from).toBe('features');
    });

    it('应该解析带 WHERE 的 SELECT 语句', () => {
      const parser = new Parser();
      const result = parser.parse("SELECT * FROM features WHERE type = 'poi'");

      expect(result.statement.type).toBe('select');
      expect(result.statement.where).toBeDefined();
      expect(result.statement.from).toBe('features');
    });

    it('应该解析带 ORDER BY 的 SELECT 语句', () => {
      const parser = new Parser();
      const result = parser.parse('SELECT * FROM features ORDER BY rating DESC');

      expect(result.statement.type).toBe('select');
      expect(result.statement.orderBy).toBeDefined();
      expect(result.statement.orderBy).toHaveLength(1);
      expect(result.statement.orderBy[0].field).toBe('rating');
      expect(result.statement.orderBy[0].direction).toBe('desc');
    });

    it('应该解析带 LIMIT 的 SELECT 语句', () => {
      const parser = new Parser();
      const result = parser.parse('SELECT * FROM features LIMIT 10');

      expect(result.statement.type).toBe('select');
      expect(result.statement.limit).toBe(10);
    });

    it('应该解析带 OFFSET 的 SELECT 语句', () => {
      const parser = new Parser();
      const result = parser.parse('SELECT * FROM features LIMIT 10 OFFSET 5');

      expect(result.statement.type).toBe('select');
      expect(result.statement.limit).toBe(10);
      expect(result.statement.offset).toBe(5);
    });

    it('应该提取参数占位符', () => {
      const parser = new Parser();
      const result = parser.parse('SELECT * FROM features WHERE type = $1 AND rating >= $2');

      expect(result.parameters).toHaveLength(2);
    });

    it('应该解析带多个列的 SELECT 语句', () => {
      const parser = new Parser();
      const result = parser.parse('SELECT id, name, type FROM features');

      expect(result.statement.type).toBe('select');
      expect(result.statement.columns).toHaveLength(3);
    });

    it('应该解析带别名的 SELECT 语句', () => {
      const parser = new Parser();
      const result = parser.parse('SELECT name as feature_name FROM features');

      expect(result.statement.type).toBe('select');
      expect(result.statement.columns[0].alias).toBe('feature_name');
    });
  });

  describe('validate', () => {
    it('应该验证有效的 SQL', () => {
      const parser = new Parser();
      const result = parser.validate('SELECT * FROM features');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该拒绝无效的 SQL', () => {
      const parser = new Parser();
      const result = parser.validate('INVALID SQL');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('快捷函数', () => {
    it('parseSQL 应该解析 SQL', () => {
      const result = parseSQL('SELECT * FROM features');

      expect(result.statement).toBeDefined();
      expect(result.statement.type).toBe('select');
    });

    it('validateSQL 应该验证 SQL', () => {
      const validResult = validateSQL('SELECT * FROM features');
      expect(validResult.valid).toBe(true);

      const invalidResult = validateSQL('INVALID');
      expect(invalidResult.valid).toBe(false);
    });
  });

  describe('PostGIS 函数解析', () => {
    it('应该解析 ST_Intersects 函数', () => {
      const parser = new Parser();
      const result = parser.parse(`
        SELECT * FROM features
        WHERE ST_Intersects(geometry, ST_MakePoint(116.4, 39.9))
      `);

      expect(result.statement.type).toBe('select');
      expect(result.statement.where).toBeDefined();
    });

    it('应该解析 ST_DWithin 函数', () => {
      const parser = new Parser();
      const result = parser.parse(`
        SELECT * FROM features
        WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 1000)
      `);

      expect(result.statement.type).toBe('select');
      expect(result.statement.where).toBeDefined();
    });

    it('应该解析 ST_Buffer 函数', () => {
      const parser = new Parser();
      const result = parser.parse(`
        SELECT * FROM zones
        WHERE ST_Intersects(geometry, ST_Buffer(ST_MakePoint(116.4, 39.9), 500))
      `);

      expect(result.statement.type).toBe('select');
      expect(result.statement.where).toBeDefined();
    });
  });
});
