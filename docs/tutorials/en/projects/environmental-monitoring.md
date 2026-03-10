# Environmental Monitoring Data Platform

> **Use Case**: Spatiotemporal data management, environmental quality monitoring, pollution source tracking
> **Key Features**: Time-series data, spatial interpolation, contour generation, dynamic heatmaps
> **Estimated Time**: 3-4 hours

---

## Overview

The Environmental Monitoring Data Platform is a professional spatiotemporal data processing system designed to collect, store, analyze, and visualize various types of environmental monitoring data. This platform demonstrates WebGeoDB's powerful capabilities in handling three-dimensional spatiotemporal data (longitude, latitude, time) and shows how spatial analysis algorithms are applied in environmental science.

### Core Features

- **Spatiotemporal Data Storage**: Efficient management of time-series data from monitoring stations
- **Spatial Interpolation Analysis**: Estimate environmental quality for unmonitored areas based on monitoring point data
- **Dynamic Visualization**: Real-time data display and time-series animation
- **Monitoring Station Management**: CRUD operations and status monitoring for stations
- **Data Query & Export**: Flexible multi-dimensional queries and data export

### Application Scenarios

| Scenario | Metrics | Value |
|----------|---------|-------|
| Air Quality Monitoring | PM2.5, PM10, AQI, SO₂, NO₂ | Public health alerts, pollution tracking |
| Water Quality Monitoring | pH, dissolved oxygen, turbidity, heavy metals | Water resource protection, ecological assessment |
| Noise Monitoring | Decibel levels, frequency spectrum | Urban planning, noise control |
| Temperature Monitoring | Air temp, ground temp, water temp | Climate research, heat island analysis |

---

## System Architecture

### Data Model

```typescript
// Monitoring station data structure
interface MonitoringStation {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  stationType: 'air' | 'water' | 'noise' | 'temperature';
  status: 'active' | 'inactive' | 'maintenance';
  metadata: {
    installationDate: string;
    operator: string;
    region: string;
  };
}

// Time-series monitoring data
interface MonitoringData {
  stationId: string;
  timestamp: number;
  measurements: {
    [key: string]: number; // Metric name -> value
  };
  quality: 'good' | 'fair' | 'poor';
}

// Spatial interpolation result
interface InterpolationResult {
  timestamp: number;
  grid: {
    bounds: GeoBounds;
    resolution: number;
    values: number[][];
  };
  method: 'idw' | 'kriging';
  parameters: {
    power?: number; // IDW power parameter
    range?: number; // Kriging range
    sill?: number; // Kriging sill
  };
}
```

### Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Data Collection Layer                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Sensors  │  │ Manual   │  │  API     │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
└───────┼─────────────┼─────────────┼────────────────────┘
        │             │             │
┌───────┼─────────────┼─────────────┼────────────────────┐
│       ▼             ▼             ▼                     │
│              WebGeoDB Storage Engine                    │
│  ┌────────────────────────────────────────┐            │
│  │  Spatiotemporal Index (R-tree + Time)  │            │
│  │  Data Compression & Aggregation        │            │
│  │  Spatial Query Optimization            │            │
│  └────────────────────────────────────────┘            │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────┐
│                          ▼                               │
│                   Data Analysis Layer                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ IDW Interp │  │ Kriging    │  │ Contour    │        │
│  └────────────┘  └────────────┘  └────────────┘        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ Statistics │  │ Trend      │  │ Anomaly    │        │
│  │ Analysis   │  │ Prediction │  │ Detection  │        │
│  └────────────┘  └────────────┘  └────────────┘        │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────┐
│                          ▼                               │
│                 Visualization Layer                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ Heatmaps   │  │ Contours   │  │ Animation  │        │
│  └────────────┘  └────────────┘  └────────────┘        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ 3D Vis     │  │ Charts     │  │ Export     │        │
│  └────────────┘  └────────────┘  └────────────┘        │
└──────────────────────────────────────────────────────────┘
```

---

## Core Feature Implementation

### 1. Spatiotemporal Data Storage

Efficiently manage 3D spatiotemporal data using WebGeoDB's advanced indexing.

```typescript
import { WebGeoDB } from '@webgeodb/core';

class EnvironmentalMonitor {
  private db: WebGeoDB;

