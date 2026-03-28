# 对话引擎实现文档

## 概述

对话引擎是深圳公园推荐 CLI Agent 的核心组件，负责管理与用户的多轮对话交互、上下文维护和会话管理。

## 核心模块

### 1. ContextManager（上下文管理器）

**文件**: `src/dialogue/context.ts`

负责维护对话过程中的所有状态和历史信息。

**主要功能**：
- 维护对话消息历史
- 跟踪用户偏好
- 管理推荐结果
- 提供上下文序列化/反序列化

**关键方法**：
```typescript
addMessage(role, content, metadata)          // 添加消息
getMessages()                                // 获取所有消息
getRecentMessages(count)                     // 获取最近N条消息
updatePreference(preference)                 // 更新用户偏好
getPreference()                              // 获取用户偏好
setRecommendations(recommendations)          // 设置推荐结果
getRecommendations()                         // 获取推荐结果
getContext()                                 // 获取完整上下文
```

**使用示例**：
```typescript
const contextManager = new ContextManager();
contextManager.addMessage('user', '我在南山区');
contextManager.updatePreference({ location: '南山区' });
const context = contextManager.getContext();
```

### 2. DialogueFlowEngine（对话流程引擎）

**文件**: `src/dialogue/flow-engine.ts`

管理对话的流程逻辑、状态转移和用户输入处理。

**对话阶段**（DialoguePhase）：
1. `GREETING` - 问候
2. `COLLECTING_LOCATION` - 收集位置信息
3. `COLLECTING_TYPE` - 收集景点类型
4. `COLLECTING_DISTANCE` - 收集距离偏好
5. `COLLECTING_DIFFICULTY` - 收集难度偏好（可选）
6. `QUERYING` - 查询数据
7. `RECOMMENDING` - 展示推荐
8. `COMPLETED` - 完成

**主要功能**：
- 管理对话阶段转移
- 处理用户输入并验证
- 跟踪对话进度
- 计算偏好完整度

**关键方法**：
```typescript
getCurrentPhase()                            // 获取当前阶段
nextPhase()                                  // 进入下一阶段
previousPhase()                              // 返回上一阶段
skipPhase()                                  // 跳过可选阶段
handleLocationInput(location)                // 处理位置输入
handleTypeInput(choice)                      // 处理类型选择
handleDistanceInput(choice)                  // 处理距离选择
handleDifficultyInput(choice)                // 处理难度选择
isPreferenceComplete()                       // 检查偏好是否完整
getPreferenceCompleteness()                  // 获取偏好完整度 (0-100)
getDialogueProgress()                        // 获取对话进度
getFlowVisualization()                       // 获取流程可视化
```

**用户输入处理示例**：
```typescript
const engine = new DialogueFlowEngine(contextManager);

// 位置输入
const locationResult = engine.handleLocationInput('南山区');
if (locationResult.success) {
  engine.nextPhase();
}

// 类型选择
const typeResult = engine.handleTypeInput('h'); // hiking
if (typeResult.success) {
  console.log(`选择: ${typeResult.type}`);
}

// 距离选择
const distanceResult = engine.handleDistanceInput('2');
if (distanceResult.success) {
  console.log(`距离: ${distanceResult.distance} km`);
}
```

### 3. SessionManager（会话管理器）

**文件**: `src/dialogue/session.ts`

负责对话会话的保存、加载、管理等操作。

**主要功能**：
- 创建和管理会话
- 保存会话到文件
- 加载已保存的会话
- 会话过期清理
- 会话统计

**关键方法**：
```typescript
createSession(sessionId?)                    // 创建新会话
getActiveSession(sessionId)                  // 获取活跃会话
listActiveSessions()                         // 列出所有活跃会话
closeSession(sessionId)                      // 关闭会话
saveSession(sessionId, manager)              // 保存会话到文件
loadSession(sessionId)                       // 从文件加载会话
deleteSession(sessionId)                     // 删除已保存的会话
listSavedSessions()                          // 列出所有已保存的会话
cleanupOldSessions(maxAgeDays)               // 清理过期会话
exportSessionAsText(sessionId)               // 导出会话为文本
getSessionStats()                            // 获取会话统计
```

**会话持久化示例**：
```typescript
const sessionManager = new SessionManager('./sessions');

// 创建并保存会话
const manager = sessionManager.createSession();
manager.addMessage('assistant', '欢迎！');
await sessionManager.saveSession(manager.getSessionId(), manager);

// 加载已保存的会话
const loaded = await sessionManager.loadSession(sessionId);
if (loaded) {
  const messages = loaded.getMessages();
}

// 列出所有已保存的会话
const saved = await sessionManager.listSavedSessions();
```

### 4. StateMachine（状态机）

**文件**: `src/dialogue/state-machine.ts`

验证和管理对话状态的合法转移。

**状态转移规则**：
- `GREETING` → `COLLECTING_LOCATION`
- `COLLECTING_LOCATION` → `COLLECTING_TYPE`
- `COLLECTING_TYPE` → `COLLECTING_DISTANCE`
- `COLLECTING_DISTANCE` → `COLLECTING_DIFFICULTY`, `QUERYING`
- `COLLECTING_DIFFICULTY` → `QUERYING`
- `QUERYING` → `RECOMMENDING`
- `RECOMMENDING` → `COMPLETED`, `COLLECTING_LOCATION` (重新开始)
- `COMPLETED` → `GREETING`

