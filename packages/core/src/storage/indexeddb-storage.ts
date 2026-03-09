import Dexie, { Table } from 'dexie';
import type { TableSchema } from '../types';

/**
 * IndexedDB 存储适配器
 */
export class IndexedDBStorage extends Dexie {
  [key: string]: any;

  constructor(name: string, version: number) {
    super(name);
    this.version(version);
  }

  /**
   * 定义表结构
   */
  defineSchema(schemas: Record<string, TableSchema>): void {
    const stores: Record<string, string> = {};

    for (const [tableName, schema] of Object.entries(schemas)) {
      const indices: string[] = [];

      for (const [field, type] of Object.entries(schema)) {
        if (field === 'id') {
          // 主键
          continue;
        }

        if (type === 'geometry') {
          // 空间字段使用边界框索引
          indices.push('[minX+minY+maxX+maxY]');
        } else {
          // 普通字段索引
          indices.push(field);
        }
      }

      // 定义表结构: id 为主键,其他字段为索引
      stores[tableName] = ['id', ...indices].join(',');
    }

    this.version(this.verno).stores(stores);
  }

  /**
   * 获取表
   */
  getTable<T = any>(tableName: string): Table<T, string> {
    return this.table(tableName);
  }
}
