# Social Location Sharing Application

A privacy-focused social location sharing system built on WebGeoDB, demonstrating how to build a secure and efficient location-based social platform.

## Table of Contents

- [Use Cases](#use-cases)
- [Core Features](#core-features)
- [Technical Architecture](#technical-architecture)
- [Technical Highlights](#technical-highlights)
- [Quick Start](#quick-start)
- [Core Modules](#core-modules)
- [Best Practices](#best-practices)
- [Performance Optimization](#performance-optimization)
- [Security Considerations](#security-considerations)

## Use Cases

### 1. Location Sharing with Privacy Protection
- Share current location with friends with automatic location fuzzing
- Set privacy zones (e.g., home, office) to protect sensitive places
- Temporary location sharing (auto-expiring)
- Location history management

### 2. Nearby Discovery
- Discover friends nearby
- Explore nearby interesting places
- Location-based recommendations
- Real-time location updates

### 3. Place Marking and Sharing
- Create and share custom places
- Place ratings and reviews
- Photo uploads
- Place categories and tags

### 4. Smart Recommendations
- Location-based friend recommendations
- History-based place recommendations
- Collaborative filtering
- Personalized recommendation algorithms

## Core Features

### 1. Privacy Protection Mechanisms

```typescript
// Location fuzzing
interface PrivacyLevel {
  level: 'exact' | 'neighborhood' | 'city' | 'region';
  precision: number; // meters
}

// Location fuzzing service
class PrivacyService {
  fuzzyLocation(location: GeoPoint, level: PrivacyLevel): GeoPoint {
    // Fuzzy location based on privacy level
    const offset = this.calculateOffset(level.precision);
    return location.addRandomOffset(offset);
  }
}
```

### 2. High-Concurrency Location Queries

```typescript
// Batch location query optimization
class LocationQueryService {
  async findNearbyBatch(
    userIds: string[],
    center: GeoPoint,
    radius: number
  ): Promise<Map<string, GeoPoint>> {
    // Use batch queries and cache optimization
    const cacheKey = this.generateCacheKey(userIds, center, radius);
    const cached = await this.cache.get(cacheKey);

    if (cached) return cached;

    // Use WebGeoDB batch query
    const results = await this.webgeodb.georadiusBatch(
      center,
      radius,
      { userId: { $in: userIds } }
    );

    await this.cache.set(cacheKey, results, 60); // Cache for 60s
    return results;
  }
}
```

### 3. Smart Recommendation Algorithms

```typescript
// Location-based recommendations
class RecommendationService {
  async recommendLocations(
    userId: string,
    userLocation: GeoPoint,
    limit: number = 10
  ): Promise<Location[]> {
    // 1. Get user's visited places history
    const history = await this.getUserHistory(userId);

    // 2. Find nearby similar places
    const nearby = await this.webgeodb.georadius(
      userLocation,
      5000, // 5km range
      { category: { $in: history.categories } }
    );

    // 3. Rank by collaborative filtering
    const ranked = await this.rankByCollaborativeFiltering(
      nearby,
      userId
    );

    return ranked.slice(0, limit);
  }
}
```

## Technical Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Web App     │  │  Mobile App  │  │  Admin Panel │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       API Gateway                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Auth      │  │ Rate Limit   │  │ Load Balance │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ User Service │  │Location Svc  │  │Recommend Svc │      │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤      │
│  │ Place Service│  │ Social Svc   │  │ Notify Svc   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  WebGeoDB    │  │  Redis Cache │  │  Msg Queue   │      │
│  │  (Primary)   │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Data Models

```typescript
// User location
interface UserLocation {
  userId: string;
  location: GeoPoint;
  accuracy: number;
  timestamp: Date;
  privacyLevel: PrivacyLevel;
}

// Place
interface Place {
  placeId: string;
  name: string;
  location: GeoPoint;
  category: string;
  rating: number;
  description: string;
  createdBy: string;
  createdAt: Date;
}

// Social relationship
interface SocialRelation {
  userId: string;
  friendId: string;
  locationSharingEnabled: boolean;
  privacyLevel: PrivacyLevel;
}

// Location history
interface LocationHistory {
  userId: string;
  location: GeoPoint;
  placeId?: string;
  timestamp: Date;
}
```

## Technical Highlights

### 1. Location Privacy Protection

**Precision Control**
- Multi-level privacy settings (exact, neighborhood, city, region)
- Automatic random offset addition
- Temporary location sharing (auto-expiring)

**Privacy Zones**
- Define sensitive areas (home, office, etc.)
- Auto-fuzzy locations within privacy zones
- Privacy zone blacklist

### 2. High Concurrency Optimization

**Caching Strategy**
```typescript
// Multi-level cache
class CacheStrategy {
  private l1Cache: LRUCache;  // In-memory cache
  private l2Cache: Redis;     // Redis cache

  async get(key: string): Promise<any> {
    // L1 cache
    let value = this.l1Cache.get(key);
    if (value) return value;

    // L2 cache
    value = await this.l2Cache.get(key);
    if (value) {
      this.l1Cache.set(key, value);
      return value;
    }

    return null;
  }
}
```

**Batch Processing**
- Batch location queries
- Batch data updates
- Pipeline operation optimization

**Connection Pool Management**
- Connection reuse
- Connection warmup
- Auto-reconnection

### 3. Smart Recommendation Algorithms

**Collaborative Filtering**
```typescript
class CollaborativeFiltering {
  // User-based collaborative filtering
  async recommendByUser(userId: string): Promise<Place[]> {
    // 1. Find similar users
    const similarUsers = await this.findSimilarUsers(userId);

    // 2. Get places visited by similar users
    const places = await this.getPlacesVisitedByUsers(
      similarUsers
    );

    // 3. Filter out places user has visited
    const filtered = await this.filterVisited(userId, places);

    // 4. Rank by similarity
    return this.rankBySimilarity(filtered, similarUsers);
  }
}
```

**Content-Based Recommendations**
- User preference based
- Place category based
- Time pattern based

### 4. Real-time Location Updates

**WebSocket Push**
```typescript
class LocationBroadcaster {
  // Broadcast location updates
  async broadcastLocation(
    userId: string,
    location: GeoPoint
  ): Promise<void> {
    // Get friends who follow this user
    const friends = await this.getFriends(userId);

    // Push location update
    friends.forEach(friend => {
      this.websocket.sendToUser(
        friend.id,
        {
          type: 'location_update',
          userId,
          location: this.privacyService.fuzzyLocation(
            location,
            friend.privacyLevel
          )
        }
      );
    });
  }
}
```

## Quick Start

### Install Dependencies

```bash
npm install
```

### Configure Environment

```bash
cp .env.example .env
# Edit .env file, configure database connection, etc.
```

### Initialize Database

```typescript
import { WebGeoDB } from '@webgeodb/core';

const db = new WebGeoDB({
  url: process.env.WEBGEODB_URL
});

// Create indexes
await db.createIndex('users', { location: '2dsphere' });
await db.createIndex('places', { location: '2dsphere' });
await db.createIndex('locations', { location: '2dsphere' });
```

### Start Service

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

## Core Modules

### 1. Location Service

```typescript
import { LocationService } from './services/location.service';

const locationService = new LocationService(db);

// Update user location
await locationService.updateLocation(userId, {
  latitude: 39.9042,
  longitude: 116.4074,
  accuracy: 10,
  privacyLevel: 'neighborhood'
});

// Query nearby users
const nearby = await locationService.findNearbyUsers(
  { latitude: 39.9042, longitude: 116.4074 },
  5000, // 5km
  { limit: 20 }
);
```

### 2. Privacy Service

```typescript
import { PrivacyService } from './services/privacy.service';

const privacyService = new PrivacyService();

// Set privacy level
await privacyService.setPrivacyLevel(userId, {
  level: 'city',
  exceptions: ['home', 'work']
});

// Fuzzy location
const fuzzy = privacyService.fuzzyLocation(
  { latitude: 39.9042, longitude: 116.4074 },
  'neighborhood'
);
```

### 3. Recommendation Service

```typescript
import { RecommendationService } from './services/recommendation.service';

const recommendationService = new RecommendationService(db);

// Recommend places
const recommendations = await recommendationService.recommendLocations(
  userId,
  { latitude: 39.9042, longitude: 116.4074 },
  { limit: 10 }
);

// Recommend friends
const friends = await recommendationService.recommendFriends(
  userId,
  { latitude: 39.9042, longitude: 116.4074 }
);
```

### 4. Place Service

```typescript
import { PlaceService } from './services/place.service';

const placeService = new PlaceService(db);

// Create place
const place = await placeService.createPlace({
  name: 'Forbidden City',
  location: { latitude: 39.9163, longitude: 116.3971 },
  category: 'museum',
  description: 'Imperial palace of Ming and Qing dynasties',
  createdBy: userId
});

// Search nearby places
const nearby = await placeService.searchNearby(
  { latitude: 39.9042, longitude: 116.4074 },
  5000,
  { category: 'museum' }
);
```

## Best Practices

### 1. Privacy Protection

**Default Privacy Level**
```typescript
// New users default to city-level privacy
const defaultPrivacy = {
  level: 'city',
  precision: 3000 // 3km
};
```

**Privacy Zone Settings**
```typescript
// Set sensitive zones
await privacyService.setPrivacyZones(userId, [
  {
    name: 'Home',
    location: { lat: 39.9042, lng: 116.4074 },
    radius: 200, // 200m
    privacyLevel: 'region' // Show as region-level
  }
]);
```

### 2. Performance Optimization

**Batch Operations**
```typescript
// Batch update locations
await locationService.updateLocationsBatch([
  { userId: '1', location: {...} },
  { userId: '2', location: {...} },
  // ...
]);
```

**Cache Warmup**
```typescript
// Warm up hot data
await cacheService.warmUp([
  'popular_places',
  'active_users'
]);
```

### 3. Error Handling

```typescript
try {
  const location = await locationService.getLocation(userId);
} catch (error) {
  if (error instanceof LocationNotFoundError) {
    // Handle location not found
  } else if (error instanceof PermissionDeniedError) {
    // Handle permission error
  } else {
    // Handle other errors
  }
}
```

## Performance Optimization

### Query Optimization

**Use Appropriate Indexes**
```typescript
// Create compound indexes
await db.createIndex('locations', {
  userId: 1,
  timestamp: -1,
  location: '2dsphere'
});
```

**Paginated Queries**
```typescript
// Use cursor pagination
const results = await locationService.findNearbyUsers(
  center,
  radius,
  {
    limit: 20,
    cursor: lastUserId
  }
);
```

### Caching Strategy

**Multi-level Cache**
```typescript
// L1: In-memory cache (recent access)
const l1Cache = new LRUCache({ max: 1000 });

// L2: Redis cache (shared cache)
const l2Cache = new Redis({ host: 'localhost' });

// L3: Database
const db = new WebGeoDB({ url: '...' });
```

**Cache Invalidation**
```typescript
// Invalidate cache on location update
await locationService.updateLocation(userId, location);
await cache.invalidate(`user:${userId}:location`);
```

## Security Considerations

### 1. Data Encryption

**Transmission Encryption**
- Use HTTPS/WSS
- TLS 1.3+

**Storage Encryption**
- Encrypt sensitive data at rest
- Use AES-256

### 2. Access Control

```typescript
// Role-based access control
class AccessControl {
  canViewLocation(requester: string, target: string): boolean {
    // Check if requester has permission to view target's location
    return this.socialService.areFriends(requester, target) &&
           this.privacyService.isSharingEnabled(target);
  }
}
```

### 3. Rate Limiting

```typescript
// API rate limiting
const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100     // Max 100 requests
});
```

### 4. Input Validation

```typescript
// Location data validation
function validateLocation(location: any): boolean {
  return (
    typeof location.latitude === 'number' &&
    typeof location.longitude === 'number' &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    location.longitude >= -180 &&
    location.longitude <= 180
  );
}
```

## Monitoring & Logging

### Performance Monitoring

```typescript
// Query performance monitoring
const perfMonitor = {
  start(label: string) {
    console.time(label);
  },
  end(label: string) {
    console.timeEnd(label);
  }
};

perfMonitor.start('nearby_search');
const results = await locationService.findNearby(...);
perfMonitor.end('nearby_search');
```

### Logging

```typescript
import { Logger } from './utils/logger';

const logger = new Logger('location-service');

logger.info('Location updated', {
  userId,
  location,
  timestamp: new Date()
});
```

## Testing

### Unit Tests

```typescript
import { LocationService } from './services/location.service';

describe('LocationService', () => {
  it('should update user location', async () => {
    const service = new LocationService(mockDB);
    await service.updateLocation('user1', {
      latitude: 39.9042,
      longitude: 116.4074
    });

    const location = await service.getLocation('user1');
    expect(location.latitude).toBe(39.9042);
  });
});
```

### Integration Tests

```typescript
describe('Location API', () => {
  it('should find nearby users', async () => {
    const response = await request(app)
      .get('/api/locations/nearby')
      .query({
        lat: 39.9042,
        lng: 116.4074,
        radius: 5000
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toBeInstanceOf(Array);
  });
});
```

## Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - WEBGEODB_URL=${WEBGEODB_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - redis

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

## Further Reading

- [WebGeoDB Core Concepts](/docs/concepts/core-concepts.md)
- [Geospatial Indexing](/docs/tutorials/geospatial-indexing.md)
- [Query Optimization](/docs/tutorials/query-optimization.md)
- [Data Security](/docs/tutorials/data-security.md)

## Contributing

Contributions are welcome! Please read the [Contributing Guide](/CONTRIBUTING.md).

## License

MIT License
