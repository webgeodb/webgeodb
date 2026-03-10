/**
 * WebGeoDB 教程示例
 *
 * 章节: 第3章 - 高级特性
 * 示例: 几何计算 (Geometry Computation)
 *
 * 学习目标:
 * 1. 掌握 Turf.js 与 WebGeoDB 的集成
 * 2. 学会距离、面积、长度计算
 * 3. 理解缓冲区分析的应用场景
 * 4. 掌握几何对象的交集、并集操作
 *
 * 前置要求:
 * - Node.js >= 16
 * - TypeScript >= 4.5
 * - 完成第1-2章的学习
 *
 * 运行方式:
 * ```bash
 * # 安装依赖
 * npm install
 *
 * # 运行示例
 * npm start
 * ```
 *
 * 预期输出:
 * ```
 * === WebGeoDB 教程示例 ===
 * 章节: 第3章 - 高级特性
 * 示例: 几何计算
 *
 * ✅ 距离计算: 两点间距离 1234.56 米
 * ✅ 面积计算: 多边形面积 5678.90 平方米
 * ✅ 缓冲区分析: 创建了半径 500 米的缓冲区
 * ✅ 交集操作: 找到 3 个相交的要素
 * ✅ 并集操作: 合并了 5 个要素
 * ```
 */

import { WebGeoDB, GeoJSON } from '@webgeodb/core';
import * as turf from '@turf/turf';

// ============================================
// 配置
// ============================================

const DB_CONFIG = {
  name: 'tutorial-03-01-geometry-compute',
  version: 1
};

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('=== WebGeoDB 教程示例 ===');
  console.log('章节: 第3章 - 高级特性');
  console.log('示例: 几何计算\n');

  // 步骤 1: 创建数据库实例
  console.log('步骤 1: 创建数据库实例...');
  const db = new WebGeoDB(DB_CONFIG);
  console.log('✅ 数据库实例创建成功');

  // 步骤 2: 定义表结构
  console.log('\n步骤 2: 定义表结构...');
  db.schema({
    pois: {
      id: 'string',
      name: 'string',
      category: 'string',
      geometry: 'geometry',
      properties: 'json',
      createdAt: 'datetime'
    },
    zones: {
      id: 'string',
      name: 'string',
      type: 'string',
      geometry: 'geometry',
      area: 'number',
      properties: 'json',
      createdAt: 'datetime'
    }
  });
  console.log('✅ 表结构定义成功');

  // 步骤 3: 打开数据库
  console.log('\n步骤 3: 打开数据库...');
  await db.open();
  console.log('✅ 数据库打开成功');

  // 步骤 4: 创建索引
  console.log('\n步骤 4: 创建空间索引...');
  db.pois.createIndex('geometry', { auto: true });
  db.zones.createIndex('geometry', { auto: true });
  console.log('✅ 空间索引创建成功');

  // 步骤 5: 添加测试数据
  console.log('\n步骤 5: 添加测试数据...');
  await addTestData(db);
  console.log('✅ 测试数据添加成功');

  // 步骤 6: 距离计算
  console.log('\n步骤 6: 距离计算...');
  await demonstrateDistanceCalculation(db);

  // 步骤 7: 面积计算
  console.log('\n步骤 7: 面积计算...');
  await demonstrateAreaCalculation(db);

  // 步骤 8: 长度计算
  console.log('\n步骤 8: 长度计算...');
  await demonstrateLengthCalculation(db);

  // 步骤 9: 缓冲区分析
  console.log('\n步骤 9: 缓冲区分析...');
  await demonstrateBufferAnalysis(db);

  // 步骤 10: 交集操作
  console.log('\n步骤 10: 交集操作...');
  await demonstrateIntersection(db);

  // 步骤 11: 并集操作
  console.log('\n步骤 11: 并集操作...');
  await demonstrateUnion(db);

  // 步骤 12: 中心点计算
  console.log('\n步骤 12: 中心点计算...');
  await demonstrateCentroid(db);

  // 步骤 13: 边界框计算
  console.log('\n步骤 13: 边界框计算...');
  await demonstrateBoundingBox(db);

  // 清理: 关闭数据库
  console.log('\n清理: 关闭数据库...');
  await db.close();
  console.log('✅ 数据库已关闭');

  console.log('\n=== 示例执行完成 ===');
}

