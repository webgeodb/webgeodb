# Chapter 1: Getting Started Quick Guide

> **Learning Time**: 30-45 minutes | **Prerequisites**: None

## Learning Objectives

After completing this chapter, you will be able to:
- Understand the core concepts and use cases of WebGeoDB
- Install and configure WebGeoDB development environment
- Create your first spatial database and define table schemas
- Master basic CRUD (Create, Read, Update, Delete) operations
- Understand GeoJSON geometry types and coordinate system basics
- Complete a hands-on exercise of building a personal place marking system

---

## Core Concepts

### 1.1 What is a Browser-Based Spatial Database?

**WebGeoDB** is a lightweight spatial database designed specifically for modern browsers, enabling frontend developers to store, query, and analyze geospatial data directly in the browser without relying on backend services.

#### Key Features

- 🪶 **Lightweight**: Core package under 500KB, 50% smaller than SQLite WASM
- ⚡ **High Performance**: Query response time < 1 second, supports 100MB-1GB datasets
- 📱 **Offline-First**: Based on IndexedDB, fully supports offline usage
- 🌐 **Cross-Platform**: Supports modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- 🔌 **Extensible**: Plugin architecture with on-demand feature loading

#### Typical Use Cases

1. **Offline Map Applications**
   - Offline map tile caching
   - Point of Interest (POI) management
   - Route planning and navigation

2. **Location-Based Services**
   - Real-time location tracking
   - Geofencing and alerts
   - Nearby place search

3. **Data Analysis Tools**
   - Spatial data visualization
   - Regional statistics and analysis
   - Heatmap generation

4. **Collaborative Editing Systems**
   - Multi-user map annotation
   - Collaborative spatial data editing
   - Version control and synchronization

#### Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                    │
│                    Your Business Code                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 Query Engine Layer                       │
│  - SQL-like Query API                                   │
│  - Chained Query API (where, orderBy, limit)             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────┬──────────────────────────────────┐
│   Spatial Index       │      Geometry Computation        │
│  - rbush (dynamic)    │  - Turf.js core                  │
│  - flatbush (static)  │  - JSTS (on-demand)              │
└──────────────────────┴──────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    Storage Layer                         │
│           IndexedDB (via Dexie.js wrapper)              │
└─────────────────────────────────────────────────────────┘
```

#### Key Points

- **Pure Frontend Solution**: No backend server required, reduced architectural complexity
- **Standard Compliant**: Supports international standards like GeoJSON and WKT
- **Spatial Indexing**: Built-in R-Tree index for significantly improved query performance
- **Easy Integration**: Provides both SQL-like and chained APIs, low learning curve

### 1.2 Environment Setup

#### Browser Compatibility

WebGeoDB supports all modern browsers:

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 90+ | ✅ Full support |
| Firefox | 88+ | ✅ Full support |
| Safari | 14+ | ✅ Full support |
| Edge | 90+ | ✅ Full support |

**Check Browser Support**

```typescript
// Check IndexedDB support
if (!window.indexedDB) {
  console.error('Your browser does not support IndexedDB');
}

// Check Web Worker support (for parallel computing)
if (!window.Worker) {
  console.warn('Your browser does not support Web Worker, some performance optimizations will be unavailable');
}
```

#### Installing WebGeoDB

**Install via npm**

```bash
# Using pnpm (recommended)
pnpm add @webgeodb/core

# Using npm
npm install @webgeodb/core

# Using yarn
yarn add @webgeodb/core
```

**TypeScript Configuration**

If you're using TypeScript, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true
  }
}
```

#### Project Structure Recommendations

Recommended project directory structure:

```
your-project/
├── src/
│   ├── db/
│   │   ├── schema.ts        # Database table schema definitions
│   │   ├── init.ts          # Database initialization
│   │   └── queries.ts       # Query wrappers
│   ├── services/
│   │   └── location.ts      # Business logic services
│   └── app.ts               # Application entry point
├── package.json
└── tsconfig.json
```

> **💡 Tip**: Keep database-related code in a dedicated `db/` directory for easier maintenance and testing.

### 1.3 Creating Your First Database

#### Initialize Database Instance

**Example Code:**

```typescript
import { WebGeoDB } from '@webgeodb/core';

// Create database instance
const db = new WebGeoDB({
  name: 'my-first-geodb',     // Database name
  version: 1                   // Database version (for upgrade management)
});

// Define table schema
db.schema({
  places: {
    id: 'string',              // Primary key
    name: 'string',            // Place name
    type: 'string',            // Place type
    geometry: 'geometry',      // Geometry object (GeoJSON)
    properties: 'json',        // Extended properties (JSON object)
    rating: 'number',          // Rating (optional)
    createdAt: 'date'          // Creation time (optional)
  }
});

// Open database
await db.open();

console.log('Database created successfully!');
```

