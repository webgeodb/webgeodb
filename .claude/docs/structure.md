# Claude 项目文档结构

本文档说明 Claude 辅助开发 WebGeoDB 项目的文档组织结构。

## 文档分层策略

```
.claude/
├── CLAUDE.md (核心规范，~150行)
└── docs/
    ├── development-workflow.md (开发流程规范)
    ├── coding-standards.md (代码规范)
    ├── testing-standards.md (测试规范)
    ├── sql-standards.md (SQL 使用规范)
    ├── troubleshooting.md (问题排查手册)
    ├── webgeodb-workflow-skill.md (自动化技能)
    ├── optimization-summary.md (优化方案总结)
    └── checklists/ (检查清单)
        ├── feature-development.md (新功能开发检查清单)
        ├── bug-fix.md (Bug 修复检查清单)
        └── code-review.md (代码审查检查清单)
```

## 使用原则

### CLAUDE.md（核心规范）
- **始终加载**：自动加载到上下文
- **核心内容**：项目关键信息、不可违背的规则
- **快速参考**：常用命令、常见陷阱
- **长度限制**：100-150 行

### docs/（详细规范）
- **按需加载**：使用 Read 工具按需读取
- **详细指导**：完整的开发流程、代码规范
- **深度内容**：架构设计、最佳实践
- **长度灵活**：可以很长

## 何时读取详细文档

- 开始新功能开发 → 读取 `development-workflow.md`
- 编写代码 → 读取 `coding-standards.md`
- 编写测试 → 读取 `testing-standards.md`
- 使用 SQL → 读取 `sql-standards.md`
- 遇到问题 → 读取 `troubleshooting.md`
- 代码审查 → 读取 `checklists/code-review.md`

## 文件说明

### 核心文件
- **CLAUDE.md**: 核心规范，始终加载
- **structure.md**: 本文件，说明文档结构

### 开发流程
- **development-workflow.md**: 完整的开发流程（10个阶段）
- **webgeodb-workflow-skill.md**: 自动化技能定义

### 检查清单
- **feature-development.md**: 新功能开发检查清单（23个步骤）
- **code-review.md**: 代码审查检查清单（9个维度）

### 其他规范
- **coding-standards.md**: TypeScript 编码规范
- **testing-standards.md**: 测试编写规范
- **sql-standards.md**: SQL 和 PostGIS 使用规范
- **troubleshooting.md**: 常见问题和解决方案

### 总结文档
- **optimization-summary.md**: 文档优化方案总结

## 快速查找

### 按任务类型查找

| 任务类型 | 读取文档 |
|---------|---------|
| 新功能开发 | `development-workflow.md` + `checklists/feature-development.md` |
| Bug 修复 | `troubleshooting.md` + `checklists/bug-fix.md` |
| 代码审查 | `checklists/code-review.md` |
| 编写测试 | `testing-standards.md` |
| 使用 SQL | `sql-standards.md` |

### 按问题类型查找

| 问题类型 | 查看文档 |
|---------|---------|
| 测试失败 | `troubleshooting.md` - 测试相关章节 |
| SQL 错误 | `troubleshooting.md` - SQL 相关章节 |
| 构建失败 | `troubleshooting.md` - 构建相关章节 |
| 类型错误 | `coding-standards.md` - 类型安全章节 |

## 维护指南

### 更新频率
- **CLAUDE.md**: 每月回顾，根据新问题更新
- **checklists/**: 每季度回顾，优化检查项
- **troubleshooting.md**: 每次遇到新问题时更新
- **其他文档**: 根据需要更新

### 更新流程
1. 识别新的常见问题或最佳实践
2. 更新相关文档
3. 在 `CLAUDE.md` 中添加链接（如需要）
4. 提交变更并通知团队

## 文档统计

| 文档 | 行数 | 大小 | 用途 |
|------|------|------|------|
| CLAUDE.md | ~150 | 1.5K tokens | 核心规范 |
| development-workflow.md | ~400 | 4K tokens | 开发流程 |
| feature-development.md | ~350 | 3.5K tokens | 功能开发 |
| code-review.md | ~250 | 2.5K tokens | 代码审查 |
| 其他文档 | ~1000 | 10K tokens | 详细规范 |

**总计**: ~2,150 行，~21.5K tokens（按需读取）

---

**记住**: CLAUDE.md 只是入口，详细内容在 docs/ 目录中！
