# 第4章示例：离线地图与位置追踪

本目录包含第4章"离线地图与位置追踪"的三个完整示例项目。

## 示例列表

### 1. 离线地图应用 (01-offline-map)

演示如何构建一个支持离线使用的地图应用。

**主要功能：**
- Service Worker 配置和管理
- 地图瓦片下载和缓存
- 离线数据存储和查询
- 在线/离线状态检测
- 数据同步到服务器

**技术栈：**
- WebGeoDB
- Leaflet
- Service Worker API
- IndexedDB

**运行方式：**
```bash
cd 01-offline-map
pnpm install
pnpm dev
# 访问 http://localhost:3001
```

**详细文档：** [01-offline-map/README.md](./01-offline-map/README.md)

---

### 2. 实时位置追踪 (02-location-tracking)

演示如何使用 Geolocation API 追踪和记录移动轨迹。

**主要功能：**
- 实时位置获取和显示
- 轨迹记录和存储
- 距离和速度计算
- 轨迹回放
- 历史轨迹管理

**技术栈：**
- WebGeoDB
- Leaflet
- Geolocation API
- Turf.js

**运行方式：**
```bash
cd 02-location-tracking
pnpm install
pnpm dev
# 访问 http://localhost:3002
```

**详细文档：** [02-location-tracking/README.md](./02-location-tracking/README.md)

---

### 3. 户外运动追踪器 (03-fitness-tracker)

演示如何构建一个完整的户外运动追踪应用。

**主要功能：**
- 多种运动类型支持（跑步、骑行、徒步等）
- 运动轨迹记录
- 距离、速度、卡路里计算
- 航点标记
- 数据图表可视化
- 运动历史记录

**技术栈：**
- WebGeoDB
- Leaflet
- Chart.js
- Geolocation API
- Turf.js

**运行方式：**
```bash
cd 03-fitness-tracker
pnpm install
pnpm dev
# 访问 http://localhost:3003
```

**详细文档：** [03-fitness-tracker/README.md](./03-fitness-tracker/README.md)

---

## 学习路径

建议按照以下顺序学习这些示例：

1. **先学习 02-location-tracking**
   - 理解 Geolocation API 的基本用法
   - 学习如何记录和存储位置数据
   - 掌握距离计算和轨迹绘制

2. **再学习 01-offline-map**
   - 理解 Service Worker 的工作原理
   - 学习离线数据缓存策略
   - 掌握 PWA 开发基础

3. **最后学习 03-fitness-tracker**
   - 综合运用前面学到的知识
   - 学习完整应用的设计模式
   - 掌握数据可视化和统计分析

---

## 共同依赖

所有示例都需要以下环境：

- Node.js >= 16.0.0
- pnpm >= 8.0.0
- 现代浏览器（Chrome、Firefox、Safari、Edge）

---

## 项目结构

每个示例都包含以下结构：

```
example-name/
├── index.html              # HTML页面
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript配置
├── vite.config.ts          # Vite构建配置
├── README.md               # 示例说明
└── src/
    ├── main.ts             # 主应用入口
    ├── *.ts                # 功能模块
    └── *.ts                # 工具类
```

---

## 核心概念

### 离线存储

所有示例都使用 IndexedDB 进行本地数据存储：

```typescript
const db = new WebGeoDB({
  name: 'database-name',
  version: 1
});

db.schema({
  features: {
    id: 'string',
    name: 'string',
    geometry: 'geometry',
    properties: 'json'
  }
});

await db.open();
```

### 地理位置获取

使用 Geolocation API 获取位置：

```typescript
navigator.geolocation.watchPosition(
  (position) => {
    const { latitude, longitude } = position.coords;
    // 处理位置更新
  },
  (error) => {
    // 处理错误
  },
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  }
);
```

### 距离计算

使用 Turf.js 计算地理距离：

```typescript
import * as turf from '@turf/turf';

const from = turf.point([lon1, lat1]);
const to = turf.point([lon2, lat2]);
const distance = turf.distance(from, to, { units: 'kilometers' });
```

### 地图可视化

使用 Leaflet 显示地图和轨迹：

```typescript
const map = L.map('map').setView([lat, lng], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

const polyline = L.polyline(coordinates, {
  color: '#4285f4',
  weight: 4
}).addTo(map);
```

---

## 注意事项

### 隐私和权限

1. **位置权限**
   - 所有示例都需要用户授权位置访问
   - 首次使用时会弹出权限请求
   - 可以在浏览器设置中撤销权限

2. **数据隐私**
   - 所有数据存储在本地浏览器
   - 不会上传到远程服务器
   - 清除浏览器数据会丢失所有记录

### 浏览器兼容性

- **Geolocation API** - 所有现代浏览器支持
- **Service Worker** - Chrome、Firefox、Safari、Edge 支持
- **IndexedDB** - 所有现代浏览器支持
- **Leaflet** - 所有现代浏览器支持

### 性能优化

1. **位置更新频率**
   - 不要设置过高的更新频率（建议 1-5 秒）
   - 高频率会消耗更多电量

2. **数据存储**
   - 定期清理过期数据
   - 使用索引加速查询
   - 批量操作减少 I/O

3. **地图渲染**
   - 限制同时显示的点数
   - 使用简化算法
   - 懒加载历史数据

---

## 扩展建议

### 从这些示例出发，你可以：

1. **构建完整的户外应用**
   - 添加路线规划功能
   - 集成天气 API
   - 支持照片和视频标记

2. **开发社交功能**
   - 分享轨迹到社交媒体
   - 实时位置共享
   - 创建和加入活动

3. **增强数据分析**
   - 生成详细的运动报告
   - 显示海拔曲线
   - 分析配速变化

4. **集成健康设备**
   - 连接心率监测器
   - 同步到 Apple Health / Google Fit
   - 设置运动目标和提醒

---

## 相关资源

- [WebGeoDB 文档](../../../README.md)
- [Leaflet 文档](https://leafletjs.com/)
- [Turf.js 文档](https://turfjs.org/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

---

## 故障排除

### 问题：无法获取位置

**解决方案：**
1. 检查浏览器是否授予位置权限
2. 确保设备有 GPS 信号
3. 尝试在室外使用
4. 检查浏览器控制台的错误信息

### 问题：Service Worker 无法注册

**解决方案：**
1. 确保使用 HTTPS 或 localhost
2. 检查浏览器是否支持 Service Worker
3. 清除浏览器缓存后重试

### 问题：地图不显示

**解决方案：**
1. 检查网络连接
2. 确保 Leaflet CSS 和 JS 已加载
3. 检查控制台是否有错误
4. 验证地图容器的高度已设置

---

## 贡献

欢迎提交问题和改进建议！

---

## 许可证

MIT
