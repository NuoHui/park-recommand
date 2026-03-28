import { v4 as uuidv4 } from 'uuid';
import { UserPreference, DialogueMessage, Recommendation, DialogueContext } from '@/types/common';
import { createLogger } from '@/utils/logger';

const logger = createLogger('dialogue:context');

/**
 * 对话上下文管理器
 * 维护对话过程中的所有状态和历史信息
 */
export class ContextManager {
  private context: DialogueContext;

  constructor(
    sessionId: string = uuidv4(),
    initialPreference: UserPreference = {}
  ) {
    const now = Date.now();
    this.context = {
      sessionId,
      messages: [],
      userPreference: initialPreference,
      createdAt: now,
      updatedAt: now,
    };

    logger.info('对话上下文管理器创建', { sessionId });
  }

  /**
   * 获取会话 ID
   */
  getSessionId(): string {
    return this.context.sessionId;
  }

  /**
   * 添加消息到历史
   */
  addMessage(role: 'user' | 'assistant', content: string, metadata?: Record<string, any>): DialogueMessage {
    const message: DialogueMessage = {
      id: uuidv4(),
      role,
      content,
      timestamp: Date.now(),
      metadata,
    };

    this.context.messages.push(message);
    this.context.updatedAt = Date.now();

    logger.debug('消息添加', {
      sessionId: this.context.sessionId,
      role,
      contentLength: content.length,
    });

    return message;
  }

  /**
   * 获取对话历史
   */
  getMessages(): DialogueMessage[] {
    return [...this.context.messages];
  }

  /**
   * 获取最近的 N 条消息（用于构建 LLM prompt）
   */
  getRecentMessages(count: number = 5): DialogueMessage[] {
    return this.context.messages.slice(Math.max(0, this.context.messages.length - count));
  }

  /**
   * 获取用户的最后一条消息
   */
  getLastUserMessage(): DialogueMessage | undefined {
    for (let i = this.context.messages.length - 1; i >= 0; i--) {
      if (this.context.messages[i].role === 'user') {
        return this.context.messages[i];
      }
    }
    return undefined;
  }

  /**
   * 获取助手的最后一条消息
   */
  getLastAssistantMessage(): DialogueMessage | undefined {
    for (let i = this.context.messages.length - 1; i >= 0; i--) {
      if (this.context.messages[i].role === 'assistant') {
        return this.context.messages[i];
      }
    }
    return undefined;
  }

  /**
   * 更新用户偏好
   */
  updatePreference(preference: Partial<UserPreference>): void {
    this.context.userPreference = {
      ...this.context.userPreference,
      ...preference,
    };
    this.context.updatedAt = Date.now();

    logger.debug('用户偏好更新', {
      sessionId: this.context.sessionId,
      preference: Object.keys(preference),
    });
  }

  /**
   * 获取用户偏好
   */
  getPreference(): UserPreference {
    return { ...this.context.userPreference };
  }

  /**
   * 设置推荐结果
   */
  setRecommendations(recommendations: Recommendation[]): void {
    this.context.recommendations = recommendations;
    this.context.updatedAt = Date.now();

    logger.debug('推荐结果设置', {
      sessionId: this.context.sessionId,
      count: recommendations.length,
    });
  }

  /**
   * 获取推荐结果
   */
  getRecommendations(): Recommendation[] | undefined {
    return this.context.recommendations ? [...this.context.recommendations] : undefined;
  }

  /**
   * 获取完整上下文
   */
  getContext(): DialogueContext {
    return {
      ...this.context,
      messages: [...this.context.messages],
      userPreference: { ...this.context.userPreference },
      recommendations: this.context.recommendations ? [...this.context.recommendations] : undefined,
    };
  }

  /**
   * 获取对话摘要（用于日志）
   */
  getSummary(): {
    sessionId: string;
    messageCount: number;
    userPreference: UserPreference;
    duration: number;
  } {
    return {
      sessionId: this.context.sessionId,
      messageCount: this.context.messages.length,
      userPreference: this.context.userPreference,
      duration: this.context.updatedAt - this.context.createdAt,
    };
  }

  /**
   * 清空对话历史（但保留基本信息）
   */
  clearMessages(): void {
    this.context.messages = [];
    this.context.updatedAt = Date.now();
    logger.info('对话历史已清空', { sessionId: this.context.sessionId });
  }

  /**
   * 重置上下文
   */
  reset(): void {
    this.context = {
      sessionId: this.context.sessionId,
      messages: [],
      userPreference: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    logger.info('上下文已重置', { sessionId: this.context.sessionId });
  }

  /**
   * 导出对话为 JSON（用于保存和调试）
   */
  toJSON(): DialogueContext {
    return this.getContext();
  }

  /**
   * 从 JSON 导入上下文
   */
  static fromJSON(data: DialogueContext): ContextManager {
    const manager = new ContextManager(data.sessionId, data.userPreference);
    manager.context = {
      ...data,
      messages: [...data.messages],
      userPreference: { ...data.userPreference },
      recommendations: data.recommendations ? [...data.recommendations] : undefined,
    };
    return manager;
  }
}
