/**
 * Validation Schemas
 * Zod schemas for validating input data
 */

import { z } from 'zod';

export class ValidationSchema {
  /**
   * Point schema
   */
  static readonly point = z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90)
    ])
  });

  /**
   * Polygon schema
   */
  static readonly polygon = z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(
      z.array(
        z.tuple([
          z.number().min(-180).max(180),
          z.number().min(-90).max(90)
        ])
      ).min(3)
    ).min(1)
  });

  /**
   * Circle schema (non-standard but useful)
   */
  static readonly circle = z.object({
    type: z.literal('Circle'),
    center: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    }),
    radius: z.number().positive().max(10000000) // 10,000 km max
  });

  /**
   * Bounding box schema
   */
  static readonly boundingBox = z.object({
    type: z.literal('BoundingBox'),
    min: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    }),
    max: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    })
  });

  /**
   * Query parameters schema
   */
  static readonly query = z.object({
    type: z.enum(['near', 'within', 'bbox', 'polygon']),
    center: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    }).optional(),
    radius: z.number().positive().max(10000000).optional(),
    coordinates: z.array(z.number()).optional(),
    bbox: z.array(z.number()).length(4).optional(),
    limit: z.number().int().positive().max(10000).default(100),
    offset: z.number().int().nonnegative().default(0)
  });

  /**
   * User ID schema
   */
  static readonly userId = z.string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9_-]+$/, 'User ID can only contain alphanumeric characters, hyphens, and underscores');

  /**
   * Metadata schema
   */
  static readonly metadata = z.record(z.any()).refine(
    (data) => {
      // Check size (max 10KB)
      const size = JSON.stringify(data).length;
      return size <= 10240;
    },
    'Metadata size exceeds 10KB limit'
  );

  /**
   * Batch operation schema
   */
  static readonly batchOperation = z.object({
    type: z.enum(['insert', 'update', 'delete']),
    items: z.array(z.any()).min(1).max(1000)
  });

  /**
   * Search query schema
   */
  static readonly searchQuery = z.object({
    query: z.string().min(1).max(500),
    filters: z.record(z.any()).optional(),
    sort: z.array(z.object({
      field: z.string(),
      order: z.enum(['asc', 'desc'])
    })).optional(),
    limit: z.number().int().positive().max(1000).default(50)
  });
}
