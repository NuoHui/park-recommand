# 🏗️ 深圳公园景点推荐 CLI Agent - 项目架构

**版本**: 2.0.0 (Harness Agent 架构版本)  
**更新时间**: 2026-03-29  
**项目**: Park Recommender CLI Agent with Harness Agent Framework  
**目标**: 为深圳用户智能推荐公园和爬山景点，返回 **Top 5** 推荐结果，采用企业级治理框架

---

## 📋 目录

1. [架构概览](#架构概览)
2. [Harness Agent 治理层](#harness-agent-治理层)
3. [核心链路](#核心链路)
4. [模块详解](#模块详解)
5. [数据流设计](#数据流设计)
6. [性能优化](#性能优化)
7. [测试策略](#测试策略)
8. [错误处理](#错误处理)
9. [扩展指南](#扩展指南)

---

## 架构概览

### 完整系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                     用户输入 (CLI Terminal)                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│  CLI Framework (commander)                                      │
│  ├─ runCLI()  (src/cli/index.ts)                               │
│  └─ Command Parser & Router                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│  🔐 Harness Agent 治理层 (src/harness/)                         │
│  ├─ 约束检查: 工具白名单、行为限制、资源约束                    │
│  ├─ 资源管理: API限制(60/min)、Token追踪、并发(5)              │
│  ├─ 意图验证: 安全检查、黑名单检测、权限验证                    │
│  ├─ 风险评分: 四维度评分 (工具/参数/深度/历史)                 │
│  ├─ 执行沙箱: 前置检查 → 执行 → 后置检查                        │
│  └─ 监控告警: 实时告警、审计追踪、事件记录                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│  推荐命令执行 (src/cli/commands/recommend.ts)                    │
│  ├─ 参数提取 (ParameterExtractor)                               │
│  ├─ 参数验证 (ParameterValidator)                               │
│  └─ 推荐流程触发                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│  对话管理器 (Dialogue Manager)                                    │
│  src/dialogue/manager.ts                                        │
│                                                                  │
│  getRecommendations() - 完整推荐流程                             │
│  ├─ Step 1: 缓存检查                                            │
│  ├─ Step 2: LLM 信息检查（验证必需字段）                         │
│  ├─ Step 3: LLM 参数优化                                        │
│  ├─ Step 4: 地图 API 查询                                       │
│  ├─ Step 5: 结果降级处理                                        │
│  ├─ Step 6: LLM 解析与排序                                      │
│  ├─ Step 7: Top 5 筛选与格式化                                  │
│  ├─ Step 8: 缓存存储                                            │
│  └─ Step 9: 性能指标记录                                        │
└────────────────────────┬────────────────────────────────────────┘
           │             │             │
┌──────────▼──┐  ┌─────▼──────┐  ┌───▼──────────┐
│   LLM 服务  │  │ 地图服务    │  │ 性能优化     │
│             │  │             │  │              │
│ ├─ Client   │  │ ├─ Amap     │  │ ├─ Cache     │
│ ├─ Engine   │  │ │  Client   │  │ ├─ Queue    │
│ └─ Service  │  │ ├─ Location │  │ ├─ Metrics  │
│             │  │ │  Service  │  │ └─ Logger   │
│  [OpenAI]   │  │ └─ POI      │  │              │
│  [Anthropic]│  │    Search   │  │              │
│  [Aliyun]   │  │            │  │              │
└─────────────┘  └─────────────┘  └──────────────┘
           │             │             │
           └─────────────┼─────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│  结果格式化与输出 (OutputManager)                                │
│  ├─ Formatter (美化格式)                                        │
│  └─ Interactive (用户交互)                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    CLI 界面输出                                   │
│                   (用户看到的结果)                                │
└─────────────────────────────────────────────────────────────────┘
```

### 核心特性

| 功能 | 描述 | 技术栈 | 状态 |
|------|------|--------|------|
| **LLM 智能推荐** | OpenAI / Claude / Aliyun 支持 | OpenAI SDK, Anthropic SDK | ✅ |
| **Top 5 推荐** | 最优景点筛选和排序 | 排序算法、相关性评分 | ✅ |
| **实时地图数据** | 高德地图 Web Service API | Axios, 缓存机制 | ✅ |
| **多轮对话** | 维持对话上下文和用户偏好 | 状态机、消息历史 | ✅ |
| **高性能缓存** | 内存 + 磁盘两层缓存 | Node.js 原生 fs/Map | ✅ |
| **CLI 界面** | 美观的终端输出 | Chalk, Commander | ✅ |
| **日志系统** | 结构化日志记录 | Winston | ✅ |
| **🔒 Harness Agent** | 安全约束、资源管理、风险控制 | TypeScript, 设计模式 | ✅ |

---

## Harness Agent 治理层

### 架构设计 (5 大模块)

```
┌──────────────────────────────────────────────────────────────┐
│              Harness Agent 协调层                             │
│  ┌────────────┬───────────┬─────────┬──────────┬──────────┐  │
│  │ 约束系统   │ 执行沙箱  │ 资源管理 │ 验证系统 │ 监控告警  │  │
│  └────────────┴───────────┴─────────┴──────────┴──────────┘  │
└──────────────────────────────────────────────────────────────┘
         ↓           ↓            ↓           ↓          ↓
    约束检查    工具执行    API/Token  安全验证   告警/审计
```

### 1️⃣ 约束系统 (Constraints)

**三维约束配置** (`src/harness/config/constraints.ts`):

```typescript
✓ ToolConstraints      - 工具白名单/黑名单
✓ ResourceConstraints  - API频率、Token、并发限制
✓ BehaviorConstraints  - 允许的操作、行为约束、风险阈值
```

**默认配置示例**:
- ✅ 允许工具: `llm-client`, `amap-client`, `cache-manager`, `request-queue`
- ✅ 拒绝工具: 任何未在白名单中的工具
- ✅ API 限制: 60 次/分钟
- ✅ Token 限制: 单次 4000, 会话 32000, 全局 100000
- ✅ 并发限制: 5 个任务

### 2️⃣ 执行沙箱 (Execution Sandbox)

**隔离和控制** (`src/harness/execution/`):

```
工具调用流程:
  ├─→ ToolRegistry.validate()     ✓ 工具是否在白名单
  ├─→ PreCheckExecutor.execute()   ✓ 参数验证、深度检查
  ├─→ 【实际执行】                   ⚙️ 执行工具
  └─→ PostCheckExecutor.execute()  ✓ 结果验证、数据脱敏
```

**关键执行器**:
- `ToolRegistry`: 工具白名单验证
- `PreCheckExecutor`: 参数验证、深度检查
- `PostCheckExecutor`: 结果验证、数据脱敏

### 3️⃣ 资源管理系统 (Resource Management)

**精细控制** (`src/harness/resource/`):

| 组件 | 算法 | 功能 |
|------|------|------|
| **RateLimiter** | 滑动时间窗口 | API 频率控制 (60/min) |
| **TokenTracker** | 会话级+全局级追踪 | Token 使用管理 |
| **ConcurrencyController** | 信号量 | 并发任务限制 (5) |
| **ResourceManager** | 统一协调 | 综合资源检查 |

### 4️⃣ 验证和风险系统 (Validation & Risk)

**意图验证** (`src/harness/validation/IntentValidator`):
- ✓ 输入安全检查（黑名单、注入检测）
- ✓ 意图分类（查询、推荐、修改、删除）
- ✓ 权限检查（基于意图的权限矩阵）

**风险评分** (`src/harness/validation/RiskScorer`):

```
总分 = 工具风险[0-30] + 参数风险[0-30] + 深度风险[0-15] + 历史风险[0-25]

工具风险:
  ├─ Cache: 5分
  ├─ Map: 10分
  └─ LLM: 15分

参数风险:
  ├─ 大小 > 100KB: 10分
  ├─ 删除操作: 30分
  └─ 修改操作: 20分

调用深度:
  └─ 深度 > 3: 15分

历史行为:
  ├─ 失败: +5分/次
  └─ 超时: +5分/次

风险等级:
  ├─ Low: 0-24
  ├─ Medium: 25-49
  ├─ High: 50-74
  └─ Critical: 75-100 (需要审批)
```

### 5️⃣ 监控和审计系统 (Monitoring & Audit)

**SafetyMonitor** (安全监控):
- 📊 5 种告警类型:
  - `rate_limit` - API 频率超限
  - `token_budget` - Token 预算超出
  - `timeout` - 执行超时
  - `anomaly` - 异常行为
  - `resource_exhaustion` - 资源耗尽

- ⚠️ 4 级告警:
  - `info` - 信息性日志
  - `warning` - 需要注意
  - `error` - 错误事件
  - `critical` - 严重问题

**ExecutionTracker** (执行追踪):
- 📝 审计日志记录（唯一 ID、会话、操作类型、结果）
- 🔗 会话执行链追踪
- 📊 JSON/CSV 导出
- 📋 报告生成

---

## 核心链路

### 完整推荐流程（含 Harness Agent 检查）

```
输入: UserPreference
  ├─ location: 用户位置
  ├─ parkType: 景点类型 (park|hiking|both)
  ├─ maxDistance: 最大距离 (km)
  └─ ... 其他偏好

        ↓

【Harness 阶段 1】资源可用性检查 ✓ (< 1ms)
  ├─ API 频率检查 (60/min)
  ├─ Token 预算检查 (单次/会话/全局)
  ├─ 并发限制检查 (5 个任务)
  └─ 资源不足? → 返回错误

        ↓

【Harness 阶段 2】意图验证 ✓ (< 5ms)
  ├─ 输入安全检查 (黑名单/注入检测)
  ├─ 意图分类 (查询/推荐/修改/删除)
  ├─ 权限检查 (基于意图的权限矩阵)
  └─ 验证失败? → 返回错误

        ↓

【步骤 1】缓存检查 ✓
  generateCacheKey()
  checkCachedRecommendations()
  └─ 如果命中 → 返回缓存结果

        ↓

【步骤 2】LLM 信息检查 ✓
  shouldRecommend(preferences)
  ├─ 验证位置信息
  ├─ 验证景点类型
  ├─ 验证距离偏好
  └─ 如果缺失 → 返回错误

        ↓

【步骤 3】LLM 参数优化 ✓
  generateSearchParams(preferences)
  ├─ 调用 LLM
  ├─ 解析 JSON 响应
  ├─ 优化搜索参数
  └─ 返回 RecommendationDecision

        ↓

【Harness 阶段 3】风险评分 ✓ (< 3ms)
  RiskScorer.scoreExecution()
  ├─ 工具风险[0-30]
  ├─ 参数风险[0-30]
  ├─ 调用深度[0-15]
  ├─ 历史行为[0-25]
  ├─ 总分: 0-100
  └─ Critical(>75)? → 需要审批

        ↓

【步骤 4】地图 API 查询 ✓ (Harness 沙箱执行)
  searchRecommendedLocations(preferences)
  ├─ PreCheck: 参数验证
  ├─ 构建搜索关键词
  ├─ 调用高德 POI 搜索 (受限制保护)
  ├─ 计算距离（如需要）
  ├─ 按距离过滤
  ├─ PostCheck: 结果验证
  └─ 返回 Location[]

        ↓

【步骤 5】结果降级处理 ✓
  如果无结果:
  ├─ getFallbackRecommendations()
  ├─ getPopularLocations()
  └─ generateMockRecommendations()

        ↓

【步骤 6】LLM 解析与排序 ✓
  parseRecommendations(locations)
  ├─ 尝试直接 JSON 解析
  ├─ 失败后调用 LLM
  ├─ 提取推荐理由
  └─ 返回 ParsedRecommendation

        ↓

【步骤 7】Top 5 筛选与格式化 ✓
  formatRecommendations(locations, parsed)
  ├─ 按相关性排序
  ├─ 截取前 5 个 (Top 5)
  └─ 转换为推荐格式

        ↓

【步骤 8】状态转移 & 缓存 ✓
  ├─ 更新对话状态
  ├─ cacheRecommendations()
  └─ 保存结果

        ↓

【Harness 阶段 4】监控和审计 ✓
  SafetyMonitor.monitorResult()
  ├─ 检查告警条件
  ├─ 触发必要的告警
  └─ 记录审计日志
  
  ExecutionTracker.recordAudit()
  ├─ 记录唯一 ID
  ├─ 记录操作类型和结果
  └─ 保存执行链

        ↓

【步骤 9】性能指标记录 ✓
  recordRequest(totalTime, success)
  ├─ 总耗时
  ├─ LLM 处理时间
  ├─ 地图查询时间
  ├─ 缓存命中情况
  └─ Harness 开销

        ↓

输出: RecommendationResult
  ├─ success: boolean
  ├─ recommendations: Recommendation[]
  ├─ error?: string
  └─ performanceMetrics?: {
       totalTime, llmTime, mapQueryTime, cacheHit, harnessOverhead
     }
```

### 关键决策点

```
用户输入
   ↓
【Harness 约束检查】✓ (< 1ms)
   ├─ 资源可用? ─ 否 → 返回资源不足错误
   ├─ 安全验证通过? ─ 否 → 返回安全错误
   ├─ 风险等级可接受? ─ 否 → 需要审批或拒绝
   └─ 是 ↓
│
├─ 是否有缓存? ─ 是 → 返回缓存
│  └─ 否 ↓
│
├─ 信息是否完整? ─ 否 → 返回错误提示
│  └─ 是 ↓
│
├─ LLM 返回有效结果? ─ 否 → 使用默认参数
│  └─ 是 ↓
│
├─ 高德 API 返回结果? ─ 否 → 尝试降级方案
│  │    │
│  │    ├─ 热门景点
│  │    ├─ 缓存数据
│  │    └─ 模拟数据
│  └─ 是 ↓
│
├─ 结果是否足够 (≥5 个)? ─ 否 → 补充降级数据
│  └─ 是 ↓
│
├─ LLM 解析成功? ─ 否 → 使用默认理由
│  └─ 是 ↓
│
├─ 输出 Top 5 推荐
│  ↓
└─ 【Harness 监控和审计】✓ (< 2ms)
   ├─ 触发必要的告警
   ├─ 记录审计日志
   └─ 完成
```

---

## 模块详解

### 0. Harness Agent 治理框架 (`src/harness/`)

**职责**: 企业级安全约束、资源管理、风险控制和完整审计

**核心子模块**:

| 模块 | 功能 | 关键类 |
|------|------|--------|
| `config/constraints.ts` | 约束配置定义 | `ToolConstraints`, `ResourceConstraints`, `BehaviorConstraints` |
| `execution/tool-registry.ts` | 工具白名单验证 | `ToolRegistry` |
| `execution/pre-check.ts` | 前置检查执行器 | `PreCheckExecutor` |
| `execution/post-check.ts` | 后置检查执行器 | `PostCheckExecutor` |
| `resource/rate-limiter.ts` | API 频率限制 | `RateLimiter` |
| `resource/token-tracker.ts` | Token 使用追踪 | `TokenTracker` |
| `resource/concurrency.ts` | 并发控制 | `ConcurrencyController` |
| `resource/manager.ts` | 资源管理协调 | `ResourceManager` |
| `validation/intent-validator.ts` | 意图验证 | `IntentValidator` |
| `validation/risk-scorer.ts` | 风险评分 | `RiskScorer` |
| `monitoring/safety-monitor.ts` | 安全监控 | `SafetyMonitor` |
| `monitoring/execution-tracker.ts` | 执行追踪审计 | `ExecutionTracker` |
| `wrapper/llm-wrapper.ts` | LLM 执行包装器 | `LLMExecutorWrapper` |
| `wrapper/map-wrapper.ts` | 地图执行包装器 | `MapExecutorWrapper` |
| `wrapper/cache-wrapper.ts` | 缓存执行包装器 | `CacheExecutorWrapper` |

**关键方法**:
- `AgentHarness.execute()` - 主执行方法（含所有治理检查）
- `ResourceManager.checkResourceAvailability()` - 资源检查
- `IntentValidator.validate()` - 意图验证
- `RiskScorer.scoreExecution()` - 风险评分
- `SafetyMonitor.monitorExecutionResult()` - 监控告警
- `ExecutionTracker.recordAudit()` - 审计记录

**性能指标**:
- 资源检查延迟: < 1ms
- 意图验证延迟: < 5ms
- 风险评分延迟: < 3ms
- 总 Harness 开销: < 20ms ✅

### 1. CLI 框架 (`src/cli/`)

**职责**: 命令行界面和命令解析

**文件结构**:
```
cli/
├── index.ts              # CLI 主程序入口
├── commands/
│   ├── recommend.ts      # 推荐命令实现
│   ├── history.ts        # 历史记录命令
│   └── help.ts           # 帮助信息命令
```

**关键类/函数**:
- `runCLI()`: 启动 CLI 应用
- `createCLIApp()`: 创建 Commander 程序
- `recommendCommand()`: 处理推荐命令

### 2. 对话管理器 (`src/dialogue/`)

**职责**: 多轮对话、状态管理、推荐流程核心

**核心模块**:

| 模块 | 功能 | 关键类 |
|------|------|--------|
| `manager.ts` | 对话流程管理 | `DialogueManager` |
| `flow-engine.ts` | 对话流程引擎 | `DialogueFlowEngine` |
| `state-machine.ts` | 状态转移 | `StateMachine` |
| `context.ts` | 上下文管理 | `ContextManager` |
| `session.ts` | 会话管理 | `SessionManager` |
| `parameter-extractor.ts` | 参数提取 | `ParameterExtractor` |
| `parameter-validator.ts` | 参数验证 | `ParameterValidator` |

**关键方法**:
- `DialogueManager.getRecommendations()` - 完整推荐流程（9 步）
- `DialogueFlowEngine.nextPhase()` - 状态转移

### 3. LLM 服务 (`src/llm/`)

**职责**: LLM 集成、智能推荐决策

**模块**:

| 模块 | 功能 |
|------|------|
| `client.ts` | LLM API 客户端 (OpenAI/Claude/Aliyun) |
| `engine.ts` | LLM 决策引擎 |
| `service.ts` | LLM 服务单例 |
| `mock-client.ts` | Mock 客户端（测试用） |
| `prompts.ts` | Prompt 模板 |

**核心方法**:
- `LLMEngine.shouldRecommend()` - 信息完整性检查
- `LLMEngine.generateSearchParams()` - 参数优化
- `LLMEngine.parseRecommendations()` - 结果解析

### 4. 地图服务 (`src/map/`)

**职责**: 高德 API 集成、POI 搜索、距离计算

**模块**:

| 模块 | 功能 |
|------|------|
| `client.ts` | 高德 API 客户端封装 |
| `service.ts` | 地点服务（单例模式） |

**关键方法**:
- `LocationService.searchRecommendedLocations()` - 推荐地点搜索
- `LocationService.calculateDistance()` - 距离计算（单个）
- `LocationService.calculateDistanceBatch()` - 批量距离计算
- `LocationService.getPopularLocations()` - 获取热门地点

### 5. 缓存系统 (`src/cache/`)

**职责**: 两层缓存管理、过期处理、去重

**模块**:

| 模块 | 功能 |
|------|------|
| `manager.ts` | 缓存管理器（主） |
| `expiration.ts` | 过期策略管理 |
| `deduplicator.ts` | 去重机制 |
| `index-store.ts` | 索引存储 |
| `warmer.ts` | 缓存预热 |
| `types.ts` | 类型定义 |

**缓存策略**:
- **L1**: 内存缓存（快速，进程级）
- **L2**: 磁盘缓存（持久化，跨进程）

### 6. 请求队列 (`src/queue/`)

**职责**: 并发控制、优先级管理、请求去重

**关键特性**:
- 优先级队列 (HIGH > NORMAL > LOW)
- 最大并发数控制
- 自动重试机制
- 请求去重

### 7. 性能监控 (`src/monitoring/`)

**职责**: 指标收集、性能告警、错误追踪

**模块**:

| 模块 | 功能 |
|------|------|
| `metrics-collector.ts` | 指标收集 |
| `request-logger.ts` | 请求日志 |
| `error-tracker.ts` | 错误追踪 |
| `log-aggregator.ts` | 日志聚合 |

### 8. 输出管理 (`src/output/`)

**职责**: 结果格式化、用户交互

**模块**:

| 模块 | 功能 |
|------|------|
| `manager.ts` | 输出管理器 |
| `formatter.ts` | 格式化器 |
| `interactive.ts` | 交互管理 |

### 9. 日志系统 (`src/logger/`)

**职责**: 结构化日志记录

**模块**:

| 模块 | 功能 |
|------|------|
| `logger.ts` | Winston 日志实现 |
| `config.ts` | 日志配置 |
| `context.ts` | 日志上下文 |
| `middleware.ts` | 日志中间件 |

### 10. 类型定义 (`src/types/`)

**职责**: TypeScript 类型定义

**模块**:

| 模块 | 定义的类型 |
|------|-----------|
| `common.ts` | Location, UserPreference, Recommendation 等 |
| `dialogue.ts` | DialogueState, DialogueManagerConfig |
| `llm.ts` | LLMConfig, DialogueRequest, etc |
| `map.ts` | MapSearchParams, Location 等 |
| `park.ts` | 公园相关类型 |

---

## 数据流设计

### 推荐流程数据流

```
UserPreference {
  location: "南山区"
  parkType: "both"
  maxDistance: 10
}
        │
        ├─→ 【LLMEngine.shouldRecommend()】
        │   └─→ RecommendationDecision {
        │       shouldRecommend: true
        │       searchParams: {...}
        │   }
        │
        └─→ 【LocationService.searchRecommendedLocations()】
            ├─ buildSearchKeywords()
            ├─ client.searchPOI()
            ├─ calculateDistance() (批量)
            └─→ Location[] {
                [
                  {
                    name: "梧桐山",
                    latitude: 22.5,
                    longitude: 114.0,
                    distance: 3.5,
                    tags: ["爬山", "热门"]
                  },
                  ...
                ]
            }
                    │
                    └─→ 【LLMEngine.parseRecommendations()】
                        ├─ 直接 JSON 解析
                        └─→ ParsedRecommendation {
                            locations: [
                              {
                                name: "梧桐山",
                                reason: "登山爱好者的首选",
                                relevanceScore: 0.95
                              },
                              ...
                            ],
                            explanation: "根据你的偏好..."
                        }
                                │
                                └─→ 【formatRecommendations()】
                                    ├─ 创建相关性映射
                                    ├─ 按相关性排序
                                    ├─ 截取 Top 5
                                    └─→ Recommendation[] {
                                        id: "rec-梧桐山",
                                        name: "梧桐山",
                                        reason: "登山爱好者的首选",
                                        distance: 3.5,
                                        rating: 4.8
                                    }
                                        │
                                        └─→ 【OutputManager】
                                            └─→ 美化输出 (CLI)
```

### 缓存数据流

```
推荐查询
   │
   ├─ generateCacheKey() → "rec-南山区-both-10"
   │
   ├─ checkCachedRecommendations()
   │  ├─ L1 检查 (内存 Map)
   │  │  └─ 命中? ✓
   │  │     └─ 返回
   │  │
   │  └─ L2 检查 (磁盘)
   │     └─ 命中? ✓
   │        └─ 加载到内存
   │           └─ 返回
   │
   └─ 缓存未命中
      ├─ 执行完整流程
      └─ cacheRecommendations()
         ├─ L1 写入 (内存)
         └─ L2 写入 (磁盘)
```

---

## 性能优化

### 1. 缓存优化

**两层缓存策略**:
- **L1 内存缓存**: 快速访问，进程级别
- **L2 磁盘缓存**: 持久化，跨进程

**缓存键生成**:
```typescript
cacheKey = `rec-${location}-${parkType}-${maxDistance}`
```

**过期策略**:
- 推荐结果: 24 小时
- LLM 响应: 1 小时
- POI 数据: 7 天

### 2. 并发优化

**请求队列**:
- 最大并发数: 5
- 优先级: HIGH > NORMAL > LOW
- 自动重试: 最多 2 次
- 请求去重: 防止重复查询

**并行处理**:
```
LLM 检查 (高优先级)  ┐
                   ├─→ 并行执行
高德 API 查询       ┘
```

### 3. 响应优化

- **直接 JSON 解析**: 避免额外 LLM 调用
- **流式响应**: 支持大数据流式处理
- **增量加载**: 分页查询 POI 数据

### 4. 降级策略

**三级降级方案**:
1. **降级 #1**: 使用热门景点
2. **降级 #2**: 使用缓存数据
3. **降级 #3**: 生成模拟数据

---

## 测试策略

### 现有测试

| 测试文件 | 测试套件 | 测试数 | 覆盖率 | 状态 |
|---------|---------|-------|--------|------|
| `amap.test.ts` | 高德地图功能 | 14+ | ~70% | ✅ |
| `llm.test.ts` | LLM 功能 | 12+ | ~60% | ✅ |

### 建议补充的测试 (优先级排序)

**🔴 高优先级 (立即补充)**:

1. **对话管理器集成测试** (`dialogue-manager.test.ts`)
   - DialogueManager 完整流程
   - 对话状态转移
   - 推荐流程 (getRecommendations)
   - 降级方案验证

2. **LLM 引擎单元测试** (`llm-engine.test.ts`)
   - shouldRecommend() - 各缺失字段场景
   - generateSearchParams() - 参数优化
   - parseRecommendations() - JSON 解析
   - 对话历史管理

3. **缓存系统集成测试** (`cache-integration.test.ts`)
   - CacheManager 完整流程
   - 两层缓存互动
   - 过期策略
   - 去重机制

**🟡 中优先级**:

4. **参数提取器测试** (`parameter-extractor.test.ts`)
5. **高德 API 错误处理** (`amap-error-handling.test.ts`)
6. **请求队列系统测试** (`request-queue.test.ts`)

**🟢 低优先级**:

7. **输出管理器测试** (`output-manager.test.ts`)
8. **监控系统测试** (`monitoring.test.ts`)
9. **类型验证测试** (`validator.test.ts`)

### 测试架构

```
src/__tests__/
├── unit/                          # 单元测试
│   ├── amap.test.ts              # ✅ 已有
│   ├── llm.test.ts               # ✅ 已有
│   ├── dialogue-manager.test.ts   # 🆕 推荐
│   ├── llm-engine.test.ts         # 🆕 推荐
│   ├── cache-integration.test.ts  # 🆕 推荐
│   ├── parameter-extractor.test.ts
│   ├── amap-error-handling.test.ts
│   ├── request-queue.test.ts
│   ├── output-manager.test.ts
│   └── monitoring.test.ts
│
├── integration/                   # 集成测试 (新增)
│   ├── dialogue-flow.test.ts
│   ├── recommendation-flow.test.ts
│   ├── cli-commands.test.ts
│   └── end-to-end.test.ts
│
├── mocks/                         # 测试数据和 Mock
│   ├── llm-responses.ts
│   ├── amap-responses.ts
│   └── fixtures.ts
│
└── runner.ts                      # ✅ 测试运行器
```

---

## 错误处理

### 错误分类

| 错误类型 | 来源 | 处理方式 |
|---------|------|---------|
| **API 调用失败** | LLM / 高德 | 重试 + 降级 |
| **网络超时** | 外部 API | 超时控制 + 降级 |
| **缓存错误** | 本地存储 | 清理 + 降级 |
| **参数验证失败** | 用户输入 | 提示修正 |
| **格式解析错误** | LLM 响应 | 重试 + 降级 |

### 降级链

```
完整推荐
   ↓
【失败】LLM 处理失败
   ↓
【降级 #1】高德搜索结果 (无 LLM 排序)
   ↓
【失败】高德 API 失败或无结果
   ↓
【降级 #2】热门景点 + 模拟数据
   ↓
【失败】所有源都失败
   ↓
【降级 #3】纯模拟数据
```

### 错误日志示例

```
错误: [LLM 引擎] 对话处理失败
字段:
  - sessionId: "abc-123"
  - phase: "COLLECTING_LOCATION"
  - error: "API 频率限制"
  - errorType: "AmapError"
  - stack: "... 堆栈信息 ..."

-> 触发降级处理
-> 返回热门景点
-> 标记为 warning
```

---

## 扩展指南

### 添加新的 LLM 提供商

1. 创建新客户端: `src/llm/client-{provider}.ts`
2. 实现 `ILLMClient` 接口
3. 在 `LLMService.initialize()` 中添加条件
4. 更新 `env.ts` 配置

### 添加新的地图提供商

1. 创建新客户端: `src/map/client-{provider}.ts`
2. 实现地点搜索接口
3. 在 `LocationService` 中集成
4. 更新类型定义

### 添加新的缓存后端

1. 创建适配器: `src/cache/adapters/{backend}.ts`
2. 实现 `ICacheAdapter` 接口
3. 在 `CacheManager` 中支持配置
4. 编写集成测试

### 性能监控扩展

1. 添加新的指标类型: `src/monitoring/types.ts`
2. 实现收集逻辑: `MetricsCollector`
3. 配置告警规则
4. 集成到 Dashboard (可选)

---

## 质量指标

### 当前状态

| 指标 | 值 | 评级 |
|------|-----|------|
| 代码行数 | ~8000+ (含 Harness 框架) | ✅ |
| 测试覆盖率 | ~20% | ⚠️ |
| 模块数 | 56+ (含治理框架) | ✅ |
| 关键路径 | 13 步 (含 4 个 Harness 阶段) | ✅ |
| 文档完整度 | 85% | ✅ |
| Harness 开销 | < 20ms | ✅ |
| 安全约束 | 完整 | ✅ |

### Harness Agent 特定指标

| 指标 | 值 | 说明 |
|------|-----|------|
| **资源检查延迟** | < 1ms | API/Token/并发检查 |
| **意图验证延迟** | < 5ms | 安全验证、权限检查 |
| **风险评分延迟** | < 3ms | 四维度风险评分 |
| **监控告警延迟** | < 2ms | 事件记录、审计 |
| **总 Harness 开销** | < 20ms | 全流程治理 |
| **工具白名单** | 4 个 | llm-client, amap-client 等 |
| **并发控制** | 5 个 | 最大并发任务数 |
| **API 限制** | 60/分钟 | 滑动时间窗口 |

### 改进目标

| 指标 | 目标 | 优先级 |
|------|------|--------|
| 测试覆盖率 | 80% | 🔴 |
| Harness 单元测试 | 100% | 🔴 |
| 文档完整度 | 100% | 🟡 |
| 性能 P99 延迟 | <2s | 🟡 |
| 可用性 | >99% | 🟢 |
| 告警系统覆盖 | 100% | 🟡 |

---

## 参考资源

- **快速开始**: 参考 `README.md`
- **测试指南**: 参考 `docs/guides/HOW-TO-RUN-TESTS.md`
- **API 文档**: 参考代码注释和类型定义
- **故障排除**: 参考 `README.md#故障排除`

---

**最后更新**: 2026-03-29  
**维护者**: Park Recommender Team  
**版本**: 2.0.0 (Harness Agent 架构版本)
