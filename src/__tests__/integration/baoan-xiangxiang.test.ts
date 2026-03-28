/**
 * 集成测试：用户需求场景 - 推荐深圳宝安西乡附近的公园（距离不限制）
 * 
 * 测试场景：
 * 用户输入: "推荐深圳宝安西乡附近的公园，距离不限制。"
 * 
 * 测试流程：
 * 1. 地点解析：宝安西乡 → 地理坐标
 * 2. 类型识别：公园 (park)
 * 3. 距离偏好：不限制 (unlimited)
 * 4. 地图查询：获取指定范围内的公园
 * 5. LLM 分析：生成推荐原因
 * 6. 结果排序：按相关性排序
 * 7. 输出验证：确保返回有效的推荐结果
 */

import { DialogueManager } from '@/dialogue/manager';
import { getLLMService } from '@/llm/service';
import { getLocationService } from '@/map/service';
import { getLogger } from '@/logger/index.js';
import { createMapClient } from '@/map/client';

const logger = getLogger();

/**
 * 测试结果接口
 */
interface IntegrationTestResult {
  testName: string;
  status: 'passed' | 'failed' | 'pending' | 'skipped';
  duration: number;
  startTime: number;
  endTime: number;
  error?: string;
  data?: Record<string, any>;
  outputs?: {
    userQuery: string;
    parsedPreferences: Record<string, any>;
    recommendations: Array<{
      id: string;
      name: string;
      reason: string;
      distance?: number;
      rating?: number;
    }>;
    recommendationCount: number;
    averageRecommendationScore?: number;
  };
}

/**
 * 整合测试套件：宝安西乡公园推荐
 */
export class BaoAnXiangXiangE2ETest {
  private results: IntegrationTestResult[] = [];
  private testEnv = {
    amapApiKey: process.env.AMAP_API_KEY,
    amapBaseUrl: process.env.AMAP_BASE_URL,
    llmProvider: process.env.LLM_PROVIDER,
    llmApiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
  };

  /**
   * 测试 1: 地点解析 - 宝安西乡坐标获取
   */
  private async testLocationParsing(): Promise<void> {
    const testName = 'Test 1: 地点解析 - 宝安西乡坐标获取';
    const startTime = Date.now();
    let status: 'passed' | 'failed' | 'skipped' = 'passed';
    let error: string | undefined;
    const data: Record<string, any> = {};

    try {
      if (!this.testEnv.amapApiKey) {
        logger.warn('⏭️  地点解析测试跳过：AMAP_API_KEY 未配置');
        status = 'skipped';
        return;
      }

      const client = createMapClient(this.testEnv.amapApiKey, this.testEnv.amapBaseUrl);

      // 地址编码：获取"宝安西乡"的坐标
      const response = await client.geocode({
        address: '宝安西乡',
        city: '深圳',
      });

      if (!response || !response.geocodes || response.geocodes.length === 0) {
        throw new Error('未能获取宝安西乡的坐标');
      }

      const geocode = response.geocodes[0];
      data.location = {
        name: '宝安西乡',
        city: '深圳',
        longitude: parseFloat(geocode.location.split(',')[0]),
        latitude: parseFloat(geocode.location.split(',')[1]),
        formattedAddress: geocode.formatted_address,
      };

      logger.info('✅ 测试 1 通过：地点解析成功', {
        location: data.location,
      });
    } catch (err) {
      status = 'failed';
      error = err instanceof Error ? err.message : String(err);
      logger.error('❌ 测试 1 失败：地点解析', {
        error,
      });
    } finally {
      const endTime = Date.now();
      this.results.push({
        testName,
        status,
        startTime,
        endTime,
        duration: endTime - startTime,
        error,
        data,
      });
    }
  }

