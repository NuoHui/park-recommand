# Harness Agent 架构详细设计

## 目录
1. [架构概览](#架构概览)
2. [核心组件](#核心组件)
3. [执行流程](#执行流程)
4. [约束管理](#约束管理)
5. [资源管理](#资源管理)
6. [监控审计](#监控审计)
7. [集成模式](#集成模式)
8. [性能指标](#性能指标)

---

## 架构概览

### 分层设计

```
┌─────────────────────────────────────────┐
│         用户接口层（CLI/API）           │
├─────────────────────────────────────────┤
│     Harness Agent 层（协调控制）        │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐    │
│  │  约束 │ 验证 │ 资源 │ 监控 │   │    │
│  │  管理 │ 层  │ 管理 │ 审计 │   │    │
│  └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│      执行沙箱层（工具隔离）              │
│  ┌──────────────────────────────────┐   │
│  │ 工具注册表 │ 前置检查 │ 后置检查 │   │
│  └──────────────────────────────────┘   │
├─────────────────────────────────────────┤
│   现有服务层（LLM、地图、缓存）          │
├─────────────────────────────────────────┤
│       外部服务（API、数据库）           │
└─────────────────────────────────────────┘
```

### 核心原则

- **最小权限**: 工具白名单机制，显式授权
- **多层验证**: 输入→意图→权限→资源→执行→输出
- **资源隔离**: Token 预算、API 频率、并发控制
- **可观测性**: 完整的审计日志、实时监控、告警系统
- **向后兼容**: 不修改现有 API，通过包装层集成

---

## 核心组件

### 1. 约束管理系统 (Constraint Management)

**职责**: 定义和维护执行约束

**主要类**:
- `ConstraintConfigLoader`: 约束配置加载器
- `ToolRegistry`: 工具注册表和白名单管理

**约束类型**:

```
┌─ ToolConstraints
│  ├─ allowedTools: string[]           // 工具白名单
│  ├─ blockedTools: string[]           // 工具黑名单
│  ├─ toolTimeouts: Record<>           // 超时配置
│  └─ checkFunctions: Record<>         // 前后检查函数
│
├─ ResourceConstraints
│  ├─ maxAPICallsPerMinute: number     // API 频率
│  ├─ maxTokensPerRequest: number      // 单次 Token 限制
│  ├─ maxTokensPerSession: number      // 会话 Token 限制
│  ├─ globalTokenBudget: number        // 全局预算
│  ├─ maxConcurrentTasks: number       // 并发限制
│  └─ maxRetries: number               // 重试限制
│
└─ BehaviorConstraints
   ├─ allowedActions: string[]         // 允许的操作
   ├─ requiredApprovals: string[]      // 需要审批的操作
   ├─ riskThreshold: number            // 风险阈值 (0-100)
   ├─ allowChainedCalls: boolean       // 允许级联调用
   └─ maxCallDepth: number             // 最大调用深度
```

### 2. 执行沙箱层 (Execution Sandbox)

**职责**: 隔离和控制工具执行

**主要类**:
- `ExecutionHarness`: 核心执行器
- `PreCheckExecutor`: 前置检查
- `PostCheckExecutor`: 后置检查

**执行流程**:
```
Input
  ↓
Tool Registry Check (工具是否被允许？)
  ↓
Pre-Check (参数有效？大小限制？调用深度？)
  ↓
Tool Execution (执行 + 超时控制)
  ↓
Post-Check (结果有效？数据脱敏？)
  ↓
Output
```

### 3. 资源管理系统 (Resource Management)

**职责**: 追踪和控制资源使用

**主要类**:
- `ResourceManager`: 统一资源管理器
- `RateLimiter`: API 频率限制
- `TokenTracker`: Token 用量追踪
- `ConcurrencyController`: 并发控制

**资源流程**:
```
Execute Request
  ├─→ Rate Limit Check (API 调用频率)
  ├─→ Token Budget Check (Token 预算)
  ├─→ Concurrency Check (并发限制)
  └─→ Execute / Queue
```

### 4. 验证和风险系统 (Validation & Risk)

**职责**: 验证用户意图和评估风险

**主要类**:
- `IntentValidator`: 意图验证
- `RiskScorer`: 风险评分

**风险评分维度**:
```
Risk Factors:
  ├─ Tool Type (工具类型) [0-30]
  │  ├─ Cache: 5
  │  ├─ Map: 10
  │  ├─ LLM: 15
  │  └─ Other: 10
  │
  ├─ Parameters (参数) [0-30]
  │  ├─ Size > 100KB: 10
  │  ├─ Delete Operation: 30
  │  └─ Modify Operation: 20
  │
  ├─ Call Depth (调用深度) [0-15]
  │  ├─ Depth > 3: 15
  │  ├─ Depth > 2: 10
  │  └─ Normal: 0
  │
  └─ History (历史) [0-25]
     ├─ Failed Calls: +5 per
     ├─ Timeouts: +5 per
     └─ Anomalies: +10 per

Risk Level:
  ├─ Low: 0-24
  ├─ Medium: 25-49
  ├─ High: 50-74
  └─ Critical: 75-100
```

### 5. 监控和审计系统 (Monitoring & Audit)

**职责**: 实时监控和完整审计

**主要类**:
- `SafetyMonitor`: 安全监控
- `ExecutionTracker`: 执行链追踪

**告警类型**:
```
┌─ Level
│  ├─ info
│  ├─ warning
│  ├─ error
│  └─ critical
│
└─ Type
   ├─ rate_limit      (API 频率超限)
   ├─ token_budget    (Token 预算超限)
   ├─ timeout         (执行超时)
   ├─ anomaly         (异常检测)
   └─ resource_exhaustion (资源耗尽)
```

**审计日志**:
```
AuditLogEntry {
  logId: string
  sessionId: string
  executionId: string
  actionType: 'tool_call' | 'validation' | 'decision' | 'approval'
  actionName: string
  actor: string
  timestamp: number
  result: 'success' | 'failure' | 'pending_approval' | 'rejected'
  details: Record<>
}
```

---

## 执行流程

### 标准执行流程

```
1. 用户发起请求
   ↓
2. AgentHarness.execute()
   ├─→ ResourceManager.checkResourceAvailability()
   │   ├─ 检查 API 频率
   │   ├─ 检查 Token 预算
   │   └─ 检查并发限制
   │
   ├─→ IntentValidator.validate()
   │   ├─ 检查输入安全性
   │   ├─ 分类意图
   │   ├─ 检查权限
   │   └─ 评估风险
   │
   ├─→ ResourceManager.executeControlledTask()
   │   └─→ ExecutionHarness.execute()
   │       ├─→ PreCheckExecutor.executeChecks()
   │       ├─→ ToolRegistry.getExecutor()
   │       ├─→ Execute Tool (with timeout)
   │       └─→ PostCheckExecutor.executeChecks()
   │
   ├─→ SafetyMonitor.monitorExecutionResult()
   ├─→ ExecutionTracker.recordAudit()
   └─→ Return ExecutionResult

3. 返回结果给用户
```

### 异常处理流程

```
Exception Occurred
   ↓
+-─────────────────────────────────────────┐
│  Check Exception Type                   │
├─────────────────────────────────────────┤
│ ├─ Resource Exhausted                  │
│ │  └─→ Trigger Degradation Strategy    │
│ │                                       │
│ ├─ Validation Failed                   │
│ │  └─→ Reject Request + Record Audit   │
│ │                                       │
│ ├─ Timeout                             │
│ │  └─→ Retry (if maxRetries > 0)      │
│ │      or Fail                         │
│ │                                       │
│ ├─ Tool Error                          │
│ │  └─→ Raise Alert + Record Trace     │
│ │                                       │
│ └─ Other                               │
│    └─→ Log Error + Return Failure      │
└─────────────────────────────────────────┘
   ↓
Return ExecutionResult (success: false)
```

---

## 约束管理

### 默认约束配置

```typescript
DEFAULT_TOOL_CONSTRAINTS = {
  allowedTools: ['llm-client', 'amap-client', 'cache-manager', 'request-queue'],
  blockedTools: [],
  toolTimeouts: {
    'llm-client': 30000,      // 30 秒
    'amap-client': 5000,       // 5 秒
    'cache-manager': 1000,     // 1 秒
    'request-queue': 60000,    // 60 秒
  }
}

DEFAULT_RESOURCE_CONSTRAINTS = {
  maxAPICallsPerMinute: 60,
  maxTokensPerRequest: 4000,
  maxTokensPerSession: 32000,
  globalTokenBudget: 100000,
  maxConcurrentTasks: 5,
  maxRetries: 2,
}

DEFAULT_BEHAVIOR_CONSTRAINTS = {
  allowedActions: ['search', 'recommend', 'query', 'cache'],
  requiredApprovals: [],
  riskThreshold: 60,
  allowChainedCalls: true,
  maxCallDepth: 3,
}
```

### 运行时修改约束

```typescript
const configLoader = getConstraintConfigLoader();

// 修改工具超时
configLoader.setToolTimeout('llm-client', 45000);

// 修改 API 频率限制
configLoader.setMaxAPICallsPerMinute(100);

// 修改 Token 限制
configLoader.setTokenLimits(8000, 64000, 200000);

// 修改并发限制
configLoader.setMaxConcurrentTasks(10);

// 允许/阻止工具
configLoader.allowTool('new-tool');
configLoader.blockTool('dangerous-tool');

// 验证配置
const validation = configLoader.validate();
if (!validation.valid) {
  console.error('配置错误:', validation.errors);
}
```

---

## 资源管理

### API 频率限制

采用**滑动时间窗口** (Sliding Window) 算法:

```
时间窗口: 60 秒
最大请求: 60 次

时间轴:
|————————————— 60 秒 ——————————————|
  ↑ 请求 1    ↑ 请求 30   ↑ 请求 60
  |——————————|——————————|
  已清理      仍在窗口内   新请求
```

### Token 使用追踪

多维度追踪:

```
Global Token Budget
├─ Session 1: 0 / 32000
├─ Session 2: 10000 / 32000
├─ Session 3: 5000 / 32000
└─ Total: 15000 / 100000
```

### 并发控制

采用**信号量** (Semaphore) 模式:

```
Max Concurrent: 5

Active Tasks: 3 (可以接受 2 个新请求)

New Request
   ├─→ If active < max: 立即执行
   └─→ If active >= max: 加入等待队列

Task Completes
   └─→ 从队列取出待处理任务
```

---

## 监控审计

### 实时告警系统

```
Alert Flow:
  Condition Detected
       ↓
   Create Alert
       ↓
   Add to Alert Queue
       ↓
   ├─→ Trigger Callbacks
   ├─→ Log Alert
   └─→ Store in Memory
```

### 审计日志导出

```typescript
// 导出为 JSON
const json = tracker.exportAsJSON({
  sessionId: 'xxx',
  actionType: 'tool_call',
  result: 'success'
});

// 导出为 CSV
const csv = tracker.exportAsCSV({
  timeRange: {
    start: Date.now() - 86400000,  // 最近 24 小时
    end: Date.now()
  }
});

// 生成报告
const report = tracker.generateReport(sessionId);
```

---

## 集成模式

### 模式 1: 包装现有服务

```typescript
const harness = initializeHarness();
const llmWrapper = new LLMExecutorWrapper(harness);

llmWrapper.registerLLMTool('llm-client', async (args) => {
  return getLLMService().callLLM(args);
});

// 使用时
const result = await llmWrapper.executeLLMCall('llm-client', args);
```

### 模式 2: 直接通过 Harness 执行

```typescript
const harness = initializeHarness();

const result = await harness.execute('llm-client', args, {
  enableValidation: true,
  enableMonitoring: true,
  skipApproval: false,
});
```

### 模式 3: 在服务方法中使用

```typescript
// src/dialogue/manager.ts
async getRecommendations() {
  const harness = getGlobalHarness();
  
  const result = await harness.execute('llm-recommendation', {
    preferences: this.state.userPreference
  });
  
  return result.data;
}
```

---

## 性能指标

### 延迟

- 资源检查: < 1ms
- 意图验证: < 5ms
- 前置检查: < 2ms
- 工具执行: 由工具决定
- 后置检查: < 3ms
- 监控记录: 异步 (< 1ms)
- 审计记录: 异步 (< 1ms)

**总开销**: < 20ms (异步部分不计入)

### 内存

- 工具注册表: ~10KB
- 资源管理器: ~50KB
- 监控系统: ~100KB (随日志增长)
- 审计日志: ~1-5MB (取决于日志量)

**总计**: ~150KB - 5MB

### 吞吐量

- 并发处理: 5 个任务 (可配置)
- API 频率: 60 次/分钟
- Token 吞吐: 按预算限制

---

## 最佳实践

1. **初始化一次**: 应用启动时初始化 Harness，复用全局实例
2. **合理设置约束**: 根据实际情况调整约束参数
3. **监听告警**: 注册告警回调，及时发现问题
4. **定期清理日志**: 防止日志无限增长
5. **性能监控**: 定期查看统计信息，优化配置

---

## 相关文档

- [集成指南](./HARNESS_INTEGRATION_GUIDE.md)
- [约束配置](./HARNESS_CONSTRAINTS.md)
- [监控告警](./HARNESS_MONITORING.md)
- [服务层暴露](./SERVICE_LAYER_HARNESS_EXPOSURE.md)
