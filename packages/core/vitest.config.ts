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
    coverage: {
      provider: 'istanbul',  // 浏览器模式需要使用 istanbul
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules/', 'dist/', 'test/']
    }
  }
});
