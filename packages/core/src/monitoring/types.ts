/**
 * 性能监控模块
 * 提供查询统计、性能分析和慢查询日志功能
 */

export interface QueryLog {
  /** 查询 ID */
  id: string;
  /** 查询类型（query, insert, update, delete 等） */
  type: string;
  /** SQL 语句或表名 */
  query: string;
  /** 执行时间（毫秒） */
  duration: number;
  /** 时间戳 */
  timestamp: number;
  /** 结果行数 */
  rowCount?: number;
  /** 是否使用了索引 */
  usedIndex: boolean;
  /** 是否使用了缓存 */
  fromCache: boolean;
  /** 内存使用（字节） */
  memoryUsage?: number;
}

export interface PerformanceStats {
  /** 总查询次数 */
  queryCount: number;
  /** 平均查询时间（毫秒） */
  avgQueryTime: number;
  /** 最慢查询时间（毫秒） */
  maxQueryTime: number;
  /** 最快查询时间（毫秒） */
  minQueryTime: number;
  /** 总查询时间（毫秒） */
  totalQueryTime: number;
  /** 索引命中率（0-1） */
  indexHitRate: number;
  /** 使用索引的查询数 */
  indexHits: number;
  /** 缓存命中率（0-1） */
  cacheHitRate: number;
  /** 缓存命中数 */
  cacheHits: number;
  /** 当前内存使用（字节） */
  memoryUsage: number;
  /** 慢查询列表 */
  slowQueries: QueryLog[];
}

export interface ProfilingState {
  /** 是否启用性能分析 */
  enabled: boolean;
  /** 慢查询阈值（毫秒） */
  slowQueryThreshold: number;
  /** 最大日志条数 */
  maxLogEntries: number;
}
