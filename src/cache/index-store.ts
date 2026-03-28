import logger from '@/utils/logger';
import { Location } from '@/types/common';

/**
 * 缓存索引项
 */
interface IndexEntry {
  key: string;
  type: 'location' | 'recommendation' | 'distance' | 'session';
  createdAt: number;
  expiresAt: number;
  metadata: Record<string, any>;
}

/**
 * 空间索引（四叉树简化版）
 */
interface SpatialIndex {
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  entries: IndexEntry[];
  children?: SpatialIndex[];
}

/**
 * 缓存索引存储 - 用于快速查询和过滤
 */
export class CacheIndexStore {
  private keywordIndex: Map<string, Set<string>>; // 关键词 -> 缓存键
  private typeIndex: Map<string, Set<string>>; // 类型 -> 缓存键
  private spatialIndex: Map<string, Set<string>>; // 地理位置网格 -> 缓存键
  private expirationIndex: Array<{ key: string; expiresAt: number }>; // 按过期时间排序

  constructor() {
    this.keywordIndex = new Map();
    this.typeIndex = new Map();
    this.spatialIndex = new Map();
    this.expirationIndex = [];
  }

  /**
   * 添加关键词索引
   */
  addKeywordIndex(key: string, keywords: string[]): void {
    for (const keyword of keywords) {
      const normalized = keyword.toLowerCase().trim();
      if (!this.keywordIndex.has(normalized)) {
        this.keywordIndex.set(normalized, new Set());
      }
      this.keywordIndex.get(normalized)!.add(key);
    }
  }

  /**
   * 添加类型索引
   */
  addTypeIndex(key: string, type: string): void {
    if (!this.typeIndex.has(type)) {
      this.typeIndex.set(type, new Set());
    }
    this.typeIndex.get(type)!.add(key);
  }

  /**
   * 添加地理位置索引
   */
  addSpatialIndex(key: string, latitude: number, longitude: number, precision: number = 3): void {
    // 使用网格索引（Geohash 简化版）
    const latGrid = Math.round(latitude * Math.pow(10, precision));
    const lonGrid = Math.round(longitude * Math.pow(10, precision));
    const gridKey = `${latGrid},${lonGrid}`;

    if (!this.spatialIndex.has(gridKey)) {
      this.spatialIndex.set(gridKey, new Set());
    }
    this.spatialIndex.get(gridKey)!.add(key);
  }

  /**
   * 添加过期时间索引
   */
  addExpirationIndex(key: string, expiresAt: number): void {
    this.expirationIndex.push({ key, expiresAt });
    this.expirationIndex.sort((a, b) => a.expiresAt - b.expiresAt);
  }

