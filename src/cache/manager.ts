import logger from '@/utils/logger';
import { CacheEntry } from '@/types/common';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { Deduplicator } from './deduplicator';
import { ExpirationManager, DEFAULT_CACHE_POLICIES } from './expiration';
import { CacheCategory, CacheStats, CacheStatsResult, CleanupResult } from './types';
import { Location, Recommendation } from '@/types/common';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 缓存管理器
 * 统一管理内存缓存和磁盘缓存，支持去重、过期管理、统计
 */
export class CacheManager {
  private static instance: CacheManager;
  private cacheDir: string;
  private memoryCache: Map<string, CacheEntry<any>>;
  private expirationManager: ExpirationManager;
  private stats: Map<CacheCategory, CacheStats>;
  private initialized: boolean = false;

  private constructor() {
    this.cacheDir = path.join(__dirname, '../../.cache');
    this.memoryCache = new Map();
    this.expirationManager = new ExpirationManager();
    this.stats = new Map();
    this.initializeCacheDir();
    this.initializeStats();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * 初始化缓存目录
   */
  private async initializeCacheDir(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      logger.info('缓存目录初始化完成', { cacheDir: this.cacheDir });
      this.initialized = true;
    } catch (error) {
      logger.error('缓存目录初始化失败:', error);
    }
  }

  /**
   * 初始化统计信息
   */
  private initializeStats(): void {
    for (const category of Object.values(CacheCategory)) {
      this.stats.set(category, {
        category,
        hits: 0,
        misses: 0,
        writes: 0,
        deletes: 0,
        totalSize: 0,
        lastAccess: Date.now(),
        createdAt: Date.now(),
      });
    }
  }

  /**
   * 设置缓存
   */
  async set<T>(
    key: string,
    value: T,
    expirationSeconds?: number,
    category?: CacheCategory
  ): Promise<void> {
    if (!this.initialized) {
      logger.warn('缓存管理器未初始化，跳过缓存写入');
      return;
    }

    const cat = category || CacheCategory.SESSION;
    const ttl = expirationSeconds || this.expirationManager.getTTL(cat);
    const now = Date.now();

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: now,
      expiresAt: now + ttl * 1000,
    };

    // 内存缓存
    this.memoryCache.set(key, entry);

    // 磁盘缓存
    await this.writeToDisk(key, entry);

    // 更新统计
    const stat = this.stats.get(cat);
    if (stat) {
      stat.writes++;
      stat.totalSize += JSON.stringify(entry).length;
      stat.lastAccess = now;
    }

