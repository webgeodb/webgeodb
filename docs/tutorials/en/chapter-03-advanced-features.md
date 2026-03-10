# Chapter 3: Advanced Features and Optimization

> **Learning Time**: 60-90 minutes | **Prerequisites**: Chapter 1 - Getting Started, Chapter 2 - Spatial Queries

## Learning Objectives

By completing this chapter, you will be able to:
- Master WebGeoDB's geometry calculation engine and spatial analysis features
- Understand transaction management and concurrency control
- Apply performance optimization techniques to improve application responsiveness
- Implement robust error handling and data validation
- Complete data import and export operations

---

## Core Concepts

### 3.1 Geometry Calculation Engine

WebGeoDB integrates a powerful geometry calculation engine that supports complex spatial analysis operations. By integrating Turf.js and JSTS libraries, you can perform various spatial calculations directly in the browser.

#### Key Points

- **Turf.js**: Lightweight spatial analysis library for fast calculations
- **JSTS**: JavaScript port of Java Topology Suite with more powerful features
- **Spatial Operations**: Buffer analysis, intersection, union, difference, etc.
- **Measurement Functions**: Distance, area, and length calculations

#### Turf.js Integration

**Example Code:**
```typescript
import { WebGeoDB } from '@webgeodb/core';
import * as turf from '@turf/turf';

// Initialize database
const db = new WebGeoDB({ name: 'city-planning' });
await db.open();

// Create city zone
const cityZone = {
  id: 'zone-1',
  name: 'Commercial District',
  type: 'zone',
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [116.404, 39.915],
      [116.404, 39.925],
      [116.414, 39.925],
      [116.414, 39.915],
      [116.404, 39.915]
    ]]
  }
};

await db.features.insert(cityZone);

// Create buffer (e.g., create 1km service area)
const point = {
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [116.404, 39.915]
  }
};

const buffer = turf.buffer(point, 1, { units: 'kilometers' });

console.log('Buffer area:', turf.area(buffer), 'square meters');
// Output: Buffer area: 3141592.653589793 square meters
```

#### JSTS Integration

**Example Code:**
```typescript
import { WebGeoDB } from '@webgeodb/core';
import jsts from 'jsts';

// Initialize JSTS geometry factory
const geometryFactory = new jsts.geom.GeometryFactory();
const reader = new jsts.io.GeoJSONReader();
const writer = new jsts.io.GeoJSONWriter();

// Create two polygons
const polygon1GeoJSON = {
  type: 'Polygon',
  coordinates: [[
    [0, 0], [10, 0], [10, 10], [0, 10], [0, 0]
  ]]
};

const polygon2GeoJSON = {
  type: 'Polygon',
  coordinates: [[
    [5, 5], [15, 5], [15, 15], [5, 15], [5, 5]
  ]]
};

// Convert to JSTS geometry objects
const geom1 = reader.read(JSON.stringify(polygon1GeoJSON));
const geom2 = reader.read(JSON.stringify(polygon2GeoJSON));

// Calculate intersection
const intersection = geom1.intersection(geom2);
const intersectionGeoJSON = writer.write(intersection);

console.log('Intersection area:', intersection.getArea());
// Output: Intersection area: 25

// Calculate union
const union = geom1.union(geom2);
const unionGeoJSON = writer.write(union);

console.log('Union area:', union.getArea());
// Output: Union area: 175

// Store results
await db.features.insert({
  id: 'intersection',
  name: 'Zone Intersection',
  geometry: JSON.parse(JSON.stringify(intersectionGeoJSON))
});
```

#### Spatial Calculation Operations

**Example Code:**
```typescript
import * as turf from '@turf/turf';

// 1. Calculate distance between two points
const point1 = turf.point([116.404, 39.915]);
const point2 = turf.point([116.414, 39.925]);

const distance = turf.distance(point1, point2, { units: 'kilometers' });
console.log('Distance:', distance.toFixed(2), 'km');
// Output: Distance: 1.57 km

// 2. Calculate polygon area
const polygon = turf.polygon([[
  [116.404, 39.915],
  [116.404, 39.925],
  [116.414, 39.925],
  [116.414, 39.915],
  [116.404, 39.915]
]]);

const area = turf.area(polygon);
console.log('Area:', (area / 1000000).toFixed(2), 'sq km');
// Output: Area: 1.24 sq km

// 3. Calculate linestring length
const line = turf.lineString([
  [116.404, 39.915],
  [116.414, 39.925],
  [116.424, 39.935]
]);

const length = turf.length(line, { units: 'kilometers' });
console.log('Length:', length.toFixed(2), 'km');
// Output: Length: 2.21 km

// 4. Check if point is within polygon
const pt = turf.point([116.409, 39.920]);
const isInside = turf.booleanPointInPolygon(pt, polygon);

console.log('Point inside polygon:', isInside);
// Output: Point inside polygon: true
```

> **💡 Tip:** Turf.js is suitable for rapid prototyping and small projects, while JSTS is better for enterprise applications requiring complex geometry operations. Choose based on your specific needs.

---

### 3.2 Transaction Management

Transactions are key mechanisms for ensuring data consistency. WebGeoDB provides ACID (Atomicity, Consistency, Isolation, Durability) guarantees based on IndexedDB's transaction features.

#### Key Points

- **Atomicity**: All operations in a transaction either succeed completely or fail completely
- **Consistency**: Database remains in a consistent state before and after transactions
- **Isolation**: Concurrent transactions are isolated from each other
- **Durability**: Once a transaction is committed, changes are permanently saved

#### Basic Transaction Operations

**Example Code:**
```typescript
import { WebGeoDB } from '@webgeodb/core';

const db = new WebGeoDB({ name: 'city-planning' });
await db.open();

// Read-write transaction: Insert new zone and update statistics
try {
  await db.transaction('rw', [db.features, db.statistics], async () => {
    // 1. Insert new zone
    const newZone = {
      id: 'zone-2',
      name: 'Residential District',
      type: 'zone',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [116.420, 39.915],
          [116.420, 39.925],
          [116.430, 39.925],
          [116.430, 39.915],
          [116.420, 39.915]
        ]]
      }
    };

    await db.features.insert(newZone);

    // 2. Update statistics
    const stats = await db.statistics.get('zone-count');
    await db.statistics.update('zone-count', {
      count: stats.count + 1,
      updatedAt: Date.now()
    });

    // If any operation fails, the entire transaction rolls back
  });

  console.log('Transaction committed successfully');
} catch (error) {
  console.error('Transaction failed:', error);
  // Transaction already rolled back
}
```

#### Concurrency Control

