# 智慧城市基础设施管理

> **应用领域**: 城市规划与基础设施管理 | **难度**: 高级 | **预计时间**: 2-3小时

## 应用概述

智慧城市基础设施管理系统利用WebGeoDB的强大空间分析能力，为城市规划者和管理者提供全面的地理空间数据管理和分析工具。该系统整合了网络分析、缓冲区分析、多层叠加分析等高级GIS功能，支持道路网络、管网系统、公共设施等多维度基础设施的智能化管理。

### 核心价值

- **网络分析**: 分析道路、管网等网络连通性，计算最优路径
- **服务范围分析**: 计算公共设施的服务半径和覆盖范围
- **多层叠加分析**: 整合人口、交通、环境等多层数据进行综合决策
- **应急响应**: 快速分析管道爆管、道路中断等突发事件的影响范围
- **选址优化**: 基于多因子叠加分析进行公共设施的最佳选址

### 技术亮点

- 高效的空间索引和查询性能
- 支持大规模网络数据（百万级节点）
- 实时缓冲区分析和叠加分析
- 灵活的数据模型支持多种基础设施类型
- 完整的TypeScript类型支持

---

## 系统架构

### 数据模型设计

智慧城市系统需要管理多种类型的基础设施数据，我们设计了以下数据模型：

```typescript
// 1. 道路网络（Road Network）
interface Road {
  id: string;                    // 道路ID
  name: string;                  // 道路名称
  type: 'highway' | 'main' | 'secondary' | 'local';  // 道路类型
  geometry: LineString;          // 道路几何（线）
  length: number;                // 道路长度（米）
  lanes: number;                 // 车道数
  speedLimit: number;            // 限速（km/h）
  condition: 'excellent' | 'good' | 'fair' | 'poor'; // 路况
  properties: {                  // 扩展属性
    width?: number;              // 路宽
    surface?: string;            // 路面材质
    oneWay?: boolean;            // 是否单行道
  };
}

// 2. 管网网络（Pipeline Network）
interface Pipeline {
  id: string;                    // 管道ID
  type: 'water' | 'gas' | 'electric' | 'sewage'; // 管道类型
  geometry: LineString;          // 管道路径
  diameter: number;              // 管径（mm）
  material: string;              // 材质
  depth: number;                 // 埋深（米）
  pressure: number;              // 工作压力
  installDate: Date;             // 安装日期
  condition: number;             // 状态评分（0-100）
}

// 3. 公共设施（Public Facilities）
interface Facility {
  id: string;                    // 设施ID
  name: string;                  // 设施名称
  category: 'hospital' | 'school' | 'park' | 'station' | 'market'; // 设施类别
  geometry: Point;               // 设施位置
  capacity: number;              // 容量/服务能力
  serviceRadius: number;         // 服务半径（米）
  properties: {                  // 扩展属性
    address?: string;            // 地址
    phone?: string;              // 联系电话
    openingHours?: string;       // 营业时间
    rating?: number;             // 评分
  };
}

// 4. 建筑物（Buildings）
interface Building {
  id: string;                    // 建筑ID
  name: string;                  // 建筑名称
  type: 'residential' | 'commercial' | 'industrial' | 'public'; // 建筑类型
  geometry: Polygon;             // 建筑轮廓
  height: number;                // 建筑高度
  floors: number;                // 楼层数
  area: number;                  // 建筑面积
  population?: number;           // 常住人口
  yearBuilt: number;             // 建成年份
}

// 5. 行政区域（Administrative Areas）
interface District {
  id: string;                    // 区域ID
  name: string;                  // 区域名称
  level: 'city' | 'district' | 'community'; // 行政级别
  geometry: Polygon;             // 区域边界
  area: number;                  // 区域面积
  population: number;            // 人口
  gdp: number;                   // GDP
  properties: {                  // 扩展属性
    density?: number;            // 人口密度
    greenCoverage?: number;      // 绿化覆盖率
  };
}
```

### 数据库Schema配置

```typescript
const db = new WebGeoDB({
  name: 'smart-city-db',
  version: 1
});

db.schema({
  // 道路网络表
  roads: {
    id: 'string',
    name: 'string',
    type: 'string',
    geometry: 'geometry',
    length: 'number',
    lanes: 'number',
    speedLimit: 'number',
    condition: 'string',
    properties: 'json',
    createdAt: 'datetime',
    updatedAt: 'datetime'
  },

  // 管网网络表
  pipelines: {
    id: 'string',
    type: 'string',
    geometry: 'geometry',
    diameter: 'number',
    material: 'string',
    depth: 'number',
    pressure: 'number',
    installDate: 'datetime',
    condition: 'number',
    createdAt: 'datetime'
  },

  // 公共设施表
  facilities: {
    id: 'string',
    name: 'string',
    category: 'string',
    geometry: 'geometry',
    capacity: 'number',
    serviceRadius: 'number',
    properties: 'json',
    createdAt: 'datetime'
  },

  // 建筑物表
  buildings: {
    id: 'string',
    name: 'string',
    type: 'string',
    geometry: 'geometry',
    height: 'number',
    floors: 'number',
    area: 'number',
    population: 'number',
    yearBuilt: 'number',
    createdAt: 'datetime'
  },

  // 行政区域表
  districts: {
    id: 'string',
    name: 'string',
    level: 'string',
    geometry: 'geometry',
    area: 'number',
    population: 'number',
    gdp: 'number',
    properties: 'json',
    createdAt: 'datetime'
  }
});
```

