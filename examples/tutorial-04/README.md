# 第4章：实际应用场景

> **提示**：本章的完整应用已迁移到独立仓库，便于独立维护和部署。

## 🚀 应用列表

本章包含的 6 个完整应用已迁移至 **[webgeodb/apps](https://github.com/webgeodb/apps)** 仓库：

### 1. 离线地图 PWA (offline-map)
- **在线演示**：[查看 Demo](https://webgeodb.github.io/apps/offline-map/)
- **源码**：[apps/offline-map](https://github.com/webgeodb/apps/tree/main/apps/offline-map)
- **功能**：PWA 离线地图、Service Worker 缓存
- **技术**：Vite + Leaflet

### 2. 实时位置追踪 (location-tracking)
- **在线演示**：[查看 Demo](https://webgeodb.github.io/apps/location-tracking/)
- **源码**：[apps/location-tracking](https://github.com/webgeodb/apps/tree/main/apps/location-tracking)
- **功能**：Geolocation API、轨迹回放
- **技术**：Vite + Leaflet

### 3. 运动追踪器 (fitness-tracker)
- **在线演示**：[查看 Demo](https://webgeodb.github.io/apps/fitness-tracker/)
- **源码**：[apps/fitness-tracker](https://github.com/webgeodb/apps/tree/main/apps/fitness-tracker)
- **功能**：运动轨迹、速度计算、统计图表
- **技术**：Vite + Leaflet

### 4. 地理围栏营销系统 (geo-fencing)
- **在线演示**：[查看 Demo](https://webgeodb.github.io/apps/geo-fencing/)
- **源码**：[apps/geo-fencing](https://github.com/webgeodb/apps/tree/main/apps/geo-fencing)
- **功能**：地理围栏、实时位置检测、营销推送
- **技术**：Vite + 自定义地图

### 5. 环境监测平台 (environmental)
- **在线演示**：[查看 Demo](https://webgeodb.github.io/apps/environmental/)
- **源码**：[apps/environmental](https://github.com/webgeodb/apps/tree/main/apps/environmental)
- **功能**：空气质量监测、时空数据可视化
- **技术**：Vite + 数据可视化

### 6. 社交位置共享 (social-location)
- **在线演示**：[查看 Demo](https://webgeodb.github.io/apps/social-location/)
- **源码**：[apps/social-location](https://github.com/webgeodb/apps/tree/main/apps/social-location)
- **功能**：隐私保护的位置社交、实时位置共享
- **技术**：Vite + 社交功能

## 📦 本地运行

### 克隆应用仓库

```bash
git clone https://github.com/webgeodb/apps.git
cd apps
```

### 安装依赖

```bash
pnpm install
```

### 运行指定应用

```bash
# 开发模式
pnpm --filter offline-map dev
pnpm --filter location-tracking dev
pnpm --filter fitness-tracker dev
pnpm --filter geo-fencing dev
pnpm --filter environmental dev
pnpm --filter social-location dev

# 构建预览
pnpm --filter offline-map build
pnpm --filter offline-map preview
```

### 构建所有应用

```bash
pnpm build
```

## 🔗 相关链接

- **应用仓库**：[github.com/webgeodb/apps](https://github.com/webgeodb/apps)
- **核心文档**：[WebGeoDB 文档](https://webgeodb.github.io/webgeodb/)
- **演示集合**：[WebGeoDB Demos](https://github.com/webgeodb/demos)

## 📚 学习路径

建议按以下顺序学习：

1. **第 1 章**：快速入门 - [tutorial-01](../tutorial-01/)
2. **第 2 章**：空间查询基础 - [tutorial-02](../tutorial-02/)
3. **第 3 章**：高级特性 - [tutorial-03](../tutorial-03/)
4. **第 4 章**：实际应用场景 - [webgeodb/apps](https://github.com/webgeodb/apps) 📍
5. **第 5 章**：生产环境配置 - [tutorial-05](../tutorial-05/)

## ❓ 为什么要迁移？

将完整应用迁移到独立仓库有以下好处：

- ✅ **降低维护复杂度**：核心项目专注于核心库和教程
- ✅ **独立版本管理**：应用可以有独立的发布周期
- ✅ **简化 CI/CD**：各仓库独立构建和部署
- ✅ **便于社区贡献**：降低贡献门槛

## 📝 迁移时间线

- **2025-03-17**：应用迁移到独立仓库
- 原 `examples/tutorial-04/` 和 `examples/projects/` 已删除

---

**更多信息请访问**：[WebGeoDB 官方文档](https://webgeodb.github.io/webgeodb/)
