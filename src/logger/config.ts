/**
 * 日志系统配置管理
 */

import path from 'path';
import { fileURLToPath } from 'url';
import type { LoggerConfig } from './types.js';
import { LogLevel } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 预设日志配置
 */
export const LOGGER_PRESETS = {
  /**
   * 开发环境配置
   */
  development: {
    level: LogLevel.DEBUG,
    enabled: true,
    colorize: true,
    console: true,
    file: false,
    format: 'text' as const,
    timestamp: true,
    stack: true,
  },

  /**
   * 生产环境配置
   */
  production: {
    level: LogLevel.INFO,
    enabled: true,
    colorize: false,
    console: true,
    file: true,
    format: 'json' as const,
    timestamp: true,
    stack: true,
    maxFileSize: 10485760, // 10MB
    maxFiles: 20,
  },

  /**
   * 测试环境配置
   */
  test: {
    level: LogLevel.WARN,
    enabled: true,
    colorize: false,
    console: false,
    file: false,
    format: 'json' as const,
    timestamp: false,
    stack: false,
  },

  /**
   * 调试模式配置
   */
  debug: {
    level: LogLevel.VERBOSE,
    enabled: true,
    colorize: true,
    console: true,
    file: true,
    format: 'combine' as const,
    timestamp: true,
    stack: true,
    maxFileSize: 5242880, // 5MB
    maxFiles: 30,
  },

  /**
   * 最小化配置（仅错误）
   */
  minimal: {
    level: LogLevel.ERROR,
    enabled: true,
    colorize: true,
    console: true,
    file: false,
    format: 'text' as const,
    timestamp: false,
    stack: false,
  },
};

/**
 * 从环境变量获取配置
 */
export function getConfigFromEnv(): Partial<LoggerConfig> {
  const config: Partial<LoggerConfig> = {};

  // 日志级别
  if (process.env.LOG_LEVEL) {
    config.level = process.env.LOG_LEVEL;
  }

  // 是否启用日志
  if (process.env.LOG_ENABLED !== undefined) {
    config.enabled = process.env.LOG_ENABLED === 'true';
  }

  // 是否启用颜色
  if (process.env.LOG_COLORIZE !== undefined) {
    config.colorize = process.env.LOG_COLORIZE === 'true';
  }

  // 是否输出到控制台
  if (process.env.LOG_CONSOLE !== undefined) {
    config.console = process.env.LOG_CONSOLE === 'true';
  }

  // 是否输出到文件
  if (process.env.LOG_FILE !== undefined) {
    config.file = process.env.LOG_FILE === 'true';
  }

  // 日志目录
  if (process.env.LOG_DIR) {
    config.logDir = process.env.LOG_DIR;
  }

  // 日志格式
  if (process.env.LOG_FORMAT) {
    const format = process.env.LOG_FORMAT as 'json' | 'text' | 'combine';
    if (['json', 'text', 'combine'].includes(format)) {
      config.format = format;
    }
  }

  // 是否包含时间戳
  if (process.env.LOG_TIMESTAMP !== undefined) {
    config.timestamp = process.env.LOG_TIMESTAMP === 'true';
  }

  // 是否包含堆栈
  if (process.env.LOG_STACK !== undefined) {
    config.stack = process.env.LOG_STACK === 'true';
  }

  // 日志文件最大大小
  if (process.env.LOG_MAX_SIZE) {
    config.maxFileSize = parseInt(process.env.LOG_MAX_SIZE, 10);
  }

  // 日志文件最大保留数
  if (process.env.LOG_MAX_FILES) {
    config.maxFiles = parseInt(process.env.LOG_MAX_FILES, 10);
  }

  return config;
}

/**
 * 获取当前环境对应的预设配置
 */
export function getPresetConfig(env?: string): LoggerConfig {
  const environment = env || process.env.NODE_ENV || 'development';

  const preset =
    LOGGER_PRESETS[environment as keyof typeof LOGGER_PRESETS] || LOGGER_PRESETS.development;

  // 合并环境变量配置
  const envConfig = getConfigFromEnv();

  return {
    ...preset,
    ...envConfig,
  };
}

/**
 * 验证日志配置
 */
export function validateLoggerConfig(config: LoggerConfig): string[] {
  const errors: string[] = [];

  // 验证日志级别
  if (config.level) {
    const validLevels = Object.values(LogLevel);
    if (!validLevels.includes(config.level as LogLevel)) {
      errors.push(`Invalid log level: ${config.level}. Must be one of: ${validLevels.join(', ')}`);
    }
  }

  // 验证日志格式
  if (config.format && !['json', 'text', 'combine'].includes(config.format)) {
    errors.push(`Invalid format: ${config.format}. Must be one of: json, text, combine`);
  }

  // 验证文件大小
  if (config.maxFileSize && config.maxFileSize < 1024) {
    errors.push(`Log file size too small: ${config.maxFileSize}. Minimum is 1024 bytes`);
  }

  // 验证文件数量
  if (config.maxFiles && config.maxFiles < 1) {
    errors.push(`Invalid max files: ${config.maxFiles}. Must be at least 1`);
  }

  return errors;
}

/**
 * 日志配置管理器
 */
export class LoggerConfigManager {
  private static instance: LoggerConfigManager | null = null;
  private config: LoggerConfig;

  private constructor(initialConfig?: LoggerConfig) {
    this.config = {
      ...getPresetConfig(),
      ...initialConfig,
    };

    const errors = validateLoggerConfig(this.config);
    if (errors.length > 0) {
      console.warn(`Logger configuration warnings:\n${errors.join('\n')}`);
    }
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: LoggerConfig): LoggerConfigManager {
    if (!LoggerConfigManager.instance) {
      LoggerConfigManager.instance = new LoggerConfigManager(config);
    }
    return LoggerConfigManager.instance;
  }

  /**
   * 获取当前配置
   */
  public getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  public updateConfig(updates: Partial<LoggerConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };

    const errors = validateLoggerConfig(this.config);
    if (errors.length > 0) {
      console.warn(`Logger configuration warnings:\n${errors.join('\n')}`);
    }
  }

  /**
   * 应用预设配置
   */
  public applyPreset(preset: keyof typeof LOGGER_PRESETS): void {
    this.config = {
      ...LOGGER_PRESETS[preset],
      ...getConfigFromEnv(),
    };
  }

  /**
   * 重置为默认配置
   */
  public reset(): void {
    this.config = getPresetConfig();
  }
}

export default LoggerConfigManager;
