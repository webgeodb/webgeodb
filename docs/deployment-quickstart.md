# WebGeoDB GitHub Pages 快速部署

## 🚀 一键部署（推荐）

### 1️⃣ 配置 GitHub Pages

在 GitHub 仓库中：
1. 进入 **Settings** → **Pages**
2. **Source** 选择 **GitHub Actions**
3. 点击 **Save**

### 2️⃣ 提交并推送

```bash
# 添加所有文件
git add .

# 提交更改
git commit -m "feat: 配置 GitHub Pages 自动部署"

# 推送到远程仓库
git push origin main
```

### 3️⃣ 等待部署完成

1. 访问仓库的 **Actions** 页面查看部署进度
2. 等待 5-10 分钟让 GitHub Actions 完成构建和部署
3. 访问 `https://zhyt1985.github.io/webgeodb/` 查看结果

---

## 📦 部署内容

### 静态演示（3个）
- 🎯 空间谓词演示：8个空间关系判断
- 🗺️ 离线地图演示：离线地图 + 位置追踪
- 🏢 专题应用演示：5个完整的行业应用

### Vite 应用（5个）
- 📍 离线地图应用
- 🛤️ 位置追踪
- 🏃 健身追踪
- 🎯 地理围栏
- 🌳 环境监测

---

## 🧪 本地测试

```bash
# 测试静态演示
python3 -m http.server 8000 --directory docs
# 访问 http://localhost:8000

# 测试完整部署（包含 Vite 应用构建）
./scripts/deploy-full.sh
python3 -m http.server 8000 --directory dist
# 访问 http://localhost:8000
```

---

## ⚙️ 两种部署方式

### 方式一：仅静态演示（最简单）

```bash
# 使用 /docs 目录部署
# 在 GitHub Pages 设置中选择：Branch: main, Directory: /docs
./scripts/deploy-demos.sh
git add docs && git commit -m "feat: 添加静态演示" && git push
```

### 方式二：完整部署（自动构建 Vite 应用）

```bash
# 使用 GitHub Actions 部署
# 在 GitHub Pages 设置中选择：GitHub Actions
git add . && git commit -m "feat: 配置自动部署" && git push
```

---

## 📋 文件清单

### 新增文件
- ✅ `/docs/index.html` - 主入口导航页
- ✅ `/docs/deployment-guide.md` - 详细部署指南
- ✅ `/.github/workflows/deploy.yml` - GitHub Actions 工作流
- ✅ `/scripts/deploy-demos.sh` - 静态演示部署脚本
- ✅ `/scripts/deploy-full.sh` - 完整部署脚本

### 修改文件
- ✅ 所有 Vite 应用的 `vite.config.ts` 添加 `base` 路径配置

---

## ✨ 部署后访问

- **主页**：`https://zhyt1985.github.io/webgeodb/`
- **空间谓词**：`https://zhyt1985.github.io/webgeodb/demos/spatial/`
- **离线地图**：`https://zhyt1985.github.io/webgeodb/demos/offline/`
- **位置追踪**：`https://zhyt1985.github.io/webgeodb/apps/location-tracking/`
- **其他应用**：查看主页导航

---

## 🔍 故障排查

### 部署失败？
- 检查 Node.js 版本（需要 18+）
- 检查 pnpm 版本（需要 8+）
- 查看 Actions 页面的错误日志

### 页面 404？
- 等待几分钟让 GitHub 完成部署
- 检查 GitHub Pages 设置是否正确
- 查看 Actions 页面确认部署状态

### 资源加载失败？
- 检查浏览器控制台的网络请求
- 确认 Vite 配置中的 `base` 路径正确
- 尝试强制刷新页面（Ctrl+Shift+R）

---

## 📚 更多信息

详细部署指南请查看：[deployment-guide.md](./deployment-guide.md)

项目主页：https://github.com/zhyt1985/webgeodb
