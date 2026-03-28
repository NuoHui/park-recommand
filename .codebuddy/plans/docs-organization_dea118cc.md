---
name: docs-organization
overview: 整理并优化 README 为用户友好的快速开始指南，创建 docs 目录组织所有技术文档，提升项目的可维护性和用户体验。
todos:
  - id: doc-create-structure
    content: 创建 docs 目录结构和子目录，建立完整的目录骨架
    status: completed
  - id: doc-optimize-readme
    content: 优化主 README.md，简化内容，添加文档导航链接
    status: completed
  - id: doc-getting-started
    content: 完成快速开始文档（安装、配置、首次运行）
    status: completed
    dependencies:
      - doc-create-structure
  - id: doc-guides
    content: 完成使用指南文档（命令、常见问题、故障排查）
    status: completed
    dependencies:
      - doc-create-structure
  - id: doc-architecture
    content: 完成架构设计文档（CLI、对话、LLM、地图 API）
    status: completed
    dependencies:
      - doc-create-structure
  - id: doc-development
    content: 完成开发指南文档（代码结构、测试、贡献指南）
    status: completed
    dependencies:
      - doc-create-structure
  - id: doc-api
    content: 完成 API 文档（缓存、结果解析、日志系统）
    status: completed
    dependencies:
      - doc-create-structure
  - id: doc-index
    content: 创建文档导航首页 (docs/README.md)
    status: completed
    dependencies:
      - doc-optimize-readme
      - doc-getting-started
      - doc-guides
      - doc-architecture
      - doc-development
      - doc-api
  - id: doc-cleanup
    content: 整理项目根目录，确保旧文档仍可访问（可选创建 LEGACY_DOCS 说明）
    status: completed
    dependencies:
      - doc-index
  - id: doc-validation
    content: 验证所有文档链接和格式，确保完整性
    status: completed
    dependencies:
      - doc-cleanup
---

## 用户需求

### 核心问题

1. **README 结构不够清晰**: 当前 README 虽然内容完整但对新用户缺乏有效的引导，快速上手难度高
2. **文档散乱无序**: 项目根目录有 23 个 Markdown 文档，包括系统设计、API 集成、测试报告等，分类混乱
3. **缺少文档导航**: 没有统一的文档结构和清晰的导航机制，用户难以找到所需文档

### 用户需求整理

- **优化 README**: 构建分层次、模块化的结构，突出快速开始和核心特性
- **创建 docs 目录**: 新增文档目录，按功能模块和用途分类组织文档
- **建立文档导航**: 创建统一的文档索引，方便用户查阅

### 预期成果

- 新用户 5 分钟内完成环境配置和首次运行
- 清晰的文档导航，用户能快速找到所需的文档
- 整洁的项目根目录，主要文档集中在 docs 目录

## 文档分类方案

### 目录结构设计

```
docs/
├── README.md                    # 文档导航首页
├── getting-started/             # 快速开始
│   ├── installation.md         # 安装指南
│   ├── configuration.md        # 配置说明
│   └── first-run.md            # 首次运行
├── guides/                      # 使用指南
│   ├── usage.md                # 基础使用
│   ├── commands.md             # 命令详解
│   └── troubleshooting.md      # 常见问题
├── architecture/                # 架构设计
│   ├── overview.md             # 架构总览
│   ├── cli-framework.md        # CLI 框架
│   ├── dialogue-engine.md      # 对话引擎
│   ├── llm-integration.md      # LLM 集成
│   └── map-api.md              # 地图 API
├── development/                 # 开发指南
│   ├── code-structure.md       # 代码结构
│   ├── setup.md                # 开发环境
│   ├── testing.md              # 测试指南
│   └── contributing.md         # 贡献指南
├── api/                         # API 文档
│   ├── cache-system.md         # 缓存系统
│   ├── result-parser.md        # 结果解析
│   ├── logging.md              # 日志系统
│   └── types.md                # 类型定义
└── performance/                 # 性能优化（未来）
    └── optimization.md         # 性能优化指南
```

