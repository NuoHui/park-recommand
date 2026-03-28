/**
 * 缓存预热器（按需缓存模式）
 * 功能：支持按需缓存，用户查询 → API 调用 → 缓存结果 → 下次快速返回
 * 启动时不预热，避免一次性调用多个接口触发速率限制
 */

import { getLogger } from '@/logger/index.js';
import { getLocationService } from '@/map/service.js';
import { CacheManager } from './manager.js';

const logger = getLogger();

/**
 * 热门景点列表
 * 备用数据：当 API 调用失败时使用
 */
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
  /** 启动是否预热（已废弃，固定为 false，采用按需缓存） */
  enableOnStartup?: boolean;
  /** 后台更新间隔（已废弃，固定为 0，采用按需缓存） */
  updateInterval?: number;
  /** 缓存过期时间（毫秒） */
  cacheTTL?: number;
  /** 是否启用自动预热（已废弃） */
  enableAutoWarmup?: boolean;
  /** 预热间隔（已废弃） */
  warmupInterval?: number;
}

export class CacheWarmer {
  private updateInterval: NodeJS.Timeout | null = null;
  private lastWarmTime: number = 0;
  private warmCount: number = 0;

  private readonly options: Required<CacheWarmerOptions> = {
    enableOnStartup: false, // 按需缓存：禁用启动时预热
    updateInterval: 0, // 按需缓存：禁用后台更新
    cacheTTL: 86400000, // 24 小时
    enableAutoWarmup: false,
    warmupInterval: 0,
  };

  constructor(options: CacheWarmerOptions = {}) {
    Object.assign(this.options, options);

    logger.info('CacheWarmer 已初始化（按需缓存模式）', {
      mode: '按需缓存',
      cacheTTL: this.options.cacheTTL,
      description: '用户查询时调用 API 并缓存，下次查询时从缓存返回',
    });

    // 按需缓存模式下，不启动任何预热或后台任务
  }

  /**
   * 启动缓存预热（按需缓存模式下无需调用）
   * 保留此方法以兼容旧代码，但不执行任何操作
   */
  async start(): Promise<void> {
    logger.debug('按需缓存模式：无需启动预热');
    // 按需缓存模式下，所有数据通过用户查询时按需加载
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
   * 按需缓存：用户查询时调用
   * LocationService 会自动调用此方法来缓存查询结果
   */
  private async cacheQueryResult(key: string, data: any): Promise<void> {
    const cacheManager = CacheManager.getInstance();
    await cacheManager.set(key, data, this.options.cacheTTL);
    logger.debug('查询结果已缓存', { key });
  }

  /**
   * 获取缓存的查询结果
   */
  private async getCachedResult(key: string): Promise<any | null> {
    const cacheManager = CacheManager.getInstance();
    const result = await cacheManager.get(key);
    if (result) {
      logger.debug('从缓存返回结果', { key });
    }
    return result;
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
      mode: 'on-demand', // 按需缓存模式
      cacheTTL: this.options.cacheTTL,
      description: '用户查询时调用 API 并缓存',
    };
  }

  /**
   * 手动触发一次预热（按需缓存模式下不需要）
   */
  async warm(): Promise<void> {
    logger.debug('按需缓存模式：不需要手动预热');
    // 按需缓存模式下，数据通过用户查询时按需加载
  }

  /**
   * 预热热门位置（按需缓存模式下不需要）
   */
  async warmupPopularLocations(): Promise<void> {
    logger.debug('按需缓存模式：不需要预热热门位置');
  }

  /**
   * 获取状态
   */
  getStatus(): { mode: string; cacheTTL: number } {
    return {
      mode: 'on-demand',
      cacheTTL: this.options.cacheTTL,
    };
  }

  /**
   * 清空缓存
   */
  async clearWarmedCache(): Promise<void> {
    const cacheManager = CacheManager.getInstance();
    await cacheManager.clear();
    logger.info('已清空所有缓存');
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
