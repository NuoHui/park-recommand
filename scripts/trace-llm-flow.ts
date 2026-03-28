/**
 * LLM 流程追踪工具
 * 实时显示 LLM 请求的各个阶段，帮助识别瓶颈和问题点
 */

import * as fs from 'fs';
import * as readline from 'readline';

interface TraceEvent {
  timestamp: string;
  timeMs: number;
  level: string;
  message: string;
  component: string;
  duration?: number;
  details?: Record<string, any>;
}

class LLMFlowTracer {
  private events: TraceEvent[] = [];
  private startTime: number = Date.now();
  private componentStack: Map<string, number> = new Map();

  parseLogLine(line: string): TraceEvent | null {
    // 匹配 LLM 相关日志行
    const patterns = [
      /\[([^\]]+)\]\s*\[(TRACE|DEBUG|INFO|WARN|ERROR)\]\s*(.+)/,
      /(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\s*\[(.+?)\]\s*(.+)/,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const component = match[1];
        const level = match[2] || 'INFO';
        const message = match[3];

        // 提取时间和其他详情
        return {
          timestamp: new Date().toISOString(),
          timeMs: Date.now() - this.startTime,
          level,
          message: message.trim(),
          component: component.trim(),
        };
      }
    }

    return null;
  }

  async processLogFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
      });

      rl.on('line', (line) => {
        if (line.includes('[LLM') || line.includes('[OpenAI') || line.includes('[参数] || line.includes('[推荐')) {
          const event = this.parseLogLine(line);
          if (event) {
            this.events.push(event);
          }
        }
      });

      rl.on('close', resolve);
      rl.on('error', reject);
    });
  }

  visualize(): void {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    LLM 流程可视化分析                        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    if (this.events.length === 0) {
      console.log('❌ 没有找到 LLM 相关日志\n');
      return;
    }

    const groupedByComponent = new Map<string, TraceEvent[]>();
    for (const event of this.events) {
      if (!groupedByComponent.has(event.component)) {
        groupedByComponent.set(event.component, []);
      }
      groupedByComponent.get(event.component)!.push(event);
    }

    // 可视化时间线
    console.log('📊 时间线视图:');
    console.log('─'.repeat(70));

    const maxTime = this.events[this.events.length - 1]?.timeMs || 0;
    const scale = 60 / maxTime; // 将时间线缩放到 60 字符

    for (const event of this.events) {
      const barLength = Math.max(1, Math.floor(event.timeMs * scale));
      const bar = '█'.repeat(barLength);
      const timeStr = this.formatTime(event.timeMs);

      const levelIcon = {
        ERROR: '❌',
        WARN: '⚠️',
        INFO: 'ℹ️',
        DEBUG: '🔍',
      }[event.level] || '•';

      console.log(`${levelIcon} ${timeStr.padStart(8)} │${bar} ${event.message.substring(0, 40)}`);
    }

    // 按组件统计
    console.log('\n📈 按组件统计:');
    console.log('─'.repeat(70));

    let totalTime = 0;
    for (const [component, events] of groupedByComponent) {
      const lastEvent = events[events.length - 1];
      const firstEvent = events[0];
      const duration = lastEvent.timeMs - firstEvent.timeMs;
      totalTime += duration;

      const eventCount = events.length;
      const errorCount = events.filter((e) => e.level === 'ERROR').length;

      console.log(`${component}`);
      console.log(`  ├─ 事件数: ${eventCount}`);
      console.log(`  ├─ 耗时: ${duration}ms`);
      console.log(`  └─ 错误数: ${errorCount}`);
    }

    // 关键指标
    console.log('\n🎯 关键指标:');
    console.log('─'.repeat(70));
    console.log(`总时间: ${totalTime}ms`);
    console.log(`总事件数: ${this.events.length}`);
    console.log(`错误数: ${this.events.filter((e) => e.level === 'ERROR').length}`);
    console.log(`警告数: ${this.events.filter((e) => e.level === 'WARN').length}`);

    // 性能分析
    console.log('\n🔍 性能分析:');
    console.log('─'.repeat(70));

    const callEvents = this.events.filter((e) => e.message.includes('调用') || e.message.includes('API'));
    const responseEvents = this.events.filter((e) => e.message.includes('响应') || e.message.includes('收到'));

    if (callEvents.length > 0 && responseEvents.length > 0) {
      const callTime = callEvents[0].timeMs;
      const responseTime = responseEvents[0].timeMs;
      const latency = responseTime - callTime;

      console.log(`API 调用延迟: ${latency}ms`);

      if (latency > 30000) {
        console.log(`⚠️  延迟很高，可能存在网络问题或 LLM 服务缓慢`);
      }
    }

    // 建议
    console.log('\n💡 建议:');
    console.log('─'.repeat(70));

    const errorCount = this.events.filter((e) => e.level === 'ERROR').length;
    if (errorCount > 0) {
      console.log(`❌ 检测到 ${errorCount} 个错误，查看错误日志获取详情`);
    }

    const timeoutEvent = this.events.find((e) => e.message.includes('timeout'));
    if (timeoutEvent) {
      console.log('⏱️  检测到超时问题，可能需要增加超时时间或优化 LLM 请求');
    }

    const successEvents = this.events.filter((e) => e.message.includes('成功') || e.message.includes('完成'));
    if (successEvents.length > 0) {
      console.log(`✅ 系统成功完成了 ${successEvents.length} 个操作`);
    }

    console.log();
  }

  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = ms % 1000;
    return `${seconds}.${String(milliseconds).padStart(3, '0')}s`;
  }

  generateReport(outputPath?: string): void {
    const report = {
      summary: {
        totalEvents: this.events.length,
        totalTime: this.events[this.events.length - 1]?.timeMs || 0,
        errors: this.events.filter((e) => e.level === 'ERROR').length,
        warnings: this.events.filter((e) => e.level === 'WARN').length,
      },
      timeline: this.events,
    };

    const json = JSON.stringify(report, null, 2);

    if (outputPath) {
      fs.writeFileSync(outputPath, json);
      console.log(`📄 报告已保存到: ${outputPath}`);
    } else {
      console.log(json);
    }
  }
}

// 主函数
async function main() {
  const logFile = process.argv[2] || 'llm-debug.log';

  if (!fs.existsSync(logFile)) {
    console.error(`❌ 日志文件不存在: ${logFile}`);
    console.log('\n用法:');
    console.log('  npm run trace:llm <日志文件路径>');
    console.log('\n例如:');
    console.log('  npm run test:integration 2>&1 | tee llm-debug.log');
    console.log('  npm run trace:llm llm-debug.log');
    process.exit(1);
  }

  try {
    const tracer = new LLMFlowTracer();
    console.log(`📖 正在分析日志文件: ${logFile}`);
    await tracer.processLogFile(logFile);
    tracer.visualize();
    tracer.generateReport('llm-trace-report.json');
  } catch (error) {
    console.error('❌ 分析失败:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error);
