/**
 * 缓存键前缀和分类
 */
export enum CacheCategory {
  LOCATION = 'location', // 地点数据
  DISTANCE = 'distance', // 距离计算结果
  LLM_RESPONSE = 'llm_response', // LLM 响应
  RECOMMENDATION = 'recommendation', // 推荐结果
  SESSION = 'session', // 对话会话
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  category: CacheCategory;
  hits: number; // 命中次数
  misses: number; // 未命中次数
  writes: number; // 写入次数
  deletes: number; // 删除次数
  totalSize: number; // 总大小（字节）
  lastAccess: number; // 最后访问时间
  createdAt: number; // 创建时间
}

/**
 * 缓存过期策略
 */
export interface CacheExpirePolicy {
  category: CacheCategory;
  ttl: number; // 生存时间（秒）
  maxAge?: number; // 最大年龄（秒），超过此时间即使未过期也可能被清理
}

/**
 * 去重配置
 */
export interface DeduplicationConfig {
  category: CacheCategory;
  fields: string[]; // 用于去重的字段列表
  strategy: 'keep_first' | 'keep_latest' | 'merge'; // 去重策略
}

/**
 * 缓存统计查询结果
 */
export interface CacheStatsResult {
  total: number; // 总缓存数
  totalSize: number; // 总大小（字节）
  expiredCount: number; // 已过期数量
  byCategory: Record<CacheCategory, CacheStats>;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
  category: CacheCategory;
  operation: 'set' | 'get' | 'delete';
  successCount: number;
  failureCount: number;
  totalCount: number;
  duration: number; // 毫秒
}

/**
 * 缓存清理结果
 */
export interface CleanupResult {
  deletedCount: number;
  freedSize: number; // 字节
  totalDuration: number; // 毫秒
  details: {
    expiredCount: number;
    oversizedCount: number;
    manualCount: number;
  };
}
