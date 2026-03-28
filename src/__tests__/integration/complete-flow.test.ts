/**
 * 完整流程集成测试
 * 验证：初始提取 → 多轮追问 → 参数上下文保留 → 高德查询 → LLM 详细推荐生成
 */

import { getParameterExtractor } from '@/dialogue/parameter-extractor';
import { getParameterValidator } from '@/dialogue/parameter-validator';
import { getLocationService } from '@/map/service';
import { getLLMService } from '@/llm/service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('test:complete-flow');

/**
 * 模拟用户多轮追问的交互过程
 */
async function simulateMultiRoundQuestion() {
  logger.info('');
  logger.info('【模拟场景】用户初始需求不完整，需要多轮追问');
  logger.info('-'.repeat(70));

  const extractor = getParameterExtractor();
  const validator = getParameterValidator();

  // 第一轮：用户初始输入（不完整）
  const initialInput = '帮我推荐一个公园';
  logger.info(`[第 1 轮] 用户输入: "${initialInput}"`);

  let currentParams = await extractor.extractParameters(initialInput);
  logger.info('[第 1 轮] 提取结果:', {
    keywords: currentParams.keywords,
    region: currentParams.region,
    confidence: currentParams.confidence,
    missingFields: currentParams.missingFields,
  });

  // 验证参数
  let validation = validator.validateForMapQuery({
    keywords: currentParams.keywords,
    region: currentParams.region,
  });

  logger.info('[第 1 轮] 验证结果:', {
    isValid: validation.isValid,
    missingFields: validation.missingFields,
    prompts: validation.prompts,
  });

  // 第二轮：用户补充地区信息
  if (validation.missingFields.includes('region')) {
    const userAnswer = '我在深圳，希望在宝安区找';
    logger.info(`[第 2 轮] 用户回答追问: "${userAnswer}"`);

    // 使用 extractParametersWithContext 进行带上下文的重提取
    const updatedParams = await extractor.extractParametersWithContext(
      userAnswer,
      currentParams,
      Array.from(validation.missingFields)
    );

    logger.info('[第 2 轮] 上下文重提取结果:', {
      keywords: updatedParams.keywords,
      region: updatedParams.region,
      confidence: updatedParams.confidence,
      missingFields: updatedParams.missingFields,
    });

    // 参数合并：保留已有参数，更新新提取的参数
    currentParams = {
      keywords: updatedParams.keywords ?? currentParams.keywords,
      region: updatedParams.region ?? currentParams.region,
      confidence: Math.max(
        updatedParams.confidence,
        currentParams.confidence ?? 0
      ),
      extracted: updatedParams.extracted,
      missingFields: updatedParams.missingFields,
    };

    logger.info('[第 2 轮] 参数合并后:', {
      keywords: currentParams.keywords,
      region: currentParams.region,
      confidence: currentParams.confidence,
    });

    // 重新验证
    validation = validator.validateForMapQuery({
      keywords: currentParams.keywords,
      region: currentParams.region,
    });

    logger.info('[第 2 轮] 重新验证:', {
      isValid: validation.isValid,
      missingFields: validation.missingFields,
    });

    // 第三轮：用户再次补充信息
    if (validation.missingFields.length > 0) {
      const userAnswer2 = '我想要能爬山的地方，最好有景色';
      logger.info(`[第 3 轮] 用户回答追问: "${userAnswer2}"`);

      const updatedParams2 = await extractor.extractParametersWithContext(
        userAnswer2,
        currentParams,
        Array.from(validation.missingFields)
      );

      logger.info('[第 3 轮] 上下文重提取结果:', {
        keywords: updatedParams2.keywords,
        region: updatedParams2.region,
        confidence: updatedParams2.confidence,
      });

      // 再次参数合并
      currentParams = {
        keywords: updatedParams2.keywords ?? currentParams.keywords,
        region: updatedParams2.region ?? currentParams.region,
        confidence: Math.max(
          updatedParams2.confidence,
          currentParams.confidence ?? 0
        ),
        extracted: updatedParams2.extracted,
        missingFields: updatedParams2.missingFields,
      };

      logger.info('[第 3 轮] 最终参数合并后:', {
        keywords: currentParams.keywords,
        region: currentParams.region,
        confidence: currentParams.confidence,
      });
    }
  }

  return currentParams;
}

/**
 * 测试参数到高德查询的转换和查询
 */
