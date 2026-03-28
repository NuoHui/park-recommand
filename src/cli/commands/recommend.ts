import { createLogger } from '@/utils/logger';
import { color, createTitleBox } from '@/utils/format';
import { getLocationService } from '@/map/service';
import { getLLMService } from '@/llm/service';
import { CLIContext } from '../index';
import * as readline from 'readline';

const logger = createLogger('command:recommend');

interface RecommendOptions {
  type: string;
  distance: string;
  location?: string;
  interactive: boolean;
}

export async function recommendCommand(
  options: RecommendOptions,
  harnessContext: CLIContext
): Promise<void> {
  if (!harnessContext) {
    console.error(color.error('✗ 错误: Harness 上下文不可用，无法继续执行'));
    process.exit(1);
  }

  try {
    logger.info('推荐命令启动', { options });

    const titleBox = createTitleBox('推荐景点', 50);
    console.log('\n' + color.primary(titleBox) + '\n');

    // 进入推荐流程（通过 Harness 架构）
    await recommendFlow(harnessContext);
  } catch (error) {
    logger.error('推荐命令失败:', error);
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    console.error(color.error(`✗ 错误: ${errorMsg}`));
    process.exit(1);
  }
}

/**
 * 推荐流程：交互输入 → Harness LLM 处理 → 地图查询 → 推荐展示
 */
async function recommendFlow(harnessContext: CLIContext): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  };

  try {
    const llmService = getLLMService();
    const locationService = getLocationService();

    if (!llmService.isInitialized()) {
      await llmService.initialize();
    }

    console.log(color.info('欢迎使用智能推荐系统！'));
    console.log(color.neutral('请用一句话告诉我你的需求，例如：\n'));
    console.log(color.neutral('  "我住在深圳宝安西乡，帮我推荐附近有哪些公园"'));
    console.log(color.neutral('  "深圳南山附近有没有好的登山地点？"'));
    console.log(color.neutral('  "推荐我深圳罗湖附近的景区"\n'));

    // 获取用户输入
    const userInput = await question(color.primary('[?] 你的需求: '));

    if (!userInput.trim()) {
      console.log(color.warning('[!] 请输入有效的需求'));
      rl.close();
      return;
    }

    console.log('');
    console.log(color.info('[i] 分析你的需求...'));

    // 通过 Harness 执行 LLM 参数提取
    const llmEngine = llmService.getEngine();

    // 使用 LLM 进行参数生成
    const searchParams = await llmEngine.generateSearchParams({
      location: userInput,
    });

    if (!searchParams.shouldRecommend) {
      console.log(color.warning(`[!] ${searchParams.reasoning}`));
      rl.close();
      return;
    }

    console.log(color.success('✓ 参数提取成功\n'));
    console.log(color.info('[i] 正在查询推荐景点...'));

    // 查询地图
    const locations = await locationService.searchRecommendedLocations({
      location: searchParams.searchParams.location || userInput,
      parkType: (searchParams.searchParams.parkType || 'both') as any,
      maxDistance: searchParams.searchParams.maxDistance || 10,
    });

    if (!locations || locations.length === 0) {
      console.log(color.warning('[!] 未找到符合条件的景点'));
      rl.close();
      return;
    }

    console.log(color.success(`✓ 找到 ${locations.length} 个景点\n`));

    // 通过 LLM 解析推荐
    const llmResult = await llmEngine.parseRecommendations(JSON.stringify(locations.slice(0, 10)));

    // 展示推荐
    console.log(color.primary('\n🎯 推荐结果：\n'));
    llmResult.locations.forEach((loc, idx) => {
      console.log(color.success(`${idx + 1}. ${loc.name}`));
      console.log(color.neutral(`   原因: ${loc.reason}`));
      console.log(color.info(`   相关度: ${(loc.relevanceScore * 100).toFixed(0)}%`));
      console.log('');
    });

    console.log(color.info(`\n📝 ${llmResult.explanation}`));

    rl.close();
  } catch (error) {
    rl.close();
    logger.error('推荐流程出错:', error);
    throw error;
  }
}