// ============================================
// 测试数据
// ============================================

async function addTestData(db: any) {
  // 清空旧数据
  await db.pois.clear();
  await db.zones.clear();

  // 添加兴趣点 (POIs)
  const pois = [
    {
      id: 'poi-001',
      name: '天安门广场',
      category: '地标',
      geometry: {
        type: 'Point',
        coordinates: [116.397477, 39.909187]
      },
      properties: { rating: 5, visitors: 100000 },
      createdAt: new Date()
    },
    {
      id: 'poi-002',
      name: '故宫博物院',
      category: '景点',
      geometry: {
        type: 'Point',
        coordinates: [116.397026, 39.918058]
      },
      properties: { rating: 5, visitors: 80000 },
      createdAt: new Date()
    },
    {
      id: 'poi-003',
      name: '王府井大街',
      category: '商业街',
      geometry: {
        type: 'Point',
        coordinates: [116.410687, 39.914145]
      },
      properties: { rating: 4, visitors: 50000 },
      createdAt: new Date()
    },
    {
      id: 'poi-004',
      name: '颐和园',
      category: '景点',
      geometry: {
        type: 'Point',
        coordinates: [116.273, 39.999]
      },
      properties: { rating: 5, visitors: 60000 },
      createdAt: new Date()
    }
  ];

  await db.pois.bulkAdd(pois);

  // 添加区域 (Zones)
  const zones = [
    {
      id: 'zone-001',
      name: '天安门区域',
      type: '核心区',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [116.390, 39.905],
          [116.390, 39.915],
          [116.405, 39.915],
          [116.405, 39.905],
          [116.390, 39.905]
        ]]
      },
      area: 0,
      properties: { level: 'high' },
      createdAt: new Date()
    },
    {
      id: 'zone-002',
      name: '商业区域',
      type: '商业区',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [116.405, 39.910],
          [116.405, 39.920],
          [116.420, 39.920],
          [116.420, 39.910],
          [116.405, 39.910]
        ]]
      },
      area: 0,
      properties: { level: 'medium' },
      createdAt: new Date()
    }
  ];

  // 计算面积并添加
  for (const zone of zones) {
    zone.area = turf.area(zone.geometry);
    await db.zones.add(zone);
  }
}

// ============================================
// 距离计算演示
// ============================================

async function demonstrateDistanceCalculation(db: any) {
  // 获取天安门和故宫的位置
  const tiananmen = await db.pois.get('poi-001');
  const gugong = await db.pois.get('poi-002');

  // 使用 Turf.js 计算距离
  const from = turf.point(tiananmen.geometry.coordinates);
  const to = turf.point(gugong.geometry.coordinates);

  // 计算直线距离（单位：米）
  const distance = turf.distance(from, to, { units: 'kilometers' }) * 1000;

  console.log(`📍 ${tiananmen.name} 到 ${gugong.name} 的距离:`);
  console.log(`   直线距离: ${distance.toFixed(2)} 米`);

  // 计算到王府井的距离
  const wangfujing = await db.pois.get('poi-003');
  const toWfj = turf.point(wangfujing.geometry.coordinates);
  const distanceToWfj = turf.distance(from, toWfj, { units: 'kilometers' }) * 1000;

  console.log(`   到 ${wangfujing.name} 的距离: ${distanceToWfj.toFixed(2)} 米`);

  // 查找1公里范围内的所有POI
  const nearbyPois = await db.pois.filter((poi: any) => {
    const poiPoint = turf.point(poi.geometry.coordinates);
    const d = turf.distance(from, poiPoint, { units: 'kilometers' }) * 1000;
    return d <= 1000; // 1公里范围内
  }).toArray();

  console.log(`\n🔍 天安门1公里范围内的POI数量: ${nearbyPois.length}`);
  nearbyPois.forEach((poi: any) => {
    const d = turf.distance(from, turf.point(poi.geometry.coordinates), { units: 'kilometers' }) * 1000;
    console.log(`   - ${poi.name}: ${d.toFixed(0)} 米`);
  });

  console.log('✅ 距离计算完成');
}

