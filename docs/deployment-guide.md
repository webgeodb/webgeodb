# WebGeoDB GitHub Pages 部署指南

本文档说明如何将 WebGeoDB 示例部署到 GitHub Pages。

## 🎯 部署目标

访问地址：`https://zhyt1985.github.io/webgeodb/`

### 部署内容

1. **纯静态演示**（3个）
   - 空间谓词演示：`/demos/spatial/`
   - 离线地图演示：`/demos/offline/`
   - 专题应用演示：`/demos/projects/`

2. **Vite 应用**（5个）
   - 离线地图应用：`/apps/offline-map/`
   - 位置追踪：`/apps/location-tracking/`
   - 健身追踪：`/apps/fitness-tracker/`
   - 地理围栏：`/apps/geo-fencing/`
   - 环境监测：`/apps/environmental/`

## 📋 部署方式

### 方式一：使用 /docs 目录（静态演示，最简单）

**适用场景**：只部署纯静态演示，不构建 Vite 应用

**步骤**：

1. 在 GitHub 仓库设置中：
   - 进入 **Settings** → **Pages**
   - **Source** 选择 **Deploy from a branch**
   - **Branch** 选择 `main`，目录选择 `/docs`
   - 点击 **Save**

2. 运行部署脚本：
   ```bash
   ./scripts/deploy-demos.sh
   ```

3. 提交并推送：
   ```bash
   git add docs
   git commit -m "feat: 添加 GitHub Pages 静态演示"
   git push origin main
   ```

### 方式二：使用 GitHub Actions（完整部署，推荐）

**适用场景**：自动构建 Vite 应用并部署

**步骤**：

1. 在 GitHub 仓库设置中：
   - 进入 **Settings** → **Pages**
   - **Source** 选择 **GitHub Actions**
   - 点击 **Save**

2. 提交并推送（工作流已配置）：
   ```bash
   git add .
   git commit -m "feat: 配置 GitHub Pages 自动部署"
   git push origin main
   ```

3. GitHub Actions 会自动：
   - 安装依赖
   - 构建核心包
   - 构建 5 个 Vite 应用
   - 复制静态演示
   - 部署到 GitHub Pages

## 🧪 本地测试

### 测试静态演示

```bash
python3 -m http.server 8000 --directory docs
# 访问 http://localhost:8000
```

### 测试完整部署

```bash
# 运行完整部署脚本
./scripts/deploy-full.sh

# 启动本地服务器
python3 -m http.server 8000 --directory dist
# 访问 http://localhost:8000
```

### 测试单个 Vite 应用

```bash
cd examples/tutorial-04/02-location-tracking
pnpm dev
# 访问 http://localhost:3002
```

## 📝 关键文件

### 需要创建的文件

- `/docs/index.html` - 主入口导航页
- `/.github/workflows/deploy.yml` - GitHub Actions 工作流
- `/scripts/deploy-demos.sh` - 静态演示部署脚本
- `/scripts/deploy-full.sh` - 完整部署脚本

### 需要修改的文件

所有 Vite 应用的 `vite.config.ts` 已添加 `base: '/webgeodb/.../'` 配置：

- `examples/tutorial-04/01-offline-map/vite.config.ts`
- `examples/tutorial-04/02-location-tracking/vite.config.ts`
- `examples/tutorial-04/03-fitness-tracker/vite.config.ts`
- `examples/projects/geo-fencing/vite.config.ts`
- `examples/projects/environmental-monitoring/vite.config.ts`

## ⚠️ 注意事项

1. **路径配置**：Vite 应用的 `base` 路径必须与仓库名匹配
2. **HTTPS 要求**：地理位置 API 需要 HTTPS，GitHub Pages 自动提供
3. **构建时间**：首次部署可能需要 5-10 分钟
4. **缓存问题**：更新后可能需要强制刷新（Ctrl+Shift+R）

## 🚀 部署验证

1. 访问 `https://zhyt1985.github.io/webgeodb/`
2. 检查导航页面是否正常显示
3. 逐个测试演示和应用链接
4. 使用浏览器开发者工具检查网络请求和错误

## 📊 部署结构

```
webgeodb/
├── docs/                     # 静态部署方式使用
│   ├── index.html            # 主入口页面
│   └── demos/                # 纯静态演示
│       ├── spatial/
│       ├── offline/
│       └── projects/
├── .github/workflows/
│   └── deploy.yml            # GitHub Actions 工作流
└── scripts/
    ├── deploy-demos.sh       # 静态演示部署脚本
    └── deploy-full.sh        # 完整部署脚本
```

## 🔧 故障排查

### 构建失败

1. 检查 Node.js 版本（需要 18+）
2. 检查 pnpm 版本（需要 8+）
3. 运行 `pnpm install` 重新安装依赖
4. 查看构建错误日志

### 页面 404

1. 检查 GitHub Pages 设置是否正确
2. 检查分支和目录配置
3. 等待几分钟让 GitHub 完成部署
4. 查看Actions 页面确认部署状态

### 资源加载失败

1. 检查 Vite 配置中的 `base` 路径
2. 检查构建产物中的资源路径
3. 使用浏览器开发者工具查看网络请求

## 📚 相关资源

- [GitHub Pages 文档](https://docs.github.com/en/pages)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html)
- [WebGeoDB 教程](https://github.com/zhyt1985/webgeodb/blob/main/docs/README.md)
