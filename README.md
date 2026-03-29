# 🏞️ 深圳公园景点推荐 CLI Agent

一个功能强大的命令行 Agent，为深圳用户智能推荐公园和爬山景点。基于 LLM 智能决策，集成高德地图 API 获取实时地点信息，返回 **Top 5 推荐结果**。

采用 **Harness Agent 架构** 提供企业级的安全约束、资源管理、风险控制和完整审计能力。

## ✨ 核心特性

- **🤖 LLM 智能推荐**: 集成 OpenAI/Claude API，支持多轮对话交互
- **⭐ Top 5 推荐**: 每次推荐返回最优的 5 个景点结果
- **🗺️ 实时地图数据**: 高德地图 Web Service API，获取距离、评分、类型等信息
- **💬 多轮对话交互**: 通过对话逐步了解用户偏好，维持完整上下文
- **⚡ 高性能缓存**: 两层缓存设计（内存 + 磁盘），减少 API 调用
- **🎨 美观 CLI 界面**: 结构化输出，清晰信息呈现
- **📝 完整日志系统**: Winston 日志记录，便于调试
- **🔒 企业级治理**: Harness Agent 框架提供工具白名单、资源限制、风险评分、监控告警

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn
- OpenAI 或 Claude API Key
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

### 基本使用

```bash
# 运行 CLI 应用
npm run dev

# 输入你的偏好，获取 Top 5 推荐
# 示例: "我喜欢山景，近距离，难度中等"
```

## 🧪 测试

项目采用完整的单元测试框架，支持快速验证核心功能：

```bash
# 运行所有单元测试
npm test

# 运行特定测试
npm run test:unit      # 全部单元测试
npm run test:amap      # 高德地图 API 测试
npm run test:llm       # LLM 功能测试

# 编译和测试
npm run build          # 编译 TypeScript
```

### 测试覆盖

| 测试套件 | 功能 | 测试数 | 状态 |
|---------|------|-------|------|
| **高德客户端** | 初始化、连接、基础功能 | 3 | ✅ |
| **POI 搜索** | 文本搜索、多页查询、数据完整性 | 3 | ✅ |
| **地理编码** | 地址编码、反向编码 | 2 | ✅ |
| **距离计算** | 单次、批量计算 | 2 | ✅ |
| **Top 5 推荐** ⭐ | Top 5 限制、边界处理、数据富集 | 3 | ✅ |
| **LLM 功能** | 消息处理、推荐生成、结果解析 | 7+ | ✅ |
| **总计** | | **14+** | **✅** |

## 📂 项目结构

```
src/
├── cli/                    # CLI 框架和命令
│   └── commands/          # 推荐、帮助等命令
├── dialogue/              # 多轮对话管理
├── llm/                   # LLM 客户端和引擎
├── map/                   # 高德地图 API 集成
├── cache/                 # 缓存管理（内存+磁盘）
├── config/                # 配置管理（环境变量、常量）
├── types/                 # TypeScript 类型定义
├── utils/                 # 工具函数库
├── __tests__/             # 单元测试
│   └── unit/             # 单元测试用例
└── index.ts               # 应用入口
```

## 🔧 常用命令

### 开发命令

```bash
npm run dev           # 开发模式（热重载）
npm run dev:build     # 编译后链接到全局
npm run dev:watch     # 监视源文件变化
```

### 构建和运行

```bash
npm run build         # 编译 TypeScript → dist/
npm start             # 运行编译后的应用
npm run clean         # 清理 dist/ 目录
```

### 代码质量

```bash
npm run lint          # ESLint 检查
npm run format        # Prettier 格式化
```

### 测试和诊断

```bash
npm test              # 运行所有单元测试
npm run test:unit     # 单元测试（amap + llm）
npm run test:amap     # 高德地图 API 测试
npm run test:llm      # LLM 功能测试
npm run diagnose:llm  # LLM 诊断脚本
npm run trace:llm     # LLM 调用追踪
```

## 🎯 Top 5 推荐工作流

1. **用户输入** → CLI 接收用户偏好
2. **多轮对话** → Dialogue Manager 收集详细需求
3. **LLM 决策** → LLM 分析偏好，生成推荐决策
4. **地图查询** → 高德 API 搜索相关景点（POI）
5. **Top 5 筛选** → 从所有结果中选出最优的 5 个
6. **数据富集** → 补充距离、评分、商圈等信息
7. **美化输出** → CLI 格式化展示给用户