  constructor() {
    this.db = new WebGeoDB({
      name: 'environmental-monitor',
      enableSpatialIndex: true,
      enableTimeIndex: true
    });
  }

  // Add monitoring station
  async addStation(station: MonitoringStation): Promise<void> {
    await this.db.insert('stations', {
      ...station,
      _geometry: {
        type: 'Point',
        coordinates: [
          station.location.longitude,
          station.location.latitude,
          station.location.altitude || 0
        ]
      }
    });
  }

  // Store monitoring data
  async saveMonitoringData(data: MonitoringData): Promise<void> {
    await this.db.insert('monitoring_data', {
      ...data,
      _timestamp: data.timestamp,
      _spatiotemporal: true // Mark as spatiotemporal data
    });
  }

  // Query spatiotemporal range data
  async querySpatiotemporalData(
    bounds: GeoBounds,
    startTime: number,
    endTime: number,
    limit: number = 1000
  ): Promise<MonitoringData[]> {
    return await this.db.search('monitoring_data', {
      where: {
        _geoWithin: bounds,
        _timestamp: { gte: startTime, lte: endTime }
      },
      orderBy: { _timestamp: 'asc' },
      limit
    });
  }
}
```

### 2. Spatial Interpolation Algorithms

Estimate environmental quality for unmonitored areas based on monitoring point data.

#### Inverse Distance Weighting (IDW)

```typescript
class IDWInterpolator {
  // IDW interpolation algorithm
  interpolate(
    points: Array<{ x: number; y: number; value: number }>,
    targetPoint: { x: number; y: number },
    power: number = 2
  ): number {
    let numerator = 0;
    let denominator = 0;

    for (const point of points) {
      const distance = Math.sqrt(
        Math.pow(targetPoint.x - point.x, 2) +
        Math.pow(targetPoint.y - point.y, 2)
      );

      if (distance === 0) {
        return point.value; // Coincident point
      }

      const weight = 1 / Math.pow(distance, power);
      numerator += weight * point.value;
      denominator += weight;
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Generate grid interpolation results
  generateGrid(
    points: Array<{ x: number; y: number; value: number }>,
    bounds: GeoBounds,
    resolution: number,
    power: number = 2
  ): InterpolationResult {
    const rows = Math.ceil((bounds.north - bounds.south) / resolution);
    const cols = Math.ceil((bounds.east - bounds.west) / resolution);
    const grid: number[][] = [];

    for (let i = 0; i < rows; i++) {
      grid[i] = [];
      for (let j = 0; j < cols; j++) {
        const x = bounds.west + j * resolution;
        const y = bounds.south + i * resolution;

        grid[i][j] = this.interpolate(points, { x, y }, power);
      }
    }

    return {
      timestamp: Date.now(),
      grid: { bounds, resolution, values: grid },
      method: 'idw',
      parameters: { power }
    };
  }
}
```

#### Kriging Interpolation

```typescript
class KrigingInterpolator {
  // Simple Kriging interpolation
  interpolate(
    points: Array<{ x: number; y: number; value: number }>,
    targetPoint: { x: number; y: number },
    variogramModel: { range: number; sill: number; nugget: number }
  ): number {
    // 1. Calculate semivariance
    const semivariance = this.calculateSemivariance(points, variogramModel);

    // 2. Build Kriging matrix
    const krigingMatrix = this.buildKrigingMatrix(points, semivariance);

    // 3. Solve for weights
    const weights = this.solveWeights(krigingMatrix, points, targetPoint);

    // 4. Calculate prediction
    const prediction = weights.reduce((sum, w, i) =>
      sum + w * points[i].value, 0
    );

    return prediction;
  }

  private calculateSemivariance(
    points: Array<{ x: number; y: number; value: number }>,
    model: { range: number; sill: number; nugget: number }
  ): (distance: number) => number {
    return (distance: number) => {
      if (distance === 0) return model.nugget;
      const contribution = model.sill * (1 - Math.exp(-3 * distance / model.range));
      return model.nugget + Math.min(contribution, model.sill);
    };
  }

  private buildKrigingMatrix(
    points: Array<{ x: number; y: number; value: number }>,
    semivariance: (distance: number) => number
  ): number[][] {
    const n = points.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= n; i++) {
      matrix[i] = [];
      for (let j = 0; j <= n; j++) {
        if (i === n || j === n) {
          matrix[i][j] = 1;
        } else if (i === j) {
          matrix[i][j] = 0;
        } else {
          const distance = Math.sqrt(
            Math.pow(points[i].x - points[j].x, 2) +
            Math.pow(points[i].y - points[j].y, 2)
          );
          matrix[i][j] = semivariance(distance);
        }
      }
    }

    return matrix;
  }

  private solveWeights(
    matrix: number[][],
    points: Array<{ x: number; y: number; value: number }>,
    target: { x: number; y: number }
  ): number[] {
    // Simplified implementation
    // Production use should employ numerical computing libraries
    const n = points.length;
    return new Array(n).fill(1 / n);
  }
}
```

### 3. Contour Generation

Generate contour lines for pollution level classification based on interpolation grid.

```typescript
class ContourGenerator {
  // Marching Squares algorithm for contour generation
  generateContours(
    grid: number[][],
    contourLevels: number[]
  ): Array<{ level: number; paths: Array<Array<[number, number]>> }> {
    const results = [];

    for (const level of contourLevels) {
      const paths = this.marchingSquares(grid, level);
      results.push({ level, paths });
    }

    return results;
  }

