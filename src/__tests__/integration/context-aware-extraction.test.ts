/**
 * 带上下文的参数提取测试
 * 验证循环追问流程中的参数重新提取功能
 */

import { getParameterExtractor } from '@/dialogue/parameter-extractor';
import { createLogger } from '@/utils/logger';

const logger = createLogger('test:context-aware-extraction');

export async function testContextAwareExtraction() {
  logger.info('='.repeat(70));
  logger.info('开始带上下文的参数提取测试');
  logger.info('='.repeat(70));

  try {
    const extractor = getParameterExtractor();

    // ==================== 测试场景 ====================
    // 用户：只说了地区，没说搜索内容
    // 系统：追问搜索内容
    // 用户：回答搜索内容
    // 系统：通过上下文提取，得到完整参数

    logger.info('');
    logger.info('【场景 1】用户只提到地区，不提搜索内容');
    logger.info('-'.repeat(70));

    // 第一次提取：用户只说了地区
    const firstInput = '我住在深圳';
    logger.info(`[用户第一次输入] ${firstInput}`);

    const firstExtracted = await extractor.extractParameters(firstInput);
    logger.info('[第一次提取结果]', {
      keywords: firstExtracted.keywords,
      region: firstExtracted.region,
      confidence: firstExtracted.confidence,
      missingFields: firstExtracted.missingFields,
    });

    // 模拟追问后用户的回答
    const userFollowUp = '我想找公园';
    logger.info(`\n[用户追问回答] ${userFollowUp}`);

    // 使用带上下文的提取方法
    const secondExtracted = await extractor.extractParametersWithContext(
      userFollowUp,
      {
        keywords: firstExtracted.keywords,
        region: firstExtracted.region,
      },
      ['keywords'] // 已追问的字段
    );

    logger.info('[第二次提取结果（带上下文）]', {
      keywords: secondExtracted.keywords,
      region: secondExtracted.region,
      confidence: secondExtracted.confidence,
      extracted: secondExtracted.extracted,
      missingFields: secondExtracted.missingFields,
    });

    // ==================== 测试场景 2 ====================
    logger.info('');
    logger.info('【场景 2】用户只说了搜索内容，不提地区');
    logger.info('-'.repeat(70));

    const thirdInput = '我想找景区';
    logger.info(`[用户第一次输入] ${thirdInput}`);

    const thirdExtracted = await extractor.extractParameters(thirdInput);
    logger.info('[第一次提取结果]', {
      keywords: thirdExtracted.keywords,
      region: thirdExtracted.region,
      confidence: thirdExtracted.confidence,
      missingFields: thirdExtracted.missingFields,
    });

    // 用户追问回答
    const fourthInput = '我在北京朝阳区';
    logger.info(`\n[用户追问回答] ${fourthInput}`);

    const fourthExtracted = await extractor.extractParametersWithContext(
      fourthInput,
      {
        keywords: thirdExtracted.keywords,
        region: thirdExtracted.region,
      },
      ['region']
    );

    logger.info('[第二次提取结果（带上下文）]', {
      keywords: fourthExtracted.keywords,
      region: fourthExtracted.region,
      confidence: fourthExtracted.confidence,
      extracted: fourthExtracted.extracted,
      missingFields: fourthExtracted.missingFields,
    });

    // ==================== 测试场景 3 ====================
    logger.info('');
    logger.info('【场景 3】用户补充信息时改变之前的参数');
    logger.info('-'.repeat(70));

    const fifthInput = '我先说我住在杭州';
    logger.info(`[用户第一次输入] ${fifthInput}`);

    const fifthExtracted = await extractor.extractParameters(fifthInput);
    logger.info('[第一次提取结果]', {
      keywords: fifthExtracted.keywords,
      region: fifthExtracted.region,
      missingFields: fifthExtracted.missingFields,
    });

    // 用户补充：改变搜索内容，同时改进地区信息
    const sixthInput = '我要找的是爬山地点，顺便更正一下，我在杭州萧山';
    logger.info(`\n[用户补充信息] ${sixthInput}`);

    const sixthExtracted = await extractor.extractParametersWithContext(
      sixthInput,
      {
        keywords: fifthExtracted.keywords,
        region: fifthExtracted.region,
      },
      ['keywords', 'region']
    );

    logger.info('[第二次提取结果（带上下文）]', {
      keywords: sixthExtracted.keywords,
      region: sixthExtracted.region,
      confidence: sixthExtracted.confidence,
      extracted: sixthExtracted.extracted,
      missingFields: sixthExtracted.missingFields,
    });

    logger.info('');
    logger.info('✅ 带上下文的参数提取测试完成');
    logger.info('='.repeat(70));
  } catch (error) {
    logger.error('❌ 测试失败:', error);
    logger.info('='.repeat(70));
    throw error;
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  testContextAwareExtraction().catch((err) => {
    console.error('测试失败:', err);
    process.exit(1);
  });
}