## 📊 系统架构

```
用户输入
   ↓
[CLI Interface]
   ↓
[Harness Agent 治理层]
├─ 约束检查 (工具白名单、行为限制)
├─ 资源管理 (API限制、Token追踪、并发控制)
├─ 意图验证 (安全检查、权限验证)
├─ 风险评分 (自动识别高风险操作)
└─ 监控告警 (实时告警、审计追踪)
   ↓
[Dialogue Manager] ← 维持对话上下文
   ↓
[LLM Engine] ← 智能决策
   ↓
[Recommendation Command]
   ↓
[Amap Client] ← 高德 API 查询
   ↓
[POI Search Results]
   ↓
[Top 5 Filter] ← 筛选最优结果
   ↓
[Cache Manager] ← 两层缓存（内存+磁盘）
   ↓
[Output Formatter]
   ↓
用户显示
```

## 🔐 Harness Agent 架构亮点

| 功能 | 说明 | 效果 |
|------|------|------|
| **工具白名单** | 只允许指定工具执行 | ✅ 防止未授权工具调用 |
| **资源管理** | API 频率、Token、并发控制 | ✅ 防止资源耗尽 |
| **风险评分** | 四维度评分 (工具、参数、深度、历史) | ✅ 自动识别高风险操作 |
| **意图验证** | 黑名单检测、注入识别 | ✅ 防止安全漏洞 |
| **执行沙箱** | 前置检查 → 执行 → 后置检查 | ✅ 安全隔离 |
| **监控告警** | 实时告警系统 (5 种告警类型) | ✅ 及时发现问题 |
| **审计追踪** | 完整的执行链记录 | ✅ 可追溯、可审计 |

## 🔑 核心模块说明

### LLM 集成 (`src/llm/`)
- **Client**: OpenAI/Claude API 封装
- **Engine**: 推荐逻辑和决策生成
- **支持**: 多轮对话、上下文管理、流式响应

### 高德地图 (`src/map/`)
- **Client**: 高德 Web Service API 封装
- **Service**: POI 搜索、地理编码、距离计算
- **Top 5**: 智能筛选和排序算法

### 缓存系统 (`src/cache/`)
- **两层缓存**: 内存（快速）+ 磁盘（持久化）
- **过期策略**: 不同类型数据的 TTL 配置
- **去重**: 避免重复推荐结果

### 对话管理 (`src/dialogue/`)
- **多轮交互**: 维持完整对话历史
- **上下文**: 记录用户偏好和决策过程

## 📝 环境变量配置

创建 `.env` 文件，配置以下变量：

```env
# LLM 配置
OPENAI_API_KEY=your-openai-key
CLAUDE_API_KEY=your-claude-key
LLM_PROVIDER=openai              # 或 claude

# 高德地图配置
AMAP_API_KEY=your-amap-key
AMAP_BASE_URL=https://restapi.amap.com/v3

# 应用配置
APP_NAME=深圳公园景点推荐 Agent
LOG_LEVEL=info                   # debug, info, warn, error
```

## 🐛 故障排除

### 高德 API 频率限制

如果遇到 `CUQPS_HAS_EXCEEDED_THE_LIMIT (10021)` 错误，这是正常的 API 限制。解决方案：

1. 等待片刻后重试
2. 检查 API 配额和月度使用量
3. 考虑升级高德地图服务等级

### LLM 连接失败

- 检查 API Key 是否正确配置
- 验证网络连接和防火墙设置
- 查看日志: `npm run diagnose:llm`

### 缓存问题

- 清理缓存: `rm -rf ~/.park-recommender/cache/`
- 使用诊断脚本: `npm run trace:llm`

## 📚 相关文档

- **快速开始**: 查看本文档的"快速开始"章节
- **API 文档**: 参考代码注释和类型定义
- **测试指南**: 运行 `npm run test:amap` 查看测试用例

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**版本**: 2.0.0 (Harness Agent 架构版本)  
**最后更新**: 2026-03-29  
**维护者**: Park Recommender Team
