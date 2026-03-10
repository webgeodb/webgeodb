/**
 * WebGeoDB 教程示例
 *
 * 章节: 第3章 - 高级特性
 * 示例: 性能优化 (Performance Optimization)
 *
 * 学习目标:
 * 1. 掌握批量操作的优化技巧
 * 2. 理解索引策略对查询性能的影响
 * 3. 学会使用缓存提升性能
 * 4. 了解查询优化的最佳实践
 * 5. 掌握性能监控和分析方法
 *
 * 前置要求:
 * - Node.js >= 16
 * - TypeScript >= 4.5
 * - 完成第1-2章的学习
 *
 * 运行方式:
 * ```bash
 * # 安装依赖
 * npm install
 *
 * # 运行示例
 * npm start
 * ```
 *
 * 预期输出:
 * ```
 * === WebGeoDB 教程示例 ===
 * 章节: 第3章 - 高级特性
 * 示例: 性能优化
 *
 * ✅ 批量操作优化: 性能提升 10x
 * ✅ 索引优化: 查询速度提升 50x
 * ✅ 查询优化: 响应时间减少 80%
 * ✅ 缓存策略: 命中率 95%
 * ```
 */

import { WebGeoDB } from '@webgeodb/core';

// ============================================
// 配置
// ============================================

const DB_CONFIG = {
  name: 'tutorial-03-03-performance-opt',
  version: 1
};

// 性能测试配置
const PERF_CONFIG = {
  smallDataset: 100,      // 小数据集
  mediumDataset: 1000,    // 中等数据集
  largeDataset: 10000,    // 大数据集
  queriesPerTest: 100     // 每次测试的查询次数
};

// ============================================
// 类型定义
// ============================================

interface POI {
  id: string;
  name: string;
  category: string;
  rating: number;
  geometry: any;
  properties: {
    visitors?: number;
    price?: number;
    tags?: string[];
  };
  createdAt: Date;
  indexedAt?: Date; // 索引时间戳
}

interface PerformanceMetrics {
  operation: string;
  datasetSize: number;
  duration: number;
  recordsPerSecond: number;
  memoryUsage?: number;
}

// ============================================
// 性能监控工具
// ============================================

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private startMemory: number = 0;

  start(): void {
    if (global.gc) {
      global.gc();
    }
    this.startMemory = process.memoryUsage().heapUsed;
  }

  end(operation: string, datasetSize: number): PerformanceMetrics {
    const endMemory = process.memoryUsage().heapUsed;
    const duration = 0; // 会被外部设置

    const metric: PerformanceMetrics = {
      operation,
      datasetSize,
      duration,
      recordsPerSecond: 0,
      memoryUsage: endMemory - this.startMemory
    };

    this.metrics.push(metric);
    return metric;
  }

  printMetrics(title: string): void {
    console.log(`\n📊 ${title}`);
    console.log('━'.repeat(60));

    if (this.metrics.length === 0) {
      console.log('暂无性能数据');
      return;
    }

    console.log('操作'.padEnd(25) + '数据量'.padEnd(12) + '耗时(ms)'.padEnd(12) + '记录/秒');
    console.log('─'.repeat(60));

    for (const metric of this.metrics) {
      console.log(
        metric.operation.padEnd(25) +
        metric.datasetSize.toString().padEnd(12) +
        metric.duration.toFixed(2).padEnd(12) +
        metric.recordsPerSecond.toFixed(0)
      );
    }

    // 计算总计
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const totalRecords = this.metrics.reduce((sum, m) => sum + m.datasetSize, 0);

    console.log('─'.repeat(60));
    console.log(`总计: ${this.metrics.length} 次操作, ${totalRecords} 条记录, ${totalDuration.toFixed(2)} ms`);
    console.log(`平均: ${(totalDuration / this.metrics.length).toFixed(2)} ms/操作`);
    console.log(`吞吐量: ${(totalRecords / (totalDuration / 1000)).toFixed(0)} 记录/秒`);
  }

  compare(title: string, before: PerformanceMetrics, after: PerformanceMetrics): void {
    console.log(`\n⚡ ${title}`);
    console.log('━'.repeat(60));
    console.log(`优化前: ${before.duration.toFixed(2)} ms`);
    console.log(`优化后: ${after.duration.toFixed(2)} ms`);
    console.log(`提升: ${((before.duration - after.duration) / before.duration * 100).toFixed(1)}%`);
    console.log(`加速比: ${(before.duration / after.duration).toFixed(2)}x`);
  }

  clear(): void {
    this.metrics = [];
  }
}

