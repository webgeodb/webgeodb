# Smart City Infrastructure Management

> **Application Domain**: Urban Planning & Infrastructure Management | **Level**: Advanced | **Estimated Time**: 2-3 hours

## Application Overview

The Smart City Infrastructure Management System leverages WebGeoDB's powerful spatial analysis capabilities to provide comprehensive geospatial data management and analysis tools for urban planners and managers. This system integrates advanced GIS features including network analysis, buffer analysis, and multi-layer overlay analysis to support intelligent management of multi-dimensional infrastructure such as road networks, pipeline systems, and public facilities.

### Core Value

- **Network Analysis**: Analyze connectivity of roads, pipelines, and other networks; calculate optimal routes
- **Service Area Analysis**: Calculate service radius and coverage of public facilities
- **Multi-Layer Overlay Analysis**: Integrate population, traffic, environment, and other multi-layer data for comprehensive decision-making
- **Emergency Response**: Rapidly analyze impact scope of emergencies like pipe bursts and road interruptions
- **Site Selection Optimization**: Optimal location selection for public facilities based on multi-factor overlay analysis

### Technical Highlights

- Efficient spatial indexing and query performance
- Support for large-scale network data (million-level nodes)
- Real-time buffer and overlay analysis
- Flexible data models supporting multiple infrastructure types
- Complete TypeScript type support

---

## System Architecture

### Data Model Design

Smart city systems need to manage multiple types of infrastructure data. We have designed the following data models:

```typescript
// 1. Road Network
interface Road {
  id: string;                    // Road ID
  name: string;                  // Road name
  type: 'highway' | 'main' | 'secondary' | 'local';  // Road type
  geometry: LineString;          // Road geometry (line)
  length: number;                // Road length (meters)
  lanes: number;                 // Number of lanes
  speedLimit: number;            // Speed limit (km/h)
  condition: 'excellent' | 'good' | 'fair' | 'poor'; // Road condition
  properties: {                  // Extended properties
    width?: number;              // Road width
    surface?: string;            // Road surface material
    oneWay?: boolean;            // One-way street
  };
}

// 2. Pipeline Network
interface Pipeline {
  id: string;                    // Pipeline ID
  type: 'water' | 'gas' | 'electric' | 'sewage'; // Pipeline type
  geometry: LineString;          // Pipeline path
  diameter: number;              // Pipe diameter (mm)
  material: string;              // Material
  depth: number;                 // Burial depth (meters)
  pressure: number;              // Working pressure
  installDate: Date;             // Installation date
  condition: number;             // Condition score (0-100)
}

// 3. Public Facilities
interface Facility {
  id: string;                    // Facility ID
  name: string;                  // Facility name
  category: 'hospital' | 'school' | 'park' | 'station' | 'market'; // Facility category
  geometry: Point;               // Facility location
  capacity: number;              // Capacity/service capability
  serviceRadius: number;         // Service radius (meters)
  properties: {                  // Extended properties
    address?: string;            // Address
    phone?: string;              // Contact phone
    openingHours?: string;       // Opening hours
    rating?: number;             // Rating
  };
}

// 4. Buildings
interface Building {
  id: string;                    // Building ID
  name: string;                  // Building name
  type: 'residential' | 'commercial' | 'industrial' | 'public'; // Building type
  geometry: Polygon;             // Building outline
  height: number;                // Building height
  floors: number;                // Number of floors
  area: number;                  // Building area
  population?: number;           // Resident population
  yearBuilt: number;             // Year built
}

// 5. Administrative Areas
interface District {
  id: string;                    // Area ID
  name: string;                  // Area name
  level: 'city' | 'district' | 'community'; // Administrative level
  geometry: Polygon;             // Area boundary
  area: number;                  // Area size
  population: number;            // Population
  gdp: number;                   // GDP
  properties: {                  // Extended properties
    density?: number;            // Population density
    greenCoverage?: number;      // Green coverage rate
  };
}
```

### Database Schema Configuration

```typescript
const db = new WebGeoDB({
  name: 'smart-city-db',
  version: 1
});

db.schema({
  // Road network table
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

  // Pipeline network table
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

  // Public facilities table
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

  // Buildings table
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

  // Administrative areas table
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

## Core Feature Implementation

### 1. Road Network Analysis

Road network analysis is the foundation of smart city traffic management, including connectivity analysis, route planning, and service area calculation.

#### 1.1 Road Connectivity Analysis

```typescript
/**
 * Analyze road network connectivity
 * @param db WebGeoDB instance
 * @param startRoadId Starting road ID
 * @param maxDistance Maximum search distance (meters)
 */