---

## 核心功能实现

### 1. 道路网络分析

道路网络分析是智慧城市交通管理的基础，包括连通性分析、路径规划、服务范围计算等。

#### 1.1 道路连通性分析

```typescript
/**
 * 分析道路网络的连通性
 * @param db WebGeoDB实例
 * @param startRoadId 起始道路ID
 * @param maxDistance 最大搜索距离（米）
 */
async function analyzeRoadConnectivity(
  db: WebGeoDB,
  startRoadId: string,
  maxDistance: number = 5000
) {
  // 获取起始道路
  const startRoad = await db.roads.get(startRoadId);
  if (!startRoad) {
    throw new Error(`道路 ${startRoadId} 不存在`);
  }

  // 创建起点缓冲区
  const startPoint = turf.point(startRoad.geometry.coordinates[0]);
  const searchBuffer = turf.buffer(startPoint, maxDistance, { units: 'kilometers' });

  // 查找缓冲区内的所有道路
  const nearbyRoads = await db.roads.filter(road => {
    const roadLine = turf.lineString(road.geometry.coordinates);
    return turf.booleanIntersects(roadLine, searchBuffer);
  }).toArray();

  // 分析连通性
  const connectivity = {
    startRoad: startRoad.name,
    totalRoads: nearbyRoads.length,
    connectedRoads: [] as string[],
    networkTypes: {} as Record<string, number>,
    totalLength: 0
  };

  for (const road of nearbyRoads) {
    // 检查是否与起始道路相交
    const isConnected = turf.booleanIntersects(
      turf.lineString(startRoad.geometry.coordinates),
      turf.lineString(road.geometry.coordinates)
    );

    if (isConnected && road.id !== startRoadId) {
      connectivity.connectedRoads.push(road.name);
      connectivity.totalLength += road.length;

      // 统计道路类型
      connectivity.networkTypes[road.type] =
        (connectivity.networkTypes[road.type] || 0) + 1;
    }
  }

  return connectivity;
}
```

#### 1.2 最优路径规划

```typescript
/**
 * 计算两点之间的最优路径
 * @param db WebGeoDB实例
 * @param startCoord 起点坐标 [经度, 纬度]
 * @param endCoord 终点坐标 [经度, 纬度]
 * @param roadType 道路类型偏好
 */
async function findOptimalPath(
  db: WebGeoDB,
  startCoord: [number, number],
  endCoord: [number, number],
  roadType?: string
) {
  const startPoint = turf.point(startCoord);
  const endPoint = turf.point(endCoord);

  // 创建搜索缓冲区
  const directDistance = turf.distance(startPoint, endPoint, { units: 'kilometers' });
  const searchBuffer = turf.buffer(
    turf.lineString([startCoord, endCoord]),
    directDistance * 0.5,
    { units: 'kilometers' }
  );

  // 查找候选道路
  let query = db.roads.filter(road => {
    const roadLine = turf.lineString(road.geometry.coordinates);
    return turf.booleanIntersects(roadLine, searchBuffer);
  });

  // 按道路类型过滤
  if (roadType) {
    query = query.filter(road => road.type === roadType);
  }

  const candidateRoads = await query.toArray();

  // 构建网络图（简化版）
  const graph = buildRoadGraph(candidateRoads);

  // 查找最近的道路节点
  const startNode = findNearestNode(graph, startCoord);
  const endNode = findNearestNode(graph, endCoord);

  // 使用Dijkstra算法计算最短路径
  const path = dijkstra(graph, startNode, endNode);

  return {
    path: path.nodes,
    distance: path.distance,
    estimatedTime: path.distance / 50, // 假设平均速度50km/h
    roads: path.roads
  };
}

/**
 * 构建道路网络图
 */
function buildRoadGraph(roads: any[]) {
  const graph: Record<string, any> = {};

  for (const road of roads) {
    const coords = road.geometry.coordinates;
    for (let i = 0; i < coords.length - 1; i++) {
      const from = coords[i].join(',');
      const to = coords[i + 1].join(',');
      const dist = turf.distance(
        turf.point(coords[i]),
        turf.point(coords[i + 1]),
        { units: 'kilometers' }
      );

      if (!graph[from]) graph[from] = {};
      if (!graph[to]) graph[to] = {};

      // 双向边（如果不是单行道）
      if (!road.properties?.oneWay) {
        graph[from][to] = dist;
        graph[to][from] = dist;
      } else {
        graph[from][to] = dist;
      }
    }
  }

  return graph;
}

/**
 * Dijkstra最短路径算法
 */
function dijkstra(graph: Record<string, any>, start: string, end: string) {
  const distances: Record<string, number> = {};
  const previous: Record<string, string> = {};
  const visited = new Set<string>();
  const queue: string[] = [];

  // 初始化
  for (const node in graph) {
    distances[node] = Infinity;
    queue.push(node);
  }
  distances[start] = 0;

  while (queue.length > 0) {
    // 找到距离最小的节点
    queue.sort((a, b) => distances[a] - distances[b]);
    const current = queue.shift()!;

    if (current === end) break;

    visited.add(current);

    // 更新邻居节点距离
    for (const neighbor in graph[current]) {
      if (visited.has(neighbor)) continue;

      const alt = distances[current] + graph[current][neighbor];
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        previous[neighbor] = current;
      }
    }
  }

  // 重建路径
  const path = [];
  let current = end;
  while (current) {
    path.unshift(current);
    current = previous[current];
  }

  return {
    nodes: path,
    distance: distances[end]
  };
}
```

