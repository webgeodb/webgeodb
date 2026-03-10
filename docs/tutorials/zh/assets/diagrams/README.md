# WebGeoDB 教程架构图和数据流图索引

本目录包含 WebGeoDB 教程系列所需的所有架构图和数据流图。

## 图表列表 Diagram List

### 架构图 Architecture Diagrams

1. **[整体架构](./01-overall-architecture.md)** - Overall Architecture
   - 展示 WebGeoDB 的分层结构和模块化设计
   - Shows the layered structure and modular design of WebGeoDB

2. **[空间引擎架构](./02-spatial-engine-architecture.md)** - Spatial Engine System Architecture
   - 空间计算引擎的插件化设计
   - Plugin design of spatial computing engine

3. **[存储层架构](./03-storage-layer-architecture.md)** - Storage Layer Architecture
   - 数据持久化和缓存管理
   - Data persistence and cache management

4. **[查询引擎流程](./04-query-engine-flow.md)** - Query Engine Flow
   - 查询处理和优化流程
   - Query processing and optimization flow

### 数据流图 Data Flow Diagrams

5. **[CRUD操作流程](./05-crud-operations-flow.md)** - CRUD Operations Data Flow
   - 创建、读取、更新、删除操作的完整流程
   - Complete flow of Create, Read, Update, Delete operations

6. **[空间查询流程](./06-spatial-query-flow.md)** - Spatial Query Execution Flow
   - 空间查询的执行流程和优化策略
   - Spatial query execution flow and optimization strategies

### 时序图 Sequence Diagrams

7. **[数据库初始化时序](./07-database-initialization-sequence.md)** - Database Initialization Sequence
   - 数据库创建和初始化的完整过程
   - Complete process of database creation and initialization

8. **[查询执行时序](./08-query-execution-sequence.md)** - Query Execution Sequence
   - 查询执行的详细时序和组件交互
   - Detailed sequence and component interaction of query execution

### 流程图 Flow Charts

9. **[缓存命中/未命中流程](./09-cache-hit-miss-flow.md)** - Cache Hit/Miss Flow
   - 缓存系统的工作流程和优化策略
   - Cache system workflow and optimization strategies

10. **[事务处理流程](./10-transaction-processing-flow.md)** - Transaction Processing Flow
    - 事务的开始、执行、提交和回滚流程
    - Transaction start, execution, commit, and rollback flow

## 使用说明 Usage Instructions

### 在Markdown中使用 Using in Markdown

```markdown
# 引用图表 Reference Diagram

![整体架构](./assets/diagrams/01-overall-architecture.md)
```

### 在线渲染 Online Rendering

这些图表使用 Mermaid 格式，可以在以下平台渲染：

- **GitHub**: 直接在 GitHub 上查看 Markdown 文件
- **VS Code**: 安装 Mermaid 插件
- **在线工具**: [Mermaid Live Editor](https://mermaid.live/)
- **文档工具**: MkDocs, Docusaurus, VuePress 等

### 导出为图片 Export as Image

1. 打开 [Mermaid Live Editor](https://mermaid.live/)
2. 复制图表代码
3. 粘贴到编辑器
4. 导出为 PNG/SVG

## 图表规范 Diagram Standards

### 颜色方案 Color Scheme

- 应用层: `#e1f5ff` (浅蓝)
- 查询引擎: `#fff4e6` (浅橙)
- 空间引擎: `#f3e5f5` (浅紫)
- 缓存系统: `#e8f5e9` (浅绿)
- 存储层: `#fce4ec` (浅粉)
- 成功状态: `#c8e6c9` (绿色)
- 错误状态: `#ffcdd2` (红色)

### 命名规范 Naming Conventions

- 架构图: `01-{module}-architecture.md`
- 数据流图: `05-{operation}-flow.md`
- 时序图: `07-{process}-sequence.md`
- 流程图: `09-{feature}-flow.md`

### 内容要求 Content Requirements

每个图表文件包含：
- Mermaid 图表代码
- 中文说明
- 英文说明
- 代码示例
- 最佳实践

## 贡献指南 Contributing Guidelines

### 添加新图表 Adding New Diagrams

1. 创建新的 `.md` 文件
2. 使用 Mermaid 语法编写图表
3. 添加中英文说明
4. 更新本索引文件
5. 确保样式和命名一致

### 图表审查 Diagram Review

- 检查图表是否清晰易读
- 验证中英文说明是否准确
- 确认代码示例可以运行
- 测试在 GitHub 上的渲染效果

## 相关资源 Related Resources

- [Mermaid 官方文档](https://mermaid-js.github.io/)
- [WebGeoDB 教程](../)
- [WebGeoDB API 文档](../../../api/)
- [项目主 README](../../../../README.md)

## 版本历史 Version History

- **v1.0.0** (2026-03-10): 初始版本，包含10个核心图表

---

**维护者**: WebGeoDB Team
**最后更新**: 2026-03-10
**许可**: MIT License