  private marchingSquares(
    grid: number[][],
    level: number
  ): Array<Array<[number, number]>> {
    const paths: Array<Array<[number, number]>> = [];
    const rows = grid.length;
    const cols = grid[0].length;
    const visited = new Set<string>();

    for (let i = 0; i < rows - 1; i++) {
      for (let j = 0; j < cols - 1; j++) {
        const key = `${i},${j}`;
        if (visited.has(key)) continue;

        const contour = this.traceContour(grid, i, j, level, visited);
        if (contour.length > 0) {
          paths.push(contour);
        }
      }
    }

    return paths;
  }

  private traceContour(
    grid: number[][],
    startRow: number,
    startCol: number,
    level: number,
    visited: Set<string>
  ): Array<[number, number]> {
    const path: Array<[number, number]> = [];
    let currentRow = startRow;
    let currentCol = startCol;

    while (true) {
      const key = `${currentRow},${currentCol}`;
      if (visited.has(key)) break;
      visited.add(key);

      const config = this.getSquareConfig(grid, currentRow, currentCol, level);

      if (config === 0 || config === 15) break;

      const point = this.interpolateEdgePoint(grid, currentRow, currentCol, level);
      if (point) {
        path.push(point);
      }

      const next = this.getNextSquare(currentRow, currentCol, config);
      if (!next) break;

      currentRow = next.row;
      currentCol = next.col;

      if (path.length > 10000) break;
    }

    return path;
  }

  private getSquareConfig(
    grid: number[][],
    row: number,
    col: number,
    level: number
  ): number {
    let config = 0;

    if (grid[row][col] >= level) config |= 1;
    if (grid[row][col + 1] >= level) config |= 2;
    if (grid[row + 1][col + 1] >= level) config |= 4;
    if (grid[row + 1][col] >= level) config |= 8;

    return config;
  }

  private interpolateEdgePoint(
    grid: number[][],
    row: number,
    col: number,
    level: number
  ): [number, number] | null {
    // Simplified: return cell center
    return [col + 0.5, row + 0.5];
  }

