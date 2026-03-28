/**
 * 意图验证器
 * 验证用户意图的安全性和合法性
 */

import { createLogger } from '@/utils/logger';
import { ExecutionContext, IntentValidationResult, RiskScore } from '@/types/harness';
import { RiskScorer } from './risk-scorer';

const logger = createLogger('harness:intent-validator');

/**
 * 意图验证器
 */
export class IntentValidator {
  private riskScorer: RiskScorer;
  private blacklistedKeywords: Set<string> = new Set([
    'drop',
    'truncate',
    'delete from',
    'rm -rf',
    'format',
    'wipe',
  ]);

  constructor() {
    this.riskScorer = new RiskScorer();
  }

  /**
   * 验证用户意图
   */
  async validate(context: ExecutionContext, toolName: string): Promise<IntentValidationResult> {
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    // 1. 检查输入安全性
    const inputCheckResult = this.checkInputSafety(context);
    if (!inputCheckResult.safe) {
      validationErrors.push(...(inputCheckResult.errors || []));
      validationWarnings.push(...(inputCheckResult.warnings || []));
    }

    // 2. 分类意图（基于工具名称和参数）
    const intentType = this.classifyIntent(context.toolArgs, toolName);

    // 3. 检查权限
    const permissionGranted = this.checkPermission(intentType, toolName);
    if (!permissionGranted) {
      validationErrors.push(`权限拒绝: ${intentType} 不允许调用 ${toolName}`);
    }

    // 4. 评估风险
    const riskScore = this.riskScorer.assessRisk(context, toolName);

    const valid =
      validationErrors.length === 0 &&
      inputCheckResult.safe &&
      permissionGranted;

    logger.debug('意图验证完成', {
      executionId: context.executionId,
      valid,
      intentType,
      permissionGranted,
      riskLevel: riskScore.level,
      errors: validationErrors,
      warnings: validationWarnings,
    });

    return {
      valid,
      intentType,
      permissionGranted,
      riskScore,
      errors: validationErrors.length > 0 ? validationErrors : undefined,
      warnings: validationWarnings.length > 0 ? validationWarnings : undefined,
    };
  }

