---
name: cleanup_root_markdown_docs
overview: 梳理根目录 MD 文档，删除不需要的文件，将需要的文档整理到 docs 目录并建立清晰的文档结构。
todos:
  - id: analyze-root-docs
    content: 分析根目录 24 个 MD 文件，确认删除/迁移分类
    status: completed
  - id: migrate-reports
    content: 复制重要报告文档（COMPLETION_REPORT、TESTING_REPORT、PROJECT_PROGRESS、DOCS_SUMMARY）到 docs/development
    status: completed
    dependencies:
      - analyze-root-docs
  - id: delete-duplicates
    content: 删除根目录已迁移的 17 个重复文档
    status: completed
    dependencies:
      - migrate-reports
  - id: verify-docs-structure
    content: 验证 docs 目录完整性，检查文档链接有效性
    status: completed
    dependencies:
      - delete-duplicates
  - id: update-legacy-mapping
    content: 更新 LEGACY_DOCS.md，补充新增报告的映射说明
    status: completed
    dependencies:
      - verify-docs-structure
  - id: final-check
    content: 最终检查：根目录保持简洁，docs 结构清晰，所有链接有效
    status: completed
    dependencies:
      - update-legacy-mapping
---

## 用户需求

梳理并整理根目录下的 Markdown 文档：

1. 确认根目录哪些 MD 文件已迁移到 docs 目录，标记为删除
2. 确认哪些 MD 文件包含重要的进度/报告信息，需要保留或迁移
3. 删除重复/冗余的文档
4. 将需要保留的文档整理到 docs 目录的合适位置
5. 更新 LEGACY_DOCS.md 映射表（如需要）

## 现状分析

### 根目录 MD 文件（24 个，含 README.md）

- **系统设计类**（已有对应 docs 文档）：CLI_FRAMEWORK.md、CLI_OUTPUT.md、DIALOGUE_ENGINE.md、LLM_SERVICE_INTEGRATION.md、MAP_API_INTEGRATION.md、CACHE_SYSTEM.md、LOGGING_SYSTEM.md、RESULT_PARSER.md
- **快速开始类**（已有对应 docs 文档）：SETUP.md、CLI_OUTPUT_QUICK_START.md、CACHE_QUICK_START.md、LOGGING_QUICK_START.md、RESULT_PARSER_QUICK_START.md
- **总结/报告类**（新增需整理）：COMPLETION_REPORT.md、TESTING_REPORT.md、PROJECT_PROGRESS.md、DOCS_SUMMARY.md
- **历史记录类**：DIALOGUE_ENGINE_SUMMARY.md、CLI_IMPLEMENTATION_SUMMARY.md、LLM_SERVICE_SUMMARY.md、MAP_API_SUMMARY.md、LEGACY_DOCS.md、INTEGRATION_TESTING.md

### docs 目录结构

已有 15 个文档，分布在 6 个子目录：getting-started、guides、architecture、development、api、performance

## 核心特性

- 根目录保持简洁，仅保留 README.md
- 将所有项目文档集中到 docs 目录
- 保留关键的完成报告和进度记录在 docs/development 目录
- 删除所有"_SUMMARY"和"_QUICK_START"重复文档（内容已合并到主文档）
- 整理后的文档结构清晰、导航明确

## 技术方案

### 整理策略

1. **分类清理**：根据文档类型和内容价值，分为删除/迁移两类
2. **删除标准**：内容已完全合并到 docs 目录对应文档的文件
3. **迁移标准**：包含项目完成报告、测试报告、进度记录等参考价值文档
4. **保留规则**：docs 目录已结构化组织，根目录仅保留 README.md 和 .codebuddy 等必需文件

### 删除清单（17 个）

**系统设计类**（已在 docs/architecture 中）：

- CLI_FRAMEWORK.md（→ docs/architecture/cli-framework.md）
- CLI_IMPLEMENTATION_SUMMARY.md（→ docs/architecture/cli-framework.md）
- DIALOGUE_ENGINE.md（→ docs/architecture/dialogue-engine.md）
- DIALOGUE_ENGINE_SUMMARY.md（→ docs/architecture/dialogue-engine.md）
- LLM_SERVICE_INTEGRATION.md（→ docs/architecture/llm-integration.md）
- LLM_SERVICE_SUMMARY.md（→ docs/architecture/llm-integration.md）
- MAP_API_INTEGRATION.md（→ docs/architecture/map-api.md）
- MAP_API_SUMMARY.md（→ docs/architecture/map-api.md）

**快速开始/API 类**（已在 docs 中）：

- CACHE_SYSTEM.md（→ docs/api/cache-system.md）
- CACHE_QUICK_START.md（已合并）
- LOGGING_SYSTEM.md（→ docs/api/logging.md）
- LOGGING_QUICK_START.md（已合并）
- RESULT_PARSER.md（→ docs/api/result-parser.md）
- RESULT_PARSER_QUICK_START.md（已合并）
- CLI_OUTPUT.md（→ docs/guides/commands.md）
- CLI_OUTPUT_QUICK_START.md（已合并）
- INTEGRATION_TESTING.md（→ docs/development/testing.md）

### 迁移清单（4 个）

**重要报告/记录**（需保留在 docs/development）：

- COMPLETION_REPORT.md → docs/development/completion-report.md
- TESTING_REPORT.md → docs/development/testing-report.md
- PROJECT_PROGRESS.md → docs/development/project-progress.md
- DOCS_SUMMARY.md → docs/development/docs-summary.md

### 保留规则

- **LEGACY_DOCS.md**：保留在根目录（历史映射表，用户参考）
- **README.md**：保留在根目录（项目入口，已优化指向 docs）
- **其他 config/setup 文件**：保留（.env、package.json、tsconfig.json 等）

### 实施步骤

1. 复制需迁移文档到 docs/development
2. 批量删除根目录的重复文档
3. 验证 docs/README.md 的文档链接完整性
4. 更新 LEGACY_DOCS.md（可选，补充新增报告的映射）
5. 验证根目录清晰度