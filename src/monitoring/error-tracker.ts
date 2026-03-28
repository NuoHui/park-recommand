/**
 * 错误追踪和诊断系统
 * 功能：捕获、分类、分析错误和异常，提供详细的错误上下文
 */

import { v4 as uuidv4 } from 'uuid';
import { getLogger } from '@/logger/index.js';

export interface ErrorContext {
  module?: string;
  operation?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  stackTrace?: string;
  userAgent?: string;
  timestamp?: number;
  metadata?: Record<string, any>;
}

export interface ErrorRecord {
  id: string;
  error: Error | string;
  context: ErrorContext;
  level: 'critical' | 'error' | 'warning';
  timestamp: number;
  resolved: boolean;
  category: string;
}

export interface ErrorStatistics {
  total: number;
  byCriteria: Record<string, number>;
  byModule: Record<string, number>;
  byCategory: Record<string, number>;
  successRate: number;
}

const logger = getLogger();

export class ErrorTracker {
  private errors: Map<string, ErrorRecord> = new Map();
  private errorStack: ErrorRecord[] = [];
  private listeners: ((error: ErrorRecord) => void)[] = [];
  private readonly maxErrors = 10000;

  /**
   * 记录错误
   */
  recordError(error: Error | string, context: ErrorContext, level: 'critical' | 'error' | 'warning' = 'error'): string {
    const errorId = uuidv4();
    const timestamp = Date.now();

    // 获取错误消息
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    // 分类错误
    const category = this.categorizeError(error);

    const record: ErrorRecord = {
      id: errorId,
      error: errorMessage,
      context: {
        ...context,
        timestamp,
      },
      level,
      timestamp,
      resolved: false,
      category,
    };

    this.errors.set(errorId, record);
    this.errorStack.push(record);

    // 保持最多 N 个错误记录
    if (this.errorStack.length > this.maxErrors) {
      const removed = this.errorStack.shift();
      if (removed) {
        this.errors.delete(removed.id);
      }
    }

    // 记录日志
    const logLevel = level === 'critical' ? 'error' : level === 'error' ? 'error' : 'warn';
    logger[logLevel](`错误已记录 [${category}]`, {
      data: {
        errorId,
        message: errorMessage,
        context,
        level,
      },
    });

    // 触发监听器
    this.notifyListeners(record);

    return errorId;
  }

  /**
   * 分类错误
   */
  private categorizeError(error: Error | string): string {
    const message = typeof error === 'string' ? error : error.message;

    if (message.includes('Network') || message.includes('ECONNREFUSED')) {
      return 'NetworkError';
    }
    if (message.includes('Timeout') || message.includes('timeout')) {
      return 'TimeoutError';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'NotFoundError';
    }
    if (message.includes('Authentication') || message.includes('401')) {
      return 'AuthenticationError';
    }
    if (message.includes('Permission') || message.includes('403')) {
      return 'PermissionError';
    }
    if (message.includes('Rate limit') || message.includes('429')) {
      return 'RateLimitError';
    }
    if (message.includes('Invalid') || message.includes('Validation')) {
      return 'ValidationError';
    }
    if (message.includes('JSON')) {
      return 'ParseError';
    }
    if (message.includes('Database') || message.includes('DB')) {
      return 'DatabaseError';
    }
    if (message.includes('Cache')) {
      return 'CacheError';
    }

    return 'UnknownError';
  }

  /**
   * 获取错误记录
   */
  getError(errorId: string): ErrorRecord | null {
    return this.errors.get(errorId) || null;
  }

  /**
   * 获取最近的错误
   */
  getRecentErrors(count: number = 10): ErrorRecord[] {
    return this.errorStack.slice(-count).reverse();
  }

  /**
   * 获取特定模块的错误
   */
  getErrorsByModule(module: string): ErrorRecord[] {
    return this.errorStack.filter((e) => e.context.module === module);
  }

  /**
   * 获取特定类别的错误
   */
  getErrorsByCategory(category: string): ErrorRecord[] {
    return this.errorStack.filter((e) => e.category === category);
  }

