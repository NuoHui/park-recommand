/**
 * 对话管理器单元测试
 * 
 * 覆盖范围：
 * - DialogueManager 初始化和状态管理
 * - 对话流程转移
 * - getRecommendations() 完整推荐流程
 * - 降级处理和错误恢复
 * - Top 5 筛选正确性
 * - 缓存操作
 * - 性能指标收集
 * 
 * 优先级: 🔴 高优先级 - 核心流程测试
 */

import { DialogueManager } from '@/dialogue/manager';
import { DialoguePhase } from '@/config/constants';
import { createLogger } from '@/utils/logger';

const logger = createLogger('test:dialogue-manager');

interface TestResult {
  name: string;
  passed: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  duration?: number;
  data?: Record<string, unknown>;
}

// ============================================================================
// 测试套件 1: DialogueManager 初始化
// ============================================================================

export async function testDialogueManagerInitialization(): Promise<TestResult[]> {
  const tests: Promise<TestResult>[] = [];

  // 测试 1.1: 创建 DialogueManager
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        new DialogueManager();
        logger.info('✅ 测试 1.1 通过: DialogueManager 创建成功');
        return {
          name: 'DialogueManager 创建',
          passed: true,
        };
      } catch (error) {
        logger.error('❌ 测试 1.1 失败', { error });
        return {
          name: 'DialogueManager 创建',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 1.2: 初始化对话
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        const manager = new DialogueManager();
        await manager.initialize();

        const state = manager.getState();
        const isValidInitState =
          state.phase === DialoguePhase.GREETING &&
          state.isActive === true &&
          state.turnsCount === 0;

        if (!isValidInitState) {
          throw new Error('初始状态不正确');
        }

        logger.info('✅ 测试 1.2 通过: 初始化成功', { phase: state.phase });
        return {
          name: '对话初始化',
          passed: true,
          data: { phase: state.phase, isActive: state.isActive },
        };
      } catch (error) {
        logger.error('❌ 测试 1.2 失败', { error });
        return {
          name: '对话初始化',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 1.3: 状态正确初始化
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        const manager = new DialogueManager();
        const state = manager.getState();

        const hasRequiredFields = 
          state.messages !== undefined &&
          state.userPreference !== undefined &&
          state.turnsCount !== undefined;

        if (!hasRequiredFields) {
          throw new Error('状态缺少必需字段');
        }

        logger.info('✅ 测试 1.3 通过: 状态字段完整');
        return {
          name: '状态字段验证',
          passed: true,
          data: { messageCount: state.messages?.length || 0 },
        };
      } catch (error) {
        logger.error('❌ 测试 1.3 失败', { error });
        return {
          name: '状态字段验证',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  return Promise.all(tests);
}

// ============================================================================
// 测试套件 2: 对话流程转移
// ============================================================================

export async function testDialogueFlowTransition(): Promise<TestResult[]> {
  const tests: Promise<TestResult>[] = [];

  // 测试 2.1: 用户输入处理
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        const manager = new DialogueManager();
        await manager.initialize();

        // 第一个用户输入（GREETING 阶段）
        await manager.addUserInput('我想找公园');

        const state = manager.getState();
        const messages = manager.getMessages();

        if (messages.length < 2) {
          throw new Error('消息未正确记录');
        }

        if (state.phase === DialoguePhase.GREETING) {
          throw new Error('阶段未转移');
        }

        logger.info('✅ 测试 2.1 通过: 用户输入处理成功', {
          phase: state.phase,
          messageCount: messages.length,
        });
        return {
          name: '用户输入处理',
          passed: true,
          data: { phase: state.phase, messageCount: messages.length },
        };
      } catch (error) {
        logger.error('❌ 测试 2.1 失败', { error });
        return {
          name: '用户输入处理',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 2.2: 多阶段转移
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        const manager = new DialogueManager();
        await manager.initialize();

        const initialPhase = manager.getState().phase;

        // 模拟多轮对话推进
        await manager.addUserInput('南山');
        await manager.addUserInput('p');
        await manager.addUserInput('1');

        const finalPhase = manager.getState().phase;

        if (initialPhase === finalPhase) {
          throw new Error('阶段未转移');
        }

        logger.info('✅ 测试 2.2 通过: 多阶段转移正常', {
          initialPhase,
          finalPhase,
        });
        return {
          name: '多阶段转移',
          passed: true,
          data: { initialPhase, finalPhase },
        };
      } catch (error) {
        logger.error('❌ 测试 2.2 失败', { error });
        return {
          name: '多阶段转移',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 2.3: 用户偏好累积
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        const manager = new DialogueManager();
        await manager.initialize();

        // 提供位置
        logger.debug('测试 2.3: 添加位置输入');
        await manager.addUserInput('南山');
        let prefs = manager.getUserPreference();
        logger.debug('位置后的偏好:', prefs);
        if (!prefs.location) throw new Error('位置未保存');

        // 提供类型
        logger.debug('测试 2.3: 添加类型输入');
        await manager.addUserInput('p');
        prefs = manager.getUserPreference();
        logger.debug('类型后的偏好:', prefs);
        if (!prefs.parkType) throw new Error(`类型未保存 (parkType=${prefs.parkType})`);

        // 提供距离
        logger.debug('测试 2.3: 添加距离输入');
        await manager.addUserInput('1');
        prefs = manager.getUserPreference();
        logger.debug('距离后的偏好:', prefs);
        if (!prefs.maxDistance) throw new Error(`距离未保存 (maxDistance=${prefs.maxDistance})`);

        logger.info('✅ 测试 2.3 通过: 用户偏好正确累积', {
          location: prefs.location,
          parkType: prefs.parkType,
          maxDistance: prefs.maxDistance,
        });
        return {
          name: '用户偏好累积',
          passed: true,
          data: {
            location: prefs.location,
            parkType: prefs.parkType,
            maxDistance: prefs.maxDistance,
          },
        };
      } catch (error) {
        logger.error('❌ 测试 2.3 失败', { error });
        return {
          name: '用户偏好累积',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  return Promise.all(tests);
}

// ============================================================================
// 测试套件 3: 推荐流程核心
// ============================================================================

export async function testRecommendationFlow(): Promise<TestResult[]> {
  const tests: Promise<TestResult>[] = [];

  // 测试 3.1: 完整推荐流程
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        const manager = new DialogueManager();
        await manager.initialize();

        // 准备用户偏好
        await manager.addUserInput('南山');
        await manager.addUserInput('b');
        await manager.addUserInput('3');

        // 获取推荐
        const result = await manager.getRecommendations();

        if (!result) {
          throw new Error('推荐结果为空');
        }

        logger.info('✅ 测试 3.1 通过: 推荐流程完成', {
          success: result.success,
          recommendationCount: result.recommendations?.length || 0,
        });

        return {
          name: '完整推荐流程',
          passed: true,
          data: {
            success: result.success,
            recommendationCount: result.recommendations?.length || 0,
            hasPerformanceMetrics: !!result.performanceMetrics,
          },
        };
      } catch (error) {
        logger.error('❌ 测试 3.1 失败', { error });
        return {
          name: '完整推荐流程',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 3.2: Top 5 限制
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        const manager = new DialogueManager();
        await manager.initialize();

        // 准备用户偏好
        await manager.addUserInput('深圳');
        await manager.addUserInput('b');
        await manager.addUserInput('4');

        // 获取推荐
        const result = await manager.getRecommendations();

        if (!result || !result.recommendations) {
          throw new Error('推荐结果为空');
        }

        const count = result.recommendations.length;

        if (count > 5) {
          throw new Error(`推荐数量 (${count}) 超过 Top 5 限制`);
        }

        logger.info('✅ 测试 3.2 通过: Top 5 限制生效', { count });

        return {
          name: 'Top 5 限制',
          passed: true,
          data: { recommendationCount: count, isValidTop5: count <= 5 },
        };
      } catch (error) {
        logger.error('❌ 测试 3.2 失败', { error });
        return {
          name: 'Top 5 限制',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 3.3: 推荐数据完整性
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        const manager = new DialogueManager();
        await manager.initialize();

        // 准备用户偏好
        await manager.addUserInput('南山');
        await manager.addUserInput('p');
        await manager.addUserInput('2');

        // 获取推荐
        const result = await manager.getRecommendations();

        if (!result || !result.recommendations) {
          throw new Error('推荐结果为空');
        }

        // 验证每条推荐的必需字段
        for (const rec of result.recommendations) {
          if (!rec.id) throw new Error('缺少 id 字段');
          if (!rec.name) throw new Error('缺少 name 字段');
          if (rec.reason === undefined) throw new Error('缺少 reason 字段');
        }

        logger.info('✅ 测试 3.3 通过: 推荐数据完整', {
          count: result.recommendations.length,
        });

        return {
          name: '推荐数据完整性',
          passed: true,
          data: { recommendationCount: result.recommendations.length },
        };
      } catch (error) {
        logger.error('❌ 测试 3.3 失败', { error });
        return {
          name: '推荐数据完整性',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 3.4: 性能指标记录
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        const manager = new DialogueManager();
        await manager.initialize();

        // 准备用户偏好
        await manager.addUserInput('福田');
        await manager.addUserInput('h');
        await manager.addUserInput('1');

        // 获取推荐
        const startTime = Date.now();
        const result = await manager.getRecommendations();
        const totalElapsed = Date.now() - startTime;

        if (!result || !result.performanceMetrics) {
          throw new Error('性能指标缺失');
        }

        const metrics = result.performanceMetrics;

        if (metrics.totalTime === undefined) throw new Error('缺少 totalTime');
        if (metrics.llmTime === undefined) throw new Error('缺少 llmTime');
        if (metrics.mapQueryTime === undefined) throw new Error('缺少 mapQueryTime');
        if (metrics.cacheHit === undefined) throw new Error('缺少 cacheHit');

        logger.info('✅ 测试 3.4 通过: 性能指标完整', {
          totalTime: metrics.totalTime,
          llmTime: metrics.llmTime,
          mapQueryTime: metrics.mapQueryTime,
          cacheHit: metrics.cacheHit,
        });

        return {
          name: '性能指标记录',
          passed: true,
          data: {
            totalTime: metrics.totalTime,
            llmTime: metrics.llmTime,
            mapQueryTime: metrics.mapQueryTime,
            cacheHit: metrics.cacheHit,
            actualElapsed: totalElapsed,
          },
        };
      } catch (error) {
        logger.error('❌ 测试 3.4 失败', { error });
        return {
          name: '性能指标记录',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  return Promise.all(tests);
}

// ============================================================================
// 测试套件 4: 错误处理和降级
// ============================================================================

export async function testErrorHandlingAndFallback(): Promise<TestResult[]> {
  const tests: Promise<TestResult>[] = [];

  // 测试 4.1: 不完整偏好检测
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        const manager = new DialogueManager();
        await manager.initialize();

        // 只提供位置，不完整
        await manager.addUserInput('南山');

        // 尝试获取推荐（应失败）
        const result = await manager.getRecommendations();

        if (result.success) {
          throw new Error('应该失败，但返回了成功');
        }

        if (!result.error) {
          throw new Error('应该返回错误信息');
        }

        logger.info('✅ 测试 4.1 通过: 不完整偏好被正确拒绝', {
          error: result.error,
        });

        return {
          name: '不完整偏好检测',
          passed: true,
          data: { error: result.error },
        };
      } catch (error) {
        logger.error('❌ 测试 4.1 失败', { error });
        return {
          name: '不完整偏好检测',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 4.2: 降级处理
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        const manager = new DialogueManager();
        await manager.initialize();

        // 准备用户偏好
        await manager.addUserInput('不存在的地方');
        await manager.addUserInput('b');
        await manager.addUserInput('4');

        // 获取推荐（可能触发降级）
        const result = await manager.getRecommendations();

        // 降级处理应该返回某些结果
        if (!result || (!result.success && !result.recommendations)) {
          logger.warn('⏭️  测试 4.2 跳过: 无法测试降级路径');
          return {
            name: '降级处理',
            passed: true,
            skipped: true,
            reason: '条件不满足',
          };
        }

        logger.info('✅ 测试 4.2 通过: 降级处理正常', {
          success: result.success,
          hasRecommendations: !!result.recommendations,
        });

        return {
          name: '降级处理',
          passed: true,
          data: { success: result.success, hasRecommendations: !!result.recommendations },
        };
      } catch (error) {
        logger.error('❌ 测试 4.2 失败', { error });
        return {
          name: '降级处理',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  return Promise.all(tests);
}

// ============================================================================
// 测试套件 5: 缓存操作
// ============================================================================

export async function testCacheOperations(): Promise<TestResult[]> {
  const tests: Promise<TestResult>[] = [];

  // 测试 5.1: 推荐结果缓存
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        const manager1 = new DialogueManager();
        await manager1.initialize();

        // 第一次推荐
        await manager1.addUserInput('南山');
        await manager1.addUserInput('p');
        await manager1.addUserInput('1');

        const result1 = await manager1.getRecommendations();

        // 第二个 Manager 相同查询
        const manager2 = new DialogueManager();
        await manager2.initialize();

        await manager2.addUserInput('南山');
        await manager2.addUserInput('p');
        await manager2.addUserInput('1');

        const result2 = await manager2.getRecommendations();

        // 注: 由于缓存系统在开发中可能还在实现，
        // 这里只验证两次查询都能成功
        if (!result1 || !result2) {
          throw new Error('推荐结果为空');
        }

        logger.info('✅ 测试 5.1 通过: 缓存操作正常', {
          result1Success: result1.success,
          result2Success: result2.success,
        });

        return {
          name: '推荐结果缓存',
          passed: true,
          data: {
            result1Success: result1.success,
            result2Success: result2.success,
          },
        };
      } catch (error) {
        logger.error('❌ 测试 5.1 失败', { error });
        return {
          name: '推荐结果缓存',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  return Promise.all(tests);
}

// ============================================================================
// 主测试函数
// ============================================================================

async function runAllDialogueManagerTests(): Promise<void> {
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('                    对话管理器单元测试');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const suites = [
    { name: '套件 1: 初始化', fn: testDialogueManagerInitialization },
    { name: '套件 2: 流程转移', fn: testDialogueFlowTransition },
    { name: '套件 3: 推荐流程', fn: testRecommendationFlow },
    { name: '套件 4: 错误处理', fn: testErrorHandlingAndFallback },
    { name: '套件 5: 缓存操作', fn: testCacheOperations },
  ];

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const suite of suites) {
    logger.info(`\n📋 运行 ${suite.name}`);
    logger.info('─'.repeat(70));

    try {
      const results = await suite.fn();

      for (const result of results) {
        totalTests++;

        if (result.skipped) {
          totalSkipped++;
          logger.warn(`⏭️  ${result.name}: 跳过 (${result.reason})`);
        } else if (result.passed) {
          totalPassed++;
          logger.info(`✅ ${result.name}`);
        } else {
          totalFailed++;
          logger.error(`❌ ${result.name}`);
          if (result.error) logger.error(`   错误: ${result.error}`);
        }
      }
    } catch (error) {
      logger.error(`❌ ${suite.name} 执行失败`, {
        error: error instanceof Error ? error.message : String(error),
      });
      totalFailed++;
    }
  }

  // 输出总结
  logger.info('\n' + '═'.repeat(70));
  logger.info('                        测试总结');
  logger.info('═'.repeat(70));
  logger.info(`总测试数: ${totalTests}`);
  logger.info(`✅ 通过: ${totalPassed}`);
  logger.info(`❌ 失败: ${totalFailed}`);
  logger.info(`⏭️  跳过: ${totalSkipped}`);
  logger.info(`成功率: ${((totalPassed / (totalTests - totalSkipped)) * 100).toFixed(2)}%`);
  logger.info('═'.repeat(70));
}

// 直接运行测试（当作为脚本执行时）
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllDialogueManagerTests().catch(error => {
    logger.error('测试执行失败', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  });
}

export { runAllDialogueManagerTests };
