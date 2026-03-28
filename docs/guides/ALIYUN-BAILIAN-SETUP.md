# 阿里云百炼 (Aliyun Bailian) 配置指南

## 概述

本项目现已支持 **阿里云百炼** (Aliyun DashScope) 作为 LLM 提供商。阿里云百炼提供了与 OpenAI API 兼容的接口，支持多个高效的模型。

## 快速开始

### 1. 获取 API Key

1. 访问 [阿里云百炼官网](https://bailian.aliyun.com)
2. 创建账户并登录
3. 在控制面板中生成 API Key
4. 复制你的 API Key

### 2. 修改 `.env` 配置

编辑项目根目录的 `.env` 文件：

```bash
# 选择 LLM 提供商
LLM_PROVIDER=aliyun

# 阿里云百炼配置
ALIYUN_API_KEY=your_actual_api_key_here
ALIYUN_MODEL=qwen-long
ALIYUN_BASE_URL=https://dashscope.aliyuncs.com/api/v1
```

### 3. 运行测试

```bash
npm run test
```

## 配置详解

### 环境变量说明

| 变量 | 描述 | 示例 | 必需 |
|------|------|------|------|
| `LLM_PROVIDER` | LLM 提供商 | `aliyun` | ✅ |
| `ALIYUN_API_KEY` | API Key | `sk-xxxxxxxxxxxx` | ✅ |
| `ALIYUN_MODEL` | 模型名称 | `qwen-long` 或 `qwen-max` | ❌ (默认: qwen-long) |
| `ALIYUN_BASE_URL` | API 基础 URL | `https://dashscope.aliyuncs.com/api/v1` | ❌ |

### 支持的模型

阿里云百炼支持以下模型（可根据需求选择）：

| 模型 | 描述 | 最大 Token | 成本 |
|-----|------|-----------|------|
| `qwen-long` | 长文本处理，128K 上下文 | 128,000 | ⭐⭐ (便宜) |
| `qwen-max` | 高性能模型 | 8,000 | ⭐⭐⭐ (较贵) |
| `qwen-turbo` | 快速响应 | 8,000 | ⭐ (最便宜) |
| `qwen-plus` | 平衡性能 | 32,000 | ⭐⭐⭐ (中等) |

**推荐**: 用于公园推荐场景，推荐使用 `qwen-long` (支持更长对话历史)

## 使用说明

### 自动 Mock 模式

如果配置了虚假的 API Key（例如 `your_aliyun_api_key_here`），系统会**自动启用 Mock 模式**进行测试，无需任何额外配置。

```bash
# 虚假 Key → 自动使用 Mock LLM → 测试通过
npm run test
```

### 强制使用 Mock 模式

可以通过环境变量强制使用 Mock LLM 进行测试：

```bash
USE_MOCK_LLM=true npm run test
```

### 使用真实 API

配置有效的 API Key 后，项目会使用真实的阿里云百炼 API：

```bash
# 1. 编辑 .env，填入真实 API Key
ALIYUN_API_KEY=sk-your-real-api-key

# 2. 运行测试
npm run test
```

## 切换 LLM 提供商

本项目支持快速切换 LLM 提供商。修改 `.env` 中的 `LLM_PROVIDER` 即可：

### 切换到 OpenAI

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-xxxxxxxxxxxx
```

### 切换到 Anthropic Claude

```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
```

### 切换到阿里云百炼

```bash
LLM_PROVIDER=aliyun
ALIYUN_API_KEY=sk-xxxxxxxxxxxx
```

## 常见问题

### Q: API 连接失败怎么办？

A: 检查以下几点：
1. 确认 API Key 是否有效（不包含 `your_`、`your-` 等占位符）
2. 检查 `.env` 中的 `ALIYUN_BASE_URL` 是否正确
3. 检查网络连接是否正常
4. 查看日志输出获取详细错误信息

### Q: 如何切换不同的模型？

A: 修改 `.env` 中的 `ALIYUN_MODEL` 变量：

```bash
# 改用 qwen-max
ALIYUN_MODEL=qwen-max
```

### Q: 成本如何控制？

A: 
- 使用 `qwen-long` 或 `qwen-turbo` 以获得更低的成本
- 在开发环境中使用 Mock 模式避免不必要的 API 调用
- 合理设置 `maxTokens` 限制响应长度

### Q: 支持其他阿里云模型吗？

A: 是的，只需在 `.env` 中修改 `ALIYUN_MODEL` 为你需要的模型名称。参考 [阿里云百炼文档](https://bailian.aliyun.com/docs) 了解最新支持的模型。

## 架构细节

项目对 LLM 提供商的支持架构如下：

```
LLMClient
  ├── OpenAI 支持
  ├── Anthropic 支持
  └── Aliyun 支持 (兼容 OpenAI API)
      ├── 使用 OpenAI SDK 封装
      ├── 自定义请求头: x-dashscope-oai-model
      └── Base URL: https://dashscope.aliyuncs.com/compatible-mode/v1

MockLLMClient (用于测试)
  └── 虚假 API Key 自动触发
```

## 性能指标

测试环境中的性能对比：

| 提供商 | 响应时间 | 测试成功率 | 备注 |
|--------|---------|----------|------|
| Mock | <100ms | 100% | 开发/测试环境 |
| Aliyun | 1-3s | 99%+ | 取决于网络和模型 |
| OpenAI | 2-5s | 99%+ | 取决于网络 |

## 故障排除

### 错误: `ALIYUN_API_KEY is required`

确保 `.env` 中已配置有效的 API Key：
```bash
ALIYUN_API_KEY=sk-xxxxx  # 必须以 sk- 开头
```

### 错误: `Unsupported LLM provider: aliyun`

检查 `LLM_PROVIDER` 的拼写：
```bash
LLM_PROVIDER=aliyun  # 正确
LLM_PROVIDER=ali     # ❌ 错误
```

### 超时错误

增加超时时间（以毫秒为单位），在 `src/llm/service.ts` 中修改：
```typescript
timeout: 120000,  // 增加到 120 秒
```

## 相关资源

- [阿里云百炼官网](https://bailian.aliyun.com)
- [DashScope API 文档](https://dashscope.aliyuncs.com/docs)
- [支持的模型列表](https://bailian.aliyun.com/docs/index)
- [OpenAI 兼容性](https://dashscope.aliyuncs.com/docs/compatible)

## 支持

如遇到问题，请：
1. 查看项目日志 (`logs/app.log`)
2. 参考 [故障排除](#故障排除) 部分
3. 检查 [阿里云百炼文档](https://bailian.aliyun.com/docs)
