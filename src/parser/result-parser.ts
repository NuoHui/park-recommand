/**
 * LLM 结果解析器
 * 从 LLM 响应中提取和转换推荐结果
 */

import logger from '@/utils/logger';
import {
  LLMQueryResponse,
  LLMRecommendationResponse,
  LLMRecommendationItem,
  ParseResult,
  ParseStats,
  RecommendationSortBy,
  RecommendationOptions,
  RecommendationFilter,
} from './types';
import { Recommendation, Location, UserPreference } from '@/types/common';
import { LocationService } from '@/map/service';
import { CacheManager, CacheCategory } from '@/cache';
import { DifficultyLevel, ParkType } from '@/config/constants';

/**
 * 结果解析器
 * 负责从 LLM 响应中解析推荐结果，并与地点数据整合
 */
export class ResultParser {
  private static instance: ResultParser;
  private locationService: LocationService;
  private cacheManager: CacheManager;
  private stats: ParseStats = {
    totalAttempts: 0,
    successCount: 0,
    failureCount: 0,
    averageParseTime: 0,
  };

  private constructor() {
    this.locationService = LocationService.getInstance();
    this.cacheManager = CacheManager.getInstance();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ResultParser {
    if (!ResultParser.instance) {
      ResultParser.instance = new ResultParser();
    }
    return ResultParser.instance;
  }

  /**
   * 解析 LLM 查询响应
   * 从 LLM 生成的查询参数中提取用户偏好
   */
  async parseQueryResponse(
    responseText: string
  ): Promise<ParseResult<LLMQueryResponse>> {
    const startTime = Date.now();
    this.stats.totalAttempts++;

    try {
      logger.debug('解析查询响应', { length: responseText.length });

      // 尝试提取 JSON
      const json = this.extractJSON<LLMQueryResponse>(responseText);

      if (!json) {
        throw new Error('无法从响应中提取 JSON 结构');
      }

      // 验证必需字段
      if (typeof json.should_recommend !== 'boolean') {
        throw new Error('缺少 should_recommend 字段');
      }

      // 标准化字段
      const normalized = this.normalizeQueryResponse(json);

      this.stats.successCount++;
      this.stats.averageParseTime =
        (this.stats.averageParseTime * (this.stats.successCount - 1) +
          (Date.now() - startTime)) /
        this.stats.successCount;

      logger.debug('查询响应解析成功', {
        shouldRecommend: normalized.should_recommend,
        location: normalized.location,
        parkType: normalized.park_type,
      });

      return {
        success: true,
        data: normalized,
        raw: responseText,
      };
    } catch (error) {
      this.stats.failureCount++;
      this.stats.lastError = error instanceof Error ? error.message : String(error);
      this.stats.lastErrorTime = Date.now();

      logger.error('查询响应解析失败', {
        error: this.stats.lastError,
        responseLength: responseText.length,
      });

      return {
        success: false,
        error: this.stats.lastError,
        raw: responseText,
      };
    }
  }

  /**
   * 解析 LLM 推荐响应
   * 从 LLM 生成的推荐列表中提取推荐项
   */
  async parseRecommendationResponse(
    responseText: string
  ): Promise<ParseResult<LLMRecommendationResponse>> {
    const startTime = Date.now();
    this.stats.totalAttempts++;

    try {
      logger.debug('解析推荐响应', { length: responseText.length });

      // 尝试提取 JSON
      const json = this.extractJSON<LLMRecommendationResponse>(responseText);

      if (!json) {
        throw new Error('无法从响应中提取 JSON 结构');
      }

      // 验证推荐列表
      if (!Array.isArray(json.recommendations)) {
        throw new Error('recommendations 不是数组');
      }

      // 标准化推荐项
      const normalized = this.normalizeRecommendationResponse(json);

      this.stats.successCount++;
      this.stats.averageParseTime =
        (this.stats.averageParseTime * (this.stats.successCount - 1) +
          (Date.now() - startTime)) /
        this.stats.successCount;

      logger.debug('推荐响应解析成功', {
        count: normalized.recommendations?.length || 0,
        summary: normalized.summary?.substring(0, 50),
      });

      return {
        success: true,
        data: normalized,
        raw: responseText,
      };
    } catch (error) {
      this.stats.failureCount++;
      this.stats.lastError = error instanceof Error ? error.message : String(error);
      this.stats.lastErrorTime = Date.now();

      logger.error('推荐响应解析失败', {
        error: this.stats.lastError,
        responseLength: responseText.length,
      });

      return {
        success: false,
        error: this.stats.lastError,
        raw: responseText,
      };
    }
  }

  /**
   * 将 LLM 推荐转换为完整的推荐对象
   * 包括整合地点数据、计算距离等
   */
  async convertToRecommendations(
    items: LLMRecommendationItem[],
    preference: UserPreference,
    options?: RecommendationOptions
  ): Promise<Recommendation[]> {
    try {
      logger.debug('转换推荐项', {
        count: items.length,
        options: options,
      });

      // 获取地点详情
      const recommendations: Recommendation[] = [];

      for (const item of items) {
        try {
          // 尝试从缓存获取地点
          const cacheKey = `location:${item.name}`;
          let location = await this.cacheManager.get<Location>(
            cacheKey,
            CacheCategory.LOCATION
          );

          // 如果没有缓存，从地图 API 查询
          if (!location) {
            location = await this.locationService.getLocationDetails(item.name);

            if (location) {
              // 存入缓存
              await this.cacheManager.set(
                cacheKey,
                location,
                7 * 24 * 3600, // 7 天
                CacheCategory.LOCATION
              );
            }
          }

          if (!location) {
            logger.warn(`未找到地点: ${item.name}`);
            continue;
          }

          // 计算距离
          if (preference.latitude && preference.longitude) {
            location.distance = await this.locationService.calculateDistance(
              preference.latitude,
              preference.longitude,
              location.latitude,
              location.longitude
            );
          }

          // 创建推荐对象
          const recommendation: Recommendation = {
            id: this.generateRecommendationId(item.name),
            location,
            reason: item.reason || this.generateDefaultReason(item, location),
            relevanceScore: this.normalizeRelevanceScore(item.relevance_score),
            estimatedTravelTime: item.travel_time,
            directions: this.generateDirections(location, preference),
          };

          recommendations.push(recommendation);
        } catch (error) {
          logger.warn(`处理推荐项失败: ${item.name}`, {
            error: error instanceof Error ? error.message : String(error),
          });
          continue;
        }
      }

      // 应用过滤和排序
      let result = recommendations;

      if (options?.filter) {
        result = this.applyFilter(result, options.filter);
      }

      if (options?.sortBy) {
        result = this.sortRecommendations(result, options.sortBy);
      }

      if (options?.limit) {
        result = result.slice(0, options.limit);
      }

      if (options?.deduplicateByName) {
        result = this.deduplicateByName(result);
      }

      logger.debug('推荐项转换完成', {
        originalCount: items.length,
        finalCount: result.length,
      });

      return result;
    } catch (error) {
      logger.error('推荐项转换失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 批量处理推荐响应
   * 从原始 LLM 响应直接转换为推荐列表
   */
  async processRecommendations(
    responseText: string,
    preference: UserPreference,
    options?: RecommendationOptions
  ): Promise<ParseResult<Recommendation[]>> {
    try {
      // 解析 LLM 响应
      const parseResult = await this.parseRecommendationResponse(responseText);

      if (!parseResult.success || !parseResult.data) {
        return {
          success: false,
          error: parseResult.error || '未知错误',
        };
      }

      // 转换为推荐对象
      const recommendations = await this.convertToRecommendations(
        parseResult.data.recommendations || [],
        preference,
        options
      );

      return {
        success: true,
        data: recommendations,
      };
    } catch (error) {
      logger.error('推荐处理失败', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): ParseStats {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalAttempts: 0,
      successCount: 0,
      failureCount: 0,
      averageParseTime: 0,
    };
  }

  /**
   * 从文本中提取 JSON
   */
  private extractJSON<T>(text: string): T | null {
    try {
      // 尝试直接解析
      return JSON.parse(text);
    } catch {
      // 尝试从代码块中提取
      const codeBlockMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (codeBlockMatch) {
        try {
          return JSON.parse(codeBlockMatch[1]);
        } catch {
          // 继续尝试其他方法
        }
      }

      // 尝试从 { 到 } 提取
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          // 继续
        }
      }

      // 尝试从 [ 到 ] 提取
      const arrayMatch = text.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try {
          return JSON.parse(arrayMatch[0]);
        } catch {
          // 最后的尝试都失败了
        }
      }

      return null;
    }
  }

  /**
   * 标准化查询响应
   */
  private normalizeQueryResponse(response: any): LLMQueryResponse {
    return {
      should_recommend: response.should_recommend ?? false,
      location: response.location?.trim() || undefined,
      park_type: this.normalizeParkType(response.park_type),
      max_distance: this.parseDistance(response.max_distance),
      difficulty: this.normalizeDifficulty(response.difficulty),
      keywords: Array.isArray(response.keywords)
        ? response.keywords.filter((k: any) => typeof k === 'string')
        : undefined,
      reasoning: response.reasoning?.trim() || undefined,
    };
  }

  /**
   * 标准化推荐响应
   */
  private normalizeRecommendationResponse(
    response: any
  ): LLMRecommendationResponse {
    const recommendations = (response.recommendations || [])
      .filter((item: any) => typeof item === 'object' && item !== null)
      .map((item: any) => ({
        name: (item.name || item.title || item.location_name || '').trim(),
        reason: (item.reason || item.why || '').trim() || undefined,
        relevance_score: this.normalizeRelevanceScore(item.relevance_score || item.score),
        travel_time: parseInt(item.travel_time || item.time || '0', 10) || undefined,
        tags: Array.isArray(item.tags)
          ? item.tags.filter((t: any) => typeof t === 'string')
          : undefined,
      }))
      .filter((item: any) => item.name.length > 0);

    return {
      recommendations,
      summary: response.summary?.trim() || undefined,
      stats: response.stats || undefined,
    };
  }

  /**
   * 标准化景点类型
   */
  private normalizeParkType(value: any): string | undefined {
    if (!value) return undefined;

    const normalized = String(value).toLowerCase().trim();

    if (normalized.includes('park')) return ParkType.PARK;
    if (normalized.includes('hiking') || normalized.includes('hike')) return ParkType.HIKING;
    if (normalized.includes('both')) return ParkType.BOTH;

    return undefined;
  }

  /**
   * 标准化难度等级
   */
  private normalizeDifficulty(value: any): string | undefined {
    if (!value) return undefined;

    const normalized = String(value).toLowerCase().trim();

    if (normalized.includes('easy') || normalized.includes('简单')) return DifficultyLevel.EASY;
    if (normalized.includes('medium') || normalized.includes('中等')) return DifficultyLevel.MEDIUM;
    if (normalized.includes('hard') || normalized.includes('困难')) return DifficultyLevel.HARD;

    return undefined;
  }

  /**
   * 标准化相关度分数
   */
  private normalizeRelevanceScore(value: any): number {
    let score = parseFloat(value);

    if (isNaN(score)) return 0.5; // 默认值

    // 确保在 0-1 范围内
    if (score > 1) score = score / 100; // 假设是百分比
    if (score > 1) score = 1;
    if (score < 0) score = 0;

    return Math.round(score * 100) / 100;
  }

  /**
   * 解析距离值
   */
  private parseDistance(value: any): number | undefined {
    if (!value) return undefined;

    let distance = parseFloat(String(value));

    if (isNaN(distance)) return undefined;

    // 如果距离过大，可能是米，转换为公里
    if (distance > 100) distance = distance / 1000;

    return Math.round(distance * 10) / 10;
  }

  /**
   * 生成推荐 ID
   */
  private generateRecommendationId(locationName: string): string {
    return `rec:${Date.now()}:${locationName.substring(0, 10).replace(/\s+/g, '_')}`;
  }

  /**
   * 生成默认推荐理由
   */
  private generateDefaultReason(item: LLMRecommendationItem, location: Location): string {
    const parts: string[] = [];

    if (location.rating) {
      parts.push(`评分 ${location.rating.toFixed(1)} 分`);
    }

    if (location.tags && location.tags.length > 0) {
      parts.push(`${location.tags.slice(0, 2).join('、')}`);
    }

    if (!parts.length) {
      parts.push('当地热门景点');
    }

    return parts.join(' · ');
  }

  /**
   * 生成方向/路线说明
   */
  private generateDirections(location: Location, preference: UserPreference): string | undefined {
    if (!location.distance || !preference.location) {
      return undefined;
    }

    const directions: string[] = [];

    directions.push(`从 ${preference.location} 出发`);

    if (location.distance < 1) {
      directions.push(`步行 ${Math.round(location.distance * 1000)} 米即可到达`);
    } else if (location.distance < 5) {
      directions.push(`驾车约 ${Math.round(location.distance * 20)} 分钟`);
    } else {
      directions.push(`驾车约 ${Math.round(location.distance * 10)} 分钟`);
    }

    if (location.address) {
      directions.push(`目标地址: ${location.address}`);
    }

    return directions.join(' · ');
  }

  /**
   * 应用过滤条件
   */
  private applyFilter(
    recommendations: Recommendation[],
    filter: RecommendationFilter
  ): Recommendation[] {
    return recommendations.filter((rec) => {
      // 最小相关度
      if (
        filter.minRelevance !== undefined &&
        rec.relevanceScore < filter.minRelevance
      ) {
        return false;
      }

      // 最大距离
      if (
        filter.maxDistance !== undefined &&
        rec.location.distance !== undefined &&
        rec.location.distance > filter.maxDistance
      ) {
        return false;
      }

      // 最小评分
      if (
        filter.minRating !== undefined &&
        (!rec.location.rating || rec.location.rating < filter.minRating)
      ) {
        return false;
      }

      // 排除标签
      if (filter.excludeTags && filter.excludeTags.length > 0) {
        const tags = rec.location.tags || [];
        if (filter.excludeTags.some((tag) => tags.includes(tag))) {
          return false;
        }
      }

      // 包含标签
      if (filter.includeTags && filter.includeTags.length > 0) {
        const tags = rec.location.tags || [];
        if (!filter.includeTags.some((tag) => tags.includes(tag))) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 排序推荐
   */
  private sortRecommendations(
    recommendations: Recommendation[],
    sortBy: RecommendationSortBy
  ): Recommendation[] {
    const sorted = [...recommendations];

    switch (sortBy) {
      case RecommendationSortBy.RELEVANCE:
        sorted.sort((a, b) => b.relevanceScore - a.relevanceScore);
        break;

      case RecommendationSortBy.DISTANCE:
        sorted.sort((a, b) => {
          const distA = a.location.distance ?? Number.MAX_VALUE;
          const distB = b.location.distance ?? Number.MAX_VALUE;
          return distA - distB;
        });
        break;

      case RecommendationSortBy.RATING:
        sorted.sort((a, b) => {
          const ratingA = a.location.rating ?? 0;
          const ratingB = b.location.rating ?? 0;
          return ratingB - ratingA;
        });
        break;

      case RecommendationSortBy.TRAVEL_TIME:
        sorted.sort((a, b) => {
          const timeA = a.estimatedTravelTime ?? Number.MAX_VALUE;
          const timeB = b.estimatedTravelTime ?? Number.MAX_VALUE;
          return timeA - timeB;
        });
        break;

      case RecommendationSortBy.POPULARITY:
        sorted.sort((a, b) => {
          const tagsA = a.location.tags?.includes('热门') ? 1 : 0;
          const tagsB = b.location.tags?.includes('热门') ? 1 : 0;
          return tagsB - tagsA;
        });
        break;
    }

    return sorted;
  }

  /**
   * 按名称去重
   */
  private deduplicateByName(recommendations: Recommendation[]): Recommendation[] {
    const seen = new Set<string>();
    return recommendations.filter((rec) => {
      const name = rec.location.name.toLowerCase();
      if (seen.has(name)) {
        return false;
      }
      seen.add(name);
      return true;
    });
  }
}

/**
 * 创建结果解析器单例
 */
export function getResultParser(): ResultParser {
  return ResultParser.getInstance();
}
