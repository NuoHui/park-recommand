# 安装指南

## 系统要求

- **Node.js**: 18.0 或更高版本
- **npm**: 9.0 或更高版本（或使用 yarn）
- **操作系统**: Windows、macOS、Linux

## 前置配置

在安装之前，你需要获取以下 API Keys：

1. **LLM API Key**（二选一）
   - [OpenAI API Key](https://platform.openai.com/api-keys)
   - [Anthropic Claude API Key](https://console.anthropic.com/)

2. **地图 API Key**
   - [高德地图 Web Service API Key](https://lbs.amap.com/api/webservice/guide/create-project/get-key)

## 安装步骤

### 1. 克隆项目

```bash
git clone <repository-url>
cd park-recommand
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 文件，填入你的 API Keys
# 可以使用任何文本编辑器打开 .env
```

### 4. 配置详解

编辑 `.env` 文件，配置以下变量：

```env
# ========== LLM 配置 ==========
# 选择 LLM 提供商: openai 或 anthropic
LLM_PROVIDER=openai

# OpenAI 配置（如果使用 OpenAI）
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_BASE_URL=https://api.openai.com/v1

# Anthropic 配置（如果使用 Claude）
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# ========== 地图 API 配置 ==========
AMAP_API_KEY=your-amap-web-service-key

# ========== 应用配置 ==========
NODE_ENV=development
DEBUG=false
LOG_LEVEL=info

# 缓存配置
CACHE_ENABLED=true
CACHE_TTL=3600  # 秒
CACHE_DIR=.cache
```

**参数说明**：
- `LLM_PROVIDER`: LLM 提供商，支持 `openai` 或 `anthropic`
- `OPENAI_MODEL`: OpenAI 模型，建议使用 `gpt-4-turbo-preview` 获得最佳效果
- `ANTHROPIC_MODEL`: Claude 模型，建议使用 `claude-3-sonnet-20240229`
- `CACHE_TTL`: 缓存过期时间（秒），默认 3600（1 小时）
- `LOG_LEVEL`: 日志级别，支持 `error` | `warn` | `info` | `debug`

## 验证安装

安装完成后，运行以下命令验证：

```bash
# 编译 TypeScript
npm run build

# 如果编译成功，你应该看到 dist/ 目录被创建
ls dist/
```

## 下一步

- 查看 [首次运行](./first-run.md) 了解如何启动应用
- 浏览 [使用指南](../guides/usage.md) 学习基本命令
- 如有问题，参考 [常见问题](../guides/troubleshooting.md)

## 获取 API Keys

### 获取 OpenAI API Key

1. 访问 [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. 登录你的 OpenAI 账号（没有账号则注册）
3. 点击 "Create new secret key"
4. 复制生成的 API Key 到 `.env` 文件

### 获取 Anthropic Claude API Key

1. 访问 [https://console.anthropic.com/](https://console.anthropic.com/)
2. 登录你的 Anthropic 账号
3. 导航到 "API Keys" 页面
4. 点击 "Create Key"，复制密钥到 `.env` 文件

### 获取高德 API Key

1. 访问 [https://lbs.amap.com/api/webservice/](https://lbs.amap.com/api/webservice/)
2. 登录你的高德账号（没有则注册）
3. 创建新应用或使用现有应用
4. 申请 "Web Service API" 类型的 Key
5. 复制 Key 到 `.env` 文件中的 `AMAP_API_KEY`

## 故障排查

**问题**: npm install 失败

```bash
# 尝试清除 npm 缓存
npm cache clean --force
npm install
```

**问题**: Node.js 版本过低

```bash
# 检查 Node.js 版本
node --version

# 如果版本低于 18，升级 Node.js
# 推荐使用 nvm（Node 版本管理器）
```

**问题**: API Key 无效

- 确保 API Key 已正确复制到 `.env` 文件
- 检查 API Key 是否过期或被禁用
- 确认 `LLM_PROVIDER` 的值与你使用的 API Key 类型匹配

需要更多帮助？查看 [常见问题](../guides/troubleshooting.md) 或提交 Issue。
