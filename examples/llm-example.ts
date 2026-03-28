/**
 * LLM 服务集成示例
 * 演示如何使用 OpenAI/Claude API 进行景点推荐对话
 */

import { getLLMService, createLLMClient, createLLMEngine } from '@/llm/service';
import { LLMMessage, LLMProvider, DialogueRequest } from '@/types/llm';
import { UserPreference, DialogueMessage } from '@/types/common';
import { ParkType, DifficultyLevel } from '@/config/constants';
import { v4 as uuidv4 } from 'uuid';

/**
 * 示例 1: 直接使用 LLM 客户端
 */
async function example1_basicClientUsage() {
  console.log('\n=== 示例 1: 基础客户端使用 ===\n');

  const client = createLLMClient('openai', process.env.OPENAI_API_KEY || '', 'gpt-4-turbo-preview', {
    temperature: 0.7,
    maxTokens: 1000,
  });

  const messages: LLMMessage[] = [
    {
      role: 'system',
      content: '你是深圳景点推荐助手。',
    },
    {
      role: 'user',
      content: '推荐一个南山区的公园。',
    },
  ];

  try {
    const response = await client.call(messages);

    console.log('LLM 响应:');
    console.log(`内容: ${response.content}`);
    console.log(`Token 用量: ${response.usage.totalTokens}`);
    console.log(`模型: ${response.model}`);
  } catch (error) {
    console.error('错误:', error);
  }
}

/**
 * 示例 2: 使用 LLM 引擎进行单轮对话
 */
async function example2_singleDialogueTurn() {
  console.log('\n=== 示例 2: 单轮对话处理 ===\n');

  const client = createLLMClient('openai', process.env.OPENAI_API_KEY || '', 'gpt-4-turbo-preview');
  const engine = createLLMEngine(client);

  const sessionId = uuidv4();
  const request: DialogueRequest = {
    sessionId,
    userInput: '我想在南山找个公园散步',
    preferences: {
      location: '南山',
    },
    conversationHistory: [],
    currentPhase: 'collecting_location',
  };

  try {
    const response = await engine.processDialogue(request);

    console.log('助手回复:', response.assistantMessage);
    if (response.updatedPreferences) {
      console.log('更新的偏好:', response.updatedPreferences);
    }
  } catch (error) {
    console.error('错误:', error);
  }
}

/**
 * 示例 3: 意图解析
 */
async function example3_intentParsing() {
  console.log('\n=== 示例 3: 意图解析 ===\n');

  const client = createLLMClient('openai', process.env.OPENAI_API_KEY || '', 'gpt-4-turbo-preview');
  const engine = createLLMEngine(client);

  const testInputs = [
    '我想在南山散步',
    '3 公里以内有什么推荐吗？',
    '什么是登山难度？',
    '好的，我已准备好听推荐了',
  ];

  for (const input of testInputs) {
    try {
      const parsing = await engine.extractUserPreference(input, 'collecting_location');

      console.log(`\n输入: "${input}"`);
      console.log(`意图: ${parsing.intent}`);
      console.log(`信心度: ${parsing.confidence}`);
      if (parsing.extractedInfo && Object.keys(parsing.extractedInfo).length > 0) {
        console.log('提取信息:', parsing.extractedInfo);
      }
    } catch (error) {
      console.error('错误:', error);
    }
  }
}

/**
 * 示例 4: 推荐决策生成
 */
