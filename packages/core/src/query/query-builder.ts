import type {
  QueryOperator,
  QueryCondition,
  SpatialQueryCondition,
  OrderByConfig,
  Geometry,
  BBox
} from '../types';
import type { IndexedDBStorage } from '../storage';
import type { SpatialIndex } from '../index/spatial-index';
import type { SpatialEngine } from '../spatial/spatial-engine';
import { getBBox, bboxIntersects, bboxContains, isEmptyGeometry } from '../utils';
import { EngineRegistry } from '../spatial/engine-registry';
import { globalGeometryCache } from '../spatial/geometry-cache';
import { MultiConditionOptimizer, optimizeMultiConditions } from './multi-condition-optimizer';
import { ErrorFactory, DatabaseError, QueryError, ValidationError, ErrorCode } from '../errors';

/**
 * 查询构建器
 */
export class QueryBuilder<T = any> {
  private tableName: string;
  private storage: IndexedDBStorage;
  private spatialIndex: SpatialIndex | null;
  private conditions: QueryCondition[] = [];
  private spatialConditions: SpatialQueryCondition[] = [];
  private orderByConfigs: OrderByConfig[] = [];
  private limitValue?: number;
  private offsetValue?: number;
  private spatialEngine: SpatialEngine;

  constructor(
    tableName: string,
    storage: IndexedDBStorage,
    spatialIndex: SpatialIndex | null = null,
    spatialEngine?: SpatialEngine
  ) {
    this.tableName = tableName;
    this.storage = storage;
    this.spatialIndex = spatialIndex;
    // 使用传入的引擎或默认引擎
    this.spatialEngine = spatialEngine || EngineRegistry.getDefaultEngine();
  }

  /**
   * 设置空间引擎
   */
  withEngine(engine: SpatialEngine): this {
    if (!engine) {
      throw ErrorFactory.validationError(
        ErrorCode.SPATIAL_ENGINE_REQUIRED,
        'Spatial engine cannot be null or undefined'
      );
    }
    this.spatialEngine = engine;
    return this;
  }

