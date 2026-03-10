# Chapter 4: Real-World Applications

> **Time Required**: 90-120 minutes | **Prerequisites**: Chapters 1-3

## Learning Objectives

After completing this chapter, you will be able to:
- Design and implement complete WebGeoDB application architecture
- Integrate mainstream map libraries (Leaflet, Mapbox GL)
- Implement real-time location tracking and trajectory playback
- Build offline-first map applications
- Implement data visualization (heatmaps, clustering, aggregation)

---

## Core Concepts

### 4.1 Application Architecture Design

Building production-grade geospatial applications requires clear architectural layering. We recommend using the **Repository Pattern** combined with **Service Layer** to achieve separation of concerns.

#### Architecture Layers

```
┌─────────────────────────────────────┐
│      UI Layer (React/Vue/Svelte)    │  ← User Interface
├─────────────────────────────────────┤
│      Service Layer (Business Logic)  │  ← Application Logic
├─────────────────────────────────────┤
│      Repository Layer (Data Access)  │  ← Data Access
├─────────────────────────────────────┤
│      WebGeoDB (Data Persistence)     │  ← Data Storage
└─────────────────────────────────────┘
```

#### Key Points

- **UI Layer**: Handles user interaction and state presentation
- **Service Layer**: Encapsulates business logic, coordinates multiple Repositories
- **Repository Layer**: Provides unified data access interface
- **WebGeoDB**: Handles data persistence and spatial queries

**Example Code:**
```typescript
// types.ts - Type definitions
export interface Location {
  id: string;
  userId: string;
  timestamp: number;
  geometry: Point;
  accuracy: number;
  speed?: number;
  heading?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  isSharing: boolean;
}

// repository.ts - Data access layer
export class LocationRepository {
  constructor(private db: WebGeoDB) {}

  async saveLocation(location: Location): Promise<void> {
    await this.db.locations.insert(location);
  }

  async getUserLocations(
    userId: string,
    startTime: number,
    endTime: number
  ): Promise<Location[]> {
    return await this.db.locations
      .where('userId', '=', userId)
      .where('timestamp', '>=', startTime)
      .where('timestamp', '<=', endTime)
      .orderBy('timestamp', 'asc')
      .toArray();
  }

  async findNearbyUsers(
    center: [number, number],
    radius: number
  ): Promise<Location[]> {
    return await this.db.locations
      .distance('geometry', center, '<', radius)
      .toArray();
  }
}

// service.ts - Business logic layer
export class LocationService {
  private locationRepo: LocationRepository;
  private userRepo: UserRepository;

  constructor(db: WebGeoDB) {
    this.locationRepo = new LocationRepository(db);
    this.userRepo = new UserRepository(db);
  }

  async startSharing(userId: string): Promise<void> {
    await this.userRepo.updateSharingStatus(userId, true);
  }

  async updateLocation(location: Location): Promise<void> {
    await this.locationRepo.saveLocation(location);
  }

  async getNearbyFriends(
    userId: string,
    center: [number, number],
    radius: number
  ): Promise<Array<{ user: User; location: Location }>> {
    const nearby = await this.locationRepo.findNearbyUsers(center, radius);
    const friends = await this.userRepo.getFriends(userId);

    return nearby
      .filter(loc => friends.includes(loc.userId))
      .map(loc => ({
        location: loc,
        user: friends.find(f => f.id === loc.userId)!
      }));
  }
}

// app.ts - Application entry point
class LocationSharingApp {
  private db: WebGeoDB;
  private locationService: LocationService;

  async init() {
    this.db = new WebGeoDB({
      name: 'location-sharing',
      version: 1
    });

    await this.db.open();

    this.db.schema({
      users: {
        id: 'string',
        name: 'string',
        email: 'string',
        isSharing: 'boolean'
      },
      locations: {
        id: 'string',
        userId: 'string',
        timestamp: 'number',
        geometry: 'geometry',
        accuracy: 'number',
        speed: 'number',
        heading: 'number'
      }
    });

    this.locationService = new LocationService(this.db);
  }

  getService() {
    return this.locationService;
  }
}
```

> **💡 Tip:** Using the Repository Pattern makes it easy to swap data sources in unit tests, improving code testability.