**Output:**
```
Database created successfully!
```

#### Schema Details

**Supported Data Types**

| Type | Description | Example |
|------|-------------|---------|
| `'string'` | String | `'Beijing, Chaoyang District'` |
| `'number'` | Number | `4.5`, `1000` |
| `'boolean'` | Boolean | `true`, `false` |
| `'date'` | Date | `new Date()` |
| `'array'` | Array | `[1, 2, 3]` |
| `'json'` | JSON object | `{ rating: 4.5, tags: ['coffee'] }` |
| `'geometry'` | Geometry object | GeoJSON geometry format |

**Schema Best Practices**

```typescript
// ✅ Recommended: Explicit field types
db.schema({
  places: {
    id: 'string',
    name: 'string',
    geometry: 'geometry',
    properties: 'json'
  }
});

// ❌ Not recommended: Excessive nesting
db.schema({
  places: {
    id: 'string',
    data: 'json'  // Putting all fields in json is not good for indexing
  }
});
```

> **💡 Tip**: Define explicit types for frequently queried fields to improve query performance and simplify code.

#### Create Spatial Index

Spatial indexes are key to improving spatial query performance:

```typescript
// Automatically create R-Tree index for geometry field
db.places.createIndex('geometry', { auto: true });

// You can also manually specify index fields
db.places.createIndex('type');  // Create index for type field
```

**Index Benefits**

- **Accelerate spatial queries**: Distance queries, intersection queries, etc.
- **Accelerate attribute queries**: Where condition filtering
- **Automatic maintenance**: Automatically updates indexes on insert, update, delete

### 1.4 Basic CRUD Operations

#### Create Data

**Single Insert**

```typescript
// Insert a coffee shop location
await db.places.insert({
  id: 'cafe-001',
  name: 'Starbucks (Sanlitun Store)',
  type: 'coffee',
  geometry: {
    type: 'Point',
    coordinates: [116.4541, 39.9375]  // [longitude, latitude]
  },
  properties: {
    address: '19 Sanlitun Road, Chaoyang District, Beijing',
    phone: '010-12345678',
    tags: ['coffee', 'WiFi', 'takeaway']
  },
  rating: 4.5,
  createdAt: new Date('2024-01-01')
});

console.log('Data inserted successfully');
```

**Batch Insert**

```typescript
// Insert multiple places at once
await db.places.insertMany([
  {
    id: 'cafe-002',
    name: 'Luckin Coffee (Guomao Store)',
    type: 'coffee',
    geometry: { type: 'Point', coordinates: [116.4589, 39.9087] },
    properties: { address: '1 Jianguomenwai Street, Chaoyang District, Beijing' },
    rating: 4.2
  },
  {
    id: 'cafe-003',
    name: 'Costa Coffee (Wangjing Store)',
    type: 'coffee',
    geometry: { type: 'Point', coordinates: [116.4808, 39.9965] },
    properties: { address: '9 Wangjing Street, Chaoyang District, Beijing' },
    rating: 4.6
  }
]);

console.log('Batch insert successful');
```

#### Read Data

**Query Single Record**

```typescript
// Query by ID
const place = await db.places.get('cafe-001');
console.log(place.name);  // Output: Starbucks (Sanlitun Store)
```

**Query All Data**

```typescript
// Get all places
const allPlaces = await db.places.toArray();
console.log(`Total ${allPlaces.length} places`);
```

**Conditional Query**

```typescript
// Query all coffee shops
const cafes = await db.places
  .where('type', '=', 'coffee')
  .toArray();

console.log('Coffee shop list:', cafes.map(p => p.name));
```

**Multi-Condition Query**

```typescript
// Query coffee shops with rating greater than 4.5
const topCafes = await db.places
  .where('type', '=', 'coffee')
  .where('rating', '>', 4.5)
  .toArray();

console.log('Top-rated coffee shops:', topCafes);
```

**Sorting and Pagination**

```typescript
// Sort by rating descending, take top 10
const topRated = await db.places
  .where('type', '=', 'coffee')
  .orderBy('rating', 'desc')
  .limit(10)
  .toArray();
```

#### Update Data

```typescript
// Update rating
await db.places.update('cafe-001', {
  rating: 4.8,
  properties: {
    // Update nested properties
    ...place.properties,
    lastVisit: new Date().toISOString()
  }
});

console.log('Data updated successfully');
```

