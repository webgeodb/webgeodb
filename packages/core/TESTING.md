# WebGeoDB 测试指南

## 快速开始

```bash
# 运行测试 (Chrome)
pnpm test

# UI 模式 (推荐开发时使用)
pnpm test:ui

# 多浏览器测试
pnpm test:all
```

## 测试命令

| 命令 | 说明 |
|------|------|
| `pnpm test` | Chrome 无头模式 |
| `pnpm test:ui` | UI 模式 (可视化) |
| `pnpm test:headed` | Chrome 有头模式 (调试) |
| `pnpm test:firefox` | Firefox 测试 |
| `pnpm test:webkit` | Safari (WebKit) 测试 |
| `pnpm test:all` | 所有浏览器 |
| `pnpm test:coverage` | 生成覆盖率报告 |

## 调试技巧

1. 使用 `test:ui` 查看详细结果
2. 使用 `test:headed` 观察浏览器行为
3. 在测试中添加 `debugger;` 断点

## 当前测试覆盖

- CRUD 操作 (insert, get, update, delete)
- 批量操作 (insertMany, deleteMany)
- 属性查询 (where, orderBy, limit)
- 空间查询 (distance, intersects)

## 浏览器兼容性

✅ Chromium (Chrome, Edge)
✅ Firefox
✅ WebKit (Safari)

## CI/CD

测试在 GitHub Actions 中自动运行，每次 push 或 PR 时执行多浏览器测试。
