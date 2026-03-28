import { createLogger } from '@/utils/logger';
import { color, createTitleBox, createDivider } from '@/utils/format';
import { getParameterExtractor, ExtractedParams } from '@/dialogue/parameter-extractor';
import { getParameterValidator } from '@/dialogue/parameter-validator';
import { getLocationService } from '@/map/service';
import { getLLMService } from '@/llm/service';
import { MapSearchParams } from '@/types/map';
import * as readline from 'readline';

const logger = createLogger('command:recommend');

interface RecommendOptions {
  type: string;
  distance: string;
  location?: string;
  interactive: boolean;
}

export async function recommendCommand(options: RecommendOptions): Promise<void> {
  try {
    logger.info('推荐命令启动', { options });

    const titleBox = createTitleBox('推荐景点', 50);
    console.log('\n' + color.primary(titleBox) + '\n');

    // 进入新的推荐流程
    await newRecommendFlow();
  } catch (error) {
    logger.error('推荐命令失败:', error);
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    console.error(color.error(`✗ 错误: ${errorMsg}`));
    process.exit(1);
  }
}

/**
 * 新的推荐流程：一句话输入 → 参数提取 → 验证 → 追问/查询 → LLM 处理 → 展示结果
 */
async function newRecommendFlow(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  };

  try {
    // 初始化服务
    const extractor = getParameterExtractor();
    const validator = getParameterValidator();
    const llmService = getLLMService();
    const locationService = getLocationService();

    if (!llmService.isInitialized()) {
      await llmService.initialize();
    }

    console.log(color.info('欢迎使用智能推荐系统！'));
    console.log(color.neutral('请用一句话告诉我你的需求，例如：\n'));
    console.log(
      color.neutral('  "我住在深圳宝安西乡，帮我推荐附近有哪些公园"')
    );
    console.log(color.neutral('  "深圳南山附近有没有好的登山地点？"'));
    console.log(color.neutral('  "推荐我深圳罗湖附近的景区"\n'));

    // 第一步：获取用户的一句话输入
    const userInput = await question(
      color.primary('[?] 你的需求: ')
    );

    if (!userInput.trim()) {
      console.log(color.warning('[!] 请输入有效的需求'));
      rl.close();
      return;
    }

    console.log('');
    console.log(color.info('[i] 分析你的需求...'));

    // 第二步：LLM 提取参数
    const extractedParams = await extractor.extractParameters(userInput);

    logger.info('参数提取结果', {
      keywords: extractedParams.keywords,
      region: extractedParams.region,
      confidence: extractedParams.confidence,
      missingFields: extractedParams.missingFields,
    });

    let searchParams: MapSearchParams | null = null;

    // 第三步：参数验证和补充（循环追问直到参数齐全）
    if (!extractedParams.extracted) {
      console.log(
        color.warning('[!] 我理解得不太清楚，能帮我补充一下信息吗？\n')
      );

      let currentParams = {
        keywords: extractedParams.keywords,
        region: extractedParams.region,
      } as Partial<ExtractedParams>;

      let remainingMissing = extractedParams.missingFields;
      let askCount = 0;
      const MAX_ASKS = 20;
      const askedFields: Set<string> = new Set();

      // 循环追问缺失的参数，直到参数齐全或超过 20 次追问
      while (remainingMissing.length > 0 && askCount < MAX_ASKS) {
        const validation = validator.validateForMapQuery(currentParams);

        for (const prompt of validation.prompts) {
          const answer = await question(color.primary(prompt + ' '));
          console.log('');

          if (answer.trim()) {
            askCount++;
            
            // 调用带上下文的参数提取器，而不是简单的 updateFromUserInput
            const updatedParams = await extractor.extractParametersWithContext(
              answer,
              currentParams,
              Array.from(askedFields)
            );

            // 合并提取结果
            currentParams = {
              keywords: updatedParams.keywords ?? currentParams.keywords,
              region: updatedParams.region ?? currentParams.region,
            };

            // 记录已追问的字段
            validation.missingFields.forEach(field => askedFields.add(field));

            logger.info(`追问第 ${askCount} 次`, {
              answer: answer.substring(0, 50),
              updatedParams: {
                keywords: currentParams.keywords,
                region: currentParams.region,
              },
            });
          }
        }

        // 重新验证
        const newValidation = validator.validateForMapQuery(currentParams);
        remainingMissing = newValidation.missingFields;

        if (remainingMissing.length > 0 && askCount < MAX_ASKS) {
          console.log(
            color.warning(
              '[!] 还需要以下信息来完成推荐\n'
            )
          );
        } else if (askCount >= MAX_ASKS) {
          console.log(
            color.warning(
              '[!] 已达到最多追问次数，使用当前参数进行查询\n'
            )
          );
          break;
        }
      }

      searchParams = extractor.toMapSearchParams(
        { ...extractedParams, ...currentParams },
        10,
        1
      );
    } else {
      // 参数完整，直接转换
      searchParams = extractor.toMapSearchParams(extractedParams, 10, 1);
    }

    if (!searchParams) {
      console.log(color.error('[✗] 无法获取有效的搜索参数'));
      rl.close();
      return;
    }

    console.log(
      color.success(`[✓] 好的！我来为你搜索 ${color.primary(searchParams.region)} 附近的 ${color.primary(searchParams.keywords)}`)
    );
    console.log('');

    // 第四步：调用高德 API 查询
    console.log(color.info('[i] 正在查询...'));
    const mapResult = await locationService.searchPOI(searchParams);

    logger.info('高德 API 查询结果', {
      count: mapResult.count,
      results: mapResult.count,
    });

    if (!mapResult.pois || mapResult.pois.length === 0) {
      console.log(
        color.warning(
          `[!] 没有找到相关的 ${searchParams.keywords}，请尝试其他搜索词`
        )
      );
      rl.close();
      return;
    }

    console.log(
      color.success(
        `[✓] 找到 ${color.primary(mapResult.count.toString())} 个相关地点！\n`
      )
    );

    // 第五步：LLM 处理高德结果并生成详细推荐
    console.log(color.info('[i] 分析推荐...'));
    const recommendations = await processRecommendations(
      mapResult.pois,
      userInput,
      searchParams,
      llmService
    );

    // 第六步：展示结果
    displayRecommendations(recommendations);

    // 询问是否继续
    console.log('');
    const continueChoice = await question(
      color.primary('[?] 是否要继续推荐？(y/n) [n]: ')
    );

    if (continueChoice.toLowerCase() === 'y') {
      console.log('');
      await newRecommendFlow();
    } else {
      console.log(color.success('[✓] 感谢使用推荐系统！'));
      rl.close();
    }
  } finally {
    try {
      rl.close();
    } catch {
      // readline 已关闭，忽略错误
    }
  }
}

