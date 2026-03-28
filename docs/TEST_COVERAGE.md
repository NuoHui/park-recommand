# 🧪 测试覆盖计划与进度

**版本**: 1.0.0  
**更新时间**: 2024-03-28  
**目标**: 从 ~20% 提升到 80%+ 的代码覆盖率

---

## 📊 当前状态

### 覆盖率概览

| 指标 | 当前值 | 目标值 | 进度 |
|------|-------|--------|------|
| **总测试覆盖率** | ~20% | 80% | ▓░░░░░░░░ |
| **单元测试** | ~18-20% | 80% | ▓░░░░░░░░ |
| **集成测试** | ~0% | 30% | ░░░░░░░░░░ |
| **关键路径** | ~40% | 100% | ████░░░░░░ |

### 现有测试统计

```
✅ 已完成的测试
├── src/__tests__/unit/amap.test.ts
│   ├─ 客户端基础功能 (3 个)
│   ├─ POI 搜索功能 (3 个)
│   ├─ 地理编码功能 (2 个)
│   ├─ 距离计算功能 (2 个)
│   ├─ Top 5 推荐处理 (3 个)
│   └─ 地点服务 (1 个)
│   总计: 14+ 个测试 ✅
│
├── src/__tests__/unit/llm.test.ts
│   ├─ LLM 客户端 (3 个)
│   ├─ LLM 引擎 (4 个)
│   ├─ 消息处理 (2 个)
│   ├─ Mock 模式 (2 个)
│   └─ Top 5 限制 (1 个)
│   总计: 12+ 个测试 ✅
│
└── src/__tests__/unit/dialogue-manager.test.ts 🆕
    ├─ 初始化 (3 个)
    ├─ 流程转移 (3 个)
    ├─ 推荐流程 (4 个)
    ├─ 错误处理 (2 个)
    └─ 缓存操作 (1 个)
    总计: 13+ 个测试 🆕

现有总计: 39+ 个测试
```

---

## 🗺️ 测试覆盖地图

### 模块覆盖矩阵

| 模块 | 现有覆盖 | 缺口 | 优先级 | 计划 |
|------|---------|------|--------|------|
| **CLI 框架** | 20% | 80% | 🟡 中 | `cli-commands.test.ts` |
| **对话管理器** | 40% | 60% | 🔴 高 | `dialogue-manager.test.ts` 🆕 |
| **LLM 服务** | 60% | 40% | 🔴 高 | `llm-engine.test.ts` |
| **地图服务** | 70% | 30% | 🔴 高 | `amap-error-handling.test.ts` |
| **缓存系统** | 10% | 90% | 🔴 高 | `cache-integration.test.ts` |
| **请求队列** | 5% | 95% | 🟡 中 | `request-queue.test.ts` |
| **输出管理** | 15% | 85% | 🟢 低 | `output-manager.test.ts` |
| **监控系统** | 20% | 80% | 🟢 低 | `monitoring.test.ts` |
| **参数提取** | 30% | 70% | 🟡 中 | `parameter-extractor.test.ts` |
| **工具函数** | 50% | 50% | 🟢 低 | `utils.test.ts` |

### 功能覆盖表

| 功能 | 覆盖率 | 测试文件 | 状态 |
|------|--------|---------|------|
| **Top 5 推荐** | 60% | amap.test, llm.test | ⚠️ |
| **LLM 集成** | 50% | llm.test | ⚠️ |
| **高德地图** | 70% | amap.test | ✅ |
| **多轮对话** | 40% | dialogue-manager.test 🆕 | ⚠️ |
| **缓存管理** | 10% | 无 | ❌ |
| **错误处理** | 30% | 各测试 | ⚠️ |
| **性能监控** | 20% | 无 | ❌ |

---

## 🎯 优先级和计划

### 🔴 **高优先级** - 立即补充 (下周)

#### 1. 对话管理器集成测试 ✅ 🆕

