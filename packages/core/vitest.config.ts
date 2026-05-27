import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // 启用浏览器模式
    browser: {
      enabled: true,
      name: 'chromium',        // 默认浏览器
      provider: 'playwright',
      headless: true,          // 无头模式 (CI 推荐)
    },
    setupFiles: ['./test/setup.ts'],
    exclude: [
      'test/benchmark/**',    // benchmark 文件使用 bench() 只能在 vitest bench 模式运行
      'test/sql/postgis-registry-extended.test.ts',  // PostGISRegistry 类未实现
      'node_modules/**',       // 排除第三方包中的测试文件
    ],
    coverage: {
      provider: 'istanbul',  // 浏览器模式需要使用 istanbul
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules/', 'dist/', 'test/']
    }
  }
});
