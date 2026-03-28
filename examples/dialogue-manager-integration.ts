/**
 * DialogueManager 完整流程集成示例
 *
 * 展示如何使用集成了请求队列、缓存预热和性能监控的 DialogueManager
 * 处理完整的推荐流程。
 */

import { DialogueManager } from '@/dialogue/manager';

/**
 * 示例 1: 基础推荐流程
 */
async function basicRecommendationFlow() {
  console.log('=== 示例 1: 基础推荐流程 ===\n');

  // 1. 创建对话管理器
  const manager = new DialogueManager({
    maxTurns: 10,
    timeout: 30000,
    logHistory: true,
  });

  // 2. 初始化（触发缓存预热）
  console.log('初始化对话管理器...');
  await manager.initialize();

  // 3. 收集用户偏好
  console.log('收集用户偏好...');
  await manager.addUserInput('dummy'); // 触发问候处理

  // 用户输入位置
  await manager.addUserInput('南山区');
  console.log('用户位置: 南山区\n');

  // 用户选择景点类型
  await manager.addUserInput('p'); // 公园
  console.log('景点类型: 公园\n');

  // 用户选择距离
  await manager.addUserInput('2'); // 5km 以内
  console.log('距离限制: 5km\n');

  // 4. 获取推荐
  console.log('获取推荐...\n');
  const result = await manager.getRecommendations();

  // 5. 显示结果
  if (result.success) {
    console.log('✅ 推荐获取成功\n');
    console.log('推荐列表:');
    result.recommendations?.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec.name}`);
      console.log(`     原因: ${rec.reason}`);
      if (rec.distance) console.log(`     距离: ${rec.distance}km`);
      if (rec.rating) console.log(`     评分: ${rec.rating}`);
    });

    // 显示性能指标
    console.log('\n性能指标:');
    console.log(`  总耗时: ${result.performanceMetrics?.totalTime}ms`);
    console.log(`  LLM 耗时: ${result.performanceMetrics?.llmTime}ms`);
    console.log(`  地图查询: ${result.performanceMetrics?.mapQueryTime}ms`);
    console.log(`  缓存命中: ${result.performanceMetrics?.cacheHit ? '是' : '否'}`);
  } else {
    console.log('❌ 推荐获取失败');
    console.log(`错误: ${result.error}`);
  }

  // 6. 关闭对话
  await manager.close();
}

/**
 * 示例 2: 缓存性能对比
 */
async function cachePerformanceComparison() {
  console.log('\n=== 示例 2: 缓存性能对比 ===\n');

  // 第一次请求 (无缓存)
  console.log('第一次请求 (无缓存)...');
  const manager1 = new DialogueManager();
  await manager1.initialize();

  await manager1.addUserInput('dummy');
  await manager1.addUserInput('罗湖区');
  await manager1.addUserInput('h'); // 登山
  await manager1.addUserInput('1'); // 3km

  const t1 = Date.now();
  const result1 = await manager1.getRecommendations();
  const time1 = Date.now() - t1;

  console.log(`✅ 耗时: ${time1}ms\n`);

  await manager1.close();

  // 第二次请求 (命中缓存)
  console.log('第二次请求 (相同参数, 应该命中缓存)...');
  const manager2 = new DialogueManager();
  await manager2.initialize();

  await manager2.addUserInput('dummy');
  await manager2.addUserInput('罗湖区');
  await manager2.addUserInput('h'); // 登山
  await manager2.addUserInput('1'); // 3km

  const t2 = Date.now();
  const result2 = await manager2.getRecommendations();
  const time2 = Date.now() - t2;

  console.log(`✅ 耗时: ${time2}ms\n`);

  // 显示性能对比
  console.log('性能对比:');
  console.log(`  第一次: ${time1}ms (无缓存)`);
  console.log(`  第二次: ${time2}ms (缓存)`);
  console.log(`  改进: ${Math.round((1 - time2 / time1) * 100)}% 快`);
  console.log(`  加速倍数: ${Math.round(time1 / time2)}x\n`);

  await manager2.close();
}

/**
 * 示例 3: 多轮对话流程
 */
async function multiTurnDialogueFlow() {
  console.log('=== 示例 3: 多轮对话流程 ===\n');

  const manager = new DialogueManager({ maxTurns: 10 });
  await manager.initialize();

  // 模拟多轮对话
  const userInputs = ['南山区', 'p', '2'];
  const inputDescriptions = ['位置: 南山区', '类型: 公园', '距离: 5km'];

  for (let i = 0; i < userInputs.length; i++) {
    console.log(`回合 ${i + 1}: ${inputDescriptions[i]}`);
    await manager.addUserInput(userInputs[i]);
  }

  // 获取推荐
  console.log('\n获取推荐...');
  const result = await manager.getRecommendations();

  // 显示进度信息
  const progress = manager.getProgress();
  console.log('\n对话进度:');
  console.log(`  阶段: ${progress.phase}`);
  console.log(`  完成度: ${Math.round(progress.completeness * 100)}%`);
  console.log(`  回合数: ${progress.turnCount}/${progress.maxTurns}`);

  // 显示结果
  if (result.success) {
    console.log(`\n获得 ${result.recommendations?.length} 个推荐`);
  }

  // 获取性能指标
  console.log('\n性能指标:');
  const metrics = manager.getPerformanceMetrics();
  console.log(JSON.stringify(metrics, null, 2));

  await manager.close();
}

/**
 * 示例 4: 错误处理和降级方案
 */
async function errorHandlingAndFallback() {
  console.log('=== 示例 4: 错误处理和降级方案 ===\n');

  const manager = new DialogueManager();
  await manager.initialize();

  // 输入最少信息以满足推荐条件
  await manager.addUserInput('dummy');
  await manager.addUserInput('福田区');
  await manager.addUserInput('b'); // 都可以
  await manager.addUserInput('3'); // 10km

  try {
    console.log('尝试获取推荐（可能触发错误处理）...');
    const result = await manager.getRecommendations();

    if (result.success) {
      console.log('✅ 获取推荐成功');
      console.log(`推荐数量: ${result.recommendations?.length}`);
      console.log(`耗时: ${result.performanceMetrics?.totalTime}ms`);
    } else {
      console.log('❌ 推荐获取失败，但有降级方案');
      console.log(`错误: ${result.error}`);
    }
  } catch (error) {
    console.log('❌ 异常发生:');
    console.log(error instanceof Error ? error.message : '未知错误');
  }

  await manager.close();
}

/**
 * 示例 5: 完整的性能监控
 */
async function comprehensivePerformanceMonitoring() {
  console.log('=== 示例 5: 完整的性能监控 ===\n');

  const manager = new DialogueManager();
  await manager.initialize();

  // 收集偏好
  await manager.addUserInput('dummy');
  await manager.addUserInput('龙华区');
  await manager.addUserInput('h');
  await manager.addUserInput('2');

  // 第一次请求
  console.log('执行第一次请求...');
  const result1 = await manager.getRecommendations();
  console.log('✅ 第一次完成\n');

  // 等待一下
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 第二次请求 (相同参数)
  console.log('执行第二次请求 (相同参数)...');
  const result2 = await manager.getRecommendations();
  console.log('✅ 第二次完成\n');

  // 比较性能
  console.log('性能对比:');
  console.log('\n第一次请求:');
  console.log(`  总耗时: ${result1.performanceMetrics?.totalTime}ms`);
  console.log(`  LLM 耗时: ${result1.performanceMetrics?.llmTime}ms`);
  console.log(`  地图耗时: ${result1.performanceMetrics?.mapQueryTime}ms`);
  console.log(`  缓存命中: ${result1.performanceMetrics?.cacheHit ? '是' : '否'}`);

  console.log('\n第二次请求:');
  console.log(`  总耗时: ${result2.performanceMetrics?.totalTime}ms`);
  console.log(`  LLM 耗时: ${result2.performanceMetrics?.llmTime}ms`);
  console.log(`  地图耗时: ${result2.performanceMetrics?.mapQueryTime}ms`);
  console.log(`  缓存命中: ${result2.performanceMetrics?.cacheHit ? '是' : '否'}`);

  // 显示最终性能指标
  const finalMetrics = manager.getPerformanceMetrics();
  console.log('\n最终性能指标:');
  console.log(JSON.stringify(finalMetrics, null, 2));

  await manager.close();
}

/**
 * 示例 6: 吞吐量测试
 */
async function throughputTest() {
  console.log('=== 示例 6: 吞吐量测试 ===\n');

  const locations = [
    { location: '南山区', type: 'p', distance: '1' },
    { location: '福田区', type: 'h', distance: '2' },
    { location: '罗湖区', type: 'b', distance: '3' },
    { location: '龙华区', type: 'p', distance: '2' },
    { location: '宝安区', type: 'h', distance: '1' },
  ];

  const results: Array<{
    location: string;
    time: number;
    success: boolean;
  }> = [];

  for (const loc of locations) {
    const manager = new DialogueManager();
    await manager.initialize();

    await manager.addUserInput('dummy');
    await manager.addUserInput(loc.location);
    await manager.addUserInput(loc.type);
    await manager.addUserInput(loc.distance);

    const t = Date.now();
    const result = await manager.getRecommendations();
    const time = Date.now() - t;

    results.push({
      location: loc.location,
      time,
      success: result.success,
    });

    await manager.close();

    console.log(
      `${loc.location} (${loc.type}/${loc.distance}): ${time}ms ${result.success ? '✅' : '❌'}`
    );
  }

  // 计算统计数据
  const times = results.map(r => r.time);
  const avgTime = times.reduce((a, b) => a + b) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const successRate = (results.filter(r => r.success).length / results.length) * 100;

  console.log('\n统计数据:');
  console.log(`  平均耗时: ${Math.round(avgTime)}ms`);
  console.log(`  最小耗时: ${minTime}ms`);
  console.log(`  最大耗时: ${maxTime}ms`);
  console.log(`  成功率: ${Math.round(successRate)}%`);
  console.log(`  吞吐量: ${Math.round((1000 / avgTime) * 10) / 10} req/s`);
}

/**
 * 主函数: 运行所有示例
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     DialogueManager 完整流程集成示例                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    // 运行示例
    await basicRecommendationFlow();
    await cachePerformanceComparison();
    await multiTurnDialogueFlow();
    await errorHandlingAndFallback();
    await comprehensivePerformanceMonitoring();
    await throughputTest();

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                所有示例执行完成                          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
  } catch (error) {
    console.error('❌ 执行出错:', error);
    process.exit(1);
  }
}

// 运行主函数
main().catch(console.error);
