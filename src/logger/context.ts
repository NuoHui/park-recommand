/**
 * 日志上下文管理
 */

import { v4 as uuidv4 } from 'uuid';
import type { LogContext } from './types.js';

/**
 * 异步本地存储用于上下文管理
 */
const contextStorage = new Map<string, LogContext>();

/**
 * 生成操作 ID
 */
export function generateOperationId(): string {
  return uuidv4();
}

/**
 * 生成会话 ID
 */
export function generateSessionId(): string {
  return uuidv4();
}

/**
 * 日志上下文管理器
 */
export class LogContextManager {
  private static instance: LogContextManager | null = null;
  private contexts: Map<string, LogContext> = new Map();
  private currentContextId: string | null = null;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): LogContextManager {
    if (!LogContextManager.instance) {
      LogContextManager.instance = new LogContextManager();
    }
    return LogContextManager.instance;
  }

  /**
   * 创建新上下文
   */
  public createContext(initialContext?: Partial<LogContext>): string {
    const contextId = generateOperationId();

    const context: LogContext = {
      operationId: initialContext?.operationId || generateOperationId(),
      sessionId: initialContext?.sessionId || generateSessionId(),
      ...initialContext,
    };

    this.contexts.set(contextId, context);
    return contextId;
  }

  /**
   * 设置当前上下文
   */
  public setCurrentContext(contextId: string): void {
    if (!this.contexts.has(contextId)) {
      throw new Error(`Context not found: ${contextId}`);
    }
    this.currentContextId = contextId;
  }

  /**
   * 获取当前上下文
   */
  public getCurrentContext(): LogContext | null {
    if (!this.currentContextId) {
      return null;
    }
    return this.contexts.get(this.currentContextId) || null;
  }

  /**
   * 获取指定上下文
   */
  public getContext(contextId: string): LogContext | null {
    return this.contexts.get(contextId) || null;
  }

  /**
   * 更新当前上下文
   */
  public updateCurrentContext(updates: Partial<LogContext>): void {
    if (!this.currentContextId) {
      throw new Error('No current context set');
    }

    const context = this.contexts.get(this.currentContextId);
    if (!context) {
      throw new Error(`Context not found: ${this.currentContextId}`);
    }

    this.contexts.set(this.currentContextId, {
      ...context,
      ...updates,
    });
  }

  /**
   * 删除上下文
   */
  public deleteContext(contextId: string): void {
    if (this.currentContextId === contextId) {
      this.currentContextId = null;
    }
    this.contexts.delete(contextId);
  }

  /**
   * 清除所有上下文
   */
  public clearAllContexts(): void {
    this.contexts.clear();
    this.currentContextId = null;
  }

  /**
   * 获取所有上下文
   */
  public getAllContexts(): Map<string, LogContext> {
    return new Map(this.contexts);
  }

  /**
   * 根据条件查找上下文
   */
  public findContexts(predicate: (context: LogContext) => boolean): LogContext[] {
    const results: LogContext[] = [];
    for (const context of this.contexts.values()) {
      if (predicate(context)) {
        results.push(context);
      }
    }
    return results;
  }

  /**
   * 根据模块名查找上下文
   */
  public findContextsByModule(module: string): LogContext[] {
    return this.findContexts((ctx) => ctx.module === module);
  }

  /**
   * 根据会话 ID 查找上下文
   */
  public findContextsBySessionId(sessionId: string): LogContext[] {
    return this.findContexts((ctx) => ctx.sessionId === sessionId);
  }

  /**
   * 重置管理器
   */
  public reset(): void {
    this.contexts.clear();
    this.currentContextId = null;
  }
}

/**
 * 执行带上下文的异步操作
 */
export async function withContext<T>(
  context: Partial<LogContext>,
  fn: (contextId: string) => Promise<T>
): Promise<T> {
  const manager = LogContextManager.getInstance();
  const contextId = manager.createContext(context);

  try {
    manager.setCurrentContext(contextId);
    return await fn(contextId);
  } finally {
    manager.deleteContext(contextId);
  }
}

/**
 * 执行带上下文的同步操作
 */
export function withContextSync<T>(
  context: Partial<LogContext>,
  fn: (contextId: string) => T
): T {
  const manager = LogContextManager.getInstance();
  const contextId = manager.createContext(context);

  try {
    manager.setCurrentContext(contextId);
    return fn(contextId);
  } finally {
    manager.deleteContext(contextId);
  }
}

/**
 * 创建上下文装饰器（用于异步函数）
 */
export function createContextDecorator(context: Partial<LogContext>) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: T
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return async function (...args: Parameters<T>): Promise<ReturnType<T>> {
      return withContext(context, async () => target(...args));
    };
  };
}

export default LogContextManager;