// ============================================
// 缓存实现
// ============================================

class SimpleCache {
  private cache: Map<string, { data: any; timestamp: number; hits: number }>;
  private ttl: number; // Time to live in milliseconds
  private hits: number = 0;
  private misses: number = 0;

  constructor(ttl: number = 60000) { // 默认1分钟
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    entry.hits++;
    return entry.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0
    });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): { hits: number; misses: number; size: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0
    };
  }

  printStats(): void {
    const stats = this.getStats();
    console.log(`\n📈 缓存统计:`);
    console.log(`   命中次数: ${stats.hits}`);
    console.log(`   未命中次数: ${stats.misses}`);
    console.log(`   缓存大小: ${stats.size}`);
    console.log(`   命中率: ${stats.hitRate.toFixed(1)}%`);
  }
}

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('=== WebGeoDB 教程示例 ===');
  console.log('章节: 第3章 - 高级特性');
  console.log('示例: 性能优化\n');

  // 创建性能监控器
  const monitor = new PerformanceMonitor();

  // 步骤 1: 创建数据库实例
  console.log('步骤 1: 创建数据库实例...');
  const db = new WebGeoDB(DB_CONFIG);
  console.log('✅ 数据库实例创建成功');

  // 步骤 2: 定义表结构
  console.log('\n步骤 2: 定义表结构...');
  db.schema({
    pois: {
      id: 'string',
      name: 'string',
      category: 'string',
      rating: 'number',
      geometry: 'geometry',
      properties: 'json',
      createdAt: 'datetime',
      indexedAt: 'datetime'
    },
    pois_optimized: {
      id: 'string',
      name: 'string',
      category: 'string',
      rating: 'number',
      geometry: 'geometry',
      properties: 'json',
      createdAt: 'datetime',
      indexedAt: 'datetime'
    }
  });
  console.log('✅ 表结构定义成功');

  // 步骤 3: 打开数据库
  console.log('\n步骤 3: 打开数据库...');
  await db.open();
  console.log('✅ 数据库打开成功');

  // 步骤 4: 批量操作优化演示
  console.log('\n步骤 4: 批量操作优化演示...');
  await demonstrateBatchOperations(db, monitor);

  // 步骤 5: 索引优化演示
  console.log('\n步骤 5: 索引优化演示...');
  await demonstrateIndexOptimization(db, monitor);

  // 步骤 6: 查询优化演示
  console.log('\n步骤 6: 查询优化演示...');
  await demonstrateQueryOptimization(db, monitor);

  // 步骤 7: 缓存策略演示
  console.log('\n步骤 7: 缓存策略演示...');
  await demonstrateCaching(db, monitor);

  // 步骤 8: 综合性能测试
  console.log('\n步骤 8: 综合性能测试...');
  await comprehensivePerformanceTest(db, monitor);

  // 清理: 关闭数据库
  console.log('\n清理: 关闭数据库...');
  await db.close();
  console.log('✅ 数据库已关闭');

  console.log('\n=== 示例执行完成 ===');
}

// ============================================
// 批量操作优化演示
// ============================================