async function analyzeRoadConnectivity(
  db: WebGeoDB,
  startRoadId: string,
  maxDistance: number = 5000
) {
  // Get starting road
  const startRoad = await db.roads.get(startRoadId);
  if (!startRoad) {
    throw new Error(`Road ${startRoadId} not found`);
  }

  // Create start point buffer
  const startPoint = turf.point(startRoad.geometry.coordinates[0]);
  const searchBuffer = turf.buffer(startPoint, maxDistance, { units: 'kilometers' });

  // Find all roads within buffer
  const nearbyRoads = await db.roads.filter(road => {
    const roadLine = turf.lineString(road.geometry.coordinates);
    return turf.booleanIntersects(roadLine, searchBuffer);
  }).toArray();

  // Analyze connectivity
  const connectivity = {
    startRoad: startRoad.name,
    totalRoads: nearbyRoads.length,
    connectedRoads: [] as string[],
    networkTypes: {} as Record<string, number>,
    totalLength: 0
  };

  for (const road of nearbyRoads) {
    // Check if connected to start road
    const isConnected = turf.booleanIntersects(
      turf.lineString(startRoad.geometry.coordinates),
      turf.lineString(road.geometry.coordinates)
    );

    if (isConnected && road.id !== startRoadId) {
      connectivity.connectedRoads.push(road.name);
      connectivity.totalLength += road.length;

      // Count road types
      connectivity.networkTypes[road.type] =
        (connectivity.networkTypes[road.type] || 0) + 1;
    }
  }

  return connectivity;
}
```

#### 1.2 Optimal Route Planning

```typescript
/**
 * Calculate optimal route between two points
 * @param db WebGeoDB instance
 * @param startCoord Start coordinate [longitude, latitude]
 * @param endCoord End coordinate [longitude, latitude]
 * @param roadType Road type preference
 */
async function findOptimalPath(
  db: WebGeoDB,
  startCoord: [number, number],
  endCoord: [number, number],
  roadType?: string
) {
  const startPoint = turf.point(startCoord);
  const endPoint = turf.point(endCoord);

  // Create search buffer
  const directDistance = turf.distance(startPoint, endPoint, { units: 'kilometers' });
  const searchBuffer = turf.buffer(
    turf.lineString([startCoord, endCoord]),
    directDistance * 0.5,
    { units: 'kilometers' }
  );

  // Find candidate roads
  let query = db.roads.filter(road => {
    const roadLine = turf.lineString(road.geometry.coordinates);
    return turf.booleanIntersects(roadLine, searchBuffer);
  });

  // Filter by road type
  if (roadType) {
    query = query.filter(road => road.type === roadType);
  }

  const candidateRoads = await query.toArray();

  // Build network graph (simplified)
  const graph = buildRoadGraph(candidateRoads);

  // Find nearest road nodes
  const startNode = findNearestNode(graph, startCoord);
  const endNode = findNearestNode(graph, endCoord);

  // Use Dijkstra's algorithm for shortest path
  const path = dijkstra(graph, startNode, endNode);

  return {
    path: path.nodes,
    distance: path.distance,
    estimatedTime: path.distance / 50, // Assume average speed 50km/h
    roads: path.roads
  };
}

/**
 * Build road network graph
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

      // Bidirectional edge (if not one-way)
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
 * Dijkstra's shortest path algorithm
 */
function dijkstra(graph: Record<string, any>, start: string, end: string) {
  const distances: Record<string, number> = {};
  const previous: Record<string, string> = {};
  const visited = new Set<string>();
  const queue: string[] = [];

  // Initialize
  for (const node in graph) {
    distances[node] = Infinity;
    queue.push(node);
  }
  distances[start] = 0;

  while (queue.length > 0) {
    // Find node with minimum distance
    queue.sort((a, b) => distances[a] - distances[b]);
    const current = queue.shift()!;

    if (current === end) break;

    visited.add(current);

    // Update neighbor node distances
    for (const neighbor in graph[current]) {
      if (visited.has(neighbor)) continue;

      const alt = distances[current] + graph[current][neighbor];
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        previous[neighbor] = current;
      }
    }
  }

  // Reconstruct path
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

