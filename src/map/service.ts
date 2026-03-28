/**
 * 地点查询服务
 * 整合高德 API 客户端，提供缓存、批量查询等高级功能
 */

import { Location, UserPreference } from '@/types/common';
import {
  MapPOI,
  MapSearchParams,
  SHENZHEN_POI_TYPES,
  DISTANCE_CONSTANTS,
} from '@/types/map';
import { AmapClient, createMapClient } from './client';
import logger from '@/utils/logger';
import { env } from '@/config/env';
import { ParkType } from '@/config/constants';

interface LocationCache {
  [key: string]: {
    data: Location;
    timestamp: number;
  };
}

interface DistanceCache {
  [key: string]: {
    data: number; // 米
    timestamp: number;
  };
}

export class LocationService {
  private static instance: LocationService;
  private client: AmapClient;
  private locationCache: LocationCache = {};
  private distanceCache: DistanceCache = {};
  private cacheExpiration: number; // 毫秒

  private constructor() {
    if (!env.amapApiKey) {
      throw new Error('AMAP_API_KEY is required');
    }

    this.client = createMapClient(env.amapApiKey, env.amapBaseUrl);
    this.cacheExpiration = env.cacheExpiration * 1000; // 转换为毫秒
  }

  /**
   * 获取单例实例
   */
  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * 验证地点服务连接
   */
  async verifyConnection(): Promise<boolean> {
    return await this.client.verifyConnection();
  }

