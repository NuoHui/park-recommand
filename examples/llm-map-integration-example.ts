/**
 * LLM + 地图 API 集成完整示例
 * 演示真实的推荐流程如何打通
 *
 * 流程说明：
 * 1. 用户通过对话收集偏好信息（位置、景点类型、距离）
 * 2. LLM 检查信息是否充分
 * 3. LLM 优化搜索参数
 * 4. 地图 API 查询真实景点
 * 5. LLM 排序和解析结果
 * 6. 返回推荐给用户
 */

import { DialogueManager } from '@/dialogue/manager';
import { getLLMService } from '@/llm/service';
import { getLocationService } from '@/map/service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('example:llm-map-integration');

/**
 * 主函数：完整的推荐流程演示
 */
async function demonstrateRecommendationFlow() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   LLM + 地图 API 集成演示');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 第 1 步：初始化对话管理器
    console.log('📌 步骤 1: 初始化对话管理器');
    const dialogueManager = new DialogueManager({
      maxTurns: 10,
      timeout: 30000,
      logHistory: true,
    });

    await dialogueManager.initialize();
    console.log('✅ 对话管理器已初始化\n');

    // 第 2 步：用户对话 - 收集偏好
    console.log('📌 步骤 2: 收集用户偏好信息');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 用户输入 1: 位置
    console.log('\n👤 用户: "我在南山区"');
    await dialogueManager.addUserInput('我在南山区');
    let progress = dialogueManager.getProgress();
    console.log(`   进度: ${progress.phase} (${Math.round(progress.completeness * 100)}% 完成)`);

    // 用户输入 2: 景点类型
    console.log('\n👤 用户: "H" (选择爬山)');
    await dialogueManager.addUserInput('H');
    progress = dialogueManager.getProgress();
    console.log(`   进度: ${progress.phase} (${Math.round(progress.completeness * 100)}% 完成)`);

    // 用户输入 3: 距离
    console.log('\n👤 用户: "2" (5 km 以内)');
    await dialogueManager.addUserInput('2');
    progress = dialogueManager.getProgress();
    console.log(`   进度: ${progress.phase} (${Math.round(progress.completeness * 100)}% 完成)\n`);

    // 获取收集的偏好
    const preference = dialogueManager.getUserPreference();
    console.log('✅ 用户偏好已收集:');
    console.log(`   位置: ${preference.location}`);
    console.log(`   景点类型: ${preference.parkType}`);
    console.log(`   最大距离: ${preference.maxDistance} km\n`);

    // 第 3 步：LLM 决策 - 检查信息充分性
    console.log('📌 步骤 3: LLM 信息充分性检查');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const llmService = getLLMService();
    if (!llmService.isInitialized()) {
      await llmService.initialize();
    }
    const llmEngine = llmService.getEngine();

    const shouldRecommendResult = await llmEngine.shouldRecommend(preference);
    console.log(`\n✅ 信息充分性: ${shouldRecommendResult.shouldRecommend ? '✓ 充分' : '✗ 不充分'}`);
    console.log(`   理由: ${shouldRecommendResult.reasoning}`);
    console.log(`   信心度: ${Math.round(shouldRecommendResult.confidence * 100)}%\n`);

    // 第 4 步：LLM 搜索参数优化
    console.log('📌 步骤 4: LLM 生成优化的搜索参数');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const searchDecision = await llmEngine.generateSearchParams(preference);
    console.log(`\n✅ 搜索参数已生成:`);
    console.log(`   位置: ${searchDecision.searchParams.location}`);
    console.log(`   景点类型: ${searchDecision.searchParams.parkType}`);
    console.log(`   搜索半径: ${searchDecision.searchParams.maxDistance} km`);
    console.log(`   关键词: ${(searchDecision.searchParams.keywords || []).join(', ')}`);
    console.log(`   信心度: ${Math.round(searchDecision.confidence * 100)}%`);
    console.log(`   理由: ${searchDecision.reasoning}\n`);

    // 第 5 步：地图 API 查询
    console.log('📌 步骤 5: 地图 API 景点查询');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const locationService = getLocationService();
    const locations = await locationService.searchRecommendedLocations(preference);

    console.log(`\n✅ 找到 ${locations.length} 个景点:`);
    locations.slice(0, 5).forEach((loc, i) => {
      console.log(`   ${i + 1}. ${loc.name}`);
      console.log(`      地址: ${loc.address || '未提供'}`);
      if (loc.distance) {
        console.log(`      距离: ${loc.distance.toFixed(2)} km`);
      }
      if (loc.tags && loc.tags.length > 0) {
        console.log(`      标签: ${loc.tags.join(', ')}`);
      }
    });
    if (locations.length > 5) {
      console.log(`   ... 还有 ${locations.length - 5} 个景点\n`);
    } else {
      console.log();
    }

    // 第 6 步：LLM 排序和解析
    console.log('📌 步骤 6: LLM 排序和推荐理由生成');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const locationsJson = JSON.stringify(locations.slice(0, 10), null, 2);
    const parsedRecommendations = await llmEngine.parseRecommendations(locationsJson);

    console.log(`\n✅ LLM 解析完成:`);
    console.log(`   总体说明: ${parsedRecommendations.explanation}`);
    console.log(`\n   排序后的推荐:`);

    parsedRecommendations.locations.slice(0, 3).forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.name}`);
      console.log(`      相关性: ${Math.round(item.relevanceScore * 100)}%`);
      console.log(`      理由: ${item.reason}`);
      if (item.estimatedTravelTime) {
        console.log(`      预计时间: ${item.estimatedTravelTime} 分钟`);
      }
    });
    console.log();

    // 第 7 步：获取最终推荐
    console.log('📌 步骤 7: 获取最终推荐');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result = await dialogueManager.getRecommendations();

    if (result.success && result.recommendations) {
      console.log(`\n✅ 推荐成功! 共 ${result.recommendations.length} 个推荐:\n`);
      result.recommendations.forEach((rec, i) => {
        console.log(`   🎯 ${i + 1}. ${rec.name}`);
        console.log(`      ID: ${rec.id}`);
        console.log(`      推荐理由: ${rec.reason}`);
        if (rec.distance) console.log(`      距离: ${rec.distance} km`);
        if (rec.rating) console.log(`      评分: ${rec.rating}/5`);
      });
    } else {
      console.log(`\n❌ 推荐失败: ${result.error}`);
    }

    // 第 8 步：流程统计
    console.log('\n📌 流程统计');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const finalProgress = dialogueManager.getProgress();
    console.log(`\n   对话阶段: ${finalProgress.phase}`);
    console.log(`   总轮数: ${finalProgress.turnCount}/${finalProgress.maxTurns}`);
    console.log(`   偏好完成度: ${Math.round(finalProgress.completeness * 100)}%`);

    const llmStatus = llmService.getStatus();
    if (llmStatus.stats) {
      console.log(`   LLM 活跃会话: ${llmStatus.stats.activeSessions}`);
      console.log(`   LLM 消息总数: ${llmStatus.stats.totalMessages}`);
    }

    const cacheStats = locationService.getCacheStats();
    console.log(`   缓存景点: ${cacheStats.locations}`);
    console.log(`   缓存距离: ${cacheStats.distances}`);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   ✅ 演示完成!');
    console.log('═══════════════════════════════════════════════════════════\n');

    // 关闭对话
    await dialogueManager.close();
  } catch (error) {
    logger.error('演示过程中出错', {
      error: error instanceof Error ? error.message : '未知错误',
    });
    console.error('\n❌ 错误:', error);
  }
}

/**
 * 流程图解说
 */
function printFlowChart() {
  console.log('\n【LLM + 地图 API 推荐流程图】\n');
  console.log(`
