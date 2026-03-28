import { createLogger } from '@/utils/logger';
import { runCLI } from '@/cli/index';

const logger = createLogger('main');

async function main() {
  try {
    logger.info('应用启动中...');
    await runCLI();
  } catch (error) {
    logger.error('应用启动失败:', error);
    process.exit(1);
  }
}

main();
