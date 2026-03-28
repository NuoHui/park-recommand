/**
 * 完整的端到端测试示例
 * 展示如何运行测试、收集日志、追踪错误、监控性能
 */

import { DialogueManager } from '@/dialogue/manager';
import { getErrorTracker } from '@/monitoring/error-tracker';
import { getRequestLogger } from '@/monitoring/request-logger';
import { getMetricsCollector } from '@/monitoring/metrics-collector';
import { getLogAggregator } from '@/monitoring/log-aggregator';
import { getLogger } from '@/logger/index.js';

const logger = getLogger();

/**
 * 示例 1: 基本流程测试
 */
async function exampleBasicFlow(): Promise<void> {
  console.log('\n📝 示例 1: 基本推荐流程');
  console.log('═'.repeat(60));

  const sessionId = 'session-basic-flow';
  const dialogueManager = new DialogueManager();

  await dialogueManager.initialize();

  // 模拟用户输入
  await dialogueManager.addUserInput('南山区');
  await dialogueManager.addUserInput('p'); // 公园
  await dialogueManager.addUserInput('2'); // 5km以内

  // 获取推荐
  const result = await dialogueManager.getRecommendations();

  if (result.success && result.recommendations) {
    console.log(`✅ 成功获得 ${result.recommendations.length} 个推荐`);
    console.log(`⏱️ 总耗时: ${result.performanceMetrics?.totalDuration}ms`);

    // 显示前两个推荐
    result.recommendations.slice(0, 2).forEach((rec, i) => {
      console.log(`\n  ${i + 1}. ${rec.name}`);
      console.log(`     理由: ${rec.reason}`);
    });
  }

  await dialogueManager.close();
}

/**
 * 示例 2: 错误追踪
 */
async function exampleErrorTracking(): Promise<void> {
  console.log('\n📝 示例 2: 错误追踪和分类');
  console.log('═'.repeat(60));

  const errorTracker = getErrorTracker();

  // 模拟各种错误
  const errors = [
    { msg: 'Network connection refused', context: 'API call' },
    { msg: 'Request timeout after 30s', context: 'Map query' },
    { msg: 'Invalid location format', context: 'Input validation' },
    { msg: 'Authentication failed', context: 'LLM service' },
  ];

  for (const err of errors) {
    errorTracker.recordError(new Error(err.msg), {
      module: 'example',
      operation: err.context,
    });
  }

  // 获取统计
  const stats = errorTracker.getStatistics();
  console.log(`\n📊 错误统计:`);
  console.log(`├─ 总错误数: ${stats.total}`);
  console.log(`├─ 按类别分类:`);

  for (const [category, count] of Object.entries(stats.byCategory)) {
    console.log(`│  ├─ ${category}: ${count}`);
  }

  console.log(errorTracker.getReport());
}

/**
 * 示例 3: 请求日志追踪
 */
async function exampleRequestLogging(): Promise<void> {
  console.log('\n📝 示例 3: 请求日志追踪');
  console.log('═'.repeat(60));

  const requestLogger = getRequestLogger();
  const sessionId = 'session-request-logging';

  // 模拟多个请求
  const requests = [
    { name: 'getRecommendations', duration: 250 },
    { name: 'queryMap', duration: 800 },
    { name: 'llmAnalysis', duration: 300 },
    { name: 'formatResult', duration: 50 },
  ];

  for (const req of requests) {
    const requestId = requestLogger.startRequest(sessionId, req.name);

    // 模拟异步操作
    await new Promise((resolve) => setTimeout(resolve, req.duration));

    requestLogger.completeRequest(requestId, {
      status: 'success',
      statusCode: 200,
    });
  }

  // 获取会话追踪
  const trace = requestLogger.getSessionTrace(sessionId);
  if (trace) {
    console.log(`\n📊 会话追踪:`);
    console.log(`├─ 总请求数: ${trace.totalRequests}`);
    console.log(`├─ 成功请求: ${trace.successfulRequests}`);
    console.log(`├─ 失败请求: ${trace.failedRequests}`);
    console.log(`├─ 总耗时: ${trace.totalDuration.toFixed(0)}ms`);
    console.log(`└─ 平均耗时: ${trace.averageDuration.toFixed(2)}ms`);
  }

  console.log(requestLogger.getPerformanceReport());
}

/**
 * 示例 4: 性能监控
 */
async function examplePerformanceMonitoring(): Promise<void> {
  console.log('\n📝 示例 4: 性能监控和指标');
  console.log('═'.repeat(60));

  const collector = getMetricsCollector();

  // 模拟请求
  const results = [
    { latency: 150, success: true },
    { latency: 200, success: true },
    { latency: 250, success: true },
    { latency: 300, success: true },
    { latency: 2500, success: false },
  ];

  for (const result of results) {
    collector.recordRequest(result.latency, result.success);
  }

  // 记录缓存命中
  collector.recordCacheHit(true, 10);
  collector.recordCacheHit(true, 15);
  collector.recordCacheHit(false, 500);

  // 获取快照
  const snapshot = collector.getSnapshot();
  console.log(`\n📊 性能指标:`);
  console.log(`├─ 总请求数: ${snapshot.totalRequests}`);
  console.log(`├─ 成功率: ${(snapshot.successRate * 100).toFixed(2)}%`);
  console.log(`├─ 平均延迟: ${snapshot.averageLatency.toFixed(2)}ms`);
  console.log(`├─ P95延迟: ${snapshot.p95Latency.toFixed(2)}ms`);
  console.log(`├─ P99延迟: ${snapshot.p99Latency.toFixed(2)}ms`);
  console.log(`├─ 缓存命中率: ${(snapshot.cacheHitRate * 100).toFixed(2)}%`);
  console.log(`├─ 错误率: ${(snapshot.errorRate * 100).toFixed(2)}%`);
  console.log(`└─ 吞吐量: ${snapshot.throughput.toFixed(2)} req/s`);

  console.log(collector.getReport());
}