---

### 4.2 Map Visualization Integration

WebGeoDB integrates seamlessly with mainstream map libraries, supporting dynamic data binding and real-time updates.

#### Leaflet Integration

**Key Points**

- Use GeoJSON format to pass data directly
- Utilize LayerGroup to manage large amounts of data
- Implement custom data sources (Real-time DataSource)

**Example Code:**
```typescript
import L from 'leaflet';
import { WebGeoDB } from '@webgeodb/core';

class LeafletMapIntegration {
  private map: L.Map;
  private db: WebGeoDB;
  private featureLayer: L.GeoJSON;

  async init(mapId: string) {
    // Initialize map
    this.map = L.map(mapId).setView([39.9042, 116.4074], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Initialize database
    this.db = new WebGeoDB({ name: 'map-data' });
    await this.db.open();

    // Create layer
    this.featureLayer = L.geoJSON(undefined, {
      onEachFeature: (feature, layer) => {
        layer.bindPopup(`
          <h3>${feature.properties.name}</h3>
          <p>${feature.properties.description}</p>
        `);
      }
    }).addTo(this.map);

    // Load data
    await this.loadData();
  }

  async loadData() {
    const features = await this.db.features.toArray();
    const geojson = {
      type: 'FeatureCollection' as const,
      features: features
    };

    this.featureLayer.addData(geojson);
  }

  async addFeature(feature: Feature) {
    // Save to database
    await this.db.features.insert(feature);

    // Update map
    this.featureLayer.addData(feature);
  }

  async searchNearby(center: [number, number], radius: number) {
    const nearby = await this.db.features
      .distance('geometry', center, '<', radius)
      .toArray();

    // Clear existing markers
    this.featureLayer.clearLayers();

    // Show nearby features
    this.featureLayer.addData({
      type: 'FeatureCollection',
      features: nearby
    });

    // Adjust view
    if (nearby.length > 0) {
      const bounds = L.latLngBounds(
        nearby.map(f => [
          f.geometry.coordinates[1],
          f.geometry.coordinates[0]
        ])
      );
      this.map.fitBounds(bounds);
    }
  }
}

// Usage
const mapApp = new LeafletMapIntegration();
await mapApp.init('map');
```

#### Mapbox GL Integration

**Key Points**

- Use Source and Layer to separate data and styling
- Implement data-driven styles
- Utilize Cluster for large data visualization

**Example Code:**
```typescript
import mapboxgl from 'mapbox-gl';
import { WebGeoDB } from '@webgeodb/core';

class MapboxIntegration {
  private map: mapboxgl.Map;
  private db: WebGeoDB;

  async init(mapId: string) {
    mapboxgl.accessToken = 'YOUR_ACCESS_TOKEN';

    this.map = new mapboxgl.Map({
      container: mapId,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [116.4074, 39.9042],
      zoom: 13
    });

    this.db = new WebGeoDB({ name: 'map-data' });
    await this.db.open();

    this.map.on('load', () => this.setupLayers());
  }

  private async setupLayers() {
    // Load data
    const features = await this.db.features.toArray();

    // Add data source
    this.map.addSource('features', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: features
      }
    });

    // Add clustered data source
    this.map.addSource('features-clustered', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: features
      },
      cluster: true,
      clusterRadius: 50
    });

    // Add cluster circles
    this.map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'features-clustered',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#51bbd6',
          100,
          '#f1f075',
          750,
          '#f28cb1'
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          100,
          30,
          750,
          40
        ]
      }
    });

    // Add unclustered points
    this.map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'features-clustered',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#11b4da',
        'circle-radius': 6,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });

    // Add category labels
    this.map.addLayer({
      id: 'category-label',
      type: 'symbol',
      source: 'features',
      layout: {
        'text-field': ['get', 'category'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-offset': [0, 1.25],
        'text-anchor': 'top'
      },
      paint: {
        'text-color': '#333'
      }
    });
  }

  async filterByCategory(category: string) {
    const features = await this.db.features
      .where('properties.category', '=', category)
      .toArray();

    const source = this.map.getSource('features') as mapboxgl.GeoJSONSource;
    source.setData({
      type: 'FeatureCollection',
      features: features
    });
  }

  async updateFeature(id: string, updates: any) {
    await this.db.features.update(id, updates);

    // Reload all data
    const features = await this.db.features.toArray();
    const source = this.map.getSource('features') as mapboxgl.GeoJSONSource;
    source.setData({
      type: 'FeatureCollection',
      features: features
    });
  }
}
```

