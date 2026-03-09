import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  target: 'es2020',
  // 代码分割配置
  treeshake: true,
  // 外部依赖（不打包）
  external: [
    '@turf/turf',
    'dexie',
    'flatbush',
    'proj4',
    'rbush',
    'wkx',
    'jsts' // JSTS 作为可选依赖
  ],
  // 全局变量定义
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
});