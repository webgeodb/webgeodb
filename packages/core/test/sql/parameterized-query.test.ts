import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebGeoDB } from '../../src';

describe('SQL 参数化查询测试', () => {
  let db: WebGeoDB;

  beforeEach(async () => {
    db = new WebGeoDB({
      name: 'test-parameterized-query',
      version: 1
    });

    db.schema({
      features: {
        id: 'string',
        name: 'string',
        type: 'string',
        rating: 'number',
        active: 'boolean'
      }
    });

    await db.open();
    await db.features.clear();

    // 插入测试数据
    await db.features.insertMany([
      { id: '1', name: 'Cafe A', type: 'cafe', rating: 4.5, active: true },
      { id: '2', name: 'Restaurant B', type: 'restaurant', rating: 3.8, active: true },
      { id: '3', name: 'Cafe C', type: 'cafe', rating: 4.2, active: false },
      { id: '4', name: 'Bar D', type: 'bar', rating: 4.0, active: true },
      { id: '5', name: 'Restaurant E', type: 'restaurant', rating: 3.5, active: false }
    ]);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('PostgreSQL 风格参数占位符 ($1, $2)', () => {
    it('应该支持单个参数查询', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE type = $1',
        ['cafe']
      );

      expect(results).toHaveLength(2);
      expect(results.every(r => r.type === 'cafe')).toBe(true);
    });

    it('应该支持多个参数查询', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE type = $1 AND active = $2',
        ['cafe', true]
      );

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Cafe A');
    });

    it('应该支持参数化数字查询', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE rating >= $1',
        [4.0]
      );

      expect(results).toHaveLength(3);
      expect(results.every(r => r.rating >= 4.0)).toBe(true);
    });

    it('应该支持混合类型参数', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE type = $1 AND rating >= $2 AND active = $3',
        ['restaurant', 3.5, true]
      );

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Restaurant B');
    });

    it('应该支持 LIKE 操作符参数化', async () => {
      const results = await db.query(
        "SELECT * FROM features WHERE name LIKE $1",
        ['%Cafe%']
      );

      expect(results).toHaveLength(2);
      expect(results.every(r => r.name.includes('Cafe'))).toBe(true);
    });

    it('应该支持 IN 操作符参数化', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE type IN ($1, $2)',
        ['cafe', 'bar']
      );

      expect(results).toHaveLength(3);
    });

    it('应该支持 BETWEEN 操作符参数化', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE rating BETWEEN $1 AND $2',
        [3.8, 4.5]
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.rating >= 3.8 && r.rating <= 4.5)).toBe(true);
    });
  });

  describe('参数化查询预编译语句', () => {
    it('应该支持 prepare 方法', async () => {
      const stmt = db.prepare('SELECT * FROM features WHERE type = $1 AND active = $2');
      
      expect(stmt).toBeDefined();
      expect(stmt.getParameterCount()).toBe(2);
      expect(stmt.getSQL()).toBe('SELECT * FROM features WHERE type = $1 AND active = $2');
    });

    it('应该支持预编译语句的 execute 方法', async () => {
      const stmt = db.prepare('SELECT * FROM features WHERE type = $1');
      const results = await stmt.execute(['cafe']);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.type === 'cafe')).toBe(true);
    });

    it('应该支持预编译语句的多次执行', async () => {
      const stmt = db.prepare('SELECT * FROM features WHERE type = $1');
      
      const results1 = await stmt.execute(['cafe']);
      const results2 = await stmt.execute(['restaurant']);
      const results3 = await stmt.execute(['bar']);

      expect(results1).toHaveLength(2);
      expect(results2).toHaveLength(2);
      expect(results3).toHaveLength(1);
    });
  });

  describe('参数化查询错误处理', () => {
    it('应该在参数数量不足时抛出错误', async () => {
      await expect(
        db.query('SELECT * FROM features WHERE type = $1 AND active = $2', ['cafe'])
      ).rejects.toThrow();
    });

    it('应该在 SQL 语法错误时抛出错误', async () => {
      await expect(
        db.query('SELECT * FROM WHERE type = $1', ['cafe'])
      ).rejects.toThrow();
    });

    it('应该正确处理 NULL 参数', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE type = $1',
        [null]
      );

      expect(results).toHaveLength(0);
    });
  });

  describe('参数化查询性能', () => {
    it('应该支持查询缓存', async () => {
      const sql = 'SELECT * FROM features WHERE type = $1';
      
      const results1 = await db.query(sql, ['cafe'], { useCache: true });
      const results2 = await db.query(sql, ['restaurant'], { useCache: true });

      expect(results1).toHaveLength(2);
      expect(results2).toHaveLength(2);
    });
  });
});
