/**
 * Smart City Infrastructure Management System
 *
 * A comprehensive example demonstrating WebGeoDB's capabilities
 * for managing and analyzing urban infrastructure data.
 *
 * Features:
 * - Road network analysis (connectivity, routing)
 * - Pipeline network analysis (connectivity, burst simulation)
 * - Public facility service analysis
 * - Multi-layer overlay analysis (site selection, risk assessment)
 * - Spatial statistical analysis
 *
 * @module smart-city
 */

import { WebGeoDB } from '@webgeodb/core';
import * as turf from '@turf/turf';

// ============================================
// Type Definitions
// ============================================

interface Road {
  id: string;
  name: string;
  type: 'highway' | 'main' | 'secondary' | 'local';
  geometry: turf.Types.LineString;
  length: number;
  lanes: number;
  speedLimit: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  properties: {
    width?: number;
    surface?: string;
    oneWay?: boolean;
  };
}

interface Pipeline {
  id: string;
  type: 'water' | 'gas' | 'electric' | 'sewage';
  geometry: turf.Types.LineString;
  diameter: number;
  material: string;
  depth: number;
  pressure: number;
  installDate: Date;
  condition: number;
}

interface Facility {
  id: string;
  name: string;
  category: 'hospital' | 'school' | 'park' | 'station' | 'market';
  geometry: turf.Types.Point;
  capacity: number;
  serviceRadius: number;
  properties: {
    address?: string;
    phone?: string;
    openingHours?: string;
    rating?: number;
  };
}

interface Building {
  id: string;
  name: string;
  type: 'residential' | 'commercial' | 'industrial' | 'public';
  geometry: turf.Types.Polygon;
  height: number;
  floors: number;
  area: number;
  population?: number;
  yearBuilt: number;
}

interface District {
  id: string;
  name: string;
  level: 'city' | 'district' | 'community';
  geometry: turf.Types.Polygon;
  area: number;
  population: number;
  gdp: number;
  properties: {
    density?: number;
    greenCoverage?: number;
  };
}

// ============================================
// Configuration
// ============================================

const DB_CONFIG = {
  name: 'smart-city-demo',
  version: 1
};

// ============================================
// Main Application
// ============================================

class SmartCitySystem {
  private db: WebGeoDB;

  constructor() {
    this.db = new WebGeoDB(DB_CONFIG);
  }

  /**
   * Initialize the smart city database
   */
  async initialize() {
    console.log('🏙️  Initializing Smart City Infrastructure Management System...\n');

    // Define schema
    this.defineSchema();

    // Open database
    await this.db.open();

    // Create indexes
    this.createIndexes();

    console.log('✅ System initialized successfully\n');
  }

