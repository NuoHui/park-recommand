# Harness Agent 架构集成指南

## 概述

Harness Agent 架构已集成到公园推荐系统中。本指南说明如何在现有的 CLI 命令和对话管理器中使用 Harness 层。

## 快速开始

### 1. 导入和初始化

```typescript
import { initializeHarness, createHarnessWithWrappers } from '@/harness';

// 方式一：简单初始化
const harness = initializeHarness();

// 方式二：创建带包装器的 Harness
const { harness, llm, map, cache } = createHarnessWithWrappers();
```

### 2. 注册工具

```typescript
import { LLMExecutorWrapper, MapExecutorWrapper } from '@/harness';
import { getLLMService } from '@/llm/service';
import { getLocationService } from '@/map/service';

const harness = initializeHarness();
const llmWrapper = new LLMExecutorWrapper(harness);
const mapWrapper = new MapExecutorWrapper(harness);

// 获取现有的服务实例
const llmService = getLLMService();
const mapService = getLocationService();

// 注册 LLM 工具
llmWrapper.registerLLMTool('llm-client', async (args) => {
  // 调用现有的 LLM 服务
  return llmService.callLLM(args);
});

// 注册地图工具
mapWrapper.registerMapTool('amap-client', async (args) => {
  // 调用现有的地图服务
  return mapService.searchRecommendedLocations(args);
});
```

### 3. 在 CLI 命令中使用 Harness

#### 改造前（原始代码）

```typescript
// src/cli/commands/recommend.ts
async function newRecommendFlow() {
  const llmService = getLLMService();
  const locationService = getLocationService();
  
  // 直接调用服务
  const recommendations = await llmService.callLLM(params);
  const locations = await locationService.searchRecommendedLocations(searchParams);
}
```

#### 改造后（使用 Harness）

```typescript
import { initializeHarness, LLMExecutorWrapper, MapExecutorWrapper } from '@/harness';

async function newRecommendFlow() {
  const harness = initializeHarness();
  const llmWrapper = new LLMExecutorWrapper(harness);
  const mapWrapper = new MapExecutorWrapper(harness);
  
  // 注册工具
  llmWrapper.registerLLMTool('llm-client', async (args) => {
    return getLLMService().callLLM(args);
  });
  
  mapWrapper.registerMapTool('amap-client', async (args) => {
    return getLocationService().searchRecommendedLocations(args);
  });
  
  // 通过 Harness 执行调用（自动进行约束检查、资源管理、监控等）
  try {
    const recommendations = await llmWrapper.executeLLMCall(
      'llm-client', 
      params, 
      false // skipApproval
    );
    
    const locations = await mapWrapper.executeMapQuery(
      'amap-client',
      searchParams,
      true // skipApproval（地图查询通常不需要审批）
    );
  } catch (error) {
    console.error('Harness 执行失败:', error);
  }
}
```

### 4. 在对话管理器中使用 Harness

#### 改造现有的 DialogueManager

```typescript
// src/dialogue/manager.ts
import { getGlobalHarness } from '@/harness';

export class DialogueManager {
  private harness = getGlobalHarness();
  
  async getRecommendations() {
    // 原有的推荐逻辑，但通过 Harness 执行
    const result = await this.harness.execute(
      'llm-client',
      {
        // LLM 参数
      },
      {
        enableValidation: true,
        enableMonitoring: true,
        enableAudit: true,
      }
    );
    
    if (!result.success) {
      throw new Error(`推荐失败: ${result.error}`);
    }
    
    return result.data;
  }
}
```

## 架构层次说明

### 1. 约束层（Constraints）

定义工具白名单、资源限制、行为约束等

```typescript
import { getConstraintConfigLoader } from '@/harness';

const configLoader = getConstraintConfigLoader();
const constraints = configLoader.getConstraints();

// 更新约束
configLoader.setMaxAPICallsPerMinute(100);
configLoader.setToolTimeout('llm-client', 30000);
```

### 2. 执行沙箱层（Execution Sandbox）

- 工具白名单验证
- 执行前检查
- 超时控制
- 执行后验证

```typescript
const harness = initializeHarness();
const toolRegistry = harness.getToolRegistry();

// 检查工具是否被允许
if (toolRegistry.isAllowed('llm-client')) {
  // 执行工具
}
```

### 3. 资源管理层（Resource Management）

- API 频率限制
- Token 用量追踪
- 并发控制

```typescript
const resourceManager = harness.getResourceManager();

// 检查资源可用性
const availability = resourceManager.checkResourceAvailability(
  sessionId,
  'llm-client',
  4000 // 预计 Token 数
);

if (availability.canProceed) {
  // 执行
}
```

### 4. 意图验证层（Intent Validation）

- 用户输入安全检查
- 权限检查
- 风险评分

```typescript
const intentValidator = harness.getIntentValidator();

const result = await intentValidator.validate(context, toolName);

if (!result.valid) {
  console.error('验证失败:', result.errors);
}

console.log('风险等级:', result.riskScore.level);
```

### 5. 监控和审计层（Monitoring & Audit）

- 实时行为监控
- 异常检测
- 审计日志

