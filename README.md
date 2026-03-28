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

👉 **[查看完整文档导航](./docs/README.md)** - 所有文档已分类整理

### 快速链接

- **测试运行**: [如何运行测试](./docs/guides/HOW-TO-RUN-TESTS.md)
- **快速参考**: [测试快速指南](./docs/guides/QUICK-TEST-GUIDE.md)
- **LLM 开发**: [LLM 完整指南](./docs/guides/LLM-TESTING-GUIDE.md)
- **Git 提交**: [Git Hooks 配置](./docs/guides/GIT-HOOKS-GUIDE.md)
- **故障排除**: [问题排查指南](./docs/guides/TROUBLESHOOTING.md)
- **设计文档**: [系统设计审查](./docs/reports/DESIGN-REVIEW.md)

### 文档结构

```
docs/
├── README.md              ← 文档概览（首先查看）
├── INDEX.md               ← 完整文档索引
├── guides/                # 日常使用指南（15+ 文件）
├── reports/               # 技术报告和分析（22+ 文件）
├── specs/                 # 技术规范和集成（8+ 文件）
└── archives/              # 历史文档（5+ 文件）
```

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
