/**
 * 高德地图 API 联通性单元测试
 * 验证高德地图 API 客户端和服务的正常工作
 */

import { AmapClient, createMapClient } from '@/map/client';
import { LocationService } from '@/map/service';
import { env } from '@/config/env';
import { createLogger } from '@/utils/logger';

const logger = createLogger('test:amap');

/**
 * 测试套件：高德地图 API
 */
export async function testAmapAPI() {
  const tests = [];

  // 测试 1: 初始化高德客户端
  tests.push(
    (async () => {
      try {
        if (!env.amapApiKey) {
          throw new Error('AMAP_API_KEY is not configured');
        }

        const client = createMapClient(env.amapApiKey, env.amapBaseUrl);

        logger.info('✅ 测试 1 通过：高德客户端初始化成功', {
          baseUrl: env.amapBaseUrl,
        });

        return {
          name: '高德客户端初始化',
          passed: true,
          client,
        };
      } catch (error) {
        logger.error('❌ 测试 1 失败：高德客户端初始化', {
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

  // 测试 2: 验证高德 API 连接
  tests.push(
    (async () => {
      try {
        if (!env.amapApiKey) {
          logger.warn('⏭️  测试 2 跳过：AMAP_API_KEY 未配置');
          return {
            name: '高德 API 连接验证',
            passed: true,
            skipped: true,
            reason: 'AMAP_API_KEY 未配置',
          };
        }

        const client = createMapClient(env.amapApiKey, env.amapBaseUrl);
        const isValid = await client.verifyConnection();

        if (!isValid) {
          throw new Error('API 连接验证失败');
        }

        logger.info('✅ 测试 2 通过：高德 API 连接成功');

        return {
          name: '高德 API 连接验证',
          passed: true,
        };
      } catch (error) {
        logger.error('❌ 测试 2 失败：高德 API 连接验证', {
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

  // 测试 3: POI 文本搜索
  tests.push(
    (async () => {
      try {
        if (!env.amapApiKey) {
          logger.warn('⏭️  测试 3 跳过：AMAP_API_KEY 未配置');
          return {
            name: 'POI 文本搜索',
            passed: true,
            skipped: true,
            reason: 'AMAP_API_KEY 未配置',
          };
        }

        const client = createMapClient(env.amapApiKey, env.amapBaseUrl);
        const response = await client.searchPOI({
          keywords: '公园',
          region: '深圳',
          pageSize: 10,
          pageNum: 1,
        });

        if (!response || response.status !== '1') {
          throw new Error(`POI 搜索失败: ${response.info}`);
        }

        if (!response.pois || response.pois.length === 0) {
          throw new Error('未找到任何公园');
        }

        logger.info('✅ 测试 3 通过：POI 搜索成功', {
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
        logger.error('❌ 测试 3 失败：POI 搜索', {
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

  // 测试 4: 地址编码（地址转坐标）
  tests.push(
    (async () => {
      try {
        if (!env.amapApiKey) {
          logger.warn('⏭️  测试 4 跳过：AMAP_API_KEY 未配置');
          return {
            name: '地址编码',
            passed: true,
            skipped: true,
            reason: 'AMAP_API_KEY 未配置',
          };
        }

        const client = createMapClient(env.amapApiKey, env.amapBaseUrl);
        const response = await client.geocode({
          address: '莲花山公园',
          city: '深圳',
        });

        if (!response || response.status !== '1') {
          throw new Error(`地址编码失败: ${response.info}`);
        }

        if (!response.geocodes || response.geocodes.length === 0) {
          throw new Error('地址编码未返回结果');
        }

        const geocode = response.geocodes[0];
        logger.info('✅ 测试 4 通过：地址编码成功', {
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
        logger.error('❌ 测试 4 失败：地址编码', {
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

  // 测试 5: 反向地址编码（坐标转地址）
  tests.push(
    (async () => {
      try {
        if (!env.amapApiKey) {
          logger.warn('⏭️  测试 5 跳过：AMAP_API_KEY 未配置');
          return {
            name: '反向地址编码',
            passed: true,
            skipped: true,
            reason: 'AMAP_API_KEY 未配置',
          };
        }

        const client = createMapClient(env.amapApiKey, env.amapBaseUrl);
        // 莲花山公园坐标
        const response = await client.reverseGeocode({
          location: {
            longitude: 114.0681,
            latitude: 22.5461,
          },
        });

        if (!response || response.status !== '1') {
          throw new Error(`反向地址编码失败: ${response.info}`);
        }

        const regeocode = response.regeocode;
        logger.info('✅ 测试 5 通过：反向地址编码成功', {
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
        logger.error('❌ 测试 5 失败：反向地址编码', {
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

  // 测试 6: 距离计算
  tests.push(
    (async () => {
      try {
        if (!env.amapApiKey) {
          logger.warn('⏭️  测试 6 跳过：AMAP_API_KEY 未配置');
          return {
            name: '距离计算',
            passed: true,
            skipped: true,
            reason: 'AMAP_API_KEY 未配置',
          };
        }

        const client = createMapClient(env.amapApiKey, env.amapBaseUrl);
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
        logger.info('✅ 测试 6 通过：距离计算成功', {
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
        logger.error('❌ 测试 6 失败：距离计算', {
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

  // 测试 7: 批量距离计算
  tests.push(
    (async () => {
      try {
        if (!env.amapApiKey) {
          logger.warn('⏭️  测试 7 跳过：AMAP_API_KEY 未配置');
          return {
            name: '批量距离计算',
            passed: true,
            skipped: true,
            reason: 'AMAP_API_KEY 未配置',
          };
        }

        const client = createMapClient(env.amapApiKey, env.amapBaseUrl);
        
        // 分别计算两个公园到福田区政府的距离
        const distances = [];
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

        logger.info('✅ 测试 7 通过：批量距离计算成功', {
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
        logger.error('❌ 测试 7 失败：批量距离计算', {
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

  // 测试 8: 地点服务连接
  tests.push(
    (async () => {
      try {
        if (!env.amapApiKey) {
          logger.warn('⏭️  测试 8 跳过：AMAP_API_KEY 未配置');
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

        logger.info('✅ 测试 8 通过：地点服务连接成功');

        return {
          name: '地点服务连接',
          passed: true,
        };
      } catch (error) {
        logger.error('❌ 测试 8 失败：地点服务连接', {
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

  // 执行所有测试
  const results = await Promise.all(tests);

  // 统计结果
  const passed = results.filter(r => r.passed && !r.skipped).length;
  const failed = results.filter(r => !r.passed).length;
  const skipped = results.filter(r => r.skipped).length;
  const total = results.length;

  logger.info('', {});
  logger.info('╔════════════════════════════════════════════════════════════╗', {});
  logger.info('║              🗺️  高德地图 API 测试结果                        ║', {});
  logger.info('╚════════════════════════════════════════════════════════════╝', {});

  results.forEach(result => {
    if (result.skipped) {
      logger.info(`⏭️  ${result.name} - 已跳过 (${result.reason})`);
    } else if (result.passed) {
      logger.info(`✅ ${result.name}`);
    } else {
      logger.error(`❌ ${result.name}`);
      logger.error(`   错误: ${result.error}`);
    }
  });

  logger.info('', {});
  logger.info(`📊 统计: 总计 ${total} 个测试`, {});
  logger.info(`   ✅ 通过: ${passed}`, {});
  logger.info(`   ❌ 失败: ${failed}`, {});
  logger.info(`   ⏭️  跳过: ${skipped}`, {});

  const passRate = total > 0 ? ((passed / (total - skipped)) * 100).toFixed(2) : '0.00';
  logger.info(`   成功率: ${passRate}%`, {});

  return {
    name: '高德地图 API',
    passed: failed === 0,
    results,
    stats: {
      total,
      passed,
      failed,
      skipped,
      passRate: parseFloat(passRate),
    },
  };
}
