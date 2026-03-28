/**
 * Token 追踪器
 * 追踪 LLM Token 的使用情况
 */

import { createLogger } from '@/utils/logger';

const logger = createLogger('harness:token-tracker');

/**
 * Token 使用记录
 */
export interface TokenUsageRecord {
  sessionId: string;
  executionId: string;
  toolName: string;
  tokensUsed: number;
  timestamp: number;
}

/**
 * Token 追踪器
 */
export class TokenTracker {
  private sessionTokenUsage: Map<string, number> = new Map();
  private globalTokenUsage: number = 0;
  private tokenUsageHistory: TokenUsageRecord[] = [];
  private sessionTokenLimits: Map<string, number> = new Map();
  private globalTokenLimit: number;
  private maxHistorySize: number = 10000; // 最多保存 10000 条记录

  constructor(globalTokenLimit: number = 100000) {
    this.globalTokenLimit = globalTokenLimit;
    logger.debug('Token 追踪器初始化', { globalTokenLimit });
  }

  /**
   * 记录 Token 使用
   */
  recordUsage(record: TokenUsageRecord): boolean {
    const { sessionId, toolName, tokensUsed } = record;

    // 检查全局预算
    if (this.globalTokenUsage + tokensUsed > this.globalTokenLimit) {
      logger.warn('全局 Token 预算即将耗尽', {
        current: this.globalTokenUsage,
        used: tokensUsed,
        limit: this.globalTokenLimit,
        remaining: this.globalTokenLimit - this.globalTokenUsage,
      });
      return false;
    }

    // 检查会话预算
    const sessionLimit = this.sessionTokenLimits.get(sessionId) || 32000;
    const currentSessionUsage = this.sessionTokenUsage.get(sessionId) || 0;

    if (currentSessionUsage + tokensUsed > sessionLimit) {
      logger.warn('会话 Token 预算即将耗尽', {
        sessionId,
        current: currentSessionUsage,
        used: tokensUsed,
        limit: sessionLimit,
        remaining: sessionLimit - currentSessionUsage,
      });
      return false;
    }

    // 记录使用情况
    this.sessionTokenUsage.set(sessionId, currentSessionUsage + tokensUsed);
    this.globalTokenUsage += tokensUsed;
    this.tokenUsageHistory.push(record);

    // 清理历史记录
    if (this.tokenUsageHistory.length > this.maxHistorySize) {
      this.tokenUsageHistory.shift();
    }

    logger.debug('Token 使用已记录', {
      sessionId,
      tool: toolName,
      used: tokensUsed,
      sessionTotal: this.sessionTokenUsage.get(sessionId),
      globalTotal: this.globalTokenUsage,
    });

    return true;
  }

  /**
   * 获取会话的 Token 使用情况
   */
  getSessionUsage(sessionId: string): {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  } {
    const used = this.sessionTokenUsage.get(sessionId) || 0;
    const limit = this.sessionTokenLimits.get(sessionId) || 32000;
    const remaining = Math.max(0, limit - used);
    const percentage = (used / limit) * 100;

    return { used, limit, remaining, percentage };
  }

  /**
   * 获取全局 Token 使用情况
   */
  getGlobalUsage(): {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  } {
    const used = this.globalTokenUsage;
    const limit = this.globalTokenLimit;
    const remaining = Math.max(0, limit - used);
    const percentage = (used / limit) * 100;

    return { used, limit, remaining, percentage };
  }

  /**
   * 为会话设置 Token 限制
   */
  setSessionLimit(sessionId: string, limit: number): void {
    this.sessionTokenLimits.set(sessionId, limit);
    logger.debug(`会话 Token 限制已设置: ${sessionId} = ${limit}`);
  }

  /**
   * 为会话重置 Token 计数
   */
  resetSessionUsage(sessionId: string): void {
    const usage = this.sessionTokenUsage.get(sessionId) || 0;
    this.sessionTokenUsage.delete(sessionId);
    logger.debug(`会话 Token 计数已重置: ${sessionId}`, { previousUsage: usage });
  }

  /**
   * 重置全局 Token 计数
   */
  resetGlobalUsage(): void {
    const previousUsage = this.globalTokenUsage;
    this.globalTokenUsage = 0;
    this.sessionTokenUsage.clear();
    logger.debug('全局 Token 计数已重置', { previousUsage });
  }

  /**
   * 获取 Token 使用历史（按工具）
   */
  getUsageHistoryByTool(toolName: string, limit: number = 100): TokenUsageRecord[] {
    return this.tokenUsageHistory
      .filter((record) => record.toolName === toolName)
      .slice(-limit);
  }

  /**
   * 获取会话的 Token 使用历史
   */
  getSessionUsageHistory(sessionId: string, limit: number = 100): TokenUsageRecord[] {
    return this.tokenUsageHistory
      .filter((record) => record.sessionId === sessionId)
      .slice(-limit);
  }

  /**
   * 检查是否超过限制
   */
  isExceeded(sessionId: string, tokensToUse: number): boolean {
    const globalUsage = this.getGlobalUsage();
    const sessionUsage = this.getSessionUsage(sessionId);

    return (
      globalUsage.used + tokensToUse > globalUsage.limit ||
      sessionUsage.used + tokensToUse > sessionUsage.limit
    );
  }

  /**
   * 获取预计剩余时间（基于使用速率）
   */
  getEstimatedBudgetExhaustionTime(sessionId: string): number {
    const sessionRecords = this.getSessionUsageHistory(sessionId, 10);

    if (sessionRecords.length < 2) {
      return -1; // 无法预测
    }

    // 计算平均速率
    const timeSpan = sessionRecords[sessionRecords.length - 1].timestamp - sessionRecords[0].timestamp;
    const tokenSpan = sessionRecords.reduce((sum, r) => sum + r.tokensUsed, 0);

    if (timeSpan === 0 || tokenSpan === 0) {
      return -1;
    }

    const avgRate = tokenSpan / timeSpan; // tokens/ms
    const sessionUsage = this.getSessionUsage(sessionId);

    return sessionUsage.remaining / avgRate;
  }

  /**
   * 更新全局限制
   */
  setGlobalLimit(limit: number): void {
    this.globalTokenLimit = limit;
    logger.debug(`全局 Token 限制已更新: ${limit}`);
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    this.tokenUsageHistory = [];
    logger.debug('Token 使用历史已清空');
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    globalUsage: any;
    sessionCount: number;
    historyRecords: number;
  } {
    return {
      globalUsage: this.getGlobalUsage(),
      sessionCount: this.sessionTokenUsage.size,
      historyRecords: this.tokenUsageHistory.length,
    };
  }
}