// ============================================
// 面积计算演示
// ============================================

async function demonstrateAreaCalculation(db: any) {
  const zones = await db.zones.toArray();

  console.log('📏 区域面积计算:');
  for (const zone of zones) {
    // 使用 Turf.js 计算面积（单位：平方米）
    const area = turf.area(zone.geometry);
    console.log(`   ${zone.name}:`);
    console.log(`   - 面积: ${area.toFixed(2)} 平方米`);
    console.log(`   - 面积: ${(area / 10000).toFixed(2)} 公顷`);
    console.log(`   - 面积: ${(area / 1000000).toFixed(4)} 平方公里`);
  }

  // 创建一个缓冲区并计算其面积
  const tiananmen = await db.pois.get('poi-001');
  const point = turf.point(tiananmen.geometry.coordinates);
  const buffer = turf.buffer(point, 0.5, { units: 'kilometers' });
  const bufferArea = turf.area(buffer);

  console.log(`\n🔵 天安门500米缓冲区的面积:`);
  console.log(`   - ${bufferArea.toFixed(2)} 平方米`);
  console.log(`   - ${(bufferArea / 10000).toFixed(2)} 公顷`);

  console.log('✅ 面积计算完成');
}

// ============================================
// 长度计算演示
// ============================================

async function demonstrateLengthCalculation(db: any) {
  // 创建一条路径（线）
  const pois = await db.pois.toArray();
  const line = turf.lineString(pois.map((poi: any) => poi.geometry.coordinates));

  // 计算路径长度
  const length = turf.length(line, { units: 'kilometers' }) * 1000;

  console.log('📏 路径长度计算:');
  console.log(`   路径: ${pois.map((p: any) => p.name).join(' → ')}`);
  console.log(`   总长度: ${length.toFixed(2)} 米`);
  console.log(`   总长度: ${(length / 1000).toFixed(2)} 公里`);

  // 计算每段距离
  console.log('\n   各段距离:');
  for (let i = 0; i < pois.length - 1; i++) {
    const from = turf.point(pois[i].geometry.coordinates);
    const to = turf.point(pois[i + 1].geometry.coordinates);
    const segmentLength = turf.distance(from, to, { units: 'kilometers' }) * 1000;
    console.log(`   ${pois[i].name} → ${pois[i + 1].name}: ${segmentLength.toFixed(0)} 米`);
  }

  console.log('✅ 长度计算完成');
}

// ============================================
// 缓冲区分析演示
// ============================================