  /**
   * 按关键词查询
   */
  queryByKeyword(keyword: string, limit: number = 10): string[] {
    const normalized = keyword.toLowerCase().trim();
    const results: string[] = [];
    const keys = this.keywordIndex.get(normalized);

    if (keys) {
      for (const key of keys) {
        if (results.length >= limit) break;
        results.push(key);
      }
    }

    // 模糊匹配
    if (results.length < limit) {
      for (const [k, v] of this.keywordIndex) {
        if (k.includes(normalized)) {
          for (const key of v) {
            if (!results.includes(key) && results.length < limit) {
              results.push(key);
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * 按类型查询
   */
  queryByType(type: string): string[] {
    const keys = this.typeIndex.get(type);
    return keys ? Array.from(keys) : [];
  }

  /**
   * 按地理位置查询（矩形范围）
   */
  queryBySpatialBounds(
    minLat: number,
    maxLat: number,
    minLon: number,
    maxLon: number,
    precision: number = 3
  ): string[] {
    const results = new Set<string>();

    // 遍历所有网格点
    const minLatGrid = Math.round(minLat * Math.pow(10, precision));
    const maxLatGrid = Math.round(maxLat * Math.pow(10, precision));
    const minLonGrid = Math.round(minLon * Math.pow(10, precision));
    const maxLonGrid = Math.round(maxLon * Math.pow(10, precision));

    for (let lat = minLatGrid; lat <= maxLatGrid; lat++) {
      for (let lon = minLonGrid; lon <= maxLonGrid; lon++) {
        const gridKey = `${lat},${lon}`;
        const keys = this.spatialIndex.get(gridKey);
        if (keys) {
          for (const key of keys) {
            results.add(key);
          }
        }
      }
    }

    return Array.from(results);
  }

  /**
   * 按距离查询最近的 N 个地点
   */
  queryByDistance(
    latitude: number,
    longitude: number,
    limit: number = 10,
    maxDistance: number = Infinity
  ): string[] {
    // 这是一个简化的实现
    // 真实场景中应该使用 Haversine 公式
    const precision = 3;
    const latGrid = Math.round(latitude * Math.pow(10, precision));
    const lonGrid = Math.round(longitude * Math.pow(10, precision));

    // 搜索范围：从近到远
    const candidates: { key: string; distance: number }[] = [];

    for (const [gridKey, keys] of this.spatialIndex) {
      const [lat, lon] = gridKey.split(',').map(Number);
      const distance = Math.sqrt(Math.pow(lat - latGrid, 2) + Math.pow(lon - lonGrid, 2));

      if (distance <= maxDistance) {
        for (const key of keys) {
          candidates.push({ key, distance });
        }
      }
    }

    // 排序并返回
    return candidates
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
      .map(c => c.key);
  }

  /**
   * 获取即将过期的缓存（前 N 个）
   */
  getExpiringKeys(limit: number = 10): string[] {
    const now = Date.now();
    return this.expirationIndex
      .filter(entry => entry.expiresAt > now)
      .sort((a, b) => a.expiresAt - b.expiresAt)
      .slice(0, limit)
      .map(entry => entry.key);
  }

  /**
   * 获取已过期的缓存
   */
  getExpiredKeys(): string[] {
    const now = Date.now();
    return this.expirationIndex
      .filter(entry => entry.expiresAt <= now)
      .map(entry => entry.key);
  }

  /**
   * 移除索引条目
   */
  removeKey(key: string): void {
    // 从所有索引中移除
    for (const [, keys] of this.keywordIndex) {
      keys.delete(key);
    }
    for (const [, keys] of this.typeIndex) {
      keys.delete(key);
    }
    for (const [, keys] of this.spatialIndex) {
      keys.delete(key);
    }
    this.expirationIndex = this.expirationIndex.filter(entry => entry.key !== key);
  }

  /**
   * 清空所有索引
   */
  clear(): void {
    this.keywordIndex.clear();
    this.typeIndex.clear();
    this.spatialIndex.clear();
    this.expirationIndex = [];
  }

  /**
   * 获取索引统计
   */
  getStats(): {
    keywordCount: number;
    typeCount: number;
    spatialGridCount: number;
    expirationEntries: number;
  } {
    return {
      keywordCount: this.keywordIndex.size,
      typeCount: this.typeIndex.size,
      spatialGridCount: this.spatialIndex.size,
      expirationEntries: this.expirationIndex.length,
    };
  }

  /**
   * 索引地点数据
   */
  indexLocation(key: string, location: Location): void {
    // 关键词索引
    const keywords = [
      location.name,
      ...(location.tags || []),
      ...(location.address?.split(' ') || []),
    ];
    this.addKeywordIndex(key, keywords);

    // 类型索引
    this.addTypeIndex(key, 'location');

    // 地理位置索引
    this.addSpatialIndex(key, location.latitude, location.longitude);
  }

  /**
   * 批量索引地点
   */
  indexLocations(locations: Location[]): void {
    for (const location of locations) {
      const key = `location:${location.name}:${location.latitude}:${location.longitude}`;
      this.indexLocation(key, location);
    }
  }
}

/**
 * 创建全局索引存储
 */
let indexStore: CacheIndexStore | null = null;

export function getCacheIndexStore(): CacheIndexStore {
  if (!indexStore) {
    indexStore = new CacheIndexStore();
  }
  return indexStore;
}
