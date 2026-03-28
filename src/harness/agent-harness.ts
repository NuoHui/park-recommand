/**
 * Agent Harness 主类
 * 协调所有的 Harness 子模块，提供统一的执行接口
 */

import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@/utils/logger';
import {
  HarnessConstraints,
  ExecutionContext,
  ExecutionResult,
  HarnessConfig,
} from '@/types/harness';
import { ConstraintConfigLoader } from './config/constraints';
import { ToolRegistry, initializeToolRegistry } from './execution/tool-registry';
import { ExecutionHarness } from './execution/executor';
import { ResourceManager } from './resource/resource-manager';
import { IntentValidator } from './validation/intent-validator';
import { ExecutionTracker } from './monitoring/execution-tracker';
import { SafetyMonitor } from './monitoring/safety-monitor';

const logger = createLogger('harness:agent-harness');

/**
 * Agent Harness 配置
 */
export interface AgentHarnessConfig extends HarnessConfig {
  sessionId?: string;
}

/**
 * Agent Harness 执行选项
 */
export interface HarnessExecutionOptions {
  enablePreCheck?: boolean;
  enablePostCheck?: boolean;
  enableTrace?: boolean;
  enableValidation?: boolean;
  enableMonitoring?: boolean;
  enableAudit?: boolean;
  skipApproval?: boolean; // 跳过风险审批
  maxRetries?: number;
}

/**
 * Agent Harness 主类
 */
export class AgentHarness {
  private sessionId: string;
  private config: AgentHarnessConfig;
  private configLoader: ConstraintConfigLoader;
  private toolRegistry: ToolRegistry;
  private executionHarness: ExecutionHarness;
  private resourceManager: ResourceManager;
  private intentValidator: IntentValidator;
  private executionTracker: ExecutionTracker;
  private safetyMonitor: SafetyMonitor;

  constructor(config?: AgentHarnessConfig) {
    const cfg = config || {} as AgentHarnessConfig;
    
    this.sessionId = cfg.sessionId || uuidv4();
    
    const defaultConfig: HarnessConfig = {
      enabled: true,
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
      enableMonitoring: true,
      enableAudit: true,
      enableRiskScoring: true,
    };

    this.config = {
      ...defaultConfig,
      ...cfg,
      enabled: cfg.enabled !== false,
      enableMonitoring: cfg.enableMonitoring !== false,
      enableAudit: cfg.enableAudit !== false,
      enableRiskScoring: cfg.enableRiskScoring !== false,
    };

    // 初始化约束配置加载器
    this.configLoader = new ConstraintConfigLoader(cfg.constraints);

    const constraints = this.configLoader.getConstraints();

    // 初始化工具注册表
    this.toolRegistry = initializeToolRegistry(constraints.toolConstraints);

    // 初始化各个子模块
    this.executionHarness = new ExecutionHarness(
      this.toolRegistry,
      constraints.toolConstraints
    );

    this.resourceManager = new ResourceManager(constraints.resourceConstraints);

    this.intentValidator = new IntentValidator();

    this.executionTracker = new ExecutionTracker();

    this.safetyMonitor = new SafetyMonitor();

    // 设置全局会话 ID
    (global as any).currentSessionId = this.sessionId;

    logger.info('Agent Harness 初始化成功', {
      sessionId: this.sessionId,
      enabled: this.config.enabled,
      monitoring: this.config.enableMonitoring,
      audit: this.config.enableAudit,
    });
  }

