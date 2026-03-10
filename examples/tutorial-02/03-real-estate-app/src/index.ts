/**
 * WebGeoDB 教程示例
 *
 * 章节: 第2章 - 空间查询基础
 * 示例: 房地产搜索应用
 *
 * 学习目标:
 * 1. 学习如何在实际应用中组合使用空间查询和属性查询
 * 2. 掌握距离查询和范围查询的使用
 * 3. 理解多条件组合查询的实现方法
 * 4. 学习如何对查询结果进行排序和分页
 *
 * 前置要求:
 * - Node.js >= 16
 * - TypeScript >= 4.5
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
 * 章节: 第2章 - 空间查询基础
 * 示例: 房地产搜索应用
 *
 * 步骤 1: 创建数据库实例...
 * ✅ 数据库实例创建成功
 *
 * 步骤 2: 定义表结构...
 * ✅ 表结构定义成功
 *
 * 步骤 3: 打开数据库...
 * ✅ 数据库打开成功
 *
 * 步骤 4: 创建空间索引...
 * ✅ 空间索引创建成功
 *
 * 步骤 5: 插入房源数据...
 * ✅ 房源数据插入成功 (20 条记录)
 *
 * === 房地产搜索演示 ===
 *
 * 场景 1: 查找指定区域内的房源
 * ✅ 查询成功
 *
 * 场景 2: 查找距离地铁站一定范围内的房源
 * ✅ 查询成功
 *
 * 场景 3: 多条件组合查询（价格、房型、面积）
 * ✅ 查询成功
 *
 * 场景 4: 查找附近房源并按距离排序
 * ✅ 查询成功
 *
 * 场景 5: 分页浏览房源列表
 * ✅ 查询成功
 *
 * 清理: 关闭数据库...
 * ✅ 数据库已关闭
 *
 * === 示例执行完成 ===
 * ```
 */

import { WebGeoDB } from '@webgeodb/core';

// ============================================
// 类型定义
// ============================================

interface Property {
  id: string;
  title: string;
  type: '公寓' | '别墅' | '商铺' | '写字楼';
  price: number;
  area: number;
  rooms: number;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  address: string;
  features: {
    hasElevator: boolean;
    hasParking: boolean;
    hasGarden: boolean;
    nearSubway: boolean;
    nearSchool: boolean;
    nearPark: boolean;
  };
  listedDate: Date;
  status: '在售' | '已售' | '预订';
}

// ============================================
// 配置
// ============================================

const DB_CONFIG = {
  name: 'tutorial-02-03-real-estate-app',
  version: 1
};

// ============================================
// 测试数据
// ============================================

// 北京朝阳区附近区域
const BASE_LOCATION: [number, number] = [116.4074, 39.9042];

