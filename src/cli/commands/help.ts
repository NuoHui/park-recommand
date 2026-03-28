import { createLogger } from '@/utils/logger';
import { color, createTitleBox, createDivider } from '@/utils/format';

const logger = createLogger('command:help');

export async function helpCommand(): Promise<void> {
  try {
    logger.info('详细帮助命令启动');

    const titleBox = createTitleBox('详细帮助', 60);
    console.log('\n' + color.primary(titleBox) + '\n');

    console.log(color.info('📖 使用指南\n'));

    // 基本用法
    console.log(color.primary('1. 基本命令'));
    console.log(color.neutral(createDivider('─', 60)));
    console.log('');
    console.log('  推荐景点 (交互模式):');
    console.log(color.primary('    $ npm run dev recommend'));
    console.log(color.primary('    $ npm run dev rec'));
    console.log('');
    console.log('  查看推荐历史:');
    console.log(color.primary('    $ npm run dev history'));
    console.log(color.primary('    $ npm run dev history --limit 20'));
    console.log('');
    console.log('  显示此帮助:');
    console.log(color.primary('    $ npm run dev help-detail'));
    console.log('');

    // 交互流程
    console.log(color.primary('2. 推荐交互流程'));
    console.log(color.neutral(createDivider('─', 60)));
    console.log('');
    console.log('  步骤 1: 输入你的位置');
    console.log('    示例: 南山区 / 科技园 / 深圳市中心');
    console.log('');
    console.log('  步骤 2: 选择景点类型');
    console.log('    - P: 公园 (Park)');
    console.log('    - H: 爬山 (Hiking)');
    console.log('    - B: 都可以 (Both)');
    console.log('');
    console.log('  步骤 3: 选择距离范围');
    console.log('    [1] 3 km 以内 (距离最近)');
    console.log('    [2] 5 km 以内');
    console.log('    [3] 10 km 以内');
    console.log('    [4] 无限制 (距离无限)');
    console.log('');
    console.log('  步骤 4: 获取推荐结果');
    console.log('    系统将根据你的偏好推荐最合适的景点');
    console.log('');

    // 参数选项
    console.log(color.primary('3. 高级选项'));
    console.log(color.neutral(createDivider('─', 60)));
    console.log('');
    console.log('  recommend 命令选项:');
    console.log(color.primary('    -t, --type <type>'));
    console.log('      景点类型: park|hiking|both (默认: both)');
    console.log('');
    console.log(color.primary('    -d, --distance <km>'));
    console.log('      最大距离（公里） (默认: 10)');
    console.log('');
    console.log(color.primary('    -l, --location <location>'));
    console.log('      起始位置或地址');
    console.log('');
    console.log(color.primary('    -i, --interactive'));
    console.log('      进入交互模式 (默认: true)');
    console.log('');

    // 示例
    console.log(color.primary('4. 使用示例'));
    console.log(color.neutral(createDivider('─', 60)));
    console.log('');
    console.log('  示例 1: 交互推荐（推荐）');
    console.log(color.primary('    $ npm run dev recommend'));
    console.log('');
    console.log('  示例 2: 快速推荐（仅爬山）');
    console.log(color.primary('    $ npm run dev recommend -t hiking -d 5'));
    console.log('');
    console.log('  示例 3: 指定位置推荐');
    console.log(color.primary('    $ npm run dev recommend -l "南山区" -t park'));
    console.log('');
    console.log('  示例 4: 查看最近 20 条推荐记录');
    console.log(color.primary('    $ npm run dev history --limit 20'));
    console.log('');

    // FAQ
    console.log(color.primary('5. 常见问题'));
    console.log(color.neutral(createDivider('─', 60)));
    console.log('');
    console.log('  Q: 如何配置 API Keys?');
    console.log('  A: 编辑 .env 文件，设置 OPENAI_API_KEY 和 AMAP_API_KEY');
    console.log('');
    console.log('  Q: 支持哪些 LLM?');
    console.log('  A: 支持 OpenAI 和 Anthropic Claude，通过 LLM_PROVIDER 选择');
    console.log('');
    console.log('  Q: 推荐结果如何保存?');
    console.log('  A: 自动保存到本地缓存，可通过 history 命令查看');
    console.log('');
    console.log('  Q: 如何清空推荐历史?');
    console.log('  A: 使用 npm run dev history --clear');
    console.log('');

    console.log(color.success('✓ 需要更多帮助? 请查看 README.md\n'));
  } catch (error) {
    logger.error('帮助命令失败:', error);
  }
}
