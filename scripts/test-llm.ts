#!/usr/bin/env node

/**
 * LLM 快速测试脚本
 * 用于快速验证 LLM 是否正常工作
 *
 * 使用方法：
 * tsx scripts/test-llm.ts
 */

import { LLMClient, createLLMClient } from '@/llm/client';
import { LLMEngine, createLLMEngine } from '@/llm/engine';
import { env } from '@/config/env';
import { createLogger } from '@/utils/logger';

const logger = createLogger('test:llm:quick');

/**
 * 颜色输出辅助函数
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function success(msg: string) {
  console.log(`${colors.green}✅ ${msg}${colors.reset}`);
}

function error(msg: string) {
  console.log(`${colors.red}❌ ${msg}${colors.reset}`);
}

function warning(msg: string) {
  console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`);
}

function info(msg: string) {
  console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`);
}

function section(title: string) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
}

/**
 * 验证环境配置
 */
async function verifyEnvironment(): Promise<boolean> {
  section('1️⃣  环境配置验证');

  const provider = env.llmProvider;
  info(`LLM 提供商: ${provider}`);

  if (provider === 'openai') {
    if (!env.openaiApiKey) {
      error('缺少 OPENAI_API_KEY 配置');
      return false;
    }
    info(`模型: ${env.openaiModel}`);
    success('OpenAI API Key 已配置');
  } else if (provider === 'anthropic') {
    if (!env.anthropicApiKey) {
      error('缺少 ANTHROPIC_API_KEY 配置');
      return false;
    }
    info(`模型: ${env.anthropicModel}`);
    success('Anthropic API Key 已配置');
  } else {
    error(`不支持的提供商: ${provider}`);
    return false;
  }

  return true;
}

/**
 * 测试 LLM 连接
 */