### 文档映射关系

当前文档 → 目标位置映射：

| 当前文件 | 新位置 | 说明 |
| --- | --- | --- |
| SETUP.md | docs/getting-started/installation.md | 安装和初始化 |
| README.md | 保留 + 优化 | 主 README，突出快速开始 |
| CLI_FRAMEWORK.md | docs/architecture/cli-framework.md | CLI 架构设计 |
| CLI_IMPLEMENTATION_SUMMARY.md | 合并到 CLI_FRAMEWORK.md | 实现细节 |
| CLI_OUTPUT.md + CLI_OUTPUT_QUICK_START.md | docs/guides/commands.md | 命令和输出 |
| DIALOGUE_ENGINE.md + DIALOGUE_ENGINE_SUMMARY.md | docs/architecture/dialogue-engine.md | 对话引擎 |
| LLM_SERVICE_INTEGRATION.md + LLM_SERVICE_SUMMARY.md | docs/architecture/llm-integration.md | LLM 集成 |
| MAP_API_INTEGRATION.md + MAP_API_SUMMARY.md | docs/architecture/map-api.md | 地图 API |
| CACHE_SYSTEM.md + CACHE_QUICK_START.md | docs/api/cache-system.md | 缓存系统 |
| RESULT_PARSER.md + RESULT_PARSER_QUICK_START.md | docs/api/result-parser.md | 结果解析 |
| LOGGING_SYSTEM.md + LOGGING_QUICK_START.md | docs/api/logging.md | 日志系统 |
| INTEGRATION_TESTING.md + TESTING_REPORT.md | docs/development/testing.md | 测试 |
| PROJECT_PROGRESS.md | docs/development/project-status.md | 项目进度 |
| COMPLETION_REPORT.md | docs/development/completion-report.md | 完成报告 |


## 核心交付物

1. **优化后的 README.md**: 简洁的项目说明 + 快速开始 + 文档导航
2. **完整的 docs 目录**: 7 个子目录，40+ 个文档
3. **文档导航页面** (docs/README.md): 统一的文档入口
4. **文档索引** (.gitignore 更新): 确保 docs 目录纳入版本控制

## 技术方案

### 文档组织方案

#### 1. 主 README 优化

- **保持精简**: 控制在 150 行左右（当前 245 行）
- **突出关键信息**: 五层结构 (项目简介 → 核心特性 → 快速开始 → 项目结构 → 文档导航)
- **导航链接**: 指向 docs 目录下的详细文档

#### 2. docs 目录结构

基于用户旅程分层：

- **getting-started/**: 新手第一时间需要的信息
- **guides/**: 实际使用和常见问题
- **architecture/**: 深入了解系统设计
- **development/**: 开发者相关文档
- **api/**: 详细的 API 和模块文档
- **performance/**: 性能优化文档（预留位置）

#### 3. 文档转换策略

- **合并**: 将 Summary 和 Quick Start 文档合并到主要文档（如 CACHE_SYSTEM.md + CACHE_QUICK_START.md → cache-system.md）
- **重组**: 按功能模块重新组织内容，建立逻辑关联
- **补充**: 添加文档间的交叉引用，形成完整的知识体系

#### 4. 导航和索引

- **docs/README.md**: 主导航页面，列出所有文档分类和快速链接
- **面包屑导航**: 每个文档顶部添加位置导航
- **相关文档链接**: 每个文档底部添加相关文档引用

#### 5. 实现技术

- 纯 Markdown 结构，无需额外工具
- 使用相对路径链接实现文档间导航
- 保持 Git 友好的目录结构

### 文档质量标准

| 指标 | 标准 |
| --- | --- |
| 每个文档开头 | 包含摘要和目录 (TOC) |
| 代码示例 | 完整可运行的示例 |
| 链接检查 | 所有内部链接有效 |
| 更新维护 | 跟踪文档最后更新时间 |
| 可访问性 | 支持所有常见 Markdown 阅读器 |