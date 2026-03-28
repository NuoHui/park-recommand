# 配置说明

本文档详细说明所有可配置的环境变量和应用配置。

## 环境变量配置

所有配置通过 `.env` 文件管理。首先复制示例文件：

```bash
cp .env.example .env
```

### LLM 提供商配置

#### 配置 OpenAI

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TIMEOUT=30000
```

**参数说明**：
- `OPENAI_API_KEY`: 从 [OpenAI 控制台](https://platform.openai.com/api-keys) 获取
- `OPENAI_MODEL`: 推荐使用 `gpt-4-turbo-preview`，备选 `gpt-4` 或 `gpt-3.5-turbo`
- `OPENAI_BASE_URL`: 可选，如使用代理或国内转发服务，修改此项
- `OPENAI_TIMEOUT`: 请求超时时间（毫秒），默认 30000

#### 配置 Anthropic Claude

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-3-sonnet-20240229
ANTHROPIC_TIMEOUT=30000
```

**参数说明**：
- `ANTHROPIC_API_KEY`: 从 [Anthropic 控制台](https://console.anthropic.com/) 获取
- `ANTHROPIC_MODEL`: 可选 `claude-3-opus-20240229` (最强) 或 `claude-3-haiku-20240307` (最快)
- `ANTHROPIC_TIMEOUT`: 请求超时时间（毫秒），默认 30000

### 地图 API 配置

```env
AMAP_API_KEY=your-amap-web-service-key
AMAP_TIMEOUT=10000
AMAP_REGION=深圳
```

**参数说明**：
- `AMAP_API_KEY`: 从 [高德地图开放平台](https://lbs.amap.com/api/webservice/) 获取
- `AMAP_TIMEOUT`: 请求超时时间（毫秒），默认 10000
- `AMAP_REGION`: 默认搜索区域，推荐设置为 "深圳"

### 缓存配置

```env
CACHE_ENABLED=true
CACHE_TTL=3600
CACHE_DIR=.cache
CACHE_MAX_SIZE=100
CACHE_STRATEGY=lru
```

**参数说明**：
- `CACHE_ENABLED`: 是否启用缓存，默认 `true`
- `CACHE_TTL`: 缓存过期时间（秒），默认 3600（1 小时）
- `CACHE_DIR`: 本地缓存目录，默认 `.cache`
- `CACHE_MAX_SIZE`: 最大缓存条数，默认 100
- `CACHE_STRATEGY`: 缓存淘汰策略，支持 `lru`（最近最少使用）

### 应用配置

```env
NODE_ENV=development
DEBUG=false
LOG_LEVEL=info
```

**参数说明**：
- `NODE_ENV`: 环境模式，支持 `development` | `production`
- `DEBUG`: 是否启用详细调试日志，默认 `false`
- `LOG_LEVEL`: 日志级别，支持 `error` | `warn` | `info` | `debug`，默认 `info`

### 日志配置

```env
LOG_FILE_PATH=logs/app.log
LOG_FILE_MAX_SIZE=10m
LOG_FILE_MAX_FILES=10
LOG_FORMAT=json
```

**参数说明**：
- `LOG_FILE_PATH`: 日志文件路径，默认 `logs/app.log`
- `LOG_FILE_MAX_SIZE`: 单个日志文件最大大小，默认 `10m`
- `LOG_FILE_MAX_FILES`: 保留的最大日志文件数，默认 `10`
- `LOG_FORMAT`: 日志格式，支持 `json` | `text`，默认 `json`

## 配置示例

### 基础配置（快速开始）

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview

AMAP_API_KEY=your-key

NODE_ENV=development
LOG_LEVEL=info
```

### 生产配置（高性能）

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_TIMEOUT=20000

AMAP_API_KEY=your-key
AMAP_TIMEOUT=8000

CACHE_ENABLED=true
CACHE_TTL=7200
CACHE_MAX_SIZE=500
CACHE_STRATEGY=lru

NODE_ENV=production
LOG_LEVEL=warn
LOG_FORMAT=json
```

### 开发配置（调试）

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo

AMAP_API_KEY=your-key

CACHE_ENABLED=false

NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
LOG_FORMAT=text
```

## 环境变量优先级

配置优先级（从高到低）：

1. 命令行参数（如未来添加）
2. 环境变量（系统环境变量）
3. `.env` 文件
4. 代码中的默认值

## 验证配置

运行以下命令验证配置是否正确：

```bash
# 编译应用
npm run build

# 测试 LLM 连接
npm run dev

# 查看日志输出是否有错误
```

## 配置常见问题

### Q: 如何更改日志级别？

**A**: 修改 `.env` 中的 `LOG_LEVEL` 变量：
```env
LOG_LEVEL=debug  # 显示所有日志，包括调试信息
```

### Q: 如何关闭缓存？

**A**: 修改 `.env` 中的 `CACHE_ENABLED` 变量：
```env
CACHE_ENABLED=false
```

### Q: 如何加快 API 响应速度？

**A**: 调整以下配置：
```env
# 减少超时时间（但不要过短）
OPENAI_TIMEOUT=15000
AMAP_TIMEOUT=5000

# 增加缓存 TTL 以及缓存大小
CACHE_TTL=7200
CACHE_MAX_SIZE=500
```

### Q: 生产环境推荐配置是什么？

**A**: 参考上面的 "生产配置（高性能）" 示例

## 下一步

- [首次运行](./first-run.md) - 启动应用
- [使用指南](../guides/usage.md) - 学习基本命令
- [故障排查](../guides/troubleshooting.md) - 解决常见问题
