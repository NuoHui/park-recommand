# 🏞️ 深圳公园景点推荐 CLI Agent

一个功能强大的命令行 Agent，为深圳用户智能推荐公园和爬山景点。通过多轮对话交互了解用户偏好，调用 LLM 进行决策，集成地图 API 获取实时地点信息。

## ✨ 核心特性

- **🤖 LLM 智能推荐**: 集成 OpenAI/Claude API，进行智能决策
- **💬 多轮对话交互**: 逐步收集用户偏好，维持完整上下文
- **🗺️ 地图数据集成**: 实时获取地点信息（距离、评分、难度等）
- **⚡ 高性能缓存**: 两层缓存设计（内存 + 磁盘），减少 API 调用
- **🎨 美观 CLI 界面**: 结构化输出，清晰信息呈现
- **📝 完整日志系统**: Winston 日志记录，便于调试

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn
- OpenAI/Claude API Key
- 高德地图 Web Service API Key

### 5 分钟快速开始

```bash
# 1. 克隆并安装
git clone <repo-url>
cd park-recommand
npm install

# 2. 配置 API Keys
cp .env.example .env
# 编辑 .env，填入你的 API 密钥

# 3. 启动
npm run dev
```

详细说明请参考 **[快速开始指南](./docs/getting-started/installation.md)**

## 📖 文档导航

| 分类 | 说明 | 文档 |
|------|------|------|
| **快速开始** | 新手第一时间需要的信息 | [安装配置](./docs/getting-started/installation.md) · [首次运行](./docs/getting-started/first-run.md) |
| **使用指南** | 实际使用和常见问题 | [基础命令](./docs/guides/usage.md) · [常见问题](./docs/guides/troubleshooting.md) |
| **架构设计** | 深入了解系统设计 | [系统架构](./docs/architecture/overview.md) · [CLI 框架](./docs/architecture/cli-framework.md) · [LLM 集成](./docs/architecture/llm-integration.md) |
| **开发指南** | 开发者相关文档 | [代码结构](./docs/development/code-structure.md) · [开发环境](./docs/development/setup.md) · [测试指南](./docs/development/testing.md) |
| **API 文档** | 详细的 API 和模块文档 | [缓存系统](./docs/api/cache-system.md) · [结果解析](./docs/api/result-parser.md) · [日志系统](./docs/api/logging.md) |

## 🏗️ 项目结构

```
src/
├── cli/                    # CLI 框架和命令
├── dialogue/              # 多轮对话管理
├── llm/                   # LLM 客户端和集成
├── map/                   # 地图 API 集成
├── cache/                 # 缓存管理系统
├── types/                 # TypeScript 类型定义
├── utils/                 # 工具函数库
├── config/                # 配置管理
└── index.ts               # 应用入口
```

## 🔧 常见命令

```bash
npm run dev       # 开发模式（热重载）
npm run build     # 编译 TypeScript
npm start         # 生产模式运行
npm run lint      # 代码检查
npm run format    # 格式化代码
npm test          # 运行测试
```

## 📝 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！详见 [贡献指南](./docs/development/contributing.md)

---

**需要帮助？** 查看 [完整文档](./docs/README.md) 或 [常见问题](./docs/guides/troubleshooting.md)
