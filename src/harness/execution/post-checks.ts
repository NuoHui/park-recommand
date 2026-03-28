/**
 * 执行后检查模块
 * 在工具执行后进行结果验证和处理
 */

import { createLogger } from '@/utils/logger';
import { ExecutionResult } from '@/types/harness';

const logger = createLogger('harness:post-checks');

/**
 * 后置检查结果
 */
export interface PostCheckResult {
  passed: boolean;
  checks: Array<{
    name: string;
    status: 'passed' | 'failed' | 'warning';
    message?: string;
  }>;
  sanitizedData?: any;
}

/**
 * 后置检查器
 */
export class PostCheckExecutor {
  /**
   * 执行所有后置检查
   */
  async executeChecks(
    result: ExecutionResult,
    toolName: string
  ): Promise<PostCheckResult> {
    const checks: PostCheckResult['checks'] = [];

    // 1. 检查执行是否成功
    const successCheck = this.checkSuccess(result);
    checks.push(successCheck);

    // 2. 检查返回数据的有效性
    const dataValidCheck = this.checkDataValidity(result.data);
    checks.push(dataValidCheck);

    // 3. 检查数据大小（防止返回过大的数据）
    const dataSizeCheck = this.checkDataSize(result.data);
    checks.push(dataSizeCheck);

    // 4. 检查是否存在敏感信息
    const sensitiveDataCheck = this.checkSensitiveData(result.data);
    checks.push(sensitiveDataCheck);

    // 5. 检查执行耗时
    const durationCheck = this.checkDuration(result);
    checks.push(durationCheck);

    const passed = checks.every((check) => check.status !== 'failed');

    // 数据脱敏
    let sanitizedData = result.data;
    if (passed && sensitiveDataCheck.status !== 'failed') {
      sanitizedData = this.sanitizeData(result.data);
    }

    logger.debug('后置检查完成', {
      toolName,
      passed,
      duration: result.duration,
      checks: checks.map((c) => ({ name: c.name, status: c.status })),
    });

    return { passed, checks, sanitizedData };
  }

  /**
   * 检查执行是否成功
   */
  private checkSuccess(result: ExecutionResult): PostCheckResult['checks'][0] {
    if (result.success) {
      return {
        name: 'execution_success',
        status: 'passed',
        message: '工具执行成功',
      };
    }

    return {
      name: 'execution_success',
      status: 'failed',
      message: `工具执行失败: ${result.error || '未知错误'}`,
    };
  }

  /**
   * 检查返回数据的有效性
   */
  private checkDataValidity(data: any): PostCheckResult['checks'][0] {
    // 允许 undefined、null 或任何对象
    if (data === undefined || data === null) {
      return {
        name: 'data_validity',
        status: 'passed',
        message: '数据为空（允许）',
      };
    }

    if (typeof data === 'object') {
      return {
        name: 'data_validity',
        status: 'passed',
        message: `数据有效 (类型: ${Array.isArray(data) ? 'array' : 'object'})`,
      };
    }

    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
      return {
        name: 'data_validity',
        status: 'passed',
        message: `数据有效 (类型: ${typeof data})`,
      };
    }

    return {
      name: 'data_validity',
      status: 'warning',
      message: `数据类型不常见 (${typeof data})`,
    };
  }

  /**
   * 检查数据大小
   */
  private checkDataSize(data: any): PostCheckResult['checks'][0] {
    const dataStr = JSON.stringify(data);
    const sizeBytes = Buffer.byteLength(dataStr, 'utf-8');
    const MAX_SIZE_MB = 10; // 10MB
    const maxSizeBytes = MAX_SIZE_MB * 1024 * 1024;

    if (sizeBytes > maxSizeBytes) {
      return {
        name: 'data_size',
        status: 'failed',
        message: `返回数据过大 (${(sizeBytes / 1024 / 1024).toFixed(2)}MB，限制 ${MAX_SIZE_MB}MB)`,
      };
    }

    if (sizeBytes > maxSizeBytes * 0.8) {
      return {
        name: 'data_size',
        status: 'warning',
        message: `返回数据接近限制 (${(sizeBytes / 1024 / 1024).toFixed(2)}MB)`,
      };
    }

    return {
      name: 'data_size',
      status: 'passed',
      message: `数据大小正常 (${(sizeBytes / 1024).toFixed(2)}KB)`,
    };
  }

  /**
   * 检查是否存在敏感信息
   */
  private checkSensitiveData(data: any): PostCheckResult['checks'][0] {
    const sensitivePatterns = [
      /api[_-]?key/i,
      /secret/i,
      /password/i,
      /token/i,
      /authorization/i,
      /credit[_-]?card/i,
      /ssn/i,
    ];

    const dataStr = JSON.stringify(data);

    for (const pattern of sensitivePatterns) {
      if (pattern.test(dataStr)) {
        return {
          name: 'sensitive_data',
          status: 'warning',
          message: '检测到可能的敏感信息，建议脱敏',
        };
      }
    }

    return {
      name: 'sensitive_data',
      status: 'passed',
      message: '未检测到敏感信息',
    };
  }

  /**
   * 检查执行耗时
   */
  private checkDuration(result: ExecutionResult): PostCheckResult['checks'][0] {
    const duration = result.duration;

    // 如果耗时超过 1 分钟，发出警告
    if (duration > 60000) {
      return {
        name: 'execution_duration',
        status: 'warning',
        message: `执行耗时过长 (${(duration / 1000).toFixed(2)}s)`,
      };
    }

    return {
      name: 'execution_duration',
      status: 'passed',
      message: `执行耗时正常 (${duration}ms)`,
    };
  }

  /**
   * 数据脱敏
   * 移除敏感信息
   */
  private sanitizeData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data !== 'object') {
      return data;
    }

    const sanitized = JSON.parse(JSON.stringify(data)); // 深拷贝

    const sanitizeObject = (obj: any): void => {
      if (typeof obj !== 'object' || obj === null) {
        return;
      }

      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];

          // 检查 key 是否为敏感字段
          if (
            /api[_-]?key|secret|password|token|authorization|credit|ssn/i.test(key)
          ) {
            if (typeof value === 'string') {
              obj[key] = '***REDACTED***';
            }
          } else if (typeof value === 'object' && value !== null) {
            sanitizeObject(value);
          }
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }
}