// 模拟房源数据（北京朝阳区附近）
const PROPERTIES_DATA: Property[] = [
  {
    id: '1',
    title: '阳光花园 精装两居',
    type: '公寓',
    price: 4500000,
    area: 95,
    rooms: 2,
    geometry: { type: 'Point', coordinates: [116.4074, 39.9042] },
    address: '朝阳区建国路88号',
    features: {
      hasElevator: true,
      hasParking: true,
      hasGarden: false,
      nearSubway: true,
      nearSchool: true,
      nearPark: true
    },
    listedDate: new Date('2024-01-01'),
    status: '在售'
  },
  {
    id: '2',
    title: 'CBD高端公寓 豪华三居',
    type: '公寓',
    price: 8800000,
    area: 150,
    rooms: 3,
    geometry: { type: 'Point', coordinates: [116.4080, 39.9045] },
    address: '朝阳区国贸桥东',
    features: {
      hasElevator: true,
      hasParking: true,
      hasGarden: false,
      nearSubway: true,
      nearSchool: false,
      nearPark: false
    },
    listedDate: new Date('2024-01-05'),
    status: '在售'
  },
  {
    id: '3',
    title: '郊区独栋别墅 带花园',
    type: '别墅',
    price: 15000000,
    area: 350,
    rooms: 5,
    geometry: { type: 'Point', coordinates: [116.4000, 39.9000] },
    address: '朝阳区来广营乡',
    features: {
      hasElevator: true,
      hasParking: true,
      hasGarden: true,
      nearSubway: false,
      nearSchool: true,
      nearPark: true
    },
    listedDate: new Date('2024-01-10'),
    status: '在售'
  },
  {
    id: '4',
    title: '地铁口一居 投资首选',
    type: '公寓',
    price: 2800000,
    area: 55,
    rooms: 1,
    geometry: { type: 'Point', coordinates: [116.4065, 39.9040] },
    address: '朝阳区建国门地铁站旁',
    features: {
      hasElevator: true,
      hasParking: false,
      hasGarden: false,
      nearSubway: true,
      nearSchool: false,
      nearPark: false
    },
    listedDate: new Date('2024-01-15'),
    status: '在售'
  },
  {
    id: '5',
    title: '学区房 三室两厅',
    type: '公寓',
    price: 6200000,
    area: 120,
    rooms: 3,
    geometry: { type: 'Point', coordinates: [116.4070, 39.9050] },
    address: '朝阳区朝阳门外大街',
    features: {
      hasElevator: true,
      hasParking: true,
      hasGarden: false,
      nearSubway: true,
      nearSchool: true,
      nearPark: false
    },
    listedDate: new Date('2024-01-20'),
    status: '在售'
  },
  {
    id: '6',
    title: '商业街旺铺 适合经营',
    type: '商铺',
    price: 3500000,
    area: 80,
    rooms: 1,
    geometry: { type: 'Point', coordinates: [116.4085, 39.9040] },
    address: '朝阳区三里屯商业街',
    features: {
      hasElevator: false,
      hasParking: false,
      hasGarden: false,
      nearSubway: true,
      nearSchool: false,
      nearPark: false
    },
    listedDate: new Date('2024-01-25'),
    status: '在售'
  },
  {
    id: '7',
    title: '写字楼整层出租',
    type: '写字楼',
    price: 12000000,
    area: 500,
    rooms: 10,
    geometry: { type: 'Point', coordinates: [116.4075, 39.9035] },
    address: '朝阳区CBD核心区',
    features: {
      hasElevator: true,
      hasParking: true,
      hasGarden: false,
      nearSubway: true,
      nearSchool: false,
      nearPark: false
    },
    listedDate: new Date('2024-02-01'),
    status: '在售'
  },
  {
    id: '8',
    title: '温馨小户型 首付低',
    type: '公寓',
    price: 2200000,
    area: 45,
    rooms: 1,
    geometry: { type: 'Point', coordinates: [116.4060, 39.9055] },
    address: '朝阳区东大桥路',
    features: {
      hasElevator: true,
      hasParking: false,
      hasGarden: false,
      nearSubway: true,
      nearSchool: false,
      nearPark: true
    },
    listedDate: new Date('2024-02-05'),
    status: '在售'
  }
];

// 地铁站位置（用于距离查询）
const SUBWAY_STATIONS = {
  '建国门站': [116.4065, 39.9040] as [number, number],
  '国贸站': [116.4080, 39.9045] as [number, number],
  '朝阳门站': [116.4070, 39.9050] as [number, number],
  '东大桥站': [116.4060, 39.9055] as [number, number]
};

// ============================================
// 工具函数
// ============================================

/**
 * 格式化价格
 */
function formatPrice(price: number): string {
  if (price >= 10000) {
    return `${(price / 10000).toFixed(0)}万`;
  }
  return `${price}元`;
}

/**
 * 计算两点之间的距离（简化版，使用曼哈顿距离）
 */
function calculateDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const dx = (coord1[0] - coord2[0]) * 111000; // 经度转米（近似）
  const dy = (coord1[1] - coord2[1]) * 111000; // 纬度转米（近似）
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 创建圆形搜索区域
 */