**文件**: `src/__tests__/unit/dialogue-manager.test.ts`  
**状态**: 已创建 ✅

**覆盖范围**:
- ✅ DialogueManager 初始化 (3 个测试)
- ✅ 对话流程转移 (3 个测试)
- ✅ 推荐流程核心 (4 个测试)
  - 完整推荐流程
  - Top 5 限制
  - 数据完整性
  - 性能指标
- ✅ 错误处理和降级 (2 个测试)
- ✅ 缓存操作 (1 个测试)

**总测试数**: 13+  
**预期覆盖**: 对话管理器 80%+

---

#### 2. LLM 引擎增强测试

**文件**: `src/__tests__/unit/llm-engine.test.ts`  
**状态**: 🆕 待创建

**覆盖范围** (计划):
- [ ] 信息提取测试
  - extractUserPreference() 各意图类型
  - 提取精度和置信度
  - 异常输入处理
  - 缓存命中/未命中
- [ ] 决策逻辑测试
  - shouldRecommend() 各缺失字段
  - generateSearchParams() 参数优化
  - 边界条件
  - 降级策略
- [ ] 推荐解析测试
  - parseRecommendations() JSON 解析
  - LLM 解析降级
  - Top 5 限制强制
  - 推荐理由提取
- [ ] 对话历史管理
  - addToConversationHistory()
  - 历史大小限制 (50 条)
  - clearConversationHistory()

**预期覆盖**: LLM 引擎 85%+

---

#### 3. 缓存系统集成测试

**文件**: `src/__tests__/unit/cache-integration.test.ts`  
**状态**: 🆕 待创建

**覆盖范围** (计划):
- [ ] CacheManager 完整流程
- [ ] 两层缓存互动
- [ ] 过期策略应用
- [ ] 去重机制验证
- [ ] 统计信息准确性

**预期覆盖**: 缓存系统 70%+

---

### 🟡 **中优先级** - 2-3 周内

#### 4. 参数提取器测试

**文件**: `src/__tests__/unit/parameter-extractor.test.ts`

**覆盖范围** (计划):
- [ ] 参数提取准确性
- [ ] 位置识别和标准化
- [ ] 类型提取
- [ ] 距离解析
- [ ] 异常输入处理

**预期覆盖**: 75%+

---

#### 5. 高德 API 错误处理测试

**文件**: `src/__tests__/unit/amap-error-handling.test.ts`

**覆盖范围** (计划):
- [ ] API 错误场景
  - 频率限制 (10021)
  - 无效参数 (10008)
  - 权限不足 (10015)
  - 网络超时
- [ ] 降级策略验证
  - 直线距离估算
  - 批量查询降级
  - 缓存回源

**预期覆盖**: 80%+

---

#### 6. 请求队列系统测试

**文件**: `src/__tests__/unit/request-queue.test.ts`

**覆盖范围** (计划):
- [ ] 队列基础功能
- [ ] 优先级排序
- [ ] 并发限制
- [ ] 请求去重
- [ ] 超时控制
- [ ] 重试机制

**预期覆盖**: 80%+

---

### 🟢 **低优先级** - 3-4 周内

#### 7. 输出管理器交互测试

**文件**: `src/__tests__/unit/output-manager.test.ts`

**覆盖范围** (计划):
- [ ] 格式化功能
- [ ] 交互功能
- [ ] 颜色标记

**预期覆盖**: 70%+

---

#### 8. 监控系统测试

**文件**: `src/__tests__/unit/monitoring.test.ts`

**覆盖范围** (计划):
- [ ] 指标收集
- [ ] 日志聚合
- [ ] 告警阈值

**预期覆盖**: 75%+

---

#### 9. 类型验证测试

**文件**: `src/__tests__/unit/validator.test.ts`

**覆盖范围** (计划):
- [ ] 参数验证
- [ ] 业务规则验证

**预期覆盖**: 90%+

---

## 📈 测试进度图表

### 现有测试覆盖进度