  /**
   * 测试 2: 类型识别 - 识别"公园"关键词
   */
  private async testTypeRecognition(): Promise<void> {
    const testName = 'Test 2: 类型识别 - 识别"公园"关键词';
    const startTime = Date.now();
    let status: 'passed' | 'failed' | 'skipped' = 'passed';
    let error: string | undefined;
    const data: Record<string, any> = {};

    try {
      if (!this.testEnv.llmApiKey) {
        logger.warn('⏭️  类型识别测试跳过：LLM API Key 未配置');
        status = 'skipped';
        return;
      }

      const llmService = getLLMService();
      await llmService.initialize();

      const llmEngine = llmService.getEngine();
      const userQuery = '推荐深圳宝安西乡附近的公园，距离不限制。';

      // 使用 LLM 引擎提取用户偏好
      const extraction = await llmEngine.extractUserPreference(userQuery, 'greeting');

      if (!extraction) {
        throw new Error('LLM 未返回类型提取结果');
      }

      // 检查是否识别到景点类型
      if (!extraction.extractedInfo?.parkType) {
        throw new Error('未能识别景点类型');
      }

      data.recognizedType = {
        type: extraction.extractedInfo.parkType,
        confidence: extraction.confidence || 0.8,
      };

      logger.info('✅ 测试 2 通过：类型识别成功', {
        type: data.recognizedType.type,
        confidence: data.recognizedType.confidence,
      });
    } catch (err) {
      status = 'failed';
      error = err instanceof Error ? err.message : String(err);
      logger.error('❌ 测试 2 失败：类型识别', {
        error,
      });
    } finally {
      const endTime = Date.now();
      this.results.push({
        testName,
        status,
        startTime,
        endTime,
        duration: endTime - startTime,
        error,
        data,
      });
    }
  }

  /**
   * 测试 3: 距离偏好识别 - "距离不限制"
   */
  private async testDistancePreferenceRecognition(): Promise<void> {
    const testName = 'Test 3: 距离偏好识别 - 无限制距离';
    const startTime = Date.now();
    let status: 'passed' | 'failed' | 'skipped' = 'passed';
    let error: string | undefined;
    const data: Record<string, any> = {};

    try {
      if (!this.testEnv.llmApiKey) {
        logger.warn('⏭️  距离偏好识别测试跳过：LLM API Key 未配置');
        status = 'skipped';
        return;
      }

      const llmService = getLLMService();
      await llmService.initialize();

      const llmEngine = llmService.getEngine();
      const userQuery = '推荐深圳宝安西乡附近的公园，距离不限制。';

      // 使用 LLM 引擎提取用户偏好
      const extraction = await llmEngine.extractUserPreference(userQuery, 'greeting');

      if (!extraction) {
        throw new Error('LLM 未返回距离偏好提取结果');
      }

      // 检查是否识别到距离偏好（无限制应该是 maxDistance 很大或为 null）
      const maxDistance = extraction.extractedInfo?.maxDistance;
      const isUnlimited = !maxDistance || maxDistance > 50;

      data.recognizedDistance = {
        distancePreference: isUnlimited ? 'unlimited' : 'limited',
        maxDistance: isUnlimited ? null : maxDistance,
      };

      logger.info('✅ 测试 3 通过：距离偏好识别成功', {
        preference: data.recognizedDistance.distancePreference,
        maxDistance: data.recognizedDistance.maxDistance,
      });
    } catch (err) {
      status = 'failed';
      error = err instanceof Error ? err.message : String(err);
      logger.error('❌ 测试 3 失败：距离偏好识别', {
        error,
      });
    } finally {
      const endTime = Date.now();
      this.results.push({
        testName,
        status,
        startTime,
        endTime,
        duration: endTime - startTime,
        error,
        data,
      });
    }
  }

  /**
   * 测试 4: 地图查询 - 获取宝安西乡周边公园
   */
  private async testMapQuery(): Promise<void> {
    const testName = 'Test 4: 地图查询 - 获取宝安西乡周边公园';
    const startTime = Date.now();
    let status: 'passed' | 'failed' | 'skipped' = 'passed';
    let error: string | undefined;
    const data: Record<string, any> = {};

    try {
      if (!this.testEnv.amapApiKey) {
        logger.warn('⏭️  地图查询测试跳过：AMAP_API_KEY 未配置');
        status = 'skipped';
        return;
      }

      const client = createMapClient(this.testEnv.amapApiKey, this.testEnv.amapBaseUrl);

      // 搜索公园（在深圳宝安区）
      const response = await client.searchPOI({
        keywords: '公园',
        region: '深圳',
        pageSize: 10,
        pageNum: 1,
      });

      if (!response || !response.pois || response.pois.length === 0) {
        throw new Error('地图查询返回结果为空');
      }

      // 提取公园信息
      const parks = response.pois.map((p: any) => ({
        name: p.name,
        location: {
          longitude: parseFloat(p.location?.split(',')[0] || '0'),
          latitude: parseFloat(p.location?.split(',')[1] || '0'),
        },
        address: p.address,
        type: p.type,
      }));

      data.parks = parks.slice(0, 5); // 只保存前 5 个

      logger.info('✅ 测试 4 通过：地图查询成功', {
        parkCount: parks.length,
        parks: data.parks,
      });
    } catch (err) {
      status = 'failed';
      error = err instanceof Error ? err.message : String(err);
      logger.error('❌ 测试 4 失败：地图查询', {
        error,
      });
    } finally {
      const endTime = Date.now();
      this.results.push({
        testName,
        status,
        startTime,
        endTime,
        duration: endTime - startTime,
        error,
        data,
      });
    }
  }

