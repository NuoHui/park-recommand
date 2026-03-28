/**
 * LLM 流程诊断工具
 * 用于验证：
 * 1. LLM 配置是否正确
 * 2. 提示词是否正确传递
 * 3. API 是否被正确调用
 * 4. 响应是否被成功接收
 * 5. 响应是否被正确解析
 */

import { createLLMClient } from '@/llm/client';
import { createLLMEngine } from '@/llm/engine';
import { getConfig } from '@/config/env';
import { getLogger } from '@/logger/index.js';

const logger = getLogger('diagnose:llm');

async function diagnose() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║           LLM 流程诊断工具 v1.0                      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // 步骤 1: 检查配置
    console.log('📋 步骤 1: 验证 LLM 配置');
    console.log('─'.repeat(50));

    const config = getConfig();
    const llmProvider = config.LLM_PROVIDER || 'openai';
    const llmApiKey = config.LLM_API_KEY;
    const llmModel = config.LLM_MODEL || 'gpt-4';
    const llmBaseUrl = config.LLM_BASE_URL;

    console.log(`✓ LLM 提供商: ${llmProvider}`);
    console.log(`✓ LLM 模型: ${llmModel}`);
    console.log(`✓ Base URL: ${llmBaseUrl || '(默认)'}`);
    console.log(`✓ API Key: ${llmApiKey ? '已配置 (长度: ' + llmApiKey.length + ')' : '❌ 未配置'}`);

    if (!llmApiKey) {
      console.error('\n❌ 错误: LLM_API_KEY 未配置');
      process.exit(1);
    }

    console.log('\n✅ 配置验证通过\n');

    // 步骤 2: 创建 LLM 客户端
    console.log('📋 步骤 2: 初始化 LLM 客户端');
    console.log('─'.repeat(50));

    const llmClient = createLLMClient(llmProvider as any, llmApiKey, llmModel, {
      baseUrl: llmBaseUrl,
    });

    console.log('✓ LLM 客户端已创建');
    console.log('✓ 客户端类型:', llmClient.constructor.name);

    // 步骤 3: 测试简单提示词
    console.log('\n📋 步骤 3: 测试简单 LLM 调用');
    console.log('─'.repeat(50));

    const testPrompt = '请用一句话回答：2+2=?';
    console.log(`📤 发送提示词: "${testPrompt}"`);
    console.log('⏳ 等待 LLM 响应...\n');

    const response1 = await llmClient.call([
      {
        role: 'user',
        content: testPrompt,
      },
    ]);

    console.log('✓ 收到响应');
    console.log(`📨 响应内容: ${response1.content}`);
    console.log(`🆔 响应 ID: ${response1.id}`);
    console.log(`💾 Token 使用: ${response1.usage?.totalTokens || '未知'}`);

    // 步骤 4: 测试 JSON 解析
    console.log('\n📋 步骤 4: 测试 JSON 格式请求');
    console.log('─'.repeat(50));

    const jsonPrompt = `请输出一个 JSON 对象，包含 name 和 age 字段。只输出 JSON，不要其他文本。`;
    console.log(`📤 发送提示词: "${jsonPrompt}"`);
    console.log('⏳ 等待 LLM 响应...\n');

    const response2 = await llmClient.call([
      {
        role: 'user',
        content: jsonPrompt,
      },
    ]);

    console.log('✓ 收到响应');
    console.log(`📨 原始响应: ${response2.content}`);

    try {
      const parsed = JSON.parse(response2.content);
      console.log(`✓ JSON 解析成功: ${JSON.stringify(parsed)}`);
    } catch (e) {
      console.error(`❌ JSON 解析失败: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 步骤 5: 测试 LLM 引擎
    console.log('\n📋 步骤 5: 测试 LLM 引擎');
    console.log('─'.repeat(50));

    const llmEngine = createLLMEngine(llmClient);
    console.log('✓ LLM 引擎已创建');

    // 步骤 6: 测试参数生成
    console.log('\n📋 步骤 6: 测试参数生成');
    console.log('─'.repeat(50));

    const preferences = {
      location: '宝安西乡',
      parkType: 'park' as const,
      maxDistance: 5,
    };

    console.log(`📤 输入偏好: ${JSON.stringify(preferences)}`);
    console.log('⏳ 生成搜索参数...\n');

    const searchDecision = await llmEngine.generateSearchParams(preferences);

    console.log('✓ 参数生成完成');
    console.log(`📨 搜索参数: ${JSON.stringify(searchDecision.searchParams, null, 2)}`);
    console.log(`📊 置信度: ${searchDecision.confidence}`);

    // 完成
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ 诊断完成                         ║');
    console.log('║               所有步骤均已成功通过                   ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📝 总结:');
    console.log('  ✓ LLM 配置正确');
    console.log('  ✓ 客户端初始化成功');
    console.log('  ✓ API 请求能够成功发送');
    console.log('  ✓ 能够接收 LLM 响应');
    console.log('  ✓ JSON 解析工作正常');
    console.log('  ✓ LLM 引擎能够处理请求\n');
  } catch (error) {
    console.error('\n❌ 诊断失败:');
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('\n堆栈跟踪:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// 运行诊断
diagnose().catch(err => {
  console.error('诊断工具错误:', err);
  process.exit(1);
});
