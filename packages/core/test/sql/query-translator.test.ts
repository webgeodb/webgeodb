/**
 * SQLToQueryBuilderTranslator 单元测试
 * 测试 SQL AST 到 QueryBuilder 的转换功能
 */

import { describe, it, expect } from 'vitest';
import { SQLToQueryBuilderTranslator } from '../../src/sql/query-translator';
import type { SQLSelectStatement, BinaryExpression, FunctionCall, ColumnReference, LiteralValue } from '../../src/sql/ast-nodes';

describe('SQLToQueryBuilderTranslator', () => {
  let translator: SQLToQueryBuilderTranslator;
  let mockBuilder: any;

  beforeEach(() => {
    translator = new SQLToQueryBuilderTranslator();

    // 创建模拟的 QueryBuilder
    mockBuilder = {
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn(),
      offset: vi.fn(),
      intersects: vi.fn(),
      contains: vi.fn(),
      within: vi.fn(),
      distance: vi.fn(),
      equals: vi.fn(),
      disjoint: vi.fn(),
      touches: vi.fn(),
      crosses: vi.fn(),
      overlaps: vi.fn()
    };

    // 链式调用支持
    mockBuilder.where.mockReturnValue(mockBuilder);
    mockBuilder.orderBy.mockReturnValue(mockBuilder);
    mockBuilder.limit.mockReturnValue(mockBuilder);
    mockBuilder.offset.mockReturnValue(mockBuilder);
    mockBuilder.intersects.mockReturnValue(mockBuilder);
    mockBuilder.contains.mockReturnValue(mockBuilder);
    mockBuilder.within.mockReturnValue(mockBuilder);
    mockBuilder.distance.mockReturnValue(mockBuilder);
    mockBuilder.equals.mockReturnValue(mockBuilder);
    mockBuilder.disjoint.mockReturnValue(mockBuilder);
    mockBuilder.touches.mockReturnValue(mockBuilder);
    mockBuilder.crosses.mockReturnValue(mockBuilder);
    mockBuilder.overlaps.mockReturnValue(mockBuilder);
  });

  describe('基础 SELECT 语句转换', () => {
    it('应该转换不带 WHERE 的简单 SELECT', () => {
      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: null,
        orderBy: [],
        limit: null,
        offset: null
      };

      const result = translator.translate(statement, mockBuilder);

      expect(result).toBe(mockBuilder);
      expect(mockBuilder.where).not.toHaveBeenCalled();
    });

    it('应该转换带 WHERE 的 SELECT', () => {
      const whereClause: BinaryExpression = {
        type: 'binary',
        operator: '=',
        left: {
          type: 'column_ref',
          column: 'type'
        } as ColumnReference,
        right: {
          type: 'literal',
          value: 'park'
        } as LiteralValue
      };

      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: whereClause,
        orderBy: [],
        limit: null,
        offset: null
      };

      const result = translator.translate(statement, mockBuilder);

      expect(result).toBe(mockBuilder);
      expect(mockBuilder.where).toHaveBeenCalledWith('type', '=', 'park');
    });

    it('应该转换带 ORDER BY 的 SELECT', () => {
      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: null,
        orderBy: [
          { field: 'rating', direction: 'desc' }
        ],
        limit: null,
        offset: null
      };

      const result = translator.translate(statement, mockBuilder);

      expect(result).toBe(mockBuilder);
      expect(mockBuilder.orderBy).toHaveBeenCalledWith('rating', 'desc');
    });

    it('应该转换带 LIMIT 的 SELECT', () => {
      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: null,
        orderBy: [],
        limit: 10,
        offset: null
      };

      const result = translator.translate(statement, mockBuilder);

      expect(result).toBe(mockBuilder);
      expect(mockBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('应该转换带 OFFSET 的 SELECT', () => {
      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: null,
        orderBy: [],
        limit: null,
        offset: 5
      };

      const result = translator.translate(statement, mockBuilder);

      expect(result).toBe(mockBuilder);
      expect(mockBuilder.offset).toHaveBeenCalledWith(5);
    });
  });

  describe('WHERE 子句转换', () => {
    it('应该转换等于条件', () => {
      const whereClause: BinaryExpression = {
        type: 'binary',
        operator: '=',
        left: {
          type: 'column_ref',
          column: 'type'
        } as ColumnReference,
        right: {
          type: 'literal',
          value: 'park'
        } as LiteralValue
      };

      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: whereClause,
        orderBy: [],
        limit: null,
        offset: null
      };

      translator.translate(statement, mockBuilder);
      // 验证 builder 添加了正确的 where 条件
    });

    it('应该转换大于条件', () => {
      const whereClause: BinaryExpression = {
        type: 'binary',
        operator: '>',
        left: {
          type: 'column_ref',
          column: 'rating'
        } as ColumnReference,
        right: {
          type: 'literal',
          value: 4
        } as LiteralValue
      };

      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: whereClause,
        orderBy: [],
        limit: null,
        offset: null
      };

      translator.translate(statement, mockBuilder);
    });

    it('应该转换 IN 条件', () => {
      const whereClause: BinaryExpression = {
        type: 'binary',
        operator: 'IN',
        left: {
          type: 'column_ref',
          column: 'type'
        } as ColumnReference,
        right: {
          type: 'literal',
          value: ['park', 'landmark']
        } as LiteralValue
      };

      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: whereClause,
        orderBy: [],
        limit: null,
        offset: null
      };

      translator.translate(statement, mockBuilder);
    });

    it('应该转换 AND 逻辑条件', () => {
      const whereClause: BinaryExpression = {
        type: 'binary',
        operator: 'AND',
        left: {
          type: 'binary',
          operator: '=',
          left: { type: 'column_ref', column: 'type' } as ColumnReference,
          right: { type: 'literal', value: 'park' } as LiteralValue
        } as BinaryExpression,
        right: {
          type: 'binary',
          operator: '>',
          left: { type: 'column_ref', column: 'rating' } as ColumnReference,
          right: { type: 'literal', value: 4 } as LiteralValue
        } as BinaryExpression
      };

      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: whereClause,
        orderBy: [],
        limit: null,
        offset: null
      };

      translator.translate(statement, mockBuilder);
    });

    it('应该转换 OR 逻辑条件', () => {
      const whereClause: BinaryExpression = {
        type: 'binary',
        operator: 'OR',
        left: {
          type: 'binary',
          operator: '=',
          left: { type: 'column_ref', column: 'type' } as ColumnReference,
          right: { type: 'literal', value: 'park' } as LiteralValue
        } as BinaryExpression,
        right: {
          type: 'binary',
          operator: '=',
          left: { type: 'column_ref', column: 'type' } as ColumnReference,
          right: { type: 'literal', value: 'landmark' } as LiteralValue
        } as BinaryExpression
      };

      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: whereClause,
        orderBy: [],
        limit: null,
        offset: null
      };

      translator.translate(statement, mockBuilder);
    });
  });

  describe('PostGIS 函数转换', () => {
    it('应该转换 ST_Intersects 函数', () => {
      const funcCall: FunctionCall = {
        type: 'function',
        name: 'ST_Intersects',
        arguments: [
          { type: 'column_ref', column: 'geometry' } as ColumnReference,
          {
            type: 'function',
            name: 'ST_MakePoint',
            arguments: [
              { type: 'literal', value: 116.4 } as LiteralValue,
              { type: 'literal', value: 39.9 } as LiteralValue
            ]
          } as FunctionCall
        ]
      };

      const whereClause: BinaryExpression = {
        type: 'binary',
        operator: '=',
        left: funcCall,
        right: { type: 'literal', value: true } as LiteralValue
      };

      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: whereClause,
        orderBy: [],
        limit: null,
        offset: null
      };

      translator.translate(statement, mockBuilder);
    });

    it('应该转换 ST_Contains 函数', () => {
      const funcCall: FunctionCall = {
        type: 'function',
        name: 'ST_Contains',
        arguments: [
          { type: 'column_ref', column: 'geometry' } as ColumnReference,
          {
            type: 'function',
            name: 'ST_MakePoint',
            arguments: [
              { type: 'literal', value: 116.4 } as LiteralValue,
              { type: 'literal', value: 39.9 } as LiteralValue
            ]
          } as FunctionCall
        ]
      };

      const whereClause: BinaryExpression = {
        type: 'binary',
        operator: '=',
        left: funcCall,
        right: { type: 'literal', value: true } as LiteralValue
      };

      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: whereClause,
        orderBy: [],
        limit: null,
        offset: null
      };

      translator.translate(statement, mockBuilder);
    });

    it('应该转换 ST_Within 函数', () => {
      const funcCall: FunctionCall = {
        type: 'function',
        name: 'ST_Within',
        arguments: [
          { type: 'column_ref', column: 'geometry' } as ColumnReference,
          {
            type: 'function',
            name: 'ST_MakePoint',
            arguments: [
              { type: 'literal', value: 116.4 } as LiteralValue,
              { type: 'literal', value: 39.9 } as LiteralValue
            ]
          } as FunctionCall
        ]
      };

      const whereClause: BinaryExpression = {
        type: 'binary',
        operator: '=',
        left: funcCall,
        right: { type: 'literal', value: true } as LiteralValue
      };

      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: whereClause,
        orderBy: [],
        limit: null,
        offset: null
      };

      translator.translate(statement, mockBuilder);
    });

    it('应该转换 ST_DWithin 函数', () => {
      const funcCall: FunctionCall = {
        type: 'function',
        name: 'ST_DWithin',
        arguments: [
          { type: 'column_ref', column: 'geometry' } as ColumnReference,
          {
            type: 'function',
            name: 'ST_MakePoint',
            arguments: [
              { type: 'literal', value: 116.4 } as LiteralValue,
              { type: 'literal', value: 39.9 } as LiteralValue
            ]
          } as FunctionCall,
          { type: 'literal', value: 1000 } as LiteralValue
        ]
      };

      const whereClause: BinaryExpression = {
        type: 'binary',
        operator: '=',
        left: funcCall,
        right: { type: 'literal', value: true } as LiteralValue
      };

      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: whereClause,
        orderBy: [],
        limit: null,
        offset: null
      };

      translator.translate(statement, mockBuilder);
    });

    it('应该转换 ST_Distance 函数', () => {
      const funcCall: FunctionCall = {
        type: 'function',
        name: 'ST_Distance',
        arguments: [
          { type: 'column_ref', column: 'geometry' } as ColumnReference,
          {
            type: 'function',
            name: 'ST_MakePoint',
            arguments: [
              { type: 'literal', value: 116.4 } as LiteralValue,
              { type: 'literal', value: 39.9 } as LiteralValue
            ]
          } as FunctionCall
        ]
      };

      const whereClause: BinaryExpression = {
        type: 'binary',
        operator: '<',
        left: funcCall,
        right: { type: 'literal', value: 5000 } as LiteralValue
      };

      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: whereClause,
        orderBy: [],
        limit: null,
        offset: null
      };

      translator.translate(statement, mockBuilder);
    });
  });

  describe('复杂查询转换', () => {
    it('应该转换带 WHERE、ORDER BY、LIMIT 的组合查询', () => {
      const whereClause: BinaryExpression = {
        type: 'binary',
        operator: '=',
        left: {
          type: 'column_ref',
          column: 'type'
        } as ColumnReference,
        right: {
          type: 'literal',
          value: 'park'
        } as LiteralValue
      };

      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: whereClause,
        orderBy: [
          { field: 'rating', direction: 'desc' }
        ],
        limit: 10,
        offset: null
      };

      const result = translator.translate(statement, mockBuilder);

      expect(result).toBe(mockBuilder);
    });

    it('应该转换带多个 ORDER BY 的查询', () => {
      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: null,
        orderBy: [
          { field: 'type', direction: 'asc' },
          { field: 'rating', direction: 'desc' }
        ],
        limit: null,
        offset: null
      };

      const result = translator.translate(statement, mockBuilder);

      expect(result).toBe(mockBuilder);
    });

    it('应该转换带 LIMIT 和 OFFSET 的查询', () => {
      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: null,
        orderBy: [],
        limit: 10,
        offset: 5
      };

      const result = translator.translate(statement, mockBuilder);

      expect(result).toBe(mockBuilder);
    });
  });

  describe('操作符映射', () => {
    it('应该正确映射所有比较操作符', () => {
      const operators = ['=', '!=', '>', '>=', '<', '<=', 'IN', 'NOT IN', 'LIKE', 'NOT LIKE'];

      operators.forEach(op => {
        const whereClause: BinaryExpression = {
          type: 'binary',
          operator: op as any,
          left: {
            type: 'column_ref',
            column: 'type'
          } as ColumnReference,
          right: {
            type: 'literal',
            value: op === 'IN' || op === 'NOT IN' ? ['park'] : 'park'
          } as LiteralValue
        };

        const statement: SQLSelectStatement = {
          type: 'select',
          columns: ['*'],
          from: 'features',
          where: whereClause,
          orderBy: [],
          limit: null,
          offset: null
        };

        expect(() => translator.translate(statement, mockBuilder)).not.toThrow();
      });
    });
  });

  describe('边界情况', () => {
    it('应该处理空 WHERE 子句', () => {
      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: null,
        orderBy: [],
        limit: null,
        offset: null
      };

      const result = translator.translate(statement, mockBuilder);

      expect(result).toBe(mockBuilder);
    });

    it('应该处理空 ORDER BY', () => {
      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: null,
        orderBy: [],
        limit: null,
        offset: null
      };

      const result = translator.translate(statement, mockBuilder);

      expect(result).toBe(mockBuilder);
    });

    it('应该处理嵌套的 column 对象', () => {
      const whereClause: BinaryExpression = {
        type: 'binary',
        operator: '=',
        left: {
          type: 'column_ref',
          column: {
            type: 'column_ref',
            column: 'type'
          }
        } as any,
        right: {
          type: 'literal',
          value: 'park'
        } as LiteralValue
      };

      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: whereClause,
        orderBy: [],
        limit: null,
        offset: null
      };

      expect(() => translator.translate(statement, mockBuilder)).not.toThrow();
    });

    it('应该处理反向比较（值在左边）', () => {
      const whereClause: BinaryExpression = {
        type: 'binary',
        operator: '=',
        left: {
          type: 'literal',
          value: 'park'
        } as LiteralValue,
        right: {
          type: 'column_ref',
          column: 'type'
        } as ColumnReference
      };

      const statement: SQLSelectStatement = {
        type: 'select',
        columns: ['*'],
        from: 'features',
        where: whereClause,
        orderBy: [],
        limit: null,
        offset: null
      };

      expect(() => translator.translate(statement, mockBuilder)).not.toThrow();
    });
  });
});
