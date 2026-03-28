/**
 * 日志聚合器
 * 功能：收集所有日志数据，生成完整的诊断报告
 */

import { getLogger } from '@/logger/index.js';
import { getErrorTracker, type ErrorStatistics } from './error-tracker.js';
import { getRequestLogger, type RequestTrace } from './request-logger.js';
import { getMetricsCollector, type PerformanceSnapshot } from './metrics-collector.js';
import * as fs from 'fs';
import * as path from 'path';

export interface LogSnapshot {
  timestamp: number;
  sessionId: string;
  errors: {
    total: number;
    byCriteria: Record<string, number>;
    byModule: Record<string, number>;
    byCategory: Record<string, number>;
    unresolved: number;
  };
  requests: {
    total: number;
    successful: number;
    failed: number;
    slowRequests: number;
    averageDuration: number;
  };
  performance: {
    totalRequests: number;
    successRate: number;
    averageLatency: number;
    p95Latency: number;
    p99Latency: number;
    cacheHitRate: number;
    errorRate: number;
    throughput: number;
  };
}

export interface DiagnosticReport {
  title: string;
  summary: string;
  snapshot: LogSnapshot;
  recommendations: string[];
  generatedAt: Date;
}

const logger = getLogger();

export class LogAggregator {
  private snapshots: LogSnapshot[] = [];
  private readonly maxSnapshots = 100;

