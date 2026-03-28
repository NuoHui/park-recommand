"use strict";
/**
 * 风险评分器
 * 评估执行的风险等级
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskScorer = void 0;
var logger_1 = require("@/utils/logger");
var logger = (0, logger_1.createLogger)('harness:risk-scorer');
/**
 * 风险评分器
 */
var RiskScorer = /** @class */ (function () {
    function RiskScorer() {
    }
    /**
     * 评估执行风险
     */
    RiskScorer.prototype.assessRisk = function (context, toolName) {
        var factors = [];
        var totalScore = 0;
        // 1. 工具类型风险
        var toolRisk = this.assessToolRisk(toolName);
        factors.push.apply(factors, toolRisk.factors);
        totalScore += toolRisk.score;
        // 2. 参数风险
        var paramRisk = this.assessParameterRisk(context.toolArgs);
        factors.push.apply(factors, paramRisk.factors);
        totalScore += paramRisk.score;
        // 3. 调用深度风险
        var depthRisk = this.assessCallDepthRisk(context.callDepth);
        factors.push.apply(factors, depthRisk.factors);
        totalScore += depthRisk.score;
        // 4. 历史行为风险（可选）
        var historyRisk = this.assessHistoryRisk(context.sessionId);
        factors.push.apply(factors, historyRisk.factors);
        totalScore += historyRisk.score;
        // 标准化总分到 0-100
        var normalizedScore = Math.min(100, Math.max(0, totalScore));
        // 确定风险等级
        var level;
        if (normalizedScore < 25) {
            level = 'low';
        }
        else if (normalizedScore < 50) {
            level = 'medium';
        }
        else if (normalizedScore < 75) {
            level = 'high';
        }
        else {
            level = 'critical';
        }
        var requiresApproval = normalizedScore >= 60; // >= 60 分需要审批
        var description = this.generateDescription(factors, level);
        logger.debug('风险评分完成', {
            executionId: context.executionId,
            toolName: toolName,
            score: normalizedScore,
            level: level,
            requiresApproval: requiresApproval,
        });
        return {
            score: normalizedScore,
            level: level,
            factors: factors,
            requiresApproval: requiresApproval,
            description: description,
        };
    };
    /**
     * 评估工具类型风险
     */
    RiskScorer.prototype.assessToolRisk = function (toolName) {
        var factors = [];
        var score = 0;
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
        return { score: score, factors: factors };
    };
    /**
     * 评估参数风险
     */
    RiskScorer.prototype.assessParameterRisk = function (params) {
        var factors = [];
        var score = 0;
        // 检查参数大小
        var paramSize = JSON.stringify(params).length;
        if (paramSize > 100 * 1024) {
            score += 10;
            factors.push({
                name: 'parameter_size',
                score: 10,
                reason: "\u53C2\u6570\u8FC7\u5927 (".concat((paramSize / 1024).toFixed(2), "KB)"),
            });
        }
        else if (paramSize > 10 * 1024) {
            score += 5;
            factors.push({
                name: 'parameter_size',
                score: 5,
                reason: "\u53C2\u6570\u8F83\u5927 (".concat((paramSize / 1024).toFixed(2), "KB)"),
            });
        }
        // 检查是否包含特殊字符或可能危险的参数
        var paramStr = JSON.stringify(params).toLowerCase();
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
        var paramCount = Object.keys(params).length;
        if (paramCount > 20) {
            score += 5;
            factors.push({
                name: 'parameter_count',
                score: 5,
                reason: "\u53C2\u6570\u8FC7\u591A (".concat(paramCount, " \u4E2A)"),
            });
        }
        return { score: score, factors: factors };
    };
    /**
     * 评估调用深度风险
     */
    RiskScorer.prototype.assessCallDepthRisk = function (callDepth) {
        var factors = [];
        var score = 0;
        if (callDepth > 3) {
            score = 15;
            factors.push({
                name: 'call_depth',
                score: 15,
                reason: "\u8C03\u7528\u6DF1\u5EA6\u8FC7\u6DF1 (".concat(callDepth, " \u5C42)"),
            });
        }
        else if (callDepth > 2) {
            score = 10;
            factors.push({
                name: 'call_depth',
                score: 10,
                reason: "\u8C03\u7528\u6DF1\u5EA6\u8F83\u6DF1 (".concat(callDepth, " \u5C42)"),
            });
        }
        else {
            factors.push({
                name: 'call_depth',
                score: 0,
                reason: "\u8C03\u7528\u6DF1\u5EA6\u6B63\u5E38 (".concat(callDepth, " \u5C42)"),
            });
        }
        return { score: score, factors: factors };
    };
    /**
     * 评估历史行为风险（可选实现）
     */
    RiskScorer.prototype.assessHistoryRisk = function (sessionId) {
        var factors = [];
        var score = 0;
        // 这里可以加入基于会话历史的风险评分逻辑
        // 例如：频繁的失败、超时等
        factors.push({
            name: 'history',
            score: 0,
            reason: '历史行为评分暂未实现',
        });
        return { score: score, factors: factors };
    };
    /**
     * 生成风险描述
     */
    RiskScorer.prototype.generateDescription = function (factors, level) {
        var topFactors = factors
            .sort(function (a, b) { return b.score - a.score; })
            .slice(0, 3);
        var descriptions = topFactors.map(function (f) { return "".concat(f.name, "(+").concat(f.score, "\u5206): ").concat(f.reason); });
        return "\u98CE\u9669\u7B49\u7EA7: ".concat(level, "\u3002\u4E3B\u8981\u98CE\u9669\u56E0\u7D20: ").concat(descriptions.join('; '));
    };
    /**
     * 获取风险建议
     */
    RiskScorer.prototype.getRiskRecommendation = function (riskScore) {
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
    };
    return RiskScorer;
}());
exports.RiskScorer = RiskScorer;
