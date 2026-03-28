/**
 * 请求队列管理系统
 * 功能：优先级队列、请求去重、并发控制、超时管理、错误恢复
 */

import { getLogger } from '@/logger/index.js';
import {
  RequestConfig,
  RequestPriority,
  RequestStatus,
  QueuedRequest,
  QueueStats,
  QueueEventType,
  QueueEvent,
  QueueEventListener,
  QueueOptions,
} from './types.js';

const logger = getLogger('RequestQueue');

export class RequestQueue {
  private queue: QueuedRequest[] = [];
  private running: Set<string> = new Set();
  private deduplicationMap: Map<string, string> = new Map();
  private eventListeners: QueueEventListener[] = [];

  private readonly maxConcurrency: number;
  private readonly defaultTimeout: number;
  private readonly maxRetries: number;
  private readonly deduplication: boolean;
  private readonly maxQueueSize: number;

  private stats = {
    total: 0,
    completed: 0,
    failed: 0,
    totalTime: 0,
    deduplicationSaved: 0,
  };

  constructor(options: QueueOptions = {}) {
    this.maxConcurrency = options.maxConcurrency ?? 10;
    this.defaultTimeout = options.defaultTimeout ?? 30000;
    this.maxRetries = options.maxRetries ?? 3;
    this.deduplication = options.deduplication !== false;
    this.maxQueueSize = options.maxQueueSize ?? 1000;

    logger.info('RequestQueue 已初始化', {
      maxConcurrency: this.maxConcurrency,
      defaultTimeout: this.defaultTimeout,
      maxRetries: this.maxRetries,
      deduplication: this.deduplication,
    });
  }

  /**
   * 添加请求到队列
   */
  async add(config: RequestConfig): Promise<string> {
    // 检查队列大小
    if (this.queue.length >= this.maxQueueSize) {
      this.emit(QueueEventType.QUEUE_FULL, config.id);
      throw new Error(`Request queue is full (max: ${this.maxQueueSize})`);
    }

    // 检查去重
    if (this.deduplication && this.deduplicationMap.has(config.id)) {
      const existingId = this.deduplicationMap.get(config.id)!;
      this.stats.deduplicationSaved++;
      logger.debug('请求已去重', { id: config.id, existingId });
      return existingId;
    }

    // 创建队列项
    const queuedRequest: QueuedRequest = {
      ...config,
      createdAt: Date.now(),
      retryCount: 0,
      status: RequestStatus.PENDING,
    };

    // 添加到去重表
    if (this.deduplication) {
      this.deduplicationMap.set(config.id, config.id);
    }

    // 添加到队列并排序
    this.queue.push(queuedRequest);
    this.sort();

    this.stats.total++;
    this.emit(QueueEventType.REQUEST_ADDED, config.id, {
      priority: config.priority,
      queueLength: this.queue.length,
    });

    logger.debug('请求已添加到队列', {
      id: config.id,
      priority: config.priority,
      queueLength: this.queue.length,
    });

    // 尝试处理队列
    this.process();

    return config.id;
  }

  /**
   * 处理队列中的请求
   */
  private async process(): Promise<void> {
    // 检查是否可以处理新请求
    while (this.running.size < this.maxConcurrency && this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) break;

      this.running.add(request.id);
      request.status = RequestStatus.RUNNING;
      request.startedAt = Date.now();

      this.emit(QueueEventType.REQUEST_STARTED, request.id);

      // 异步执行请求（不等待）
      this.executeRequest(request).catch(() => {
        // 错误已在 executeRequest 中处理
      });
    }