**Example Code:**
```typescript
// Use optimistic locking for concurrent updates
async function updateFeatureWithLock(
  id: string,
  updates: any,
  expectedVersion: number
) {
  try {
    await db.transaction('rw', db.features, async () => {
      const current = await db.features.get(id);

      // Check version
      if (current.version !== expectedVersion) {
        throw new Error(`Version conflict: expected ${expectedVersion}, actual ${current.version}`);
      }

      // Update data and increment version
      await db.features.update(id, {
        ...updates,
        version: current.version + 1,
        updatedAt: Date.now()
      });
    });

    console.log('Update successful');
  } catch (error) {
    console.error('Update failed:', error.message);
    throw error;
  }
}

// Usage
const feature = await db.features.get('zone-1');
const currentVersion = feature.version || 0;

try {
  await updateFeatureWithLock('zone-1', { name: 'New Name' }, currentVersion);
} catch (error) {
  if (error.message.includes('Version conflict')) {
    console.warn('Data modified by another operation, please refresh and retry');
    // Re-fetch data or prompt user
  }
}
```

#### Transaction Isolation Levels

**Example Code:**
```typescript
// Read-only transaction: Better performance for queries
async function getZoneStatistics() {
  return await db.transaction('r', db.features, async () => {
    const zones = await db.features
      .where('type', '=', 'zone')
      .toArray();

    const totalArea = zones.reduce((sum, zone) => {
      return sum + calculateArea(zone.geometry);
    }, 0);

    return {
      count: zones.length,
      totalArea
    };
  });
}

// Read-write transaction: For data modifications
async function addZoneAndLog(zoneData: any) {
  await db.transaction('rw', [db.features, db.auditLog], async () => {
    // Add zone
    await db.features.insert(zoneData);

    // Log audit trail
    await db.auditLog.insert({
      action: 'create',
      entity: 'zone',
      entityId: zoneData.id,
      timestamp: Date.now(),
      user: 'current-user'
    });
  });
}
```

> **💡 Tip:** Read-only transactions can execute concurrently, while read-write transactions lock related tables. Avoid long-running operations within transactions to minimize lock time.

---

### 3.3 Performance Optimization

Performance optimization is critical for building production-grade applications. WebGeoDB provides various optimization techniques that can significantly improve query and data operation performance.

#### Key Points

- **Batch Operations**: Use `insertMany` instead of looping `insert`
- **Index Optimization**: Create spatial indexes for frequently queried fields
- **Query Optimization**: Combine conditions, pagination, projection
- **Caching Strategy**: Use in-memory cache to reduce database access

#### Batch Operation Optimization

**Example Code:**
```typescript
import { WebGeoDB } from '@webgeodb/core';

const db = new WebGeoDB({ name: 'city-planning' });
await db.open();

// ❌ Not recommended: Loop insert
const features = generateFeatures(1000);

console.time('Loop insert');
for (const feature of features) {
  await db.features.insert(feature);
}
console.timeEnd('Loop insert');
// Output: Loop insert: 2341.234ms

// ✅ Recommended: Batch insert
console.time('Batch insert');
await db.features.insertMany(features);
console.timeEnd('Batch insert');
// Output: Batch insert: 156.789ms (15x faster)
```

#### Index Optimization

**Example Code:**
```typescript
// 1. Create spatial index
db.features.createIndex('geometry', {
  type: 'rbush',     // R-Tree index, good for dynamic data
  auto: true          // Auto-maintain index
});

// 2. Create regular indexes
db.features.createIndex('type');
db.features.createIndex('category');

// 3. Query performance comparison
const point = [116.404, 39.915];

// Without index
console.time('No index query');
const results1 = await db.features
  .toArray()
  .then(features =>
    features.filter(f =>
      calculateDistance(f.geometry, point) < 1000
    )
  );
console.timeEnd('No index query');
// Output: No index query: 456.123ms

// With index
console.time('With index query');
const results2 = await db.features
  .distance('geometry', point, '<', 1000)
  .toArray();
console.timeEnd('With index query');
// Output: With index query: 23.456ms (20x faster)
```

#### Query Optimization

**Example Code:**
```typescript
// 1. Combine multiple conditions
const results = await db.features
  .distance('geometry', point, '<', 1000)
  .where('type', '=', 'restaurant')
  .where('properties.rating', '>=', 4)
  .limit(20)
  .toArray();

// 2. Use pagination
async function getNearbyRestaurants(
  point: [number, number],
  page: number,
  pageSize: number = 20
) {
  const results = await db.features
    .distance('geometry', point, '<', 1000)
    .where('type', '=', 'restaurant')
    .limit(pageSize)
    .offset(page * pageSize)
    .toArray();

  const total = await db.features
    .distance('geometry', point, '<', 1000)
    .where('type', '=', 'restaurant')
    .count();

  return {
    data: results,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

// 3. Query only needed fields
async function getRestaurantNames() {
  const results = await db.features
    .where('type', '=', 'restaurant')
    .toArray();

  // Manual projection, return only needed fields
  return results.map(r => ({
    id: r.id,
    name: r.name,
    rating: r.properties?.rating
  }));
}
```

#### Caching Strategy

**Example Code:**
```typescript
// Implement simple cache layer
class CachedQueryService {
  private cache = new Map<string, {
    data: any;
    timestamp: number;
    ttl: number;
  }>();

  async getNearbyFeatures(
    point: [number, number],
    radius: number,
    useCache: boolean = true
  ) {
    const cacheKey = `nearby:${point.join(',')}:${radius}`;

    // Check cache
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        console.log('Using cached data');
        return cached.data;
      }
    }

    // Query database
    console.log('Querying database');
    const results = await db.features
      .distance('geometry', point, '<', radius)
      .toArray();

    // Update cache (5 minute expiry)
    this.cache.set(cacheKey, {
      data: results,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000
    });

    return results;
  }

  // Invalidate cache
  invalidate(point?: [number, number], radius?: number) {
    if (point && radius) {
      const cacheKey = `nearby:${point.join(',')}:${radius}`;
      this.cache.delete(cacheKey);
    } else {
      this.cache.clear();
    }
  }
}

// Usage
const cacheService = new CachedQueryService();

// First query: from database
const results1 = await cacheService.getNearbyFeatures([116.404, 39.915], 1000);

// Second query: from cache (within 5 minutes)
const results2 = await cacheService.getNearbyFeatures([116.404, 39.915], 1000);

// Invalidate cache after updating data
await db.features.update('feature-1', { name: 'Updated' });
cacheService.invalidate();
```

#### Performance Monitoring

