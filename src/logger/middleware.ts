/**
 * 日志系统中间件和集成工具
 */

import type { ILogger, LogContext } from './types.js';
import { Logger, getLogger } from './logger.js';
import { LogContextManager } from './context.js';

/**
 * API 调用日志中间件
 */
export function createApiLoggingMiddleware(logger: ILogger) {
  return async function apiLoggingMiddleware<T>(
    fn: () => Promise<T>,
    options?: {
      name: string;
      context?: LogContext;
    }
  ): Promise<T> {
    const startTime = performance.now();
    const operationName = options?.name || fn.name || 'api_call';

    if (options?.context) {
      logger.setContext(options.context);
    }

    try {
      logger.debug(`Starting: ${operationName}`);
      const result = await fn();
      const duration = performance.now() - startTime;

      logger.info(`Completed: ${operationName}`, {
        data: { duration: `${duration.toFixed(2)}ms` },
      });

      logger.metric(`${operationName}_duration`, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      logger.error(`Failed: ${operationName}`, {
        error: error as Error,
        data: { duration: `${duration.toFixed(2)}ms` },
      });

      logger.metric(`${operationName}_error`, 1);
      throw error;
    }
  };
}

/**
 * 缓存访问日志中间件
 */
export function createCacheLoggingMiddleware(logger: ILogger) {
  return async function cacheLoggingMiddleware<T>(
    fn: () => Promise<T>,
    options?: {
      key: string;
      context?: LogContext;
    }
  ): Promise<T> {
    const { key = 'cache_access' } = options || {};

    if (options?.context) {
      logger.setContext(options.context);
    }

    try {
      const result = await fn();
      logger.debug(`Cache hit: ${key}`);
      logger.metric(`cache_hits`, 1);
      return result;
    } catch (error) {
      logger.debug(`Cache miss: ${key}`);
      logger.metric(`cache_misses`, 1);
      throw error;
    }
  };
}

/**
 * 对话流程日志中间件
 */
export function createDialogueLoggingMiddleware(logger: ILogger) {
  return {
    logUserInput: (input: string, context?: LogContext) => {
      logger.setContext(context || {});
      logger.debug(`User input: ${input}`);
    },

    logLlmRequest: (prompt: string, context?: LogContext) => {
      logger.setContext(context || {});
      logger.debug(`LLM request sent`, { data: { promptLength: prompt.length } });
    },

    logLlmResponse: (response: string, context?: LogContext) => {
      logger.setContext(context || {});
      logger.debug(`LLM response received`, { data: { responseLength: response.length } });
    },

    logRecommendation: (
      location: string,
      count: number,
      context?: LogContext
    ) => {
      logger.setContext(context || {});
      logger.info(`Generated ${count} recommendations for location: ${location}`, {
        data: { location, count },
      });
    },

    logError: (stage: string, error: Error, context?: LogContext) => {
      logger.setContext(context || {});
      logger.error(`Dialogue error at stage: ${stage}`, {
        error,
        data: { stage },
      });
    },
  };
}

/**
 * 性能监控中间件
 */
export function createPerformanceMonitorMiddleware(logger: ILogger) {
  const metrics: Map<string, { count: number; totalTime: number }> = new Map();

  return {
    track: async function <T>(
      name: string,
      fn: () => Promise<T>
    ): Promise<T> {
      const startTime = performance.now();

      try {
        const result = await fn();
        const duration = performance.now() - startTime;

        // 更新统计
        const current = metrics.get(name) || { count: 0, totalTime: 0 };
        metrics.set(name, {
          count: current.count + 1,
          totalTime: current.totalTime + duration,
        });

        logger.metric(`${name}_duration`, duration);
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        logger.metric(`${name}_error_duration`, duration);
        throw error;
      }
    },

    getMetrics: () => {
      const result: Record<string, any> = {};
      for (const [name, stats] of metrics) {
        result[name] = {
          count: stats.count,
          avgTime: stats.totalTime / stats.count,
          totalTime: stats.totalTime,
        };
      }
      return result;
    },

    reset: () => {
      metrics.clear();
    },
  };
}

/**
 * 错误追踪中间件
 */
export function createErrorTrackingMiddleware(logger: ILogger) {
  const errors: Array<{
    timestamp: number;
    error: Error;
    context?: LogContext;
  }> = [];

  return {
    trackError: (error: Error, context?: LogContext) => {
      const entry = {
        timestamp: Date.now(),
        error,
        context,
      };

      errors.push(entry);
      logger.error(error.message, {
        error,
        context,
      });

      // 保留最近 100 个错误
      if (errors.length > 100) {
        errors.shift();
      }
    },

    getErrors: (
      filter?: (error: Error) => boolean
    ): Array<{ timestamp: number; error: Error; context?: LogContext }> => {
      if (!filter) {
        return [...errors];
      }
      return errors.filter((e) => filter(e.error));
    },

    getErrorStats: () => {
      const stats: Record<string, number> = {};
      for (const entry of errors) {
        const errorType = entry.error.constructor.name;
        stats[errorType] = (stats[errorType] || 0) + 1;
      }
      return stats;
    },

    clear: () => {
      errors.length = 0;
    },
  };
}

/**
 * 集成所有中间件的日志系统管理器
 */
export class LoggingSystem {
  private logger: ILogger;
  private contextManager: LogContextManager;
  private apiMiddleware: ReturnType<typeof createApiLoggingMiddleware>;
  private cacheMiddleware: ReturnType<typeof createCacheLoggingMiddleware>;
  private dialogueMiddleware: ReturnType<typeof createDialogueLoggingMiddleware>;
  private performanceMiddleware: ReturnType<typeof createPerformanceMonitorMiddleware>;
  private errorMiddleware: ReturnType<typeof createErrorTrackingMiddleware>;

  constructor(logger?: ILogger) {
    this.logger = logger || getLogger();
    this.contextManager = LogContextManager.getInstance();
    this.apiMiddleware = createApiLoggingMiddleware(this.logger);
    this.cacheMiddleware = createCacheLoggingMiddleware(this.logger);
    this.dialogueMiddleware = createDialogueLoggingMiddleware(this.logger);
    this.performanceMiddleware = createPerformanceMonitorMiddleware(this.logger);
    this.errorMiddleware = createErrorTrackingMiddleware(this.logger);
  }

  /**
   * 获取日志记录器
   */
  public getLogger(): ILogger {
    return this.logger;
  }

  /**
   * 获取上下文管理器
   */
  public getContextManager(): LogContextManager {
    return this.contextManager;
  }

  /**
   * 获取 API 中间件
   */
  public getApiMiddleware() {
    return this.apiMiddleware;
  }

  /**
   * 获取缓存中间件
   */
  public getCacheMiddleware() {
    return this.cacheMiddleware;
  }

  /**
   * 获取对话中间件
   */
  public getDialogueMiddleware() {
    return this.dialogueMiddleware;
  }

  /**
   * 获取性能中间件
   */
  public getPerformanceMiddleware() {
    return this.performanceMiddleware;
  }

  /**
   * 获取错误中间件
   */
  public getErrorMiddleware() {
    return this.errorMiddleware;
  }

  /**
   * 记录系统启动
   */
  public logSystemStart(version?: string): void {
    this.logger.info(`System started${version ? ` [v${version}]` : ''}`);
  }

  /**
   * 记录系统关闭
   */
  public logSystemShutdown(): void {
    this.logger.info('System shutdown');
  }

  /**
   * 获取完整的系统统计
   */
  public getSystemStats() {
    const logger = this.logger as Logger;

    return {
      logs: logger.getStatistics(),
      metrics: logger.getMetricsHistory(),
      errors: this.errorMiddleware.getErrorStats(),
      performance: this.performanceMiddleware.getMetrics(),
    };
  }

  /**
   * 生成系统报告
   */
  public generateReport(): string {
    const stats = this.getSystemStats();

    const lines = [
      '═══════════════════════════════════════',
      '           系统日志统计报告             ',
      '═══════════════════════════════════════',
      '',
      '📊 日志统计:',
      `  总日志数: ${stats.logs.total}`,
      `  错误数: ${stats.logs.errors}`,
      `  警告数: ${stats.logs.warnings}`,
      '',
      '📈 日志分布:',
      ...Object.entries(stats.logs.byLevel).map(([level, count]) => `  ${level}: ${count}`),
      '',
      '⚠️  错误类型:',
      ...Object.entries(stats.errors).map(([type, count]) => `  ${type}: ${count}`),
      '',
      '⏱️  性能指标:',
      ...Object.entries(stats.performance).map(([name, data]: any) => 
        `  ${name}: avg=${data.avgTime?.toFixed(2)}ms, count=${data.count}`
      ),
      '',
      '═══════════════════════════════════════',
    ];

    return lines.join('\n');
  }
}

/**
 * 全局日志系统实例
 */
let globalLoggingSystem: LoggingSystem | null = null;

/**
 * 获取全局日志系统
 */
export function getLoggingSystem(logger?: ILogger): LoggingSystem {
  if (!globalLoggingSystem) {
    globalLoggingSystem = new LoggingSystem(logger);
  }
  return globalLoggingSystem;
}

export default LoggingSystem;
