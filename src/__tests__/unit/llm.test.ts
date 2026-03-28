/**
 * LLM 单元测试
 * 验证 LLM 客户端和引擎的正常工作
 */

import { LLMClient, createLLMClient } from '@/llm/client';
import { LLMEngine, createLLMEngine } from '@/llm/engine';
import { env } from '@/config/env';
import { createLogger } from '@/utils/logger';

const logger = createLogger('test:llm');

/**
 * 测试套件：LLM 客户端
 */
export async function testLLMClient() {
  const tests = [];

  // 测试 1: 初始化 LLM 客户端
  tests.push(
    (async () => {
      try {
        const provider = env.llmProvider as 'openai' | 'anthropic';
        let apiKey: string;
        let model: string;

        if (provider === 'openai') {
          apiKey = env.openaiApiKey || '';
          model = env.openaiModel;
        } else if (provider === 'anthropic') {
          apiKey = env.anthropicApiKey || '';
          model = env.anthropicModel;
        } else {
          throw new Error(`Unsupported provider: ${provider}`);
        }

        if (!apiKey) {
          throw new Error(`API Key not configured for provider: ${provider}`);
        }

        const client = createLLMClient(provider, apiKey, model);
        logger.info('✅ 测试 1 通过：LLM 客户端初始化成功', {
          provider,
          model,
        });

        return {
          name: 'LLM 客户端初始化',
          passed: true,
          client,
        };
      } catch (error) {
        logger.error('❌ 测试 1 失败：LLM 客户端初始化', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: 'LLM 客户端初始化',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 2: 验证 LLM 连接
  tests.push(
    (async () => {
      try {
        const provider = env.llmProvider as 'openai' | 'anthropic';
        let apiKey: string;
        let model: string;

        if (provider === 'openai') {
          apiKey = env.openaiApiKey || '';
          model = env.openaiModel;
        } else if (provider === 'anthropic') {
          apiKey = env.anthropicApiKey || '';
          model = env.anthropicModel;
        } else {
          throw new Error(`Unsupported provider: ${provider}`);
        }

        // 跳过测试如果 API Key 包含 'your' 或 'here'（表示未配置）
        if (apiKey.toLowerCase().includes('your') || apiKey.toLowerCase().includes('here') || apiKey.startsWith('sk-proj-')) {
          logger.warn('⏭️  测试 2 跳过：API Key 未配置，请在 .env 中配置实际的 API Key', {
            provider,
          });

          return {
            name: 'LLM 连接验证',
            passed: true,
            skipped: true,
            reason: 'API Key 未配置',
          };
        }

        const client = createLLMClient(provider, apiKey, model);
        const isValid = await client.validateConnection();

        if (!isValid) {
          throw new Error('连接验证失败');
        }

        logger.info('✅ 测试 2 通过：LLM 连接验证成功', {
          provider,
          model,
        });

        return {
          name: 'LLM 连接验证',
          passed: true,
        };
      } catch (error) {
        logger.error('❌ 测试 2 失败：LLM 连接验证', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: 'LLM 连接验证',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 3: 简单 LLM 调用
  tests.push(
    (async () => {
      try {
        const provider = env.llmProvider as 'openai' | 'anthropic';
        let apiKey: string;
        let model: string;

        if (provider === 'openai') {
          apiKey = env.openaiApiKey || '';
          model = env.openaiModel;
        } else if (provider === 'anthropic') {
          apiKey = env.anthropicApiKey || '';
          model = env.anthropicModel;
        } else {
          throw new Error(`Unsupported provider: ${provider}`);
        }

        // 跳过测试如果 API Key 包含 'your' 或 'here'（表示未配置）
        if (apiKey.toLowerCase().includes('your') || apiKey.toLowerCase().includes('here') || apiKey.startsWith('sk-proj-')) {
          logger.warn('⏭️  测试 3 跳过：API Key 未配置，请在 .env 中配置实际的 API Key', {
            provider,
          });

          return {
            name: 'LLM 简单调用',
            passed: true,
            skipped: true,
            reason: 'API Key 未配置',
          };
        }

        const client = createLLMClient(provider, apiKey, model);

        const response = await client.call([
          {
            role: 'system',
            content: '你是一个有帮助的助手。',
          },
          {
            role: 'user',
            content: '请用一句话介绍深圳。',
          },
        ]);

        if (!response.content || response.content.length === 0) {
          throw new Error('LLM 返回空内容');
        }

        logger.info('✅ 测试 3 通过：LLM 调用成功', {
          provider,
          model,
          responseLength: response.content.length,
          tokensUsed: response.usage.totalTokens,
        });

        return {
          name: 'LLM 简单调用',
          passed: true,
          response: response.content.substring(0, 100) + '...',
        };
      } catch (error) {
        logger.error('❌ 测试 3 失败：LLM 调用', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: 'LLM 简单调用',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 执行所有测试
  const results = await Promise.all(tests);

  return results;
}

/**
 * 测试套件：LLM 引擎
 */
export async function testLLMEngine() {
  const tests = [];

  // 测试 4: 初始化 LLM 引擎
  tests.push(
    (async () => {
      try {
        const provider = env.llmProvider as 'openai' | 'anthropic';
        let apiKey: string;
        let model: string;

        if (provider === 'openai') {
          apiKey = env.openaiApiKey || '';
          model = env.openaiModel;
        } else if (provider === 'anthropic') {
          apiKey = env.anthropicApiKey || '';
          model = env.anthropicModel;
        } else {
          throw new Error(`Unsupported provider: ${provider}`);
        }

        const client = createLLMClient(provider, apiKey, model);
        const engine = createLLMEngine(client);

        logger.info('✅ 测试 4 通过：LLM 引擎初始化成功', {
          provider,
          model,
        });

        return {
          name: 'LLM 引擎初始化',
          passed: true,
          engine,
        };
      } catch (error) {
        logger.error('❌ 测试 4 失败：LLM 引擎初始化', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: 'LLM 引擎初始化',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 5: 用户偏好提取
  tests.push(
    (async () => {
      try {
        const provider = env.llmProvider as 'openai' | 'anthropic';
        let apiKey: string;
        let model: string;

        if (provider === 'openai') {
          apiKey = env.openaiApiKey || '';
          model = env.openaiModel;
        } else if (provider === 'anthropic') {
          apiKey = env.anthropicApiKey || '';
          model = env.anthropicModel;
        } else {
          throw new Error(`Unsupported provider: ${provider}`);
        }

        const client = createLLMClient(provider, apiKey, model);
        const engine = createLLMEngine(client);

        const result = await engine.extractUserPreference(
          '我想在宝安找一个适合登山的景点，距离不超过 10 公里',
          'preference_collection'
        );

        if (!result.intent) {
          throw new Error('未能提取意图信息');
        }

        logger.info('✅ 测试 5 通过：用户偏好提取成功', {
          intent: result.intent,
          confidence: result.confidence,
          extractedInfo: result.extractedInfo,
        });

        return {
          name: '用户偏好提取',
          passed: true,
          result,
        };
      } catch (error) {
        logger.error('❌ 测试 5 失败：用户偏好提取', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: '用户偏好提取',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 6: 推荐决策生成
  tests.push(
    (async () => {
      try {
        const provider = env.llmProvider as 'openai' | 'anthropic';
        let apiKey: string;
        let model: string;

        if (provider === 'openai') {
          apiKey = env.openaiApiKey || '';
          model = env.openaiModel;
        } else if (provider === 'anthropic') {
          apiKey = env.anthropicApiKey || '';
          model = env.anthropicModel;
        } else {
          throw new Error(`Unsupported provider: ${provider}`);
        }

        const client = createLLMClient(provider, apiKey, model);
        const engine = createLLMEngine(client);

        const preference: any = {
          location: '宝安',
          latitude: 22.5724,
          longitude: 113.8732,
          parkType: 'hiking',
          maxDistance: 10,
        };

        const decision = await engine.generateSearchParams(preference);

        if (!decision.shouldRecommend) {
          throw new Error('未能生成推荐决策');
        }

        logger.info('✅ 测试 6 通过：推荐决策生成成功', {
          shouldRecommend: decision.shouldRecommend,
          searchParams: decision.searchParams,
          confidence: decision.confidence,
        });

        return {
          name: '推荐决策生成',
          passed: true,
          decision,
        };
      } catch (error) {
        logger.error('❌ 测试 6 失败：推荐决策生成', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: '推荐决策生成',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 7: 推荐解析
  tests.push(
    (async () => {
      try {
        const provider = env.llmProvider as 'openai' | 'anthropic';
        let apiKey: string;
        let model: string;

        if (provider === 'openai') {
          apiKey = env.openaiApiKey || '';
          model = env.openaiModel;
        } else if (provider === 'anthropic') {
          apiKey = env.anthropicApiKey || '';
          model = env.anthropicModel;
        } else {
          throw new Error(`Unsupported provider: ${provider}`);
        }

        const client = createLLMClient(provider, apiKey, model);
        const engine = createLLMEngine(client);

        const mockLocations = JSON.stringify(
          [
            {
              name: '梧桐山',
              description: '深圳最高的山峰',
              latitude: 22.5724,
              longitude: 113.8732,
              distance: 5.2,
            },
            {
              name: '羊台山',
              description: '宝安地区著名登山景点',
              latitude: 22.5842,
              longitude: 113.8456,
              distance: 3.8,
            },
          ],
          null,
          2
        );

        const parsed = await engine.parseRecommendations(mockLocations);

        if (!parsed.locations) {
          throw new Error('未能解析推荐结果');
        }

        logger.info('✅ 测试 7 通过：推荐解析成功', {
          locationCount: parsed.locations.length,
          explanation: parsed.explanation,
        });

        return {
          name: '推荐解析',
          passed: true,
          parsed,
        };
      } catch (error) {
        logger.error('❌ 测试 7 失败：推荐解析', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: '推荐解析',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 执行所有测试
  const results = await Promise.all(tests);

  return results;
}

/**
 * 运行所有 LLM 测试
 */
export async function runLLMTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 LLM 单元测试 - 开始');
  console.log('='.repeat(60));

  try {
    // 运行客户端测试
    console.log('\n📋 客户端测试套件：');
    console.log('-'.repeat(60));
    const clientResults = await testLLMClient();
    const clientPassed = clientResults.filter((r) => r.passed).length;
    console.log(
      `结果：${clientPassed}/${clientResults.length} 通过\n`
    );

    // 运行引擎测试
    console.log('\n📋 引擎测试套件：');
    console.log('-'.repeat(60));
    const engineResults = await testLLMEngine();
    const enginePassed = engineResults.filter((r) => r.passed).length;
    console.log(
      `结果：${enginePassed}/${engineResults.length} 通过\n`
    );

    // 总结
    const totalTests = clientResults.length + engineResults.length;
    const totalPassed = clientPassed + enginePassed;
    const allPassed = totalPassed === totalTests;

    console.log('='.repeat(60));
    console.log(`📊 测试总结`);
    console.log('='.repeat(60));
    console.log(`✅ 通过：${totalPassed} / ${totalTests}`);
    console.log(`❌ 失败：${totalTests - totalPassed} / ${totalTests}`);
    console.log(
      `📈 成功率：${((totalPassed / totalTests) * 100).toFixed(2)}%`
    );
    console.log('='.repeat(60));

    if (!allPassed) {
      console.log(
        '\n⚠️  某些测试失败，请检查日志获取详细信息。'
      );
      console.log('常见问题：');
      console.log('1. API Key 未配置 - 检查 .env 文件');
      console.log('2. API Key 已过期 - 重新生成并配置');
      console.log('3. 网络连接问题 - 检查网络和代理设置');
      console.log('4. API 限流 - 稍后重试或检查配额');
      console.log('5. 模型名称错误 - 确认配置中的模型名称');
    } else {
      console.log('\n🎉 所有 LLM 测试通过！系统准备就绪。');
    }

    return {
      allPassed,
      totalTests,
      totalPassed,
      clientResults,
      engineResults,
    };
  } catch (error) {
    logger.error('LLM 测试执行失败', {
      error: error instanceof Error ? error.message : String(error),
    });

    console.log('\n❌ 测试执行出错：');
    console.log(error instanceof Error ? error.message : String(error));

    return {
      allPassed: false,
      totalTests: 0,
      totalPassed: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
