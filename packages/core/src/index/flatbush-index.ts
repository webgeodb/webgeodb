import Flatbush from 'flatbush';
import type { BBox, IndexItem } from '../types';
import type { SpatialIndex } from './spatial-index';

/**
 * Flatbush 静态空间索引
 * 适用于只读数据,性能更优
 */
export class FlatbushIndex implements SpatialIndex {
  name = 'flatbush';
  private index: Flatbush | null = null;
  private items: IndexItem[] = [];
  private built = false;

  constructor(private nodeSize: number = 16) {}

  insert(item: IndexItem): void {
    if (this.built) {
      throw new Error('Cannot insert into a built static index');
    }
    this.items.push(item);
  }

  insertMany(items: IndexItem[]): void {
    if (this.built) {
      throw new Error('Cannot insert into a built static index');
    }
    this.items.push(...items);
  }

  remove(_item: IndexItem): void {
    throw new Error('Static index does not support removal');
  }

  /**
   * 构建索引 (必须在查询前调用)
   */
  build(): void {
    if (this.built) {
      return;
    }

    // 空索引不需要构建
    if (this.items.length === 0) {
      this.built = true;
      return;
    }

    this.index = new Flatbush(this.items.length, this.nodeSize);

    for (const item of this.items) {
      this.index.add(item.minX, item.minY, item.maxX, item.maxY);
    }

    this.index.finish();
    this.built = true;
  }

  search(bbox: BBox): IndexItem[] {
    if (!this.built || !this.index) {
      throw new Error('Index not built. Call build() first.');
    }

    const indices = this.index.search(
      bbox.minX,
      bbox.minY,
      bbox.maxX,
      bbox.maxY
    );

    return indices.map(i => this.items[i]);
  }

  clear(): void {
    this.index = null;
    this.items = [];
    this.built = false;
  }

  all(): IndexItem[] {
    return this.items;
  }

  size(): number {
    return this.items.length;
  }

  isBuilt(): boolean {
    return this.built;
  }
}