**Example Code:**
```typescript
// Performance monitoring tool
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();

    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;

      if (!this.metrics.has(label)) {
        this.metrics.set(label, []);
      }

      const records = this.metrics.get(label)!;
      records.push(duration);

      // Keep only last 100 records
      if (records.length > 100) {
        records.shift();
      }

      console.log(`${label}: ${duration.toFixed(2)}ms`);
    }
  }

  getStats(label: string) {
    const records = this.metrics.get(label);
    if (!records || records.length === 0) {
      return null;
    }

    const avg = records.reduce((a, b) => a + b, 0) / records.length;
    const max = Math.max(...records);
    const min = Math.min(...records);

    return { avg, max, min, count: records.length };
  }

  report() {
    console.log('Performance Report:');
    for (const [label, records] of this.metrics.entries()) {
      const stats = this.getStats(label);
      if (stats) {
        console.log(`  ${label}:`);
        console.log(`    Average: ${stats.avg.toFixed(2)}ms`);
        console.log(`    Min: ${stats.min.toFixed(2)}ms`);
        console.log(`    Max: ${stats.max.toFixed(2)}ms`);
        console.log(`    Count: ${stats.count}`);
      }
    }
  }
}

// Usage
const monitor = new PerformanceMonitor();

const results = await monitor.measure('Query nearby restaurants', async () => {
  return await db.features
    .distance('geometry', [116.404, 39.915], '<', 1000)
    .where('type', '=', 'restaurant')
    .toArray();
});

// View performance report
monitor.report();
```

> **💡 Tip:** Choose the appropriate index type based on data volume. Use R-Tree for dynamic data, Static index for static data. Small datasets (< 1000 records) may not need indexes.

---

### 3.4 Error Handling and Data Validation

Robust error handling and data validation are essential for building reliable applications.

#### Key Points

- **Error Types**: Identify different types of database errors
- **Data Validation**: Validate input data integrity and correctness
- **Error Recovery**: Implement graceful error recovery mechanisms
- **User Feedback**: Provide friendly error messages

#### Error Handling Patterns

**Example Code:**
```typescript
import { WebGeoDB } from '@webgeodb/core';

class DatabaseErrorHandler {
  // Handle database open errors
  static handleOpenError(error: any) {
    if (error.name === 'VersionError') {
      return {
        type: 'VERSION_MISMATCH',
        message: 'Database version mismatch, please refresh the page',
        action: 'reload'
      };
    }

    if (error.name === 'InvalidStateError') {
      return {
        type: 'BROWSER_NOT_SUPPORTED',
        message: 'Your browser does not support IndexedDB',
        action: 'fallback'
      };
    }

    if (error.name === 'QuotaExceededError') {
      return {
        type: 'QUOTA_EXCEEDED',
        message: 'Storage quota exceeded',
        action: 'cleanup'
      };
    }

    return {
      type: 'UNKNOWN_ERROR',
      message: 'Failed to open database',
      action: 'retry'
    };
  }

  // Handle query errors
  static handleQueryError(error: any) {
    if (error.name === 'NotFoundError') {
      return {
        type: 'NOT_FOUND',
        message: 'Data not found',
        action: 'ignore'
      };
    }

    if (error.name === 'ConstraintError') {
      return {
        type: 'CONSTRAINT_VIOLATION',
        message: 'Data constraint violation',
        action: 'validate'
      };
    }

    return {
      type: 'QUERY_ERROR',
      message: 'Query failed',
      action: 'retry'
    };
  }
}

// Usage
async function safeOpenDatabase() {
  try {
    const db = new WebGeoDB({ name: 'city-planning' });
    await db.open();
    return db;
  } catch (error) {
    const errorInfo = DatabaseErrorHandler.handleOpenError(error);

    console.error(errorInfo.message);

    switch (errorInfo.action) {
      case 'reload':
        if (confirm('Database needs upgrade, reload page?')) {
          window.location.reload();
        }
        break;
      case 'fallback':
        console.warn('Falling back to memory storage');
        return useMemoryFallback();
      case 'cleanup':
        await cleanupOldData();
        return safeOpenDatabase(); // Retry
      case 'retry':
        await delay(1000);
        return safeOpenDatabase();
    }

    throw error;
  }
}
```

#### Data Validation

**Example Code:**
```typescript
// Data validator
class FeatureValidator {
  static validate(feature: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!feature.id) {
      errors.push('Missing id field');
    }

    if (typeof feature.id !== 'string') {
      errors.push('id must be a string');
    }

    // Validate geometry
    if (!feature.geometry) {
      errors.push('Missing geometry field');
    } else {
      const geoErrors = this.validateGeometry(feature.geometry);
      errors.push(...geoErrors);
    }

    // Validate properties
    if (feature.properties && typeof feature.properties !== 'object') {
      errors.push('properties must be an object');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static validateGeometry(geometry: any): string[] {
    const errors: string[] = [];

    if (!geometry.type) {
      errors.push('Geometry missing type field');
      return errors;
    }

    const validTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];
    if (!validTypes.includes(geometry.type)) {
      errors.push(`Invalid geometry type: ${geometry.type}`);
    }

    if (!Array.isArray(geometry.coordinates)) {
      errors.push('Geometry missing coordinates field');
    }

    // Validate coordinate range
    const validateCoords = (coords: any[]) => {
      for (const coord of coords) {
        if (Array.isArray(coord)) {
          validateCoords(coord);
        } else if (typeof coord === 'number') {
          if (coord < -180 || coord > 180) {
            errors.push(`Coordinate out of range: ${coord}`);
          }
        }
      }
    };

    if (geometry.coordinates) {
      validateCoords(geometry.coordinates);
    }

    return errors;
  }
}

// Usage
async function insertFeatureWithValidation(feature: any) {
  // Validate data
  const validation = FeatureValidator.validate(feature);

  if (!validation.valid) {
    console.error('Data validation failed:', validation.errors);
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  // Insert data
  try {
    await db.features.insert(feature);
    console.log('Data inserted successfully');
  } catch (error) {
    console.error('Insert failed:', error);
    throw error;
  }
}

// Test validation
const validFeature = {
  id: 'feature-1',
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [116.404, 39.915]
  },
  properties: {
    name: 'Test Point'
  }
};

await insertFeatureWithValidation(validFeature);

const invalidFeature = {
  id: 'feature-2',
  geometry: {
    type: 'InvalidType',
    coordinates: []
  }
};

try {
  await insertFeatureWithValidation(invalidFeature);
} catch (error) {
  console.error('Caught expected error:', error.message);
}
```

> **💡 Tip:** Always validate user input data. TypeScript can catch type errors at compile time, but runtime validation is still necessary.

---

### 3.5 Data Import and Export

Data import and export are important functions for data management and backup. WebGeoDB supports multiple data exchange formats.

#### Key Points

- **GeoJSON**: Standard geographic data exchange format
- **CSV**: Tabular data, suitable for attribute data
- **Custom Formats**: Customize based on requirements
- **Batch Processing**: Process large datasets in batches

#### GeoJSON Import/Export

