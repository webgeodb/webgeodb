# 开发流程规范

> 📌 **本文档定义 WebGeoDB 的完整开发流程**

---

## 🎯 开发流程概览

```mermaid
graph TD
    A[1. 需求分析] --> B[2. 方案设计]
    B --> C[3. 任务分解]
    C --> D[4. TDD 开发]
    D --> E[5. 代码审查]
    E --> F[6. 测试验证]
    F --> G[7. 文档更新]
    G --> H[8. 代码提交]
    H --> I[9. CI/CD]
    I --> J{CI 通过?}
    J -->|否| D
    J -->|是| K[10. 代码合并]
```

---

## 1. 需求分析阶段

### 目标
- 明确功能需求和验收标准
- 识别技术风险和依赖关系
- 评估工作量和时间

### 输出
- 需求文档（简单功能可省略）
- 验收标准清单
- 技术风险评估

### 检查点
- [ ] 需求是否清晰明确？
- [ ] 是否有歧义或遗漏？
- [ ] 技术上是否可行？
- [ ] 是否有现成方案可复用？

---

## 2. 方案设计阶段

### 目标
- 设计技术方案和架构
- 选择合适的技术栈
- 确保向后兼容性

### 输出
- 技术方案文档（复杂功能）
- 接口设计（TypeScript 类型）
- 数据结构设计

### 设计原则
1. **简单优先**: 选择最简单的方案
2. **渐进增强**: 先实现核心功能
3. **向后兼容**: 不破坏现有 API
4. **性能考虑**: 评估性能影响

### 检查点
- [ ] 方案是否过度设计？
- [ ] 是否有现成库可用？
- [ ] 是否影响现有功能？
- [ ] 性能是否可接受？

---

## 3. 任务分解阶段

### 目标
- 将大功能分解为小任务
- 明确任务依赖关系
- 估算工作量和时间

### 方法
使用 WBS（工作分解结构）：
```
功能: SQL 查询支持
├── 1.1 SQL 解析器 (2天)
│   ├── 1.1.1 集成 node-sql-parser (0.5天)
│   ├── 1.1.2 实现 AST 转换 (1天)
│   └── 1.1.3 单元测试 (0.5天)
├── 1.2 查询转换器 (2天)
│   └── ...
└── 1.3 E2E 测试 (1天)
    └── ...
```

### 检查点
- [ ] 每个任务是否可独立完成？
- [ ] 任务大小是否合理（< 2天）？
- [ ] 依赖关系是否明确？
- [ ] 工作量估算是否合理？

---

## 4. TDD 开发阶段

### 4.1 Red（写失败的测试）
```typescript
// 1. 先写测试
it('should parse SQL SELECT statement', () => {
  const sql = 'SELECT * FROM features WHERE type = $1';
  const ast = parser.parse(sql);

  expect(ast.type).toBe('select');
  expect(ast.from).toBe('features');
});

// 2. 运行测试（应该失败）
// pnpm test → ❌ FAILED
```

### 4.2 Green（实现功能）
```typescript
// 3. 编写最小代码使测试通过
class SQLParser {
  parse(sql: string): AST {
    // 最简实现
    return {
      type: 'select',
      from: 'features'
    };
  }
}

// 4. 运行测试（应该通过）
// pnpm test → ✅ PASSED
```

### 4.3 Refactor（重构代码）
```typescript
// 5. 优化代码质量
class SQLParser {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  parse(sql: string): AST {
    const ast = this.parser.astify(sql, {
      database: 'PostgreSQL'
    });

    return this.normalizeAST(ast);
  }

  private normalizeAST(ast: any): AST {
    // 转换逻辑
  }
}

// 6. 确保测试仍然通过
// pnpm test → ✅ PASSED
```

### 检查点
- [ ] 是否遵循 TDD 流程？
- [ ] 测试是否覆盖核心功能？
- [ ] 测试是否覆盖边界情况？
- [ ] 代码是否易于理解？

---

## 5. 代码审查阶段

### 自我审查
使用 `.claude/docs/checklists/code-review.md`：
- [ ] 类型安全（无 any）
- [ ] 错误处理完整
- [ ] 测试覆盖充分
- [ ] 导入路径正确
- [ ] 文档完整

### 同伴审查
1. 创建 Pull Request
2. 填写 PR 模板
3. 至少一位审查者批准
4. 处理所有审查意见

### 检查点
- [ ] 是否完成自我审查？
- [ ] PR 描述是否清晰？
- [ ] 是否关联相关 Issue？
- [ ] CI 是否通过？

---

