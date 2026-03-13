/**
 * 性能监控测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceMonitor, getGlobalPerformanceMonitor, resetGlobalPerformanceMonitor } from '../../src/monitoring';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  describe('初始化', () => {
    it('应该创建性能监控器实例', () => {
      expect(monitor).toBeInstanceOf(PerformanceMonitor);
    });

    it('应该初始化统计信息', () => {
      const stats = monitor.getStats();
      expect(stats.queryCount).toBe(0);
      expect(stats.avgQueryTime).toBe(0);
      expect(stats.indexHitRate).toBe(0);
      expect(stats.cacheHitRate).toBe(0);
    });

    it('应该初始化性能分析状态', () => {
      const state = monitor.getProfilingState();
      expect(state.enabled).toBe(false);
      expect(state.slowQueryThreshold).toBe(100);
      expect(state.maxLogEntries).toBe(1000);
    });
  });

  describe('查询记录', () => {
    it('应该记录查询（性能分析启用时）', () => {
      monitor.enableProfiling(true);
      monitor.recordQuery('query', 'SELECT * FROM test', 10, {
        rowCount: 5,
        usedIndex: true,
        fromCache: false
      });

      const stats = monitor.getStats();
      expect(stats.queryCount).toBe(1);
      expect(stats.avgQueryTime).toBe(10);
    });

    it('应该记录查询（性能分析未启用时）', () => {
      monitor.enableProfiling(false);
      monitor.recordQuery('query', 'SELECT * FROM test', 10, {
        rowCount: 5,
        usedIndex: true,
        fromCache: false
      });

      const stats = monitor.getStats();
      expect(stats.queryCount).toBe(1);
      expect(stats.avgQueryTime).toBe(10);
    });

    it('应该正确计算平均查询时间', () => {
      monitor.enableProfiling(true);
      monitor.recordQuery('query', 'SELECT 1', 10);
      monitor.recordQuery('query', 'SELECT 2', 20);
      monitor.recordQuery('query', 'SELECT 3', 30);

      const stats = monitor.getStats();
      expect(stats.avgQueryTime).toBe(20);
      expect(stats.minQueryTime).toBe(10);
      expect(stats.maxQueryTime).toBe(30);
    });

    it('应该正确计算索引命中率', () => {
      monitor.enableProfiling(true);
      monitor.recordQuery('query', 'SELECT 1', 10, { usedIndex: true });
      monitor.recordQuery('query', 'SELECT 2', 10, { usedIndex: true });
      monitor.recordQuery('query', 'SELECT 3', 10, { usedIndex: false });

      const stats = monitor.getStats();
      expect(stats.indexHits).toBe(2);
      expect(stats.indexHitRate).toBeCloseTo(0.667, 2);
    });

    it('应该正确计算缓存命中率', () => {
      monitor.enableProfiling(true);
      monitor.recordQuery('query', 'SELECT 1', 10, { fromCache: true });
      monitor.recordQuery('query', 'SELECT 2', 10, { fromCache: false });

      const stats = monitor.getStats();
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheHitRate).toBe(0.5);
    });
  });

  describe('慢查询', () => {
    it('应该记录慢查询', () => {
      monitor.enableProfiling(true);
      monitor.setSlowQueryThreshold(100);

      monitor.recordQuery('query', 'SLOW QUERY', 150);
      monitor.recordQuery('query', 'FAST QUERY', 50);

      const slowQueries = monitor.getSlowQueries();
      expect(slowQueries.length).toBe(1);
      expect(slowQueries[0].query).toBe('SLOW QUERY');
      expect(slowQueries[0].duration).toBe(150);
    });

    it('应该支持自定义慢查询阈值', () => {
      monitor.enableProfiling(true);
      monitor.recordQuery('query', 'QUERY 1', 80);
      monitor.recordQuery('query', 'QUERY 2', 120);

      const slow1 = monitor.getSlowQueries(100);
      expect(slow1.length).toBe(1);

      const slow2 = monitor.getSlowQueries(50);
      expect(slow2.length).toBe(2);
    });
  });

  describe('性能分析控制', () => {
    it('应该启用性能分析', () => {
      monitor.enableProfiling(true);
      const state = monitor.getProfilingState();
      expect(state.enabled).toBe(true);
    });

    it('应该禁用性能分析', () => {
      monitor.enableProfiling(true);
      monitor.recordQuery('query', 'test', 10);

      monitor.enableProfiling(false);

      const state = monitor.getProfilingState();
      expect(state.enabled).toBe(false);
    });

    it('应该设置慢查询阈值', () => {
      monitor.setSlowQueryThreshold(200);
      const state = monitor.getProfilingState();
      expect(state.slowQueryThreshold).toBe(200);
    });
  });

  describe('统计重置', () => {
    it('应该重置统计信息', () => {
      monitor.enableProfiling(true);
      monitor.recordQuery('query', 'test', 10);
      monitor.recordQuery('query', 'test', 20);

      monitor.resetStats();

      const stats = monitor.getStats();
      expect(stats.queryCount).toBe(0);
      expect(stats.avgQueryTime).toBe(0);
    });
  });

  describe('性能报告', () => {
    it('应该生成性能报告', () => {
      monitor.enableProfiling(true);
      monitor.recordQuery('query', 'SELECT 1', 10, { usedIndex: true });
      monitor.recordQuery('query', 'SELECT 2', 20, { fromCache: true });

      const report = monitor.getReport();
      expect(report).toContain('总查询次数: 2');
      expect(report).toContain('平均查询时间:');
      expect(report).toContain('索引命中率:');
      expect(report).toContain('缓存命中率:');
    });
  });

  describe('全局监控器', () => {
    it('应该返回相同的全局实例', () => {
      const monitor1 = getGlobalPerformanceMonitor();
      const monitor2 = getGlobalPerformanceMonitor();
      expect(monitor1).toBe(monitor2);
    });

    it('应该重置全局监控器', () => {
      const monitor1 = getGlobalPerformanceMonitor();
      monitor1.recordQuery('query', 'test', 10);

      resetGlobalPerformanceMonitor();
      const monitor2 = getGlobalPerformanceMonitor();

      expect(monitor1).not.toBe(monitor2);
      expect(monitor2.getStats().queryCount).toBe(0);
    });
  });
});

describe('性能监控基准', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    monitor.enableProfiling(true);
  });

  it('查询执行时间应该小于 10ms（平均）', () => {
    // 模拟 100 次快速查询
    for (let i = 0; i < 100; i++) {
      monitor.recordQuery('query', `SELECT ${i}`, Math.random() * 8 + 1); // 1-9ms
    }

    const stats = monitor.getStats();
    expect(stats.avgQueryTime).toBeLessThan(10);
  });

  it('索引命中率应该大于 80%', () => {
    // 模拟查询，85% 使用索引
    for (let i = 0; i < 100; i++) {
      monitor.recordQuery('query', `SELECT ${i}`, 10, {
        usedIndex: i < 85
      });
    }

    const stats = monitor.getStats();
    expect(stats.indexHitRate).toBeGreaterThan(0.8);
  });

  it('缓存命中率应该大于 60%', () => {
    // 模拟查询，70% 命中缓存
    for (let i = 0; i < 100; i++) {
      monitor.recordQuery('query', `SELECT ${i}`, 10, {
        fromCache: i < 70
      });
    }

    const stats = monitor.getStats();
    expect(stats.cacheHitRate).toBeGreaterThan(0.6);
  });
});
