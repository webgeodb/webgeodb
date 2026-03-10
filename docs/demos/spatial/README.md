# 空间谓词可视化演示

这是一个交互式的空间谓词可视化演示，展示WebGeoDB教程第2章中的8个OGC标准空间谓词。

## 功能特点

- 🎯 **8个空间谓词**：Intersects, Contains, Within, Touches, Crosses, Overlaps, Disjoint, Equals
- 🗺️ **交互式地图**：使用Leaflet地图库进行可视化
- 🎲 **随机生成**：可以随机生成不同的几何体组合
- ▶️ **动画演示**：通过动画展示谓词的动态效果
- 📊 **实时结果**：实时显示空间查询结果

## 如何使用

### 在线演示

直接打开 `index.html` 文件即可在浏览器中运行演示。

### 本地运行

1. 克隆或下载WebGeoDB仓库
2. 导航到演示目录：
   ```bash
   cd examples/tutorial-02/demos
   ```
3. 使用任意HTTP服务器运行：
   ```bash
   # 使用Python
   python -m http.server 8000

   # 或使用Node.js
   npx serve
   ```
4. 在浏览器中访问 `http://localhost:8000`

## 界面说明

### 左侧面板

**谓词选择器**：
- 点击任意谓词按钮切换当前谓词
- 每个按钮包含图标、英文名称和中文说明

**信息面板**：
- 显示当前谓词的详细说明
- 实时显示查询结果（true/false）

### 地图区域

**控制按钮**：
- 🔄 **重置**：重置地图到初始状态
- 🎲 **随机**：随机生成新的几何体组合
- ▶️ **动画**：启动/暂停动画演示

**地图图例**：
- 蓝色：对象A
- 红色：对象B
- 半透明蓝色：相交区域

## 技术实现

### 使用的库

- **Leaflet**：开源地图库
- **Turf.js**：地理空间分析库
- **纯JavaScript**：无需构建工具

### 核心功能

```javascript
// 测试空间谓词
const predicates = {
    intersects: (geomA, geomB) => turf.booleanIntersects(geomA, geomB),
    contains: (geomA, geomB) => turf.booleanContains(geomA, geomB),
    within: (geomA, geomB) => turf.booleanWithin(geomA, geomB),
    // ... 其他谓词
};

// 计算相交区域
const intersection = turf.intersect(geomA, geomB);

// 可视化
L.polygon(coordinates, {
    color: '#4285f4',
    fillColor: '#4285f4',
    fillOpacity: 0.3
}).addTo(map);
```

## 谓词详解

### 1. Intersects (相交)
判断两个几何体是否相交或接触。这是最常用的空间谓词。

**应用场景**：
- 查找与某个区域相交的所有对象
- 空间关系判断
- 地理围栏检测

### 2. Contains (包含)
判断几何体A是否完全包含几何体B。

**应用场景**：
- 区域内对象查询
- 包含关系验证
- 空间归属判断

### 3. Within (在内部)
判断几何体A是否完全在几何体B的内部。这是Contains的反向操作。

**应用场景**：
- 点在多边形内判断
- 位置服务
- 区域查询

### 4. Touches (相接)
判断两个几何体是否相接但不相交。

**应用场景**：
- 边界检测
- 相邻区域查询
- 边界共享验证

### 5. Crosses (交叉)
判断两个几何体是否交叉。

**应用场景**：
- 路径交叉检测
- 线与面的交叉查询
- 网络分析

### 6. Overlaps (重叠)
判断两个几何体是否重叠。

**应用场景**：
- 区域重叠检测
- 数据冲突检查
- 空间分析

### 7. Disjoint (分离)
判断两个几何体是否完全分离。这是Intersects的反向操作。

**应用场景**：
- 分离区域查询
- 空间排除
- 冲突检测

### 8. Equals (相等)
判断两个几何体是否在几何上相等。

**应用场景**：
- 几何体比较
- 数据一致性检查
- 版本对比

## 教程链接

- [第2章教程](../../docs/tutorials/zh/chapter-02-spatial-queries.md)
- [查询构建器API](../../docs/api/query-builder.md)
- [返回示例](../)

## 许可证

MIT

## 贡献

欢迎提交问题和改进建议！

---

**WebGeoDB** - 让Web地理数据管理更简单 🌍
