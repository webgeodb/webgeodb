import type { Geometry, Feature } from '../../src/types';

/**
 * 标准 GeoJSON 测试 Feature 集合
 */
export const TEST_FEATURES: Record<string, Feature> = {
  // 点要素
  pointA: {
    type: 'Feature',
    id: 'point-a',
    geometry: {
      type: 'Point',
      coordinates: [30, 10]
    },
    properties: {
      name: 'Point A',
      type: 'poi',
      category: 'landmark'
    }
  },

  pointB: {
    type: 'Feature',
    id: 'point-b',
    geometry: {
      type: 'Point',
      coordinates: [31, 11]
    },
    properties: {
      name: 'Point B',
      type: 'poi',
      category: 'landmark'
    }
  },

  pointInside: {
    type: 'Feature',
    id: 'point-inside',
    geometry: {
      type: 'Point',
      coordinates: [5, 5]
    },
    properties: {
      name: 'Point Inside',
      type: 'location',
      category: 'inner'
    }
  },

  pointOutside: {
    type: 'Feature',
    id: 'point-outside',
    geometry: {
      type: 'Point',
      coordinates: [100, 100]
    },
    properties: {
      name: 'Point Outside',
      type: 'location',
      category: 'outer'
    }
  },

  // 线要素
  lineStringA: {
    type: 'Feature',
    id: 'line-a',
    geometry: {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [10, 10]
      ]
    },
    properties: {
      name: 'Line A',
      type: 'road',
      length: 100
    }
  },

  lineStringInside: {
    type: 'Feature',
    id: 'line-inside',
    geometry: {
      type: 'LineString',
      coordinates: [
        [2, 2],
        [8, 8]
      ]
    },
    properties: {
      name: 'Line Inside',
      type: 'path',
      length: 50
    }
  },

  // 多边形要素
  polygonA: {
    type: 'Feature',
    id: 'polygon-a',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0]
        ]
      ]
    },
    properties: {
      name: 'Polygon A',
      type: 'area',
      area: 100
    }
  },

  containingPolygon: {
    type: 'Feature',
    id: 'containing-polygon',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0]
        ]
      ]
    },
    properties: {
      name: 'Containing Polygon',
      type: 'boundary',
      level: 1
    }
  },

  containedPolygon: {
    type: 'Feature',
    id: 'contained-polygon',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [2, 2],
          [8, 2],
          [8, 8],
          [2, 8],
          [2, 2]
        ]
      ]
    },
    properties: {
      name: 'Contained Polygon',
      type: 'zone',
      level: 2
    }
  },

  // 带孔洞的多边形
  polygonWithHole: {
    type: 'Feature',
    id: 'polygon-with-hole',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0]
        ],
        [
          [3, 3],
          [7, 3],
          [7, 7],
          [3, 7],
          [3, 3]
        ]
      ]
    },
    properties: {
      name: 'Polygon with Hole',
      type: 'ring',
      hasHole: true
    }
  },

  // 多点要素
  multiPoint: {
    type: 'Feature',
    id: 'multi-point',
    geometry: {
      type: 'MultiPoint',
      coordinates: [
        [0, 0],
        [5, 5],
        [10, 10]
      ]
    },
    properties: {
      name: 'Multi Point',
      type: 'cluster',
      count: 3
    }
  },

  // 多线要素
  multiLineString: {
    type: 'Feature',
    id: 'multi-line',
    geometry: {
      type: 'MultiLineString',
      coordinates: [
        [
          [0, 0],
          [5, 5]
        ],
        [
          [5, 5],
          [10, 10]
        ]
      ]
    },
    properties: {
      name: 'Multi LineString',
      type: 'route',
      segments: 2
    }
  },

  // 多多边形要素
  multiPolygon: {
    type: 'Feature',
    id: 'multi-polygon',
    geometry: {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [0, 0],
            [5, 0],
            [5, 5],
            [0, 5],
            [0, 0]
          ]
        ],
        [
          [
            [10, 10],
            [15, 10],
            [15, 15],
            [10, 15],
            [10, 10]
          ]
        ]
      ]
    },
    properties: {
      name: 'Multi Polygon',
      type: 'territories',
      parts: 2
    }
  },

  // 几何集合要素
  geometryCollection: {
    type: 'Feature',
    id: 'geometry-collection',
    geometry: {
      type: 'GeometryCollection',
      geometries: [
        {
          type: 'Point',
          coordinates: [5, 5]
        },
        {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [10, 10]
          ]
        },
        {
          type: 'Polygon',
          coordinates: [
            [
              [2, 2],
              [8, 2],
              [8, 8],
              [2, 8],
              [2, 2]
            ]
          ]
        }
      ]
    },
    properties: {
      name: 'Geometry Collection',
      type: 'mixed',
      geometriesCount: 3
    }
  }
};

/**
 * 空间关系测试用例集
 */
export const SPATIAL_RELATIONSHIPS = {
  contains: {
    pointInPolygon: {
      container: TEST_FEATURES.containingPolygon,
      contained: TEST_FEATURES.pointInside
    },
    lineStringInPolygon: {
      container: TEST_FEATURES.containingPolygon,
      contained: TEST_FEATURES.lineStringInside
    },
    polygonInPolygon: {
      container: TEST_FEATURES.containingPolygon,
      contained: TEST_FEATURES.containedPolygon
    }
  },

  within: {
    pointWithinPolygon: {
      feature: TEST_FEATURES.pointInside,
      within: TEST_FEATURES.containingPolygon
    },
    polygonWithinPolygon: {
      feature: TEST_FEATURES.containedPolygon,
      within: TEST_FEATURES.containingPolygon
    }
  },

  intersects: {
    lineStringCrosses: {
      feature1: TEST_FEATURES.lineStringA,
      feature2: TEST_FEATURES.lineStringInside
    }
  },

  disjoint: {
    pointFarAway: {
      feature1: TEST_FEATURES.pointInside,
      feature2: TEST_FEATURES.pointOutside
    }
  }
};

/**
 * 用于批量插入的测试数据集
 */
export function createBulkTestFeatures(count: number): Feature[] {
  const features: Feature[] = [];

  for (let i = 0; i < count; i++) {
    const x = Math.random() * 100;
    const y = Math.random() * 100;

    features.push({
      type: 'Feature',
      id: `feature-${i}`,
      geometry: {
        type: 'Point',
        coordinates: [x, y]
      },
      properties: {
        name: `Feature ${i}`,
        type: 'test',
        index: i
      }
    });
  }

  return features;
}

/**
 * 创建网格状分布的测试要素
 */
export function createGridTestFeatures(
  rows: number,
  cols: number,
  spacing: number = 10
): Feature[] {
  const features: Feature[] = [];
  let idCounter = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * spacing;
      const y = row * spacing;

      features.push({
        type: 'Feature',
        id: `grid-${idCounter++}`,
        geometry: {
          type: 'Point',
          coordinates: [x, y]
        },
        properties: {
          name: `Grid ${row}-${col}`,
          type: 'grid-point',
          row,
          col
        }
      });
    }
  }

  return features;
}

/**
 * 获取所有测试要素的数组
 */
export function getAllTestFeatures(): Feature[] {
  return Object.values(TEST_FEATURES);
}

/**
 * 根据类型获取测试要素
 */
export function getFeaturesByType(type: string): Feature[] {
  return getAllTestFeatures().filter(
    feature => feature.properties?.type === type
  );
}

/**
 * 根据几何类型获取测试要素
 */
export function getFeaturesByGeometryType(geometryType: string): Feature[] {
  return getAllTestFeatures().filter(
    feature => feature.geometry?.type === geometryType
  );
}
