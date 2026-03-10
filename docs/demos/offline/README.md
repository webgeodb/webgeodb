# 离线地图与位置追踪演示

这是一个交互式的离线地图与位置追踪演示，展示WebGeoDB教程第4章中的PWA应用和实时位置服务。

## 演示内容

本演示包含三个完整的交互式示例：

### 1. 🗺️ 离线地图演示

展示如何构建支持离线使用的地图应用。

**功能特点：**
- Service Worker 离线支持
- 地图瓦片本地缓存
- 在线/离线状态检测
- IndexedDB 数据存储
- 模拟地图下载和缓存管理

**技术要点：**
- 使用 Service Worker API 拦截网络请求
- 实现地图瓦片的本地缓存策略
- 监听在线/离线状态变化
- 计算和管理缓存大小

### 2. 📍 位置追踪演示

演示如何使用 Geolocation API 追踪移动轨迹。

**功能特点：**
- 实时位置获取和显示
- 轨迹记录和可视化
- 距离和速度计算
- 实时统计数据更新
- 轨迹管理功能

**技术要点：**
- 使用 `navigator.geolocation.watchPosition()` 持续获取位置
- 使用 Turf.js 计算地理距离
- 在地图上绘制移动轨迹
- 实时更新速度和距离统计

### 3. 🏃 运动追踪演示

展示完整的户外运动追踪应用。

**功能特点：**
- 多种运动类型支持（跑步、骑行、步行、徒步）
- 运动数据记录和统计
- 航点标记功能
- 卡路里和配速计算
- 完整的运动历史记录

**技术要点：**
- 不同运动类型的速度模型
- 运动数据的实时计算
- 航点的添加和管理
- 配速和消耗计算

## 如何使用

### 在线演示

直接打开 `index.html` 文件即可在浏览器中运行演示。

### 本地运行

1. 克隆或下载WebGeoDB仓库
2. 导航到演示目录：
   ```bash
   cd examples/tutorial-04/demos
   ```
3. 使用HTTP服务器运行：
   ```bash
   # 使用Python
   python -m http.server 8000

   # 或使用Node.js
   npx serve
   ```
4. 在浏览器中访问 `http://localhost:8000`

**注意：** 某些功能（如地理位置）在非HTTPS环境下可能受限，建议使用 `localhost` 或 HTTPS 环境。

## 界面说明

### 导航栏

顶部有三个切换按钮，分别对应三个演示：
- 🗺️ 离线地图
- 📍 位置追踪
- 🏃 运动追踪

### 离线地图界面

**状态指示器：**
- 绿色圆点：在线状态
- 红色圆点：离线状态
- 缓存大小显示

**控制按钮：**
- 📥 下载地图：模拟下载地图瓦片到本地
- 🗑️ 清除缓存：清除所有缓存数据
- 🔀 切换离线：切换到离线模式

### 位置追踪界面

**信息显示：**
- 当前位置坐标
- 总距离统计

**控制按钮：**
- ▶️ 开始追踪：开始记录位置轨迹
- ⏸️ 停止追踪：停止记录
- 🗑️ 清除轨迹：清除所有轨迹数据

**统计面板：**
- ⏱️ 追踪时间
- 📏 移动距离
- ⚡ 当前速度
- 📍 记录点数

### 运动追踪界面

**运动类型选择：**
- 🏃 跑步
- 🚴 骑行
- 🚶 步行
- 🥾 徒步

**控制按钮：**
- ▶️ 开始运动：开始记录运动
- ⏸️ 结束运动：停止记录并显示总结
- 📍 添加航点：在当前位置添加标记

**统计卡片：**
- 🔥 消耗卡路里
- 📏 运动距离
- ⏱️ 运动时长
- 💨 平均配速

**航点列表：**
- 显示所有添加的航点
- 包含名称、坐标和时间

## 技术实现

### 使用的库

- **Leaflet**：开源地图库
- **Turf.js**：地理空间分析库
- **纯JavaScript**：无需构建工具

### 核心功能代码示例

#### 离线状态检测

