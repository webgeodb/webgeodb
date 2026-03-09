/**
 * Phase 3 功能验证脚本
 *
 * 验证优化缓冲和优化距离查询功能
 */

import { TurfEngine } from '../src/spatial/engines/turf-engine';
import { OptimizedBuffer } from '../src/spatial/topology/optimized-buffer';
import { OptimizedDistance } from '../src/spatial/topology/optimized-distance';
import type { Point, Polygon, LineString } from '../src/types';

// 创建测试引擎
const engine = new TurfEngine();

console.log('🚀 开始验证 Phase 3 功能...\n');

// 测试数据
const point1: Point = { type: 'Point', coordinates: [0, 0] };
const point2: Point = { type: 'Point', coordinates: [1, 1] };
const polygon1: Polygon = {
  type: 'Polygon',
  coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
};

// ==================== 测试 1: 优化缓冲 ====================
console.log('📦 测试 1: 优化缓冲功能');

try {
  const buffer = new OptimizedBuffer(engine);

  // 测试近似缓冲
  const approximateResult = buffer.buffer(point1, 50, 'approximate');
  console.log('✅ 近似缓冲成功');
  console.log(`   策略: ${approximateResult.strategy}`);
  console.log(`   执行时间: ${approximateResult.executionTime.toFixed(2)}μs`);
  console.log(`   精度: ${approximateResult.precision}`);

  // 测试圆形逼近
  const circularResult = buffer.buffer(point1, 200, 'balanced');
  console.log('✅ 圆形逼近成功');
  console.log(`   策略: ${circularResult.strategy}`);
  console.log(`   执行时间: ${circularResult.executionTime.toFixed(2)}μs`);

  // 测试精确缓冲
  const exactResult = buffer.buffer(point1, 1000, 'exact');
  console.log('✅ 精确缓冲成功');
  console.log(`   策略: ${exactResult.strategy}`);
  console.log(`   执行时间: ${exactResult.executionTime.toFixed(2)}μs`);

  // 测试自适应缓冲
  const adaptiveResult = buffer.buffer(point1, 100);
  console.log('✅ 自适应缓冲成功');
  console.log(`   策略: ${adaptiveResult.strategy}`);

} catch (error) {
  console.error('❌ 优化缓冲测试失败:', error);
}

// ==================== 测试 2: 优化距离 ====================
console.log('\n📏 测试 2: 优化距离功能');

try {
  const distanceCalc = new OptimizedDistance(engine);

  // 测试欧氏距离
  const euclideanResult = distanceCalc.distance(point1, point2, 'euclidean');
  console.log('✅ 欧氏距离成功');
  console.log(`   距离: ${euclideanResult.distance.toFixed(2)}m`);
  console.log(`   策略: ${euclideanResult.strategy}`);
  console.log(`   执行时间: ${euclideanResult.executionTime.toFixed(2)}μs`);

  // 测试球面距离
  const haversineResult = distanceCalc.distance(point1, point2, 'haversine');
  console.log('✅ 球面距离成功');
  console.log(`   距离: ${haversineResult.distance.toFixed(2)}m`);
  console.log(`   策略: ${haversineResult.strategy}`);

  // 测试快速估算
  const fastResult = distanceCalc.distance(point1, point2, 'fast-estimate');
  console.log('✅ 快速估算成功');
  console.log(`   距离: ${fastResult.distance.toFixed(2)}m`);
  console.log(`   策略: ${fastResult.strategy}`);

} catch (error) {
  console.error('❌ 优化距离测试失败:', error);
}

// ==================== 测试 3: 性能对比 ====================
console.log('\n⚡ 测试 3: 性能对比');

try {
  const iterations = 1000;
  const buffer = new OptimizedBuffer(engine);

  // 测试缓冲性能
  const startTime1 = performance.now();
  for (let i = 0; i < iterations; i++) {
    buffer.buffer(point1, 100, 'approximate');
  }
  const endTime1 = performance.now();
  const optimizedTime = endTime1 - startTime1;

  const startTime2 = performance.now();
  for (let i = 0; i < iterations; i++) {
    engine.buffer(point1, 100, 'meters');
  }
  const endTime2 = performance.now();
  const engineTime = endTime2 - startTime2;

  console.log(`✅ 性能对比 (${iterations}次迭代)`);
  console.log(`   优化版本: ${optimizedTime.toFixed(2)}ms`);
  console.log(`   引擎版本: ${engineTime.toFixed(2)}ms`);
  console.log(`   性能提升: ${(engineTime / optimizedTime).toFixed(2)}x`);

} catch (error) {
  console.error('❌ 性能对比测试失败:', error);
}

// ==================== 测试 4: 批量操作 ====================
console.log('\n📊 测试 4: 批量操作');

try {
  // 创建测试点集
  const points: Point[] = Array.from({ length: 100 }, (_, i) => ({
    type: 'Point',
    coordinates: [Math.random() * 10, Math.random() * 10]
  }));

  const distanceCalc = new OptimizedDistance(engine);

  // 批量距离计算
  const startTime = performance.now();
  const results = distanceCalc.batchDistance(point1, points, 'euclidean');
  const endTime = performance.now();

  console.log(`✅ 批量距离计算成功`);
  console.log(`   处理点数: ${points.length}`);
  console.log(`   总耗时: ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`   平均耗时: ${((endTime - startTime) / points.length).toFixed(3)}ms/点`);

} catch (error) {
  console.error('❌ 批量操作测试失败:', error);
}

// ==================== 测试 5: 策略配置 ====================
console.log('\n⚙️  测试 5: 策略配置');

try {
  const buffer = new OptimizedBuffer(engine, {
    precision: 'balanced',
    useCircularApproximation: true,
    approximateThreshold: 200,
    circleSegments: 32
  });

  const config = buffer.getConfig();
  console.log('✅ 配置管理成功');
  console.log(`   精度: ${config.precision}`);
  console.log(`   圆形逼近: ${config.useCircularApproximation}`);
  console.log(`   近似阈值: ${config.approximateThreshold}m`);
  console.log(`   圆形分段: ${config.circleSegments}`);

  // 测试配置更新
  buffer.updateConfig({ precision: 'exact' });
  const newConfig = buffer.getConfig();
  console.log('✅ 配置更新成功');
  console.log(`   新精度: ${newConfig.precision}`);

} catch (error) {
  console.error('❌ 策略配置测试失败:', error);
}

console.log('\n✨ Phase 3 功能验证完成！');
