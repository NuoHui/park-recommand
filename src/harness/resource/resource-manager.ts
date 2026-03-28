/**
 * 资源管理器
 * 统一管理 API 频率、Token、并发等资源
 */

import { createLogger } from '@/utils/logger';
import { ResourceConstraints, TokenUsageRecord } from '@/types/harness';
import { RateLimiter } from './rate-limiter';
import { TokenTracker } from './token-tracker';
import { ConcurrencyController } from './concurrency-controller';

const logger = createLogger('harness:resource-manager');

/**
 * 资源可用性检查结果
 */
export interface ResourceAvailabilityResult {
  canProceed: boolean;
  reasons: string[];
  warnings: string[];
  stats: {
    apiCalls: {
      used: number;
      remaining: number;
    };
    tokens: {
      sessionUsed: number;
      globalUsed: number;
      sessionRemaining: number;
      globalRemaining: number;
    };
    concurrency: {
      active: number;
      pending: number;
      max: number;
    };
  };
}

/**
 * 资源管理器
 */
export class ResourceManager {
  private rateLimiter: RateLimiter;
  private tokenTracker: TokenTracker;
  private concurrencyController: ConcurrencyController;
  private constraints: ResourceConstraints;

  constructor(constraints: ResourceConstraints) {
    this.constraints = constraints;

    // 初始化各个子模块
    this.rateLimiter = new RateLimiter({
      windowMs: 60000, // 1 分钟
      maxRequests: constraints.maxAPICallsPerMinute,
    });

    this.tokenTracker = new TokenTracker(constraints.globalTokenBudget);
    this.tokenTracker.setSessionLimit('default', constraints.maxTokensPerSession);

    this.concurrencyController = new ConcurrencyController(constraints.maxConcurrentTasks);

    logger.debug('资源管理器初始化', { constraints });
  }

  /**
   * 检查资源是否可用
   */
  checkResourceAvailability(
    sessionId: string,
    toolName: string,
    estimatedTokens: number = 0
  ): ResourceAvailabilityResult {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let canProceed = true;

    // 1. 检查 API 频率
    const apiCallsStats = this.rateLimiter.getStats(toolName);

    if (!this.rateLimiter.canRequest(toolName)) {
      reasons.push(
        `${toolName} 达到频率限制 (${apiCallsStats.totalRequests}/${this.constraints.maxAPICallsPerMinute}，${apiCallsStats.resetTime}ms 后重置)`
      );
      canProceed = false;
    } else if (apiCallsStats.remainingRequests < this.constraints.maxAPICallsPerMinute * 0.2) {
      warnings.push(
        `${toolName} 频率限制使用率较高 (${apiCallsStats.totalRequests}/${this.constraints.maxAPICallsPerMinute})`
      );
    }

    // 2. 检查 Token 预算
    const sessionUsage = this.tokenTracker.getSessionUsage(sessionId);
    const globalUsage = this.tokenTracker.getGlobalUsage();

    if (sessionUsage.used + estimatedTokens > sessionUsage.limit) {
      reasons.push(
        `会话 Token 预算即将耗尽 (${sessionUsage.used}/${sessionUsage.limit}，需要 ${estimatedTokens})`
      );
      canProceed = false;
    } else if (sessionUsage.used + estimatedTokens > sessionUsage.limit * 0.8) {
      warnings.push(
        `会话 Token 使用率较高 (${sessionUsage.used}/${sessionUsage.limit})`
      );
    }

    if (globalUsage.used + estimatedTokens > globalUsage.limit) {
      reasons.push(
        `全局 Token 预算即将耗尽 (${globalUsage.used}/${globalUsage.limit}，需要 ${estimatedTokens})`
      );
      canProceed = false;
    } else if (globalUsage.used + estimatedTokens > globalUsage.limit * 0.8) {
      warnings.push(
        `全局 Token 使用率较高 (${globalUsage.used}/${globalUsage.limit})`
      );
    }

    // 3. 检查并发
    const concurrencyStats = this.concurrencyController.getStats();

    if (concurrencyStats.activeCount >= concurrencyStats.maxConcurrent) {
      warnings.push(
        `并发已满 (${concurrencyStats.activeCount}/${concurrencyStats.maxConcurrent})`
      );
    }

    logger.debug('资源可用性检查完成', {
      sessionId,
      toolName,
      canProceed,
      reasons,
      warnings,
    });

    return {
      canProceed,
      reasons,
      warnings,
      stats: {
        apiCalls: {
          used: apiCallsStats.totalRequests,
          remaining: apiCallsStats.remainingRequests,
        },
        tokens: {
          sessionUsed: sessionUsage.used,
          globalUsed: globalUsage.used,
          sessionRemaining: sessionUsage.remaining,
          globalRemaining: globalUsage.remaining,
        },
        concurrency: {
          active: concurrencyStats.activeCount,
          pending: concurrencyStats.pendingCount,
          max: concurrencyStats.maxConcurrent,
        },
      },
    };
  }

  /**
   * 记录 API 调用
   */
  recordAPICall(toolName: string): void {
    this.rateLimiter.recordRequest(toolName);
    logger.debug(`API 调用已记录: ${toolName}`);
  }

  /**
   * 记录 Token 使用
   */
  recordTokenUsage(record: TokenUsageRecord): boolean {
    return this.tokenTracker.recordUsage(record);
  }

  /**
   * 执行受限的任务
   */
  async executeControlledTask<T>(
    taskId: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.concurrencyController.execute(taskId, fn);
  }

  /**
   * 获取频率限制器
   */
  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }

  /**
   * 获取 Token 追踪器
   */
  getTokenTracker(): TokenTracker {
    return this.tokenTracker;
  }

  /**
   * 获取并发控制器
   */
  getConcurrencyController(): ConcurrencyController {
    return this.concurrencyController;
  }

  /**
   * 获取综合统计信息
   */
  getStats(): {
    rateLimiter: any;
    tokenTracker: any;
    concurrency: any;
  } {
    // 由于 getStats 需要参数，我们获取通用信息
    return {
      rateLimiter: {
        maxRequests: this.constraints.maxAPICallsPerMinute,
        windowMs: 60000,
      },
      tokenTracker: this.tokenTracker.getStats(),
      concurrency: this.concurrencyController.getStats(),
    };
  }

  /**
   * 重置所有资源计数
   */
  resetAll(): void {
    this.rateLimiter.resetAll();
    this.tokenTracker.resetGlobalUsage();
    this.concurrencyController.clearHistory();
    logger.info('所有资源计数已重置');
  }

  /**
   * 更新约束配置
   */
  updateConstraints(constraints: Partial<ResourceConstraints>): void {
    this.constraints = { ...this.constraints, ...constraints };

    // 更新各子模块的配置
    if (constraints.maxAPICallsPerMinute) {
      this.rateLimiter.updateConfig({
        maxRequests: constraints.maxAPICallsPerMinute,
      });
    }

    if (constraints.maxConcurrentTasks) {
      this.concurrencyController.setMaxConcurrent(constraints.maxConcurrentTasks);
    }

    if (constraints.globalTokenBudget) {
      this.tokenTracker.setGlobalLimit(constraints.globalTokenBudget);
    }

    logger.debug('资源约束已更新', { constraints: this.constraints });
  }

  /**
   * 等待所有任务完成
   */
  async waitAllTasks(timeout?: number): Promise<void> {
    return this.concurrencyController.waitAll(timeout);
  }
}
