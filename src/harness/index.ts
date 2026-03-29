/**
 * Harness Agent 架构 - 主导出文件
 * 提供统一的导出和初始化接口
 */

// 导出类型定义
export * from '@/types/harness';

// 导出配置模块
export { ConstraintConfigLoader, getConstraintConfigLoader, DEFAULT_HARNESS_CONSTRAINTS } from './config/constraints';

// 导出执行沙箱
export { ToolRegistry, getToolRegistry, initializeToolRegistry } from './execution/tool-registry';
export { ExecutionHarness, ExecutionTimeoutError, ExecutionValidationError } from './execution/executor';
export { PreCheckExecutor } from './execution/pre-checks';
export { PostCheckExecutor } from './execution/post-checks';

// 导出资源管理
export { ResourceManager } from './resource/resource-manager';
export { RateLimiter } from './resource/rate-limiter';
export { TokenTracker } from './resource/token-tracker';
export { ConcurrencyController } from './resource/concurrency-controller';

// 导出验证模块
export { IntentValidator } from './validation/intent-validator';
export { RiskScorer } from './validation/risk-scorer';

// 导出监控模块
export { ExecutionTracker } from './monitoring/execution-tracker';
export { SafetyMonitor } from './monitoring/safety-monitor';

// 导出主类
export {
  AgentHarness,
  getGlobalHarness,
  createHarness,
  resetGlobalHarness,
} from './agent-harness';

// 导出集成包装器
export { LLMExecutorWrapper } from './integration/llm-executor-wrapper';
export { MapExecutorWrapper } from './integration/map-executor-wrapper';

/**
 * 快速初始化 Harness
 * 用于快速集成到现有项目
 */
export async function initializeHarness() {
  const { getGlobalHarness } = await import('./agent-harness.js');
  const harness = getGlobalHarness({
    enabled: true,
    enableMonitoring: true,
    enableAudit: true,
    enableRiskScoring: true,
    constraints: {
      toolConstraints: {
        allowedTools: [],
        blockedTools: [],
        toolTimeouts: {},
      },
      resourceConstraints: {
        maxAPICallsPerMinute: 100,
        maxTokensPerRequest: 10000,
        maxTokensPerSession: 100000,
        globalTokenBudget: 1000000,
        maxConcurrentTasks: 10,
        maxRetries: 3,
      },
      behaviorConstraints: {
        allowedActions: [],
        requiredApprovals: [],
        riskThreshold: 50,
        allowChainedCalls: true,
        maxCallDepth: 5,
      },
    },
  });

  return harness;
}

/**
 * 创建带有集成包装器的 Harness
 * 返回包含 LLM、地图包装器的对象
 */
export async function createHarnessWithWrappers() {
  const { getGlobalHarness } = await import('./agent-harness.js');
  const { LLMExecutorWrapper } = await import('./integration/llm-executor-wrapper.js');
  const { MapExecutorWrapper } = await import('./integration/map-executor-wrapper.js');
  
  const harness = getGlobalHarness();

  return {
    harness,
    llm: new LLMExecutorWrapper(harness),
    map: new MapExecutorWrapper(harness),
  };
}