---

### 4.3 Real-Time Location Tracking

Combine Geolocation API with WebGeoDB to build a real-time location tracking system.

#### Core Components

**Key Points**

- Use Geolocation API to get location
- Implement track recording and playback
- Calculate distance, speed, heading
- Handle location errors and GPS drift

**Example Code:**
```typescript
interface Track {
  id: string;
  name: string;
  userId: string;
  startTime: number;
  endTime?: number;
  distance: number;
}

class LocationTracker {
  private db: WebGeoDB;
  private watchId: number | null = null;
  private currentTrack: Track | null = null;
  private locations: Location[] = [];

  async init() {
    this.db = new WebGeoDB({
      name: 'location-tracker',
      version: 1
    });

    await this.db.open();

    this.db.schema({
      tracks: {
        id: 'string',
        name: 'string',
        userId: 'string',
        startTime: 'number',
        endTime: 'number',
        distance: 'number'
      },
      locations: {
        id: 'string',
        trackId: 'string',
        timestamp: 'number',
        geometry: 'geometry',
        accuracy: 'number',
        speed: 'number',
        heading: 'number'
      }
    });

    // Create spatial index
    this.db.locations.createIndex('geometry');
  }

  async startTracking(trackName: string): Promise<string> {
    const track: Track = {
      id: crypto.randomUUID(),
      name: trackName,
      userId: 'user-1',
      startTime: Date.now(),
      distance: 0
    };

    await this.db.tracks.insert(track);
    this.currentTrack = track;
    this.locations = [];

    // Start watching position changes
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePositionUpdate(position),
      (error) => this.handlePositionError(error),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
      }
    );

    return track.id;
  }

  private async handlePositionUpdate(position: GeolocationPosition) {
    if (!this.currentTrack) return;

    const location: Location = {
      id: crypto.randomUUID(),
      trackId: this.currentTrack.id,
      timestamp: position.timestamp,
      geometry: {
        type: 'Point',
        coordinates: [
          position.coords.longitude,
          position.coords.latitude
        ]
      },
      accuracy: position.coords.accuracy,
      speed: position.coordsSpeed || undefined,
      heading: position.coords.heading || undefined
    };

    // Save location
    await this.db.locations.insert(location);
    this.locations.push(location);

    // Calculate distance
    if (this.locations.length > 1) {
      const prevLocation = this.locations[this.locations.length - 2];
      const distance = this.calculateDistance(
        prevLocation.geometry.coordinates,
        location.geometry.coordinates
      );

      this.currentTrack.distance += distance;

      // Update track distance
      await this.db.tracks.update(this.currentTrack.id, {
        distance: this.currentTrack.distance
      });
    }

    // Dispatch event
    this.dispatchEvent('locationupdate', { location, track: this.currentTrack });
  }

  private calculateDistance(
    from: [number, number],
    to: [number, number]
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (from[1] * Math.PI) / 180;
    const φ2 = (to[1] * Math.PI) / 180;
    const Δφ = ((to[1] - from[1]) * Math.PI) / 180;
    const Δλ = ((to[0] - from[0]) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  async stopTracking(): Promise<void> {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.currentTrack) {
      await this.db.tracks.update(this.currentTrack.id, {
        endTime: Date.now()
      });
      this.currentTrack = null;
    }

    this.locations = [];
  }

  async getTrack(trackId: string): Promise<{
    track: Track;
    locations: Location[];
    geometry: LineString;
  }> {
    const track = await this.db.tracks.get(trackId);
    const locations = await this.db.locations
      .where('trackId', '=', trackId)
      .orderBy('timestamp', 'asc')
      .toArray();

    // Build track geometry
    const geometry: LineString = {
      type: 'LineString',
      coordinates: locations.map(loc => loc.geometry.coordinates)
    };

    return { track, locations, geometry };
  }

  async replayTrack(
    trackId: string,
    speed: number = 1,
    onUpdate: (location: Location, progress: number) => void
  ): Promise<void> {
    const { locations } = await this.getTrack(trackId);

    for (let i = 0; i < locations.length; i++) {
      const current = locations[i];
      const progress = (i + 1) / locations.length;

      onUpdate(current, progress);

      // Wait (adjust based on speed)
      if (i < locations.length - 1) {
        const next = locations[i + 1];
        const delay = (next.timestamp - current.timestamp) / speed;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private handlePositionError(error: GeolocationPositionError) {
    console.error('Position error:', error);
    this.dispatchEvent('locationerror', { error });
  }

  private dispatchEvent(type: string, detail: any) {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

// Usage
const tracker = new LocationTracker();
await tracker.init();

// Start tracking
const trackId = await tracker.startTracking('Morning Run');

// Listen for location updates
window.addEventListener('locationupdate', (event: any) => {
  const { location, track } = event.detail;
  console.log(`Distance: ${track.distance.toFixed(0)}m`);
});

// Stop tracking
// await tracker.stopTracking();

// Replay track
// await tracker.replayTrack(trackId, 10, (location, progress) => {
//   console.log(`Progress: ${(progress * 100).toFixed(0)}%`);
//   console.log(`Location: ${location.geometry.coordinates}`);
// });
```

