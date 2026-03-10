# 环境监测数据平台

> **应用场景**: 时空数据管理、环境质量监测、污染源追踪
> **技术亮点**: 时间序列数据、空间插值、等值线生成、动态热力图
> **预计完成时间**: 3-4小时

---

## 概述

环境监测数据平台是一个专业的时空数据处理系统，用于采集、存储、分析和可视化各类环境监测数据。该平台展示了 WebGeoDB 在处理三维时空数据（经度、纬度、时间）方面的强大能力，以及空间分析算法在环境科学中的实际应用。

### 核心功能

- **时空数据存储**: 高效管理监测点的时间序列数据
- **空间插值分析**: 基于监测点数据推算区域环境质量
- **动态可视化**: 实时数据展示和时间序列动画
- **监测站点管理**: 站点增删改查和状态监控
- **数据查询导出**: 灵活的多维度查询和数据导出

### 应用场景

| 场景 | 监测指标 | 应用价值 |
|------|---------|---------|
| 空气质量监测 | PM2.5、PM10、AQI、SO₂、NO₂ | 公众健康预警、污染源追踪 |
| 水质监测 | pH值、溶解氧、浊度、重金属 | 水资源保护、生态评估 |
| 噪声监测 | 分贝值、频谱分析 | 城市规划、环境治理 |
| 温度监测 | 气温、地温、水温 | 气候研究、热岛效应分析 |

---

## 系统架构

### 数据模型

```typescript
// 监测站点数据结构
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

// 时间序列监测数据
interface MonitoringData {
  stationId: string;
  timestamp: number;
  measurements: {
    [key: string]: number; // 指标名 -> 值
  };
  quality: 'good' | 'fair' | 'poor';
}

// 空间插值结果
interface InterpolationResult {
  timestamp: number;
  grid: {
    bounds: GeoBounds;
    resolution: number;
    values: number[][];
  };
  method: 'idw' | 'kriging';
  parameters: {
    power?: number; // IDW幂参数
    range?: number; // Kriging变程
    sill?: number; // Kriging基台值
  };
}
```

### 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                   数据采集层                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 传感器   │  │  人工录入 │  │ API导入  │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
└───────┼─────────────┼─────────────┼────────────────────┘
        │             │             │