#### Delete Data

```typescript
// Delete single record
await db.places.delete('cafe-001');

// Batch delete
await db.places.deleteMany(['cafe-002', 'cafe-003']);

// Conditional delete (query then delete)
const toDelete = await db.places
  .where('rating', '<', 3.0)
  .toArray();

await db.places.deleteMany(toDelete.map(p => p.id));
```

### 1.5 Understanding Geometry Types

WebGeoDB uses the **GeoJSON** standard format to represent geometry objects.

#### GeoJSON Geometry Types

**Point**

Represents a location, used to mark coffee shops, gas stations, subway stations, etc.

```typescript
{
  type: 'Point',
  coordinates: [116.4541, 39.9375]  // [longitude, latitude]
}
```

**LineString**

Represents a path, used to represent roads, rivers, routes, etc.

```typescript
{
  type: 'LineString',
  coordinates: [
    [116.4541, 39.9375],  // Start point
    [116.4589, 39.9087],  // Middle point
    [116.4808, 39.9965]   // End point
  ]
}
```

**Polygon**

Represents an area, used to represent lakes, buildings, administrative regions, etc.

```typescript
{
  type: 'Polygon',
  coordinates: [
    [
      [116.4541, 39.9375],  // First point
      [116.4589, 39.9087],  // Second point
      [116.4808, 39.9965],  // Third point
      [116.4541, 39.9375]   // Close (same as first point)
    ]
  ]
}
```

#### Coordinate System Basics

**Coordinate Format**

GeoJSON uses `[longitude, latitude]` format, which differs from the common `[latitude, longitude]`:

```typescript
// ✅ Correct: [longitude, latitude]
{ type: 'Point', coordinates: [116.4541, 39.9375] }

// ❌ Wrong: [latitude, longitude]
{ type: 'Point', coordinates: [39.9375, 116.4541] }
```

**Common Coordinate Systems**

| Coordinate System | Description | Use Cases |
|-------------------|-------------|-----------|
| WGS84 (EPSG:4326) | GPS coordinates, in degrees | Global map applications |
| GCJ02 | China National Bureau of Surveying coordinates | Amap, Tencent Maps |
| BD09 | Baidu coordinate system | Baidu Maps |

> **💡 Tip**: WebGeoDB internally uses the WGS84 coordinate system. If you use other coordinate systems, you need to convert them.

#### Spatial Query Examples

**Distance Query**

```typescript
// Query coffee shops within 1km of current location
const currentLocation = [116.4541, 39.9375];
const nearbyCafes = await db.places
  .distance('geometry', currentLocation, '<', 1000)  // 1000 meters
  .orderBy('distance')  // Sort by distance
  .toArray();

console.log('Nearby coffee shops:', nearbyCafes);
```

**Intersection Query**

```typescript
// Query places that intersect with a specified area
const searchArea = {
  type: 'Polygon',
  coordinates: [[
    [116.45, 39.93],
    [116.46, 39.93],
    [116.46, 39.94],
    [116.45, 39.94],
    [116.45, 39.93]
  ]]
};

const placesInArea = await db.places
  .intersects('geometry', searchArea)
  .toArray();
```

---

## Hands-On Exercise

### Scenario: Personal Place Marking System

Build a simple personal place marking system to record and manage coffee shops, restaurants, bookstores, and other places you frequently visit.

#### Requirements

1. **Create Database**: Define a table structure with place name, type, location, and rating
2. **Add Data**: Insert at least 3 coffee shops and 2 restaurants
3. **Query Functions**:
   - Find all coffee shops
   - Find places with rating greater than 4.5
   - Display top 5 places sorted by rating in descending order
4. **Update Function**: Update the rating of a place
5. **Delete Function**: Delete a closed place

#### Implementation Steps

<details>
<summary>View Implementation Steps</summary>

**Step 1: Create Database and Table Structure**

```typescript
import { WebGeoDB } from '@webgeodb/core';

async function initDatabase() {
  const db = new WebGeoDB({
    name: 'personal-places',
    version: 1
  });

  db.schema({
    places: {
      id: 'string',
      name: 'string',
      type: 'string',
      geometry: 'geometry',
      properties: 'json',
      rating: 'number',
      createdAt: 'date'
    }
  });

  await db.open();
  db.places.createIndex('geometry', { auto: true });

  return db;
}
```

**Step 2: Add Sample Data**