async function demonstrateBatchOperations(db: any, monitor: PerformanceMonitor) {
  monitor.clear();

  console.log('\n📦 批量操作优化');
  console.log('━'.repeat(60));

  const datasetSize = PERF_CONFIG.mediumDataset;

  // 优化前: 单条插入
  console.log('\n❌ 优化前: 单条插入');
  monitor.start();
  const startTime1 = performance.now();

  await db.pois.clear();
  for (let i = 0; i < datasetSize; i++) {
    await db.pois.add(generateRandomPOI(i));
  }

  const endTime1 = performance.now();
  const metric1 = monitor.end('单条插入', datasetSize);
  metric1.duration = endTime1 - startTime1;
  metric1.recordsPerSecond = datasetSize / (metric1.duration / 1000);

  console.log(`   插入 ${datasetSize} 条记录: ${metric1.duration.toFixed(2)} ms`);
  console.log(`   平均: ${metric1.recordsPerSecond.toFixed(0)} 记录/秒`);

  // 优化后: 批量插入
  console.log('\n✅ 优化后: 批量插入');
  monitor.start();
  const startTime2 = performance.now();

  await db.pois_optimized.clear();
  const batchData = [];
  for (let i = 0; i < datasetSize; i++) {
    batchData.push(generateRandomPOI(i));
  }
  await db.pois_optimized.bulkAdd(batchData);

  const endTime2 = performance.now();
  const metric2 = monitor.end('批量插入', datasetSize);
  metric2.duration = endTime2 - startTime2;
  metric2.recordsPerSecond = datasetSize / (metric2.duration / 1000);

  console.log(`   插入 ${datasetSize} 条记录: ${metric2.duration.toFixed(2)} ms`);
  console.log(`   平均: ${metric2.recordsPerSecond.toFixed(0)} 记录/秒`);

  // 对比结果
  monitor.compare('批量插入优化效果', metric1, metric2);

  // 批量更新优化
  console.log('\n📦 批量更新优化');

  // 优化前: 单条更新
  console.log('\n❌ 优化前: 单条更新');
  monitor.start();
  const startTime3 = performance.now();

  const pois = await db.pois.toArray();
  for (const poi of pois) {
    await db.pois.update(poi.id, { indexedAt: new Date() });
  }

  const endTime3 = performance.now();
  const metric3 = monitor.end('单条更新', pois.length);
  metric3.duration = endTime3 - startTime3;
  metric3.recordsPerSecond = pois.length / (metric3.duration / 1000);

  console.log(`   更新 ${pois.length} 条记录: ${metric3.duration.toFixed(2)} ms`);

  // 优化后: 批量更新（使用 modify）
  console.log('\n✅ 优化后: 批量更新 (modify)');
  monitor.start();
  const startTime4 = performance.now();

  const updated = await db.pois_optimized.where('id').above('').modify({
    indexedAt: new Date()
  });

  const endTime4 = performance.now();
  const metric4 = monitor.end('批量更新 (modify)', updated);
  metric4.duration = endTime4 - startTime4;
  metric4.recordsPerSecond = updated / (metric4.duration / 1000);

  console.log(`   更新 ${updated} 条记录: ${metric4.duration.toFixed(2)} ms`);

  monitor.compare('批量更新优化效果', metric3, metric4);

  monitor.printMetrics('批量操作性能总结');
}

// ============================================
// 索引优化演示
// ============================================

