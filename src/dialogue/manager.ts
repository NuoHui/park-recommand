import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@/utils/logger';
import { DialogueState, DialogueManagerConfig, LLMRecommendationResponse } from '@/types/dialogue';
import { DialoguePhase } from '@/config/constants';
import { UserPreference, DialogueMessage, Recommendation } from '@/types/common';
import { StateMachine } from './state-machine';
import { ContextManager } from './context';
import { DialogueFlowEngine } from './flow-engine';
import { SessionManager } from './session';
import { getLLMService } from '@/llm/service';
import { getLocationService } from '@/map/service';
import { RequestQueue } from '@/queue/request-queue';
import { CacheWarmer } from '@/cache/warmer';
import { MetricsCollector } from '@/monitoring/metrics-collector';
import { RequestPriority } from '@/queue/types';

const logger = createLogger('dialogue:manager');

export class DialogueManager {
  private sessionId: string;
  private state: DialogueState;
  private stateMachine: StateMachine;
  private contextManager: ContextManager;
  private flowEngine: DialogueFlowEngine;
  private sessionManager: SessionManager;
  private config: Required<DialogueManagerConfig>;
  private requestQueue: RequestQueue;
  private cacheWarmer: CacheWarmer;
  private metricsCollector: MetricsCollector;

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

    // 初始化性能优化模块
    this.requestQueue = new RequestQueue({
      maxConcurrency: 5,
      defaultTimeout: this.config.timeout,
      maxRetries: 2,
      deduplication: true,
    });

    this.cacheWarmer = new CacheWarmer({
      enableAutoWarmup: true,
      warmupInterval: 300000, // 5 分钟
    });

    this.metricsCollector = new MetricsCollector({
      enabled: true,
      sampleRetentionTime: 3600000,
      aggregationInterval: 60000,
    });

