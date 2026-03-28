/**
 * 测试运行器
 * 支持选择性执行不同类型的测试
 */

import { runLLMTests } from './unit/llm.test';

type TestType = 'unit' | 'integration' | 'e2e' | 'performance';

/**
 * 解析命令行参数
 */
function parseArgs(): {
  filter?: TestType;
  verbose?: boolean;
} {
  const args = process.argv.slice(2);
  const result: {
    filter?: TestType;
    verbose?: boolean;
  } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--filter' && i + 1 < args.length) {
      result.filter = args[i + 1] as TestType;
      i++;
    } else if (args[i] === '--verbose') {
      result.verbose = true;
    }
  }

  return result;
}

/**
 * 主测试运行器
 */
async function main() {
  const { filter } = parseArgs();

  console.log('\n' + '='.repeat(70));
  console.log('🏃 测试运行器启动');
  console.log('='.repeat(70));

  const startTime = Date.now();

  try {
    // 单元测试
    if (!filter || filter === 'unit') {
      console.log('\n📌 执行单元测试...');
      await runLLMTests();
    }

    // 集成测试
    if (!filter || filter === 'integration') {
      console.log('\n📌 集成测试 - 暂未实现');
    }

    // E2E 测试
    if (!filter || filter === 'e2e') {
      console.log('\n📌 E2E 测试 - 暂未实现');
    }

    // 性能测试
    if (!filter || filter === 'performance') {
      console.log('\n📌 性能测试 - 暂未实现');
    }

    const duration = Date.now() - startTime;
    console.log('\n' + '='.repeat(70));
    console.log(`✅ 测试完成 (耗时 ${duration}ms)`);
    console.log('='.repeat(70));

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 测试运行出错：');
    console.error(error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
