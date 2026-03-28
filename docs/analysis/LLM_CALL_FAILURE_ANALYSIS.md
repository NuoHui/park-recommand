# LLM 调用失败原因分析 📊

## 🔴 问题总结

测试运行时出现 **3 个 LLM 调用失败**：

```
❌ Test 2: 类型识别 - 识别"公园"关键词
   ❌ 错误: Failed to connect to LLM API

❌ Test 3: 距离偏好识别 - 无限制距离
   ❌ 错误: Failed to connect to LLM API

❌ Test 5: 完整推荐流程 - 宝安西乡公园推荐
   ❌ 错误: 推荐生成失败
   📍 推荐结果: 0 条推荐
```

---

## 🔍 根本原因分析

### 1. **API Key 配置问题** ⚠️

**当前状态**：`.env` 中的 OpenAI API Key 是虚假的

```env
# .env (当前)
OPENAI_API_KEY=sk-proj-your-openai-key-here  ❌ 这是虚假 key
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_BASE_URL=https://api.openai.com/v1
```

**问题链**：
1. `LLMClient` 初始化时接收到虚假 API Key
2. 调用 `client.call()` 时试图连接 OpenAI API
3. API 拒绝虚假凭证 → 抛出错误
4. 错误被捕获并记录为 "Failed to connect to LLM API"

---

### 2. **错误处理流程** 🔄

**LLM 调用链**：

```
┌─────────────────────────────────────────────┐
│  engine.extractUserPreference()             │
├─────────────────────────────────────────────┤
│  → client.call(messages)                    │
│    └─→ callOpenAI(messages, config)        │
│        └─→ openaiClient.chat.completions  │
│            .create({...})                  │
├─────────────────────────────────────────────┤
│  ❌ API 返回 401 Unauthorized              │
│     (Invalid API Key)                       │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│  catch (error) {                            │
│    logger.error('LLM 调用失败', {...})     │
│    throw error                              │
│  }                                          │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│  engine.extractUserPreference() catch {     │
│    logger.warn('信息提取失败，使用默认值')  │
│    return { intent, extractedInfo: {} }    │
│  }                                          │
└─────────────────────────────────────────────┘
```

**关键观察**：
- LLM 客户端 (`src/llm/client.ts:59-66`) 将错误向上抛出
- 引擎方法 (`src/llm/engine.ts:141-152`) 捕获错误并返回默认值
- **这导致系统"优雅降级"，但失去了关键信息**

---

### 3. **测试中的问题** 🧪

#### 问题 A：集成测试对 LLM 的直接依赖

**Test 2 & Test 3** 直接调用 LLM：

```typescript
// src/__tests__/integration/baoan-xiangxiang.test.ts (第 200+ 行)
const extraction = await llmEngine.extractUserPreference(
  '推荐深圳宝安西乡附近的公园',
  'preference_collection'
);
```

当 LLM 不可用时，这些测试失败。

#### 问题 B：Test 5 的连锁失败

**Test 5: 完整推荐流程** 依赖于：
1. LLM 提取用户偏好 ✅ (失败)
2. LLM 生成搜索参数 ✅ (失败)
3. 执行地图查询 (可能成功)
4. LLM 解析推荐 ✅ (失败)

由于 LLM 不可用，整个流程失败。

---

## 📋 问题检查清单

| 项目 | 状态 | 说明 |
|-----|------|------|
| OPENAI_API_KEY | ❌ 虚假 | `sk-proj-your-openai-key-here` |
| OPENAI_MODEL | ✅ 正确 | `gpt-3.5-turbo` |
| OPENAI_BASE_URL | ✅ 正确 | `https://api.openai.com/v1` |
| AMAP_API_KEY | ✅ 真实 | 配置有效 |
| LLM 连接验证 | ❌ 未执行 | 测试前没有检查 |

---

## 🔧 解决方案

### **方案 A：配置真实 API Key（推荐）** ⭐

替换 `.env` 中的虚假 key：

```env
# 方案 1: 使用 OpenAI
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXX  # 替换为真实 key

# 方案 2: 使用 Anthropic Claude
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-XXXXXXXXXXXX  # 替换为真实 key

# 方案 3: 使用兼容 OpenAI 的服务 (如 Aliyun DashScope)
OPENAI_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
OPENAI_API_KEY=sk-XXXXXXXXXXXX
OPENAI_MODEL=qwen-turbo
```

**优点**：
- ✅ 完整的端到端测试验证
- ✅ 真实的用户体验测试
- ✅ 发现真实环境中的问题

