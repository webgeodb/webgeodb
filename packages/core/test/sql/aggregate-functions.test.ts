import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebGeoDB } from '../../src';

describe('SQL 聚合函数测试', () => {
  let db: WebGeoDB;

  beforeEach(async () => {
    db = new WebGeoDB({
      name: 'test-aggregate-functions',
      version: 1
    });

    db.schema({
      products: {
        id: 'string',
        name: 'string',
        category: 'string',
        price: 'number',
        quantity: 'number',
        active: 'boolean'
      }
    });

    await db.open();
    await db.products.clear();

    // 插入测试数据
    await db.products.insertMany([
      { id: '1', name: 'Product A', category: 'Electronics', price: 100, quantity: 5, active: true },
      { id: '2', name: 'Product B', category: 'Electronics', price: 200, quantity: 3, active: true },
      { id: '3', name: 'Product C', category: 'Books', price: 50, quantity: 10, active: true },
      { id: '4', name: 'Product D', category: 'Books', price: 30, quantity: 15, active: false },
      { id: '5', name: 'Product E', category: 'Electronics', price: 150, quantity: 7, active: true },
      { id: '6', name: 'Product F', category: 'Books', price: 40, quantity: 20, active: false }
    ]);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('COUNT 函数', () => {
    it('应该支持 COUNT(*)', async () => {
      const results = await db.query('SELECT COUNT(*) as count FROM products');

      expect(results).toHaveLength(1);
      expect(results[0].count).toBe(6);
    });

    it('应该支持 COUNT(column)', async () => {
      const results = await db.query('SELECT COUNT(id) as count FROM products');

      expect(results).toHaveLength(1);
      expect(results[0].count).toBe(6);
    });

    it('应该支持 COUNT with WHERE', async () => {
      const results = await db.query(
        'SELECT COUNT(*) as count FROM products WHERE active = true'
      );

      expect(results).toHaveLength(1);
      expect(results[0].count).toBe(4);
    });

    it('应该支持 COUNT with GROUP BY', async () => {
      const results = await db.query(
        'SELECT category, COUNT(*) as count FROM products GROUP BY category'
      );

      expect(results).toHaveLength(2);
      
      const electronics = results.find(r => r.category === 'Electronics');
      const books = results.find(r => r.category === 'Books');
      
      expect(electronics?.count).toBe(3);
      expect(books?.count).toBe(3);
    });
  });

  describe('SUM 函数', () => {
    it('应该支持 SUM(column)', async () => {
      const results = await db.query('SELECT SUM(price) as total FROM products');

      expect(results).toHaveLength(1);
      expect(results[0].total).toBe(570); // 100+200+50+30+150+40
    });

    it('应该支持 SUM with WHERE', async () => {
      const results = await db.query(
        'SELECT SUM(price) as total FROM products WHERE active = true'
      );

      expect(results).toHaveLength(1);
      expect(results[0].total).toBe(500); // 100+200+150
    });

    it('应该支持 SUM with GROUP BY', async () => {
      const results = await db.query(
        'SELECT category, SUM(price) as total FROM products GROUP BY category'
      );

      expect(results).toHaveLength(2);
      
      const electronics = results.find(r => r.category === 'Electronics');
      const books = results.find(r => r.category === 'Books');
      
      expect(electronics?.total).toBe(450); // 100+200+150
      expect(books?.total).toBe(120); // 50+30+40
    });
  });

  describe('AVG 函数', () => {
    it('应该支持 AVG(column)', async () => {
      const results = await db.query('SELECT AVG(price) as average FROM products');

      expect(results).toHaveLength(1);
      expect(results[0].average).toBeCloseTo(95, 0); // 570/6 = 95
    });

    it('应该支持 AVG with WHERE', async () => {
      const results = await db.query(
        'SELECT AVG(price) as average FROM products WHERE active = true'
      );

      expect(results).toHaveLength(1);
      expect(results[0].average).toBeCloseTo(125, 0); // 500/4 = 125
    });

    it('应该支持 AVG with GROUP BY', async () => {
      const results = await db.query(
        'SELECT category, AVG(price) as average FROM products GROUP BY category'
      );

      expect(results).toHaveLength(2);
      
      const electronics = results.find(r => r.category === 'Electronics');
      const books = results.find(r => r.category === 'Books');
      
      expect(electronics?.average).toBeCloseTo(150, 0); // 450/3 = 150
      expect(books?.average).toBeCloseTo(40, 0); // 120/3 = 40
    });
  });

  describe('MIN 函数', () => {
    it('应该支持 MIN(column)', async () => {
      const results = await db.query('SELECT MIN(price) as min_price FROM products');

      expect(results).toHaveLength(1);
      expect(results[0].min_price).toBe(30);
    });

    it('应该支持 MIN with WHERE', async () => {
      const results = await db.query(
        'SELECT MIN(price) as min_price FROM products WHERE category = "Electronics"'
      );

      expect(results).toHaveLength(1);
      expect(results[0].min_price).toBe(100);
    });
  });

  describe('MAX 函数', () => {
    it('应该支持 MAX(column)', async () => {
      const results = await db.query('SELECT MAX(price) as max_price FROM products');

      expect(results).toHaveLength(1);
      expect(results[0].max_price).toBe(200);
    });

    it('应该支持 MAX with WHERE', async () => {
      const results = await db.query(
        'SELECT MAX(price) as max_price FROM products WHERE active = true'
      );

      expect(results).toHaveLength(1);
      expect(results[0].max_price).toBe(200);
    });
  });

  describe('组合聚合函数', () => {
    it('应该在同一查询中支持多个聚合函数', async () => {
      const results = await db.query(
        'SELECT COUNT(*) as count, SUM(price) as total, AVG(price) as avg, MIN(price) as min, MAX(price) as max FROM products'
      );

      expect(results).toHaveLength(1);
      expect(results[0].count).toBe(6);
      expect(results[0].total).toBe(570);
      expect(results[0].avg).toBeCloseTo(95, 0);
      expect(results[0].min).toBe(30);
      expect(results[0].max).toBe(200);
    });

    it('应该支持聚合函数与 GROUP BY 的组合', async () => {
      const results = await db.query(
        `SELECT category, 
         COUNT(*) as count, 
         SUM(price) as total, 
         AVG(price) as avg, 
         MIN(price) as min, 
         MAX(price) as max 
         FROM products 
         GROUP BY category`
      );

      expect(results).toHaveLength(2);
      
      const electronics = results.find(r => r.category === 'Electronics');
      const books = results.find(r => r.category === 'Books');
      
      expect(electronics?.count).toBe(3);
      expect(electronics?.total).toBe(450);
      expect(electronics?.avg).toBeCloseTo(150, 0);
      expect(electronics?.min).toBe(100);
      expect(electronics?.max).toBe(200);
      
      expect(books?.count).toBe(3);
      expect(books?.total).toBe(120);
      expect(books?.avg).toBeCloseTo(40, 0);
      expect(books?.min).toBe(30);
      expect(books?.max).toBe(50);
    });
  });

  describe('聚合函数与 HAVING', () => {
    it('应该支持 HAVING 子句过滤聚合结果', async () => {
      const results = await db.query(
        `SELECT category, COUNT(*) as count 
         FROM products 
         GROUP BY category 
         HAVING count > 2`
      );

      expect(results).toHaveLength(2);
      expect(results.every(r => r.count > 2)).toBe(true);
    });

    it('应该支持 HAVING with 聚合函数', async () => {
      const results = await db.query(
        `SELECT category, SUM(price) as total 
         FROM products 
         GROUP BY category 
         HAVING total > 200`
      );

      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('Electronics');
      expect(results[0].total).toBe(450);
    });
  });
});
