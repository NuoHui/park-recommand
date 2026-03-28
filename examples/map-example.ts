/**
 * 高德地图 API 集成示例
 * 展示地点查询、距离计算、批量操作等功能
 */

import { LocationService } from '@/map/service';
import { UserPreference } from '@/types/common';

/**
 * 示例 1: 基本的 POI 搜索
 */
async function example1_basicPOISearch() {
  console.log('\n========== 示例 1: 基本 POI 搜索 ==========');

  try {
    const locationService = LocationService.getInstance();

    // 验证连接
    const isConnected = await locationService.verifyConnection();
    console.log(`API 连接状态: ${isConnected ? '✓ 已连接' : '✗ 未连接'}`);

    if (!isConnected) {
      console.log('请检查 AMAP_API_KEY 配置');
      return;
    }

    // 搜索深圳的公园
    const preference: UserPreference = {
      location: 'shenzhen',
      parkType: '公园',
    };

    const locations = await locationService.searchRecommendedLocations(preference);

    console.log(`\n找到 ${locations.length} 个公园:`);
    locations.slice(0, 3).forEach((loc, index) => {
      console.log(`  ${index + 1}. ${loc.name}`);
      console.log(`     地址: ${loc.address}`);
      console.log(`     坐标: (${loc.latitude}, ${loc.longitude})`);
      if (loc.tags?.length) {
        console.log(`     标签: ${loc.tags.join(', ')}`);
      }
    });
  } catch (error) {
    console.error('示例 1 执行失败:', error);
  }
}

/**
 * 示例 2: 距离计算
 */
async function example2_distanceCalculation() {
  console.log('\n========== 示例 2: 距离计算 ==========');

  try {
    const locationService = LocationService.getInstance();

    // 从深圳市中心到热门景点
    const userLat = 22.5431;
    const userLon = 114.0579;

    const targetLocations = [
      { name: '梧桐山风景区', lat: 22.5429, lon: 114.2165 },
      { name: '翠竹山公园', lat: 22.5305, lon: 113.8865 },
      { name: '莲花山公园', lat: 22.5419, lon: 114.0579 },
    ];

    console.log('\n从您的位置到各景点的距离:');

    for (const target of targetLocations) {
      const distance = await locationService.calculateDistance(userLat, userLon, target.lat, target.lon);
      console.log(`  • ${target.name}: ${distance.toFixed(2)} km`);
    }
  } catch (error) {
    console.error('示例 2 执行失败:', error);
  }
}

/**
 * 示例 3: 带用户偏好的地点搜索
 */
async function example3_preferenceBasedSearch() {
  console.log('\n========== 示例 3: 基于偏好的地点搜索 ==========');

  try {
    const locationService = LocationService.getInstance();

    // 用户在罗湖区，想去爬山，距离不超过 5km
    const userPreference: UserPreference = {
      latitude: 22.5431,
      longitude: 114.0579,
      parkType: '爬山',
      maxDistance: 5,
      preferredTags: ['自然风景', '登山道'],
    };

    console.log('\n用户偏好:');
    console.log(`  • 类型: ${userPreference.parkType}`);
    console.log(`  • 距离限制: ${userPreference.maxDistance} km`);
    console.log(`  • 偏好标签: ${userPreference.preferredTags?.join(', ')}`);

    const locations = await locationService.searchRecommendedLocations(userPreference);

    console.log(`\n符合条件的景点 (共 ${locations.length} 个):`);
    locations.slice(0, 5).forEach((loc, index) => {
      console.log(`  ${index + 1}. ${loc.name}`);
      if (loc.distance) {
        console.log(`     距离: ${loc.distance.toFixed(2)} km`);
      }
      console.log(`     地址: ${loc.address}`);
    });
  } catch (error) {
    console.error('示例 3 执行失败:', error);
  }
}

/**
 * 示例 4: 批量距离计算
 */
async function example4_batchDistanceCalculation() {
  console.log('\n========== 示例 4: 批量距离计算 ==========');

  try {
    const locationService = LocationService.getInstance();

    const userLat = 22.5431;
    const userLon = 114.0579;

    const destinations = [
      { latitude: 22.5429, longitude: 114.2165 }, // 梧桐山
      { latitude: 22.5305, longitude: 113.8865 }, // 翠竹山
      { latitude: 22.5419, longitude: 114.0579 }, // 莲花山
      { latitude: 22.5540, longitude: 114.0285 }, // 儿童乐园
    ];

    console.log('\n批量计算距离...');
    const distances = await locationService.calculateDistanceBatch(
      userLat,
      userLon,
      destinations,
      'driving'
    );

    console.log('\n计算结果 (驾车距离):');
    destinations.forEach((dest, index) => {
      console.log(`  ${index + 1}. 距离: ${distances[index].toFixed(2)} km`);
    });
  } catch (error) {
    console.error('示例 4 执行失败:', error);
  }
}

/**
 * 示例 5: 获取地点详情
 */
