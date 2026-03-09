import type { SpatialIndex } from '../../src/index/spatial-index';
import type { IndexItem, Geometry } from '../../src/types';

/**
 * 索引测试辅助类
 */
export class IndexTestHelpers {
  /**
   * 创建测试索引项
   */
  static createIndexItem(id: string | number, geometry: Geometry): IndexItem {
    const { getBBox } = require('../../src/utils');
    const bbox = getBBox(geometry);
    return {
      id,
      ...bbox
    };
  }

  /**
   * 批量创建测试索引项
   */
  static createIndexItems(
    geometries: Array<{ id: string | number; geometry: Geometry }>
  ): IndexItem[] {
    return geometries.map(({ id, geometry }) => this.createIndexItem(id, geometry));
  }

  /**
   * 生成网格状分布的索引项
   */
  static createGridItems(rows: number, cols: number, spacing: number = 10): IndexItem[] {
    const items: IndexItem[] = [];
    let idCounter = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * spacing;
        const y = row * spacing;
        items.push({
          id: `grid-${idCounter++}`,
          minX: x,
          minY: y,
          maxX: x + spacing / 2,
          maxY: y + spacing / 2
        });
      }
    }

    return items;
  }

  /**
   * 生成随机分布的索引项
   */
  static createRandomItems(
    count: number,
    bounds = { minX: 0, minY: 0, maxX: 1000, maxY: 1000 }
  ): IndexItem[] {
    const items: IndexItem[] = [];

    for (let i = 0; i < count; i++) {
      const minX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      const minY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
      const size = 10 + Math.random() * 50;

      items.push({
        id: `random-${i}`,
        minX,
        minY,
        maxX: minX + size,
        maxY: minY + size
      });
    }

    return items;
  }

  /**
   * 生成嵌套的索引项 (用于测试包含关系)
   */
  static createNestedItems(): IndexItem[] {
    return [
      {
        id: 'outer',
        minX: 0,
        minY: 0,
        maxX: 100,
        maxY: 100
      },
      {
        id: 'middle',
        minX: 20,
        minY: 20,
        maxX: 80,
        maxY: 80
      },
      {
        id: 'inner',
        minX: 40,
        minY: 40,
        maxX: 60,
        maxY: 60
      }
    ];
  }

  /**
   * 生成重叠的索引项
   */
  static createOverlappingItems(): IndexItem[] {
    const centerX = 50;
    const centerY = 50;
    const size = 30;

    return [
      {
        id: 'overlap-1',
        minX: centerX - size / 2,
        minY: centerY - size / 2,
        maxX: centerX + size / 2,
        maxY: centerY + size / 2
      },
      {
        id: 'overlap-2',
        minX: centerX - size / 4,
        minY: centerY - size / 4,
        maxX: centerX + size * 3 / 4,
        maxY: centerY + size * 3 / 4
      },
      {
        id: 'overlap-3',
        minX: centerX,
        minY: centerY,
        maxX: centerX + size,
        maxY: centerY + size
      }
    ];
  }

  /**
   * 验证索引搜索结果的正确性
   */
  static validateSearchResults(
    results: IndexItem[],
    expectedIds: Set<string | number>,
    context: string
  ): void {
    const resultIds = new Set(results.map(item => item.id));

    // 检查所有预期结果是否都在搜索结果中
    for (const expectedId of expectedIds) {
      if (!resultIds.has(expectedId)) {
        throw new Error(
          `${context}: 预期结果 ${expectedId} 未在搜索结果中找到。实际结果: ${Array.from(resultIds)}`
        );
      }
    }

    // 检查搜索结果是否都符合预期
    for (const actualId of resultIds) {
      if (!expectedIds.has(actualId)) {
        throw new Error(
          `${context}: 搜索结果包含不应出现的结果 ${actualId}。预期结果: ${Array.from(expectedIds)}`
        );
      }
    }
  }

  /**
   * 计算搜索框应该包含的项
   */
  static calculateExpectedItems(
    items: IndexItem[],
    searchBBox: { minX: number; minY: number; maxX: number; maxY: number }
  ): Set<string | number> {
    const expectedIds = new Set<string | number>();

    for (const item of items) {
      if (this.bboxesIntersect(item, searchBBox)) {
        expectedIds.add(item.id);
      }
    }

    return expectedIds;
  }

  /**
   * 检查两个边界框是否相交
   */
  static bboxesIntersect(
    a: { minX: number; minY: number; maxX: number; maxY: number },
    b: { minX: number; minY: number; maxX: number; maxY: number }
  ): boolean {
    return !(
      a.maxX < b.minX ||
      a.minX > b.maxX ||
      a.maxY < b.minY ||
      a.minY > b.maxY
    );
  }

  /**
   * 测试索引性能
   */
  static async performanceTest(
    index: SpatialIndex,
    items: IndexItem[],
    searchCount: number = 100
  ): Promise<{ avgTime: number; minTime: number; maxTime: number }> {
    const times: number[] = [];

    // 先插入所有项
    if (!index.isBuilt()) {
      for (const item of items) {
        index.insert(item);
      }
      index.build();
    }

    // 执行多次搜索
    for (let i = 0; i < searchCount; i++) {
      const randomItem = items[Math.floor(Math.random() * items.length)];
      const searchBBox = {
        minX: randomItem.minX - 10,
        minY: randomItem.minY - 10,
        maxX: randomItem.maxX + 10,
        maxY: randomItem.maxY + 10
      };

      const start = performance.now();
      index.search(searchBBox);
      const end = performance.now();

      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return { avgTime, minTime, maxTime };
  }

  /**
   * 打印索引统计信息
   */
  static printIndexStats(index: SpatialIndex): void {
    console.log('索引统计信息:');
    console.log(`  - 大小: ${index.size()}`);
    console.log(`  - 已构建: ${index.isBuilt()}`);
  }

  /**
   * 验证索引状态
   */
  static validateIndexState(
    index: SpatialIndex,
    expectedSize: number,
    expectedBuilt: boolean
  ): void {
    const actualSize = index.size();
    const actualBuilt = index.isBuilt();

    if (actualSize !== expectedSize) {
      throw new Error(
        `索引大小不匹配: 预期 ${expectedSize}, 实际 ${actualSize}`
      );
    }

    if (actualBuilt !== expectedBuilt) {
      throw new Error(
        `索引构建状态不匹配: 预期 ${expectedBuilt}, 实际 ${actualBuilt}`
      );
    }
  }
}

/**
 * 创建测试用的边界框
 */
export function createBBox(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): { minX: number; minY: number; maxX: number; maxY: number } {
  return { minX, minY, maxX, maxY };
}

/**
 * 验证边界框相等性
 */
export function assertBBoxEqual(
  actual: { minX: number; minY: number; maxX: number; maxY: number },
  expected: { minX: number; minY: number; maxX: number; maxY: number },
  tolerance: number = 0.0001
): void {
  expect(actual.minX).toBeCloseTo(expected.minX, tolerance);
  expect(actual.minY).toBeCloseTo(expected.minY, tolerance);
  expect(actual.maxX).toBeCloseTo(expected.maxX, tolerance);
  expect(actual.maxY).toBeCloseTo(expected.maxY, tolerance);
}
