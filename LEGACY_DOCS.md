# 📚 旧文档迁移说明

本文档列出所有原始文档及其在新 docs 目录中的位置。

## 📋 文档迁移映射表

| 原始文件 | 新位置 | 说明 |
|---------|--------|------|
| SETUP.md | [docs/getting-started/installation.md](./docs/getting-started/installation.md) | 安装指南 |
| README.md | [主 README](./README.md) + [docs/README.md](./docs/README.md) | 项目概览和文档导航 |
| CLI_FRAMEWORK.md | [docs/architecture/cli-framework.md](./docs/architecture/cli-framework.md) | CLI 框架设计 |
| CLI_IMPLEMENTATION_SUMMARY.md | [docs/architecture/cli-framework.md](./docs/architecture/cli-framework.md) | 已合并 |
| CLI_OUTPUT.md | [docs/guides/commands.md](./docs/guides/commands.md) | 命令和输出 |
| CLI_OUTPUT_QUICK_START.md | [docs/guides/commands.md](./docs/guides/commands.md) | 已合并 |
| DIALOGUE_ENGINE.md | [docs/architecture/dialogue-engine.md](./docs/architecture/dialogue-engine.md) | 对话引擎设计 |
| DIALOGUE_ENGINE_SUMMARY.md | [docs/architecture/dialogue-engine.md](./docs/architecture/dialogue-engine.md) | 已合并 |
| LLM_SERVICE_INTEGRATION.md | [docs/architecture/llm-integration.md](./docs/architecture/llm-integration.md) | LLM 集成 |
| LLM_SERVICE_SUMMARY.md | [docs/architecture/llm-integration.md](./docs/architecture/llm-integration.md) | 已合并 |
| MAP_API_INTEGRATION.md | [docs/architecture/map-api.md](./docs/architecture/map-api.md) | 地图 API 集成 |
| MAP_API_SUMMARY.md | [docs/architecture/map-api.md](./docs/architecture/map-api.md) | 已合并 |
| CACHE_SYSTEM.md | [docs/api/cache-system.md](./docs/api/cache-system.md) | 缓存系统 |
| CACHE_QUICK_START.md | [docs/api/cache-system.md](./docs/api/cache-system.md) | 已合并 |
| RESULT_PARSER.md | [docs/api/result-parser.md](./docs/api/result-parser.md) | 结果解析 |
| RESULT_PARSER_QUICK_START.md | [docs/api/result-parser.md](./docs/api/result-parser.md) | 已合并 |
| LOGGING_SYSTEM.md | [docs/api/logging.md](./docs/api/logging.md) | 日志系统 |
| LOGGING_QUICK_START.md | [docs/api/logging.md](./docs/api/logging.md) | 已合并 |
| INTEGRATION_TESTING.md | [docs/development/testing.md](./docs/development/testing.md) | 测试指南 |
| TESTING_REPORT.md | [docs/development/testing.md](./docs/development/testing.md) | 已合并 |
| PROJECT_PROGRESS.md | [docs/development/project-status.md](./docs/development/project-status.md) | 项目进度（可选） |
| COMPLETION_REPORT.md | [docs/development/completion-report.md](./docs/development/completion-report.md) | 完成报告（可选） |

## 🔍 如何找到你需要的文档？

### 按内容类型查找

**想要快速开始？**
- → [快速开始指南](./docs/getting-started/installation.md)

**想要了解使用方法？**
- → [基础使用](./docs/guides/usage.md)
- → [命令参考](./docs/guides/commands.md)

**想要理解系统设计？**
- → [架构总览](./docs/architecture/overview.md)
- → [各模块架构](./docs/architecture/)

**想要学习 API？**
- → [API 文档](./docs/api/)

**想要参与开发？**
- → [开发指南](./docs/development/)

### 按原始文件查找

找不到旧文件？使用上面的映射表找到新位置。

## ✅ 文档完整性检查

所有原始文档内容已迁移到新的 docs 目录结构，确保：

- ✓ 所有内容已保留
- ✓ 内容已重新组织和优化
- ✓ 添加了交叉链接便于导航
- ✓ 格式和风格已统一

## 🗂️ 新文档结构优势

| 方面 | 改进 |
|------|------|
| **可导航性** | 清晰的目录结构，快速找到相关文档 |
| **维护性** | 模块化组织，易于更新和维护 |
| **新手体验** | 逐步引导，从快速开始到深入学习 |
| **重用性** | 避免重复内容，单一信息源 |
| **可发现性** | 清晰的导航链接，文档相互连接 |

## 📍 快速链接

- **项目主页**: [README.md](./README.md)
- **文档导航**: [docs/README.md](./docs/README.md)
- **安装指南**: [docs/getting-started/installation.md](./docs/getting-started/installation.md)
- **首次运行**: [docs/getting-started/first-run.md](./docs/getting-started/first-run.md)
- **故障排查**: [docs/guides/troubleshooting.md](./docs/guides/troubleshooting.md)

## 📞 需要帮助？

1. 查看 [docs/README.md](./docs/README.md) 的文档导航
2. 查看 [docs/guides/troubleshooting.md](./docs/guides/troubleshooting.md) 的常见问题
3. 提交 GitHub Issue

---

**最后更新**: 2024-01-15

所有原始文档已成功迁移到新的文档结构中。享受更好的文档体验！
