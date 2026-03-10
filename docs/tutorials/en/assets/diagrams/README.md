# WebGeoDB Tutorial Diagrams Index

This directory contains all architecture diagrams and data flow diagrams required for the WebGeoDB tutorial series.

## Diagram List

### Architecture Diagrams

1. **[Overall Architecture](./01-overall-architecture.md)**
   - Shows the layered structure and modular design of WebGeoDB

2. **[Spatial Engine Architecture](./02-spatial-engine-architecture.md)**
   - Plugin design of spatial computing engine

3. **[Storage Layer Architecture](./03-storage-layer-architecture.md)**
   - Data persistence and cache management

4. **[Query Engine Flow](./04-query-engine-flow.md)**
   - Query processing and optimization flow

### Data Flow Diagrams

5. **[CRUD Operations Flow](./05-crud-operations-flow.md)**
   - Complete flow of Create, Read, Update, Delete operations

6. **[Spatial Query Execution Flow](./06-spatial-query-flow.md)**
   - Spatial query execution flow and optimization strategies

### Sequence Diagrams

7. **[Database Initialization Sequence](./07-database-initialization-sequence.md)**
   - Complete process of database creation and initialization

8. **[Query Execution Sequence](./08-query-execution-sequence.md)**
   - Detailed sequence and component interaction of query execution

### Flow Charts

9. **[Cache Hit/Miss Flow](./09-cache-hit-miss-flow.md)**
   - Cache system workflow and optimization strategies

10. **[Transaction Processing Flow](./10-transaction-processing-flow.md)**
    - Transaction start, execution, commit, and rollback flow

## Usage Instructions

### Using in Markdown

```markdown
# Reference Diagram

![Overall Architecture](./assets/diagrams/01-overall-architecture.md)
```

### Online Rendering

These diagrams use Mermaid format and can be rendered on:

- **GitHub**: View Markdown files directly on GitHub
- **VS Code**: Install Mermaid plugin
- **Online Tools**: [Mermaid Live Editor](https://mermaid.live/)
- **Documentation Tools**: MkDocs, Docusaurus, VuePress, etc.

### Export as Image

1. Open [Mermaid Live Editor](https://mermaid.live/)
2. Copy diagram code
3. Paste into editor
4. Export as PNG/SVG

## Diagram Standards

### Color Scheme

- Application Layer: `#e1f5ff` (Light Blue)
- Query Engine: `#fff4e6` (Light Orange)
- Spatial Engine: `#f3e5f5` (Light Purple)
- Cache System: `#e8f5e9` (Light Green)
- Storage Layer: `#fce4ec` (Light Pink)
- Success State: `#c8e6c9` (Green)
- Error State: `#ffcdd2` (Red)

### Naming Conventions

- Architecture Diagrams: `01-{module}-architecture.md`
- Data Flow Diagrams: `05-{operation}-flow.md`
- Sequence Diagrams: `07-{process}-sequence.md`
- Flow Charts: `09-{feature}-flow.md`

### Content Requirements

Each diagram file includes:
- Mermaid diagram code
- Chinese description
- English description
- Code examples
- Best practices

## Contributing Guidelines

### Adding New Diagrams

1. Create new `.md` file
2. Write diagram using Mermaid syntax
3. Add Chinese and English descriptions
4. Update this index file
5. Ensure consistent style and naming

### Diagram Review

- Check if diagram is clear and readable
- Verify Chinese and English descriptions are accurate
- Confirm code examples are runnable
- Test rendering on GitHub

## Related Resources

- [Mermaid Official Documentation](https://mermaid-js.github.io/)
- [WebGeoDB Tutorials](../)
- [WebGeoDB API Documentation](../../../api/)
- [Project Main README](../../../../README.md)

## Version History

- **v1.0.0** (2026-03-10): Initial version with 10 core diagrams

---

**Maintainer**: WebGeoDB Team
**Last Updated**: 2026-03-10
**License**: MIT License
