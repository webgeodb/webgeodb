import type { BBox, IndexItem } from '../types';
import type { SpatialIndex } from './spatial-index';
import { RTreeIndex } from './rtree-index';
import { FlatbushIndex } from './flatbush-index';

/**
 * 混合空间索引
 * 结合动态索引 (R-tree) 和静态索引 (Flatbush)
 */
export class HybridSpatialIndex implements SpatialIndex {
  name = 'hybrid';
  private dynamicIndex: RTreeIndex;
  private staticIndex: FlatbushIndex | null = null;

  constructor() {
    this.dynamicIndex = new RTreeIndex();
  }

  insert(item: IndexItem): void {
    this.dynamicIndex.insert(item);
  }

  insertMany(items: IndexItem[]): void {
    this.dynamicIndex.insertMany(items);
  }

  remove(item: IndexItem): void {
    this.dynamicIndex.remove(item);
  }

  search(bbox: BBox): IndexItem[] {
    const dynamicResults = this.dynamicIndex.search(bbox);
    const staticResults = this.staticIndex ? this.staticIndex.search(bbox) : [];
    return [...dynamicResults, ...staticResults];
  }

  clear(): void {
    this.dynamicIndex.clear();
    if (this.staticIndex) {
      this.staticIndex.clear();
      this.staticIndex = null;
    }
  }

  all(): IndexItem[] {
    const dynamicItems = this.dynamicIndex.all();
    const staticItems = this.staticIndex ? this.staticIndex.all() : [];
    return [...dynamicItems, ...staticItems];
  }

  size(): number {
    const dynamicSize = this.dynamicIndex.size();
    const staticSize = this.staticIndex ? this.staticIndex.size() : 0;
    return dynamicSize + staticSize;
  }

  isBuilt(): boolean {
    // 混合索引总是处于已构建状态（动态或静态）
    return this.dynamicIndex.isBuilt() || (this.staticIndex !== null && this.staticIndex.isBuilt());
  }

  /**
   * 将动态索引转换为静态索引
   * 适用于数据加载完成后,提升查询性能
   */
  freeze(): void {
    const items = this.dynamicIndex.all();
    if (items.length === 0) {
      return;
    }

    this.staticIndex = new FlatbushIndex();
    this.staticIndex.insertMany(items);
    this.staticIndex.build();

    // 清空动态索引
    this.dynamicIndex.clear();
  }

  /**
   * 解冻,恢复为动态索引
   */
  unfreeze(): void {
    if (!this.staticIndex) {
      return;
    }

    const items = this.staticIndex.all();
    this.dynamicIndex.insertMany(items);

    this.staticIndex.clear();
    this.staticIndex = null;
  }
}
