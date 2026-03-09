import type { Geometry, Position } from '../../src/types';

/**
 * 创建 Point 几何对象
 */
export function createPoint(x: number, y: number): Geometry {
  return { type: 'Point', coordinates: [x, y] };
}

/**
 * 创建 LineString 几何对象
 */
export function createLineString(coordinates: Position[]): Geometry {
  return { type: 'LineString', coordinates };
}

/**
 * 创建 Polygon 几何对象
 */
export function createPolygon(rings: Position[][]): Geometry {
  return { type: 'Polygon', coordinates: rings };
}

/**
 * 创建 MultiPoint 几何对象
 */
export function createMultiPoint(coordinates: Position[]): Geometry {
  return { type: 'MultiPoint', coordinates };
}

/**
 * 创建 MultiLineString 几何对象
 */
export function createMultiLineString(rings: Position[][]): Geometry {
  return { type: 'MultiLineString', coordinates: rings };
}

/**
 * 创建 MultiPolygon 几何对象
 */
export function createMultiPolygon(polygons: Position[][][]): Geometry {
  return { type: 'MultiPolygon', coordinates: polygons };
}

/**
 * 创建 GeometryCollection 几何对象
 */
export function createGeometryCollection(geometries: Geometry[]): Geometry {
  return { type: 'GeometryCollection', geometries };
}

/**
 * 创建带孔洞的 Polygon
 */
export function createPolygonWithHoles(
  exteriorRing: Position[],
  holes: Position[][]
): Geometry {
  return { type: 'Polygon', coordinates: [exteriorRing, ...holes] };
}

/**
 * 预定义测试几何对象集
 */
export const TEST_GEOMETRIES = {
  // 基础点几何
  origin: createPoint(0, 0),
  simplePoint: createPoint(30, 10),
  pointInside: createPoint(5, 5),
  pointOutside: createPoint(100, 100),
  pointOnBoundary: createPoint(0, 5),
  pointOnVertex: createPoint(0, 0),

  // 线性几何
  simpleLineString: createLineString([
    [0, 0],
    [10, 10]
  ]),
  lineStringInside: createLineString([
    [2, 2],
    [8, 8]
  ]),
  lineStringCrossing: createLineString([
    [-5, 5],
    [15, 5]
  ]),

  // 多边形几何
  unitSquare: createPolygon([
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0]
    ]
  ]),

  smallPolygon: createPolygon([
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0]
    ]
  ]),

  largePolygon: createPolygon([
    [
      [-10, -10],
      [20, -10],
      [20, 20],
      [-10, 20],
      [-10, -10]
    ]
  ]),

  containingPolygon: createPolygon([
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0]
    ]
  ]),

  containedPolygon: createPolygon([
    [
      [2, 2],
      [8, 2],
      [8, 8],
      [2, 8],
      [2, 2]
    ]
  ]),

  // 带孔洞的多边形
  polygonWithHole: createPolygonWithHoles(
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0]
    ],
    [
      [
        [3, 3],
        [7, 3],
        [7, 7],
        [3, 7],
        [3, 3]
      ]
    ]
  ),

  // 多点几何
  multiPoint: createMultiPoint([
    [0, 0],
    [5, 5],
    [10, 10]
  ]),

  // 多线几何
  multiLineString: createMultiLineString([
    [
      [0, 0],
      [5, 5]
    ],
    [
      [5, 5],
      [10, 10]
    ]
  ]),

  // 多多边形
  multiPolygon: createMultiPolygon([
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
  ]),

  // 几何集合
  geometryCollection: createGeometryCollection([
    createPoint(5, 5),
    createLineString([
      [0, 0],
      [10, 10]
    ]),
    createPolygon([
      [
        [2, 2],
        [8, 2],
        [8, 8],
        [2, 8],
        [2, 2]
      ]
    ])
  ]),

  // 复杂几何 - 三角形
  triangle: createPolygon([
    [
      [0, 0],
      [10, 0],
      [5, 10],
      [0, 0]
    ]
  ]),

  // 复杂几何 - L形多边形
  lShape: createPolygon([
    [
      [0, 0],
      [10, 0],
      [10, 3],
      [3, 3],
      [3, 10],
      [0, 10],
      [0, 0]
    ]
  ])
};

/**
 * 几何关系测试用例对
 */
export const GEOMETRY_RELATIONSHIPS = {
  // Point 包含关系
  pointInPolygon: {
    container: TEST_GEOMETRIES.containingPolygon,
    contained: TEST_GEOMETRIES.pointInside
  },
  pointOutsidePolygon: {
    container: TEST_GEOMETRIES.containingPolygon,
    contained: TEST_GEOMETRIES.pointOutside
  },

  // Polygon 包含关系
  polygonInPolygon: {
    container: TEST_GEOMETRIES.containingPolygon,
    contained: TEST_GEOMETRIES.containedPolygon
  },

  // LineString 在 Polygon 内部
  lineStringInPolygon: {
    container: TEST_GEOMETRIES.containingPolygon,
    contained: TEST_GEOMETRIES.lineStringInside
  },

  // 自相交几何
  selfIntersectingLine: createLineString([
    [0, 0],
    [10, 10],
    [10, 0],
    [0, 10]
  ])
};

/**
 * 生成随机点几何
 */
export function randomPoint(
  bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 }
): Geometry {
  const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
  const y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
  return createPoint(x, y);
}

/**
 * 生成随机矩形
 */
export function randomPolygon(
  bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 }
): Geometry {
  const x1 = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
  const y1 = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
  const x2 = x1 + 5 + Math.random() * 20;
  const y2 = y1 + 5 + Math.random() * 20;

  return createPolygon([
    [
      [x1, y1],
      [x2, y1],
      [x2, y2],
      [x1, y2],
      [x1, y1]
    ]
  ]);
}

/**
 * 批量生成测试几何
 */
export function generateTestGeometries(count: number): Geometry[] {
  const geometries: Geometry[] = [];
  for (let i = 0; i < count; i++) {
    geometries.push(randomPoint());
  }
  return geometries;
}
