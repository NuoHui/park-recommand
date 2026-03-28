# Harness Agent 快速参考指南

## 文件清单

### 核心 Harness 模块

```
src/harness/
├── agent-harness.ts                    # 主类：AgentHarness
├── config/
│   └── constraints.ts                  # 约束配置加载器
├── execution/
│   ├── executor.ts                     # 核心执行器
│   ├── tool-registry.ts                # 工具注册表
│   ├── pre-checks.ts                   # 前置检查
│   └── post-checks.ts                  # 后置检查
├── resource/
│   ├── resource-manager.ts             # 统一资源管理器
│   ├── rate-limiter.ts                 # API 频率限制
│   ├── token-tracker.ts                # Token 追踪
│   └── concurrency-controller.ts       # 并发控制
├── validation/
│   ├── intent-validator.ts             # 意图验证器
│   └── risk-scorer.ts                  # 风险评分器
├── monitoring/
│   ├── safety-monitor.ts               # 安全监控器
│   └── execution-tracker.ts            # 执行追踪器
├── integration/
│   ├── llm-executor-wrapper.ts         # LLM 包装器
│   ├── map-executor-wrapper.ts         # 地图包装器
│   └── cache-executor-wrapper.ts       # 缓存包装器
└── index.ts                            # 统一导出

types/
└── harness.ts                          # 类型定义

docs/
├── HARNESS_ARCHITECTURE.md             # 架构文档
├── HARNESS_INTEGRATION_GUIDE.md        # 集成指南
├── SERVICE_LAYER_HARNESS_EXPOSURE.md  # 服务层暴露指南
└── HARNESS_QUICK_REFERENCE.md          # 本文件
```

## 核心 API 速查

### 1. 初始化

```typescript
import { getGlobalHarness, createHarness, initializeHarness } from '@/harness';

// 获取全局 Harness 实例
const harness = getGlobalHarness();

// 或创建新实例
const harness = createHarness();

// 或快速初始化
const harness = initializeHarness();
```

### 2. 执行工具

```typescript
const result = await harness.execute(
  'llm-client',           // 工具名
  { param: 'value' },    // 工具参数
  {
    enablePreCheck: true,
    enablePostCheck: true,
    enableValidation: true,
    enableMonitoring: true,
    enableAudit: true,
    skipApproval: false,
    maxRetries: 2,
  }
);

if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

### 3. 注册工具

```typescript
import { ToolMetadata } from '@/harness';

const toolMetadata: ToolMetadata = {
  name: 'my-tool',
  description: '工具描述',
  category: 'llm',
  isSafe: true,
  executor: async (args) => {
    // 工具实现
    return result;
  },
  version: '1.0.0',
};

harness.registerTool(toolMetadata);

// 或批量注册
harness.registerTools([metadata1, metadata2]);
```

### 4. 资源管理

```typescript
const resourceManager = harness.getResourceManager();

// 检查资源可用性
const availability = resourceManager.checkResourceAvailability(
  sessionId,
  'llm-client',
  4000  // 预计 token 数
);

if (availability.canProceed) {
  // 执行
}

// 获取统计信息
const stats = resourceManager.getStats();
console.log(stats.tokenTracker);
console.log(stats.concurrency);
```

### 5. 意图验证

```typescript
const intentValidator = harness.getIntentValidator();

const validationResult = await intentValidator.validate(
  context,      // ExecutionContext
  'llm-client'  // 工具名
);

console.log(validationResult.valid);
console.log(validationResult.riskScore);
```

### 6. 监控

```typescript
const safetyMonitor = harness.getSafetyMonitor();

// 注册告警回调
safetyMonitor.onAlert((alert) => {
  console.warn(`[${alert.level}] ${alert.message}`);
});

// 获取告警
const alerts = safetyMonitor.getAllAlerts();
const criticalAlerts = safetyMonitor.getAlertsByLevel('critical');

// 生成报告
const report = safetyMonitor.generateReport();
```

### 7. 审计

```typescript
const tracker = harness.getExecutionTracker();

// 获取会话审计日志
const logs = tracker.getSessionAuditLogs(sessionId);

// 搜索审计日志
const failedLogs = tracker.searchAuditLogs({
  result: 'failure'
});

// 导出数据
const json = tracker.exportAsJSON();
const csv = tracker.exportAsCSV();

// 生成报告
const report = tracker.generateReport(sessionId);
```

### 8. LLM 包装器

```typescript
import { LLMExecutorWrapper } from '@/harness';

const llmWrapper = new LLMExecutorWrapper(harness);

// 注册 LLM 工具
llmWrapper.registerLLMTool('llm-client', async (args) => {
  return await llmService.callLLM(args);
});

// 执行 LLM 调用
const result = await llmWrapper.executeLLMCall('llm-client', args);

