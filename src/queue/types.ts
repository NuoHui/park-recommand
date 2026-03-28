/**
 * 请求队列管理系统 - 类型定义
 * 支持优先级队列、去重、并发控制和超时管理
 */

/** 请求优先级枚举 */
export enum RequestPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3,
}

/** 请求状态枚举 */
export enum RequestStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
}

/** 请求配置接口 */
export interface RequestConfig {
  /** 请求 ID（用于去重） */
  id: string;
  /** 请求优先级 */
  priority: RequestPriority;
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 是否可重试 */
  retryable?: boolean;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 自定义标签（用于去重和分类） */
  tags?: string[];
  /** 请求执行函数 */
  executor: () => Promise<any>;
}

/** 请求队列项 */
export interface QueuedRequest extends RequestConfig {
  /** 创建时间 */
  createdAt: number;
  /** 开始执行时间 */
  startedAt?: number;
  /** 完成时间 */
  completedAt?: number;
  /** 当前重试次数 */
  retryCount: number;
  /** 请求状态 */
  status: RequestStatus;
  /** 执行结果 */
  result?: any;
  /** 错误信息 */
  error?: Error;
}

/** 队列统计信息 */
export interface QueueStats {
  /** 总请求数 */
  total: number;
  /** 待处理 */
  pending: number;
  /** 运行中 */
  running: number;
  /** 已完成 */
  completed: number;
  /** 已失败 */
  failed: number;
  /** 已取消 */
  cancelled: number;
  /** 总耗时（毫秒） */
  totalTime: number;
  /** 平均耗时（毫秒） */
  averageTime: number;
  /** 去重节省数 */
  deduplicationSaved: number;
  /** 成功率 */
  successRate: number;
}

/** 队列事件类型 */
export enum QueueEventType {
  REQUEST_ADDED = 'request:added',
  REQUEST_STARTED = 'request:started',
  REQUEST_COMPLETED = 'request:completed',
  REQUEST_FAILED = 'request:failed',
  REQUEST_TIMEOUT = 'request:timeout',
  REQUEST_RETRIED = 'request:retried',
  QUEUE_FULL = 'queue:full',
  QUEUE_EMPTY = 'queue:empty',
}

/** 队列事件 */
export interface QueueEvent {
  type: QueueEventType;
  requestId: string;
  timestamp: number;
  data?: any;
}

/** 队列事件监听器 */
export type QueueEventListener = (event: QueueEvent) => void;

/** 请求队列选项 */
export interface QueueOptions {
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 全局超时时间（毫秒） */
  defaultTimeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 是否启用去重 */
  deduplication?: boolean;
  /** 队列最大长度 */
  maxQueueSize?: number;
}
