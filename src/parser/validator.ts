/**
 * 推荐结果验证器
 * 验证推荐结果的有效性和质量
 */

import logger from '@/utils/logger';
import { Recommendation, Location, UserPreference } from '@/types/common';
import { LLMRecommendationItem, LLMQueryResponse } from './types';

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  warnings: string[];
  suggestions: string[];
}

/**
 * 验证问题
 */
export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  value?: any;
}

/**
 * 推荐验证器
 */
export class RecommendationValidator {
  /**
   * 验证查询响应
   */
  static validateQueryResponse(response: LLMQueryResponse): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // 检查 should_recommend
    if (typeof response.should_recommend !== 'boolean') {
      issues.push({
        severity: 'error',
        field: 'should_recommend',
        message: '应为布尔值',
        value: response.should_recommend,
      });
      score -= 20;
    }

    // 如果不应该推荐，警告
    if (!response.should_recommend) {
      warnings.push('LLM 判断不应该推荐，可能信息不足');
    }

    // 检查位置
    if (!response.location) {
      warnings.push('未指定搜索位置');
      score -= 10;
    } else if (response.location.length > 100) {
      issues.push({
        severity: 'warning',
        field: 'location',
        message: '位置信息过长',
        value: response.location.substring(0, 50),
      });
      score -= 5;
    }

    // 检查距离
    if (response.max_distance !== undefined) {
      if (response.max_distance <= 0 || response.max_distance > 100) {
        issues.push({
          severity: 'warning',
          field: 'max_distance',
          message: '距离范围不合理',
          value: response.max_distance,
        });
        score -= 5;
      }
    } else {
      suggestions.push('建议指定最大距离范围');
    }

    // 检查关键词
    if (response.keywords && response.keywords.length === 0) {
      warnings.push('关键词列表为空');
      score -= 5;
    }