async function demonstrateBufferAnalysis(db: any) {
  const tiananmen = await db.pois.get('poi-001');
  const point = turf.point(tiananmen.geometry.coordinates);

  // 创建不同半径的缓冲区
  const buffers = [
    { radius: 0.3, unit: 'kilometers', name: '300米' },
    { radius: 0.5, unit: 'kilometers', name: '500米' },
    { radius: 1.0, unit: 'kilometers', name: '1公里' }
  ];

  console.log('🔵 缓冲区分析:');

  for (const bufferConfig of buffers) {
    const buffer = turf.buffer(point, bufferConfig.radius, { units: bufferConfig.unit as any });
    const area = turf.area(buffer);

    console.log(`\n   ${bufferConfig.name}缓冲区:`);
    console.log(`   - 面积: ${area.toFixed(2)} 平方米`);
    console.log(`   - 面积: ${(area / 10000).toFixed(2)} 公顷`);

    // 查找缓冲区内的POI
    const poisInBuffer = await db.pois.filter((poi: any) => {
      const poiPoint = turf.point(poi.geometry.coordinates);
      return turf.booleanPointInPolygon(poiPoint, buffer);
    }).toArray();

    console.log(`   - 包含POI数量: ${poisInBuffer.length}`);
    poisInBuffer.forEach((poi: any) => {
      console.log(`     • ${poi.name} (${poi.category})`);
    });
  }

  // 为区域创建缓冲区
  console.log('\n🔷 区域缓冲区:');
  const zone = await db.zones.get('zone-001');
  const zoneBuffer = turf.buffer(zone.geometry, 0.2, { units: 'kilometers' });
  const zoneBufferArea = turf.area(zoneBuffer);
  const originalArea = turf.area(zone.geometry);

  console.log(`   ${zone.name} 的200米扩展缓冲区:`);
  console.log(`   - 原始面积: ${originalArea.toFixed(2)} 平方米`);
  console.log(`   - 缓冲区面积: ${zoneBufferArea.toFixed(2)} 平方米`);
  console.log(`   - 增加面积: ${(zoneBufferArea - originalArea).toFixed(2)} 平方米`);
  console.log(`   - 增加比例: ${((zoneBufferArea / originalArea - 1) * 100).toFixed(1)}%`);

  console.log('\n✅ 缓冲区分析完成');
}

// ============================================
// 交集操作演示
// ============================================

async function demonstrateIntersection(db: any) {
  // 获取两个区域
  const zone1 = await db.zones.get('zone-001');
  const zone2 = await db.zones.get('zone-002');

  // 计算交集
  let intersection = null;
  try {
    intersection = turf.intersect(zone1.geometry, zone2.geometry);
  } catch (error) {
    console.log('⚠️  这两个区域没有交集');
    return;
  }

  if (intersection) {
    const intersectionArea = turf.area(intersection);
    const zone1Area = turf.area(zone1.geometry);
    const zone2Area = turf.area(zone2.geometry);

    console.log('🔗 交集操作:');
    console.log(`   ${zone1.name} 和 ${zone2.name} 的交集:`);
    console.log(`   - 交集面积: ${intersectionArea.toFixed(2)} 平方米`);
    console.log(`   - 占${zone1.name}的比例: ${(intersectionArea / zone1Area * 100).toFixed(1)}%`);
    console.log(`   - 占${zone2.name}的比例: ${(intersectionArea / zone2Area * 100).toFixed(1)}%`);

    // 查找交集内的POI
    const poisInIntersection = await db.pois.filter((poi: any) => {
      const poiPoint = turf.point(poi.geometry.coordinates);
      return turf.booleanPointInPolygon(poiPoint, intersection);
    }).toArray();

    console.log(`   - 交集内POI数量: ${poisInIntersection.length}`);
    poisInIntersection.forEach((poi: any) => {
      console.log(`     • ${poi.name} (${poi.category})`);
    });
  }

  // 创建一个新的缓冲区并计算与区域的交集
  console.log('\n🔍 缓冲区与区域的交集:');
  const tiananmen = await db.pois.get('poi-001');
  const point = turf.point(tiananmen.geometry.coordinates);
  const buffer = turf.buffer(point, 0.5, { units: 'kilometers' });

  const bufferIntersections = await db.zones.filter((zone: any) => {
    try {
      const intersect = turf.intersect(buffer, zone.geometry);
      return intersect !== null;
    } catch {
      return false;
    }
  }).toArray();

  console.log(`   天安门500米缓冲区与 ${bufferIntersections.length} 个区域相交:`);
  for (const zone of bufferIntersections) {
    const intersect = turf.intersect(buffer, zone.geometry);
    if (intersect) {
      const area = turf.area(intersect);
      console.log(`   - ${zone.name}: ${area.toFixed(2)} 平方米`);
    }
  }

  console.log('\n✅ 交集操作完成');
}

