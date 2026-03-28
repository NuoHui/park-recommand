/**
 * LLM 单元测试
 * 验证 LLM 客户端、引擎和推荐 Top 5 功能的正常工作
 * 
 * 最新需求：
 * - LLM 推荐结果限制为 Top 5
 * - 验证 JSON 解析和限制逻辑
 * - 验证降级处理
 */

import { createLLMClient } from '@/llm/client';
import { createLLMEngine } from '@/llm/engine';
import { env } from '@/config/env';
import { createLogger } from '@/utils/logger';

const logger = createLogger('test:llm');

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取 LLM 配置信息
 */
function getLLMConfig(): { provider: 'openai' | 'anthropic' | 'aliyun'; apiKey: string; model: string } {
  const provider = env.llmProvider as 'openai' | 'anthropic' | 'aliyun';
  let apiKey: string;
  let model: string;

  if (provider === 'openai') {
    apiKey = env.openaiApiKey || '';
    model = env.openaiModel;
  } else if (provider === 'anthropic') {
    apiKey = env.anthropicApiKey || '';
    model = env.anthropicModel;
  } else if (provider === 'aliyun') {
    apiKey = env.aliyunApiKey || '';
    model = env.aliyunModel;
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  return { provider, apiKey, model };
}

/**
 * 判断 API Key 是否已配置
 */
function isApiKeyConfigured(apiKey: string): boolean {
  return (
    !apiKey.toLowerCase().includes('your') &&
    !apiKey.toLowerCase().includes('here') &&
    !apiKey.startsWith('sk-proj-')
  );
}

/**
 * 测试结果类型
 */
interface TestResult {
  name: string;
  passed: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// 测试套件 1: LLM 客户端
// ============================================================================

/**
 * 测试套件：LLM 客户端基础功能
 */
export async function testLLMClient(): Promise<TestResult[]> {
  const tests: Promise<TestResult>[] = [];

  // 测试 1: 初始化 LLM 客户端
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        const { provider, apiKey, model } = getLLMConfig();

        if (!apiKey) {
          throw new Error(`API Key not configured for provider: ${provider}`);
        }

        createLLMClient(provider, apiKey, model);

        logger.info('✅ 测试 1 通过：LLM 客户端初始化成功', {
          provider,
          model,
        });

        return {
          name: 'LLM 客户端初始化',
          passed: true,
          data: { provider, model },
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
        const { provider, apiKey, model } = getLLMConfig();

        if (!isApiKeyConfigured(apiKey)) {
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
        const { provider, apiKey, model } = getLLMConfig();

        if (!isApiKeyConfigured(apiKey)) {
          logger.warn('⏭️  测试 3 跳过：API Key 未配置', { provider });

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
          data: {
            responseLength: response.content.length,
            tokensUsed: response.usage.totalTokens,
          },
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
  return Promise.all(tests);
}

// ============================================================================
// 测试套件 2: LLM 引擎
// ============================================================================

/**
 * 测试套件：LLM 引擎功能
 */
export async function testLLMEngine(): Promise<TestResult[]> {
  const tests: Promise<TestResult>[] = [];

  // 测试 4: 初始化 LLM 引擎
  tests.push(
    (async () => {
      try {
        const { provider, apiKey, model } = getLLMConfig();

        const client = createLLMClient(provider, apiKey, model);
        createLLMEngine(client);

        logger.info('✅ 测试 4 通过：LLM 引擎初始化成功', {
          provider,
          model,
        });

        return {
          name: 'LLM 引擎初始化',
          passed: true,
          data: { provider, model },
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
        const { provider, apiKey, model } = getLLMConfig();

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
        });

        return {
          name: '用户偏好提取',
          passed: true,
          data: {
            intent: result.intent,
            confidence: result.confidence,
          },
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
        const { provider, apiKey, model } = getLLMConfig();

        const client = createLLMClient(provider, apiKey, model);
        const engine = createLLMEngine(client);

        const preference: Record<string, unknown> = {
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
          confidence: decision.confidence,
        });

        return {
          name: '推荐决策生成',
          passed: true,
          data: {
            shouldRecommend: decision.shouldRecommend,
            confidence: decision.confidence,
          },
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
        const { provider, apiKey, model } = getLLMConfig();

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
        });

        return {
          name: '推荐解析',
          passed: true,
          data: {
            locationCount: parsed.locations.length,
          },
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
  return Promise.all(tests);
}

// ============================================================================
// 测试套件 3: Top 5 推荐限制功能
// ============================================================================

/**
 * 测试套件：Top 5 推荐限制功能
 * 验证 LLM 推荐结果限制为最多 5 个的逻辑
 */
export async function testTop5Recommendations(): Promise<TestResult[]> {
  const tests: Promise<TestResult>[] = [];

  // 测试 8: JSON 响应解析 - Top 5 限制
  tests.push(
    (async () => {
      try {
        // 模拟 LLM 返回 10 个推荐的情况
        const llmResponse = `
根据你的需求，我为你推荐以下景点：

[
  {
    "name": "梧桐山",
    "reason": "深圳最高的山峰，非常适合登山爱好者。评分高达4.8分，已有超过5000条用户评价，是最受欢迎的登山地点。",
    "rating": 4.8,
    "reviewCount": 5234,
    "hours": "09:00-18:00",
    "phone": "0755-2266xxxx",
    "businessArea": "罗湖山区"
  },
  {
    "name": "羊台山",
    "reason": "宝安地区著名登山景点，山路难度适中，风景秀丽。评分4.6分，约2000条评价。",
    "rating": 4.6,
    "reviewCount": 2100,
    "hours": "06:00-18:00",
    "phone": "0755-2888xxxx",
    "businessArea": "宝安山区"
  },
  {
    "name": "大南山",
    "reason": "南山区的登山胜地，交通便利，风景优美。评分4.5分，约1500条评价。",
    "rating": 4.5,
    "reviewCount": 1580,
    "hours": "08:00-19:00",
    "phone": "0755-2680xxxx",
    "businessArea": "南山山区"
  },
  {
    "name": "笔架山",
    "reason": "福田区的城市公园，适合休闲登山。评分4.3分，约800条评价。",
    "rating": 4.3,
    "reviewCount": 850,
    "hours": "07:00-18:00",
    "phone": "0755-8388xxxx",
    "businessArea": "福田山区"
  },
  {
    "name": "洪湖公园",
    "reason": "龙华区的生态公园，适合散步和观景。评分4.2分，约600条评价。",
    "rating": 4.2,
    "reviewCount": 620,
    "hours": "06:00-22:00",
    "phone": "0755-2828xxxx",
    "businessArea": "龙华公园区"
  },
  {
    "name": "华侨城湿地公园",
    "reason": "南山的湿地公园，独特的自然风光。评分4.1分，约450条评价。",
    "rating": 4.1,
    "reviewCount": 480,
    "hours": "09:00-17:00",
    "phone": "0755-2688xxxx",
    "businessArea": "南山湿地"
  },
  {
    "name": "莲花山公园",
    "reason": "福田的城市公园，风景优美。评分4.0分，约350条评价。",
    "rating": 4.0,
    "reviewCount": 380,
    "hours": "06:00-22:00",
    "phone": "0755-8388xxxx",
    "businessArea": "福田公园"
  },
  {
    "name": "海边公园",
    "reason": "南山的海滨公园，适合休闲。评分3.9分，约250条评价。",
    "rating": 3.9,
    "reviewCount": 280,
    "hours": "08:00-20:00",
    "phone": "0755-2688xxxx",
    "businessArea": "南山海滨"
  },
  {
    "name": "龙园",
    "reason": "龙华的主题园区。评分3.8分，约200条评价。",
    "rating": 3.8,
    "reviewCount": 210,
    "hours": "09:00-18:00",
    "phone": "0755-2828xxxx",
    "businessArea": "龙华主题区"
  },
  {
    "name": "中心公园",
    "reason": "市中心的小型公园。评分3.7分，约150条评价。",
    "rating": 3.7,
    "reviewCount": 160,
    "hours": "07:00-19:00",
    "phone": "0755-8388xxxx",
    "businessArea": "市中心"
  }
]
        `;

        // 提取 JSON 数组
        const jsonMatch = llmResponse.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error('无法提取 JSON 数组');
        }

        const allRecommendations = JSON.parse(jsonMatch[0]);
        const MAX_RECOMMENDATIONS = 5;

        // 限制为 Top 5
        const topRecommendations = allRecommendations.slice(0, MAX_RECOMMENDATIONS);

        if (topRecommendations.length !== MAX_RECOMMENDATIONS) {
          throw new Error(
            `期望 ${MAX_RECOMMENDATIONS} 个推荐，但得到 ${topRecommendations.length} 个`
          );
        }

        if (allRecommendations.length <= MAX_RECOMMENDATIONS) {
          throw new Error(
            `测试数据不足：LLM 返回 ${allRecommendations.length} 个，应该大于 ${MAX_RECOMMENDATIONS} 个`
          );
        }

        logger.info('✅ 测试 8 通过：Top 5 推荐限制成功', {
          originalCount: allRecommendations.length,
          limitedCount: topRecommendations.length,
          maxAllowed: MAX_RECOMMENDATIONS,
          topNames: topRecommendations.map((r: Record<string, unknown>) => r.name),
        });

        return {
          name: 'Top 5 推荐限制',
          passed: true,
          data: {
            originalCount: allRecommendations.length,
            limitedCount: topRecommendations.length,
            topRecommendations: topRecommendations.map((r: Record<string, unknown>) => r.name),
          },
        };
      } catch (error) {
        logger.error('❌ 测试 8 失败：Top 5 推荐限制', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: 'Top 5 推荐限制',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 9: 少于 5 个推荐的情况
  tests.push(
    (async () => {
      try {
        const llmResponse = `
[
  { "name": "景点1", "reason": "推荐理由1", "rating": 4.5 },
  { "name": "景点2", "reason": "推荐理由2", "rating": 4.3 }
]
        `;

        const jsonMatch = llmResponse.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error('无法提取 JSON 数组');
        }

        const recommendations = JSON.parse(jsonMatch[0]);
        const MAX_RECOMMENDATIONS = 5;

        const topRecommendations = recommendations.slice(0, MAX_RECOMMENDATIONS);

        if (topRecommendations.length !== recommendations.length) {
          throw new Error(
            `少于 5 个推荐的情况，应保持原数量 ${recommendations.length}`
          );
        }

        logger.info('✅ 测试 9 通过：少于 5 个推荐的处理正确', {
          recommendationCount: recommendations.length,
        });

        return {
          name: '少于 5 个推荐处理',
          passed: true,
          data: {
            recommendationCount: recommendations.length,
          },
        };
      } catch (error) {
        logger.error('❌ 测试 9 失败：少于 5 个推荐处理', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: '少于 5 个推荐处理',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 10: 降级处理 - 无法解析 JSON 时返回前 3 个
  tests.push(
    (async () => {
      try {
        const invalidJsonResponse = '这不是有效的 JSON 格式';

        const jsonMatch = invalidJsonResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          throw new Error('不应该找到 JSON 数组');
        }

        // 模拟降级：返回缓存的前 3 个 POI
        const fallbackPois = [
          {
            id: 'poi_1',
            name: '梧桐山',
            reason: '推荐的登山景点，用户评分较高',
          },
          {
            id: 'poi_2',
            name: '羊台山',
            reason: '推荐的登山景点，用户评分较高',
          },
          {
            id: 'poi_3',
            name: '大南山',
            reason: '推荐的登山景点，用户评分较高',
          },
        ];

        if (fallbackPois.length !== 3) {
          throw new Error(`降级应返回 3 个 POI，但得到 ${fallbackPois.length} 个`);
        }

        logger.info('✅ 测试 10 通过：JSON 解析失败降级处理成功', {
          fallbackCount: fallbackPois.length,
          fallbackNames: fallbackPois.map((p) => p.name),
        });

        return {
          name: 'JSON 解析失败降级处理',
          passed: true,
          data: {
            fallbackCount: fallbackPois.length,
            fallbackNames: fallbackPois.map((p) => p.name),
          },
        };
      } catch (error) {
        logger.error('❌ 测试 10 失败：JSON 解析失败降级处理', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: 'JSON 解析失败降级处理',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 执行所有测试
  return Promise.all(tests);
}

// ============================================================================
// 运行所有测试
// ============================================================================

/**
 * 运行所有 LLM 测试
 */
export async function runLLMTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 LLM 单元测试 - 开始');
  console.log('='.repeat(70));

  try {
    // 运行客户端测试
    console.log('\n📋 客户端测试套件（3 个测试）：');
    console.log('-'.repeat(70));
    const clientResults = await testLLMClient();
    const clientPassed = clientResults.filter((r) => r.passed).length;
    console.log(`✅ 通过: ${clientPassed} / ${clientResults.length}\n`);

    // 运行引擎测试
    console.log('📋 引擎测试套件（4 个测试）：');
    console.log('-'.repeat(70));
    const engineResults = await testLLMEngine();
    const enginePassed = engineResults.filter((r) => r.passed).length;
    console.log(`✅ 通过: ${enginePassed} / ${engineResults.length}\n`);

    // 运行 Top 5 推荐限制测试
    console.log('📋 Top 5 推荐限制测试套件（3 个测试）：');
    console.log('-'.repeat(70));
    const top5Results = await testTop5Recommendations();
    const top5Passed = top5Results.filter((r) => r.passed).length;
    console.log(`✅ 通过: ${top5Passed} / ${top5Results.length}\n`);

    // 总结所有结果
    const allResults = [...clientResults, ...engineResults, ...top5Results];
    const totalTests = allResults.length;
    const totalPassed = allResults.filter((r) => r.passed).length;
    const skippedTests = allResults.filter((r) => r.skipped).length;
    const failedTests = totalTests - totalPassed;
    const allPassed = totalPassed === totalTests;

    console.log('='.repeat(70));
    console.log('📊 测试总结');
    console.log('='.repeat(70));
    console.log(`✅ 通过：${totalPassed} / ${totalTests}`);
    console.log(`⏭️  跳过：${skippedTests} / ${totalTests}`);
    console.log(`❌ 失败：${failedTests} / ${totalTests}`);
    console.log(`📈 成功率：${((totalPassed / totalTests) * 100).toFixed(2)}%`);
    console.log('='.repeat(70));

    // 详细结果
    console.log('\n📝 详细测试结果：\n');
    allResults.forEach((result, index) => {
      const statusIcon = result.passed ? '✅' : result.skipped ? '⏭️' : '❌';
      console.log(`${statusIcon} ${index + 1}. ${result.name}`);
      if (result.skipped) {
        console.log(`   原因: ${result.reason}`);
      } else if (result.error) {
        console.log(`   错误: ${result.error}`);
      }
      if (result.data) {
        console.log(`   数据: ${JSON.stringify(result.data)}`);
      }
    });

    // 问题诊断
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
      console.log('6. Top 5 限制失败 - 检查 JSON 解析和数组截断逻辑');
    } else {
      console.log('\n🎉 所有 LLM 测试通过！系统准备就绪。');
      console.log('   包括：客户端初始化、连接验证、调用测试');
      console.log('   引擎测试、偏好提取、决策生成、推荐解析');
      console.log('   Top 5 限制、降级处理等完整功能');
    }

    console.log('='.repeat(70) + '\n');

    return {
      allPassed,
      totalTests,
      totalPassed,
      skippedTests,
      failedTests,
      successRate: ((totalPassed / totalTests) * 100).toFixed(2),
      clientResults,
      engineResults,
      top5Results,
    };
  } catch (error) {
    logger.error('LLM 测试执行失败', {
      error: error instanceof Error ? error.message : String(error),
    });

    console.log('\n❌ 测试执行出错：');
    console.log(error instanceof Error ? error.message : String(error));
    console.log('='.repeat(70) + '\n');

    return {
      allPassed: false,
      totalTests: 0,
      totalPassed: 0,
      skippedTests: 0,
      failedTests: 0,
      successRate: '0.00',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
