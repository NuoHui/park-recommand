# 📚 文档导航

欢迎来到深圳公园景点推荐 CLI Agent 的完整文档。此页面提供所有文档的快速访问指南。

## 🚀 快速开始

**首次使用？从这里开始：**

1. [安装指南](./getting-started/installation.md) - 设置环境和安装依赖
2. [配置说明](./getting-started/configuration.md) - 配置 API Keys
3. [首次运行](./getting-started/first-run.md) - 启动应用并了解基本操作

**预计时间**: 5-10 分钟

## 📖 使用指南

**想了解如何使用应用？**

- [基础使用](./guides/usage.md) - 学习基本命令和交互流程
- [命令参考](./guides/commands.md) - 完整的命令列表和选项
- [常见问题](./guides/troubleshooting.md) - 解决常见问题

## 🏗️ 架构设计

**想深入了解系统设计？**

- [系统架构概览](./architecture/overview.md) - 整体架构和模块设计
- [CLI 框架设计](./architecture/cli-framework.md) - CLI 实现细节
- [对话引擎设计](./architecture/dialogue-engine.md) - 多轮对话管理
- [LLM 集成设计](./architecture/llm-integration.md) - LLM 服务集成
- [地图 API 集成](./architecture/map-api.md) - 地图服务集成

## 🔧 开发指南

**想参与开发或扩展功能？**

- [开发环境设置](./development/setup.md) - 配置开发环境
- [代码结构指南](./development/code-structure.md) - 了解项目代码组织
- [测试指南](./development/testing.md) - 编写和运行测试
- [贡献指南](./development/contributing.md) - 提交代码的流程和规范

## 📚 API 文档

**需要了解模块的 API？**

- [缓存系统 API](./api/cache-system.md) - 缓存管理和使用
- [结果解析 API](./api/result-parser.md) - 解析 LLM 和地图 API 结果
- [日志系统 API](./api/logging.md) - 记录和分析日志

## 📋 文档目录结构

```
docs/
├── README.md                    # 当前文档（导航首页）
│
├── getting-started/             # 快速开始
│   ├── installation.md         # 安装指南
│   ├── configuration.md        # 配置说明
│   └── first-run.md            # 首次运行
│
├── guides/                      # 使用指南
│   ├── usage.md                # 基础使用
│   ├── commands.md             # 命令参考
│   └── troubleshooting.md      # 故障排查
│
├── architecture/                # 架构设计
│   ├── overview.md             # 架构总览
│   ├── cli-framework.md        # CLI 框架
│   ├── dialogue-engine.md      # 对话引擎
│   ├── llm-integration.md      # LLM 集成
│   └── map-api.md              # 地图 API
│
├── development/                 # 开发指南
│   ├── setup.md                # 开发环境
│   ├── code-structure.md       # 代码结构
│   ├── testing.md              # 测试指南
│   └── contributing.md         # 贡献指南
│
├── api/                         # API 文档
│   ├── cache-system.md         # 缓存系统
│   ├── result-parser.md        # 结果解析
│   └── logging.md              # 日志系统
│
└── performance/                 # 性能优化（预留）
    └── optimization.md         # 性能优化指南
```

## 🎯 按角色查找文档

### 👤 新用户

想快速上手应用？

1. [安装指南](./getting-started/installation.md) - 5 分钟完成安装
2. [首次运行](./getting-started/first-run.md) - 启动应用
3. [基础使用](./guides/usage.md) - 了解基本功能

### 👨‍💻 开发者

想参与项目开发？

1. [开发环境设置](./development/setup.md) - 配置开发环境
2. [代码结构指南](./development/code-structure.md) - 了解项目结构
3. [系统架构](./architecture/overview.md) - 理解系统设计
4. [API 文档](./api/cache-system.md) - 模块 API 参考
5. [测试指南](./development/testing.md) - 编写测试
6. [贡献指南](./development/contributing.md) - 提交代码

### 🏗️ 架构师

想了解系统设计？

1. [系统架构概览](./architecture/overview.md) - 整体设计
2. 各模块架构文档 - 深入了解各部分设计
3. [性能优化](./performance/optimization.md) - 性能考虑

### 🐛 运维人员

需要排查问题？

1. [常见问题](./guides/troubleshooting.md) - 快速解决常见问题
2. [日志系统](./api/logging.md) - 分析日志
3. [配置说明](./getting-started/configuration.md) - 调整配置

## ❓ 快速问题解答

### 如何安装？
→ 查看 [安装指南](./getting-started/installation.md)

### 如何配置 API Keys？
→ 查看 [配置说明](./getting-started/configuration.md)

### 应用无法启动？
→ 查看 [常见问题](./guides/troubleshooting.md)

### 如何获得最佳性能？
→ 查看 [性能优化](./performance/optimization.md) 和 [缓存系统](./api/cache-system.md)

### 如何贡献代码？
→ 查看 [贡献指南](./development/contributing.md)

### 如何理解代码结构？
→ 查看 [代码结构指南](./development/code-structure.md)

## 🔍 文档特点

✅ **完整**: 涵盖安装、使用、开发的全方位内容  
✅ **易用**: 清晰的分类和导航，快速找到所需内容  
✅ **实用**: 包含代码示例、最佳实践和常见问题  
✅ **最新**: 随项目更新而更新

## 📞 获取帮助

如果文档中找不到答案：

1. **检查 [常见问题](./guides/troubleshooting.md)** - 可能已有解答
2. **查看 [日志](./api/logging.md)** - 查看错误信息
3. **提交 Issue** - 在 GitHub 上报告问题
4. **参与讨论** - 在社区中寻求帮助

## 🤝 提出改进建议

文档还能改进吗？欢迎提出建议或提交 PR！

查看 [贡献指南](./development/contributing.md) 了解如何参与。

## 📝 许可证

所有文档均采用 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 许可证。

---

## 文档更新历史

| 版本 | 日期 | 更新内容 |
|------|------|--------|
| 1.0 | 2024-01-15 | 初始文档创建，包含所有核心模块文档 |

**最后更新**: 2024-01-15

---

**返回 [项目首页](../README.md)**
