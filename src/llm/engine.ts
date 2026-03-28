import {
  ILLMEngine,
  DialogueRequest,
  DialogueResponse,
  IntentParsing,
  RecommendationDecision,
  ParsedRecommendation,
  LLMMessage,
  LLMConfig,
} from '@/types/llm';
import { UserPreference, DialogueMessage } from '@/types/common';
import { ParkType, DifficultyLevel } from '@/config/constants';
import { LLMClient } from './client';
import {
  generateSystemPrompt,
  generateUserPrompt,
  getPromptConfig,
  formatPreferenceSummary,
} from './prompts';
import { createLogger } from '@/utils/logger';

const logger = createLogger('llm:engine');

/**
 * LLM 决策引擎
 * 负责处理对话、提取用户偏好、生成推荐决策
 */
export class LLMEngine implements ILLMEngine {
  private client: LLMClient;
  private conversationHistory: Map<string, LLMMessage[]> = new Map();

  constructor(client: LLMClient) {
    this.client = client;

    logger.info('LLM 决策引擎初始化', {
      provider: client.getProvider(),
      model: client.getModel(),
    });
  }

  /**
   * 处理单轮对话
   */
  async processDialogue(request: DialogueRequest): Promise<DialogueResponse> {
    try {
      // 构建对话消息
      const messages = this.buildMessages(request);

      // 调用 LLM
      const llmResponse = await this.client.call(messages);

      // 解析 LLM 响应
      const parsed = this.parseDialogueResponse(llmResponse.content, request.currentPhase);

      // 记录对话历史
      this.addToConversationHistory(request.sessionId, messages);
      this.addToConversationHistory(request.sessionId, [
        {
          role: 'assistant',
          content: llmResponse.content,
        },
      ]);

      logger.debug('对话处理完成', {
        sessionId: request.sessionId,
        phase: request.currentPhase,
        tokensUsed: llmResponse.usage.totalTokens,
      });

      return {
        assistantMessage: parsed.message,
        nextPhase: parsed.nextPhase,
        updatedPreferences: parsed.updatedPreferences,
        shouldRecommend: parsed.shouldRecommend,
        recommendations: parsed.recommendations,
      };
    } catch (error) {
      logger.error('对话处理失败', {
        sessionId: request.sessionId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        assistantMessage: '抱歉，我处理你的请求时出错了。请重试。',
        error: {
          code: 'DIALOGUE_ERROR',
          message: error instanceof Error ? error.message : '未知错误',
        },
      };
    }
  }

  /**
   * 进行信息提取（意图解析）
   */
  async extractUserPreference(userInput: string, phase: string): Promise<IntentParsing> {
    const extractionPrompt = `
分析以下用户输入，提取关键信息和意图：

用户输入: "${userInput}"
当前对话阶段: ${phase}

请输出 JSON 格式，包含：
{
  "intent": "provide_info|ask_question|clarify|request_help|complete",
  "confidence": 0.95,
  "extractedInfo": {
    "location": "可选的位置信息",
    "parkType": "可选的景点类型",
    "maxDistance": "可选的最大距离（数字）",
    "minDifficulty": "可选的最低难度",
    "maxDifficulty": "可选的最高难度"
  },
  "followUpQuestion": "如果需要澄清，提出的问题",
  "requiresValidation": false
}

只输出 JSON，不要其他文本。`;

    try {
      const response = await this.client.call([
        {
          role: 'system',
          content: '你是一个自然语言处理专家。',
        },
        {
          role: 'user',
          content: extractionPrompt,
        },
      ]);

      const parsed = JSON.parse(response.content);

      return {
        intent: parsed.intent || 'provide_info',
        confidence: parsed.confidence || 0.8,
        extractedInfo: parsed.extractedInfo,
        followUpQuestion: parsed.followUpQuestion,
        requiresValidation: parsed.requiresValidation || false,
      };
    } catch (error) {
      logger.warn('信息提取失败，使用默认值', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        intent: 'provide_info',
        confidence: 0.5,
        extractedInfo: {},
        requiresValidation: true,
      };
    }
  }

  /**
   * 判断是否可以进行推荐
   */
  async shouldRecommend(preferences: UserPreference): Promise<RecommendationDecision> {
    // 检查必需的信息
    const hasLocation = preferences.location || (preferences.latitude && preferences.longitude);
    const hasType = !!preferences.parkType;
    const hasDistance = preferences.maxDistance !== undefined;

    const missingInfo: string[] = [];
    if (!hasLocation) missingInfo.push('位置信息');
    if (!hasType) missingInfo.push('景点类型');
    if (!hasDistance) missingInfo.push('距离偏好');

    const shouldRecommend = missingInfo.length === 0;

    if (!shouldRecommend) {
      return {
        shouldRecommend: false,
        searchParams: {},
        reasoning: `还需要更多信息来生成准确的推荐: ${missingInfo.join(', ')}`,
        confidence: 0.3,
        missingInfo,
      };
    }

    // 构建搜索参数
    return this.generateSearchParams(preferences);
  }

  /**
   * 根据用户偏好生成搜索参数
   */
  async generateSearchParams(preferences: UserPreference): Promise<RecommendationDecision> {
    const prompt = `
基于以下用户偏好，生成最优的搜索参数：

${formatPreferenceSummary(preferences)}

请输出 JSON 格式，包含：
{
  "location": "搜索区域（如'南山区'）",
  "parkType": "公园类型: park|hiking|both",
  "maxDistance": 搜索半径（公里），
  "minDifficulty": "最低难度（如果适用）",
  "maxDifficulty": "最高难度（如果适用）",
  "keywords": ["搜索关键词"],
  "reasoning": "为什么这样搜索的理由",
  "confidence": 0.95
}

只输出 JSON，不要其他文本。`;

    try {
      const response = await this.client.call([
        {
          role: 'system',
          content: '你是深圳地理和景点搜索专家。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);

      const parsed = JSON.parse(response.content);

      return {
        shouldRecommend: true,
        searchParams: {
          location: parsed.location || preferences.location,
          latitude: preferences.latitude,
          longitude: preferences.longitude,
          parkType: parsed.parkType as ParkType,
          maxDistance: parsed.maxDistance || preferences.maxDistance,
          minDifficulty: parsed.minDifficulty as DifficultyLevel | undefined,
          maxDifficulty: parsed.maxDifficulty as DifficultyLevel | undefined,
          keywords: parsed.keywords || [],
        },
        reasoning: parsed.reasoning || '根据你的偏好搜索景点',
        confidence: parsed.confidence || 0.85,
      };
    } catch (error) {
      logger.warn('搜索参数生成失败', {
        error: error instanceof Error ? error.message : String(error),
      });

      // 返回默认搜索参数
      return {
        shouldRecommend: true,
        searchParams: {
          location: preferences.location,
          latitude: preferences.latitude,
          longitude: preferences.longitude,
          parkType: preferences.parkType,
          maxDistance: preferences.maxDistance,
          keywords: [],
        },
        reasoning: '基于你的基本偏好搜索',
        confidence: 0.6,
      };
    }
  }

  /**
   * 解析 LLM 的推荐响应
   */
  async parseRecommendations(response: string): Promise<ParsedRecommendation> {
    const prompt = `
解析以下推荐文本，提取景点信息：

${response}

请输出 JSON 格式，包含：
{
  "locations": [
    {
      "name": "景点名称",
      "reason": "推荐理由",
      "relevanceScore": 0.95,
      "estimatedTravelTime": 15
    }
  ],
  "explanation": "整体推荐说明"
}

只输出 JSON，不要其他文本。`;

    try {
      const llmResponse = await this.client.call([
        {
          role: 'system',
          content: '你是推荐文本解析专家。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);

      const parsed = JSON.parse(llmResponse.content);

      return {
        locations: parsed.locations || [],
        explanation: parsed.explanation || '',
      };
    } catch (error) {
      logger.warn('推荐解析失败', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        locations: [],
        explanation: response,
      };
    }
  }

  /**
   * 生成下一个提问
   */
  async generateNextQuestion(preferences: UserPreference, phase: string): Promise<string> {
    const prompt = `
基于当前对话阶段和已收集的用户信息，生成下一个合适的提问。

当前阶段: ${phase}
${formatPreferenceSummary(preferences)}

提问要求：
- 简洁友好（20-40 个汉字）
- 直接且易理解
- 引导用户提供缺失的信息
- 如果信息已足够，询问是否需要推荐

请只输出提问文本，不要其他内容。`;

    try {
      const response = await this.client.call([
        {
          role: 'system',
          content: '你是深圳景点推荐助手。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);

      return response.content.trim();
    } catch (error) {
      logger.warn('提问生成失败', {
        error: error instanceof Error ? error.message : String(error),
      });

      return '请告诉我你对景点的更多偏好。';
    }
  }

  /**
   * 构建 LLM 消息
   */
  private buildMessages(request: DialogueRequest): LLMMessage[] {
    const systemPrompt = generateSystemPrompt(request.currentPhase);
    const promptConfig = getPromptConfig(request.currentPhase);

    // 获取最近的对话历史
    const recentHistory = this.getConversationHistory(
      request.sessionId,
      promptConfig.contextSize
    );

    // 构建消息列表
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // 添加历史消息
    messages.push(...recentHistory);

    // 添加当前用户输入
    const userPrompt = generateUserPrompt(
      request.userInput,
      request.preferences,
      request.currentPhase,
      recentHistory
    );

    messages.push({
      role: 'user',
      content: userPrompt,
    });

    return messages;
  }

  /**
   * 解析对话响应
   */
  private parseDialogueResponse(
    content: string,
    phase: string
  ): {
    message: string;
    nextPhase?: string;
    updatedPreferences?: Partial<UserPreference>;
    shouldRecommend?: boolean;
    recommendations?: Array<{
      name: string;
      reason: string;
      relevanceScore: number;
    }>;
  } {
    // 尝试解析 JSON（用于推荐等结构化响应）
    try {
      // 检查是否包含 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // 返回结构化响应
        return {
          message: parsed.message || content,
          nextPhase: parsed.nextPhase,
          updatedPreferences: parsed.extractedInfo,
          shouldRecommend: parsed.shouldRecommend,
          recommendations: parsed.recommendations,
        };
      }
    } catch (e) {
      // 如果 JSON 解析失败，继续处理普通文本
    }

    // 返回普通文本响应
    return {
      message: content.trim(),
    };
  }

  /**
   * 添加到对话历史
   */
  private addToConversationHistory(sessionId: string, messages: LLMMessage[]): void {
    const existing = this.conversationHistory.get(sessionId) || [];
    const updated = [...existing, ...messages];

    // 限制历史记录大小（最多保留 50 条消息）
    if (updated.length > 50) {
      updated.splice(0, updated.length - 50);
    }

    this.conversationHistory.set(sessionId, updated);
  }

  /**
   * 获取对话历史
   */
  private getConversationHistory(sessionId: string, limit: number): LLMMessage[] {
    const history = this.conversationHistory.get(sessionId) || [];

    // 返回最近的消息
    if (history.length <= limit) {
      return history;
    }

    return history.slice(-limit);
  }

  /**
   * 清空对话历史
   */
  clearConversationHistory(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
    logger.debug('对话历史已清空', { sessionId });
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    activeSessions: number;
    totalMessages: number;
  } {
    let totalMessages = 0;
    this.conversationHistory.forEach((messages) => {
      totalMessages += messages.length;
    });

    return {
      activeSessions: this.conversationHistory.size,
      totalMessages,
    };
  }
}

/**
 * 创建 LLM 决策引擎工厂函数
 */
export function createLLMEngine(client: LLMClient): LLMEngine {
  return new LLMEngine(client);
}
