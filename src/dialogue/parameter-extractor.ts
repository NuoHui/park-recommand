/**
 * 参数提取器
 * 从用户自然语言输入中提取高德 API 所需的参数（keywords、region 等）
 */

import { getLLMService } from '@/llm/service';
import { MapSearchParams } from '@/types/map';
import { createLogger } from '@/utils/logger';

const logger = createLogger('dialogue:parameter-extractor');

export interface ExtractedParams {
  keywords?: string;
  region?: string;
  types?: string[];
  extracted: boolean;
  confidence: number; // 0-1
  missingFields: string[]; // 缺失的必需字段
  rawResponse?: string;
}

/**
 * 参数提取器类
 */
export class ParameterExtractor {
  private static readonly REQUIRED_FIELDS = ['keywords', 'region'];
  private static readonly OPTIONAL_FIELDS = ['types', 'pageSize', 'pageNum'];

  /**
   * 从用户输入中提取参数
   */
  async extractParameters(userInput: string): Promise<ExtractedParams> {
    try {
      logger.info('开始参数提取', { userInput: userInput.substring(0, 100) });

      const llmService = getLLMService();
      if (!llmService.isInitialized()) {
        await llmService.initialize();
      }

      const client = llmService.getClient();

      // 构建 LLM 提示词
      const systemPrompt = `你是一个公园推荐助手。从用户的一句话中精确提取以下信息：

1. keywords：用户要搜索的内容（如"公园"、"山"、"景区"、"爬山"等）- 必需
2. region：用户所在的城市（提取最高级别的城市名称，如"深圳"、"北京"、"杭州"等）- 必需

重要提示：
- region 应该是城市级别，不需要包含街道、社区等详细信息
- 例如：用户说"我住在深圳宝安西乡"，应该提取 region 为"深圳"，不是"深圳宝安西乡"
- 例如：用户说"深圳南山附近"，应该提取 region 为"深圳"

用户可能会用以下方式表达：
- "我住在XX地方，帮我推荐XX" - 位置在"住在"之后，搜索内容通常是名词
- "在XX附近有什么XX吗" - 位置是"附近"之前，搜索内容在"有什么"之后
- "推荐我XX附近的XX" - 位置是前者，搜索内容是后者

请返回 JSON 格式的结果（务必是有效的 JSON）：
{
  "keywords": "提取的搜索关键词，如果无法提取返回 null",
  "region": "提取的城市名称（仅城市级别），如果无法提取返回 null",
  "confidence": 0.95,
  "reasoning": "简要说明提取过程"
}`;

      const userMessage = `用户输入：${userInput}

请提取参数并返回 JSON。`;

      const response = await client.call([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ]);

      logger.debug('LLM 原始响应', { response: response.content?.substring(0, 200) });

      // 解析 LLM 响应
      const parsed = this.parseExtractedResponse(response.content || '');

      logger.info('参数提取完成', {
        keywords: parsed.keywords,
        region: parsed.region,
        confidence: parsed.confidence,
        missingFields: parsed.missingFields,
      });

      return parsed;
    } catch (error) {
      logger.error('参数提取失败:', error);
      return {
        extracted: false,
        confidence: 0,
        missingFields: ['keywords', 'region'],
        rawResponse: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 带上下文的参数提取（用于循环追问）
   * 在每次用户回答后重新提取参数，保留已提取的参数作为上下文
   */
  async extractParametersWithContext(
    userInput: string,
    previousParams: Partial<ExtractedParams>,
    askedFields: string[]
  ): Promise<ExtractedParams> {
    try {
      logger.info('开始带上下文的参数提取', {
        userInput: userInput.substring(0, 100),
        previousParams,
        askedFields,
      });

      const llmService = getLLMService();
      if (!llmService.isInitialized()) {
        await llmService.initialize();
      }

      const client = llmService.getClient();

      // 构建已有的参数上下文
      const contextInfo = [];
      if (previousParams.keywords) {
        contextInfo.push(`- 搜索内容 (keywords): "${previousParams.keywords}"`);
      }
      if (previousParams.region) {
        contextInfo.push(`- 城市 (region): "${previousParams.region}"`);
      }

      // 构建缺失的参数说明
      const missingFields = [];
      if (!previousParams.keywords) {
        missingFields.push('keywords（搜索内容）');
      }
      if (!previousParams.region) {
        missingFields.push('region（城市）');
      }

      const systemPrompt = `你是一个公园推荐助手。用户正在补充信息以完成推荐查询。

当前已有的信息：
${contextInfo.length > 0 ? contextInfo.join('\n') : '（暂无已提取的信息）'}

用户接下来的回答需要补充以下缺失信息：
${missingFields.length > 0 ? missingFields.join('、') : '所有必需信息都已获取'}

根据用户的补充回答，更新相应的参数。请返回 JSON 格式的结果（务必是有效的 JSON）：
{
  "keywords": "更新后的搜索关键词，或如果用户未提及则保持为 null",
  "region": "更新后的城市名称，或如果用户未提及则保持为 null",
  "confidence": 0.85,
  "reasoning": "简要说明本次提取的内容"
}

重要提示：
- 如果用户的回答不包含某个字段的信息，请将其设置为 null，不要猜测
- region 应该只返回城市级别的信息（如"深圳"），不要包含街道等详细信息
- keywords 应该提取用户明确表达的搜索内容`;

      const userMessage = `用户的补充回答：${userInput}

请提取参数并返回 JSON。`;

      const response = await client.call([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ]);

      logger.debug('LLM 原始响应（带上下文）', { response: response.content?.substring(0, 200) });

      // 解析 LLM 响应
      const parsed = this.parseExtractedResponse(response.content || '');

      // 将新提取的参数与之前的参数合并
      const merged: ExtractedParams = {
        keywords: parsed.keywords ?? previousParams.keywords,
        region: parsed.region ?? previousParams.region,
        types: parsed.types ?? previousParams.types,
        confidence: Math.max(parsed.confidence, previousParams.confidence ?? 0),
        extracted: !!(parsed.keywords ?? previousParams.keywords) && !!(parsed.region ?? previousParams.region),
        missingFields: [],
        rawResponse: parsed.rawResponse,
      };

      // 检查缺失字段
      if (!merged.keywords) {
        merged.missingFields.push('keywords');
      }
      if (!merged.region) {
        merged.missingFields.push('region');
      }

      logger.info('带上下文的参数提取完成', {
        keywords: merged.keywords,
        region: merged.region,
        confidence: merged.confidence,
        missingFields: merged.missingFields,
      });

      return merged;
    } catch (error) {
      logger.error('带上下文的参数提取失败:', error);
      return {
        ...previousParams,
        extracted: false,
        confidence: 0,
        missingFields: [
          ...(previousParams.keywords ? [] : ['keywords']),
          ...(previousParams.region ? [] : ['region']),
        ],
        rawResponse: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 解析 LLM 响应
   */
  private parseExtractedResponse(content: string): ExtractedParams {
    try {
      // 尝试从响应中提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn('无法找到 JSON 响应', { content: content.substring(0, 100) });
        return {
          extracted: false,
          confidence: 0,
          missingFields: ['keywords', 'region'],
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const result: ExtractedParams = {
        keywords: parsed.keywords || undefined,
        region: parsed.region || undefined,
        types: parsed.types,
        confidence: parsed.confidence || 0.8,
        extracted: !!(parsed.keywords && parsed.region),
        missingFields: [],
        rawResponse: content,
      };

      // 检查缺失字段
      if (!result.keywords) {
        result.missingFields.push('keywords');
      }
      if (!result.region) {
        result.missingFields.push('region');
      }

      return result;
    } catch (error) {
      logger.error('JSON 解析失败:', error, { content: content.substring(0, 100) });
      return {
        extracted: false,
        confidence: 0,
        missingFields: ['keywords', 'region'],
        rawResponse: content,
      };
    }
  }

  /**
   * 将提取的参数转换为 MapSearchParams
   */
  toMapSearchParams(
    params: ExtractedParams,
    pageSize?: number,
    pageNum?: number
  ): MapSearchParams | null {
    if (!params.keywords || !params.region) {
      return null;
    }

    return {
      keywords: params.keywords,
      region: params.region,
      types: params.types,
      pageSize: pageSize || 10,
      pageNum: pageNum || 1,
    };
  }
}

/**
 * 获取全局参数提取器实例
 */
let extractorInstance: ParameterExtractor | null = null;

export function getParameterExtractor(): ParameterExtractor {
  if (!extractorInstance) {
    extractorInstance = new ParameterExtractor();
  }
  return extractorInstance;
}
