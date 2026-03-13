import Flatbush from 'flatbush';
import type { BBox, IndexItem } from '../types';
import type { SpatialIndex } from './spatial-index';
import { ErrorFactory, IndexError } from '../errors';

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
      throw ErrorFactory.indexError(
        'INDEX_ALREADY_BUILT',
        'Cannot insert into a built static index',
        { indexType: 'flatbush', itemCount: this.items.length }
      );
    }
    this.items.push(item);
  }

  insertMany(items: IndexItem[]): void {
    if (this.built) {
      throw ErrorFactory.indexError(
        'INDEX_ALREADY_BUILT',
        'Cannot insert into a built static index',
        { indexType: 'flatbush', itemCount: this.items.length, insertCount: items.length }
      );
    }
    this.items.push(...items);
  }

  remove(_item: IndexItem): void {
    throw ErrorFactory.indexError(
      'INDEX_NOT_SUPPORTED',
      'Static index does not support removal',
      { indexType: 'flatbush' }
    );
  }

  /**
   * 构建索引 (必须在查询前调用)
   */
  build(): void {
    if (this.built) {
      return;
    }

    try {
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
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.indexError(
          'INDEX_BUILD_FAILED',
          `Failed to build Flatbush index: ${error.message}`,
          { itemCount: this.items.length, nodeSize: this.nodeSize },
          error
        );
      }
      throw error;
    }
  }

  search(bbox: BBox): IndexItem[] {
    if (!this.built || !this.index) {
      throw ErrorFactory.indexError(
        'INDEX_NOT_BUILT',
        'Index not built. Call build() first.',
        { indexType: 'flatbush', itemCount: this.items.length }
      );
    }

    try {
      const indices = this.index.search(
        bbox.minX,
        bbox.minY,
        bbox.maxX,
        bbox.maxY
      );

      return indices.map(i => this.items[i]);
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.indexError(
          'INDEX_SEARCH_FAILED',
          `Failed to search Flatbush index: ${error.message}`,
          { bbox },
          error
        );
      }
      throw error;
    }
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
