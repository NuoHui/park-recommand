/**
 * Harness 约束配置
 * 定义工具白名单、资源限制、行为约束等
 */

import {
  HarnessConstraints,
  ToolConstraints,
  ResourceConstraints,
  BehaviorConstraints,
} from '@/types/harness';

/**
 * 默认的工具约束
 */
export const DEFAULT_TOOL_CONSTRAINTS: ToolConstraints = {
  // 公园推荐系统的允许工具
  allowedTools: ['llm-client', 'amap-client', 'cache-manager', 'request-queue'],
  blockedTools: [],
  // 各工具的超时时间
  toolTimeouts: {
    'llm-client': 30000, // LLM 调用 30 秒超时
    'amap-client': 5000, // 地图 API 5 秒超时
    'cache-manager': 1000, // 缓存 1 秒超时
    'request-queue': 60000, // 队列处理 60 秒超时
  },
};

/**
 * 默认的资源约束
 */
export const DEFAULT_RESOURCE_CONSTRAINTS: ResourceConstraints = {
  // API 频率限制
  maxAPICallsPerMinute: 60, // 每分钟最多 60 次调用
  // Token 限制
  maxTokensPerRequest: 4000, // 单次请求最多 4000 token
  maxTokensPerSession: 32000, // 单个会话最多 32000 token
  globalTokenBudget: 100000, // 全局 Token 预算 100000
  // 并发控制
  maxConcurrentTasks: 5, // 最多 5 个并发任务
  // 重试策略
  maxRetries: 2, // 最多重试 2 次
};

/**
 * 默认的行为约束
 */
export const DEFAULT_BEHAVIOR_CONSTRAINTS: BehaviorConstraints = {
  // 允许的操作类型
  allowedActions: ['search', 'recommend', 'query', 'cache'],
  // 需要审批的操作（目前暂无）
  requiredApprovals: [],
  // 风险阈值
  riskThreshold: 60, // 风险分数 >= 60 需要审批
  // 级联调用
  allowChainedCalls: true,
  maxCallDepth: 3, // 最大级联深度 3 层
};

/**
 * 默认的完整 Harness 约束配置
 */
export const DEFAULT_HARNESS_CONSTRAINTS: HarnessConstraints = {
  toolConstraints: DEFAULT_TOOL_CONSTRAINTS,
  resourceConstraints: DEFAULT_RESOURCE_CONSTRAINTS,
  behaviorConstraints: DEFAULT_BEHAVIOR_CONSTRAINTS,
};

/**
 * 约束配置加载器
 */
export class ConstraintConfigLoader {
  private constraints: HarnessConstraints;

  constructor(baseConstraints: HarnessConstraints = DEFAULT_HARNESS_CONSTRAINTS) {
    this.constraints = JSON.parse(JSON.stringify(baseConstraints)); // 深拷贝
  }

  /**
   * 获取完整的约束配置
   */
  getConstraints(): HarnessConstraints {
    return this.constraints;
  }

  /**
   * 获取工具约束
   */
  getToolConstraints(): ToolConstraints {
    return this.constraints.toolConstraints;
  }

  /**
   * 获取资源约束
   */
  getResourceConstraints(): ResourceConstraints {
    return this.constraints.resourceConstraints;
  }

  /**
   * 获取行为约束
   */
  getBehaviorConstraints(): BehaviorConstraints {
    return this.constraints.behaviorConstraints;
  }

  /**
   * 检查工具是否在白名单中
   */
  isToolAllowed(toolName: string): boolean {
    const { allowedTools, blockedTools } = this.constraints.toolConstraints;
    return allowedTools.includes(toolName) && !blockedTools.includes(toolName);
  }

  /**
   * 获取工具的超时时间
   */
  getToolTimeout(toolName: string): number {
    const timeout = this.constraints.toolConstraints.toolTimeouts[toolName];
    return timeout || 30000; // 默认 30 秒
  }

  /**
   * 更新工具超时时间
   */
  setToolTimeout(toolName: string, timeout: number): void {
    this.constraints.toolConstraints.toolTimeouts[toolName] = timeout;
  }

