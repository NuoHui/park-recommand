import chalk from 'chalk';
import { Recommendation, Location } from '@/types/common';
import {
  OutputStyleOptions,
  MessageType,
  RecommendationCardConfig,
  RecommendationListConfig,
  ErrorDisplayConfig,
} from './types';
import { SYMBOLS } from '@/config/constants';
import { formatDistance, formatRating, formatTime, createTitleBox } from '@/utils/format';

/**
 * CLI 格式化输出器
 * 负责美化推荐结果、错误提示、交互反馈等内容的输出
 */
export class Formatter {
  private width: number;
  private shouldColorize: boolean;
  private verbose: boolean;

  constructor(options: OutputStyleOptions = {}) {
    this.width = options.width || (process.stdout.columns as number) || 80;
    this.shouldColorize = options.colorize !== false;
    this.verbose = options.verbose || false;
  }

  /**
   * 输出欢迎信息
   */
  public printWelcome(): void {
    const title = createTitleBox('🏞️  深圳公园景点推荐 Agent', this.width - 2);
    console.log('\n' + title + '\n');
    console.log(
      this.applyColor(
        `${SYMBOLS.info} 欢迎使用！我是你的深圳景点推荐助手`,
        'cyan'
      )
    );
    console.log(
      this.applyColor(
        `${SYMBOLS.info} 输入 ${this.highlight('recommend')} 开始推荐，或 ${this.highlight('help-detail')} 查看帮助`,
        'gray'
      )
    );
    console.log();
  }

  /**
   * 输出消息（带类型）
   */
  public message(
    text: string,
    type: MessageType = MessageType.INFO,
    indent: number = 0
  ): void {
    const prefix = this.getPrefix(type);
    const indentation = ' '.repeat(indent);

    const formattedText = this.applyColor(text, this.getColorForType(type));
    console.log(`${indentation}${prefix} ${formattedText}`);
  }

  /**
   * 输出问题提示
   */
  public prompt(question: string, options?: string[]): void {
    console.log();
    const prefix = this.applyColor(SYMBOLS.question, 'cyan');
    console.log(`${prefix} ${this.bold(question)}`);

    if (options && options.length > 0) {
      options.forEach((opt, idx) => {
        const marker = this.applyColor(`[${idx + 1}]`, 'yellow');
        console.log(`    ${marker} ${opt}`);
      });
    }
  }

  /**
   * 输出推荐卡片
   */
  public printRecommendationCard(
    rec: Recommendation,
    index: number,
    config: RecommendationCardConfig = {}
  ): void {
    const {
      showRanking = true,
      showTags = true,
      showReasonShort = true,
      compact = false,
      lineLength = 60,
    } = config;

    const { location, reason, relevanceScore, estimatedTravelTime } = rec;

    const indent = compact ? 0 : 1;

    // 标题行：排名 + 地点名称
    let titleLine = '';
    if (showRanking) {
      titleLine = `${this.applyColor(`#${index}`, 'yellow')} ${this.bold(location.name)}`;
    } else {
      titleLine = this.bold(location.name);
    }
    console.log(' '.repeat(indent) + titleLine);

    // 信息行：距离、评分、难度
    const infoLines: string[] = [];

    if (location.distance !== undefined) {
      infoLines.push(this.applyColor(`📍 ${formatDistance(location.distance)}`, 'cyan'));
    }

    if (location.rating !== undefined) {
      infoLines.push(this.applyColor(`⭐ ${formatRating(location.rating)}`, 'yellow'));
    }

    if (location.difficulty) {
      infoLines.push(
        this.applyColor(
          `📈 难度: ${this.difficultyLabel(location.difficulty)}`,
          this.difficultyColor(location.difficulty) as any
        )
      );
    }

    if (infoLines.length > 0) {
      console.log(' '.repeat(indent + 2) + infoLines.join(' | '));
    }

    // 推荐理由（简版）
    if (showReasonShort && reason) {
      const shortReason = this.truncate(reason, lineLength);
      console.log(' '.repeat(indent + 2) + this.applyColor(shortReason, 'gray'));
    }

    // 相关度分数（如果有）
    if (relevanceScore !== undefined) {
      const scoreBar = this.renderScoreBar(relevanceScore);
      console.log(' '.repeat(indent + 2) + `相关度: ${scoreBar}`);
    }

    // 标签
    if (showTags && location.tags && location.tags.length > 0) {
      const tags = location.tags
        .slice(0, 3)
        .map((tag) => this.applyColor(`#${tag}`, 'magenta'))
        .join(' ');
      console.log(' '.repeat(indent + 2) + tags);
    }

    // 游玩时间建议
    if (estimatedTravelTime !== undefined) {
      console.log(
        ' '.repeat(indent + 2) +
          this.applyColor(`⏱️  ${formatTime(estimatedTravelTime)}`, 'blue')
      );
    }

    if (!compact) {
      console.log();
    }
  }

