# WebGeoDB 开发工作流自动化技能

这个技能确保在开发新功能时自动执行完整的开发流程和检查清单。

## 技能元数据

```yaml
name: webgeodb-workflow
description: 自动执行 WebGeoDB 项目的完整开发流程和检查清单
version: 1.0.0
author: WebGeoDB Team
```

## 触发条件

当用户请求以下任务时自动触发：
- "实现新功能"
- "添加 XXX 功能"
- "开发 XXX 模块"
- "implement XXX feature"
- "add XXX functionality"

## 执行流程

### 阶段 1: 前置准备（自动执行）

```typescript
// 1. 读取核心规范
const claudeMd = read('./CLAUDE.md');

// 2. 读取功能开发检查清单
const checklist = read('./.claude/docs/checklists/feature-development.md');

// 3. 读取开发流程规范
const workflow = read('./.claude/docs/development-workflow.md');

// 4. 确认需求理解
const requirements = await clarifyRequirements();
```

#### 需求澄清模板
```
我理解您要实现的功能是：
- 功能名称：XXX
- 核心需求：XXX
- 验收标准：XXX

请确认：
1. [ ] 需求理解是否正确？
2. [ ] 是否有特殊要求？
3. [ ] 是否有依赖关系？
```

### 阶段 2: 方案设计（自动指导）

```typescript
// 1. 检查是否有现成方案
const existingSolutions = await searchExistingImplementations();

// 2. 评估技术方案
const solution = await designSolution({
  requirements,
  existingSolutions,
  constraints: ['< 300KB', 'TypeScript', 'IndexedDB']
});

// 3. 创建任务分解
const tasks = await breakDownTasks(solution);

// 4. 输出方案文档
await generateDesignDocument(solution);
```

#### 方案设计检查清单
```
设计方案检查：
- [ ] 是否有现成库可用？
- [ ] 是否影响包体积？
- [ ] 是否向后兼容？
- [ ] 是否需要更新类型定义？
- [ ] 性能影响是否可接受？
```

### 阶段 3: TDD 开发（自动监控）

```typescript
// 1. 监控开发流程
const development = await monitorDevelopment({
  mode: 'TDD',
  checkpoints: [
    'RED:  先写测试',
    'GREEN: 实现功能',
    'REFACTOR: 重构代码'
  ]
});

// 2. 代码规范检查
const compliance = await checkCompliance({
  rules: [
    'no-any',
    'import-path-check',
    'async-await',
    'error-handling'
  ]
});

// 3. 实时反馈
if (compliance.violations.length > 0) {
  await reportViolations(compliance.violations);
}
```

#### 自动检查项目
```typescript
// 1. 导入路径检查（重点！）
function checkImportPaths(file) {
  if (file.startsWith('test/')) {
    const imports = extractImports(file);
    imports.forEach(imp => {
      if (imp.includes('../../src')) {
        throw Error(
`❌ 导入路径错误！
文件: ${file}
错误: ${imp}
正确: 应该使用 '../src'

参考: .claude/docs/testing-standards.md 第 1.1 节`
        );
      }
    });
  }
}

// 2. SQL 语法检查
function checkSQLUsage(code) {
  if (includesSQL(code)) {
    // 检查参数占位符
    if (code.includes('?')) {
      warn('应该使用 PostgreSQL 风格参数 ($1, $2)');
    }

    // 检查 PostGIS 函数
    if (!includesValidPostGISFunctions(code)) {
      warn('PostGIS 函数命名不正确');
    }
  }
}

// 3. 异步清理检查
function checkAsyncCleanup(testFile) {
  const afterEach = extractAfterEach(testFile);
  if (afterEach && !afterEach.includes('await')) {
    throw Error(
`❌ 异步清理问题！
文件: ${testFile}
问题: afterEach 中缺少 await
后果: 可能导致 DatabaseClosedError

解决方案:
afterEach(async () => {
  if (db) {
    await db.close();  // 必须 await
  }
});`
    );
  }
}
```

### 阶段 4: 代码审查（自动执行）

