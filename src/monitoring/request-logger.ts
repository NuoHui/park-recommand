/**
 * 请求日志记录系统
 * 功能：捕获完整的请求/响应周期，提供详细的操作跟踪
 */

import { v4 as uuidv4 } from 'uuid';
import { getLogger } from '@/logger/index.js';

export interface RequestLog {
  requestId: string;
  sessionId: string;
  operation: string;
  method?: string;
  endpoint?: string;
  timestamp: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'success' | 'failed' | 'timeout' | 'cancelled';
  statusCode?: number;
  request?: any;
  response?: any;
  error?: string;
  errorId?: string;
  context?: Record<string, any>;
  retries?: number;
  cacheHit?: boolean;
  metadata?: Record<string, any>;
}

export interface RequestTrace {
  sessionId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDuration: number;
  averageDuration: number;
  slowestRequest?: RequestLog;
  fastestRequest?: RequestLog;
  requests: RequestLog[];
}

const logger = getLogger();

export class RequestLogger {
  private logs: Map<string, RequestLog> = new Map();
  private sessionLogs: Map<string, RequestLog[]> = new Map();
  private readonly maxLogs = 50000;
  private allLogs: RequestLog[] = [];

  /**
   * 开始请求
   */
  startRequest(
    sessionId: string,
    operation: string,
    options?: {
      method?: string;
      endpoint?: string;
      context?: Record<string, any>;
      metadata?: Record<string, any>;
    }
  ): string {
    const requestId = uuidv4();
    const now = Date.now();

    const log: RequestLog = {
      requestId,
      sessionId,
      operation,
      method: options?.method,
      endpoint: options?.endpoint,
      timestamp: now,
      startTime: now,
      status: 'pending',
      context: options?.context,
      metadata: options?.metadata,
      retries: 0,
    };

    this.logs.set(requestId, log);
    this.allLogs.push(log);

    if (!this.sessionLogs.has(sessionId)) {
      this.sessionLogs.set(sessionId, []);
    }
    this.sessionLogs.get(sessionId)!.push(log);

    // 保持最多 N 条日志
    if (this.allLogs.length > this.maxLogs) {
      const removed = this.allLogs.shift();
      if (removed) {
        this.logs.delete(removed.requestId);
      }
    }

    logger.debug(`请求已启动 [${requestId}]`, {
      data: {
        sessionId,
        operation,
        requestId,
      },
    });

    return requestId;
  }

  /**
   * 完成请求
   */
  completeRequest(
    requestId: string,
    options?: {
      status?: 'success' | 'failed' | 'timeout' | 'cancelled';
      statusCode?: number;
      response?: any;
      cacheHit?: boolean;
      metadata?: Record<string, any>;
    }
  ): RequestLog | null {
    const log = this.logs.get(requestId);
    if (!log) return null;

    const now = Date.now();
    log.endTime = now;
    log.duration = now - log.startTime;
    log.status = options?.status || 'success';
    log.statusCode = options?.statusCode;
    log.response = options?.response;
    log.cacheHit = options?.cacheHit;

    if (options?.metadata) {
      log.metadata = {
        ...log.metadata,
        ...options.metadata,
      };
    }

    const durationMsg = log.duration > 1000 ? `${(log.duration / 1000).toFixed(2)}s` : `${log.duration}ms`;
    const logLevel = log.status === 'failed' ? 'warn' : 'debug';

    logger[logLevel](`请求已完成 [${requestId}]`, {
      data: {
        requestId,
        operation: log.operation,
        status: log.status,
        duration: durationMsg,
        statusCode: log.statusCode,
        cacheHit: log.cacheHit,
      },
    });

    return log;
  }

  /**
   * 记录请求错误
   */
  recordError(requestId: string, error: Error | string, errorId?: string): RequestLog | null {
    const log = this.logs.get(requestId);
    if (!log) return null;

    const errorMessage = typeof error === 'string' ? error : error.message;
    log.status = 'failed';
    log.error = errorMessage;
    log.errorId = errorId;

    if (!log.endTime) {
      log.endTime = Date.now();
      log.duration = log.endTime - log.startTime;
    }

    logger.warn(`请求错误 [${requestId}]`, {
      data: {
        requestId,
        operation: log.operation,
        error: errorMessage,
        errorId,
        duration: log.duration,
      },
    });

    return log;
  }

  /**
   * 增加重试次数
   */
  incrementRetries(requestId: string): void {
    const log = this.logs.get(requestId);
    if (log) {
      log.retries = (log.retries || 0) + 1;
    }
  }

  /**
   * 获取请求日志
   */
  getRequest(requestId: string): RequestLog | null {
    return this.logs.get(requestId) || null;
  }