    logger.debug('缓存设置', { key, category: cat, expirationSeconds: ttl });
  }

  /**
   * 获取缓存
   */
  async get<T>(key: string, category?: CacheCategory): Promise<T | null> {
    const now = Date.now();
    const cat = category || CacheCategory.SESSION;

    // 先检查内存缓存
    const memEntry = this.memoryCache.get(key);
    if (memEntry && memEntry.expiresAt > now) {
      // 更新统计
      const stat = this.stats.get(cat);
      if (stat) {
        stat.hits++;
        stat.lastAccess = now;
      }
      logger.debug('内存缓存命中', { key });
      return memEntry.value as T;
    }

    // 尝试从磁盘读取
    try {
      const diskEntry = await this.readFromDisk<T>(key);
      if (diskEntry && diskEntry.expiresAt > now) {
        // 重新加入内存缓存
        this.memoryCache.set(key, diskEntry);

        // 更新统计
        const stat = this.stats.get(cat);
        if (stat) {
          stat.hits++;
          stat.lastAccess = now;
        }

        logger.debug('磁盘缓存命中', { key });
        return diskEntry.value;
      }
    } catch (error) {
      logger.debug('磁盘缓存读取失败:', error);
    }

    // 更新未命中统计
    const stat = this.stats.get(cat);
    if (stat) {
      stat.misses++;
      stat.lastAccess = now;
    }

    return null;
  }

  /**
   * 删除缓存
   */
  async delete(key: string, category?: CacheCategory): Promise<void> {
    const cat = category || CacheCategory.SESSION;
    this.memoryCache.delete(key);

    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      await fs.unlink(filePath);

      // 更新统计
      const stat = this.stats.get(cat);
      if (stat) {
        stat.deletes++;
      }

      logger.debug('缓存删除', { key });
    } catch (error) {
      logger.debug('缓存文件删除失败:', error);
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        await fs.unlink(path.join(this.cacheDir, file));
      }
      this.initializeStats();
      logger.info('所有缓存已清空');
    } catch (error) {
      logger.error('清空缓存失败:', error);
    }
  }

  /**
   * 批量设置缓存（带去重）
   */
  async setLocations(
    locations: Location[],
    keyPrefix: string = 'locations'
  ): Promise<void> {
    // 去重
    const deduped = Deduplicator.deduplicateLocations(locations);
    const merged = Deduplicator.mergeLocations(deduped);

    const key = `${keyPrefix}:${Date.now()}`;
    await this.set(
      key,
      merged,
      DEFAULT_CACHE_POLICIES[CacheCategory.LOCATION],
      CacheCategory.LOCATION
    );
  }

  /**
   * 批量获取地点（支持模糊查询）
   */
  async getLocations(pattern?: string): Promise<Location[]> {
    const locations: Location[] = [];

    for (const [key, entry] of this.memoryCache) {
      if (pattern && !key.includes(pattern)) continue;
      if (!this.expirationManager.isExpired(entry)) {
        const value = entry.value as any;
        if (Array.isArray(value)) {
          locations.push(...value);
        }
      }
    }

    return Deduplicator.deduplicateLocations(locations);
  }

  /**
   * 缓存推荐结果（带去重）
   */
  async setRecommendations(
    recommendations: Recommendation[],
    keyPrefix: string = 'recommendations'
  ): Promise<void> {
    const deduped = Deduplicator.deduplicateRecommendations(recommendations);
    const key = `${keyPrefix}:${Date.now()}`;
    await this.set(
      key,
      deduped,
      DEFAULT_CACHE_POLICIES[CacheCategory.RECOMMENDATION],
      CacheCategory.RECOMMENDATION
    );
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheStatsResult {
    let totalSize = 0;
    let expiredCount = 0;

    const entries = Array.from(this.memoryCache.values());
    const now = Date.now();

    for (const entry of entries) {
      totalSize += JSON.stringify(entry).length;
      if (entry.expiresAt < now) {
        expiredCount++;
      }
    }

    const byCategory: Record<CacheCategory, CacheStats> = {} as any;
    for (const [category, stat] of this.stats) {
      byCategory[category] = stat;
    }

    return {
      total: this.memoryCache.size,
      totalSize,
      expiredCount,
      byCategory,
    };
  }

  /**
   * 清理过期缓存
   */
  async cleanup(): Promise<CleanupResult> {
    const startTime = Date.now();
    let deletedCount = 0;
    let freedSize = 0;

    const entries = Array.from(this.memoryCache.entries());
    const now = Date.now();

    for (const [key, entry] of entries) {
      if (this.expirationManager.isExpired(entry)) {
        freedSize += JSON.stringify(entry).length;
        await this.delete(key);
        deletedCount++;
      }
    }

    const duration = Date.now() - startTime;

    logger.info('缓存清理完成', {
      deletedCount,
      freedSize,
      duration,
    });

    return {
      deletedCount,
      freedSize,
      totalDuration: duration,
      details: {
        expiredCount: deletedCount,
        oversizedCount: 0,
        manualCount: 0,
      },
    };
  }

  /**
   * 生成缓存报告
   */
  generateReport(): string {
    const stats = this.getStats();
    const entries = Array.from(this.memoryCache.values());

    const expireStats = this.expirationManager.getStats(entries);

    let report = `
╔═════════════════════════════════════╗
║     缓存系统统计报告                ║
╚═════════════════════════════════════╝

总体统计:
  • 缓存数: ${stats.total} 项
  • 总大小: ${this.formatBytes(stats.totalSize)}
  • 已过期: ${stats.expiredCount} 项
  • 有效率: ${((1 - stats.expiredCount / Math.max(1, stats.total)) * 100).toFixed(1)}%

命中统计:
  • 总命中: ${Object.values(stats.byCategory).reduce((sum, s) => sum + s.hits, 0)} 次
  • 总未命中: ${Object.values(stats.byCategory).reduce((sum, s) => sum + s.misses, 0)} 次
  • 写入: ${Object.values(stats.byCategory).reduce((sum, s) => sum + s.writes, 0)} 次
  • 删除: ${Object.values(stats.byCategory).reduce((sum, s) => sum + s.deletes, 0)} 次

分类统计:
${Object.entries(stats.byCategory)
  .map(
    ([category, stat]) =>
      `  ${category}:
    • 命中: ${stat.hits} | 未命中: ${stat.misses} | 命中率: ${((stat.hits / Math.max(1, stat.hits + stat.misses)) * 100).toFixed(1)}%
    • 大小: ${this.formatBytes(stat.totalSize)}`
  )
  .join('\n')}

过期情况:
  • 有效: ${expireStats.valid} 项
  • 即将过期: ${expireStats.aboutToExpire} 项
  • 平均剩余: ${this.formatDuration(expireStats.avgRemainingTime)}
    `.trim();

    return report;
  }

  /**
   * 获取推荐历史
   */
  async getHistory(limit: number = 10): Promise<
    Array<{
      timestamp: number;
      location?: string;
      parkType?: string;
      count: number;
    }>
  > {
    // 从 SESSION 类别的缓存中获取
    const entries = Array.from(this.memoryCache.entries());
    const sessions = entries
      .filter(([key]) => key.includes('session'))
      .sort(([, a], [, b]) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map(([, entry]) => ({
        timestamp: entry.timestamp,
        count: Array.isArray(entry.value) ? entry.value.length : 1,
      }));

    return sessions;
  }

  /**
   * 写入磁盘
   */
  private async writeToDisk<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
    } catch (error) {
      logger.warn('磁盘缓存写入失败:', error);
    }
  }

  /**
   * 从磁盘读取
   */
  private async readFromDisk<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * 格式化字节
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * 格式化时间
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
