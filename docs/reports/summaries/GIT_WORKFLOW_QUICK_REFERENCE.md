# Git 工作流快速参考

> 🚀 WebGeoDB 团队 Git 工作流快速上手指南

---

## 📋 创建 Issues 概览

| Issue | 类型 | 优先级 | 分支命名 |
|-------|------|--------|----------|
| #1 | Bug | High | `bugfix/spatial-query-failures` |
| #2 | Bug | Medium | `bugfix/query-builder-edge-cases` |
| #3 | Bug | Medium | `bugfix/spatial-engine-failures` |
| #4 | Bug | Medium | `bugfix/query-cache-failures` |
| #5 | Bug | Medium | `bugfix/index-auto-maintenance` |
| #6 | Bug | Low | `bugfix/optimization-predicates` |
| #7 | Feature | Medium | `feature/test-cleanup-improvement` |

---

## 🔄 标准 Bug 修复流程

### 1. 创建修复分支

```bash
# 示例：修复 Issue #1
git checkout main
git pull origin main
git checkout -b bugfix/spatial-query-failures
```

### 2. 关联 Issue

```bash
# 在第一个 commit 中引用 Issue
git commit -m "fix(spatial): initial investigation

Fixes #1"
```

### 3. 修复问题

遵循 `.claude/docs/checklists/bug-fix.md`（25 个步骤）

### 4. 推送并创建 PR

```bash
# 推送分支
git push origin bugfix/spatial-query-failures

# 创建 PR
gh pr create \
  --title "fix(spatial): resolve spatial query test failures" \
  --body "## 问题描述
修复空间查询测试失败问题。

## 修复方案
- 修复 contains 谓词判断逻辑
- 改进 intersects 谓词边界处理

## 测试
- [x] 所有空间查询测试通过

Fixes #1"
```

### 5. 审查和合并

- ✅ 至少一位审查者批准
- ✅ CI 测试全部通过
- ✅ 使用 Squash and Merge 合并
- ✅ Issue 自动关闭（通过 `Fixes #1`）

---

## 🌟 标准 Feature 开发流程

### 1. 创建功能分支

```bash
# 示例：开发 Issue #7
git checkout main
git pull origin main
git checkout -b feature/test-cleanup-improvement
```

### 2. 关联 Issue

```bash
# 在第一个 commit 中引用 Issue
git commit -m "feat(test): initial setup

Closes #7"
```

### 3. 开发功能

遵循 `.claude/docs/checklists/feature-development.md`（23 个步骤）

### 4. 推送并创建 PR

```bash
# 推送分支
git push origin feature/test-cleanup-improvement

# 创建 PR
gh pr create \
  --title "feat(test): improve test cleanup mechanism" \
  --body "## 概述
改进测试清理机制，解决 DatabaseClosedError 问题。

## 变更内容
- 添加全局测试钩子
- 自动清理测试数据库

## 测试
- [x] 所有测试通过
- [x] 无 DatabaseClosedError

Closes #7"
```

---

## 📝 Commit 消息格式

```bash
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型
- `feat`: 新功能
- `fix`: Bug 修复
- `refactor`: 代码重构
- `docs`: 文档更新
- `test`: 测试相关
- `chore`: 构建/工具
- `perf`: 性能优化
- `ci`: CI 相关

### 示例

```bash
git commit -m "fix(spatial): resolve contains predicate precision issues

- 修复 contains 谓词边界判断
- 改进空间计算精度
- 添加边界测试用例

Fixes #1"
```

---

## 🔗 Issue 关联命令

```bash
# 关闭 Issue
Closes #1
Fixes #1
Resolves #1

# 引用 Issue（不关闭）
Refs #1
Related to #1
```

---

## 🏷️ Labels 使用规范

### 分类 Labels
- `spatial` - 空间查询相关
- `query` - 查询构建器相关
- `cache` - 缓存相关
- `index` - 索引相关
- `optimization` - 性能优化相关
- `test` - 测试相关
- `feature` - 功能开发

### 优先级 Labels
- `Critical` - 严重问题（生产环境紧急）
- `High` - 高优先级
- `Medium` - 中优先级
- `Low` - 低优先级

---

## ✅ PR 检查清单

### 创建 PR 前
- [ ] 代码符合规范
- [ ] 所有测试通过
- [ ] 测试覆盖率 ≥ 80%
- [ ] 文档已更新
- [ ] Commit 消息清晰

### PR 描述中
- [ ] 概述清晰简短
- [ ] 变更内容完整
- [ ] 测试情况说明
- [ ] 关联 Issue（Fixes #1）

### 审查期间
- [ ] 响应审查意见
- [ ] 修改反馈问题
- [ ] CI 测试通过

---

## 🎯 快速命令参考

```bash
# 查看 Issues
gh issue list
gh issue view 1

# 创建分支
git checkout -b bugfix/issue-name

# 推送分支
git push origin bugfix/issue-name

# 创建 PR
gh pr create --title "fix: description" --body "PR body"

# 查看 PR
gh pr list
gh pr view 1

# 查看分支
git branch -a

# 删除分支
git branch -d bugfix/issue-name
git push origin --delete bugfix/issue-name
```

---

## 📚 相关文档

- **完整工作流**: `.claude/docs/git-workflow.md`
- **开发流程**: `.claude/docs/development-workflow.md`
- **Bug 修复清单**: `.claude/docs/checklists/bug-fix.md`
- **功能开发清单**: `.claude/docs/checklists/feature-development.md`
- **Issues 总结**: `GITHUB_ISSUES_SUMMARY.md`

---

## 🆘 常见问题

### Q: 如何选择分支类型？
- `feature/` - 新功能开发
- `bugfix/` - 普通 Bug 修复
- `hotfix/` - 生产环境紧急问题

### Q: Issue 没有关联到 commit 怎么办？
在后续 commit 中添加：
```bash
git commit --amend -m "fix: message

Fixes #1"
```

### Q: PR 审查不通过怎么办？
1. 查看审查意见
2. 修改代码
3. 推送更新
4. 请求重新审查

### Q: 如何处理合并冲突？
```bash
git fetch origin main
git rebase origin/main
# 解决冲突
git add .
git rebase --continue
git push origin bugfix/issue-name --force-with-lease
```

---

**更新时间**: 2026-03-11
**版本**: v1.0.0
