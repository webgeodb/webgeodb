/**
 * WebGeoDB 教程示例
 *
 * 章节: 第1章 - 快速入门
 * 示例: 个人地点标记系统
 *
 * 学习目标:
 * 1. 将CRUD操作应用到实际场景
 * 2. 掌握空间查询（距离查询、附近搜索）
 * 3. 构建一个完整的地点标记应用
 *
 * 应用场景:
 * 这是一个咖啡店探索应用，用户可以：
 * - 添加喜欢的咖啡店位置
 * - 查找附近的咖啡店
 * - 更新店铺评分和评论
 * - 删除已关闭的店铺
 *
 * 前置要求:
 * - Node.js >= 16
 * - TypeScript >= 4.5
 * 完成 01-first-database 和 02-basic-crud 示例
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
 * 章节: 第1章 - 快速入门
 * 示例: 个人地点标记系统
 *
 * 📍 应用场景: 咖啡店探索
 *
 * 步骤 1: 初始化应用...
 * ✅ 应用初始化完成
 *
 * 步骤 2: 添加咖啡店位置...
 * ✅ 成功添加 5 家咖啡店
 *
 * 步骤 3: 查找附近的咖啡店...
 * ✅ 找到 3 家附近的咖啡店
 * ...
 * ```
 */

import { WebGeoDB } from '@webgeodb/core';

// ============================================
// 配置
// ============================================

const DB_CONFIG = {
  name: 'tutorial-01-place-markers',
  version: 1
};

// 用户当前位置（北京三里屯附近）
const USER_LOCATION = [116.417526, 39.914989] as [number, number];

// ============================================
// 数据类型定义
// ============================================

interface Cafe {
  id: string;
  name: string;
  address: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    category: string;
    rating: number;
    priceRange: string;
    wifi: boolean;
    notes?: string;
    lastVisit?: Date;
  };
  createdAt: Date;
}

// ============================================
// 工具函数
// ============================================

/**
 * 计算两点之间的距离（简化版，单位：米）
 */
function calculateDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const R = 6371e3; // 地球半径（米）
  const lat1 = (coord2[1] * Math.PI) / 180;
  const lat2 = (coord1[1] * Math.PI) / 180;
  const deltaLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const deltaLon = ((coord2[0] - coord1[0]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 格式化距离显示
 */
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

// ============================================
// 业务逻辑函数
// ============================================

/**
 * 添加咖啡店
 */
async function addCafe(db: WebGeoDB, cafe: Cafe): Promise<void> {
  await db.features.insert(cafe);
  console.log(`   ✅ ${cafe.name} (${cafe.address})`);
}

/**
 * 查找附近的咖啡店
 */
async function findNearbyCafes(
  db: WebGeoDB,
  center: [number, number],
  radius: number
): Promise<Array<Cafe & { distance: number }>> {
  // 使用空间查询查找范围内的咖啡店
  const cafes = await db.features
    .distance('geometry', center, '<', radius)
    .where('type', '=', 'cafe')
    .toArray();

  // 计算实际距离并排序
  const cafesWithDistance = cafes.map((cafe) => ({
    ...cafe,
    distance: calculateDistance(center, cafe.geometry.coordinates)
  }));

  cafesWithDistance.sort((a, b) => a.distance - b.distance);

  return cafesWithDistance;
}

/**
 * 更新咖啡店评分
 */
async function updateCafeRating(
  db: WebGeoDB,
  cafeId: string,
  newRating: number
): Promise<void> {
  const cafe = await db.features.get(cafeId);
  if (!cafe) {
    throw new Error(`咖啡店 ${cafeId} 不存在`);
  }

  await db.features.update(cafeId, {
    properties: {
      ...cafe.properties,
      rating: newRating
    }
  });
}

/**
 * 删除咖啡店
 */
async function deleteCafe(db: WebGeoDB, cafeId: string): Promise<boolean> {
  const cafe = await db.features.get(cafeId);
  if (!cafe) {
    console.log(`   ⚠️  咖啡店 ${cafeId} 不存在`);
    return false;
  }

  await db.features.delete(cafeId);
  console.log(`   ✅ 已删除: ${cafe.name}`);
  return true;
}

/**
 * 显示咖啡店列表
 */
function displayCafes(cafes: Array<Cafe & { distance?: number }>): void {
  cafes.forEach((cafe, index) => {
    const distance = cafe.distance ? ` (${formatDistance(cafe.distance)})` : '';
    const wifi = cafe.properties.wifi ? '📶' : '❌';
    const price = cafe.properties.priceRange;

    console.log(
      `   ${index + 1}. ${cafe.name}${distance}`
    );
    console.log(`      📍 ${cafe.address}`);
    console.log(
      `      ⭐ ${cafe.properties.rating} | 💰 ${price} | ${wifi}`
    );
  });
}

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('=== WebGeoDB 教程示例 ===');
  console.log('章节: 第1章 - 快速入门');
  console.log('示例: 个人地点标记系统');
  console.log('\n📍 应用场景: 咖啡店探索\n');

  // 步骤 1: 初始化应用
  console.log('步骤 1: 初始化应用...');
  const db = new WebGeoDB(DB_CONFIG);
  db.schema({
    features: {
      id: 'string',
      name: 'string',
      type: 'string',
      address: 'string',
      geometry: 'geometry',
      properties: 'json',
      createdAt: 'datetime'
    }
  });
  await db.open();
  db.features.createIndex('geometry', { auto: true });
  console.log('✅ 应用初始化完成\n');

  // 步骤 2: 添加咖啡店位置
  console.log('步骤 2: 添加咖啡店位置...');
  const cafes: Cafe[] = [
    {
      id: '1',
      name: '星巴克（三里屯店）',
      type: 'cafe',
      address: '北京市朝阳区三里屯路11号',
      geometry: {
        type: 'Point',
        coordinates: [116.417526, 39.914989]
      },
      properties: {
        category: 'coffee',
        rating: 4.2,
        priceRange: '$$',
        wifi: true,
        notes: '环境舒适，适合办公'
      },
      createdAt: new Date()
    },
    {
      id: '2',
      name: '蓝蛙咖啡',
      type: 'cafe',
      address: '北京市朝阳区三里屯北路19号',
      geometry: {
        type: 'Point',
        coordinates: [116.418526, 39.915989]
      },
      properties: {
        category: 'coffee',
        rating: 4.5,
        priceRange: '$$$',
        wifi: true,
        notes: '咖啡品质很好'
      },
      createdAt: new Date()
    },
    {
      id: '3',
      name: '漫咖啡',
      type: 'cafe',
      address: '北京市朝阳区工体北路8号',
      geometry: {
        type: 'Point',
        coordinates: [116.427526, 39.924989]
      },
      properties: {
        category: 'coffee',
        rating: 4.0,
        priceRange: '$$',
        wifi: true,
        notes: '空间很大，适合聚会'
      },
      createdAt: new Date()
    },
    {
      id: '4',
      name: '动物园咖啡',
      type: 'cafe',
      address: '北京市朝阳区望京街道',
      geometry: {
        type: 'Point',
        coordinates: [116.477526, 39.954989]
      },
      properties: {
        category: 'coffee',
        rating: 3.8,
        priceRange: '$$',
        wifi: false,
        notes: '装修很有特色'
      },
      createdAt: new Date()
    },
    {
      id: '5',
      name: '老友记咖啡馆',
      type: 'cafe',
      address: '北京市朝阳区鼓楼东大街',
      geometry: {
        type: 'Point',
        coordinates: [116.397428, 39.93923]
      },
      properties: {
        category: 'coffee',
        rating: 4.7,
        priceRange: '$$',
        wifi: true,
        notes: '怀旧主题，氛围很好'
      },
      createdAt: new Date()
    }
  ];

  for (const cafe of cafes) {
    await addCafe(db, cafe);
  }
  console.log(`✅ 成功添加 ${cafes.length} 家咖啡店\n`);

  // 步骤 3: 查找附近的咖啡店
  console.log('步骤 3: 查找附近的咖啡店（2公里范围内）...');
  console.log(`   📍 当前位置: ${USER_LOCATION[0]}, ${USER_LOCATION[1]}\n`);

  const nearbyCafes = await findNearbyCafes(db, USER_LOCATION, 2000);
  console.log(`✅ 找到 ${nearbyCafes.length} 家附近的咖啡店:\n`);
  displayCafes(nearbyCafes);
  console.log();

  // 步骤 4: 查找评分最高的咖啡店
  console.log('步骤 4: 查找评分最高的咖啡店...');
  const topRatedCafes = await db.features
    .where('type', '=', 'cafe')
    .where('properties.rating', '>=', 4.5)
    .orderBy('properties.rating', 'desc')
    .toArray();
  console.log(`✅ 找到 ${topRatedCafes.length} 家高评分咖啡店 (>=4.5⭐):\n`);
  topRatedCafes.forEach((cafe, index) => {
    console.log(`   ${index + 1}. ${cafe.name} - ${cafe.properties.rating}⭐`);
    console.log(`      📍 ${cafe.address}`);
  });
  console.log();

  // 步骤 5: 查找有WiFi的咖啡店
  console.log('步骤 5: 查找有WiFi的咖啡店（适合办公）...');
  const wifiCafes = await db.features
    .where('type', '=', 'cafe')
    .where('properties.wifi', '=', true)
    .toArray();
  console.log(`✅ 找到 ${wifiCafes.length} 家提供WiFi的咖啡店:\n`);
  wifiCafes.forEach((cafe, index) => {
    console.log(`   ${index + 1}. ${cafe.name}`);
    console.log(`      📶 有WiFi | 💰 ${cafe.properties.priceRange}`);
  });
  console.log();

  // 步骤 6: 更新店铺评分
  console.log('步骤 6: 更新店铺评分...');
  console.log('   📝 更新 "星巴克（三里屯店）" 的评分从 4.2 到 4.6');
  await updateCafeRating(db, '1', 4.6);
  const updatedCafe = await db.features.get('1');
  console.log(`   ✅ 评分更新成功: ${updatedCafe.name} - ${updatedCafe.properties.rating}⭐\n`);

  // 步骤 7: 删除已关闭的店铺
  console.log('步骤 7: 删除已关闭的店铺...');
  console.log('   🗑️  模拟: "动物园咖啡" 已关闭，从列表中删除');
  await deleteCafe(db, '4');
  console.log();

  // 步骤 8: 查看统计信息
  console.log('步骤 8: 查看统计信息...');
  const totalCount = await db.features.count();
  const cafeCount = await db.features.where('type', '=', 'cafe').count();
  const wifiCount = await db.features
    .where('type', '=', 'cafe')
    .where('properties.wifi', '=', true)
    .count();
  const avgRatingResult = await db.features
    .where('type', '=', 'cafe')
    .toArray();
  const avgRating =
    avgRatingResult.reduce((sum, cafe) => sum + (cafe.properties.rating || 0), 0) /
    avgRatingResult.length;

  console.log('✅ 统计信息:');
  console.log(`   📊 总地点数: ${totalCount}`);
  console.log(`   ☕ 咖啡店数量: ${cafeCount}`);
  console.log(`   📶 提供WiFi: ${wifiCount}`);
  console.log(`   ⭐ 平均评分: ${avgRating.toFixed(1)}\n`);

  // 清理: 关闭数据库
  console.log('清理: 关闭数据库...');
  await db.close();
  console.log('✅ 数据库已关闭');

  console.log('\n=== 示例执行完成 ===');
  console.log('\n🎉 恭喜！你已经完成了第一个地点标记应用');
  console.log('\n💡 本示例涵盖的知识点:');
  console.log('   ✅ 数据库初始化和表结构定义');
  console.log('   ✅ 空间索引创建');
  console.log('   ✅ 批量插入数据');
  console.log('   ✅ 空间查询（附近搜索）');
  console.log('   ✅ 条件查询（评分、WiFi等）');
  console.log('   ✅ 排序和分页');
  console.log('   ✅ 数据更新和删除');
  console.log('   ✅ 统计和聚合');
  console.log('\n🚀 继续学习:');
  console.log('   - 第2章: 空间查询和地理分析');
  console.log('   - 第3章: 高级查询和性能优化');
  console.log('   - 查看更多专题应用示例');
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