**Example Code:**
```typescript
import { WebGeoDB } from '@webgeodb/core';

const db = new WebGeoDB({ name: 'city-planning' });
await db.open();

// Export to GeoJSON
async function exportToGeoJSON(filename: string = 'export.geojson') {
  // Query all features
  const features = await db.features.toArray();

  // Build GeoJSON FeatureCollection
  const geojson = {
    type: 'FeatureCollection' as const,
    features: features.map(f => ({
      type: 'Feature' as const,
      id: f.id,
      geometry: f.geometry,
      properties: {
        name: f.name,
        type: f.type,
        ...f.properties
      }
    })),
    metadata: {
      exportedAt: new Date().toISOString(),
      count: features.length
    }
  };

  // Convert to JSON string
  const json = JSON.stringify(geojson, null, 2);

  // Download as file
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);

  console.log(`Exported ${features.length} features to ${filename}`);
}

// Import from GeoJSON
async function importFromGeoJSON(file: File) {
  const json = await file.text();
  const geojson = JSON.parse(json);

  // Validate format
  if (geojson.type !== 'FeatureCollection') {
    throw new Error('Not a valid GeoJSON FeatureCollection');
  }

  if (!Array.isArray(geojson.features)) {
    throw new Error('GeoJSON missing features array');
  }

  // Batch import
  const batchSize = 100;
  const features = geojson.features;

  console.log(`Preparing to import ${features.length} features`);

  for (let i = 0; i < features.length; i += batchSize) {
    const batch = features.slice(i, i + batchSize);
    const processed = batch.map(f => ({
      id: f.id || `feature-${i}`,
      name: f.properties?.name || 'Unnamed',
      type: f.properties?.type || 'unknown',
      geometry: f.geometry,
      properties: f.properties || {}
    }));

    await db.features.insertMany(processed);

    console.log(`Imported ${Math.min(i + batchSize, features.length)}/${features.length}`);
  }

  console.log('Import complete');
}

// Usage
// Export
await exportToGeoJSON('city-zones.geojson');

// Import (via file selection)
const input = document.createElement('input');
input.type = 'file';
input.accept = '.geojson,.json';

input.onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    await importFromGeoJSON(file);
  }
};

input.click();
```

#### CSV Import/Export

**Example Code:**
```typescript
// Export attribute data to CSV
async function exportToCSV(filename: string = 'export.csv') {
  const features = await db.features.toArray();

  if (features.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Extract all property fields
  const allKeys = new Set<string>();
  features.forEach(f => {
    if (f.properties) {
      Object.keys(f.properties).forEach(key => allKeys.add(key));
    }
  });

  // Add fixed fields
  const columns = ['id', 'name', 'type', ...Array.from(allKeys)];

  // Build CSV
  const rows = [
    // Header row
    columns.join(','),
    // Data rows
    ...features.map(f => {
      return columns.map(col => {
        let value = f[col];
        if (col === 'geometry') {
          // Convert geometry to WKT format
          value = geometryToWKT(f.geometry);
        } else if (typeof value === 'string') {
          // Escape quotes and line breaks
          value = `"${value.replace(/"/g, '""')}"`;
        } else if (value === undefined || value === null) {
          value = '';
        }
        return value;
      }).join(',');
    })
  ];

  const csv = rows.join('\n');

  // Add BOM for Excel support
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);

  console.log(`Exported ${features.length} rows to ${filename}`);
}

// Simple geometry to WKT function
function geometryToWKT(geometry: any): string {
  const coordsToString = (coords: any) => {
    if (Array.isArray(coords[0])) {
      return `(${coords.map(coordsToString).join(', ')})`;
    }
    return coords.join(' ');
  };

  switch (geometry.type) {
    case 'Point':
      return `POINT (${geometry.coordinates.join(' ')})`;
    case 'LineString':
      return `LINESTRING ${coordsToString(geometry.coordinates)}`;
    case 'Polygon':
      return `POLYGON ${coordsToString(geometry.coordinates)}`;
    default:
      return `${geometry.type} (...)`;
  }
}

