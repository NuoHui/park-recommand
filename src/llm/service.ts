import { LLMClient, createLLMClient } from './client';
import { LLMEngine, createLLMEngine } from './engine';
import { LLMProvider, LLMConfig } from '@/types/llm';
import { env } from '@/config/env';
import { createLogger } from '@/utils/logger';

const logger = createLogger('llm:service');

/**
 * LLM 服务单例
 */
class LLMService {
  private static instance: LLMService;
  private client?: LLMClient;
  private engine?: LLMEngine;
  private initialized: boolean = false;

  /**
   * 获取单例实例
   */
  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.debug('LLM 服务已初始化，跳过重复初始化');
      return;
    }

    try {
      // 根据环境配置选择 LLM 提供商
      const provider = env.llmProvider as LLMProvider;
      let apiKey: string;
      let model: string;

      if (provider === 'openai') {
        apiKey = env.openaiApiKey || '';
        model = env.openaiModel;
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY is not configured');
        }
      } else if (provider === 'anthropic') {
        apiKey = env.anthropicApiKey || '';
        model = env.anthropicModel;
        if (!apiKey) {
          throw new Error('ANTHROPIC_API_KEY is not configured');
        }
      } else {
        throw new Error(`Unsupported LLM provider: ${provider}`);
      }

      // 创建客户端
      this.client = createLLMClient(provider, apiKey, model, {
        temperature: 0.7,
        maxTokens: 2000,
        timeout: 60000,
      });

      // 验证连接
      const isValid = await this.client.validateConnection();
      if (!isValid) {
        throw new Error('Failed to connect to LLM API');
      }

      // 创建引擎
      this.engine = createLLMEngine(this.client);

      this.initialized = true;

      logger.info('LLM 服务初始化成功', {
        provider,
        model,
        status: 'ready',
      });
    } catch (error) {
      logger.error('LLM 服务初始化失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 获取客户端
   */
  getClient(): LLMClient {
    if (!this.client) {
      throw new Error('LLM service not initialized. Call initialize() first.');
    }
    return this.client;
  }

  /**
   * 获取引擎
   */
  getEngine(): LLMEngine {
    if (!this.engine) {
      throw new Error('LLM service not initialized. Call initialize() first.');
    }
    return this.engine;
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    if (this.client) {
      this.client.destroy();
    }
    this.client = undefined;
    this.engine = undefined;
    this.initialized = false;

    logger.info('LLM 服务已销毁');
  }

  /**
   * 获取服务状态
   */
  getStatus(): {
    initialized: boolean;
    provider?: string;
    model?: string;
    stats?: {
      activeSessions: number;
      totalMessages: number;
    };
  } {
    if (!this.initialized || !this.client || !this.engine) {
      return { initialized: false };
    }

    return {
      initialized: true,
      provider: this.client.getProvider(),
      model: this.client.getModel(),
      stats: this.engine.getStats(),
    };
  }
}

/**
 * 获取 LLM 服务实例
 */
export function getLLMService(): LLMService {
  return LLMService.getInstance();
}

/**
 * 导出服务和工厂函数
 */
export { LLMClient, createLLMClient } from './client';
export { LLMEngine, createLLMEngine } from './engine';
export * from '@/types/llm';