  private getNextSquare(
    row: number,
    col: number,
    config: number
  ): { row: number; col: number } | null {
    // Simplified: move right
    return { row, col: col + 1 };
  }
}
```

### 4. Dynamic Heatmap Visualization

Generate dynamic heatmaps using time-series data.

```typescript
class HeatmapVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  // Render single heatmap frame
  renderHeatmap(
    grid: number[][],
    bounds: GeoBounds,
    colorScale: (value: number) => string
  ): void {
    const { width, height } = this.canvas;
    const rows = grid.length;
    const cols = grid[0].length;
    const cellWidth = width / cols;
    const cellHeight = height / rows;

    this.ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const value = grid[i][j];
        this.ctx.fillStyle = colorScale(value);
        this.ctx.fillRect(
          j * cellWidth,
          i * cellHeight,
          cellWidth + 1,
          cellHeight + 1
        );
      }
    }
  }

  // Play time-series animation
  async playAnimation(
    dataFrames: Array<{ timestamp: number; grid: number[][] }>,
    bounds: GeoBounds,
    colorScale: (value: number) => string,
    fps: number = 30
  ): Promise<void> {
    const frameDelay = 1000 / fps;

    for (const frame of dataFrames) {
      this.renderHeatmap(frame.grid, bounds, colorScale);

      this.ctx.fillStyle = 'white';
      this.ctx.font = '16px sans-serif';
      this.ctx.fillText(
        new Date(frame.timestamp).toLocaleString(),
        10,
        20
      );

      await new Promise(resolve => setTimeout(resolve, frameDelay));
    }
  }

  // Generate color scale
  static createColorScale(
    min: number,
    max: number,
    colors: Array<{ value: number; color: string }>
  ): (value: number) => string {
    return (value: number) => {
      const t = Math.max(0, Math.min(1, (value - min) / (max - min)));

      for (let i = 0; i < colors.length - 1; i++) {
        if (t >= colors[i].value && t <= colors[i + 1].value) {
          return colors[i].color;
        }
      }

      return colors[colors.length - 1].color;
    };
  }
}
```

### 5. Data Query and Aggregation

Provide flexible multi-dimensional queries and data aggregation.

```typescript
class DataQueryService {
  constructor(private db: WebGeoDB) {}

  // Query by station
  async queryByStation(
    stationId: string,
    startTime: number,
    endTime: number
  ): Promise<MonitoringData[]> {
    return await this.db.search('monitoring_data', {
      where: {
        stationId,
        _timestamp: { gte: startTime, lte: endTime }
      },
      orderBy: { _timestamp: 'asc' }
    });
  }

  // Query by region
  async queryByRegion(
    bounds: GeoBounds,
    startTime: number,
    endTime: number
  ): Promise<MonitoringData[]> {
    return await this.db.search('monitoring_data', {
      where: {
        _geoWithin: bounds,
        _timestamp: { gte: startTime, lte: endTime }
      },
      orderBy: { _timestamp: 'asc' }
    });
  }

  // Statistical aggregation
  async aggregateData(
    bounds: GeoBounds,
    startTime: number,
    endTime: number,
    metric: string,
    aggregation: 'avg' | 'min' | 'max' | 'sum' | 'count'
  ): Promise<number> {
    const data = await this.queryByRegion(bounds, startTime, endTime);

    if (data.length === 0) return 0;

    const values = data
      .map(d => d.measurements[metric])
      .filter(v => v !== undefined);

    switch (aggregation) {
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'count':
        return values.length;
      default:
        throw new Error(`Unknown aggregation: ${aggregation}`);
    }
  }

  // Time-series aggregation
  async aggregateByTimeBucket(
    bounds: GeoBounds,
    startTime: number,
    endTime: number,
    bucketSize: number,
    metric: string,
    aggregation: 'avg' | 'min' | 'max'
  ): Promise<Array<{ timestamp: number; value: number }>> {
    const allData = await this.queryByRegion(bounds, startTime, endTime);
    const buckets = new Map<number, number[]>();

    for (const data of allData) {
      const bucketKey = Math.floor(data.timestamp / bucketSize) * bucketSize;

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }

      const value = data.measurements[metric];
      if (value !== undefined) {
        buckets.get(bucketKey)!.push(value);
      }
    }

    const result = [];
    for (const [timestamp, values] of buckets) {
      let aggregated: number;
      switch (aggregation) {
        case 'avg':
          aggregated = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'min':
          aggregated = Math.min(...values);
          break;
        case 'max':
          aggregated = Math.max(...values);
          break;
      }

      result.push({ timestamp, value: aggregated });
    }

    return result.sort((a, b) => a.timestamp - b.timestamp);
  }
}
```

---

## Complete Example

### Air Quality Monitoring System

```typescript
import { WebGeoDB } from '@webgeodb/core';

class AirQualityMonitor {
  private monitor: EnvironmentalMonitor;
  private interpolator: IDWInterpolator;
  private contourGen: ContourGenerator;
  private visualizer: HeatmapVisualizer;

  constructor(canvas: HTMLCanvasElement) {
    this.monitor = new EnvironmentalMonitor();
    this.interpolator = new IDWInterpolator();
    this.contourGen = new ContourGenerator();
    this.visualizer = new HeatmapVisualizer(canvas);
  }

