/**
 * 安全监控器
 * 实时监控执行行为、检测异常、发出告警
 */

import { createLogger } from '@/utils/logger';
import { MonitoringAlert, MonitoringEvent, ExecutionResult } from '@/types/harness';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('harness:safety-monitor');

/**
 * 告警回调函数类型
 */
export type AlertCallback = (alert: MonitoringAlert) => void;

/**
 * 事件回调函数类型
 */
export type EventCallback = (event: MonitoringEvent) => void;

/**
 * 安全监控器
 */
export class SafetyMonitor {
  private alerts: Map<string, MonitoringAlert> = new Map();
  private events: MonitoringEvent[] = [];
  private alertCallbacks: AlertCallback[] = [];
  private eventCallbacks: EventCallback[] = [];
  private maxAlerts: number = 1000;
  private maxEvents: number = 10000;

  constructor() {
    logger.debug('安全监控器初始化');
  }

  /**
   * 发出告警
   */
  raiseAlert(
    alert: Omit<MonitoringAlert, 'alertId' | 'timestamp'>
  ): MonitoringAlert {
    const monitoringAlert: MonitoringAlert = {
      ...alert,
      alertId: uuidv4(),
      timestamp: Date.now(),
    };

    this.alerts.set(monitoringAlert.alertId, monitoringAlert);

    // 清理超出限制的告警
    if (this.alerts.size > this.maxAlerts) {
      const firstKey = this.alerts.keys().next().value;
      if (firstKey) this.alerts.delete(firstKey);
    }

    // 触发回调
    this.alertCallbacks.forEach((callback) => {
      try {
        callback(monitoringAlert);
      } catch (error) {
        logger.error('告警回调执行失败:', error);
      }
    });

    logger.warn('告警已发出', {
      alertId: monitoringAlert.alertId,
      level: monitoringAlert.level,
      alertType: monitoringAlert.alertType,
      message: monitoringAlert.message,
    });

    return monitoringAlert;
  }

  /**
   * 记录事件
   */
  recordEvent(
    event: Omit<MonitoringEvent, 'eventId' | 'timestamp'>
  ): MonitoringEvent {
    const monitoringEvent: MonitoringEvent = {
      ...event,
      eventId: uuidv4(),
      timestamp: Date.now(),
    };

    this.events.push(monitoringEvent);

    // 清理超出限制的事件
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // 触发回调
    this.eventCallbacks.forEach((callback) => {
      try {
        callback(monitoringEvent);
      } catch (error) {
        logger.error('事件回调执行失败:', error);
      }
    });

    logger.debug('事件已记录', {
      eventId: monitoringEvent.eventId,
      eventType: monitoringEvent.eventType,
    });

    return monitoringEvent;
  }

  /**
   * 监控执行结果
   */
  monitorExecutionResult(result: ExecutionResult, toolName: string, executionId: string): void {
    // 记录执行事件
    this.recordEvent({
      eventType: result.success ? 'execution_end' : 'execution_end',
      data: {
        toolName,
        success: result.success,
        duration: result.duration,
        error: result.error,
      },
      executionId,
    });

    // 检测异常
    if (!result.success) {
      this.raiseAlert({
        level: result.error?.includes('timeout') ? 'warning' : 'error',
        alertType: result.error?.includes('timeout') ? 'timeout' : 'anomaly',
        message: `工具 ${toolName} 执行失败: ${result.error}`,
        executionId,
        recommendation: `检查 ${toolName} 的配置或参数`,
      });
    }

    // 检测超时
    if (result.duration > 60000) {
      this.raiseAlert({
        level: 'warning',
        alertType: 'timeout',
        message: `工具 ${toolName} 执行耗时过长 (${(result.duration / 1000).toFixed(2)}s)`,
        executionId,
        recommendation: '考虑优化 API 调用或增加超时时间',
      });
    }
  }

  /**
   * 注册告警回调
   */
  onAlert(callback: AlertCallback): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * 注册事件回调
   */
  onEvent(callback: EventCallback): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * 取消告警回调
   */
  offAlert(callback: AlertCallback): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  /**
   * 取消事件回调
   */
  offEvent(callback: EventCallback): void {
    const index = this.eventCallbacks.indexOf(callback);
    if (index > -1) {
      this.eventCallbacks.splice(index, 1);
    }
  }

