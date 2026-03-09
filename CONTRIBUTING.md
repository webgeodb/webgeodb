# 贡献指南

感谢你对 WebGeoDB 的关注! 我们欢迎各种形式的贡献。

## 开发环境

### 前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装依赖

```bash
pnpm install
```

### 开发

```bash
# 开发模式
pnpm dev

# 构建
pnpm build

# 测试
pnpm test

# 代码检查
pnpm lint
```

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范:

```
<type>: <description>

<optional body>

<optional footer>
```

### Type

- `feat`: 新功能
- `fix`: 修复 bug
- `refactor`: 重构
- `docs`: 文档更新
- `test`: 测试相关
- `chore`: 构建/工具相关
- `perf`: 性能优化
- `ci`: CI/CD 相关

### 示例

```
feat: add spatial index support

- Implement R-tree index
- Implement Flatbush static index
- Add hybrid index strategy

Closes #123
```

## Pull Request 流程

1. Fork 项目
2. 创建特性分支 (`git checkout -b feat/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feat/amazing-feature`)
5. 创建 Pull Request

## 代码规范

- 使用 TypeScript
- 遵循 ESLint 规则
- 编写单元测试
- 保持测试覆盖率 > 80%
- 添加必要的注释和文档

## 测试

```bash
# 运行所有测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 监听模式
pnpm test --watch
```

## 文档

- 更新相关文档
- 添加 JSDoc 注释
- 提供使用示例

## 问题反馈

- 使用 GitHub Issues
- 提供详细的复现步骤
- 包含环境信息

## 行为准则

请遵守我们的 [行为准则](./CODE_OF_CONDUCT.md)。

## 许可证

通过贡献代码,你同意你的贡献将在 MIT 许可证下发布。