  /**
   * 捕获当前状态快照
   */
  captureSnapshot(sessionId: string): LogSnapshot {
    const errorTracker = getErrorTracker();
    const requestLogger = getRequestLogger();
    const metricsCollector = getMetricsCollector();

    const errorStats = errorTracker.getStatistics();
    const performanceSnapshot = metricsCollector.getSnapshot();
    const requestStats = requestLogger.export();

    const trace = requestLogger.getSessionTrace(sessionId);

    const snapshot: LogSnapshot = {
      timestamp: Date.now(),
      sessionId,
      errors: {
        total: errorStats.total,
        byCriteria: errorStats.byCriteria,
        byModule: errorStats.byModule,
        byCategory: errorStats.byCategory,
        unresolved: errorTracker.getUnresolvedErrors().length,
      },
      requests: {
        total: trace?.totalRequests || 0,
        successful: trace?.successfulRequests || 0,
        failed: trace?.failedRequests || 0,
        slowRequests: requestLogger.getSlowRequests(1000).length,
        averageDuration: trace?.averageDuration || 0,
      },
      performance: {
        totalRequests: performanceSnapshot.totalRequests,
        successRate: performanceSnapshot.successRate,
        averageLatency: performanceSnapshot.averageLatency,
        p95Latency: performanceSnapshot.p95Latency,
        p99Latency: performanceSnapshot.p99Latency,
        cacheHitRate: performanceSnapshot.cacheHitRate,
        errorRate: performanceSnapshot.errorRate,
        throughput: performanceSnapshot.throughput,
      },
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * 生成诊断报告
   */
  generateDiagnosticReport(sessionId: string): DiagnosticReport {
    const snapshot = this.captureSnapshot(sessionId);
    const recommendations = this.analyzeAndRecommend(snapshot);

    const summary = this.generateSummary(snapshot);

    return {
      title: `诊断报告 - 会话 ${sessionId}`,
      summary,
      snapshot,
      recommendations,
      generatedAt: new Date(),
    };
  }

  /**
   * 生成摘要
   */
  private generateSummary(snapshot: LogSnapshot): string {
    const errorCount = snapshot.errors.total;
    const successRate = snapshot.performance.successRate;
    const cacheHitRate = snapshot.performance.cacheHitRate;

    let status = '✅ 正常';
    if (errorCount > 10 || successRate < 0.95) {
      status = '⚠️ 警告';
    }
    if (errorCount > 20 || successRate < 0.9) {
      status = '🔴 严重';
    }

    return `${status} - 错误: ${errorCount}, 成功率: ${(successRate * 100).toFixed(2)}%, 缓存命中率: ${(cacheHitRate * 100).toFixed(2)}%`;
  }

  /**
   * 分析数据并生成建议
   */
  private analyzeAndRecommend(snapshot: LogSnapshot): string[] {
    const recommendations: string[] = [];

    // 错误分析
    if (snapshot.errors.total > 10) {
      recommendations.push('⚠️ 错误数量较多，建议检查错误日志进行排查');
    }

    if (snapshot.errors.byCriteria['level:critical']) {
      recommendations.push('🔴 存在严重错误，需要立即处理');
    }

    // 性能分析
    if (snapshot.performance.p95Latency > 2000) {
      recommendations.push('⏱️ P95 延迟较高，建议优化查询性能');
    }

    if (snapshot.performance.errorRate > 0.05) {
      recommendations.push('❌ 错误率超过 5%，建议检查服务健康状况');
    }

    // 缓存分析
    if (snapshot.performance.cacheHitRate < 0.5) {
      recommendations.push('💾 缓存命中率低于 50%，可能需要调整缓存策略');
    }

    // 慢请求分析
    if (snapshot.requests.slowRequests > 5) {
      recommendations.push(`🐢 检测到 ${snapshot.requests.slowRequests} 个慢请求，建议优化');
    }

    // 成功率分析
    if (snapshot.performance.successRate < 0.95) {
      recommendations.push('📊 成功率低于 95%，需要改进稳定性');
    }

    // 吞吐量分析
    if (snapshot.performance.throughput < 1) {
      recommendations.push('📈 吞吐量较低，可能存在瓶颈');
    }

    // 如果没有问题
    if (recommendations.length === 0) {
      recommendations.push('✅ 系统运行正常，无需改进建议');
    }

    return recommendations;
  }

  /**
   * 获取趋势分析
   */
  getTrendAnalysis(): {
    latencyTrend: 'improving' | 'stable' | 'degrading';
    errorTrend: 'decreasing' | 'stable' | 'increasing';
    cacheTrend: 'improving' | 'stable' | 'degrading';
  } {
    if (this.snapshots.length < 2) {
      return {
        latencyTrend: 'stable',
        errorTrend: 'stable',
        cacheTrend: 'stable',
      };
    }

    const recent = this.snapshots.slice(-5);
    if (recent.length < 2) {
      return {
        latencyTrend: 'stable',
        errorTrend: 'stable',
        cacheTrend: 'stable',
      };
    }

    const latencies = recent.map((s) => s.performance.averageLatency);
    const errors = recent.map((s) => s.errors.total);
    const caches = recent.map((s) => s.performance.cacheHitRate);

    const latencyTrend = this.calculateTrend(latencies);
    const errorTrend = this.calculateTrend(errors);
    const cacheTrend = this.calculateTrend(caches);

    return {
      latencyTrend: latencyTrend === 'up' ? 'degrading' : latencyTrend === 'down' ? 'improving' : 'stable',
      errorTrend: errorTrend === 'up' ? 'increasing' : errorTrend === 'down' ? 'decreasing' : 'stable',
      cacheTrend: cacheTrend === 'up' ? 'improving' : cacheTrend === 'down' ? 'degrading' : 'stable',
    };
  }

  /**
   * 计算趋势（升、降、稳定）
   */
  private calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable';

    const first = values[0];
    const last = values[values.length - 1];
    const diff = last - first;
    const threshold = Math.abs(first) * 0.1; // 10% 变化阈值

    if (Math.abs(diff) < threshold) return 'stable';
    return diff > 0 ? 'up' : 'down';
  }

  /**
   * 导出完整诊断报告为文件
   */
  async exportReport(sessionId: string, outputDir: string = './reports'): Promise<string> {
    const report = this.generateDiagnosticReport(sessionId);

    // 创建输出目录
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `diagnostic-report-${sessionId}-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    // 序列化报告
    const content = JSON.stringify(report, null, 2);

    // 写入文件
    fs.writeFileSync(filepath, content, 'utf-8');

    logger.info('诊断报告已导出', {
      data: { filepath },
    });

    return filepath;
  }

  /**
   * 生成完整的测试报告
   */
  generateFullReport(): string {
    const errorTracker = getErrorTracker();
    const requestLogger = getRequestLogger();
    const metricsCollector = getMetricsCollector();

    let report = `
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                        完整日志和诊断报告                                  ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

⏰ 生成时间: ${new Date().toISOString()}

📋 快照统计
├─ 总快照数: ${this.snapshots.length}
└─ 最新快照时间: ${this.snapshots.length > 0 ? new Date(this.snapshots[this.snapshots.length - 1].timestamp).toISOString() : 'N/A'}

`;

    // 添加各个报告
    report += errorTracker.getReport();
    report += '\n\n';
    report += requestLogger.getPerformanceReport();
    report += '\n\n';
    report += metricsCollector.getReport();

    // 添加趋势分析
    const trend = this.getTrendAnalysis();
    report += `

📈 趋势分析
├─ 延迟趋势: ${trend.latencyTrend}
├─ 错误趋势: ${trend.errorTrend}
└─ 缓存趋势: ${trend.cacheTrend}

═══════════════════════════════════════════════════════════════════════════`;

    return report;
  }

  /**
   * 获取所有快照
   */
  getSnapshots(): LogSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * 清空快照
   */
  clear(): void {
    this.snapshots = [];
  }
}

// 全局实例
let globalAggregator: LogAggregator | null = null;

/**
 * 获取全局日志聚合器
 */
export function getLogAggregator(): LogAggregator {
  if (!globalAggregator) {
    globalAggregator = new LogAggregator();
  }
  return globalAggregator;
}

/**
 * 重置全局实例（用于测试）
 */
export function resetLogAggregator(): void {
  globalAggregator = null;
}