  /**
   * 搜索推荐地点
   * 基于用户偏好搜索符合条件的地点
   */
  async searchRecommendedLocations(
    preference: UserPreference
  ): Promise<Location[]> {
    try {
      logger.debug('搜索推荐地点', { preference });

      const keywords = this.buildSearchKeywords(preference);
      const region = '深圳'; // 高德 API 需要中文地区名称

      const params: MapSearchParams = {
        keywords,
        region,
        pageSize: 25, // 一次最多返回 25 个
        pageNum: 1,
        types: this.getSearchTypes(preference),
      };

      const response = await this.client.searchPOI(params);

      if (!response.pois || response.pois.length === 0) {
        logger.warn('未找到匹配的地点');
        return [];
      }

      // 转换为 Location 对象并应用过滤
      const locations: Location[] = response.pois.map(poi => this.convertPOI(poi));

      // 如果提供了用户坐标，计算距离
      if (preference.latitude && preference.longitude) {
        const locationsWithDistance = await Promise.all(
          locations.map(async loc => ({
            ...loc,
            distance: await this.calculateDistance(
              preference.latitude!,
              preference.longitude!,
              loc.latitude,
              loc.longitude
            ),
          }))
        );

        // 按距离过滤
        const filtered = locationsWithDistance.filter(
          loc =>
            loc.distance! <= (preference.maxDistance || DISTANCE_CONSTANTS.DEFAULT_SEARCH_RADIUS_KM)
        );

        logger.debug(`找到 ${filtered.length} 个符合条件的地点`);
        return filtered;
      }

      logger.debug(`找到 ${locations.length} 个地点`);
      return locations;
    } catch (error) {
      logger.error(`地点搜索失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 获取单个地点详情
   */
  async getLocationDetails(name: string, region = '深圳'): Promise<Location | null> {
    try {
      // 检查缓存
      const cacheKey = `${name}:${region}`;
      const cached = this.getFromCache(this.locationCache, cacheKey);
      if (cached) {
        logger.debug(`从缓存获取地点: ${name}`);
        return cached;
      }

      const response = await this.client.searchPOI({
        keywords: name,
        region,
        pageSize: 1,
        pageNum: 1,
      });

      if (!response.pois || response.pois.length === 0) {
        logger.warn(`未找到地点: ${name}`);
        return null;
      }

      const location = this.convertPOI(response.pois[0]);

      // 存储到缓存
      this.locationCache[cacheKey] = {
        data: location,
        timestamp: Date.now(),
      };

      return location;
    } catch (error) {
      logger.error(`获取地点详情失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 计算两点距离（公里）
   */
  async calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    mode: 'driving' | 'walking' = 'driving'
  ): Promise<number> {
    try {
      const cacheKey = `${lon1},${lat1}:${lon2},${lat2}:${mode}`;

      // 检查缓存
      const cached = this.getFromCache(this.distanceCache, cacheKey);
      if (cached !== undefined) {
        return cached / 1000; // 转换为公里
      }

      const results = await this.client.calculateDistance({
        origins: [{ latitude: lat1, longitude: lon1 }],
        destination: { latitude: lat2, longitude: lon2 },
        type: mode,
      });

      if (!results || results.length === 0) {
        throw new Error('距离计算返回空结果');
      }

      const distanceMeters = results[0].distance;

      // 存储到缓存
      this.distanceCache[cacheKey] = {
        data: distanceMeters,
        timestamp: Date.now(),
      };

      return distanceMeters / 1000; // 转换为公里
    } catch (error) {
      logger.error(`距离计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
      // 返回估算值（直线距离 * 系数）
      const lineDistance = this.calculateLineDistance(lat1, lon1, lat2, lon2);
      return mode === 'driving' ? lineDistance * 1.3 : lineDistance * 1.1;
    }
  }

  /**
   * 批量计算距离
   */
  async calculateDistanceBatch(
    fromLat: number,
    fromLon: number,
    toLocations: Array<{ latitude: number; longitude: number }>,
    mode: 'driving' | 'walking' = 'driving'
  ): Promise<number[]> {
    try {
      const results = await this.client.calculateDistance({
        origins: toLocations,
        destination: { latitude: fromLat, longitude: fromLon },
        type: mode,
      });

      return results.map(r => r.distance / 1000); // 转换为公里
    } catch (error) {
      logger.warn(`批量距离计算失败，使用线性距离估算: ${error instanceof Error ? error.message : '未知错误'}`);
      // 降级：使用直线距离估算
      return toLocations.map(loc =>
        this.calculateLineDistance(fromLat, fromLon, loc.latitude, loc.longitude) *
        (mode === 'driving' ? 1.3 : 1.1)
      );
    }
  }

  /**
   * 获取深圳热门景点
   */
  async getPopularLocations(limit = 10): Promise<Location[]> {
    try {
      const keywords = '公园|景区|山峰';
      const response = await this.client.searchPOI({
        keywords,
        region: '深圳', // 高德 API 需要中文地区名称
        pageSize: Math.min(limit, 25),
        pageNum: 1,
      });

      return response.pois.slice(0, limit).map(poi => this.convertPOI(poi));
    } catch (error) {
      logger.error(`获取热门地点失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return [];
    }
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.locationCache = {};
    this.distanceCache = {};
    logger.info('已清空地点和距离缓存');
  }

  /**
   * 直接调用 POI 搜索（用于参数提取器）
   */
  async searchPOI(params: MapSearchParams): Promise<any> {
    return await this.client.searchPOI(params);
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { locations: number; distances: number } {
    return {
      locations: Object.keys(this.locationCache).length,
      distances: Object.keys(this.distanceCache).length,
    };
  }

  /**
   * 构建搜索关键词
   */
  private buildSearchKeywords(preference: UserPreference): string {
    const keywords: string[] = [];

    if (preference.parkType) {
      if (preference.parkType === ParkType.PARK) {
        keywords.push('公园');
      } else if (preference.parkType === ParkType.HIKING) {
        keywords.push('爬山');
      } else {
        keywords.push('公园', '景区');
      }
    } else {
      keywords.push('公园', '景区'); // 默认搜索
    }

    if (preference.preferredTags?.length) {
      keywords.push(...preference.preferredTags.slice(0, 3));
    }

    return keywords.join('|');
  }

  /**
   * 获取搜索类型
   */
  private getSearchTypes(preference: UserPreference): string[] {
    const types: string[] = [];

    if (preference.parkType === ParkType.HIKING) {
      types.push(SHENZHEN_POI_TYPES.MOUNTAIN, SHENZHEN_POI_TYPES.SCENIC_AREA);
    } else if (preference.parkType === ParkType.PARK) {
      types.push(SHENZHEN_POI_TYPES.PARK, SHENZHEN_POI_TYPES.BOTANICAL_GARDEN);
    } else {
      types.push(
        SHENZHEN_POI_TYPES.PARK,
        SHENZHEN_POI_TYPES.SCENIC_AREA,
        SHENZHEN_POI_TYPES.MOUNTAIN
      );
    }

    return types;
  }

  /**
   * 转换高德 POI 为 Location 对象
   */
  private convertPOI(poi: MapPOI): Location {
    // 高德 API 返回的 location 格式: "经度,纬度" (字符串)
    let latitude = 0;
    let longitude = 0;

    if (typeof poi.location === 'string') {
      const [lon, lat] = poi.location.split(',').map(Number);
      latitude = lat;
      longitude = lon;
    } else if (poi.location && typeof poi.location === 'object') {
      latitude = (poi.location as any).latitude || 0;
      longitude = (poi.location as any).longitude || 0;
    }

    return {
      name: poi.name,
      latitude,
      longitude,
      address: poi.address,
      tags: this.extractTags(poi),
      phone: poi.phone,
      website: poi.website,
    };
  }

  /**
   * 从 POI 提取标签
   */
  private extractTags(poi: MapPOI): string[] {
    const tags: string[] = [];

    // 根据类型提取标签
    const poiType = poi.type.toLowerCase();
    if (poiType.includes('山')) tags.push('爬山');
    if (poiType.includes('公园')) tags.push('公园');
    if (poiType.includes('景区')) tags.push('景区');
    if (poiType.includes('植物')) tags.push('植物');
    if (poiType.includes('水')) tags.push('水上');
    if (poiType.includes('滩')) tags.push('海滩');

    // 根据评分提取标签
    if (poi.shopInfo?.rating) {
      if (poi.shopInfo.rating >= 4.5) tags.push('高评分');
      if (poi.shopInfo.reviewCount && poi.shopInfo.reviewCount > 1000) tags.push('热门');
    }

    return [...new Set(tags)].slice(0, 5);
  }

  /**
   * 计算两点间的直线距离（公里）- Haversine 公式
   */
  private calculateLineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // 地球半径（公里）
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 从缓存获取数据（考虑过期）
   */
  private getFromCache<T>(cache: { [key: string]: { data: T; timestamp: number } }, key: string): T | undefined {
    const entry = cache[key];
    if (!entry) return undefined;

    const age = Date.now() - entry.timestamp;
    if (age > this.cacheExpiration) {
      delete cache[key];
      return undefined;
    }

    return entry.data;
  }
}

/**
 * 获取地点服务单例
 */
export function getLocationService(): LocationService {
  return LocationService.getInstance();
}
