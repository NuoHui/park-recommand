/**
 * 对话引擎使用示例
 * 展示如何使用对话系统的各个组件
 */

import { DialogueManager } from '@/dialogue/manager';
import { SessionManager } from '@/dialogue/session';
import { ContextManager } from '@/dialogue/context';
import { DialogueFlowEngine } from '@/dialogue/flow-engine';
import { createLogger } from '@/utils/logger';

const logger = createLogger('example:dialogue');

/**
 * 示例 1: 基础对话流程
 */
async function exampleBasicDialogue() {
  console.log('\n=== 示例 1: 基础对话流程 ===\n');

  const manager = new DialogueManager({
    maxTurns: 10,
    timeout: 30000,
    logHistory: true,
  });

  // 初始化对话
  await manager.initialize();
  console.log(`✓ 对话已初始化，会话ID: ${manager.sessionId}`);

  // 获取流程引擎
  const flowEngine = manager.getFlowEngine();

  // 收集位置信息
  console.log(`\n当前阶段: ${flowEngine.getCurrentPhase()}`);
  const locationResult = flowEngine.handleLocationInput('南山区');
  console.log(`位置输入: ${locationResult.message}`);
  flowEngine.nextPhase();

  // 收集景点类型
  console.log(`\n当前阶段: ${flowEngine.getCurrentPhase()}`);
  const typeResult = flowEngine.handleTypeInput('h');
  console.log(`类型选择: ${typeResult.message}`);
  flowEngine.nextPhase();

  // 收集距离偏好
  console.log(`\n当前阶段: ${flowEngine.getCurrentPhase()}`);
  const distanceResult = flowEngine.handleDistanceInput('2');
  console.log(`距离选择: ${distanceResult.message}`);
  flowEngine.nextPhase();

  // 获取用户偏好
  const contextManager = manager.getContextManager();
  const preference = contextManager.getPreference();
  console.log(`\n用户偏好:`, preference);

  // 获取对话进度
  const progress = manager.getProgress();
  console.log(`\n对话进度:`, progress);

  // 关闭对话
  await manager.close();
  console.log(`\n✓ 对话已结束`);
}

/**
 * 示例 2: 上下文管理
 */
async function exampleContextManagement() {
  console.log('\n=== 示例 2: 上下文管理 ===\n');

  const contextManager = new ContextManager();

  // 添加消息
  contextManager.addMessage('assistant', '欢迎使用景点推荐系统！');
  contextManager.addMessage('user', '我在南山区');
  contextManager.addMessage('assistant', '明白了，请选择景点类型...');

  // 更新用户偏好
  contextManager.updatePreference({
    location: '南山区',
    parkType: 'hiking',
    maxDistance: 5,
  });

  // 获取消息
  console.log(`总消息数: ${contextManager.getMessages().length}`);
  console.log(`最后用户消息: ${contextManager.getLastUserMessage()?.content}`);

  // 获取上下文
  const context = contextManager.getContext();
  console.log(`\n对话上下文摘要:`);
  console.log(`  - 会话ID: ${context.sessionId}`);
  console.log(`  - 消息数: ${context.messages.length}`);
  console.log(`  - 用户位置: ${context.userPreference.location}`);
  console.log(`  - 景点类型: ${context.userPreference.parkType}`);

  // 导出为JSON
  const json = contextManager.toJSON();
  console.log(`\n完整上下文已准备导出 (${JSON.stringify(json).length} 字节)`);
}

/**
 * 示例 3: 对话流程引擎
 */
async function exampleFlowEngine() {
  console.log('\n=== 示例 3: 对话流程引擎 ===\n');

  const contextManager = new ContextManager();
  const flowEngine = new DialogueFlowEngine(contextManager);

  console.log(`初始阶段: ${flowEngine.getCurrentPhase()}`);
  console.log(`流程可视化: ${flowEngine.getFlowVisualization()}`);

  // 模拟用户交互
  const inputs = [
    { type: 'location', value: '福田区' },
    { type: 'type', value: 'b' }, // both
    { type: 'distance', value: '3' }, // 10 km
  ];

  for (const input of inputs) {
    console.log(`\n处理输入: ${input.type} = ${input.value}`);

    let result;
    switch (input.type) {
      case 'location':
        result = flowEngine.handleLocationInput(input.value);
        break;
      case 'type':
        result = flowEngine.handleTypeInput(input.value);
        break;
      case 'distance':
        result = flowEngine.handleDistanceInput(input.value);
        break;
    }

    console.log(`  结果: ${result?.message}`);
    console.log(`  完整度: ${flowEngine.getPreferenceCompleteness()}%`);

    if (result?.success) {
      flowEngine.nextPhase();
    }
  }

  console.log(`\n最终阶段: ${flowEngine.getCurrentPhase()}`);
  console.log(`流程可视化: ${flowEngine.getFlowVisualization()}`);

  // 检查偏好完整性
  console.log(`\n偏好是否完整: ${flowEngine.isPreferenceComplete()}`);
  console.log(`缺失字段: ${flowEngine.getMissingPreferenceFields()}`);
}