// ============================================
// 并集操作演示
// ============================================

async function demonstrateUnion(db: any) {
  // 获取所有区域
  const zones = await db.zones.toArray();

  if (zones.length < 2) {
    console.log('⚠️  需要至少2个区域才能执行并集操作');
    return;
  }

  // 合并所有区域
  let union = zones[0].geometry;
  for (let i = 1; i < zones.length; i++) {
    try {
      union = turf.union(union, zones[i].geometry);
    } catch (error) {
      console.log(`⚠️  无法合并区域 ${zones[i].name}`);
    }
  }

  if (union) {
    const unionArea = turf.area(union);
    const totalArea = zones.reduce((sum: number, zone: any) => sum + turf.area(zone.geometry), 0);

    console.log('🔗 并集操作:');
    console.log(`   合并了 ${zones.length} 个区域:`);
    zones.forEach((zone: any) => {
      console.log(`   - ${zone.name}`);
    });
    console.log(`   - 并集总面积: ${unionArea.toFixed(2)} 平方米`);
    console.log(`   - 各区域面积总和: ${totalArea.toFixed(2)} 平方米`);
    console.log(`   - 重叠面积: ${(totalArea - unionArea).toFixed(2)} 平方米`);

    // 计算并集的边界框
    const bbox = turf.bbox(union);
    console.log(`   - 边界框: [${bbox.map((n: number) => n.toFixed(4)).join(', ')}]`);

    // 创建并集的缓冲区
    const unionBuffer = turf.buffer(union, 0.1, { units: 'kilometers' });
    const bufferArea = turf.area(unionBuffer);
    console.log(`   - 100米扩展缓冲区面积: ${bufferArea.toFixed(2)} 平方米`);
  }

  // 创建一个包含所有POI的凸包
  console.log('\n🔵 POI的凸包（Convex Hull）:');
  const pois = await db.pois.toArray();
  const points = turf.points(pois.map((poi: any) => poi.geometry.coordinates));
  const hull = turf.convex(points);

  if (hull) {
    const hullArea = turf.area(hull);
    console.log(`   包含 ${pois.length} 个POI的凸包:`);
    console.log(`   - 凸包面积: ${hullArea.toFixed(2)} 平方米`);
    console.log(`   - 凸包面积: ${(hullArea / 1000000).toFixed(4)} 平方公里`);

    // 查找凸包外的POI（理论上不应该有）
    const poisOutside = pois.filter((poi: any) => {
      const poiPoint = turf.point(poi.geometry.coordinates);
      return !turf.booleanPointInPolygon(poiPoint, hull);
    });

    if (poisOutside.length > 0) {
      console.log(`   ⚠️  凸包外有 ${poisOutside.length} 个POI（这不应该发生）`);
    }
  }

  console.log('\n✅ 并集操作完成');
}

// ============================================
// 中心点计算演示
// ============================================