  // Initialize monitoring stations
  async initializeStations(): Promise<void> {
    const stations: MonitoringStation[] = [
      {
        id: 'station-001',
        name: 'City Center Station',
        location: { latitude: 39.9042, longitude: 116.4074 },
        stationType: 'air',
        status: 'active',
        metadata: {
          installationDate: '2023-01-01',
          operator: 'EPA',
          region: 'City Center'
        }
      },
      {
        id: 'station-002',
        name: 'Industrial Park Station',
        location: { latitude: 39.9142, longitude: 116.4374 },
        stationType: 'air',
        status: 'active',
        metadata: {
          installationDate: '2023-01-01',
          operator: 'EPA',
          region: 'Industrial Park'
        }
      },
      {
        id: 'station-003',
        name: 'Residential Area Station',
        location: { latitude: 39.8942, longitude: 116.3874 },
        stationType: 'air',
        status: 'active',
        metadata: {
          installationDate: '2023-01-01',
          operator: 'EPA',
          region: 'Residential Area'
        }
      }
    ];

    for (const station of stations) {
      await this.monitor.addStation(station);
    }
  }

  // Simulate real-time data collection
  async collectRealtimeData(): Promise<void> {
    const stations = await this.monitor.getActiveStations();
    const timestamp = Date.now();

    for (const station of stations) {
      // Simulate random PM2.5 values
      const pm25 = 20 + Math.random() * 150;
      const pm10 = pm25 * (1.2 + Math.random() * 0.5);
      const aqi = this.calculateAQI(pm25);

      const data: MonitoringData = {
        stationId: station.id,
        timestamp,
        measurements: {
          pm25: Math.round(pm25 * 10) / 10,
          pm10: Math.round(pm10 * 10) / 10,
          aqi: Math.round(aqi)
        },
        quality: this.getAirQualityLevel(aqi)
      };

      await this.monitor.saveMonitoringData(data);
    }
  }

  // Calculate AQI (simplified)
  private calculateAQI(pm25: number): number {
    if (pm25 <= 35) return (pm25 / 35) * 50;
    if (pm25 <= 75) return 50 + ((pm25 - 35) / 40) * 50;
    if (pm25 <= 115) return 100 + ((pm25 - 75) / 40) * 50;
    if (pm25 <= 150) return 150 + ((pm25 - 115) / 35) * 50;
    if (pm25 <= 250) return 200 + ((pm25 - 150) / 100) * 100;
    return 300 + ((pm25 - 250) / 100) * 200;
  }

  // Get air quality level
  private getAirQualityLevel(aqi: number): 'good' | 'fair' | 'poor' {
    if (aqi <= 50) return 'good';
    if (aqi <= 100) return 'good';
    if (aqi <= 150) return 'fair';
    return 'poor';
  }

  // Generate PM2.5 distribution map
  async generatePM25Distribution(): Promise<void> {
    const bounds: GeoBounds = {
      west: 116.35,
      south: 39.88,
      east: 116.45,
      north: 39.93
    };

    const latestData = await this.monitor.getLatestData(bounds);
    const points = latestData.map(d => ({
      x: d.location.longitude,
      y: d.location.latitude,
      value: d.measurements.pm25
    }));

    // IDW interpolation
    const grid = this.interpolator.generateGrid(
      points,
      bounds,
      0.001,
      2
    );

    // Generate contours
    const contours = this.contourGen.generateContours(grid.grid.values, [
      35, 75, 115, 150, 250
    ]);

    // Visualization
    const colorScale = HeatmapVisualizer.createColorScale(
      0,
      300,
      [
        { value: 0, color: '#00e400' },
        { value: 0.17, color: '#ffff00' },
        { value: 0.33, color: '#ff7e00' },
        { value: 0.5, color: '#ff0000' },
        { value: 0.67, color: '#99004c' },
        { value: 0.83, color: '#7e0023' },
        { value: 1, color: '#7e0023' }
      ]
    );

    this.visualizer.renderHeatmap(grid.grid.values, bounds, colorScale);
    this.visualizer.drawContours(contours, bounds);
    await this.visualizer.drawStations(latestData);
  }

