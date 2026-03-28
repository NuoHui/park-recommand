# LLM 使用示例

本文档展示如何在代码中使用 LLM 客户端和引擎。

## 基础使用

### 1. 创建 LLM 客户端

```typescript
import { createLLMClient } from '@/llm/client';

// 创建 OpenAI 客户端
const client = createLLMClient(
  'openai',
  'sk-your-api-key',
  'gpt-4o-mini',
  {
    temperature: 0.7,
    maxTokens: 2000,
  }
);

// 或创建 Anthropic 客户端
const claudeClient = createLLMClient(
  'anthropic',
  'sk-ant-your-api-key',
  'claude-3-5-sonnet-20241022',
  {
    temperature: 0.5,
    maxTokens: 1000,
  }
);
```

### 2. 调用 LLM API

```typescript
// 简单对话
const response = await client.call([
  {
    role: 'system',
    content: '你是一个有帮助的助手。',
  },
  {
    role: 'user',
    content: '请介绍一下深圳。',
  },
]);

console.log(response.content);
console.log(`使用了 ${response.usage.totalTokens} 个 token`);
```

### 3. 创建 LLM 引擎

```typescript
import { createLLMEngine } from '@/llm/engine';

const engine = createLLMEngine(client);

// 现在可以使用高级功能
```

## LLM 引擎高级功能

### 1. 提取用户偏好

```typescript
const preference = await engine.extractUserPreference(
  '我想在宝安找一个适合登山的景点，距离不超过 10 公里',
  'preference_collection'
);

console.log('意图:', preference.intent);
console.log('置信度:', preference.confidence);
console.log('提取信息:', preference.extractedInfo);
// 输出:
// 意图: provide_info
// 置信度: 0.95
// 提取信息: { location: '宝安', parkType: 'hiking', maxDistance: 10 }
```

### 2. 生成搜索参数

```typescript
const userPrefs = {
  location: '宝安',
  latitude: 22.5724,
  longitude: 113.8732,
  parkType: 'hiking' as const,
  maxDistance: 10,
};

const decision = await engine.generateSearchParams(userPrefs);

console.log('应该推荐:', decision.shouldRecommend);
console.log('搜索参数:', decision.searchParams);
console.log('置信度:', decision.confidence);
// 输出:
// 应该推荐: true
// 搜索参数: { location: '宝安', parkType: 'hiking', maxDistance: 10, keywords: [...] }
// 置信度: 0.85
```

### 3. 解析推荐结果

```typescript
const locationsJSON = JSON.stringify([
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
]);

const parsed = await engine.parseRecommendations(locationsJSON);

console.log('解析的景点:', parsed.locations);
console.log('说明:', parsed.explanation);
// 输出:
// 解析的景点: [
//   { name: '梧桐山', reason: '...', relevanceScore: 0.95 },
//   { name: '羊台山', reason: '...', relevanceScore: 0.88 }
// ]
// 说明: 根据您的偏好，我为您推荐以下登山景点...
```

### 4. 判断是否应该推荐

```typescript
const decision = await engine.shouldRecommend(userPrefs);

if (!decision.shouldRecommend) {
  console.log('缺少信息:', decision.missingInfo);
  console.log('需要用户提供:', decision.reasoning);
} else {
  console.log('信息完整，可以生成推荐');
}
```

### 5. 生成下一个提问

```typescript
const nextQuestion = await engine.generateNextQuestion(
  userPrefs,
  'preference_collection'
);

console.log('下一个提问:', nextQuestion);
// 输出: "你更喜欢山峰登山还是滨海散步？"
```

## 实际应用示例

### 场景 1: 推荐对话流程

```typescript
import { createLLMEngine } from '@/llm/engine';
import { createLLMClient } from '@/llm/client';
import { env } from '@/config/env';

// 初始化
const client = createLLMClient(
  env.llmProvider as 'openai' | 'anthropic',
  env.llmProvider === 'openai' ? env.openaiApiKey : env.anthropicApiKey,
  env.llmProvider === 'openai' ? env.openaiModel : env.anthropicModel
);

const engine = createLLMEngine(client);

// 用户对话流程
async function handleUserInput(userInput: string) {
  try {
    // 1. 提取用户偏好
    const extraction = await engine.extractUserPreference(
      userInput,
      'preference_collection'
    );

    if (extraction.confidence < 0.5) {
      // 置信度太低，需要澄清
      return {
        message: extraction.followUpQuestion,
        needsMoreInfo: true,
      };
    }

    // 2. 判断是否可以推荐
    const decision = await engine.shouldRecommend(extraction.extractedInfo);

    if (!decision.shouldRecommend) {
      // 信息不完整
      return {
        message: `我需要更多信息来帮你: ${decision.missingInfo.join(', ')}`,
        needsMoreInfo: true,
      };
    }

    // 3. 生成推荐
    // ... 这里调用推荐服务

    return {
      message: '我已经为你找到最合适的景点！',
      needsMoreInfo: false,
      recommendations: [...],
    };
  } catch (error) {
    console.error('LLM 处理出错:', error);
    return {
      message: '处理你的请求时出错，请重试。',
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}
```