### 2. 管网分析

管网分析包括连通性检查、影响范围分析、爆管模拟等。

#### 2.1 管网连通性检查

```typescript
/**
 * 检查管网连通性
 * @param db WebGeoDB实例
 * @param pipelineId 起始管道ID
 */
async function checkPipelineConnectivity(db: WebGeoDB, pipelineId: string) {
  const startPipeline = await db.pipelines.get(pipelineId);
  if (!startPipeline) {
    throw new Error(`管道 ${pipelineId} 不存在`);
  }

  // 查找相同类型的管道
  const sameTypePipelines = await db.pipelines
    .filter(p => p.type === startPipeline.type)
    .toArray();

  // 构建管网图
  const graph = buildPipelineGraph(sameTypePipelines);

  // 查找连通的管道
  const visited = new Set<string>();
  const queue = [pipelineId];
  const connectedPipelines = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;

    visited.add(currentId);
    const pipeline = await db.pipelines.get(currentId);
    if (pipeline) {
      connectedPipelines.push({
        id: pipeline.id,
        diameter: pipeline.diameter,
        condition: pipeline.condition
      });
    }

    // 添加连接的管道
    const connections = graph[currentId] || [];
    for (const connId of connections) {
      if (!visited.has(connId)) {
        queue.push(connId);
      }
    }
  }

  return {
    startPipeline: startPipeline.id,
    connectedCount: connectedPipelines.length,
    pipelines: connectedPipelines,
    totalLength: connectedPipelines.reduce((sum, p) => sum + (p.length || 0), 0)
  };
}

/**
 * 构建管网图
 */
function buildPipelineGraph(pipelines: any[]) {
  const graph: Record<string, string[]> = {};
  const tolerance = 0.0001; // 连接容差（度）

  for (const p1 of pipelines) {
    if (!graph[p1.id]) graph[p1.id] = [];
    const coords1 = p1.geometry.coordinates;
    const start1 = coords1[0];
    const end1 = coords1[coords1.length - 1];

    for (const p2 of pipelines) {
      if (p1.id === p2.id) continue;

      const coords2 = p2.geometry.coordinates;
      const start2 = coords2[0];
      const end2 = coords2[coords2.length - 1];

      // 检查端点是否连接
      const connected =
        distance(start1, start2) < tolerance ||
        distance(start1, end2) < tolerance ||
        distance(end1, start2) < tolerance ||
        distance(end1, end2) < tolerance;

      if (connected) {
        graph[p1.id].push(p2.id);
      }
    }
  }

  return graph;
}
```

#### 2.2 爆管影响范围分析

```typescript
/**
 * 分析管道爆管的影响范围
 * @param db WebGeoDB实例
 * @param pipelineId 爆管管道ID
 * @param shutdownRadius 关阀半径（米）
 */
async function analyzePipeBurstImpact(
  db: WebGeoDB,
  pipelineId: string,
  shutdownRadius: number = 1000
) {
  const burstPipeline = await db.pipelines.get(pipelineId);
  if (!burstPipeline) {
    throw new Error(`管道 ${pipelineId} 不存在`);
  }

  // 1. 找到需要关闭的阀门（假设阀门在管道端点）
  const coords = burstPipeline.geometry.coordinates;
  const valves = [
    turf.point(coords[0]),
    turf.point(coords[coords.length - 1])
  ];

  // 2. 计算影响区域（关阀区域）
  const impactAreas = valves.map(valve =>
    turf.buffer(valve, shutdownRadius / 1000, { units: 'kilometers' })
  );

  // 3. 查找影响区域内的建筑物
  const affectedBuildings = await db.buildings.filter(building => {
    return impactAreas.some(area =>
      turf.booleanIntersects(building.geometry, area)
    );
  }).toArray();

  // 4. 计算受影响人口
  const affectedPopulation = affectedBuildings.reduce(
    (sum, b) => sum + (b.population || 0),
    0
  );

  // 5. 查找影响区域内的关键设施
  const affectedFacilities = await db.facilities.filter(facility => {
    return impactAreas.some(area =>
      turf.booleanIntersects(facility.geometry, area)
    );
  }).toArray();

  return {
    burstPipeline: {
      id: burstPipeline.id,
      type: burstPipeline.type,
      diameter: burstPipeline.diameter
    },
    impactArea: {
      radius: shutdownRadius,
      area: impactAreas.reduce((sum, area) => sum + turf.area(area), 0)
    },
    affectedBuildings: {
      count: affectedBuildings.length,
      population: affectedPopulation
    },
    affectedFacilities: affectedFacilities.map(f => ({
      name: f.name,
      category: f.category,
      capacity: f.capacity
    })),
    recommendations: generateEmergencyRecommendations(
      burstPipeline.type,
      affectedPopulation,
      affectedFacilities
    )
  };
}

/**
 * 生成应急建议
 */
function generateEmergencyRecommendations(
  pipelineType: string,
  population: number,
  facilities: any[]
) {
  const recommendations = [];

  if (pipelineType === 'water') {
    recommendations.push('立即启动备用水源');
    recommendations.push('通知受影响居民储水');
    if (population > 1000) {
      recommendations.push('协调应急供水车');
    }
  } else if (pipelineType === 'gas') {
    recommendations.push('立即切断气源');
    recommendations.push('疏散周边100米内居民');
    recommendations.push('通知消防部门待命');
  } else if (pipelineType === 'electric') {
    recommendations.push('启动备用电源');
    if (facilities.some(f => f.category === 'hospital')) {
      recommendations.push('优先保障医院供电');
    }
  }

  return recommendations;
}
```

