import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@/utils/logger';
import { DialogueState, DialogueManagerConfig, LLMRecommendationResponse } from '@/types/dialogue';
import { DialoguePhase } from '@/config/constants';
import { UserPreference, DialogueMessage, Recommendation } from '@/types/common';
import { StateMachine } from './state-machine';
import { ContextManager } from './context';
import { DialogueFlowEngine } from './flow-engine';
import { SessionManager } from './session';

const logger = createLogger('dialogue:manager');

export class DialogueManager {
  private sessionId: string;
  private state: DialogueState;
  private stateMachine: StateMachine;
  private contextManager: ContextManager;
  private flowEngine: DialogueFlowEngine;
  private sessionManager: SessionManager;
  private config: Required<DialogueManagerConfig>;

  constructor(config: DialogueManagerConfig = {}, sessionManager?: SessionManager) {
    this.sessionId = uuidv4();
    this.config = {
      maxTurns: config.maxTurns || 10,
      timeout: config.timeout || 30000,
      logHistory: config.logHistory !== false,
    };

    this.state = {
      phase: DialoguePhase.GREETING,
      userPreference: {},
      messages: [],
      turnsCount: 0,
      startTime: Date.now(),
      isActive: false,
    };

    this.stateMachine = new StateMachine();
    this.contextManager = new ContextManager(this.sessionId);
    this.flowEngine = new DialogueFlowEngine(this.contextManager);
    this.sessionManager = sessionManager || new SessionManager();

    logger.info('对话管理器创建', {
      sessionId: this.sessionId,
      config: this.config,
    });
  }

  /**
   * 初始化对话
   */
  async initialize(): Promise<void> {
    this.state.isActive = true;
    this.state.phase = DialoguePhase.GREETING;
    this.state.startTime = Date.now();

    logger.info('对话初始化', { sessionId: this.sessionId });

    // 添加初始欢迎消息
    this.contextManager.addMessage(
      'assistant',
      '你好！我是深圳景点推荐助手。我会根据你的偏好为你推荐最合适的公园和爬山景点。'
    );

    this.addMessage({
      role: 'assistant',
      content: '你好！我是深圳景点推荐助手。我会根据你的偏好为你推荐最合适的公园和爬山景点。',
    });
  }

  /**
   * 添加用户输入
   */
  async addUserInput(content: string): Promise<void> {
    if (!this.state.isActive) {
      throw new Error('对话未初始化，请先调用 initialize()');
    }

    if (this.state.turnsCount >= this.config.maxTurns) {
      throw new Error(`超过最大对话轮数 (${this.config.maxTurns})`);
    }

    this.state.turnsCount++;

    // 添加用户消息
    this.addMessage({
      role: 'user',
      content,
    });

    logger.info('用户输入', {
      sessionId: this.sessionId,
      turn: this.state.turnsCount,
      content: content.substring(0, 100),
    });

    // 根据当前阶段处理输入
    await this.processUserInput(content);
  }

  /**
   * 处理用户输入
   */
  private async processUserInput(content: string): Promise<void> {
    switch (this.state.phase) {
      case DialoguePhase.GREETING:
        await this.handleGreeting();
        break;
      case DialoguePhase.COLLECTING_LOCATION:
        await this.handleLocationInput(content);
        break;
      case DialoguePhase.COLLECTING_TYPE:
        await this.handleTypeInput(content);
        break;
      case DialoguePhase.COLLECTING_DISTANCE:
        await this.handleDistanceInput(content);
        break;
      default:
        logger.warn('未处理的对话阶段', { phase: this.state.phase });
    }
  }

  /**
   * 处理问候阶段
   */
  private async handleGreeting(): Promise<void> {
    this.state.phase = DialoguePhase.COLLECTING_LOCATION;

    this.addMessage({
      role: 'assistant',
      content: '请告诉我你的所在位置或地址（例如：南山区、科技园、中心）',
    });
  }

  /**
   * 处理位置输入
   */
  private async handleLocationInput(location: string): Promise<void> {
    this.state.userPreference.location = location;
    this.state.phase = DialoguePhase.COLLECTING_TYPE;

    this.addMessage({
      role: 'assistant',
      content:
        '明白了！你更喜欢哪种景点？\n- P: 公园 (Park)\n- H: 爬山 (Hiking)\n- B: 都可以 (Both)',
    });
  }

  /**
   * 处理景点类型选择
   */
  private async handleTypeInput(choice: string): Promise<void> {
    const typeMap: Record<string, string> = {
      p: 'park',
      park: 'park',
      h: 'hiking',
      hiking: 'hiking',
      b: 'both',
      both: 'both',
    };

    const selectedType = typeMap[choice.toLowerCase()];
    if (!selectedType) {
      this.addMessage({
        role: 'assistant',
        content: '请输入 P、H 或 B 进行选择',
      });
      return;
    }

    this.state.userPreference.parkType = selectedType as any;
    this.state.phase = DialoguePhase.COLLECTING_DISTANCE;

    this.addMessage({
      role: 'assistant',
      content:
        '你希望景点距离多远？\n[1] 3 km 以内\n[2] 5 km 以内\n[3] 10 km 以内\n[4] 无限制',
    });
  }

