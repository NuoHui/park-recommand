/**
 * Harness Agent 架构的核心类型定义
 * 包括约束、执行上下文、风险评分、资源限制等类型
 */

/**
 * 工具元数据
 */
export interface ToolMetadata {
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 工具分类 */
  category: string;
  /** 是否安全（可以在沙箱中执行） */
  isSafe: boolean;
  /** 工具执行函数 */
  executor: (args: any) => Promise<any>;
  /** 工具版本 */
  version?: string;
}

/**
 * Token 使用记录
 */
export interface TokenUsageRecord {
  /** 会话 ID */
  sessionId: string;
  /** 执行 ID */
  executionId: string;
  /** 工具名称 */
  toolName: string;
  /** 使用的 Token 数 */
  tokensUsed: number;
  /** 记录时间戳 */
  timestamp: number;
}

/**
 * 工具约束
 */
export interface ToolConstraints {
  /** 允许调用的工具列表（白名单） */
  allowedTools: string[];
  /** 禁止调用的工具列表（黑名单） */
  blockedTools: string[];
  /** 各工具的超时时间（毫秒） */
  toolTimeouts: Record<string, number>;
  /** 工具调用前的验证函数 */
  preCheckFunctions?: Record<string, (args: any) => Promise<boolean>>;
  /** 工具调用后的验证函数 */
  postCheckFunctions?: Record<string, (result: any) => Promise<boolean>>;
}

/**
 * 资源约束
 */
export interface ResourceConstraints {
  /** 每分钟最大 API 调用次数 */
  maxAPICallsPerMinute: number;
  /** 每个请求最大 Token 数 */
  maxTokensPerRequest: number;
  /** 单个会话最大 Token 数 */
  maxTokensPerSession: number;
  /** 全局 Token 预算上限 */
  globalTokenBudget: number;
  /** 最大并发任务数 */
  maxConcurrentTasks: number;
  /** 单个任务最大重试次数 */
  maxRetries: number;
}

/**
 * 行为约束
 */
export interface BehaviorConstraints {
  /** 允许的操作类型 */
  allowedActions: string[];
  /** 需要审批的操作 */
  requiredApprovals: string[];
  /** 风险评分阈值（0-100），超过则需要审批 */
  riskThreshold: number;
  /** 是否允许级联调用 */
  allowChainedCalls: boolean;
  /** 最大级联深度 */
  maxCallDepth: number;
}

/**
 * 完整的 Harness 约束配置
 */
export interface HarnessConstraints {
  toolConstraints: ToolConstraints;
  resourceConstraints: ResourceConstraints;
  behaviorConstraints: BehaviorConstraints;
}

/**
 * 执行上下文
 */
export interface ExecutionContext {
  /** 执行的唯一 ID */
  executionId: string;
  /** 会话 ID */
  sessionId: string;
  /** 用户 ID（可选） */
  userId?: string;
  /** 当前执行的工具名 */
  toolName: string;
  /** 工具参数 */
  toolArgs: Record<string, any>;
  /** 执行开始时间 */
  startTime: number;
  /** 执行超时时间 */
  timeout: number;
  /** 执行的父上下文 ID（用于级联调用） */
  parentExecutionId?: string;
  /** 当前调用深度 */
  callDepth: number;
  /** 执行元数据 */
  metadata?: Record<string, any>;
}

/**
 * 执行结果
 */
export interface ExecutionResult<T = any> {
  /** 执行是否成功 */
  success: boolean;
  /** 执行返回的数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 执行耗时（毫秒） */
  duration: number;
  /** 使用的 Token 数 */
  tokensUsed?: number;
  /** 执行的资源消耗详情 */
  resourceUsage?: {
    cpuMs?: number;
    memoryMB?: number;
    apiCalls?: number;
  };
  /** 执行轨迹 */
  trace?: ExecutionTrace;
}

/**
 * 执行轨迹（用于审计） */
export interface ExecutionTrace {
  /** 执行 ID */
  executionId: string;
  /** 操作类型 */
  operationType: 'tool_call' | 'validation' | 'resource_check' | 'monitor';
  /** 操作名称 */
  operationName: string;
  /** 操作时间戳 */
  timestamp: number;
  /** 操作状态 */
  status: 'pending' | 'success' | 'failed' | 'skipped';
  /** 操作详情 */
  details?: Record<string, any>;
  /** 下一步操作追踪 */
  next?: ExecutionTrace;
}