---

### 4.4 Offline Support

Build offline-first map applications that provide seamless online/offline experience.

#### Service Worker Configuration

**Key Points**

- Cache map tiles and static resources
- Implement background sync
- Handle offline edit conflicts
- Optimize storage space usage

**Example Code:**
```typescript
// sw.ts - Service Worker
const CACHE_NAME = 'map-app-v1';
const OFFLINE_DATA = 'offline-data';

// Resources to cache
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/vendor/leaflet.js',
  '/vendor/leaflet.css'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Intercept requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle map tile requests
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(handleTileRequest(request));
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static resources
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request);
    })
  );
});

// Handle map tiles
async function handleTileRequest(request: Request): Promise<Response> {
  try {
    // Try to get from network
    const networkResponse = await fetch(request);

    // Cache tile
    const cache = await caches.open(OFFLINE_DATA);
    cache.put(request, networkResponse.clone());

    return networkResponse;
  } catch {
    // Get from cache when offline
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return blank tile
    return new Response('offline', { status: 404 });
  }
}

// Handle API requests
async function handleApiRequest(request: Request): Promise<Response> {
  try {
    // Forward to server when online
    return await fetch(request);
  } catch {
    // Return local data when offline
    return new Response(
      JSON.stringify({ error: 'offline', message: 'No network connection' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-changes') {
    event.waitUntil(syncOfflineChanges());
  }
});

async function syncOfflineChanges() {
  // Sync offline changes
  const offlineChanges = await getOfflineChanges();

  for (const change of offlineChanges) {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        body: JSON.stringify(change)
      });

      await markChangeSynced(change.id);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}
```

#### Offline Data Management