  /**
   * 获取会话的请求日志
   */
  getSessionTrace(sessionId: string): RequestTrace | null {
    const requests = this.sessionLogs.get(sessionId);
    if (!requests || requests.length === 0) return null;

    let totalDuration = 0;
    let successfulCount = 0;
    let failedCount = 0;
    let slowestRequest: RequestLog | undefined;
    let fastestRequest: RequestLog | undefined;

    for (const req of requests) {
      if (req.duration) {
        totalDuration += req.duration;

        if (!slowestRequest || req.duration > (slowestRequest.duration || 0)) {
          slowestRequest = req;
        }
        if (!fastestRequest || req.duration < (fastestRequest.duration || Infinity)) {
          fastestRequest = req;
        }
      }

      if (req.status === 'success') {
        successfulCount++;
      } else if (req.status === 'failed') {
        failedCount++;
      }
    }

    return {
      sessionId,
      totalRequests: requests.length,
      successfulRequests: successfulCount,
      failedRequests: failedCount,
      totalDuration,
      averageDuration: requests.length > 0 ? totalDuration / requests.length : 0,
      slowestRequest,
      fastestRequest,
      requests: [...requests],
    };
  }

  /**
   * 获取最近的请求日志
   */
  getRecentRequests(count: number = 20): RequestLog[] {
    return this.allLogs.slice(-count).reverse();
  }

  /**
   * 获取慢请求
   */
  getSlowRequests(threshold: number = 1000): RequestLog[] {
    return this.allLogs.filter((log) => log.duration && log.duration > threshold);
  }

  /**
   * 获取失败的请求
   */
  getFailedRequests(): RequestLog[] {
    return this.allLogs.filter((log) => log.status === 'failed');
  }

  /**
   * 获取特定操作的请求日志
   */
  getRequestsByOperation(operation: string): RequestLog[] {
    return this.allLogs.filter((log) => log.operation === operation);
  }

  /**
   * 获取操作统计
   */
  getOperationStats(): Record<string, {
    count: number;
    successCount: number;
    failCount: number;
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
  }> {
    const stats: Record<string, any> = {};

    for (const log of this.allLogs) {
      if (!stats[log.operation]) {
        stats[log.operation] = {
          count: 0,
          successCount: 0,
          failCount: 0,
          totalDuration: 0,
          maxDuration: 0,
          minDuration: Infinity,
        };
      }

      const stat = stats[log.operation];
      stat.count++;
      if (log.status === 'success') stat.successCount++;
      if (log.status === 'failed') stat.failCount++;

      if (log.duration) {
        stat.totalDuration += log.duration;
        stat.maxDuration = Math.max(stat.maxDuration, log.duration);
        stat.minDuration = Math.min(stat.minDuration, log.duration);
      }
    }

    // 计算平均值并清理
    for (const stat of Object.values(stats)) {
      stat.averageDuration = stat.totalDuration / stat.count;
      delete stat.totalDuration;
      if (stat.minDuration === Infinity) {
        stat.minDuration = 0;
      }
    }

    return stats;
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): string {
    const stats = this.getOperationStats();

    let report = `
╔════════════════════════════════════════════════════════════════╗
║                   请求性能报告                                 ║
╚════════════════════════════════════════════════════════════════╝

📊 总体统计
├─ 总请求数: ${this.allLogs.length}
├─ 成功请求: ${this.allLogs.filter((l) => l.status === 'success').length}
├─ 失败请求: ${this.allLogs.filter((l) => l.status === 'failed').length}
└─ 活跃会话: ${this.sessionLogs.size}

⏱️ 操作性能
`;

    for (const [operation, stat] of Object.entries(stats)) {
      report += `
├─ ${operation}
│  ├─ 次数: ${stat.count}
│  ├─ 成功: ${stat.successCount}
│  ├─ 失败: ${stat.failCount}
│  ├─ 平均耗时: ${stat.averageDuration.toFixed(2)}ms
│  ├─ 最大耗时: ${stat.maxDuration.toFixed(2)}ms
│  └─ 最小耗时: ${stat.minDuration.toFixed(2)}ms
`;
    }

    report += `
═══════════════════════════════════════════════════════════════════`;

    return report;
  }

  /**
   * 导出日志数据
   */
  export(): {
    logs: RequestLog[];
    sessions: Record<string, RequestTrace>;
    timestamp: number;
  } {
    const sessions: Record<string, RequestTrace> = {};

    for (const [sessionId] of this.sessionLogs) {
      const trace = this.getSessionTrace(sessionId);
      if (trace) {
        sessions[sessionId] = trace;
      }
    }

    return {
      logs: [...this.allLogs],
      sessions,
      timestamp: Date.now(),
    };
  }

  /**
   * 清空日志
   */
  clear(): void {
    this.logs.clear();
    this.sessionLogs.clear();
    this.allLogs = [];
    logger.info('请求日志已清空');
  }
}

// 全局实例
let globalLogger: RequestLogger | null = null;

/**
 * 获取全局请求日志记录器
 */
export function getRequestLogger(): RequestLogger {
  if (!globalLogger) {
    globalLogger = new RequestLogger();
  }
  return globalLogger;
}

/**
 * 重置全局实例（用于测试）
 */
export function resetRequestLogger(): void {
  globalLogger = null;
}
