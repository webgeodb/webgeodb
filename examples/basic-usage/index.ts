import { WebGeoDB } from '@webgeodb/core';

async function main() {
  // 1. 创建数据库实例
  const db = new WebGeoDB({
    name: 'my-geo-db',
    version: 1
  });

  // 2. 定义表结构
  db.schema({
    features: {
      id: 'string',
      name: 'string',
      type: 'string',
      geometry: 'geometry',
      properties: 'json',
      createdAt: 'datetime'
    }
  });

  // 3. 打开数据库
  await db.open();

  // 4. 创建空间索引
  db.features.createIndex('geometry', { auto: true });

  // 5. 插入数据
  console.log('Inserting features...');
  await db.features.insertMany([
    {
      id: '1',
      name: 'Restaurant A',
      type: 'restaurant',
      geometry: {
        type: 'Point',
        coordinates: [116.397428, 39.90923] // 北京天安门
      },
      properties: {
        category: 'chinese',
        rating: 4.5,
        price: '$$'
      },
      createdAt: new Date()
    },
    {
      id: '2',
      name: 'Restaurant B',
      type: 'restaurant',
      geometry: {
        type: 'Point',
        coordinates: [116.407526, 39.904989] // 北京王府井
      },
      properties: {
        category: 'western',
        rating: 4.0,
        price: '$$$'
      },
      createdAt: new Date()
    },
    {
      id: '3',
      name: 'Cafe A',
      type: 'cafe',
      geometry: {
        type: 'Point',
        coordinates: [116.417526, 39.914989] // 北京三里屯
      },
      properties: {
        category: 'coffee',
        rating: 4.8,
        price: '$$'
      },
      createdAt: new Date()
    }
  ]);

  // 6. 属性查询
  console.log('\n=== Attribute Query ===');
  const restaurants = await db.features
    .where('type', '=', 'restaurant')
    .toArray();
  console.log(`Found ${restaurants.length} restaurants`);
  restaurants.forEach(r => {
    console.log(`- ${r.name} (${r.properties.category})`);
  });

  // 7. 复杂查询
  console.log('\n=== Complex Query ===');
  const highRated = await db.features
    .where('type', '=', 'restaurant')
    .where('properties.rating', '>', 4.2)
    .orderBy('properties.rating', 'desc')
    .toArray();
  console.log(`Found ${highRated.length} high-rated restaurants`);
  highRated.forEach(r => {
    console.log(`- ${r.name}: ${r.properties.rating} stars`);
  });

  // 8. 空间查询 - 距离查询
  console.log('\n=== Distance Query ===');
  const nearby = await db.features
    .distance('geometry', [116.397428, 39.90923], '<', 2000) // 2km 范围内
    .toArray();
  console.log(`Found ${nearby.length} features within 2km`);
  nearby.forEach(r => {
    console.log(`- ${r.name} (${r.type})`);
  });

  // 9. 空间查询 - 相交查询
  console.log('\n=== Intersection Query ===');
  const bbox = {
    type: 'Polygon' as const,
    coordinates: [
      [
        [116.39, 39.90],
        [116.42, 39.90],
        [116.42, 39.92],
        [116.39, 39.92],
        [116.39, 39.90]
      ]
    ]
  };
  const inBBox = await db.features.intersects('geometry', bbox).toArray();
  console.log(`Found ${inBBox.length} features in bounding box`);
  inBBox.forEach(r => {
    console.log(`- ${r.name} (${r.type})`);
  });

  // 10. 更新数据
  console.log('\n=== Update Feature ===');
  await db.features.update('1', {
    properties: {
      ...restaurants[0].properties,
      rating: 4.7
    }
  });
  const updated = await db.features.get('1');
  console.log(`Updated ${updated.name}: ${updated.properties.rating} stars`);

  // 11. 统计
  console.log('\n=== Statistics ===');
  const total = await db.features.count();
  console.log(`Total features: ${total}`);

  // 12. 关闭数据库
  await db.close();
  console.log('\nDatabase closed.');
}

main().catch(console.error);