// Import attribute data from CSV
async function importFromCSV(file: File) {
  const text = await file.text();

  // Parse CSV
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV file is empty or malformed');
  }

  // Parse header row
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  // Parse data rows
  const features = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));

    const feature: any = {
      id: values[0] || `import-${i}`,
      name: values[1] || 'Unnamed',
      type: values[2] || 'unknown',
      properties: {}
    };

    // Parse properties
    for (let j = 3; j < headers.length; j++) {
      const key = headers[j];
      const value = values[j];

      // Try to convert to number
      const numValue = parseFloat(value);
      feature.properties[key] = isNaN(numValue) ? value : numValue;
    }

    features.push(feature);
  }

  // Batch import
  await db.features.insertMany(features);

  console.log(`Imported ${features.length} records from CSV`);
}
```

> **💡 Tip:** For large datasets (> 10000 records), use batch import to avoid memory overflow and browser freezing. Consider using Web Workers for background processing.

---

## Practice Exercises

### Scenario: Urban Planning Tool

You are developing an urban planning tool that needs to:
1. Create and manage urban planning zones (residential, commercial, industrial)
2. Calculate distances and intersections between zones
3. Analyze facility counts within zones
4. Generate planning reports and export them

#### Requirements

1. Create database with different zone types
2. Implement spatial analysis (buffer, intersection, union)
3. Query facility counts within each zone
4. Generate planning report with statistics
5. Export report to GeoJSON and CSV formats

#### Implementation Steps

<details>
<summary>View Implementation Steps</summary>

1. **Step 1**: Initialize database and create zone data
   ```typescript
   import { WebGeoDB } from '@webgeodb/core';
   import * as turf from '@turf/turf';

   const db = new WebGeoDB({ name: 'urban-planning' });
   await db.open();

   // Create indexes
   db.features.createIndex('geometry', { type: 'rbush', auto: true });
   db.features.createIndex('type');

   // Define planning zones
   const zones = [
     {
       id: 'residential-1',
       name: 'Chaoyang Residential District',
       type: 'residential',
       geometry: turf.polygon([[
         [116.420, 39.915],
         [116.420, 39.925],
         [116.430, 39.925],
         [116.430, 39.915],
         [116.420, 39.915]
       ]]).geometry,
       properties: {
         population: 50000,
         area: turf.area(turf.polygon([[
           [116.420, 39.915],
           [116.420, 39.925],
           [116.430, 39.925],
           [116.430, 39.915],
           [116.420, 39.915]
         ]])),
         buildYear: 2010
       }
     },
     {
       id: 'commercial-1',
       name: 'CBD Commercial District',
       type: 'commercial',
       geometry: turf.polygon([[
         [116.404, 39.915],
         [116.404, 39.925],
         [116.414, 39.925],
         [116.414, 39.915],
         [116.404, 39.915]
       ]]).geometry,
       properties: {
         companies: 200,
         area: turf.area(turf.polygon([[
           [116.404, 39.915],
           [116.404, 39.925],
           [116.414, 39.925],
           [116.414, 39.915],
           [116.404, 39.915]
         ]])),
         buildYear: 2005
       }
     }
   ];

   await db.features.insertMany(zones);
   ```

2. **Step 2**: Implement spatial analysis functions
   ```typescript
   // Analyze overlap between two zones
   function analyzeZoneOverlap(zone1Id: string, zone2Id: string) {
     const zone1 = turf.polygon([zone1.geometry.coordinates]);
     const zone2 = turf.polygon([zone2.geometry.coordinates]);

     // Calculate intersection
     const intersection = turf.intersect(zone1, zone2);

     if (intersection) {
       const intersectionArea = turf.area(intersection);
       const zone1Area = zone1.properties.area;
       const zone2Area = zone2.properties.area;

       return {
         hasOverlap: true,
         intersectionArea,
         overlapPercentZone1: (intersectionArea / zone1Area) * 100,
         overlapPercentZone2: (intersectionArea / zone2Area) * 100,
         intersectionGeometry: intersection.geometry
       };
     }

     return { hasOverlap: false };
   }

   // Create buffer
   function createZoneBuffer(zoneId: string, radius: number) {
     const zone = await db.features.get(zoneId);
     const polygon = turf.polygon([zone.geometry.coordinates]);

     const buffer = turf.buffer(polygon, radius, { units: 'kilometers' });

     return {
       id: `buffer-${zoneId}`,
       name: `${zone.name} Buffer`,
       type: 'buffer',
       geometry: buffer.geometry,
       properties: {
         originalZoneId: zoneId,
         radius,
         area: turf.area(buffer)
       }
     };
   }
   ```

3. **Step 3**: Add facilities and query
   ```typescript
   // Add facility data
   const facilities = [
     {
       id: 'school-1',
       name: 'Chaoyang Elementary School',
       type: 'school',
       category: 'education',
       geometry: {
         type: 'Point',
         coordinates: [116.425, 39.920]
       },
       properties: {
         capacity: 1000,
         students: 850
       }
     },
     {
       id: 'hospital-1',
       name: 'Chaoyang Hospital',
       type: 'hospital',
       category: 'healthcare',
       geometry: {
         type: 'Point',
         coordinates: [116.422, 39.918]
       },
       properties: {
         beds: 500,
         doctors: 200
       }
     },
     {
       id: 'shop-1',
       name: 'Shopping Center',
       type: 'shop',
       category: 'commercial',
       geometry: {
         type: 'Point',
         coordinates: [116.409, 39.920]
       },
       properties: {
         area: 50000,
         shops: 150
       }
     }
   ];

   await db.features.insertMany(facilities);

   // Query facilities in zone
   async function getFacilitiesInZone(zoneId: string) {
     const zone = await db.features.get(zoneId);
     const polygon = turf.polygon([zone.geometry.coordinates]);

     const allFacilities = await db.features
       .where('category', '!=', null)
       .toArray();

     const facilitiesInZone = allFacilities.filter(facility => {
       const point = turf.point(facility.geometry.coordinates);
       return turf.booleanPointInPolygon(point, polygon);
     });

     return {
       zoneId,
       zoneName: zone.name,
       facilities: facilitiesInZone,
       count: facilitiesInZone.length,
       byCategory: facilitiesInZone.reduce((acc, f) => {
         acc[f.category] = (acc[f.category] || 0) + 1;
         return acc;
       }, {} as Record<string, number>)
     };
   }
   ```

4. **Step 4**: Generate planning report
   ```typescript
   async function generatePlanningReport() {
     // Get all zones
     const zones = await db.features
       .where('type', '=', 'residential')
       .or('type', '=', 'commercial')
       .or('type', '=', 'industrial')
       .toArray();

     const report = {
       generatedAt: new Date().toISOString(),
       zones: [] as any[]
     };

     // Analyze each zone
     for (const zone of zones) {
       const facilities = await getFacilitiesInZone(zone.id);
       const buffer = createZoneBuffer(zone.id, 1);

       // Find nearby zones within buffer
       const nearbyZones = await db.features
         .distance('geometry', zone.geometry.coordinates, '<', 2000)
         .where('type', '!=', 'buffer')
         .toArray();

       report.zones.push({
         ...zone,
         facilities,
         buffer: {
           area: buffer.properties.area,
           nearbyZones: nearbyZones.map(z => ({
             id: z.id,
             name: z.name,
             type: z.type
           }))
         }
       });
     }

     // Calculate overall statistics
     const totalStats = {
       totalZones: zones.length,
       totalArea: zones.reduce((sum, z) => sum + (z.properties.area || 0), 0),
       totalFacilities: report.zones.reduce((sum, z) => sum + z.facilities.count, 0)
     };

     return {
       ...report,
       summary: totalStats
     };
   }
   ```

5. **Step 5**: Export functions
   ```typescript
   // Export to GeoJSON
   async function exportReportToGeoJSON(report: any) {
     const features = report.zones.map(zone => ({
       type: 'Feature',
       id: zone.id,
       geometry: zone.geometry,
       properties: {
         name: zone.name,
         type: zone.type,
         facilities: zone.facilities.count,
         facilityBreakdown: zone.facilities.byCategory
       }
     }));

     const geojson = {
       type: 'FeatureCollection',
       features,
       metadata: {
         generatedAt: report.generatedAt,
         summary: report.summary
       }
     };

     const blob = new Blob([JSON.stringify(geojson, null, 2)], {
       type: 'application/json'
     });

     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `planning-report-${Date.now()}.geojson`;
     a.click();

     URL.revokeObjectURL(url);
   }

   // Export to CSV
   async function exportReportToCSV(report: any) {
     const rows = [
       // Header row
       ['Zone ID', 'Zone Name', 'Type', 'Area(㎡)', 'Facility Count', 'Schools', 'Hospitals', 'Shops'].join(','),
       // Data rows
       ...report.zones.map(zone => [
         zone.id,
         zone.name,
         zone.type,
         (zone.properties.area || 0).toFixed(2),
         zone.facilities.count,
         zone.facilities.byCategory.education || 0,
         zone.facilities.byCategory.healthcare || 0,
         zone.facilities.byCategory.commercial || 0
       ].join(','))
     ];

     const csv = rows.join('\n');
     const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });

     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `planning-report-${Date.now()}.csv`;
     a.click();

     URL.revokeObjectURL(url);
   }
   ```

</details>

#### Testing

```typescript
// Run tests
async function runTests() {
  console.log('Starting urban planning tool tests...\n');

  // 1. Create zones
  console.log('1. Creating planning zones');
  // (Step 1 code)

  // 2. Test spatial analysis
  console.log('\n2. Testing spatial analysis');
  const overlap = analyzeZoneOverlap('residential-1', 'commercial-1');
  console.log('Zone overlap analysis:', overlap);

  // 3. Test facility queries
  console.log('\n3. Querying zone facilities');
  const facilities = await getFacilitiesInZone('residential-1');
  console.log('Residential zone facilities:', facilities);

  // 4. Generate report
  console.log('\n4. Generating planning report');
  const report = await generatePlanningReport();
  console.log('Report summary:', report.summary);

  // 5. Export report
  console.log('\n5. Exporting report');
  await exportReportToGeoJSON(report);
  await exportReportToCSV(report);

  console.log('\nTests complete!');
}

