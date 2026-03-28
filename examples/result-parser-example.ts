/**
 * 结果解析器使用示例
 * 展示如何从 LLM 响应中解析推荐结果
 */

import {
  ResultParser,
  RecommendationValidator,
  RecommendationSortBy,
  validateRecommendations,
} from '@/parser';
import { UserPreference } from '@/types/common';
import { DifficultyLevel, ParkType } from '@/config/constants';

/**
 * 示例 1: 解析查询响应
 * 演示如何从 LLM 的查询阶段响应中提取搜索参数
 */
async function example1_parseQueryResponse() {
  console.log('\n=== 示例 1: 解析查询响应 ===\n');

  const parser = ResultParser.getInstance();

  // 模拟 LLM 的查询响应
  const llmQueryResponse = `
根据用户的信息，我建议以下搜索策略：

\`\`\`json
{
  "should_recommend": true,
  "location": "福田中心区",
  "park_type": "both",
  "max_distance": 5,
  "difficulty": "easy|medium",
  "keywords": ["公园", "景区", "散步"],
  "reasoning": "用户在福田区，希望散步和轻登山都可以，5km 内距离合理"
}
\`\`\`
  `;

  const result = await parser.parseQueryResponse(llmQueryResponse);

  if (result.success) {
    console.log('✓ 解析成功');
    console.log('查询参数:', JSON.stringify(result.data, null, 2));

    // 验证查询响应
    const validation = RecommendationValidator.validateQueryResponse(result.data!);
    console.log('\n验证结果:', validation.valid ? '✓ 通过' : '✗ 失败');
    console.log('质量评分:', validation.score, '/100');
  } else {
    console.log('✗ 解析失败:', result.error);
  }
}

/**
 * 示例 2: 解析推荐响应
 * 演示如何从 LLM 的推荐阶段响应中提取推荐列表
 */
async function example2_parseRecommendationResponse() {
  console.log('\n=== 示例 2: 解析推荐响应 ===\n');

  const parser = ResultParser.getInstance();

  // 模拟 LLM 的推荐响应
  const llmRecommendationResponse = `
基于用户的偏好，我为你精选了以下景点：

\`\`\`json
{
  "recommendations": [
    {
      "name": "梧桐山风景区",
      "reason": "城市登山绝佳去处，360° 城市景观",
      "relevance_score": 0.95,
      "travel_time": 15,
      "tags": ["登山", "景观", "热门"]
    },
    {
      "name": "莲花山公园",
      "reason": "福田中心，散步轻松，适合家庭",
      "relevance_score": 0.88,
      "travel_time": 5,
      "tags": ["公园", "散步", "家庭"]
    },
    {
      "name": "中山公园",
      "reason": "历史悠久，植物丰富，适合休闲",
      "relevance_score": 0.82,
      "travel_time": 8,
      "tags": ["公园", "植物", "历史"]
    }
  ],
  "summary": "这三个地点覆盖不同的游玩类型，都在你的距离范围内",
  "stats": {
    "total": 3,
    "high_priority": 2
  }
}
\`\`\`
  `;

  const result = await parser.parseRecommendationResponse(llmRecommendationResponse);

  if (result.success) {
    console.log('✓ 解析成功');
    console.log(`找到 ${result.data?.recommendations?.length} 个推荐`);

    result.data?.recommendations?.forEach((rec, i) => {
      console.log(`\n${i + 1}. ${rec.name}`);
      console.log(`   理由: ${rec.reason}`);
      console.log(`   相关度: ${rec.relevance_score}`);
      console.log(`   预计时间: ${rec.travel_time} 分钟`);
    });
  } else {
    console.log('✗ 解析失败:', result.error);
  }
}

/**
 * 示例 3: 转换为完整的推荐对象
 * 演示如何将解析的推荐项转换为完整的推荐对象（包含地点数据）
 */
