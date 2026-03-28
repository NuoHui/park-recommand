/**
 * 性能监控和指标收集模块
 * 功能：延迟收集、吞吐量统计、命中率计算、性能告警
 */

import { getLogger } from '@/logger/index.js';
import {
  MetricType,
  MetricSample,
  PerformanceSnapshot,
  AlertConfig,
  AlertEvent,
  MonitoringOptions,
} from './types.js';

const logger = getLogger();

export class MetricsCollector {
  private metrics: Map<string, MetricSample[]> = new Map();
  private alerts: AlertConfig[] = [];
  private alertListeners: ((event: AlertEvent) => void)[] = [];

  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalLatency: 0,
    cacheHits: 0,
    cacheAttempts: 0,
    startTime: Date.now(),
  };

  private latencies: number[] = [];
  private readonly options: Required<MonitoringOptions> = {
    enabled: true,
    sampleRetentionTime: 3600000, // 1 小时
    aggregationInterval: 60000, // 1 分钟
  };

  constructor(options: MonitoringOptions = {}) {
    Object.assign(this.options, options);

    logger.info('MetricsCollector 已初始化', {
      enabled: this.options.enabled,
      sampleRetentionTime: this.options.sampleRetentionTime,
      aggregationInterval: this.options.aggregationInterval,
    });

    // 定期清理过期样本
    setInterval(() => this.cleanupExpiredSamples(), this.options.aggregationInterval);
  }

  /**
   * 记录请求
   */
  recordRequest(latency: number, success: boolean, tags?: Record<string, string>): void {
    if (!this.options.enabled) return;

    this.stats.totalRequests++;
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }

    this.stats.totalLatency += latency;
    this.latencies.push(latency);

    // 记录指标
    const metric = success ? 'request:latency:success' : 'request:latency:error';
    this.recordMetric(metric, latency, tags);

    // 检查警报
    this.checkAlerts();
  }

  /**
   * 记录缓存命中
   */
  recordCacheHit(hit: boolean, latency?: number): void {
    if (!this.options.enabled) return;

    this.stats.cacheAttempts++;
    if (hit) {
      this.stats.cacheHits++;
      this.recordMetric('cache:hit', 1);
      if (latency !== undefined) {
        this.recordMetric('cache:latency:hit', latency);
      }
    } else {
      this.recordMetric('cache:miss', 1);
      if (latency !== undefined) {
        this.recordMetric('cache:latency:miss', latency);
      }
    }
  }

  /**
   * 记录错误
   */
  recordError(error: Error | string, context?: Record<string, any>): void {
    if (!this.options.enabled) return;

    const errorMessage = typeof error === 'string' ? error : error.message;
    this.recordMetric('error:count', 1, { error: errorMessage });

    logger.debug('错误已记录', { error: errorMessage, context });
  }

  /**
   * 记录指标值
   */
  private recordMetric(
    name: string,
    value: number,
    tags?: Record<string, string>,
  ): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const samples = this.metrics.get(name)!;
    samples.push({
      timestamp: Date.now(),
      value,
      tags,
    });
  }

  /**
   * 获取快照
   */
  getSnapshot(): PerformanceSnapshot {
    const now = Date.now();
    const duration = (now - this.stats.startTime) / 1000;

    // 计算百分位
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p99Index = Math.floor(sortedLatencies.length * 0.99);

    return {
      totalRequests: this.stats.totalRequests,
      successfulRequests: this.stats.successfulRequests,
      failedRequests: this.stats.failedRequests,
      averageLatency:
        this.stats.totalRequests > 0
          ? this.stats.totalLatency / this.stats.totalRequests
          : 0,
      minLatency: sortedLatencies.length > 0 ? sortedLatencies[0] : 0,
      maxLatency:
        sortedLatencies.length > 0
          ? sortedLatencies[sortedLatencies.length - 1]
          : 0,
      p95Latency:
        sortedLatencies.length > 0 ? sortedLatencies[p95Index] : 0,
      p99Latency:
        sortedLatencies.length > 0 ? sortedLatencies[p99Index] : 0,
      successRate:
        this.stats.totalRequests > 0
          ? this.stats.successfulRequests / this.stats.totalRequests
          : 0,
      cacheHitRate:
        this.stats.cacheAttempts > 0
          ? this.stats.cacheHits / this.stats.cacheAttempts
          : 0,
      throughput: duration > 0 ? this.stats.totalRequests / duration : 0,
      errorRate:
        this.stats.totalRequests > 0
          ? this.stats.failedRequests / this.stats.totalRequests
          : 0,
      timestamp: now,
    };
  }

  /**
   * 设置警报
   */
  setAlert(config: AlertConfig): void {
    this.alerts.push(config);
    logger.info('警报已设置', config);
  }

  /**
   * 移除警报
   */
  removeAlert(metric: string): void {
    const index = this.alerts.findIndex((a) => a.metric === metric);
    if (index !== -1) {
      this.alerts.splice(index, 1);
      logger.info('警报已移除', { metric });
    }
  }

  /**
   * 监听警报事件
   */
  onAlert(listener: (event: AlertEvent) => void): void {
    this.alertListeners.push(listener);
  }

  /**
   * 移除警报监听
   */
  offAlert(listener: (event: AlertEvent) => void): void {
    const index = this.alertListeners.indexOf(listener);
    if (index !== -1) {
      this.alertListeners.splice(index, 1);
    }
  }

  /**
   * 检查警报条件
   */
  private checkAlerts(): void {
    const snapshot = this.getSnapshot();

    for (const alert of this.alerts) {
      let currentValue = 0;
      let triggered = false;

      // 获取指标值
      if (alert.metric === 'error:rate') {
        currentValue = snapshot.errorRate;
      } else if (alert.metric === 'latency:p95') {
        currentValue = snapshot.p95Latency;
      } else if (alert.metric === 'latency:p99') {
        currentValue = snapshot.p99Latency;
      } else if (alert.metric === 'cache:hit:rate') {
        currentValue = snapshot.cacheHitRate;
      }

      // 检查阈值
      const threshold = alert.errorThreshold ?? alert.warningThreshold ?? 0;
      const operator = alert.operator ?? 'gt';

      switch (operator) {
        case 'gt':
          triggered = currentValue > threshold;
          break;
        case 'lt':
          triggered = currentValue < threshold;
          break;
        case 'eq':
          triggered = currentValue === threshold;
          break;
      }

      if (triggered) {
        this.emitAlert({
          metric: alert.metric,
          threshold,
          currentValue,
          level: alert.errorThreshold !== undefined ? 'error' : 'warning',
          timestamp: Date.now(),
          message: `Metric ${alert.metric} is ${currentValue} (threshold: ${threshold})`,
        });
      }
    }
  }

  /**
   * 发送警报事件
   */
  private emitAlert(event: AlertEvent): void {
    logger.warn('触发警报', event);

    for (const listener of this.alertListeners) {
      try {
        listener(event);
      } catch (error) {
        logger.error('警报监听器错误', { error });
      }
    }
  }

  /**
   * 清理过期样本
   */
  private cleanupExpiredSamples(): void {
    const now = Date.now();
    const threshold = now - this.options.sampleRetentionTime;

    for (const samples of this.metrics.values()) {
      let deleteCount = 0;
      for (let i = samples.length - 1; i >= 0; i--) {
        if (samples[i].timestamp < threshold) {
          samples.splice(i, 1);
          deleteCount++;
        }
      }

      if (deleteCount > 0) {
        logger.debug('已清理过期样本', { deleted: deleteCount });
      }
    }

    // 清理旧的延迟数据
    const cutoff = threshold;
    this.latencies = this.latencies.filter((latency) => {
      // 保留最近 1000 个样本或 1 小时内的数据
      return this.latencies.length <= 1000;
    });
  }

  /**
   * 获取所有指标
   */
  getAllMetrics(): Map<string, MetricSample[]> {
    return new Map(this.metrics);
  }

  /**
   * 重置指标
   */
  reset(): void {
    this.metrics.clear();
    this.latencies = [];
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalLatency: 0,
      cacheHits: 0,
      cacheAttempts: 0,
      startTime: Date.now(),
    };

    logger.info('指标已重置');
  }

  /**
   * 获取性能报告
   */
  getReport(): string {
    const snapshot = this.getSnapshot();

    return `
╔════════════════════════════════════════════════════════════════╗
║                      性能监控报告                              ║
╚════════════════════════════════════════════════════════════════╝

📊 请求统计
├─ 总请求数: ${snapshot.totalRequests}
├─ 成功请求: ${snapshot.successfulRequests}
├─ 失败请求: ${snapshot.failedRequests}
└─ 成功率: ${(snapshot.successRate * 100).toFixed(2)}%

⏱️ 延迟统计 (毫秒)
├─ 平均延迟: ${snapshot.averageLatency.toFixed(2)}
├─ 最小延迟: ${snapshot.minLatency.toFixed(2)}
├─ 最大延迟: ${snapshot.maxLatency.toFixed(2)}
├─ P95延迟: ${snapshot.p95Latency.toFixed(2)}
└─ P99延迟: ${snapshot.p99Latency.toFixed(2)}

💾 缓存统计
├─ 命中率: ${(snapshot.cacheHitRate * 100).toFixed(2)}%
└─ 吞吐量: ${snapshot.throughput.toFixed(2)} req/s

⚠️ 错误率: ${(snapshot.errorRate * 100).toFixed(2)}%

═══════════════════════════════════════════════════════════════════
    `;
  }
}

// 全局实例
let globalCollector: MetricsCollector | null = null;

/**
 * 获取全局指标收集器实例
 */
export function getMetricsCollector(options?: MonitoringOptions): MetricsCollector {
  if (!globalCollector) {
    globalCollector = new MetricsCollector(options);
  }
  return globalCollector;
}

/**
 * 重置全局实例（用于测试）
 */
export function resetMetricsCollector(): void {
  globalCollector = null;
}

// Re-export types for convenience
export type { PerformanceSnapshot, AlertConfig, AlertEvent, MonitoringOptions } from './types.js';
