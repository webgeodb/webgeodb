import type { BBox, IndexItem } from '../types';

/**
 * 空间索引接口
 */
export interface SpatialIndex {
  /** 索引名称 */
  name: string;

  /** 插入项 */
  insert(item: IndexItem): void;

  /** 批量插入 */
  insertMany(items: IndexItem[]): void;

  /** 删除项 */
  remove(item: IndexItem): void;

  /** 搜索 */
  search(bbox: BBox): IndexItem[];

  /** 清空索引 */
  clear(): void;

  /** 获取所有项 */
  all(): IndexItem[];

  /** 获取项数量 */
  size(): number;

  /** 检查索引是否已构建 */
  isBuilt(): boolean;
}