  /**
   * 处理距离选择
   */
  private async handleDistanceInput(choice: string): Promise<void> {
    const distanceMap: Record<string, number> = {
      '1': 3,
      '2': 5,
      '3': 10,
      '4': Infinity,
    };

    const maxDistance = distanceMap[choice.trim()];
    if (maxDistance === undefined) {
      this.addMessage({
        role: 'assistant',
        content: '请输入 1、2、3 或 4 进行选择',
      });
      return;
    }

    this.state.userPreference.maxDistance = maxDistance;
    this.state.phase = DialoguePhase.QUERYING;

    this.addMessage({
      role: 'assistant',
      content: '好的！正在为你查询合适的景点...',
    });
  }

  /**
   * 获取推荐结果
   */
  async getRecommendations(): Promise<{
    success: boolean;
    recommendations?: Array<{
      id: string;
      name: string;
      reason: string;
      distance?: number;
      rating?: number;
    }>;
    error?: string;
  }> {
    if (this.state.phase !== DialoguePhase.QUERYING) {
      return {
        success: false,
        error: '信息收集不完整，无法生成推荐',
      };
    }

    try {
      // TODO: 调用 LLM 和地图 API 获取推荐
      // 这里先返回示例数据
      const recommendations = this.generateMockRecommendations();

      this.state.phase = DialoguePhase.RECOMMENDING;

      return {
        success: true,
        recommendations,
      };
    } catch (error) {
      logger.error('获取推荐失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 生成模拟推荐数据（开发用）
   */
  private generateMockRecommendations(): Array<{
    id: string;
    name: string;
    reason: string;
    distance?: number;
    rating?: number;
  }> {
    const mockData = [
      {
        id: 'park-001',
        name: '梧桐山风景区',
        reason: '根据你的偏好，这是一个很好的登山选择',
        distance: 3.2,
        rating: 4.8,
      },
      {
        id: 'park-002',
        name: '翠竹山公园',
        reason: '距离近，适合休闲散步',
        distance: 1.5,
        rating: 4.5,
      },
      {
        id: 'park-003',
        name: '莲花山公园',
        reason: '城市公园，景观开阔',
        distance: 2.8,
        rating: 4.3,
      },
    ];

    return mockData;
  }

  /**
   * 添加对话消息
   */
  private addMessage(msg: { role: 'user' | 'assistant'; content: string }): void {
    const message: DialogueMessage = {
      id: uuidv4(),
      role: msg.role,
      content: msg.content,
      timestamp: Date.now(),
    };

    this.state.messages.push(message);

    if (msg.role === 'assistant') {
      console.log(`\n${msg.content}\n`);
    }
  }

  /**
   * 获取当前对话状态
   */
  getState(): DialogueState {
    return { ...this.state };
  }

  /**
   * 获取用户偏好
   */
  getUserPreference(): UserPreference {
    return { ...this.state.userPreference };
  }

  /**
   * 获取对话历史
   */
  getMessages(): DialogueMessage[] {
    return [...this.state.messages];
  }

  /**
   * 获取对话流程引擎
   */
  getFlowEngine(): DialogueFlowEngine {
    return this.flowEngine;
  }

  /**
   * 获取上下文管理器
   */
  getContextManager(): ContextManager {
    return this.contextManager;
  }

  /**
   * 获取对话进度
   */
  getProgress(): {
    phase: string;
    completeness: number;
    turnCount: number;
    maxTurns: number;
  } {
    return {
      phase: this.flowEngine.getCurrentPhase(),
      completeness: this.flowEngine.getPreferenceCompleteness(),
      turnCount: this.state.turnsCount,
      maxTurns: this.config.maxTurns,
    };
  }

  /**
   * 获取对话流程可视化
   */
  getFlowVisualization(): string {
    return this.flowEngine.getFlowVisualization();
  }

  /**
   * 保存会话到文件
   */
  async saveSession(): Promise<void> {
    await this.sessionManager.saveSession(this.sessionId, this.contextManager);
  }

  /**
   * 加载对话的用户偏好（用于已保存会话）
   */
  async restoreFromSession(sessionId: string): Promise<boolean> {
    const manager = await this.sessionManager.loadSession(sessionId);
    if (!manager) {
      return false;
    }

    // 用加载的上下文替换当前上下文
    this.contextManager = manager;
    this.flowEngine = new DialogueFlowEngine(this.contextManager);
    this.sessionId = sessionId;

    logger.info('会话已恢复', { sessionId });
    return true;
  }

  /**
   * 结束对话
   */
  async close(): Promise<void> {
    this.state.isActive = false;
    this.state.phase = DialoguePhase.COMPLETED;

    if (this.config.logHistory) {
      logger.info('对话结束', {
        sessionId: this.sessionId,
        duration: Date.now() - this.state.startTime,
        turns: this.state.turnsCount,
        messagesCount: this.state.messages.length,
      });
    }
  }
}

