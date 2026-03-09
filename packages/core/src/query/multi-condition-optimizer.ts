/**
 * 多条件查询优化器
 *
 * 智能合并多个空间条件的边界框查询，提升多条件查询性能
 * - BBox 合并策略
 * - 条件优先级排序
 * - 查询计划优化
 */

import type { Geometry, BBox } from '../types';
import { getBBox, bboxIntersects, bboxIntersection, bboxUnion } from '../utils';
import type { SpatialQueryCondition, SpatialPredicate } from '../types/database';

/**
 * 查询条件分析结果
 */
export interface ConditionAnalysis {
  /** 条件索引 */
  index: number;
  /** 空间条件 */
  condition: SpatialQueryCondition;
  /** 边界框 */
  bbox: BBox;
  /** 选择性评分 (0-1, 越低越选择性越强) */
  selectivity: number;
  /** 谓词类型 */
  predicate: SpatialPredicate;
  /** 预估过滤能力 */
  filteringPower: 'high' | 'medium' | 'low';
}

/**
 * 优化策略
 */
export interface OptimizationStrategy {
  /** 合并后的边界框 */
  mergedBBox: BBox | null;
  /** 条件执行顺序 */
  executionOrder: number[];
  /** 优化类型 */
  strategy: 'intersection-merge' | 'union-merge' | 'hybrid-merge' | 'single-condition';
  /** 预期性能提升 */
  expectedImprovement: number;
}

/**
 * 多条件查询优化器
 */
export class MultiConditionOptimizer {
  /**
   * 优化多个空间条件的查询
   * @param conditions - 空间查询条件数组
   */
  optimize(conditions: SpatialQueryCondition[]): OptimizationStrategy {
    if (conditions.length === 0) {
      return {
        mergedBBox: null,
        executionOrder: [],
        strategy: 'single-condition',
        expectedImprovement: 0
      };
    }

    if (conditions.length === 1) {
      const bbox = getBBox(conditions[0].geometry);
      return {
        mergedBBox: bbox,
        executionOrder: [0],
        strategy: 'single-condition',
        expectedImprovement: 0
      };
    }

    // 分析所有条件
    const analyses = this.analyzeConditions(conditions);

    // 确定优化策略
    const strategy = this.determineStrategy(analyses);

    // 计算合并后的边界框
    const mergedBBox = this.mergeBoundingBoxes(analyses, strategy);

    // 优化执行顺序
    const executionOrder = this.optimizeExecutionOrder(analyses);

    // 计算预期性能提升
    const expectedImprovement = this.calculateExpectedImprovement(
      analyses,
      strategy,
      executionOrder
    );

    return {
      mergedBBox,
      executionOrder,
      strategy: strategy.strategy,
      expectedImprovement
    };
  }

  /**
   * 分析查询条件
   */
  private analyzeConditions(conditions: SpatialQueryCondition[]): ConditionAnalysis[] {
    return conditions.map((condition, index) => {
      const bbox = getBBox(condition.geometry);
      const selectivity = this.calculateSelectivity(condition);
      const filteringPower = this.assessFilteringPower(condition, selectivity);

      return {
        index,
        condition,
        bbox,
        selectivity,
        predicate: condition.predicate,
        filteringPower
      };
    });
  }

  /**
   * 计算条件的选择性
   * 返回 0-1 的值，越低表示选择性越强
   */
  private calculateSelectivity(condition: SpatialQueryCondition): number {
    const bbox = getBBox(condition.geometry);
    const area = (bbox.maxX - bbox.minX) * (bbox.maxY - bbox.minY);

    // 根据谓词类型和面积计算选择性
    let baseSelectivity = 0.5; // 默认值

    switch (condition.predicate) {
      case 'equals':
        baseSelectivity = 0.01; // 极高选择性
        break;
      case 'contains':
        baseSelectivity = 0.1; // 高选择性
        break;
      case 'within':
        baseSelectivity = 0.1; // 高选择性
        break;
      case 'intersects':
        baseSelectivity = 0.5; // 中等选择性
        break;
      case 'touches':
        baseSelectivity = 0.3; // 中高选择性
        break;
      case 'overlaps':
        baseSelectivity = 0.4; // 中等选择性
        break;
      case 'crosses':
        baseSelectivity = 0.35; // 中等选择性
        break;
      case 'disjoint':
        baseSelectivity = 0.8; // 低选择性
        break;
    }

    // 根据面积调整选择性
    const areaFactor = Math.min(area / 1000000, 1); // 假设最大面积 1000km²
    return baseSelectivity * (1 + areaFactor * 0.5);
  }