```typescript
const safetyMonitor = harness.getSafetyMonitor();
const tracker = harness.getExecutionTracker();

// 注册告警回调
safetyMonitor.onAlert((alert) => {
  console.warn('告警:', alert.message);
});

// 查询审计日志
const logs = tracker.getSessionAuditLogs(sessionId);
```

## 配置选项

### Harness 配置

```typescript
const harness = new AgentHarness({
  enabled: true,                    // 启用 Harness
  enableMonitoring: true,           // 启用监控
  enableAudit: true,                // 启用审计日志
  enableRiskScoring: true,          // 启用风险评分
  constraints: {
    toolConstraints: {
      allowedTools: ['llm-client', 'amap-client', 'cache-manager'],
      blockedTools: [],
      toolTimeouts: {
        'llm-client': 30000,
        'amap-client': 5000,
      }
    },
    resourceConstraints: {
      maxAPICallsPerMinute: 60,
      maxTokensPerRequest: 4000,
      maxTokensPerSession: 32000,
      globalTokenBudget: 100000,
      maxConcurrentTasks: 5,
    },
    behaviorConstraints: {
      allowedActions: ['search', 'recommend', 'query', 'cache'],
      riskThreshold: 60,
      allowChainedCalls: true,
      maxCallDepth: 3,
    }
  }
});
```

### 执行选项

```typescript
const result = await harness.execute(toolName, args, {
  enablePreCheck: true,       // 执行前检查
  enablePostCheck: true,      // 执行后检查
  enableTrace: true,          // 记录执行轨迹
  enableValidation: true,     // 意图验证
  enableMonitoring: true,     // 监控
  enableAudit: true,          // 审计
  skipApproval: false,        // 跳过风险审批
  maxRetries: 2,              // 最大重试次数
});
```

## 监控和诊断

### 获取统计信息

```typescript
const stats = harness.getStats();

console.log('资源使用:', stats.resources);
console.log('监控告警:', stats.monitoring);
console.log('审计日志:', stats.audit);
```

### 生成报告

```typescript
// 生成综合报告
const report = harness.generateReport();
console.log(report);

// 生成安全监控报告
const safetyReport = harness.getSafetyMonitor().generateReport();
console.log(safetyReport);

// 生成审计报告
const auditReport = harness.getExecutionTracker().generateReport(sessionId);
console.log(auditReport);
```

### 导出数据

```typescript
const tracker = harness.getExecutionTracker();

// 导出为 JSON
const jsonLogs = tracker.exportAsJSON({
  sessionId: 'xxx',
  result: 'failure'
});

// 导出为 CSV
const csvLogs = tracker.exportAsCSV({
  timeRange: {
    start: Date.now() - 3600000,
    end: Date.now()
  }
});
```

## 最佳实践

### 1. 初始化一次，复用实例

```typescript
// ✓ 好做法
const harness = getGlobalHarness();
// 在应用生命周期内重复使用这个实例

// ✗ 不好做法
// 每次都创建新实例
const harness1 = createHarness();
const harness2 = createHarness();
```

### 2. 根据操作类型设置合适的选项

```typescript
// 关键操作：启用所有检查
await harness.execute(toolName, args, {
  enableValidation: true,
  enableMonitoring: true,
  enableAudit: true,
  skipApproval: false,
});

// 普通读取操作：简化检查
await harness.execute(toolName, args, {
  enableValidation: false,
  enableMonitoring: true,
  skipApproval: true,
});
```

### 3. 监听告警和处理异常

```typescript
const safetyMonitor = harness.getSafetyMonitor();

// 设置告警回调
safetyMonitor.onAlert((alert) => {
  if (alert.level === 'critical') {
    // 立即处理严重告警
    console.error('严重告警:', alert.message);
  }
});

// 处理执行失败
const result = await harness.execute(toolName, args);
if (!result.success) {
  // 记录、告警、降级处理
  console.error('执行失败:', result.error);
}
```

### 4. 定期清理日志

```typescript
// 定期清理超出保留期限的日志（防止内存溢出）
setInterval(() => {
  const tracker = harness.getExecutionTracker();
  const logs = tracker.getAllAuditLogs();
  
  // 只保留最近 1000 条
  if (logs.length > 1000) {
    tracker.clearAllLogs();
  }
}, 3600000); // 每小时检查一次
```

## 性能考虑

- Harness 验证和监控的开销通常 < 10ms
- Token 追踪和资源检查是异步的，不阻塞主路径
- 并发控制使用信号量，内存占用低
- 审计日志有大小限制（最多 10000 条）

## 故障排查

### 问题：工具执行被拒绝

检查：
1. 工具是否在白名单中
2. 资源是否可用（API 频率、Token 预算、并发限制）
3. 权限是否正确配置

### 问题：告警过多

解决：
1. 调整约束阈值
2. 优化 Token 使用
3. 增加 API 频率限制

### 问题：性能下降

优化：
1. 减少监控和审计的粒度
2. 增加 maxConcurrentTasks
3. 定期清理日志

## 相关文档

- [Harness 架构设计](./HARNESS_ARCHITECTURE.md)
- [约束配置指南](./HARNESS_CONSTRAINTS.md)
- [监控和告警指南](./HARNESS_MONITORING.md)
- [审计日志指南](./HARNESS_AUDIT.md)
