import Dexie, { Table } from 'dexie';
import type { TableSchema } from '../types';

/**
 * IndexedDB 存储适配器
 */
export class IndexedDBStorage extends Dexie {
  [key: string]: any;
  private _schemaDefined = false;

  constructor(name: string, version: number) {
    super(name);
    this.version(version);
  }

  /**
   * 定义表结构。必须在 open() 之前调用。
   */
  defineSchema(schemas: Record<string, TableSchema>): void {
    // If database is open, close it first (Dexie doesn't allow version changes on open DB)
    if (this.isOpen()) {
      this.close();
    }

    const stores: Record<string, string> = {};

    for (const [tableName, schema] of Object.entries(schemas)) {
      const indices: string[] = [];

      for (const [field, type] of Object.entries(schema)) {
        if (field === 'id') {
          continue;
        }

        if (type === 'geometry') {
          indices.push(`[${field}MinX+${field}MinY+${field}MaxX+${field}MaxY]`);
        } else {
          indices.push(field);
        }
      }

      stores[tableName] = ['id', ...indices].join(',');
    }

    this.version(this.verno).stores(stores);
    this._schemaDefined = true;
  }

  /**
   * 获取表
   */
  getTable<T = any>(tableName: string): Table<T, string> {
    return this.table(tableName);
  }
}