  /**
   * 添加工具到白名单
   */
  allowTool(toolName: string): void {
    if (!this.constraints.toolConstraints.allowedTools.includes(toolName)) {
      this.constraints.toolConstraints.allowedTools.push(toolName);
    }
    // 如果在黑名单中，移除
    const blockedIndex = this.constraints.toolConstraints.blockedTools.indexOf(toolName);
    if (blockedIndex > -1) {
      this.constraints.toolConstraints.blockedTools.splice(blockedIndex, 1);
    }
  }

  /**
   * 阻止工具
   */
  blockTool(toolName: string): void {
    if (!this.constraints.toolConstraints.blockedTools.includes(toolName)) {
      this.constraints.toolConstraints.blockedTools.push(toolName);
    }
    // 如果在白名单中，移除
    const allowedIndex = this.constraints.toolConstraints.allowedTools.indexOf(toolName);
    if (allowedIndex > -1) {
      this.constraints.toolConstraints.allowedTools.splice(allowedIndex, 1);
    }
  }

  /**
   * 更新 API 频率限制
   */
  setMaxAPICallsPerMinute(limit: number): void {
    this.constraints.resourceConstraints.maxAPICallsPerMinute = limit;
  }

  /**
   * 更新 Token 限制
   */
  setTokenLimits(perRequest: number, perSession: number, globalBudget: number): void {
    this.constraints.resourceConstraints.maxTokensPerRequest = perRequest;
    this.constraints.resourceConstraints.maxTokensPerSession = perSession;
    this.constraints.resourceConstraints.globalTokenBudget = globalBudget;
  }

  /**
   * 更新并发限制
   */
  setMaxConcurrentTasks(limit: number): void {
    this.constraints.resourceConstraints.maxConcurrentTasks = limit;
  }

  /**
   * 从环境变量加载约束（可选扩展）
   */
  loadFromEnv(): void {
    // 从环境变量加载配置，例如：
    // HARNESS_MAX_API_CALLS_PER_MINUTE=100
    // HARNESS_MAX_TOKENS_PER_REQUEST=8000
    const maxApiCalls = process.env.HARNESS_MAX_API_CALLS_PER_MINUTE;
    const maxTokens = process.env.HARNESS_MAX_TOKENS_PER_REQUEST;
    const maxConcurrent = process.env.HARNESS_MAX_CONCURRENT_TASKS;

    if (maxApiCalls) {
      this.setMaxAPICallsPerMinute(parseInt(maxApiCalls, 10));
    }
    if (maxTokens) {
      this.constraints.resourceConstraints.maxTokensPerRequest = parseInt(maxTokens, 10);
    }
    if (maxConcurrent) {
      this.setMaxConcurrentTasks(parseInt(maxConcurrent, 10));
    }
  }

  /**
   * 验证配置的合理性
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证工具超时
    if (this.constraints.toolConstraints.toolTimeouts['llm-client'] < 5000) {
      errors.push('LLM 工具超时不能少于 5 秒');
    }

    // 验证资源限制
    if (this.constraints.resourceConstraints.maxTokensPerSession < this.constraints.resourceConstraints.maxTokensPerRequest) {
      errors.push('会话 Token 限制不能小于单次请求限制');
    }

    if (this.constraints.resourceConstraints.globalTokenBudget < this.constraints.resourceConstraints.maxTokensPerSession) {
      errors.push('全局 Token 预算不能小于会话限制');
    }

    if (this.constraints.resourceConstraints.maxConcurrentTasks < 1) {
      errors.push('最大并发数必须至少为 1');
    }

    // 验证行为约束
    if (this.constraints.behaviorConstraints.maxCallDepth < 1) {
      errors.push('最大调用深度必须至少为 1');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * 全局约束配置加载器实例
 */
let globalConfigLoader: ConstraintConfigLoader | null = null;

/**
 * 获取全局约束配置加载器
 */
export function getConstraintConfigLoader(
  baseConstraints?: HarnessConstraints
): ConstraintConfigLoader {
  if (!globalConfigLoader) {
    globalConfigLoader = new ConstraintConfigLoader(baseConstraints);
  }
  return globalConfigLoader;
}

/**
 * 重置全局配置加载器（用于测试）
 */
export function resetConstraintConfigLoader(): void {
  globalConfigLoader = null;
}