  /**
   * 获取会话 ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * 执行工具
   */
  async execute<T = any>(
    toolName: string,
    toolArgs: Record<string, any>,
    options: HarnessExecutionOptions = {}
  ): Promise<ExecutionResult<T>> {
    if (!this.config.enabled) {
      logger.debug('Harness 已禁用，直接执行工具');
      // 如果 Harness 已禁用，直接从注册表执行
      const executor = this.toolRegistry.getExecutor(toolName);
      if (executor) {
        const startTime = Date.now();
        try {
          const data = await executor(toolArgs);
          return {
            success: true,
            data,
            duration: Date.now() - startTime,
          };
        } catch (error) {
          return {
            success: false,
            error: (error as Error).message,
            duration: Date.now() - startTime,
          };
        }
      }
      return {
        success: false,
        error: `工具未注册: ${toolName}`,
        duration: 0,
      };
    }

    const executionId = uuidv4();
    const startTime = Date.now();

    const context: ExecutionContext = {
      executionId,
      sessionId: this.sessionId,
      toolName,
      toolArgs,
      startTime,
      timeout: this.toolRegistry.getTimeout(toolName),
      callDepth: 1,
    };

    logger.info('开始 Harness 执行', {
      executionId,
      toolName,
      sessionId: this.sessionId,
    });

    try {
      // 1. 资源可用性检查
      const resourceCheck = this.resourceManager.checkResourceAvailability(
        this.sessionId,
        toolName
      );

      if (!resourceCheck.canProceed && !options.skipApproval) {
        logger.warn('资源不可用，执行被拒绝', {
          executionId,
          toolName,
          reasons: resourceCheck.reasons,
        });

        if (this.config.enableAudit) {
          this.executionTracker.recordAudit({
            sessionId: this.sessionId,
            executionId,
            actionType: 'tool_call',
            actionName: toolName,
            result: 'rejected',
            details: { reasons: resourceCheck.reasons },
          });
        }

        return {
          success: false,
          error: `资源不可用: ${resourceCheck.reasons.join('; ')}`,
          duration: Date.now() - startTime,
        };
      }

      // 记录资源使用
      this.resourceManager.recordAPICall(toolName);

      // 2. 意图验证
      if (options.enableValidation !== false) {
        const validationResult = await this.intentValidator.validate(context, toolName);

        if (!validationResult.valid) {
          logger.warn('意图验证失败', {
            executionId,
            toolName,
            errors: validationResult.errors,
          });

          if (this.config.enableAudit) {
            this.executionTracker.recordAudit({
              sessionId: this.sessionId,
              executionId,
              actionType: 'validation',
              actionName: `validate_${toolName}`,
              result: 'failure',
              details: validationResult,
            });
          }

          return {
            success: false,
            error: `意图验证失败: ${validationResult.errors?.join('; ')}`,
            duration: Date.now() - startTime,
          };
        }

        // 检查风险评分
        if (
          this.config.enableRiskScoring &&
          validationResult.riskScore.requiresApproval &&
          !options.skipApproval
        ) {
          logger.warn('风险评分超过阈值，需要审批', {
            executionId,
            toolName,
            riskScore: validationResult.riskScore.score,
            level: validationResult.riskScore.level,
          });

          if (this.config.enableAudit) {
            this.executionTracker.recordAudit({
              sessionId: this.sessionId,
              executionId,
              actionType: 'decision',
              actionName: `risk_assessment_${toolName}`,
              result: 'pending_approval',
              details: validationResult.riskScore,
            });
          }

          // 这里可以集成实际的审批流程
          // 目前假设高风险操作需要显式批准
          return {
            success: false,
            error: `操作风险过高 (${validationResult.riskScore.level}): ${validationResult.riskScore.description}`,
            duration: Date.now() - startTime,
          };
        }
      }

      // 3. 受控执行
      const taskId = `${toolName}_${executionId}`;
      const result = await this.resourceManager.executeControlledTask(
        taskId,
        async () => {
          return this.executionHarness.execute<T>(
            toolName,
            toolArgs,
            {
              enablePreCheck: options.enablePreCheck,
              enablePostCheck: options.enablePostCheck,
              enableTrace: options.enableTrace,
              maxRetries: options.maxRetries,
            }
          );
        }
      );

      // 4. 监控执行结果
      if (this.config.enableMonitoring) {
        this.safetyMonitor.monitorExecutionResult(result, toolName, executionId);
      }

      // 5. 记录审计日志
      if (this.config.enableAudit) {
        this.executionTracker.recordAudit({
          sessionId: this.sessionId,
          executionId,
          actionType: 'tool_call',
          actionName: toolName,
          result: result.success ? 'success' : 'failure',
          details: {
            duration: result.duration,
            error: result.error,
            tokensUsed: result.tokensUsed,
          },
        });
      }

      logger.info('Harness 执行完成', {
        executionId,
        toolName,
        success: result.success,
        duration: result.duration,
      });

      return result;
    } catch (error) {
      const errorMessage = (error as Error).message;

      logger.error('Harness 执行异常', {
        executionId,
        toolName,
        error: errorMessage,
      });

      if (this.config.enableAudit) {
        this.executionTracker.recordAudit({
          sessionId: this.sessionId,
          executionId,
          actionType: 'tool_call',
          actionName: toolName,
          result: 'failure',
          details: { error: errorMessage },
        });
      }

      return {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 注册工具
   */
  registerTool(metadata: Parameters<typeof this.toolRegistry.register>[0]): void {
    this.toolRegistry.register(metadata);
  }

  /**
   * 注册多个工具
   */
  registerTools(metadataList: Parameters<typeof this.toolRegistry.registerBatch>[0]): void {
    this.toolRegistry.registerBatch(metadataList);
  }

  /**
   * 获取资源管理器
   */
  getResourceManager(): ResourceManager {
    return this.resourceManager;
  }

  /**
   * 获取意图验证器
   */
  getIntentValidator(): IntentValidator {
    return this.intentValidator;
  }

  /**
   * 获取执行追踪器
   */
  getExecutionTracker(): ExecutionTracker {
    return this.executionTracker;
  }

  /**
   * 获取安全监控器
   */
  getSafetyMonitor(): SafetyMonitor {
    return this.safetyMonitor;
  }

  /**
   * 获取工具注册表
   */
  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  /**
   * 获取约束配置加载器
   */
  getConfigLoader(): ConstraintConfigLoader {
    return this.configLoader;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      sessionId: this.sessionId,
      config: this.config,
      resources: this.resourceManager.getStats(),
      monitoring: this.safetyMonitor.getStats(),
      audit: this.executionTracker.getStats(),
      tools: this.toolRegistry.getStats(),
    };
  }

  /**
   * 生成综合报告
   */
  generateReport(): string {
    let report = '=== Agent Harness 综合报告 ===\n\n';
    report += `会话 ID: ${this.sessionId}\n`;
    report += `报告生成时间: ${new Date().toISOString()}\n\n`;

    report += this.safetyMonitor.generateReport();
    report += '\n\n';
    report += this.executionTracker.generateReport(this.sessionId);

    return report;
  }

  /**
   * 重置所有统计信息
   */
  reset(): void {
    this.resourceManager.resetAll();
    this.safetyMonitor.clearAllAlerts();
    this.safetyMonitor.clearAllEvents();
    this.executionTracker.clearSessionLogs(this.sessionId);
    logger.info(`会话 ${this.sessionId} 已重置`);
  }

  /**
   * 销毁 Harness 实例
   */
  destroy(): void {
    this.reset();
    logger.info(`会话 ${this.sessionId} 已销毁`);
  }
}

/**
 * 全局 Harness 实例
 */
let globalHarness: AgentHarness | null = null;

/**
 * 获取全局 Harness 实例
 */
export function getGlobalHarness(config?: AgentHarnessConfig): AgentHarness {
  if (!globalHarness) {
    globalHarness = new AgentHarness(config);
  }
  return globalHarness;
}

/**
 * 创建新的 Harness 实例
 */
export function createHarness(config?: AgentHarnessConfig): AgentHarness {
  return new AgentHarness(config);
}

/**
 * 重置全局 Harness 实例
 */
export function resetGlobalHarness(): void {
  if (globalHarness) {
    globalHarness.destroy();
    globalHarness = null;
  }
}