### 场景 2: 错误处理和降级

```typescript
import { createLLMEngine } from '@/llm/engine';

async function parseRecommendationsWithFallback(
  locations: any[],
  engine: LLMEngine
): Promise<ParsedRecommendation> {
  try {
    // 尝试使用 LLM 解析
    const locationsJSON = JSON.stringify(locations.slice(0, 10), null, 2);
    return await engine.parseRecommendations(locationsJSON);
  } catch (error) {
    console.warn('LLM 解析失败，使用降级方案', error);

    // 降级方案：使用默认解析
    return {
      locations: locations.slice(0, 5).map((loc: any) => ({
        name: loc.name,
        reason: `距离中心点 ${loc.distance?.toFixed(1)}km，交通便利`,
        relevanceScore: 0.8,
      })),
      explanation: '根据距离和热度为你推荐的景点',
    };
  }
}
```

### 场景 3: 配置多个 LLM 提供商

```typescript
import { createLLMClient } from '@/llm/client';

// 创建主要客户端
const primaryClient = createLLMClient(
  'openai',
  process.env.OPENAI_API_KEY!,
  'gpt-4o-mini'
);

// 创建备用客户端
const fallbackClient = createLLMClient(
  'anthropic',
  process.env.ANTHROPIC_API_KEY!,
  'claude-3-5-sonnet-20241022'
);

// 带降级的调用
async function callLLMWithFallback(messages: any[]) {
  try {
    return await primaryClient.call(messages);
  } catch (error) {
    console.warn('Primary LLM failed, using fallback:', error);
    try {
      return await fallbackClient.call(messages);
    } catch (fallbackError) {
      console.error('Both LLM providers failed:', fallbackError);
      throw fallbackError;
    }
  }
}
```

## 常见模式

### 批量处理

```typescript
// 同时处理多个用户输入
const userInputs = [
  '我想在宝安找公园',
  '我喜欢爬山',
  '距离不超过 5 公里',
];

const results = await Promise.all(
  userInputs.map((input) =>
    engine.extractUserPreference(input, 'preference_collection')
  )
);

console.log('批量处理结果:', results);
```

### 对话历史管理

```typescript
// 创建新的引擎实例以维护对话历史
const sessionId = 'user-session-123';
const engine = createLLMEngine(client);

// 每个请求都会自动维护历史
await engine.processDialogue({
  sessionId,
  userInput: '第一条消息',
  currentPhase: 'preference_collection',
  preferences: {},
});

await engine.processDialogue({
  sessionId,
  userInput: '第二条消息',
  currentPhase: 'preference_collection',
  preferences: {},
});

// 查看统计信息
const stats = engine.getStats();
console.log('活跃会话:', stats.activeSessions);
console.log('消息总数:', stats.totalMessages);
```

### 监听和日志记录

```typescript
import { createLogger } from '@/utils/logger';

const logger = createLogger('llm:usage');

async function trackLLMUsage(client: LLMClient, messages: any[]) {
  const startTime = Date.now();

  try {
    const response = await client.call(messages);
    const duration = Date.now() - startTime;

    logger.info('LLM 调用完成', {
      provider: client.getProvider(),
      model: client.getModel(),
      tokensUsed: response.usage.totalTokens,
      duration,
      cost: response.usage.totalTokens * 0.000002, // 估算成本
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('LLM 调用失败', {
      error: error instanceof Error ? error.message : String(error),
      duration,
    });
    throw error;
  }
}
```

## 最佳实践

### 1. 始终包含错误处理

```typescript
try {
  const result = await engine.extractUserPreference(input, phase);
} catch (error) {
  // 提供有意义的错误消息
  logger.error('信息提取失败', { error });
  // 提供降级方案
  return defaultResult;
}
```

### 2. 验证 API 连接

```typescript
// 在初始化时验证连接
const isValid = await client.validateConnection();
if (!isValid) {
  throw new Error('无法连接到 LLM 服务');
}
```

### 3. 管理 Token 用量

```typescript
// 记录 token 使用
logger.info('Token 使用统计', {
  totalTokens: response.usage.totalTokens,
  promptTokens: response.usage.promptTokens,
  completionTokens: response.usage.completionTokens,
});
```

### 4. 设置合理的超时

```typescript
const client = createLLMClient(provider, apiKey, model, {
  timeout: 60000, // 60 秒超时
  maxTokens: 2000,
});
```

### 5. 使用配置管理

```typescript
import { env } from '@/config/env';

const client = createLLMClient(
  env.llmProvider as 'openai' | 'anthropic',
  env.llmProvider === 'openai' ? env.openaiApiKey : env.anthropicApiKey,
  env.llmProvider === 'openai' ? env.openaiModel : env.anthropicModel,
  {
    temperature: parseFloat(env.llmTemperature || '0.7'),
    maxTokens: parseInt(env.llmMaxTokens || '2000'),
  }
);
```

---

**更新时间**: 2024-03-28