// 获取 Token 使用情况
const tokenUsage = llmWrapper.getLLMTokenUsage();
```

### 9. 地图包装器

```typescript
import { MapExecutorWrapper } from '@/harness';

const mapWrapper = new MapExecutorWrapper(harness);

// 注册地图工具
mapWrapper.registerMapTool('amap-client', async (args) => {
  return await mapService.searchLocations(args);
});

// 执行地图查询
const result = await mapWrapper.executeMapQuery('amap-client', args);

// 批量查询
const results = await mapWrapper.batchMapQueries('amap-client', queryList);
```

### 10. 缓存包装器

```typescript
import { CacheExecutorWrapper } from '@/harness';

const cacheWrapper = new CacheExecutorWrapper(harness);

// 缓存读取
const value = await cacheWrapper.getCached('key', async () => {
  return await fetchData();
});

// 清除缓存
await cacheWrapper.clearCache('key');

// 批量清除
await cacheWrapper.clearMultipleCache(['key1', 'key2']);
```

## 配置快速参考

### 约束配置

```typescript
import { getConstraintConfigLoader } from '@/harness';

const configLoader = getConstraintConfigLoader();

// 工具约束
configLoader.allowTool('my-tool');
configLoader.blockTool('dangerous-tool');
configLoader.setToolTimeout('llm-client', 45000);

// 资源约束
configLoader.setMaxAPICallsPerMinute(100);
configLoader.setTokenLimits(8000, 64000, 200000);
configLoader.setMaxConcurrentTasks(10);

// 验证配置
const validation = configLoader.validate();
```

## 常用模式

### 模式 1: 简单包装

```typescript
const harness = initializeHarness();
const result = await harness.execute('llm-client', args);
```

### 模式 2: 完整监管

```typescript
const harness = createHarness();

// 注册所有工具
setupAllTools(harness);

// 执行和监控
const result = await harness.execute('llm-client', args, {
  enableValidation: true,
  enableMonitoring: true,
  enableAudit: true,
  skipApproval: false,
});

// 查看统计
console.log(harness.getStats());

// 生成报告
console.log(harness.generateReport());
```

### 模式 3: 渐进式集成

```typescript
// 第一步：只在关键操作使用 Harness
const harness = initializeHarness();

// 第二步：逐步添加工具
setupLLMTools(harness);
setupMapTools(harness);

// 第三步：在现有代码中混合使用
if (isHighRiskOperation) {
  result = await harness.execute(toolName, args);
} else {
  result = await directExecute(toolName, args);
}

// 第四步：完全迁移
```

## 关键特性

| 特性 | 描述 | 文件 |
|------|------|------|
| **约束管理** | 工具白名单、资源限制、行为约束 | `config/constraints.ts` |
| **执行沙箱** | 前置/后置检查、超时控制 | `execution/` |
| **资源管理** | API 频率、Token、并发 | `resource/` |
| **意图验证** | 输入检查、权限检查、风险评分 | `validation/` |
| **监控告警** | 实时告警、异常检测 | `monitoring/safety-monitor.ts` |
| **审计日志** | 完整的执行链追踪 | `monitoring/execution-tracker.ts` |

## 故障排查速查表

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 工具执行被拒绝 | 不在白名单、资源不足、权限不够 | 检查约束配置 |
| Token 预算超限 | 使用超过限制 | 增加预算或调整约束 |
| API 频率超限 | 调用过频繁 | 检查频率限制或优化调用 |
| 执行超时 | 工具耗时过长 | 增加超时时间 |
| 并发限制 | 并发任务过多 | 等待或增加并发数 |
| 告警过多 | 阈值设置过低 | 调整告警阈值 |

## 环境变量

支持通过环境变量覆盖默认配置:

```bash
# API 频率限制
HARNESS_MAX_API_CALLS_PER_MINUTE=100

# Token 限制
HARNESS_MAX_TOKENS_PER_REQUEST=8000

# 并发限制
HARNESS_MAX_CONCURRENT_TASKS=10
```

## 性能指标

- **延迟开销**: < 20ms (异步部分不计)
- **内存占用**: 150KB - 5MB
- **吞吐量**: 60 API 调用/分钟
- **并发处理**: 5 个任务

## 下一步

1. 阅读 [集成指南](./HARNESS_INTEGRATION_GUIDE.md)
2. 查看 [架构详解](./HARNESS_ARCHITECTURE.md)
3. 学习 [服务层暴露](./SERVICE_LAYER_HARNESS_EXPOSURE.md)
4. 开始集成到你的代码中

## 支持

- 查阅完整文档: `docs/HARNESS_*.md`
- 查看示例代码: `src/harness/integration/`
- 查看类型定义: `src/types/harness.ts`