┌───────┼─────────────┼─────────────┼────────────────────┐
│       ▼             ▼             ▼                     │
│              WebGeoDB 存储引擎                           │
│  ┌────────────────────────────────────────┐            │
│  │  时空索引 (R-tree + 时间轴)            │            │
│  │  数据压缩与聚合                        │            │
│  │  空间查询优化                          │            │
│  └────────────────────────────────────────┘            │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────┐
│                          ▼                               │
│                   数据分析层                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ IDW插值    │  │Kriging插值 │  │等值线生成  │        │
│  └────────────┘  └────────────┘  └────────────┘        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │统计分析    │  │趋势预测    │  │异常检测    │        │
│  └────────────┘  └────────────┘  └────────────┘        │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────┐
│                          ▼                               │
│                   可视化展示层                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │热力图      │  │等值线图    │  │时间序列动画│        │
│  └────────────┘  └────────────┘  └────────────┘        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ 3D可视化   │  │统计图表    │  │数据导出    │        │
│  └────────────┘  └────────────┘  └────────────┘        │
└──────────────────────────────────────────────────────────┘
```

---

## 核心功能实现

### 1. 时空数据存储

利用 WebGeoDB 的高效索引机制管理三维时空数据。

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

  // 添加监测站点
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

  // 存储监测数据
  async saveMonitoringData(data: MonitoringData): Promise<void> {
    await this.db.insert('monitoring_data', {
      ...data,
      _timestamp: data.timestamp,
      _spatiotemporal: true // 标记为时空数据
    });
  }

  // 查询时空范围数据
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

### 2. 空间插值算法

基于监测点数据推算未监测区域的环境质量。

#### 反距离权重插值（IDW）

```typescript
class IDWInterpolator {
  // IDW插值算法
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
        return point.value; // 重合点直接返回该点值
      }

      const weight = 1 / Math.pow(distance, power);
      numerator += weight * point.value;
      denominator += weight;
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  // 生成网格插值结果
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
      grid: {
        bounds,
        resolution,
        values: grid
      },
      method: 'idw',
      parameters: { power }
    };
  }
}
```

#### 克里金插值（Kriging）

```typescript
class KrigingInterpolator {
  // 简单克里金插值
  interpolate(
    points: Array<{ x: number; y: number; value: number }>,
    targetPoint: { x: number; y: number },
    variogramModel: { range: number; sill: number; nugget: number }
  ): number {
    // 1. 计算半变异函数值
    const semivariance = this.calculateSemivariance(points, variogramModel);

    // 2. 构建克里金矩阵
    const krigingMatrix = this.buildKrigingMatrix(points, semivariance);

    // 3. 求解权重
    const weights = this.solveWeights(krigingMatrix, points, targetPoint);

    // 4. 计算插值结果
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
    // 简化实现：使用高斯消元法求解
    // 实际应用中可使用数值计算库
    const n = points.length;
    const rhs: number[] = [];

    for (let i = 0; i < n; i++) {
      const distance = Math.sqrt(
        Math.pow(points[i].x - target.x, 2) +
        Math.pow(points[i].y - target.y, 2)
      );
      rhs.push(matrix[i][n] === 1 ? 1 : distance);
    }
    rhs.push(1);

    // 返回简化的权重（实际需要完整的矩阵求解）
    return new Array(n).fill(1 / n);
  }
}
```

### 3. 等值线生成

基于插值网格生成等值线用于污染等级划分。

```typescript
class ContourGenerator {
  // Marching Squares算法生成等值线
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

    // 简化实现：追踪单条等值线
    // 完整实现需要处理所有16种配置和连接情况
    while (true) {
      const key = `${currentRow},${currentCol}`;
      if (visited.has(key)) break;
      visited.add(key);

      // 计算当前方格的配置（0-15）
      const config = this.getSquareConfig(
        grid,
        currentRow,
        currentCol,
        level
      );

      if (config === 0 || config === 15) {
        // 全在等值线上方或下方，跳过
        break;
      }

      // 根据配置添加等值线点
      const point = this.interpolateEdgePoint(grid, currentRow, currentCol, level);
      if (point) {
        path.push(point);
      }

      // 移动到下一个方格
      const next = this.getNextSquare(currentRow, currentCol, config);
      if (!next) break;

      currentRow = next.row;
      currentCol = next.col;

      // 防止无限循环
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

    // 检查四个角点是否在等值线上方
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
    // 简化实现：返回方格中心
    // 实际应该在边上插值
    return [col + 0.5, row + 0.5];
  }

