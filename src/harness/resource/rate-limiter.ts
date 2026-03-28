/**
 * 速率限制器
 * 实现 API 调用频率限制
 */

import { createLogger } from '@/utils/logger';

const logger = createLogger('harness:rate-limiter');

/**
 * 速率限制器配置
 */
export interface RateLimiterConfig {
  /** 时间窗口（毫秒） */
  windowMs: number;
  /** 时间窗口内的最大请求数 */
  maxRequests: number;
}

/**
 * 速率限制器
 */
export class RateLimiter {
  private requestTimestamps: Map<string, number[]> = new Map();
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig = { windowMs: 60000, maxRequests: 60 }) {
    this.config = config;
    logger.debug('速率限制器初始化', { config });
  }

  /**
   * 检查是否可以进行请求
   */
  canRequest(key: string): boolean {
    const now = Date.now();
    const timestamps = this.requestTimestamps.get(key) || [];

    // 移除过期的时间戳
    const validTimestamps = timestamps.filter((ts) => now - ts < this.config.windowMs);

    // 检查是否超过限制
    return validTimestamps.length < this.config.maxRequests;
  }

  /**
   * 记录一个请求
   */
  recordRequest(key: string): void {
    const now = Date.now();
    const timestamps = this.requestTimestamps.get(key) || [];

    // 移除过期的时间戳
    const validTimestamps = timestamps.filter((ts) => now - ts < this.config.windowMs);
    validTimestamps.push(now);

    this.requestTimestamps.set(key, validTimestamps);
  }

  /**
   * 获取剩余的请求配额
   */
  getRemainingRequests(key: string): number {
    const now = Date.now();
    const timestamps = this.requestTimestamps.get(key) || [];

    // 移除过期的时间戳
    const validTimestamps = timestamps.filter((ts) => now - ts < this.config.windowMs);

    return Math.max(0, this.config.maxRequests - validTimestamps.length);
  }

  /**
   * 获取重置时间（毫秒）
   */
  getResetTime(key: string): number {
    const timestamps = this.requestTimestamps.get(key) || [];

    if (timestamps.length === 0) {
      return 0;
    }

    // 找到最早的时间戳
    const oldestTimestamp = Math.min(...timestamps);
    const resetTime = oldestTimestamp + this.config.windowMs;

    return Math.max(0, resetTime - Date.now());
  }

  /**
   * 获取当前请求统计
   */
  getStats(key: string): {
    totalRequests: number;
    remainingRequests: number;
    resetTime: number;
  } {
    const now = Date.now();
    const timestamps = this.requestTimestamps.get(key) || [];

    // 移除过期的时间戳
    const validTimestamps = timestamps.filter((ts) => now - ts < this.config.windowMs);

    return {
      totalRequests: validTimestamps.length,
      remainingRequests: this.getRemainingRequests(key),
      resetTime: this.getResetTime(key),
    };
  }

  /**
   * 重置指定 key 的计数
   */
  reset(key: string): void {
    this.requestTimestamps.delete(key);
    logger.debug(`速率限制已重置: ${key}`);
  }

  /**
   * 重置所有计数
   */
  resetAll(): void {
    this.requestTimestamps.clear();
    logger.debug('所有速率限制已重置');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<RateLimiterConfig>): void {
    this.config = { ...this.config, ...config };
    logger.debug('速率限制器配置已更新', { config: this.config });
  }
}