```javascript
// 监听在线/离线状态
window.addEventListener('online', () => {
    updateOnlineStatus(true);
});

window.addEventListener('offline', () => {
    updateOnlineStatus(false);
});
```

#### 位置追踪

```javascript
// 使用 Geolocation API 追踪位置
navigator.geolocation.watchPosition(
    (position) => {
        const { latitude, longitude } = position.coords;
        // 更新轨迹
        trackData.push({ lat: latitude, lng: longitude });
        updateMap();
        calculateStats();
    },
    (error) => {
        console.error('位置获取失败:', error);
    },
    {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    }
);
```

#### 距离计算

```javascript
// 使用 Turf.js 计算距离
const from = turf.point([lng1, lat1]);
const to = turf.point([lng2, lat2]);
const distance = turf.distance(from, to, { units: 'kilometers' });
```

#### 轨迹绘制

```javascript
// 在地图上绘制轨迹
const polyline = L.polyline(coordinates, {
    color: '#4285f4',
    weight: 4,
    opacity: 0.8
}).addTo(map);
```

## 实际应用场景

### 1. 离线地图应用

**适用场景：**
- 户外探险应用
- 旅行导航应用
- 应急响应系统
- 网络不稳定地区

**优势：**
- 无需网络连接即可使用
- 加载速度快
- 节省流量
- 提升用户体验

### 2. 位置追踪应用

**适用场景：**
- 健身追踪应用
- 物流配送追踪
- 家庭定位服务
- 员工考勤系统

**优势：**
- 实时位置更新
- 精确的轨迹记录
- 详细的统计分析
- 历史数据回放

### 3. 运动追踪应用

**适用场景：**
- 跑步和骑行应用
- 户外运动记录
- 健身数据管理
- 运动社交平台

**优势：**
- 多种运动类型支持
- 准确的数据计算
- 航点标记功能
- 完整的运动报告

## 教程链接

- [第4章教程](../../docs/tutorials/zh/chapter-04-offline-tracking.md)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [返回示例](../)

## 注意事项

### 浏览器兼容性

- **Geolocation API**：所有现代浏览器支持
- **Service Worker**：Chrome、Firefox、Safari、Edge 支持
- **IndexedDB**：所有现代浏览器支持

### 隐私和权限

1. **位置权限**
   - 首次使用时会请求位置访问权限
   - 用户可以随时撤销权限
   - 数据仅存储在本地浏览器

2. **数据隐私**
   - 所有数据存储在本地 IndexedDB
   - 不会上传到远程服务器
   - 清除浏览器数据会丢失所有记录

### 性能优化

1. **位置更新频率**
   - 演示中设置为2秒更新一次
   - 实际应用建议1-5秒
   - 过高频率会增加电量消耗

2. **数据存储**
   - 定期清理过期数据
   - 使用索引加速查询
   - 批量操作减少 I/O

3. **地图渲染**
   - 限制同时显示的点数
   - 使用轨迹简化算法
   - 懒加载历史数据

## 扩展建议

### 从这些演示出发，你可以：

1. **构建完整的户外应用**
   - 添加路线规划功能
   - 集成天气 API
   - 支持照片和视频标记
   - 添加海拔和速度曲线

2. **开发社交功能**
   - 分享轨迹到社交媒体
   - 实时位置共享
   - 创建和加入活动
   - 运动数据对比

3. **增强数据分析**
   - 生成详细的运动报告
   - 显示海拔曲线
   - 分析配速变化
   - 提供训练建议

4. **集成健康设备**
   - 连接心率监测器
   - 同步到 Apple Health / Google Fit
   - 设置运动目标和提醒
   - 健康数据分析

## 相关资源

- [WebGeoDB 文档](https://github.com/zhyt1985/webgeodb)
- [Leaflet 文档](https://leafletjs.com/)
- [Turf.js 文档](https://turfjs.org/)
- [PWA 文档](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

## 许可证

MIT

## 贡献

欢迎提交问题和改进建议！

---

**WebGeoDB** - 让Web地理数据管理更简单 🌍
