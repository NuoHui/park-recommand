/**
 * 日志系统使用示例
 */

import {
  getLogger,
  getLoggingSystem,
  LogContextManager,
  withContext,
  LogLevel,
  LOGGER_PRESETS,
  LoggerConfigManager,
} from '../src/logger/index.js';

/**
 * 示例 1: 基础日志记录
 */
async function example1_basicLogging() {
  console.log('\n📝 示例 1: 基础日志记录\n');

  const logger = getLogger();

  logger.info('应用启动');
  logger.debug('调试信息');
  logger.warn('警告信息');
  logger.error('错误信息', {
    data: { code: 'ERR_001' },
  });
}

/**
 * 示例 2: 性能计时
 */
async function example2_performanceTiming() {
  console.log('\n⏱️  示例 2: 性能计时\n');

  const logger = getLogger();

  // 启动计时器
  const endTimer = logger.startTimer('database_query');

  // 模拟耗时操作
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 结束计时器
  endTimer();
}

/**
 * 示例 3: 上下文管理
 */
async function example3_contextManagement() {
  console.log('\n🎯 示例 3: 上下文管理\n');

  const logger = getLogger();
  const contextManager = LogContextManager.getInstance();

  // 创建上下文
  const contextId = contextManager.createContext({
    module: 'dialogue_engine',
    sessionId: 'session_123',
    tags: ['user_interaction', 'recommendation'],
  });

  // 设置当前上下文
  contextManager.setCurrentContext(contextId);
  logger.setContext(contextManager.getCurrentContext() || {});

  logger.info('对话开始');
  logger.debug('用户输入已收集');

  // 删除上下文
  contextManager.deleteContext(contextId);
}

/**
 * 示例 4: 带上下文的异步操作
 */
async function example4_asyncOperationWithContext() {
  console.log('\n🔄 示例 4: 带上下文的异步操作\n');

  const logger = getLogger();

  const result = await withContext(
    {
      module: 'map_service',
      operationId: 'op_456',
      tags: ['api_call'],
    },
    async (contextId) => {
      logger.info('正在查询地点...');

      // 模拟 API 调用
      await new Promise((resolve) => setTimeout(resolve, 100));

      logger.info('地点查询完成', {
        data: { resultCount: 5 },
      });

      return { locations: ['公园1', '公园2', '公园3'] };
    }
  );

  console.log('操作结果:', result);
}

/**
 * 示例 5: 性能指标
 */
async function example5_performanceMetrics() {
  console.log('\n📊 示例 5: 性能指标\n');

  const logger = getLogger();

  // 记录几个性能指标
  logger.metric('api_response_time', 125);
  logger.metric('cache_hit_rate', 0.85);
  logger.metric('database_connections', 5);

  // 获取指标统计
  const stats = logger.getStatistics();
  console.log('日志统计:', stats);
}

/**
 * 示例 6: 环境预设配置
 */
async function example6_presetsConfiguration() {
  console.log('\n⚙️  示例 6: 环境预设配置\n');

  const configManager = LoggerConfigManager.getInstance();

  // 应用开发环境配置
  configManager.applyPreset('development');
  console.log('开发环境配置:', configManager.getConfig());

  // 应用生产环境配置
  configManager.applyPreset('production');
  console.log('生产环境配置:', configManager.getConfig());
}

/**
 * 示例 7: 完整的日志系统集成
 */
