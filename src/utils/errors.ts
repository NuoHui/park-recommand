import chalk from 'chalk';
import { SYMBOLS } from '@/config/constants';

/**
 * 应用错误类
 */
export class ApplicationError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

/**
 * API 错误类
 */
export class ApiError extends ApplicationError {
  constructor(
    public statusCode: number,
    code: string,
    message: string,
    details?: any
  ) {
    super(code, message, details);
    this.name = 'ApiError';
  }
}

/**
 * 验证错误类
 */
export class ValidationError extends ApplicationError {
  constructor(
    code: string,
    message: string,
    public fields?: Record<string, string>
  ) {
    super(code, message, fields);
    this.name = 'ValidationError';
  }
}

/**
 * 格式化错误输出
 */
export function formatErrorMessage(error: Error | string): string {
  const msg = typeof error === 'string' ? error : error.message;
  return chalk.red(`${SYMBOLS.error} 错误: ${msg}`);
}

/**
 * 格式化成功输出
 */
export function formatSuccessMessage(message: string): string {
  return chalk.green(`${SYMBOLS.success} ${message}`);
}

/**
 * 格式化信息输出
 */
export function formatInfoMessage(message: string): string {
  return chalk.cyan(`${SYMBOLS.info} ${message}`);
}

/**
 * 格式化警告输出
 */
export function formatWarningMessage(message: string): string {
  return chalk.yellow(`${SYMBOLS.warning} ${message}`);
}

/**
 * 处理和记录错误
 */
export function handleError(error: unknown, context?: string): void {
  let message = '未知错误';

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else {
    message = JSON.stringify(error);
  }

  if (context) {
    console.error(`[${context}] ${message}`);
  } else {
    console.error(message);
  }
}
