/**
 * 缓存预热器
 * 功能：启动加载热门景点、后台定时更新、智能缓存键生成
 */

import { getLogger } from '@/logger/index.js';
import { getLocationService } from '@/map/service.js';
import { CacheManager } from './manager.js';

const logger = getLogger();

/** 热门景点列表 */
const POPULAR_LOCATIONS = [
  {
    name: '深圳湾公园',
    city: '深圳',
    type: 'scenic',
    keywords: '公园',
  },
  {
    name: '莲花山公园',
    city: '深圳',
    type: 'scenic',
    keywords: '公园',
  },
  {
    name: '北山公园',
    city: '深圳',
    type: 'scenic',
    keywords: '公园',
  },
  {
    name: '马峦山郊野公园',
    city: '深圳',
    type: 'scenic',
    keywords: '郊野',
  },
  {
    name: '塘朗山郊野公园',
    city: '深圳',
    type: 'scenic',
    keywords: '郊野',
  },
  {
    name: '大南山',
    city: '深圳',
    type: 'hiking',
    keywords: '爬山',
  },
  {
    name: '梅沙尖',
    city: '深圳',
    type: 'hiking',
    keywords: '爬山',
  },
  {
    name: '七娘山',
    city: '深圳',
    type: 'hiking',
    keywords: '爬山',
  },
  {
    name: '求水山公园',
    city: '深圳',
    type: 'scenic',
    keywords: '公园',
  },
  {
    name: '笔架山公园',
    city: '深圳',
    type: 'scenic',
    keywords: '公园',
  },
];

export interface CacheWarmerOptions {
  /** 启动是否预热 */
  enableOnStartup?: boolean;
  /** 后台更新间隔（毫秒），0 表示禁用 */
  updateInterval?: number;
  /** 缓存过期时间（毫秒） */
  cacheTTL?: number;
  /** 是否启用自动预热 */
  enableAutoWarmup?: boolean;
  /** 预热间隔（毫秒） */
  warmupInterval?: number;
}

export class CacheWarmer {
  private updateInterval: NodeJS.Timeout | null = null;
  private lastWarmTime: number = 0;
  private warmCount: number = 0;

  private readonly options: Required<CacheWarmerOptions> = {
    enableOnStartup: true,
    updateInterval: 3600000, // 1 小时
    cacheTTL: 86400000, // 24 小时
    enableAutoWarmup: false,
    warmupInterval: 300000, // 5 分钟
  };

  constructor(options: CacheWarmerOptions = {}) {
    Object.assign(this.options, options);

    logger.info('CacheWarmer 已初始化', {
      enableOnStartup: this.options.enableOnStartup,
      updateInterval: this.options.updateInterval,
      cacheTTL: this.options.cacheTTL,
    });

    if (this.options.enableOnStartup) {
      this.start();
    }
  }

  /**
   * 启动缓存预热
   */
  async start(): Promise<void> {
    logger.info('启动缓存预热...');
    const startTime = Date.now();

    try {
      // 执行初始预热
      await this.warmCache();

      const duration = Date.now() - startTime;
      logger.info('缓存预热完成', {
        duration,
        locationsWarmed: POPULAR_LOCATIONS.length,
      });

      // 启动后台定时更新
      if (this.options.updateInterval > 0) {
        this.startBackgroundUpdate();
      }
    } catch (error) {
      logger.error('缓存预热失败', { error });
      throw error;
    }
  }

  /**
   * 停止缓存预热
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      logger.info('缓存预热已停止');
    }
  }

  /**
   * 执行缓存预热
   */
  private async warmCache(): Promise<void> {
    const cacheManager = CacheManager.getInstance();
    const locationService = getLocationService();

    let warmed = 0;
    let failed = 0;

    for (const location of POPULAR_LOCATIONS) {
      try {
        // 生成缓存键
        const cacheKey = this.generateCacheKey(location);

        // 检查是否已缓存
        const cached = await cacheManager.get(cacheKey);
        if (cached) {
          logger.debug('位置已在缓存中', { location: location.name });
          continue;
        }

        // 搜索位置信息
        const result = await locationService.searchRecommendedLocations({
          location: location.name,
          parkType: location.type as any,
        });

        if (result && Array.isArray(result) && result.length > 0) {
          // 缓存结果
          await cacheManager.set(cacheKey, result, this.options.cacheTTL);
          warmed++;

          logger.debug('位置已缓存', {
            location: location.name,
            count: result.length,
          });
        }
      } catch (error) {
        failed++;
        logger.warn('预热位置失败', {
          location: location.name,
          error,
        });
      }
    }

    this.lastWarmTime = Date.now();
    this.warmCount++;

    logger.info('缓存预热统计', {
      warmed,
      failed,
      total: POPULAR_LOCATIONS.length,
      warmCount: this.warmCount,
    });
  }

  /**
   * 启动后台定时更新
   */
  private startBackgroundUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(
      () => {
        this.warmCache().catch((error) => {
          logger.error('后台缓存更新失败', { error });
        });
      },
      this.options.updateInterval,
    );

    logger.info('后台缓存更新已启动', {
      interval: this.options.updateInterval,
    });
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(location: any): string {
    const key = [
      'popular',
      location.city,
      location.type,
      location.name,
    ]
      .filter(Boolean)
      .join(':');
    return `location:${key}`;
  }

  /**
   * 获取预热统计信息
   */
  getStats() {
    return {
      lastWarmTime: this.lastWarmTime,
      warmCount: this.warmCount,
      isRunning: this.updateInterval !== null,
      interval: this.options.updateInterval,
    };
  }

  /**
   * 手动触发一次预热
   */
  async warm(): Promise<void> {
    await this.warmCache();
  }

  /**
   * 预热热门位置（别名）
   */
  async warmupPopularLocations(): Promise<void> {
    await this.warmCache();
  }

  /**
   * 获取状态（别名）
   */
  getStatus(): { warmCount: number; lastWarmTime: number } {
    const stats = this.getStats();
    return {
      warmCount: stats.warmCount,
      lastWarmTime: stats.lastWarmTime,
    };
  }

  /**
   * 清空预热缓存
   */
  async clearWarmedCache(): Promise<void> {
    const cacheManager = CacheManager.getInstance();
    let cleared = 0;

    for (const location of POPULAR_LOCATIONS) {
      const cacheKey = this.generateCacheKey(location);
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        await cacheManager.delete(cacheKey);
        cleared++;
      }
    }

    logger.info('已清空预热缓存', { cleared });
  }
}

// 全局实例
let globalWarmer: CacheWarmer | null = null;

/**
 * 获取全局缓存预热器实例
 */
export function getCacheWarmer(options?: CacheWarmerOptions): CacheWarmer {
  if (!globalWarmer) {
    globalWarmer = new CacheWarmer(options);
  }
  return globalWarmer;
}

/**
 * 重置全局实例（用于测试）
 */
export function resetCacheWarmer(): void {
  globalWarmer?.stop();
  globalWarmer = null;
}