/**
 * 示例 4: 会话管理和持久化
 */
async function exampleSessionManagement() {
  console.log('\n=== 示例 4: 会话管理和持久化 ===\n');

  const sessionManager = new SessionManager('./test-sessions');

  // 创建新会话
  const contextManager = sessionManager.createSession();
  const sessionId = contextManager.getSessionId();
  console.log(`✓ 创建会话: ${sessionId}`);

  // 添加一些数据
  contextManager.addMessage('assistant', '欢迎！');
  contextManager.addMessage('user', '推荐公园');
  contextManager.updatePreference({ location: '罗湖区', parkType: 'park' });

  // 保存会话
  await sessionManager.saveSession(sessionId, contextManager);
  console.log(`✓ 会话已保存`);

  // 关闭会话
  sessionManager.closeSession(sessionId);
  console.log(`✓ 会话已关闭`);

  // 列出已保存的会话
  const savedSessions = await sessionManager.listSavedSessions();
  console.log(`\n已保存的会话 (${savedSessions.length} 个):`);
  for (const session of savedSessions) {
    const date = new Date(session.savedAt).toLocaleString();
    console.log(`  - ${session.sessionId} (${session.messageCount} 条消息) [${date}]`);
  }

  // 加载会话
  const loaded = await sessionManager.loadSession(sessionId);
  if (loaded) {
    console.log(`\n✓ 会话已加载`);
    console.log(`  消息数: ${loaded.getMessages().length}`);
    console.log(`  用户偏好: ${JSON.stringify(loaded.getPreference())}`);
  }

  // 获取会话统计
  const stats = await sessionManager.getSessionStats();
  console.log(`\n会话统计:`);
  console.log(`  - 活跃会话: ${stats.activeCount}`);
  console.log(`  - 已保存会话: ${stats.savedCount}`);
  console.log(`  - 总消息数: ${stats.totalMessages}`);

  // 清理测试会话
  await sessionManager.deleteSession(sessionId);
  console.log(`\n✓ 测试会话已清理`);
}

/**
 * 示例 5: 完整的对话流程模拟
 */
async function exampleFullDialogueFlow() {
  console.log('\n=== 示例 5: 完整的对话流程模拟 ===\n');

  const manager = new DialogueManager({
    maxTurns: 15,
    timeout: 30000,
    logHistory: true,
  });

  // 初始化
  await manager.initialize();
  console.log('AI: 你好！我是景点推荐助手。');

  // 模拟用户与AI的多轮对话
  const userInputs = [
    '我在南山科技园附近',
    'h',
    '2',
  ];

  for (const input of userInputs) {
    console.log(`\n👤 用户: ${input}`);
    await manager.addUserInput(input);

    const progress = manager.getProgress();
    console.log(`📊 进度: ${progress.completeness}% 完成 (${progress.turnCount}/${progress.maxTurns} 轮)`);
  }

  // 获取最终状态
  const context = manager.getContextManager().getContext();
  console.log(`\n📝 会话总结:`);
  console.log(`  - 消息数: ${context.messages.length}`);
  console.log(`  - 用户位置: ${context.userPreference.location}`);
  console.log(`  - 景点类型: ${context.userPreference.parkType}`);
  console.log(`  - 最大距离: ${context.userPreference.maxDistance} km`);

  // 模拟保存会话
  await manager.saveSession();
  console.log(`\n💾 会话已保存`);

  // 关闭对话
  await manager.close();
  console.log(`✓ 对话已结束`);
}

/**
 * 运行所有示例
 */
async function runAllExamples() {
  try {
    await exampleBasicDialogue();
    await exampleContextManagement();
    await exampleFlowEngine();
    await exampleSessionManagement();
    await exampleFullDialogueFlow();

    console.log('\n\n=== 所有示例执行完成 ✓ ===\n');
  } catch (error) {
    logger.error('示例执行失败', error);
    console.error(error);
  }
}

// 导出
export {
  exampleBasicDialogue,
  exampleContextManagement,
  exampleFlowEngine,
  exampleSessionManagement,
  exampleFullDialogueFlow,
  runAllExamples,
};