  // Time-series playback
  async playTimeSeriesAnimation(
    startTime: number,
    endTime: number,
    interval: number = 3600000
  ): Promise<void> {
    const bounds: GeoBounds = {
      west: 116.35,
      south: 39.88,
      east: 116.45,
      north: 39.93
    };

    const frames = [];

    for (let t = startTime; t <= endTime; t += interval) {
      const data = await this.monitor.querySpatiotemporalData(
        bounds,
        t,
        t + interval
      );

      if (data.length === 0) continue;

      const points = data.map(d => ({
        x: d.location.longitude,
        y: d.location.latitude,
        value: d.measurements.pm25
      }));

      const grid = this.interpolator.generateGrid(
        points,
        bounds,
        0.001,
        2
      );

      frames.push({
        timestamp: t,
        grid: grid.grid.values
      });
    }

    const colorScale = HeatmapVisualizer.createColorScale(0, 300, [
      { value: 0, color: '#00e400' },
      { value: 0.5, color: '#ffff00' },
      { value: 1, color: '#ff0000' }
    ]);

    await this.visualizer.playAnimation(frames, bounds, colorScale, 10);
  }

  // Pollution source tracking
  async trackPollutionSource(
    targetAQI: number = 150
  ): Promise<Array<{ location: [number, number]; probability: number }>> {
    const latestData = await this.monitor.getLatestData();
    const highPollutionStations = latestData.filter(
      d => d.measurements.aqi >= targetAQI
    );

    if (highPollutionStations.length === 0) {
      return [];
    }

    const sources = [];

    for (const station of highPollutionStations) {
      const windDirection = await this.getWindDirection(station.location);
      const sourceDistance = 1000;

      const sourceLat =
        station.location.latitude +
        (sourceDistance / 111000) * Math.cos(windDirection);
      const sourceLon =
        station.location.longitude +
        (sourceDistance / (111000 * Math.cos(station.location.latitude * Math.PI / 180))) *
        Math.sin(windDirection);

      sources.push({
        location: [sourceLon, sourceLat],
        probability: station.measurements.aqi / 300
      });
    }

    return sources;
  }

  private async getWindDirection(location: { latitude: number; longitude: number }): Promise<number> {
    return Math.random() * Math.PI * 2;
  }

  // Export data
  async exportData(
    bounds: GeoBounds,
    startTime: number,
    endTime: number,
    format: 'json' | 'csv' | 'geojson'
  ): Promise<string> {
    const data = await this.monitor.querySpatiotemporalData(
      bounds,
      startTime,
      endTime
    );

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);

      case 'csv':
        const headers = ['timestamp', 'stationId', 'latitude', 'longitude', 'pm25', 'pm10', 'aqi', 'quality'];
        const rows = data.map(d =>
          [
            d.timestamp,
            d.stationId,
            d.location.latitude,
            d.location.longitude,
            d.measurements.pm25,
            d.measurements.pm10,
            d.measurements.aqi,
            d.quality
          ].join(',')
        );

        return [headers.join(','), ...rows].join('\n');

      case 'geojson':
        const features = data.map(d => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [d.location.longitude, d.location.latitude]
          },
          properties: {
            timestamp: d.timestamp,
            stationId: d.stationId,
            measurements: d.measurements,
            quality: d.quality
          }
        }));

        return JSON.stringify({
          type: 'FeatureCollection',
          features
        }, null, 2);

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
}
```

---

## Key Technical Points

### 1. Spatiotemporal Index Optimization

WebGeoDB uses a composite R-tree + timeline index structure:

```typescript
// Spatiotemporal index structure
interface SpatiotemporalIndex {
  // Spatial dimension: R-tree
  spatial: RTree;

  // Temporal dimension: B+ tree
  temporal: BPlusTree;

  // Composite query
  query(spatialBounds, timeRange): Result[] {
    // 1. Spatial filtering
    const spatialCandidates = this.spatial.search(spatialBounds);

    // 2. Temporal filtering
    const results = spatialCandidates.filter(pt =>
      this.temporal.search(pt.id, timeRange)
    );

    return results;
  }
}
```

### 2. Data Compression Strategy

Time-series data uses delta encoding and bit compression:

```typescript
class TimeSeriesCompressor {
  // Delta encoding
  compressDelta(values: number[]): ArrayBuffer {
    const deltas = [];
    let prev = 0;

    for (const value of values) {
      deltas.push(value - prev);
      prev = value;
    }

    return new Int16Array(deltas).buffer;
  }

