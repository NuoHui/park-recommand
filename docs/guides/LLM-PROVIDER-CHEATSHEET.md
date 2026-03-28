# LLM 提供商快速切换参考卡

## 一行命令快速切换

### 🤖 使用阿里云百炼 (Aliyun DashScope)

```bash
# 1. 编辑 .env 文件，修改这三行
LLM_PROVIDER=aliyun
ALIYUN_API_KEY=sk-xxxxxx  # 你的实际 API Key
ALIYUN_MODEL=qwen-long    # 可选: qwen-max, qwen-plus, qwen-turbo

# 2. 运行
npm run test
```

**获取 API Key:**
1. 访问 https://bailian.aliyun.com
2. 登录并进入 API Key 管理
3. 复制你的 API Key
4. 粘贴到 `.env` 的 `ALIYUN_API_KEY`

---

### 🟢 使用 OpenAI (GPT-4, GPT-3.5)

```bash
# 1. 编辑 .env 文件
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-xxxxxxxxxxxx
OPENAI_MODEL=gpt-4-turbo-preview  # 或 gpt-3.5-turbo

# 2. 运行
npm run test
```

**获取 API Key:**
1. 访问 https://platform.openai.com/api-keys
2. 创建新的 API Key
3. 复制并粘贴到 `.env`

---

### 🔴 使用 Anthropic Claude

```bash
# 1. 编辑 .env 文件
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# 2. 运行
npm run test
```

**获取 API Key:**
1. 访问 https://console.anthropic.com/keys
2. 创建新的 API Key
3. 复制并粘贴到 `.env`

---

## 完整 .env 配置模板

### 模板 A: 阿里云百炼 (推荐)

```bash
LLM_PROVIDER=aliyun
OPENAI_API_KEY=sk-proj-your-openai-key-here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_BASE_URL=https://api.openai.com/v1
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-3-sonnet-20240229
ALIYUN_API_KEY=sk-your-real-api-key-here
ALIYUN_MODEL=qwen-long
ALIYUN_BASE_URL=https://dashscope.aliyuncs.com/api/v1
AMAP_API_KEY=68b6b8799fb1de379e7f21abdf762f6d
```

### 模板 B: OpenAI

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-real-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ALIYUN_API_KEY=your_aliyun_api_key_here
AMAP_API_KEY=68b6b8799fb1de379e7f21abdf762f6d
```

### 模板 C: Anthropic Claude

```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-real-api-key-here
ANTHROPIC_MODEL=claude-3-sonnet-20240229
OPENAI_API_KEY=sk-proj-your-openai-key-here
ALIYUN_API_KEY=your_aliyun_api_key_here
AMAP_API_KEY=68b6b8799fb1de379e7f21abdf762f6d
```

---

## 模型对比表

| 特性 | 阿里云百炼 | OpenAI | Anthropic |
|------|----------|--------|-----------|
| **推荐模型** | qwen-long | gpt-4-turbo | claude-3-sonnet |
| **上下文长度** | 128K | 128K | 200K |
| **响应时间** | ⭐⭐ (1-3s) | ⭐⭐⭐ (快) | ⭐⭐⭐ (快) |
| **成本** | ⭐ (便宜) | ⭐⭐⭐ (贵) | ⭐⭐ (中等) |
| **API 兼容** | OpenAI 兼容 | 原生 | 原生 |
| **国内访问** | ✅ (快) | ⚠️ (可能慢) | ⚠️ (可能慢) |

---

## 常用模型列表

### 阿里云百炼

```
qwen-long          # ⭐ 推荐 - 长文本处理，128K 上下文，成本低
qwen-max           # 高性能，8K 上下文，成本中等
qwen-plus          # 平衡性能，32K 上下文
qwen-turbo         # 快速响应，最便宜
```

### OpenAI

```
gpt-4-turbo-preview     # ⭐ 推荐 - 最强大的 GPT-4，128K 上下文
gpt-4                   # 强大，8K 上下文
gpt-3.5-turbo          # 便宜，高速
```

### Anthropic

```
claude-3-opus-20240229         # 最强大，200K 上下文
claude-3-sonnet-20240229       # ⭐ 推荐 - 平衡，200K 上下文
claude-3-haiku-20240307        # 快速廉价
```

---

## 特殊模式

### 🧪 Mock 模式 (开发/测试)

无需真实 API Key，系统自动使用模拟 LLM：

```bash
# 方式 1: 虚假 Key 自动触发 Mock
LLM_PROVIDER=aliyun
ALIYUN_API_KEY=your_aliyun_api_key_here  # 虚假 Key

