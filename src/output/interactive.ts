import { Formatter, getFormatter } from './formatter';
import { InteractivePromptConfig, LoadingState, MessageType } from './types';
import { SYMBOLS } from '@/config/constants';

/**
 * 交互提示管理器
 * 负责与用户交互、显示提示、反馈操作结果等
 */
export class InteractiveManager {
  private formatter: Formatter;
  private loadingTimer: NodeJS.Timeout | null = null;
  private loadingStage = 0;

  constructor(formatter?: Formatter) {
    this.formatter = formatter || getFormatter();
  }

  /**
   * 显示对话欢迎信息
   */
  public showWelcome(): void {
    this.formatter.printWelcome();
  }

  /**
   * 询问用户位置
   */
  public async askLocation(): Promise<string> {
    this.formatter.prompt(
      '请告诉我你的所在位置或地址：',
      ['输入地址（如"福田区"）', '使用当前位置（自动检测）']
    );
    return this.getUserInput();
  }

  /**
   * 询问景点类型
   */
  public async askParkType(): Promise<string> {
    this.formatter.prompt(
      '你更喜欢哪种景点？',
      ['公园 (P)', '爬山/登山 (H)', '都可以 (B)']
    );
    return this.getUserInput();
  }

  /**
   * 询问最大距离
   */
  public async askDistance(): Promise<number> {
    this.formatter.prompt(
      '你能接受的最大距离是多少？',
      ['3 km 以内 (1)', '5 km 以内 (2)', '10 km 以内 (3)', '无限制 (4)']
    );
    const input = await this.getUserInput();
    const distanceMap: Record<string, number> = {
      '1': 3,
      '2': 5,
      '3': 10,
      '4': 999,
      '5': 5,
      '10': 10,
      '999': 999,
    };
    return distanceMap[input] || 10;
  }

  /**
   * 询问难度等级
   */
  public async askDifficulty(): Promise<string> {
    this.formatter.prompt(
      '你的体力如何？',
      ['简单（休闲散步）(E)', '中等（有一定体力消耗）(M)', '困难（需要良好体能）(H)', '都可以 (A)']
    );
    return this.getUserInput();
  }

  /**
   * 询问其他偏好（标签等）
   */
  public async askPreferences(): Promise<string[]> {
    this.formatter.prompt(
      '你对哪些特色景观感兴趣？（可多选，输入数字或"跳过"）',
      [
        '山景 (1)',
        '水景 (2)',
        '城市景观 (3)',
        '自然生态 (4)',
        '历史文化 (5)',
        '儿童友好 (6)',
      ]
    );
    const input = await this.getUserInput();
    if (input.toLowerCase() === 'skip' || input === '') {
      return [];
    }
    return input.split(',').map((s) => s.trim());
  }

  /**
   * 显示推荐结果加载状态
   */
  public startLoading(initialStatus: string = '正在分析你的偏好...'): void {
    let stage = 0;
    let currentStatus = initialStatus;
    const statuses = [
      '正在分析你的偏好...',
      '正在查询景点数据...',
      '正在计算推荐...',
      '即将展示结果...',
    ];

    this.loadingTimer = setInterval(() => {
      this.formatter.printLoading(
        currentStatus || statuses[stage % statuses.length],
        this.loadingStage++
      );
      stage++;
    }, 100);
  }

  /**
   * 更新加载状态文本
   */
  public updateLoadingStatus(status: string): void {
    // 下一次输出会使用新的状态
  }

  /**
   * 停止加载动画
   */
  public stopLoading(): void {
    if (this.loadingTimer) {
      clearInterval(this.loadingTimer);
      this.loadingTimer = null;
    }
    this.formatter.clearLoading();
  }

  /**
   * 显示推荐准备就绪提示
   */
  public showReady(): void {
    this.formatter.message('推荐即将展示...', MessageType.INFO);
  }

  /**
   * 显示后续操作菜单
   */
  public async showNextStepsMenu(): Promise<string> {
    console.log();
    this.formatter.prompt('需要帮助吗？', [
      '查看更多详情 (1)',
      '重新推荐 (2)',
      '保存推荐 (3)',
      '退出 (4)',
    ]);
    return this.getUserInput();
  }

