---
name: park-recommender-harness-architecture
overview: 按照 harness agent 架构重构公园推荐系统，通过添加约束管理、资源控制、安全监控和执行沙箱等层，保护核心业务逻辑（LLM 调用、高德地图查询、LLM 解析）不动。
todos:
  - id: harness-types-define
    content: 定义 Harness 架构的核心类型和接口：约束定义、执行上下文、风险评分、资源限制等，建立统一的类型基础
    status: completed
  - id: constraint-config-system
    content: 实现约束定义和配置加载模块：工具白名单、资源限制、行为约束的定义和默认配置
    status: completed
    dependencies:
      - harness-types-define
  - id: execution-sandbox
    content: 构建执行沙箱层：工具注册表、执行器、超时控制、前置/后置验证，包装所有外部 API 调用
    status: completed
    dependencies:
      - constraint-config-system
  - id: resource-management
    content: 实现资源管理模块：API 频率限制、Token 追踪、并发控制、成本计算
    status: completed
    dependencies:
      - harness-types-define
  - id: intent-validation
    content: 实现意图验证和风险评分：用户输入检查、权限检查、行为分类、风险评分
    status: completed
    dependencies:
      - harness-types-define
  - id: monitoring-audit
    content: 实现监控和审计模块：实时行为监控、异常检测、执行链追踪、审计日志
    status: completed
    dependencies:
      - harness-types-define
  - id: harness-agent-main
    content: 实现 AgentHarness 主类：协调各模块、组织执行流程、提供统一的 API
    status: completed
    dependencies:
      - execution-sandbox
      - resource-management
      - intent-validation
      - monitoring-audit
  - id: integration-wrappers
    content: 创建 LLM、地图、缓存的执行包装器：集成现有服务与 Harness 层
    status: completed
    dependencies:
      - harness-agent-main
  - id: cli-recommend-integration
    content: 改造 CLI recommend 命令：集成 AgentHarness，通过 Harness 执行推荐流程
    status: completed
    dependencies:
      - harness-agent-main
      - integration-wrappers
  - id: dialogue-manager-integration
    content: 改造对话管理器：在关键方法中使用 Harness 执行外部 API 调用
    status: completed
    dependencies:
      - harness-agent-main
      - integration-wrappers
  - id: service-layer-exposure
    content: 为 LLM 和地图服务提供 Harness 可调用的底层接口：保护现有 API，新增内部调用接口
    status: completed
    dependencies:
      - harness-agent-main
  - id: unit-tests
    content: 编写 Harness 各模块的单元测试：约束管理、资源限制、风险评分、监控告警等
    status: completed
    dependencies:
      - cli-recommend-integration
      - dialogue-manager-integration
  - id: integration-tests
    content: 编写集成测试：验证 Harness 与现有流程的协作、超限告警、降级策略等
    status: completed
    dependencies:
      - unit-tests
  - id: documentation
    content: 编写 Harness 架构文档和使用指南：约束配置说明、执行流程图、监控告警说明
    status: completed
    dependencies:
      - harness-agent-main
---

## 产品概览

按照 harness agent 架构模式改造公园推荐 CLI Agent，在保持核心业务逻辑不变的前提下，增加安全约束、资源管理、风险控制和监管层。核心逻辑（LLM 调用、高德地图查询、结果解析）保持原样，新增的 harness 层用于管理执行过程、资源限制、风险评估和行为监控。

## 核心特性

- **约束管理系统**：定义工具白名单、执行权限、资源限制、超时控制
- **执行沙箱层**：包装所有外部 API 调用，实现统一的前置/后置验证和超时管理
- **资源管理器**：API 频率限制、Token 用量追踪、并发控制、成本管理
- **意图验证层**：用户输入安全审查、权限检查、行为分类和风险评分
- **安全监控器**：实时行为监控、异常检测、资源超限告警、执行中断机制
- **审计日志系统**：完整的执行链追踪、决策记录、合规性审计
- **优雅降级机制**：超限时的限流策略、缓存回退、降级推荐

## 技术栈选择

基于现有项目技术栈（TypeScript + Node.js），Harness Agent 架构改造采用以下技术方案：

- **语言/运行时**：TypeScript + Node.js（现有）
- **框架/库**：无额外依赖，充分利用现有的 cache、queue、monitoring 模块
- **设计模式**：装饰器模式（包装执行）、策略模式（约束管理）、观察者模式（监控）、中间件模式（请求拦截）

## 实现方案

### 整体架构

Harness Agent 改造遵循分层设计，从上到下：

1. **输入层**：CLI 命令接收 → 输入验证 → 意图识别 → 权限检查
2. **约束层**：约束定义加载 → 约束验证 → 资源可用性检查
3. **执行沙箱层**：工具白名单验证 → 执行前检查 → 超时控制 → 执行后验证
4. **资源管理层**：API 频率追踪 → Token 用量管理 → 并发控制 → 成本计算
5. **监控层**：行为监控 → 异常检测 → 告警 → 可选中断
6. **输出层**：结果验证 → 数据脱敏 → 格式化 → 审计日志