  // Gorilla compression (simplified Facebook Gorilla algorithm)
  compressGorilla(values: number[]): ArrayBuffer {
    const bits = [];

    this.writeBits(bits, values[0], 64);

    let prevValue = values[0];
    let prevDelta = 0;

    for (let i = 1; i < values.length; i++) {
      const delta = values[i] - prevValue;
      const deltaOfDelta = delta - prevDelta;

      if (deltaOfDelta === 0) {
        this.writeBit(bits, 0);
      } else if (deltaOfDelta >= -63 && deltaOfDelta <= 63) {
        this.writeBit(bits, 1);
        this.writeBit(bits, 0);
        this.writeBits(bits, deltaOfDelta + 64, 7);
      } else {
        this.writeBit(bits, 1);
        this.writeBit(bits, 1);
        this.writeBits(bits, delta, 32);
      }

      prevValue = values[i];
      prevDelta = delta;
    }

    return this.bitsToBytes(bits);
  }
}
```

### 3. Interpolation Algorithm Performance Optimization

```typescript
class OptimizedIDWInterpolator extends IDWInterpolator {
  private kdtree: KDTree;

  buildIndex(points: Array<{ x: number; y: number; value: number }>): void {
    this.kdtree = new KDTree(points.map(p => [p.x, p.y]));
  }

  // Optimized interpolation: only consider K nearest points
  interpolateOptimized(
    targetPoint: { x: number; y: number },
    k: number = 12
  ): number {
    const nearestIndices = this.kdtree.nearest(
      [targetPoint.x, targetPoint.y],
      k
    );

    const nearestPoints = nearestIndices.map(i => this.points[i]);

    return super.interpolate(nearestPoints, targetPoint);
  }
}
```

---

## Extended Features

### 1. Real-time Alert System

```typescript
class AlertSystem {
  async setupAlerts(
    metric: string,
    thresholds: {
      warning: number;
      critical: number;
    }
  ): Promise<void> {
    this.db.on('dataInserted', async (data: MonitoringData) => {
      const value = data.measurements[metric];

      if (value >= thresholds.critical) {
        await this.sendCriticalAlert(data, metric, value);
      } else if (value >= thresholds.warning) {
        await this.sendWarningAlert(data, metric, value);
      }
    });
  }

  private async sendCriticalAlert(
    data: MonitoringData,
    metric: string,
    value: number
  ): Promise<void> {
    await this.notificationService.send({
      level: 'critical',
      title: 'Critical Pollution Alert',
      message: `Station ${data.stationId} ${metric} value is ${value}, exceeding critical threshold`,
      actions: [
        { label: 'View Details', action: 'view_details' },
        { label: 'Emergency Plan', action: 'emergency_plan' }
      ]
    });
  }
}
```

### 2. Trend Prediction

```typescript
class TrendPredictor {
  async predictMovingAverage(
    stationId: string,
    metric: string,
    windowSize: number = 24,
    forecastSteps: number = 6
  ): Promise<Array<{ timestamp: number; predicted: number; confidence: number }>> {
    const historicalData = await this.queryService.queryByStation(
      stationId,
      Date.now() - windowSize * 3600000,
      Date.now()
    );

    const values = historicalData.map(d => d.measurements[metric]);
    const ma = this.calculateMovingAverage(values, windowSize);

    const predictions = [];
    for (let i = 1; i <= forecastSteps; i++) {
      const predicted = ma[ma.length - 1];
      const variance = this.calculateVariance(values.slice(-windowSize));
      const confidence = Math.sqrt(variance) * Math.sqrt(i);

      predictions.push({
        timestamp: Date.now() + i * 3600000,
        predicted,
        confidence
      });
    }

    return predictions;
  }
}
```

### 3. Data Quality Assessment

```typescript
class DataQualityAssessor {
  async assessQuality(stationId: string): Promise<{
    completeness: number;
    consistency: number;
    validity: number;
    overall: number;
    issues: string[];
  }> {
    const data = await this.queryService.queryByStation(
      stationId,
      Date.now() - 86400000 * 7,
      Date.now()
    );

    const issues = [];
    const expectedPoints = 7 * 24 * 60;
    const completeness = data.length / expectedPoints;

    if (completeness < 0.9) {
      issues.push(`Data completeness is only ${(completeness * 100).toFixed(1)}%, below 90%`);
    }

    const consistency = this.checkConsistency(data);
    const validity = this.checkValidity(data);
    const overall = (completeness + consistency + validity) / 3;

    return {
      completeness,
      consistency,
      validity,
      overall,
      issues
    };
  }