**Example Code:**
```typescript
class OfflineDataManager {
  private db: WebGeoDB;
  private syncQueue: Array<{ type: string; data: any }> = [];

  async init() {
    this.db = new WebGeoDB({
      name: 'offline-map',
      version: 1
    });

    await this.db.open();

    this.db.schema({
      areas: {
        id: 'string',
        name: 'string',
        bbox: 'json',
        downloadedAt: 'number'
      },
      offlineChanges: {
        id: 'string',
        type: 'string',
        data: 'json',
        synced: 'boolean',
        createdAt: 'number'
      }
    });

    // Listen for online status
    window.addEventListener('online', () => this.syncChanges());
  }

  async downloadArea(
    name: string,
    bbox: [number, number, number, number]
  ): Promise<void> {
    // Calculate area bounds
    const polygon: Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [bbox[0], bbox[1]],
          [bbox[2], bbox[1]],
          [bbox[2], bbox[3]],
          [bbox[0], bbox[3]],
          [bbox[0], bbox[1]]
        ]
      ]
    };

    // Download data from server for this area
    const response = await fetch(`/api/features?bbox=${bbox.join(',')}`);
    const features = await response.json();

    // Bulk insert into database
    await this.db.features.bulkPut(features);

    // Record downloaded area
    await this.db.areas.insert({
      id: crypto.randomUUID(),
      name,
      bbox,
      downloadedAt: Date.now()
    });

    console.log(`Downloaded ${features.length} features for ${name}`);
  }

  async getOfflineFeatures(bbox: [number, number, number, number]) {
    // Query offline data
    return await this.db.features
      .intersects('geometry', {
        type: 'Polygon',
        coordinates: [
          [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[1]],
            [bbox[2], bbox[3]],
            [bbox[0], bbox[3]],
            [bbox[0], bbox[1]]
          ]
        ]
      })
      .toArray();
  }

  async queueOfflineChange(type: string, data: any): Promise<void> {
    const change = {
      id: crypto.randomUUID(),
      type,
      data,
      synced: false,
      createdAt: Date.now()
    };

    await this.db.offlineChanges.insert(change);
    this.syncQueue.push(change);
  }

  async syncChanges(): Promise<void> {
    if (!navigator.onLine) return;

    const unsynced = await this.db.offlineChanges
      .where('synced', '=', false)
      .toArray();

    for (const change of unsynced) {
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(change)
        });

        await this.db.offlineChanges.update(change.id, { synced: true });
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
  }

  async getStorageInfo(): Promise<{
    areas: number;
    features: number;
    pendingChanges: number;
  }> {
    const [areas, features, pendingChanges] = await Promise.all([
      this.db.areas.count(),
      this.db.features.count(),
      this.db.offlineChanges.where('synced', '=', false).count()
    ]);

    return { areas, features, pendingChanges };
  }
}
```

---

### 4.5 Data Visualization

Leverage WebGeoDB's spatial query capabilities to implement advanced data visualization.

#### Heatmap

**Key Points**

- Use grid aggregation for data
- Calculate density values
- Render gradient colors

**Example Code:**
```typescript
class HeatmapGenerator {
  private db: WebGeoDB;

  constructor(db: WebGeoDB) {
    this.db = db;
  }

  async generateHeatmap(
    bbox: [number, number, number, number],
    cellSize: number = 0.01
  ): Promise<Array<{ lat: number; lng: number; count: number; intensity: number }>> {
    // Generate grid
    const cells = this.createGrid(bbox, cellSize);

    // Count for each cell
    for (const cell of cells) {
      const count = await this.db.features
        .intersects('geometry', cell.polygon)
        .count();

      cell.count = count;
    }

    // Calculate intensity
    const maxCount = Math.max(...cells.map(c => c.count));
    const heatmapData = cells.map(cell => ({
      lat: cell.center[1],
      lng: cell.center[0],
      count: cell.count,
      intensity: maxCount > 0 ? cell.count / maxCount : 0
    }));

    return heatmapData.filter(d => d.count > 0);
  }

  private createGrid(
    bbox: [number, number, number, number],
    cellSize: number
  ) {
    const [minX, minY, maxX, maxY] = bbox;
    const cells = [];

    for (let x = minX; x < maxX; x += cellSize) {
      for (let y = minY; y < maxY; y += cellSize) {
        const cellBbox: [number, number, number, number] = [
          x,
          y,
          x + cellSize,
          y + cellSize
        ];

        cells.push({
          polygon: this.bboxToPolygon(cellBbox),
          center: [(x + x + cellSize) / 2, (y + y + cellSize) / 2],
          count: 0
        });
      }
    }

    return cells;
  }

  private bboxToPolygon(bbox: [number, number, number, number]): Polygon {
    const [minX, minY, maxX, maxY] = bbox;
    return {
      type: 'Polygon',
      coordinates: [
        [
          [minX, minY],
          [maxX, minY],
          [maxX, maxY],
          [minX, maxY],
          [minX, minY]
        ]
      ]
    };
  }
}

// Render heatmap using Leaflet
async function renderHeatmap(
  map: L.Map,
  db: WebGeoDB,
  bounds: L.LatLngBounds
) {
  const generator = new HeatmapGenerator(db);

  const bbox = [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth()
  ] as [number, number, number, number];

  const heatmapData = await generator.generateHeatmap(bbox, 0.01);

  // Use simple gradient
  const getColor = (intensity: number) => {
    if (intensity < 0.3) return 'blue';
    if (intensity < 0.6) return 'yellow';
    if (intensity < 0.8) return 'orange';
    return 'red';
  };

  // Add heatmap circles
  heatmapData.forEach(point => {
    L.circle([point.lat, point.lng], {
      radius: 500,
      color: getColor(point.intensity),
      fillColor: getColor(point.intensity),
      fillOpacity: 0.6
    }).addTo(map);
  });
}
```