  /**
   * 设置空间引擎（通过名称）
   */
  useEngine(engineName: string): this {
    try {
      const engine = EngineRegistry.getEngine(engineName);
      if (!engine) {
        throw ErrorFactory.validationError(
          ErrorCode.SPATIAL_ENGINE_NOT_FOUND,
          `Spatial engine '${engineName}' not found in registry`
        );
      }
      this.spatialEngine = engine;
      return this;
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.validationError(
          ErrorCode.SPATIAL_ENGINE_ERROR,
          `Failed to set spatial engine '${engineName}': ${error.message}`,
          { engineName, originalError: error }
        );
      }
      throw error;
    }
  }

  /**
   * 添加条件
   */
  where(field: string, operator: QueryOperator, value: any): this {
    this.conditions.push({ field, operator, value });
    return this;
  }

  /**
   * 空间相交查询
   */
  intersects(field: string, geometry: Geometry): this {
    this.spatialConditions.push({
      field,
      predicate: 'intersects',
      geometry
    });
    return this;
  }

  /**
   * 空间包含查询
   */
  contains(field: string, geometry: Geometry): this {
    this.spatialConditions.push({
      field,
      predicate: 'contains',
      geometry
    });
    return this;
  }

  /**
   * 空间在内部查询
   */
  within(field: string, geometry: Geometry): this {
    this.spatialConditions.push({
      field,
      predicate: 'within',
      geometry
    });
    return this;
  }

  /**
   * 距离查询（优化版本）
   */
  distance(
    field: string,
    point: [number, number],
    operator: '<' | '<=' | '>' | '>=',
    distance: number
  ): this {
    // 使用优化的缓冲策略
    const pointGeometry: Geometry = {
      type: 'Point',
      coordinates: point
    };

    // Turf.js 不支持 'meters' 单位，需要转换为 'kilometers'
    const distanceInKm = distance / 1000;
    const buffered = this.spatialEngine.buffer(
      pointGeometry,
      distanceInKm,
      'kilometers'
    );

    if (operator === '<' || operator === '<=') {
      this.within(field, buffered);
    } else {
      // > 或 >= 需要反向逻辑
      this.spatialConditions.push({
        field,
        predicate: 'disjoint',
        geometry: buffered
      });
    }

    return this;
  }

  /**
   * 排序
   */
  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
    this.orderByConfigs.push({ field, direction });
    return this;
  }

  /**
   * 限制数量
   */
  limit(n: number): this {
    this.limitValue = n;
    return this;
  }

  /**
   * 偏移
   */
  offset(n: number): this {
    this.offsetValue = n;
    return this;
  }

  /**
   * 执行查询
   */
  async toArray(): Promise<T[]> {
    // 检查数据库是否已关闭
    if (!this.storage.isOpen) {
      throw ErrorFactory.databaseError(
        ErrorCode.DATABASE_CLOSED,
        'Database is closed, cannot execute query'
      );
    }

    try {
      let results: T[] = [];

      // 1. 空间查询 (使用空间索引)
      if (this.spatialConditions.length > 0 && this.spatialIndex) {
        results = await this.executeSpatialQuery();
      } else {
        // 2. 属性查询
        results = await this.executeAttributeQuery();
      }

      // 3. 应用属性过滤
      results = this.applyAttributeFilters(results);

      // 4. 应用空间过滤 (精确检查)
      if (this.spatialConditions.length > 0) {
        results = this.applySpatialFilters(results);
      }

      // 5. 排序
      if (this.orderByConfigs.length > 0) {
        results = this.applyOrdering(results);
      }

      // 6. 分页
      if (this.offsetValue !== undefined) {
        results = results.slice(this.offsetValue);
      }
      if (this.limitValue !== undefined) {
        results = results.slice(0, this.limitValue);
      }

      return results;
    } catch (error) {
      // 如果是 WebGeoDBError，直接抛出
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      // 包装其他错误
      if (error instanceof Error) {
        throw ErrorFactory.queryError(
          `Failed to execute query on table '${this.tableName}': ${error.message}`,
          {
            table: this.tableName,
            conditions: this.conditions,
            spatialConditions: this.spatialConditions
          },
          error
        );
      }
      throw error;
    }
  }

  /**
   * 执行空间查询
   */
  private async executeSpatialQuery(): Promise<T[]> {
    if (!this.spatialIndex) {
      throw ErrorFactory.indexError(
        ErrorCode.INDEX_NOT_AVAILABLE,
        'Spatial index not available for query',
        { table: this.tableName }
      );
    }

    // 检查数据库是否已关闭
    if (!this.storage.isOpen) {
      throw ErrorFactory.databaseError(
        ErrorCode.DATABASE_CLOSED,
        'Database is closed, cannot execute spatial query'
      );
    }

    try {
      // 使用多条件优化器合并边界框
      let searchBBox: BBox;

      if (this.spatialConditions.length > 1) {
        // 多条件：使用优化器合并边界框
        const optimizer = new MultiConditionOptimizer();
        const optimization = optimizer.optimize(this.spatialConditions);

        if (optimization.mergedBBox) {
          searchBBox = optimization.mergedBBox;
          console.log(`🚀 多条件优化: ${optimization.strategy}, 预期提升: ${optimization.expectedImprovement.toFixed(2)}x`);
        } else {
          // 回退到第一个条件的边界框
          searchBBox = getBBox(this.spatialConditions[0].geometry);
        }
      } else {
        // 单条件：直接使用第一个条件的边界框
        searchBBox = getBBox(this.spatialConditions[0].geometry);
      }

      // 使用空间索引搜索
      const candidates = this.spatialIndex.search(searchBBox);

      // 从数据库加载候选项
      const ids = candidates.map((item: any) => item.id);
      const table = this.storage.getTable<T>(this.tableName);
      const results = await table.where('id').anyOf(ids as string[]).toArray();

      return results;
    } catch (error) {
      // 如果是 WebGeoDBError，直接抛出
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      // 包装其他错误
      if (error instanceof Error) {
        throw ErrorFactory.queryError(
          `Failed to execute spatial query on table '${this.tableName}': ${error.message}`,
          {
            table: this.tableName,
            spatialConditions: this.spatialConditions
          },
          error
        );
      }
      throw error;
    }
  }

  /**
   * 执行属性查询
   */
  private async executeAttributeQuery(): Promise<T[]> {
    // 检查数据库是否已关闭
    if (!this.storage.isOpen) {
      throw ErrorFactory.databaseError(
        ErrorCode.DATABASE_CLOSED,
        'Database is closed, cannot execute attribute query'
      );
    }

    try {
      const table = this.storage.getTable<T>(this.tableName);

      if (this.conditions.length === 0) {
        return await table.toArray();
      }

      // 使用第一个条件作为主查询
      const firstCondition = this.conditions[0];

      switch (firstCondition.operator) {
        case '=':
          return await table.where(firstCondition.field).equals(firstCondition.value).toArray();
        case '!=':
          return await table.where(firstCondition.field).notEqual(firstCondition.value).toArray();
        case '>':
          return await table.where(firstCondition.field).above(firstCondition.value).toArray();
        case '>=':
          return await table.where(firstCondition.field).aboveOrEqual(firstCondition.value).toArray();
        case '<':
          return await table.where(firstCondition.field).below(firstCondition.value).toArray();
        case '<=':
          return await table.where(firstCondition.field).belowOrEqual(firstCondition.value).toArray();
        case 'in':
          return await table.where(firstCondition.field).anyOf(firstCondition.value).toArray();
        case 'not in':
          return await table.where(firstCondition.field).noneOf(firstCondition.value).toArray();
        case 'like':
          // Like 操作符需要全表扫描后过滤
          const items1 = await table.toArray();
          return items1.filter(item => {
            const value = this.getNestedValue(item, firstCondition.field);
            return typeof value === 'string' && value.includes(firstCondition.value);
          });
        case 'not like':
          const items2 = await table.toArray();
          return items2.filter(item => {
            const value = this.getNestedValue(item, firstCondition.field);
            return typeof value === 'string' && !value.includes(firstCondition.value);
          });
        default:
          throw ErrorFactory.queryError(
            `Unsupported query operator: ${firstCondition.operator}`,
            { operator: firstCondition.operator, field: firstCondition.field }
          );
      }
    } catch (error) {
      // 如果是 WebGeoDBError，直接抛出
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      // 包装其他错误
      if (error instanceof Error) {
        throw ErrorFactory.queryError(
          `Failed to execute attribute query on table '${this.tableName}': ${error.message}`,
          {
            table: this.tableName,
            conditions: this.conditions
          },
          error
        );
      }
      throw error;
    }
  }

  /**
   * 应用属性过滤
   */
  private applyAttributeFilters(results: T[]): T[] {
    if (this.conditions.length === 0) {
      return results;
    }

    // 如果有空间查询，需要应用所有属性条件
    // 如果只有属性查询，第一个条件已经在 executeAttributeQuery 中应用了
    const startIndex = this.spatialConditions.length > 0 ? 0 : 1;

    return results.filter(item => {
      for (let i = startIndex; i < this.conditions.length; i++) {
        const condition = this.conditions[i];
        const value = this.getNestedValue(item, condition.field);

        if (!this.checkCondition(value, condition.operator, condition.value)) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 获取嵌套属性值
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current?.[key];
    }, obj);
  }

  /**
   * 检查条件
   */
  private checkCondition(
    value: any,
    operator: QueryOperator,
    target: any
  ): boolean {
    switch (operator) {
      case '=':
        return value === target;
      case '!=':
        return value !== target;
      case '>':
        return value > target;
      case '>=':
        return value >= target;
      case '<':
        return value < target;
      case '<=':
        return value <= target;
      case 'in':
        return Array.isArray(target) && target.includes(value);
      case 'not in':
        return Array.isArray(target) && !target.includes(value);
      case 'like':
        return typeof value === 'string' && value.includes(target);
      case 'not like':
        return typeof value === 'string' && !value.includes(target);
      default:
        return false;
    }
  }

  /**
   * 应用空间过滤
   */
  private applySpatialFilters(results: T[]): T[] {
    return results.filter(item => {
      for (const condition of this.spatialConditions) {
        const geometry = (item as any)[condition.field];
        if (!geometry) {
          return false;
        }

        // 检查是否为空几何体
        if (isEmptyGeometry(geometry)) {
          return false;
        }

        if (!this.checkSpatialCondition(geometry, condition)) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 检查空间条件
   */
  private checkSpatialCondition(
    geometry: Geometry,
    condition: SpatialQueryCondition
  ): boolean {
    try {
      // 使用空间引擎执行谓词
      switch (condition.predicate) {
        case 'intersects':
          return this.spatialEngine.intersects(geometry, condition.geometry);

        case 'contains':
          // 对于 Point，不能用 contains（点不能包含其他几何）
          if (geometry.type === 'Point') {
            return false;
          }
          return this.spatialEngine.contains(geometry, condition.geometry);

        case 'within':
          return this.spatialEngine.within(geometry, condition.geometry);

        case 'equals':
          return this.spatialEngine.equals(geometry, condition.geometry);

        case 'disjoint':
          return this.spatialEngine.disjoint(geometry, condition.geometry);

        case 'crosses':
          return this.spatialEngine.crosses(geometry, condition.geometry);

        case 'touches':
          return this.spatialEngine.touches(geometry, condition.geometry);

        case 'overlaps':
          return this.spatialEngine.overlaps(geometry, condition.geometry);

        default:
          throw ErrorFactory.queryError(
            `Unknown spatial predicate: ${(condition as any).predicate}`,
            { predicate: (condition as any).predicate }
          );
      }
    } catch (error) {
      // 如果是 WebGeoDBError，直接抛出
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      // 包装其他错误
      if (error instanceof Error) {
        throw ErrorFactory.queryError(
          `Failed to check spatial condition '${condition.predicate}': ${error.message}`,
          { predicate: condition.predicate, geometry },
          error
        );
      }
      throw error;
    }
  }

  /**
   * 应用排序
   */
  private applyOrdering(results: T[]): T[] {
    return results.sort((a, b) => {
      for (const config of this.orderByConfigs) {
        const aValue = (a as any)[config.field];
        const bValue = (b as any)[config.field];

        if (aValue < bValue) {
          return config.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return config.direction === 'asc' ? 1 : -1;
        }
      }
      return 0;
    });
  }
}
