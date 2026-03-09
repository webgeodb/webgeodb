import { describe, it, expect, beforeEach } from 'vitest';
import { WebGeoDB } from '../src';

describe('WebGeoDB', () => {
  let db: WebGeoDB;

  beforeEach(async () => {
    db = new WebGeoDB({
      name: 'test-db',
      version: 1
    });

    db.schema({
      features: {
        id: 'string',
        name: 'string',
        type: 'string',
        geometry: 'geometry',
        properties: 'json'
      }
    });

    await db.open();
    await db.features.clear();
  });

  describe('CRUD Operations', () => {
    it('should insert a feature', async () => {
      const id = await db.features.insert({
        id: '1',
        name: 'Point A',
        type: 'poi',
        geometry: {
          type: 'Point',
          coordinates: [30, 10]
        },
        properties: {
          category: 'restaurant'
        }
      });

      expect(id).toBe('1');

      const feature = await db.features.get('1');
      expect(feature).toBeDefined();
      expect(feature.name).toBe('Point A');
    });

    it('should insert multiple features', async () => {
      await db.features.insertMany([
        {
          id: '1',
          name: 'Point A',
          type: 'poi',
          geometry: { type: 'Point', coordinates: [30, 10] }
        },
        {
          id: '2',
          name: 'Point B',
          type: 'poi',
          geometry: { type: 'Point', coordinates: [31, 11] }
        }
      ]);

      const count = await db.features.count();
      expect(count).toBe(2);
    });

    it('should update a feature', async () => {
      await db.features.insert({
        id: '1',
        name: 'Point A',
        type: 'poi',
        geometry: { type: 'Point', coordinates: [30, 10] }
      });

      await db.features.update('1', {
        name: 'Point A Updated'
      });

      const feature = await db.features.get('1');
      expect(feature.name).toBe('Point A Updated');
    });

    it('should delete a feature', async () => {
      await db.features.insert({
        id: '1',
        name: 'Point A',
        type: 'poi',
        geometry: { type: 'Point', coordinates: [30, 10] }
      });

      await db.features.delete('1');

      const feature = await db.features.get('1');
      expect(feature).toBeUndefined();
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      await db.features.insertMany([
        {
          id: '1',
          name: 'Restaurant A',
          type: 'restaurant',
          geometry: { type: 'Point', coordinates: [30, 10] },
          properties: { rating: 4.5 }
        },
        {
          id: '2',
          name: 'Restaurant B',
          type: 'restaurant',
          geometry: { type: 'Point', coordinates: [31, 11] },
          properties: { rating: 4.0 }
        },
        {
          id: '3',
          name: 'Cafe A',
          type: 'cafe',
          geometry: { type: 'Point', coordinates: [32, 12] },
          properties: { rating: 4.8 }
        }
      ]);
    });

    it('should query by attribute', async () => {
      const results = await db.features
        .where('type', '=', 'restaurant')
        .toArray();

      expect(results).toHaveLength(2);
      expect(results.every(r => r.type === 'restaurant')).toBe(true);
    });

    it('should query with multiple conditions', async () => {
      const results = await db.features
        .where('type', '=', 'restaurant')
        .where('properties.rating', '>', 4.2)
        .toArray();

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Restaurant A');
    });

    it('should query with limit', async () => {
      const results = await db.features
        .where('type', '=', 'restaurant')
        .limit(1)
        .toArray();

      expect(results).toHaveLength(1);
    });

    it('should query with ordering', async () => {
      const results = await db.features
        .where('type', '=', 'restaurant')
        .orderBy('properties.rating', 'desc')
        .toArray();

      expect(results).toHaveLength(2);
      expect(results[0].properties.rating).toBe(4.5);
      expect(results[1].properties.rating).toBe(4.0);
    });
  });

  describe('Spatial Operations', () => {
    beforeEach(async () => {
      // 创建空间索引
      db.features.createIndex('geometry', { auto: true });

      await db.features.insertMany([
        {
          id: '1',
          name: 'Point A',
          type: 'poi',
          geometry: { type: 'Point', coordinates: [30, 10] }
        },
        {
          id: '2',
          name: 'Point B',
          type: 'poi',
          geometry: { type: 'Point', coordinates: [31, 11] }
        },
        {
          id: '3',
          name: 'Point C',
          type: 'poi',
          geometry: { type: 'Point', coordinates: [100, 100] }
        }
      ]);
    });

    it('should query by distance', async () => {
      const results = await db.features
        .distance('geometry', [30, 10], '<', 200000) // 200km
        .toArray();

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.id === '1')).toBe(true);
    });

    it('should query by intersection', async () => {
      const polygon = {
        type: 'Polygon' as const,
        coordinates: [
          [
            [29, 9],
            [32, 9],
            [32, 12],
            [29, 12],
            [29, 9]
          ]
        ]
      };

      const results = await db.features
        .intersects('geometry', polygon)
        .toArray();

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.id !== '3')).toBe(true);
    });
  });
});
