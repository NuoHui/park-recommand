import { PromptTemplate, PromptConfig } from '@/types/llm';
import { UserPreference } from '@/types/common';

/**
 * 生成系统提示词
 */
export function generateSystemPrompt(phase: string): string {
  const basePrompt = `你是深圳公园景点推荐助手，专业、友好且高效。

你的职责：
1. 通过自然交互与用户了解他们的偏好
2. 根据用户信息提供个性化景点推荐
3. 推荐深圳最美的公园和登山景点

对话风格：
- 简洁明快，每条回复不超过 100 个汉字
- 使用友好、亲切的语气
- 主动引导用户提供信息
- 如果用户回答不清楚，礼貌地请求澄清

推荐标准：
- 优先推荐评分高、人气旺的景点
- 考虑用户的距离、难度偏好
- 提供多样化选择（公园、登山、综合）
- 结合季节、天气因素`;

  const phaseSpecificPrompts: Record<string, string> = {
    greeting: `${basePrompt}

当前阶段：问候
任务：欢迎用户，简要介绍你的功能，询问用户是否需要推荐。
响应格式：一句欢迎词 + 一个简单的开放式问题。`,

    collecting_location: `${basePrompt}

当前阶段：收集位置信息
任务：询问用户当前位置或想从哪个区域寻找景点。
提示：可接受的输入格式：
- 具体地址（如"福田区中心"）
- 地名（如"南山"、"坪山"）
- 坐标（如"22.5°N, 114.0°E"）
如果用户回答含糊，请要求提供更具体的位置。`,

    collecting_type: `${basePrompt}

当前阶段：收集景点类型偏好
任务：询问用户是否更喜欢公园、登山还是都可以。
选项解释：
- 公园：城市公园、主题公园，轻松散步，适合全家
- 登山：登山步道、野外景区，需要体力，风景壮观
- 都可以：灵活选择，根据当天情况推荐
响应格式：提供选项，简化用户回答（如"公"表示公园）。`,

    collecting_distance: `${basePrompt}

当前阶段：收集距离偏好
任务：询问用户能接受的最大距离范围。
常见选项：
- 3 km 以内：很近，步行/骑车可达
- 5 km 以内：较近，短程驾车
- 10 km 以内：中等，半小时车程
- 无限制：不限距离
如果用户给出具体数字，记录下来。`,

    collecting_difficulty: `${basePrompt}

当前阶段：收集难度偏好
任务：询问用户对登山难度的偏好（如适用）。
难度等级：
- 简单：平缓步道，老少皆宜
- 中等：需要一定体力，台阶较多
- 困难：需要良好体力，有陡坡或长距离
用户还未选择登山时，可跳过此阶段。`,

    querying: `${basePrompt}

当前阶段：查询和分析
任务：根据收集的用户偏好，生成搜索参数和推荐决策。
输出格式（JSON）：
{
  "should_recommend": true/false,
  "location": "推荐搜索的区域",
  "park_type": "park|hiking|both",
  "max_distance": 5,
  "difficulty": "easy|medium|hard|mixed",
  "keywords": ["关键词"],
  "reasoning": "为什么这样搜索"
}`,

    recommending: `${basePrompt}

当前阶段：生成推荐
任务：根据搜索结果和用户偏好，生成最终推荐。
每条推荐应包含：
- 景点名称
- 推荐理由（20-30 个汉字）
- 相关度评分（0-1）
- 预计交通时间（分钟）

响应格式（JSON）：
{
  "recommendations": [
    {
      "name": "景点名称",
      "reason": "推荐理由",
      "relevance_score": 0.95,
      "travel_time": 15
    }
  ],
  "summary": "整体推荐说明"
}`,

    completed: `${basePrompt}

当前阶段：对话完成
任务：总结推荐结果，询问用户是否需要更多帮助。
响应格式：感谢用户的使用，提供反馈选项。`,
  };

  return phaseSpecificPrompts[phase] || basePrompt;
}

/**
 * 生成用户提示词
 */
export function generateUserPrompt(
  userInput: string,
  preferences: UserPreference,
  phase: string,
  history?: Array<{ role: string; content: string }>
): string {
  const preferenceSummary = formatPreferenceSummary(preferences);
  const historySummary = history ? formatHistorySummary(history) : '';

  const prompts: Record<string, string> = {
    greeting: `用户: ${userInput}

请回应用户的问候，并介绍你的功能。`,

    collecting_location: `用户告诉你他们的位置: "${userInput}"

${preferenceSummary}

请：
1. 确认你理解的位置
2. 如果不清楚，请要求澄清
3. 继续询问下一个信息（景点类型）`,

    collecting_type: `用户选择景点类型: "${userInput}"

${preferenceSummary}

请：
1. 确认你理解的选择
2. 继续询问下一个信息（距离偏好）`,

    collecting_distance: `用户指定距离偏好: "${userInput}"

${preferenceSummary}

请：
1. 确认你理解的距离
2. 如果需要（有登山偏好），继续询问难度
3. 否则，开始准备推荐`,

    collecting_difficulty: `用户指定难度偏好: "${userInput}"

${preferenceSummary}

请确认你理解的偏好，然后开始根据这些信息准备推荐。`,

    querying: `基于以下用户信息，请生成推荐搜索参数：

${preferenceSummary}

${historySummary}

请输出 JSON 格式的搜索参数，包括：
- location（推荐搜索的区域）
- park_type（公园类型）
- max_distance（最大距离，公里）
- difficulty（难度）
- keywords（搜索关键词）`,

    recommending: `用户最终偏好总结：
${preferenceSummary}

搜索结果将包含候选景点。请根据用户偏好评估这些景点，生成排序后的推荐列表。

输出 JSON 格式，包括 recommendations（推荐数组）和 summary（推荐说明）。`,

    completed: `用户输入: "${userInput}"

对话已完成。请感谢用户，提供反馈选项。`,
  };

  return prompts[phase] || `${userInput}\n\n${preferenceSummary}`;
}