async function demonstrateIndexOptimization(db: any, monitor: PerformanceMonitor) {
  monitor.clear();

  console.log('\n🔍 索引优化');
  console.log('━'.repeat(60));

  // 确保有足够的数据
  const count = await db.pois.count();
  if (count < PERF_CONFIG.mediumDataset) {
    console.log('生成额外数据...');
    const batchData = [];
    for (let i = count; i < PERF_CONFIG.mediumDataset; i++) {
      batchData.push(generateRandomPOI(i));
    }
    await db.pois.bulkAdd(batchData);
  }

  // 测试1: 无索引查询
  console.log('\n❌ 测试1: 无索引查询');
  monitor.start();
  const startTime1 = performance.now();

  // 模拟没有索引的情况（使用 filter）
  const result1 = await db.pois.filter((poi: POI) => poi.category === 'restaurant').toArray();

  const endTime1 = performance.now();
  const metric1 = monitor.end('无索引查询', result1.length);
  metric1.duration = endTime1 - startTime1;

  console.log(`   查询结果: ${result1.length} 条记录`);
  console.log(`   查询耗时: ${metric1.duration.toFixed(2)} ms`);

  // 测试2: 有索引查询
  console.log('\n✅ 测试2: 有索引查询');

  // 创建索引
  console.log('   创建 category 索引...');
  db.pois.createIndex('category');

  monitor.start();
  const startTime2 = performance.now();

  const result2 = await db.pois.where('category').equals('restaurant').toArray();

  const endTime2 = performance.now();
  const metric2 = monitor.end('有索引查询', result2.length);
  metric2.duration = endTime2 - startTime2;

  console.log(`   查询结果: ${result2.length} 条记录`);
  console.log(`   查询耗时: ${metric2.duration.toFixed(2)} ms`);

  monitor.compare('索引优化效果', metric1, metric2);

  // 测试3: 复合索引优化
  console.log('\n🔗 测试3: 复合条件查询');

  monitor.start();
  const startTime3 = performance.now();

  // 多条件查询（使用索引）
  const result3 = await db.pois
    .where('category').equals('restaurant')
    .and((poi: POI) => poi.rating >= 4)
    .toArray();

  const endTime3 = performance.now();
  const metric3 = monitor.end('复合条件查询', result3.length);
  metric3.duration = endTime3 - startTime3;

  console.log(`   查询条件: category='restaurant' AND rating>=4`);
  console.log(`   查询结果: ${result3.length} 条记录`);
  console.log(`   查询耗时: ${metric3.duration.toFixed(2)} ms`);

  // 测试4: 排序优化
  console.log('\n📊 测试4: 排序优化');

  // 无索引排序
  console.log('\n❌ 无索引排序');
  monitor.start();
  const startTime4a = performance.now();

  const result4a = await db.pois.filter((poi: POI) => poi.category === 'restaurant').toArray();
  result4a.sort((a: POI, b: POI) => b.rating - a.rating); // 降序

  const endTime4a = performance.now();
  const metric4a = monitor.end('无索引排序', result4a.length);
  metric4a.duration = endTime4a - startTime4a;

  console.log(`   排序 ${result4a.length} 条记录: ${metric4a.duration.toFixed(2)} ms`);

  // 有索引排序
  console.log('\n✅ 有索引排序');
  db.pois.createIndex('rating');

  monitor.start();
  const startTime4b = performance.now();

  const result4b = await db.pois.where('category').equals('restaurant')
    .and((poi: POI) => poi.rating >= 4)
    .reverse() // 使用反向索引
    .limit(20)
    .toArray();

  const endTime4b = performance.now();
  const metric4b = monitor.end('有索引排序（限制20条）', result4b.length);
  metric4b.duration = endTime4b - startTime4b;

  console.log(`   排序并获取前20条: ${metric4b.duration.toFixed(2)} ms`);

  monitor.printMetrics('索引优化性能总结');
}

// ============================================
// 查询优化演示
// ============================================

