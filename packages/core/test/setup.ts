import { beforeAll } from 'vitest';

beforeAll(() => {
  // 浏览器环境已提供真实 IndexedDB,无需模拟
  console.log('Running tests in real browser environment');
});
