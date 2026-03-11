# 新功能开发检查清单

> 📌 **开发新功能时必须严格执行此检查清单**

## ✅ 前置准备阶段

### 1. 需求理解
- [ ] 明确功能需求和验收标准
- [ ] 确认技术可行性和风险评估
- [ ] 识别依赖关系和阻塞点

### 2. 方案设计
- [ ] 编写技术方案文档（架构、技术选型）
- [ ] 设计数据结构和接口
- [ ] 考虑向后兼容性
- [ ] 评估性能影响

### 3. 任务分解
- [ ] 创建 WBS（工作分解结构）
- [ ] 估算工作量（开发、测试、文档）
- [ ] 确定里程碑和交付时间

## ✅ 开发阶段

### 4. 环境准备
```bash
# 创建功能分支
git checkout -b feature/your-feature-name

# 更新依赖（如需要）
pnpm install
```

### 5. TDD 开发流程
- [ ] **先写测试**（RED）- 编写失败的测试用例
- [ ] **实现功能**（GREEN）- 编写最小代码使测试通过
- [ ] **重构代码**（IMPROVE）- 优化代码质量
- [ ] **验证覆盖率** - 确保测试覆盖率 > 80%

### 6. 代码规范检查
- [ ] TypeScript 类型安全（无 `any`）
- [ ] 导入路径正确（test/ 用 `../src`）
- [ ] 遵循命名规范（PascalCase/camelCase）
- [ ] 添加 JSDoc 注释（公共 API）
- [ ] 错误处理完整（try-catch）

### 7. SQL 相关检查（如适用）
- [ ] 使用 PostgreSQL 参数风格（`$1`, `$2`）
- [ ] PostGIS 函数命名正确（`ST_Intersects`）
- [ ] SQL 性能优化（索引、缓存）
- [ ] 参数化查询（防注入）

## ✅ 测试阶段

### 8. 单元测试
- [ ] 测试覆盖核心功能路径
- [ ] 测试边界条件和异常情况
- [ ] 测试异步操作（正确使用 await）
- [ ] 测试内存泄漏（大数据量）

### 9. 集成测试
- [ ] 测试模块间交互
- [ ] 测试与存储层的集成
- [ ] 测试与空间引擎的集成

### 10. 浏览器测试
```bash
# 必须在所有浏览器中通过
pnpm test:chrome   # ✅ 通过
pnpm test:firefox  # ✅ 通过
pnpm test:webkit   # ✅ 通过
```

### 11. 性能测试
- [ ] 大数据量测试（10000+ 记录）
- [ ] 空间查询性能（< 2s）
- [ ] 内存使用检查（无泄漏）

## ✅ 文档阶段

### 12. 代码文档
- [ ] 添加 JSDoc 注释（所有公共 API）
- [ ] 更新 TypeScript 类型定义
- [ ] 添加使用示例（代码注释）

### 13. 用户文档
- [ ] 更新 API 参考文档（`docs/api/reference.md`）
- [ ] 添加使用指南（`docs/guides/`）
- [ ] 更新 CHANGELOG.md
- [ ] 添加示例代码（`examples/`）

### 14. 开发文档
- [ ] 更新技术文档（如有新架构）
- [ ] 更新 CLAUDE.md（如有新规范）
- [ ] 记录已知问题和限制

## ✅ 代码审查阶段

### 15. 自我审查
使用 `.claude/docs/checklists/code-review.md` 进行自我审查：

- [ ] 代码风格一致
- [ ] 类型安全完整
- [ ] 错误处理充分
- [ ] 测试覆盖充分
- [ ] 性能可接受
- [ ] 文档完整

### 16. 本地验证
```bash
# 完整的本地验证流程
pnpm test          # 所有测试通过
pnpm test:coverage # 覆盖率 > 80%
pnpm build         # 构建成功
pnpm lint          # 无 lint 错误
```

## ✅ 提交阶段

### 17. Git 提交
```bash
# 查看变更
git status
git diff

# 提交变更
git add .
git commit -m "feat: 添加功能描述

- 主要变更点1
- 主要变更点2

测试: 添加xx测试
文档: 更新xx文档
"
```

### 18. 推送到远程
```bash
# 拉取最新代码
git pull origin main --rebase

# 推送功能分支
git push -u origin feature/your-feature-name
```

### 19. 创建 Pull Request
- [ ] 填写 PR 模板
- [ ] 关联相关 Issue
- [ ] 添加测试截图（如适用）
- [ ] 等待 CI 通过

### 20. 代码审查
- [ ] 至少一位维护者审查
- [ ] 所有审查意见已处理
- [ ] CI 测试全部通过
- [ ] 无合并冲突

## ✅ 合并后阶段

### 21. 合并代码
- [ ] 使用 Squash and Merge 合并
- [ ] 删除功能分支
- [ ] 验证线上构建

### 22. 发布准备
- [ ] 更新版本号
- [ ] 生成 Release Notes
- [ ] 发布到 npm（如需要）

### 23. 复盘总结
- [ ] 记录经验教训
- [ ] 更新项目文档
- [ ] 分享给团队

---

## 🚨 常见陷阱

### ❌ 不要这样做
```typescript
// 1. 不要跳过测试
先写代码，后补测试（或完全不写测试）

// 2. 不要使用 any
function process(data: any) { ... }

// 3. 不要忽略错误
try {
  await db.query(sql);
} catch (e) {
  // 静默失败
}

// 4. 不要使用错误的导入路径
import { WebGeoDB } from '../../src';  // test/ 中错误

// 5. 不要提交未测试的代码
git push  // 没有先运行 pnpm test
```

### ✅ 必须这样做
```typescript
// 1. TDD 开发
先写测试 → 实现功能 → 重构代码

// 2. 明确类型
interface Feature {
  id: string;
  name: string;
}
function process(feature: Feature) { ... }

// 3. 完整错误处理
try {
  await db.query(sql);
} catch (error) {
  if (error instanceof QueryParseError) {
    throw new Error(`SQL 解析失败: ${sql}`);
  }
  throw error;
}

// 4. 正确的导入路径
import { WebGeoDB } from '../src';  // test/ 中正确

// 5. 先测试后提交
pnpm test  # 确保通过
git push
```

---

## 📊 质量门禁

### 必须满足的标准
- ✅ 所有测试通过（Chrome + Firefox + WebKit）
- ✅ 测试覆盖率 ≥ 80%
- ✅ 无 TypeScript 类型错误
- ✅ 无 ESLint 错误
- ✅ 构建成功
- ✅ CI 通过
- ✅ 代码审查通过

### 可以接受的技术债务
- ⚠️ 覆盖率 70-80%（需在后续 PR 中提升）
- ⚠️ 部分文档待补充（需创建 Issue 跟踪）
- ⚠️ 已知性能问题（需记录并优化）

---

## 🎯 快速检查清单（打印版）

```
开发前:
  □ 需求明确    □ 方案设计    □ 任务分解

开发中:
  □ TDD 开发   □ 代码规范    □ 自我审查

测试:
  □ 单元测试   □ 集成测试   □ 浏览器测试
  □ 性能测试   □ 覆盖率>80%

文档:
  □ 代码注释   □ API 文档    □ 使用指南
  □ CHANGELOG  □ 示例代码

提交前:
  □ 本地测试   □ 代码审查    □ PR 模板
  □ CI 通过    □ 文档完整
```

---

**记住**: 跳过任何一步都可能导致技术债务累积！