    return {
      valid: issues.filter((i) => i.severity === 'error').length === 0,
      score: Math.max(0, score),
      issues,
      warnings,
      suggestions,
    };
  }

  /**
   * 验证推荐项
   */
  static validateRecommendationItem(
    item: LLMRecommendationItem,
    index: number
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // 检查名称
    if (!item.name || item.name.trim().length === 0) {
      issues.push({
        severity: 'error',
        field: `recommendations[${index}].name`,
        message: '地点名称为空',
      });
      score -= 30;
    } else if (item.name.length > 100) {
      warnings.push(`推荐项 ${index}: 地点名称过长`);
      score -= 5;
    }

    // 检查相关度
    if (item.relevance_score !== undefined) {
      if (typeof item.relevance_score !== 'number') {
        issues.push({
          severity: 'warning',
          field: `recommendations[${index}].relevance_score`,
          message: '相关度应为数字',
          value: item.relevance_score,
        });
        score -= 10;
      } else if (item.relevance_score < 0 || item.relevance_score > 1) {
        if (item.relevance_score <= 100) {
          suggestions.push(
            `推荐项 ${index}: 相关度值似乎为百分比，应标准化为 0-1`
          );
        } else {
          warnings.push(`推荐项 ${index}: 相关度值不在合理范围`);
          score -= 10;
        }
      }
    } else {
      suggestions.push(`推荐项 ${index}: 建议提供相关度分数`);
    }

    // 检查推荐理由
    if (!item.reason || item.reason.trim().length === 0) {
      warnings.push(`推荐项 ${index}: 缺少推荐理由`);
      score -= 10;
    } else if (item.reason.length > 200) {
      warnings.push(`推荐项 ${index}: 推荐理由过长`);
      score -= 5;
    }

    // 检查旅行时间
    if (item.travel_time !== undefined) {
      if (typeof item.travel_time !== 'number' || item.travel_time < 0) {
        warnings.push(`推荐项 ${index}: 旅行时间格式不正确`);
        score -= 5;
      } else if (item.travel_time > 1000) {
        warnings.push(`推荐项 ${index}: 旅行时间过长（> 1000 分钟）`);
        score -= 5;
      }
    }

    return {
      valid: issues.filter((i) => i.severity === 'error').length === 0,
      score: Math.max(0, score),
      issues,
      warnings,
      suggestions,
    };
  }

  /**
   * 验证完整的推荐列表
   */
  static validateRecommendations(
    recommendations: Recommendation[],
    preference: UserPreference
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // 检查推荐列表长度
    if (recommendations.length === 0) {
      issues.push({
        severity: 'error',
        field: 'recommendations',
        message: '推荐列表为空',
      });
      score -= 50;
    } else if (recommendations.length > 10) {
      warnings.push('推荐项过多，用户可能难以选择');
      score -= 10;
    } else if (recommendations.length < 3) {
      suggestions.push('建议提供至少 3 个推荐');
      score -= 10;
    }

    // 验证每一项
    let validItems = 0;
    recommendations.forEach((rec, index) => {
      const itemValidation = this.validateLocation(rec.location, index);
      if (itemValidation.valid) {
        validItems++;
      }
      issues.push(...itemValidation.issues);
      warnings.push(...itemValidation.warnings);

      // 检查相关度
      if (rec.relevanceScore < 0.5) {
        warnings.push(
          `推荐项 ${index}: 相关度较低 (${rec.relevanceScore.toFixed(2)})`
        );
      }
    });

    if (validItems === 0) {
      issues.push({
        severity: 'error',
        field: 'recommendations',
        message: '没有有效的推荐项',
      });
      score = 0;
    } else {
      const validRatio = validItems / recommendations.length;
      if (validRatio < 0.8) {
        score -= (1 - validRatio) * 30;
      }
    }

    // 检查多样性
    const names = new Set(recommendations.map((r) => r.location.name));
    if (names.size < recommendations.length) {
      warnings.push('推荐列表中有重复的地点');
      score -= 10;
    }

    // 检查与用户偏好的匹配度
    if (preference.maxDistance) {
      const outOfRangeCount = recommendations.filter(
        (r) =>
          r.location.distance &&
          r.location.distance > preference.maxDistance!
      ).length;

      if (outOfRangeCount > 0) {
        warnings.push(
          `有 ${outOfRangeCount} 个推荐超出用户指定的距离范围`
        );
        score -= outOfRangeCount * 5;
      }
    }

    return {
      valid: issues.filter((i) => i.severity === 'error').length === 0,
      score: Math.max(0, score),
      issues,
      warnings,
      suggestions,
    };
  }

  /**
   * 验证地点
   */
  private static validateLocation(
    location: Location,
    index: number
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // 检查名称
    if (!location.name || location.name.trim().length === 0) {
      issues.push({
        severity: 'error',
        field: `location[${index}].name`,
        message: '地点名称为空',
      });
      score -= 30;
    }

    // 检查坐标
    if (
      typeof location.latitude !== 'number' ||
      typeof location.longitude !== 'number'
    ) {
      issues.push({
        severity: 'error',
        field: `location[${index}].coordinates`,
        message: '地点坐标无效',
      });
      score -= 30;
    } else {
      // 验证深圳坐标范围（大约）
      if (
        location.latitude < 22 ||
        location.latitude > 23 ||
        location.longitude < 113.7 ||
        location.longitude > 114.5
      ) {
        warnings.push(
          `地点 ${index}: 坐标可能超出深圳范围`
        );
        score -= 15;
      }
    }

    // 检查距离
    if (location.distance !== undefined) {
      if (location.distance < 0 || location.distance > 200) {
        warnings.push(`地点 ${index}: 距离值不合理`);
        score -= 10;
      }
    }

    // 检查评分
    if (location.rating !== undefined) {
      if (typeof location.rating !== 'number' || location.rating < 0 || location.rating > 5) {
        warnings.push(`地点 ${index}: 评分不在 0-5 范围内`);
        score -= 5;
      }
    }

    return {
      valid: issues.filter((i) => i.severity === 'error').length === 0,
      score: Math.max(0, score),
      issues,
      warnings,
      suggestions,
    };
  }

  /**
   * 生成验证报告
   */
  static generateReport(result: ValidationResult): string {
    const lines: string[] = [];

    lines.push(`\n验证结果: ${result.valid ? '✓ 通过' : '✗ 失败'}`);
    lines.push(`质量评分: ${result.score}/100`);

    if (result.issues.length > 0) {
      lines.push('\n问题:');
      result.issues.forEach((issue) => {
        const icon = issue.severity === 'error' ? '✗' : '⚠';
        lines.push(`  ${icon} [${issue.field}] ${issue.message}`);
        if (issue.value !== undefined) {
          lines.push(`    值: ${JSON.stringify(issue.value)}`);
        }
      });
    }

    if (result.warnings.length > 0) {
      lines.push('\n警告:');
      result.warnings.forEach((warning) => {
        lines.push(`  ⚠ ${warning}`);
      });
    }

    if (result.suggestions.length > 0) {
      lines.push('\n建议:');
      result.suggestions.forEach((suggestion) => {
        lines.push(`  💡 ${suggestion}`);
      });
    }

    return lines.join('\n');
  }
}

/**
 * 快速验证函数
 */
export function validateRecommendations(
  recommendations: Recommendation[],
  preference: UserPreference
): ValidationResult {
  return RecommendationValidator.validateRecommendations(recommendations, preference);
}

export function validateQueryResponse(response: LLMQueryResponse): ValidationResult {
  return RecommendationValidator.validateQueryResponse(response);
}