  /**
   * 输出完整推荐列表
   */
  public printRecommendations(
    recommendations: Recommendation[],
    config: RecommendationListConfig = {}
  ): void {
    const {
      cardConfig = {},
      showSummary = true,
      showStats = true,
      separateCards = true,
      limit = recommendations.length,
    } = config;

    const display = recommendations.slice(0, limit);

    // 标题
    console.log();
    console.log(
      this.applyColor(
        `${SYMBOLS.success} 推荐完成！为你精选了以下景点：`,
        'green'
      )
    );
    console.log();

    // 卡片列表
    display.forEach((rec, idx) => {
      this.printRecommendationCard(rec, idx + 1, cardConfig);
      if (separateCards && idx < display.length - 1) {
        console.log(this.createDivider('─', Math.min(this.width - 4, 60)));
      }
    });

    // 统计信息
    if (showStats) {
      console.log();
      const avgRelevance = (
        display.reduce((sum, r) => sum + r.relevanceScore, 0) / display.length
      ).toFixed(2);
      console.log(
        this.applyColor(
          `📊 共 ${display.length} 个推荐，平均相关度 ${avgRelevance}`,
          'cyan'
        )
      );
    }

    // 摘要
    if (showSummary && display.length > 0) {
      console.log();
      console.log(
        this.applyColor(
          `${SYMBOLS.info} 所有推荐都已根据你的偏好精心挑选。更多信息可通过 ${this.highlight('detail')} 命令查看。`,
          'gray'
        )
      );
    }

    console.log();
  }