/**
 * 示例 5: 完整的日志聚合
 */
async function exampleLogAggregation(): Promise<void> {
  console.log('\n📝 示例 5: 完整日志聚合和诊断');
  console.log('═'.repeat(60));

  const aggregator = getLogAggregator();
  const sessionId = 'session-aggregation';

  // 运行一次操作以生成日志
  const dialogueManager = new DialogueManager();
  await dialogueManager.initialize();

  await dialogueManager.addUserInput('南山区');
  await dialogueManager.addUserInput('p');
  await dialogueManager.addUserInput('2');

  const result = await dialogueManager.getRecommendations();

  // 生成诊断报告
  const report = aggregator.generateDiagnosticReport(sessionId);

  console.log(`\n📋 诊断报告:`);
  console.log(`├─ 标题: ${report.title}`);
  console.log(`├─ 摘要: ${report.summary}`);
  console.log(`├─ 生成时间: ${report.generatedAt.toISOString()}`);
  console.log(`└─ 建议数: ${report.recommendations.length}`);

  console.log(`\n💡 改进建议:`);
  for (const rec of report.recommendations) {
    console.log(`  • ${rec}`);
  }

  // 获取趋势分析
  const trend = aggregator.getTrendAnalysis();
  console.log(`\n📈 趋势分析:`);
  console.log(`├─ 延迟趋势: ${trend.latencyTrend}`);
  console.log(`├─ 错误趋势: ${trend.errorTrend}`);
  console.log(`└─ 缓存趋势: ${trend.cacheTrend}`);

  await dialogueManager.close();

  // 生成完整报告
  console.log(aggregator.generateFullReport());
}

/**
 * 示例 6: 缓存性能对比
 */
async function exampleCacheComparison(): Promise<void> {
  console.log('\n📝 示例 6: 缓存性能对比');
  console.log('═'.repeat(60));

  const requestLogger = getRequestLogger();
  const metricsCollector = getMetricsCollector();
  const sessionId = 'session-cache-test';

  // 第一次查询（未缓存）
  console.log('\n第一次查询（未缓存）:');
  const req1Id = requestLogger.startRequest(sessionId, 'query-uncached');

  const dialogueManager = new DialogueManager();
  await dialogueManager.initialize();

  const start1 = Date.now();
  await dialogueManager.addUserInput('南山区');
  await dialogueManager.addUserInput('p');
  await dialogueManager.addUserInput('2');
  const result1 = await dialogueManager.getRecommendations();
  const duration1 = Date.now() - start1;

  requestLogger.completeRequest(req1Id, {
    status: 'success',
    metadata: { cacheHit: false, duration: duration1 },
  });

  metricsCollector.recordRequest(duration1, true);
  metricsCollector.recordCacheHit(false, duration1);

  console.log(`  耗时: ${duration1}ms`);
  console.log(`  推荐数: ${result1.recommendations?.length || 0}`);

  // 第二次查询（命中缓存）
  console.log('\n第二次查询（命中缓存）:');
  const req2Id = requestLogger.startRequest(sessionId, 'query-cached');

  const start2 = Date.now();
  const result2 = await dialogueManager.getRecommendations();
  const duration2 = Date.now() - start2;

  requestLogger.completeRequest(req2Id, {
    status: 'success',
    metadata: { cacheHit: true, duration: duration2 },
  });

  metricsCollector.recordRequest(duration2, true);
  metricsCollector.recordCacheHit(true, duration2);

  console.log(`  耗时: ${duration2}ms`);
  console.log(`  推荐数: ${result2.recommendations?.length || 0}`);

  // 对比
  console.log(`\n📊 性能对比:`);
  console.log(`├─ 未缓存耗时: ${duration1}ms`);
  console.log(`├─ 缓存耗时: ${duration2}ms`);
  console.log(`├─ 加速倍数: ${(duration1 / duration2).toFixed(0)}x`);
  console.log(`└─ 时间节省: ${(duration1 - duration2).toFixed(0)}ms`);

  const snapshot = metricsCollector.getSnapshot();
  console.log(`\n💾 缓存统计:`);
  console.log(`└─ 命中率: ${(snapshot.cacheHitRate * 100).toFixed(2)}%`);

  await dialogueManager.close();
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║             完整的端到端测试、日志和错误追踪示例                          ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
  `);

  try {
    // 运行所有示例
    await exampleBasicFlow();
    await exampleErrorTracking();
    await exampleRequestLogging();
    await examplePerformanceMonitoring();
    await exampleLogAggregation();
    await exampleCacheComparison();

    console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                    ✅ 所有示例执行完成！                                  ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
    `);
  } catch (error) {
    console.error('❌ 示例执行失败:', error);
    process.exit(1);
  }
}

main().catch(console.error);