runTests();
```

#### Answer Reference

<details>
<summary>View Complete Answer</summary>

Refer to the implementation steps above. Key points:
- Use Turf.js for spatial calculations
- Use transactions to ensure data consistency
- Batch operations for better performance
- Support multiple export formats

</details>

---

### Scenario: Trajectory Analysis System

You are developing a GPS trajectory analysis system that needs to:
1. Store and manage large amounts of GPS trajectory points
2. Analyze trajectory length, speed, and direction
3. Identify trajectory stay points
4. Batch import trajectory data
5. Generate trajectory statistics report

#### Requirements

1. Design trajectory data model
2. Implement batch trajectory point insertion (10000+ points)
3. Calculate trajectory statistics (total length, average speed, max speed)
4. Identify stay points in trajectory (staying more than 5 minutes)
5. Export trajectory analysis report

#### Implementation Steps

<details>
<summary>View Implementation Steps</summary>

1. **Step 1**: Design data model
   ```typescript
   import { WebGeoDB } from '@webgeodb/core';
   import * as turf from '@turf/turf';

   const db = new WebGeoDB({ name: 'trajectory-analysis' });
   await db.open();

   // Create indexes
   db.features.createIndex('geometry', { type: 'rbush', auto: true });
   db.features.createIndex('trajectoryId');
   db.features.createIndex('timestamp');

   // Trajectory point data model
   interface TrajectoryPoint {
     id: string;
     trajectoryId: string;
     type: 'trajectory-point';
     geometry: {
       type: 'Point';
       coordinates: [number, number];
     };
     properties: {
       timestamp: number;
       speed?: number;
       bearing?: number;
       accuracy?: number;
     };
   }

   // Trajectory summary data model
   interface TrajectorySummary {
     id: string;
     trajectoryId: string;
     type: 'trajectory-summary';
     properties: {
       startTime: number;
       endTime: number;
       pointCount: number;
       totalLength: number;
       avgSpeed: number;
       maxSpeed: number;
       stayPoints: Array<{
         location: [number, number];
         duration: number;
         startTime: number;
       }>;
     };
   }
   ```

2. **Step 2**: Batch import trajectory points
   ```typescript
   async function importTrajectoryPoints(
     trajectoryId: string,
     points: Array<{
       longitude: number;
       latitude: number;
       timestamp: number;
       accuracy?: number;
     }>,
     options: {
       batchSize?: number;
       onProgress?: (current: number, total: number) => void;
     } = {}
   ) {
     const { batchSize = 500, onProgress } = options;
     const total = points.length;

     console.log(`Starting import for trajectory ${trajectoryId}, ${total} points total`);

     // Sort by timestamp
     const sortedPoints = points.sort((a, b) => a.timestamp - b.timestamp);

     // Batch import
     for (let i = 0; i < total; i += batchSize) {
       const batch = sortedPoints.slice(i, i + batchSize);

       // Calculate speed and bearing
       const processedBatch = batch.map((point, index) => {
         const prevPoint = index > 0 ? batch[index - 1] : null;

         let speed = 0;
         let bearing = 0;

         if (prevPoint) {
           const from = turf.point([prevPoint.longitude, prevPoint.latitude]);
           const to = turf.point([point.longitude, point.latitude]);

           const distance = turf.distance(from, to, { units: 'kilometers' });
           const timeDiff = (point.timestamp - prevPoint.timestamp) / 1000 / 3600; // hours

           if (timeDiff > 0) {
             speed = distance / timeDiff; // km/h
             bearing = turf.bearing(from, to);
           }
         }

         return {
           id: `${trajectoryId}-${i + index}`,
           trajectoryId,
           type: 'trajectory-point',
           geometry: {
             type: 'Point',
             coordinates: [point.longitude, point.latitude]
           },
           properties: {
             timestamp: point.timestamp,
             speed,
             bearing,
             accuracy: point.accuracy
           }
         } as TrajectoryPoint;
       });

       // Batch insert
       await db.features.insertMany(processedBatch);

       // Report progress
       if (onProgress) {
         onProgress(Math.min(i + batchSize, total), total);
       }

       // Yield control
       await new Promise(resolve => setTimeout(resolve, 0));
     }

     console.log(`Trajectory ${trajectoryId} import complete`);
   }

   // Usage: Generate mock trajectory data
   function generateMockTrajectory(pointCount: number = 10000) {
     const points = [];
     let longitude = 116.404;
     let latitude = 39.915;
     let timestamp = Date.now() - pointCount * 5000; // One point every 5 seconds

     for (let i = 0; i < pointCount; i++) {
       // Simulate random movement
       longitude += (Math.random() - 0.5) * 0.001;
       latitude += (Math.random() - 0.5) * 0.001;
       timestamp += 5000 + Math.random() * 2000; // 5-7 seconds

       points.push({
         longitude,
         latitude,
         timestamp,
         accuracy: 5 + Math.random() * 10
       });
     }

     return points;
   }

   // Import mock data
   const mockTrajectory = generateMockTrajectory(10000);

   await importTrajectoryPoints(
     'trajectory-1',
     mockTrajectory,
     {
       batchSize: 500,
       onProgress: (current, total) => {
         const percent = ((current / total) * 100).toFixed(1);
         console.log(`Import progress: ${percent}% (${current}/${total})`);
       }
     }
   );
   ```

3. **Step 3**: Calculate trajectory statistics
   ```typescript
   async function analyzeTrajectory(trajectoryId: string) {
     // Query all trajectory points
     const points = await db.features
       .where('trajectoryId', '=', trajectoryId)
       .where('type', '=', 'trajectory-point')
       .toArray();

     if (points.length < 2) {
       throw new Error('Insufficient trajectory points');
     }

     // Sort by timestamp
     points.sort((a, b) => a.properties.timestamp - b.properties.timestamp);

     // Calculate total length
     let totalLength = 0;
     let maxSpeed = 0;
     let speedSum = 0;

     for (let i = 1; i < points.length; i++) {
       const from = turf.point(points[i - 1].geometry.coordinates);
       const to = turf.point(points[i].geometry.coordinates);

       const distance = turf.distance(from, to, { units: 'kilometers' });
       totalLength += distance;

       const speed = points[i].properties.speed || 0;
       maxSpeed = Math.max(maxSpeed, speed);
       speedSum += speed;
     }

     const avgSpeed = speedSum / points.length;

     // Calculate time range
     const startTime = points[0].properties.timestamp;
     const endTime = points[points.length - 1].properties.timestamp;
     const duration = endTime - startTime;

     // Identify stay points
     const stayPoints = identifyStayPoints(points, {
       minDuration: 5 * 60 * 1000, // 5 minutes
       maxDistance: 50 // 50 meters
     });

     // Save summary
     const summary: TrajectorySummary = {
       id: `summary-${trajectoryId}`,
       trajectoryId,
       type: 'trajectory-summary',
       properties: {
         startTime,
         endTime,
         pointCount: points.length,
         totalLength,
         avgSpeed,
         maxSpeed,
         stayPoints
       }
     };

     await db.features.insert(summary);

     return summary;
   }

   // Identify stay points
   function identifyStayPoints(
     points: TrajectoryPoint[],
     options: {
       minDuration: number;
       maxDistance: number;
     }
   ) {
     const { minDuration, maxDistance } = options;
     const stayPoints = [];

     let stayStart = null;
     let stayCenter = null;
     let stayPoints = [];

     for (let i = 0; i < points.length; i++) {
       const point = points[i];
       const location = point.geometry.coordinates;

       if (stayStart === null) {
         // Start new potential stay
         stayStart = point.properties.timestamp;
         stayCenter = location;
         stayPoints = [point];
       } else {
         // Calculate distance
         const distance = turf.distance(
           turf.point(stayCenter!),
           turf.point(location),
           { units: 'meters' }
         );

         if (distance <= maxDistance) {
           // Still within stay range
           stayPoints.push(point);

           // Update center point
           const coords = stayPoints.map(p => p.geometry.coordinates);
           const center = calculateCenter(coords);
           stayCenter = center;
         } else {
           // Left stay range
           const duration = point.properties.timestamp - stayStart;

           if (duration >= minDuration) {
             // This is a valid stay point
             stayPoints.push({
               location: stayCenter!,
               duration,
               startTime: stayStart!
             });
           }

           // Start new potential stay
           stayStart = point.properties.timestamp;
           stayCenter = location;
           stayPoints = [point];
         }
       }
     }

     // Check last stay
     if (stayStart !== null && stayPoints.length > 0) {
       const lastPoint = stayPoints[stayPoints.length - 1];
       const duration = lastPoint.properties.timestamp - stayStart;

       if (duration >= minDuration) {
         stayPoints.push({
           location: stayCenter!,
           duration,
           startTime: stayStart!
         });
       }
     }

     return stayPoints;
   }

   // Calculate center point
   function calculateCenter(coords: Array<[number, number]>): [number, number] {
     const sum = coords.reduce(
       (acc, coord) => [acc[0] + coord[0], acc[1] + coord[1]],
       [0, 0]
     );

     return [sum[0] / coords.length, sum[1] / coords.length];
   }

   // Usage
   const summary = await analyzeTrajectory('trajectory-1');

   console.log('Trajectory analysis results:');
   console.log(`  Total length: ${summary.properties.totalLength.toFixed(2)} km`);
   console.log(`  Average speed: ${summary.properties.avgSpeed.toFixed(2)} km/h`);
   console.log(`  Max speed: ${summary.properties.maxSpeed.toFixed(2)} km/h`);
   console.log(`  Stay points: ${summary.properties.stayPoints.length}`);
   ```

4. **Step 4**: Generate trajectory report
   ```typescript
   async function generateTrajectoryReport(trajectoryId: string) {
     // Get trajectory summary
     const summary = await db.features
       .where('trajectoryId', '=', trajectoryId)
       .where('type', '=', 'trajectory-summary')
       .first();

     if (!summary) {
       throw new Error('Trajectory summary not found, please analyze trajectory first');
     }

     // Get trajectory points
     const points = await db.features
       .where('trajectoryId', '=', trajectoryId)
       .where('type', '=', 'trajectory-point')
       .toArray();

     // Generate report
     const report = {
       trajectoryId,
       generatedAt: new Date().toISOString(),

       // Basic info
       info: {
         pointCount: summary.properties.pointCount,
         startTime: new Date(summary.properties.startTime).toLocaleString(),
         endTime: new Date(summary.properties.endTime).toLocaleString(),
         duration: formatDuration(
           summary.properties.endTime - summary.properties.startTime
         )
       },

       // Statistics
       statistics: {
         totalLength: {
           value: summary.properties.totalLength,
           formatted: `${summary.properties.totalLength.toFixed(2)} km`
         },
         avgSpeed: {
           value: summary.properties.avgSpeed,
           formatted: `${summary.properties.avgSpeed.toFixed(2)} km/h`
         },
         maxSpeed: {
           value: summary.properties.maxSpeed,
           formatted: `${summary.properties.maxSpeed.toFixed(2)} km/h`
         }
       },

       // Stay points
       stayPoints: summary.properties.stayPoints.map(sp => ({
         location: {
           longitude: sp.location[0],
           latitude: sp.location[1]
         },
         duration: formatDuration(sp.duration),
         startTime: new Date(sp.startTime).toLocaleString()
       })),

       // Trajectory line (for visualization)
       trajectoryLine: {
         type: 'LineString',
         coordinates: points
           .sort((a, b) => a.properties.timestamp - b.properties.timestamp)
           .map(p => p.geometry.coordinates)
       }
     };

     return report;
   }

   // Format duration
   function formatDuration(milliseconds: number): string {
     const seconds = Math.floor(milliseconds / 1000);
     const minutes = Math.floor(seconds / 60);
     const hours = Math.floor(minutes / 60);

     const remainingMinutes = minutes % 60;
     const remainingSeconds = seconds % 60;

     if (hours > 0) {
       return `${hours}h ${remainingMinutes}m`;
     } else if (minutes > 0) {
       return `${minutes}m ${remainingSeconds}s`;
     } else {
       return `${seconds}s`;
     }
   }

   // Export report
   async function exportTrajectoryReport(report: any) {
     const reportText = `
Trajectory Analysis Report
====================================

Trajectory ID: ${report.trajectoryId}
Generated: ${report.generatedAt}

Basic Information
------------------------------------
Point Count: ${report.info.pointCount}
Start Time: ${report.info.startTime}
End Time: ${report.info.endTime}
Total Duration: ${report.info.duration}

Statistics
------------------------------------
Total Length: ${report.statistics.totalLength.formatted}
Average Speed: ${report.statistics.avgSpeed.formatted}
Max Speed: ${report.statistics.maxSpeed.formatted}

Stay Points (${report.stayPoints.length})
------------------------------------
${report.stayPoints.map((sp, i) => `
${i + 1}. Location: (${sp.location.longitude.toFixed(6)}, ${sp.location.latitude.toFixed(6)})
   Duration: ${sp.duration}
   Start Time: ${sp.startTime}
`).join('\n')}
     `.trim();

     const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
     const url = URL.createObjectURL(blob);

     const a = document.createElement('a');
     a.href = url;
     a.download = `trajectory-report-${report.trajectoryId}.txt`;
     a.click();

     URL.revokeObjectURL(url);

     console.log('Report exported');
   }

   // Usage
   const report = await generateTrajectoryReport('trajectory-1');
   console.log('Trajectory report:', report);
   await exportTrajectoryReport(report);
   ```

</details>

#### Testing

```typescript
// Run tests
async function runTrajectoryTests() {
  console.log('Starting trajectory analysis system tests...\n');

  // 1. Generate mock data
  console.log('1. Generating mock trajectory data');
  const mockTrajectory = generateMockTrajectory(10000);

  // 2. Import data
  console.log('\n2. Importing trajectory data');
  await importTrajectoryPoints('trajectory-1', mockTrajectory, {
    batchSize: 500,
    onProgress: (current, total) => {
      const percent = ((current / total) * 100).toFixed(1);
      console.log(`  Progress: ${percent}% (${current}/${total})`);
    }
  });

  // 3. Analyze trajectory
  console.log('\n3. Analyzing trajectory statistics');
  const summary = await analyzeTrajectory('trajectory-1');
  console.log('Analysis results:');
  console.log(`  Total length: ${summary.properties.totalLength.toFixed(2)} km`);
  console.log(`  Average speed: ${summary.properties.avgSpeed.toFixed(2)} km/h`);
  console.log(`  Max speed: ${summary.properties.maxSpeed.toFixed(2)} km/h`);
  console.log(`  Stay points: ${summary.properties.stayPoints.length}`);

  // 4. Generate report
  console.log('\n4. Generating trajectory report');
  const report = await generateTrajectoryReport('trajectory-1');

  // 5. Export report
  console.log('\n5. Exporting report');
  await exportTrajectoryReport(report);

  console.log('\nTests complete!');
}

