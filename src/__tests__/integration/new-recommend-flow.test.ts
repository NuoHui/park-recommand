/**
 * 新推荐流程的集成测试
 * 验证：参数提取 → 参数验证 → 高德 API 查询 → LLM 结果处理
 */

import { getParameterExtractor } from '@/dialogue/parameter-extractor';
import { getParameterValidator } from '@/dialogue/parameter-validator';
import { getLocationService } from '@/map/service';
import { getLLMService } from '@/llm/service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('test:new-recommend-flow');

export async function testNewRecommendFlow() {
  logger.info('=' .repeat(60));
  logger.info('开始新推荐流程集成测试');
  logger.info('=' .repeat(60));

  try {
    // ==================== 测试 1: 参数提取 ====================
    logger.info('');
    logger.info('【测试 1】参数提取');
    logger.info('-'.repeat(60));

    const extractor = getParameterExtractor();
    const validator = getParameterValidator();

    const testInputs = [
      '我住在深圳宝安西乡，帮我推荐附近有哪些公园',
      '深圳南山附近有没有好的登山地点？',
      '推荐我深圳罗湖附近的景区',
    ];

    let lastExtractedParams = null;

    for (const input of testInputs) {
      logger.info(`\n[输入] ${input}`);

      const extracted = await extractor.extractParameters(input);

      logger.info('[提取结果]', {
        keywords: extracted.keywords,
        region: extracted.region,
        confidence: extracted.confidence,
        extracted: extracted.extracted,
        missingFields: extracted.missingFields,
      });

      if (input === testInputs[0]) {
        lastExtractedParams = extracted;
      }
    }

    // ==================== 测试 2: 参数验证 ====================
    logger.info('');
    logger.info('【测试 2】参数验证');
    logger.info('-'.repeat(60));

    if (lastExtractedParams) {
      const validation = validator.validateForMapQuery({
        keywords: lastExtractedParams.keywords,
        region: lastExtractedParams.region,
      });

      logger.info('[验证结果]', {
        isValid: validation.isValid,
        missingFields: validation.missingFields,
        prompts: validation.prompts,
      });
    }

    // ==================== 测试 3: 转换为高德参数 ====================
    logger.info('');
    logger.info('【测试 3】转换为高德 API 参数');
    logger.info('-'.repeat(60));

    if (lastExtractedParams && lastExtractedParams.extracted) {
      const mapParams = extractor.toMapSearchParams(lastExtractedParams, 10, 1);
      logger.info('[高德参数]', mapParams);

      // ==================== 测试 4: 调用高德 API ====================
      logger.info('');
      logger.info('【测试 4】调用高德 API');
      logger.info('-'.repeat(60));

      const locationService = getLocationService();
      const mapResult = await locationService.searchPOI(mapParams!);

      logger.info('[高德 API 结果]', {
        status: mapResult.status,
        count: mapResult.count,
        poiCount: mapResult.pois?.length || 0,
        firstPoi: mapResult.pois?.[0]?.name || 'N/A',
      });

      if (mapResult.pois && mapResult.pois.length > 0) {
        // ==================== 测试 5: LLM 处理结果 ====================
        logger.info('');
        logger.info('【测试 5】LLM 处理高德结果');
        logger.info('-'.repeat(60));

        const llmService = getLLMService();
        if (!llmService.isInitialized()) {
          await llmService.initialize();
        }

        const client = llmService.getClient();
        const topPois = mapResult.pois.slice(0, 5);

        const userInput = testInputs[0];
        const systemPrompt = `你是一个专业的旅游推荐助手。根据用户的需求和提供的地点信息，为用户生成推荐。

用户原始需求：${userInput}

请从提供的地点中选择 2-3 个最好的推荐，返回 JSON 数组格式。`;

        const userMessage = `以下是查询得到的地点信息：

${topPois
  .map(
    (poi, idx) => `
${idx + 1}. ${poi.name}
   地址: ${poi.address}
   评分: ${poi.rating || '暂无'}
   类型: ${poi.type || '暂无'}
`
  )
  .join('\n')}

请为用户推荐最合适的地点。`;

        logger.info('[LLM 输入]', {
          systemPromptLength: systemPrompt.length,
          userMessageLength: userMessage.length,
        });

        const response = await client.call([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ]);

        logger.info('[LLM 响应]', {
          contentLength: response.content?.length || 0,
          content: response.content?.substring(0, 500),
        });

        // 尝试解析 JSON
        try {
          const jsonMatch = response.content?.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const recommendations = JSON.parse(jsonMatch[0]);
            logger.info('[解析成功]', {
              recommendationCount: recommendations.length,
              recommendations: recommendations.map((r: any) => ({
                name: r.name,
                reason: r.reason?.substring(0, 50) || '暂无',
              })),
            });
          } else {
            logger.warn('[解析警告] 无法找到 JSON 数组');
          }
        } catch (e) {
          logger.warn('[解析警告]', { error: e instanceof Error ? e.message : '未知错误' });
        }
      }
    }

    logger.info('');
    logger.info('✅ 新推荐流程集成测试完成');
    logger.info('=' .repeat(60));
  } catch (error) {
    logger.error('❌ 测试失败:', error);
    logger.info('=' .repeat(60));
    throw error;
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  testNewRecommendFlow().catch((err) => {
    console.error('测试失败:', err);
    process.exit(1);
  });
}
