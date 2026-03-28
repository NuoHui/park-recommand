/**
 * 并发控制器
 * 限制同时进行的任务数
 */

import { createLogger } from '@/utils/logger';

const logger = createLogger('harness:concurrency-controller');

/**
 * 任务信息
 */
interface TaskInfo {
  taskId: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

/**
 * 并发控制器
 */
export class ConcurrencyController {
  private maxConcurrent: number;
  private activeCount: number = 0;
  private pendingQueue: Array<() => Promise<void>> = [];
  private tasks: Map<string, TaskInfo> = new Map();

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
    logger.debug('并发控制器初始化', { maxConcurrent });
  }

  /**
   * 执行一个受控制的任务
   */
  async execute<T>(taskId: string, fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const wrappedFn = async () => {
        const taskInfo: TaskInfo = {
          taskId,
          createdAt: Date.now(),
          status: 'running',
          startedAt: Date.now(),
        };

        this.tasks.set(taskId, taskInfo);
        this.activeCount++;

        logger.debug('任务开始执行', {
          taskId,
          activeCount: this.activeCount,
          pendingCount: this.pendingQueue.length,
        });

        try {
          const result = await fn();
          taskInfo.status = 'completed';
          taskInfo.completedAt = Date.now();

          logger.debug('任务执行成功', {
            taskId,
            duration: taskInfo.completedAt - (taskInfo.startedAt || 0),
          });

          resolve(result);
        } catch (error) {
          taskInfo.status = 'failed';
          taskInfo.completedAt = Date.now();

          logger.error('任务执行失败', {
            taskId,
            error: (error as Error).message,
            duration: taskInfo.completedAt - (taskInfo.startedAt || 0),
          });

          reject(error);
        } finally {
          this.activeCount--;
          this.processPending();
        }
      };

      // 如果还有空闲容量，直接执行
      if (this.activeCount < this.maxConcurrent) {
        wrappedFn();
      } else {
        // 否则加入队列
        this.pendingQueue.push(wrappedFn);

        const taskInfo: TaskInfo = {
          taskId,
          createdAt: Date.now(),
          status: 'pending',
        };
        this.tasks.set(taskId, taskInfo);

        logger.debug('任务已加入队列', {
          taskId,
          queueSize: this.pendingQueue.length,
        });
      }
    });
  }

  /**
   * 处理待处理队列
   */
  private processPending(): void {
    if (this.pendingQueue.length === 0 || this.activeCount >= this.maxConcurrent) {
      return;
    }

    const fn = this.pendingQueue.shift();
    if (fn) {
      fn();
    }
  }

  /**
   * 获取当前活跃任务数
   */
  getActiveCount(): number {
    return this.activeCount;
  }

  /**
   * 获取待处理任务数
   */
  getPendingCount(): number {
    return this.pendingQueue.length;
  }

  /**
   * 获取总任务数（包括已完成）
   */
  getTotalTasks(): number {
    return this.tasks.size;
  }

  /**
   * 检查是否可以立即执行（不需等待）
   */
  canExecuteNow(): boolean {
    return this.activeCount < this.maxConcurrent;
  }

  /**
   * 获取任务信息
   */
  getTaskInfo(taskId: string): TaskInfo | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): TaskInfo[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取活跃任务
   */
  getActiveTasks(): TaskInfo[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'running');
  }

  /**
   * 获取待处理任务
   */
  getPendingTasks(): TaskInfo[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'pending');
  }

  /**
   * 获取已完成任务
   */
  getCompletedTasks(): TaskInfo[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'completed');
  }

  /**
   * 获取失败任务
   */
  getFailedTasks(): TaskInfo[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'failed');
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    maxConcurrent: number;
    activeCount: number;
    pendingCount: number;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    utilizationRate: number;
  } {
    const allTasks = Array.from(this.tasks.values());
    const completedTasks = allTasks.filter((t) => t.status === 'completed').length;
    const failedTasks = allTasks.filter((t) => t.status === 'failed').length;

    return {
      maxConcurrent: this.maxConcurrent,
      activeCount: this.activeCount,
      pendingCount: this.pendingQueue.length,
      totalTasks: this.tasks.size,
      completedTasks,
      failedTasks,
      utilizationRate: (this.activeCount / this.maxConcurrent) * 100,
    };
  }

  /**
   * 更新最大并发数
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, max);
    logger.debug(`最大并发数已更新: ${this.maxConcurrent}`);

    // 处理待处理队列
    this.processPending();
  }

  /**
   * 清空任务历史（不包括活跃任务）
   */
  clearHistory(): void {
    const activeTasks = this.getActiveTasks();
    this.tasks.clear();

    activeTasks.forEach((task) => {
      this.tasks.set(task.taskId, task);
    });

    logger.debug('任务历史已清空');
  }

  /**
   * 等待所有任务完成
   */
  async waitAll(timeout?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkCompletion = () => {
        if (this.activeCount === 0 && this.pendingQueue.length === 0) {
          resolve();
        } else {
          setTimeout(checkCompletion, 100);
        }
      };

      if (timeout) {
        const timeoutId = setTimeout(() => {
          reject(new Error(`等待超时 (${timeout}ms)`));
        }, timeout);

        const originalResolve = resolve;
        resolve = (...args: any[]) => {
          clearTimeout(timeoutId);
          originalResolve(...args);
        };
      }

      checkCompletion();
    });
  }
}
