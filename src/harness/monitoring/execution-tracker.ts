/**
 * 执行链追踪器
 * 记录和追踪完整的执行链
 */

import { createLogger } from '@/utils/logger';
import { AuditLogEntry, ExecutionTrace } from '@/types/harness';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('harness:execution-tracker');

/**
 * 执行链追踪器
 */
export class ExecutionTracker {
  private auditLogs: AuditLogEntry[] = [];
  private sessionMap: Map<string, string[]> = new Map(); // 会话 ID -> 执行 ID 列表
  private maxLogs: number = 10000; // 最多保存 10000 条审计日志

  /**
   * 记录审计日志
   */
  recordAudit(
    entry: Omit<AuditLogEntry, 'logId' | 'timestamp'>
  ): AuditLogEntry {
    const logEntry: AuditLogEntry = {
      ...entry,
      logId: uuidv4(),
      timestamp: Date.now(),
    };

    this.auditLogs.push(logEntry);

    // 清理超出限制的日志
    if (this.auditLogs.length > this.maxLogs) {
      this.auditLogs.shift();
    }

    // 维护会话执行 ID 映射
    if (!this.sessionMap.has(entry.sessionId)) {
      this.sessionMap.set(entry.sessionId, []);
    }
    if (entry.executionId) {
      this.sessionMap.get(entry.sessionId)!.push(entry.executionId);
    }

    logger.debug('审计日志已记录', {
      logId: logEntry.logId,
      actionType: logEntry.actionType,
      actionName: logEntry.actionName,
      result: logEntry.result,
    });

    return logEntry;
  }

  /**
   * 获取会话的所有审计日志
   */
  getSessionAuditLogs(sessionId: string): AuditLogEntry[] {
    return this.auditLogs.filter((log) => log.sessionId === sessionId);
  }

  /**
   * 获取执行 ID 的所有相关日志
   */
  getExecutionAuditLogs(executionId: string): AuditLogEntry[] {
    return this.auditLogs.filter((log) => log.executionId === executionId);
  }

  /**
   * 获取指定时间范围的审计日志
   */
  getAuditLogsByTimeRange(startTime: number, endTime: number): AuditLogEntry[] {
    return this.auditLogs.filter((log) => log.timestamp >= startTime && log.timestamp <= endTime);
  }

  /**
   * 获取特定操作类型的审计日志
   */
  getAuditLogsByActionType(actionType: AuditLogEntry['actionType']): AuditLogEntry[] {
    return this.auditLogs.filter((log) => log.actionType === actionType);
  }

  /**
   * 获取特定结果的审计日志
   */
  getAuditLogsByResult(result: AuditLogEntry['result']): AuditLogEntry[] {
    return this.auditLogs.filter((log) => log.result === result);
  }

  /**
   * 获取失败的审计日志
   */
  getFailedAuditLogs(): AuditLogEntry[] {
    return this.getAuditLogsByResult('failure');
  }

  /**
   * 获取待审批的审计日志
   */
  getPendingApprovalLogs(): AuditLogEntry[] {
    return this.getAuditLogsByResult('pending_approval');
  }

  /**
   * 获取所有审计日志
   */
  getAllAuditLogs(limit?: number): AuditLogEntry[] {
    if (!limit) {
      return [...this.auditLogs];
    }
    return this.auditLogs.slice(-limit);
  }

  /**
   * 搜索审计日志
   */
  searchAuditLogs(criteria: {
    sessionId?: string;
    executionId?: string;
    actionType?: AuditLogEntry['actionType'];
    actionName?: string;
    result?: AuditLogEntry['result'];
    timeRange?: { start: number; end: number };
  }): AuditLogEntry[] {
    return this.auditLogs.filter((log) => {
      if (criteria.sessionId && log.sessionId !== criteria.sessionId) return false;
      if (criteria.executionId && log.executionId !== criteria.executionId) return false;
      if (criteria.actionType && log.actionType !== criteria.actionType) return false;
      if (criteria.actionName && log.actionName !== criteria.actionName) return false;
      if (criteria.result && log.result !== criteria.result) return false;
      if (
        criteria.timeRange &&
        (log.timestamp < criteria.timeRange.start || log.timestamp > criteria.timeRange.end)
      ) {
        return false;
      }
      return true;
    });
  }