async function testMapQueryAndProcessing(params: any) {
  logger.info('');
  logger.info('【高德 API 查询】');
  logger.info('-'.repeat(70));

  const extractor = getParameterExtractor();
  const locationService = getLocationService();

  // 转换为高德参数
  const mapParams = extractor.toMapSearchParams(params, 10, 1);
  logger.info('高德查询参数:', mapParams);

  if (!mapParams) {
    logger.warn('无法转换为高德参数，跳过查询');
    return null;
  }

  // 调用高德 API
  try {
    const result = await locationService.searchPOI(mapParams);

    logger.info('高德 API 查询结果:', {
      status: result.status,
      totalCount: result.count,
      returnedCount: result.pois?.length || 0,
      firstThreePois: result.pois
        ?.slice(0, 3)
        .map((p: any) => ({
          name: p.name,
          address: p.address,
          rating: p.rating,
          reviewCount: p.shopInfo?.reviewCount,
        })),
    });

    return result.pois || [];
  } catch (error) {
    logger.error('高德 API 查询失败:', error);
    return [];
  }
}

/**
 * 测试 LLM 详细推荐生成
 */
async function testLLMRecommendationGeneration(
  pois: any[],
  userInput: string
) {
  logger.info('');
  logger.info('【LLM 详细推荐生成】');
  logger.info('-'.repeat(70));

  if (!pois || pois.length === 0) {
    logger.warn('没有 POI 数据，无法生成推荐');
    return [];
  }

  const llmService = getLLMService();

  try {
    if (!llmService.isInitialized()) {
      await llmService.initialize();
    }

    const client = llmService.getClient();
    const topPois = pois.slice(0, 5);

    logger.info(`使用前 ${topPois.length} 个 POI 生成推荐`);

    // 构建详细的 POI 信息
    const poiDetails = topPois
      .map(
        (poi, idx) => `
${idx + 1}. ${poi.name}
   地址: ${poi.address || '暂无'}
   ${poi.businessArea ? `商圈: ${poi.businessArea}` : ''}
   评分: ${poi.rating || '暂无'}
   评价数: ${poi.shopInfo?.reviewCount ? `${poi.shopInfo.reviewCount}条` : '暂无'}
   电话: ${poi.tel || poi.phone || '暂无'}
   营业时间: ${poi.shopInfo?.openingHours || '暂无'}
   类型: ${poi.type || '暂无'}
   ${poi.distance ? `距离: ${(poi.distance / 1000).toFixed(1)} km` : ''}
`
      )
      .join('\n');

    // 构建 LLM 提示词
    const systemPrompt = `你是一个专业的公园和景点推荐助手。根据用户的需求和提供的地点详细信息，为用户生成高质量的推荐。

用户的原始需求：${userInput}

对于推荐的每个地点，你需要：
1. 理解为什么这个地点适合用户的需求
2. 提及该地点的特色、优势和特点
3. 根据实际数据（评分、评价数、营业时间等）生成具体建议
4. 考虑用户可能的使用场景，提供实用建议

请返回 JSON 数组格式，包含 3-5 个最佳推荐。每个推荐应包含完整的信息：
[
  {
    "name": "地点名称",
    "reason": "推荐理由（包括为什么选择这里、特色特点、适合的场景等），50-100字",
    "bookingTip": "实用建议或提示（如最佳访问时间、需要注意的事项等）",
    "rating": "评分",
    "reviewCount": "评价数",
    "hours": "营业时间",
    "phone": "电话",
    "businessArea": "商圈（地理位置参考）"
  }
]

重要提示：
- reason 字段应该结合用户需求和地点的实际数据来生成
- 优先推荐评分高（4.0+）、评价多（100+）的地点
- 确保返回的是有效的 JSON 数组
- 如果某些信息没有，可以用"暂无"或省略该字段`;

    const userMessage = `以下是查询得到的地点信息：

${poiDetails}

请为用户推荐最合适的地点。`;

    logger.info('LLM 输入信息:', {
      systemPromptLength: systemPrompt.length,
      userMessageLength: userMessage.length,
      poiCount: topPois.length,
    });

    // 调用 LLM
    const response = await client.call([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);

    logger.info('LLM 响应信息:', {
      contentLength: response.content?.length || 0,
      preview: response.content?.substring(0, 200),
    });

    // 解析 JSON 响应
    try {
      const jsonMatch = response.content?.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const recommendations = JSON.parse(jsonMatch[0]);

        logger.info('✅ LLM 推荐成功解析:', {
          count: recommendations.length,
          recommendations: recommendations.map((r: any) => ({
            name: r.name,
            reason: r.reason?.substring(0, 50) + '...',
            rating: r.rating,
            businessArea: r.businessArea,
          })),
        });

        // 补充 ID、地址和其他信息
        const enrichedRecommendations = recommendations.map(
          (rec: any, idx: number) => ({
            id: topPois[idx]?.id || `poi_${idx}`,
            name: rec.name,
            reason: rec.reason,
            bookingTip: rec.bookingTip,
            distance: topPois[idx]?.distance,
            rating: rec.rating || topPois[idx]?.rating,
            address: topPois[idx]?.address,
            phone: rec.phone || topPois[idx]?.tel || topPois[idx]?.phone,
            hours: rec.hours || topPois[idx]?.shopInfo?.openingHours,
            reviewCount: rec.reviewCount || topPois[idx]?.shopInfo?.reviewCount,
            businessArea: rec.businessArea || topPois[idx]?.businessArea,
          })
        );

        logger.info('✅ 完整推荐结果:', {
          count: enrichedRecommendations.length,
          details: enrichedRecommendations,
        });

        return enrichedRecommendations;
      } else {
        logger.warn('无法找到 JSON 数组，返回基础推荐');
        return topPois.slice(0, 3).map((poi, idx) => ({
          id: poi.id,
          name: poi.name,
          reason: `推荐的${poi.type || '地点'}，用户评分较高`,
          distance: poi.distance,
          rating: poi.rating,
          address: poi.address,
          phone: poi.tel || poi.phone,
          hours: poi.shopInfo?.openingHours,
          reviewCount: poi.shopInfo?.reviewCount,
          businessArea: poi.businessArea,
        }));
      }
    } catch (error) {
      logger.error('JSON 解析失败:', error);
      return topPois.slice(0, 3).map((poi, idx) => ({
        id: poi.id,
        name: poi.name,
        reason: '推荐地点',
        distance: poi.distance,
        rating: poi.rating,
        address: poi.address,
        phone: poi.tel || poi.phone,
        hours: poi.shopInfo?.openingHours,
        reviewCount: poi.shopInfo?.reviewCount,
        businessArea: poi.businessArea,
      }));
    }
  } catch (error) {
    logger.error('LLM 处理失败:', error);
    return [];
  }
}