#### Clustering

**Example Code:**
```typescript
class SpatialCluster {
  private db: WebGeoDB;

  constructor(db: WebGeoDB) {
    this.db = db;
  }

  async clusterByCategory(
    category: string,
    threshold: number = 0.001
  ): Promise<Array<{ center: [number, number]; count: number; points: Point[] }>> {
    const features = await this.db.features
      .where('properties.category', '=', category)
      .toArray();

    return this.performClustering(features, threshold);
  }

  private performClustering(
    features: Feature[],
    threshold: number
  ) {
    const clusters: Array<{
      center: [number, number];
      count: number;
      points: Point[];
    }> = [];

    for (const feature of features) {
      const point = feature.geometry as Point;
      let added = false;

      // Try to add to existing cluster
      for (const cluster of clusters) {
        const distance = this.calculateDistance(cluster.center, point.coordinates);
        if (distance <= threshold) {
          cluster.points.push(point);
          cluster.count++;
          // Update center
          cluster.center = this.calculateCenter(cluster.points);
          added = true;
          break;
        }
      }

      // Create new cluster
      if (!added) {
        clusters.push({
          center: point.coordinates,
          count: 1,
          points: [point]
        });
      }
    }

    return clusters;
  }

  private calculateDistance(
    from: [number, number],
    to: [number, number]
  ): number {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateCenter(points: Point[]): [number, number] {
    const sumLon = points.reduce((sum, p) => sum + p.coordinates[0], 0);
    const sumLat = points.reduce((sum, p) => sum + p.coordinates[1], 0);

    return [sumLon / points.length, sumLat / points.length];
  }
}
```

#### Data Aggregation

**Example Code:**
```typescript
class DataAggregator {
  private db: WebGeoDB;

  constructor(db: WebGeoDB) {
    this.db = db;
  }

  async aggregateByRegion(
    regions: Array<{ name: string; polygon: Polygon }>
  ): Promise<Array<{ region: string; count: number; categories: Record<string, number> }>> {
    const results = [];

    for (const region of regions) {
      const features = await this.db.features
        .intersects('geometry', region.polygon)
        .toArray();

      const categories = features.reduce((acc, f) => {
        const category = f.properties.category || 'unknown';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      results.push({
        region: region.name,
        count: features.length,
        categories
      });
    }

    return results;
  }

  async temporalAggregation(
    startTime: number,
    endTime: number,
    interval: number = 3600000 // 1 hour
  ): Promise<Array<{ time: number; count: number }>> {
    const features = await this.db.features
      .where('timestamp', '>=', startTime)
      .where('timestamp', '<=', endTime)
      .toArray();

    const buckets = new Map<number, number>();

    for (const feature of features) {
      const bucket = Math.floor(feature.timestamp / interval) * interval;
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    }

    return Array.from(buckets.entries())
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time - b.time);
  }
}
```

---

## Practice Exercises

### Scenario: Build an Offline Map Application

Implement a city guide app that supports offline usage, allowing users to download specific areas and browse/query them offline.

#### Requirements

1. Implement area data download functionality
2. Support offline nearby place search
3. Integrate Leaflet map display
4. Provide data management interface (view downloaded areas, delete data)

#### Implementation Steps

<details>
<summary>View Implementation Steps</summary>

1. **Step 1**: Initialize project structure and database

   ```typescript
   import { WebGeoDB } from '@webgeodb/core';
   import L from 'leaflet';

   class OfflineCityGuide {
     private db: WebGeoDB;
     private map: L.Map;

     async init() {
       // Initialize database
       this.db = new WebGeoDB({
         name: 'city-guide',
         version: 1
       });

       await this.db.open();

       this.db.schema({
         downloadedAreas: {
           id: 'string',
           name: 'string',
           bbox: 'json',
           downloadedAt: 'number',
           featureCount: 'number'
         },
         pois: {
           id: 'string',
           areaId: 'string',
           name: 'string',
           category: 'string',
           geometry: 'geometry',
           properties: 'json'
         }
       });

       // Create spatial index
       this.db.pois.createIndex('geometry');

       // Initialize map
       this.map = L.map('map').setView([39.9042, 116.4074], 13);
       L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
         attribution: '© OpenStreetMap'
       }).addTo(this.map);
     }
   }
   ```

