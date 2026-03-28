# 快速测试指南 - 5 分钟快速开始

## 🚀 30 秒快速开始

```bash
# 1. 运行端到端测试
npm run test:e2e

# 2. 生成完整报告（HTML + JSON）
npx tsx scripts/generate-test-report.ts

# 3. 查看日志
tail -f logs/combined.log
```

## 📋 完整命令速查表

### 测试命令

```bash
# 运行所有测试
npm test

# 运行端到端测试
npm run test:e2e

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行性能测试
npm run test:perf
```

### 报告命令

```bash
# 生成完整测试报告
npx tsx scripts/generate-test-report.ts

# 生成诊断报告（特定会话）
npx tsx scripts/generate-test-report.ts --session session-123

# 查看测试结果
ls -lh reports/
```

### 日志命令

```bash
# 查看实时日志
tail -f logs/combined.log

# 查看错误日志
tail -f logs/error.log

# 搜索特定错误
grep "ERROR" logs/combined.log

# 查看最后 100 行
tail -n 100 logs/combined.log
```

## 🧪 常见测试场景

### 场景 1: 验证基本推荐流程

```typescript
import { DialogueManager } from '@/dialogue/manager';

const manager = new DialogueManager();
await manager.initialize();

await manager.addUserInput('南山区');
await manager.addUserInput('p'); // 公园
await manager.addUserInput('2'); // 5km

const result = await manager.getRecommendations();
console.log(result.recommendations);
```

**预期输出**: ✅ 返回 5-10 个推荐景点

### 场景 2: 检查错误处理

```typescript
import { getErrorTracker } from '@/monitoring/error-tracker';

const tracker = getErrorTracker();
const errors = tracker.getUnresolvedErrors();

console.log(`未解决的错误: ${errors.length}`);
```

**预期输出**: ✅ 错误数量少于 5

### 场景 3: 性能验证

```typescript
import { getMetricsCollector } from '@/monitoring/metrics-collector';

const collector = getMetricsCollector();
const snapshot = collector.getSnapshot();

console.log(`平均延迟: ${snapshot.averageLatency.toFixed(2)}ms`);
console.log(`缓存命中率: ${(snapshot.cacheHitRate * 100).toFixed(2)}%`);
```

**预期输出**: 
- 平均延迟 < 500ms
- 缓存命中率 > 50%

### 场景 4: 查看完整诊断

```typescript
import { getLogAggregator } from '@/monitoring/log-aggregator';

const aggregator = getLogAggregator();
const report = aggregator.generateDiagnosticReport('session-123');

console.log(aggregator.generateFullReport());
```

**预期输出**: ✅ 完整的系统诊断报告

## 📊 解读测试结果

### 绿色指标 ✅

| 指标 | 目标范围 | 示例 |
|------|---------|------|
| 测试成功率 | > 95% | ✅ 98% |
| 平均延迟 | < 500ms | ✅ 250ms |
| 缓存命中率 | > 50% | ✅ 75% |
| 错误率 | < 5% | ✅ 2% |
| P95 延迟 | < 1000ms | ✅ 800ms |

### 黄色指标 ⚠️

| 指标 | 警告范围 | 推荐行动 |
|------|---------|---------|
| 测试成功率 | 85-95% | 检查失败的测试用例 |
| 平均延迟 | 500-1000ms | 优化查询性能 |
| 缓存命中率 | 25-50% | 调整缓存策略 |
| 错误率 | 5-10% | 检查错误日志 |
| P95 延迟 | 1000-2000ms | 识别和优化慢查询 |

### 红色指标 ❌

| 指标 | 严重范围 | 紧急行动 |
|------|---------|---------|
| 测试成功率 | < 85% | 🔴 立即检查日志 |
| 平均延迟 | > 1000ms | 🔴 性能严重下降 |
| 缓存命中率 | < 25% | 🔴 缓存策略失效 |
| 错误率 | > 10% | 🔴 系统不稳定 |
| P95 延迟 | > 2000ms | 🔴 用户体验差 |

## 🔍 调试技巧

### 找出慢请求

```bash
# 查找所有耗时 > 1 秒的请求
grep '"duration":[0-9]{4,}' logs/combined.log
```

### 分析错误分类

```typescript
import { getErrorTracker } from '@/monitoring/error-tracker';

const tracker = getErrorTracker();
const stats = tracker.getStatistics();

console.table(stats.byCategory);
```

### 查看缓存效果

```typescript
import { getMetricsCollector } from '@/monitoring/metrics-collector';

const collector = getMetricsCollector();
const snapshot = collector.getSnapshot();

console.log({
  cacheHits: snapshot.totalRequests * snapshot.cacheHitRate,
  cacheMisses: snapshot.totalRequests * (1 - snapshot.cacheHitRate),
  hitRate: (snapshot.cacheHitRate * 100).toFixed(2) + '%',
});
```

### 追踪特定会话

