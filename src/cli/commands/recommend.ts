import { createLogger } from '@/utils/logger';
import { color, createTitleBox, createDivider } from '@/utils/format';
import { DialogueManager } from '@/dialogue/manager';

const logger = createLogger('command:recommend');

interface RecommendOptions {
  type: string;
  distance: string;
  location?: string;
  interactive: boolean;
}

export async function recommendCommand(options: RecommendOptions): Promise<void> {
  try {
    logger.info('推荐命令启动', { options });

    const titleBox = createTitleBox('推荐景点', 50);
    console.log('\n' + color.primary(titleBox) + '\n');

    // 创建对话管理器
    const dialogueManager = new DialogueManager({
      maxTurns: 10,
      timeout: 30000,
      logHistory: true,
    });

    // 如果是交互模式，启动多轮对话
    if (options.interactive) {
      console.log(color.info('[i] 进入交互推荐模式...'));
      console.log(color.neutral(`${createDivider('─', 50)}\n`));

      // 初始化对话
      await dialogueManager.initialize();

      // 如果提供了位置，直接使用
      if (options.location) {
        console.log(`✓ 位置: ${color.primary(options.location)}`);
        await dialogueManager.addUserInput(options.location);
      } else {
        // 进入交互流程
        await interactiveRecommend(dialogueManager);
      }
    } else {
      // 快速推荐模式（直接使用参数）
      await quickRecommend(options);
    }
  } catch (error) {
    logger.error('推荐命令失败:', error);
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    console.error(color.error(`✗ 错误: ${errorMsg}`));
    process.exit(1);
  }
}

async function interactiveRecommend(manager: DialogueManager): Promise<void> {
  const readline = await import('readline');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(`[?] ${prompt}`, (answer) => {
        resolve(answer);
      });
    });
  };

  try {
    // 阶段 1: 收集位置
    const location = await question('请告诉我你的所在位置或地址: ');
    if (location.trim()) {
      await manager.addUserInput(location);
    }

    // 阶段 2: 收集景点类型
    console.log('');
    console.log(color.info('[i] 你更喜欢哪种景点?'));
    console.log('    > 公园 (P)');
    console.log('    > 爬山 (H)');
    console.log('    > 都可以 (B)');
    const typeChoice = await question('请选择 [P/H/B]: ');
    if (typeChoice.trim()) {
      await manager.addUserInput(typeChoice);
    }

    // 阶段 3: 收集距离偏好
    console.log('');
    console.log(color.info('[i] 你希望景点距离多远?'));
    console.log('    [1] 3 km 以内');
    console.log('    [2] 5 km 以内');
    console.log('    [3] 10 km 以内');
    console.log('    [4] 无限制');
    const distanceChoice = await question('请选择 [1-4]: ');
    if (distanceChoice.trim()) {
      await manager.addUserInput(distanceChoice);
    }

    // 获取推荐结果
    console.log('');
    console.log(color.info('[i] 正在分析你的偏好并获取推荐...'));
    const result = await manager.getRecommendations();

    if (result.success && result.recommendations) {
      displayRecommendations(result.recommendations);
    } else {
      console.log(color.warning('[!] 暂无推荐结果'));
    }
  } finally {
    rl.close();
  }
}

async function quickRecommend(options: RecommendOptions): Promise<void> {
  console.log(color.warning('[!] 快速推荐模式（功能待完善）'));
  console.log(color.info('[i] 使用参数:'));
  console.log(`    类型: ${options.type}`);
  console.log(`    距离: ${options.distance} km`);
  if (options.location) {
    console.log(`    位置: ${options.location}`);
  }
  console.log('');
  console.log(color.info('[i] 请使用 --interactive 或不带参数以进入交互模式'));
}

function displayRecommendations(recommendations: Array<{
  id: string;
  name: string;
  reason: string;
  distance?: number;
  rating?: number;
}>): void {
  console.log('');
  console.log(color.success('✓ 推荐完成！\n'));
  console.log(color.neutral(createDivider('─', 50)));
  console.log(color.primary('推荐结果:'));
  console.log(color.neutral(createDivider('─', 50)));
  console.log('');

  recommendations.forEach((rec, index) => {
    console.log(color.primary(`#${index + 1}  ${rec.name}`));
    if (rec.distance) {
      console.log(`    距离: ${rec.distance.toFixed(1)} km`);
    }
    if (rec.rating) {
      console.log(`    评分: ${'★'.repeat(Math.floor(rec.rating))}${'☆'.repeat(5 - Math.floor(rec.rating))} ${rec.rating}/5.0`);
    }
    console.log(`    推荐理由: ${rec.reason}`);
    console.log('');
  });

  console.log(color.neutral(createDivider('─', 50)));
}
