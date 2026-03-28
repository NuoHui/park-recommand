import { ILLMClient, LLMMessage, LLMResponse, LLMConfig, LLMProvider } from '@/types/llm';
import { createLogger } from '@/utils/logger';

const logger = createLogger('llm:mock-client');

/**
 * Mock LLM 客户端 - 用于测试和开发环境
 * 模拟 OpenAI 和 Anthropic 的 API 响应
 */
export class MockLLMClient implements ILLMClient {
  private config: LLMConfig;
  private callCount: number = 0;

  constructor(config: LLMConfig) {
    this.config = config;

    logger.info('Mock LLM 客户端初始化', {
      provider: config.provider,
      model: config.model,
    });
  }

  /**
   * 模拟 LLM 调用
   */
  async call(messages: LLMMessage[]): Promise<LLMResponse> {
    this.callCount++;

    // 延迟以模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 100));

    const content = this.generateMockResponse(messages);

    logger.debug('Mock LLM 响应生成', {
      callCount: this.callCount,
      messageCount: messages.length,
      contentLength: content.length,
    });

    return {
      id: `mock-${this.callCount}`,
      content,
      model: this.config.model,
      usage: {
        promptTokens: Math.floor(Math.random() * 100) + 50,
        completionTokens: Math.floor(Math.random() * 50) + 20,
        totalTokens: Math.floor(Math.random() * 150) + 70,
      },
      finishReason: 'stop',
    };
  }

  /**
   * 根据消息内容生成模拟响应
   */
  private generateMockResponse(messages: LLMMessage[]): string {
    const lastUserMessage = messages
      .filter(msg => msg.role === 'user')
      .pop()?.content || '';

    // 检测意图
    if (lastUserMessage.includes('分析') || lastUserMessage.includes('提取')) {
      return JSON.stringify({
        intent: 'provide_info',
        confidence: 0.95,
        extractedInfo: {
          location: '宝安西乡',
          parkType: 'park',
          maxDistance: 50,
        },
        followUpQuestion: '还有其他偏好吗？',
        requiresValidation: false,
      });
    }

    if (lastUserMessage.includes('推荐')) {
      return JSON.stringify({
        locations: [
          {
            name: '宝安公园',
            reason: '靠近宝安西乡，环境优美',
            relevanceScore: 0.95,
            estimatedTravelTime: 10,
          },
          {
            name: '西乡河滨公园',
            reason: '沿河而建，景色宜人',
            relevanceScore: 0.90,
            estimatedTravelTime: 15,
          },
          {
            name: '宝体中心公园',
            reason: '设施完善，人气旺盛',
            relevanceScore: 0.85,
            estimatedTravelTime: 20,
          },
        ],
        explanation: '根据你的偏好，推荐了3个宝安西乡附近的优质公园',
      });
    }

    if (lastUserMessage.includes('搜索') || lastUserMessage.includes('参数')) {
      return JSON.stringify({
        location: '宝安西乡',
        parkType: 'park',
        maxDistance: 50,
        keywords: ['公园', '景点'],
        reasoning: '根据用户需求生成的搜索参数',
        confidence: 0.85,
      });
    }

    // 默认响应
    return JSON.stringify({
      message: '我理解你的需求，我会帮助你找到最合适的公园。',
    });
  }

  /**
   * 验证连接
   */
  async validateConnection(): Promise<boolean> {
    logger.info('Mock LLM 连接验证', {
      provider: this.config.provider,
      status: 'success',
    });

    return true;
  }

  /**
   * 获取当前配置
   */
  getConfig(): LLMConfig {
    return { ...this.config };
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };

    logger.info('Mock LLM 配置已更新', {
      provider: this.config.provider,
      model: this.config.model,
    });
  }

  /**
   * 获取提供商名称
   */
  getProvider(): LLMProvider {
    return this.config.provider;
  }

  /**
   * 获取当前模型
   */
  getModel(): string {
    return this.config.model;
  }

  /**
   * 销毁客户端
   */
  destroy(): void {
    logger.debug('Mock LLM 客户端已销毁', {
      totalCalls: this.callCount,
    });
  }

  /**
   * 获取调用统计
   */
  getStats(): { callCount: number } {
    return { callCount: this.callCount };
  }
}

/**
 * 创建 Mock LLM 客户端的工厂函数
 */
export function createMockLLMClient(
  provider: LLMProvider,
  apiKey: string,
  model: string,
  options?: Partial<LLMConfig>
): MockLLMClient {
  const config: LLMConfig = {
    provider,
    apiKey,
    model,
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0,
    timeout: 60000,
    ...options,
  };

  return new MockLLMClient(config);
}
