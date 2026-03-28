/**
 * 性能优化集成示例
 * 展示如何使用请求队列、缓存预热和性能监控
 */

import { getRequestQueue, RequestPriority } from '@/queue/index.js';
import { getCacheWarmer } from '@/cache/warmer.js';
import { getMetricsCollector } from '@/monitoring/index.js';

/**
 * 示例 1: 使用请求队列管理多个并发请求
 */
async function exampleRequestQueue() {
  console.log('\n========== 示例 1: 请求队列 ==========\n');

  const queue = getRequestQueue({
    maxConcurrency: 3,
    defaultTimeout: 5000,
    maxRetries: 2,
    deduplication: true,
  });

  // 模拟 5 个 API 请求
  const requests = Array.from({ length: 5 }, (_, i) => ({
    id: `api-request-${i}`,
    priority: i % 2 === 0 ? RequestPriority.HIGH : RequestPriority.NORMAL,
    timeout: 3000,
    retryable: true,
    executor: async () => {
      const delay = Math.random() * 1000 + 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
      console.log(`✓ 请求 ${i} 完成 (${delay.toFixed(0)}ms)`);
      return { id: i, result: `data-${i}` };
    },
  }));

  // 监听队列事件
  queue.on((event) => {
    const prefix =
      {
        'request:added': '📌',
        'request:started': '▶️',
        'request:completed': '✅',
        'request:failed': '❌',
        'request:timeout': '⏱️',
      }[event.type] || '•';

    console.log(
      `${prefix} [${event.type}] 请求 ${event.requestId}`,
      event.data ? `(${JSON.stringify(event.data)})` : '',
    );
  });

  // 添加所有请求
  for (const req of requests) {
    await queue.add(req);
  }

  // 等待所有请求完成
  await queue.drain();

  // 输出统计
  const stats = queue.getStats();
  console.log('\n📊 队列统计:');
  console.log(`  总请求: ${stats.total}`);
  console.log(`  已完成: ${stats.completed}`);
  console.log(`  已失败: ${stats.failed}`);
  console.log(`  成功率: ${(stats.successRate * 100).toFixed(2)}%`);
  console.log(`  平均耗时: ${stats.averageTime.toFixed(2)}ms`);
  console.log(`  去重节省: ${stats.deduplicationSaved}`);
}

/**
 * 示例 2: 缓存预热
 */
async function exampleCacheWarmer() {
  console.log('\n========== 示例 2: 缓存预热 ==========\n');

  const warmer = getCacheWarmer({
    enableOnStartup: false,
    updateInterval: 0, // 禁用后台更新
    cacheTTL: 3600000, // 1 小时
  });

  console.log('🔥 启动缓存预热...');
  const startTime = Date.now();

  try {
    await warmer.warm();
    const duration = Date.now() - startTime;

    const stats = warmer.getStats();
    console.log('\n✅ 缓存预热完成');
    console.log(`  耗时: ${duration}ms`);
    console.log(`  预热次数: ${stats.warmCount}`);
    console.log(`  最后预热时间: ${new Date(stats.lastWarmTime).toLocaleString()}`);
  } catch (error) {
    console.error('❌ 预热失败:', error);
  }
}

/**
 * 示例 3: 性能监控和警报
 */
async function exampleMetricsCollector() {
  console.log('\n========== 示例 3: 性能监控 ==========\n');

  const collector = getMetricsCollector({
    enabled: true,
    sampleRetentionTime: 60000, // 1 分钟
    aggregationInterval: 5000, // 5 秒
  });

  // 设置警报
  collector.setAlert({
    metric: 'latency:p95',
    warningThreshold: 1000,
    errorThreshold: 2000,
    operator: 'gt',
  });

  collector.setAlert({
    metric: 'error:rate',
    warningThreshold: 0.1,
    errorThreshold: 0.2,
    operator: 'gt',
  });

  collector.setAlert({
    metric: 'cache:hit:rate',
    warningThreshold: 0.7,
    operator: 'lt',
  });

  // 监听警报
  let alertCount = 0;
  collector.onAlert((event) => {
    alertCount++;
    console.log(
      `⚠️  [${event.level.toUpperCase()}] ${event.message}`,
    );
  });

  console.log('📊 模拟性能数据采集...\n');

  // 模拟 20 个请求
  for (let i = 0; i < 20; i++) {
    const latency = Math.random() * 800 + 100;
    const success = Math.random() > 0.1; // 90% 成功率
    const cacheHit = Math.random() > 0.4; // 60% 缓存命中

    collector.recordRequest(latency, success);
    if (cacheHit) {
      collector.recordCacheHit(true, latency * 0.1);
    } else {
      collector.recordCacheHit(false, latency);
    }

    if (i % 5 === 0) {
      const snapshot = collector.getSnapshot();
      console.log(`  第 ${i + 1} 个请求 - 延迟: ${latency.toFixed(0)}ms, 缓存: ${cacheHit ? '✓' : '✗'}`);
    }
  }

  // 输出最终报告
  console.log('\n' + collector.getReport());

  if (alertCount > 0) {
    console.log(`⚠️  共触发 ${alertCount} 个警报\n`);
  }
}

/**
 * 示例 4: 综合集成
 */
async function exampleIntegration() {
  console.log('\n========== 示例 4: 综合集成 ==========\n');

  const queue = getRequestQueue({ maxConcurrency: 5 });
  const collector = getMetricsCollector();

  console.log('🚀 启动综合性能优化演示...\n');

  // 模拟推荐请求
  const tasks = [
    { name: '地点搜索', latency: 800 },
    { name: 'LLM 推理', latency: 1200 },
    { name: '距离计算', latency: 500 },
    { name: '结果排序', latency: 300 },
    { name: '缓存写入', latency: 100 },
  ];

  for (const task of tasks) {
    const startTime = Date.now();

    await queue.add({
      id: `task-${task.name}`,
      priority: RequestPriority.NORMAL,
      timeout: 5000,
      executor: async () => {
        // 模拟任务
        await new Promise((resolve) =>
          setTimeout(resolve, task.latency),
        );
        const actualLatency = Date.now() - startTime;
        collector.recordRequest(actualLatency, true);
        console.log(`  ✓ ${task.name} 完成 (${actualLatency}ms)`);
        return { task: task.name, latency: actualLatency };
      },
    });
  }

  // 等待完成
  await queue.drain();

  // 输出统计
  console.log('\n📈 最终性能统计:');
  const queueStats = queue.getStats();
  const snapshot = collector.getSnapshot();

  console.log(`
  队列统计:
    • 总请求: ${queueStats.total}
    • 成功: ${queueStats.completed}
    • 平均耗时: ${queueStats.averageTime.toFixed(2)}ms

  性能指标:
    • 平均延迟: ${snapshot.averageLatency.toFixed(2)}ms
    • P95延迟: ${snapshot.p95Latency.toFixed(2)}ms
    • 成功率: ${(snapshot.successRate * 100).toFixed(2)}%
    • 吞吐量: ${snapshot.throughput.toFixed(2)} req/s
  `);
}

/**
 * 主函数
 */
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                  性能优化示例                                  ║
║          展示请求队列、缓存预热和性能监控的使用               ║
╚════════════════════════════════════════════════════════════════╝
  `);

  try {
    // 运行示例
    await exampleRequestQueue();
    await exampleCacheWarmer();
    await exampleMetricsCollector();
    await exampleIntegration();

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                   示例运行完成! ✅                            ║
╚════════════════════════════════════════════════════════════════╝
    `);
  } catch (error) {
    console.error('❌ 示例执行失败:', error);
    process.exit(1);
  }
}

// 执行
main().catch(console.error);