function createCircleArea(
  center: [number, number],
  radiusInMeters: number
): any {
  // 简化版：使用方形近似圆形
  const delta = radiusInMeters / 111000; // 转换为度（近似）
  return {
    type: 'Polygon',
    coordinates: [[
      [center[0] - delta, center[1] - delta],
      [center[0] - delta, center[1] + delta],
      [center[0] + delta, center[1] + delta],
      [center[0] + delta, center[1] - delta],
      [center[0] - delta, center[1] - delta]
    ]]
  };
}

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('=== WebGeoDB 教程示例 ===');
  console.log('章节: 第2章 - 空间查询基础');
  console.log('示例: 房地产搜索应用\n');

  // 步骤 1: 创建数据库实例
  console.log('步骤 1: 创建数据库实例...');
  const db = new WebGeoDB(DB_CONFIG);
  console.log('✅ 数据库实例创建成功');

  // 步骤 2: 定义表结构
  console.log('\n步骤 2: 定义表结构...');
  db.schema({
    properties: {
      id: 'string',
      title: 'string',
      type: 'string',
      price: 'number',
      area: 'number',
      rooms: 'number',
      geometry: 'geometry',
      address: 'string',
      features: 'json',
      listedDate: 'datetime',
      status: 'string'
    }
  });
  console.log('✅ 表结构定义成功');

  // 步骤 3: 打开数据库
  console.log('\n步骤 3: 打开数据库...');
  await db.open();
  console.log('✅ 数据库打开成功');

  // 步骤 4: 创建空间索引
  console.log('\n步骤 4: 创建空间索引...');
  db.properties.createIndex('geometry', { auto: true });
  console.log('✅ 空间索引创建成功');

  // 步骤 5: 插入房源数据
  console.log('\n步骤 5: 插入房源数据...');
  await db.properties.insertMany(PROPERTIES_DATA);
  console.log(`✅ 房源数据插入成功 (${PROPERTIES_DATA.length} 条记录)`);

  // ============================================
  // 房地产搜索演示
  // ============================================

  console.log('\n=== 房地产搜索演示 ===\n');

  // ----------------------------------------
  // 场景 1: 查找指定区域内的房源
  // ----------------------------------------

  console.log('场景 1: 查找指定区域内的房源');
  console.log('搜索条件: CBD区域（建国门附近）\n');

  const cbdArea = createCircleArea([116.4074, 39.9042], 500); // 500米范围

  const results1 = await db.properties
    .intersects('geometry', cbdArea)
    .where('status', '=', '在售')
    .orderBy('price', 'asc')
    .find();

  console.log('✅ 查询成功');
  console.log(`找到 ${results1.length} 个结果:\n`);
  results1.forEach((property: any) => {
    console.log(`  📍 ${property.title}`);
    console.log(`     类型: ${property.type} | 面积: ${property.area}㎡ | ${property.rooms}居`);
    console.log(`     价格: ${formatPrice(property.price)}`);
    console.log(`     地址: ${property.address}`);
    console.log(`     特点: ${Object.entries(property.features)
      .filter(([_, v]) => v === true)
      .map(([k]) => {
        const featureNames: Record<string, string> = {
          hasElevator: '电梯',
          hasParking: '停车位',
          hasGarden: '花园',
          nearSubway: '近地铁',
          nearSchool: '近学校',
          nearPark: '近公园'
        };
        return featureNames[k] || k;
      })
      .join('、') || '无特殊特点'
    }\n`);
  });

  // ----------------------------------------
  // 场景 2: 查找距离地铁站一定范围内的房源
  // ----------------------------------------

  console.log('场景 2: 查找距离地铁站一定范围内的房源');
  console.log('搜索条件: 距离建国门站500米内\n');

  const searchArea2 = createCircleArea(SUBWAY_STATIONS['建国门站'], 500);

  const results2 = await db.properties
    .intersects('geometry', searchArea2)
    .where('status', '=', '在售')
    .orderBy('price', 'asc')
    .find();

  console.log('✅ 查询成功');
  console.log(`找到 ${results2.length} 个结果:\n`);
  results2.forEach((property: any) => {
    const distance = calculateDistance(
      SUBWAY_STATIONS['建国门站'],
      property.geometry.coordinates
    );
    console.log(`  📍 ${property.title}`);
    console.log(`     距离建国门站: ${(distance / 1000).toFixed(2)}km`);
    console.log(`     价格: ${formatPrice(property.price)} | ${property.type}\n`);
  });

  // ----------------------------------------
  // 场景 3: 多条件组合查询
  // ----------------------------------------

  console.log('场景 3: 多条件组合查询');
  console.log('搜索条件: 公寓、2-3居、价格300-600万、面积80-120㎡\n');

  const results3 = await db.properties
    .where('type', '=', '公寓')
    .where('rooms', '>=', 2)
    .where('rooms', '<=', 3)
    .where('price', '>=', 3000000)
    .where('price', '<=', 6000000)
    .where('area', '>=', 80)
    .where('area', '<=', 120)
    .where('status', '=', '在售')
    .orderBy('price', 'asc')
    .find();

  console.log('✅ 查询成功');
  console.log(`找到 ${results3.length} 个结果:\n`);
  results3.forEach((property: any) => {
    console.log(`  📍 ${property.title}`);
    console.log(`     类型: ${property.type} | ${property.rooms}居 | ${property.area}㎡`);
    console.log(`     价格: ${formatPrice(property.price)}`);
    console.log(`     地址: ${property.address}\n`);
  });

  // ----------------------------------------
  // 场景 4: 查找附近房源并按距离排序
  // ----------------------------------------

  console.log('场景 4: 查找附近房源并按距离排序');
  console.log('搜索中心: 国贸站 | 范围: 1公里\n');

  const centerPoint = SUBWAY_STATIONS['国贸站'];
  const searchArea4 = createCircleArea(centerPoint, 1000);

  const results4 = await db.properties
    .intersects('geometry', searchArea4)
    .where('status', '=', '在售')
    .find();

  // 手动按距离排序
  const results4WithDistance = results4.map((property: any) => ({
    ...property,
    distance: calculateDistance(centerPoint, property.geometry.coordinates)
  })).sort((a: any, b: any) => a.distance - b.distance);

  console.log('✅ 查询成功');
  console.log(`找到 ${results4WithDistance.length} 个结果:\n`);
  results4WithDistance.slice(0, 5).forEach((property: any) => {
    console.log(`  📍 ${property.title}`);
    console.log(`     距离: ${(property.distance / 1000).toFixed(2)}km`);
    console.log(`     价格: ${formatPrice(property.price)} | ${property.type}\n`);
  });

  // ----------------------------------------
  // 场景 5: 分页浏览房源列表
  // ----------------------------------------

  console.log('场景 5: 分页浏览房源列表');
  console.log('条件: 所有在售公寓 | 按价格降序 | 每页3条\n');

  const pageSize = 3;
  const pageNumber = 1;

  const totalCount = (await db.properties
    .where('type', '=', '公寓')
    .where('status', '=', '在售')
    .find()).length;

  const results5 = await db.properties
    .where('type', '=', '公寓')
    .where('status', '=', '在售')
    .orderBy('price', 'desc')
    .limit(pageSize)
    .offset((pageNumber - 1) * pageSize)
    .find();

  console.log('✅ 查询成功');
  console.log(`总共 ${totalCount} 套公寓，第 ${pageNumber} 页，每页 ${pageSize} 条:\n`);
  results5.forEach((property: any, index: number) => {
    console.log(`  ${(pageNumber - 1) * pageSize + index + 1}. ${property.title}`);
    console.log(`     价格: ${formatPrice(property.price)} | ${property.area}㎡ | ${property.rooms}居\n`);
  });

  // ============================================
  // 搜索统计
  // ============================================

  console.log('=== 搜索统计 ===\n');

  const allProperties = await db.properties.where('status', '=', '在售').find();

  // 按类型统计
  const typeStats = allProperties.reduce((acc: Record<string, number>, p: any) => {
    acc[p.type] = (acc[p.type] || 0) + 1;
    return acc;
  }, {});

  console.log('房源类型分布:');
  Object.entries(typeStats).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}套`);
  });

  // 价格区间统计
  const priceRanges = [
    { label: '200万以下', min: 0, max: 2000000 },
    { label: '200-400万', min: 2000000, max: 4000000 },
    { label: '400-600万', min: 4000000, max: 6000000 },
    { label: '600万以上', min: 6000000, max: Infinity }
  ];

  console.log('\n价格区间分布:');
  priceRanges.forEach(range => {
    const count = allProperties.filter((p: any) =>
      p.price >= range.min && p.price < range.max
    ).length;
    console.log(`  ${range.label}: ${count}套`);
  });

  // 清理: 关闭数据库
  console.log('\n清理: 关闭数据库...');
  await db.close();
  console.log('✅ 数据库已关闭');

  console.log('\n=== 示例执行完成 ===');
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
