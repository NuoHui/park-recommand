# LLM 服务集成文档

## 概览

LLM 服务模块为深圳公园景点推荐 Agent 提供了完整的 AI 决策能力。通过支持 OpenAI 和 Anthropic Claude 的双引擎设计，系统可以：

- **理解用户意图** - 自然语言处理和意图识别
- **动态对话管理** - 多轮对话上下文维护和流程控制
- **智能推荐决策** - 基于用户偏好生成搜索参数
- **推荐结果解析** - 从 LLM 响应中提取结构化推荐数据

## 核心模块

### 1. LLM 类型系统 (`src/types/llm.ts`)

定义了 LLM 服务的完整类型接口：

```typescript
// 配置接口
interface LLMConfig {
  provider: 'openai' | 'anthropic';
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  // ...
}

// 对话接口
interface DialogueRequest {
  sessionId: string;
  userInput: string;
  preferences: UserPreference;
  conversationHistory: DialogueMessage[];
  currentPhase: string;
}

interface DialogueResponse {
  assistantMessage: string;
  nextPhase?: string;
  updatedPreferences?: Partial<UserPreference>;
  shouldRecommend?: boolean;
  recommendations?: Recommendation[];
}

// 决策引擎接口
interface ILLMEngine {
  processDialogue(request: DialogueRequest): Promise<DialogueResponse>;
  extractUserPreference(userInput: string, phase: string): Promise<IntentParsing>;
  shouldRecommend(preferences: UserPreference): Promise<RecommendationDecision>;
  generateSearchParams(preferences: UserPreference): Promise<RecommendationDecision>;
  parseRecommendations(response: string): Promise<ParsedRecommendation>;
  generateNextQuestion(preferences: UserPreference, phase: string): Promise<string>;
}
```

### 2. 提示词管理 (`src/llm/prompts.ts`)

提供动态生成的系统和用户提示词：

```typescript
// 生成阶段特定的系统提示
generateSystemPrompt(phase: string): string

// 生成用户提示
generateUserPrompt(
  userInput: string,
  preferences: UserPreference,
  phase: string,
  history?: DialogueMessage[]
): string

// 获取阶段的提示配置
getPromptConfig(phase: string): PromptConfig
```

**支持的对话阶段:**
- `greeting` - 问候和介绍
- `collecting_location` - 收集位置信息
- `collecting_type` - 收集景点类型偏好
- `collecting_distance` - 收集距离偏好
- `collecting_difficulty` - 收集难度偏好
- `querying` - 查询和分析
- `recommending` - 生成推荐
- `completed` - 对话完成

### 3. LLM 客户端 (`src/llm/client.ts`)

统一的 LLM 客户端，支持多个提供商：

```typescript
class LLMClient implements ILLMClient {
  // 调用 LLM API（自动选择提供商）
  async call(messages: LLMMessage[]): Promise<LLMResponse>
  
  // 验证 API 连接
  async validateConnection(): Promise<boolean>
  
  // 配置管理
  getConfig(): LLMConfig
  setConfig(config: Partial<LLMConfig>): void
}
```

**特性:**
- 自动处理 OpenAI 和 Claude API 的差异
- 统一的响应格式
- 内置连接验证
- 灵活的配置管理

### 4. 决策引擎 (`src/llm/engine.ts`)

核心业务逻辑层，处理复杂的 AI 决策：

```typescript
class LLMEngine implements ILLMEngine {
  // 单轮对话处理
  async processDialogue(request: DialogueRequest): Promise<DialogueResponse>
  
  // 意图和信息提取
  async extractUserPreference(userInput: string, phase: string): Promise<IntentParsing>
  
  // 推荐决策
  async shouldRecommend(preferences: UserPreference): Promise<RecommendationDecision>
  
  // 搜索参数生成
  async generateSearchParams(preferences: UserPreference): Promise<RecommendationDecision>
  
  // 推荐结果解析
  async parseRecommendations(response: string): Promise<ParsedRecommendation>
  
  // 动态问题生成
  async generateNextQuestion(preferences: UserPreference, phase: string): Promise<string>
}
```

**功能:**
- 对话历史管理（内存缓存）
- 自动上下文构建
- JSON 解析和错误恢复
- 统计信息收集

### 5. LLM 服务 (`src/llm/service.ts`)

单例管理器，处理服务初始化和生命周期：

```typescript
class LLMService {
  // 获取单例
  static getInstance(): LLMService
  
  // 初始化服务
  async initialize(): Promise<void>
  
  // 获取客户端和引擎
  getClient(): LLMClient
  getEngine(): LLMEngine
  
  // 服务管理
  isInitialized(): boolean
  destroy(): void
  getStatus(): ServiceStatus
}

// 便捷获取
function getLLMService(): LLMService
```

