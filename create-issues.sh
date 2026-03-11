#!/bin/bash
# WebGeoDB Issues 创建脚本
# 按照新工作流创建 GitHub Issues

set -e

echo "📋 开始创建 GitHub Issues..."
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

# Bug Issues
echo -e "${YELLOW}=== 创建 Bug Issues ===${NC}\n"

# Bug 1: 空间查询测试失败
create_issue \
    "fix(spatial): 空间查询测试失败 (6个失败用例)" \
    "## 类型: Bug
## 严重程度: High

### 问题描述
test/query/spatial-queries.test.ts 中有 6 个测试用例失败，涉及空间关系判断精度问题。

### 失败的测试
1. should find Point within Polygon - expected true to be false
2. should support contains() with where() - expected false to be true
3. should combine intersects with attribute filters - expected false to be true
4. should handle empty geometries - expected 0 results but got 1
5. should handle cross-shaped geometries - expected 1 but got 0
6. should handle large numbers of contains operations efficiently - expected false to be true

### 复现步骤
\`\`\`bash
pnpm test -- test/query/spatial-queries.test.ts
\`\`\`

### 期望行为
所有空间关系判断测试应该通过，空间谓词计算精度应该在可接受范围内。

### 实际行为
6 个测试用例失败，主要涉及：
- contains 谓词判断不准确
- intersects 谓词边界情况处理不当
- 空几何体过滤不正确

### 环境信息
- 文件: test/query/spatial-queries.test.ts
- 影响范围: 空间查询核心功能
- 优先级: High（核心功能）

### 可能原因
- Turf.js 空间计算精度问题
- 空间谓词实现逻辑问题
- 边界条件处理不当


### 里程碑
v1.0.0" \
    "bug,spatial,High"

# Bug 2: 查询构建器边界情况测试失败
create_issue \
    "fix(query): 查询构建器边界情况测试失败 (3个失败用例)" \
    "## 类型: Bug
## 严重程度: Medium

### 问题描述
test/query/query-builder-edge-cases.test.ts 中有 3 个测试用例失败。

### 失败的测试
1. should combine where, spatial, orderBy, limit, offset - expected false to be true
2. should combine nested property access with spatial query - expected false to be true
3. should handle in operator with spatial query - expected 1 but got 0

### 复现步骤
\`\`\`bash
pnpm test -- test/query/query-builder-edge-cases.test.ts
\`\`\`

### 期望行为
复杂查询组合应该正常工作，包括：
- 属性过滤 + 空间查询组合
- 嵌套属性访问 + 空间查询
- in 操作符 + 空间查询

### 实际行为
查询结果不正确，可能原因：
- 多条件组合逻辑问题
- 属性过滤和空间过滤的执行顺序
- in 操作符解析或执行问题

### 环境信息
- 文件: test/query/query-builder-edge-cases.test.ts
- 影响范围: 查询构建器


### 里程碑
v1.0.0" \
    "bug,query,Medium"

# Bug 3: 空间引擎测试失败 (4个失败)
create_issue \
    "fix(spatial): 空间引擎测试失败 (4个失败用例)" \
    "## 类型: Bug
## 严重程度: Medium

### 问题描述
test/spatial/spatial-engine.test.ts 中有 4 个测试用例失败。

### 失败的测试
1. should correctly judge crossed lines (Crosses 谓词) - expected false to be true
2. should correctly judge point touches line (Touches 谓词) - expected false to be true
3. should correctly judge face touches face (Touches 谓词) - expected false to be true
4. should be able to get engine information (expected 'custom' but got 'turf')

### 复现步骤
\`\`\`bash
pnpm test -- test/spatial/spatial-engine.test.ts
\`\`\`

### 期望行为
空间谓词应该正确判断几何关系，自定义引擎应该能正确获取。

### 实际行为
- Crosses 谓词返回 false（应该为 true）
- Touches 谓词返回 false（应该为 true）
- 引擎信息获取失败（返回默认引擎而非自定义引擎）

### 可能原因
- JSTS 或 Turf.js 空间谓词实现问题
- 引擎注册表逻辑问题
- 引擎信息获取方法错误

### 环境信息
- 文件: test/spatial/spatial-engine.test.ts
- 影响范围: 空间引擎


### 里程碑
v1.0.0" \
    "bug,spatial,Medium"

# Bug 4: 查询缓存测试失败 (3个失败)
create_issue \
    "fix(cache): 查询缓存测试失败 (3个失败用例)" \
    "## 类型: Bug
## 严重程度: Medium

### 问题描述
test/query/query-cache.test.ts 中有 3 个测试用例失败。

### 失败的测试
1. should invalidate cache on update - SchemaError: KeyPath properties.rating on object store features is not indexed
2. should invalidate cache on geometry update - 同样的 SchemaError
3. 应该在更新时正确失效缓存，但出现了索引错误

### 复现步骤
\`\`\`bash
pnpm test -- test/query/query-cache.test.ts
\`\`\`

### 期望行为
数据更新时应该正确失效相关缓存，但不应抛出 SchemaError。

### 实际行为
更新操作导致 SchemaError，错误提示索引字段不存在。

### 可能原因
- 缓存失效逻辑使用了未创建的索引
- 缓存失效机制设计不完善
- 索引创建和缓存失效的时序问题

### 环境信息
- 文件: test/query/query-cache.test.ts
- 影响范围: 查询缓存机制


### 里程碑
v1.0.0" \
    "bug,cache,Medium"

# Bug 5: 索引自动维护测试失败 (3个失败)
create_issue \
    "fix(index): 索引自动维护测试失败 (3个失败用例)" \
    "## 类型: Bug
## 严重程度: Medium

### 问题描述
test/index/index-auto-maintenance.test.ts 中有 3 个测试用例失败。

### 复现步骤
\`\`\`bash
pnpm test -- test/index/index-auto-maintenance.test.ts
\`\`\`

### 期望行为
索引应该能够自动维护，包括创建、更新和删除操作。

### 实际行为
索引自动维护功能未能正常工作。

### 可能原因
- 索引自动维护触发逻辑问题
- 索引同步机制缺失
- 事件监听器未正确设置

### 环境信息
- 文件: test/index/index-auto-maintenance.test.ts
- 影响范围: 空间索引自动维护


### 里程碑
v1.0.0" \
    "bug,index,Medium"

# Bug 6: 优化谓词测试失败 (2个失败)
create_issue \
    "fix(optimization): 优化谓词测试失败 (2个失败用例)" \
    "## 类型: Bug
## 严重程度: Low

### 问题描述
test/query/optimized-predicates.test.ts 中有 2 个测试用例失败。

### 复现步骤
\`\`\`bash
pnpm test -- test/query/optimized-predicates.test.ts
\`\`\`

### 期望行为
查询优化器应该能够正确优化和执行查询。

### 实际行为
优化谓词未能正确工作。

### 可能原因
- 优化逻辑不完整
- 多条件优化算法问题
- 优化效果未达预期

### 环境信息
- 文件: test/query/optimized-predicates.test.ts
- 影响范围: 查询优化器


### 里程碑
v1.1.0" \
    "bug,optimization,Low"

echo ""
echo -e "${GREEN}=== Bug Issues 创建完成 ===${NC}"
echo -e "成功创建: ${SUCCESS_COUNT}/${TOTAL_COUNT}"
echo ""

# Feature Issues
echo -e "${YELLOW}=== 创建 Feature Issues ===${NC}\n"

# Feature 1: DatabaseClosedError 处理
create_issue \
    "feat(test): 修复 DatabaseClosedError 测试清理问题" \
    "## 类型: Feature
## 优先级: Medium
## 复杂度: Small

### 功能描述
改进测试清理机制，避免 DatabaseClosedError 在测试结束时出现。

### 问题描述
当前在 SQL E2E 测试中，测试结束后数据库关闭，但缓存查询仍在执行，导致 DatabaseClosedError。

### 验收标准
- [ ] 测试清理机制正确处理异步操作
- [ ] 不再出现 DatabaseClosedError
- [ ] 测试仍然能够正确清理资源
- [ ] 不影响测试执行速度

### 技术方案
1. 在测试清理时增加适当的等待逻辑
2. 使用 Promise.allSettled 处理并发清理
3. 或改进缓存失效机制避免异步查询

### 估算工作量
- 问题分析: 1 小时
- 修复实现: 2 小时
- 测试验证: 1 小时
- **总计**: 4 小时


### 里程碑
v1.1.0" \
    "feature,test,Medium"

echo ""
echo -e "${GREEN}=== Feature Issues 创建完成 ===${NC}"
echo -e "总 Issue 数: ${TOTAL_COUNT}"
echo -e "成功创建: ${SUCCESS_COUNT}"
echo ""
echo "📊 Issues 列表:"
echo "1. fix(spatial): 空间查询测试失败 (6个失败用例)"
echo "2. fix(query): 查询构建器边界情况测试失败 (3个失败用例)"
echo "3. fix(spatial): 空间引擎测试失败 (4个失败用例)"
echo "4. fix(cache): 查询缓存测试失败 (3个失败用例)"
echo "5. fix(index): 索引自动维护测试失败 (3个失败用例)"
echo "6. fix(optimization): 优化谓词测试失败 (2个失败用例)"
echo "7. feat(test): 修复 DatabaseClosedError 测试清理问题"
echo ""
echo "📌 查看所有 Issues:"
echo "gh issue list"
echo ""
echo "🎯 下一步:"
echo "1. 按照 Git 工作流为每个 Issue 创建分支"
echo "2. 遵循 bug-fix.md 或 feature-development.md 检查清单"
echo "3. 创建 PR 并合并代码"