  /**
   * 获取未解决的错误
   */
  getUnresolvedErrors(): ErrorRecord[] {
    return this.errorStack.filter((e) => !e.resolved);
  }

  /**
   * 标记错误已解决
   */
  resolveError(errorId: string, notes?: string): boolean {
    const error = this.errors.get(errorId);
    if (!error) return false;

    error.resolved = true;
    logger.info('错误已标记为已解决', {
      data: { errorId, notes },
    });

    return true;
  }

  /**
   * 获取错误统计
   */
  getStatistics(): ErrorStatistics {
    const stats: ErrorStatistics = {
      total: this.errorStack.length,
      byCriteria: {},
      byModule: {},
      byCategory: {},
      successRate: 1, // 假设 success rate 需要从外部提供
    };

    // 按级别统计
    for (const error of this.errorStack) {
      const levelKey = `level:${error.level}`;
      stats.byCriteria[levelKey] = (stats.byCriteria[levelKey] || 0) + 1;

      if (error.context.module) {
        stats.byModule[error.context.module] = (stats.byModule[error.context.module] || 0) + 1;
      }

      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
    }

    return stats;
  }

  /**
   * 获取错误报告
   */
  getReport(): string {
    const stats = this.getStatistics();
    const unresolvedCount = this.getUnresolvedErrors().length;

    let report = `
╔════════════════════════════════════════════════════════════════╗
║                    错误追踪报告                                ║
╚════════════════════════════════════════════════════════════════╝

📊 错误统计
├─ 总错误数: ${stats.total}
├─ 未解决: ${unresolvedCount}
└─ 已解决: ${stats.total - unresolvedCount}

🗂️ 按模块分类
`;

    for (const [module, count] of Object.entries(stats.byModule)) {
      report += `├─ ${module}: ${count}\n`;
    }

    report += `
🏷️ 按类别分类
`;

    for (const [category, count] of Object.entries(stats.byCategory)) {
      report += `├─ ${category}: ${count}\n`;
    }

    report += `
⚠️ 按级别分类
`;

    for (const [criteria, count] of Object.entries(stats.byCriteria)) {
      report += `├─ ${criteria}: ${count}\n`;
    }

    report += `
═══════════════════════════════════════════════════════════════════`;

    return report;
  }

  /**
   * 获取错误链
   * 显示特定操作的完整错误序列
   */
  getErrorChain(sessionId: string): ErrorRecord[] {
    return this.errorStack.filter((e) => e.context.sessionId === sessionId);
  }

  /**
   * 获取错误上下文
   */
  getErrorContext(errorId: string): ErrorContext | null {
    const error = this.errors.get(errorId);
    return error ? error.context : null;
  }

  /**
   * 监听错误事件
   */
  onError(listener: (error: ErrorRecord) => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除错误监听
   */
  offError(listener: (error: ErrorRecord) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 触发监听器
   */
  private notifyListeners(error: ErrorRecord): void {
    for (const listener of this.listeners) {
      try {
        listener(error);
      } catch (err) {
        logger.error('错误监听器执行失败', {
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    }
  }

  /**
   * 清空所有错误记录
   */
  clear(): void {
    this.errors.clear();
    this.errorStack = [];
    logger.info('错误记录已清空');
  }

  /**
   * 导出错误数据
   */
  export(): {
    errors: ErrorRecord[];
    statistics: ErrorStatistics;
    timestamp: number;
  } {
    return {
      errors: [...this.errorStack],
      statistics: this.getStatistics(),
      timestamp: Date.now(),
    };
  }
}

// 全局实例
let globalTracker: ErrorTracker | null = null;

/**
 * 获取全局错误追踪器
 */
export function getErrorTracker(): ErrorTracker {
  if (!globalTracker) {
    globalTracker = new ErrorTracker();
  }
  return globalTracker;
}

/**
 * 重置全局实例（用于测试）
 */
export function resetErrorTracker(): void {
  globalTracker = null;
}
