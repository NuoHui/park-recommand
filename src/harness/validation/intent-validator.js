"use strict";
/**
 * 意图验证器
 * 验证用户意图的安全性和合法性
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentValidator = void 0;
var logger_1 = require("@/utils/logger");
var risk_scorer_1 = require("./risk-scorer");
var logger = (0, logger_1.createLogger)('harness:intent-validator');
/**
 * 意图验证器
 */
var IntentValidator = /** @class */ (function () {
    function IntentValidator() {
        this.blacklistedKeywords = new Set([
            'drop',
            'truncate',
            'delete from',
            'rm -rf',
            'format',
            'wipe',
        ]);
        this.riskScorer = new risk_scorer_1.RiskScorer();
    }
    /**
     * 验证用户意图
     */
    IntentValidator.prototype.validate = function (context, toolName) {
        return __awaiter(this, void 0, void 0, function () {
            var validationErrors, validationWarnings, inputCheckResult, intentType, permissionGranted, riskScore, valid;
            return __generator(this, function (_a) {
                validationErrors = [];
                validationWarnings = [];
                inputCheckResult = this.checkInputSafety(context);
                if (!inputCheckResult.safe) {
                    validationErrors.push.apply(validationErrors, (inputCheckResult.errors || []));
                    validationWarnings.push.apply(validationWarnings, (inputCheckResult.warnings || []));
                }
                intentType = this.classifyIntent(context.toolArgs, toolName);
                permissionGranted = this.checkPermission(intentType, toolName);
                if (!permissionGranted) {
                    validationErrors.push("\u6743\u9650\u62D2\u7EDD: ".concat(intentType, " \u4E0D\u5141\u8BB8\u8C03\u7528 ").concat(toolName));
                }
                riskScore = this.riskScorer.assessRisk(context, toolName);
                valid = validationErrors.length === 0 &&
                    inputCheckResult.safe &&
                    permissionGranted;
                logger.debug('意图验证完成', {
                    executionId: context.executionId,
                    valid: valid,
                    intentType: intentType,
                    permissionGranted: permissionGranted,
                    riskLevel: riskScore.level,
                    errors: validationErrors,
                    warnings: validationWarnings,
                });
                return [2 /*return*/, {
                        valid: valid,
                        intentType: intentType,
                        permissionGranted: permissionGranted,
                        riskScore: riskScore,
                        errors: validationErrors.length > 0 ? validationErrors : undefined,
                        warnings: validationWarnings.length > 0 ? validationWarnings : undefined,
                    }];
            });
        });
    };
    /**
     * 检查输入安全性
     */
    IntentValidator.prototype.checkInputSafety = function (context) {
        var errors = [];
        var warnings = [];
        // 1. 检查参数是否为空
        if (!context.toolArgs || typeof context.toolArgs !== 'object') {
            errors.push('工具参数不能为空或非对象类型');
            return { safe: false, errors: errors };
        }
        // 2. 检查是否包含黑名单关键词
        var paramsStr = JSON.stringify(context.toolArgs).toLowerCase();
        for (var _i = 0, _a = this.blacklistedKeywords; _i < _a.length; _i++) {
            var keyword = _a[_i];
            if (paramsStr.includes(keyword)) {
                errors.push("\u68C0\u6D4B\u5230\u7981\u6B62\u64CD\u4F5C\u5173\u952E\u8BCD: ".concat(keyword));
            }
        }
        // 3. 检查是否包含注入攻击的迹象
        if (this.containsInjectionAttempt(paramsStr)) {
            warnings.push('检测到可能的注入攻击迹象，建议仔细审查');
        }
        // 4. 检查超大参数
        var paramSize = JSON.stringify(context.toolArgs).length;
        if (paramSize > 5 * 1024 * 1024) {
            errors.push("\u53C2\u6570\u8FC7\u5927 (".concat((paramSize / 1024 / 1024).toFixed(2), "MB)\uFF0C\u8D85\u8FC7\u9650\u5236"));
        }
        else if (paramSize > 1024 * 1024) {
            warnings.push("\u53C2\u6570\u8F83\u5927 (".concat((paramSize / 1024 / 1024).toFixed(2), "MB)\uFF0C\u53EF\u80FD\u5F71\u54CD\u6027\u80FD"));
        }
        return {
            safe: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
            warnings: warnings.length > 0 ? warnings : undefined,
        };
    };
    /**
     * 检查是否包含注入攻击的迹象
     */
    IntentValidator.prototype.containsInjectionAttempt = function (input) {
        var injectionPatterns = [
            /[\';\"]\s*or\s*[\';\"]/i, // SQL 注入迹象
            /\${.*}/i, // 模板注入迹象
            /\$\(.*\)/i, // 命令注入迹象
            /`.*`/i, // 反引号注入迹象
        ];
        for (var _i = 0, injectionPatterns_1 = injectionPatterns; _i < injectionPatterns_1.length; _i++) {
            var pattern = injectionPatterns_1[_i];
            if (pattern.test(input)) {
                return true;
            }
        }
        return false;
    };
    /**
     * 分类意图
     */
    IntentValidator.prototype.classifyIntent = function (toolArgs, toolName) {
        // 如果工具名称表明这是一个推荐或提取操作，优先使用工具名称来推断意图
        if (toolName) {
            if (/extract.*parameters|recommend|process.*recommend/.test(toolName)) {
                return 'recommendation';
            }
            if (/search|query|lookup/.test(toolName)) {
                return 'query';
            }
            if (/update|modify|patch/.test(toolName)) {
                return 'update';
            }
            if (/delete|remove|drop/.test(toolName)) {
                return 'delete';
            }
        }
        // 提取参数值中的文本（不仅是整个字符串）
        var paramValues = [];
        for (var _i = 0, _a = Object.values(toolArgs); _i < _a.length; _i++) {
            var value = _a[_i];
            if (typeof value === 'string') {
                paramValues.push(value.toLowerCase());
            }
        }
        var argsStr = paramValues.join(' ').toLowerCase();
        // 检查删除操作（优先级最高，因为风险最大）
        if (/\b(delete|remove|drop)\b/i.test(argsStr) ||
            /删除|移除|清空/.test(argsStr)) {
            return 'delete';
        }
        // 检查修改操作
        // 只在有明确的修改关键词时分类为 update（排除中文误匹配）
        if (/\b(modify|update|change|put|patch)\b/i.test(argsStr) &&
            !/extract|validate|query|search|recommend/.test(argsStr)) {
            return 'update';
        }
        // 检查推荐操作
        if (/\b(recommend|suggestion|suggest|recommend)\b/i.test(argsStr) ||
            /推荐|建议|登山|爬山|hiking|park|poi|景点/.test(argsStr)) {
            return 'recommendation';
        }
        // 检查查询操作
        if (/\b(query|search|get|find|extract|lookup)\b/i.test(argsStr) ||
            /查询|搜索|查找|获取/.test(argsStr)) {
            return 'query';
        }
        return 'unknown';
    };
    /**
     * 检查权限
     */
    IntentValidator.prototype.checkPermission = function (intentType, toolName) {
        // 定义每种意图允许的工具（支持精确名称和前缀匹配）
        var permissionMatrix = {
            recommendation: [
                'llm-client',
                'amap-client',
                'cache-manager',
                'request-queue',
                /^extract.*/, // 参数提取工具
                /^recommend.*/, // 推荐工具
            ],
            query: [
                'llm-client',
                'amap-client',
                'cache-manager',
                'request-queue',
                /^extract.*/, // 参数提取工具
                /^search.*/, // 搜索工具
            ],
            update: [
                'cache-manager',
                'request-queue',
                /^update.*/, // 更新工具
            ],
            delete: [], // 暂不允许删除操作
            unknown: [
                'cache-manager',
                'request-queue',
            ],
        };
        var allowedPatterns = permissionMatrix[intentType] || [];
        // 检查精确匹配和前缀匹配
        for (var _i = 0, allowedPatterns_1 = allowedPatterns; _i < allowedPatterns_1.length; _i++) {
            var pattern = allowedPatterns_1[_i];
            if (pattern instanceof RegExp) {
                if (pattern.test(toolName)) {
                    return true;
                }
            }
            else if (pattern === toolName) {
                return true;
            }
        }
        return false;
    };
    /**
     * 添加黑名单关键词
     */
    IntentValidator.prototype.addBlacklistedKeyword = function (keyword) {
        this.blacklistedKeywords.add(keyword.toLowerCase());
    };
    /**
     * 移除黑名单关键词
     */
    IntentValidator.prototype.removeBlacklistedKeyword = function (keyword) {
        this.blacklistedKeywords.delete(keyword.toLowerCase());
    };
    /**
     * 获取所有黑名单关键词
     */
    IntentValidator.prototype.getBlacklistedKeywords = function () {
        return Array.from(this.blacklistedKeywords);
    };
    /**
     * 获取风险建议
     */
    IntentValidator.prototype.getRiskRecommendation = function (riskScore) {
        return this.riskScorer.getRiskRecommendation(riskScore);
    };
    return IntentValidator;
}());
exports.IntentValidator = IntentValidator;
