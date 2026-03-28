import logger from '@/utils/logger';
import { CacheEntry } from '@/types/common';
import { CacheCategory, CacheExpirePolicy } from './types';

/**
 * 默认过期策略（秒）
 */
export const DEFAULT_CACHE_POLICIES: Record<CacheCategory, number> = {
  [CacheCategory.LOCATION]: 7 * 24 * 60 * 60, // 7 天
  [CacheCategory.DISTANCE]: 7 * 24 * 60 * 60, // 7 天
  [CacheCategory.LLM_RESPONSE]: 24 * 60 * 60, // 24 小时
  [CacheCategory.RECOMMENDATION]: 6 * 60 * 60, // 6 小时
  [CacheCategory.SESSION]: 2 * 60 * 60, // 2 小时
};

/**
 * 过期管理模块
 */
export class ExpirationManager {
  private policies: Map<CacheCategory, CacheExpirePolicy>;

  constructor() {
    this.policies = new Map();
    this.initializeDefaultPolicies();
  }

  /**
   * 初始化默认过期策略
   */
  private initializeDefaultPolicies(): void {
    for (const [category, ttl] of Object.entries(DEFAULT_CACHE_POLICIES)) {
      this.policies.set(category as CacheCategory, {
        category: category as CacheCategory,
        ttl,
      });
    }
  }

  /**
   * 设置自定义过期策略
   */
  setPolicy(category: CacheCategory, ttl: number, maxAge?: number): void {
    this.policies.set(category, {
      category,
      ttl,
      maxAge,
    });
    logger.debug(`过期策略已更新: ${category} (TTL: ${ttl}s)`);
  }

  /**
   * 获取分类的 TTL
   */
  getTTL(category: CacheCategory): number {
    return this.policies.get(category)?.ttl || DEFAULT_CACHE_POLICIES[category] || 86400;
  }

  /**
   * 检查缓存是否过期
   */
  isExpired(entry: CacheEntry<any>): boolean {
    return entry.expiresAt < Date.now();
  }

  /**
   * 检查缓存是否即将过期（剩余时间少于 10%）
   */
  isAboutToExpire(entry: CacheEntry<any>, warningThreshold: number = 0.1): boolean {
    const now = Date.now();
    const totalTTL = entry.expiresAt - entry.timestamp;
    const remainingTime = entry.expiresAt - now;

    return remainingTime < totalTTL * warningThreshold;
  }

  /**
   * 获取缓存剩余时间（毫秒）
   */
  getRemainingTTL(entry: CacheEntry<any>): number {
    return Math.max(0, entry.expiresAt - Date.now());
  }

  /**
   * 获取缓存已使用时间百分比
   */
  getUsagePercentage(entry: CacheEntry<any>): number {
    const totalTTL = entry.expiresAt - entry.timestamp;
    const usedTime = Date.now() - entry.timestamp;

    return Math.min(100, Math.round((usedTime / totalTTL) * 100));
  }

  /**
   * 过滤过期的缓存项
   */
  filterExpired<T>(entries: CacheEntry<T>[]): CacheEntry<T>[] {
    const now = Date.now();
    return entries.filter(entry => entry.expiresAt > now);
  }

  /**
   * 获取最快要过期的 N 个缓存
   */
  getMostExpiring<T>(entries: CacheEntry<T>[], limit: number = 10): CacheEntry<T>[] {
    return entries
      .sort((a, b) => a.expiresAt - b.expiresAt)
      .slice(0, limit);
  }

  /**
   * 获取统计信息
   */
  getStats<T>(entries: CacheEntry<T>[]): {
    total: number;
    valid: number;
    expired: number;
    aboutToExpire: number;
    avgRemainingTime: number; // 毫秒
  } {
    const now = Date.now();
    let validCount = 0;
    let expiredCount = 0;
    let aboutToExpireCount = 0;
    let totalRemaining = 0;

    for (const entry of entries) {
      const isExpired = entry.expiresAt < now;
      const remaining = entry.expiresAt - now;

      if (isExpired) {
        expiredCount++;
      } else {
        validCount++;
        totalRemaining += remaining;

        const totalTTL = entry.expiresAt - entry.timestamp;
        if (remaining < totalTTL * 0.1) {
          aboutToExpireCount++;
        }
      }
    }

    return {
      total: entries.length,
      valid: validCount,
      expired: expiredCount,
      aboutToExpire: aboutToExpireCount,
      avgRemainingTime: validCount > 0 ? totalRemaining / validCount : 0,
    };
  }

  /**
   * 计算需要清理的缓存（基于 LRU 策略）
   */
  calculateLRUCandidates<T>(
    entries: CacheEntry<T>[],
    targetSize: number
  ): CacheEntry<T>[] {
    // 优先级：过期 > 即将过期 > 最少使用
    const candidates: { entry: CacheEntry<T>; priority: number }[] = [];
    const now = Date.now();

    for (const entry of entries) {
      let priority = 0;

      // 过期项最高优先级
      if (entry.expiresAt < now) {
        priority = 3;
      }
      // 即将过期项次高优先级
      else if (this.isAboutToExpire(entry)) {
        priority = 2;
      }
      // 其他项基于最后访问时间（这里用 timestamp 作为代理）
      else {
        priority = 1;
      }

      candidates.push({ entry, priority });
    }

    // 排序：优先级高 > 时间早
    candidates.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.entry.timestamp - b.entry.timestamp;
    });

    return candidates.slice(0, targetSize).map(c => c.entry);
  }

  /**
   * 生成过期信息报告
   */
  generateReport<T>(entries: CacheEntry<T>[]): string {
    const stats = this.getStats(entries);
    const expiredEntries = entries.filter(e => e.expiresAt < Date.now());

    let report = `
╔══════════════════════════════════════╗
║     缓存过期统计报告                 ║
╚══════════════════════════════════════╝

总计: ${stats.total} 项
✓ 有效: ${stats.valid} 项 (${Math.round((stats.valid / stats.total) * 100)}%)
✗ 已过期: ${stats.expired} 项 (${Math.round((stats.expired / stats.total) * 100)}%)
⏰ 即将过期: ${stats.aboutToExpire} 项 (${Math.round((stats.aboutToExpire / stats.total) * 100)}%)

平均剩余时间: ${this.formatDuration(stats.avgRemainingTime)}
    `.trim();

    if (expiredEntries.length > 0) {
      report += '\n\n已过期项目 (前 5 个):';
      expiredEntries.slice(0, 5).forEach(entry => {
        const expiredTime = Date.now() - entry.expiresAt;
        report += `\n  • ${entry.key}: 已过期 ${this.formatDuration(expiredTime)}`;
      });
    }

    return report;
  }

  /**
   * 格式化时间显示
   */
  private formatDuration(ms: number): string {
    if (ms < 0) return '已过期';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    if (ms < 86400000) return `${Math.round(ms / 3600000)}h`;
    return `${Math.round(ms / 86400000)}d`;
  }
}