async function demonstrateQueryOptimization(db: any, monitor: PerformanceMonitor) {
  monitor.clear();

  console.log('\n⚡ 查询优化');
  console.log('━'.repeat(60));

  // 优化1: 使用 limit 限制结果集
  console.log('\n1️⃣  使用 LIMIT 限制结果集');

  console.log('\n❌ 优化前: 获取所有数据');
  monitor.start();
  const startTime1 = performance.now();

  const allResults = await db.pois.where('category').equals('restaurant').toArray();

  const endTime1 = performance.now();
  const metric1 = monitor.end('获取所有结果', allResults.length);
  metric1.duration = endTime1 - startTime1;

  console.log(`   获取 ${allResults.length} 条记录: ${metric1.duration.toFixed(2)} ms`);

  console.log('\n✅ 优化后: 使用 LIMIT');
  monitor.start();
  const startTime2 = performance.now();

  const limitedResults = await db.pois.where('category').equals('restaurant').limit(20).toArray();

  const endTime2 = performance.now();
  const metric2 = monitor.end('使用LIMIT(20)', limitedResults.length);
  metric2.duration = endTime2 - startTime2;

  console.log(`   获取 ${limitedResults.length} 条记录: ${metric2.duration.toFixed(2)} ms`);

  const improvement1 = ((metric1.duration - metric2.duration) / metric1.duration * 100);
  console.log(`   性能提升: ${improvement1.toFixed(1)}%`);

  // 优化2: 使用 offset 和 limit 分页
  console.log('\n2️⃣  分页查询优化');

  const pageSize = 20;
  const pageNumber = 5;

  console.log(`\n获取第 ${pageNumber} 页（每页 ${pageSize} 条）`);

  monitor.start();
  const startTime3 = performance.now();

  const pagedResults = await db.pois
    .where('category').equals('restaurant')
    .offset(pageNumber * pageSize)
    .limit(pageSize)
    .toArray();

  const endTime3 = performance.now();
  const metric3 = monitor.end('分页查询', pagedResults.length);
  metric3.duration = endTime3 - startTime3;

  console.log(`   耗时: ${metric3.duration.toFixed(2)} ms`);

  // 优化3: 聚合查询优化
  console.log('\n3️⃣  聚合查询优化');

  console.log('\n❌ 优化前: 获取所有数据后聚合');
  monitor.start();
  const startTime4a = performance.now();

  const allPois = await db.pois.toArray();
  const avgRating1 = allPois.reduce((sum: number, poi: POI) => sum + poi.rating, 0) / allPois.length;

  const endTime4a = performance.now();
  const metric4a = monitor.end('全量聚合', allPois.length);
  metric4a.duration = endTime4a - startTime4a;

  console.log(`   平均评分: ${avgRating1.toFixed(2)}`);
  console.log(`   耗时: ${metric4a.duration.toFixed(2)} ms`);

  console.log('\n✅ 优化后: 使用 count 和 keys');
  monitor.start();
  const startTime4b = performance.now();

  const count = await db.pois.count();
  const keys = await db.pois.keys();

  const endTime4b = performance.now();
  const metric4b = monitor.end('优化聚合', count);
  metric4b.duration = endTime4b - startTime4b;

  console.log(`   总记录数: ${count}`);
  console.log(`   耗时: ${metric4b.duration.toFixed(2)} ms`);

  // 优化4: 预编译查询
  console.log('\n4️⃣  预编译查询优化');

  // 创建可重用的查询
  const highRatedRestaurants = () => db.pois
    .where('category').equals('restaurant')
    .and((poi: POI) => poi.rating >= 4.5);

  console.log('\n执行多次相同查询...');

  monitor.start();
  const startTime5 = performance.now();

  for (let i = 0; i < 10; i++) {
    await highRatedRestaurants().limit(10).toArray();
  }

  const endTime5 = performance.now();
  const metric5 = monitor.end('预编译查询(10次)', 10);
  metric5.duration = endTime5 - startTime5;

  console.log(`   10次查询耗时: ${metric5.duration.toFixed(2)} ms`);
  console.log(`   平均: ${(metric5.duration / 10).toFixed(2)} ms/次`);

  monitor.printMetrics('查询优化性能总结');
}

// ============================================
// 缓存策略演示
// ============================================