## 6. 测试验证阶段

### 本地测试
```bash
# 1. 单元测试
pnpm test

# 2. 覆盖率测试
pnpm test:coverage

# 3. 多浏览器测试
pnpm test:chrome
pnpm test:firefox
pnpm test:webkit

# 4. 构建测试
pnpm build
```

### 质量门禁
- ✅ 所有测试通过
- ✅ 覆盖率 ≥ 80%
- ✅ 无 TypeScript 错误
- ✅ 构建成功

### 检查点
- [ ] 所有测试是否通过？
- [ ] 覆盖率是否达标？
- [ ] 是否在所有浏览器中通过？
- [ ] 构建是否成功？

---

## 7. 文档更新阶段

### 代码文档
```typescript
/**
 * SQL 查询执行器
 *
 * @example
 * ```typescript
 * const results = await db.query(`
 *   SELECT * FROM features WHERE type = $1
 * `, ['restaurant']);
 * ```
 */
class SQLExecutor {
  // ...
}
```

### 用户文档
- [ ] 更新 `docs/api/reference.md`
- [ ] 更新 `docs/guides/` 相关指南
- [ ] 添加示例代码到 `examples/`
- [ ] 更新 `CHANGELOG.md`

### 开发文档
- [ ] 更新技术文档（如有新架构）
- [ ] 更新 `CLAUDE.md`（如有新规范）
- [ ] 记录已知问题

### 检查点
- [ ] 公共 API 是否有文档？
- [ ] 是否有使用示例？
- [ ] CHANGELOG 是否更新？
- [ ] 是否记录了破坏性变更？

---

## 8. 代码提交阶段

### Commit 格式
```bash
git commit -m "feat: 添加 SQL 查询支持

- 实现 SQL 解析器（基于 node-sql-parser）
- 实现 AST 到 QueryBuilder 的转换
- 添加 PostGIS 函数映射

Closes #123
"
```

### 提交检查
- [ ] Commit 信息清晰
- [ ] 使用约定式提交格式
- [ ] 包含相关 Issue 号
- [ ] 没有 WIP 提交

---

## 9. CI/CD 阶段

### CI 检查
```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]

    steps:
      - checkout
      - install dependencies
      - run tests
      - check coverage
```

### 质量门禁
- ✅ 所有浏览器测试通过
- ✅ 覆盖率 ≥ 80%
- ✅ 无 lint 错误
- ✅ 构建成功

### 检查点
- [ ] CI 是否通过？
- [ ] 所有浏览器是否测试？
- [ ] 覆盖率是否达标？

---

## 10. 代码合并阶段

### 合并前检查
- [ ] 所有审查意见已处理
- [ ] CI 测试全部通过
- [ ] 文档已更新
- [ ] 无合并冲突

### 合并方式
- 使用 Squash and Merge
- 删除功能分支
- 保留有意义的历史记录

### 合并后
- [ ] 验证线上构建
- [ ] 更新版本号（如需要）
- [ ] 发布 Release Notes
- [ ] 通知团队

---

## 🚨 常见陷阱

### ❌ 跳过测试
```
"我先写代码，后补测试"  // ❌
"测试太简单，不需要"    // ❌
"CI 失败了，但我本地通过" // ❌
```

### ❌ 忽略文档
```
"代码自解释，不需要文档" // ❌
"文档以后再补"         // ❌
"CHANGELOG 忘了更新"   // ❌
```

### ❌ 违反规范
```
"这次特殊情况，可以违反" // ❌
"规范太严格了"         // ❌
"我习惯这样写"         // ❌
```

---

## ✅ 最佳实践

### 1. 渐进式开发
```
MVP → 功能完善 → 性能优化 → 文档补全
```

### 2. 持续集成
```
小步快跑，频繁提交，及时发现问题
```

### 3. 代码审查
```
所有代码必须经过审查，包括自己的
```

### 4. 文档同步
```
代码和文档同步更新，不积累技术债务
```

---

## 📊 效率指标

### 开发效率
- **任务完成率**: 计划任务 / 实际完成
- **时间准确度**: 估算时间 / 实际时间
- **返工率**: 修复 bug 时间 / 开发时间

### 质量指标
- **测试覆盖率**: ≥ 80%
- **Bug 密度**: < 1 bug / 1000 行代码
- **代码审查通过率**: ≥ 95%

### 流程指标
- **CI 通过率**: ≥ 95%
- **平均审查时间**: < 24 小时
- **平均合并时间**: < 48 小时

---

**记住**: 遵循流程是质量的保障，不是效率的障碍！