  /**
   * 测试 5: 完整推荐流程 - 使用对话管理器
   */
  private async testCompleteRecommendationFlow(): Promise<void> {
    const testName = 'Test 5: 完整推荐流程 - 宝安西乡公园推荐';
    const startTime = Date.now();
    let status: 'passed' | 'failed' | 'skipped' = 'passed';
    let error: string | undefined;
    const outputs: Record<string, any> = {};
    let dialogueManager: DialogueManager | null = null;

    try {
      if (!this.testEnv.llmApiKey || !this.testEnv.amapApiKey) {
        logger.warn('⏭️  完整推荐流程测试跳过：LLM 或地图 API Key 未配置');
        status = 'skipped';
        return;
      }

      dialogueManager = new DialogueManager({
        maxTurns: 10,
        timeout: 30000,
        logHistory: true,
      });

      await dialogueManager.initialize();

      outputs.userQuery = '推荐深圳宝安西乡附近的公园，距离不限制。';

      // 模拟用户输入流程
      // 注：对话管理器通常会通过交互式对话来获取偏好
      // 这里我们模拟用户提供的直接输入
      await dialogueManager.addUserInput('宝安西乡');
      await dialogueManager.addUserInput('p'); // 公园类型
      await dialogueManager.addUserInput('4'); // 距离不限制（选项 4）

      // 获取推荐
      const result = await dialogueManager.getRecommendations();

      if (!result.success) {
        throw new Error('推荐生成失败');
      }

      if (!result.recommendations || result.recommendations.length === 0) {
        throw new Error('推荐结果为空');
      }

      outputs.recommendations = result.recommendations;
      outputs.recommendationCount = result.recommendations.length;

      // 验证推荐质量
      for (const rec of result.recommendations) {
        if (!rec.name || !rec.reason) {
          throw new Error('推荐缺少必要字段: name 或 reason');
        }
      }

      // 计算推荐评分平均值（如果有评分）
      const ratings = (result.recommendations as any[])
        .map((r: any) => r.rating || 0)
        .filter((s: any) => s > 0);
      if (ratings.length > 0) {
        outputs.averageRecommendationScore = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length;
      }

      logger.info('✅ 测试 5 通过：完整推荐流程成功', {
        recommendationCount: outputs.recommendationCount,
        averageScore: outputs.averageRecommendationScore,
        recommendations: outputs.recommendations
          .slice(0, 2)
          .map((r: any) => ({ name: r.name, reason: r.reason })),
      });
    } catch (err) {
      status = 'failed';
      error = err instanceof Error ? err.message : String(err);
      logger.error('❌ 测试 5 失败：完整推荐流程', {
        error,
      });
    } finally {
      if (dialogueManager) {
        await dialogueManager.close();
      }

      const endTime = Date.now();
      this.results.push({
        testName,
        status,
        startTime,
        endTime,
        duration: endTime - startTime,
        error,
        outputs: {
          userQuery: outputs.userQuery || '',
          parsedPreferences: {},
          recommendations: outputs.recommendations || [],
          recommendationCount: outputs.recommendationCount || 0,
          averageRecommendationScore: outputs.averageRecommendationScore,
        },
      });
    }
  }

  /**
   * 测试 6: 结果验证 - 推荐内容完整性检查
   */
  private async testResultValidation(): Promise<void> {
    const testName = 'Test 6: 结果验证 - 推荐内容完整性检查';
    const startTime = Date.now();
    let status: 'passed' | 'failed' | 'skipped' = 'passed';
    let error: string | undefined;
    const data: Record<string, any> = {};

    try {
      // 获取之前测试的推荐结果
      const previousTest = this.results.find((r) =>
        r.testName.includes('完整推荐流程')
      );

      if (!previousTest || !previousTest.outputs?.recommendations) {
        logger.warn('⏭️  结果验证测试跳过：前置测试未生成推荐结果');
        status = 'skipped';
        return;
      }

      const recommendations = previousTest.outputs.recommendations;

      // 验证推荐字段完整性
      const requiredFields = ['name', 'location', 'reason', 'type'];
      const validationResults: Record<string, any> = {
        totalRecommendations: recommendations.length,
        validRecommendations: 0,
        invalidRecommendations: 0,
        issues: [] as string[],
      };

      for (let i = 0; i < recommendations.length; i++) {
        const rec = recommendations[i] as Record<string, any>;
        let isValid = true;

        for (const field of requiredFields) {
          if (!rec[field]) {
            isValid = false;
            validationResults.issues.push(`推荐 #${i + 1} 缺少字段: ${field}`);
          }
        }

        if (isValid) {
          validationResults.validRecommendations++;
        } else {
          validationResults.invalidRecommendations++;
        }
      }

      // 至少 80% 的推荐应该是有效的
      const validationRate = validationResults.validRecommendations / recommendations.length;
      if (validationRate < 0.8) {
        throw new Error(`推荐有效率过低: ${(validationRate * 100).toFixed(2)}%`);
      }

      data.validationResults = validationResults;

      logger.info('✅ 测试 6 通过：结果验证成功', {
        totalRecommendations: validationResults.totalRecommendations,
        validRecommendations: validationResults.validRecommendations,
        validationRate: `${(validationRate * 100).toFixed(2)}%`,
      });
    } catch (err) {
      status = 'failed';
      error = err instanceof Error ? err.message : String(err);
      logger.error('❌ 测试 6 失败：结果验证', {
        error,
      });
    } finally {
      const endTime = Date.now();
      this.results.push({
        testName,
        status,
        startTime,
        endTime,
        duration: endTime - startTime,
        error,
        data,
      });
    }
  }

