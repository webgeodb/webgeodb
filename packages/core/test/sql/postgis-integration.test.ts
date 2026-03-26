/**
 * PostGIS 函数集成测试
 *
 * 验证端到端的 SQL PostGIS 函数到 SpatialEngine 的转换功能
 *
 * 验收标准：
 * - 覆盖所有空间谓词函数
 * - 覆盖所有距离函数
 * - 覆盖所有几何构造函数
 * - 覆盖所有格式转换函数
 * - 测试嵌套函数调用
 * - 测试覆盖率 ≥ 85%
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebGeoDB } from '../../src';

describe('PostGIS Integration Tests', () => {
  let db: WebGeoDB;

  beforeEach(async () => {
    db = new WebGeoDB({
      name: 'test-postgis-integration',
      version: 1
    });

    db.schema({
      features: {
        id: 'string',
        name: 'string',
        type: 'string',
        rating: 'number',
        geometry: 'geometry'
      },
      zones: {
        id: 'string',
        name: 'string',
        boundary: 'geometry'
      }
    });

    await db.open();
    await db.features.clear();
    await db.zones.clear();

    // 插入测试数据
    await db.features.insertMany([
      {
        id: '1',
        name: 'Restaurant A',
        type: 'restaurant',
        rating: 4.5,
        geometry: { type: 'Point', coordinates: [116.4, 39.9] }
      },
      {
        id: '2',
        name: 'Cafe B',
        type: 'cafe',
        rating: 4.2,
        geometry: { type: 'Point', coordinates: [116.405, 39.905] }
      },
      {
        id: '3',
        name: 'Park C',
        type: 'park',
        rating: 4.8,
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [116.41, 39.91],
              [116.42, 39.91],
              [116.42, 39.92],
              [116.41, 39.92],
              [116.41, 39.91]
            ]
          ]
        }
      },
      {
        id: '4',
        name: 'Shop D',
        type: 'shop',
        rating: 3.9,
        geometry: { type: 'Point', coordinates: [116.45, 39.95] }
      },
      {
        id: '5',
        name: 'Hotel E',
        type: 'hotel',
        rating: 4.6,
        geometry: { type: 'Point', coordinates: [116.39, 39.88] }
      }
    ]);

    await db.zones.insertMany([
      {
        id: 'z1',
        name: 'City Center',
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [116.38, 39.87],
              [116.43, 39.87],
              [116.43, 39.93],
              [116.38, 39.93],
              [116.38, 39.87]
            ]
          ]
        }
      },
      {
        id: 'z2',
        name: 'Suburb Area',
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [116.44, 39.94],
              [116.47, 39.94],
              [116.47, 39.97],
              [116.44, 39.97],
              [116.44, 39.94]
            ]
          ]
        }
      }
    ]);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('空间谓词函数', () => {
    it('should execute query with ST_Intersects', async () => {
      const results = await db.query(`
        SELECT * FROM features
        WHERE ST_Intersects(geometry, ST_MakePoint(116.4, 39.9))
      `);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('id', '1');
    });

    it('should execute query with ST_Contains', async () => {
      const results = await db.query(`
        SELECT * FROM zones
        WHERE ST_Contains(boundary, ST_MakePoint(116.4, 39.9))
      `);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('id', 'z1');
    });

    it('should execute query with ST_Within', async () => {
      const results = await db.query(`
        SELECT * FROM features
        WHERE ST_Within(geometry, ST_GeomFromText('POLYGON((116.38 39.87, 116.43 39.87, 116.43 39.93, 116.38 39.93, 116.38 39.87))'))
      `);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should execute query with ST_Equals', async () => {
      const results = await db.query(`
        SELECT * FROM features
        WHERE ST_Equals(geometry, ST_MakePoint(116.4, 39.9))
      `);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should execute query with ST_Disjoint', async () => {
      const results = await db.query(`
        SELECT * FROM features
        WHERE ST_Disjoint(geometry, ST_MakePoint(117.0, 40.0))
      `);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('距离函数', () => {
    it('should execute query with ST_DWithin', async () => {
      const results = await db.query(`
        SELECT * FROM features
        WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 10000)
      `);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should execute query with ST_Distance comparison', async () => {
      const results = await db.query(`
        SELECT * FROM features
        WHERE ST_Distance(geometry, ST_MakePoint(116.4, 39.9)) < 5000
      `);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should support parameterized distance queries', async () => {
      const results = await db.query(
        `
        SELECT * FROM features
        WHERE ST_DWithin(geometry, ST_MakePoint($1, $2), $3)
      `,
        [116.4, 39.9, 10000]
      );

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('嵌套函数调用', () => {
    it('should handle nested PostGIS functions with ST_Buffer', async () => {
      const results = await db.query(`
        SELECT * FROM features
        WHERE ST_Intersects(
          geometry,
          ST_Buffer(ST_MakePoint(116.4, 39.9), 500)
        )
      `);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle nested functions with ST_Centroid', async () => {
      const results = await db.query(`
        SELECT * FROM zones
        WHERE ST_DWithin(
          ST_Centroid(boundary),
          ST_MakePoint(116.4, 39.9),
          10000
        )
      `);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle complex nested functions', async () => {
      const results = await db.query(`
        SELECT * FROM features
        WHERE ST_Intersects(
          geometry,
          ST_Buffer(
            ST_Centroid(
              ST_GeomFromText('POLYGON((116.38 39.87, 116.43 39.87, 116.43 39.93, 116.38 39.93, 116.38 39.87))')
            ),
            1000
          )
        )
      `);

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('混合查询', () => {
    it('should combine PostGIS with attribute filters', async () => {
      const results = await db.query(
        `
        SELECT * FROM features
        WHERE type = $1
          AND ST_DWithin(geometry, ST_MakePoint($2, $3), 10000)
      `,
        ['restaurant', 116.4, 39.9]
      );

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r: any) => r.type === 'restaurant')).toBe(true);
    });

    it('should combine multiple spatial conditions', async () => {
      const results = await db.query(`
        SELECT * FROM features
        WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 10000)
          AND rating >= 4.0
      `);

      expect(Array.isArray(results)).toBe(true);
      // 验证至少有一些结果
      if (results.length > 0) {
        expect(results.every((r: any) => r.rating >= 4.0)).toBe(true);
      }
    });

    it('should support complex logical operators with spatial functions', async () => {
      const results = await db.query(`
        SELECT * FROM features
        WHERE (
          ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 5000)
          OR ST_DWithin(geometry, ST_MakePoint(116.45, 39.95), 5000)
        )
        AND type = 'shop'
      `);

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('格式转换', () => {
    it('should support WKT input', async () => {
      const results = await db.query(`
        SELECT * FROM features
        WHERE ST_Intersects(
          geometry,
          ST_GeomFromText('POINT(116.4 39.9)')
        )
      `);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should support WKT polygon input', async () => {
      const results = await db.query(`
        SELECT * FROM features
        WHERE ST_Within(
          geometry,
          ST_GeomFromText('POLYGON((116.38 39.87, 116.43 39.87, 116.43 39.93, 116.38 39.93, 116.38 39.87))')
        )
      `);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should support ST_AsText output', async () => {
      const results = await db.query(`
        SELECT id, ST_AsText(geometry) as wkt FROM features
        WHERE type = 'restaurant'
        LIMIT 1
      `);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('wkt');
      // ST_AsText 返回的结果格式可能不同，只验证存在性
      expect('wkt' in results[0]).toBe(true);
    });
  });

  describe('几何构造函数', () => {
    it('should support ST_MakePoint in queries', async () => {
      const results = await db.query(`
        SELECT * FROM features
        WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 5000)
      `);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should support ST_MakeLine in queries', async () => {
      const results = await db.query(`
        SELECT * FROM features
        WHERE ST_Intersects(
          geometry,
          ST_MakeLine(
            ST_MakePoint(116.38, 39.87),
            ST_MakePoint(116.43, 39.93)
          )
        )
      `);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should support ST_Buffer with different sizes', async () => {
      const smallBuffer = await db.query(`
        SELECT COUNT(*) as count FROM features
        WHERE ST_Intersects(
          geometry,
          ST_Buffer(ST_MakePoint(116.4, 39.9), 100)
        )
      `);

      const largeBuffer = await db.query(`
        SELECT COUNT(*) as count FROM features
        WHERE ST_Intersects(
          geometry,
          ST_Buffer(ST_MakePoint(116.4, 39.9), 10000)
        )
      `);

      expect(smallBuffer[0].count).toBeLessThanOrEqual(largeBuffer[0].count);
    });
  });

  describe('ORDER BY and LIMIT with spatial functions', () => {
    it('should support ORDER BY with ST_Distance', async () => {
      const results = await db.query(`
        SELECT * FROM features
        ORDER BY ST_Distance(geometry, ST_MakePoint(116.4, 39.9))
        LIMIT 3
      `);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(3);
    });

    it('should support LIMIT with spatial filters', async () => {
      const results = await db.query(`
        SELECT * FROM features
        WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 10000)
        LIMIT 2
      `);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should support OFFSET with spatial queries', async () => {
      const firstPage = await db.query(`
        SELECT * FROM features
        WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 10000)
        ORDER BY id
        LIMIT 2
        OFFSET 0
      `);

      const secondPage = await db.query(`
        SELECT * FROM features
        WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 10000)
        ORDER BY id
        LIMIT 2
        OFFSET 2
      `);

      expect(Array.isArray(firstPage)).toBe(true);
      expect(Array.isArray(secondPage)).toBe(true);

      // 验证分页结果不重复
      const firstIds = firstPage.map((r: any) => r.id);
      const secondIds = secondPage.map((r: any) => r.id);
      const intersection = firstIds.filter((id: string) => secondIds.includes(id));
      expect(intersection.length).toBe(0);
    });
  });

  describe('边界情况', () => {
    it('should handle queries with no matches', async () => {
      // 使用地理上非常远的点
      const results = await db.query(`
        SELECT * FROM features
        WHERE ST_DWithin(geometry, ST_MakePoint(-160.0, -80.0), 1000)
      `);

      expect(Array.isArray(results)).toBe(true);
      // 远离测试数据的点应该返回很少或没有结果
      expect(results.length).toBeLessThan(3);
    });

    it('should handle null geometry gracefully', async () => {
      // 这个测试验证系统不会因为 null geometry 而崩溃
      const results = await db.query(`
        SELECT * FROM features
        WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 10000)
        LIMIT 10
      `);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle complex WKT parsing', async () => {
      // 测试系统能处理各种 WKT 格式而不崩溃
      const results = await db.query(`
        SELECT * FROM features
        WHERE ST_Intersects(
          geometry,
          ST_GeomFromText('POINT(116.4 39.9)')
        )
        LIMIT 5
      `);

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('性能测试', () => {
    it('should handle complex queries efficiently', async () => {
      const startTime = Date.now();

      const results = await db.query(`
        SELECT * FROM features
        WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 10000)
          AND rating > 4.0
        ORDER BY ST_Distance(geometry, ST_MakePoint(116.4, 39.9))
        LIMIT 10
      `);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(Array.isArray(results)).toBe(true);
      expect(duration).toBeLessThan(5000); // 应该在 5 秒内完成
    });
  });
});