**主要方法**：
```typescript
transition(nextState)                        // 转移到新状态
getState()                                   // 获取当前状态
canTransitionTo(nextState)                   // 检查是否可转移
getAllowedNextStates()                       // 获取允许的下一步
reset()                                      // 重置状态机
```

### 5. DialogueManager（对话管理器）

**文件**: `src/dialogue/manager.ts`

顶层对话管理器，整合所有组件。

**主要功能**：
- 初始化和管理对话生命周期
- 处理用户输入和对话流转
- 集成所有对话子组件
- 提供完整的对话接口

**关键方法**：
```typescript
initialize()                                 // 初始化对话
addUserInput(content)                        // 添加用户输入
getRecommendations()                         // 获取推荐结果
getState()                                   // 获取当前状态
getFlowEngine()                              // 获取流程引擎
getContextManager()                          // 获取上下文管理器
getProgress()                                // 获取对话进度
getFlowVisualization()                       // 获取流程可视化
saveSession()                                // 保存会话
restoreFromSession(sessionId)                // 恢复已保存会话
close()                                      // 结束对话
```

## 对话流程示例

```typescript
import { DialogueManager } from '@/dialogue/manager';

// 创建对话管理器
const dialogueManager = new DialogueManager({
  maxTurns: 10,
  timeout: 30000,
  logHistory: true,
});

// 初始化对话
await dialogueManager.initialize();

// 收集用户位置
await dialogueManager.addUserInput('南山区');

// 收集景点类型
await dialogueManager.addUserInput('h'); // 爬山

// 收集距离偏好
await dialogueManager.addUserInput('2'); // 5 km以内

// 获取推荐结果
const result = await dialogueManager.getRecommendations();
console.log(result.recommendations);

// 保存会话
await dialogueManager.saveSession();

// 结束对话
await dialogueManager.close();
```

## 数据流程

```
用户输入
  ↓
DialogueManager.addUserInput()
  ↓
DialogueFlowEngine.handle*Input()
  ↓
ContextManager.addMessage() + updatePreference()
  ↓
StateMachine.transition()
  ↓
对话状态更新
  ↓
SessionManager.saveSession()（可选）
```

## 上下文结构

```typescript
DialogueContext {
  sessionId: string                          // 会话ID
  messages: DialogueMessage[]               // 对话历史
  userPreference: UserPreference            // 用户偏好
  recommendations?: Recommendation[]        // 推荐结果
  createdAt: number                         // 创建时间
  updatedAt: number                         // 更新时间
}

DialogueMessage {
  id: string                                // 消息ID
  role: 'user' | 'assistant'               // 消息角色
  content: string                           // 消息内容
  timestamp: number                         // 时间戳
  metadata?: Record<string, any>            // 元数据
}

UserPreference {
  location?: string                         // 位置
  latitude?: number                         // 纬度
  longitude?: number                        // 经度
  parkType?: 'park' | 'hiking' | 'both'    // 景点类型
  maxDistance?: number                      // 最大距离(km)
  minDifficulty?: DifficultyLevel           // 最小难度
  maxDifficulty?: DifficultyLevel           // 最大难度
  preferredTags?: string[]                  // 偏好标签
  visitTime?: string                        // 访问时间
  groupSize?: number                        // 团队规模
}
```

## 会话存储

会话数据以 JSON 格式存储在 `./sessions/` 目录下：

```
sessions/
├── session-id-1.json
├── session-id-2.json
└── ...
```

每个会话文件包含完整的 DialogueContext 信息，支持离线恢复。

## 错误处理

所有方法返回结构化结果，包含：
- `success: boolean` - 操作是否成功
- `message?: string` - 反馈消息
- 相关数据字段

**示例**：
```typescript
const result = engine.handleLocationInput('南山区');
if (!result.success) {
  console.error(result.message);
} else {
  console.log(result.message);
}
```

## 日志记录

对话引擎集成 Winston 日志系统，记录：
- 对话创建/初始化/结束
- 用户输入和处理结果
- 状态转移
- 会话保存/加载
- 错误信息

日志级别：
- `info` - 主要事件
- `debug` - 详细跟踪
- `warn` - 警告信息
- `error` - 错误信息

## 扩展点

1. **自定义输入处理** - 继承 DialogueFlowEngine 实现自定义输入处理
2. **会话存储后端** - 替换 SessionManager 实现数据库存储
3. **对话阶段扩展** - 在 constants.ts 中添加新的 DialoguePhase
4. **上下文增强** - 在 ContextManager 中添加自定义字段

## 测试

对话引擎支持完整的对话流程测试：

```typescript
// 模拟完整对话
const manager = new DialogueManager();
await manager.initialize();

// 检查初始化
assert.equal(manager.getState().phase, DialoguePhase.GREETING);

// 提交输入
await manager.addUserInput('南山区');
assert.equal(manager.getState().phase, DialoguePhase.COLLECTING_TYPE);

// 验证上下文
const context = manager.getContextManager().getContext();
assert.equal(context.userPreference.location, '南山区');
```

## 性能考虑

- **内存缓存** - 会话在内存中维持，减少磁盘I/O
- **延迟保存** - 会话在显式调用 saveSession() 时保存
- **消息过滤** - 仅保留必要的消息历史
- **状态机优化** - O(1) 时间复杂度的状态转移验证