```typescript
// 1. 自我审查
const selfReview = await executeChecklist(
  './.claude/docs/checklists/code-review.md'
);

// 2. 生成审查报告
const review = await generateReviewReport({
  file: modifiedFiles,
  checklist: selfReview,
  coverage: await getCoverage(),
  violations: compliance.violations
});

// 3. 阻止低质量代码
if (review.score < 80) {
  throw Error(
`代码质量不达标，评分: ${review.score}/100

主要问题:
${review.issues.map(i => `- ${i}`).join('\n')}

请修复后重新提交。`
  );
}
```

#### 审查评分标准
```typescript
interface ReviewCriteria {
  // 类型安全 (25分)
  typeSafety: number;

  // 错误处理 (20分)
  errorHandling: number;

  // 测试覆盖 (25分)
  testCoverage: number;

  // 代码规范 (15分)
  codeStyle: number;

  // 文档完整 (15分)
  documentation: number;
}

function calculateScore(criteria: ReviewCriteria): number {
  return (
    criteria.typeSafety +
    criteria.errorHandling +
    criteria.testCoverage +
    criteria.codeStyle +
    criteria.documentation
  );
}
```

### 阶段 5: 测试验证（自动运行）

```typescript
// 1. 运行测试套件
const testResults = await runTests({
  browsers: ['chromium', 'firefox', 'webkit'],
  coverage: true
});

// 2. 检查覆盖率
if (testResults.coverage < 80) {
  warn(
`测试覆盖率不足: ${testResults.coverage}%
要求: ≥ 80%
缺失: ${testResults.uncoveredLines.join(', ')}`
  );
}

// 3. 检查浏览器兼容性
const failedBrowsers = testResults.results.filter(r => r.failed);
if (failedBrowsers.length > 0) {
  throw Error(
`测试在以下浏览器中失败:
${failedBrowsers.map(b => `- ${b.browser}: ${b.failed} 个失败`).join('\n')}`
  );
}

// 4. 检查常见问题
const commonIssues = await checkCommonIssues(testResults);
if (commonIssues.length > 0) {
  console.log('发现常见问题:');
  commonIssues.forEach(issue => {
    console.log(`- ${issue.message}`);
    console.log(`  解决方案: ${issue.solution}`);
    console.log(`  参考: ${issue.reference}`);
  });
}
```

### 阶段 6: 文档更新（自动提醒）

```typescript
// 1. 检查文档更新
const docChanges = await detectDocumentationChanges({
  modifiedFiles,
  requiredDocs: [
    'docs/api/reference.md',
    'CHANGELOG.md',
    // 根据功能类型添加
  ]
});

// 2. 生成文档模板
if (docChanges.missing.length > 0) {
  console.log(
`需要更新以下文档:
${docChanges.missing.map(doc => `- ${doc}`).join('\n')}

文档模板已生成，请补充内容。`
  );

  await generateDocTemplates(docChanges.missing);
}

// 3. 检查 JSDoc 注释
const jsdocCoverage = await checkJSDocCoverage(modifiedFiles);
if (jsdocCoverage < 90) {
  warn(
`公共 API 文档覆盖不足: ${jsdocCoverage}%
要求: ≥ 90%
缺失: ${jsdocCoverage.missingApis.join(', ')}`
  );
}
```

### 阶段 7: 代码提交（自动验证）

```typescript
// 1. 验证提交信息
const commit = await validateCommitMessage({
  format: 'conventional-commits',
  required: ['type', 'description', 'body']
});

// 2. 运行完整验证
const validation = await runFullValidation({
  tests: true,
  build: true,
  lint: true,
  coverage: true
});

// 3. 阻止低质量提交
if (!validation.passed) {
  throw Error(
`验证失败，不能提交:

${validation.errors.map(e => `- ${e}`).join('\n')}

请修复后重新提交。`
  );
}

// 4. 生成提交命令
console.log(
`✅ 所有验证通过！

提交命令:
git add .
git commit -m "${commit.message}"
git push -u origin ${branch}

