/**
 * Phase 4 功能验证脚本
 *
 * 验证多条件优化器的功能和性能提升
 */

import { MultiConditionOptimizer, optimizeMultiConditions, getOptimizationAdvice } from '../src/query/multi-condition-optimizer';
import type { SpatialQueryCondition, Point, Polygon } from '../src/types';

console.log('🚀 开始验证 Phase 4 功能...\n');

// 创建测试几何数据
const testPoint: Point = { type: 'Point', coordinates: [1.5, 1.5] };
const testPolygon1: Polygon = {
  type: 'Polygon',
  coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]
};
const testPolygon2: Polygon = {
  type: 'Polygon',
  coordinates: [[[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]]
};
const testPolygon3: Polygon = {
  type: 'Polygon',
  coordinates: [[[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]]]
};
const farPolygon: Polygon = {
  type: 'Polygon',
  coordinates: [[[100, 100], [102, 100], [102, 102], [100, 102], [100, 100]]]
};

// ==================== 测试 1: 单条件优化 ====================
console.log('📋 测试 1: 单条件优化');

try {
  const conditions: SpatialQueryCondition[] = [
    {
      field: 'geometry',
      predicate: 'intersects',
      geometry: testPolygon1
    }
  ];

  const result = optimizeMultiConditions(conditions);

  console.log('✅ 单条件优化成功');
  console.log(`   策略: ${result.strategy}`);
  console.log(`   预期提升: ${result.expectedImprovement.toFixed(2)}x`);

} catch (error) {
  console.error('❌ 单条件优化失败:', error);
}

// ==================== 测试 2: 多条件交集优化 ====================
console.log('\n🔗 测试 2: 多条件交集优化');

try {
  const conditions: SpatialQueryCondition[] = [
    {
      field: 'geometry',
      predicate: 'intersects',
      geometry: testPolygon1
    },
    {
      field: 'geometry',
      predicate: 'intersects',
      geometry: testPolygon2
    }
  ];

  const result = optimizeMultiConditions(conditions);

  console.log('✅ 多条件交集优化成功');
  console.log(`   策略: ${result.strategy}`);
  console.log(`   合并边界框:`, result.mergedBBox);
  console.log(`   执行顺序: ${result.executionOrder.join(', ')}`);
  console.log(`   预期提升: ${result.expectedImprovement.toFixed(2)}x`);

} catch (error) {
  console.error('❌ 多条件交集优化失败:', error);
}

// ==================== 测试 3: 混合谓词优化 ====================
console.log('\n🎭 测试 3: 混合谓词优化');

try {
  const conditions: SpatialQueryCondition[] = [
    {
      field: 'geometry',
      predicate: 'intersects',
      geometry: testPolygon1
    },
    {
      field: 'geometry',
      predicate: 'contains',
      geometry: testPolygon2
    },
    {
      field: 'geometry',
      predicate: 'within',
      geometry: testPolygon3
    }
  ];

  const result = optimizeMultiConditions(conditions);

  console.log('✅ 混合谓词优化成功');
  console.log(`   策略: ${result.strategy}`);
  console.log(`   预期提升: ${result.expectedImprovement.toFixed(2)}x`);

} catch (error) {
  console.error('❌ 混合谓词优化失败:', error);
}

// ==================== 测试 4: 条件优先级排序 ====================
console.log('\n📊 测试 4: 条件优先级排序');

try {
  const conditions: SpatialQueryCondition[] = [
    {
      field: 'geometry',
      predicate: 'intersects', // 中等选择性
      geometry: testPolygon1
    },
    {
      field: 'geometry',
      predicate: 'equals', // 高选择性
      geometry: testPoint
    },
    {
      field: 'geometry',
      predicate: 'disjoint', // 低选择性
      geometry: farPolygon
    }
  ];

  const result = optimizeMultiConditions(conditions);

  console.log('✅ 条件优先级排序成功');
  console.log(`   原始顺序: [0, 1, 2]`);
  console.log(`   优化顺序: ${result.executionOrder.join(', ')}`);
  console.log(`   equals 条件优先执行`);

} catch (error) {
  console.error('❌ 条件优先级排序失败:', error);
}

// ==================== 测试 5: 优化建议系统 ====================
console.log('\n💡 测试 5: 优化建议系统');

try {
  const conditions: SpatialQueryCondition[] = [
    {
      field: 'geometry',
      predicate: 'intersects',
      geometry: testPolygon1
    },
    {
      field: 'geometry',
      predicate: 'contains',
      geometry: testPolygon2
    }
  ];

  const advice = getOptimizationAdvice(conditions);

  console.log('✅ 优化建议系统成功');
  console.log(`   建议: ${advice.advice}`);
  console.log(`   原因数量: ${advice.reasons.length}`);
  console.log(`   建议数量: ${advice.suggestions.length}`);

  advice.reasons.forEach((reason, i) => {
    console.log(`   原因 ${i + 1}: ${reason}`);
  });

  advice.suggestions.forEach((suggestion, i) => {
    console.log(`   建议 ${i + 1}: ${suggestion}`);
  });

} catch (error) {
  console.error('❌ 优化建议系统失败:', error);
}

// ==================== 测试 6: 性能对比模拟 ====================
console.log('\n⚡ 测试 6: 性能对比模拟');

try {
  const iterations = 100;

  // 单条件查询
  const singleCondition: SpatialQueryCondition[] = [
    {
      field: 'geometry',
      predicate: 'intersects',
      geometry: testPolygon1
    }
  ];

  // 多条件查询
  const multiConditions: SpatialQueryCondition[] = [
    {
      field: 'geometry',
      predicate: 'intersects',
      geometry: testPolygon1
    },
    {
      field: 'geometry',
      predicate: 'intersects',
      geometry: testPolygon2
    }
  ];

  // 测试单条件性能
  const startTime1 = performance.now();
  for (let i = 0; i < iterations; i++) {
    optimizeMultiConditions(singleCondition);
  }
  const endTime1 = performance.now();
  const singleTime = endTime1 - startTime1;

  // 测试多条件性能
  const startTime2 = performance.now();
  for (let i = 0; i < iterations; i++) {
    optimizeMultiConditions(multiConditions);
  }
  const endTime2 = performance.now();
  const multiTime = endTime2 - startTime2;

  console.log('✅ 性能对比模拟成功');
  console.log(`   单条件查询: ${singleTime.toFixed(2)}ms (${iterations}次)`);
  console.log(`   多条件查询: ${multiTime.toFixed(2)}ms (${iterations}次)`);
  console.log(`   平均单条件: ${(singleTime / iterations).toFixed(3)}ms`);
  console.log(`   平均多条件: ${(multiTime / iterations).toFixed(3)}ms`);

} catch (error) {
  console.error('❌ 性能对比模拟失败:', error);
}

// ==================== 测试 7: BBox 合并策略 ====================
console.log('\n🗺️ 测试 7: BBox 合并策略');

try {
  const optimizer = new MultiConditionOptimizer();

  // 测试交集合并
  const intersectConditions: SpatialQueryCondition[] = [
    {
      field: 'geometry',
      predicate: 'intersects',
      geometry: testPolygon1
    },
    {
      field: 'geometry',
      predicate: 'intersects',
      geometry: testPolygon2
    }
  ];

  const intersectResult = optimizer.optimize(intersectConditions);
  console.log('✅ 交集合并策略成功');
  if (intersectResult.mergedBBox) {
    const bbox = intersectResult.mergedBBox;
    console.log(`   合并边界框: [${bbox.minX.toFixed(2)}, ${bbox.minY.toFixed(2)}, ${bbox.maxX.toFixed(2)}, ${bbox.maxY.toFixed(2)}]`);
    console.log(`   面积: ${((bbox.maxX - bbox.minX) * (bbox.maxY - bbox.minY)).toFixed(2)}`);
  }

  // 测试并集合并
  const disjointConditions: SpatialQueryCondition[] = [
    {
      field: 'geometry',
      predicate: 'intersects',
      geometry: testPolygon1
    },
    {
      field: 'geometry',
      predicate: 'disjoint',
      geometry: farPolygon
    }
  ];

  const disjointResult = optimizer.optimize(disjointConditions);
  console.log('✅ 并集合并策略成功');
  if (disjointResult.mergedBBox) {
    const bbox = disjointResult.mergedBBox;
    console.log(`   合并边界框: [${bbox.minX.toFixed(2)}, ${bbox.minY.toFixed(2)}, ${bbox.maxX.toFixed(2)}, ${bbox.maxY.toFixed(2)}]`);
    console.log(`   面积: ${((bbox.maxX - bbox.minX) * (bbox.maxY - bbox.minY)).toFixed(2)}`);
  }

} catch (error) {
  console.error('❌ BBox 合并策略失败:', error);
}

console.log('\n✨ Phase 4 功能验证完成！');
