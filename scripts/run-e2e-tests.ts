#!/usr/bin/env tsx
/**
 * 端到端测试运行脚本
 * 使用方法：npm run test:e2e
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { runE2ETests } from '@/tests/e2e/recommendation-flow.test.js';
import { getLogger } from '@/logger/index.js';
import { getErrorTracker } from '@/monitoring/error-tracker.js';
import { getRequestLogger } from '@/monitoring/request-logger.js';
import { getMetricsCollector } from '@/monitoring/metrics-collector.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = getLogger('e2e-runner');

/**
 * 主入口
 */
async function main(): Promise<void> {
  logger.info('='.repeat(80));
  logger.info('开始端到端测试套件', {
    data: {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
    },
  });
  logger.info('='.repeat(80));

  try {
    // 运行测试
    await runE2ETests();
  } catch (error) {
    logger.error('测试套件执行失败', {
      error: error instanceof Error ? error : new Error(String(error)),
    });

    // 输出诊断信息
    console.log('\n📋 诊断信息:');
    const errorTracker = getErrorTracker();
    console.log(errorTracker.getReport());

    const requestLogger = getRequestLogger();
    console.log(requestLogger.getPerformanceReport());

    process.exit(1);
  }
}

main().catch((err) => {
  console.error('致命错误:', err);
  process.exit(1);
});
