import { UserPreference, Location, DialogueMessage } from './common';
import { DifficultyLevel, ParkType } from '@/config/constants';

/**
 * LLM 提供商类型
 */
export type LLMProvider = 'openai' | 'anthropic' | 'aliyun';

/**
 * LLM 模型配置
 */
export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature?: number; // 0-2，默认 0.7
  maxTokens?: number;
  topP?: number; // 0-1
  frequencyPenalty?: number; // -2 to 2
  presencePenalty?: number; // -2 to 2
  timeout?: number; // 毫秒
}

/**
 * LLM 消息
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * LLM 响应
 */
export interface LLMResponse {
  id: string;
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'error' | string;
}

/**
 * 对话意图解析结果
 */
export interface IntentParsing {
  intent: 'provide_info' | 'ask_question' | 'clarify' | 'request_help' | 'complete';
  confidence: number; // 0-1
  extractedInfo?: Partial<UserPreference>;
  followUpQuestion?: string;
  requiresValidation?: boolean;
}

/**
 * LLM 推荐决策结果
 */
export interface RecommendationDecision {
  shouldRecommend: boolean; // 是否已收集足够信息
  searchParams: {
    location?: string;
    latitude?: number;
    longitude?: number;
    parkType?: ParkType;
    maxDistance?: number;
    minDifficulty?: DifficultyLevel;
    maxDifficulty?: DifficultyLevel;
    keywords?: string[];
  };
  reasoning: string; // 推荐理由
  confidence: number; // 0-1，信心度
  missingInfo?: string[]; // 仍需收集的信息
}

/**
 * 推荐解析结果
 */
export interface ParsedRecommendation {
  locations: Array<{
    name: string;
    reason: string;
    relevanceScore: number; // 0-1
    estimatedTravelTime?: number;
  }>;
  explanation: string; // 整体推荐说明
}

/**
 * LLM 对话历史
 */
export interface LLMDialogueHistory {
  sessionId: string;
  messages: LLMMessage[];
  userPreference: UserPreference;
  lastUpdateTime: number;
  turnCount: number;
}

/**
 * LLM 客户端接口
 */
export interface ILLMClient {
  /**
   * 调用 LLM API
   */
  call(messages: LLMMessage[], config?: Partial<LLMConfig>): Promise<LLMResponse>;

  /**
   * 获取当前配置
   */
  getConfig(): LLMConfig;

  /**
   * 设置配置
   */
  setConfig(config: Partial<LLMConfig>): void;

  /**
   * 验证 API 连接
   */
  validateConnection(): Promise<boolean>;
}

/**
 * 提示词配置
 */
export interface PromptConfig {
  systemPrompt: string;
  contextSize: number; // 保持多少条对话历史
  examples?: Array<{
    userMessage: string;
    assistantResponse: string;
  }>;
}

/**
 * 提示词模板容器
 */
export interface PromptTemplate {
  greeting: PromptConfig;
  collectingLocation: PromptConfig;
  collectingType: PromptConfig;
  collectingDistance: PromptConfig;
  collectingDifficulty: PromptConfig;
  querying: PromptConfig;
  recommending: PromptConfig;
}

/**
 * 单轮对话请求
 */
export interface DialogueRequest {
  sessionId: string;
  userInput: string;
  preferences: UserPreference;
  conversationHistory: DialogueMessage[];
  currentPhase: string;
}

/**
 * 单轮对话响应
 */
export interface DialogueResponse {
  assistantMessage: string;
  nextPhase?: string;
  updatedPreferences?: Partial<UserPreference>;
  shouldRecommend?: boolean;
  recommendations?: Array<{
    name: string;
    reason: string;
    relevanceScore: number;
  }>;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * LLM 决策引擎接口
 */
export interface ILLMEngine {
  /**
   * 处理单轮对话
   */
  processDialogue(request: DialogueRequest): Promise<DialogueResponse>;

  /**
   * 进行信息提取
   */
  extractUserPreference(userInput: string, phase: string): Promise<IntentParsing>;

  /**
   * 判断是否可以进行推荐
   */
  shouldRecommend(preferences: UserPreference): Promise<RecommendationDecision>;

  /**
   * 根据用户偏好生成搜索参数
   */
  generateSearchParams(preferences: UserPreference): Promise<RecommendationDecision>;

  /**
   * 解析 LLM 的推荐响应
   */
  parseRecommendations(response: string): Promise<ParsedRecommendation>;

  /**
   * 生成下一个提问
   */
  generateNextQuestion(preferences: UserPreference, phase: string): Promise<string>;
}
