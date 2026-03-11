# Bug 修复检查清单

> 📌 **修复 Bug 时必须严格执行此检查清单**

---

## ✅ 问题报告阶段

### 1. Bug 报告
- [ ] 在 GitHub 创建 Issue
- [ ] Issue 类型设置为 Bug
- [ ] 设置严重程度（Critical/High/Medium/Low）
- [ ] 提供详细的复现步骤
- [ ] 提供期望行为和实际行为
- [ ] 提供环境信息（OS、Browser、Node.js 版本）
- [ ] 附加错误日志或截图
- [ ] 指派给开发者

### 2. Bug 报告模板
```markdown
## 类型: Bug
## 严重程度: High

### 问题描述
测试文件中使用错误的导入路径导致模块找不到。

### 复现步骤
1. 创建测试文件 `test/sql/test.ts`
2. 使用 `import { WebGeoDB } from '../../src'`
3. 运行 `pnpm test`
4. 报错: 模块找不到

### 期望行为
应该使用 `import { WebGeoDB } from '../src'`

### 实际行为
导入路径错误，导致测试失败

### 环境信息
- OS: macOS
- Browser: Chromium
- Node.js: v20
- Package: @webgeodb/core@0.1.0

### 错误日志
```
Error: Cannot find module '../../src'
    at /test/sql/test.ts:2:10
```

### 附加信息
可能影响所有新创建的测试文件。
```

---

## ✅ 问题分析阶段

### 3. 问题定位
- [ ] 能够在本地复现问题
- [ ] 使用调试工具定位问题代码
- [ ] 确认问题范围（影响范围）
- [ ] 识别问题根因
- [ ] 评估修复难度和工作量

### 4. 根因分析
- [ ] 分析为什么会出现这个问题
- [ ] 确认是代码问题还是配置问题
- [ ] 确认是新引入的 Bug 还是历史遗留
- [ ] 识别相关的代码变更
- [ ] 评估修复方案的副作用

### 5. 修复方案设计
- [ ] 设计最小化修复方案
- [ ] 评估修复方案的副作用
- [ ] 考虑是否需要回归测试
- [ ] 评估是否需要更新文档
- [ ] 确认修复后不引入新问题

---

## ✅ Git 准备阶段

### 6. 创建 Issue
```bash
# 如果还没有 Issue，先创建
gh issue create \
  --title "fix(test): correct import path error" \
  --body "Bug 报告模板内容"
```

### 7. 创建修复分支
```bash
# 从 main 创建修复分支
git checkout main
git pull origin main

# 命名规范: bugfix/xxx
git checkout -b bugfix/test-import-path-error

# 关联 Issue
git commit -m "fix(test): initial investigation

Fixes #456
"
```

### 8. 分支检查
- [ ] 分支命名符合规范（bugfix/xxx）
- [ ] 从最新的 main 创建
- [ ] 在 commit 信息中关联 Issue（Fixes #456）
- [ ] 分支已推送到远程

---

## ✅ 修复实施阶段

### 9. 修复代码
- [ ] 按照修复方案修改代码
- [ ] 遵循代码规范（无 any、类型安全）
- [ ] 添加必要的注释说明修复原因
- [ ] 确保修复最小化（不修改无关代码）

### 10. 添加或更新测试
- [ ] 添加回归测试（防止问题再现）
- [ ] 确保测试覆盖修复的代码路径
- [ ] 测试边界条件
- [ ] 验证测试失败（修复前）和通过（修复后）

### 11. 本地验证
```bash
# 运行相关测试
pnpm test -- test/affected-test.test.ts

# 运行所有测试
pnpm test

# 检查类型
npx tsc --noEmit

# 检查 lint
pnpm lint
```

### 12. 验证检查
- [ ] 问题已修复（本地验证）
- [ ] 所有测试通过
- [ ] 无 TypeScript 错误
- [ ] 无 lint 错误
- [ ] 无新的警告

---

## ✅ 文档更新阶段

### 13. 代码文档
- [ ] 添加修复说明注释
- [ ] 更新相关的 API 文档（如需要）
- [ ] 更新类型定义（如需要）

### 14. 用户文档
- [ ] 更新已知问题文档（如需要）
- [ ] 更新迁移指南（如破坏性修复）
- [ ] 更新 CHANGELOG.md

### 15. 开发文档
- [ ] 记录问题和根因
- [ ] 记录解决方案
- [ ] 更新 troubleshooting.md

---

## ✅ PR 创建阶段

### 16. 推送修复
```bash
# 推送修复分支
git push origin bugfix/test-import-path-error

# 如果有 main 更新，先 rebase
git fetch origin main
git rebase origin/main
git push origin bugfix/test-import-path-error --force-with-lease
```

### 17. 创建 PR
- [ ] PR 标题: `fix(scope): description`
- [ ] PR 描述清晰（问题描述、修复方案）
- [ ] 关联 Issue（Fixes #456）
- [ ] 添加复现步骤
- [ ] 添加修复说明
- [ ] 添加测试结果
- [ ] 标记为 Bug 修复 PR

### 18. PR 描述模板
```markdown
## 问题描述
测试文件中使用了错误的导入路径 `../../src`，导致模块找不到。

## 复现步骤
1. 创建测试文件
2. 使用错误导入路径
3. 运行测试

## 修复方案
将导入路径从 `../../src` 修正为 `../src`。

## 修复文件
- `test/boundary-conditions.test.ts`

## 测试
- [x] 相关测试通过
- [x] 所有测试通过
- [x] 无回归问题

## Issues
Fixes #456

## Checklist
- [x] 问题已修复
- [x] 添加回归测试
- [x] 所有测试通过
- [x] 文档已更新
```

---

## ✅ 代码审查阶段

