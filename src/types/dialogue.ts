import { DialoguePhase } from '@/config/constants';
import { UserPreference, DialogueMessage } from './common';

/**
 * 对话管理器的配置
 */
export interface DialogueManagerConfig {
  maxTurns?: number;
  timeout?: number;
  logHistory?: boolean;
}

/**
 * 对话状态
 */
export interface DialogueState {
  phase: DialoguePhase;
  userPreference: UserPreference;
  messages: DialogueMessage[];
  lastUserMessage?: string;
  lastAssistantMessage?: string;
  turnsCount: number;
  startTime: number;
  isActive: boolean;
}

/**
 * LLM 响应结构（推荐决策）
 */
export interface LLMRecommendationResponse {
  searchParams: {
    types: string[]; // 景点类型
    keywords: string[]; // 搜索关键词
    maxDistance: number;
  };
  reasoning: string; // 推荐理由
  followUp?: string; // 后续建议
}

/**
 * LLM 响应结构（信息收集）
 */
export interface LLMCollectionResponse {
  understood: boolean;
  missingInfo: string[]; // 缺少的信息字段
  nextQuestion?: string; // 下一个问题
  confidence: number; // 0-1，置信度
}

/**
 * 对话事件
 */
export interface DialogueEvent {
  type: 'message' | 'phase_change' | 'preference_update' | 'error';
  payload: any;
  timestamp: number;
}

/**
 * 对话结果
 */
export interface DialogueResult {
  success: boolean;
  preference?: UserPreference;
  messages?: DialogueMessage[];
  recommendations?: Array<{
    id: string;
    name: string;
    reason: string;
  }>;
  error?: string;
}