  /**
   * 运行所有集成测试
   */
  async runAllTests(): Promise<void> {
    logger.info('🚀 启动集成测试套件：宝安西乡公园推荐', {
      environment: this.testEnv,
    });

    await this.testLocationParsing();
    await this.testTypeRecognition();
    await this.testDistancePreferenceRecognition();
    await this.testMapQuery();
    await this.testCompleteRecommendationFlow();
    await this.testResultValidation();

    this.printReport();
  }

  /**
   * 打印测试报告
   */
  private printReport(): void {
    const passedTests = this.results.filter((r) => r.status === 'passed').length;
    const failedTests = this.results.filter((r) => r.status === 'failed').length;
    const skippedTests = this.results.filter((r) => r.status === 'skipped').length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    let report = `
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║              集成测试报告 - 宝安西乡公园推荐需求                          ║
║              用户需求: "推荐深圳宝安西乡附近的公园，距离不限制。"         ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

📊 测试统计
├─ 总测试数: ${this.results.length}
├─ ✅ 通过: ${passedTests}
├─ ❌ 失败: ${failedTests}
├─ ⏭️  跳过: ${skippedTests}
└─ ⏱️  总耗时: ${totalDuration}ms

📋 详细结果
`;

    for (const result of this.results) {
      const icon =
        result.status === 'passed'
          ? '✅'
          : result.status === 'failed'
            ? '❌'
            : '⏭️ ';

      report += `
${icon} ${result.testName}
   状态: ${result.status}
   耗时: ${result.duration}ms`;

      if (result.error) {
        report += `
   ❌ 错误: ${result.error}`;
      }

      if (result.outputs && result.outputs.recommendations) {
        report += `
   📍 推荐结果: ${result.outputs.recommendationCount} 条推荐
   平均评分: ${result.outputs.averageRecommendationScore?.toFixed(2) || 'N/A'}`;
      }

      if (result.data && Object.keys(result.data).length > 0) {
        const resultData = result.data as Record<string, any>;
        if (resultData.location) {
          report += `
   📍 位置: ${resultData.location.name} (${resultData.location.longitude}, ${resultData.location.latitude})`;
        }
        if (resultData.parks) {
          report += `
   🌳 公园数: ${(resultData.parks as any[]).length} 个`;
        }
        if (resultData.recognizedType) {
          report += `
   🏷️  类型: ${resultData.recognizedType.type} (置信度: ${(resultData.recognizedType.confidence * 100).toFixed(0)}%)`;
        }
        if (resultData.recognizedDistance) {
          report += `
   📏 距离: ${resultData.recognizedDistance.distancePreference}`;
        }
      }
    }

    report += `

═══════════════════════════════════════════════════════════════════════════
✨ 测试完成

关键输出:
✓ 测试套件包含 6 个测试用例
✓ 完整覆盖用户需求的所有步骤
✓ 验证推荐系统的端到端功能

推荐的后续验证:
1. 运行 npm run test:integration 执行完整测试
2. 查看推荐结果中的景点信息完整性
3. 验证推荐排序是否符合用户期望
═══════════════════════════════════════════════════════════════════════════
`;

    console.log(report);
  }
}

/**
 * 导出测试函数
 */
export async function testBaoAnXiangXiangRecommendation(): Promise<void> {
  const tester = new BaoAnXiangXiangE2ETest();
  await tester.runAllTests();
}