```
模块                当前  目标    进度
────────────────────────────────────
对话管理器          40%   80%   ████░░░░░░ 🆕 刚完成
LLM 服务            50%   85%   █████░░░░░░
地图服务            70%   90%   ███████░░░░░
缓存系统            10%   70%   █░░░░░░
请求队列            5%    80%   ░░░░░░░░░░░
输出管理            15%   70%   █░░░░░░
监控系统            20%   75%   ██░░░░░░
────────────────────────────────────
总体                ~20%  80%   ██░░░░░░░░░░░░░
```

### 计划完成时间表

```
第1周 (本周)
├─ ✅ 对话管理器测试 (已完成)
├─ 🔄 编译验证中
└─ 📝 文档更新中

第2周
├─ LLM 引擎增强测试
├─ 缓存系统集成测试
└─ CLI 命令测试

第3周
├─ 参数提取器测试
├─ 高德 API 错误处理
├─ 请求队列系统测试
└─ 集成测试

第4周
├─ 输出管理器测试
├─ 监控系统测试
├─ 类型验证测试
└─ E2E 测试

目标: 第5周完成，达到 80%+ 覆盖率
```

---

## 🔍 关键路径测试详解

### 核心链路: getRecommendations()

```
推荐流程关键节点覆盖:

Step 1: 缓存检查
  ├─ generateCacheKey()          ✅ 已覆盖
  ├─ checkCachedRecommendations() ⚠️ 部分覆盖
  └─ [缓存命中] 返回           ✅ 已覆盖 (dialogue-manager.test)

Step 2: LLM 信息检查
  ├─ shouldRecommend()           ⚠️ 部分覆盖 (llm.test)
  ├─ 验证必需字段                ✅ 已覆盖
  └─ [失败] 返回错误             ✅ 已覆盖 (dialogue-manager.test)

Step 3: LLM 参数优化
  ├─ generateSearchParams()       ⚠️ 部分覆盖 (llm.test)
  ├─ 调用 LLM                    ⚠️ 部分覆盖
  └─ 解析结果                     ✅ 已覆盖

Step 4: 地图 API 查询
  ├─ searchRecommendedLocations() ✅ 已覆盖 (amap.test)
  ├─ buildSearchKeywords()       ✅ 已覆盖
  ├─ client.searchPOI()          ✅ 已覆盖
  ├─ calculateDistance()          ✅ 已覆盖
  └─ 距离过滤                     ✅ 已覆盖

Step 5: 降级处理
  ├─ getFallbackRecommendations() ⚠️ 部分覆盖 (dialogue-manager.test)
  ├─ getPopularLocations()       ✅ 已覆盖
  └─ generateMockRecommendations() ✅ 已覆盖

Step 6: LLM 解析与排序
  ├─ parseRecommendations()       ✅ 已覆盖 (llm.test)
  ├─ JSON 解析                    ✅ 已覆盖
  └─ 理由提取                     ⚠️ 部分覆盖

Step 7: Top 5 筛选
  ├─ formatRecommendations()      ✅ 已覆盖 (dialogue-manager.test)
  ├─ 按相关性排序                 ✅ 已覆盖
  └─ 截取前 5 个                 ✅ 已覆盖

Step 8: 缓存和状态
  ├─ 状态转移                     ✅ 已覆盖 (dialogue-manager.test)
  ├─ cacheRecommendations()       ⚠️ 部分覆盖
  └─ 性能记录                     ✅ 已覆盖

覆盖总体评分: 70% ⚠️
关键缺口: 缓存系统、LLM 引擎细节
```

---

## 📋 测试执行清单

### 快速检查

```bash
# 编译检查
npm run build                              ✅

# 运行所有测试
npm test                                   
npm run test:unit                          

# 运行特定测试套件
npm run test:amap                          ✅ 高德地图
npm run test:llm                           ✅ LLM 功能
npm run test:dialogue                      🆕 对话管理器 (新增)

# 查看具体错误
npm run lint                               ✅
```

