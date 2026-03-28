# 端到端测试和完整日志指南

## 目录

1. [概述](#概述)
2. [测试框架](#测试框架)
3. [运行测试](#运行测试)
4. [日志系统](#日志系统)
5. [错误追踪](#错误追踪)
6. [性能监控](#性能监控)
7. [测试报告](#测试报告)
8. [常见问题](#常见问题)

## 概述

本文档介绍如何运行端到端测试、收集完整日志、进行错误追踪，以验证完整的推荐流程。

### 核心功能

- ✅ **10 个端到端测试用例**：全面覆盖推荐流程
- ✅ **完整日志系统**：记录所有操作和事件
- ✅ **错误追踪**：捕获、分类、分析所有错误
- ✅ **性能监控**：实时收集性能指标
- ✅ **请求日志**：追踪每个请求的完整生命周期

## 测试框架

### 架构

```
RecommendationFlowE2ETest
├── Test 1: 基本推荐流程
├── Test 2: 位置输入处理
├── Test 3: 景点类型选择
├── Test 4: 距离偏好处理
├── Test 5: 推荐生成
├── Test 6: 错误处理和降级
├── Test 7: 缓存机制
├── Test 8: 性能要求
├── Test 9: 并发处理
└── Test 10: 优雅降级
```

### 测试流程

每个测试都包含以下阶段：

```
启动 → 执行 → 验证 → 日志 → 完成
```

### 测试结果结构

```typescript
interface E2ETestResult {
  testName: string;
  status: 'passed' | 'failed' | 'pending';
  startTime: number;
  endTime: number;
  duration: number;
  error?: string;
  errorId?: string;
  metrics?: Record<string, any>;
}
```

## 运行测试

### 基本命令

```bash
# 运行所有端到端测试
npm run test:e2e

# 运行特定测试套件
npm run test:unit       # 单元测试
npm run test:integration # 集成测试
npm run test:performance # 性能测试

# 运行所有测试
npm test
```

### 测试脚本位置

| 脚本 | 位置 | 功能 |
|------|------|------|
| 端到端测试 | `src/__tests__/e2e/recommendation-flow.test.ts` | 完整推荐流程验证 |
| 运行器 | `scripts/run-e2e-tests.ts` | 测试执行脚本 |
| 错误追踪 | `src/monitoring/error-tracker.ts` | 错误捕获和分析 |
| 请求日志 | `src/monitoring/request-logger.ts` | 请求生命周期追踪 |

### 测试输出示例

```
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                   端到端测试报告 - 完整推荐流程                            ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

📊 测试统计
├─ 总测试数: 10
├─ 通过数: ✅ 10
├─ 失败数: ❌ 0
├─ 成功率: 100.00%
└─ 平均耗时: 250.50ms

📋 详细结果
✅ Test 1: 基本推荐流程
   耗时: 250ms
   状态: passed
   
✅ Test 2: 位置输入处理
   耗时: 50ms
   状态: passed
   
... (更多测试结果)
```

## 日志系统

### 日志级别

| 级别 | 用途 | 示例 |
|------|------|------|
| `ERROR` | 严重错误 | API 调用失败 |
| `WARN` | 警告信息 | 性能降级 |
| `INFO` | 常规信息 | 操作完成 |
| `DEBUG` | 调试信息 | 中间步骤 |
| `VERBOSE` | 详细日志 | 内部状态变化 |

### 使用日志

```typescript
import { getLogger } from '@/logger/index.js';

const logger = getLogger('my-module');

// 基本日志
logger.info('操作完成', { data: { result: 'success' } });
logger.error('操作失败', { error: new Error('失败原因') });

// 性能指标
logger.metric('query_duration', 250);

// 计时
const endTimer = logger.startTimer('my-operation');
// ... 执行操作 ...
const duration = endTimer(); // 返回耗时（毫秒）

// 上下文
logger.setContext({
  module: 'dialogue',
  sessionId: '123',
  tags: ['critical'],
});
```

### 日志文件位置

```
logs/
├── error.log         # 错误日志
├── combined.log      # 所有日志
└── exceptions.log    # 未捕获异常
```

### 日志配置

```typescript
const logger = getLogger({
  level: 'debug',
  enabled: true,
  colorize: true,
  console: true,
  file: true,
  logDir: './logs',
  maxFileSize: 5242880, // 5MB
  maxFiles: 10,
});
```

## 错误追踪

### 错误追踪器使用

```typescript
import { getErrorTracker } from '@/monitoring/error-tracker.js';

const tracker = getErrorTracker();

// 记录错误
const errorId = tracker.recordError(
  new Error('查询失败'),
  {
    module: 'dialogue',
    operation: 'getRecommendations',
    sessionId: '123',
  },
  'error' // 级别: 'critical' | 'error' | 'warning'
);

// 获取错误
const error = tracker.getError(errorId);

// 标记为已解决
tracker.resolveError(errorId, '已修复');

// 获取统计
const stats = tracker.getStatistics();
console.log(stats.byCategory); // 按类别统计

// 获取错误链（特定会话的所有错误）
const errors = tracker.getErrorChain('session-123');
```

### 错误分类

系统自动将错误分为以下类别：

- `NetworkError` - 网络连接问题
- `TimeoutError` - 超时错误
- `NotFoundError` - 资源不存在
- `AuthenticationError` - 认证失败
- `PermissionError` - 权限不足
- `RateLimitError` - 限流
- `ValidationError` - 验证失败
- `ParseError` - 解析错误
- `DatabaseError` - 数据库错误
- `CacheError` - 缓存错误
- `UnknownError` - 未知错误

### 错误监听

```typescript
const tracker = getErrorTracker();

tracker.onError((error) => {
  console.log(`捕获错误: ${error.category}`, error);
  
  // 可以集成到监控/告警系统
  if (error.level === 'critical') {
    sendAlert(error);
  }
});
```

### 错误报告

```
╔════════════════════════════════════════════════════════════════╗
║                    错误追踪报告                                ║
╚════════════════════════════════════════════════════════════════╝

📊 错误统计
├─ 总错误数: 5
├─ 未解决: 2
└─ 已解决: 3

🗂️ 按模块分类
├─ dialogue: 3
└─ map: 2

🏷️ 按类别分类
├─ NetworkError: 2
├─ TimeoutError: 1
└─ ValidationError: 2

⚠️ 按级别分类
├─ level:error: 4
└─ level:warning: 1
```

## 性能监控

### 指标收集

```typescript
import { getMetricsCollector } from '@/monitoring/metrics-collector.js';

const collector = getMetricsCollector();

// 记录请求
collector.recordRequest(250, true, { endpoint: '/recommend' });

// 记录缓存命中
collector.recordCacheHit(true, 10);

// 获取性能快照
const snapshot = collector.getSnapshot();
console.log({
  totalRequests: snapshot.totalRequests,
  successRate: snapshot.successRate,
  averageLatency: snapshot.averageLatency,
  cacheHitRate: snapshot.cacheHitRate,
});
```

### 关键指标

| 指标 | 说明 | 单位 |
|------|------|------|
| `totalRequests` | 总请求数 | 计数 |
| `successRate` | 成功率 | 百分比 |
| `averageLatency` | 平均延迟 | ms |
| `p95Latency` | 95 百分位延迟 | ms |
| `p99Latency` | 99 百分位延迟 | ms |
| `cacheHitRate` | 缓存命中率 | 百分比 |
| `errorRate` | 错误率 | 百分比 |

### 性能警报

```typescript
collector.setAlert({
  metric: 'latency:p95',
  warningThreshold: 1000,
  errorThreshold: 2000,
  operator: 'gt',
});

collector.onAlert((event) => {
  console.log(`警报: ${event.metric} = ${event.currentValue}`);
});
```

## 请求日志

### 请求追踪

```typescript
import { getRequestLogger } from '@/monitoring/request-logger.js';

const logger = getRequestLogger();

// 开始请求
const requestId = logger.startRequest('session-123', 'getRecommendations', {
  endpoint: '/api/recommend',
  method: 'POST',
});

// ... 执行操作 ...

// 完成请求
logger.completeRequest(requestId, {
  status: 'success',
  statusCode: 200,
  response: { recommendations: [...] },
  cacheHit: true,
});

// 或记录错误
logger.recordError(requestId, new Error('查询失败'), errorId);
```

### 查询会话追踪

```typescript
// 获取会话的所有请求
const trace = logger.getSessionTrace('session-123');
console.log({
  totalRequests: trace.totalRequests,
  successfulRequests: trace.successfulRequests,
  failedRequests: trace.failedRequests,
  totalDuration: trace.totalDuration,
  averageDuration: trace.averageDuration,
});
```

### 性能报告

```
╔════════════════════════════════════════════════════════════════╗
║                   请求性能报告                                 ║
╚════════════════════════════════════════════════════════════════╝

📊 总体统计
├─ 总请求数: 150
├─ 成功请求: 145
├─ 失败请求: 5
└─ 活跃会话: 10

⏱️ 操作性能
├─ getRecommendations
│  ├─ 次数: 50
│  ├─ 成功: 48
│  ├─ 失败: 2
│  ├─ 平均耗时: 250.50ms
│  ├─ 最大耗时: 500.00ms
│  └─ 最小耗时: 100.00ms
```

## 测试报告

### 生成完整报告

```typescript
import { RecommendationFlowE2ETest } from '@/tests/e2e/recommendation-flow.test.js';
import { getErrorTracker, getRequestLogger, getMetricsCollector } from '@/monitoring/index.js';

const tester = new RecommendationFlowE2ETest();
const report = await tester.runAllTests();

// 生成所有报告
console.log(tester.generateReport(report));
console.log(getErrorTracker().getReport());
console.log(getRequestLogger().getPerformanceReport());
console.log(getMetricsCollector().getReport());
```

### 导出数据

```typescript
// 错误数据
const errorData = getErrorTracker().export();
// {
//   errors: [...],
//   statistics: {...},
//   timestamp: 1234567890
// }

// 请求数据
const requestData = getRequestLogger().export();
// {
//   logs: [...],
//   sessions: {...},
//   timestamp: 1234567890
// }

// 性能快照
const snapshot = getMetricsCollector().getSnapshot();
```

## 常见问题

### Q: 如何只运行特定测试？

A: 修改 `RecommendationFlowE2ETest` 的 `runAllTests()` 方法，注释掉不需要的测试。

### Q: 日志文件在哪里？

A: 默认在 `./logs/` 目录下。可通过日志配置修改。

### Q: 如何调整日志级别？

A: 修改 `getLogger()` 配置的 `level` 参数为 `'debug'`, `'info'`, `'warn'`, `'error'` 等。

### Q: 如何集成到 CI/CD？

A: 使用 `npm run test:e2e`，并检查退出码（0 = 通过，1 = 失败）。

### Q: 如何查看慢请求？

A: 使用 `getRequestLogger().getSlowRequests(threshold)` 获取超过阈值的请求。

### Q: 如何监控缓存命中率？

A: 通过 `getMetricsCollector().getSnapshot().cacheHitRate` 查看。

## 总结

本测试框架提供了：

1. **10 个全面的端到端测试用例**
2. **完整的日志收集系统**
3. **实时的错误追踪**
4. **详细的性能监控**
5. **完善的请求追踪**

通过这些工具，可以有效地验证推荐系统的完整性、可靠性和性能。

---

**最后更新**: 2026-03-28  
**版本**: 1.0.0