## 使用指南

### 基础使用 - 直接调用 LLM

```typescript
import { createLLMClient } from '@/llm/service';

const client = createLLMClient(
  'openai',
  process.env.OPENAI_API_KEY!,
  'gpt-4-turbo-preview'
);

const response = await client.call([
  { role: 'system', content: '你是景点推荐助手' },
  { role: 'user', content: '推荐一个公园' }
]);

console.log(response.content);
```

### 意图解析

```typescript
import { createLLMEngine, createLLMClient } from '@/llm/service';

const client = createLLMClient(...);
const engine = createLLMEngine(client);

const parsing = await engine.extractUserPreference('我在南山', 'collecting_location');

console.log(parsing.intent); // 'provide_info'
console.log(parsing.confidence); // 0.95
console.log(parsing.extractedInfo); // { location: '南山' }
```

### 完整对话流程

```typescript
import { createLLMEngine, createLLMClient } from '@/llm/service';
import { DialogueRequest } from '@/types/llm';
import { v4 as uuidv4 } from 'uuid';

const client = createLLMClient(...);
const engine = createLLMEngine(client);
const sessionId = uuidv4();

// 单轮对话
const request: DialogueRequest = {
  sessionId,
  userInput: '我想在南山找个公园散步',
  preferences: { location: '南山' },
  conversationHistory: [],
  currentPhase: 'collecting_location'
};

const response = await engine.processDialogue(request);
console.log(response.assistantMessage);
```

### 推荐决策

```typescript
const preferences = {
  location: '南山',
  parkType: 'park',
  maxDistance: 5,
};

// 检查是否可以推荐
const decision = await engine.shouldRecommend(preferences);
if (decision.shouldRecommend) {
  // 获取搜索参数
  console.log(decision.searchParams);
}

// 或直接生成搜索参数
const params = await engine.generateSearchParams(preferences);
```

### 使用服务单例

```typescript
import { getLLMService } from '@/llm/service';

const llmService = getLLMService();

// 初始化（使用环境变量自动选择提供商）
await llmService.initialize();

// 使用引擎
const engine = llmService.getEngine();
const response = await engine.processDialogue(request);

// 检查服务状态
console.log(llmService.getStatus());

// 清理
llmService.destroy();
```

## 环境配置

### 必需的环境变量

```env
# LLM 提供商选择
LLM_PROVIDER=openai  # 或 'anthropic'

# OpenAI 配置（如果使用 OpenAI）
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_BASE_URL=https://api.openai.com/v1

# Anthropic 配置（如果使用 Claude）
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-sonnet-20240229
```

### 可选配置

```env
# 超时时间（毫秒）
LLM_TIMEOUT=60000

# 日志级别
LOG_LEVEL=info
```

## 架构设计

### 提示词策略

系统采用**多层提示词架构**：

```
系统提示 (System Prompt)
├─ 基础角色定义
├─ 对话风格指导
└─ 阶段特定指引

用户提示 (User Prompt)
├─ 用户输入
├─ 已收集信息摘要
├─ 对话历史（最近 N 条）
└─ 任务指引
```

### 上下文窗口管理

- **系统提示**: 每次调用都包含
- **历史消息**: 按阶段配置保留数量（1-6 条）
- **当前输入**: 总是包含最新的用户输入
- **信息摘要**: 格式化显示已收集的用户偏好

### 错误处理

```
API 调用失败
├─ 网络错误 → 重试机制（可配置）
├─ 认证错误 → 提前验证和明确错误提示
├─ 超时错误 → 降级处理和备选方案
└─ 解析错误 → JSON 恢复和降级方案
```

## API 提供商支持

### OpenAI

- **模型**: `gpt-4-turbo-preview`, `gpt-4`, `gpt-3.5-turbo`
- **特性**:
  - 强大的中文理解能力
  - 函数调用支持
  - 快速响应
- **成本**: 较高
- **文档**: https://platform.openai.com/docs

### Anthropic Claude

- **模型**: `claude-3-sonnet-20240229`, `claude-3-opus-20240229`
- **特性**:
  - 优秀的长文本处理
  - 更好的推理能力
  - 更强的安全性
- **成本**: 中等
- **文档**: https://docs.anthropic.com

## 最佳实践

### 1. 提示词优化

```typescript
// ✓ 好：明确的结构化提示
const prompt = `
分析以下用户输入，提取以下信息：
- 位置
- 景点类型
- 距离限制