npm run test  # 自动使用 Mock LLM

# 方式 2: 强制 Mock 模式
USE_MOCK_LLM=true npm run test
```

### 🔄 降级模式

如果 API 连接失败，系统自动降级到 Mock 模式：

```bash
# 即使 API Key 真实但连接失败，也会自动降级
LLM_PROVIDER=aliyun
ALIYUN_API_KEY=sk-real-but-network-failed

npm run test  # 自动降级到 Mock LLM
```

---

## 故障排除

### Q: 提示 "API Key is required"

**解决:**
```bash
# 检查 API Key 是否填写正确
ALIYUN_API_KEY=sk-xxxxx  # ✅ 正确格式
ALIYUN_API_KEY=your_api_key_here  # ❌ 虚假格式
```

### Q: 连接超时

**解决:**
```bash
# 尝试强制 Mock 模式进行测试
USE_MOCK_LLM=true npm run test

# 或检查网络连接
ping dashscope.aliyuncs.com
```

### Q: 如何同时测试多个提供商?

**解决:**
```bash
# 创建多个 .env 文件副本
cp .env .env.aliyun
cp .env .env.openai

# 编辑各自的配置，然后切换使用
LLM_PROVIDER=aliyun npm run test
LLM_PROVIDER=openai npm run test
```

---

## 环境变量总览

```bash
# 全局配置
LLM_PROVIDER              # 选择: openai | anthropic | aliyun
USE_MOCK_LLM              # 强制 Mock 模式: true | false
DEBUG                     # 调试日志: true | false

# OpenAI 配置
OPENAI_API_KEY           # API Key
OPENAI_MODEL             # 模型名称 (默认: gpt-4-turbo-preview)
OPENAI_BASE_URL          # API 基础 URL

# Anthropic 配置
ANTHROPIC_API_KEY        # API Key
ANTHROPIC_MODEL          # 模型名称 (默认: claude-3-sonnet-20240229)

# 阿里云百炼配置
ALIYUN_API_KEY           # API Key
ALIYUN_MODEL             # 模型名称 (默认: qwen-long)
ALIYUN_BASE_URL          # API 基础 URL (默认: 百炼官方)

# 高德地图配置
AMAP_API_KEY             # 必需!
AMAP_BASE_URL            # API 基础 URL

# 应用配置
NODE_ENV                 # 环境: development | production | test
LOG_LEVEL                # 日志级别: debug | info | warn | error
```

---

## 性能基准 (仅供参考)

在开发环境中进行的测试：

| 提供商 | 首次请求 | 缓存命中 | 批量请求 | 成本/1K tokens |
|--------|---------|---------|---------|----------------|
| Mock LLM | <50ms | <10ms | <50ms | $0 |
| Aliyun | 1-3s | 100ms | 2-5s | ¥0.002 |
| OpenAI | 2-5s | 150ms | 3-8s | $0.03 |
| Anthropic | 2-4s | 120ms | 3-7s | $0.015 |

---

## 更多资源

- 📖 [完整设置指南](./ALIYUN-BAILIAN-SETUP.md)
- 🔗 [阿里云百炼官网](https://bailian.aliyun.com)
- 🔗 [OpenAI API 文档](https://platform.openai.com/docs)
- 🔗 [Anthropic 文档](https://docs.anthropic.com)