async function example4_recommendationDecision() {
  console.log('\n=== 示例 4: 推荐决策生成 ===\n');

  const client = createLLMClient('openai', process.env.OPENAI_API_KEY || '', 'gpt-4-turbo-preview');
  const engine = createLLMEngine(client);

  // 用户偏好
  const preferences: UserPreference = {
    location: '南山区',
    latitude: 22.5,
    longitude: 113.9,
    parkType: ParkType.PARK,
    maxDistance: 5,
    preferredTags: ['户外', '散步'],
  };

  try {
    // 检查是否可以推荐
    const decision = await engine.shouldRecommend(preferences);

    console.log('推荐决策:');
    console.log(`可以推荐: ${decision.shouldRecommend}`);
    console.log(`推荐理由: ${decision.reasoning}`);
    console.log(`信心度: ${decision.confidence}`);

    if (decision.shouldRecommend) {
      console.log('\n搜索参数:');
      console.log(JSON.stringify(decision.searchParams, null, 2));
    } else if (decision.missingInfo) {
      console.log(`\n缺失信息: ${decision.missingInfo.join(', ')}`);
    }
  } catch (error) {
    console.error('错误:', error);
  }
}

/**
 * 示例 5: 生成搜索参数
 */
async function example5_generateSearchParams() {
  console.log('\n=== 示例 5: 生成搜索参数 ===\n');

  const client = createLLMClient('openai', process.env.OPENAI_API_KEY || '', 'gpt-4-turbo-preview');
  const engine = createLLMEngine(client);

  const preferences: UserPreference = {
    location: '福田中心',
    parkType: ParkType.BOTH,
    maxDistance: 10,
    minDifficulty: DifficultyLevel.EASY,
    maxDifficulty: DifficultyLevel.MEDIUM,
  };

  try {
    const decision = await engine.generateSearchParams(preferences);

    console.log('生成的搜索参数:');
    console.log(JSON.stringify(decision.searchParams, null, 2));
    console.log(`\n推荐理由: ${decision.reasoning}`);
    console.log(`信心度: ${decision.confidence}`);
  } catch (error) {
    console.error('错误:', error);
  }
}

/**
 * 示例 6: 生成下一个提问
 */
async function example6_generateNextQuestion() {
  console.log('\n=== 示例 6: 生成下一个提问 ===\n');

  const client = createLLMClient('openai', process.env.OPENAI_API_KEY || '', 'gpt-4-turbo-preview');
  const engine = createLLMEngine(client);

  const phases = [
    'greeting',
    'collecting_location',
    'collecting_type',
    'collecting_distance',
    'querying',
  ];

  const preferences: UserPreference = {
    location: '南山',
    parkType: ParkType.PARK,
    maxDistance: 5,
  };

  for (const phase of phases) {
    try {
      const question = await engine.generateNextQuestion(preferences, phase);
      console.log(`${phase}: ${question}`);
    } catch (error) {
      console.error(`生成失败 (${phase}):`, error);
    }
  }
}

/**
 * 示例 7: 完整对话流程模拟
 */
async function example7_completeDialogueFlow() {
  console.log('\n=== 示例 7: 完整对话流程 ===\n');

  const client = createLLMClient('openai', process.env.OPENAI_API_KEY || '', 'gpt-4-turbo-preview');
  const engine = createLLMEngine(client);
  const sessionId = uuidv4();

  const dialogueSteps = [
    {
      phase: 'greeting',
      userInput: '你好，我想找个公园散步',
      preferences: {},
    },
    {
      phase: 'collecting_location',
      userInput: '我在南山',
      preferences: { location: '南山' },
    },
    {
      phase: 'collecting_type',
      userInput: '公园就可以',
      preferences: { location: '南山', parkType: ParkType.PARK },
    },
    {
      phase: 'collecting_distance',
      userInput: '3 公里以内',
      preferences: {
        location: '南山',
        parkType: ParkType.PARK,
        maxDistance: 3,
      },
    },
  ];

  for (const step of dialogueSteps) {
    try {
      const request: DialogueRequest = {
        sessionId,
        userInput: step.userInput,
        preferences: step.preferences as any,
        conversationHistory: [],
        currentPhase: step.phase,
      };

      const response = await engine.processDialogue(request);

      console.log(`\n阶段: ${step.phase}`);
      console.log(`用户: ${step.userInput}`);
      console.log(`助手: ${response.assistantMessage}`);
    } catch (error) {
      console.error(`错误 (${step.phase}):`, error);
    }
  }
}

