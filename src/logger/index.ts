/**
 * 日志系统模块导出
 */

// 类型导出
export type {
  LogContext,
  LogOptions,
  LoggerConfig,
  ILogger,
  PerformanceMetric,
  LogStatistics,
} from './types.js';

export { LogLevel, TransportType } from './types.js';

// Logger 导出
export { Logger, getLogger, resetLogger } from './logger.js';

// 配置导出
export { LOGGER_PRESETS, getConfigFromEnv, getPresetConfig, validateLoggerConfig, LoggerConfigManager } from './config.js';

// 上下文导出
export {
  generateOperationId,
  generateSessionId,
  LogContextManager,
  withContext,
  withContextSync,
  createContextDecorator,
} from './context.js';

// 中间件导出
export {
  createApiLoggingMiddleware,
  createCacheLoggingMiddleware,
  createDialogueLoggingMiddleware,
  createPerformanceMonitorMiddleware,
  createErrorTrackingMiddleware,
  LoggingSystem,
  getLoggingSystem,
} from './middleware.js';

// 快速访问
export { default as LoggerConfigManagerDefault } from './config.js';
export { default as LogContextManagerDefault } from './context.js';
export { default as LoggingSystemDefault } from './middleware.js';
