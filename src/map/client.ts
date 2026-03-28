/**
 * 高德地图 API 客户端
 * 支持 POI 搜索、距离计算、地址编码等核心功能
 */

import axios, { AxiosInstance } from 'axios';
import logger from '@/utils/logger';
import {
  IMapClient,
  MapClientConfig,
  MapSearchParams,
  MapSearchResponse,
  MapDistanceParams,
  MapDistanceResult,
  MapGeocodeParams,
  MapGeocodeResponse,
  MapReverseGeocodeParams,
  MapReverseGeocodeResponse,
  AMAP_ERROR_CODES,
} from '@/types/map';

export class AmapClient implements IMapClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private retryCount: number;
  private retryDelay: number;

  constructor(config: MapClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://restapi.amap.com/v3';
    this.timeout = config.timeout || 10000;
    this.retryCount = config.retryCount || 3;
    this.retryDelay = config.retryDelay || 1000;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'User-Agent': 'ParkRecommender/1.0',
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 带重试的 API 调用
   */
  private async retryRequest<T>(
    fn: () => Promise<T>,
    retries = this.retryCount
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        logger.debug(`API 调用失败，${this.retryDelay}ms 后重试 (${this.retryCount - retries + 1}/${this.retryCount})`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.retryRequest(fn, retries - 1);
      }
      throw error;
    }
  }

  /**
   * POI 文本搜索
   * 搜索指定区域内的地点信息
   */
  async searchPOI(params: MapSearchParams): Promise<MapSearchResponse> {
    try {
      logger.debug(`POI 搜索: keywords=${params.keywords}, region=${params.region}`);

      const response = await this.retryRequest(async () => {
        return await this.client.get<MapSearchResponse>('/place/text', {
          params: {
            keywords: params.keywords,
            region: params.region,
            pagesize: params.pageSize || 10,
            pagenum: params.pageNum || 1,
            types: params.types?.join('|'),
            key: this.apiKey,
            extensions: 'all', // 获取完整信息
          },
        });
      });

      const data = response.data;

      // 检查响应状态
      if (data.status !== AMAP_ERROR_CODES.SUCCESS) {
        throw new Error(`高德 API 错误: ${data.info} (${data.infocode})`);
      }

      logger.debug(`POI 搜索完成: 找到 ${data.count} 个结果`);
      return data;
    } catch (error) {
      logger.error(`POI 搜索失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 计算距离（驾车或步行）
   */
  async calculateDistance(params: MapDistanceParams): Promise<MapDistanceResult[]> {
    try {
      const originLocations = params.origins
        .map(p => `${p.longitude},${p.latitude}`)
        .join(';');
      const destLocation = `${params.destination.longitude},${params.destination.latitude}`;

      logger.debug(`距离计算: origins=${originLocations}, destination=${destLocation}`);

      const response = await this.retryRequest(async () => {
        return await this.client.get<any>('/distance', {
          params: {
            origins: originLocations,
            destination: destLocation,
            type: params.type || 'driving',
            key: this.apiKey,
          },
        });
      });

      const data = response.data;

      // 检查响应状态
      if (data.status !== AMAP_ERROR_CODES.SUCCESS) {
        throw new Error(`高德 API 错误: ${data.info} (${data.infocode})`);
      }

      // 解析距离结果
      const results: MapDistanceResult[] = (data.results || []).map((result: any) => ({
        distance: result.distance,
        duration: result.duration,
        mode: params.type || 'driving',
      }));

      logger.debug(`距离计算完成: ${results.length} 个结果`);
      return results;
    } catch (error) {
      logger.error(`距离计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 地址编码（地址转坐标）
   */
  async geocode(params: MapGeocodeParams): Promise<MapGeocodeResponse> {
    try {
      logger.debug(`地址编码: address=${params.address}, city=${params.city}`);

      const response = await this.retryRequest(async () => {
        return await this.client.get<MapGeocodeResponse>('/geocode/geo', {
          params: {
            address: params.address,
            city: params.city || '全国',
            key: this.apiKey,
          },
        });
      });

      const data = response.data;

      // 检查响应状态
      if (data.status !== AMAP_ERROR_CODES.SUCCESS) {
        throw new Error(`高德 API 错误: ${data.info} (${data.infocode})`);
      }

      logger.debug(`地址编码完成: 找到 ${(data.geocodes || []).length} 个结果`);
      return data;
    } catch (error) {
      logger.error(`地址编码失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 反向地址编码（坐标转地址）
   */
  async reverseGeocode(params: MapReverseGeocodeParams): Promise<MapReverseGeocodeResponse> {
    try {
      const location = `${params.location.longitude},${params.location.latitude}`;
      logger.debug(`反向地址编码: location=${location}`);

      const response = await this.retryRequest(async () => {
        return await this.client.get<MapReverseGeocodeResponse>('/geocode/regeo', {
          params: {
            location,
            poitype: params.poiType || '',
            key: this.apiKey,
            extensions: 'all',
          },
        });
      });

      const data = response.data;

      // 检查响应状态
      if (data.status !== AMAP_ERROR_CODES.SUCCESS) {
        throw new Error(`高德 API 错误: ${data.info} (${data.infocode})`);
      }

      logger.debug(`反向地址编码完成`);
      return data;
    } catch (error) {
      logger.error(`反向地址编码失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  /**
   * 验证 API 连接
   * 通过执行一个简单的查询来验证 API Key 是否有效
   */
  async verifyConnection(): Promise<boolean> {
    try {
      logger.info('验证高德 API 连接...');

      const response = await this.client.get<any>('/place/text', {
        params: {
          keywords: '公园',
          region: '深圳',
          pagesize: 1,
          key: this.apiKey,
        },
      });

      const isValid = response.data.status === AMAP_ERROR_CODES.SUCCESS;

      if (isValid) {
        logger.info('✓ 高德 API 连接成功');
      } else {
        logger.error(`✗ 高德 API 连接失败: ${response.data.info}`);
      }

      return isValid;
    } catch (error) {
      logger.error(`✗ 高德 API 连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return false;
    }
  }
}

/**
 * 创建高德地图客户端
 */
export function createMapClient(apiKey: string, baseUrl?: string): AmapClient {
  return new AmapClient({
    apiKey,
    baseUrl,
    timeout: 10000,
    retryCount: 3,
    retryDelay: 1000,
  });
}
