# Git 工作流规范设置完成

## ✅ 已完成的工作

### 1. Git 分支规范
- ✅ 定义 4 种分支类型（feature/bugfix/hotfix/release）
- ✅ 分支命名规范（kebab-case）
- ✅ 分支创建和管理流程
- ✅ 分支保护规则

### 2. GitHub Issues 管理
- ✅ Issue 类型定义（Feature/Bug/Enhancement）
- ✅ Issue 模板（功能需求、Bug 报告）
- ✅ 优先级和严重程度设置
- ✅ 验收标准和估算工作量

### 3. Pull Request 工作流
- ✅ PR 标题格式规范
- ✅ PR 描述模板
- ✅ PR 审查流程
- ✅ PR 合并方式（Squash and Merge）

### 4. 完整的开发流程
- ✅ 13 个阶段的开发流程
- ✅ 集成 Git 和 Issues 到开发流程
- ✅ 从 Issue 到代码合并的完整链路

---

## 📁 新增和更新的文档

### 新增文件
1. ✅ `.claude/docs/git-workflow.md`
   - Git 分支规范
   - GitHub Issues 管理
   - PR 工作流
   - 分支保护规则

2. ✅ `.claude/docs/checklists/bug-fix.md`
   - Bug 修复检查清单（25 个步骤）
   - 问题报告模板
   - 快速修复流程

### 更新文件
1. ✅ `.claude/docs/development-workflow.md`
   - 添加"GitHub Issues 创建阶段"（第 4 阶段）
   - 添加"分支创建阶段"（第 5 阶段）
   - 添加"PR 创建和合并阶段"（第 12 阶段）
   - 更新流程图（13 个阶段）

2. ✅ `.claude/docs/checklists/feature-development.md`
   - 添加"GitHub Issues 创建"（第 4 步）
   - 添加"Git 准备阶段"（第 5-6 步）
   - 添加"PR 创建阶段"（第 15-17 步）
   - 添加"PR 审查阶段"（第 20-22 步）

3. ✅ `CLAUDE.md`
   - 添加 Git 工作流命令
   - 添加 GitHub Issues 命令
   - 更新项目结构（包含 git-workflow.md）
   - 更新必读文档清单

---

## 🎯 Git 工作流程

### 完整流程图

```
GitHub Issue
    ↓
创建分支（feature/xxx 或 bugfix/xxx）
    ↓
开发修复（TDD + 代码规范）
    ↓
推送分支
    ↓
创建 Pull Request
    ↓
CI 测试（自动运行）
    ↓
代码审查（人工审查）
    ↓
合并到 main（Squash and Merge）
    ↓
删除分支
    ↓
关闭 Issue（自动或手动）
```

### 分支类型

#### 功能分支
```bash
# 创建
git checkout -b feature/sql-query-support

# 提交
git commit -m "feat(sql): implement SQL parser
Closes #123"

# 推送
git push -u origin feature/sql-query-support
```

#### Bug 修复分支
```bash
# 创建
git checkout -b bugfix/test-import-path-error

# 提交
git commit -m "fix(test): correct import path
Fixes #456"

# 推送
git push -u origin bugfix/test-import-path-error
```

#### 紧急修复分支
```bash
# 创建
git checkout -b hotfix/security-vulnerability

# 提交
git commit -m "hotfix(security): patch critical issue"

# 推送并创建紧急 PR
git push -u origin hotfix/security-vulnerability
gh pr create --label "urgent"
```

---

## 📋 Issue 模板

### 功能需求模板
```markdown
## 类型: Feature
## 优先级: High/Medium/Low
## 复杂度: Small/Medium/Large

### 功能描述
<!-- 功能描述 -->

### 验收标准
- [ ] 标准 1
- [ ] 标准 2

### 技术方案
<!-- 技术方案 -->

### 估算工作量
<!-- 工作量估算 -->

### 指派
@username

### 里程碑
v1.0.0
```

### Bug 报告模板
```markdown
## 类型: Bug
## 严重程度: Critical/High/Medium/Low

### 问题描述
<!-- 问题描述 -->

### 复现步骤
1. 步骤 1
2. 步骤 2

### 期望行为
<!-- 期望行为 -->

### 实际行为
<!-- 实际行为 -->

### 环境信息
- OS:
- Browser:
- Node.js:

### 错误日志
```
错误日志
```

### 指派
@username
```

