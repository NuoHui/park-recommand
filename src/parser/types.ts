/**
 * 结果解析器类型定义
 */

import { Recommendation, Location, UserPreference } from '@/types/common';

/**
 * LLM 推荐项
 */
export interface LLMRecommendationItem {
  name: string;
  reason?: string;
  relevance_score?: number;
  travel_time?: number;
  tags?: string[];
}

/**
 * LLM 搜索参数响应
 */
export interface LLMQueryResponse {
  should_recommend: boolean;
  location?: string;
  park_type?: string;
  max_distance?: number;
  difficulty?: string;
  keywords?: string[];
  reasoning?: string;
}

/**
 * LLM 推荐响应
 */
export interface LLMRecommendationResponse {
  recommendations?: LLMRecommendationItem[];
  summary?: string;
  stats?: {
    total: number;
    high_priority: number;
  };
}

/**
 * 解析结果
 */
export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  raw?: string; // 原始响应文本
}

/**
 * 解析统计信息
 */
export interface ParseStats {
  totalAttempts: number;
  successCount: number;
  failureCount: number;
  averageParseTime: number; // 毫秒
  lastError?: string;
  lastErrorTime?: number;
}

/**
 * 推荐排序选项
 */
export enum RecommendationSortBy {
  RELEVANCE = 'relevance',
  DISTANCE = 'distance',
  RATING = 'rating',
  TRAVEL_TIME = 'travel_time',
  POPULARITY = 'popularity',
}

/**
 * 推荐过滤选项
 */
export interface RecommendationFilter {
  minRelevance?: number;
  maxDistance?: number;
  minRating?: number;
  excludeTags?: string[];
  includeTags?: string[];
}

/**
 * 推荐优化选项
 */
export interface RecommendationOptions {
  sortBy?: RecommendationSortBy;
  filter?: RecommendationFilter;
  limit?: number;
  deduplicateByName?: boolean;
  enrichWithLocationData?: boolean;
}