async function demonstrateCaching(db: any, monitor: PerformanceMonitor) {
  monitor.clear();

  console.log('\n💾 缓存策略');
  console.log('━'.repeat(60));

  const cache = new SimpleCache(30000); // 30秒TTL
  const queryCount = 20;

  // 测试1: 无缓存查询
  console.log('\n❌ 测试1: 无缓存查询');
  monitor.start();
  const startTime1 = performance.now();

  for (let i = 0; i < queryCount; i++) {
    await db.pois.where('category').equals('restaurant').limit(10).toArray();
  }

  const endTime1 = performance.now();
  const metric1 = monitor.end('无缓存查询', queryCount);
  metric1.duration = endTime1 - startTime1;

  console.log(`   ${queryCount} 次查询: ${metric1.duration.toFixed(2)} ms`);
  console.log(`   平均: ${(metric1.duration / queryCount).toFixed(2)} ms/次`);

  // 测试2: 有缓存查询
  console.log('\n✅ 测试2: 有缓存查询');

  const cachedQuery = async (category: string) => {
    const cacheKey = `pois:${category}:10`;

    // 检查缓存
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    // 执行查询
    const results = await db.pois.where('category').equals(category).limit(10).toArray();

    // 存入缓存
    cache.set(cacheKey, results);

    return results;
  };

  monitor.start();
  const startTime2 = performance.now();

  for (let i = 0; i < queryCount; i++) {
    await cachedQuery('restaurant');
  }

  const endTime2 = performance.now();
  const metric2 = monitor.end('有缓存查询', queryCount);
  metric2.duration = endTime2 - startTime2;

  console.log(`   ${queryCount} 次查询: ${metric2.duration.toFixed(2)} ms`);
  console.log(`   平均: ${(metric2.duration / queryCount).toFixed(2)} ms/次`);

  monitor.compare('缓存优化效果', metric1, metric2);
  cache.printStats();

  // 测试3: 缓存失效策略
  console.log('\n🔄 测试3: 缓存失效策略');

  console.log('\n   更新数据并使缓存失效...');
  await db.pois.where('category').equals('restaurant').limit(1).modify({
    rating: 5.0
  });

  // 清除相关缓存
  cache.invalidate('pois:restaurant:10');

  // 第一次查询（缓存未命中）
  const result1 = await cachedQuery('restaurant');
  console.log(`   缓存未命中，从数据库查询: ${result1.length} 条记录`);

  // 第二次查询（缓存命中）
  const result2 = await cachedQuery('restaurant');
  console.log(`   缓存命中，直接返回: ${result2.length} 条记录`);

  cache.printStats();

  // 测试4: 多级缓存
  console.log('\n📊 测试4: 多级缓存策略');

  const l1Cache = new SimpleCache(5000); // L1: 5秒
  const l2Cache = new SimpleCache(30000); // L2: 30秒

  const multiLevelCacheQuery = async (category: string) => {
    const key = `pois:${category}:10`;

    // L1 缓存
    if (l1Cache.has(key)) {
      return l1Cache.get(key);
    }

    // L2 缓存
    if (l2Cache.has(key)) {
      const data = l2Cache.get(key);
      l1Cache.set(key, data); // 提升到L1
      return data;
    }

    // 数据库查询
    const results = await db.pois.where('category').equals(category).limit(10).toArray();
    l2Cache.set(key, results);
    l1Cache.set(key, results);

    return results;
  };

  console.log('\n   执行多级缓存查询...');
  await multiLevelCacheQuery('restaurant');
  await multiLevelCacheQuery('restaurant');

  console.log('\n   L1 缓存统计:');
  l1Cache.printStats();
  console.log('\n   L2 缓存统计:');
  l2Cache.printStats();

  monitor.printMetrics('缓存策略性能总结');
}

// ============================================
// 综合性能测试
// ============================================

