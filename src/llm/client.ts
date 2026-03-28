import { ILLMClient, LLMMessage, LLMResponse, LLMConfig, LLMProvider } from '@/types/llm';
import { createLogger } from '@/utils/logger';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const logger = createLogger('llm:client');

/**
 * 通用 LLM 客户端
 * 支持 OpenAI 和 Anthropic Claude
 */
export class LLMClient implements ILLMClient {
  private config: LLMConfig;
  private openaiClient?: OpenAI;
  private anthropicClient?: Anthropic;

  constructor(config: LLMConfig) {
    this.config = config;
    this.initializeClients();

    logger.info('LLM 客户端初始化', {
      provider: config.provider,
      model: config.model,
    });
  }

  /**
   * 初始化 LLM 客户端
   */
  private initializeClients(): void {
    if (this.config.provider === 'openai') {
      this.openaiClient = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl || 'https://api.openai.com/v1',
        timeout: this.config.timeout || 60000,
      });
    } else if (this.config.provider === 'anthropic') {
      this.anthropicClient = new Anthropic({
        apiKey: this.config.apiKey,
        timeout: this.config.timeout || 60000,
      });
    }
  }

  /**
   * 调用 LLM API
   */
  async call(messages: LLMMessage[], config?: Partial<LLMConfig>): Promise<LLMResponse> {
    const mergedConfig = { ...this.config, ...(config || {}) };

    try {
      if (mergedConfig.provider === 'openai') {
        return await this.callOpenAI(messages, mergedConfig);
      } else if (mergedConfig.provider === 'anthropic') {
        return await this.callAnthropic(messages, mergedConfig);
      } else {
        throw new Error(`Unsupported LLM provider: ${mergedConfig.provider}`);
      }
    } catch (error) {
      logger.error('LLM 调用失败', {
        provider: mergedConfig.provider,
        model: mergedConfig.model,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 调用 OpenAI API
   */
  private async callOpenAI(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.openaiClient.chat.completions.create({
      model: config.model,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 2000,
      top_p: config.topP ?? 1.0,
      frequency_penalty: config.frequencyPenalty ?? 0,
      presence_penalty: config.presencePenalty ?? 0,
    });

    const content = response.choices[0]?.message?.content || '';
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    logger.debug('OpenAI 响应', {
      id: response.id,
      model: response.model,
      usage: usage,
    });

    return {
      id: response.id,
      content,
      model: response.model,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      finishReason: response.choices[0]?.finish_reason || 'stop',
    };
  }

  /**
   * 调用 Anthropic Claude API
   */
  private async callAnthropic(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // 分离系统提示词和对话消息
    let systemPrompt = '';
    const claudeMessages: Anthropic.Messages.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt = msg.content;
      } else {
        claudeMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    const response = await this.anthropicClient.messages.create({
      model: config.model,
      max_tokens: config.maxTokens ?? 2000,
      system: systemPrompt || undefined,
      messages: claudeMessages,
      temperature: config.temperature ?? 0.7,
      top_p: config.topP ?? 1.0,
    });

    const content =
      response.content[0].type === 'text' ? response.content[0].text : '';

    logger.debug('Anthropic 响应', {
      id: response.id,
      model: response.model,
      usage: response.usage,
    });

    return {
      id: response.id,
      content,
      model: response.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: response.stop_reason || 'stop',
    };
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
    this.initializeClients();

    logger.info('LLM 配置已更新', {
      provider: this.config.provider,
      model: this.config.model,
    });
  }

  /**
   * 验证 API 连接
   */
  async validateConnection(): Promise<boolean> {
    try {
      const testMessages: LLMMessage[] = [
        {
          role: 'system',
          content: '你是一个有帮助的助手。',
        },
        {
          role: 'user',
          content: '测试连接。请用一个词回答。',
        },
      ];

      const response = await this.call(testMessages);
      logger.info('LLM 连接验证成功', {
        provider: this.config.provider,
        model: this.config.model,
        responseLength: response.content.length,
      });

      return true;
    } catch (error) {
      logger.error('LLM 连接验证失败', {
        provider: this.config.provider,
        error: error instanceof Error ? error.message : String(error),
      });

      return false;
    }
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
   * 销毁客户端（清理资源）
   */
  destroy(): void {
    // 可根据需要添加清理逻辑
    logger.debug('LLM 客户端已销毁');
  }
}

/**
 * 创建 LLM 客户端工厂函数
 */
export function createLLMClient(
  provider: LLMProvider,
  apiKey: string,
  model: string,
  options?: Partial<LLMConfig>
): LLMClient {
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

  return new LLMClient(config);
}