/**
 * 使用 LLM 处理高德 API 返回的数据，生成详细推荐
 */
async function processRecommendations(
  pois: any[],
  userInput: string,
  searchParams: MapSearchParams,
  llmService: any
): Promise<
  Array<{
    id: string;
    name: string;
    reason: string;
    distance?: number;
    rating?: number;
    address?: string;
    phone?: string;
    hours?: string;
    reviewCount?: number;
    businessArea?: string;
  }>
> {
  try {
    const client = llmService.getClient();

    // 取前 10 个 POI
    const topPois = pois.slice(0, 10);

    // 构建详细的 POI 信息（包含商圈）
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

    const systemPrompt = `你是一个专业的公园和景点推荐助手。根据用户的需求和提供的地点详细信息，为用户生成高质量的推荐。

用户的原始需求：${userInput}
搜索地点：${searchParams.region}附近的${searchParams.keywords}

对于推荐的每个地点，你需要：
1. 理解为什么这个地点适合用户的需求
2. 提及该地点的特色、优势和优势
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
    "businessArea": "商圈（地理位置参考，如'南山商圈'）"
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

    const response = await client.call([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);

    logger.debug('LLM 推荐处理响应', {
      content: response.content?.substring(0, 300),
    });

    // 解析 LLM 响应
    const jsonMatch = response.content?.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      logger.warn('无法解析 LLM 推荐响应');
      // 回退：直接返回前 3 个 POI
      return topPois.slice(0, 3).map((poi, idx) => ({
        id: poi.id || `poi_${idx}`,
        name: poi.name,
        reason: `推荐的${searchParams.keywords}，用户评分较高`,
        distance: poi.distance,
        rating: poi.rating,
        address: poi.address,
        phone: poi.tel || poi.phone,
        hours: poi.shopInfo?.openingHours,
        reviewCount: poi.shopInfo?.reviewCount,
        businessArea: poi.businessArea,
      }));
    }

    const recommendations = JSON.parse(jsonMatch[0]);

    // 补充 ID、地址和其他信息（包含商圈）
    return recommendations.map((rec: any, idx: number) => ({
      id: topPois[idx]?.id || `poi_${idx}`,
      name: rec.name,
      reason: rec.reason,
      distance: topPois[idx]?.distance,
      rating: rec.rating || topPois[idx]?.rating,
      address: topPois[idx]?.address,
      phone: rec.phone || topPois[idx]?.tel || topPois[idx]?.phone,
      hours: rec.hours || topPois[idx]?.shopInfo?.openingHours,
      reviewCount: rec.reviewCount || topPois[idx]?.shopInfo?.reviewCount,
      businessArea: rec.businessArea || topPois[idx]?.businessArea,
    }));
  } catch (error) {
    logger.error('LLM 推荐处理失败:', error);
    // 回退：返回前 3 个 POI
    return pois.slice(0, 3).map((poi, idx) => ({
      id: poi.id || `poi_${idx}`,
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
}

/**
 * 展示推荐结果（增强版）
 */
function displayRecommendations(
  recommendations: Array<{
    id: string;
    name: string;
    reason: string;
    distance?: number;
    rating?: number;
    address?: string;
    phone?: string;
    hours?: string;
    reviewCount?: number;
    businessArea?: string;
  }>
): void {
  console.log(color.neutral(createDivider('═', 70)));
  console.log(color.primary('  🎯  推荐结果  🎯'));
  console.log(color.neutral(createDivider('═', 70)));
  console.log('');

  recommendations.forEach((rec, index) => {
    // 标题行
    console.log(color.primary(`#${index + 1}  ${rec.name}`));
    console.log(color.neutral('  ' + createDivider('─', 66)));
    
    // 基础信息行
    if (rec.address) {
      console.log(`  📍 地址: ${rec.address}`);
    }
    if (rec.businessArea) {
      console.log(`  🏘️  商圈: ${rec.businessArea}`);
    }
    
    // 距离信息
    if (rec.distance) {
      const distanceKm = (rec.distance / 1000).toFixed(1);
      console.log(`  📏 距离: ${distanceKm} km`);
    }
    
    // 评分和评价信息
    if (rec.rating) {
      const fullStars = Math.floor(rec.rating);
      const halfStar = rec.rating % 1 >= 0.5 ? 1 : 0;
      const emptyStars = 5 - fullStars - halfStar;
      const starDisplay = '★'.repeat(fullStars) + (halfStar ? '✪' : '') + '☆'.repeat(emptyStars);
      console.log(
        `  ⭐ 评分: ${starDisplay} ${rec.rating.toFixed(1)}/5.0${rec.reviewCount ? ` (${rec.reviewCount}条评价)` : ''}`
      );
    }
    
    // 营业时间
    if (rec.hours) {
      console.log(`  🕐 营业时间: ${rec.hours}`);
    }
    
    // 电话
    if (rec.phone) {
      console.log(`  📞 电话: ${rec.phone}`);
    }
    
    // 推荐理由
    console.log(`  💡 推荐理由:`);
    const reasonLines = rec.reason.split('。').filter(line => line.trim());
    reasonLines.forEach(line => {
      if (line.trim()) {
        console.log(`      ${line.trim()}。`);
      }
    });
    
    console.log('');
  });

  console.log(color.neutral(createDivider('═', 70)));
}