/**
 * 风险评分
 */
export interface RiskScore {
  /** 总风险分数（0-100） */
  score: number;
  /** 风险等级 */
  level: 'low' | 'medium' | 'high' | 'critical';
  /** 风险因素及其分数 */
  factors: Array<{
    name: string;
    score: number;
    reason: string;
  }>;
  /** 是否需要审批 */
  requiresApproval: boolean;
  /** 风险说明 */
  description: string;
}

/**
 * 意图验证结果
 */
export interface IntentValidationResult {
  /** 验证是否通过 */
  valid: boolean;
  /** 用户意图分类 */
  intentType: 'recommendation' | 'query' | 'update' | 'delete' | 'unknown';
  /** 权限检查结果 */
  permissionGranted: boolean;
  /** 风险评分 */
  riskScore: RiskScore;
  /** 验证错误信息 */
  errors?: string[];
  /** 验证警告信息 */
  warnings?: string[];
}

/**
 * 资源使用情况
 */
export interface ResourceUsage {
  /** API 调用统计 */
  apiCallsLastMinute: Map<string, number[]>; // 工具名 -> 时间戳数组
  /** Token 使用情况 */
  tokenUsage: {
    currentSession: number;
    globalUsage: number;
    limit: number;
  };
  /** 并发任务数 */
  concurrentTasks: number;
  /** 最后更新时间 */
  lastUpdate: number;
}

/**
 * 监控告警
 */
export interface MonitoringAlert {
  /** 告警 ID */
  alertId: string;
  /** 告警级别 */
  level: 'info' | 'warning' | 'error' | 'critical';
  /** 告警类型 */
  alertType: 'rate_limit' | 'token_budget' | 'timeout' | 'anomaly' | 'resource_exhaustion';
  /** 告警信息 */
  message: string;
  /** 触发时间 */
  timestamp: number;
  /** 相关的执行 ID */
  executionId?: string;
  /** 建议的处理方式 */
  recommendation?: string;
}

/**
 * 监控事件
 */
export interface MonitoringEvent {
  /** 事件 ID */
  eventId: string;
  /** 事件类型 */
  eventType: 'execution_start' | 'execution_end' | 'resource_change' | 'alert' | 'anomaly';
  /** 事件发生时间 */
  timestamp: number;
  /** 事件数据 */
  data: Record<string, any>;
  /** 关联的执行 ID */
  executionId?: string;
}

/**
 * 审计日志条目
 */
export interface AuditLogEntry {
  /** 日志 ID */
  logId: string;
  /** 会话 ID */
  sessionId: string;
  /** 执行 ID */
  executionId?: string;
  /** 操作类型 */
  actionType: 'tool_call' | 'validation' | 'decision' | 'approval' | 'denial';
  /** 操作名称 */
  actionName: string;
  /** 操作者 ID */
  actor?: string;
  /** 操作时间 */
  timestamp: number;
  /** 操作结果 */
  result: 'success' | 'failure' | 'pending_approval' | 'rejected';
  /** 操作详情 */
  details?: Record<string, any>;
  /** 相关的 IP 地址或请求源 */
  source?: string;
}

/**
 * 降级策略配置
 */
export interface DegradationStrategy {
  /** 是否启用降级 */
  enabled: boolean;
  /** 触发降级的条件 */
  triggers: Array<{
    condition: 'rate_limit_exceeded' | 'token_budget_exceeded' | 'timeout' | 'error_rate_high';
    threshold: number;
  }>;
  /** 降级动作 */
  actions: Array<{
    name: string;
    description: string;
    execute: (context: ExecutionContext) => Promise<ExecutionResult>;
  }>;
}

/**
 * Harness 配置
 */
export interface HarnessConfig {
  /** 是否启用 Harness */
  enabled: boolean;
  /** 约束配置 */
  constraints: HarnessConstraints;
  /** 是否启用监控 */
  enableMonitoring: boolean;
  /** 是否启用审计日志 */
  enableAudit: boolean;
  /** 是否启用风险评分 */
  enableRiskScoring: boolean;
  /** 降级策略 */
  degradationStrategy?: DegradationStrategy;
}
