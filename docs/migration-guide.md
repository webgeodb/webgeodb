# 迁移指南

## 应用迁移到独立仓库

为了更好的维护和独立部署，我们将部分应用迁移到了独立仓库。

### 迁移时间线

- **2025-03-17**：应用和演示迁移到独立仓库
- 原 `examples/tutorial-04/` 下的完整应用已迁移
- 原 `examples/projects/` 目录已删除

### 迁移的内容

#### 完整应用 → webgeodb-apps

以下 6 个完整 Vite 应用已迁移至 **[zhyt1985/webgeodb-apps](https://github.com/zhyt1985/webgeodb-apps)**：

1. ✅ **offline-map** (离线地图 PWA)
2. ✅ **location-tracking** (实时位置追踪)
3. ✅ **fitness-tracker** (运动追踪器)
4. ✅ **geo-fencing** (地理围栏营销系统)
5. ✅ **environmental** (环境监测平台)
6. ✅ **social-location** (社交位置共享)

#### 纯 HTML 演示 → webgeodb-demos

以下 3 个纯前端演示已迁移至 **[zhyt1985/webgeodb-demos](https://github.com/zhyt1985/webgeodb-demos)**：

1. ✅ **spatial-predicates** (空间谓词演示)
2. ✅ **offline-tracking** (离线追踪演示)
3. ✅ **project-apps** (专题应用演示)

### 如何访问

#### 在线演示

**应用集合**：https://zhyt1985.github.io/webgeodb-apps
**演示集合**：https://zhyt1985.github.io/webgeodb-demos

#### 源码仓库

**webgeodb-apps**：https://github.com/zhyt1985/webgeodb-apps
**webgeodb-demos**：https://github.com/zhyt1985/webgeodb-demos

### 本地运行

#### 应用集合 (webgeodb-apps)

```bash
# 克隆仓库
git clone https://github.com/zhyt1985/webgeodb-apps.git
cd webgeodb-apps

# 安装依赖
pnpm install

# 运行指定应用
pnpm --filter offline-map dev
pnpm --filter location-tracking dev
pnpm --filter fitness-tracker dev
pnpm --filter geo-fencing dev
pnpm --filter environmental dev
pnpm --filter social-location dev

# 构建所有应用
pnpm build
```

#### 演示集合 (webgeodb-demos)

```bash
# 克隆仓库
git clone https://github.com/zhyt1985/webgeodb-demos.git
cd webgeodb-demos

# 使用任意静态服务器
python -m http.server 8000
# 或
npx serve .

# 访问 http://localhost:8000
```

### 保留在核心项目的内容

核心项目 **[zhyt1985/webgeodb](https://github.com/zhyt1985/webgeodb)** 仍然保留：

- ✅ `packages/core/` - 核心库
- ✅ `examples/tutorial-01` - 快速入门
- ✅ `examples/tutorial-02` - 空间查询基础
- ✅ `examples/tutorial-03` - 高级特性
- ✅ `examples/tutorial-04/README.md` - 重定向到新仓库
- ✅ `examples/tutorial-05` - 生产环境配置
- ✅ `examples/basic-usage` - 基础示例
- ✅ `docs/` - 完整文档

### 迁移的好处

将完整应用和演示迁移到独立仓库有以下优势：

1. **降低维护复杂度**：核心项目专注于核心库和教程
2. **独立版本管理**：应用和演示可以有独立的发布周期
3. **简化 CI/CD**：各仓库独立构建和部署
4. **便于社区贡献**：降低贡献门槛
5. **更快的构建速度**：核心项目构建时间减少约 50%

### 依赖关系

**开发模式**：独立开发，通过 npm 版本依赖

```json
// webgeodb-apps/apps/offline-map/package.json
{
  "dependencies": {
    "@webgeodb/core": "latest"  // 使用 npm 发布版本
  }
}
```

**开发流程**：
1. 核心库修改 → 发布新版本到 npm
2. 应用更新依赖 → `pnpm update @webgeodb/core`
3. 独立开发和测试

### 迁移后的目录结构

#### 核心项目 (webgeodb)

```
webgeodb/
├── packages/
│   └── core/                    # 核心库（保留）
├── examples/
│   ├── tutorial-01/            # 快速入门（保留）
│   ├── tutorial-02/            # 空间查询（保留）
│   ├── tutorial-03/            # 高级特性（保留）
│   ├── tutorial-04/            # 重定向 README
│   ├── tutorial-05/            # 生产配置（保留）
│   └── basic-usage/            # 基础示例（保留）
├── docs/                       # 文档（更新）
├── pnpm-workspace.yaml         # 简化配置
└── turbo.json
```

#### webgeodb-apps

```
webgeodb-apps/
├── apps/
│   ├── offline-map/
│   ├── location-tracking/
│   ├── fitness-tracker/
│   ├── geo-fencing/
│   ├── environmental/
│   └── social-location/
├── shared/
│   ├── types/
│   ├── utils/
│   └── vite.config.ts
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

#### webgeodb-demos

```
webgeodb-demos/
├── spatial-predicates/         # 空间谓词演示
├── offline-tracking/           # 离线追踪演示
├── project-apps/               # 专题应用演示
├── index.html                  # 总索引页
└── README.md
```

### 常见问题

#### Q: 为什么要迁移？

A: 主要原因：
1. 原项目包含 8 个完整应用 + 3 个演示集合，维护复杂度高
2. 每个应用在 CI 中需要独立安装依赖，构建时间长
3. `docs/demos/` 与 `examples/` 内容 100% 重复
4. 部署流程复杂，硬编码了 5 个应用的构建路径

#### Q: 如何更新到最新版本？

A:
```bash
# 在 webgeodb-apps 或 webgeodb-demos 项目中
pnpm update @webgeodb/core
pnpm install
```

#### Q: 旧链接还能访问吗？

A:
- `examples/tutorial-04/` 现在包含重定向 README，指向新仓库
- 在线演示 URL 保持不变：https://webgeodb.github.io/apps/* 和 https://webgeodb.github.io/demos/*

#### Q: 如何贡献代码？

A:
- **核心库**：提交 PR 到 [zhyt1985/webgeodb](https://github.com/zhyt1985/webgeodb)
- **应用**：提交 PR 到 [zhyt1985/webgeodb-apps](https://github.com/zhyt1985/webgeodb-apps)
- **演示**：提交 PR 到 [zhyt1985/webgeodb-demos](https://github.com/zhyt1985/webgeodb-demos)

### 更多信息

- **WebGeoDB 官方文档**：[https://webgeodb.github.io/webgeodb/](https://webgeodb.github.io/webgeodb/)
- **核心项目**：[https://github.com/zhyt1985/webgeodb](https://github.com/zhyt1985/webgeodb)
- **应用集合**：[https://github.com/zhyt1985/webgeodb-apps](https://github.com/zhyt1985/webgeodb-apps)
- **演示集合**：[https://github.com/zhyt1985/webgeodb-demos](https://github.com/zhyt1985/webgeodb-demos)
