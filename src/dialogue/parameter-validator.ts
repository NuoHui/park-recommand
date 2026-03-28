/**
 * 参数验证器
 * 检查参数完整性，判断是否可以调用高德 API
 */

import { MapSearchParams } from '@/types/map';
import { ExtractedParams } from './parameter-extractor';
import { createLogger } from '@/utils/logger';

const logger = createLogger('dialogue:parameter-validator');

export interface ValidationResult {
  isValid: boolean; // 参数是否完整
  missingFields: string[]; // 缺失的字段
  prompts: string[]; // 对缺失字段的追问文案
  reason?: string; // 验证失败的原因
}

/**
 * 参数验证器类
 */
export class ParameterValidator {
  private static readonly REQUIRED_FIELDS = ['keywords', 'region'];

  /**
   * 验证参数是否可以调用高德 API
   */
  validateForMapQuery(params: Partial<MapSearchParams>): ValidationResult {
    const missingFields: string[] = [];
    const prompts: string[] = [];

    logger.debug('开始参数验证', { params });

    // 检查必需字段
    if (!params.keywords) {
      missingFields.push('keywords');
      prompts.push(
        '[?] 你想搜索什么？(例如：公园、景区、山、登山路线、公园等)'
      );
    }

    if (!params.region) {
      missingFields.push('region');
      prompts.push('[?] 你在哪个城市或地区？(例如：深圳、北京朝阳、浙江杭州等)');
    }

    const isValid = missingFields.length === 0;

    const result: ValidationResult = {
      isValid,
      missingFields,
      prompts,
    };

    if (!isValid) {
      result.reason = `缺失必需参数: ${missingFields.join(', ')}`;
      logger.info('参数验证失败', result);
    } else {
      logger.info('参数验证通过', { keywords: params.keywords, region: params.region });
    }

    return result;
  }

  /**
   * 从用户补充输入中更新参数
   * 自动识别用户输入的类型（keywords 或 region）
   */
  updateFromUserInput(
    currentParams: Partial<MapSearchParams>,
    userInput: string,
    missingFields: string[]
  ): Partial<MapSearchParams> {
    const updated = { ...currentParams };
    const input = userInput.trim();

    logger.debug('从用户输入更新参数', { userInput: input, missingFields });

    // 如果只缺少一个字段，直接赋值
    if (missingFields.length === 1) {
      const field = missingFields[0];
      if (field === 'keywords') {
        updated.keywords = input;
      } else if (field === 'region') {
        updated.region = input;
      }
    } else if (missingFields.length === 2) {
      // 如果缺少两个字段，尝试智能判断
      // 如果输入看起来像是地区名称（包含"市"、"区"、"县"等），认为是 region
      if (this.looksLikeRegion(input)) {
        updated.region = input;
      } else {
        // 否则当作 keywords
        updated.keywords = input;
      }
    }

    logger.debug('参数更新完成', { updated });
    return updated;
  }

  /**
   * 判断输入是否像是地区名称
   */
  private looksLikeRegion(input: string): boolean {
    const regionKeywords = ['市', '区', '县', '州', '省', '城', '乡', '镇', '街', '路'];
    return regionKeywords.some((kw) => input.includes(kw));
  }

  /**
   * 获取友好的字段名称
   */
  static getFieldDisplayName(field: string): string {
    const displayNames: Record<string, string> = {
      keywords: '搜索内容',
      region: '地区',
      types: '地点类型',
      pageSize: '每页数量',
      pageNum: '分页',
    };
    return displayNames[field] || field;
  }
}

/**
 * 获取全局参数验证器实例
 */
let validatorInstance: ParameterValidator | null = null;

export function getParameterValidator(): ParameterValidator {
  if (!validatorInstance) {
    validatorInstance = new ParameterValidator();
  }
  return validatorInstance;
}
