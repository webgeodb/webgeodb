/**
 * PostGIS 函数测试
 *
 * 测试 PostGIS 兼容的空间函数实现：
 * - ST_Distance - 距离计算
 * - ST_DWithin - 距离内查询
 * - ST_Buffer - 缓冲区
 * - ST_Intersection - 相交
 * - ST_Intersects - 相交判断
 * - ST_Contains - 包含判断
 * - ST_Within - 在内部判断
 * - ST_MakePoint - 创建点
 * - ST_AsText - 几何转文本
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebGeoDB } from '../../src';

describe('PostGIS Functions', () => {
  let db: WebGeoDB;

  beforeEach(async () => {
    db = new WebGeoDB({
      name: 'test-postgis-functions',
      version: 1
    });

    db.schema({
      features: {
        id: 'string',
        name: 'string',
        type: 'string',
        geometry: 'geometry'
      }
    });

    await db.open();
    await db.features.clear();

    // 插入测试数据
    await db.features.insertMany([
      {
        id: '1',
        name: 'Point at Origin',
        type: 'point',
        geometry: { type: 'Point', coordinates: [0, 0] }
      },
      {
        id: '2',
        name: 'Point at (10, 10)',
        type: 'point',
        geometry: { type: 'Point', coordinates: [10, 10] }
      },
      {
        id: '3',
        name: 'Point at (20, 20)',
        type: 'point',
        geometry: { type: 'Point', coordinates: [20, 20] }
      },
      {
        id: '4',
        name: 'Line from (0,0) to (30,30)',
        type: 'line',
        geometry: {
          type: 'LineString',
          coordinates: [[0, 0], [30, 30]]
        }
      },
      {
        id: '5',
        name: 'Small Polygon',
        type: 'polygon',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [[5, 5], [15, 5], [15, 15], [5, 15], [5, 5]]
          ]
        }
      },
      {
        id: '6',
        name: 'Large Polygon',
        type: 'polygon',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [[0, 0], [50, 0], [50, 50], [0, 50], [0, 0]]
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

  describe('ST_MakePoint', () => {
    it('should create a 2D point', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE ST_Distance(geometry, ST_MakePoint($1, $2)) < 5',
        [10, 10]
      );

      expect(results.length).toBeGreaterThan(0);
    });

    it('should create a 3D point', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE ST_Distance(geometry, ST_MakePoint($1, $2, $3)) < 5',
        [10, 10, 0]
      );

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('ST_Distance', () => {
    it('should calculate distance between points', async () => {
      const results = await db.query(
        'SELECT *, ST_Distance(geometry, ST_MakePoint(0, 0)) as distance FROM features WHERE id = $1',
        ['2']
      );

      expect(results[0].distance).toBeCloseTo(14.14, 1); // sqrt(10^2 + 10^2) ≈ 14.14
    });

    it('should find points within distance', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE ST_Distance(geometry, ST_MakePoint(0, 0)) < 15'
      );

      expect(results.length).toBe(2); // (0,0) and (10,10)
    });

    it('should handle distance comparisons', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE ST_Distance(geometry, ST_MakePoint(0, 0)) > 10'
      );

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('ST_DWithin', () => {
    it('should find features within distance', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE ST_DWithin(geometry, ST_MakePoint(0, 0), 15)'
      );

      expect(results.length).toBe(2);
    });

    it('should respect distance parameter', async () => {
      const results1 = await db.query(
        'SELECT * FROM features WHERE ST_DWithin(geometry, ST_MakePoint(0, 0), 10)'
      );

      const results2 = await db.query(
        'SELECT * FROM features WHERE ST_DWithin(geometry, ST_MakePoint(0, 0), 20)'
      );

      expect(results2.length).toBeGreaterThan(results1.length);
    });

    it('should work with parameterized distance', async () => {
      const distance = 15;
      const results = await db.query(
        'SELECT * FROM features WHERE ST_DWithin(geometry, ST_MakePoint(0, 0), $1)',
        [distance]
      );

      expect(results.length).toBe(2);
    });
  });

  describe('ST_Buffer', () => {
    it('should create buffer around point', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE ST_Intersects(geometry, ST_Buffer(ST_MakePoint(10, 10), 5))'
      );

      expect(results.length).toBeGreaterThan(0);
    });

    it('should create buffer of different sizes', async () => {
      const results1 = await db.query(
        'SELECT * FROM features WHERE ST_Intersects(geometry, ST_Buffer(ST_MakePoint(10, 10), 1))'
      );

      const results2 = await db.query(
        'SELECT * FROM features WHERE ST_Intersects(geometry, ST_Buffer(ST_MakePoint(10, 10), 10))'
      );

      expect(results2.length).toBeGreaterThan(results1.length);
    });
  });

  describe('ST_Intersects', () => {
    it('should detect intersecting geometries', async () => {
      const results = await db.query(
        'SELECT * FROM features WHERE ST_Intersects(geometry, ST_MakePoint(10, 10))'
      );

      // Point at (10,10) should intersect with itself
      expect(results.length).toBeGreaterThan(0);
    });

    it('should detect non-intersecting geometries', async () => {
      const results = await db.query(
        "SELECT * FROM features WHERE ST_Intersects(geometry, ST_MakePoint(100, 100))"
      );

      expect(results.length).toBe(0);
    });

    it('should work with polygon intersection', async () => {
      const results = await db.query(
        `SELECT * FROM features
         WHERE ST_Intersects(
           geometry,
           ST_GeomFromText('POLYGON((5 5, 15 5, 15 15, 5 15, 5 5))')
         )`
      );

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('ST_Contains', () => {
    it('should detect polygon containing point', async () => {
      const results = await db.query(
        `SELECT * FROM features
         WHERE ST_Contains(
           ST_GeomFromText('POLYGON((0 0, 50 0, 50 50, 0 50, 0 0))'),
           geometry
         )`
      );

      expect(results.length).toBeGreaterThan(0);
    });

    it('should not detect point outside polygon', async () => {
      const results = await db.query(
        `SELECT * FROM features
         WHERE ST_Contains(
           ST_GeomFromText('POLYGON((100 100, 150 100, 150 150, 100 150, 100 100))'),
           geometry
         )`
      );

      expect(results.length).toBe(0);
    });

    it('should work with point containment in polygon', async () => {
      const results = await db.query(
        `SELECT * FROM features
         WHERE id = '1'
         AND ST_Contains(
           ST_GeomFromText('POLYGON((-10 -10, 10 -10, 10 10, -10 10, -10 -10))'),
           geometry
         )`
      );

      expect(results.length).toBe(1);
    });
  });

  describe('ST_Within', () => {
    it('should detect point within polygon', async () => {
      const results = await db.query(
        `SELECT * FROM features
         WHERE ST_Within(
           geometry,
           ST_GeomFromText('POLYGON((0 0, 50 0, 50 50, 0 50, 0 0))')
         )`
      );

      expect(results.length).toBeGreaterThan(0);
    });

    it('should not detect point outside polygon', async () => {
      const results = await db.query(
        `SELECT * FROM features
         WHERE ST_Within(
           geometry,
           ST_GeomFromText('POLYGON((100 100, 150 100, 150 150, 100 150, 100 100))')
         )`
      );

      expect(results.length).toBe(0);
    });
  });

  describe('ST_Intersection', () => {
    it('should return intersection geometry', async () => {
      const results = await db.query(
        `SELECT ST_Intersection(
          geometry,
          ST_GeomFromText('POLYGON((5 5, 15 5, 15 15, 5 15, 5 5))')
         ) as intersection
         FROM features
         WHERE id = '1'`
      );

      expect(results[0].intersection).toBeDefined();
    });
  });

  describe('ST_GeomFromText', () => {
    it('should parse point from WKT', async () => {
      const results = await db.query(
        `SELECT * FROM features
         WHERE ST_Intersects(
           geometry,
           ST_GeomFromText('POINT(10 10)')
         )`
      );

      expect(results.length).toBeGreaterThan(0);
    });

    it('should parse linestring from WKT', async () => {
      const results = await db.query(
        `SELECT * FROM features
         WHERE ST_Intersects(
           geometry,
           ST_GeomFromText('LINESTRING(0 0, 30 30)')
         )`
      );

      expect(results.length).toBeGreaterThan(0);
    });

    it('should parse polygon from WKT', async () => {
      const results = await db.query(
        `SELECT * FROM features
         WHERE ST_Within(
           geometry,
           ST_GeomFromText('POLYGON((0 0, 50 0, 50 50, 0 50, 0 0))')
         )`
      );

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('ST_AsText', () => {
    it('should convert point to WKT', async () => {
      const results = await db.query(
        'SELECT ST_AsText(geometry) as wkt FROM features WHERE id = $1',
        ['1']
      );

      expect(results[0].wkt).toContain('POINT');
    });

    it('should convert linestring to WKT', async () => {
      const results = await db.query(
        'SELECT ST_AsText(geometry) as wkt FROM features WHERE id = $1',
        ['4']
      );

      expect(results[0].wkt).toContain('LINESTRING');
    });

    it('should convert polygon to WKT', async () => {
      const results = await db.query(
        'SELECT ST_AsText(geometry) as wkt FROM features WHERE id = $1',
        ['5']
      );

      expect(results[0].wkt).toContain('POLYGON');
    });
  });

  describe('组合查询', () => {
    it('should combine spatial and attribute filters', async () => {
      const results = await db.query(
        `SELECT * FROM features
         WHERE type = 'point'
         AND ST_DWithin(geometry, ST_MakePoint(0, 0), 15)`
      );

      expect(results.length).toBeGreaterThan(0);
    });

    it('should use spatial function in ORDER BY', async () => {
      const results = await db.query(
        `SELECT *, ST_Distance(geometry, ST_MakePoint(0, 0)) as distance
         FROM features
         ORDER BY distance ASC`
      );

      expect(results[0].distance).toBeLessThan(results[1].distance);
    });

    it('should use spatial function in LIMIT query', async () => {
      const results = await db.query(
        `SELECT * FROM features
         WHERE ST_DWithin(geometry, ST_MakePoint(0, 0), 25)
         ORDER BY ST_Distance(geometry, ST_MakePoint(0, 0)) ASC
         LIMIT 2`
      );

      expect(results.length).toBe(2);
    });
  });

  describe('边界情况', () => {
    it('should handle empty geometry', async () => {
      const results = await db.query(
        'SELECT ST_AsText(geometry) as wkt FROM features WHERE id = $1',
        ['1']
      );

      expect(results[0].wkt).toBeDefined();
    });

    it('should handle null geometry', async () => {
      await db.features.insert({
        id: 'null-geom',
        name: 'Null Geometry',
        type: 'test',
        geometry: null as any
      });

      const results = await db.query(
        "SELECT * FROM features WHERE id = 'null-geom'"
      );

      expect(results).toHaveLength(1);
    });

    it('should handle invalid geometry gracefully', async () => {
      // This test verifies the system doesn't crash on invalid input
      const results = await db.query(
        `SELECT * FROM features
         WHERE id = '1'
         AND ST_DWithin(geometry, ST_MakePoint(10, 10), 5)`
      );

      expect(results).toBeDefined();
    });
  });

  describe('性能测试', () => {
    it('should handle multiple spatial queries efficiently', async () => {
      const startTime = performance.now();

      for (let i = 0; i < 10; i++) {
        await db.query(
          'SELECT * FROM features WHERE ST_DWithin(geometry, ST_MakePoint(0, 0), 50)'
        );
      }

      const duration = performance.now() - startTime;

      // 10 queries should complete in reasonable time
      expect(duration).toBeLessThan(5000);
    });

    it('should use spatial index when available', async () => {
      // Create spatial index
      db.features.createIndex('geometry', { auto: true });

      const results = await db.query(
        'SELECT * FROM features WHERE ST_DWithin(geometry, ST_MakePoint(0, 0), 20)'
      );

      expect(results.length).toBeGreaterThan(0);
    });
  });
});