**缺点**：
- ❌ 需要付费 API 额度
- ❌ 测试速度较慢
- ❌ 依赖网络连接

---

### **方案 B：使用 Mock LLM（用于 CI/CD）** ⭐⭐⭐

为测试环境创建 Mock LLM 客户端：

```typescript
// src/llm/mock-client.ts
export class MockLLMClient implements ILLMClient {
  async call(messages: LLMMessage[]): Promise<LLMResponse> {
    // 模拟 LLM 响应
    return {
      id: 'mock-response',
      content: JSON.stringify({
        intent: 'provide_info',
        confidence: 0.95,
        extractedInfo: {
          location: '宝安西乡',
          parkType: 'park',
          maxDistance: 50,
        },
      }),
      model: 'mock',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: 'stop',
    };
  }
  
  async validateConnection(): Promise<boolean> {
    return true;
  }

  getProvider(): LLMProvider {
    return 'openai';
  }

  getModel(): string {
    return 'mock-model';
  }

  getConfig(): LLMConfig {
    return {} as LLMConfig;
  }

  setConfig(config: Partial<LLMConfig>): void {}

  destroy(): void {}
}
```

**优点**：
- ✅ 快速执行测试（毫秒级）
- ✅ 不需要 API Key
- ✅ 完全可控和可重现
- ✅ 适合 CI/CD 流程

**缺点**：
- ❌ 不测试真实 API 集成
- ❌ 可能掩盖 API 问题

---

### **方案 C：增强错误处理和日志** ⭐⭐

改进 LLM 客户端的错误诊断：

```typescript
// src/llm/client.ts
async call(messages: LLMMessage[], config?: Partial<LLMConfig>): Promise<LLMResponse> {
  const mergedConfig = { ...this.config, ...(config || {}) };

  try {
    if (mergedConfig.provider === 'openai') {
      return await this.callOpenAI(messages, mergedConfig);
    }
    // ...
  } catch (error) {
    // ✅ 增强错误诊断
    const isAuthError = error?.message?.includes('401') || 
                       error?.message?.includes('Unauthorized') ||
                       error?.message?.includes('Invalid API');
    
    if (isAuthError) {
      logger.error('LLM 认证失败 - API Key 可能无效', {
        provider: mergedConfig.provider,
        suggestion: '请检查 .env 文件中的 API Key 配置',
        apiKeyPrefix: mergedConfig.apiKey?.substring(0, 10),
      });
    }
    
    throw error;
  }
}
```

---

## 📝 建议行动方案

### **立即修复** (5 分钟)

**选项 1：使用虚假 Key + Mock LLM**

```bash
# 创建 mock client
cp src/llm/client.ts src/llm/mock-client.ts

# 在测试中使用 mock
export USE_MOCK_LLM=true

# 运行测试
npm run test
```

**选项 2：配置真实 API Key**

```bash
# 编辑 .env 文件
OPENAI_API_KEY=sk-proj-... # 替换为真实 key

# 运行测试
npm run test
```

---

### **长期改进** (1-2 小时)

1. **✅ 创建 Mock LLM 服务** (用于 CI/CD)
2. **✅ 分离单元测试和集成测试**
   - 单元测试：使用 Mock
   - 集成测试：使用真实 API (可选)
3. **✅ 增强错误诊断**
   - 更详细的错误信息
   - API Key 验证步骤
   - 连接验证测试
4. **✅ 添加测试夹具（Fixtures）**
   - 预定义的 LLM 响应
   - 用户场景模板

---

## 🎯 性能影响

| 方案 | 测试时间 | API 成本 | 可靠性 |
|-----|--------|---------|--------|
| Mock LLM | <1秒 | ¥0 | 🟡 (需要维护) |
| 真实 API | 2-5秒 | ~¥0.01 | 🟢 (真实验证) |
| 混合方案 | 1-5秒 | 低 | 🟢 (最佳) |

---

## 📚 相关代码位置

- **LLM 客户端**：`src/llm/client.ts` (第 59-66 行 - 错误处理)
- **LLM 引擎**：`src/llm/engine.ts` (第 141-152 行 - 提取用户偏好)
- **集成测试**：`src/__tests__/integration/baoan-xiangxiang.test.ts`
- **环境配置**：`.env`

---

## 🚀 推荐行动

**第 1 步**：确认是否要使用真实 API 还是 Mock
- 如果是 CI/CD：使用 Mock LLM
- 如果是本地开发：配置真实 API Key

**第 2 步**：执行相应的修复

**第 3 步**：重新运行测试验证