用户输入: "${input}"

输出 JSON 格式。
`;

// ✗ 坏：含糊的提示
const prompt = `分析: "${input}"`;
```

### 2. 错误处理

```typescript
try {
  const response = await engine.processDialogue(request);
  // 处理响应
} catch (error) {
  if (error.message.includes('API')) {
    // 处理 API 错误
  } else if (error.message.includes('timeout')) {
    // 处理超时
  } else {
    // 通用错误
  }
}
```

### 3. 性能优化

```typescript
// ✓ 缓存重复调用
const cachedResult = await llmService.getEngine().extractUserPreference(input, phase);

// ✓ 使用合适的 maxTokens
const config = {
  maxTokens: 1000, // 足够但不过度
  temperature: 0.7, // 平衡创意和稳定性
};

// ✓ 批量处理
const results = await Promise.all(requests.map(r => engine.processDialogue(r)));
```

### 4. 成本控制

```typescript
// ✓ 监控 token 使用
const response = await client.call(messages);
logger.info(`Token 用量: ${response.usage.totalTokens}`);

// ✓ 使用较小的模型用于简单任务
const simpleClient = createLLMClient('openai', key, 'gpt-3.5-turbo');

// ✓ 实现请求速率限制
const rateLimiter = new RateLimiter(requestsPerMinute);
await rateLimiter.wait();
```

## 故障排查

### 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|--------|
| `API key not valid` | API Key 配置错误 | 检查 `.env` 文件中的 API Key |
| `Timeout` | API 响应太慢 | 增加 `timeout` 配置或重试 |
| `JSON parse error` | LLM 响应格式不符 | 改进提示词或增加输入验证 |
| `Connection refused` | 网络问题 | 检查网络连接和防火墙 |

### 调试模式

```typescript
// 启用详细日志
process.env.DEBUG = 'true';
process.env.LOG_LEVEL = 'debug';

// 查看原始 LLM 响应
logger.debug('原始响应:', response.content);

// 检查服务状态
console.log(llmService.getStatus());
```

## 集成示例

参考 `examples/llm-example.ts` 获取 10 个完整的集成示例：

1. **基础客户端使用** - 直接调用 LLM
2. **单轮对话处理** - 完整的对话流程
3. **意图解析** - 从用户输入提取信息
4. **推荐决策** - 判断是否可以推荐
5. **搜索参数生成** - 生成查询参数
6. **问题生成** - 动态生成下一个问题
7. **完整对话流程** - 多轮对话模拟
8. **服务单例** - 使用 LLM 服务单例
9. **Claude 使用** - 使用 Anthropic API
10. **错误处理** - 错误处理和恢复

## 扩展开发

### 添加新的 LLM 提供商

```typescript
// 1. 在 LLMProvider type 中添加新提供商
export type LLMProvider = 'openai' | 'anthropic' | 'custom';

// 2. 在客户端中添加调用方法
private async callCustomLLM(messages, config): Promise<LLMResponse> {
  // 实现自定义提供商的 API 调用
}

// 3. 在 client.call() 中添加分支
if (mergedConfig.provider === 'custom') {
  return await this.callCustomLLM(messages, mergedConfig);
}
```

### 自定义提示词

```typescript
// 在 prompts.ts 中添加自定义提示
export const CUSTOM_PROMPTS: PromptTemplate = {
  greeting: {
    systemPrompt: '自定义系统提示',
    contextSize: 2,
    examples: [...]
  },
  // ...
};

// 在使用时替换
const config = getPromptConfig('greeting');
config.systemPrompt = CUSTOM_PROMPTS.greeting.systemPrompt;
```

## 性能指标

### 典型延迟

| 操作 | OpenAI GPT-4 | Claude 3 | 备注 |
|------|-------------|---------|------|
| 简单回复 | ~2s | ~3s | <500 tokens |
| 复杂分析 | ~3-5s | ~4-6s | <1000 tokens |
| 批量查询 | ~1-2s/request | ~2-3s/request | 并发请求 |

### 成本估算（月度）

- **OpenAI GPT-4**: ~$0.01-0.05 per 1K tokens
- **Claude 3**: ~$0.003 per 1K input, $0.015 per 1K output
- **每次对话**: ~500-2000 tokens

## 后续改进

- [ ] 实现请求缓存层
- [ ] 添加多轮对话优化
- [ ] 支持流式响应
- [ ] 实现智能重试机制
- [ ] 添加成本监控面板
- [ ] 支持本地 LLM（Ollama、LlamaIndex）
- [ ] 多语言支持增强
- [ ] 推荐质量评分系统
