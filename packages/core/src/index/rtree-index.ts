import RBush from 'rbush';
import type { BBox, IndexItem } from '../types';
import type { SpatialIndex } from './spatial-index';
import { ErrorFactory } from '../errors';

/**
 * R-tree 空间索引 (动态)
 * 适用于需要频繁插入和删除的场景
 */
export class RTreeIndex implements SpatialIndex {
  name = 'rtree';
  private tree: RBush<IndexItem>;

  constructor(maxEntries: number = 9) {
    try {
      this.tree = new RBush(maxEntries);
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.indexError(
          'INDEX_INIT_FAILED',
          `Failed to initialize R-tree index: ${error.message}`,
          { maxEntries },
          error
        );
      }
      throw error;
    }
  }

  insert(item: IndexItem): void {
    try {
      this.tree.insert(item);
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.indexError(
          'INDEX_INSERT_FAILED',
          `Failed to insert item into R-tree index: ${error.message}`,
          { item },
          error
        );
      }
      throw error;
    }
  }

  insertMany(items: IndexItem[]): void {
    try {
      // 注意：不能使用 tree.load()，因为它会清空现有树
      // load() 只用于初始批量加载，所以这里逐个插入
      for (const item of items) {
        this.tree.insert(item);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.indexError(
          'INDEX_BATCH_INSERT_FAILED',
          `Failed to batch insert items into R-tree index: ${error.message}`,
          { itemCount: items.length },
          error
        );
      }
      throw error;
    }
  }

  remove(item: IndexItem): void {
    try {
      this.tree.remove(item);
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.indexError(
          'INDEX_REMOVE_FAILED',
          `Failed to remove item from R-tree index: ${error.message}`,
          { item },
          error
        );
      }
      throw error;
    }
  }

  search(bbox: BBox): IndexItem[] {
    try {
      return this.tree.search(bbox);
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.indexError(
          'INDEX_SEARCH_FAILED',
          `Failed to search R-tree index: ${error.message}`,
          { bbox },
          error
        );
      }
      throw error;
    }
  }

  clear(): void {
    try {
      this.tree.clear();
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.indexError(
          'INDEX_CLEAR_FAILED',
          `Failed to clear R-tree index: ${error.message}`,
          {},
          error
        );
      }
      throw error;
    }
  }

  all(): IndexItem[] {
    try {
      return this.tree.all();
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.indexError(
          'INDEX_GET_ALL_FAILED',
          `Failed to get all items from R-tree index: ${error.message}`,
          {},
          error
        );
      }
      throw error;
    }
  }

  size(): number {
    try {
      return this.tree.all().length;
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.indexError(
          'INDEX_SIZE_FAILED',
          `Failed to get R-tree index size: ${error.message}`,
          {},
          error
        );
      }
      throw error;
    }
  }

  isBuilt(): boolean {
    // R-tree 是动态索引，总是处于已构建状态
    return true;
  }

  /**
   * 碰撞检测
   */
  collides(bbox: BBox): boolean {
    try {
      return this.tree.collides(bbox);
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.indexError(
          'INDEX_COLLIDES_FAILED',
          `Failed to check collision in R-tree index: ${error.message}`,
          { bbox },
          error
        );
      }
      throw error;
    }
  }
}
