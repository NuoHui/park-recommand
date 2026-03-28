/**
 * 日志系统类型定义
 */

import type { Logger as WinstonLogger } from 'winston';

/**
 * 日志级别
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

/**
 * 日志输出方式
 */
export enum TransportType {
  CONSOLE = 'console',
  FILE = 'file',
  COMBINED = 'combined',
}

/**
 * 日志配置选项
 */
export interface LoggerConfig {
  /**
   * 日志级别
   */
  level?: LogLevel | string;

  /**
   * 是否启用日志
   */
  enabled?: boolean;

  /**
   * 是否启用颜色输出
   */
  colorize?: boolean;

  /**
   * 是否在控制台输出
   */
  console?: boolean;

  /**
   * 是否输出到文件
   */
  file?: boolean;

  /**
   * 日志文件目录
   */
  logDir?: string;

  /**
   * 错误日志文件
   */
  errorFile?: string;

  /**
   * 综合日志文件
   */
  combinedFile?: string;

  /**
   * 日志文件最大大小（字节）
   */
  maxFileSize?: number;

  /**
   * 日志文件最大保留数量
   */
  maxFiles?: number;

  /**
   * 日志格式
   */
  format?: 'json' | 'text' | 'combine';

  /**
   * 是否包含时间戳
   */
  timestamp?: boolean;

  /**
   * 是否包含调用栈
   */
  stack?: boolean;

  /**
   * 自定义元数据
   */
  metadata?: Record<string, any>;
}

/**
 * 日志上下文
 */
export interface LogContext {
  /**
   * 模块名称
   */
  module?: string;

  /**
   * 操作 ID（用于追踪）
   */
  operationId?: string;

  /**
   * 用户 ID
   */
  userId?: string;

  /**
   * 会话 ID
   */
  sessionId?: string;

  /**
   * 自定义标签
   */
  tags?: string[];

  /**
   * 性能指标
   */
  metrics?: {
    duration?: number;
    apiCalls?: number;
    cacheHits?: number;
    cacheMisses?: number;
    [key: string]: any;
  };

  /**
   * 其他元数据
   */
  metadata?: Record<string, any>;
}

/**
 * 日志记录选项
 */
export interface LogOptions {
  /**
   * 上下文信息
   */
  context?: LogContext;

  /**
   * 错误对象
   */
  error?: Error;

  /**
   * 是否包含堆栈跟踪
   */
  stack?: boolean;

  /**
   * 额外数据
   */
  data?: any;
}

/**
 * 日志记录接口
 */
export interface ILogger {
  /**
   * 记录错误日志
   */
  error(message: string, options?: LogOptions): void;

  /**
   * 记录警告日志
   */
  warn(message: string, options?: LogOptions): void;

  /**
   * 记录信息日志
   */
  info(message: string, options?: LogOptions): void;

  /**
   * 记录调试日志
   */
  debug(message: string, options?: LogOptions): void;

  /**
   * 记录详细日志
   */
  verbose(message: string, options?: LogOptions): void;

  /**
   * 记录关键指标
   */
  metric(name: string, value: number, context?: LogContext): void;

  /**
   * 启动计时器
   */
  startTimer(label: string): () => void;

  /**
   * 设置上下文
   */
  setContext(context: LogContext): void;

  /**
   * 清除上下文
   */
  clearContext(): void;

  /**
   * 获取内部 Winston Logger
   */
  getWinstonLogger(): WinstonLogger;

  /**
   * 关闭日志系统
   */
  close(): Promise<void>;
}

/**
 * 性能监控指标
 */
export interface PerformanceMetric {
  /**
   * 指标名称
   */
  name: string;

  /**
   * 指标值
   */
  value: number;

  /**
   * 单位
   */
  unit: string;

  /**
   * 时间戳
   */
  timestamp: number;

  /**
   * 上下文
   */
  context?: LogContext;
}

/**
 * 日志统计信息
 */
export interface LogStatistics {
  /**
   * 按级别统计
   */
  byLevel: Record<string, number>;

  /**
   * 按模块统计
   */
  byModule: Record<string, number>;

  /**
   * 错误统计
   */
  errors: number;

  /**
   * 警告统计
   */
  warnings: number;

  /**
   * 总日志数
   */
  total: number;

  /**
   * 时间段
   */
  period: {
    start: number;
    end: number;
  };
}