2. **Step 2**: Implement area download functionality

   ```typescript
   async downloadArea(
     name: string,
     bounds: L.LatLngBounds
   ): Promise<string> {
     const bbox: [number, number, number, number] = [
       bounds.getWest(),
       bounds.getSouth(),
       bounds.getEast(),
       bounds.getNorth()
     ];

     // Fetch data from API
     const response = await fetch(
       `/api/pois?bbox=${bbox.join(',')}&limit=1000`
     );
     const pois = await response.json();

     // Create area record
     const areaId = crypto.randomUUID();
     await this.db.downloadedAreas.insert({
       id: areaId,
       name,
       bbox,
       downloadedAt: Date.now(),
       featureCount: pois.length
     });

     // Bulk insert POIs
     const records = pois.map(poi => ({
       ...poi,
       areaId
     }));

     await this.db.pois.bulkPut(records);

     console.log(`Downloaded ${pois.length} POIs for ${name}`);
     return areaId;
   }
   ```

3. **Step 3**: Implement offline query

   ```typescript
   async findNearbyPOIs(
     center: L.LatLng,
     radius: number = 1000
   ): Promise<Array<{ name: string; category: string; distance: number }>> {
     const nearby = await this.db.pois
       .distance('geometry', [center.lng, center.lat], '<', radius)
       .toArray();

     // Calculate actual distance
     const results = nearby.map(poi => {
       const distance = this.map.distance(
         center,
         L.latLng(poi.geometry.coordinates[1], poi.geometry.coordinates[0])
       );

       return {
         name: poi.name,
         category: poi.category,
         distance
       };
     });

     // Sort by distance
     return results.sort((a, b) => a.distance - b.distance);
   }
   ```

4. **Step 4**: Implement map display

   ```typescript
   displayPOIs(pois: any[]): void {
     // Clear existing markers
     this.map.eachLayer(layer => {
       if (layer instanceof L.Marker) {
         this.map.removeLayer(layer);
       }
     });

     // Add new markers
     pois.forEach(poi => {
       const marker = L.marker([
         poi.geometry.coordinates[1],
         poi.geometry.coordinates[0]
       ]);

       marker.bindPopup(`
         <h3>${poi.name}</h3>
         <p>Category: ${poi.category}</p>
       `);

       marker.addTo(this.map);
     });
   }

   async displayDownloadedAreas(): Promise<void> {
     const areas = await this.db.downloadedAreas.toArray();

     areas.forEach(area => {
       const bounds = L.latLngBounds([
         [area.bbox[1], area.bbox[0]],
         [area.bbox[3], area.bbox[2]]
       ]);

       L.rectangle(bounds, {
         color: '#3388ff',
         weight: 2,
         fillOpacity: 0.1
       })
         .bindPopup(`${area.name}<br>POIs: ${area.featureCount}`)
         .addTo(this.map);
     });
   }
   ```

5. **Step 5**: Implement data management

   ```typescript
   async getDownloadedAreas(): Promise<Array<{
     id: string;
     name: string;
     featureCount: number;
     downloadedAt: number
   }>> {
     return await this.db.downloadedAreas.toArray();
   }

   async deleteArea(areaId: string): Promise<void> {
     // Delete all POIs for the area
     const pois = await this.db.pois.where('areaId', '=', areaId).toArray();
     await this.db.pois.bulkDelete(pois.map(p => p.id));

     // Delete area record
     await this.db.downloadedAreas.delete(areaId);
   }

   async getStorageInfo(): Promise<{
     areas: number;
     pois: number;
   }> {
     const [areas, pois] = await Promise.all([
       this.db.downloadedAreas.count(),
       this.db.pois.count()
     ]);

     return { areas, pois };
   }
   ```

