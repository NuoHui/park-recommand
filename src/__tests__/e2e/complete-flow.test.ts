/**
 * E2E 完整流程测试
 * 从命令行接收用户输入，完整流程验证
 */

import { getParameterExtractor } from '@/dialogue/parameter-extractor';
import { getParameterValidator } from '@/dialogue/parameter-validator';
import { getLocationService } from '@/map/service';
import { getLLMService } from '@/llm/service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('e2e:complete-flow');

const color = {
  primary: (s: string) => `\x1b[36m${s}\x1b[0m`,
  success: (s: string) => `\x1b[32m${s}\x1b[0m`,
  warning: (s: string) => `\x1b[33m${s}\x1b[0m`,
  error: (s: string) => `\x1b[31m${s}\x1b[0m`,
  neutral: (s: string) => `\x1b[90m${s}\x1b[0m`,
};

/**
 * 完整 E2E 流程测试场景
 */
export async function runE2ECompleteFlowTest() {
  console.log('');
  console.log(color.primary('═'.repeat(80)));
  console.log(color.primary('  ✨ 完整推荐流程 E2E 测试'));
  console.log(color.primary('═'.repeat(80)));

  // 测试场景 1: 初始需求不完整，需多轮追问
  console.log('');
  console.log(color.primary('【场景 1】初始需求不完整 → 多轮追问 → 完整推荐'));
  console.log(color.neutral('─'.repeat(80)));

  const scenario1 = await testScenario1_MultiRoundQuestion();

  // 测试场景 2: 完整需求直接推荐
  console.log('');
  console.log(color.primary('【场景 2】完整需求 → 直接推荐'));
  console.log(color.neutral('─'.repeat(80)));

  const scenario2 = await testScenario2_CompleteInput();

  // 测试场景 3: 参数上下文保留验证
  console.log('');
  console.log(color.primary('【场景 3】参数上下文保留验证'));
  console.log(color.neutral('─'.repeat(80)));

  const scenario3 = await testScenario3_ContextPreservation();

  // 总结
  console.log('');
  console.log(color.primary('═'.repeat(80)));
  console.log(color.success('  ✅ E2E 完整流程测试完成'));
  console.log(color.primary('═'.repeat(80)));

  return {
    scenario1,
    scenario2,
    scenario3,
  };
}

/**
 * 场景 1: 初始需求不完整 → 多轮追问 → 完整推荐
 */