  /**
   * 显示推荐详情菜单
   */
  public async showDetailMenu(locationName: string): Promise<string> {
    console.log();
    this.formatter.prompt(`关于 ${locationName}，你想了解什么？`, [
      '查看完整信息 (1)',
      '查看路线规划 (2)',
      '查看评论 (3)',
      '返回列表 (4)',
    ]);
    return this.getUserInput();
  }

  /**
   * 显示重新推荐选项
   */
  public async showReuseOptionsMenu(): Promise<string> {
    console.log();
    this.formatter.prompt('如何调整推荐？', [
      '修改位置 (1)',
      '修改景点类型 (2)',
      '修改距离限制 (3)',
      '保持设置重新推荐 (4)',
      '返回主菜单 (5)',
    ]);
    return this.getUserInput();
  }

  /**
   * 确认操作
   */
  public async confirm(message: string): Promise<boolean> {
    console.log();
    this.formatter.prompt(`${message}`, ['是 (Y/y)', '否 (N/n)']);
    const input = await this.getUserInput();
    return ['y', 'yes', '1'].includes(input.toLowerCase());
  }

  /**
   * 显示成功消息
   */
  public showSuccess(message: string, duration: number = 2000): void {
    this.formatter.printSuccess(message);
  }

  /**
   * 显示错误消息
   */
  public showError(error: Error | string): void {
    this.formatter.printError(error, {
      showCode: true,
      showStackTrace: false,
      showSuggestion: true,
    });
  }

  /**
   * 显示警告消息
   */
  public showWarning(message: string): void {
    this.formatter.printWarning(message);
  }

  /**
   * 显示信息消息
   */
  public showInfo(message: string): void {
    this.formatter.message(message, MessageType.INFO);
  }

  /**
   * 显示调试信息
   */
  public showDebug(message: string): void {
    if (process.env.DEBUG === 'true') {
      this.formatter.message(message, MessageType.DEBUG);
    }
  }

  /**
   * 显示帮助信息
   */
  public showHelp(): void {
    console.log();
    console.log(
      this.formatter['bold']('命令列表：')
    );
    console.log('  recommend [options]  获取推荐景点');
    console.log('  history              查看推荐历史');
    console.log('  help-detail          显示详细帮助');
    console.log();
    console.log(
      this.formatter['bold']('推荐选项：')
    );
    console.log('  -t, --type <type>    景点类型: park|hiking|both');
    console.log('  -d, --distance <km>  最大距离（公里）');
    console.log('  -l, --location <addr> 起始位置或地址');
    console.log('  -i, --interactive    进入交互模式（默认）');
    console.log();
  }

  /**
   * 显示快捷键提示
   */
  public showHotkeys(): void {
    console.log();
    console.log('快捷键：');
    console.log('  [1-9]  数字选择');
    console.log('  [Enter] 确认选择');
    console.log('  [Esc]   返回上级');
    console.log('  [?]     显示帮助');
    console.log();
  }

  /**
   * 获取用户输入
   * 这是一个模拟实现，实际应该使用 readline 或类似库
   */
  private async getUserInput(): Promise<string> {
    return new Promise((resolve) => {
      process.stdout.write('\n> ');

      let input = '';
      process.stdin.setEncoding('utf8');

      const handleInput = (chunk: string) => {
        if (chunk === '\n' || chunk === '\r\n') {
          process.stdin.removeListener('data', handleInput);
          resolve(input.trim());
        } else if (chunk === '\u0003') {
          // Ctrl+C
          process.exit(0);
        } else {
          input += chunk;
        }
      };

      process.stdin.on('data', handleInput);
    });
  }

  /**
   * 暂停执行（用于演示）
   */
  public async pause(ms: number = 1000): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 单例实例
 */
let interactiveManagerInstance: InteractiveManager | null = null;

/**
 * 获取交互管理器单例
 */
export function getInteractiveManager(
  formatter?: Formatter
): InteractiveManager {
  if (!interactiveManagerInstance) {
    interactiveManagerInstance = new InteractiveManager(formatter);
  }
  return interactiveManagerInstance;
}