```typescript
import { getRequestLogger } from '@/monitoring/request-logger';

const logger = getRequestLogger();
const trace = logger.getSessionTrace('session-123');

console.log(`会话 ${trace.sessionId} 的性能:`);
console.log(`├─ 总请求: ${trace.totalRequests}`);
console.log(`├─ 成功: ${trace.successfulRequests}`);
console.log(`├─ 平均耗时: ${trace.averageDuration.toFixed(2)}ms`);
console.log(`└─ 最慢请求: ${trace.slowestRequest?.duration}ms`);
```

## 🎯 故障排查

### 问题 1: 测试全部失败

**症状**: ❌ 所有测试都 FAILED

**检查步骤**:
1. 检查网络连接
2. 验证 API 密钥配置
3. 查看错误日志：`tail logs/error.log`
4. 运行单个测试进行隔离测试

**解决方案**:
```bash
# 查看详细错误
npm run test:e2e 2>&1 | tee test-output.log

# 检查日志
cat logs/error.log
```

### 问题 2: 性能指标很差

**症状**: ⚠️ 延迟 > 2000ms，缓存命中率 < 25%

**检查步骤**:
1. 查看是否有慢查询
2. 检查缓存配置
3. 验证 LLM 和地图 API 响应时间

**解决方案**:
```typescript
// 查看最慢的请求
const slowRequests = requestLogger.getSlowRequests(2000);
console.log(`检测到 ${slowRequests.length} 个慢请求`);
slowRequests.forEach(req => {
  console.log(`- ${req.operation}: ${req.duration}ms`);
});
```

### 问题 3: 错误数量多

**症状**: 🔴 错误数 > 10，未解决错误 > 5

**检查步骤**:
1. 按类别查看错误
2. 查看最近的错误链
3. 检查特定模块的错误

**解决方案**:
```typescript
// 查看错误分类
const stats = errorTracker.getStatistics();
for (const [category, count] of Object.entries(stats.byCategory)) {
  if (count > 2) {
    console.log(`⚠️ ${category}: ${count} 个错误`);
    // 获取该类型的详细错误
    const errors = errorTracker.getErrorsByCategory(category);
    console.log(errors);
  }
}
```

## 💻 本地开发工作流

### 完整测试周期

```bash
# 1. 启动开发服务
npm run dev

# 2. 在另一个终端运行测试
npm run test:e2e

# 3. 生成报告
npx tsx scripts/generate-test-report.ts

# 4. 打开 HTML 报告
open reports/test-report-*.html

# 5. 检查日志
tail -f logs/combined.log
```

### 快速验证修改

```bash
# 修改代码后，只运行相关测试
npm run test:unit --grep "specific-test"

# 检查性能是否下降
npm run test:perf

# 查看日志中是否有新错误
grep "ERROR" logs/combined.log | tail -20
```

## 📈 性能基准

首次运行时保存基准，后续对比：

```bash
# 保存基准
npm run test:perf > baseline.txt

# 比较新结果
npm run test:perf > current.txt
diff baseline.txt current.txt
```

## 🎓 阅读材料

### 必读文档

1. **E2E-TESTING-GUIDE.md** - 完整的测试指南（30 分钟）
2. **TESTING-SUMMARY.md** - 测试系统总结（20 分钟）
3. **本文档** - 快速参考（5 分钟）

### 代码示例

1. **e2e-testing-complete.ts** - 6 个完整示例（参考和学习）
2. **recommendation-flow.test.ts** - 实际的测试用例（理解测试设计）

## ✅ 检查清单

在提交代码前，运行此清单：

- [ ] 所有测试通过 (`npm run test:e2e`)
- [ ] 没有新的错误 (`grep ERROR logs/combined.log | wc -l`)
- [ ] 性能指标稳定 (平均延迟 < 500ms)
- [ ] 缓存命中率 > 50%
- [ ] 生成报告无异常 (`npx tsx scripts/generate-test-report.ts`)
- [ ] 日志文件大小合理 (`ls -lh logs/`)

## 🆘 获取帮助

### 查看帮助信息

```bash
# 查看所有测试命令
npm run

# 查看日志系统配置
grep -A 10 "logger config" src/logger/index.ts

# 查看监控模块文档
ls -la src/monitoring/
```

### 常见问题

**Q: 如何只运行某个特定测试?**
```typescript
// 在 recommendation-flow.test.ts 中，只调用需要的测试
await this.testBasicFlow();
// 注释掉其他测试
```

**Q: 如何改变日志级别?**
```typescript
const logger = getLogger({
  level: 'debug', // 'verbose', 'debug', 'info', 'warn', 'error'
});
```

**Q: 日志文件在哪里?**
```bash
ls -la logs/
# error.log - 错误日志
# combined.log - 所有日志
# exceptions.log - 未捕获异常
```

## 📞 联系和反馈

有问题或建议，请：
1. 检查日志文件查找错误线索
2. 查看诊断报告中的建议
3. 参考完整的 E2E 测试指南

---

**快速测试指南 v1.0**  
**最后更新**: 2026-03-28  
**状态**: ✅ 完成