### 3. 公共设施服务范围分析

分析公共设施的服务能力、覆盖范围和服务缺口。

```typescript
/**
 * 分析公共设施服务范围
 * @param db WebGeoDB实例
 * @param facilityCategory 设施类别
 */
async function analyzeFacilityService(
  db: WebGeoDB,
  facilityCategory: string
) {
  // 1. 获取所有同类设施
  const facilities = await db.facilities
    .filter(f => f.category === facilityCategory)
    .toArray();

  // 2. 为每个设施创建服务范围缓冲区
  const serviceBuffers = facilities.map(facility => ({
    facility: facility.name,
    buffer: turf.buffer(
      turf.point(facility.geometry.coordinates),
      facility.serviceRadius / 1000,
      { units: 'kilometers' }
    ),
    capacity: facility.capacity,
    area: 0
  }));

  // 计算每个服务范围的面积
  serviceBuffers.forEach(sb => {
    sb.area = turf.area(sb.buffer);
  });

  // 3. 查找服务缺口区域
  const allBuffers = turf.union(
    ...serviceBuffers.map(sb => sb.buffer)
  );

  // 4. 获取所有建筑
  const buildings = await db.buildings.toArray();
  let unservedPopulation = 0;
  const unservedBuildings = [];

  for (const building of buildings) {
    const centroid = turf.centroid(building.geometry);
    const isServed = facilities.some(facility => {
      const facilityPoint = turf.point(facility.geometry.coordinates);
      const distance = turf.distance(centroid, facilityPoint, {
        units: 'kilometers'
      }) * 1000;
      return distance <= facility.serviceRadius;
    });

    if (!isServed) {
      unservedPopulation += building.population || 0;
      unservedBuildings.push(building);
    }
  }

  // 5. 计算服务覆盖率
  const totalPopulation = buildings.reduce(
    (sum, b) => sum + (b.population || 0),
    0
  );
  const coverageRate = ((totalPopulation - unservedPopulation) / totalPopulation * 100);

  // 6. 找出服务缺口区域（聚类未服务建筑）
  let gapAreas: any[] = [];
  if (unservedBuildings.length > 0) {
    const unservedPoints = turf.points(
      unservedBuildings.map(b => {
        const centroid = turf.centroid(b.geometry);
        return centroid.geometry.coordinates;
      })
    );
    const clusters = turf.clustersKmeans(unservedPoints, { numberOfClusters: 3 });
    gapAreas = clusters.features.map(cluster => {
      const clusterPoints = turf.points(
        unservedBuildings
          .filter(b => {
            const centroid = turf.centroid(b.geometry);
            return cluster.geometry.coordinates.some((c: any) =>
              c[0] === centroid.geometry.coordinates[0] &&
              c[1] === centroid.geometry.coordinates[1]
            );
          })
          .map(b => {
            const centroid = turf.centroid(b.geometry);
            return centroid.geometry.coordinates;
          })
      );
      return turf.convex(clusterPoints);
    }).filter(area => area !== null);
  }

  return {
    facilityType: facilityCategory,
    totalFacilities: facilities.length,
    serviceStats: {
      totalArea: serviceBuffers.reduce((sum, sb) => sum + sb.area, 0),
      totalCapacity: facilities.reduce((sum, f) => sum + f.capacity, 0),
      servedPopulation: totalPopulation - unservedPopulation,
      unservedPopulation,
      coverageRate: coverageRate.toFixed(2) + '%'
    },
    facilities: serviceBuffers.map(sb => ({
      name: sb.facility,
      serviceArea: sb.area.toFixed(2) + ' 平方米',
      capacity: sb.capacity
    })),
    serviceGaps: {
      areas: gapAreas.length,
      population: unservedPopulation,
      buildings: unservedBuildings.length
    },
    recommendations: generateFacilityRecommendations(
      facilityCategory,
      coverageRate,
      unservedPopulation,
      gapAreas
    )
  };
}

/**
 * 生成设施优化建议
 */
function generateFacilityRecommendations(
  category: string,
  coverageRate: number,
  unservedPopulation: number,
  gapAreas: any[]
) {
  const recommendations = [];

  if (coverageRate < 80) {
    recommendations.push(`服务覆盖率仅${coverageRate.toFixed(1)}%，建议新增设施`);
  }

  if (unservedPopulation > 5000) {
    recommendations.push(`约${unservedPopulation}人未覆盖，建议优先在服务缺口区域新增设施`);
  }

  if (gapAreas.length > 0) {
    recommendations.push(`识别出${gapAreas.length}个主要服务缺口区域`);
  }

  if (category === 'school') {
    recommendations.push('建议参考学区划分和人口分布进行选址');
  } else if (category === 'hospital') {
    recommendations.push('建议确保每个区域至少有1家综合医院');
  } else if (category === 'park') {
    recommendations.push('建议按照人均绿地面积标准进行规划');
  }

  return recommendations;
}
```