async function example7_completedIntegration() {
  console.log('\n🔗 示例 7: 完整的日志系统集成\n');

  // 获取完整的日志系统
  const loggingSystem = getLoggingSystem();

  // 记录系统启动
  loggingSystem.logSystemStart('1.0.0');

  // 获取对话中间件
  const dialogueLogger = loggingSystem.getDialogueMiddleware();

  // 模拟对话流程
  const sessionId = 'session_789';

  dialogueLogger.logUserInput('推荐深圳的爬山景点', {
    sessionId,
    module: 'dialogue',
  });

  dialogueLogger.logLlmRequest('用户请求处理...', {
    sessionId,
    module: 'llm',
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  dialogueLogger.logLlmResponse('已生成推荐列表', {
    sessionId,
    module: 'llm',
  });

  dialogueLogger.logRecommendation('深圳市', 3, {
    sessionId,
    module: 'parser',
  });

  // 记录系统关闭
  loggingSystem.logSystemShutdown();

  // 生成系统报告
  console.log('\n' + loggingSystem.generateReport());
}

/**
 * 示例 8: 错误追踪
 */
async function example8_errorTracking() {
  console.log('\n❌ 示例 8: 错误追踪\n');

  const loggingSystem = getLoggingSystem();
  const errorMiddleware = loggingSystem.getErrorMiddleware();
  const logger = loggingSystem.getLogger();

  try {
    throw new Error('模拟的 API 连接错误');
  } catch (error) {
    errorMiddleware.trackError(error as Error, {
      module: 'map_service',
      tags: ['api_error'],
    });
  }

  try {
    throw new Error('模拟的数据库错误');
  } catch (error) {
    errorMiddleware.trackError(error as Error, {
      module: 'cache',
      tags: ['database_error'],
    });
  }

  const errorStats = errorMiddleware.getErrorStats();
  console.log('错误统计:', errorStats);
}

/**
 * 示例 9: 性能监控中间件
 */
async function example9_performanceMonitoring() {
  console.log('\n🚀 示例 9: 性能监控\n');

  const loggingSystem = getLoggingSystem();
  const perfMiddleware = loggingSystem.getPerformanceMiddleware();

  // 跟踪多个操作
  for (let i = 0; i < 3; i++) {
    await perfMiddleware.track('api_call', async () => {
      // 模拟耗时操作
      await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 50));
    });
  }

  for (let i = 0; i < 5; i++) {
    await perfMiddleware.track('cache_query', async () => {
      // 模拟快速操作
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }

  const metrics = perfMiddleware.getMetrics();
  console.log('性能指标:', metrics);
}

/**
 * 示例 10: 自定义上下文和日志组合
 */
async function example10_customContextLogging() {
  console.log('\n✨ 示例 10: 自定义上下文和日志组合\n');

  const logger = getLogger();
  const contextManager = LogContextManager.getInstance();

  // 创建推荐流程上下文
  const recommendationContext = contextManager.createContext({
    module: 'recommendation',
    sessionId: 'rec_session_999',
    tags: ['user_request', 'location_based'],
    metadata: {
      userLocation: '深圳市福田区',
      preferenceType: '爬山',
    },
  });

  contextManager.setCurrentContext(recommendationContext);
  logger.setContext(contextManager.getCurrentContext() || {});

  logger.info('开始推荐流程');

  // 模拟多个操作步骤
  const steps = [
    { name: '收集用户信息', duration: 100 },
    { name: '查询地点数据', duration: 200 },
    { name: '调用 LLM 进行推荐', duration: 300 },
    { name: '整合推荐结果', duration: 150 },
  ];

  for (const step of steps) {
    const endTimer = logger.startTimer(step.name);
    await new Promise((resolve) => setTimeout(resolve, step.duration));
    endTimer();
  }

  logger.info('推荐流程完成', {
    data: { recommendationCount: 3 },
  });

  // 清理上下文
  contextManager.deleteContext(recommendationContext);
}

/**
 * 运行所有示例
 */
async function runAllExamples() {
  try {
    await example1_basicLogging();
    await example2_performanceTiming();
    await example3_contextManagement();
    await example4_asyncOperationWithContext();
    await example5_performanceMetrics();
    await example6_presetsConfiguration();
    await example7_completedIntegration();
    await example8_errorTracking();
    await example9_performanceMonitoring();
    await example10_customContextLogging();

    console.log('\n✅ 所有示例执行完成\n');
  } catch (error) {
    console.error('示例执行出错:', error);
  }
}

// 导出示例函数
export {
  example1_basicLogging,
  example2_performanceTiming,
  example3_contextManagement,
  example4_asyncOperationWithContext,
  example5_performanceMetrics,
  example6_presetsConfiguration,
  example7_completedIntegration,
  example8_errorTracking,
  example9_performanceMonitoring,
  example10_customContextLogging,
};

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}

export default runAllExamples;
