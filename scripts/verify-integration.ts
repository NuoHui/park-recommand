import { DialogueManager } from '@/dialogue/manager';
import { getLLMService } from '@/llm/service';
import { getLocationService } from '@/map/service';
import { createLogger } from '@/utils/logger';
import { DialoguePhase } from '@/config/constants';

const logger = createLogger('verify:integration');

/**
 * 集成验证脚本
 * 验证 LLM + 地图 API + 对话管理器的完整流程是否通畅
 */

interface VerificationResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: Record<string, any>;
  duration?: number;
}

class IntegrationVerifier {
  private results: VerificationResult[] = [];
  private manager: DialogueManager | null = null;

  /**
   * 执行所有验证
   */
  async runAllVerifications(): Promise<void> {
    console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
    console.log('║           LLM + 地图 API 集成验证                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

    // 1. 验证 LLM 服务
    await this.verifyLLMService();

    // 2. 验证地图服务
    await this.verifyMapService();

    // 3. 验证 DialogueManager 初始化
    await this.verifyManagerInitialization();

    // 4. 验证用户输入处理
    await this.verifyUserInputHandling();

    // 5. 验证 LLM 信息检查
    await this.verifyLLMInfoCheck();

    // 6. 验证 LLM 参数优化
    await this.verifyLLMParamOptimization();

    // 7. 验证地图查询
    await this.verifyMapQuery();

    // 8. 验证 LLM 结果排序
    await this.verifyLLMParsing();

    // 9. 完整端到端流程
    await this.verifyE2EFlow();

    // 10. 验证错误处理和降级
    await this.verifyErrorHandling();

    // 生成报告
    this.generateReport();
  }

  /**
   * 验证 1: LLM 服务
   */
  private async verifyLLMService(): Promise<void> {
    const startTime = Date.now();
    try {
      const llmService = getLLMService();
      
      if (!llmService) {
        this.addResult({
          name: '1️⃣ LLM 服务获取',
          status: 'fail',
          message: 'LLM 服务为 null',
          duration: Date.now() - startTime,
        });
        return;
      }

      await llmService.initialize();
      const engine = llmService.getEngine();

      if (!engine) {
        this.addResult({
          name: '1️⃣ LLM 服务获取',
          status: 'fail',
          message: 'LLM 引擎为 null',
          duration: Date.now() - startTime,
        });
        return;
      }

      this.addResult({
        name: '1️⃣ LLM 服务获取',
        status: 'pass',
        message: 'LLM 服务成功初始化',
        details: {
          engine: engine.constructor.name,
          hasMethodShouldRecommend: typeof engine.shouldRecommend === 'function',
          hasMethodGenerateSearchParams: typeof engine.generateSearchParams === 'function',
          hasMethodParseRecommendations: typeof engine.parseRecommendations === 'function',
        },
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.addResult({
        name: '1️⃣ LLM 服务获取',
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * 验证 2: 地图服务
   */
  private async verifyMapService(): Promise<void> {
    const startTime = Date.now();
    try {
      const mapService = getLocationService();
      
      if (!mapService) {
        this.addResult({
          name: '2️⃣ 地图服务获取',
          status: 'fail',
          message: '地图服务为 null',
          duration: Date.now() - startTime,
        });
        return;
      }

      const isConnected = await mapService.verifyConnection();

      this.addResult({
        name: '2️⃣ 地图服务获取',
        status: isConnected ? 'pass' : 'warning',
        message: isConnected ? '地图服务连接成功' : '地图服务连接失败或不可用',
        details: {
          service: mapService.constructor.name,
          hasMethodSearchRecommendedLocations: typeof mapService.searchRecommendedLocations === 'function',
          connectionStatus: isConnected,
        },
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.addResult({
        name: '2️⃣ 地图服务获取',
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * 验证 3: DialogueManager 初始化
   */
  private async verifyManagerInitialization(): Promise<void> {
    const startTime = Date.now();
    try {
      this.manager = new DialogueManager();
      
      if (!this.manager) {
        this.addResult({
          name: '3️⃣ DialogueManager 初始化',
          status: 'fail',
          message: 'DialogueManager 创建失败',
          duration: Date.now() - startTime,
        });
        return;
      }

      await this.manager.initialize();

      this.addResult({
        name: '3️⃣ DialogueManager 初始化',
        status: 'pass',
        message: 'DialogueManager 成功初始化',
        details: {
          hasMethodGetRecommendations: typeof this.manager.getRecommendations === 'function',
          initialPhase: DialoguePhase.GREETING,
        },
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.addResult({
        name: '3️⃣ DialogueManager 初始化',
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * 验证 4: 用户输入处理
   */
  private async verifyUserInputHandling(): Promise<void> {
    const startTime = Date.now();
    try {
      if (!this.manager) {
        this.addResult({
          name: '4️⃣ 用户输入处理',
          status: 'fail',
          message: 'Manager 未初始化',
          duration: Date.now() - startTime,
        });
        return;
      }

      // 模拟用户输入
      await this.manager.addUserInput('南山区');
      await this.manager.addUserInput('p');      // 公园
      await this.manager.addUserInput('2');      // 5km

      this.addResult({
        name: '4️⃣ 用户输入处理',
        status: 'pass',
        message: '用户偏好收集成功',
        details: {
          userPreference: this.manager.getState?.().userPreference || {},
          currentPhase: this.manager.getState?.().phase || 'unknown',
        },
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.addResult({
        name: '4️⃣ 用户输入处理',
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * 验证 5: LLM 信息检查
   */
  private async verifyLLMInfoCheck(): Promise<void> {
    const startTime = Date.now();
    try {
      const llmService = getLLMService();
      const engine = llmService.getEngine();

      const testPreference = {
        location: '南山区',
        parkType: 'park',
        maxDistance: 5,
      };

      const result = await engine.shouldRecommend(testPreference);

      this.addResult({
        name: '5️⃣ LLM 信息检查',
        status: result.shouldRecommend ? 'pass' : 'warning',
        message: result.shouldRecommend 
          ? 'LLM 信息检查通过'
          : `LLM 信息检查失败: ${result.missingInfo?.join(', ') || '未知原因'}`,
        details: result,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.addResult({
        name: '5️⃣ LLM 信息检查',
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * 验证 6: LLM 参数优化
   */
  private async verifyLLMParamOptimization(): Promise<void> {
    const startTime = Date.now();
    try {
      const llmService = getLLMService();
      const engine = llmService.getEngine();

      const testPreference = {
        location: '南山区',
        parkType: 'park',
        maxDistance: 5,
      };

      const result = await engine.generateSearchParams(testPreference);

      this.addResult({
        name: '6️⃣ LLM 参数优化',
        status: result.searchParams ? 'pass' : 'fail',
        message: result.searchParams ? 'LLM 参数优化成功' : 'LLM 参数优化失败',
        details: {
          hasSearchParams: !!result.searchParams,
          confidence: result.confidence,
          reasoning: result.reasoning?.substring(0, 100) + '...',
        },
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.addResult({
        name: '6️⃣ LLM 参数优化',
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * 验证 7: 地图查询
   */
  private async verifyMapQuery(): Promise<void> {
    const startTime = Date.now();
    try {
      const mapService = getLocationService();

      const testPreference = {
        location: '南山区',
        parkType: 'park',
        maxDistance: 5,
      };

      const locations = await mapService.searchRecommendedLocations(testPreference);

      this.addResult({
        name: '7️⃣ 地图查询',
        status: locations && locations.length > 0 ? 'pass' : 'warning',
        message: locations && locations.length > 0 
          ? `地图查询成功，找到 ${locations.length} 个地点`
          : '地图查询无结果',
        details: {
          count: locations?.length || 0,
          sampleLocations: locations?.slice(0, 2).map(loc => ({
            name: loc.name,
            distance: loc.distance,
            rating: loc.rating,
          })) || [],
        },
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.addResult({
        name: '7️⃣ 地图查询',
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * 验证 8: LLM 结果排序
   */
  private async verifyLLMParsing(): Promise<void> {
    const startTime = Date.now();
    try {
      const llmService = getLLMService();
      const engine = llmService.getEngine();

      // 创建模拟的地点 JSON
      const mockLocations = [
        {
          name: '莲花山公园',
          distance: 2.5,
          address: '南山区',
          tags: ['爬山', '公园', '健身'],
        },
        {
          name: '南头古城',
          distance: 3.1,
          address: '南山区',
          tags: ['历史', '景点', '文化'],
        },
      ];

      const locationsJson = JSON.stringify(mockLocations, null, 2);
      const result = await engine.parseRecommendations(locationsJson);

      this.addResult({
        name: '8️⃣ LLM 结果排序',
        status: result && result.locations && result.locations.length > 0 ? 'pass' : 'fail',
        message: result && result.locations && result.locations.length > 0 
          ? 'LLM 结果排序成功'
          : 'LLM 结果排序失败',
        details: {
          parsedCount: result?.locations?.length || 0,
          explanation: result?.explanation?.substring(0, 100) + '...',
          sampleParsed: result?.locations?.slice(0, 1).map(loc => ({
            name: loc.name,
            reason: loc.reason?.substring(0, 50) + '...',
          })) || [],
        },
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.addResult({
        name: '8️⃣ LLM 结果排序',
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * 验证 9: 完整端到端流程
   */
  private async verifyE2EFlow(): Promise<void> {
    const startTime = Date.now();
    try {
      if (!this.manager) {
        this.addResult({
          name: '9️⃣ 端到端流程',
          status: 'fail',
          message: 'Manager 未初始化',
          duration: Date.now() - startTime,
        });
        return;
      }

      const result = await this.manager.getRecommendations();

      this.addResult({
        name: '9️⃣ 端到端流程',
        status: result.success ? 'pass' : 'warning',
        message: result.success 
          ? `完整流程成功，获得 ${result.recommendations?.length || 0} 条推荐`
          : `完整流程失败: ${result.error}`,
        details: {
          success: result.success,
          recommendationCount: result.recommendations?.length || 0,
          performanceMetrics: result.performanceMetrics,
          sampleRecommendations: result.recommendations?.slice(0, 2).map(rec => ({
            name: rec.name,
            reason: rec.reason?.substring(0, 50) + '...',
            distance: rec.distance,
          })) || [],
        },
        duration: Date.now() - startTime,
      });
    } catch (error) {
      this.addResult({
        name: '9️⃣ 端到端流程',
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * 验证 10: 错误处理和降级
   */
  private async verifyErrorHandling(): Promise<void> {
    const startTime = Date.now();
    try {
      // 创建新的管理器进行错误场景测试
      const testManager = new DialogueManager();
      await testManager.initialize();

      // 不提供完整信息，直接尝试获取推荐
      const result = await testManager.getRecommendations();

      this.addResult({
        name: '🔟 错误处理和降级',
        status: !result.success && result.error ? 'pass' : 'warning',
        message: !result.success && result.error 
          ? '错误处理正确：信息不足时拒绝推荐'
          : '错误处理可能有问题',
        details: {
          errorMessage: result.error,
          handledGracefully: !result.success,
        },
        duration: Date.now() - startTime,
      });

      await testManager.close();
    } catch (error) {
      this.addResult({
        name: '🔟 错误处理和降级',
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * 添加验证结果
   */
  private addResult(result: VerificationResult): void {
    this.results.push(result);
  }

  /**
   * 生成验证报告
   */
  private generateReport(): void {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 验证结果\n');

    const statusEmojis = {
      pass: '✅',
      fail: '❌',
      warning: '⚠️',
    };

    const statusColors = {
      pass: '\x1b[32m',     // 绿色
      fail: '\x1b[31m',     // 红色
      warning: '\x1b[33m',  // 黄色
    };

    const resetColor = '\x1b[0m';

    let passCount = 0;
    let failCount = 0;
    let warningCount = 0;

    for (const result of this.results) {
      const emoji = statusEmojis[result.status];
      const color = statusColors[result.status];

      console.log(`${emoji} ${color}${result.name}${resetColor}`);
      console.log(`   ${result.message}`);
      
      if (result.duration) {
        console.log(`   ⏱️  ${result.duration}ms`);
      }

      if (result.details) {
        console.log(`   📊 详情:`, JSON.stringify(result.details, null, 6).split('\n').join('\n   '));
      }

      console.log();

      if (result.status === 'pass') passCount++;
      else if (result.status === 'fail') failCount++;
      else if (result.status === 'warning') warningCount++;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 统计\n');
    console.log(`   ✅ 通过: ${passCount}`);
    console.log(`   ⚠️  警告: ${warningCount}`);
    console.log(`   ❌ 失败: ${failCount}`);
    console.log(`   📈 总计: ${this.results.length}\n`);

    const totalDuration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0);
    console.log(`   ⏱️  总耗时: ${totalDuration}ms\n`);

    const passPercentage = ((passCount / this.results.length) * 100).toFixed(1);
    console.log(`   📌 通过率: ${passPercentage}%\n`);

    // 最终评判
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (failCount === 0 && passCount > warningCount * 2) {
      console.log('🎉 结论: LLM + 地图 API 集成通畅!\n');
      console.log('✨ 系统已准备就绪用于生产\n');
    } else if (failCount === 0) {
      console.log('⚠️  结论: 集成基本通畅，但存在一些警告\n');
      console.log('💡 建议检查警告项以获得最佳性能\n');
    } else {
      console.log('❌ 结论: 集成存在问题\n');
      console.log('🔧 需要修复以下失败项:\n');
      
      for (const result of this.results) {
        if (result.status === 'fail') {
          console.log(`   • ${result.name}: ${result.message}`);
        }
      }
      console.log();
    }

    console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

    // 清理
    this.cleanup();
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    if (this.manager) {
      await this.manager.close();
    }
  }
}

// 执行验证
async function main(): Promise<void> {
  try {
    const verifier = new IntegrationVerifier();
    await verifier.runAllVerifications();
  } catch (error) {
    console.error('验证执行失败:', error);
    process.exit(1);
  }
}

main();