### 4. 多层叠加分析

整合多个图层进行综合空间分析。

```typescript
/**
 * 多层叠加分析
 * @param db WebGeoDB实例
 * @param analysisType 分析类型
 */
async function multiLayerOverlayAnalysis(
  db: WebGeoDB,
  analysisType: 'suitability' | 'risk' | 'accessibility'
) {
  switch (analysisType) {
    case 'suitability':
      return await analyzeSiteSuitability(db);
    case 'risk':
      return await analyzeRiskAreas(db);
    case 'accessibility':
      return await analyzeAccessibility(db);
    default:
      throw new Error('不支持的分析类型');
  }
}

/**
 * 最佳选址分析
 * 分析多个因子，找出最适合建设新设施的区域
 */
async function analyzeSiteSuitability(db: WebGeoDB) {
  // 1. 定义分析因子和权重
  const factors = {
    populationDensity: 0.3,    // 人口密度
    trafficAccessibility: 0.25, // 交通便利性
    distanceToExisting: 0.2,   // 与现有设施距离
    environmentQuality: 0.15,   // 环境质量
    landCost: 0.1              // 土地成本
  };

  // 2. 获取所有区域
  const districts = await db.districts.toArray();

  // 3. 为每个区域计算综合得分
  const results = [];

  for (const district of districts) {
    const scores = {
      populationDensity: calculatePopulationDensity(district),
      trafficAccessibility: await calculateTrafficAccessibility(db, district),
      distanceToExisting: await calculateDistanceToFacilities(db, district),
      environmentQuality: calculateEnvironmentQuality(district),
      landCost: estimateLandCost(district)
    };

    // 加权计算总分
    const totalScore = Object.entries(scores).reduce((sum, [key, value]) => {
      return sum + value * factors[key as keyof typeof factors];
    }, 0);

    results.push({
      district: district.name,
      scores,
      totalScore: totalScore.toFixed(3),
      ranking: 0 // 稍后计算
    });
  }

  // 4. 排序并添加排名
  results.sort((a, b) => parseFloat(b.totalScore) - parseFloat(a.totalScore));
  results.forEach((r, i) => r.ranking = i + 1);

  // 5. 找出最优区域
  const bestDistrict = results[0];

  // 6. 在最优区域内找出最佳地块
  const bestSites = await findBestSitesInDistrict(db, bestDistrict.district);

  return {
    analysisType: '选址适宜性分析',
    factors,
    results: results.slice(0, 5), // 返回前5名
    bestDistrict: bestDistrict.district,
    bestSites,
    recommendation: `建议优先考虑 ${bestDistrict.district}，综合得分最高`
  };
}

/**
 * 计算人口密度得分
 */
function calculatePopulationDensity(district: any): number {
  const density = district.properties?.density || district.population / district.area;
  // 归一化到0-1，假设理想密度为10000人/平方公里
  return Math.min(density / 10000, 1);
}

/**
 * 计算交通便利性得分
 */
async function calculateTrafficAccessibility(db: WebGeoDB, district: any) {
  // 查找区域内的主要道路
  const mainRoads = await db.roads
    .filter(road => {
      const roadLine = turf.lineString(road.geometry.coordinates);
      return turf.booleanIntersects(roadLine, district.geometry) &&
             (road.type === 'highway' || road.type === 'main');
    })
    .toArray();

  // 计算道路密度
  const districtArea = turf.area(district.geometry);
  const totalRoadLength = mainRoads.reduce((sum, road) => sum + road.length, 0);
  const roadDensity = totalRoadLength / districtArea;

  // 归一化到0-1
  return Math.min(roadDensity * 100, 1);
}

/**
 * 计算与现有设施的距离得分
 */
async function calculateDistanceToFacilities(db: WebGeoDB, district: any) {
  const centroid = turf.centroid(district.geometry);
  const facilities = await db.facilities.toArray();

  // 计算到最近设施的距离
  const distances = facilities.map(f => {
    const facilityPoint = turf.point(f.geometry.coordinates);
    return turf.distance(centroid, facilityPoint, { units: 'kilometers' });
  });

  const minDistance = Math.min(...distances);

  // 理想距离为1-3公里
  if (minDistance >= 1 && minDistance <= 3) return 1;
  if (minDistance < 1) return minDistance;
  return Math.max(0, 1 - (minDistance - 3) / 2);
}

/**
 * 计算环境质量得分
 */
function calculateEnvironmentQuality(district: any): number {
  const greenCoverage = district.properties?.greenCoverage || 0;
  return greenCoverage / 100;
}

/**
 * 估算土地成本（模拟）
 */
function estimateLandCost(district: any): number {
  // 基于GDP估算，GDP越高地价越高
  // 这里简化处理，实际应用中需要更复杂的模型
  const gdpPerCapita = district.gdp / district.population;
  const normalizedGdp = Math.min(gdpPerCapita / 100000, 1);
  return 1 - normalizedGdp; // 成本越低得分越高
}

/**
 * 在区域内找出最佳地块
 */
async function findBestSitesInDistrict(db: WebGeoDB, districtName: string) {
  const district = await db.districts.filter(d => d.name === districtName).first();

  if (!district) return [];

  // 在区域内创建候选点位网格
  const bbox = turf.bbox(district.geometry);
  const cellSize = 0.002; // 约200米
  const candidates = [];

  for (let lon = bbox[0]; lon < bbox[2]; lon += cellSize) {
    for (let lat = bbox[1]; lat < bbox[3]; lat += cellSize) {
      const point = turf.point([lon, lat]);
      if (turf.booleanPointInPolygon(point, district.geometry)) {
        candidates.push(point);
      }
    }
  }

  // 评估每个候选点位
  const scoredCandidates = await Promise.all(
    candidates.slice(0, 20).map(async (candidate) => {
      // 检查是否与建筑物冲突
      const conflictingBuildings = await db.buildings.filter(b =>
        turf.booleanPointInPolygon(candidate, b.geometry)
      ).toArray();

      if (conflictingBuildings.length > 0) {
        return { point: candidate, score: 0, reason: '与建筑物冲突' };
      }

      // 计算到主要设施的距离
      const facilities = await db.facilities.toArray();
      const distances = facilities.map(f =>
        turf.distance(candidate, turf.point(f.geometry.coordinates), {
          units: 'kilometers'
        })
      );

      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;

      return {
        point: candidate,
        score: 1 / (1 + avgDistance), // 距离越近得分越高
        avgDistance
      };
    })
  );

  // 返回前3个最佳点位
  return scoredCandidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((c, i) => ({
      rank: i + 1,
      coordinates: c.point.geometry.coordinates,
      score: c.score.toFixed(3),
      avgDistance: c.avgDistance?.toFixed(2) + ' km'
    }));
}

/**
 * 风险区域分析
 */
async function analyzeRiskAreas(db: WebGeoDB) {
  // 分析洪水、地质等风险区域
  const buildings = await db.buildings.toArray();
  const highRiskBuildings = [];

  for (const building of buildings) {
    const centroid = turf.centroid(building.geometry);
    let riskLevel = 'low';
    const factors = [];

    // 检查是否靠近河道（简化）
    // 实际应用中需要使用真实的水系数据

    // 检查建筑年代
    const age = 2025 - building.yearBuilt;
    if (age > 30) {
      riskLevel = 'medium';
      factors.push('建筑年代久远');
    }

    // 检查人口密度
    if (building.population && building.population > 500) {
      factors.push('高密度建筑');
    }

    if (factors.length >= 2) {
      riskLevel = 'high';
    }

    if (riskLevel !== 'low') {
      highRiskBuildings.push({
        name: building.name,
        type: building.type,
        riskLevel,
        factors,
        population: building.population
      });
    }
  }

  return {
    analysisType: '风险区域分析',
    totalBuildings: buildings.length,
    highRiskBuildings: highRiskBuildings.length,
    details: highRiskBuildings,
    recommendations: [
      '对高风险建筑进行结构加固',
      '制定应急预案',
      '定期安全检查'
    ]
  };
}

/**
 * 可达性分析
 */
async function analyzeAccessibility(db: WebGeoDB) {
  // 分析公共交通可达性
  const buildings = await db.buildings.toArray();
  const stations = await db.facilities
    .filter(f => f.category === 'station')
    .toArray();

  let accessibleCount = 0;
  let totalPopulation = 0;
  let accessiblePopulation = 0;
  const accessibilityByBuilding = [];

  for (const building of buildings) {
    const centroid = turf.centroid(building.geometry);
    const distances = stations.map(station =>
      turf.distance(centroid, turf.point(station.geometry.coordinates), {
        units: 'kilometers'
      }) * 1000
    );

    const minDistance = Math.min(...distances);
    const isAccessible = minDistance <= 500; // 500米内认为可达

    if (isAccessible) {
      accessibleCount++;
      accessiblePopulation += building.population || 0;
    }
    totalPopulation += building.population || 0;

    accessibilityByBuilding.push({
      building: building.name,
      nearestStation: distances.indexOf(minDistance),
      distance: minDistance.toFixed(0) + '米',
      accessible: isAccessible
    });
  }

  const accessibilityRate = (accessibleCount / buildings.length * 100);
  const populationAccessibilityRate = (accessiblePopulation / totalPopulation * 100);

  return {
    analysisType: '公共交通可达性分析',
    accessibilityRate: accessibilityRate.toFixed(1) + '%',
    populationAccessibilityRate: populationAccessibilityRate.toFixed(1) + '%',
    accessibleBuildings: accessibleCount,
    totalBuildings: buildings.length,
    recommendations: accessibilityRate < 80 ? [
      '公共交通覆盖率较低',
      '建议在盲区增加公交站点',
      '优化公交线路'
    ] : [
      '公共交通覆盖良好',
      '继续优化线路布局'
    ]
  };
}
```

