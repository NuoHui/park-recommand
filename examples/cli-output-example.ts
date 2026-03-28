/**
 * CLI 输出模块使用示例
 * 展示如何使用 OutputManager 处理推荐结果展示、错误处理、交互反馈等
 */

import {
  Formatter,
  InteractiveManager,
  OutputManager,
  getFormatter,
  getInteractiveManager,
  getOutputManager,
  MessageType,
} from '@/output';
import { Recommendation, Location } from '@/types/common';

/**
 * 示例 1: 基础格式化输出
 */
export async function example1_BasicFormatting(): Promise<void> {
  console.log('\n=== 示例 1: 基础格式化输出 ===\n');

  const formatter = getFormatter();

  // 显示欢迎信息
  formatter.printWelcome();

  // 显示各类消息
  formatter.message('这是一条信息消息', MessageType.INFO);
  formatter.message('这是一条成功消息', MessageType.SUCCESS);
  formatter.message('这是一条警告消息', MessageType.WARNING);
  formatter.message('这是一条错误消息', MessageType.ERROR);

  // 显示进度
  for (let i = 0; i <= 10; i++) {
    formatter.printProgressBar(i, 10, '处理中');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log();
}

/**
 * 示例 2: 推荐结果显示
 */
export async function example2_DisplayRecommendations(): Promise<void> {
  console.log('\n=== 示例 2: 推荐结果显示 ===\n');

  const formatter = getFormatter();

  // 模拟推荐结果
  const recommendations: Recommendation[] = [
    {
      id: '1',
      location: {
        name: '梧桐山风景区',
        latitude: 22.5429,
        longitude: 114.2165,
        address: '深圳市罗湖区梧桐山社区',
        distance: 3.2,
        rating: 4.8,
        difficulty: 'medium',
        description: '城市登山绝佳去处，360° 城市天际线景观',
        tags: ['登山', '城市景观', '生态保护区'],
        visitDuration: '2-3 小时',
      },
      reason: '根据你的爬山偏好和距离要求，这是最合适的选择',
      relevanceScore: 0.95,
      estimatedTravelTime: 15,
    },
    {
      id: '2',
      location: {
        name: '翠竹山公园',
        latitude: 22.6345,
        longitude: 114.1234,
        address: '深圳市南山区',
        distance: 1.5,
        rating: 4.5,
        difficulty: 'easy',
        description: '家庭友好的休闲公园，竹林古刹',
        tags: ['竹林', '古刹', '休闲步道'],
        visitDuration: '1-2 小时',
      },
      reason: '距离最近，适合快速游玩',
      relevanceScore: 0.88,
      estimatedTravelTime: 8,
    },
    {
      id: '3',
      location: {
        name: '阿尔卑斯山庄',
        latitude: 22.5123,
        longitude: 114.1567,
        address: '深圳市龙华区',
        distance: 5.0,
        rating: 4.2,
        difficulty: 'hard',
        description: '高难度登山路线，风景秀丽',
        tags: ['高难度', '山景', '挑战性'],
        visitDuration: '4-5 小时',
      },
      reason: '挑战你的体能极限',
      relevanceScore: 0.75,
      estimatedTravelTime: 25,
    },
  ];

  // 显示推荐列表
  formatter.printRecommendations(recommendations, {
    cardConfig: {
      showRanking: true,
      showTags: true,
      showReasonShort: true,
      compact: false,
      lineLength: 60,
    },
    showSummary: true,
    showStats: true,
    separateCards: true,
  });

  console.log();
}

/**
 * 示例 3: 地点详情显示
 */
export async function example3_LocationDetail(): Promise<void> {
  console.log('\n=== 示例 3: 地点详情显示 ===\n');

  const formatter = getFormatter();

  const location: Location = {
    name: '梧桐山风景区',
    latitude: 22.5429,
    longitude: 114.2165,
    address: '深圳市罗湖区梧桐山社区',
    distance: 3.2,
    rating: 4.8,
    difficulty: 'medium',
    description:
      '梧桐山是深圳的城市登山胜地，海拔 943 米。山上建有多条登山步道，生态环境保护良好。山顶可以俯瞰深圳全景。',
    tags: ['登山', '城市景观', '生态保护区', '摄影'],
    visitDuration: '2-3 小时',
    openingHours: '06:00-18:00',
    phone: '0755-12345678',
    website: 'www.wutongshan.gov.cn',
  };

  formatter.printLocationDetail(location);

  console.log();
}

/**
 * 示例 4: 错误处理
 */
export async function example4_ErrorHandling(): Promise<void> {
  console.log('\n=== 示例 4: 错误处理 ===\n');

  const formatter = getFormatter();

  // 显示不同类型的错误
  const error1 = new Error('网络连接失败');
  (error1 as any).code = 'NETWORK_ERROR';

  formatter.printError(error1, {
    showCode: true,
    showStackTrace: false,
    showSuggestion: true,
  });

  formatter.printError('地点未找到：请检查输入的位置是否正确', {
    showCode: false,
    showStackTrace: false,
    showSuggestion: true,
  });

  console.log();
}

/**
 * 示例 5: 交互提示
 */
export async function example5_InteractivePrompts(): Promise<void> {
  console.log('\n=== 示例 5: 交互提示 ===\n');

  const manager = getOutputManager();

  // 显示欢迎
  manager.showWelcomeAndStart();

  // 显示各类提示
  manager.getInteractive().showInfo('这是一条信息提示');
  manager.getInteractive().showSuccess('操作成功！');
  manager.getInteractive().showWarning('这是一条警告提示');

  console.log();
}

/**
 * 示例 6: 表格显示
 */
export async function example6_TableDisplay(): Promise<void> {
  console.log('\n=== 示例 6: 表格显示 ===\n');

  const formatter = getFormatter();

  const headers = ['排名', '景点名称', '距离', '评分', '难度'];
  const rows = [
    ['1', '梧桐山风景区', '3.2 km', '4.8 ★', '中等'],
    ['2', '翠竹山公园', '1.5 km', '4.5 ★', '简单'],
    ['3', '阿尔卑斯山庄', '5.0 km', '4.2 ★', '困难'],
  ];

  formatter.printTable(headers, rows);

  console.log();
}

/**
 * 示例 7: 加载动画
 */
export async function example7_LoadingAnimation(): Promise<void> {
  console.log('\n=== 示例 7: 加载动画 ===\n');

  const formatter = getFormatter();

  console.log('模拟加载过程...\n');

  // 显示加载动画
  for (let i = 0; i < 50; i++) {
    formatter.printLoading('正在处理你的请求...', i);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  formatter.clearLoading();
  formatter.printSuccess('处理完成！');

  console.log();
}

/**
 * 示例 8: 完整推荐流程
 */
export async function example8_CompleteFlow(): Promise<void> {
  console.log('\n=== 示例 8: 完整推荐流程 ===\n');

  const manager = getOutputManager();

  try {
    // 1. 显示欢迎
    manager.showWelcomeAndStart();
    await manager.pause(1000);

    // 2. 开始推荐过程
    manager.startRecommendationProcess();
    await manager.pause(2000);

    // 3. 完成处理
    manager.completeRecommendationProcess();
    await manager.pause(500);

    // 4. 显示推荐结果
    const recommendations: Recommendation[] = [
      {
        id: '1',
        location: {
          name: '梧桐山风景区',
          latitude: 22.5429,
          longitude: 114.2165,
          address: '深圳市罗湖区',
          distance: 3.2,
          rating: 4.8,
          difficulty: 'medium',
          tags: ['登山', '城市景观'],
        },
        reason: '最符合你的偏好',
        relevanceScore: 0.95,
        estimatedTravelTime: 15,
      },
    ];

    manager.displayRecommendations(recommendations);

    // 5. 显示提示
    manager.displayTips([
      '请注意登山安全，建议穿着登山鞋',
      '最佳游玩时间：早上 7 点到 11 点',
      '建议携带充足的饮用水和防晒用品',
    ]);

    // 6. 显示统计
    manager.displayStats({
      '推荐数量': '3 个',
      '平均相关度': '0.86',
      '平均距离': '3.2 km',
      '平均评分': '4.5 ★',
    });
  } catch (error) {
    manager.handleError(error, '推荐流程');
  }

  console.log();
}

/**
 * 示例 9: 自定义格式化
 */
export async function example9_CustomFormatting(): Promise<void> {
  console.log('\n=== 示例 9: 自定义格式化 ===\n');

  const formatter = getFormatter({ width: 100, colorize: true, verbose: true });

  // 显示自定义内容
  formatter.message('这是一条带自定义宽度的消息', MessageType.INFO);

  const rec: Recommendation = {
    id: '1',
    location: {
      name: '梧桐山风景区',
      latitude: 22.5429,
      longitude: 114.2165,
      address: '深圳市罗湖区梧桐山社区',
      distance: 3.2,
      rating: 4.8,
      difficulty: 'medium',
      description: '这是一个很长的描述...'.padEnd(100, '.'),
      tags: ['登山', '城市景观'],
    },
    reason: '这是一个很长的推荐理由，会被自动截断以适应终端宽度...',
    relevanceScore: 0.95,
  };

  formatter.printRecommendationCard(rec, 1, { compact: false });

  console.log();
}

/**
 * 示例 10: 统计和摘要
 */
export async function example10_StatsAndSummary(): Promise<void> {
  console.log('\n=== 示例 10: 统计和摘要 ===\n');

  const manager = getOutputManager();

  // 显示摘要
  manager.displaySummary({
    '用户位置': '福田区',
    '景点类型': '登山 (爬山)',
    '距离限制': '10 km',
    '难度偏好': '中等到困难',
    '推荐数量': '3 个',
  });

  // 显示步骤
  manager.displaySteps([
    {
      title: '收集你的偏好信息',
      description: '系统会询问你的位置、景点类型、距离等',
    },
    {
      title: '查询景点数据库',
      description: '根据你的偏好搜索匹配的景点',
    },
    {
      title: '智能推荐排序',
      description: '使用 AI 算法为你排序推荐',
    },
    {
      title: '展示推荐结果',
      description: '以美观的格式展示推荐的景点信息',
    },
  ]);

  console.log();
}

/**
 * 运行所有示例
 */
export async function runAllExamples(): Promise<void> {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   CLI 输出模块完整使用示例             ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    await example1_BasicFormatting();
    await example2_DisplayRecommendations();
    await example3_LocationDetail();
    await example4_ErrorHandling();
    await example5_InteractivePrompts();
    await example6_TableDisplay();
    await example7_LoadingAnimation();
    await example8_CompleteFlow();
    await example9_CustomFormatting();
    await example10_StatsAndSummary();

    console.log('\n✓ 所有示例执行完毕！\n');
  } catch (error) {
    console.error('示例执行出错:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples().catch(console.error);
}