    // 队列为空时触发事件
    if (this.queue.length === 0 && this.running.size === 0) {
      this.emit(QueueEventType.QUEUE_EMPTY, 'queue');
    }
  }

  /**
   * 执行单个请求
   */
  private async executeRequest(request: QueuedRequest): Promise<void> {
    const timeout = request.timeout ?? this.defaultTimeout;
    const maxRetries = request.maxRetries ?? this.maxRetries;

    try {
      // 创建带超时的 Promise
      const result = await Promise.race([
        request.executor(),
        this.createTimeoutPromise(timeout),
      ]);

      request.status = RequestStatus.COMPLETED;
      request.result = result;
      request.completedAt = Date.now();

      this.updateStats(request);
      this.emit(QueueEventType.REQUEST_COMPLETED, request.id, { result });

      logger.debug('请求已完成', {
        id: request.id,
        duration: request.completedAt - request.startedAt!,
      });
    } catch (error) {
      const err = error as Error;

      // 检查是否是超时错误
      if (err.message === 'Request timeout') {
        request.status = RequestStatus.TIMEOUT;
        request.error = err;
        request.completedAt = Date.now();

        this.updateStats(request);
        this.emit(QueueEventType.REQUEST_TIMEOUT, request.id);

        logger.warn('请求超时', {
          id: request.id,
          timeout,
          duration: request.completedAt - request.startedAt!,
        });

        // 检查是否需要重试
        if (request.retryable && request.retryCount < maxRetries) {
          await this.retry(request);
        }
      } else {
        // 其他错误
        request.retryCount++;

        // 检查是否需要重试
        if (
          request.retryable &&
          request.retryCount <= maxRetries
        ) {
          logger.debug('正在重试请求', {
            id: request.id,
            retryCount: request.retryCount,
            error: err.message,
          });

          this.emit(QueueEventType.REQUEST_RETRIED, request.id, {
            retryCount: request.retryCount,
            error: err.message,
          });

          await this.retry(request);
        } else {
          // 不重试或重试次数已满
          request.status = RequestStatus.FAILED;
          request.error = err;
          request.completedAt = Date.now();

          this.updateStats(request);
          this.emit(QueueEventType.REQUEST_FAILED, request.id, {
            error: err.message,
            retryCount: request.retryCount,
          });

          logger.error('请求失败', {
            id: request.id,
            error: err.message,
            retryCount: request.retryCount,
          });
        }
      }
    } finally {
      // 从运行集合中移除
      this.running.delete(request.id);

      // 继续处理下一个请求
      this.process();
    }
  }

  /**
   * 重试请求
   */
  private async retry(request: QueuedRequest): Promise<void> {
    request.status = RequestStatus.PENDING;
    request.startedAt = undefined;
    request.completedAt = undefined;
    request.result = undefined;

    // 根据优先级重新加入队列
    const priority = request.priority;
    let inserted = false;

    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority < priority) {
        this.queue.splice(i, 0, request);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.queue.push(request);
    }

    // 继续处理
    this.process();
  }

  /**
   * 创建超时 Promise
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeout);
    });
  }

  /**
   * 更新统计信息
   */
  private updateStats(request: QueuedRequest): void {
    if (request.status === RequestStatus.COMPLETED) {
      this.stats.completed++;
      const duration = request.completedAt! - request.startedAt!;
      this.stats.totalTime += duration;
    } else if (request.status === RequestStatus.FAILED || request.status === RequestStatus.TIMEOUT) {
      this.stats.failed++;
    }
  }

  /**
   * 对队列进行排序（优先级 + FIFO）
   */
  private sort(): void {
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * 取消请求
   */
  cancel(requestId: string): boolean {
    const index = this.queue.findIndex((r) => r.id === requestId);
    if (index !== -1) {
      const request = this.queue[index];
      request.status = RequestStatus.CANCELLED;
      this.queue.splice(index, 1);
      this.emit(QueueEventType.REQUEST_COMPLETED, requestId);
      return true;
    }
    return false;
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
    this.deduplicationMap.clear();
    logger.info('请求队列已清空');
  }

  /**
   * 获取队列统计信息
   */
  getStats(): QueueStats {
    const completed = this.stats.completed;
    const failed = this.stats.failed;
    const total = this.stats.total;

    return {
      total,
      pending: this.queue.length,
      running: this.running.size,
      completed,
      failed,
      cancelled: total - completed - failed - this.queue.length - this.running.size,
      totalTime: this.stats.totalTime,
      averageTime: completed > 0 ? this.stats.totalTime / completed : 0,
      deduplicationSaved: this.stats.deduplicationSaved,
      successRate: total > 0 ? completed / total : 0,
    };
  }

  /**
   * 获取队列中的请求列表
   */
  getQueue(): Readonly<QueuedRequest[]> {
    return Object.freeze([...this.queue]);
  }

  /**
   * 监听队列事件
   */
  on(listener: QueueEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * 移除事件监听
   */
  off(listener: QueueEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index !== -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * 发送事件
   */
  private emit(type: QueueEventType, requestId: string, data?: any): void {
    const event: QueueEvent = {
      type,
      requestId,
      timestamp: Date.now(),
      data,
    };

    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        logger.error('事件监听器错误', { error });
      }
    }
  }

  /**
   * 等待所有请求完成
   */
  async drain(): Promise<void> {
    while (this.queue.length > 0 || this.running.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * 获取运行中的请求数
   */
  getRunningCount(): number {
    return this.running.size;
  }

  /**
   * 获取待处理的请求数
   */
  getPendingCount(): number {
    return this.queue.length;
  }
}

// 创建全局实例
let globalQueue: RequestQueue | null = null;

/**
 * 获取全局请求队列实例
 */
export function getRequestQueue(options?: QueueOptions): RequestQueue {
  if (!globalQueue) {
    globalQueue = new RequestQueue(options);
  }
  return globalQueue;
}

/**
 * 重置全局实例（用于测试）
 */
export function resetRequestQueue(): void {
  globalQueue = null;
}
