import { Recommendation, Location } from '@/types/common';
import { Formatter, getFormatter } from './formatter';
import { InteractiveManager, getInteractiveManager } from './interactive';
import {
  OutputStyleOptions,
  RecommendationListConfig,
  ErrorDisplayConfig,
} from './types';

/**
 * 输出管理器
 * 统一管理所有 CLI 输出、交互和用户反馈
 */
export class OutputManager {
  private formatter: Formatter;
  private interactive: InteractiveManager;

  constructor(options: OutputStyleOptions = {}) {
    this.formatter = getFormatter(options);
    this.interactive = getInteractiveManager(this.formatter);
  }

  /**
   * 格式化器访问器
   */
  public getFormatter(): Formatter {
    return this.formatter;
  }

  /**
   * 交互管理器访问器
   */
  public getInteractive(): InteractiveManager {
    return this.interactive;
  }

  /**
   * 显示欢迎界面和开始推荐
   */
  public async showWelcomeAndStart(): Promise<void> {
    this.formatter.printWelcome();
    this.interactive.showHotkeys();
  }

  /**
   * 运行推荐流程（完整的交互流程）
   */
  public async runRecommendationFlow(): Promise<{
    location: string;
    parkType: string;
    distance: number;
    difficulty: string;
    preferences: string[];
  }> {
    // 位置
    const location = await this.interactive.askLocation();

    // 景点类型
    const parkType = await this.interactive.askParkType();

    // 距离
    const distance = await this.interactive.askDistance();

    // 难度
    const difficulty = await this.interactive.askDifficulty();

    // 偏好标签
    const preferences = await this.interactive.askPreferences();

    return { location, parkType, distance, difficulty, preferences };
  }

  /**
   * 显示推荐处理过程
   */
  public startRecommendationProcess(): void {
    this.interactive.startLoading('正在分析你的偏好...');
  }

  /**
   * 完成推荐处理
   */
  public completeRecommendationProcess(): void {
    this.interactive.stopLoading();
    this.interactive.showReady();
  }

  /**
   * 显示推荐结果
   */
  public displayRecommendations(
    recommendations: Recommendation[],
    config?: RecommendationListConfig
  ): void {
    this.formatter.printRecommendations(recommendations, {
      cardConfig: {
        showRanking: true,
        showTags: true,
        showReasonShort: true,
        compact: false,
        lineLength: 60,
      },
      showSummary: true,
      showStats: true,
      separateCards: true,
      ...config,
    });
  }

  /**
   * 显示地点详情
   */
  public displayLocationDetail(location: Location): void {
    this.formatter.printLocationDetail(location);
  }

  /**
   * 显示单个推荐卡片
   */
  public displaySingleCard(
    recommendation: Recommendation,
    index: number = 1
  ): void {
    this.formatter.printRecommendationCard(recommendation, index, {
      showRanking: true,
      showTags: true,
      showReasonShort: false,
      compact: false,
      lineLength: 70,
    });
  }

  /**
   * 处理错误并显示
   */
  public handleError(
    error: Error | string,
    context?: string,
    config?: ErrorDisplayConfig
  ): void {
    if (context) {
      this.interactive.showWarning(`发生错误 (${context}):`);
    }
    this.formatter.printError(error, {
      showCode: true,
      showStackTrace: false,
      showSuggestion: true,
      ...config,
    });
  }

  /**
   * 显示操作结果反馈
   */
  public showOperationResult(success: boolean, message: string): void {
    if (success) {
      this.interactive.showSuccess(message);
    } else {
      this.interactive.showError(message);
    }
  }

  /**
   * 显示加载进度
   */
  public showProgress(current: number, total: number, label: string = ''): void {
    this.formatter.printProgressBar(current, total, label || '进度');
  }

  /**
   * 显示表格数据
   */
  public displayTable(headers: string[], rows: (string | number)[][]): void {
    this.formatter.printTable(headers, rows);
  }

  /**
   * 显示统计信息
   */
  public displayStats(stats: Record<string, number | string>): void {
    console.log();
    console.log('📊 统计信息');
    console.log('─'.repeat(40));
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log();
  }

  /**
   * 获取后续操作选择
   */
  public async getNextSteps(): Promise<string> {
    return this.interactive.showNextStepsMenu();
  }

  /**
   * 获取详情菜单选择
   */
  public async getDetailChoice(locationName: string): Promise<string> {
    return this.interactive.showDetailMenu(locationName);
  }

  /**
   * 获取重新推荐选项
   */
  public async getReuseOptions(): Promise<string> {
    return this.interactive.showReuseOptionsMenu();
  }

  /**
   * 获取确认
   */
  public async getConfirmation(message: string): Promise<boolean> {
    return this.interactive.confirm(message);
  }

  /**
   * 显示帮助
   */
  public showHelp(): void {
    this.interactive.showHelp();
  }

  /**
   * 清空屏幕
   */
  public clearScreen(): void {
    console.clear();
  }

  /**
   * 显示分隔符
   */
  public showDivider(): void {
    console.log('─'.repeat(Math.min(80, process.stdout.columns || 80)));
  }

  /**
   * 暂停
   */
  public async pause(ms: number = 1000): Promise<void> {
    return this.interactive.pause(ms);
  }

  /**
   * 显示摘要
   */
  public displaySummary(data: Record<string, string | number>): void {
    console.log();
    console.log('📋 摘要');
    console.log('─'.repeat(40));
    Object.entries(data).forEach(([key, value]) => {
      console.log(`  • ${key}: ${value}`);
    });
    console.log();
  }

  /**
   * 显示提示信息列表
   */
  public displayTips(tips: string[]): void {
    console.log();
    console.log('💡 温馨提示');
    console.log('─'.repeat(40));
    tips.forEach((tip) => {
      console.log(`  • ${tip}`);
    });
    console.log();
  }

  /**
   * 显示关键步骤
   */
  public displaySteps(steps: { title: string; description: string }[]): void {
    console.log();
    steps.forEach((step, idx) => {
      console.log(`  ${idx + 1}. ${step.title}`);
      console.log(`     ${step.description}`);
    });
    console.log();
  }

  /**
   * 确认并继续
   */
  public async confirmAndContinue(message: string = '按 Enter 继续...'): Promise<void> {
    process.stdout.write(message);
    return new Promise((resolve) => {
      process.stdin.once('data', () => {
        resolve();
      });
    });
  }

  /**
   * 创建分行符
   */
  public createDivider(char: string = '─', length: number = 60): string {
    return char.repeat(Math.max(10, length));
  }
}

/**
 * 单例实例
 */
let outputManagerInstance: OutputManager | null = null;

/**
 * 获取输出管理器单例
 */
export function getOutputManager(options?: OutputStyleOptions): OutputManager {
  if (!outputManagerInstance) {
    outputManagerInstance = new OutputManager(options);
  }
  return outputManagerInstance;
}

/**
 * 重置单例（用于测试）
 */
export function resetOutputManager(): void {
  outputManagerInstance = null;
}
