/**
 * 缓存执行包装器
 * 将缓存服务集成到 Harness 层
 */

import { createLogger } from '@/utils/logger';
import { AgentHarness } from '../agent-harness';
import { ToolMetadata } from '../execution/tool-registry';

const logger = createLogger('harness:cache-wrapper');

/**
 * 缓存执行包装器
 */
export class CacheExecutorWrapper {
  private harness: AgentHarness;

  constructor(harness: AgentHarness) {
    this.harness = harness;
    logger.debug('缓存执行包装器初始化');
  }

  /**
   * 创建缓存工具元数据
   */
  createCacheToolMetadata(
    toolName: string,
    executor: (args: any) => Promise<any>
  ): ToolMetadata {
    return {
      name: toolName,
      description: '缓存管理服务',
      category: 'cache',
      isSafe: true,
      executor: async (args: any) => {
        logger.debug(`执行缓存工具: ${toolName}`, { argsKeys: Object.keys(args) });

        try {
          const result = await executor(args);

          logger.debug(`缓存工具执行成功: ${toolName}`, {
            resultType: typeof result,
          });

          return result;
        } catch (error) {
          logger.error(`缓存工具执行失败: ${toolName}`, {
            error: (error as Error).message,
          });
          throw error;
        }
      },
      version: '1.0.0',
    };
  }

  /**
   * 注册缓存工具到 Harness
   */
  registerCacheTool(
    toolName: string,
    executor: (args: any) => Promise<any>
  ): void {
    const metadata = this.createCacheToolMetadata(toolName, executor);
    this.harness.registerTool(metadata);
    logger.info(`缓存工具已注册: ${toolName}`);
  }

  /**
   * 通过 Harness 执行缓存操作
   */
  async executeCacheOperation<T = any>(
    toolName: string,
    args: Record<string, any>,
    skipApproval: boolean = true // 缓存操作一般不需要审批
  ): Promise<T> {
    logger.debug(`通过 Harness 执行缓存操作: ${toolName}`);

    const result = await this.harness.execute(toolName, args, {
      enablePreCheck: true,
      enablePostCheck: false,
      enableValidation: false,
      enableMonitoring: true,
      enableAudit: false,
      skipApproval,
      maxRetries: 0,
    });

    if (!result.success) {
      throw new Error(`缓存操作失败: ${result.error}`);
    }

    return result.data as T;
  }

  /**
   * 缓存读取（快速路径）
   */
  async getCached<T = any>(key: string, executor: () => Promise<T>): Promise<T> {
    try {
      // 先尝试从缓存读取
      const cached = await this.executeCacheOperation('cache-get', { key });
      if (cached) {
        logger.debug(`缓存命中: ${key}`);
        return cached as T;
      }
    } catch (error) {
      logger.debug(`缓存读取失败: ${key}`, { error: (error as Error).message });
    }

    // 缓存未命中，执行获取函数
    const value = await executor();

    // 尝试写入缓存
    try {
      await this.executeCacheOperation('cache-set', { key, value });
      logger.debug(`缓存写入成功: ${key}`);
    } catch (error) {
      logger.debug(`缓存写入失败: ${key}`, { error: (error as Error).message });
    }

    return value;
  }

  /**
   * 缓存删除
   */
  async clearCache(key: string): Promise<void> {
    try {
      await this.executeCacheOperation('cache-delete', { key });
      logger.debug(`缓存已清除: ${key}`);
    } catch (error) {
      logger.error(`缓存删除失败: ${key}`, { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 批量清除缓存
   */
  async clearMultipleCache(keys: string[]): Promise<void> {
    logger.debug(`批量清除缓存: ${keys.length} 项`);

    const concurrencyController = this.harness
      .getResourceManager()
      .getConcurrencyController();

    for (const key of keys) {
      await concurrencyController.execute(
        `cache_delete_${key}`,
        async () => {
          await this.clearCache(key);
        }
      );
    }
  }
}