/**
 * 显示最终推荐结果
 */
function displayFinalRecommendations(recommendations: any[]) {
  logger.info('');
  logger.info('【最终推荐结果】');
  logger.info('═'.repeat(70));

  if (recommendations.length === 0) {
    logger.warn('没有推荐结果');
    return;
  }

  recommendations.forEach((rec, index) => {
    logger.info(`\n#${index + 1}  ${rec.name}`);
    logger.info('  ' + '─'.repeat(66));

    if (rec.address) {
      logger.info(`  📍 地址: ${rec.address}`);
    }
    if (rec.businessArea) {
      logger.info(`  🏘️  商圈: ${rec.businessArea}`);
    }
    if (rec.distance) {
      logger.info(`  📏 距离: ${(rec.distance / 1000).toFixed(1)} km`);
    }
    if (rec.rating) {
      const fullStars = Math.floor(rec.rating);
      const emptyStars = 5 - fullStars;
      logger.info(
        `  ⭐ 评分: ${'★'.repeat(fullStars)}${'☆'.repeat(emptyStars)} ${rec.rating.toFixed(1)}/5.0${rec.reviewCount ? ` (${rec.reviewCount}条评价)` : ''}`
      );
    }
    if (rec.hours) {
      logger.info(`  🕐 营业时间: ${rec.hours}`);
    }
    if (rec.phone) {
      logger.info(`  📞 电话: ${rec.phone}`);
    }
    if (rec.reason) {
      logger.info(`  💡 推荐理由: ${rec.reason}`);
    }
    if (rec.bookingTip) {
      logger.info(`  💬 建议: ${rec.bookingTip}`);
    }
  });

  logger.info('');
  logger.info('═'.repeat(70));
}

/**
 * 主测试函数：完整流程集成测试
 */
export async function testCompleteFlow() {
  logger.info('═'.repeat(70));
  logger.info('  🚀  完整流程集成测试开始');
  logger.info('═'.repeat(70));

  try {
    // 第一步：模拟多轮追问
    const finalParams = await simulateMultiRoundQuestion();

    // 第二步：执行高德 API 查询
    const pois = await testMapQueryAndProcessing(finalParams);

    // 第三步：LLM 生成详细推荐
    const recommendations = await testLLMRecommendationGeneration(
      pois,
      '帮我推荐一个公园'
    );

    // 第四步：展示最终结果
    displayFinalRecommendations(recommendations);

    logger.info('');
    logger.info('✅ 完整流程集成测试成功完成');
    logger.info('═'.repeat(70));

    return {
      success: true,
      finalParams,
      poisCount: pois?.length || 0,
      recommendationsCount: recommendations?.length || 0,
    };
  } catch (error) {
    logger.error('❌ 完整流程集成测试失败:', error);
    logger.info('═'.repeat(70));
    throw error;
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  testCompleteFlow().catch((err) => {
    console.error('测试失败:', err);
    process.exit(1);
  });
}