  /**
   * 评估过滤能力
   */
  private assessFilteringPower(
    condition: SpatialQueryCondition,
    selectivity: number
  ): 'high' | 'medium' | 'low' {
    if (selectivity < 0.2) {
      return 'high';
    } else if (selectivity < 0.5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 确定优化策略
   */
  private determineStrategy(analyses: ConditionAnalysis[]): OptimizationStrategy {
    // 检查是否所有条件都是相交类型
    const allIntersects = analyses.every(a => a.predicate === 'intersects');

    if (allIntersects) {
      return {
        mergedBBox: null,
        executionOrder: [],
        strategy: 'intersection-merge',
        expectedImprovement: 0
      };
    }

    // 检查是否包含分离条件
    const hasDisjoint = analyses.some(a => a.predicate === 'disjoint');

    if (hasDisjoint) {
      return {
        mergedBBox: null,
        executionOrder: [],
        strategy: 'hybrid-merge',
        expectedImprovement: 0
      };
    }

    // 默认混合策略
    return {
      mergedBBox: null,
      executionOrder: [],
      strategy: 'hybrid-merge',
      expectedImprovement: 0
    };
  }

  /**
   * 合并边界框
   */
  private mergeBoundingBoxes(
    analyses: ConditionAnalysis[],
    strategy: OptimizationStrategy
  ): BBox | null {
    if (analyses.length === 0) {
      return null;
    }

    if (analyses.length === 1) {
      return analyses[0].bbox;
    }

    switch (strategy.strategy) {
      case 'intersection-merge':
        return this.mergeWithIntersection(analyses);

      case 'union-merge':
        return this.mergeWithUnion(analyses);

      case 'hybrid-merge':
        return this.mergeWithHybrid(analyses);

      default:
        return analyses[0].bbox;
    }
  }

  /**
   * 使用交集合并边界框
   * 适用于多个相交条件
   */
  private mergeWithIntersection(analyses: ConditionAnalysis[]): BBox {
    let currentBBox = analyses[0].bbox;

    for (let i = 1; i < analyses.length; i++) {
      const nextBBox = analyses[i].bbox;
      const intersection = bboxIntersection(currentBBox, nextBBox);

      if (intersection) {
        currentBBox = intersection;
      } else {
        // 如果没有交集，使用并集作为回退
        currentBBox = bboxUnion(currentBBox, nextBBox);
      }
    }

    return currentBBox;
  }

  /**
   * 使用并集合并边界框
   * 适用于包含分离条件的情况
   */
  private mergeWithUnion(analyses: ConditionAnalysis[]): BBox {
    let currentBBox = analyses[0].bbox;

    for (let i = 1; i < analyses.length; i++) {
      currentBBox = bboxUnion(currentBBox, analyses[i].bbox);
    }

    return currentBBox;
  }

  /**
   * 混合合并策略
   * 根据谓词类型选择交集或并集
   */
  private mergeWithHybrid(analyses: ConditionAnalysis[]): BBox {
    // 分离相交和非相交条件
    const intersectConditions = analyses.filter(a =>
      ['intersects', 'contains', 'within', 'touches', 'overlaps', 'crosses'].includes(a.predicate)
    );

    const disjointConditions = analyses.filter(a =>
      ['disjoint', 'equals'].includes(a.predicate)
    );

    let mergedBBox: BBox;

    // 对相交条件使用交集
    if (intersectConditions.length > 0) {
      mergedBBox = this.mergeWithIntersection(intersectConditions);
    } else {
      mergedBBox = disjointConditions[0].bbox;
    }

    // 对分离条件使用并集
    if (disjointConditions.length > 0) {
      const disjointBBox = this.mergeWithUnion(disjointConditions);
      mergedBBox = bboxUnion(mergedBBox, disjointBBox);
    }

    return mergedBBox;
  }

  /**
   * 优化执行顺序
   * 根据选择性排序条件
   */
  private optimizeExecutionOrder(analyses: ConditionAnalysis[]): number[] {
    // 按选择性排序（选择性强的先执行）
    const sorted = [...analyses].sort((a, b) => a.selectivity - b.selectivity);

    return sorted.map(a => a.index);
  }

  /**
   * 计算预期性能提升
   */
  private calculateExpectedImprovement(
    analyses: ConditionAnalysis[],
    strategy: OptimizationStrategy,
    executionOrder: number[]
  ): number {
    if (analyses.length <= 1) {
      return 1.0; // 无提升
    }

    // 基于条件数量和选择性计算预期提升
    const conditionCount = analyses.length;
    const avgSelectivity = analyses.reduce((sum, a) => sum + a.selectivity, 0) / conditionCount;
    const highSelectivityCount = analyses.filter(a => a.filteringPower === 'high').length;

    // 基础提升
    let improvement = 1.0 + (conditionCount - 1) * 0.3;

    // 选择性加成
    improvement *= (1 + (1 - avgSelectivity) * 0.5);

    // 高选择性条件加成
    improvement *= (1 + highSelectivityCount * 0.2);

    // 策略加成
    if (strategy.strategy === 'intersection-merge') {
      improvement *= 1.3;
    } else if (strategy.strategy === 'hybrid-merge') {
      improvement *= 1.1;
    }

    return Math.min(improvement, 3.0); // 最大 3x 提升
  }

  /**
   * 获取优化建议
   */
  getOptimizationAdvice(conditions: SpatialQueryCondition[]): {
    advice: string;
    reasons: string[];
    suggestions: string[];
  } {
    if (conditions.length === 0) {
      return {
        advice: '无优化建议',
        reasons: ['没有空间条件'],
        suggestions: []
      };
    }

    if (conditions.length === 1) {
      return {
        advice: '单条件查询无需优化',
        reasons: ['只有一个空间条件'],
        suggestions: ['考虑添加更多空间条件以利用多条件优化']
      };
    }

    const analyses = this.analyzeConditions(conditions);
    const strategy = this.determineStrategy(analyses);

    const reasons: string[] = [];
    const suggestions: string[] = [];

    // 分析谓词组合
    const predicates = analyses.map(a => a.predicate);
    const hasIntersects = predicates.includes('intersects');
    const hasContains = predicates.includes('contains');
    const hasWithin = predicates.includes('within');
    const hasDisjoint = predicates.includes('disjoint');

    if (hasIntersects && hasContains && hasWithin) {
      reasons.push('同时包含相交、包含和在内部条件');
      suggestions.push('建议先执行高选择性条件（contains/within）');
    }

    if (hasDisjoint && predicates.length > 1) {
      reasons.push('包含分离条件与其他空间条件');
      suggestions.push('分离条件可能导致较大的搜索空间');
    }

    const highSelectivityCount = analyses.filter(a => a.filteringPower === 'high').length;
    if (highSelectivityCount > 0) {
      reasons.push(`包含 ${highSelectivityCount} 个高选择性条件`);
      suggestions.push('优先执行高选择性条件可以显著提升性能');
    }

    return {
      advice: this.getStrategyDescription(strategy.strategy),
      reasons,
      suggestions
    };
  }

  /**
   * 获取策略描述
   */
  private getStrategyDescription(strategy: string): string {
    switch (strategy) {
      case 'intersection-merge':
        return '使用交集合并边界框，适用于多个相交条件';
      case 'union-merge':
        return '使用并集合并边界框，适用于包含分离条件';
      case 'hybrid-merge':
        return '使用混合策略合并边界框，适用于复杂条件组合';
      default:
        return '单条件查询';
    }
  }
}

/**
 * 快速优化函数
 * @param conditions - 空间查询条件数组
 * @returns 优化策略
 */
export function optimizeMultiConditions(
  conditions: SpatialQueryCondition[]
): OptimizationStrategy {
  const optimizer = new MultiConditionOptimizer();
  return optimizer.optimize(conditions);
}

/**
 * 获取优化建议
 * @param conditions - 空间查询条件数组
 * @returns 优化建议
 */
export function getOptimizationAdvice(
  conditions: SpatialQueryCondition[]
): { advice: string; reasons: string[]; suggestions: string[] } {
  const optimizer = new MultiConditionOptimizer();
  return optimizer.getOptimizationAdvice(conditions);
}