runTrajectoryTests();
```

#### Answer Reference

<details>
<summary>View Complete Answer</summary>

Refer to the implementation steps above. Key points:
- Batch import optimization (500-1000 points per batch)
- Sort by timestamp to ensure data correctness
- Stay point identification algorithm (distance + duration)
- Use cache to improve repeated query performance

</details>

---

## Common Questions

### Q: How to choose between Turf.js and JSTS?

**A:** Choose based on your needs:

**Turf.js**:
- Suitable for rapid prototyping
- Simple, easy-to-use API
- Good performance (most operations)
- Comprehensive documentation, active community
- Suitable for common spatial analysis tasks

**JSTS**:
- More powerful and comprehensive
- Supports all JTS operations
- Suitable for complex geometry calculations
- Slightly lower performance than Turf.js
- More complex API

Recommendation: Use Turf.js for most applications, only use JSTS when you need specific JTS features.

---

### Q: How to rollback after transaction failure?

**A:** WebGeoDB transactions automatically rollback. You don't need to handle rollback manually:

```typescript
try {
  await db.transaction('rw', db.features, async () => {
    await db.features.insert(feature1);
    await db.features.insert(feature2);

    // If error is thrown here, previous inserts are automatically rolled back
    throw new Error('Something went wrong');
  });
} catch (error) {
  console.error('Transaction failed, already rolled back');
  // Database state unchanged
}
```

Key points:
- Any error in the transaction triggers rollback
- Rollback is automatic, no manual call needed
- Catch errors to retry or prompt user

---

### Q: How to optimize large data import performance?

**A:** Use these optimization strategies:

1. **Batch insert**:
```typescript
// ✅ Use insertMany
await db.features.insertMany(largeDataset);

