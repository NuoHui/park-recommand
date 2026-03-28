import { Location, Recommendation } from '@/types/common';
import logger from '@/utils/logger';

/**
 * 去重模块 - 处理缓存数据的去重
 */
export class Deduplicator {
  /**
   * 地点数据去重
   * 基于坐标相近度和名称相似度判重
   */
  static deduplicateLocations(
    locations: Location[],
    strategy: 'keep_first' | 'keep_latest' = 'keep_first'
  ): Location[] {
    if (locations.length <= 1) return locations;

    const deduped: Location[] = [];
    const seen = new Set<string>();

    for (const location of locations) {
      // 生成去重键：使用名称 + 坐标作为唯一标识
      const key = this.generateLocationKey(location);

      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(location);
      }
    }

    logger.debug(`地点去重: ${locations.length} → ${deduped.length} 个唯一地点`);
    return deduped;
  }

  /**
   * 推荐结果去重
   */
  static deduplicateRecommendations(
    recommendations: Recommendation[]
  ): Recommendation[] {
    if (recommendations.length <= 1) return recommendations;

    const deduped: Recommendation[] = [];
    const seen = new Set<string>();

    for (const rec of recommendations) {
      // 基于地点信息去重
      const key = this.generateLocationKey(rec.location);

      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(rec);
      }
    }

    logger.debug(`推荐去重: ${recommendations.length} → ${deduped.length} 个唯一推荐`);
    return deduped;
  }

  /**
   * 距离查询去重
   * 基于坐标对去重
   */
  static deduplicateDistanceQueries(
    queries: Array<{ from: [number, number]; to: [number, number]; result: number }>
  ): Array<{ from: [number, number]; to: [number, number]; result: number }> {
    if (queries.length <= 1) return queries;

    const deduped: Array<{ from: [number, number]; to: [number, number]; result: number }> =
      [];
    const seen = new Set<string>();

    for (const query of queries) {
      // 双向去重（A->B 等同于 B->A）
      const key1 = `${query.from[0]},${query.from[1]}_${query.to[0]},${query.to[1]}`;
      const key2 = `${query.to[0]},${query.to[1]}_${query.from[0]},${query.from[1]}`;

      if (!seen.has(key1) && !seen.has(key2)) {
        seen.add(key1);
        deduped.push(query);
      }
    }

    logger.debug(`距离查询去重: ${queries.length} → ${deduped.length} 个唯一查询`);
    return deduped;
  }

  /**
   * 生成地点的唯一键
   * 考虑坐标精度和名称匹配
   */
  private static generateLocationKey(location: Location): string {
    // 使用 3 位小数精度（约 100 米）来判断坐标是否相同
    const latPrecision = Math.round(location.latitude * 1000) / 1000;
    const lonPrecision = Math.round(location.longitude * 1000) / 1000;

    // 规范化名称（去除空格和特殊字符）
    const normalizedName = location.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '')
      .replace(/[^\w\u4e00-\u9fff]/g, '');

    return `${normalizedName}_${latPrecision}_${lonPrecision}`;
  }

  /**
   * 合并地点数据
   * 当发现重复地点时，合并信息
   */
  static mergeLocations(locations: Location[]): Location[] {
    if (locations.length <= 1) return locations;

    const map = new Map<string, Location>();

    for (const location of locations) {
      const key = this.generateLocationKey(location);
      const existing = map.get(key);

      if (existing) {
        // 合并信息：优先使用非空值
        map.set(key, {
          ...existing,
          address: location.address || existing.address,
          rating: location.rating !== undefined ? location.rating : existing.rating,
          difficulty: location.difficulty || existing.difficulty,
          description: location.description || existing.description,
          tags: [...new Set([...(existing.tags || []), ...(location.tags || [])])],
          visitDuration: location.visitDuration || existing.visitDuration,
          openingHours: location.openingHours || existing.openingHours,
          phone: location.phone || existing.phone,
          website: location.website || existing.website,
          // 保持最小距离
          distance:
            existing.distance && location.distance
              ? Math.min(existing.distance, location.distance)
              : location.distance || existing.distance,
        });
      } else {
        map.set(key, location);
      }
    }

    const merged = Array.from(map.values());
    logger.debug(`地点合并: ${locations.length} → ${merged.length} 个地点`);
    return merged;
  }

  /**
   * 去除重复的查询参数
   */
  static deduplicateParams(
    params: Record<string, any>[]
  ): Record<string, any>[] {
    const seen = new Set<string>();
    const deduped = [];

    for (const param of params) {
      const key = JSON.stringify(param);
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(param);
      }
    }

    return deduped;
  }

  /**
   * 检测两个坐标是否相近
   */
  static areCoordinatesClose(
    coord1: [number, number],
    coord2: [number, number],
    tolerance: number = 0.001 // 约 100 米
  ): boolean {
    const [lat1, lon1] = coord1;
    const [lat2, lon2] = coord2;

    return Math.abs(lat1 - lat2) < tolerance && Math.abs(lon1 - lon2) < tolerance;
  }

  /**
   * 检测两个字符串的相似度（使用 Levenshtein 距离）
   */
  static calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1 === s2) return 1;

    const len1 = s1.length;
    const len2 = s2.length;

    if (len1 === 0 || len2 === 0) return 0;

    const matrix: number[][] = Array(len2 + 1)
      .fill(null)
      .map(() => Array(len1 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        if (s1[i - 1] === s2[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i - 1] + 1,
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1
          );
        }
      }
    }

    const distance = matrix[len2][len1];
    const maxLen = Math.max(len1, len2);

    return 1 - distance / maxLen;
  }
}