/**
 * 示例 8: 使用 LLM 服务单例
 */
async function example8_llmServiceSingleton() {
  console.log('\n=== 示例 8: LLM 服务单例 ===\n');

  const llmService = getLLMService();

  try {
    // 初始化服务
    await llmService.initialize();

    console.log('服务状态:', llmService.getStatus());

    // 获取客户端和引擎
    const engine = llmService.getEngine();

    // 使用引擎
    const sessionId = uuidv4();
    const request: DialogueRequest = {
      sessionId,
      userInput: '推荐一个公园',
      preferences: { location: '南山' },
      conversationHistory: [],
      currentPhase: 'collecting_location',
    };

    const response = await engine.processDialogue(request);
    console.log('\n对话响应:', response.assistantMessage);

    // 显示更新后的状态
    console.log('\n更新后的服务状态:', llmService.getStatus());
  } catch (error) {
    console.error('错误:', error);
  }
}

/**
 * 示例 9: Claude API 使用（如果配置了 Anthropic API Key）
 */
async function example9_claudeUsage() {
  console.log('\n=== 示例 9: Claude API 使用 ===\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('未配置 ANTHROPIC_API_KEY，跳过此示例');
    return;
  }

  const client = createLLMClient(
    'anthropic',
    process.env.ANTHROPIC_API_KEY,
    'claude-3-sonnet-20240229'
  );

  const messages: LLMMessage[] = [
    {
      role: 'system',
      content: '你是深圳景点推荐助手。',
    },
    {
      role: 'user',
      content: '推荐一个适合家庭游玩的公园。',
    },
  ];

  try {
    const response = await client.call(messages);

    console.log('Claude 响应:');
    console.log(`内容: ${response.content}`);
    console.log(`Token 用量: ${response.usage.totalTokens}`);
    console.log(`模型: ${response.model}`);
  } catch (error) {
    console.error('错误:', error);
  }
}

/**
 * 示例 10: 错误处理和重试
 */
async function example10_errorHandling() {
  console.log('\n=== 示例 10: 错误处理 ===\n');

  // 使用无效的 API Key 测试错误处理
  const invalidClient = createLLMClient('openai', 'invalid-key', 'gpt-4-turbo-preview', {
    timeout: 5000,
  });

  const messages: LLMMessage[] = [
    {
      role: 'user',
      content: '测试消息',
    },
  ];

  try {
    await invalidClient.call(messages);
  } catch (error) {
    console.log('捕获到预期的错误:');
    console.log(`错误类型: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.log(`错误信息: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 主函数 - 运行所有示例
 */
async function main() {
  console.log('LLM 服务集成示例');
  console.log('='.repeat(50));

  // 检查必需的环境变量
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    console.error('\n错误: 需要配置 OPENAI_API_KEY 或 ANTHROPIC_API_KEY');
    console.log('请参考 .env.example 文件配置环境变量');
    process.exit(1);
  }

  try {
    // 运行示例（根据需要选择）
    await example1_basicClientUsage();
    await example2_singleDialogueTurn();
    await example3_intentParsing();
    await example4_recommendationDecision();
    await example5_generateSearchParams();
    await example6_generateNextQuestion();
    await example7_completeDialogueFlow();
    await example8_llmServiceSingleton();
    await example9_claudeUsage();
    await example10_errorHandling();

    console.log('\n' + '='.repeat(50));
    console.log('所有示例运行完成！');
  } catch (error) {
    console.error('\n运行示例时出错:', error);
    process.exit(1);
  }
}

// 仅在直接运行此文件时执行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  example1_basicClientUsage,
  example2_singleDialogueTurn,
  example3_intentParsing,
  example4_recommendationDecision,
  example5_generateSearchParams,
  example6_generateNextQuestion,
  example7_completeDialogueFlow,
  example8_llmServiceSingleton,
  example9_claudeUsage,
  example10_errorHandling,
};