用户输入 "我想周末在南山爬山"
    │
    ├─ 对话收集
    │  ├─ 位置: 南山区  ✓
    │  ├─ 类型: 爬山     ✓
    │  └─ 距离: 5km     ✓
    │
    ├─ LLM.shouldRecommend()
    │  └─ 检查: 信息充分  ✓
    │
    ├─ LLM.generateSearchParams()
    │  └─ 优化搜索参数
    │      { keywords: ['登山','爬山'], maxDistance: 5 }
    │
    ├─ LocationService.searchRecommendedLocations()
    │  ├─ 调用高德 API
    │  ├─ 查询深圳爬山景点
    │  └─ 返回: [梧桐山, 羊台山, 塘朗山, ...]
    │
    ├─ LocationService.calculateDistance()
    │  └─ 计算到各景点的距离
    │
    ├─ LLM.parseRecommendations()
    │  ├─ 排序景点
    │  ├─ 生成推荐理由
    │  └─ 返回: [{name, reason, relevanceScore}, ...]
    │
    ├─ 格式化输出
    │  └─ 返回最终推荐列表
    │
    └─ 返回给用户
       [
         { name: "梧桐山", reason: "...", distance: 2.5km },
         { name: "羊台山", reason: "...", distance: 4.2km }
       ]
  `);
}

/**
 * 错误处理示例
 */
function printErrorHandling() {
  console.log('\n【错误处理和降级策略】\n');
  console.log(`
✅ 多层降级处理:

1. 正常流程
   LLM 检查 → LLM 搜索参数 → 地图 API → LLM 排序 → 推荐

2. 地图 API 失败 (第一层降级)
   尝试获取热门景点列表
   如果成功 → 返回推荐
   如果失败 → 继续降级

3. 所有真实 API 失败 (第二层降级)
   返回预设的深圳热门景点
   (梧桐山、莲花山、红树林等)

4. 最终降级 (第三层)
   如果缓存也不可用，返回模拟数据
   并告知用户数据可能不是最新的
  `);
}

// 如果直接运行此文件
if (require.main === module) {
  demonstrateRecommendationFlow().catch(error => {
    console.error('致命错误:', error);
    process.exit(1);
  });

  // 打印额外信息
  printFlowChart();
  printErrorHandling();
}

export { demonstrateRecommendationFlow };