  /**
   * 获取所有告警
   */
  getAllAlerts(): MonitoringAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * 获取特定级别的告警
   */
  getAlertsByLevel(level: MonitoringAlert['level']): MonitoringAlert[] {
    return this.getAllAlerts().filter((alert) => alert.level === level);
  }

  /**
   * 获取特定类型的告警
   */
  getAlertsByType(alertType: MonitoringAlert['alertType']): MonitoringAlert[] {
    return this.getAllAlerts().filter((alert) => alert.alertType === alertType);
  }

  /**
   * 获取最新的 N 条告警
   */
  getRecentAlerts(count: number = 50): MonitoringAlert[] {
    return this.getAllAlerts().slice(-count);
  }

  /**
   * 获取特定执行的告警
   */
  getExecutionAlerts(executionId: string): MonitoringAlert[] {
    return this.getAllAlerts().filter((alert) => alert.executionId === executionId);
  }

  /**
   * 清除指定的告警
   */
  clearAlert(alertId: string): void {
    this.alerts.delete(alertId);
    logger.debug(`告警已清除: ${alertId}`);
  }

  /**
   * 清除所有告警
   */
  clearAllAlerts(): void {
    this.alerts.clear();
    logger.debug('所有告警已清除');
  }

  /**
   * 获取所有事件
   */
  getAllEvents(): MonitoringEvent[] {
    return [...this.events];
  }

  /**
   * 获取特定类型的事件
   */
  getEventsByType(eventType: MonitoringEvent['eventType']): MonitoringEvent[] {
    return this.events.filter((event) => event.eventType === eventType);
  }

  /**
   * 获取最新的 N 条事件
   */
  getRecentEvents(count: number = 100): MonitoringEvent[] {
    return this.events.slice(-count);
  }

  /**
   * 获取特定执行的事件
   */
  getExecutionEvents(executionId: string): MonitoringEvent[] {
    return this.events.filter((event) => event.executionId === executionId);
  }

  /**
   * 获取时间范围内的事件
   */
  getEventsByTimeRange(startTime: number, endTime: number): MonitoringEvent[] {
    return this.events.filter(
      (event) => event.timestamp >= startTime && event.timestamp <= endTime
    );
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalAlerts: number;
    alertsByLevel: Record<string, number>;
    alertsByType: Record<string, number>;
    totalEvents: number;
    eventsByType: Record<string, number>;
  } {
    const alertsByLevel: Record<string, number> = {};
    const alertsByType: Record<string, number> = {};
    const eventsByType: Record<string, number> = {};

    this.alerts.forEach((alert) => {
      alertsByLevel[alert.level] = (alertsByLevel[alert.level] || 0) + 1;
      alertsByType[alert.alertType] = (alertsByType[alert.alertType] || 0) + 1;
    });

    this.events.forEach((event) => {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
    });

    return {
      totalAlerts: this.alerts.size,
      alertsByLevel,
      alertsByType,
      totalEvents: this.events.length,
      eventsByType,
    };
  }

  /**
   * 生成监控报告
   */
  generateReport(): string {
    const stats = this.getStats();
    const recentAlerts = this.getRecentAlerts(10);

    let report = '=== 安全监控报告 ===\n\n';
    report += `生成时间: ${new Date().toISOString()}\n\n`;

    report += '告警统计:\n';
    report += `  总告警数: ${stats.totalAlerts}\n`;
    Object.entries(stats.alertsByLevel).forEach(([level, count]) => {
      report += `  ${level}: ${count}\n`;
    });

    report += '\n按告警类型统计:\n';
    Object.entries(stats.alertsByType).forEach(([type, count]) => {
      report += `  ${type}: ${count}\n`;
    });

    report += '\n事件统计:\n';
    report += `  总事件数: ${stats.totalEvents}\n`;
    Object.entries(stats.eventsByType).forEach(([type, count]) => {
      report += `  ${type}: ${count}\n`;
    });

    report += '\n最近 10 条告警:\n';
    recentAlerts.forEach((alert, index) => {
      report += `  ${index + 1}. [${alert.level}] ${alert.alertType}: ${alert.message}\n`;
    });

    return report;
  }

  /**
   * 清空所有事件（谨慎使用）
   */
  clearAllEvents(): void {
    const oldSize = this.events.length;
    this.events = [];
    logger.warn(`所有事件已清空 (${oldSize} 条记录)`);
  }
}