async function example3_convertToRecommendations() {
  console.log('\n=== 示例 3: 转换为完整的推荐对象 ===\n');

  const parser = ResultParser.getInstance();

  // 用户偏好
  const preference: UserPreference = {
    location: '福田中心',
    latitude: 22.5471,
    longitude: 114.0633,
    parkType: ParkType.BOTH,
    maxDistance: 5,
    minDifficulty: DifficultyLevel.EASY,
    maxDifficulty: DifficultyLevel.MEDIUM,
  };

  // 模拟 LLM 的推荐项
  const llmRecommendationItems = [
    {
      name: '梧桐山风景区',
      reason: '城市登山绝佳去处',
      relevance_score: 0.95,
      travel_time: 15,
    },
    {
      name: '莲花山公园',
      reason: '散步轻松，适合家庭',
      relevance_score: 0.88,
      travel_time: 5,
    },
  ];

  try {
    const recommendations = await parser.convertToRecommendations(
      llmRecommendationItems,
      preference,
      {
        sortBy: RecommendationSortBy.RELEVANCE,
        limit: 5,
        deduplicateByName: true,
      }
    );

    console.log(`✓ 转换成功，得到 ${recommendations.length} 个推荐\n`);

    recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec.location.name}`);
      console.log(`   地址: ${rec.location.address || '未知'}`);
      console.log(`   距离: ${rec.location.distance?.toFixed(2) || '未知'} km`);
      console.log(`   评分: ${rec.location.rating ? rec.location.rating.toFixed(1) : '未知'} ⭐`);
      console.log(`   理由: ${rec.reason}`);
      console.log(`   相关度: ${rec.relevanceScore}`);
      if (rec.directions) {
        console.log(`   路线: ${rec.directions}`);
      }
      console.log();
    });
  } catch (error) {
    console.log('✗ 转换失败:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * 示例 4: 端到端处理
 * 演示如何从原始 LLM 响应直接转换为推荐列表
 */
async function example4_endToEndProcessing() {
  console.log('\n=== 示例 4: 端到端处理 ===\n');

  const parser = ResultParser.getInstance();

  // 用户偏好
  const preference: UserPreference = {
    location: '南山区',
    latitude: 22.5331,
    longitude: 113.9316,
    parkType: ParkType.HIKING,
    maxDistance: 10,
    maxDifficulty: DifficultyLevel.MEDIUM,
  };

  // 模拟完整的 LLM 响应
  const llmResponse = `
根据你的要求，我找到了适合的登山地点。以下是排序后的推荐：

\`\`\`json
{
  "recommendations": [
    {
      "name": "小梧桐山",
      "reason": "南山最近的登山地，步道成熟",
      "relevance_score": 0.92,
      "travel_time": 12
    },
    {
      "name": "羊台山",
      "reason": "中等难度，风景优美",
      "relevance_score": 0.85,
      "travel_time": 20
    },
    {
      "name": "大南山",
      "reason": "登顶有城市景观",
      "relevance_score": 0.8,
      "travel_time": 25
    }
  ],
  "summary": "这些地点都在南山附近，难度适中，适合半天游玩"
}
\`\`\`
  `;

  try {
    const result = await parser.processRecommendations(llmResponse, preference, {
      sortBy: RecommendationSortBy.DISTANCE,
      limit: 3,
    });

    if (result.success && result.data) {
      console.log(`✓ 处理成功，得到 ${result.data.length} 个推荐\n`);

      result.data.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec.location.name}`);
        console.log(`   距离: ${rec.location.distance?.toFixed(1) || '未知'} km`);
        console.log(`   理由: ${rec.reason}`);
        console.log(`   相关度: ${(rec.relevanceScore * 100).toFixed(0)}%`);
        console.log();
      });

      // 验证推荐
      const validation = validateRecommendations(result.data, preference);
      console.log('验证评分:', validation.score, '/100');
      if (!validation.valid) {
        console.log('验证问题:', validation.issues);
      }
    } else {
      console.log('✗ 处理失败:', result.error);
    }
  } catch (error) {
    console.log('✗ 错误:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * 示例 5: 验证和错误处理
 * 演示如何使用验证器检测问题
 */
async function example5_validationAndErrorHandling() {
  console.log('\n=== 示例 5: 验证和错误处理 ===\n');

  const parser = ResultParser.getInstance();

  // 测试各种错误情况
  const testCases = [
    {
      name: '缺失 JSON',
      response: '用户需要推荐时，请提供推荐列表',
    },
    {
      name: '格式错误的 JSON',
      response: '```json\n{"recommendations": [{"name": "park", invalid json}]}\n```',
    },
    {
      name: '缺少必需字段',
      response: '```json\n{"recommendations": []}\n```',
    },
    {
      name: '有效的响应',
      response: `\`\`\`json
{
  "recommendations": [
    {"name": "公园A", "reason": "很好", "relevance_score": 0.8}
  ]
}
\`\`\``,
    },
  ];

  for (const testCase of testCases) {
    console.log(`测试: ${testCase.name}`);
    const result = await parser.parseRecommendationResponse(testCase.response);
    console.log(`结果: ${result.success ? '✓ 成功' : '✗ 失败'}`);
    if (!result.success) {
      console.log(`错误: ${result.error}`);
    }
    console.log();
  }

  // 显示解析统计
  const stats = parser.getStats();
  console.log('\n解析统计:');
  console.log(`总尝试: ${stats.totalAttempts}`);
  console.log(`成功: ${stats.successCount}`);
  console.log(`失败: ${stats.failureCount}`);
  console.log(`平均解析时间: ${stats.averageParseTime.toFixed(2)}ms`);
}