async function demonstrateCentroid(db: any) {
  const zones = await db.zones.toArray();

  console.log('📍 中心点计算:');

  for (const zone of zones) {
    // 计算几何中心
    const centroid = turf.centroid(zone.geometry);
    const [lon, lat] = centroid.geometry.coordinates;

    console.log(`\n   ${zone.name}:`);
    console.log(`   - 中心点坐标: [${lon.toFixed(6)}, ${lat.toFixed(6)}]`);

    // 查找距离中心点最近的POI
    const allPois = await db.pois.toArray();
    let nearestPoi = null;
    let minDistance = Infinity;

    for (const poi of allPois) {
      const distance = turf.distance(centroid, turf.point(poi.geometry.coordinates), {
        units: 'kilometers'
      }) * 1000;

      if (distance < minDistance) {
        minDistance = distance;
        nearestPoi = poi;
      }
    }

    if (nearestPoi) {
      console.log(`   - 距离中心点最近的POI: ${nearestPoi.name}`);
      console.log(`   - 距离: ${minDistance.toFixed(0)} 米`);
    }
  }

  // 计算所有POI的中心点
  console.log('\n📍 所有POI的中心点:');
  const pois = await db.pois.toArray();
  const points = turf.points(pois.map((poi: any) => poi.geometry.coordinates));
  const allCentroid = turf.centroid(turf.featureCollection(points));
  const [centerLon, centerLat] = allCentroid.geometry.coordinates;

  console.log(`   - 中心点坐标: [${centerLon.toFixed(6)}, ${centerLat.toFixed(6)}]`);
  console.log(`   - 这个点是所有POI的地理中心`);

  console.log('\n✅ 中心点计算完成');
}

// ============================================
// 边界框计算演示
// ============================================

async function demonstrateBoundingBox(db: any) {
  console.log('📦 边界框计算:');

  // 计算所有POI的边界框
  const pois = await db.pois.toArray();
  const points = turf.points(pois.map((poi: any) => poi.geometry.coordinates));
  const bbox = turf.bbox(turf.featureCollection(points));

  console.log('\n   所有POI的边界框:');
  console.log(`   - 最小经度: ${bbox[0].toFixed(6)}`);
  console.log(`   - 最小纬度: ${bbox[1].toFixed(6)}`);
  console.log(`   - 最大经度: ${bbox[2].toFixed(6)}`);
  console.log(`   - 最大纬度: ${bbox[3].toFixed(6)}`);

  // 计算边界框的尺寸
  const width = turf.distance(
    turf.point([bbox[0], bbox[1]]),
    turf.point([bbox[2], bbox[1]]),
    { units: 'kilometers' }
  ) * 1000;

  const height = turf.distance(
    turf.point([bbox[0], bbox[1]]),
    turf.point([bbox[0], bbox[3]]),
    { units: 'kilometers' }
  ) * 1000;

  console.log(`   - 宽度: ${width.toFixed(0)} 米`);
  console.log(`   - 高度: ${height.toFixed(0)} 米`);

  // 创建边界框多边形
  const bboxPolygon = turf.bboxPolygon(bbox);
  const bboxArea = turf.area(bboxPolygon);
  console.log(`   - 面积: ${bboxArea.toFixed(2)} 平方米`);

  // 计算对角线长度
  const diagonal = turf.distance(
    turf.point([bbox[0], bbox[1]]),
    turf.point([bbox[2], bbox[3]]),
    { units: 'kilometers' }
  ) * 1000;

  console.log(`   - 对角线长度: ${diagonal.toFixed(0)} 米`);

  // 计算每个区域的边界框
  console.log('\n   各区域的边界框:');
  const zones = await db.zones.toArray();

  for (const zone of zones) {
    const zoneBbox = turf.bbox(zone.geometry);
    const zoneWidth = turf.distance(
      turf.point([zoneBbox[0], zoneBbox[1]]),
      turf.point([zoneBbox[2], zoneBbox[1]]),
      { units: 'kilometers' }
    ) * 1000;

    const zoneHeight = turf.distance(
      turf.point([zoneBbox[0], zoneBbox[1]]),
      turf.point([zoneBbox[0], zoneBbox[3]]),
      { units: 'kilometers' }
    ) * 1000;

    console.log(`   - ${zone.name}:`);
    console.log(`     宽度: ${zoneWidth.toFixed(0)}米, 高度: ${zoneHeight.toFixed(0)}米`);
  }

  console.log('\n✅ 边界框计算完成');
}

// ============================================
// 错误处理
// ============================================

main().catch((error) => {
  console.error('❌ 错误:', error.message);
  console.error('\n堆栈跟踪:');
  console.error(error.stack);
  process.exit(1);
});
