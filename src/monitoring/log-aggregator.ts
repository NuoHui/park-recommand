/**
 * Log Aggregator
 * Collects all log data and generates complete diagnostic reports
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
   * Capture current state snapshot
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
   * Generate diagnostic report
   */
  generateDiagnosticReport(sessionId: string): DiagnosticReport {
    const snapshot = this.captureSnapshot(sessionId);
    const recommendations = this.analyzeAndRecommend(snapshot);

    const summary = this.generateSummary(snapshot);

    return {
      title: `Diagnostic Report - Session ${sessionId}`,
      summary,
      snapshot,
      recommendations,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate summary
   */
  private generateSummary(snapshot: LogSnapshot): string {
    const errorCount = snapshot.errors.total;
    const successRate = snapshot.performance.successRate;
    const cacheHitRate = snapshot.performance.cacheHitRate;

    let status = 'OK';
    if (errorCount > 10 || successRate < 0.95) {
      status = 'WARNING';
    }
    if (errorCount > 20 || successRate < 0.9) {
      status = 'CRITICAL';
    }

    return `${status} - Errors: ${errorCount}, Success Rate: ${(successRate * 100).toFixed(2)}%, Cache Hit Rate: ${(cacheHitRate * 100).toFixed(2)}%`;
  }

  /**
   * Analyze data and generate recommendations
   */
  private analyzeAndRecommend(snapshot: LogSnapshot): string[] {
    const recommendations: string[] = [];

    // Error analysis
    if (snapshot.errors.total > 10) {
      recommendations.push('Too many errors, check error logs');
    }

    if (snapshot.errors.byCriteria['level:critical']) {
      recommendations.push('Critical errors found, immediate action needed');
    }

    // Performance analysis
    if (snapshot.performance.p95Latency > 2000) {
      recommendations.push('High P95 latency, optimize query performance');
    }

    if (snapshot.performance.errorRate > 0.05) {
      recommendations.push('Error rate above 5%, check service health');
    }

    // Cache analysis
    if (snapshot.performance.cacheHitRate < 0.5) {
      recommendations.push('Cache hit rate below 50%, consider cache strategy adjustment');
    }

    // Slow request analysis
    if (snapshot.requests.slowRequests > 5) {
      recommendations.push(
        `Detected ${snapshot.requests.slowRequests} slow requests, optimize performance`,
      );
    }

    // Success rate analysis
    if (snapshot.performance.successRate < 0.95) {
      recommendations.push('Success rate below 95%, improve stability');
    }

    // Throughput analysis
    if (snapshot.performance.throughput < 1) {
      recommendations.push('Low throughput, potential bottleneck');
    }

    // No issues
    if (recommendations.length === 0) {
      recommendations.push('System running normally, no improvement suggestions');
    }

    return recommendations;
  }

  /**
   * Get trend analysis
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
   * Calculate trend (up, down, stable)
   */
  private calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable';

    const first = values[0];
    const last = values[values.length - 1];
    const diff = last - first;
    const threshold = Math.abs(first) * 0.1; // 10% change threshold

    if (Math.abs(diff) < threshold) return 'stable';
    return diff > 0 ? 'up' : 'down';
  }

  /**
   * Export complete diagnostic report as file
   */
  async exportReport(sessionId: string, outputDir: string = './reports'): Promise<string> {
    const report = this.generateDiagnosticReport(sessionId);

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `diagnostic-report-${sessionId}-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    // Serialize report
    const content = JSON.stringify(report, null, 2);

    // Write file
    fs.writeFileSync(filepath, content, 'utf-8');

    logger.info('Diagnostic report exported', {
      data: { filepath },
    });

    return filepath;
  }

  /**
   * Generate complete test report
   */
  generateFullReport(): string {
    const errorTracker = getErrorTracker();
    const requestLogger = getRequestLogger();
    const metricsCollector = getMetricsCollector();

    const timestamp = new Date().toISOString();
    const totalSnapshots = this.snapshots.length;
    const latestSnapshot =
      totalSnapshots > 0 ? new Date(this.snapshots[totalSnapshots - 1].timestamp).toISOString() : 'N/A';

    let report = '=== Complete Logs and Diagnostic Report ===\n\n';
    report += `Time: ${timestamp}\n\n`;
    report += 'Snapshots:\n';
    report += `- Total: ${totalSnapshots}\n`;
    report += `- Latest: ${latestSnapshot}\n\n`;

    // Add reports
    report += errorTracker.getReport();
    report += '\n\n';
    report += requestLogger.getPerformanceReport();
    report += '\n\n';
    report += metricsCollector.getReport();

    // Add trend analysis
    const trend = this.getTrendAnalysis();
    report += '\n\nTrend Analysis:\n';
    report += `- Latency: ${trend.latencyTrend}\n`;
    report += `- Errors: ${trend.errorTrend}\n`;
    report += `- Cache: ${trend.cacheTrend}\n`;
    report += '\n===================================================';

    return report;
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): LogSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Clear snapshots
   */
  clear(): void {
    this.snapshots = [];
  }
}

// Global instance
let globalAggregator: LogAggregator | null = null;

/**
 * Get global log aggregator
 */
export function getLogAggregator(): LogAggregator {
  if (!globalAggregator) {
    globalAggregator = new LogAggregator();
  }
  return globalAggregator;
}

/**
 * Reset global instance (for testing)
 */
export function resetLogAggregator(): void {
  globalAggregator = null;
}