// ❌ Avoid loop insert
for (const item of largeDataset) {
  await db.features.insert(item);
}
```

2. **Appropriate batch size**:
```typescript
const batchSize = 500; // 500-1000 is usually optimal
for (let i = 0; i < data.length; i += batchSize) {
  const batch = data.slice(i, i + batchSize);
  await db.features.insertMany(batch);
}
```

3. **Import first, build index later**:
```typescript
// ✅ Import data first
await db.features.insertMany(largeDataset);

// ✅ Build index later
db.features.createIndex('geometry', { type: 'flatbush' });
```

---

## Summary

This chapter covered advanced features and performance optimization techniques in WebGeoDB. We learned:

1. **Geometry Calculation Engine**:
   - Turf.js and JSTS integration and usage
   - Buffer analysis, intersection, union, and other spatial operations
   - Distance, area, and length calculations

2. **Transaction Management**:
   - ACID characteristics and concurrency control
   - Optimistic locking for concurrent conflicts
   - Transaction isolation levels

3. **Performance Optimization**:
   - Batch operations improve performance by 10-50x
   - Index optimization (R-Tree vs Static)
   - Query optimization and caching strategies
   - Performance monitoring tools

4. **Error Handling and Data Validation**:
   - Error handling patterns
   - Data validation best practices
   - Transaction error recovery

5. **Data Import and Export**:
   - GeoJSON and CSV format support
   - Batch import optimization
   - Data backup and recovery

### Core Points Review

- ✅ Use Turf.js for fast spatial analysis, JSTS for complex geometry operations
- ✅ Transactions ensure data consistency, avoid long-running transactions
- ✅ Batch operations and indexes significantly improve performance (10-50x)
- ✅ Always validate input data, implement robust error handling
- ✅ Use batch processing for large datasets to avoid memory overflow

### Next Steps

- **[Chapter 4: Practice Project](./chapter-04-practice-project.md)** - Build a complete location-based application
- **[API Reference](../../api/reference.md)** - View complete API documentation
- **[Performance Optimization Guide](../../guides/performance.md)** - Deep dive into performance optimization
- **[Best Practices](../../guides/best-practices.md)** - Production environment recommendations

---

## Reference Resources

- **Turf.js Documentation** - https://turfjs.org/
- **JSTS Documentation** - https://github.com/bjornharrtell/jsts
- **GeoJSON Specification** - https://geojson.org/
- **IndexedDB API** - https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- **[Performance Optimization Guide](../../guides/performance.md)** - Detailed performance optimization techniques
- **[Best Practices](../../guides/best-practices.md)** - Production environment configuration and patterns