### 5. 空间统计分析

对城市空间数据进行统计分析，支持决策制定。

```typescript
/**
 * 城市空间统计分析
 * @param db WebGeoDB实例
 */
async function spatialStatisticsAnalysis(db: WebGeoDB) {
  const stats = {
    infrastructure: await analyzeInfrastructureStats(db),
    population: await analyzePopulationDistribution(db),
    landUse: await analyzeLandUse(db),
    development: await analyzeDevelopmentLevel(db)
  };

  return stats;
}

/**
 * 基础设施统计
 */
async function analyzeInfrastructureStats(db: WebGeoDB) {
  // 道路统计
  const roads = await db.roads.toArray();
  const roadStats = {
    total: roads.length,
    totalLength: roads.reduce((sum, r) => sum + r.length, 0),
    byType: {} as Record<string, { count: number; length: number }>,
    averageCondition: 0
  };

  let conditionSum = 0;
  const conditionMap = { excellent: 4, good: 3, fair: 2, poor: 1 };

  for (const road of roads) {
    if (!roadStats.byType[road.type]) {
      roadStats.byType[road.type] = { count: 0, length: 0 };
    }
    roadStats.byType[road.type].count++;
    roadStats.byType[road.type].length += road.length;

    conditionSum += conditionMap[road.condition] || 0;
  }
  roadStats.averageCondition = (conditionSum / roads.length).toFixed(2);

  // 管网统计
  const pipelines = await db.pipelines.toArray();
  const pipelineStats = {
    total: pipelines.length,
    totalLength: pipelines.reduce((sum, p) => {
      const line = turf.lineString(p.geometry.coordinates);
      return sum + turf.length(line, { units: 'kilometers' }) * 1000;
    }, 0),
    byType: {} as Record<string, { count: number; length: number }>,
    averageCondition: 0
  };

  for (const pipeline of pipelines) {
    if (!pipelineStats.byType[pipeline.type]) {
      pipelineStats.byType[pipeline.type] = { count: 0, length: 0 };
    }
    pipelineStats.byType[pipeline.type].count++;
  }
  pipelineStats.averageCondition = (
    pipelines.reduce((sum, p) => sum + p.condition, 0) / pipelines.length
  ).toFixed(2);

  // 设施统计
  const facilities = await db.facilities.toArray();
  const facilityStats = {
    total: facilities.length,
    byCategory: {} as Record<string, number>,
    totalCapacity: facilities.reduce((sum, f) => sum + f.capacity, 0)
  };

  for (const facility of facilities) {
    facilityStats.byCategory[facility.category] =
      (facilityStats.byCategory[facility.category] || 0) + 1;
  }

  return {
    roads: roadStats,
    pipelines: pipelineStats,
    facilities: facilityStats
  };
}

/**
 * 人口分布分析
 */
async function analyzePopulationDistribution(db: WebGeoDB) {
  const buildings = await db.buildings.toArray();
  const districts = await db.districts.toArray();

  // 按区域统计人口
  const populationByDistrict = await Promise.all(
    districts.map(async (district) => {
      const buildingsInDistrict = buildings.filter(b =>
        turf.booleanIntersects(b.geometry, district.geometry)
      );

      const population = buildingsInDistrict.reduce(
        (sum, b) => sum + (b.population || 0),
        0
      );

      const area = turf.area(district.geometry);
      const density = population / (area / 1000000); // 人/平方公里

      return {
        district: district.name,
        population,
        area: (area / 1000000).toFixed(2) + ' 平方公里',
        density: density.toFixed(0)
      };
    })
  );

  // 按建筑类型统计
  const populationByBuildingType = {};
  let totalPopulation = 0;

  for (const building of buildings) {
    if (!populationByBuildingType[building.type]) {
      populationByBuildingType[building.type] = 0;
    }
    populationByBuildingType[building.type] += building.population || 0;
    totalPopulation += building.population || 0;
  }

  return {
    totalPopulation,
    byDistrict: populationByDistrict.sort((a, b) => b.population - a.population),
    byBuildingType: populationByBuildingType
  };
}

/**
 * 土地利用分析
 */
async function analyzeLandUse(db: WebGeoDB) {
  const buildings = await db.buildings.toArray();
  const districts = await db.districts.toArray();

  const landUseByDistrict = await Promise.all(
    districts.map(async (district) => {
      const buildingsInDistrict = buildings.filter(b =>
        turf.booleanIntersects(b.geometry, district.geometry)
      );

      const totalArea = buildingsInDistrict.reduce((sum, b) => sum + b.area, 0);
      const districtArea = turf.area(district.geometry);
      const utilizationRate = (totalArea / districtArea * 100);

      const byType = {};
      for (const building of buildingsInDistrict) {
        if (!byType[building.type]) {
          byType[building.type] = { count: 0, area: 0 };
        }
        byType[building.type].count++;
        byType[building.type].area += building.area;
      }

      return {
        district: district.name,
        totalArea: totalArea.toFixed(0) + ' 平方米',
        utilizationRate: utilizationRate.toFixed(1) + '%',
        byType
      };
    })
  );

  return landUseByDistrict;
}

/**
 * 发展水平分析
 */
async function analyzeDevelopmentLevel(db: WebGeoDB) {
  const districts = await db.districts.toArray();

  const developmentLevels = districts.map(district => {
    const gdpPerCapita = district.gdp / district.population;
    const density = district.properties?.density || district.population / district.area;

    // 计算综合发展指数
    let score = 0;
    if (gdpPerCapita > 100000) score += 30;
    else if (gdpPerCapita > 50000) score += 20;
    else score += 10;

    if (density > 10000) score += 30;
    else if (density > 5000) score += 20;
    else score += 10;

    if (district.properties?.greenCoverage > 40) score += 20;
    else if (district.properties?.greenCoverage > 20) score += 10;

    const level = score >= 60 ? '高度发达' :
                  score >= 40 ? '中等发达' : '发展中';

    return {
      district: district.name,
      gdpPerCapita: gdpPerCapita.toFixed(0),
      populationDensity: density.toFixed(0),
      greenCoverage: district.properties?.greenCoverage || 0,
      score,
      level
    };
  });

  return developmentLevels.sort((a, b) => b.score - a.score);
}
```