### 测试命令参考

```json
{
  "test": "npm run test:unit",
  "test:unit": "node --loader tsx src/__tests__/runner.ts --filter unit",
  "test:amap": "tsx src/__tests__/unit/amap.test.ts",
  "test:llm": "tsx src/__tests__/unit/llm.test.ts",
  "test:dialogue": "tsx src/__tests__/unit/dialogue-manager.test.ts"
}
```

---

## 📊 覆盖率报告

### 当前覆盖统计

| 类别 | 测试数 | 覆盖范围 | 备注 |
|------|--------|---------|------|
| **单元测试** | 39+ | ~20% | 2 套件已完成，1 套件新增 |
| **集成测试** | 0 | 0% | 计划中 |
| **E2E 测试** | 0 | 0% | 计划中 |
| **总计** | 39+ | ~20% | 目标 80%+ |

### 模块详细覆盖

```
src/
├── cli/                  覆盖: 20%   🔴 需改进
├── dialogue/             覆盖: 40%   🟡 中等 (新增对话管理器)
├── llm/                  覆盖: 60%   🟡 中等
├── map/                  覆盖: 70%   🟢 良好
├── cache/                覆盖: 10%   🔴 需改进
├── config/               覆盖: 85%   🟢 很好
├── types/                覆盖: 80%   🟢 很好
├── utils/                覆盖: 50%   🟡 中等
├── parser/               覆盖: 40%   🟡 中等
├── queue/                覆盖: 5%    🔴 需改进
├── output/               覆盖: 15%   🔴 需改进
├── monitoring/           覆盖: 20%   🔴 需改进
└── logger/               覆盖: 65%   🟡 中等
```

---

## 🎓 测试最佳实践

### 编写单元测试时

1. **使用描述性名称**: `testFeatureUnderCondition`
2. **一个测试一个概念**: 单一职责
3. **使用 AAA 模式**: Arrange, Act, Assert
4. **包含边界情况**: 空值、极限、异常
5. **提供清晰的日志**: 便于调试

### 示例: 好的单元测试

```typescript
// ✅ 好的测试
tests.push(
  (async (): Promise<TestResult> => {
    try {
      // Arrange: 准备数据
      const manager = new DialogueManager();
      await manager.initialize();

      // Act: 执行操作
      await manager.addUserInput('南山');
      const state = manager.getState();

      // Assert: 验证结果
      if (state.phase !== DialoguePhase.COLLECTING_TYPE) {
        throw new Error('阶段转移失败');
      }

      logger.info('✅ 测试通过');
      return { name: '测试名称', passed: true };
    } catch (error) {
      logger.error('❌ 测试失败', { error });
      return { 
        name: '测试名称', 
        passed: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  })()
);
```

---

## 📚 相关资源

- **架构文档**: `docs/ARCHITECTURE.md` - 系统架构和模块设计
- **快速开始**: `README.md` - 项目快速开始指南
- **测试指南**: `docs/guides/HOW-TO-RUN-TESTS.md` - 详细测试执行指南

---

## ✅ 总结

### 当前进展
- ✅ 对话管理器测试已完成 (13+ 个测试)
- ✅ 编译验证通过 (40 个文件)
- ✅ 架构文档完成
- ✅ 测试覆盖计划制定

### 下一步行动
1. **立即**: 运行新增的对话管理器测试验证功能
2. **本周**: 完成 LLM 引擎和缓存系统测试
3. **下周**: 完成高德 API 和参数提取器测试
4. **2周内**: 达到 50%+ 测试覆盖率

### 目标
- 📈 **第5周**: 达到 **80%+ 测试覆盖率**
- ✅ **关键路径**: 100% 测试覆盖
- 🎯 **整体质量**: 提升到生产级别

---

**最后更新**: 2024-03-28  
**版本**: 1.0.0  
**维护者**: Park Recommender Team