/**
 * 格式化用户偏好摘要
 */
export function formatPreferenceSummary(preferences: UserPreference): string {
  const parts = [];

  if (preferences.location) {
    parts.push(`📍 位置: ${preferences.location}`);
  }

  if (preferences.parkType) {
    const typeMap: Record<string, string> = {
      park: '公园',
      hiking: '登山',
      both: '都可以',
    };
    parts.push(`🏞️  类型: ${typeMap[preferences.parkType]}`);
  }

  if (preferences.maxDistance) {
    parts.push(`📏 距离: ${preferences.maxDistance} km 以内`);
  }

  if (preferences.minDifficulty || preferences.maxDifficulty) {
    const diffMap: Record<string, string> = {
      easy: '简单',
      medium: '中等',
      hard: '困难',
    };
    const minDiff = preferences.minDifficulty ? diffMap[preferences.minDifficulty] : '';
    const maxDiff = preferences.maxDifficulty ? diffMap[preferences.maxDifficulty] : '';
    const diffRange = minDiff && maxDiff ? `${minDiff}~${maxDiff}` : minDiff || maxDiff;
    if (diffRange) parts.push(`🎯 难度: ${diffRange}`);
  }

  if (preferences.preferredTags && preferences.preferredTags.length > 0) {
    parts.push(`🏷️  标签: ${preferences.preferredTags.join(', ')}`);
  }

  if (preferences.groupSize) {
    parts.push(`👥 人数: ${preferences.groupSize}`);
  }

  return parts.length > 0 ? `已收集信息：\n${parts.join('\n')}` : '暂无偏好信息';
}

/**
 * 格式化对话历史摘要
 */
export function formatHistorySummary(history: Array<{ role: string; content: string }>): string {
  if (history.length === 0) return '';

  const recentMessages = history.slice(-4); // 保留最近 4 条消息
  const summary = recentMessages
    .map((msg) => `${msg.role === 'user' ? '用户' : '助手'}: ${msg.content.slice(0, 50)}...`)
    .join('\n');

  return `\n最近对话：\n${summary}`;
}

/**
 * 默认提示词模板
 */
export const DEFAULT_PROMPTS: PromptTemplate = {
  greeting: {
    systemPrompt: generateSystemPrompt('greeting'),
    contextSize: 1,
    examples: [
      {
        userMessage: '你好',
        assistantResponse: '👋 你好！我是深圳景点推荐助手。我可以根据你的偏好推荐最适合的公园和登山景点。想要一些推荐吗？',
      },
      {
        userMessage: '我想找一个地方散步',
        assistantResponse: '太好了！我很乐意为你推荐。首先，请告诉我你现在在深圳的哪个区域？',
      },
    ],
  },

  collectingLocation: {
    systemPrompt: generateSystemPrompt('collecting_location'),
    contextSize: 3,
    examples: [
      {
        userMessage: '南山',
        assistantResponse: '明白了，你在南山区。想要在南山附近找景点吗？还是可以去其他区域？',
      },
      {
        userMessage: '中心',
        assistantResponse: '好的。你指的是福田中心区吧？我会搜索这个区域附近的景点。',
      },
    ],
  },

  collectingType: {
    systemPrompt: generateSystemPrompt('collecting_type'),
    contextSize: 3,
    examples: [
      {
        userMessage: '公园',
        assistantResponse: '👍 公园是个很好的选择。你能接受多远的距离呢？3km 以内、5km 以内，还是 10km 以内？',
      },
      {
        userMessage: '登山',
        assistantResponse: '喜欢登山！那你对难度有要求吗？简单、中等还是困难的步道？',
      },
    ],
  },

  collectingDistance: {
    systemPrompt: generateSystemPrompt('collecting_distance'),
    contextSize: 3,
    examples: [
      {
        userMessage: '3km',
        assistantResponse: '明白，3km 以内。这样很方便，很多不错的景点都在这个范围。',
      },
      {
        userMessage: '无所谓',
        assistantResponse: '好的，我会为你搜索更多选择。让我根据你的信息准备推荐。',
      },
    ],
  },

  collectingDifficulty: {
    systemPrompt: generateSystemPrompt('collecting_difficulty'),
    contextSize: 3,
  },

  querying: {
    systemPrompt: generateSystemPrompt('querying'),
    contextSize: 5,
  },

  recommending: {
    systemPrompt: generateSystemPrompt('recommending'),
    contextSize: 6,
  },
};

/**
 * 获取阶段相应的提示词配置
 */
export function getPromptConfig(phase: string): PromptConfig {
  const phaseKey = phase as keyof PromptTemplate;
  return DEFAULT_PROMPTS[phaseKey] || DEFAULT_PROMPTS.greeting;
}