async function testScenario1_MultiRoundQuestion() {
  logger.info('场景 1 开始');

  const extractor = getParameterExtractor();
  const validator = getParameterValidator();
  const locationService = getLocationService();
  const llmService = getLLMService();

  let currentParams: any = null;
  const askedFields = new Set<string>();
  const MAX_ASKS = 3; // 演示用，限制 3 轮追问
  let askCount = 0;

  try {
    // 第一轮：用户初始输入
    const initialInput = '帮我推荐一个公园';
    console.log(color.primary(`\n[初始输入] "${initialInput}"`));

    currentParams = await extractor.extractParameters(initialInput);
    console.log(color.neutral(`  keywords: ${currentParams.keywords}`));
    console.log(color.neutral(`  region: ${currentParams.region}`));
    console.log(
      color.warning(`  缺失字段: ${currentParams.missingFields.join(', ')}`)
    );

    // 循环追问
    let remainingMissing = currentParams.missingFields || [];

    while (remainingMissing.length > 0 && askCount < MAX_ASKS) {
      const validation = validator.validateForMapQuery({
        keywords: currentParams.keywords,
        region: currentParams.region,
      });

      if (validation.missingFields.length === 0) {
        break;
      }

      // 模拟用户回答
      let userAnswer = '';
      if (askCount === 0) {
        userAnswer = '我在深圳宝安区';
        console.log(color.primary(`\n[追问 ${askCount + 1}] 缺失地区，用户回答: "${userAnswer}"`));
      } else if (askCount === 1) {
        userAnswer = '最好能爬山或登山';
        console.log(color.primary(`\n[追问 ${askCount + 1}] 缺失类型，用户回答: "${userAnswer}"`));
      }

      if (userAnswer.trim()) {
        askCount++;

        // 使用带上下文的参数重提取
        const updatedParams =
          await extractor.extractParametersWithContext(
            userAnswer,
            currentParams,
            Array.from(askedFields)
          );

        console.log(
          color.success(
            `  [更新] keywords: ${updatedParams.keywords}, region: ${updatedParams.region}`
          )
        );

        // 参数合并
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

        // 更新已追问字段
        validation.missingFields.forEach((field) => askedFields.add(field));

        // 重新验证
        const newValidation = validator.validateForMapQuery({
          keywords: currentParams.keywords,
          region: currentParams.region,
        });
        remainingMissing = newValidation.missingFields;

        console.log(color.neutral(`  信心度: ${currentParams.confidence}`));
        if (remainingMissing.length > 0) {
          console.log(
            color.warning(`  仍需补充: ${remainingMissing.join(', ')}`)
          );
        } else {
          console.log(color.success(`  ✓ 参数完整`));
        }
      }
    }

    // 参数完整，执行查询
    console.log(color.primary(`\n[高德查询]`));
    const mapParams = extractor.toMapSearchParams(currentParams, 10, 1);
    if (mapParams) {
      console.log(
        color.neutral(`  keywords: ${mapParams.keywords}, region: ${mapParams.region}`)
      );

      const result = await locationService.searchPOI(mapParams);
      console.log(
        color.success(`  ✓ 查询成功: 获得 ${result.pois?.length || 0} 个 POI`)
      );

      // LLM 推荐
      if (result.pois && result.pois.length > 0) {
        console.log(color.primary(`\n[LLM 推荐生成]`));

        if (!llmService.isInitialized()) {
          await llmService.initialize();
        }

        const recommendations = await generateLLMRecommendations(
          result.pois.slice(0, 3),
          initialInput,
          llmService
        );

        console.log(
          color.success(
            `  ✓ 生成推荐: ${recommendations.length} 个`
          )
        );

        return {
          success: true,
          asksCount: askCount,
          finalParams: currentParams,
          recommendationsCount: recommendations.length,
        };
      }
    }

    return {
      success: false,
      asksCount: askCount,
      error: '无法获取 POI 或生成推荐',
    };
  } catch (error) {
    logger.error('场景 1 失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 场景 2: 完整需求 → 直接推荐
 */
async function testScenario2_CompleteInput() {
  logger.info('场景 2 开始');

  const extractor = getParameterExtractor();
  const locationService = getLocationService();
  const llmService = getLLMService();

  try {
    // 完整的用户输入
    const input = '帮我推荐深圳南山附近的公园';
    console.log(color.primary(`\n[输入] "${input}"`));

    // 参数提取
    const params = await extractor.extractParameters(input);
    console.log(
      color.success(
        `  ✓ keywords: ${params.keywords}, region: ${params.region}`
      )
    );

    // 直接转换为高德参数
    const mapParams = extractor.toMapSearchParams(params, 10, 1);
    if (!mapParams) {
      return { success: false, error: '无法转换参数' };
    }

    console.log(color.primary(`\n[高德查询]`));
    const result = await locationService.searchPOI(mapParams);
    console.log(
      color.success(`  ✓ 查询成功: 获得 ${result.pois?.length || 0} 个 POI`)
    );

    // LLM 推荐
    if (result.pois && result.pois.length > 0) {
      console.log(color.primary(`\n[LLM 推荐生成]`));

      if (!llmService.isInitialized()) {
        await llmService.initialize();
      }

      const recommendations = await generateLLMRecommendations(
        result.pois.slice(0, 3),
        input,
        llmService
      );

      console.log(
        color.success(`  ✓ 生成推荐: ${recommendations.length} 个`)
      );

      return {
        success: true,
        params,
        recommendationsCount: recommendations.length,
      };
    }

    return { success: false, error: '无法获取 POI' };
  } catch (error) {
    logger.error('场景 2 失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 场景 3: 参数上下文保留验证
 */
async function testScenario3_ContextPreservation() {
  logger.info('场景 3 开始');

  const extractor = getParameterExtractor();
  const validator = getParameterValidator();

  try {
    // 初始参数
    const initialParams = {
      keywords: '公园',
      region: '深圳',
      confidence: 0.8,
      extracted: true,
      missingFields: [],
    };

    console.log(
      color.primary(`\n[初始参数] keywords: ${initialParams.keywords}, region: ${initialParams.region}`)
    );

    // 用户后续输入
    const userInput = '我想要能爬山的';
    console.log(color.primary(`\n[追问回答] "${userInput}"`));

    // 使用带上下文的提取，确保 region 被保留
    const updatedParams = await extractor.extractParametersWithContext(
      userInput,
      initialParams,
      ['keywords']
    );

    console.log(color.neutral(`  原始 region: ${initialParams.region}`));
    console.log(
      color.success(
        `  更新后 region: ${updatedParams.region ?? '(保留原值)'}`
      )
    );
    console.log(
      color.success(`  keywords 更新: ${initialParams.keywords} → ${updatedParams.keywords}`)
    );

    // 验证上下文保留
    const merged = {
      keywords: updatedParams.keywords ?? initialParams.keywords,
      region: updatedParams.region ?? initialParams.region,
    };

    console.log(color.neutral(`  [验证] 合并后参数:`));
    console.log(color.success(`    keywords: ${merged.keywords}`));
    console.log(color.success(`    region: ${merged.region}`));

    // 确保地区没有被错误更改
    const isContextPreserved = merged.region === initialParams.region;
    console.log(
      isContextPreserved
        ? color.success(`  ✓ 上下文保留成功`)
        : color.error(`  ✗ 上下文丢失`)
    );

    return {
      success: isContextPreserved,
      initialParams,
      updatedParams,
      mergedParams: merged,
    };
  } catch (error) {
    logger.error('场景 3 失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 辅助函数：生成 LLM 推荐
 */
async function generateLLMRecommendations(
  pois: any[],
  userInput: string,
  llmService: any
): Promise<any[]> {
  try {
    const client = llmService.getClient();

    const poiDetails = pois
      .map(
        (poi, idx) => `
${idx + 1}. ${poi.name}
   地址: ${poi.address}
   评分: ${poi.rating || '暂无'}
   评价数: ${poi.shopInfo?.reviewCount || '暂无'}
   类型: ${poi.type || '暂无'}
`
      )
      .join('\n');

    const systemPrompt = `你是一个公园推荐助手。根据用户需求推荐最合适的地点。用户需求：${userInput}

返回 JSON 数组格式的推荐，每个包含 name 和 reason 字段。`;

    const userMessage = `地点信息：${poiDetails}\n请生成推荐。`;

    const response = await client.call([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);

    const jsonMatch = response.content?.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return [];
  } catch (error) {
    logger.error('LLM 推荐失败:', error);
    return [];
  }
}

// 如果直接运行
if (import.meta.url === `file://${process.argv[1]}`) {
  runE2ECompleteFlowTest().catch((err) => {
    console.error('E2E 测试失败:', err);
    process.exit(1);
  });
}