  /**
   * 输出地点详情
   */
  public printLocationDetail(location: Location): void {
    console.log();
    const header = createTitleBox(`📍 ${location.name} - 详细信息`, this.width - 2);
    console.log(header);
    console.log();

    // 基础信息
    console.log(this.bold('基础信息'));
    if (location.address) {
      console.log(`  地址: ${location.address}`);
    }
    console.log(
      `  坐标: [${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}]`
    );

    // 距离和评分
    console.log();
    console.log(this.bold('评价信息'));
    if (location.distance !== undefined) {
      console.log(`  距离: ${formatDistance(location.distance)}`);
    }
    if (location.rating !== undefined) {
      console.log(`  评分: ${formatRating(location.rating)}`);
    }
    if (location.difficulty) {
      console.log(`  难度: ${this.difficultyLabel(location.difficulty)}`);
    }

    // 详细信息
    if (location.description || location.tags || location.visitDuration) {
      console.log();
      console.log(this.bold('详细信息'));
      if (location.description) {
        console.log(`  描述: ${location.description}`);
      }
      if (location.visitDuration) {
        console.log(`  游玩时间: ${location.visitDuration}`);
      }
      if (location.tags && location.tags.length > 0) {
        console.log(`  标签: ${location.tags.map((tag) => `#${tag}`).join(', ')}`);
      }
    }

    // 联系方式
    if (location.phone || location.website || location.openingHours) {
      console.log();
      console.log(this.bold('联系方式'));
      if (location.phone) {
        console.log(`  电话: ${location.phone}`);
      }
      if (location.website) {
        console.log(`  网站: ${location.website}`);
      }
      if (location.openingHours) {
        console.log(`  开放时间: ${location.openingHours}`);
      }
    }

    console.log();
  }

  /**
   * 输出错误信息
   */
  public printError(
    error: Error | string,
    config: ErrorDisplayConfig = {}
  ): void {
    const {
      showCode = true,
      showStackTrace = false,
      showSuggestion = true,
    } = config;

    console.log();
    const prefix = this.applyColor(SYMBOLS.error, 'red');
    const message = typeof error === 'string' ? error : error.message;

    console.log(`${prefix} ${this.bold(this.applyColor(message, 'red'))}`);

    // 错误代码
    if (showCode && typeof error !== 'string' && (error as any).code) {
      console.log(
        this.applyColor(`   代码: ${(error as any).code}`, 'gray')
      );
    }

    // 堆栈跟踪
    if (
      showStackTrace &&
      typeof error !== 'string' &&
      error.stack &&
      this.verbose
    ) {
      console.log(this.applyColor(`\n${error.stack}`, 'gray'));
    }

    // 建议
    if (showSuggestion) {
      console.log(
        this.applyColor(
          `   ${SYMBOLS.info} 请检查网络连接或重试。如问题持续，请查看日志或联系支持。`,
          'yellow'
        )
      );
    }

    console.log();
  }

  /**
   * 输出警告信息
   */
  public printWarning(message: string): void {
    const prefix = this.applyColor(SYMBOLS.warning, 'yellow');
    console.log(`${prefix} ${this.applyColor(message, 'yellow')}`);
  }

  /**
   * 输出成功信息
   */
  public printSuccess(message: string): void {
    const prefix = this.applyColor(SYMBOLS.success, 'green');
    console.log(`${prefix} ${this.applyColor(message, 'green')}`);
  }

  /**
   * 输出加载动画（模拟进度）
   */
  public printLoading(status: string, stage: number = 1): void {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const frame = frames[stage % frames.length];
    process.stdout.write(
      `\r${this.applyColor(frame, 'cyan')} ${status}`
    );
  }

  /**
   * 清除加载动画
   */
  public clearLoading(): void {
    process.stdout.write('\r' + ' '.repeat(60) + '\r');
  }

  /**
   * 输出进度条
   */
  public printProgressBar(
    current: number,
    total: number,
    label: string = '进度'
  ): void {
    const percentage = (current / total) * 100;
    const filledLength = Math.round((percentage / 100) * 20);
    const bar = '█'.repeat(filledLength) + '░'.repeat(20 - filledLength);

    process.stdout.write(
      `\r${label}: [${this.applyColor(bar, 'cyan')}] ${percentage.toFixed(0)}%`
    );

    if (current === total) {
      console.log();
    }
  }

  /**
   * 输出表格
   */
  public printTable(
    headers: string[],
    rows: (string | number)[][]
  ): void {
    const columnWidths = headers.map((header, idx) => {
      const headerWidth = header.length;
      const maxRowWidth = Math.max(...rows.map((row) => String(row[idx]).length));
      return Math.max(headerWidth, maxRowWidth) + 2;
    });

    // 表头
    const headerRow = headers
      .map((h, i) => h.padEnd(columnWidths[i]))
      .join('│');
    console.log(headerRow);
    console.log('─'.repeat(headerRow.length));

    // 数据行
    rows.forEach((row) => {
      const dataRow = row
        .map((cell, i) => String(cell).padEnd(columnWidths[i]))
        .join('│');
      console.log(dataRow);
    });
  }

  /**
   * 创建分隔线
   */
  private createDivider(char: string = '─', length: number = this.width - 4): string {
    return char.repeat(Math.max(10, length));
  }

  /**
   * 渲染分数条
   */
  private renderScoreBar(score: number, width: number = 20): string {
    const filled = Math.round(score * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const percentage = (score * 100).toFixed(0);

    if (this.shouldColorize) {
      const barColor =
        score >= 0.8
          ? chalk.green(bar)
          : score >= 0.5
          ? chalk.yellow(bar)
          : chalk.red(bar);
      return `${barColor} ${percentage}%`;
    }

    return `${bar} ${percentage}%`;
  }

  /**
   * 难度标签
   */
  private difficultyLabel(difficulty: string): string {
    const labels: Record<string, string> = {
      easy: '简单 (1-3小时)',
      medium: '中等 (3-5小时)',
      hard: '困难 (5小时以上)',
    };
    return labels[difficulty] || difficulty;
  }

  /**
   * 难度颜色
   */
  private difficultyColor(difficulty: string): string {
    const colors: Record<string, string> = {
      easy: 'green',
      medium: 'yellow',
      hard: 'red',
    };
    return colors[difficulty] || 'white';
  }

  /**
   * 获取消息前缀
   */
  private getPrefix(type: MessageType): string {
    const prefixes: Record<MessageType, string> = {
      [MessageType.INFO]: SYMBOLS.info,
      [MessageType.SUCCESS]: SYMBOLS.success,
      [MessageType.WARNING]: SYMBOLS.warning,
      [MessageType.ERROR]: SYMBOLS.error,
      [MessageType.PROMPT]: SYMBOLS.question,
      [MessageType.DEBUG]: '[D]',
    };
    return prefixes[type];
  }

  /**
   * 获取消息类型的颜色
   */
  private getColorForType(type: MessageType): keyof typeof chalk {
    const colors: Record<MessageType, keyof typeof chalk> = {
      [MessageType.INFO]: 'cyan',
      [MessageType.SUCCESS]: 'green',
      [MessageType.WARNING]: 'yellow',
      [MessageType.ERROR]: 'red',
      [MessageType.PROMPT]: 'blue',
      [MessageType.DEBUG]: 'gray',
    };
    return colors[type];
  }

  /**
   * 应用颜色
   */
  private applyColor(text: string, color: keyof typeof chalk): string {
    if (!this.shouldColorize) return text;
    return (chalk[color] as any)(text);
  }

  /**
   * 加粗文本
   */
  private bold(text: string): string {
    return this.shouldColorize ? chalk.bold(text) : text;
  }

  /**
   * 高亮文本
   */
  private highlight(text: string): string {
    return this.applyColor(text, 'yellow');
  }

  /**
   * 截断文本
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }
}

/**
 * 单例实例
 */
let formatterInstance: Formatter | null = null;

/**
 * 获取格式化器单例
 */
export function getFormatter(options?: OutputStyleOptions): Formatter {
  if (!formatterInstance) {
    formatterInstance = new Formatter(options);
  }
  return formatterInstance;
}