### 2. Pipeline Analysis

Pipeline analysis includes connectivity checks, impact scope analysis, and burst simulation.

#### 2.1 Pipeline Connectivity Check

```typescript
/**
 * Check pipeline connectivity
 * @param db WebGeoDB instance
 * @param pipelineId Starting pipeline ID
 */
async function checkPipelineConnectivity(db: WebGeoDB, pipelineId: string) {
  const startPipeline = await db.pipelines.get(pipelineId);
  if (!startPipeline) {
    throw new Error(`Pipeline ${pipelineId} not found`);
  }

  // Find same-type pipelines
  const sameTypePipelines = await db.pipelines
    .filter(p => p.type === startPipeline.type)
    .toArray();

  // Build pipeline graph
  const graph = buildPipelineGraph(sameTypePipelines);

  // Find connected pipelines
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

    // Add connected pipelines
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
 * Build pipeline graph
 */
function buildPipelineGraph(pipelines: any[]) {
  const graph: Record<string, string[]> = {};
  const tolerance = 0.0001; // Connection tolerance (degrees)

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

      // Check if endpoints are connected
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

#### 2.2 Pipe Burst Impact Analysis

```typescript
/**
 * Analyze pipe burst impact scope
 * @param db WebGeoDB instance
 * @param pipelineId Burst pipeline ID
 * @param shutdownRadius Valve closure radius (meters)
 */
