export { CacheManager } from './manager';
export { ExpirationManager, DEFAULT_CACHE_POLICIES } from './expiration';
export { CacheIndexStore, getCacheIndexStore } from './index-store';
export { CacheCategory } from './types';
export type {
  CacheStats,
  CacheExpirePolicy,
  CacheStatsResult,
  BatchOperationResult,
  CleanupResult,
} from './types';
