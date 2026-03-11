#!/bin/bash
# WebGeoDB Phase 2 & 3 Issues 创建脚本

set -e

echo "📋 开始创建 Phase 2 & 3 GitHub Issues..."
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 成功计数
SUCCESS_COUNT=0
TOTAL_COUNT=0

# 创建 Issue 的函数
create_issue() {
    local title="$1"
    local body="$2"
    local labels="$3"

    TOTAL_COUNT=$((TOTAL_COUNT + 1))

    echo -e "${BLUE}创建 Issue $TOTAL_COUNT:${NC} $title"

    if gh issue create \
        --title "$title" \
        --body "$body" \
        --label "$labels" \
        --milestone "v1.0.0"; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        echo -e "${GREEN}✅ 创建成功${NC}\n"
    else
        echo -e "${RED}❌ 创建失败${NC}\n"
    fi
}

# Phase 2: 查询转换器
echo -e "${YELLOW}=== Phase 2: 查询转换器 ===${NC}\n"

# Issue 1: 实现 SQLToQueryBuilderTranslator 基础框架
create_issue \
    "feat(sql): 实现 SQLToQueryBuilderTranslator 基础框架" \
    "## 类型: Feature
## 优先级: High
## 复杂度: Medium

### 功能描述
实现 SQL AST 到 QueryBuilder 的核心转换器，支持将解析后的 SQL 语句转换为 WebGeoDB 的链式查询 API。

### 验收标准
- [ ] 实现 SQLToQueryBuilderTranslator 类
- [ ] 支持基本的 SELECT 语句转换
- [ ] 支持表名映射（FROM 子句）
- [ ] 支持列选择器（SELECT 子句）
- [ ] 单元测试覆盖率 ≥ 80%