---

## 🔐 分支保护规则

### main 分支保护
```yaml
保护分支: main

✅ 需要 PR 才能推送
✅ 需要审查批准
  - 至少 1 位审查者
  - 包括维护者
✅ 需要状态检查通过
  - CI/tests (必需)
  - CI/lint (必需)
✅ 限制谁可以推送
  - 维护者
```

---

## 📝 PR 模板

```markdown
## 概述
<!-- 简短描述 -->

## 变更内容
### 新增
- 新增 1
- 新增 2

### 修改
- 修改 1
- 修改 2

### 删除
- 删除 1

## 测试
- [x] 单元测试通过
- [x] 集成测试通过
- [x] 浏览器测试通过
- [x] 测试覆盖率: xx%

## 文档
- [x] API 文档已更新
- [x] 使用指南已更新
- [x] CHANGELOG 已更新

## Issues
Closes #123
Fixes #456

## Checklist
- [x] 遵循代码规范
- [x] 测试覆盖率 ≥ 80%
- [x] 文档已更新
- [x] 所有浏览器测试通过
```

---

## 🚀 快速开始

### 开发新功能
```bash
# 1. 创建 Issue
gh issue create --title "feat: 添加 SQL 查询" --body "template"

# 2. 创建功能分支
git checkout -b feature/sql-query-support

# 3. 开发（遵循 TDD）
# ... 编写代码 ...

# 4. 推送并创建 PR
git push origin feature/sql-query-support
gh pr create --title "feat(sql): implement SQL query support"

# 5. 等待审查和合并
# ... 等待审查 ...

# 6. 删除分支
git branch -d feature/sql-query-support
git push origin --delete feature/sql-query-support
```

### 修复 Bug
```bash
# 1. 创建 Issue
gh issue create --title "fix: 测试导入路径错误"

# 2. 创建修复分支
git checkout -b bugfix/test-import-path-error

# 3. 修复 Bug
# ... 修复代码 ...

# 4. 推送并创建 PR
git push origin bugfix/test-import-path-error
gh pr create --title "fix(test): correct import path error"

# 5. 等待审查和合并
# ... 等待审查 ...

# 6. 关闭 Issue
# PR 合并后自动关闭（使用 Fixes #456）
```

---

## 📊 关键改进

### 1. 标准化流程
- ✅ 统一的分支命名规范
- ✅ 统一的 Issue 模板
- ✅ 统一的 PR 模板
- ✅ 统一的 Commit 格式

### 2. 可追溯性
- ✅ Issue → 分支 → PR → Commit 完整链路
- ✅ 每个变更都可以追溯到 Issue
- ✅ 清晰的变更历史

### 3. 质量保证
- ✅ CI 自动测试
- ✅ 强制代码审查
- ✅ 测试覆盖率要求
- ✅ 文档同步更新

### 4. 分支保护
- ✅ main 分支受保护
- ✅ 需要 PR 才能推送
- ✅ 需要审查批准
- ✅ CI 必须通过

---

## 📚 相关文档

### Git 工作流
- `.claude/docs/git-workflow.md` - 完整的 Git 工作流规范

### 检查清单
- `.claude/docs/checklists/feature-development.md` - 功能开发清单
- `.claude/docs/checklists/bug-fix.md` - Bug 修复清单
- `.claude/docs/checklists/code-review.md` - 代码审查清单

### 开发流程
- `.claude/docs/development-workflow.md` - 完整开发流程

### 核心规范
- `CLAUDE.md` - 核心规范和快速参考

---

## 🎯 下一步

### 立即行动
1. ✅ 文档已创建并提交
2. ✅ 已推送到远程仓库
3. ⏳ 在 GitHub 上配置分支保护规则
4. ⏳ 通知团队成员新流程

### 配置分支保护
1. 进入 GitHub 仓库
2. Settings → Branches
3. 添加分支保护规则：
   - Branch name pattern: `main`
   - ✅ Require a pull request before merging
   - ✅ Require approvals (1 approver)
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging

### 团队培训
1. 分享 `CLAUDE_SETUP.md` 给团队
2. 介绍 Git 工作流程
3. 演示 Issue 和 PR 创建流程
4. 解答疑问和收集反馈

---

**Git 提交**: 4a196da

**记住**: 标准化的 Git 工作流是团队协作的基础！