---

## 完整示例

查看完整的智慧城市基础设施管理示例代码：

```bash
cd /Users/zhangyuting/github/zhyt1985/webgeodb/examples/projects/smart-city
npm install
npm start
```

### 示例功能清单

运行示例后，你将看到以下功能的演示：

1. **道路网络分析**
   - 道路连通性检查
   - 最优路径规划
   - 道路网络统计

2. **管网分析**
   - 管网连通性检查
   - 爆管影响范围分析
   - 应急响应建议

3. **公共设施服务分析**
   - 服务范围计算
   - 服务覆盖率分析
   - 服务缺口识别

4. **多层叠加分析**
   - 最佳选址分析
   - 风险区域评估
   - 可达性分析

5. **空间统计分析**
   - 基础设施统计
   - 人口分布分析
   - 土地利用分析
   - 发展水平评估

---

## 应用场景

### 场景1: 新医院选址

**问题**: 城市计划新建一所综合医院，需要确定最佳选址。

**解决方案**:
```typescript
// 1. 运行选址适宜性分析
const result = await analyzeSiteSuitability(db);

// 2. 获取推荐选址
console.log('推荐选址:', result.bestDistrict);
console.log('最佳地块:', result.bestSites);

// 3. 分析医疗服务覆盖
const serviceAnalysis = await analyzeFacilityService(db, 'hospital');
console.log('当前服务覆盖率:', serviceAnalysis.serviceStats.coverageRate);
```

