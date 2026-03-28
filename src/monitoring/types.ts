/**
 * 性能监控系统 - 类型定义
 */

/** 指标类型 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

/** 指标样本 */
export interface MetricSample {
  timestamp: number;
  value: number;
  tags?: Record<string, string>;
}

/** 指标数据 */
export interface MetricData {
  name: string;
  type: MetricType;
  description: string;
  unit?: string;
  samples: MetricSample[];
}

/** 性能指标快照 */
export interface PerformanceSnapshot {
  /** 总请求数 */
  totalRequests: number;
  /** 成功请求数 */
  successfulRequests: number;
  /** 失败请求数 */
  failedRequests: number;
  /** 平均响应时间（毫秒） */
  averageLatency: number;
  /** 最小响应时间（毫秒） */
  minLatency: number;
  /** 最大响应时间（毫秒） */
  maxLatency: number;
  /** 第 95 百分位响应时间（毫秒） */
  p95Latency: number;
  /** 第 99 百分位响应时间（毫秒） */
  p99Latency: number;
  /** 成功率 */
  successRate: number;
  /** 缓存命中率 */
  cacheHitRate: number;
  /** 吞吐量（请求/秒） */
  throughput: number;
  /** 错误率 */
  errorRate: number;
  /** 采样时间戳 */
  timestamp: number;
}

/** 监控报警配置 */
export interface AlertConfig {
  /** 指标名称 */
  metric: string;
  /** 警告阈值 */
  warningThreshold?: number;
  /** 错误阈值 */
  errorThreshold?: number;
  /** 对比方式：'gt'(大于), 'lt'(小于), 'eq'(等于) */
  operator?: 'gt' | 'lt' | 'eq';
}

/** 报警事件 */
export interface AlertEvent {
  metric: string;
  threshold: number;
  currentValue: number;
  level: 'warning' | 'error';
  timestamp: number;
  message: string;
}

/** 监控选项 */
export interface MonitoringOptions {
  /** 是否启用 */
  enabled?: boolean;
  /** 样本保留时间（毫秒） */
  sampleRetentionTime?: number;
  /** 聚合间隔（毫秒） */
  aggregationInterval?: number;
}
