import RBush from 'rbush';
import type { BBox, IndexItem } from '../types';
import type { SpatialIndex } from './spatial-index';

/**
 * R-tree 空间索引 (动态)
 * 适用于需要频繁插入和删除的场景
 */
export class RTreeIndex implements SpatialIndex {
  name = 'rtree';
  private tree: RBush<IndexItem>;

  constructor(maxEntries: number = 9) {
    this.tree = new RBush(maxEntries);
  }

  insert(item: IndexItem): void {
    this.tree.insert(item);
  }

  insertMany(items: IndexItem[]): void {
    this.tree.load(items);
  }

  remove(item: IndexItem): void {
    this.tree.remove(item);
  }

  search(bbox: BBox): IndexItem[] {
    return this.tree.search(bbox);
  }

  clear(): void {
    this.tree.clear();
  }

  all(): IndexItem[] {
    return this.tree.all();
  }

  size(): number {
    return this.tree.all().length;
  }

  isBuilt(): boolean {
    // R-tree 是动态索引，总是处于已构建状态
    return true;
  }

  /**
   * 碰撞检测
   */
  collides(bbox: BBox): boolean {
    return this.tree.collides(bbox);
  }
}