  /**
   * Define database schema
   */
  private defineSchema() {
    this.db.schema({
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
  }

  /**
   * Create indexes for efficient queries
   */
  private createIndexes() {
    // Property indexes
    this.db.roads.createIndex('type');
    this.db.pipelines.createIndex('type');
    this.db.facilities.createIndex('category');
    this.db.buildings.createIndex('type');
    this.db.districts.createIndex('level');

    // Spatial indexes
    this.db.roads.createIndex('geometry', { auto: true });
    this.db.pipelines.createIndex('geometry', { auto: true });
    this.db.facilities.createIndex('geometry', { auto: true });
    this.db.buildings.createIndex('geometry', { auto: true });
    this.db.districts.createIndex('geometry', { auto: true });
  }

  /**
   * Load sample data
   */
  async loadSampleData() {
    console.log('📊 Loading sample data...\n');

    await this.loadRoads();
    await this.loadPipelines();
    await this.loadFacilities();
    await this.loadBuildings();
    await this.loadDistricts();

    console.log('✅ Sample data loaded successfully\n');
  }

  /**
   * Load road network data
   */
  private async loadRoads() {
    const roads = [
      {
        id: 'road-001',
        name: '中山大道',
        type: 'highway' as const,
        geometry: {
          type: 'LineString',
          coordinates: [[116.400, 39.900], [116.420, 39.910], [116.440, 39.920]]
        },
        length: 5500,
        lanes: 6,
        speedLimit: 80,
        condition: 'excellent' as const,
        properties: { width: 30, surface: 'asphalt' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'road-002',
        name: '解放路',
        type: 'main' as const,
        geometry: {
          type: 'LineString',
          coordinates: [[116.390, 39.920], [116.410, 39.915], [116.430, 39.910]]
        },
        length: 4500,
        lanes: 4,
        speedLimit: 60,
        condition: 'good' as const,
        properties: { width: 20, surface: 'asphalt' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'road-003',
        name: '建设大街',
        type: 'main' as const,
        geometry: {
          type: 'LineString',
          coordinates: [[116.405, 39.895], [116.405, 39.925]]
        },
        length: 3300,
        lanes: 4,
        speedLimit: 60,
        condition: 'good' as const,
        properties: { width: 22, surface: 'asphalt' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'road-004',
        name: '和平路',
        type: 'secondary' as const,
        geometry: {
          type: 'LineString',
          coordinates: [[116.415, 39.900], [116.425, 39.905], [116.435, 39.910]]
        },
        length: 2500,
        lanes: 2,
        speedLimit: 40,
        condition: 'fair' as const,
        properties: { width: 12, surface: 'concrete' },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await this.db.roads.bulkAdd(roads);
    console.log(`   ✓ Loaded ${roads.length} roads`);
  }

  /**
   * Load pipeline network data
   */
  private async loadPipelines() {
    const pipelines = [
      {
        id: 'pipe-001',
        type: 'water' as const,
        geometry: {
          type: 'LineString',
          coordinates: [[116.402, 39.902], [116.412, 39.907], [116.422, 39.912]]
        },
        diameter: 600,
        material: 'ductile iron',
        depth: 1.5,
        pressure: 0.4,
        installDate: new Date('2015-06-15'),
        condition: 85,
        createdAt: new Date()
      },
      {
        id: 'pipe-002',
        type: 'water' as const,
        geometry: {
          type: 'LineString',
          coordinates: [[116.422, 39.912], [116.432, 39.917]]
        },
        diameter: 400,
        material: 'PVC',
        depth: 1.2,
        pressure: 0.3,
        installDate: new Date('2018-03-20'),
        condition: 90,
        createdAt: new Date()
      },
      {
        id: 'pipe-003',
        type: 'gas' as const,
        geometry: {
          type: 'LineString',
          coordinates: [[116.408, 39.898], [116.408, 39.918]]
        },
        diameter: 300,
        material: 'steel',
        depth: 1.8,
        pressure: 0.2,
        installDate: new Date('2012-09-10'),
        condition: 75,
        createdAt: new Date()
      }
    ];

    await this.db.pipelines.bulkAdd(pipelines);
    console.log(`   ✓ Loaded ${pipelines.length} pipelines`);
  }

  /**
   * Load public facility data
   */
  private async loadFacilities() {
    const facilities = [
      {
        id: 'fac-001',
        name: '市中心医院',
        category: 'hospital' as const,
        geometry: { type: 'Point', coordinates: [116.415, 39.912] },
        capacity: 1000,
        serviceRadius: 3000,
        properties: {
          address: '中山路123号',
          phone: '010-12345678',
          openingHours: '24小时',
          rating: 5
        },
        createdAt: new Date()
      },
      {
        id: 'fac-002',
        name: '第一中学',
        category: 'school' as const,
        geometry: { type: 'Point', coordinates: [116.408, 39.908] },
        capacity: 2000,
        serviceRadius: 1500,
        properties: {
          address: '建设路45号',
          phone: '010-87654321',
          openingHours: '07:00-18:00',
          rating: 4
        },
        createdAt: new Date()
      },
      {
        id: 'fac-003',
        name: '人民公园',
        category: 'park' as const,
        geometry: { type: 'Point', coordinates: [116.422, 39.905] },
        capacity: 5000,
        serviceRadius: 1000,
        properties: {
          address: '解放路88号',
          phone: '010-11112222',
          openingHours: '06:00-22:00',
          rating: 5
        },
        createdAt: new Date()
      },
      {
        id: 'fac-004',
        name: '地铁站-中山路站',
        category: 'station' as const,
        geometry: { type: 'Point', coordinates: [116.420, 39.910] },
        capacity: 20000,
        serviceRadius: 500,
        properties: {
          address: '中山大道地下',
          phone: '010-99998888',
          openingHours: '06:00-23:00',
          rating: 5
        },
        createdAt: new Date()
      }
    ];

    await this.db.facilities.bulkAdd(facilities);
    console.log(`   ✓ Loaded ${facilities.length} facilities`);
  }

  /**
   * Load building data
   */
  private async loadBuildings() {
    const buildings = [
      {
        id: 'bld-001',
        name: '阳光花园A区',
        type: 'residential' as const,
        geometry: {
          type: 'Polygon',
          coordinates: [[[116.410, 39.905], [116.412, 39.905], [116.412, 39.907], [116.410, 39.907], [116.410, 39.905]]]
        },
        height: 80,
        floors: 25,
        area: 15000,
        population: 800,
        yearBuilt: 2015,
        createdAt: new Date()
      },
      {
        id: 'bld-002',
        name: '商业广场',
        type: 'commercial' as const,
        geometry: {
          type: 'Polygon',
          coordinates: [[[116.418, 39.908], [116.421, 39.908], [116.421, 39.912], [116.418, 39.912], [116.418, 39.908]]]
        },
        height: 120,
        floors: 35,
        area: 45000,
        population: 0,
        yearBuilt: 2018,
        createdAt: new Date()
      },
      {
        id: 'bld-003',
        name: '科技园区A栋',
        type: 'industrial' as const,
        geometry: {
          type: 'Polygon',
          coordinates: [[[116.425, 39.915], [116.428, 39.915], [116.428, 39.918], [116.425, 39.918], [116.425, 39.915]]]
        },
        height: 60,
        floors: 15,
        area: 12000,
        population: 500,
        yearBuilt: 2020,
        createdAt: new Date()
      }
    ];

    await this.db.buildings.bulkAdd(buildings);
    console.log(`   ✓ Loaded ${buildings.length} buildings`);
  }

  /**
   * Load district data
   */
  private async loadDistricts() {
    const districts = [
      {
        id: 'dist-001',
        name: '中心区',
        level: 'district' as const,
        geometry: {
          type: 'Polygon',
          coordinates: [[[116.400, 39.900], [116.400, 39.920], [116.430, 39.920], [116.430, 39.900], [116.400, 39.900]]]
        },
        area: 9000000,
        population: 150000,
        gdp: 50000000000,
        properties: { density: 16667, greenCoverage: 35 },
        createdAt: new Date()
      },
      {
        id: 'dist-002',
        name: '新区',
        level: 'district' as const,
        geometry: {
          type: 'Polygon',
          coordinates: [[[116.430, 39.900], [116.430, 39.920], [116.450, 39.920], [116.450, 39.900], [116.430, 39.900]]]
        },
        area: 6000000,
        population: 80000,
        gdp: 30000000000,
        properties: { density: 13333, greenCoverage: 45 },
        createdAt: new Date()
      }
    ];

    await this.db.districts.bulkAdd(districts);
    console.log(`   ✓ Loaded ${districts.length} districts`);
  }

  /**
   * Run all analyses
   */
  async runAnalyses() {
    console.log('🔍 Running spatial analyses...\n');

    await this.analyzeRoadNetwork();
    await this.analyzePipelineNetwork();
    await this.analyzeFacilityService('hospital');
    await this.analyzeSiteSuitability();
    await this.generateStatistics();

    console.log('✅ All analyses completed\n');
  }

  /**
   * Analyze road network
   */
  async analyzeRoadNetwork() {
    console.log('📊 ROAD NETWORK ANALYSIS');
    console.log('━'.repeat(60));

    const roads = await this.db.roads.toArray();
    const totalLength = roads.reduce((sum, r) => sum + r.length, 0);

    console.log(`\n   Total roads: ${roads.length}`);
    console.log(`   Total length: ${(totalLength / 1000).toFixed(2)} km`);

    // Road type distribution
    const byType: Record<string, { count: number; length: number }> = {};
    for (const road of roads) {
      if (!byType[road.type]) byType[road.type] = { count: 0, length: 0 };
      byType[road.type].count++;
      byType[road.type].length += road.length;
    }

    console.log('\n   By type:');
    for (const [type, stats] of Object.entries(byType)) {
      console.log(`     ${type}: ${stats.count} roads, ${(stats.length / 1000).toFixed(2)} km`);
    }

    // Connectivity analysis
    const mainRoad = await this.db.roads.filter(r => r.type === 'highway').first();
    if (mainRoad) {
      console.log(`\n   Connectivity analysis for "${mainRoad.name}":`);

      const startPoint = turf.point(mainRoad.geometry.coordinates[0]);
      const buffer = turf.buffer(startPoint, 3, { units: 'kilometers' });

      const nearbyRoads = await this.db.roads.filter(road => {
        if (road.id === mainRoad.id) return false;
        const roadLine = turf.lineString(road.geometry.coordinates);
        return turf.booleanIntersects(roadLine, buffer);
      }).toArray();

      console.log(`     Roads within 3km: ${nearbyRoads.length}`);

      const connected = nearbyRoads.filter(road => {
        const mainLine = turf.lineString(mainRoad.geometry.coordinates);
        const roadLine = turf.lineString(road.geometry.coordinates);
        return turf.booleanIntersects(mainLine, roadLine);
      });

      console.log(`     Directly connected: ${connected.length}`);
      connected.forEach(road => {
        console.log(`       - ${road.name} (${road.type})`);
      });
    }

    console.log('');
  }

  /**
   * Analyze pipeline network
   */
  async analyzePipelineNetwork() {
    console.log('🔧 PIPELINE NETWORK ANALYSIS');
    console.log('━'.repeat(60));

    const pipelines = await this.db.pipelines.toArray();

    console.log(`\n   Total pipelines: ${pipelines.length}`);

    // By type
    const byType: Record<string, number> = {};
    for (const pipe of pipelines) {
      byType[pipe.type] = (byType[pipe.type] || 0) + 1;
    }

    console.log('\n   By type:');
    for (const [type, count] of Object.entries(byType)) {
      console.log(`     ${type}: ${count} pipelines`);
    }

    // Condition assessment
    const avgCondition = pipelines.reduce((sum, p) => sum + p.condition, 0) / pipelines.length;
    console.log(`\n   Average condition score: ${avgCondition.toFixed(1)}/100`);

    const needsMaintenance = pipelines.filter(p => p.condition < 80).length;
    console.log(`   Pipelines needing maintenance: ${needsMaintenance}`);

    // Pipe burst simulation
    if (pipelines.length > 0) {
      const testPipe = pipelines[0];
      console.log(`\n   🔥 Pipe burst simulation (ID: ${testPipe.id}):`);
      console.log(`     Type: ${testPipe.type}`);
      console.log(`     Diameter: ${testPipe.diameter}mm`);

      const coords = testPipe.geometry.coordinates;
      const startPoint = turf.point(coords[0]);
      const impactBuffer = turf.buffer(startPoint, 1, { units: 'kilometers' });

      const affectedBuildings = await this.db.buildings.filter(b => {
        return turf.booleanIntersects(b.geometry, impactBuffer);
      }).toArray();

      const affectedPopulation = affectedBuildings.reduce((sum, b) => sum + (b.population || 0), 0);

      console.log(`     Impact radius: 1000m`);
      console.log(`     Affected buildings: ${affectedBuildings.length}`);
      console.log(`     Affected population: ${affectedPopulation}`);

      if (testPipe.type === 'water') {
        console.log(`\n     📋 Emergency recommendations:`);
        console.log(`       • Activate backup water source`);
        console.log(`       • Notify ${affectedPopulation} affected residents`);
        if (affectedPopulation > 500) {
          console.log(`       • Deploy emergency water supply trucks`);
        }
      } else if (testPipe.type === 'gas') {
        console.log(`\n     📋 Emergency recommendations:`);
        console.log(`       • Shut off gas source immediately`);
        console.log(`       • Evacuate within 100m radius`);
        console.log(`       • Alert fire department`);
      }
    }

    console.log('');
  }

  /**
   * Analyze facility service
   */
  async analyzeFacilityService(category: string) {
    console.log(`🏥 ${category.toUpperCase()} SERVICE ANALYSIS`);
    console.log('━'.repeat(60));

    const facilities = await this.db.facilities.filter(f => f.category === category).toArray();

    if (facilities.length === 0) {
      console.log(`\n   No ${category} facilities found\n`);
      return;
    }

    console.log(`\n   Total facilities: ${facilities.length}`);
    console.log(`   Total capacity: ${facilities.reduce((sum, f) => sum + f.capacity, 0).toLocaleString()}`);

    // Calculate service areas
    const buildings = await this.db.buildings.toArray();
    let servedPopulation = 0;
    let unservedPopulation = 0;
    const unservedBuildings = [];

    for (const building of buildings) {
      const centroid = turf.centroid(building.geometry);
      const isServed = facilities.some(facility => {
        const facilityPoint = turf.point(facility.geometry.coordinates);
        const distance = turf.distance(centroid, facilityPoint, { units: 'kilometers' }) * 1000;
        return distance <= facility.serviceRadius;
      });

      if (isServed) {
        servedPopulation += building.population || 0;
      } else {
        unservedPopulation += building.population || 0;
        if (building.population && building.population > 0) {
          unservedBuildings.push(building);
        }
      }
    }

    const totalPopulation = servedPopulation + unservedPopulation;
    const coverageRate = totalPopulation > 0 ? (servedPopulation / totalPopulation * 100) : 0;

    console.log(`\n   Service coverage:`);
    console.log(`     Served population: ${servedPopulation.toLocaleString()}`);
    console.log(`     Unserved population: ${unservedPopulation.toLocaleString()}`);
    console.log(`     Coverage rate: ${coverageRate.toFixed(1)}%`);

    if (unservedBuildings.length > 0) {
      console.log(`\n   Unserved buildings (${unservedBuildings.length}):`);
      unservedBuildings.slice(0, 5).forEach(b => {
        console.log(`     - ${b.name}: ${b.population || 0} people`);
      });
    }

    // Recommendations
    console.log(`\n   💡 Recommendations:`);
    if (coverageRate < 80) {
      console.log(`     • Service coverage is below 80%`);
      console.log(`     • Consider adding new facilities`);
    }
    if (unservedPopulation > 1000) {
      console.log(`     • ${unservedPopulation.toLocaleString()} people lack access`);
      console.log(`     • Prioritize underserved areas`);
    }
    if (coverageRate >= 90) {
      console.log(`     • Excellent coverage! Maintain current levels`);
    }

    console.log('');
  }

  /**
   * Analyze site suitability
   */
  async analyzeSiteSuitability() {
    console.log('📍 SITE SUITABILITY ANALYSIS');
    console.log('━'.repeat(60));

    const districts = await this.db.districts.toArray();

    console.log(`\n   Evaluating ${districts.length} districts for new facility placement...\n`);

    const results = [];

    for (const district of districts) {
      const scores = {
        population: 0,
        accessibility: 0,
        environment: 0,
        total: 0
      };

      // Population density score
      const density = district.properties?.density || district.population / (district.area / 1000000);
      scores.population = Math.min(density / 10000, 1);

      // Accessibility score (based on road density)
      const roads = await this.db.roads.filter(road => {
        const roadLine = turf.lineString(road.geometry.coordinates);
        return turf.booleanIntersects(roadLine, district.geometry);
      }).toArray();

      const roadDensity = roads.reduce((sum, r) => sum + r.length, 0) / turf.area(district.geometry);
      scores.accessibility = Math.min(roadDensity * 100, 1);

      // Environment score (green coverage)
      scores.environment = (district.properties?.greenCoverage || 0) / 100;

      // Total score
      scores.total = (scores.population * 0.4 + scores.accessibility * 0.4 + scores.environment * 0.2);

      results.push({
        district: district.name,
        ...scores
      });
    }

    // Sort by total score
    results.sort((a, b) => b.total - a.total);

    console.log('   Rankings:');
    results.forEach((r, i) => {
      console.log(`     ${i + 1}. ${r.district}`);
      console.log(`        Population: ${(r.population * 100).toFixed(0)}%`);
      console.log(`        Accessibility: ${(r.accessibility * 100).toFixed(0)}%`);
      console.log(`        Environment: ${(r.environment * 100).toFixed(0)}%`);
      console.log(`        Total score: ${(r.total * 100).toFixed(0)}%`);
    });

    console.log(`\n   🎯 Recommendation: ${results[0].district} is most suitable`);
    console.log('');
  }

  /**
   * Generate spatial statistics
   */
  async generateStatistics() {
    console.log('📈 SPATIAL STATISTICS');
    console.log('━'.repeat(60));

    // Infrastructure summary
    const roadCount = await this.db.roads.count();
    const pipelineCount = await this.db.pipelines.count();
    const facilityCount = await this.db.facilities.count();
    const buildingCount = await this.db.buildings.count();

    console.log('\n   Infrastructure Summary:');
    console.log(`     Roads: ${roadCount}`);
    console.log(`     Pipelines: ${pipelineCount}`);
    console.log(`     Facilities: ${facilityCount}`);
    console.log(`     Buildings: ${buildingCount}`);

    // Population distribution
    const buildings = await this.db.buildings.toArray();
    const totalPopulation = buildings.reduce((sum, b) => sum + (b.population || 0), 0);

    console.log(`\n   Population Distribution:`);
    console.log(`     Total population: ${totalPopulation.toLocaleString()}`);

    const byType: Record<string, { count: number; population: number }> = {};
    for (const building of buildings) {
      if (!byType[building.type]) {
        byType[building.type] = { count: 0, population: 0 };
      }
      byType[building.type].count++;
      byType[building.type].population += building.population || 0;
    }

    for (const [type, stats] of Object.entries(byType)) {
      if (stats.population > 0) {
        console.log(`     ${type}: ${stats.buildings} buildings, ${stats.population.toLocaleString()} people`);
      }
    }

    // Land use
    const totalBuildingArea = buildings.reduce((sum, b) => sum + b.area, 0);
    const districts = await this.db.districts.toArray();
    const totalDistrictArea = districts.reduce((sum, d) => sum + d.area, 0);
    const utilizationRate = (totalBuildingArea / totalDistrictArea * 100);

    console.log(`\n   Land Use:`);
    console.log(`     Total building area: ${(totalBuildingArea / 10000).toFixed(2)} hectares`);
    console.log(`     Total district area: ${(totalDistrictArea / 10000).toFixed(2)} hectares`);
    console.log(`     Utilization rate: ${utilizationRate.toFixed(1)}%`);

    console.log('');
  }

  /**
   * Clean up and close database
   */
  async shutdown() {
    console.log('🔒 Shutting down system...');
    await this.db.close();
    console.log('✅ System shut down successfully');
  }
}

// ============================================
// Main Entry Point
// ============================================

async function main() {
  const system = new SmartCitySystem();

  try {
    // Initialize
    await system.initialize();

    // Load sample data
    await system.loadSampleData();

    // Run analyses
    await system.runAnalyses();

    console.log('━'.repeat(60));
    console.log('✨ Smart City Infrastructure Management Demo Complete!');
    console.log('━'.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await system.shutdown();
  }
}

// Run the application
main().catch(error => {
  console.error('\n❌ Application failed:', error.message);
  process.exit(1);
});
