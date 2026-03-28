import { DifficultyLevel, ParkType } from '@/config/constants';

/**
 * 地点信息
 */
export interface Location {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  distance?: number; // 公里
  rating?: number; // 0-5
  difficulty?: DifficultyLevel;
  description?: string;
  tags?: string[];
  visitDuration?: string; // 建议游玩时间
  openingHours?: string;
  phone?: string;
  website?: string;
}

/**
 * 用户偏好
 */
export interface UserPreference {
  location?: string;
  latitude?: number;
  longitude?: number;
  parkType?: ParkType;
  maxDistance?: number; // 公里
  minDifficulty?: DifficultyLevel;
  maxDifficulty?: DifficultyLevel;
  preferredTags?: string[];
  visitTime?: string;
  groupSize?: number;
  mobilityConstraints?: string;
}

/**
 * 推荐结果
 */
export interface Recommendation {
  id: string;
  location: Location;
  reason: string; // 推荐理由
  relevanceScore: number; // 0-1
  estimatedTravelTime?: number; // 分钟
  directions?: string;
}

/**
 * 对话消息
 */
export interface DialogueMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * 对话上下文
 */
export interface DialogueContext {
  sessionId: string;
  messages: DialogueMessage[];
  userPreference: UserPreference;
  recommendations?: Recommendation[];
  createdAt: number;
  updatedAt: number;
}

/**
 * API 响应
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * 缓存项
 */
export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * 错误信息
 */
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}