```typescript
async function seedData(db) {
  const places = [
    // Coffee shops
    {
      id: 'cafe-001',
      name: 'Starbucks (Sanlitun Store)',
      type: 'coffee',
      geometry: { type: 'Point', coordinates: [116.4541, 39.9375] },
      properties: { address: '19 Sanlitun Road, Chaoyang District, Beijing' },
      rating: 4.5,
      createdAt: new Date()
    },
    {
      id: 'cafe-002',
      name: 'Luckin Coffee (Guomao Store)',
      type: 'coffee',
      geometry: { type: 'Point', coordinates: [116.4589, 39.9087] },
      properties: { address: '1 Jianguomenwai Street, Chaoyang District, Beijing' },
      rating: 4.2,
      createdAt: new Date()
    },
    {
      id: 'cafe-003',
      name: 'Costa Coffee (Wangjing Store)',
      type: 'coffee',
      geometry: { type: 'Point', coordinates: [116.4808, 39.9965] },
      properties: { address: '9 Wangjing Street, Chaoyang District, Beijing' },
      rating: 4.6,
      createdAt: new Date()
    },
    // Restaurants
    {
      id: 'restaurant-001',
      name: 'Haidilao (Wangfujing Store)',
      type: 'restaurant',
      geometry: { type: 'Point', coordinates: [116.4102, 39.9145] },
      properties: { address: '255 Wangfujing Street, Dongcheng District, Beijing' },
      rating: 4.8,
      createdAt: new Date()
    },
    {
      id: 'restaurant-002',
      name: 'Din Tai Fung (Guomao Store)',
      type: 'restaurant',
      geometry: { type: 'Point', coordinates: [116.4589, 39.9087] },
      properties: { address: '1 Jianguomenwai Street, Chaoyang District, Beijing' },
      rating: 4.7,
      createdAt: new Date()
    }
  ];

  await db.places.insertMany(places);
  console.log('Data import completed');
}
```

**Step 3: Implement Query Functions**

```typescript
async function queryExamples(db) {
  // 1. Find all coffee shops
  const cafes = await db.places
    .where('type', '=', 'coffee')
    .toArray();
  console.log('Coffee shop list:', cafes.map(p => p.name));

  // 2. Find places with rating greater than 4.5
  const topRated = await db.places
    .where('rating', '>', 4.5)
    .toArray();
  console.log('Top-rated places:', topRated.map(p => `${p.name} (${p.rating})`));

  // 3. Display top 5 places sorted by rating in descending order
  const top5 = await db.places
    .orderBy('rating', 'desc')
    .limit(5)
    .toArray();
  console.log('Top 5 places:', top5.map(p => `${p.name}: ${p.rating}`));
}
```

**Step 4: Implement Update Function**

```typescript
async function updatePlace(db, id, newRating) {
  const place = await db.places.get(id);
  await db.places.update(id, {
    rating: newRating,
    properties: {
      ...place.properties,
      lastVisit: new Date().toISOString()
    }
  });
  console.log(`Updated ${place.name} rating to ${newRating}`);
}
```

**Step 5: Implement Delete Function**

```typescript
async function deletePlace(db, id) {
  const place = await db.places.get(id);
  await db.places.delete(id);
  console.log(`Deleted place: ${place.name}`);
}
```

**Complete Running Example**

```typescript
async function main() {
  // 1. Initialize database
  const db = await initDatabase();

  // 2. Add sample data
  await seedData(db);

  // 3. Execute queries
  await queryExamples(db);

  // 4. Update rating
  await updatePlace(db, 'cafe-001', 4.7);

  // 5. Delete place (simulate store closure)
  await deletePlace(db, 'cafe-002');

  // 6. Close database
  await db.close();
}

main().catch(console.error);
```

</details>

#### Testing and Validation

Create an HTML file to test your code:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Personal Place Marking System</title>
</head>
<body>
  <h1>Personal Place Marking System</h1>
  <div id="output"></div>

  <script type="module">
    import { WebGeoDB } from '@webgeodb/core';

    // Place your code here
    async function main() {
      const output = document.getElementById('output');

      function log(message) {
        const p = document.createElement('p');
        p.textContent = message;
        output.appendChild(p);
      }

      // ... Copy the complete code above ...
      // Replace console.log with log()
    }

    main().catch(console.error);
  </script>
