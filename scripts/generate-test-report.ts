#!/usr/bin/env tsx
/**
 * 生成完整测试报告脚本
 * 运行所有测试、收集日志、生成诊断报告
 */

import { RecommendationFlowE2ETest } from '@/tests/e2e/recommendation-flow.test.js';
import { getErrorTracker } from '@/monitoring/error-tracker.js';
import { getRequestLogger } from '@/monitoring/request-logger.js';
import { getMetricsCollector } from '@/monitoring/metrics-collector.js';
import { getLogAggregator } from '@/monitoring/log-aggregator.js';
import { getLogger } from '@/logger/index.js';
import * as fs from 'fs';
import * as path from 'path';

const logger = getLogger('test-report-generator');

interface TestReportData {
  summary: string;
  timestamp: string;
  duration: number;
  e2eReport: any;
  errorReport: any;
  requestReport: any;
  performanceReport: any;
  diagnosticReport: any;
  recommendations: string[];
}

/**
 * 生成完整的 HTML 报告
 */
function generateHTMLReport(data: TestReportData): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>推荐系统 - 端到端测试报告</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            line-height: 1.6;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px;
        }
        
        .section {
            margin-bottom: 40px;
        }
        
        .section-title {
            font-size: 1.5em;
            color: #667eea;
            margin-bottom: 20px;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        
        .stat-card h3 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 0.9em;
            text-transform: uppercase;
        }
        
        .stat-card .value {
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }
        
        .status-pass {
            color: #28a745;
        }
        
        .status-fail {
            color: #dc3545;
        }
        
        .status-warning {
            color: #ffc107;
        }
        
        .recommendation-list {
            list-style: none;
            padding: 0;
        }
        
        .recommendation-list li {
            padding: 12px;
            margin-bottom: 8px;
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            border-radius: 4px;
        }
        
        .recommendation-list li.success {
            border-left-color: #28a745;
        }
        
        .recommendation-list li.warning {
            border-left-color: #ffc107;
        }
        
        .recommendation-list li.error {
            border-left-color: #dc3545;
        }
        
        .detail-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        .detail-table thead {
            background: #f8f9fa;
        }
        
        .detail-table th,
        .detail-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        
        .detail-table tr:hover {
            background: #f8f9fa;
        }
        
        footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 0.9em;
            border-top: 1px solid #dee2e6;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: bold;
            margin-right: 5px;
        }
        
        .badge-success {
            background: #d4edda;
            color: #155724;
        }
        
        .badge-danger {
            background: #f8d7da;
            color: #721c24;
        }
        
        .badge-warning {
            background: #fff3cd;
            color: #856404;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🎯 推荐系统端到端测试报告</h1>
            <p>完整的流程验证、日志收集、错误追踪</p>
        </header>
        
        <div class="content">
            <!-- 执行摘要 -->
            <div class="section">
                <h2 class="section-title">📊 执行摘要</h2>
                <p>${data.summary}</p>
                <p style="margin-top: 10px; color: #666;">生成时间: ${data.timestamp}</p>
                <p style="color: #666;">总耗时: ${data.duration}ms</p>
            </div>
            
            <!-- 测试结果 -->
            <div class="section">
                <h2 class="section-title">✅ 测试结果</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>总测试数</h3>
                        <div class="value">${data.e2eReport.totalTests}</div>
                    </div>
                    <div class="stat-card">
                        <h3>通过数</h3>
                        <div class="value status-pass">${data.e2eReport.passedTests}</div>
                    </div>
                    <div class="stat-card">
                        <h3>失败数</h3>
                        <div class="value status-fail">${data.e2eReport.failedTests}</div>
                    </div>
                    <div class="stat-card">
                        <h3>成功率</h3>
                        <div class="value status-pass">${(data.e2eReport.successRate * 100).toFixed(2)}%</div>
                    </div>
                </div>
            </div>
            
            <!-- 性能指标 -->
            <div class="section">
                <h2 class="section-title">⏱️ 性能指标</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>平均延迟</h3>
                        <div class="value">${data.performanceReport.averageLatency.toFixed(2)}ms</div>
                    </div>
                    <div class="stat-card">
                        <h3>P95 延迟</h3>
                        <div class="value">${data.performanceReport.p95Latency.toFixed(2)}ms</div>
                    </div>
                    <div class="stat-card">
                        <h3>缓存命中率</h3>
                        <div class="value">${(data.performanceReport.cacheHitRate * 100).toFixed(2)}%</div>
                    </div>
                    <div class="stat-card">
                        <h3>吞吐量</h3>
                        <div class="value">${data.performanceReport.throughput.toFixed(2)} req/s</div>
                    </div>
                </div>
            </div>
            
            <!-- 错误追踪 -->
            <div class="section">
                <h2 class="section-title">❌ 错误追踪</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>总错误数</h3>
                        <div class="value">${data.errorReport.total}</div>
                    </div>
                    <div class="stat-card">
                        <h3>未解决</h3>
                        <div class="value status-fail">${data.errorReport.unresolved}</div>
                    </div>
                    <div class="stat-card">
                        <h3>已解决</h3>
                        <div class="value status-pass">${data.errorReport.total - data.errorReport.unresolved}</div>
                    </div>
                </div>
            </div>
            
            <!-- 改进建议 -->
            <div class="section">
                <h2 class="section-title">💡 改进建议</h2>
                <ul class="recommendation-list">
                    ${data.recommendations.map((rec) => {
                      let className = 'success';
                      if (rec.includes('⚠️') || rec.includes('警告')) {
                        className = 'warning';
                      } else if (rec.includes('🔴') || rec.includes('严重') || rec.includes('❌')) {
                        className = 'error';
                      }
                      return `<li class="${className}">${rec}</li>`;
                    }).join('')}
                </ul>
            </div>
            
            <!-- 详细测试结果 -->
            <div class="section">
                <h2 class="section-title">📋 详细测试结果</h2>
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>测试名称</th>
                            <th>状态</th>
                            <th>耗时</th>
                            <th>说明</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.e2eReport.results.map((result: any) => `
                            <tr>
                                <td>${result.testName}</td>
                                <td>
                                    <span class="badge ${result.status === 'passed' ? 'badge-success' : 'badge-danger'}">
                                        ${result.status === 'passed' ? '✅ 通过' : '❌ 失败'}
                                    </span>
                                </td>
                                <td>${result.duration}ms</td>
                                <td>${result.error || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        
        <footer>
            <p>✨ 推荐系统 v1.0.0 - 端到端测试报告生成器</p>
            <p>© 2026 Park Recommender System. All rights reserved.</p>
        </footer>
    </div>
</body>
</html>
  `;
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const startTime = Date.now();

  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                   生成完整测试报告                                          ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
  `);

  try {
    // 1. 运行端到端测试
    logger.info('开始运行端到端测试...', { data: {} });
    const tester = new RecommendationFlowE2ETest();
    const e2eReport = await tester.runAllTests();

    // 2. 收集诊断数据
    logger.info('收集诊断数据...', { data: {} });
    const errorTracker = getErrorTracker();
    const requestLogger = getRequestLogger();
    const metricsCollector = getMetricsCollector();
    const aggregator = getLogAggregator();

    // 3. 生成报告数据
    const errorReport = errorTracker.getStatistics();
    const performanceSnapshot = metricsCollector.getSnapshot();
    const diagnosticReport = aggregator.generateDiagnosticReport('test-session');

    const testReportData: TestReportData = {
      summary: `✅ 系统测试完成 - 成功率: ${(e2eReport.successRate * 100).toFixed(2)}%, 
        错误数: ${errorReport.total}, 缓存命中率: ${(performanceSnapshot.cacheHitRate * 100).toFixed(2)}%`,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      e2eReport,
      errorReport: {
        total: errorReport.total,
        unresolved: errorTracker.getUnresolvedErrors().length,
      },
      requestReport: requestLogger.export(),
      performanceReport: performanceSnapshot,
      diagnosticReport,
      recommendations: diagnosticReport.recommendations,
    };

    // 4. 生成 HTML 报告
    logger.info('生成 HTML 报告...', { data: {} });
    const htmlReport = generateHTMLReport(testReportData);

    // 5. 保存报告文件
    const reportsDir = './reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const htmlFile = path.join(reportsDir, `test-report-${timestamp}.html`);
    const jsonFile = path.join(reportsDir, `test-report-${timestamp}.json`);

    fs.writeFileSync(htmlFile, htmlReport, 'utf-8');
    fs.writeFileSync(jsonFile, JSON.stringify(testReportData, null, 2), 'utf-8');

    logger.info('报告已生成', {
      data: {
        htmlFile,
        jsonFile,
      },
    });

    // 6. 输出控制台总结
    console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                     ✅ 报告生成完成！                                      ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

📊 测试统计
├─ 总测试数: ${e2eReport.totalTests}
├─ 通过数: ✅ ${e2eReport.passedTests}
├─ 失败数: ❌ ${e2eReport.failedTests}
├─ 成功率: ${(e2eReport.successRate * 100).toFixed(2)}%
└─ 平均耗时: ${e2eReport.averageDuration.toFixed(2)}ms

📁 输出文件
├─ HTML 报告: ${htmlFile}
├─ JSON 数据: ${jsonFile}
└─ 日志文件: logs/combined.log

💡 建议的下一步操作
├─ 打开 HTML 报告查看详细内容
├─ 检查日志文件排查任何问题
└─ 如有必要，进行性能优化

生成时间: ${new Date().toISOString()}
总耗时: ${Date.now() - startTime}ms

    `);

    // 7. 显示完整报告
    console.log(tester.generateReport(e2eReport));
    console.log(errorTracker.getReport());
    console.log(requestLogger.getPerformanceReport());
    console.log(metricsCollector.getReport());
    console.log(aggregator.generateFullReport());

  } catch (error) {
    logger.error('报告生成失败', {
      error: error instanceof Error ? error : new Error(String(error)),
    });

    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

main().catch(console.error);
