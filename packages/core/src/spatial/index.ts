/**
 * 空间计算模块
 *
 * 提供抽象的空间引擎接口和多种实现
 */

// 导出核心引擎接口和类型
export * from './spatial-engine';
export * from './engine-registry';

// 导出具体引擎实现
export * from './engines/turf-engine';

// 导出工具和缓存
export * from './geometry-cache';
export * from './predicates/optimized-predicates';
export * from './predicates/advanced/advanced-predicates';
export * from './topology';

// 导出插件系统
// 临时注释掉，因为存在构建错误
// export * from './plugin-loader';

// 导出注册表
export { globalPredicateRegistry, registerPredicatePlugin, executePredicate } from './predicates/predicate-registry';
// 临时注释掉plugin-loader的导出
// export { globalPluginLoader, loadPlugin, loadEngine, loadPlugins } from './plugin-loader';

// 重新导出 types 中的部分内容，但避免冲突
export type { Geometry, Feature, BBox } from '../types';

// 注意：动态导入功能暂时移除，因为缺少 dynamic-imports.ts
// TODO: 实现按需加载 JSTS 引擎的功能
// 注意：plugin-loader 暂时禁用，因为存在DTS构建错误
// TODO: 修复plugin-loader的类型导入问题
