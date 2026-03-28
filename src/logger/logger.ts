/**
 * Winston 日志记录器实现
 */

import path from 'path';
import { fileURLToPath } from 'url';
import winston, { format, Logger as WinstonLogger, transports } from 'winston';
import { v4 as uuidv4 } from 'uuid';
import type {
  LogContext,
  LogLevel,
  LogOptions,
  LoggerConfig,
  ILogger,
  PerformanceMetric,
  LogStatistics,
} from './types.js';
import { LogLevel as LogLevelEnum } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Winston 日志记录器
 */
export class Logger implements ILogger {
  private winstonLogger: WinstonLogger;
  private config: Required<LoggerConfig>;
  private currentContext: LogContext = {};
  private timers: Map<string, number> = new Map();
  private metrics: PerformanceMetric[] = [];
  private logStats: LogStatistics = {
    byLevel: {},
    byModule: {},
    errors: 0,
    warnings: 0,
    total: 0,
    period: {
      start: Date.now(),
      end: Date.now(),
    },
  };

  /**
   * 创建日志记录器实例
   */
  constructor(customConfig?: LoggerConfig) {
    this.config = this.resolveConfig(customConfig);
    this.winstonLogger = this.createWinstonLogger();
  }

  /**
   * 解析配置，使用默认值
   */
  private resolveConfig(customConfig?: LoggerConfig): Required<LoggerConfig> {
    return {
      level: customConfig?.level || 'info',
      enabled: customConfig?.enabled !== false,
      colorize: customConfig?.colorize !== false,
      console: customConfig?.console !== false,
      file: customConfig?.file ?? true,
      logDir: customConfig?.logDir || path.join(process.cwd(), 'logs'),
      errorFile: customConfig?.errorFile || 'error.log',
      combinedFile: customConfig?.combinedFile || 'combined.log',
      maxFileSize: customConfig?.maxFileSize || 5242880, // 5MB
      maxFiles: customConfig?.maxFiles || 10,
      format: customConfig?.format || 'combine',
      timestamp: customConfig?.timestamp !== false,
      stack: customConfig?.stack !== false,
      metadata: customConfig?.metadata || {},
    };
  }

  /**
   * 创建 Winston Logger
   */
  private createWinstonLogger(): WinstonLogger {
    if (!this.config.enabled) {
      // 禁用日志时返回 null logger
      return winston.createLogger({
        level: 'error',
        format: format.json(),
        transports: [new transports.Console({ silent: true })],
      });
    }

    const baseFormat = [
      this.config.colorize ? format.colorize() : format.uncolorize(),
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.errors({ stack: this.config.stack }),
      this.createCustomFormat(),
    ];

    const transportsList: winston.transport[] = [];

    // 控制台输出
    if (this.config.console) {
      transportsList.push(
        new transports.Console({
          format: format.combine(
            ...baseFormat,
            format.printf(this.consoleFormatter.bind(this))
          ),
        })
      );
    }

    // 文件输出
    if (this.config.file) {
      // 错误日志
      transportsList.push(
        new transports.File({
          filename: path.join(this.config.logDir, this.config.errorFile),
          level: 'error',
          format: format.combine(...baseFormat, format.json()),
          maxsize: this.config.maxFileSize,
          maxFiles: this.config.maxFiles,
        })
      );

      // 综合日志
      transportsList.push(
        new transports.File({
          filename: path.join(this.config.logDir, this.config.combinedFile),
          format: format.combine(...baseFormat, format.json()),
          maxsize: this.config.maxFileSize,
          maxFiles: this.config.maxFiles,
        })
      );
    }

    return winston.createLogger({
      level: this.config.level as string,
      format: format.combine(...baseFormat),
      defaultMeta: this.config.metadata,
      transports: transportsList,
      exceptionHandlers: [
        new transports.File({
          filename: path.join(this.config.logDir, 'exceptions.log'),
          maxsize: this.config.maxFileSize,
          maxFiles: this.config.maxFiles,
        }),
      ],
    });
  }

  /**
   * 自定义日志格式
   */
  private createCustomFormat() {
    return format((info) => {
      // 添加上下文信息
      if (this.currentContext) {
        info.context = this.currentContext;
      }

      // 添加操作 ID
      if (!info.operationId && this.currentContext.operationId) {
        info.operationId = this.currentContext.operationId;
      } else if (!info.operationId) {
        info.operationId = uuidv4().slice(0, 8);
      }

      // 统计信息更新
      this.logStats.total++;
      this.logStats.byLevel[info.level] = (this.logStats.byLevel[info.level] || 0) + 1;

      if (this.currentContext.module) {
        this.logStats.byModule[this.currentContext.module] =
          (this.logStats.byModule[this.currentContext.module] || 0) + 1;
      }

      if (info.level === 'error') {
        this.logStats.errors++;
      } else if (info.level === 'warn') {
        this.logStats.warnings++;
      }

      this.logStats.period.end = Date.now();

      return info;
    })();
  }