### 19. 自我审查
使用 `.claude/docs/checklists/code-review.md`：
- [ ] 修复是否最小化
- [ ] 是否引入新问题
- [ ] 是否有副作用
- [ ] 回归测试是否充分

### 20. 审查响应
- [ ] 响应审查意见（如有）
- [ ] 修改反馈的问题
- [ ] 推送更新
- [ ] 重新审查

---

## ✅ 合并阶段

### 21. 合并前检查
- [ ] 问题已确认修复
- [ ] CI 测试全部通过
- [ ] 至少一位审查者批准
- [ ] 文档已更新
- [ ] 无合并冲突

### 22. 合并操作
```bash
# 合并 PR（使用 Squash and Merge）
# 在 GitHub PR 页面操作

# 删除本地分支
git checkout main
git pull origin main
git branch -d bugfix/test-import-path-error

# 删除远程分支
git push origin --delete bugfix/test-import-path-error
```

### 23. 关闭 Issue
- [ ] PR 合并后 Issue 自动关闭（使用 Fixes #456）
- [ ] 或手动关闭 Issue 并评论修复方案
- [ ] 确认 Issue 解决状态

---

## ✅ 合并后阶段

### 24. 验证修复
- [ ] 检查线上构建是否成功
- [ ] 验证修复在生产环境有效
- [ ] 监控是否有相关问题报告

### 25. 总结和记录
- [ ] 记录问题和解决方案
- [ ] 更新 troubleshooting.md
- [ ] 分享给团队成员（如重要问题）
- [ ] 考虑是否需要改进流程防止类似问题

---

## 🚨 Bug 修复原则

### 最小化修复
```typescript
// ✅ 好的修复 - 只修改必要的代码
// 修复前
import { WebGeoDB } from '../../src';

// 修复后
import { WebGeoDB } from '../src';

// ❌ 避免的修复 - 同时修改其他无关代码
import { WebGeoDB } from '../src';
import { SomeOtherModule } from '../src';  // 无关修改
const refactoredFunction = () => { ... };  // 无关重构
```

### 回归测试
```typescript
// ✅ 添加回归测试
it('should not have import path errors', () => {
  // 确保导入路径正确
  expect(() => require('../src')).not.toThrow();
});
```

### 文档同步
```markdown
// ✅ 更新文档
## CHANGELOG.md

### Fixed
- 修复测试文件导入路径错误

## troubleshooting.md

### Import Path Errors
**问题**: 使用 `../../src` 导致模块找不到
**原因**: test/ 与 src/ 是同级目录
**解决**: 使用 `../src`
```

---

## 📊 Bug 分类

### 按严重程度

#### Critical（严重）
- 生产环境崩溃
- 数据丢失
- 安全漏洞
- **响应时间**: 立即（< 4 小时）
- **分支**: `hotfix/xxx`

#### High（高）
- 核心功能不可用
- 严重影响用户体验
- **响应时间**: 1 天内
- **分支**: `bugfix/xxx` 或 `hotfix/xxx`

#### Medium（中）
- 功能受限但有变通方案
- 影响部分用户
- **响应时间**: 3 天内
- **分支**: `bugfix/xxx`

#### Low（低）
- UI 小问题
- 文档错误
- **响应时间**: 1 周内
- **分支**: `bugfix/xxx` 或合并到其他 PR

### 按类型

#### 代码缺陷
- 空指针异常
- 类型错误
- 逻辑错误

#### 配置问题
- 构建配置
- 环境配置
- 依赖版本

#### 兼容性
- 浏览器兼容
- Node.js 版本
- 依赖库兼容

---

## 💡 快速修复流程

### 紧急 Bug（Critical/High）
```bash
# 1. 快速创建 Issue
gh issue create --title "Critical: xxx" --label "urgent"

# 2. 创建 hotfix 分支
git checkout -b hotfix/xxx

# 3. 快速修复
git commit -m "hotfix: xxx"

# 4. 推送并创建 PR（标记紧急）
git push origin hotfix/xxx
gh pr create --label "urgent"

# 5. 紧急审查和合并
# 需要 2 位维护者快速审查
```

### 普通 Bug
```bash
# 1. 创建 Issue
gh issue create --title "fix: xxx"

# 2. 创建 bugfix 分支
git checkout -b bugfix/xxx

# 3. 完整修复流程
# - 分析问题
# - 修复代码
# - 添加测试
# - 本地验证

# 4. 创建 PR
gh pr create

# 5. 正常审查和合并
```

---

## 🎯 质量门禁

### 必须满足
- ✅ 问题已修复
- ✅ 添加回归测试
- ✅ 所有测试通过
- ✅ CI 通过
- ✅ 文档已更新
- ✅ 至少一位审查者批准

### 不推荐
- ⚠️ 绕过测试直接修复
- ⚠️ 不添加回归测试
- ⚠️ 不更新文档
- ⚠️ 修复范围过大

---

## 📝 常见陷阱

### ❌ 不要这样做
```typescript
// 1. 不要只修复症状不修复根因
catch (error) {
  // 静默吞掉错误
  return null;  // ❌
}

// 2. 不要引入新问题
// 修复 Bug A 时引入 Bug B

// 3. 不要跳过测试
"这个 Bug 太简单了，不需要测试"  // ❌

// 4. 不要忽略文档
"修复完就行，文档以后再说"    // ❌
```

### ✅ 必须这样做
```typescript
// 1. 彻底修复根因
const rootCause = analyzeError(error);
fixRootCause(rootCause);

// 2. 添加回归测试
it('should prevent regression', () => {
  // 测试修复的问题
});

// 3. 更新文档
// 记录问题和解决方案

// 4. 验证修复
// 确保修复有效且无副作用
```

---

**记住**: Bug 修复不只是代码修改，还包括问题分析、回归测试、文档更新和流程改进！
