import { promises as fs } from 'fs';
import path from 'path';
import { createLogger } from '@/utils/logger';
import { DialogueContext } from '@/types/common';
import { ContextManager } from './context';

const logger = createLogger('dialogue:session');

/**
 * 对话会话管理器
 * 负责会话的保存、加载、管理等操作
 */
export class SessionManager {
  private sessionDir: string;
  private activeSessions: Map<string, ContextManager> = new Map();

  constructor(sessionDir: string = './sessions') {
    this.sessionDir = sessionDir;
    this.ensureSessionDir();
  }

  /**
   * 确保会话目录存在
   */
  private async ensureSessionDir(): Promise<void> {
    try {
      await fs.mkdir(this.sessionDir, { recursive: true });
      logger.info('会话目录已创建', { path: this.sessionDir });
    } catch (error) {
      logger.error('创建会话目录失败', { error, path: this.sessionDir });
      throw error;
    }
  }

  /**
   * 创建新会话
   */
  createSession(sessionId?: string): ContextManager {
    const manager = new ContextManager(sessionId);
    this.activeSessions.set(manager.getSessionId(), manager);

    logger.info('新会话创建', { sessionId: manager.getSessionId() });

    return manager;
  }

  /**
   * 获取活跃会话
   */
  getActiveSession(sessionId: string): ContextManager | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * 列出所有活跃会话 ID
   */
  listActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  /**
   * 关闭会话
   */
  closeSession(sessionId: string): void {
    if (this.activeSessions.has(sessionId)) {
      this.activeSessions.delete(sessionId);
      logger.info('会话已关闭', { sessionId });
    }
  }

  /**
   * 保存会话到文件
   */
  async saveSession(sessionId: string, manager: ContextManager): Promise<void> {
    try {
      await this.ensureSessionDir();

      const filePath = path.join(this.sessionDir, `${sessionId}.json`);
      const context = manager.getContext();
      const data = JSON.stringify(context, null, 2);

      await fs.writeFile(filePath, data, 'utf-8');

      logger.info('会话已保存', {
        sessionId,
        filePath,
        messageCount: context.messages.length,
      });
    } catch (error) {
      logger.error('保存会话失败', { error, sessionId });
      throw error;
    }
  }

  /**
   * 从文件加载会话
   */
  async loadSession(sessionId: string): Promise<ContextManager | null> {
    try {
      const filePath = path.join(this.sessionDir, `${sessionId}.json`);

      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const context: DialogueContext = JSON.parse(data);
        const manager = ContextManager.fromJSON(context);

        this.activeSessions.set(sessionId, manager);

        logger.info('会话已加载', {
          sessionId,
          filePath,
          messageCount: context.messages.length,
        });

        return manager;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          logger.warn('会话文件不存在', { sessionId, filePath });
          return null;
        }
        throw error;
      }
    } catch (error) {
      logger.error('加载会话失败', { error, sessionId });
      throw error;
    }
  }

  /**
   * 删除已保存的会话文件
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const filePath = path.join(this.sessionDir, `${sessionId}.json`);

      try {
        await fs.unlink(filePath);
        this.activeSessions.delete(sessionId);

        logger.info('会话已删除', { sessionId, filePath });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          logger.warn('会话文件不存在', { sessionId });
          return;
        }
        throw error;
      }
    } catch (error) {
      logger.error('删除会话失败', { error, sessionId });
      throw error;
    }
  }

  /**
   * 列出所有已保存的会话
   */
  async listSavedSessions(): Promise<
    Array<{
      sessionId: string;
      savedAt: number;
      messageCount: number;
    }>
  > {
    try {
      await this.ensureSessionDir();

      const files = await fs.readdir(this.sessionDir);
      const sessions: Array<{
        sessionId: string;
        savedAt: number;
        messageCount: number;
      }> = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(this.sessionDir, file);
            const data = await fs.readFile(filePath, 'utf-8');
            const context: DialogueContext = JSON.parse(data);

            sessions.push({
              sessionId: context.sessionId,
              savedAt: context.updatedAt,
              messageCount: context.messages.length,
            });
          } catch (error) {
            logger.warn('解析会话文件失败', { file, error });
          }
        }
      }

      return sessions.sort((a, b) => b.savedAt - a.savedAt);
    } catch (error) {
      logger.error('列出已保存的会话失败', { error });
      return [];
    }
  }

  /**
   * 清理过期的会话（超过指定天数）
   */
  async cleanupOldSessions(maxAgeDays: number = 30): Promise<number> {
    try {
      const sessions = await this.listSavedSessions();
      const now = Date.now();
      const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
      let cleanedCount = 0;

      for (const session of sessions) {
        if (now - session.savedAt > maxAge) {
          await this.deleteSession(session.sessionId);
          cleanedCount++;
        }
      }

      logger.info('过期会话清理完成', {
        maxAgeDays,
        cleanedCount,
      });

      return cleanedCount;
    } catch (error) {
      logger.error('清理过期会话失败', { error });
      return 0;
    }
  }

  /**
   * 导出会话为人类可读的格式（用于调试）
   */
  async exportSessionAsText(sessionId: string): Promise<string> {
    try {
      const manager = await this.loadSession(sessionId);
      if (!manager) {
        return `会话 ${sessionId} 不存在`;
      }

      const context = manager.getContext();
      let text = `=== 对话会话 ${sessionId} ===\n\n`;

      text += `创建时间: ${new Date(context.createdAt).toLocaleString()}\n`;
      text += `更新时间: ${new Date(context.updatedAt).toLocaleString()}\n`;
      text += `消息数: ${context.messages.length}\n\n`;

      text += `--- 用户偏好 ---\n`;
      text += JSON.stringify(context.userPreference, null, 2);
      text += `\n\n`;

      text += `--- 对话历史 ---\n`;
      for (const msg of context.messages) {
        const role = msg.role === 'user' ? '👤 用户' : '🤖 助手';
        const time = new Date(msg.timestamp).toLocaleTimeString();
        text += `\n[${time}] ${role}:\n${msg.content}\n`;
      }

      if (context.recommendations && context.recommendations.length > 0) {
        text += `\n\n--- 推荐结果 (${context.recommendations.length} 个) ---\n`;
        for (const rec of context.recommendations) {
          text += `\n• ${rec.location.name}\n`;
          text += `  原因: ${rec.reason}\n`;
          text += `  相关性: ${(rec.relevanceScore * 100).toFixed(1)}%\n`;
        }
      }

      return text;
    } catch (error) {
      logger.error('导出会话失败', { error, sessionId });
      throw error;
    }
  }

  /**
   * 获取会话统计信息
   */
  async getSessionStats(): Promise<{
    activeCount: number;
    savedCount: number;
    totalMessages: number;
    oldestSession?: number;
    newestSession?: number;
  }> {
    try {
      const savedSessions = await this.listSavedSessions();
      let totalMessages = 0;

      for (const session of savedSessions) {
        totalMessages += session.messageCount;
      }

      return {
        activeCount: this.activeSessions.size,
        savedCount: savedSessions.length,
        totalMessages,
        oldestSession: savedSessions.length > 0 ? savedSessions[savedSessions.length - 1].savedAt : undefined,
        newestSession: savedSessions.length > 0 ? savedSessions[0].savedAt : undefined,
      };
    } catch (error) {
      logger.error('获取会话统计失败', { error });
      throw error;
    }
  }
}
