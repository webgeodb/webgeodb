# 社交地理信息分享应用

基于 WebGeoDB 的隐私保护社交地理信息分享系统，展示了如何构建一个安全、高效的地理位置社交平台。

## 目录

- [应用场景](#应用场景)
- [核心功能](#核心功能)
- [技术架构](#技术架构)
- [技术亮点](#技术亮点)
- [快速开始](#快速开始)
- [核心模块](#核心模块)
- [最佳实践](#最佳实践)
- [性能优化](#性能优化)
- [安全考虑](#安全考虑)

## 应用场景

### 1. 位置分享与隐私保护
- 分享当前位置给好友，自动模糊化精确位置
- 设置隐私区域（如家、公司），保护敏感地点
- 临时位置分享（限时显示）
- 位置历史管理

### 2. 附近发现
- 发现附近的好友
- 探索附近的兴趣地点
- 基于距离的地点推荐
- 实时位置更新

### 3. 地点标记与分享
- 创建和分享自定义地点
- 地点评价和评论
- 地点照片上传
- 地点分类和标签

### 4. 智能推荐
- 基于位置的好友推荐
- 基于历史的地点推荐
- 协同过滤推荐
- 个性化推荐算法

## 核心功能

### 1. 隐私保护机制

```typescript
// 位置模糊化
interface PrivacyLevel {
  level: 'exact' | 'neighborhood' | 'city' | 'region';
  precision: number; // 米
}

// 位置模糊化服务
class PrivacyService {
  fuzzyLocation(location: GeoPoint, level: PrivacyLevel): GeoPoint {
    // 根据隐私级别模糊化位置
    const offset = this.calculateOffset(level.precision);
    return location.addRandomOffset(offset);
  }
}
```

### 2. 高并发位置查询

```typescript
// 批量位置查询优化
class LocationQueryService {
  async findNearbyBatch(
    userIds: string[],
    center: GeoPoint,
    radius: number
  ): Promise<Map<string, GeoPoint>> {
    // 使用批量查询和缓存优化
    const cacheKey = this.generateCacheKey(userIds, center, radius);
    const cached = await this.cache.get(cacheKey);

    if (cached) return cached;

    // 使用 WebGeoDB 批量查询
    const results = await this.webgeodb.georadiusBatch(
      center,
      radius,
      { userId: { $in: userIds } }
    );

    await this.cache.set(cacheKey, results, 60); // 缓存60秒
    return results;
  }
}
```

### 3. 智能推荐算法

```typescript
// 基于位置的推荐
class RecommendationService {
  async recommendLocations(
    userId: string,
    userLocation: GeoPoint,
    limit: number = 10
  ): Promise<Location[]> {
    // 1. 获取用户历史访问地点
    const history = await this.getUserHistory(userId);

    // 2. 查找附近的相似地点
    const nearby = await this.webgeodb.georadius(
      userLocation,
      5000, // 5km范围
      { category: { $in: history.categories } }
    );

    // 3. 基于协同过滤排序
    const ranked = await this.rankByCollaborativeFiltering(
      nearby,
      userId
    );

    return ranked.slice(0, limit);
  }
}
```

## 技术架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Web 应用    │  │  移动应用    │  │  管理后台    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        API 网关                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  认证授权    │  │  限流控制    │  │  负载均衡    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        服务层                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  用户服务    │  │  位置服务    │  │  推荐服务    │      │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤      │
│  │  地点服务    │  │  社交服务    │  │  通知服务    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        数据层                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  WebGeoDB    │  │  Redis 缓存  │  │  消息队列    │      │
│  │  (主数据库)  │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 数据模型

```typescript
// 用户位置
interface UserLocation {
  userId: string;
  location: GeoPoint;
  accuracy: number;
  timestamp: Date;
  privacyLevel: PrivacyLevel;
}

// 地点
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

// 社交关系
interface SocialRelation {
  userId: string;
  friendId: string;
  locationSharingEnabled: boolean;
  privacyLevel: PrivacyLevel;
}

// 位置历史
interface LocationHistory {
  userId: string;
  location: GeoPoint;
  placeId?: string;
  timestamp: Date;
}
```

## 技术亮点

### 1. 位置隐私保护

**精确度控制**
- 支持多级隐私设置（精确、街区、城市、区域）
- 自动添加随机偏移量
- 临时位置分享（自动过期）

**隐私区域**
- 定义敏感区域（家、公司等）
- 自动模糊化敏感区域内的位置
- 隐私区域黑名单

### 2. 高并发优化

**缓存策略**
```typescript
// 多级缓存
class CacheStrategy {
  private l1Cache: LRUCache;  // 内存缓存
  private l2Cache: Redis;     // Redis缓存

  async get(key: string): Promise<any> {
    // L1 缓存
    let value = this.l1Cache.get(key);
    if (value) return value;

    // L2 缓存
    value = await this.l2Cache.get(key);
    if (value) {
      this.l1Cache.set(key, value);
      return value;
    }

    return null;
  }
}
```

**批量处理**
- 批量位置查询
- 批量数据更新
- 管道操作优化

**连接池管理**
- 连接复用
- 连接预热
- 自动重连

### 3. 智能推荐算法

**协同过滤**
```typescript
class CollaborativeFiltering {
  // 基于用户的协同过滤
  async recommendByUser(userId: string): Promise<Place[]> {
    // 1. 找到相似用户
    const similarUsers = await this.findSimilarUsers(userId);

    // 2. 获取相似用户访问的地点
    const places = await this.getPlacesVisitedByUsers(
      similarUsers
    );

    // 3. 过滤用户已访问的地点
    const filtered = await this.filterVisited(userId, places);

    // 4. 按相似度排序
    return this.rankBySimilarity(filtered, similarUsers);
  }
}
```

**内容推荐**
- 基于用户偏好
- 基于地点分类
- 基于时间模式

### 4. 实时位置更新

**WebSocket 推送**
```typescript
class LocationBroadcaster {
  // 广播位置更新
  async broadcastLocation(
    userId: string,
    location: GeoPoint
  ): Promise<void> {
    // 获取关注该用户的好友
    const friends = await this.getFriends(userId);

    // 推送位置更新
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

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境

```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等信息
```

### 初始化数据库

```typescript
import { WebGeoDB } from '@webgeodb/core';

const db = new WebGeoDB({
  url: process.env.WEBGEODB_URL
});

// 创建索引
await db.createIndex('users', { location: '2dsphere' });
await db.createIndex('places', { location: '2dsphere' });
await db.createIndex('locations', { location: '2dsphere' });
```

### 启动服务

```bash
npm run dev
```

### 运行测试

```bash
npm test
```

## 核心模块

### 1. 位置服务 (LocationService)

```typescript
import { LocationService } from './services/location.service';

const locationService = new LocationService(db);

// 更新用户位置
await locationService.updateLocation(userId, {
  latitude: 39.9042,
  longitude: 116.4074,
  accuracy: 10,
  privacyLevel: 'neighborhood'
});

// 查询附近用户
const nearby = await locationService.findNearbyUsers(
  { latitude: 39.9042, longitude: 116.4074 },
  5000, // 5km
  { limit: 20 }
);
```

### 2. 隐私服务 (PrivacyService)

```typescript
import { PrivacyService } from './services/privacy.service';

const privacyService = new PrivacyService();

// 设置隐私级别
await privacyService.setPrivacyLevel(userId, {
  level: 'city',
  exceptions: ['home', 'work']
});

// 模糊化位置
const fuzzy = privacyService.fuzzyLocation(
  { latitude: 39.9042, longitude: 116.4074 },
  'neighborhood'
);
```

### 3. 推荐服务 (RecommendationService)

```typescript
import { RecommendationService } from './services/recommendation.service';

const recommendationService = new RecommendationService(db);

// 推荐地点
const recommendations = await recommendationService.recommendLocations(
  userId,
  { latitude: 39.9042, longitude: 116.4074 },
  { limit: 10 }
);

// 推荐好友
const friends = await recommendationService.recommendFriends(
  userId,
  { latitude: 39.9042, longitude: 116.4074 }
);
```

### 4. 地点服务 (PlaceService)

```typescript
import { PlaceService } from './services/place.service';

const placeService = new PlaceService(db);

// 创建地点
const place = await placeService.createPlace({
  name: '故宫博物院',
  location: { latitude: 39.9163, longitude: 116.3971 },
  category: 'museum',
  description: '中国明清两代的皇家宫殿',
  createdBy: userId
});

// 搜索附近地点
const nearby = await placeService.searchNearby(
  { latitude: 39.9042, longitude: 116.4074 },
  5000,
  { category: 'museum' }
);
```

## 最佳实践

### 1. 隐私保护

**默认隐私级别**
```typescript
// 新用户默认使用城市级别隐私
const defaultPrivacy = {
  level: 'city',
  precision: 3000 // 3km
};
```

**隐私区域设置**
```typescript
// 设置敏感区域
await privacyService.setPrivacyZones(userId, [
  {
    name: '家',
    location: { lat: 39.9042, lng: 116.4074 },
    radius: 200, // 200米
    privacyLevel: 'region' // 显示为区域级别
  }
]);
```

### 2. 性能优化

**批量操作**
```typescript
// 批量更新位置
await locationService.updateLocationsBatch([
  { userId: '1', location: {...} },
  { userId: '2', location: {...} },
  // ...
]);
```

**缓存预热**
```typescript
// 预热热点数据
await cacheService.warmUp([
  'popular_places',
  'active_users'
]);
```

### 3. 错误处理

```typescript
try {
  const location = await locationService.getLocation(userId);
} catch (error) {
  if (error instanceof LocationNotFoundError) {
    // 处理位置未找到
  } else if (error instanceof PermissionDeniedError) {
    // 处理权限错误
  } else {
    // 处理其他错误
  }
}
```

## 性能优化

### 查询优化

**使用合适的索引**
```typescript
// 创建复合索引
await db.createIndex('locations', {
  userId: 1,
  timestamp: -1,
  location: '2dsphere'
});
```

**分页查询**
```typescript
// 使用游标分页
const results = await locationService.findNearbyUsers(
  center,
  radius,
  {
    limit: 20,
    cursor: lastUserId
  }
);
```

### 缓存策略

**多级缓存**
```typescript
// L1: 内存缓存 (最近访问)
const l1Cache = new LRUCache({ max: 1000 });

// L2: Redis 缓存 (共享缓存)
const l2Cache = new Redis({ host: 'localhost' });

// L3: 数据库
const db = new WebGeoDB({ url: '...' });
```

**缓存失效**
```typescript
// 位置更新时失效缓存
await locationService.updateLocation(userId, location);
await cache.invalidate(`user:${userId}:location`);
```

## 安全考虑

### 1. 数据加密

**传输加密**
- 使用 HTTPS/WSS
- TLS 1.3+

**存储加密**
- 敏感数据加密存储
- 使用 AES-256

### 2. 访问控制

```typescript
// 基于角色的访问控制
class AccessControl {
  canViewLocation(requester: string, target: string): boolean {
    // 检查是否有权限查看目标用户位置
    return this.socialService.areFriends(requester, target) &&
           this.privacyService.isSharingEnabled(target);
  }
}
```

### 3. 限流保护

```typescript
// API 限流
const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 100     // 最多100次请求
});
```

### 4. 输入验证

```typescript
// 位置数据验证
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

## 监控与日志

### 性能监控

```typescript
// 查询性能监控
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

### 日志记录

```typescript
import { Logger } from './utils/logger';

const logger = new Logger('location-service');

logger.info('Location updated', {
  userId,
  location,
  timestamp: new Date()
});
```

## 测试

### 单元测试

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

### 集成测试

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

## 部署

### Docker 部署

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

## 扩展阅读

- [WebGeoDB 核心概念](/docs/concepts/core-concepts.md)
- [地理索引](/docs/tutorials/geospatial-indexing.md)
- [查询优化](/docs/tutorials/query-optimization.md)
- [数据安全](/docs/tutorials/data-security.md)

## 贡献指南

欢迎贡献代码和提出建议！请阅读 [贡献指南](/CONTRIBUTING.md)。

## 许可证

MIT License