  /**
   * 控制台格式化器
   */
  private consoleFormatter(info: any): string {
    const { timestamp, level, message, context, operationId, stack, ...rest } = info;

    // 构建前缀
    let prefix = '';
    if (timestamp) prefix += `[${timestamp}]`;
    prefix += ` [${level.toUpperCase()}]`;
    if (operationId) prefix += ` [${operationId}]`;
    if (context?.module) prefix += ` [${context.module}]`;

    // 构建消息
    let output = `${prefix} ${message}`;

    // 添加上下文信息
    if (context?.tags && context.tags.length > 0) {
      output += ` [tags: ${context.tags.join(', ')}]`;
    }

    // 添加性能指标
    if (context?.metrics) {
      const metricStrings = Object.entries(context.metrics)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}=${v}`);
      if (metricStrings.length > 0) {
        output += ` {${metricStrings.join(', ')}}`;
      }
    }

    // 添加额外数据
    const hasExtraData = Object.keys(rest).some((k) => !['timestamp', 'level', 'message'].includes(k));
    if (hasExtraData) {
      const extraData = Object.entries(rest)
        .filter(([k]) => !['timestamp', 'level', 'message'].includes(k))
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
      output += ` ${JSON.stringify(extraData)}`;
    }

    // 添加堆栈跟踪
    if (stack) {
      output += `\n${stack}`;
    }

    return output;
  }

  /**
   * 记录错误日志
   */
  public error(message: string, options?: LogOptions | Record<string, any>): void {
    this.logWithOptions('error', message, options as LogOptions);
  }

  /**
   * 记录警告日志
   */
  public warn(message: string, options?: LogOptions | Record<string, any>): void {
    this.logWithOptions('warn', message, options as LogOptions);
  }

  /**
   * 记录信息日志
   */
  public info(message: string, options?: LogOptions | Record<string, any>): void {
    this.logWithOptions('info', message, options as LogOptions);
  }

  /**
   * 记录调试日志
   */
  public debug(message: string, options?: LogOptions | Record<string, any>): void {
    this.logWithOptions('debug', message, options as LogOptions);
  }

  /**
   * 记录详细日志
   */
  public verbose(message: string, options?: LogOptions | Record<string, any>): void {
    this.logWithOptions('verbose', message, options as LogOptions);
  }

  /**
   * 根据选项记录日志
   */
  private logWithOptions(level: string, message: string, options?: LogOptions | Record<string, any>): void {
    const meta: any = {};

    if (options?.context) {
      meta.context = options.context;
    }

    if (options?.data) {
      meta.data = options.data;
    } else if (options && !('error' in options) && !('stack' in options) && !('context' in options)) {
      // 如果 options 不是 LogOptions 的标准字段，将整个对象作为 data
      meta.data = options;
    }

    if (options?.error) {
      meta.error = {
        message: options.error.message,
        name: options.error.name,
        stack: options?.stack !== false ? options.error.stack : undefined,
      };
    }

    this.winstonLogger.log(level, message, meta);
  }

  /**
   * 记录性能指标
   */
  public metric(name: string, value: number, context?: LogContext): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit: this.getMetricUnit(name),
      timestamp: Date.now(),
      context,
    };

    this.metrics.push(metric);

    // 保留最近 1000 个指标
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }

    // 记录关键指标
    if (value > this.getMetricThreshold(name)) {
      this.warn(`Performance metric ${name} exceeded threshold: ${value}${metric.unit}`, {
        data: metric,
      });
    }
  }

  /**
   * 获取指标单位
   */
  private getMetricUnit(name: string): string {
    const unitMap: Record<string, string> = {
      duration: 'ms',
      memory: 'MB',
      apiCalls: 'count',
      cacheHits: 'count',
      cacheMisses: 'count',
      latency: 'ms',
      throughput: 'ops/s',
    };
    return unitMap[name] || 'unknown';
  }

  /**
   * 获取指标阈值
   */
  private getMetricThreshold(name: string): number {
    const thresholdMap: Record<string, number> = {
      duration: 5000, // 5s
      latency: 1000, // 1s
      memory: 500, // 500MB
    };
    return thresholdMap[name] || Infinity;
  }

  /**
   * 启动计时器
   */
  public startTimer(label: string): () => void {
    const startTime = performance.now();
    const timerId = `${label}_${uuidv4().slice(0, 8)}`;

    this.timers.set(timerId, startTime);

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.metric(`${label}_duration`, duration);
      this.debug(`Timer "${label}" completed in ${duration.toFixed(2)}ms`, {
        data: { duration, label },
      });

      this.timers.delete(timerId);

      return duration;
    };
  }

  /**
   * 设置上下文
   */
  public setContext(context: LogContext): void {
    this.currentContext = {
      ...this.currentContext,
      ...context,
    };
  }

  /**
   * 清除上下文
   */
  public clearContext(): void {
    this.currentContext = {};
  }

  /**
   * 获取 Winston Logger
   */
  public getWinstonLogger(): WinstonLogger {
    return this.winstonLogger;
  }

  /**
   * 获取日志统计信息
   */
  public getStatistics(): LogStatistics {
    return { ...this.logStats };
  }

  /**
   * 获取性能指标历史
   */
  public getMetricsHistory(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * 获取指定指标的统计
   */
  public getMetricStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
  } | null {
    const filtered = this.metrics.filter((m) => m.name === name);
    if (filtered.length === 0) return null;

    const values = filtered.map((m) => m.value);
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    };
  }

  /**
   * 关闭日志系统
   */
  public async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.winstonLogger.on('finish', resolve);
      this.winstonLogger.on('error', reject);
      this.winstonLogger.end();
    });
  }
}

/**
 * 全局日志实例
 */
let globalLogger: Logger | null = null;

/**
 * 获取或创建全局日志实例
 */
export function getLogger(config?: LoggerConfig): Logger {
  if (!globalLogger) {
    globalLogger = new Logger(config);
  }
  return globalLogger;
}

/**
 * 重置全局日志实例
 */
export function resetLogger(): void {
  globalLogger = null;
}

export default Logger;