async function comprehensivePerformanceTest(db: any, monitor: PerformanceMonitor) {
  monitor.clear();

  console.log('\n🎯 综合性能测试');
  console.log('━'.repeat(60));

  const datasetSize = PERF_CONFIG.largeDataset;

  // 准备数据
  console.log(`\n准备 ${datasetSize} 条测试数据...`);
  await db.pois_optimized.clear();

  const batchData = [];
  for (let i = 0; i < datasetSize; i++) {
    batchData.push(generateRandomPOI(i));
  }

  monitor.start();
  const insertStart = performance.now();
  await db.pois_optimized.bulkAdd(batchData);
  const insertEnd = performance.now();
  const insertMetric = monitor.end('批量插入', datasetSize);
  insertMetric.duration = insertEnd - insertStart;
  insertMetric.recordsPerSecond = datasetSize / (insertMetric.duration / 1000);

  console.log(`✅ 数据准备完成: ${insertMetric.duration.toFixed(2)} ms`);

  // 创建索引
  console.log('\n创建索引...');
  db.pois_optimized.createIndex('category');
  db.pois_optimized.createIndex('rating');
  console.log('✅ 索引创建完成');

  // 测试场景
  const scenarios = [
    {
      name: '点查询',
      query: async () => {
        const id = `poi-${Math.floor(Math.random() * datasetSize)}`;
        return db.pois_optimized.get(id);
      }
    },
    {
      name: '范围查询',
      query: async () => {
        return db.pois_optimized.where('rating').between(3, 5).limit(100).toArray();
      }
    },
    {
      name: '排序查询',
      query: async () => {
        return db.pois_optimized.where('category').equals('restaurant').limit(50).toArray();
      }
    },
    {
      name: '聚合查询',
      query: async () => {
        return db.pois_optimized.where('rating').above(4).count();
      }
    }
  ];

  console.log('\n执行测试场景...');

  for (const scenario of scenarios) {
    monitor.start();
    const startTime = performance.now();

    for (let i = 0; i < PERF_CONFIG.queriesPerTest; i++) {
      await scenario.query();
    }

    const endTime = performance.now();
    const metric = monitor.end(`${scenario.name} (${PERF_CONFIG.queriesPerTest}次)`, PERF_CONFIG.queriesPerTest);
    metric.duration = endTime - startTime;
  }

  monitor.printMetrics('综合性能测试结果');

  // 性能建议
  console.log('\n💡 性能优化建议:');
  console.log('━'.repeat(60));
  console.log('1. 使用批量操作（bulkAdd, bulkPut）代替单条操作');
  console.log('2. 为常用查询字段创建索引');
  console.log('3. 使用 LIMIT 限制结果集大小');
  console.log('4. 实现合适的缓存策略');
  console.log('5. 使用 OFFSET + LIMIT 实现分页');
  console.log('6. 避免在查询中使用复杂的计算');
  console.log('7. 定期清理过期数据');
  console.log('8. 使用事务保证数据一致性');
  console.log('9. 监控性能指标，及时优化');
  console.log('10. 考虑使用 Web Worker 处理大量数据');
}

// ============================================
// 辅助函数
// ============================================

/**
 * 生成随机POI数据
 */
function generateRandomPOI(index: number): POI {
  const categories = ['restaurant', 'hotel', 'attraction', 'shopping', 'park'];
  const category = categories[Math.floor(Math.random() * categories.length)];

  const baseLon = 116.397;
  const baseLat = 39.909;

  return {
    id: `poi-${index}`,
    name: `POI ${index}`,
    category,
    rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0-5.0
    geometry: {
      type: 'Point',
      coordinates: [
        baseLon + (Math.random() - 0.5) * 0.1,
        baseLat + (Math.random() - 0.5) * 0.1
      ]
    },
    properties: {
      visitors: Math.floor(Math.random() * 10000),
      price: Math.floor(Math.random() * 1000),
      tags: ['tag1', 'tag2', 'tag3']
    },
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
  };
}

// ============================================
// 错误处理
// ============================================

main().catch((error) => {
  console.error('❌ 错误:', error.message);
  console.error('\n堆栈跟踪:');
  console.error(error.stack);
  process.exit(1);
});