### 场景2: 管道爆管应急响应

**问题**: 供水管道爆管，需要快速评估影响范围并制定应急方案。

**解决方案**:
```typescript
// 1. 分析爆管影响
const impact = await analyzePipeBurstImpact(db, 'pipe-123', 1000);

// 2. 查看影响范围
console.log('受影响人口:', impact.affectedBuildings.population);
console.log('受影响设施:', impact.affectedFacilities);

// 3. 执行应急建议
console.log('应急措施:', impact.recommendations);
```

### 场景3: 学校服务范围优化

**问题**: 评估当前学校分布是否合理，识别服务不足区域。

**解决方案**:
```typescript
// 1. 分析学校服务覆盖
const analysis = await analyzeFacilityService(db, 'school');

// 2. 查看服务缺口
console.log('未覆盖人口:', analysis.serviceGaps.population);
console.log('服务缺口区域:', analysis.serviceGaps.areas);

// 3. 获取优化建议
console.log('优化建议:', analysis.recommendations);
```

---

## 性能优化建议

### 1. 索引优化

```typescript
// 为常用查询字段创建索引
db.roads.createIndex('type');
db.pipelines.createIndex('type');
db.facilities.createIndex('category');
db.buildings.createIndex('type');
db.districts.createIndex('level');

// 空间索引自动创建
db.roads.createIndex('geometry', { auto: true });
```

### 2. 数据分区

```typescript
// 按区域分区存储
const districtDbs = {};
for (const district of districts) {
  const dbName = `smart-city-${district.id}`;
  districtDbs[district.id] = new WebGeoDB({ name: dbName });
}
```

### 3. 缓存策略

```typescript
// 缓存常用查询结果
const cache = new Map();

async function getCachedFacilities(category: string) {
  const key = `facilities-${category}`;

  if (cache.has(key)) {
    return cache.get(key);
  }

  const facilities = await db.facilities
    .filter(f => f.category === category)
    .toArray();

  cache.set(key, facilities);
  return facilities;
}
```

---

## 扩展建议

### 1. 实时数据集成

- 接入IoT传感器数据（交通流量、管道压力等）
- 实时更新设施状态
- 动态调整服务半径

### 2. 可视化界面

- 使用Leaflet或Mapbox GL创建交互式地图
- 实时展示分析结果
- 支持地图标注和测量工具

### 3. 机器学习集成

- 基于历史数据预测设施需求
- 优化选址模型
- 风险预测和预警

### 4. 移动端支持

- 离线地图功能
- 现场数据采集
- 移动办公支持

---

## 参考资源

- **[WebGeoDB API文档](../../api/reference.md)** - 完整API参考
- **[Turf.js文档](https://turfjs.org/)** - 地理空间分析库
- **[示例代码](../../../examples/projects/smart-city/)** - 完整示例代码
- **[GeoJSON规范](https://geojson.org/)** - 地理数据格式标准

---

## 下一步

- **[电商地理围栏系统](./geo-fencing.md)** - 电商地理围栏营销系统
- **[物流配送优化](./logistics.md)** - 物流配送路径优化系统
- **[环境监测平台](./environmental-monitoring.md)** - 环境监测数据平台