/**
 * 示例 6: 高级过滤和排序
 * 演示如何使用过滤和排序选项
 */
async function example6_filteringAndSorting() {
  console.log('\n=== 示例 6: 高级过滤和排序 ===\n');

  const parser = ResultParser.getInstance();

  const preference: UserPreference = {
    location: '福田',
    latitude: 22.5471,
    longitude: 114.0633,
    parkType: ParkType.BOTH,
    maxDistance: 10,
  };

  // 模拟推荐响应
  const llmResponse = `
\`\`\`json
{
  "recommendations": [
    {
      "name": "梧桐山风景区",
      "reason": "评分高，登山热门",
      "relevance_score": 0.95,
      "travel_time": 15
    },
    {
      "name": "莲花山公园",
      "reason": "散步轻松，家庭友好",
      "relevance_score": 0.88,
      "travel_time": 5
    },
    {
      "name": "洪湖公园",
      "reason": "风景优美，适合拍照",
      "relevance_score": 0.75,
      "travel_time": 20
    }
  ]
}
\`\`\`
  `;

  // 不同的排序选项
  const sortOptions = [
    { sortBy: RecommendationSortBy.RELEVANCE, label: '相关度排序' },
    { sortBy: RecommendationSortBy.DISTANCE, label: '距离排序' },
    { sortBy: RecommendationSortBy.TRAVEL_TIME, label: '旅行时间排序' },
  ];

  for (const option of sortOptions) {
    console.log(`\n${option.label}:`);

    const result = await parser.processRecommendations(llmResponse, preference, {
      sortBy: option.sortBy,
      limit: 3,
    });

    if (result.success && result.data) {
      result.data.forEach((rec, i) => {
        console.log(
          `${i + 1}. ${rec.location.name} (相关度: ${(rec.relevanceScore * 100).toFixed(0)}%)`
        );
      });
    }
  }

  // 带过滤的排序
  console.log('\n\n带过滤的排序 (相关度 >= 0.8):');

  const result = await parser.processRecommendations(llmResponse, preference, {
    sortBy: RecommendationSortBy.RELEVANCE,
    filter: {
      minRelevance: 0.8,
    },
    limit: 5,
  });

  if (result.success && result.data) {
    result.data.forEach((rec, i) => {
      console.log(
        `${i + 1}. ${rec.location.name} (相关度: ${(rec.relevanceScore * 100).toFixed(0)}%)`
      );
    });
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  结果解析器使用示例                    ║');
  console.log('║  Result Parser Examples                ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    await example1_parseQueryResponse();
    await example2_parseRecommendationResponse();
    // 注意：示例 3 和 4 需要实际的地图 API 连接，可能会失败
    // await example3_convertToRecommendations();
    // await example4_endToEndProcessing();
    await example5_validationAndErrorHandling();
    await example6_filteringAndSorting();

    console.log('\n✓ 所有示例执行完成！\n');
  } catch (error) {
    console.error('执行失败:', error);
  }
}

// 只在直接运行此文件时执行
if (require.main === module) {
  main().catch(console.error);
}

export { main };