async function example5_getLocationDetails() {
  console.log('\n========== 示例 5: 获取地点详情 ==========');

  try {
    const locationService = LocationService.getInstance();

    const locationName = '梧桐山风景区';
    console.log(`\n正在获取 "${locationName}" 的详情...`);

    const location = await locationService.getLocationDetails(locationName);

    if (location) {
      console.log(`\n地点信息:`);
      console.log(`  名称: ${location.name}`);
      console.log(`  地址: ${location.address}`);
      console.log(`  坐标: (${location.latitude}, ${location.longitude})`);
      if (location.phone) console.log(`  电话: ${location.phone}`);
      if (location.website) console.log(`  网址: ${location.website}`);
      if (location.tags?.length) console.log(`  标签: ${location.tags.join(', ')}`);
    } else {
      console.log('未找到该地点');
    }
  } catch (error) {
    console.error('示例 5 执行失败:', error);
  }
}

/**
 * 示例 6: 获取热门地点
 */
async function example6_getPopularLocations() {
  console.log('\n========== 示例 6: 获取深圳热门地点 ==========');

  try {
    const locationService = LocationService.getInstance();

    const popularLocations = await locationService.getPopularLocations(5);

    console.log(`\n深圳热门景点 (共 ${popularLocations.length} 个):`);
    popularLocations.forEach((loc, index) => {
      console.log(`  ${index + 1}. ${loc.name}`);
      console.log(`     地址: ${loc.address}`);
      if (loc.tags?.length) {
        console.log(`     特色: ${loc.tags.join(' • ')}`);
      }
    });
  } catch (error) {
    console.error('示例 6 执行失败:', error);
  }
}

/**
 * 示例 7: 缓存管理
 */
async function example7_cacheManagement() {
  console.log('\n========== 示例 7: 缓存管理 ==========');

  try {
    const locationService = LocationService.getInstance();

    // 执行一些查询以填充缓存
    const preference: UserPreference = {
      parkType: '公园',
    };

    await locationService.searchRecommendedLocations(preference);

    // 获取缓存统计
    const stats = locationService.getCacheStats();

    console.log('\n缓存统计:');
    console.log(`  • 地点缓存: ${stats.locations} 项`);
    console.log(`  • 距离缓存: ${stats.distances} 项`);

    // 清空缓存
    locationService.clearCache();

    const statsAfter = locationService.getCacheStats();
    console.log('\n清空缓存后:');
    console.log(`  • 地点缓存: ${statsAfter.locations} 项`);
    console.log(`  • 距离缓存: ${statsAfter.distances} 项`);
  } catch (error) {
    console.error('示例 7 执行失败:', error);
  }
}

/**
 * 示例 8: 完整的推荐流程
 */
async function example8_completeRecommendationFlow() {
  console.log('\n========== 示例 8: 完整推荐流程 ==========');

  try {
    const locationService = LocationService.getInstance();

    // 用户信息
    const userPreference: UserPreference = {
      latitude: 22.5431,
      longitude: 114.0579,
      location: '深圳市罗湖区',
      parkType: '公园',
      maxDistance: 10,
      preferredTags: ['家庭友好', '休闲'],
    };

    console.log('\n用户信息:');
    console.log(`  位置: ${userPreference.location}`);
    console.log(`  偏好: ${userPreference.parkType}`);
    console.log(`  距离限制: ${userPreference.maxDistance} km`);

    // 搜索推荐地点
    console.log('\n正在搜索推荐地点...');
    const locations = await locationService.searchRecommendedLocations(userPreference);

    if (locations.length === 0) {
      console.log('未找到推荐地点');
      return;
    }

    console.log(`\n推荐结果 (共 ${locations.length} 个地点):\n`);

    // 展示前 3 个推荐
    for (let i = 0; i < Math.min(3, locations.length); i++) {
      const loc = locations[i];
      console.log(`${i + 1}. ${loc.name}`);
      console.log(`   ├─ 地址: ${loc.address}`);
      console.log(`   ├─ 距离: ${loc.distance ? loc.distance.toFixed(2) + ' km' : '未知'}`);
      if (loc.tags?.length) {
        console.log(`   ├─ 特色: ${loc.tags.join(', ')}`);
      }
      console.log(`   └─ 坐标: (${loc.latitude}, ${loc.longitude})\n`);
    }
  } catch (error) {
    console.error('示例 8 执行失败:', error);
  }
}

/**
 * 主函数 - 依次运行所有示例
 */
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  高德地图 API 集成示例                 ║');
  console.log('║  Park & Location Service Examples      ║');
  console.log('╚════════════════════════════════════════╝');

  // 注意: 某些示例可能需要有效的 AMAP_API_KEY
  // 请在 .env 文件中配置您的 API Key

  try {
    // 依次运行示例
    // 取消注释要运行的示例

    await example1_basicPOISearch();
    await example2_distanceCalculation();
    await example3_preferenceBasedSearch();
    await example4_batchDistanceCalculation();
    await example5_getLocationDetails();
    await example6_getPopularLocations();
    await example7_cacheManagement();
    await example8_completeRecommendationFlow();

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  所有示例执行完毕                     ║');
    console.log('╚════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('执行示例时出错:', error);
    process.exit(1);
  }
}

// 执行主函数
main();
