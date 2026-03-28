import { Command } from 'commander';
import { env } from '@/config/env';
import { createLogger } from '@/utils/logger';
import { createTitleBox, color } from '@/utils/format';
import { initializeHarness, LLMExecutorWrapper, MapExecutorWrapper } from '@/harness/index';
import { recommendCommand } from './commands/recommend';
import { helpCommand } from './commands/help';
import { historyCommand } from './commands/history';

const logger = createLogger('cli');

export interface CLIContext {
  harness: any;
  llmWrapper: LLMExecutorWrapper;
  mapWrapper: MapExecutorWrapper;
}

export async function createCLIApp(): Promise<Command> {
  // 初始化 Harness
  const harness = await initializeHarness();
  const llmWrapper = new LLMExecutorWrapper(harness);
  const mapWrapper = new MapExecutorWrapper(harness);
  
  const harnessContext: CLIContext = {
    harness,
    llmWrapper,
    mapWrapper,
  };

  logger.debug('Harness 已初始化', {
    sessionId: harness.getSessionId(),
  });

  const program = new Command();

  program
    .name('park-recommender')
    .description('🏞️  深圳公园景点推荐 CLI Agent')
    .version('1.0.0', '-v, --version', '显示版本号')
    .usage('[command] [options]');

  // 主命令：推荐
  program
    .command('recommend')
    .alias('rec')
    .description('获取景点推荐')
    .option('-t, --type <type>', '景点类型: park|hiking|both', 'both')
    .option('-d, --distance <km>', '最大距离（公里）', '10')
    .option('-l, --location <location>', '起始位置或地址')
    .option('-i, --interactive', '进入交互模式', true)
    .action((options) => recommendCommand(options, harnessContext));

  // 辅助命令：查看历史
  program
    .command('history')
    .description('查看推荐历史')
    .option('-l, --limit <number>', '显示最近 N 条记录', '10')
    .option('--clear', '清空历史记录')
    .action(historyCommand);

  // 辅助命令：帮助
  program
    .command('help-detail')
    .description('显示详细帮助信息')
    .action(helpCommand);

  // 默认命令（无参数或只有 rec 时执行）
  program
    .action(async (cmd: any) => {
      // 如果没有输入命令或命令是 rec，进入推荐流程
      if (!cmd || typeof cmd === 'object') {
        await recommendCommand({
          type: 'both',
          distance: '10',
          interactive: true,
        }, harnessContext);
      }
    });

  return program;
}

export function showWelcome(): void {
  const titleBox = createTitleBox(
    '🏞️  深圳公园景点推荐 Agent',
    50
  );
  console.log('\n' + color.primary(titleBox) + '\n');
  console.log(color.info('  Park & Hiking Recommender for Shenzhen Users'));
  console.log(color.neutral('  版本: 1.0.0'));
  console.log('');
}

export async function runCLI(args?: string[]): Promise<void> {
  try {
    logger.info('CLI 应用启动');
    const program = await createCLIApp();

    if (args && args.length > 0) {
      await program.parseAsync(args);
    } else {
      await program.parseAsync(process.argv);
    }
  } catch (error) {
    logger.error('CLI 执行失败:', error);
    process.exit(1);
  }
}
