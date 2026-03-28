import { createLogger } from '@/utils/logger';
import { color, createDivider, createTable } from '@/utils/format';
import { CacheManager } from '@/cache/manager';

const logger = createLogger('command:history');

interface HistoryOptions {
  limit: string;
  clear?: boolean;
}

export async function historyCommand(options: HistoryOptions): Promise<void> {
  try {
    logger.info('历史查看命令启动', { options });

    const cacheManager = CacheManager.getInstance();

    if (options.clear) {
      console.log(color.warning('[!] 确定要清空所有推荐历史吗? (yes/no)'));
      // 实际应该读取用户输入，这里简化处理
      console.log(color.info('[i] 功能待完善'));
      return;
    }

    const limit = parseInt(options.limit, 10) || 10;

    console.log('');
    console.log(color.primary(`显示最近 ${limit} 条推荐记录`));
    console.log(color.neutral(createDivider('─', 50)));
    console.log('');

    // 获取历史记录（从缓存）
    const history = await cacheManager.getHistory(limit);

    if (history.length === 0) {
      console.log(color.warning('[!] 暂无推荐历史'));
      return;
    }

    // 格式化表格数据
    const headers = ['时间', '位置', '景点类型', '推荐数量'];
    const rows = history.map((item) => [
      new Date(item.timestamp).toLocaleString('zh-CN'),
      item.location || '未知',
      item.parkType || '未知',
      item.count.toString(),
    ]);

    console.log(createTable(headers, rows, [20, 15, 12, 10]));
    console.log('');
  } catch (error) {
    logger.error('历史查看命令失败:', error);
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    console.error(color.error(`✗ 错误: ${errorMsg}`));
  }
}
