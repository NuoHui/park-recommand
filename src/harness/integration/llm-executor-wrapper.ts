/**
 * LLM 执行包装器
 * 将 LLM 服务集成到 Harness 层
 */

import { createLogger } from '@/utils/logger';
import { AgentHarness } from '../agent-harness';
import { TokenUsageRecord } from '@/types/harness';
import { ToolMetadata } from '../execution/tool-registry';

const logger = createLogger('harness:llm-wrapper');

/**
 * LLM 执行包装器
 */
export class LLMExecutorWrapper {
  private harness: AgentHarness;

  constructor(harness: AgentHarness) {
    this.harness = harness;
    logger.debug('LLM 执行包装器初始化');
  }

  /**
   * 创建 LLM 工具元数据
   * 返回可以注册到 Harness 的工具定义
   */
  createLLMToolMetadata(
    toolName: string,
    executor: (args: any) => Promise<any>
  ): ToolMetadata {
    return {
      name: toolName,
      description: 'LLM 智能推理服务',
      category: 'llm',
      isSafe: true,
      executor: async (args: any) => {
        logger.debug(`执行 LLM 工具: ${toolName}`, { argsKeys: Object.keys(args) });

        try {
          const result = await executor(args);

          // 记录 Token 使用情况
          if (result.usage && result.usage.totalTokens) {
            const tokenRecord: TokenUsageRecord = {
              sessionId: this.harness.getSessionId(),
              executionId: '', // 会在 Harness 中获取
              toolName,
              tokensUsed: result.usage.totalTokens,
              timestamp: Date.now(),
            };

            // 尝试记录到资源管理器
            const resourceManager = this.harness.getResourceManager();
            const recorded = resourceManager.recordTokenUsage(tokenRecord);

            if (!recorded) {
              logger.warn('Token 预算可能超限', {
                toolName,
                tokensUsed: result.usage.totalTokens,
                sessionId: this.harness.getSessionId(),
              });
            }
          }

          return result;
        } catch (error) {
          logger.error(`LLM 工具执行失败: ${toolName}`, {
            error: (error as Error).message,
          });
          throw error;
        }
      },
      version: '1.0.0',
    };
  }

  /**
   * 注册 LLM 工具到 Harness
   */
  registerLLMTool(
    toolName: string,
    executor: (args: any) => Promise<any>
  ): void {
    const metadata = this.createLLMToolMetadata(toolName, executor);
    this.harness.registerTool(metadata);
    logger.info(`LLM 工具已注册: ${toolName}`);
  }

  /**
   * 通过 Harness 执行 LLM 调用
   */
  async executeLLMCall<T = any>(
    toolName: string,
    args: Record<string, any>,
    skipApproval: boolean = false
  ): Promise<T> {
    logger.debug(`通过 Harness 执行 LLM 调用: ${toolName}`);

    const result = await this.harness.execute(toolName, args, {
      enablePreCheck: true,
      enablePostCheck: true,
      enableValidation: true,
      enableMonitoring: true,
      enableAudit: true,
      skipApproval,
      maxRetries: 2,
    });

    if (!result.success) {
      throw new Error(`LLM 调用失败: ${result.error}`);
    }

    return result.data as T;
  }

  /**
   * 获取 LLM Token 使用情况
   */
  getLLMTokenUsage(): {
    sessionUsed: number;
    globalUsed: number;
    sessionRemaining: number;
    globalRemaining: number;
  } {
    const tokenTracker = this.harness.getResourceManager().getTokenTracker();
    const sessionUsage = tokenTracker.getSessionUsage(this.harness.getSessionId());
    const globalUsage = tokenTracker.getGlobalUsage();

    return {
      sessionUsed: sessionUsage.used,
      globalUsed: globalUsage.used,
      sessionRemaining: sessionUsage.remaining,
      globalRemaining: globalUsage.remaining,
    };
  }

  /**
   * 获取 LLM 调用统计
   */
  getLLMCallStats(): {
    rateLimiterStats: any;
    tokenUsage: any;
  } {
    const resourceManager = this.harness.getResourceManager();
    const rateLimiter = resourceManager.getRateLimiter();
    const tokenTracker = resourceManager.getTokenTracker();

    return {
      rateLimiterStats: rateLimiter.getStats('llm-client'),
      tokenUsage: tokenTracker.getStats(),
    };
  }

  /**
   * 便捷方法：执行参数提取（通过 Harness）
   */
  async executeExtraction<T = any>(
    toolName: string,
    args: Record<string, any>,
    executor: () => Promise<T>
  ): Promise<T> {
    logger.debug(`执行参数提取: ${toolName}`);
    
    try {
      // 注册临时工具
      this.registerLLMTool(toolName, async () => {
        return executor();
      });

      // 通过 Harness 执行
      return await this.executeLLMCall<T>(toolName, args, true);
    } catch (error) {
      logger.warn(`参数提取通过 Harness 失败，使用直接执行: ${error}`);
      // 如果 Harness 执行失败，直接执行
      return executor();
    }
  }

  /**
   * 便捷方法：执行推荐处理（通过 Harness）
   */
  async executeRecommendation<T = any>(
    toolName: string,
    args: Record<string, any>,
    executor: () => Promise<T>
  ): Promise<T> {
    logger.debug(`执行推荐处理: ${toolName}`);
    
    try {
      // 注册临时工具
      this.registerLLMTool(toolName, async () => {
        return executor();
      });

      // 通过 Harness 执行
      return await this.executeLLMCall<T>(toolName, args, true);
    } catch (error) {
      logger.warn(`推荐处理通过 Harness 失败，使用直接执行: ${error}`);
      // 如果 Harness 执行失败，直接执行
      return executor();
    }
  }
}
