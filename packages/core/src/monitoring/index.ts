/**
 * 性能监控模块
 * 导出所有监控相关的类型和类
 */

// 先导出类
import { PerformanceMonitor } from './performance-monitor';

// 然后导出类型
export type { QueryLog, PerformanceStats, ProfilingState } from './types';

// 重新导出类
export { PerformanceMonitor } from './performance-monitor';

/**
 * 全局性能监控器实例
 */
let globalMonitor: PerformanceMonitor | null = null;

/**
 * 获取全局性能监控器
 */
export function getGlobalPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

/**
 * 重置全局性能监控器
 */
export function resetGlobalPerformanceMonitor(): void {
  if (globalMonitor) {
    globalMonitor.resetStats();
  }
  globalMonitor = null;
}