</details>

#### Testing

```typescript
// Test script
async function testOfflineCityGuide() {
  const app = new OfflineCityGuide();
  await app.init();

  // Test 1: Download data
  const bounds = L.latLngBounds([
    [39.89, 116.39],
    [39.92, 116.42]
  ]);

  const areaId = await app.downloadArea('Beijing Tiananmen Area', bounds);
  console.log('Downloaded area:', areaId);

  // Test 2: Offline search
  const center = L.latLng(39.9042, 116.4074);
  const nearby = await app.findNearbyPOIs(center, 1000);
  console.log('Nearby POIs:', nearby);

  // Test 3: Display map
  app.displayDownloadedAreas();

  // Test 4: View storage info
  const storageInfo = await app.getStorageInfo();
  console.log('Storage info:', storageInfo);
}

testOfflineCityGuide();
```

#### Reference Answer

<details>
<summary>View Complete Answer</summary>

For complete implementation code, please refer to:
- English: `/Users/zhangyuting/github/zhyt1985/webgeodb/docs/tutorials/en/projects/offline-city-guide/`

</details>

---

## FAQ

### Q: How to handle rendering performance degradation with large map datasets?

**A:** Use the following optimization strategies:

1. **Data chunking**: Only load data for the visible map viewport
2. **Clustering**: Cluster dense points for display
3. **LOD (Level of Detail)**: Show different detail levels based on zoom
4. **Virtualization**: Only render features within the viewport

```typescript
class MapDataManager {
  async loadVisibleData(bounds: L.LatLngBounds, zoom: number) {
    // Adjust query range based on zoom level
    const bufferSize = Math.max(0, 0.5 - zoom * 0.05);
    const expandedBounds = bounds.pad(bufferSize);

    // Only query features in visible area
    const features = await this.db.features
      .intersects('geometry', this.boundsToPolygon(expandedBounds))
      .limit(1000) // Limit count
      .toArray();

    return features;
  }
}
```

### Q: How to sync offline data with server data?

**A:** Implement the following sync mechanisms:

1. **Version control**: Add version numbers to each data item
2. **Conflict detection**: Compare local and server versions
3. **Auto-merge**: Use last-write-wins or custom conflict resolution
4. **Incremental sync**: Only sync changed data

### Q: How to reduce map application storage usage?

**A:** Use the following optimization strategies:

1. **Data compression**: Use gzip/brotli to compress GeoJSON
2. **Simplify geometry**: Reduce precision, decrease vertex count
3. **On-demand loading**: Only download areas users need
4. **Regular cleanup**: Delete expired offline data

```typescript
// Simplify geometry
function simplifyGeometry(geometry: Geometry, tolerance: number): Geometry {
  // Use Douglas-Peucker algorithm
  // Or use turf.simplify()
  return geometry;
}

// Compress data
function compressData(data: any): string {
  const json = JSON.stringify(data);
  return pako.gzip(json); // Use pako for compression
}
```

---

## Summary

This chapter covered building complete real-world applications, including application architecture design, map integration, real-time tracking, offline support, and data visualization.

### Key Takeaways

- ✅ **Architecture Design**: Repository Pattern and Service Layer for separation of concerns
- ✅ **Map Integration**: Seamless integration with Leaflet, Mapbox GL
- ✅ **Real-time Tracking**: Location tracking and trajectory playback with Geolocation API
- ✅ **Offline Support**: Service Worker and background sync for offline-first approach
- ✅ **Data Visualization**: Heatmaps, clustering, aggregation, and advanced visualizations

### Next Steps

- **[Chapter 5: Advanced Topics](./chapter-05-advanced-topics.md)** - Performance optimization, scalability, security
- **[API Reference](../../api/reference.md)** - View complete API documentation
- **[Examples](../../examples/)** - View more application examples

---

## Resources

- **[Leaflet Documentation](https://leafletjs.com/)** - Official Leaflet docs
- **[Mapbox GL Documentation](https://docs.mapbox.com/mapbox-gl-js/)** - Official Mapbox GL docs
- **[Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)** - Service Worker MDN docs
- **[Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)** - Geolocation API docs
- **[GeoJSON Spec](https://geojson.org/)** - GeoJSON format specification