async function analyzePipeBurstImpact(
  db: WebGeoDB,
  pipelineId: string,
  shutdownRadius: number = 1000
) {
  const burstPipeline = await db.pipelines.get(pipelineId);
  if (!burstPipeline) {
    throw new Error(`Pipeline ${pipelineId} not found`);
  }

  // 1. Find valves to close (assuming valves at pipeline endpoints)
  const coords = burstPipeline.geometry.coordinates;
  const valves = [
    turf.point(coords[0]),
    turf.point(coords[coords.length - 1])
  ];

  // 2. Calculate impact area (valve closure area)
  const impactAreas = valves.map(valve =>
    turf.buffer(valve, shutdownRadius / 1000, { units: 'kilometers' })
  );

  // 3. Find buildings within impact area
  const affectedBuildings = await db.buildings.filter(building => {
    return impactAreas.some(area =>
      turf.booleanIntersects(building.geometry, area)
    );
  }).toArray();

  // 4. Calculate affected population
  const affectedPopulation = affectedBuildings.reduce(
    (sum, b) => sum + (b.population || 0),
    0
  );

  // 5. Find critical facilities within impact area
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
 * Generate emergency recommendations
 */
function generateEmergencyRecommendations(
  pipelineType: string,
  population: number,
  facilities: any[]
) {
  const recommendations = [];

  if (pipelineType === 'water') {
    recommendations.push('Activate backup water source immediately');
    recommendations.push('Notify affected residents to store water');
    if (population > 1000) {
      recommendations.push('Coordinate emergency water supply trucks');
    }
  } else if (pipelineType === 'gas') {
    recommendations.push('Shut off gas source immediately');
    recommendations.push('Evacuate residents within 100 meters');
    recommendations.push('Notify fire department to stand by');
  } else if (pipelineType === 'electric') {
    recommendations.push('Activate backup power');
    if (facilities.some(f => f.category === 'hospital')) {
      recommendations.push('Prioritize hospital power supply');
    }
  }

  return recommendations;
}
```

### 3. Public Facility Service Area Analysis

Analyze service capacity, coverage, and service gaps of public facilities.

```typescript
/**
 * Analyze public facility service scope
 * @param db WebGeoDB instance
 * @param facilityCategory Facility category
 */
async function analyzeFacilityService(
  db: WebGeoDB,
  facilityCategory: string
) {
  // 1. Get all facilities of same type
  const facilities = await db.facilities
    .filter(f => f.category === facilityCategory)
    .toArray();

  // 2. Create service area buffer for each facility
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

  // Calculate area of each service area
  serviceBuffers.forEach(sb => {
    sb.area = turf.area(sb.buffer);
  });

  // 3. Find service gap areas
  const allBuffers = turf.union(
    ...serviceBuffers.map(sb => sb.buffer)
  );

  // 4. Get all buildings
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

  // 5. Calculate service coverage rate
  const totalPopulation = buildings.reduce(
    (sum, b) => sum + (b.population || 0),
    0
  );
  const coverageRate = ((totalPopulation - unservedPopulation) / totalPopulation * 100);

  // 6. Identify service gap areas (cluster unserved buildings)
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
      serviceArea: sb.area.toFixed(2) + ' sq meters',
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
 * Generate facility optimization recommendations
 */
function generateFacilityRecommendations(
  category: string,
  coverageRate: number,
  unservedPopulation: number,
  gapAreas: any[]
) {
  const recommendations = [];

  if (coverageRate < 80) {
    recommendations.push(`Service coverage only ${coverageRate.toFixed(1)}%, consider adding new facilities`);
  }

  if (unservedPopulation > 5000) {
    recommendations.push(`About ${unservedPopulation} people not covered, prioritize adding facilities in service gap areas`);
  }

  if (gapAreas.length > 0) {
    recommendations.push(`Identified ${gapAreas.length} major service gap areas`);
  }

  if (category === 'school') {
    recommendations.push('Consider school district boundaries and population distribution for site selection');
  } else if (category === 'hospital') {
    recommendations.push('Ensure at least 1 general hospital per area');
  } else if (category === 'park') {
    recommendations.push('Plan according to per capita green space standards');
  }

  return recommendations;
}
```

### 4. Multi-Layer Overlay Analysis

Integrate multiple layers for comprehensive spatial analysis.

```typescript
/**
 * Multi-layer overlay analysis
 * @param db WebGeoDB instance
 * @param analysisType Analysis type
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
      throw new Error('Unsupported analysis type');
  }
}

/**
 * Optimal site selection analysis
 * Analyze multiple factors to find areas most suitable for new facility construction
 */
async function analyzeSiteSuitability(db: WebGeoDB) {
  // 1. Define analysis factors and weights
  const factors = {
    populationDensity: 0.3,    // Population density
    trafficAccessibility: 0.25, // Traffic accessibility
    distanceToExisting: 0.2,   // Distance from existing facilities
    environmentQuality: 0.15,   // Environment quality
    landCost: 0.1              // Land cost
  };

  // 2. Get all districts
  const districts = await db.districts.toArray();

  // 3. Calculate comprehensive score for each district
  const results = [];

  for (const district of districts) {
    const scores = {
      populationDensity: calculatePopulationDensity(district),
      trafficAccessibility: await calculateTrafficAccessibility(db, district),
      distanceToExisting: await calculateDistanceToFacilities(db, district),
      environmentQuality: calculateEnvironmentQuality(district),
      landCost: estimateLandCost(district)
    };

    // Weighted total score
    const totalScore = Object.entries(scores).reduce((sum, [key, value]) => {
      return sum + value * factors[key as keyof typeof factors];
    }, 0);

    results.push({
      district: district.name,
      scores,
      totalScore: totalScore.toFixed(3),
      ranking: 0 // Calculate later
    });
  }

  // 4. Sort and add rankings
  results.sort((a, b) => parseFloat(b.totalScore) - parseFloat(a.totalScore));
  results.forEach((r, i) => r.ranking = i + 1);

  // 5. Find best district
  const bestDistrict = results[0];

  // 6. Find best sites within best district
  const bestSites = await findBestSitesInDistrict(db, bestDistrict.district);

  return {
    analysisType: 'Site Suitability Analysis',
    factors,
    results: results.slice(0, 5), // Return top 5
    bestDistrict: bestDistrict.district,
    bestSites,
    recommendation: `Prioritize ${bestDistrict.district}, highest comprehensive score`
  };
}
```

### 5. Spatial Statistical Analysis

Statistical analysis of urban spatial data to support decision-making.

```typescript
/**
 * Urban spatial statistical analysis
 * @param db WebGeoDB instance
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
 * Infrastructure statistics
 */
async function analyzeInfrastructureStats(db: WebGeoDB) {
  // Road statistics
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

  // Pipeline statistics
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

  // Facility statistics
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
```

---

## Complete Example

See the complete smart city infrastructure management example code:

```bash
cd /Users/zhangyuting/github/zhyt1985/webgeodb/examples/projects/smart-city
npm install
npm start
```

### Example Feature List

After running the example, you will see demonstrations of the following features:

1. **Road Network Analysis**
   - Road connectivity check
   - Optimal route planning
   - Road network statistics

2. **Pipeline Analysis**
   - Pipeline connectivity check
   - Pipe burst impact analysis
   - Emergency response recommendations

3. **Public Facility Service Analysis**
   - Service area calculation
   - Service coverage analysis
   - Service gap identification

4. **Multi-Layer Overlay Analysis**
   - Optimal site selection
   - Risk area assessment
   - Accessibility analysis

5. **Spatial Statistical Analysis**
   - Infrastructure statistics
   - Population distribution analysis
   - Land use analysis
   - Development level assessment

---

## Application Scenarios

### Scenario 1: New Hospital Site Selection

**Problem**: The city plans to build a new general hospital and needs to determine the optimal location.

**Solution**:
```typescript
// 1. Run site suitability analysis
const result = await analyzeSiteSuitability(db);

// 2. Get recommended site
console.log('Recommended site:', result.bestDistrict);
console.log('Best sites:', result.bestSites);

// 3. Analyze medical service coverage
const serviceAnalysis = await analyzeFacilityService(db, 'hospital');
console.log('Current service coverage:', serviceAnalysis.serviceStats.coverageRate);
```

### Scenario 2: Pipe Burst Emergency Response

**Problem**: Water pipe burst, need to quickly assess impact and develop emergency plan.

**Solution**:
```typescript
// 1. Analyze burst impact
const impact = await analyzePipeBurstImpact(db, 'pipe-123', 1000);

// 2. View impact scope
console.log('Affected population:', impact.affectedBuildings.population);
console.log('Affected facilities:', impact.affectedFacilities);

// 3. Execute emergency recommendations
console.log('Emergency measures:', impact.recommendations);
```

### Scenario 3: School Service Area Optimization

**Problem**: Assess whether current school distribution is reasonable and identify underserved areas.

**Solution**:
```typescript
// 1. Analyze school service coverage
const analysis = await analyzeFacilityService(db, 'school');

// 2. View service gaps
console.log('Unserved population:', analysis.serviceGaps.population);
console.log('Service gap areas:', analysis.serviceGaps.areas);

// 3. Get optimization recommendations
console.log('Optimization recommendations:', analysis.recommendations);
```

---

## Performance Optimization Recommendations

### 1. Index Optimization

```typescript
// Create indexes for commonly queried fields
db.roads.createIndex('type');
db.pipelines.createIndex('type');
db.facilities.createIndex('category');
db.buildings.createIndex('type');
db.districts.createIndex('level');

// Spatial index auto-created
db.roads.createIndex('geometry', { auto: true });
```

### 2. Data Partitioning

```typescript
// Partition by district
const districtDbs = {};
for (const district of districts) {
  const dbName = `smart-city-${district.id}`;
  districtDbs[district.id] = new WebGeoDB({ name: dbName });
}
```

### 3. Caching Strategy

```typescript
// Cache common query results
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

## Extension Recommendations

### 1. Real-time Data Integration

- Connect IoT sensor data (traffic flow, pipe pressure, etc.)
- Real-time facility status updates
- Dynamic service radius adjustment

### 2. Visualization Interface

- Use Leaflet or Mapbox GL for interactive maps
- Real-time analysis result display
- Map annotation and measurement tools

### 3. Machine Learning Integration

- Predict facility demand based on historical data
- Optimize site selection models
- Risk prediction and early warning

### 4. Mobile Support

- Offline map functionality
- Field data collection
- Mobile office support

---

## Reference Resources

- **[WebGeoDB API Documentation](../../api/reference.md)** - Complete API reference
- **[Turf.js Documentation](https://turfjs.org/)** - Geospatial analysis library
- **[Example Code](../../../examples/projects/smart-city/)** - Complete example code
- **[GeoJSON Specification](https://geojson.org/)** - Geographic data format standard

---

## Next Steps

- **[Geo-fencing System](./geo-fencing.md)** - E-commerce geo-fencing marketing system
- **[Logistics Optimization](./logistics.md)** - Logistics delivery route optimization system
- **[Environmental Monitoring](./environmental-monitoring.md)** - Environmental monitoring data platform
