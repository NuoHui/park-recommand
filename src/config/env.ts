import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 加载 .env 文件
dotenv.config({ path: path.join(__dirname, '../../.env') });

export interface EnvConfig {
  nodeEnv: 'development' | 'production' | 'test';
  debug: boolean;
  appName: string;

  // LLM 配置
  llmProvider: 'openai' | 'anthropic' | 'aliyun';
  openaiApiKey?: string;
  openaiModel: string;
  openaiBaseUrl: string;
  anthropicApiKey?: string;
  anthropicModel: string;
  aliyunApiKey?: string;
  aliyunModel: string;
  aliyunBaseUrl: string;
  useMockLLM?: boolean;

  // 地图 API
  amapApiKey?: string;
  amapBaseUrl: string;

  // 缓存配置
  cacheDir: string;
  cacheExpiration: number;

  // 日志配置
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logFile: string;
}

function validateEnv(): EnvConfig {
  const config: EnvConfig = {
    nodeEnv: (process.env.NODE_ENV || 'development') as any,
    debug: process.env.DEBUG === 'true',
    appName: process.env.APP_NAME || '深圳公园景点推荐 Agent',

    llmProvider: (process.env.LLM_PROVIDER || 'openai') as any,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
    aliyunApiKey: process.env.ALIYUN_API_KEY,
    aliyunModel: process.env.ALIYUN_MODEL || 'qwen-long',
    aliyunBaseUrl: process.env.ALIYUN_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1',
    useMockLLM: process.env.USE_MOCK_LLM === 'true',

    amapApiKey: process.env.AMAP_API_KEY,
    amapBaseUrl: process.env.AMAP_BASE_URL || 'https://restapi.amap.com/v3',

    cacheDir: process.env.CACHE_DIR || '.cache',
    cacheExpiration: parseInt(process.env.CACHE_EXPIRATION || '604800', 10),

    logLevel: (process.env.LOG_LEVEL || 'info') as any,
    logFile: process.env.LOG_FILE || 'logs/app.log',
  };

  // 检查 API Key 是否为虚假值
  const hasValidOpenAIKey =
    config.openaiApiKey &&
    !config.openaiApiKey.includes('your-') &&
    !config.openaiApiKey.includes('your_') &&
    !config.openaiApiKey.includes('here') &&
    config.openaiApiKey.length > 10;

  const hasValidAnthropicKey =
    config.anthropicApiKey &&
    !config.anthropicApiKey.includes('your-') &&
    !config.anthropicApiKey.includes('your_') &&
    !config.anthropicApiKey.includes('here') &&
    config.anthropicApiKey.length > 10;

  const hasValidAliyunKey =
    config.aliyunApiKey &&
    !config.aliyunApiKey.includes('your-') &&
    !config.aliyunApiKey.includes('your_') &&
    !config.aliyunApiKey.includes('here') &&
    config.aliyunApiKey.length > 10;

  // 如果有虚假 key 但没有明确启用 Mock，自动启用 Mock
  if (
    !config.useMockLLM &&
    ((config.llmProvider === 'openai' && !hasValidOpenAIKey) ||
      (config.llmProvider === 'anthropic' && !hasValidAnthropicKey) ||
      (config.llmProvider === 'aliyun' && !hasValidAliyunKey))
  ) {
    config.useMockLLM = true;
  }

  // 如果不使用 Mock 模式且未启用 Mock，才验证 API Key
  if (!config.useMockLLM) {
    if (!config.openaiApiKey && config.llmProvider === 'openai') {
      throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
    }

    if (!config.anthropicApiKey && config.llmProvider === 'anthropic') {
      throw new Error('ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic');
    }

    if (!config.aliyunApiKey && config.llmProvider === 'aliyun') {
      throw new Error('ALIYUN_API_KEY is required when LLM_PROVIDER=aliyun');
    }
  }

  if (!config.amapApiKey) {
    throw new Error('AMAP_API_KEY is required');
  }

  return config;
}

export const env = validateEnv();