核心逻辑（LLM 调用、地图查询、解析）位于沙箱内，不需修改实现代码。

### 关键技术决策

#### 1. 约束定义的外部化

将 Harness 约束配置分离到独立的配置文件（`src/harness/config/constraints.ts`），支持动态加载和运行时修改，避免硬编码。

#### 2. 执行器的装饰模式

所有外部服务调用（LLM、地图）通过 ExecutionHarness 包装，拦截请求/响应，统一处理超时、限流、日志。

#### 3. 资源管理的多维度追踪

- **API 层级**：按服务（llm-client、amap-client）追踪调用次数和时间戳
- **Token 层级**：追踪 LLM Token 消耗，按 session 和全局维度
- **并发层级**：使用 semaphore 控制并发数，避免资源耗尽

#### 4. 意图验证的轻量化

意图识别复用现有的 DialoguePhase 和 UserPreference，增加风险评分维度，不需复杂 NLP。

#### 5. 监控的非阻塞设计

监控流程独立于执行流程，使用观察者模式，不阻塞主路径，允许异步告警和日志聚合。

### 性能与可靠性

- **性能**：Harness 层引入的开销受控（验证 < 10ms，监控异步处理）；复用现有的缓存和队列，避免冗余
- **可靠性**：多层验证防止错误传播；资源限制防止级联故障；审计日志支持问题追溯和恢复
- **向后兼容**：Harness 层是包装层，不修改核心服务接口，现有代码可平滑迁移

## 实现细节

### 新建文件清单

#### 核心 Harness 框架（`src/harness/`）

1. **约束定义模块**

- `src/harness/types/constraints.ts`：约束接口定义（工具、资源、行为约束）
- `src/harness/config/constraints.ts`：默认约束配置和加载器

2. **执行沙箱模块**

- `src/harness/execution/executor.ts`：核心执行器，处理超时、验证、日志
- `src/harness/execution/tool-registry.ts`：工具注册表和白名单管理
- `src/harness/execution/pre-checks.ts`：执行前验证逻辑
- `src/harness/execution/post-checks.ts`：执行后验证逻辑

3. **资源管理模块**

- `src/harness/resource/resource-manager.ts`：统一资源管理器（频率、Token、并发）
- `src/harness/resource/rate-limiter.ts`：速率限制实现
- `src/harness/resource/token-tracker.ts`：Token 用量追踪
- `src/harness/resource/concurrency-controller.ts`：并发控制

4. **意图和权限模块**

- `src/harness/validation/intent-validator.ts`：用户意图验证和权限检查
- `src/harness/validation/risk-scorer.ts`：执行风险评分

5. **监控和告警模块**

- `src/harness/monitoring/safety-monitor.ts`：实时行为监控和异常检测
- `src/harness/monitoring/execution-tracker.ts`：执行链追踪和审计日志

6. **主控制器**

- `src/harness/agent-harness.ts`：Harness Agent 主类，协调各模块

#### 类型定义扩展（`src/types/`）

- `src/types/harness.ts`：Harness 相关的类型定义（执行上下文、结果、约束等）

#### 集成模块（`src/harness/integration/`）

- `src/harness/integration/llm-executor-wrapper.ts`：LLM 执行包装器
- `src/harness/integration/map-executor-wrapper.ts`：地图执行包装器
- `src/harness/integration/cache-executor-wrapper.ts`：缓存执行包装器

### 改造现有文件

#### `src/cli/commands/recommend.ts`

- 改造：在调用 LLM Service 和地图服务前，创建 AgentHarness 实例并通过它来执行
- 不改变：命令解析、参数提取、结果展示逻辑

#### `src/dialogue/manager.ts`

- 改造：在 `getRecommendations()` 等关键方法中，使用 Harness 执行外部 API 调用
- 不改变：对话流程、状态机、上下文管理

#### `src/llm/service.ts`

- 改造：提供 Harness 可以调用的底层方法接口（不改变现有的 public 方法）
- 不改变：初始化、LLMEngine、LLMClient 的实现

#### `src/map/service.ts`

- 改造：提供 Harness 可以调用的底层方法接口（不改变现有的 public 方法）
- 不改变：POI 搜索、距离计算、地理编码的实现

### 依赖关系梳理

- Harness 层依赖现有的：logger、cache、queue、monitoring 模块
- 现有模块不依赖 Harness 层（单向依赖）
- CLI 和 Dialogue Manager 可选地使用 Harness（通过配置开关）

## 推荐使用的 Agent 扩展

### SubAgent: code-explorer

- **用途**：在改造过程中，快速定位改造点、验证依赖关系、检查现有代码是否符合改造要求
- **预期成果**：精确定位需要改造的文件位置、确认核心逻辑保护完整性、发现潜在的集成问题

### MCP: gongfengStreamable

- **用途**：如果最终需要将改造计划提交到代码仓库，可使用此 MCP 创建分支、提交 MR、管理代码审查
- **预期成果**：改造代码规范化管理、完整的提交历史和审核流程