  private checkConsistency(data: MonitoringData[]): number {
    let issues = 0;

    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];

      for (const metric in curr.measurements) {
        const change = Math.abs(
          (curr.measurements[metric] - prev.measurements[metric]) /
          prev.measurements[metric]
        );

        if (change > 0.5) {
          issues++;
          break;
        }
      }
    }

    return 1 - (issues / data.length);
  }

  private checkValidity(data: MonitoringData[]): number {
    let valid = 0;

    for (const d of data) {
      const { pm25, pm10 } = d.measurements;
      const pm25Valid = pm25 >= 0 && pm25 <= 500;
      const pm10Valid = pm10 >= 0 && pm10 <= 600;
      const ratioValid = pm10 > pm25;

      if (pm25Valid && pm10Valid && ratioValid) {
        valid++;
      }
    }

    return valid / data.length;
  }
}
```

---

## Deployment Recommendations

### 1. Performance Optimization

```typescript
class PartitionStrategy {
  async partitionByTime(data: MonitoringData): Promise<string> {
    const date = new Date(data.timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    return `monitoring_data_${year}_${month}`;
  }

  async partitionBySpace(
    data: MonitoringData,
    gridSize: number = 0.1
  ): Promise<string> {
    const lat = data.location.latitude;
    const lon = data.location.longitude;

    const latZone = Math.floor(lat / gridSize);
    const lonZone = Math.floor(lon / gridSize);

    return `monitoring_data_${latZone}_${lonZone}`;
  }
}
```

### 2. Caching Strategy

```typescript
class CacheManager {
  private cache: Map<string, { data: any; expiry: number }>;

  async getCachedInterpolation(
    bounds: GeoBounds,
    timestamp: number,
    resolution: number
  ): Promise<InterpolationResult | null> {
    const key = `interp_${this.hashBounds(bounds)}_${timestamp}_${resolution}`;
    const cached = this.cache.get(key);

    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    return null;
  }

  async setCachedInterpolation(
    bounds: GeoBounds,
    timestamp: number,
    resolution: number,
    data: InterpolationResult,
    ttl: number = 3600000
  ): Promise<void> {
    const key = `interp_${this.hashBounds(bounds)}_${timestamp}_${resolution}`;
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }

  private hashBounds(bounds: GeoBounds): string {
    return `${bounds.west}_${bounds.south}_${bounds.east}_${bounds.north}`;
  }
}
```

---

## Summary

The Environmental Monitoring Data Platform demonstrates WebGeoDB's capabilities in:

### Core Advantages

- ✅ **Efficient Spatiotemporal Data Management**: R-tree + timeline index for fast queries
- ✅ **Powerful Spatial Analysis**: Support for multiple interpolation algorithms and contour generation
- ✅ **Flexible Visualization**: Dynamic heatmaps, time-series animation
- ✅ **Comprehensive Data Quality Assurance**: Completeness, consistency, validity checks
- ✅ **Real-time Alert Mechanism**: Intelligent threshold alerts and pollution source tracking

### Application Value

- **Environmental Protection**: Real-time monitoring, early warning, pollution control
- **Public Health**: Air quality index publication, health recommendations
- **Scientific Research**: Climate change, environmental evolution analysis
- **Policy Making**: Data-driven environmental policy decisions

### Next Steps

- View complete example code: `/examples/projects/environmental-monitoring/`
- Learn other project applications:
  - **Smart City Infrastructure Management**: Urban asset management
  - **Logistics Delivery Optimization**: Route planning and scheduling
  - **E-commerce Geofencing Marketing**: Location-driven marketing
  - **Social Location Sharing**: Location-based social networking