  /**
   * 检查输入安全性
   */
  private checkInputSafety(context: ExecutionContext): {
    safe: boolean;
    errors?: string[];
    warnings?: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. 检查参数是否为空
    if (!context.toolArgs || typeof context.toolArgs !== 'object') {
      errors.push('工具参数不能为空或非对象类型');
      return { safe: false, errors };
    }

    // 2. 检查是否包含黑名单关键词
    const paramsStr = JSON.stringify(context.toolArgs).toLowerCase();
    for (const keyword of this.blacklistedKeywords) {
      if (paramsStr.includes(keyword)) {
        errors.push(`检测到禁止操作关键词: ${keyword}`);
      }
    }

    // 3. 检查是否包含注入攻击的迹象
    if (this.containsInjectionAttempt(paramsStr)) {
      warnings.push('检测到可能的注入攻击迹象，建议仔细审查');
    }

    // 4. 检查超大参数
    const paramSize = JSON.stringify(context.toolArgs).length;
    if (paramSize > 5 * 1024 * 1024) {
      errors.push(`参数过大 (${(paramSize / 1024 / 1024).toFixed(2)}MB)，超过限制`);
    } else if (paramSize > 1024 * 1024) {
      warnings.push(`参数较大 (${(paramSize / 1024 / 1024).toFixed(2)}MB)，可能影响性能`);
    }

    return {
      safe: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * 检查是否包含注入攻击的迹象
   */
  private containsInjectionAttempt(input: string): boolean {
    const injectionPatterns = [
      /[\';\"]\s*or\s*[\';\"]/i, // SQL 注入迹象
      /\${.*}/i, // 模板注入迹象
      /\$\(.*\)/i, // 命令注入迹象
      /`.*`/i, // 反引号注入迹象
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(input)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 分类意图
   */
  private classifyIntent(
    toolArgs: Record<string, any>,
    toolName?: string
  ): IntentValidationResult['intentType'] {
    // 如果工具名称表明这是一个推荐或提取操作，优先使用工具名称来推断意图
    if (toolName) {
      if (/extract.*parameters|recommend|process.*recommend/.test(toolName)) {
        return 'recommendation';
      }
      if (/search|query|lookup/.test(toolName)) {
        return 'query';
      }
      if (/update|modify|patch/.test(toolName)) {
        return 'update';
      }
      if (/delete|remove|drop/.test(toolName)) {
        return 'delete';
      }
    }

    // 提取参数值中的文本（不仅是整个字符串）
    const paramValues: string[] = [];
    for (const value of Object.values(toolArgs)) {
      if (typeof value === 'string') {
        paramValues.push(value.toLowerCase());
      }
    }
    const argsStr = paramValues.join(' ').toLowerCase();

    // 检查删除操作（优先级最高，因为风险最大）
    if (
      /\b(delete|remove|drop)\b/i.test(argsStr) ||
      /删除|移除|清空/.test(argsStr)
    ) {
      return 'delete';
    }

    // 检查修改操作
    // 只在有明确的修改关键词时分类为 update（排除中文误匹配）
    if (
      /\b(modify|update|change|put|patch)\b/i.test(argsStr) &&
      !/extract|validate|query|search|recommend/.test(argsStr)
    ) {
      return 'update';
    }

    // 检查推荐操作
    if (
      /\b(recommend|suggestion|suggest|recommend)\b/i.test(argsStr) ||
      /推荐|建议|登山|爬山|hiking|park|poi|景点/.test(argsStr)
    ) {
      return 'recommendation';
    }

    // 检查查询操作
    if (
      /\b(query|search|get|find|extract|lookup)\b/i.test(argsStr) ||
      /查询|搜索|查找|获取/.test(argsStr)
    ) {
      return 'query';
    }

    return 'unknown';
  }

  /**
   * 检查权限
   */
  private checkPermission(intentType: string, toolName: string): boolean {
    // 定义每种意图允许的工具（支持精确名称和前缀匹配）
    const permissionMatrix: Record<string, (string | RegExp)[]> = {
      recommendation: [
        'llm-client',
        'amap-client',
        'cache-manager',
        'request-queue',
        /^extract.*/i, // 参数提取工具
        /.*recommend.*/i, // 推荐工具
        /process.*/i, // LLM处理工具
      ],
      query: [
        'llm-client',
        'amap-client',
        'cache-manager',
        'request-queue',
        /^extract.*/i, // 参数提取工具
        /^search.*/i, // 搜索工具
        /.*search.*/i, // POI搜索
      ],
      update: [
        'cache-manager',
        'request-queue',
        /^update.*/i, // 更新工具
      ],
      delete: [], // 暂不允许删除操作
      unknown: [
        'cache-manager',
        'request-queue',
      ],
    };

    const allowedPatterns = permissionMatrix[intentType] || [];
    
    // 检查精确匹配和前缀匹配
    for (const pattern of allowedPatterns) {
      if (pattern instanceof RegExp) {
        if (pattern.test(toolName)) {
          return true;
        }
      } else if (pattern === toolName) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 添加黑名单关键词
   */
  addBlacklistedKeyword(keyword: string): void {
    this.blacklistedKeywords.add(keyword.toLowerCase());
  }

  /**
   * 移除黑名单关键词
   */
  removeBlacklistedKeyword(keyword: string): void {
    this.blacklistedKeywords.delete(keyword.toLowerCase());
  }

  /**
   * 获取所有黑名单关键词
   */
  getBlacklistedKeywords(): string[] {
    return Array.from(this.blacklistedKeywords);
  }

  /**
   * 获取风险建议
   */
  getRiskRecommendation(riskScore: RiskScore): string {
    return this.riskScorer.getRiskRecommendation(riskScore);
  }
}