  /**
   * 获取会话的执行链
   */
  getSessionExecutionChain(sessionId: string): string[] {
    return this.sessionMap.get(sessionId) || [];
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalLogs: number;
    sessionCount: number;
    byActionType: Record<string, number>;
    byResult: Record<string, number>;
  } {
    const byActionType: Record<string, number> = {};
    const byResult: Record<string, number> = {};

    this.auditLogs.forEach((log) => {
      byActionType[log.actionType] = (byActionType[log.actionType] || 0) + 1;
      byResult[log.result] = (byResult[log.result] || 0) + 1;
    });

    return {
      totalLogs: this.auditLogs.length,
      sessionCount: this.sessionMap.size,
      byActionType,
      byResult,
    };
  }

  /**
   * 导出审计日志为 JSON
   */
  exportAsJSON(criteria?: Parameters<typeof this.searchAuditLogs>[0]): string {
    const logs = criteria ? this.searchAuditLogs(criteria) : this.auditLogs;
    return JSON.stringify(logs, null, 2);
  }

  /**
   * 导出审计日志为 CSV
   */
  exportAsCSV(criteria?: Parameters<typeof this.searchAuditLogs>[0]): string {
    const logs = criteria ? this.searchAuditLogs(criteria) : this.auditLogs;

    if (logs.length === 0) {
      return 'No logs found';
    }

    const headers = [
      'logId',
      'sessionId',
      'executionId',
      'actionType',
      'actionName',
      'actor',
      'timestamp',
      'result',
      'source',
    ];

    const rows = logs.map((log) => [
      log.logId,
      log.sessionId,
      log.executionId || '',
      log.actionType,
      log.actionName,
      log.actor || '',
      new Date(log.timestamp).toISOString(),
      log.result,
      log.source || '',
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join(
      '\n'
    );

    return csv;
  }

  /**
   * 清空所有审计日志（谨慎使用）
   */
  clearAllLogs(): void {
    const oldSize = this.auditLogs.length;
    this.auditLogs = [];
    this.sessionMap.clear();
    logger.warn(`所有审计日志已清空 (${oldSize} 条记录)`);
  }

  /**
   * 清空指定会话的审计日志
   */
  clearSessionLogs(sessionId: string): void {
    const oldSize = this.auditLogs.length;
    this.auditLogs = this.auditLogs.filter((log) => log.sessionId !== sessionId);
    this.sessionMap.delete(sessionId);
    logger.debug(`会话审计日志已清空: ${sessionId} (${oldSize - this.auditLogs.length} 条记录)`);
  }

  /**
   * 获取最近的 N 条日志
   */
  getRecentLogs(count: number = 100): AuditLogEntry[] {
    return this.auditLogs.slice(-count);
  }

  /**
   * 生成报告
   */
  generateReport(sessionId?: string): string {
    const logs = sessionId
      ? this.getSessionAuditLogs(sessionId)
      : this.auditLogs;

    const stats = this.getStats();

    let report = '=== 审计日志报告 ===\n\n';
    report += `生成时间: ${new Date().toISOString()}\n`;
    report += `总日志数: ${logs.length}\n`;
    report += `会话数: ${stats.sessionCount}\n\n`;

    report += '按操作类型统计:\n';
    Object.entries(stats.byActionType).forEach(([type, count]) => {
      report += `  ${type}: ${count}\n`;
    });

    report += '\n按结果统计:\n';
    Object.entries(stats.byResult).forEach(([result, count]) => {
      report += `  ${result}: ${count}\n`;
    });

    if (sessionId) {
      report += `\n\n会话 ${sessionId} 的执行链:\n`;
      const chain = this.getSessionExecutionChain(sessionId);
      chain.forEach((executionId, index) => {
        report += `  ${index + 1}. ${executionId}\n`;
      });
    }

    return report;
  }
}

/**
 * CSV 转义函数
 */
function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