async function testConnection(): Promise<boolean> {
  section('2️⃣  LLM 连接测试');

  try {
    const provider = env.llmProvider as 'openai' | 'anthropic';
    let apiKey: string;
    let model: string;

    if (provider === 'openai') {
      apiKey = env.openaiApiKey || '';
      model = env.openaiModel;
    } else {
      apiKey = env.anthropicApiKey || '';
      model = env.anthropicModel;
    }

    info(`正在连接到 ${provider} (模型: ${model})...`);

    const client = createLLMClient(provider, apiKey, model);
    const isValid = await client.validateConnection();

    if (!isValid) {
      error('连接验证失败');
      return false;
    }

    success('连接验证成功！');
    return true;
  } catch (err) {
    error(`连接失败: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

/**
 * 测试基础调用
 */
async function testBasicCall(): Promise<boolean> {
  section('3️⃣  基础调用测试');

  try {
    const provider = env.llmProvider as 'openai' | 'anthropic';
    let apiKey: string;
    let model: string;

    if (provider === 'openai') {
      apiKey = env.openaiApiKey || '';
      model = env.openaiModel;
    } else {
      apiKey = env.anthropicApiKey || '';
      model = env.anthropicModel;
    }

    info('正在调用 LLM 进行简单测试...');

    const client = createLLMClient(provider, apiKey, model, {
      temperature: 0.5,
      maxTokens: 500,
    });

    const response = await client.call([
      {
        role: 'system',
        content: '你是一个有帮助的助手。',
      },
      {
        role: 'user',
        content: '请用一句话介绍深圳这个城市。',
      },
    ]);

    info(`响应内容（前 100 字）:\n${colors.cyan}${response.content.substring(0, 100)}...${colors.reset}`);
    info(`Token 使用: ${response.usage.totalTokens}`);
    success('基础调用成功！');
    return true;
  } catch (err) {
    error(`调用失败: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

/**
 * 测试用户偏好提取
 */
async function testPreferenceExtraction(): Promise<boolean> {
  section('4️⃣  用户偏好提取测试');

  try {
    const provider = env.llmProvider as 'openai' | 'anthropic';
    let apiKey: string;
    let model: string;

    if (provider === 'openai') {
      apiKey = env.openaiApiKey || '';
      model = env.openaiModel;
    } else {
      apiKey = env.anthropicApiKey || '';
      model = env.anthropicModel;
    }

    info('正在提取用户偏好信息...');

    const client = createLLMClient(provider, apiKey, model);
    const engine = createLLMEngine(client);

    const result = await engine.extractUserPreference(
      '我想在宝安找一个适合登山的景点，距离不超过 10 公里',
      'preference_collection'
    );

    info(`意图: ${result.intent}`);
    info(`置信度: ${result.confidence}`);
    info(`提取信息:`, JSON.stringify(result.extractedInfo, null, 2));

    if (result.intent) {
      success('用户偏好提取成功！');
      return true;
    } else {
      warning('未能正确提取用户偏好');
      return false;
    }
  } catch (err) {
    error(`提取失败: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

/**
 * 测试推荐决策生成
 */
async function testRecommendationDecision(): Promise<boolean> {
  section('5️⃣  推荐决策生成测试');

  try {
    const provider = env.llmProvider as 'openai' | 'anthropic';
    let apiKey: string;
    let model: string;

    if (provider === 'openai') {
      apiKey = env.openaiApiKey || '';
      model = env.openaiModel;
    } else {
      apiKey = env.anthropicApiKey || '';
      model = env.anthropicModel;
    }

    info('正在生成推荐决策...');

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

    info(`应该推荐: ${decision.shouldRecommend}`);
    info(`搜索参数:`, JSON.stringify(decision.searchParams, null, 2));
    info(`置信度: ${decision.confidence}`);

    if (decision.shouldRecommend) {
      success('推荐决策生成成功！');
      return true;
    } else {
      warning('无法生成推荐决策');
      return false;
    }
  } catch (err) {
    error(`生成失败: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

/**
 * 测试推荐解析
 */
async function testRecommendationParsing(): Promise<boolean> {
  section('6️⃣  推荐解析测试');

  try {
    const provider = env.llmProvider as 'openai' | 'anthropic';
    let apiKey: string;
    let model: string;

    if (provider === 'openai') {
      apiKey = env.openaiApiKey || '';
      model = env.openaiModel;
    } else {
      apiKey = env.anthropicApiKey || '';
      model = env.anthropicModel;
    }

    info('正在解析推荐结果...');

    const client = createLLMClient(provider, apiKey, model);
    const engine = createLLMEngine(client);

    const mockLocations = JSON.stringify(
      [
        {
          name: '梧桐山',
          description: '深圳最高的山峰，海拔 943 米',
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

    info(`解析出 ${parsed.locations.length} 个景点`);
    info(`说明: ${parsed.explanation}`);

    if (parsed.locations.length > 0) {
      success('推荐解析成功！');
      return true;
    } else {
      warning('未能解析出推荐景点');
      return false;
    }
  } catch (err) {
    error(`解析失败: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║          🧪 LLM 功能快速测试脚本                            ║
║                                                            ║
║  此脚本用于验证 LLM 是否可以正常工作                        ║
╚════════════════════════════════════════════════════════════╝
  `);

  const results: Record<string, boolean> = {};

  try {
    // 1. 验证环境配置
    results['环境配置'] = await verifyEnvironment();
    if (!results['环境配置']) {
      error('\n❌ 环境配置失败，停止测试');
      process.exit(1);
    }

    // 2. 测试连接
    results['连接测试'] = await testConnection();
    if (!results['连接测试']) {
      warning('\n⚠️  无法连接到 LLM 服务，跳过后续测试');
    } else {
      // 3. 基础调用
      results['基础调用'] = await testBasicCall();

      // 4. 用户偏好提取
      results['用户偏好提取'] = await testPreferenceExtraction();

      // 5. 推荐决策生成
      results['推荐决策生成'] = await testRecommendationDecision();

      // 6. 推荐解析
      results['推荐解析'] = await testRecommendationParsing();
    }

    // 总结
    section('📊 测试总结');

    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter((r) => r).length;

    console.log('');
    for (const [name, passed] of Object.entries(results)) {
      if (passed) {
        success(`${name}`);
      } else {
        error(`${name}`);
      }
    }

    console.log('');
    info(`通过: ${passedTests} / ${totalTests}`);

    if (passedTests === totalTests) {
      console.log(`
${colors.green}🎉 所有测试通过！LLM 系统准备就绪。${colors.reset}
      `);
      process.exit(0);
    } else {
      console.log(`
${colors.yellow}⚠️  部分测试失败，请检查错误信息。${colors.reset}

常见问题排查：
1. API Key 配置: 检查 .env 文件中的 API Key
2. 网络连接: 确保网络连接正常，无代理或防火墙阻止
3. API 限额: 检查 API 配额是否已用尽
4. 模型名称: 确认使用的模型名称正确
5. 超时设置: 如果响应缓慢，可能需要调整超时时间

更多帮助请查看: docs/TROUBLESHOOTING.md
      `);
      process.exit(1);
    }
  } catch (err) {
    error('\n❌ 测试执行过程中发生错误：');
    console.error(err);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