### 技术方案
\`\`\`typescript
class SQLToQueryBuilderTranslator {
  translate(ast: SQLSelectStatement): QueryBuilder {
    const builder = new QueryBuilder(ast.from, this.storage, this.spatialIndex);

    // 转换 SELECT 子句
    if (ast.columns) {
      builder.select(ast.columns);
    }

    // 转换 WHERE 子句
    if (ast.where) {
      this.translateWhere(ast.where, builder);
    }

    return builder;
  }

  private translateWhere(expr: ASTExpression, builder: QueryBuilder) {
    // WHERE 子句转换逻辑
  }
}
\`\`\`

### 关键文件
- \`packages/core/src/sql/query-translator.ts\`
- \`packages/core/src/sql/ast-nodes.ts\`
- \`packages/core/test/sql/query-translator.test.ts\`

### 依赖关系
- 依赖 Phase 1: SQL 解析器
- 被 Phase 3: PostGIS 函数映射依赖

### 估算工作量
- 基础框架: 1 天
- SELECT 子句转换: 0.5 天
- 单元测试: 0.5 天
- **总计**: 2 天

### 里程碑
v1.0.0" \
    "feature,sql,High"

# Issue 2: WHERE 子句转换
create_issue \
    "feat(sql): 实现 WHERE 子句到 QueryBuilder 的转换" \
    "## 类型: Feature
## 优先级: High
## 复杂度: Medium

### 功能描述
实现 SQL WHERE 子句到 QueryBuilder where() 方法的转换，支持比较运算符、逻辑运算符和函数调用。

### 验收标准
- [ ] 支持比较运算符：=, !=, <, >, <=, >=
- [ ] 支持逻辑运算符：AND, OR, NOT
- [ ] 支持参数化查询（?, \$1）
- [ ] 支持复杂嵌套条件
- [ ] 单元测试覆盖率 ≥ 80%

### 技术方案
\`\`\`typescript
// 示例转换
// SQL: WHERE type = 'poi' AND rating >= 4.0
// → QueryBuilder: where('type', '=', 'poi').where('rating', '>=', 4.0)

private translateWhere(expr: ASTExpression, builder: QueryBuilder) {
  if (expr.type === 'binary') {
    // 比较表达式: field = value
    if (this.isComparisonOperator(expr.operator)) {
      builder.where(expr.left.value, expr.operator, expr.right.value);
    }
    // 逻辑表达式: AND/OR
    else if (this.isLogicalOperator(expr.operator)) {
      this.translateWhere(expr.left, builder);
      this.translateWhere(expr.right, builder);
    }
  }
}
\`\`\`

### 测试用例
\`\`\`typescript
// 简单条件
'SELECT * FROM features WHERE type = ?'
// → where('type', '=', param)

// 复合条件
'SELECT * FROM features WHERE type = ? AND rating >= ?'
// → where('type', '=', param1).where('rating', '>=', param2)

// 嵌套条件
'SELECT * FROM features WHERE (type = ? OR category = ?) AND active = ?'
// → 复杂嵌套逻辑
\`\`\`

### 关键文件
- \`packages/core/src/sql/query-translator.ts\`
- \`packages/core/test/sql/where-clause.test.ts\`

### 依赖关系
- 依赖: Issue #8 (SQLToQueryBuilderTranslator 基础框架)

### 估算工作量
- 实现转换逻辑: 1 天
- 处理嵌套条件: 0.5 天
- 单元测试: 0.5 天
- **总计**: 2 天

### 里程碑
v1.0.0" \
    "feature,sql,High"

# Issue 3: ORDER BY 和 LIMIT/OFFSET 转换
create_issue \
    "feat(sql): 实现 ORDER BY 和 LIMIT/OFFSET 转换" \
    "## 类型: Feature
## 优先级: Medium
## 复杂度: Small

### 功能描述
实现 SQL ORDER BY、LIMIT 和 OFFSET 子句到 QueryBuilder 方法的转换。

### 验收标准
- [ ] 支持 ORDER BY 单列排序
- [ ] 支持 ORDER BY 多列排序
- [ ] 支持 ASC 和 DESC 排序
- [ ] 支持 LIMIT 子句
- [ ] 支持 OFFSET 子句
- [ ] 单元测试覆盖率 ≥ 80%

### 技术方案
\`\`\`typescript
// ORDER BY 转换
if (ast.orderBy && ast.orderBy.length > 0) {
  ast.orderBy.forEach(order => {
    builder.orderBy(order.field, order.direction); // 'ASC' or 'DESC'
  });
}

// LIMIT/OFFSET 转换
if (ast.limit) {
  builder.limit(ast.limit);
}

if (ast.offset) {
  builder.offset(ast.offset);
}
\`\`\`

### 测试用例
\`\`\`typescript
// ORDER BY
'SELECT * FROM features ORDER BY rating DESC'
// → orderBy('rating', 'DESC')

// 多列排序
'SELECT * FROM features ORDER BY type ASC, rating DESC'
// → orderBy('type', 'ASC').orderBy('rating', 'DESC')

// LIMIT/OFFSET
'SELECT * FROM features LIMIT 10 OFFSET 20'
// → limit(10).offset(20)
\`\`\`

### 关键文件
- \`packages/core/src/sql/query-translator.ts\`
- \`packages/core/test/sql/orderby-limit.test.ts\`

### 依赖关系
- 依赖: Issue #8 (SQLToQueryBuilderTranslator 基础框架)

### 估算工作量
- ORDER BY 转换: 0.5 天
- LIMIT/OFFSET 转换: 0.5 天
- 单元测试: 0.5 天
- **总计**: 1.5 天

### 里程碑
v1.0.0" \
    "feature,sql,Medium"

# Issue 4: 集成测试
create_issue \
    "test(sql): 添加查询转换器集成测试" \
    "## 类型: Feature
## 优先级: High
## 复杂度: Small

### 功能描述
为查询转换器添加完整的集成测试，验证端到端的 SQL 到 QueryBuilder 转换功能。

### 验收标准
- [ ] 覆盖所有 SQL 子句（SELECT, WHERE, ORDER BY, LIMIT）
- [ ] 测试复杂查询场景
- [ ] 测试边界情况和错误处理
- [ ] 测试覆盖率 ≥ 85%

### 测试场景
\`\`\`typescript
describe('SQLToQueryBuilderTranslator Integration', () => {
  // 简单查询
  it('should translate simple SELECT query', () => {
    const sql = 'SELECT * FROM features WHERE type = ?';
    const builder = translator.translate(parser.parse(sql));
    // 验证 builder 配置
  });

  // 复杂查询
  it('should translate complex query with multiple conditions', () => {
    const sql = \`SELECT id, name FROM features
                  WHERE type = ? AND rating >= ?
                  ORDER BY rating DESC
                  LIMIT 10\`;
    const builder = translator.translate(parser.parse(sql));
    // 验证所有转换正确
  });

  // 参数化查询
  it('should handle parameterized queries', () => {
    const sql = 'SELECT * FROM features WHERE type = \$1 AND category = \$2';
    // 验证参数正确提取
  });

  // 边界情况
  it('should handle empty WHERE clause', () => {});
  it('should handle no ORDER BY', () => {});
  it('should handle no LIMIT', () => {});
});
\`\`\`

### 关键文件
- \`packages/core/test/sql/query-translator.integration.test.ts\`

### 依赖关系
- 依赖: Issue #8, #9, #10 (所有转换器功能)

### 估算工作量
- 集成测试编写: 1 天
- **总计**: 1 天

### 里程碑
v1.0.0" \
    "test,sql,High"

# Phase 3: PostGIS 兼容
echo -e "${YELLOW}=== Phase 3: PostGIS 兼容 ===${NC}\n"

# Issue 5: PostGIS 函数注册表
create_issue \
    "feat(sql): 实现 PostGISFunctionRegistry 函数注册表" \
    "## 类型: Feature
## 优先级: High
## 复杂度: Medium

### 功能描述
实现 PostGIS 函数注册表，管理 PostGIS 函数到 WebGeoDB SpatialEngine 方法的映射关系。

### 验收标准
- [ ] 实现 PostGISFunctionRegistry 类
- [ ] 支持函数注册和查询
- [ ] 支持函数别名映射
- [ ] 单元测试覆盖率 ≥ 80%

### 技术方案
\`\`\`typescript
interface PostGISFunctionMapping {
  type: 'method' | 'custom';
  target: string | Function;
  argumentCount: number;
}

class PostGISFunctionRegistry {
  private mappings: Map<string, PostGISFunctionMapping>;

  register(name: string, mapping: PostGISFunctionMapping) {
    this.mappings.set(name.toUpperCase(), mapping);
  }

  get(name: string): PostGISFunctionMapping | undefined {
    return this.mappings.get(name.toUpperCase());
  }

  has(name: string): boolean {
    return this.mappings.has(name.toUpperCase());
  }
}

// 使用示例
const registry = new PostGISFunctionRegistry();
registry.register('ST_INTERSECTS', {
  type: 'method',
  target: 'intersects',
  argumentCount: 2
});
\`\`\`

### 关键文件
- \`packages/core/src/sql/postgis-functions.ts\`
- \`packages/core/test/sql/postgis-registry.test.ts\`

### 依赖关系
- 无

### 估算工作量
- 基础实现: 0.5 天
- 单元测试: 0.5 天
- **总计**: 1 天

### 里程碑
v1.0.0" \
    "feature,sql,High"

# Issue 6: 核心空间谓词函数
create_issue \
    "feat(sql): 实现核心 PostGIS 空间谓词函数" \
    "## 类型: Feature
## 优先级: High
## 复杂度: Medium

### 功能描述
实现核心 PostGIS 空间谓词函数的映射，支持 ST_Intersects, ST_Contains, ST_Within, ST_Equals, ST_Disjoint。

### 验收标准
- [ ] 支持 ST_Intersects (相交判断)
- [ ] 支持 ST_Contains (包含判断)
- [ ] 支持 ST_Within (在内部判断)
- [ ] 支持 ST_Equals (相等判断)
- [ ] 支持 ST_Disjoint (不相交判断)
- [ ] 单元测试覆盖率 ≥ 80%

### 技术方案
\`\`\`typescript
// 函数映射
const SPATIAL_PREDICATE_MAP = {
  'ST_INTERSECTS': 'intersects',
  'ST_CONTAINS': 'contains',
  'ST_WITHIN': 'within',
  'ST_EQUALS': 'equals',
  'ST_DISJOINT': 'disjoint',
};

// 使用示例
// SQL: WHERE ST_Intersects(geometry, ST_MakePoint(116.4, 39.9))
// → QueryBuilder: intersects('geometry', [116.4, 39.9])
\`\`\`

### 测试用例
\`\`\`typescript
describe('PostGIS Spatial Predicates', () => {
  it('should translate ST_Intersects', () => {
    const sql = 'SELECT * FROM features WHERE ST_Intersects(geometry, ?)';
    const builder = translator.translate(parser.parse(sql));
    // 验证调用 intersects 方法
  });

  it('should translate ST_Contains', () => {
    const sql = 'SELECT * FROM zones WHERE ST_Contains(geometry, ?)';
    // 验证调用 contains 方法
  });

  it('should support nested geometry functions', () => {
    const sql = 'SELECT * FROM features WHERE ST_Intersects(geometry, ST_Buffer(ST_MakePoint(?, ?), 1000))';
    // 验证嵌套函数正确解析
  });
});
\`\`\`

### 关键文件
- \`packages/core/src/sql/postgis-functions.ts\`
- \`packages/core/test/sql/postgis-predicates.test.ts\`

### 依赖关系
- 依赖: Issue #11 (PostGISFunctionRegistry)

### 估算工作量
- 函数映射实现: 1 天
- 嵌套函数处理: 0.5 天
- 单元测试: 0.5 天
- **总计**: 2 天

### 里程碑
v1.0.0" \
    "feature,sql,High"

# Issue 7: 距离函数
create_issue \
    "feat(sql): 实现 PostGIS 距离函数 (ST_DWithin, ST_Distance)" \
    "## 类型: Feature
## 优先级: High
## 复杂度: Medium

### 功能描述
实现 PostGIS 距离相关函数的映射，支持 ST_DWithin 和 ST_Distance。

### 验收标准
- [ ] 支持 ST_DWithin (距离范围内判断)
- [ ] 支持 ST_Distance (距离计算)
- [ ] 支持距离单位（meters, kilometers）
- [ ] 单元测试覆盖率 ≥ 80%

### 技术方案
\`\`\`typescript
// ST_DWithin 转换
// SQL: WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 1000)
// → QueryBuilder: distance('geometry', [116.4, 39.9], '<=', 1000)

// ST_Distance 转换
// SQL: WHERE ST_Distance(geometry, ST_MakePoint(116.4, 39.9)) < 5000
// → QueryBuilder: distance('geometry', [116.4, 39.9], '<', 5000)

private translateDistanceFunction(func: string, args: any[]) {
  if (func === 'ST_DWithin') {
    return {
      method: 'distance',
      field: args[0].value,
      geometry: this.evaluateGeometry(args[1]),
      operator: '<=',
      value: args[2].value
    };
  } else if (func === 'ST_Distance') {
    return {
      method: 'distance',
      field: args[0].value,
      geometry: this.evaluateGeometry(args[1]),
      operator: '<',
      value: Infinity
    };
  }
}
\`\`\`

### 测试用例
\`\`\`typescript
describe('PostGIS Distance Functions', () => {
  it('should translate ST_DWithin', () => {
    const sql = 'SELECT * FROM features WHERE ST_DWithin(geometry, ST_MakePoint(?, ?), 1000)';
    const builder = translator.translate(parser.parse(sql));
    // 验证 distance 方法调用
  });

  it('should translate ST_Distance with comparison', () => {
    const sql = 'SELECT * FROM features WHERE ST_Distance(geometry, ST_MakePoint(?, ?)) < 5000';
    // 验证正确的 distance 调用
  });
});
\`\`\`

### 关键文件
- \`packages/core/src/sql/postgis-functions.ts\`
- \`packages/core/test/sql/postgis-distance.test.ts\`

### 依赖关系
- 依赖: Issue #11 (PostGISFunctionRegistry)

### 估算工作量
- 函数实现: 1 天
- 单元测试: 0.5 天
- **总计**: 1.5 天

### 里程碑
v1.0.0" \
    "feature,sql,High"

# Issue 8: 几何构造函数
create_issue \
    "feat(sql): 实现 PostGIS 几何构造函数" \
    "## 类型: Feature
## 优先级: Medium
## 复杂度: Medium

### 功能描述
实现 PostGIS 几何构造函数的映射，支持 ST_MakePoint, ST_MakeLine, ST_Buffer, ST_Centroid。

### 验收标准
- [ ] 支持 ST_MakePoint (创建点)
- [ ] 支持 ST_MakeLine (创建线)
- [ ] 支持 ST_Buffer (缓冲区)
- [ ] 支持 ST_Centroid (中心点)
- [ ] 单元测试覆盖率 ≥ 80%

### 技术方案
\`\`\`typescript
import * as turf from '@turf/turf';

const GEOMETRY_CONSTRUCTORS = {
  'ST_MAKEPOINT': (x, y) => turf.point([x, y]),
  'ST_MAKELINE': (points) => turf.lineString(points),
  'ST_BUFFER': (geometry, radius, units = 'meters') => turf.buffer(geometry, radius, { units }),
  'ST_CENTROID': (geometry) => turf.centroid(geometry),
};

// 使用示例
// ST_MakePoint(116.4, 39.9) → { type: 'Point', coordinates: [116.4, 39.9] }
// ST_Buffer(geometry, 1000) → Turf.js buffer result
\`\`\`

### 测试用例
\`\`\`typescript
describe('PostGIS Geometry Constructors', () => {
  it('should translate ST_MakePoint', () => {
    const result = evaluateFunction('ST_MakePoint', [116.4, 39.9]);
    expect(result.type).toBe('Point');
    expect(result.coordinates).toEqual([116.4, 39.9]);
  });

  it('should translate ST_Buffer', () => {
    const point = { type: 'Point', coordinates: [116.4, 39.9] };
    const result = evaluateFunction('ST_Buffer', [point, 1000]);
    expect(result.type).toBe('Feature');
  });

  it('should support nested constructors', () => {
    // ST_Buffer(ST_MakePoint(116.4, 39.9), 1000)
  });
});
\`\`\`

### 关键文件
- \`packages/core/src/sql/postgis-functions.ts\`
- \`packages/core/test/sql/postgis-constructors.test.ts\`

### 依赖关系
- 依赖: Issue #11 (PostGISFunctionRegistry)

### 估算工作量
- 函数实现: 1 天
- Turf.js 集成: 0.5 天
- 单元测试: 0.5 天
- **总计**: 2 天

### 里程碑
v1.0.0" \
    "feature,sql,Medium"

# Issue 9: 格式转换函数
create_issue \
    "feat(sql): 实现 PostGIS 格式转换函数 (WKT/WKB)" \
    "## 类型: Feature
## 优先级: Medium
## 复杂度: Small

### 功能描述
实现 PostGIS 格式转换函数的映射，支持 ST_GeomFromText, ST_AsText, ST_AsBinary。

### 验收标准
- [ ] 支持 ST_GeomFromText (WKT 转 GeoJSON)
- [ ] 支持 ST_AsText (GeoJSON 转 WKT)
- [ ] 支持 ST_AsBinary (GeoJSON 转 WKB)
- [ ] 单元测试覆盖率 ≥ 80%

### 技术方案
\`\`\`typescript
import wellknown from 'wellknown';

const FORMAT_CONVERTERS = {
  'ST_GEOMFROMTEXT': (wkt) => wellknown.parse(wkt),
  'ST_ASTEXT': (geojson) => wellknown.stringify(geojson),
  'ST_ASBINARY': (geojson) => {
    // 使用 Turf.js 或其他库转换为 WKB
    return geojsonToWkb(geojson);
  },
};

// 使用示例
// ST_GeomFromText('POINT(116.4 39.9)') → { type: 'Point', coordinates: [116.4, 39.9] }
// ST_AsText(geometry) → 'POINT(116.4 39.9)'
\`\`\`

### 测试用例
\`\`\`typescript
describe('PostGIS Format Converters', () => {
  it('should translate ST_GeomFromText', () => {
    const result = evaluateFunction('ST_GeomFromText', ['POINT(116.4 39.9)']);
    expect(result.type).toBe('Point');
  });

  it('should translate ST_AsText', () => {
    const geom = { type: 'Point', coordinates: [116.4, 39.9] };
    const result = evaluateFunction('ST_AsText', [geom]);
    expect(result).toBe('POINT(116.4 39.9)');
  });

  it('should handle complex geometries', () => {
    const wkt = 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))';
    const result = evaluateFunction('ST_GeomFromText', [wkt]);
    expect(result.type).toBe('Polygon');
  });
});
\`\`\`

### 关键文件
- \`packages/core/src/sql/postgis-functions.ts\`
- \`packages/core/test/sql/postgis-formats.test.ts\`

### 依赖关系
- 依赖: Issue #11 (PostGISFunctionRegistry)

### 估算工作量
- 函数实现: 0.5 天
- wellknown 库集成: 0.5 天
- 单元测试: 0.5 天
- **总计**: 1.5 天

### 里程碑
v1.0.0" \
    "feature,sql,Medium"

# Issue 10: PostGIS 集成测试
create_issue \
    "test(sql): 添加 PostGIS 函数集成测试" \
    "## 类型: Feature
## 优先级: High
## 复杂度: Medium

### 功能描述
为 PostGIS 函数映射添加完整的集成测试，验证端到端的 SQL PostGIS 函数到 SpatialEngine 的转换功能。

### 验收标准
- [ ] 覆盖所有空间谓词函数
- [ ] 覆盖所有距离函数
- [ ] 覆盖所有几何构造函数
- [ ] 覆盖所有格式转换函数
- [ ] 测试嵌套函数调用
- [ ] 测试覆盖率 ≥ 85%

### 测试场景
\`\`\`typescript
describe('PostGIS Integration Tests', () => {
  // 空间谓词
  it('should execute query with ST_Intersects', async () => {
    const results = await db.query(\`
      SELECT * FROM features
      WHERE ST_Intersects(geometry, ST_MakePoint(116.4, 39.9))
    \`);
    expect(Array.isArray(results)).toBe(true);
  });

  // 距离查询
  it('should execute query with ST_DWithin', async () => {
    const results = await db.query(\`
      SELECT * FROM features
      WHERE ST_DWithin(geometry, ST_MakePoint(116.4, 39.9), 1000)
    \`);
    expect(Array.isArray(results)).toBe(true);
  });

  // 复杂嵌套
  it('should handle nested PostGIS functions', async () => {
    const results = await db.query(\`
      SELECT * FROM features
      WHERE ST_Intersects(
        geometry,
        ST_Buffer(ST_MakePoint(116.4, 39.9), 500)
      )
    \`);
    expect(Array.isArray(results)).toBe(true);
  });

  // 混合查询
  it('should combine PostGIS with attribute filters', async () => {
    const results = await db.query(\`
      SELECT * FROM features
      WHERE type = ?
        AND ST_DWithin(geometry, ST_MakePoint(?, ?), 1000)
    \`, ['poi', 116.4, 39.9]);
    expect(Array.isArray(results)).toBe(true);
  });

  // 格式转换
  it('should support WKT input', async () => {
    const results = await db.query(\`
      SELECT * FROM features
      WHERE ST_Intersects(
        geometry,
        ST_GeomFromText('POINT(116.4 39.9)')
      )
    \`);
    expect(Array.isArray(results)).toBe(true);
  });
});
\`\`\`

### 关键文件
- \`packages/core/test/sql/postgis-integration.test.ts\`

### 依赖关系
- 依赖: Issue #11, #12, #13, #14, #15 (所有 PostGIS 函数)

### 估算工作量
- 集成测试编写: 1.5 天
- **总计**: 1.5 天

### 里程碑
v1.0.0" \
    "test,sql,High"

# 总结
echo -e "${YELLOW}=== 创建总结 ===${NC}\n"
echo -e "总 Issue 数: $TOTAL_COUNT"
echo -e "成功创建: ${GREEN}$SUCCESS_COUNT${NC}"
echo ""
echo -e "📊 Phase 2 & 3 Issues 列表:"
echo "1. feat(sql): 实现 SQLToQueryBuilderTranslator 基础框架"
echo "2. feat(sql): 实现 WHERE 子句到 QueryBuilder 的转换"
echo "3. feat(sql): 实现 ORDER BY 和 LIMIT/OFFSET 转换"
echo "4. test(sql): 添加查询转换器集成测试"
echo "5. feat(sql): 实现 PostGISFunctionRegistry 函数注册表"
echo "6. feat(sql): 实现核心 PostGIS 空间谓词函数"
echo "7. feat(sql): 实现 PostGIS 距离函数"
echo "8. feat(sql): 实现 PostGIS 几何构造函数"
echo "9. feat(sql): 实现 PostGIS 格式转换函数"
echo "10. test(sql): 添加 PostGIS 函数集成测试"
echo ""
echo -e "📌 查看所有 Issues:"
echo "gh issue list"
echo ""
echo -e "🎯 下一步:"
echo "1. 按照依赖顺序从 Issue #8 开始实现"
echo "2. 遵循 feature-development.md 检查清单"
echo "3. 创建分支: git checkout -b feature/issue-name"
echo "4. 创建 PR 并关联 Issue"
