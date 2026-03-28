/**
 * 地图执行包装器
 * 将高德地图服务集成到 Harness 层
 */

import { createLogger } from '@/utils/logger';
import { AgentHarness } from '../agent-harness';
import { ToolMetadata } from '../execution/tool-registry';

const logger = createLogger('harness:map-wrapper');

/**
 * 地图执行包装器
 */
export class MapExecutorWrapper {
  private harness: AgentHarness;

  constructor(harness: AgentHarness) {
    this.harness = harness;
    logger.debug('地图执行包装器初始化');
  }

  /**
   * 创建地图工具元数据
   */
  createMapToolMetadata(
    toolName: string,
    executor: (args: any) => Promise<any>
  ): ToolMetadata {
    return {
      name: toolName,
      description: '高德地图 API 服务',
      category: 'map',
      isSafe: true,
      executor: async (args: any) => {
        logger.debug(`执行地图工具: ${toolName}`, { argsKeys: Object.keys(args) });

        try {
          const result = await executor(args);

          logger.debug(`地图工具执行成功: ${toolName}`, {
            resultType: typeof result,
            resultSize: JSON.stringify(result).length,
          });

          return result;
        } catch (error) {
          logger.error(`地图工具执行失败: ${toolName}`, {
            error: (error as Error).message,
          });
          throw error;
        }
      },
      version: '1.0.0',
    };
  }

  /**
   * 注册地图工具到 Harness
   */
  registerMapTool(
    toolName: string,
    executor: (args: any) => Promise<any>
  ): void {
    const metadata = this.createMapToolMetadata(toolName, executor);
    this.harness.registerTool(metadata);
    logger.info(`地图工具已注册: ${toolName}`);
  }

  /**
   * 通过 Harness 执行地图查询
   */
  async executeMapQuery<T = any>(
    toolName: string,
    args: Record<string, any>,
    skipApproval: boolean = false
  ): Promise<T> {
    logger.debug(`通过 Harness 执行地图查询: ${toolName}`);

    const result = await this.harness.execute(toolName, args, {
      enablePreCheck: true,
      enablePostCheck: true,
      enableValidation: true,
      enableMonitoring: true,
      enableAudit: true,
      skipApproval,
      maxRetries: 1,
    });

    if (!result.success) {
      throw new Error(`地图查询失败: ${result.error}`);
    }

    return result.data as T;
  }

  /**
   * 获取地图 API 调用统计
   */
  getMapAPIStats(): {
    callsLastMinute: number;
    remainingCalls: number;
    resetTime: number;
  } {
    const resourceManager = this.harness.getResourceManager();
    const rateLimiter = resourceManager.getRateLimiter();

    const stats = rateLimiter.getStats('amap-client');

    return {
      callsLastMinute: stats.totalRequests,
      remainingCalls: stats.remainingRequests,
      resetTime: stats.resetTime,
    };
  }

  /**
   * 批量地图查询
   */
  async batchMapQueries<T = any>(
    toolName: string,
    queryList: Array<Record<string, any>>
  ): Promise<T[]> {
    logger.debug(`执行批量地图查询: ${toolName}`, {
      queryCount: queryList.length,
    });

    const concurrencyController = this.harness
      .getResourceManager()
      .getConcurrencyController();

    const results: T[] = [];

    for (const query of queryList) {
      const result = await concurrencyController.execute(
        `${toolName}_${Math.random()}`,
        async () => {
          return this.executeMapQuery<T>(toolName, query, true);
        }
      );
      results.push(result);
    }

    return results;
  }

  /**
   * 便捷方法：执行 POI 搜索（通过 Harness）
   */
  async executePOISearch<T = any>(
    toolName: string,
    searchParams: Record<string, any>,
    executor: () => Promise<T>
  ): Promise<T> {
    logger.debug(`执行 POI 搜索: ${toolName}`);
    
    try {
      // 注册临时工具
      this.registerMapTool(toolName, async () => {
        return executor();
      });

      // 通过 Harness 执行
      return await this.executeMapQuery<T>(toolName, searchParams, true);
    } catch (error) {
      logger.warn(`POI 搜索通过 Harness 失败，使用直接执行: ${error}`);
      // 如果 Harness 执行失败，直接执行
      return executor();
    }
  }
}
