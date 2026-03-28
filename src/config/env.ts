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
  llmProvider: 'openai' | 'anthropic';
  openaiApiKey?: string;
  openaiModel: string;
  openaiBaseUrl: string;
  anthropicApiKey?: string;
  anthropicModel: string;

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

    amapApiKey: process.env.AMAP_API_KEY,
    amapBaseUrl: process.env.AMAP_BASE_URL || 'https://restapi.amap.com/v3',

    cacheDir: process.env.CACHE_DIR || '.cache',
    cacheExpiration: parseInt(process.env.CACHE_EXPIRATION || '604800', 10),

    logLevel: (process.env.LOG_LEVEL || 'info') as any,
    logFile: process.env.LOG_FILE || 'logs/app.log',
  };

  // 验证必需的配置
  if (!config.openaiApiKey && config.llmProvider === 'openai') {
    throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
  }

  if (!config.anthropicApiKey && config.llmProvider === 'anthropic') {
    throw new Error('ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic');
  }

  if (!config.amapApiKey) {
    throw new Error('AMAP_API_KEY is required');
  }

  return config;
}

export const env = validateEnv();
