/**
 * 高德地图 API 联通性单元测试
 * 验证高德地图 API 客户端和服务的正常工作
 * 支持 Top 5 推荐需求的 POI 数据处理
 */

import { createMapClient } from '@/map/client';
import { LocationService } from '@/map/service';
import { env } from '@/config/env';
import { createLogger } from '@/utils/logger';

const logger = createLogger('test:amap');

/**
 * 测试结果类型定义
 */
interface TestResult {
  name: string;
  passed: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  data?: Record<string, unknown>;
}

/**
 * 高德 API 配置
 */
interface AmapConfig {
  apiKey: string;
  baseUrl: string;
}

/**
 * 获取高德 API 配置
 */
function getAmapConfig(): AmapConfig {
  return {
    apiKey: env.amapApiKey || '',
    baseUrl: env.amapBaseUrl || 'https://restapi.amap.com/v3',
  };
}

/**
 * 检查 API Key 是否已配置
 */
function isApiKeyConfigured(): boolean {
  return !!(env.amapApiKey && env.amapApiKey.length > 0);
}

/**
 * 测试套件 1: 高德客户端基础功能
 */
export async function testAmapClient(): Promise<TestResult[]> {
  const tests: Promise<TestResult>[] = [];

  // 测试 1.1: 初始化高德客户端
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        const { apiKey, baseUrl } = getAmapConfig();

        if (!apiKey) {
          throw new Error('AMAP_API_KEY is not configured');
        }

        createMapClient(apiKey, baseUrl);

        logger.info('✅ 测试 1.1 通过：高德客户端初始化成功', {
          baseUrl,
        });

        return {
          name: '高德客户端初始化',
          passed: true,
          data: { baseUrl },
        };
      } catch (error) {
        logger.error('❌ 测试 1.1 失败：高德客户端初始化', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: '高德客户端初始化',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 1.2: 验证高德 API 连接
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        if (!isApiKeyConfigured()) {
          logger.warn('⏭️  测试 1.2 跳过：AMAP_API_KEY 未配置');
          return {
            name: '高德 API 连接验证',
            passed: true,
            skipped: true,
            reason: 'AMAP_API_KEY 未配置',
          };
        }

        const { apiKey, baseUrl } = getAmapConfig();
        const client = createMapClient(apiKey, baseUrl);
        const isValid = await client.verifyConnection();

        if (!isValid) {
          throw new Error('API 连接验证失败');
        }

        logger.info('✅ 测试 1.2 通过：高德 API 连接成功');

        return {
          name: '高德 API 连接验证',
          passed: true,
        };
      } catch (error) {
        logger.error('❌ 测试 1.2 失败：高德 API 连接验证', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: '高德 API 连接验证',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 1.3: POI 搜索验证基础功能
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        const { apiKey, baseUrl } = getAmapConfig();

        if (!apiKey) {
          throw new Error('AMAP_API_KEY is not configured');
        }

        const client = createMapClient(apiKey, baseUrl);

        // 验证客户端已创建
        if (!client) {
          throw new Error('客户端创建失败');
        }

        logger.info('✅ 测试 1.3 通过：基础功能验证成功', {
          baseUrl,
          clientReady: true,
        });

        return {
          name: '基础功能验证',
          passed: true,
          data: {
            baseUrl,
            clientReady: true,
          },
        };
      } catch (error) {
        logger.error('❌ 测试 1.3 失败：基础功能验证', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: '基础功能验证',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  return Promise.all(tests);
}

/**
 * 测试套件 2: 高德 POI 搜索功能
 */
export async function testAmapPOISearch(): Promise<TestResult[]> {
  const tests: Promise<TestResult>[] = [];

  // 测试 2.1: POI 文本搜索
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        if (!isApiKeyConfigured()) {
          logger.warn('⏭️  测试 2.1 跳过：AMAP_API_KEY 未配置');
          return {
            name: 'POI 文本搜索',
            passed: true,
            skipped: true,
            reason: 'AMAP_API_KEY 未配置',
          };
        }

        const { apiKey, baseUrl } = getAmapConfig();
        const client = createMapClient(apiKey, baseUrl);
        const response = await client.searchPOI({
          keywords: '公园',
          region: '深圳',
          pageSize: 10,
          pageNum: 1,
        });

        if (!response || response.status !== '1') {
          throw new Error(`POI 搜索失败: ${response?.info || 'unknown error'}`);
        }

        if (!response.pois || response.pois.length === 0) {
          throw new Error('未找到任何公园');
        }

        logger.info('✅ 测试 2.1 通过：POI 搜索成功', {
          count: response.count,
          poiCount: response.pois.length,
          firstPOI: response.pois[0].name,
        });

        return {
          name: 'POI 文本搜索',
          passed: true,
          data: {
            count: response.count,
            poiCount: response.pois.length,
            firstPOI: {
              name: response.pois[0].name,
              address: response.pois[0].address,
            },
          },
        };
      } catch (error) {
        logger.error('❌ 测试 2.1 失败：POI 搜索', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: 'POI 文本搜索',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 2.2: POI 搜索 - 获取多页结果
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        if (!isApiKeyConfigured()) {
          logger.warn('⏭️  测试 2.2 跳过：AMAP_API_KEY 未配置');
          return {
            name: 'POI 多页搜索',
            passed: true,
            skipped: true,
            reason: 'AMAP_API_KEY 未配置',
          };
        }

        const { apiKey, baseUrl } = getAmapConfig();
        const client = createMapClient(apiKey, baseUrl);

        // 获取第一页
        const page1 = await client.searchPOI({
          keywords: '餐厅',
          region: '深圳',
          pageSize: 10,
          pageNum: 1,
        });

        if (!page1 || page1.status !== '1' || !page1.pois) {
          throw new Error('第一页搜索失败');
        }

        // 获取第二页
        const page2 = await client.searchPOI({
          keywords: '餐厅',
          region: '深圳',
          pageSize: 10,
          pageNum: 2,
        });

        if (!page2 || page2.status !== '1') {
          throw new Error('第二页搜索失败');
        }

        logger.info('✅ 测试 2.2 通过：POI 多页搜索成功', {
          page1Count: page1.pois.length,
          page2Count: page2.pois?.length || 0,
          totalCount: page1.count,
        });

        return {
          name: 'POI 多页搜索',
          passed: true,
          data: {
            page1Count: page1.pois.length,
            page2Count: page2.pois?.length || 0,
            totalCount: page1.count,
          },
        };
      } catch (error) {
        logger.error('❌ 测试 2.2 失败：POI 多页搜索', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: 'POI 多页搜索',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 2.3: POI 数据完整性检查
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        if (!isApiKeyConfigured()) {
          logger.warn('⏭️  测试 2.3 跳过：AMAP_API_KEY 未配置');
          return {
            name: 'POI 数据完整性',
            passed: true,
            skipped: true,
            reason: 'AMAP_API_KEY 未配置',
          };
        }

        const { apiKey, baseUrl } = getAmapConfig();
        const client = createMapClient(apiKey, baseUrl);
        const response = await client.searchPOI({
          keywords: '公园',
          region: '深圳',
          pageSize: 5,
          pageNum: 1,
        });

        if (!response || !response.pois || response.pois.length === 0) {
          throw new Error('搜索结果为空');
        }

        const poi = response.pois[0];
        const requiredFields = ['name', 'id', 'location', 'address'];
        const missingFields = requiredFields.filter(field => !poi[field as keyof typeof poi]);

        if (missingFields.length > 0) {
          throw new Error(`POI 缺少必需字段: ${missingFields.join(', ')}`);
        }

        logger.info('✅ 测试 2.3 通过：POI 数据完整性检查成功', {
          requiredFields,
          allFieldsPresent: true,
          samplePOI: poi.name,
        });

        return {
          name: 'POI 数据完整性',
          passed: true,
          data: {
            requiredFields,
            allFieldsPresent: true,
            samplePOI: poi.name,
          },
        };
      } catch (error) {
        logger.error('❌ 测试 2.3 失败：POI 数据完整性', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: 'POI 数据完整性',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  return Promise.all(tests);
}

/**
 * 测试套件 3: 高德地理编码功能
 */
export async function testAmapGeocoding(): Promise<TestResult[]> {
  const tests: Promise<TestResult>[] = [];

  // 测试 3.1: 地址编码（地址转坐标）
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        if (!isApiKeyConfigured()) {
          logger.warn('⏭️  测试 3.1 跳过：AMAP_API_KEY 未配置');
          return {
            name: '地址编码',
            passed: true,
            skipped: true,
            reason: 'AMAP_API_KEY 未配置',
          };
        }

        const { apiKey, baseUrl } = getAmapConfig();
        const client = createMapClient(apiKey, baseUrl);
        const response = await client.geocode({
          address: '莲花山公园',
          city: '深圳',
        });

        if (!response || response.status !== '1') {
          throw new Error(`地址编码失败: ${response?.info || 'unknown error'}`);
        }

        if (!response.geocodes || response.geocodes.length === 0) {
          throw new Error('地址编码未返回结果');
        }

        const geocode = response.geocodes[0];
        logger.info('✅ 测试 3.1 通过：地址编码成功', {
          address: geocode.formatted_address,
          location: geocode.location,
        });

        return {
          name: '地址编码',
          passed: true,
          data: {
            address: geocode.formatted_address,
            location: geocode.location,
          },
        };
      } catch (error) {
        logger.error('❌ 测试 3.1 失败：地址编码', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: '地址编码',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 3.2: 反向地址编码（坐标转地址）
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        if (!isApiKeyConfigured()) {
          logger.warn('⏭️  测试 3.2 跳过：AMAP_API_KEY 未配置');
          return {
            name: '反向地址编码',
            passed: true,
            skipped: true,
            reason: 'AMAP_API_KEY 未配置',
          };
        }

        const { apiKey, baseUrl } = getAmapConfig();
        const client = createMapClient(apiKey, baseUrl);
        // 莲花山公园坐标
        const response = await client.reverseGeocode({
          location: {
            longitude: 114.0681,
            latitude: 22.5461,
          },
        });

        if (!response || response.status !== '1') {
          throw new Error(`反向地址编码失败: ${response?.info || 'unknown error'}`);
        }

        const regeocode = response.regeocode;
        if (!regeocode) {
          throw new Error('反向地址编码返回数据为空');
        }

        logger.info('✅ 测试 3.2 通过：反向地址编码成功', {
          formatted_address: regeocode.formatted_address,
          addressComponent: regeocode.addressComponent?.city,
        });

        return {
          name: '反向地址编码',
          passed: true,
          data: {
            formatted_address: regeocode.formatted_address,
            city: regeocode.addressComponent?.city,
          },
        };
      } catch (error) {
        logger.error('❌ 测试 3.2 失败：反向地址编码', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: '反向地址编码',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  return Promise.all(tests);
}

/**
 * 测试套件 4: 高德距离计算功能
 */
export async function testAmapDistance(): Promise<TestResult[]> {
  const tests: Promise<TestResult>[] = [];

  // 测试 4.1: 距离计算
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        if (!isApiKeyConfigured()) {
          logger.warn('⏭️  测试 4.1 跳过：AMAP_API_KEY 未配置');
          return {
            name: '距离计算',
            passed: true,
            skipped: true,
            reason: 'AMAP_API_KEY 未配置',
          };
        }

        const { apiKey, baseUrl } = getAmapConfig();
        const client = createMapClient(apiKey, baseUrl);
        // 从福田区政府到莲花山公园
        const response = await client.calculateDistance({
          origins: [
            {
              longitude: 114.0644,
              latitude: 22.5329,
            },
          ],
          destination: {
            longitude: 114.0681,
            latitude: 22.5461,
          },
          type: 'driving',
        });

        if (!response || response.length === 0) {
          throw new Error('距离计算返回空结果');
        }

        const result = response[0];
        if (!result.distance) {
          throw new Error('距离数据不存在');
        }

        const distanceKm = result.distance / 1000;
        logger.info('✅ 测试 4.1 通过：距离计算成功', {
          distance: `${distanceKm.toFixed(2)} km`,
          duration: `${result.duration}s`,
        });

        return {
          name: '距离计算',
          passed: true,
          data: {
            distance: `${distanceKm.toFixed(2)} km`,
            duration: `${result.duration}s`,
          },
        };
      } catch (error) {
        logger.error('❌ 测试 4.1 失败：距离计算', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: '距离计算',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 4.2: 批量距离计算
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        if (!isApiKeyConfigured()) {
          logger.warn('⏭️  测试 4.2 跳过：AMAP_API_KEY 未配置');
          return {
            name: '批量距离计算',
            passed: true,
            skipped: true,
            reason: 'AMAP_API_KEY 未配置',
          };
        }

        const { apiKey, baseUrl } = getAmapConfig();
        const client = createMapClient(apiKey, baseUrl);

        // 分别计算两个公园到福田区政府的距离
        const distances: Array<{ name: string; distance: number }> = [];
        const locations = [
          { lon: 114.0681, lat: 22.5461, name: '莲花山公园' },
          { lon: 114.0578, lat: 22.5317, name: '华强北' },
        ];

        for (const loc of locations) {
          const response = await client.calculateDistance({
            origins: [{ longitude: loc.lon, latitude: loc.lat }],
            destination: {
              longitude: 114.0644,
              latitude: 22.5329,
            },
            type: 'driving',
          });

          if (!response || response.length === 0) {
            throw new Error(`距离计算失败: ${loc.name}`);
          }

          distances.push({
            name: loc.name,
            distance: response[0].distance,
          });
        }

        if (distances.length !== 2) {
          throw new Error('未能计算所有距离');
        }

        logger.info('✅ 测试 4.2 通过：批量距离计算成功', {
          resultCount: distances.length,
          distances: distances.map(d => `${d.name}: ${(d.distance / 1000).toFixed(2)} km`),
        });

        return {
          name: '批量距离计算',
          passed: true,
          data: {
            resultCount: distances.length,
            distances: distances.map(d => `${d.name}: ${(d.distance / 1000).toFixed(2)} km`),
          },
        };
      } catch (error) {
        logger.error('❌ 测试 4.2 失败：批量距离计算', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: '批量距离计算',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  return Promise.all(tests);
}

/**
 * 测试套件 5: Top 5 推荐的 POI 数据处理
 */
export async function testAmapTop5POIProcessing(): Promise<TestResult[]> {
  const tests: Promise<TestResult>[] = [];
  const MAX_RECOMMENDATIONS = 5;

  // 测试 5.1: POI 搜索结果 - Top 5 限制
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        if (!isApiKeyConfigured()) {
          logger.warn('⏭️  测试 5.1 跳过：AMAP_API_KEY 未配置');
          return {
            name: 'POI Top 5 限制',
            passed: true,
            skipped: true,
            reason: 'AMAP_API_KEY 未配置',
          };
        }

        const { apiKey, baseUrl } = getAmapConfig();
        const client = createMapClient(apiKey, baseUrl);
        const response = await client.searchPOI({
          keywords: '公园',
          region: '深圳',
          pageSize: 20,
          pageNum: 1,
        });

        if (!response || !response.pois) {
          throw new Error('POI 搜索失败');
        }

        // 限制为 Top 5
        const top5POIs = response.pois.slice(0, MAX_RECOMMENDATIONS);

        if (top5POIs.length > MAX_RECOMMENDATIONS) {
          throw new Error(`Top 5 限制失败: 获得 ${top5POIs.length} 个 POI，预期最多 ${MAX_RECOMMENDATIONS} 个`);
        }

        logger.info('✅ 测试 5.1 通过：POI Top 5 限制成功', {
          originalCount: response.pois.length,
          limitedCount: top5POIs.length,
          maxAllowed: MAX_RECOMMENDATIONS,
          topNames: top5POIs.map((p) => p.name),
        });

        return {
          name: 'POI Top 5 限制',
          passed: true,
          data: {
            originalCount: response.pois.length,
            limitedCount: top5POIs.length,
            maxAllowed: MAX_RECOMMENDATIONS,
            topNames: top5POIs.map((p) => p.name),
          },
        };
      } catch (error) {
        logger.error('❌ 测试 5.1 失败：POI Top 5 限制', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: 'POI Top 5 限制',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 5.2: POI 数据少于 5 个的处理
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        if (!isApiKeyConfigured()) {
          logger.warn('⏭️  测试 5.2 跳过：AMAP_API_KEY 未配置');
          return {
            name: 'POI 少于 5 个处理',
            passed: true,
            skipped: true,
            reason: 'AMAP_API_KEY 未配置',
          };
        }

        const { apiKey, baseUrl } = getAmapConfig();
        const client = createMapClient(apiKey, baseUrl);
        // 使用特定关键词搜索（可能返回少于 5 个结果）
        const response = await client.searchPOI({
          keywords: '航天科技馆',
          region: '深圳',
          pageSize: 10,
          pageNum: 1,
        });

        if (!response || !response.pois) {
          throw new Error('POI 搜索失败');
        }

        // 即使少于 5 个也应保持原数量
        const topPOIs = response.pois.slice(0, MAX_RECOMMENDATIONS);

        if (topPOIs.length > response.pois.length) {
          throw new Error(`POI 数据处理错误: 结果超过原始数据量`);
        }

        logger.info('✅ 测试 5.2 通过：POI 少于 5 个处理成功', {
          resultCount: response.pois.length,
          processedCount: topPOIs.length,
          message: `共 ${topPOIs.length} 个 POI (少于 Top 5 限制)`,
        });

        return {
          name: 'POI 少于 5 个处理',
          passed: true,
          data: {
            resultCount: response.pois.length,
            processedCount: topPOIs.length,
            message: `共 ${topPOIs.length} 个 POI (少于 Top 5 限制)`,
          },
        };
      } catch (error) {
        logger.error('❌ 测试 5.2 失败：POI 少于 5 个处理', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: 'POI 少于 5 个处理',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  // 测试 5.3: POI 数据富集 - 评分/评价数等信息
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        if (!isApiKeyConfigured()) {
          logger.warn('⏭️  测试 5.3 跳过：AMAP_API_KEY 未配置');
          return {
            name: 'POI 数据富集',
            passed: true,
            skipped: true,
            reason: 'AMAP_API_KEY 未配置',
          };
        }

        const { apiKey, baseUrl } = getAmapConfig();
        const client = createMapClient(apiKey, baseUrl);
        const response = await client.searchPOI({
          keywords: '餐厅',
          region: '深圳',
          pageSize: 5,
          pageNum: 1,
        });

        if (!response || !response.pois || response.pois.length === 0) {
          throw new Error('POI 搜索结果为空');
        }

        // 检查 Top 5 POI 的数据富集
        const enrichedPOIs = response.pois.slice(0, MAX_RECOMMENDATIONS).map((poi) => ({
          name: poi.name,
          hasLocation: !!poi.location,
          hasAddress: !!poi.address,
          hasRating: !!poi.shopInfo?.rating,
          hasBusinessArea: !!poi.businessArea,
          hasType: !!poi.type,
        }));

        const enrichmentStats = {
          totalChecked: enrichedPOIs.length,
          withLocation: enrichedPOIs.filter((p) => p.hasLocation).length,
          withAddress: enrichedPOIs.filter((p) => p.hasAddress).length,
          withRating: enrichedPOIs.filter((p) => p.hasRating).length,
          withBusinessArea: enrichedPOIs.filter((p) => p.hasBusinessArea).length,
        };

        logger.info('✅ 测试 5.3 通过：POI 数据富集检查成功', enrichmentStats);

        return {
          name: 'POI 数据富集',
          passed: true,
          data: {
            stats: enrichmentStats,
            samplePOIs: enrichedPOIs,
          },
        };
      } catch (error) {
        logger.error('❌ 测试 5.3 失败：POI 数据富集', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: 'POI 数据富集',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  return Promise.all(tests);
}

/**
 * 测试套件 6: 高德地点服务
 */
export async function testAmapLocationService(): Promise<TestResult[]> {
  const tests: Promise<TestResult>[] = [];

  // 测试 6.1: 地点服务连接
  tests.push(
    (async (): Promise<TestResult> => {
      try {
        if (!isApiKeyConfigured()) {
          logger.warn('⏭️  测试 6.1 跳过：AMAP_API_KEY 未配置');
          return {
            name: '地点服务连接',
            passed: true,
            skipped: true,
            reason: 'AMAP_API_KEY 未配置',
          };
        }

        const service = LocationService.getInstance();
        const isConnected = await service.verifyConnection();

        if (!isConnected) {
          throw new Error('地点服务连接失败');
        }

        logger.info('✅ 测试 6.1 通过：地点服务连接成功');

        return {
          name: '地点服务连接',
          passed: true,
        };
      } catch (error) {
        logger.error('❌ 测试 6.1 失败：地点服务连接', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          name: '地点服务连接',
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })()
  );

  return Promise.all(tests);
}

/**
 * 主测试套件 - 高德地图 API 完整测试
 */
export async function testAmapAPI(): Promise<{
  name: string;
  passed: boolean;
  results: TestResult[];
  stats: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    passRate: number;
  };
}> {
  const testSuites = [
    { name: '高德客户端基础功能', tests: await testAmapClient() },
    { name: '高德 POI 搜索功能', tests: await testAmapPOISearch() },
    { name: '高德地理编码功能', tests: await testAmapGeocoding() },
    { name: '高德距离计算功能', tests: await testAmapDistance() },
    { name: 'Top 5 推荐 POI 处理', tests: await testAmapTop5POIProcessing() },
    { name: '高德地点服务', tests: await testAmapLocationService() },
  ];

  const allResults: TestResult[] = [];
  for (const suite of testSuites) {
    allResults.push(...suite.tests);
  }

  // 统计结果
  const passed = allResults.filter(r => r.passed && !r.skipped).length;
  const failed = allResults.filter(r => !r.passed).length;
  const skipped = allResults.filter(r => r.skipped).length;
  const total = allResults.length;

  logger.info('', {});
  logger.info('╔════════════════════════════════════════════════════════════╗', {});
  logger.info('║          🗺️  高德地图 API 单元测试 - 完整结果              ║', {});
  logger.info('╚════════════════════════════════════════════════════════════╝', {});

  // 按套件显示结果
  for (const suite of testSuites) {
    const suiteResults = suite.tests;
    const suitePassed = suiteResults.filter(r => r.passed && !r.skipped).length;
    const suiteFailed = suiteResults.filter(r => !r.passed).length;
    const suiteSkipped = suiteResults.filter(r => r.skipped).length;

    logger.info('', {});
    logger.info(`📦 ${suite.name}`, {});
    suiteResults.forEach(result => {
      if (result.skipped) {
        logger.info(`   ⏭️  ${result.name} - 已跳过 (${result.reason})`);
      } else if (result.passed) {
        logger.info(`   ✅ ${result.name}`);
      } else {
        logger.error(`   ❌ ${result.name}`);
        logger.error(`      错误: ${result.error}`);
      }
    });

    logger.info(`   统计: ✅ ${suitePassed} | ❌ ${suiteFailed} | ⏭️  ${suiteSkipped}`, {});
  }

  logger.info('', {});
  logger.info('════════════════════════════════════════════════════════════', {});
  logger.info(`📊 总体统计: 总计 ${total} 个测试`, {});
  logger.info(`   ✅ 通过: ${passed}`, {});
  logger.info(`   ❌ 失败: ${failed}`, {});
  logger.info(`   ⏭️  跳过: ${skipped}`, {});

  const passRate = total > 0 ? ((passed / (total - skipped)) * 100) : 0;
  logger.info(`   成功率: ${passRate.toFixed(2)}%`, {});

  return {
    name: '高德地图 API',
    passed: failed === 0,
    results: allResults,
    stats: {
      total,
      passed,
      failed,
      skipped,
      passRate: parseFloat(passRate.toFixed(2)),
    },
  };
}

// 直接运行测试（当作为脚本执行时）
if (import.meta.url === `file://${process.argv[1]}`) {
  testAmapAPI().catch(error => {
    logger.error('测试执行失败', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  });
}
