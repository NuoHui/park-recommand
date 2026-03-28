/**
 * 核心执行器
 * 处理工具的实际执行、超时控制、前后验证
 */

import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@/utils/logger';
import {
  ExecutionContext,
  ExecutionResult,
  ExecutionTrace,
  ToolConstraints,
} from '@/types/harness';
import { ToolRegistry } from './tool-registry';
import { PreCheckExecutor } from './pre-checks';
import { PostCheckExecutor } from './post-checks';

const logger = createLogger('harness:executor');

/**
 * 执行选项
 */
export interface ExecutionOptions {
  /** 是否启用前置检查 */
  enablePreCheck?: boolean;
  /** 是否启用后置检查 */
  enablePostCheck?: boolean;
  /** 是否记录详细的执行轨迹 */
  enableTrace?: boolean;
  /** 执行的最大重试次数 */
  maxRetries?: number;
  /** 重试间隔（毫秒） */
  retryInterval?: number;
}

/**
 * 执行超时错误
 */
export class ExecutionTimeoutError extends Error {
  constructor(toolName: string, timeout: number) {
    super(`工具 ${toolName} 执行超时 (${timeout}ms)`);
    this.name = 'ExecutionTimeoutError';
  }
}

/**
 * 执行验证错误
 */
export class ExecutionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExecutionValidationError';
  }
}

/**
 * 核心执行器
 */
export class ExecutionHarness {
  private toolRegistry: ToolRegistry;
  private preCheckExecutor: PreCheckExecutor;
  private postCheckExecutor: PostCheckExecutor;
  private executionTraces: Map<string, ExecutionTrace> = new Map();

  constructor(
    toolRegistry: ToolRegistry,
    toolConstraints: ToolConstraints
  ) {
    this.toolRegistry = toolRegistry;
    this.preCheckExecutor = new PreCheckExecutor(toolConstraints);
    this.postCheckExecutor = new PostCheckExecutor();

    logger.debug('核心执行器初始化');
  }

  /**
   * 执行工具
   */
  async execute<T = any>(
    toolName: string,
    toolArgs: Record<string, any>,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult<T>> {
    const executionId = uuidv4();
    const sessionId = (global as any).currentSessionId || uuidv4();
    const startTime = Date.now();

    const context: ExecutionContext = {
      executionId,
      sessionId,
      toolName,
      toolArgs,
      startTime,
      timeout: this.toolRegistry.getTimeout(toolName),
      callDepth: 1,
    };

    logger.info('开始执行工具', {
      executionId,
      toolName,
      timeout: context.timeout,
    });

    const trace: ExecutionTrace = {
      executionId,
      operationType: 'tool_call',
      operationName: toolName,
      timestamp: startTime,
      status: 'pending',
    };

    try {
      // 1. 前置检查
      if (options.enablePreCheck !== false) {
        const preCheckResult = await this.preCheckExecutor.executeChecks(
          context,
          toolName
        );

        if (!preCheckResult.passed) {
          const failedCheck = preCheckResult.checks.find((c) => c.status === 'failed');
          throw new ExecutionValidationError(
            `前置检查失败: ${failedCheck?.message || '未知原因'}`
          );
        }

        trace.details = { preCheckResult };
      }

      // 2. 获取工具执行器
      const toolExecutor = this.toolRegistry.getExecutor(toolName);
      if (!toolExecutor) {
        throw new ExecutionValidationError(`工具执行器未找到: ${toolName}`);
      }

      // 3. 执行工具（带超时）
      let result = await this.executeWithTimeout(
        toolExecutor,
        toolArgs,
        context.timeout,
        options.maxRetries || 0,
        options.retryInterval || 1000
      );

      // 4. 后置检查
      if (options.enablePostCheck !== false) {
        const postCheckResult = await this.postCheckExecutor.executeChecks(
          result,
          toolName
        );

        if (!postCheckResult.passed) {
          const failedCheck = postCheckResult.checks.find((c) => c.status === 'failed');
          throw new ExecutionValidationError(
            `后置检查失败: ${failedCheck?.message || '未知原因'}`
          );
        }

        if (postCheckResult.sanitizedData !== undefined) {
          result.data = postCheckResult.sanitizedData;
        }

        trace.details = { ...trace.details, postCheckResult };
      }

      trace.status = 'success';
      logger.info('工具执行成功', {
        executionId,
        toolName,
        duration: result.duration,
        tokensUsed: result.tokensUsed,
      });

      return result;
    } catch (error) {
      trace.status = 'failed';
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('工具执行失败', {
        executionId,
        toolName,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
        trace,
      };
    } finally {
      // 记录执行轨迹
      if (options.enableTrace !== false) {
        this.executionTraces.set(executionId, trace);
      }
    }
  }

  /**
   * 执行工具（带超时控制）
   */
  private async executeWithTimeout(
    executor: (args: any) => Promise<any>,
    args: Record<string, any>,
    timeout: number,
    maxRetries: number = 0,
    retryInterval: number = 1000
  ): Promise<ExecutionResult> {
    let lastError: Error | null = null;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          executor(args),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new ExecutionTimeoutError('tool', timeout)), timeout)
          ),
        ]);

        return {
          success: true,
          data: result,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          logger.warn('工具执行失败，准备重试', {
            attempt: attempt + 1,
            maxRetries,
            retryInterval,
            error: (error as Error).message,
          });

          // 等待后重试
          await new Promise((resolve) => setTimeout(resolve, retryInterval));
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || '执行失败',
      duration: Date.now() - startTime,
    };
  }

  /**
   * 获取执行轨迹
   */
  getExecutionTrace(executionId: string): ExecutionTrace | undefined {
    return this.executionTraces.get(executionId);
  }

  /**
   * 获取所有执行轨迹
   */
  getAllExecutionTraces(): Map<string, ExecutionTrace> {
    return this.executionTraces;
  }

  /**
   * 清空执行轨迹（可选，用于内存管理）
   */
  clearExecutionTraces(): void {
    this.executionTraces.clear();
  }

  /**
   * 更新工具约束
   */
  updateToolConstraints(constraints: ToolConstraints): void {
    this.preCheckExecutor.updateConstraints(constraints);
  }
}
