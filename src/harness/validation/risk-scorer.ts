/**
 * 风险评分器
 * 评估执行的风险等级
 */

import { createLogger } from '@/utils/logger';
import { ExecutionContext, RiskScore } from '@/types/harness';

const logger = createLogger('harness:risk-scorer');

/**
 * 风险评分器
 */
export class RiskScorer {
  /**
   * 评估执行风险
   */
  assessRisk(context: ExecutionContext, toolName: string): RiskScore {
    const factors: RiskScore['factors'] = [];
    let totalScore = 0;

    // 1. 工具类型风险
    const toolRisk = this.assessToolRisk(toolName);
    factors.push(...toolRisk.factors);
    totalScore += toolRisk.score;

    // 2. 参数风险
    const paramRisk = this.assessParameterRisk(context.toolArgs);
    factors.push(...paramRisk.factors);
    totalScore += paramRisk.score;

    // 3. 调用深度风险
    const depthRisk = this.assessCallDepthRisk(context.callDepth);
    factors.push(...depthRisk.factors);
    totalScore += depthRisk.score;

    // 4. 历史行为风险（可选）
    const historyRisk = this.assessHistoryRisk(context.sessionId);
    factors.push(...historyRisk.factors);
    totalScore += historyRisk.score;

    // 标准化总分到 0-100
    const normalizedScore = Math.min(100, Math.max(0, totalScore));

    // 确定风险等级
    let level: RiskScore['level'];
    if (normalizedScore < 25) {
      level = 'low';
    } else if (normalizedScore < 50) {
      level = 'medium';
    } else if (normalizedScore < 75) {
      level = 'high';
    } else {
      level = 'critical';
    }

    const requiresApproval = normalizedScore >= 60; // >= 60 分需要审批

    const description = this.generateDescription(factors, level);

    logger.debug('风险评分完成', {
      executionId: context.executionId,
      toolName,
      score: normalizedScore,
      level,
      requiresApproval,
    });

    return {
      score: normalizedScore,
      level,
      factors,
      requiresApproval,
      description,
    };
  }

  /**
   * 评估工具类型风险
   */
  private assessToolRisk(toolName: string): {
    score: number;
    factors: RiskScore['factors'];
  } {
    const factors: RiskScore['factors'] = [];
    let score = 0;

    // 根据工具分类风险
    switch (true) {
      case toolName.includes('cache'):
        score = 5;
        factors.push({
          name: 'tool_type',
          score: 5,
          reason: '缓存操作风险低',
        });
        break;

      case toolName.includes('amap'):
        score = 10;
        factors.push({
          name: 'tool_type',
          score: 10,
          reason: '地图查询涉及外部 API 调用',
        });
        break;

      case toolName.includes('llm'):
        score = 15;
        factors.push({
          name: 'tool_type',
          score: 15,
          reason: 'LLM 调用成本较高，需谨慎',
        });
        break;

      case toolName.includes('queue'):
        score = 8;
        factors.push({
          name: 'tool_type',
          score: 8,
          reason: '队列操作风险较低',
        });
        break;

      default:
        score = 10;
        factors.push({
          name: 'tool_type',
          score: 10,
          reason: '未知工具，默认中等风险',
        });
    }

    return { score, factors };
  }

  /**
   * 评估参数风险
   */
  private assessParameterRisk(params: Record<string, any>): {
    score: number;
    factors: RiskScore['factors'];
  } {
    const factors: RiskScore['factors'] = [];
    let score = 0;

    // 检查参数大小
    const paramSize = JSON.stringify(params).length;
    if (paramSize > 100 * 1024) {
      score += 10;
      factors.push({
        name: 'parameter_size',
        score: 10,
        reason: `参数过大 (${(paramSize / 1024).toFixed(2)}KB)`,
      });
    } else if (paramSize > 10 * 1024) {
      score += 5;
      factors.push({
        name: 'parameter_size',
        score: 5,
        reason: `参数较大 (${(paramSize / 1024).toFixed(2)}KB)`,
      });
    }

    // 检查是否包含特殊字符或可能危险的参数
    const paramStr = JSON.stringify(params).toLowerCase();
    if (paramStr.includes('delete') || paramStr.includes('drop')) {
      score += 30;
      factors.push({
        name: 'dangerous_operation',
        score: 30,
        reason: '检测到删除操作相关参数',
      });
    }

    if (paramStr.includes('update') || paramStr.includes('modify')) {
      score += 20;
      factors.push({
        name: 'modification_operation',
        score: 20,
        reason: '检测到修改操作相关参数',
      });
    }

    // 检查参数数量
    const paramCount = Object.keys(params).length;
    if (paramCount > 20) {
      score += 5;
      factors.push({
        name: 'parameter_count',
        score: 5,
        reason: `参数过多 (${paramCount} 个)`,
      });
    }

    return { score, factors };
  }

  /**
   * 评估调用深度风险
   */
  private assessCallDepthRisk(callDepth: number): {
    score: number;
    factors: RiskScore['factors'];
  } {
    const factors: RiskScore['factors'] = [];
    let score = 0;

    if (callDepth > 3) {
      score = 15;
      factors.push({
        name: 'call_depth',
        score: 15,
        reason: `调用深度过深 (${callDepth} 层)`,
      });
    } else if (callDepth > 2) {
      score = 10;
      factors.push({
        name: 'call_depth',
        score: 10,
        reason: `调用深度较深 (${callDepth} 层)`,
      });
    } else {
      factors.push({
        name: 'call_depth',
        score: 0,
        reason: `调用深度正常 (${callDepth} 层)`,
      });
    }

    return { score, factors };
  }

  /**
   * 评估历史行为风险（可选实现）
   */
  private assessHistoryRisk(sessionId: string): {
    score: number;
    factors: RiskScore['factors'];
  } {
    const factors: RiskScore['factors'] = [];
    let score = 0;

    // 这里可以加入基于会话历史的风险评分逻辑
    // 例如：频繁的失败、超时等

    factors.push({
      name: 'history',
      score: 0,
      reason: '历史行为评分暂未实现',
    });

    return { score, factors };
  }

  /**
   * 生成风险描述
   */
  private generateDescription(factors: RiskScore['factors'], level: string): string {
    const topFactors = factors
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const descriptions = topFactors.map((f) => `${f.name}(+${f.score}分): ${f.reason}`);

    return `风险等级: ${level}。主要风险因素: ${descriptions.join('; ')}`;
  }

  /**
   * 获取风险建议
   */
  getRiskRecommendation(riskScore: RiskScore): string {
    switch (riskScore.level) {
      case 'low':
        return '风险较低，可直接执行';

      case 'medium':
        return '风险中等，建议谨慎执行，监控执行过程';

      case 'high':
        return '风险较高，需要额外验证和审批';

      case 'critical':
        return '风险极高，建议取消执行或采用降级策略';

      default:
        return '未知风险等级';
    }
  }
}
