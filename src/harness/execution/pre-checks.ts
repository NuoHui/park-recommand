/**
 * 执行前检查模块
 * 在执行工具之前进行各种验证
 */

import { createLogger } from '@/utils/logger';
import { ExecutionContext, ToolConstraints } from '@/types/harness';

const logger = createLogger('harness:pre-checks');

/**
 * 前置检查结果
 */
export interface PreCheckResult {
  passed: boolean;
  checks: Array<{
    name: string;
    status: 'passed' | 'failed' | 'warning';
    message?: string;
  }>;
}

/**
 * 前置检查器
 */
export class PreCheckExecutor {
  private toolConstraints: ToolConstraints;

  constructor(toolConstraints: ToolConstraints) {
    this.toolConstraints = toolConstraints;
  }

  /**
   * 执行所有前置检查
   */
  async executeChecks(
    context: ExecutionContext,
    toolName: string
  ): Promise<PreCheckResult> {
    const checks: PreCheckResult['checks'] = [];

    // 1. 检查工具是否在白名单中
    const whitelistCheck = this.checkToolWhitelist(toolName);
    checks.push(whitelistCheck);

    // 2. 检查工具是否在黑名单中
    const blacklistCheck = this.checkToolBlacklist(toolName);
    checks.push(blacklistCheck);

    // 3. 检查参数有效性
    const paramCheck = this.checkParameters(context.toolArgs);
    checks.push(paramCheck);

    // 4. 检查调用深度
    const depthCheck = this.checkCallDepth(context);
    checks.push(depthCheck);

    // 5. 检查执行超时时间设置
    const timeoutCheck = this.checkTimeout(context, toolName);
    checks.push(timeoutCheck);

    const passed = checks.every((check) => check.status !== 'failed');

    logger.debug('前置检查完成', {
      executionId: context.executionId,
      toolName,
      passed,
      checks: checks.map((c) => ({ name: c.name, status: c.status })),
    });

    return { passed, checks };
  }

  /**
   * 检查工具是否在白名单中
   */
  private checkToolWhitelist(toolName: string): PreCheckResult['checks'][0] {
    const { allowedTools } = this.toolConstraints;

    // 如果白名单为空，允许所有工具
    if (allowedTools.length === 0) {
      return {
        name: 'tool_whitelist',
        status: 'passed',
        message: '白名单检查通过（白名单为空）',
      };
    }

    if (allowedTools.includes(toolName)) {
      return {
        name: 'tool_whitelist',
        status: 'passed',
        message: `工具在白名单中: ${toolName}`,
      };
    }

    return {
      name: 'tool_whitelist',
      status: 'failed',
      message: `工具不在白名单中: ${toolName}`,
    };
  }

  /**
   * 检查工具是否在黑名单中
   */
  private checkToolBlacklist(toolName: string): PreCheckResult['checks'][0] {
    const { blockedTools } = this.toolConstraints;

    if (blockedTools.includes(toolName)) {
      return {
        name: 'tool_blacklist',
        status: 'failed',
        message: `工具在黑名单中: ${toolName}`,
      };
    }

    return {
      name: 'tool_blacklist',
      status: 'passed',
      message: `工具不在黑名单中: ${toolName}`,
    };
  }

  /**
   * 检查参数有效性
   */
  private checkParameters(params: Record<string, any>): PreCheckResult['checks'][0] {
    // 检查参数不为空
    if (!params || typeof params !== 'object') {
      return {
        name: 'parameter_validation',
        status: 'failed',
        message: '工具参数必须是有效的对象',
      };
    }

    // 检查参数大小（防止过大的请求）
    const paramSize = JSON.stringify(params).length;
    const MAX_PARAM_SIZE = 1024 * 1024; // 1MB

    if (paramSize > MAX_PARAM_SIZE) {
      return {
        name: 'parameter_validation',
        status: 'failed',
        message: `工具参数过大 (${paramSize} bytes，限制 ${MAX_PARAM_SIZE} bytes)`,
      };
    }

    return {
      name: 'parameter_validation',
      status: 'passed',
      message: `参数有效 (${paramSize} bytes)`,
    };
  }

  /**
   * 检查调用深度
   */
  private checkCallDepth(context: ExecutionContext): PreCheckResult['checks'][0] {
    const maxDepth = 3; // 最大调用深度

    if (context.callDepth > maxDepth) {
      return {
        name: 'call_depth',
        status: 'failed',
        message: `调用深度超过限制 (当前: ${context.callDepth}, 限制: ${maxDepth})`,
      };
    }

    if (context.callDepth > maxDepth * 0.8) {
      return {
        name: 'call_depth',
        status: 'warning',
        message: `调用深度接近限制 (当前: ${context.callDepth}, 限制: ${maxDepth})`,
      };
    }

    return {
      name: 'call_depth',
      status: 'passed',
      message: `调用深度正常 (${context.callDepth}/${maxDepth})`,
    };
  }

  /**
   * 检查执行超时时间设置
   */
  private checkTimeout(
    context: ExecutionContext,
    toolName: string
  ): PreCheckResult['checks'][0] {
    const expectedTimeout = this.toolConstraints.toolTimeouts[toolName];
    const actualTimeout = context.timeout;

    if (actualTimeout < 100) {
      return {
        name: 'timeout_check',
        status: 'failed',
        message: `超时时间过短 (${actualTimeout}ms，最少 100ms)`,
      };
    }

    if (expectedTimeout && actualTimeout < expectedTimeout * 0.5) {
      return {
        name: 'timeout_check',
        status: 'warning',
        message: `超时时间短于预期 (${actualTimeout}ms，预期 ${expectedTimeout}ms)`,
      };
    }

    return {
      name: 'timeout_check',
      status: 'passed',
      message: `超时时间合理 (${actualTimeout}ms)`,
    };
  }

  /**
   * 更新工具约束
   */
  updateConstraints(constraints: ToolConstraints): void {
    this.toolConstraints = constraints;
  }
}
