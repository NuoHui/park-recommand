/**
 * 完整流程集成测试运行脚本
 */

import { testCompleteFlow } from '../src/__tests__/integration/complete-flow.test';
import { runE2ECompleteFlowTest } from '../src/__tests__/e2e/complete-flow.test';

async function main() {
  try {
    // 运行集成测试
    console.log('\n');
    console.log('█'.repeat(80));
    console.log('  运行集成测试: 完整流程');
    console.log('█'.repeat(80));

    const integrationResult = await testCompleteFlow();

    console.log('\n');
    console.log('█'.repeat(80));
    console.log('  运行 E2E 测试: 完整流程');
    console.log('█'.repeat(80));

    const e2eResult = await runE2ECompleteFlowTest();

    // 汇总结果
    console.log('\n');
    console.log('█'.repeat(80));
    console.log('  📊 测试总结');
    console.log('█'.repeat(80));

    console.log('\n✅ 集成测试结果:');
    console.log(JSON.stringify(integrationResult, null, 2));

    console.log('\n✅ E2E 测试结果:');
    console.log(JSON.stringify(e2eResult, null, 2));

    console.log('\n');
    console.log('█'.repeat(80));
    console.log('  ✨ 所有测试完成');
    console.log('█'.repeat(80));
    console.log('\n');
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

main();