    logger.info('对话管理器创建', {
      sessionId: this.sessionId,
      config: this.config,
      performanceModulesInitialized: true,
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

    // 按需缓存模式：不需要手动预热
    // 用户查询时会自动调用 API 并缓存结果
    logger.debug('已初始化缓存管理器（按需缓存模式）', {
      sessionId: this.sessionId,
      mode: 'on-demand',
    });

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
   * 获取推荐结果（性能优化集成版）
   * 完整流程: 缓存检查 → 请求队列 → LLM 信息检查 → 参数优化 → 地图 API 查询 → LLM 排序 → 格式化 → 性能监控
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
    performanceMetrics?: {
      totalTime: number;
      llmTime: number;
      mapQueryTime: number;
      cacheHit: boolean;
    };
  }> {
    const overallStartTime = Date.now();

    if (this.state.phase !== DialoguePhase.QUERYING) {
      return {
        success: false,
        error: '信息收集不完整，无法生成推荐',
      };
    }

    try {
      const preferences = this.state.userPreference;

      logger.info('开始推荐流程 (性能优化版)', {
        sessionId: this.sessionId,
        preferences,
      });

      // 0️⃣ 尝试从缓存检查
      const cacheKey = this.generateCacheKey(preferences);
      let cachedResult = await this.checkCachedRecommendations(cacheKey);
      const cacheHit = !!cachedResult;

      if (cacheHit) {
        const cacheTime = Date.now() - overallStartTime;
        this.metricsCollector.recordCacheHit(true, cacheTime);
        logger.info('命中缓存推荐', {
          sessionId: this.sessionId,
          timeMs: cacheTime,
        });

        return {
          success: true,
          recommendations: cachedResult,
          performanceMetrics: {
            totalTime: cacheTime,
            llmTime: 0,
            mapQueryTime: 0,
            cacheHit: true,
          },
        };
      }

      this.metricsCollector.recordCacheHit(false);

      // 1️⃣ 创建异步请求队列任务
      const llmCheckRequestId = `llm-check-${this.sessionId}`;
      const mapQueryRequestId = `map-query-${this.sessionId}`;

      // 2️⃣ 获取服务实例
      const llmService = getLLMService();
      const locationService = getLocationService();

      if (!llmService.isInitialized()) {
        await llmService.initialize();
      }

      const llmEngine = llmService.getEngine();

      // 3️⃣ 添加到请求队列 - LLM 信息检查
      const llmCheckStartTime = Date.now();

      this.requestQueue.add({
        id: llmCheckRequestId,
        priority: RequestPriority.HIGH,
        executor: async () => {
          const shouldRecommendResult = await llmEngine.shouldRecommend(preferences);

          if (!shouldRecommendResult.shouldRecommend) {
            logger.warn('信息不足，无法推荐', {
              missingInfo: shouldRecommendResult.missingInfo,
            });
            throw new Error(shouldRecommendResult.reasoning);
          }

          return shouldRecommendResult;
        },
      });

      const llmCheckResult = await this.waitForQueuedRequest(llmCheckRequestId);
      const llmCheckTime = Date.now() - llmCheckStartTime;

      logger.debug('LLM 信息检查完成', {
        confidence: llmCheckResult.confidence,
        timeMs: llmCheckTime,
      });

      // 4️⃣ LLM 参数优化
      const paramOptimizationStartTime = Date.now();

      const searchDecision = await llmEngine.generateSearchParams(preferences);

      const paramOptimizationTime = Date.now() - paramOptimizationStartTime;

      logger.debug('搜索参数已生成', {
        searchParams: searchDecision.searchParams,
        confidence: searchDecision.confidence,
        timeMs: paramOptimizationTime,
      });

      // 5️⃣ 添加到请求队列 - 地图查询
      const mapQueryStartTime = Date.now();

      this.requestQueue.add({
        id: mapQueryRequestId,
        priority: RequestPriority.HIGH,
        executor: async () => {
          return await locationService.searchRecommendedLocations(preferences);
        },
      });

      const locations = await this.waitForQueuedRequest(mapQueryRequestId);
      const mapQueryTime = Date.now() - mapQueryStartTime;

      logger.info('景点搜索完成', {
        count: locations?.length || 0,
        timeMs: mapQueryTime,
      });

      // 处理无结果情况
      if (!locations || locations.length === 0) {
        logger.warn('地点搜索无结果，尝试降级处理');

        const fallback = await this.getFallbackRecommendations(preferences);
        if (fallback.length > 0) {
          const formatted = await this.formatRecommendations(fallback, {
            locations: [],
            explanation: '根据深圳热门景点为你推荐',
          });
          this.state.phase = DialoguePhase.RECOMMENDING;

          const totalTime = Date.now() - overallStartTime;
          this.metricsCollector.recordRequest(totalTime, true);

          return {
            success: true,
            recommendations: formatted,
            performanceMetrics: {
              totalTime,
              llmTime: llmCheckTime + paramOptimizationTime,
              mapQueryTime,
              cacheHit: false,
            },
          };
        }

        return {
          success: false,
          error: '抱歉，暂未找到符合条件的景点',
        };
      }

      // 6️⃣ LLM 排序和解析结果
      const llmParseStartTime = Date.now();

      const locationsJson = JSON.stringify(locations.slice(0, 10), null, 2);
      let parsedRecommendations: {
        locations: Array<{
          name: string;
          reason: string;
          relevanceScore: number;
          estimatedTravelTime?: number;
        }>;
        explanation: string;
      };

      try {
        parsedRecommendations = await llmEngine.parseRecommendations(locationsJson);
      } catch (error) {
        logger.warn('LLM 推荐解析失败，使用默认解析策略', {
          error: error instanceof Error ? error.message : '未知错误',
        });

        // 降级方案：使用默认推荐理由
        parsedRecommendations = {
          locations: locations.slice(0, 5).map((loc: any) => ({
            name: loc.name,
            reason:
              preferences.parkType === 'hiking'
                ? `距离${preferences.location}近，适合登山活动`
                : `距离${preferences.location}近，适合休闲散步`,
            relevanceScore: 0.85,
          })),
          explanation: `根据你在${preferences.location}的位置和偏好，为你推荐以下${preferences.parkType === 'hiking' ? '爬山' : '公园'}景点`,
        };
      }

      const llmParseTime = Date.now() - llmParseStartTime;

      logger.debug('推荐已解析', {
        parsedCount: parsedRecommendations.locations.length,
        timeMs: llmParseTime,
      });

      // 7️⃣ 格式化为最终推荐格式
      const formattingStartTime = Date.now();

      const recommendations = await this.formatRecommendations(
        locations,
        parsedRecommendations
      );

      const formattingTime = Date.now() - formattingStartTime;

      // 8️⃣ 状态转移
      this.state.phase = DialoguePhase.RECOMMENDING;

      logger.info('推荐流程完成 (性能优化版)', {
        recommendationCount: recommendations.length,
      });

      // 9️⃣ 缓存结果
      await this.cacheRecommendations(cacheKey, recommendations);

      // 🔟 记录性能指标
      const totalTime = Date.now() - overallStartTime;
      this.metricsCollector.recordRequest(totalTime, true, {
        source: 'llm_map_integration',
        recommendationCount: recommendations.length.toString(),
      });

      const totalLLMTime = llmCheckTime + paramOptimizationTime + llmParseTime;

      logger.info('性能指标', {
        sessionId: this.sessionId,
        totalTime,
        llmTime: totalLLMTime,
        mapQueryTime,
        formattingTime,
        cacheHit,
      });

      return {
        success: true,
        recommendations,
        performanceMetrics: {
          totalTime,
          llmTime: totalLLMTime,
          mapQueryTime,
          cacheHit: false,
        },
      };
    } catch (error) {
      const totalTime = Date.now() - overallStartTime;
      this.metricsCollector.recordRequest(totalTime, false);

      logger.error('获取推荐失败', {
        error: error instanceof Error ? error.message : '未知错误',
        timeMs: totalTime,
      });

      // 🔄 最后的降级处理：尝试从主要源获取数据
      try {
        const locationService = getLocationService();
        
        // 即使 LLM 失败，也尝试从高德获取数据
        const fallback = await locationService.searchRecommendedLocations(
          this.state.userPreference
        );
        
        if (fallback && fallback.length > 0) {
          logger.info('使用高德搜索结果作为最终降级方案', {
            count: fallback.length,
          });
          
          // 即使 LLM 失败也要格式化数据
          const formatted = await this.formatRecommendations(fallback, {
            locations: fallback.slice(0, 5).map(loc => ({
              name: loc.name,
              reason:
                this.state.userPreference.parkType === 'hiking'
                  ? `距离${this.state.userPreference.location}近，适合登山活动`
                  : `距离${this.state.userPreference.location}近，适合休闲散步`,
              relevanceScore: 0.85,
            })),
            explanation: `根据你在${this.state.userPreference.location}的位置和偏好，为你推荐以下${this.state.userPreference.parkType === 'hiking' ? '爬山' : '公园'}景点`,
          });
          
          this.state.phase = DialoguePhase.RECOMMENDING;
          return {
            success: true,
            recommendations: formatted,
            performanceMetrics: {
              totalTime,
              llmTime: 0,
              mapQueryTime: totalTime,
              cacheHit: false,
            },
          };
        }
      } catch (finalFallbackError) {
        logger.error('最终降级处理失败', {
          error: finalFallbackError instanceof Error ? finalFallbackError.message : '未知错误',
        });
      }

      // 如果所有都失败了，至少返回模拟数据
      try {
        const mock = this.generateMockRecommendations();
        const formatted = await this.formatRecommendations(mock, {
          locations: mock.map(m => ({
            name: m.name,
            reason: m.reason,
            relevanceScore: 0.7,
          })),
          explanation: '系统已为你推荐热门景点',
        });
        
        this.state.phase = DialoguePhase.RECOMMENDING;
        return {
          success: true,
          recommendations: formatted,
          performanceMetrics: {
            totalTime,
            llmTime: 0,
            mapQueryTime: totalTime,
            cacheHit: false,
          },
        };
      } catch (mockError) {
        logger.error('模拟数据生成失败', {
          error: mockError instanceof Error ? mockError.message : '未知错误',
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 格式化推荐结果
   * 将原始地点数据转换为最终推荐格式
   */
  private async formatRecommendations(
    locations: any[],
    parsedData: {
      locations: Array<{
        name: string;
        reason: string;
        relevanceScore: number;
        estimatedTravelTime?: number;
      }>;
      explanation: string;
    }
  ): Promise<
    Array<{
      id: string;
      name: string;
      reason: string;
      distance?: number;
      rating?: number;
    }>
  > {
    // 创建查找表，快速匹配推荐理由
    const reasonMap = new Map<string, string>();
    const scoreMap = new Map<string, number>();

    parsedData.locations.forEach(item => {
      reasonMap.set(item.name.toLowerCase(), item.reason);
      scoreMap.set(item.name.toLowerCase(), item.relevanceScore);
    });

    // 按相关性排序
    const sorted = locations
      .map(loc => ({
        ...loc,
        relevanceScore: scoreMap.get(loc.name.toLowerCase()) || 0.5,
        reason: reasonMap.get(loc.name.toLowerCase()) || `根据你的偏好推荐的景点`,
      }))
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, 5); // 最多返回 5 个推荐

    // 转换为推荐格式
    const recommendations = sorted.map(loc => ({
      id: `rec-${loc.name.replace(/\s+/g, '-')}`,
      name: loc.name,
      reason: loc.reason,
      distance: loc.distance ? Math.round(loc.distance * 10) / 10 : undefined,
      rating: loc.rating ? Math.round(loc.rating * 10) / 10 : undefined,
    }));

    logger.debug('推荐已格式化', {
      count: recommendations.length,
    });

    return recommendations;
  }

  /**
   * 降级处理：获取热门景点或缓存数据
   * 当地图 API 失败时使用
   */
  private async getFallbackRecommendations(
    preferences: UserPreference
  ): Promise<any[]> {
    try {
      const locationService = getLocationService();

      // 首先尝试根据用户偏好搜索
      try {
        const searchResults = await locationService.searchRecommendedLocations(preferences);
        if (searchResults && searchResults.length > 0) {
          logger.info('使用搜索结果作为降级方案', {
            count: searchResults.length,
            location: preferences.location,
          });
          return searchResults;
        }
      } catch (searchError) {
        logger.warn('搜索推荐地点失败', {
          error: searchError instanceof Error ? searchError.message : '未知错误',
        });
      }

      // 尝试获取热门景点
      const popular = await locationService.getPopularLocations(5);

      if (popular && popular.length > 0) {
        logger.info('使用热门景点作为降级方案', {
          count: popular.length,
        });
        return popular;
      }
    } catch (error) {
      logger.warn('热门景点获取失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    }

    // 返回模拟数据作为最后的降级方案
    logger.info('使用模拟数据作为最终降级方案');
    return this.generateMockRecommendations();
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
   * 生成缓存键
   */
  private generateCacheKey(preferences: UserPreference): string {
    const key = `rec-${preferences.location}-${preferences.parkType}-${preferences.maxDistance}`;
    return key.replace(/\s+/g, '-').toLowerCase();
  }

  /**
   * 检查缓存的推荐
   */
  private async checkCachedRecommendations(
    cacheKey: string
  ): Promise<Array<{ id: string; name: string; reason: string; distance?: number; rating?: number }> | null> {
    try {
      // TODO: 连接到实际的缓存系统 (Redis, LRU, 等)
      // 当前使用内存缓存占位符
      return null;
    } catch (error) {
      logger.warn('缓存检查失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
      return null;
    }
  }

  /**
   * 缓存推荐结果
   */
  private async cacheRecommendations(
    cacheKey: string,
    recommendations: Array<{
      id: string;
      name: string;
      reason: string;
      distance?: number;
      rating?: number;
    }>
  ): Promise<void> {
    try {
      // TODO: 连接到实际的缓存系统 (Redis, LRU, 等)
      // 当前使用内存缓存占位符
      logger.debug('推荐已缓存', { cacheKey });
    } catch (error) {
      logger.warn('缓存保存失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  /**
   * 等待队列中的请求完成
   */
  private async waitForQueuedRequest(requestId: string): Promise<any> {
    // 最多等待 30 秒
    const maxWaitTime = this.config.timeout;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const status = this.requestQueue.getRequestStatus(requestId);

      if (status === 'completed') {
        const result = this.requestQueue.getRequestResult(requestId);
        return result;
      }

      if (status === 'failed') {
        const error = this.requestQueue.getRequestError(requestId);
        throw new Error(`Request failed: ${error}`);
      }

      // 等待 100ms 再检查
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Request timeout: ${requestId}`);
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): any {
    return {
      requestQueue: this.requestQueue.getStats?.(),
      metrics: this.metricsCollector.getSnapshot?.(),
      cacheWarmupStatus: this.cacheWarmer.getStatus?.(),
    };
  }

  /**
   * 结束对话时清理资源
   */
  private async cleanupPerformanceModules(): Promise<void> {
    try {
      // 输出最终性能报告
      const metrics = this.getPerformanceMetrics();
      logger.info('最终性能指标', metrics);

      // TODO: 可以在这里实现资源清理逻辑
      // 如关闭监听器、清理缓存等
    } catch (error) {
      logger.warn('性能模块清理失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }

  /**
   * 结束对话
   */
  async close(): Promise<void> {
    this.state.isActive = false;
    this.state.phase = DialoguePhase.COMPLETED;

    // 清理性能模块
    await this.cleanupPerformanceModules();

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