</body>
</html>
```

#### Reference Answer

<details>
<summary>View Complete Answer</summary>

Complete code is provided in the implementation steps above. You can copy and use it directly, or modify and extend it as needed.

**Extension Suggestions**

1. **Add Distance Calculation**: Calculate the distance between two places
2. **Add Map Display**: Visualize places using Leaflet or Mapbox
3. **Add Search Function**: Search places by name or address
4. **Add Category Filter**: Filter places by type
5. **Add Export Function**: Export data as GeoJSON file

</details>

---

## Frequently Asked Questions

### Q: What's the difference between WebGeoDB and traditional backend spatial databases (like PostGIS)?

**A:** Main differences:

| Feature | WebGeoDB | PostGIS |
|---------|----------|---------|
| **Runtime Environment** | Browser | Server |
| **Data Scale** | 100MB-1GB | TB level |
| **Offline Support** | ✅ Fully offline | ❌ Requires network |
| **Architecture Complexity** | Simple (pure frontend) | Complex (requires backend) |
| **Use Cases** | Offline apps, personal projects | Enterprise apps, big data |

WebGeoDB is suitable for offline-first applications, prototype development, and personal projects; PostGIS is suitable for enterprise applications requiring large-scale data processing and multi-user collaboration.

### Q: Are there browser storage limitations?

**A:** Yes, different browsers have different limits:

- **Chrome/Firefox**: Approximately 60% of available disk space
- **Safari**: Approximately 1GB

Generally, modern browsers can store from a few hundred MB to several GB of data. For most frontend applications, this space is sufficient.

**Check Available Space**

```typescript
// Check IndexedDB usage
if (navigator.storage && navigator.storage.estimate) {
  const estimate = await navigator.storage.estimate();
  console.log(`Used space: ${estimate.usage / 1024 / 1024} MB`);
  console.log(`Available space: ${estimate.quota / 1024 / 1024} MB`);
}
```

### Q: How to handle coordinate conversion?

**A:** If your data uses GCJ02 or BD09 coordinate systems, convert to WGS84 first:

```typescript
// Use coordtransform library
import coordtransform from 'coordtransform';

// Convert GCJ02 to WGS84
const [lng, lat] = coordtransform.gcj02towgs84(116.4541, 39.9375);

const geometry = {
  type: 'Point',
  coordinates: [lng, lat]
};
```

### Q: How to ensure data security?

**A:** WebGeoDB data is stored in the browser's IndexedDB, security measures include:

1. **Same-Origin Policy**: Only pages with the same domain can access the data
2. **HTTPS**: Always use HTTPS in production
3. **Regular Backups**: Export data as JSON files
4. **Version Control**: Use database version management for upgrades

```typescript
// Export data
const backup = await db.places.toArray();
const json = JSON.stringify(backup, null, 2);

// Download as file
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `backup-${Date.now()}.json`;
a.click();
```

---

## Summary

This chapter introduced the core concepts and basic operations of WebGeoDB. You learned:

### Key Points Recap

- ✅ **Understanding WebGeoDB**: Browser spatial database, suitable for offline applications and frontend projects
- ✅ **Environment Setup**: Installation, configuration, browser compatibility check
- ✅ **Creating Database**: Using `WebGeoDB` class to define table schemas and indexes
- ✅ **CRUD Operations**: Insert, query, update, delete data
- ✅ **Geometry Types**: GeoJSON format (Point, LineString, Polygon)
- ✅ **Coordinate System**: WGS84 coordinate system, [longitude, latitude] format
- ✅ **Hands-On Exercise**: Completed a personal place marking system

### Next Steps

Congratulations on completing Chapter 1! You've mastered the basics of WebGeoDB.

**Recommended Learning Path**:

- **[Chapter 2: Spatial Query Deep Dive](./chapter-02-spatial-queries.md)** - Learn distance queries, intersection queries, spatial relationship determination
- **[Chapter 3: Index Optimization](./chapter-03-indexing-optimization.md)** - Learn how to select and optimize indexes
- **[API Reference](../../api/reference.md)** - View complete API documentation
- **[Practical Examples](../../examples/basic-crud)** - View more example code

**Practice Recommendations**:

1. Try extending the personal place marking system with more features
2. Practice with real data (e.g., coffee shop data in your city)
3. Try visualizing data (you can use Leaflet or Mapbox)

---

## Reference Resources

### Official Documentation

- **[API Reference](../../api/reference.md)** - Complete API documentation
- **[Quick Start](../../getting-started.md)** - Quick start guide
- **[Migration Guide](../../guides/migration.md)** - Migrate from other databases

### External Resources

- **[GeoJSON Specification](https://geojson.org/)** - GeoJSON format standard
- **[Turf.js Manual](https://turfjs.org/)** - Geospatial analysis library
- **[Leaflet Tutorial](https://leafletjs.com/)** - Open source map library

### Example Code

- **[Basic CRUD Example](../../examples/basic-crud)** - Complete create, read, update, delete example
- **[Spatial Query Example](../../examples/spatial-query)** - Spatial query example