  private getNextSquare(
    row: number,
    col: number,
    config: number
  ): { row: number; col: number } | null {
    // 简化实现：移动到右边的方格
    // 实际应该根据配置决定移动方向
    return { row, col: col + 1 };
  }
}
```

### 4. 动态热力图可视化

使用时间序列数据生成动态热力图。

```typescript
class HeatmapVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  // 渲染单帧热力图
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

    // 清空画布
    this.ctx.clearRect(0, 0, width, height);

    // 绘制每个网格单元
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

  // 播放时间序列动画
  async playAnimation(
    dataFrames: Array<{ timestamp: number; grid: number[][] }>,
    bounds: GeoBounds,
    colorScale: (value: number) => string,
    fps: number = 30
  ): Promise<void> {
    const frameDelay = 1000 / fps;

    for (const frame of dataFrames) {
      this.renderHeatmap(frame.grid, bounds, colorScale);

      // 绘制时间戳
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

  // 生成颜色标尺
  static createColorScale(
    min: number,
    max: number,
    colors: Array<{ value: number; color: string }>
  ): (value: number) => string {
    return (value: number) => {
      // 简化实现：使用线性插值
      const t = Math.max(0, Math.min(1, (value - min) / (max - min)));

      // 找到所在的区间
      for (let i = 0; i < colors.length - 1; i++) {
        if (t >= colors[i].value && t <= colors[i + 1].value) {
          const localT =
            (t - colors[i].value) /
            (colors[i + 1].value - colors[i].value);

          return this.interpolateColor(
            colors[i].color,
            colors[i + 1].color,
            localT
          );
        }
      }

      return colors[colors.length - 1].color;
    };
  }

  private static interpolateColor(
    color1: string,
    color2: string,
    t: number
  ): string {
    // 简化实现：解析RGB并插值
    // 实际应用中可使用专业的颜色处理库
    return color1; // 简化返回
  }
}
```

### 5. 数据查询和聚合

提供灵活的多维度查询和数据聚合功能。

```typescript
class DataQueryService {
  constructor(private db: WebGeoDB) {}

  // 按站点查询数据
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

  // 按区域查询数据
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

  // 统计聚合
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

  // 时间序列聚合
  async aggregateByTimeBucket(
    bounds: GeoBounds,
    startTime: number,
    endTime: number,
    bucketSize: number, // 时间桶大小（毫秒）
    metric: string,
    aggregation: 'avg' | 'min' | 'max'
  ): Promise<Array<{ timestamp: number; value: number }>> {
    const allData = await this.queryByRegion(bounds, startTime, endTime);

    const buckets = new Map<number, number[]>();

    // 分组到时间桶
    for (const data of allData) {
      const bucketKey =
        Math.floor(data.timestamp / bucketSize) * bucketSize;

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }

      const value = data.measurements[metric];
      if (value !== undefined) {
        buckets.get(bucketKey)!.push(value);
      }
    }

    // 聚合每个桶
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

## 完整示例

### 空气质量监测系统

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

  // 初始化监测站点
  async initializeStations(): Promise<void> {
    const stations: MonitoringStation[] = [
      {
        id: 'station-001',
        name: '市中心监测站',
        location: { latitude: 39.9042, longitude: 116.4074 },
        stationType: 'air',
        status: 'active',
        metadata: {
          installationDate: '2023-01-01',
          operator: '市环保局',
          region: '市中心'
        }
      },
      {
        id: 'station-002',
        name: '工业园区监测站',
        location: { latitude: 39.9142, longitude: 116.4374 },
        stationType: 'air',
        status: 'active',
        metadata: {
          installationDate: '2023-01-01',
          operator: '市环保局',
          region: '工业园'
        }
      },
      {
        id: 'station-003',
        name: '居民区监测站',
        location: { latitude: 39.8942, longitude: 116.3874 },
        stationType: 'air',
        status: 'active',
        metadata: {
          installationDate: '2023-01-01',
          operator: '市环保局',
          region: '居民区'
        }
      }
    ];

    for (const station of stations) {
      await this.monitor.addStation(station);
    }
  }

  // 模拟实时数据采集
  async collectRealtimeData(): Promise<void> {
    const stations = await this.monitor.getActiveStations();
    const timestamp = Date.now();

    for (const station of stations) {
      // 模拟随机PM2.5值（实际应从传感器读取）
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

  // 计算AQI（简化版）
  private calculateAQI(pm25: number): number {
    // 简化的AQI计算公式
    if (pm25 <= 35) return (pm25 / 35) * 50;
    if (pm25 <= 75) return 50 + ((pm25 - 35) / 40) * 50;
    if (pm25 <= 115) return 100 + ((pm25 - 75) / 40) * 50;
    if (pm25 <= 150) return 150 + ((pm25 - 115) / 35) * 50;
    if (pm25 <= 250) return 200 + ((pm25 - 150) / 100) * 100;
    return 300 + ((pm25 - 250) / 100) * 200;
  }

  // 获取空气质量等级
  private getAirQualityLevel(aqi: number): 'good' | 'fair' | 'poor' {
    if (aqi <= 50) return 'good';
    if (aqi <= 100) return 'good';
    if (aqi <= 150) return 'fair';
    return 'poor';
  }

  // 生成PM2.5分布图
  async generatePM25Distribution(): Promise<void> {
    const bounds: GeoBounds = {
      west: 116.35,
      south: 39.88,
      east: 116.45,
      north: 39.93
    };

    // 获取最新监测数据
    const latestData = await this.monitor.getLatestData(bounds);
    const points = latestData.map(d => ({
      x: d.location.longitude,
      y: d.location.latitude,
      value: d.measurements.pm25
    }));

    // IDW插值
    const grid = this.interpolator.generateGrid(
      points,
      bounds,
      0.001, // 约100m分辨率
      2      // 幂参数
    );

    // 生成等值线
    const contours = this.contourGen.generateContours(grid.grid.values, [
      35, 75, 115, 150, 250
    ]);

    // 可视化
    const colorScale = HeatmapVisualizer.createColorScale(
      0,
      300,
      [
        { value: 0, color: '#00e400' },    // 优
        { value: 0.17, color: '#ffff00' },  // 良
        { value: 0.33, color: '#ff7e00' },  // 轻度污染
        { value: 0.5, color: '#ff0000' },   // 中度污染
        { value: 0.67, color: '#99004c' },  // 重度污染
        { value: 0.83, color: '#7e0023' },  // 严重污染
        { value: 1, color: '#7e0023' }
      ]
    );

    this.visualizer.renderHeatmap(grid.grid.values, bounds, colorScale);

    // 叠加等值线
    this.visualizer.drawContours(contours, bounds);

    // 叠加监测站点
    await this.visualizer.drawStations(latestData);
  }

  // 时间序列回放
  async playTimeSeriesAnimation(
    startTime: number,
    endTime: number,
    interval: number = 3600000 // 1小时
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

  // 污染源追踪
  async trackPollutionSource(
    targetAQI: number = 150
  ): Promise<Array<{ location: [number, number]; probability: number }>> {
    const latestData = await this.monitor.getLatestData();

    // 找出高污染站点
    const highPollutionStations = latestData.filter(
      d => d.measurements.aqi >= targetAQI
    );

    if (highPollutionStations.length === 0) {
      return [];
    }

    // 使用反距离加权推算可能的污染源
    const sources: Array<{ location: [number, number]; probability: number }> = [];

    for (const station of highPollutionStations) {
      // 简化实现：假设污染源在下风向
      // 实际应用需要结合风向、风速等气象数据
      const windDirection = await this.getWindDirection(station.location);
      const sourceDistance = 1000; // 假设污染源在1km处

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
    // 简化实现：返回随机风向
    // 实际应用应从气象API获取
    return Math.random() * Math.PI * 2;
  }

  // 导出数据
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

## 技术要点

### 1. 时空索引优化

WebGeoDB 使用 R-tree + 时间轴的复合索引结构：

```typescript
// 时空索引结构示意
interface SpatiotemporalIndex {
  // 空间维度：R-tree
  spatial: RTree; // 2D空间索引

  // 时间维度：B+树
  temporal: BPlusTree; // 1D时间索引

  // 复合查询
  query(spatialBounds, timeRange): Result[] {
    // 1. 空间过滤
    const spatialCandidates = this.spatial.search(spatialBounds);

    // 2. 时间过滤
    const results = spatialCandidates.filter(pt =>
      this.temporal.search(pt.id, timeRange)
    );

    return results;
  }
}
```

### 2. 数据压缩策略

时间序列数据采用增量编码和位压缩：

```typescript
class TimeSeriesCompressor {
  // 增量编码
  compressDelta(values: number[]): ArrayBuffer {
    const deltas = [];
    let prev = 0;

    for (const value of values) {
      deltas.push(value - prev);
      prev = value;
    }

    return new Int16Array(deltas).buffer;
  }

  // Gorilla压缩（简化的Facebook Gorilla算法）
  compressGorilla(values: number[]): ArrayBuffer {
    const bits = [];

    // 存储第一个值（64位）
    this.writeBits(bits, values[0], 64);

    let prevValue = values[0];
    let prevDelta = 0;

    for (let i = 1; i < values.length; i++) {
      const delta = values[i] - prevValue;
      const deltaOfDelta = delta - prevDelta;

      // 根据deltaOfDelta的大小选择编码方式
      if (deltaOfDelta === 0) {
        this.writeBit(bits, 0); // 1 bit
      } else if (deltaOfDelta >= -63 && deltaOfDelta <= 63) {
        this.writeBit(bits, 1); // 1 bit
        this.writeBit(bits, 0); // 1 bit
        this.writeBits(bits, deltaOfDelta + 64, 7); // 7 bits
      } else {
        this.writeBit(bits, 1); // 1 bit
        this.writeBit(bits, 1); // 1 bit
        this.writeBits(bits, delta, 32); // 32 bits
      }

      prevValue = values[i];
      prevDelta = delta;
    }

    return this.bitsToBytes(bits);
  }
}
```

### 3. 插值算法性能优化

```typescript
class OptimizedIDWInterpolator extends IDWInterpolator {
  // 使用KD树加速邻近点查找
  private kdtree: KDTree;

  buildIndex(points: Array<{ x: number; y: number; value: number }>): void {
    this.kdtree = new KDTree(points.map(p => [p.x, p.y]));
  }

  // 优化后的插值：只考虑最近的K个点
  interpolateOptimized(
    targetPoint: { x: number; y: number },
    k: number = 12
  ): number {
    // 使用KD树快速查找最近点
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

## 扩展功能

### 1. 实时预警系统

```typescript
class AlertSystem {
  // 设置预警阈值
  async setupAlerts(
    metric: string,
    thresholds: {
      warning: number;
      critical: number;
    }
  ): Promise<void> {
    // 监听新数据事件
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
    // 发送紧急通知
    await this.notificationService.send({
      level: 'critical',
      title: '严重污染预警',
      message: `站点 ${data.stationId} 的 ${metric} 值为 ${value}，超过严重阈值`,
      actions: [
        { label: '查看详情', action: 'view_details' },
        { label: '启动应急预案', action: 'emergency_plan' }
      ]
    });
  }

  private async sendWarningAlert(
    data: MonitoringData,
    metric: string,
    value: number
  ): Promise<void> {
    // 发送警告通知
    await this.notificationService.send({
      level: 'warning',
      title: '污染预警',
      message: `站点 ${data.stationId} 的 ${metric} 值为 ${value}，超过警告阈值`
    });
  }
}
```

### 2. 趋势预测

```typescript
class TrendPredictor {
  // 移动平均预测
  async predictMovingAverage(
    stationId: string,
    metric: string,
    windowSize: number = 24,
    forecastSteps: number = 6
  ): Promise<Array<{ timestamp: number; predicted: number; confidence: number }>> {
    // 获取历史数据
    const historicalData = await this.queryService.queryByStation(
      stationId,
      Date.now() - windowSize * 3600000,
      Date.now()
    );

    const values = historicalData.map(d => d.measurements[metric]);

    // 计算移动平均
    const ma = this.calculateMovingAverage(values, windowSize);

    // 预测未来值
    const predictions = [];
    for (let i = 1; i <= forecastSteps; i++) {
      const predicted = ma[ma.length - 1];

      // 计算置信区间（基于历史波动）
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

  private calculateMovingAverage(values: number[], window: number): number[] {
    const result = [];

    for (let i = window - 1; i < values.length; i++) {
      const sum = values.slice(i - window + 1, i + 1)
        .reduce((a, b) => a + b, 0);
      result.push(sum / window);
    }

    return result;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }
}
```

### 3. 数据质量评估

```typescript
class DataQualityAssessor {
  // 评估数据质量
  async assessQuality(stationId: string): Promise<{
    completeness: number;
    consistency: number;
    validity: number;
    overall: number;
    issues: string[];
  }> {
    const data = await this.queryService.queryByStation(
      stationId,
      Date.now() - 86400000 * 7, // 最近7天
      Date.now()
    );

    const issues = [];

    // 1. 完整性检查
    const expectedPoints = 7 * 24 * 60; // 假设每分钟一个数据点
    const completeness = data.length / expectedPoints;

    if (completeness < 0.9) {
      issues.push(`数据完整率仅为 ${(completeness * 100).toFixed(1)}%，低于90%`);
    }

    // 2. 一致性检查
    const consistency = this.checkConsistency(data);

    // 3. 有效性检查
    const validity = this.checkValidity(data);

    // 4. 计算总体质量
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
    // 检查数据是否存在异常跳变
    let issues = 0;

    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];

      for (const metric in curr.measurements) {
        const change = Math.abs(
          (curr.measurements[metric] - prev.measurements[metric]) /
          prev.measurements[metric]
        );

        // 超过50%的变化视为异常
        if (change > 0.5) {
          issues++;
          break;
        }
      }
    }

    return 1 - (issues / data.length);
  }

  private checkValidity(data: MonitoringData[]): number {
    // 检查数据是否在合理范围内
    let valid = 0;

    for (const d of data) {
      const { pm25, pm10 } = d.measurements;

      // PM2.5合理范围：0-500 μg/m³
      const pm25Valid = pm25 >= 0 && pm25 <= 500;

      // PM10合理范围：0-600 μg/m³
      const pm10Valid = pm10 >= 0 && pm10 <= 600;

      // PM10应该大于PM2.5
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

## 部署建议

### 1. 性能优化

```typescript
// 数据分区策略
class PartitionStrategy {
  // 按时间分区
  async partitionByTime(data: MonitoringData): Promise<string> {
    const date = new Date(data.timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    return `monitoring_data_${year}_${month}`;
  }

  // 按空间分区
  async partitionBySpace(
    data: MonitoringData,
    gridSize: number = 0.1 // 约10km
  ): Promise<string> {
    const lat = data.location.latitude;
    const lon = data.location.longitude;

    const latZone = Math.floor(lat / gridSize);
    const lonZone = Math.floor(lon / gridSize);

    return `monitoring_data_${latZone}_${lonZone}`;
  }
}
```

### 2. 缓存策略

```typescript
class CacheManager {
  private cache: Map<string, { data: any; expiry: number }>;

  // 缓存插值结果
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
    ttl: number = 3600000 // 1小时
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

## 总结

环境监测数据平台展示了 WebGeoDB 在以下方面的能力：

### 核心优势

- ✅ **高效的时空数据管理**: R-tree + 时间轴索引实现快速查询
- ✅ **强大的空间分析**: 支持多种插值算法和等值线生成
- ✅ **灵活的可视化**: 动态热力图、时间序列动画
- ✅ **完善的数据质量保证**: 完整性、一致性、有效性检查
- ✅ **实时预警机制**: 智能阈值告警和污染源追踪

### 应用价值

- **环境保护**: 实时监测、预警预报、污染治理
- **公众健康**: 空气质量指数发布、健康建议
- **科学研究**: 气候变化、环境演化分析
- **政策制定**: 数据驱动的环保政策决策

### 下一步

- 查看完整示例代码: `/examples/projects/environmental-monitoring/`
- 学习其他专题应用:
  - **智慧城市基础设施管理**: 城市资产管理
  - **物流配送优化系统**: 路径规划和调度
  - **电商地理围栏营销**: 位置驱动的营销
  - **社交地理信息分享**: 基于位置的社交