创建 PR:
https://github.com/webgeodb/webgeodb/compare/main...${branch}`
);
```

---

## 自动化检查规则

### 强制规则（违反即阻止）

```typescript
const MUST_HAVE_RULES = [
  {
    name: '导入路径检查',
    check: checkImportPaths,
    error: '测试文件导入路径错误，必须使用 ../src'
  },
  {
    name: '类型安全检查',
    check: (file) => !file.includes(': any'),
    error: '禁止使用 any 类型'
  },
  {
    name: '测试覆盖检查',
    check: (coverage) => coverage >= 80,
    error: '测试覆盖率必须 ≥ 80%'
  },
  {
    name: '异步清理检查',
    check: checkAsyncCleanup,
    error: 'afterEach 必须使用 await db.close()'
  }
];
```

### 建议规则（违反但可继续）

```typescript
const SHOULD_HAVE_RULES = [
  {
    name: 'SQL 参数风格',
    check: (code) => !code.includes('?'),
    warning: '建议使用 PostgreSQL 风格参数 ($1, $2)',
    reference: '.claude/docs/sql-standards.md'
  },
  {
    name: 'JSDoc 注释',
    check: (apis) => apis.every(a => a.hasJSDoc),
    warning: '公共 API 应该有 JSDoc 注释',
    reference: '.claude/docs/coding-standards.md'
  }
];
```

---

## 持续改进

### 收集指标
```typescript
const metrics = {
  // 流程效率
  averageDevelopmentTime: null,
  averageReviewTime: null,
  averageTestTime: null,

  // 质量指标
  averageCoverage: null,
  bugRate: null,
  reviewPassRate: null,

  // 规范遵守
  complianceRate: null,
  commonViolations: []
};
```

### 定期回顾
```typescript
// 每月回顾
async function monthlyReview() {
  const report = {
    topViolations: getTopViolations(metrics),
    improvementSuggestions: generateSuggestions(metrics),
    workflowUpdates: checkForWorkflowUpdates()
  };

  await updateWorkflow(report);
}
```

---

## 使用示例

### 用户请求
```
"实现 SQL 查询功能"
```

### 技能自动执行
```
1. 📖 读取规范文档
   ✓ CLAUDE.md
   ✓ checklists/feature-development.md
   ✓ development-workflow.md

2. 🎯 澄清需求
   我理解您要实现 SQL 查询功能，具体是：
   - 支持标准 SQL SELECT 语句
   - 兼容 PostgreSQL/PostGIS 语法
   - 转换为现有的 QueryBuilder API

   请确认是否正确？

3. 📋 方案设计
   ✓ 搜索现有方案: node-sql-parser
   ✓ 评估技术可行性
   ✓ 创建任务分解:
     - SQL 解析器 (2天)
     - AST 转换器 (2天)
     - PostGIS 函数映射 (1天)
     - 测试 (1天)

4. 💻 TDD 开发
   ✓ RED:  先写测试 (15个测试)
   ✓ GREEN: 实现功能
   ✓ REFACTOR: 重构代码

5. 🔍 自动检查
   ✓ 导入路径检查
   ✓ 类型安全检查
   ✓ SQL 语法检查
   ✓ 异步清理检查

6. 🧪 测试验证
   ✓ Chrome: 22/22 通过
   ✓ Firefox: 22/22 通过
   ✓ WebKit: 22/22 通过
   ✓ 覆盖率: 85%

7. 📚 文档更新
   ✓ API 参考文档
   ✓ SQL 使用指南
   ✓ CHANGELOG

8. ✅ 提交准备
   ✓ 所有验证通过
   ✓ Commit 信息生成
   ✓ PR 模板填充
```

---

## 技能配置

```yaml
# .claude/skills/webgeodb-workflow/config.yaml
automation:
  enabled: true
  mode: 'strict'  # strict | guided | monitoring

rules:
  enforce_import_paths: true
  enforce_type_safety: true
  enforce_test_coverage: true
  enforce_async_cleanup: true

checkpoints:
  - name: '需求确认'
    required: true

  - name: '方案设计'
    required: true

  - name: '代码审查'
    required: true

  - name: '测试验证'
    required: true

  - name: '文档更新'
    required: true
```

---

## 总结

这个技能通过以下方式确保规范自动执行：

1. **自动读取规范**: 在开始任务前读取相关规范
2. **自动监控流程**: TDD 开发流程自动检查
3. **自动验证代码**: 实时代码规范检查
4. **自动运行测试**: 提交前自动运行完整测试
5. **自动检查文档**: 自动检测文档更新
6. **自动阻止提交**: 低质量代码自动阻止

**结果**: 任何开发任务都会自动遵循完整的开发流程和规范！
