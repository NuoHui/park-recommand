---
name: llm-map-integration
overview: 设计并实现 LLM + 地图 API 的完整推荐流程集成，替换 DialogueManager 中的模拟数据生成逻辑，打通真正的智能推荐链路。
todos:
  - id: design-review
    content: 审阅流程图和代码框架设计，确保架构合理性和完整性
    status: completed
  - id: implement-integration
    content: 实现 DialogueManager.getRecommendations() 的完整流程集成
    status: completed
    dependencies:
      - design-review
  - id: add-helper-methods
    content: 实现辅助方法（格式化、转换、降级处理）
    status: completed
    dependencies:
      - implement-integration
  - id: add-logging
    content: 补充完整的日志记录和错误追踪
    status: completed
    dependencies:
      - implement-integration
  - id: test-e2e-flow
    content: 编写端到端测试，验证完整的推荐流程
    status: completed
    dependencies:
      - add-helper-methods
  - id: test-error-scenarios
    content: 测试错误场景和降级策略
    status: completed
    dependencies:
      - test-e2e-flow
  - id: validate-integration
    content: 验证 LLM + 地图 API 集成是否真正通畅
    status: completed
    dependencies:
      - test-error-scenarios
---

## 产品概述

打通 LLM + 地图 API 的推荐流程集成，使系统能够：

1. 通过 LLM 智能判断用户提供的信息是否充分
2. 基于用户偏好生成最优的地图搜索参数
3. 调用高德地图 API 获取真实景点数据
4. 使用 LLM 进行结果排序和推荐理由生成
5. 返回结构化、有质量的推荐结果给用户

## 核心功能

### 1. 推荐前置判断

- 调用 LLMEngine.shouldRecommend() 验证用户信息完整性
- 如信息不足，返回缺失字段列表
- 如信息充分，继续推荐流程

### 2. 搜索参数优化

- 调用 LLMEngine.generateSearchParams() 生成优化后的搜索参数
- LLM 基于用户偏好理解生成最适合的关键词、地区、距离半径
- 输出置信度和推荐理由

### 3. 地点查询与距离计算

- 调用 LocationService.searchRecommendedLocations() 获取真实景点
- 高德 API 返回地点基本信息
- 自动计算用户位置到各景点的真实距离
- 按距离过滤符合条件的地点

### 4. 结果排序与解释

- 调用 LLMEngine.parseRecommendations() 对地点进行排序
- 为每个推荐生成个性化的推荐理由
- 返回结构化的推荐列表（包含名称、理由、相关性评分等）

## 技术栈

### 现有技术基础

- **LLMEngine**: 已实现意图识别、参数生成、结果解析的完整能力
- **LocationService**: 已实现地点搜索、距离计算、缓存管理
- **LLMService**: 单例服务，提供 LLMEngine 和 LLMClient
- **DialogueManager**: 对话状态管理和用户偏好收集

### 实现方式

- TypeScript + 异步流程编排
- 错误处理和降级策略
- 缓存优化避免重复查询

## 实现方案

### 整体设计思路

**核心原则**: 在 `DialogueManager.getRecommendations()` 方法中实现完整的流程编排，通过组合已有的 LLMEngine 和 LocationService 能力，构建端到端的推荐流程。

**关键特点**:

1. **顺序流程**: 严格按照信息充分性检查 → 参数优化 → 地点搜索 → 结果排序的顺序执行
2. **错误容错**: 每个环节都有完整的错误处理和降级策略
3. **日志追踪**: 完整的日志记录，便于流程跟踪和问题诊断
4. **结果转换**: 地图 API 返回的 Location 对象转换为结构化的 Recommendation 对象

### 系统架构

```
DialogueManager.getRecommendations()
├─ 阶段1: 信息充分性检查
│  └─ LLMEngine.shouldRecommend(userPreference)
│     → RecommendationDecision { shouldRecommend, missingInfo, ... }
├─ 阶段2: 搜索参数优化
│  └─ LLMEngine.generateSearchParams(userPreference)
│     → RecommendationDecision { searchParams, reasoning, confidence }
├─ 阶段3: 地点查询
│  ├─ 构建 UserPreference 对象（包含优化后的搜索参数）
│  └─ LocationService.searchRecommendedLocations(preference)
│     → Location[] 真实景点列表
├─ 阶段4: 结果排序与解释
│  ├─ 格式化地点信息为可读文本
│  └─ LLMEngine.parseRecommendations(formattedLocations)
│     → ParsedRecommendation { locations, explanation }
└─ 阶段5: 结果转换与返回
   └─ 将 Location[] 和 ParsedRecommendation 合并为最终推荐列表
      → Array<{ id, name, reason, distance, rating }>
```

### 数据流向

```
用户偏好信息
(UserPreference)
    ↓
[LLM 检查] 信息是否充分?
    ├─ 否 → 返回缺失字段，提示用户补充
    └─ 是 ↓
[LLM 优化] 生成最优搜索参数
    ↓
    ├─ 关键词优化
    ├─ 地区确认
    ├─ 距离半径调整
    └─ 类型过滤 ↓
[地图API] 查询真实景点
    ↓
    ├─ 高德 API 搜索
    ├─ 距离计算
    └─ 结果过滤 ↓
[LLM 排序] 排序和生成理由
    ↓
    ├─ 按相关性排序
    ├─ 生成推荐理由
    └─ 评估匹配度 ↓
最终推荐列表
(Recommendation[])
```

## 实现细节

### 关键环节说明

#### 1. 信息充分性检查

```
输入: UserPreference { location, parkType, maxDistance, ... }
调用: LLMEngine.shouldRecommend()
逻辑:
- 检查必需字段: location | (latitude & longitude)
- 检查必需字段: parkType
- 检查必需字段: maxDistance
- 如缺失任何字段，返回 { shouldRecommend: false, missingInfo: [...] }
- 如完整，继续下一阶段
输出: RecommendationDecision
```

#### 2. 搜索参数优化

```
输入: UserPreference
调用: LLMEngine.generateSearchParams()
处理:
- LLM 理解用户的真实需求（不仅是表面偏好）
- 生成优化的关键词组合（例如: "爬山|登山|徒步")
- 确定搜索半径（可能根据上下文调整）
- 生成搜索理由和置信度
输出: RecommendationDecision { searchParams: { keywords, maxDistance, ... }, reasoning, confidence }
```

#### 3. 地点查询与距离计算

```
输入: UserPreference + 优化后的 searchParams
调用: LocationService.searchRecommendedLocations()
处理:
- 构建搜索 keywords（来自 LLM 优化结果）
- 调用高德 API 搜索地点
- 如用户提供坐标，自动计算距离
- 按 maxDistance 过滤结果
- 提取标签和基本信息
输出: Location[] 数组，包含 { name, latitude, longitude, distance, tags, ... }
异常: 如搜索为空，返回空数组并记录日志
```

#### 4. 结果排序与推荐理由

```
输入: Location[] 景点列表
处理:
- 格式化为可读文本: "景点名称: XXX, 距离: Y.Z km, 标签: A, B, C"
调用: LLMEngine.parseRecommendations(formattedText)
处理:
- LLM 理解景点特点并排序
- 为每个景点生成个性化推荐理由
- 评估与用户偏好的匹配度 (0-1)
输出: ParsedRecommendation { 
  locations: [{ name, reason, relevanceScore, estimatedTravelTime }, ...],
  explanation: "整体推荐说明"
}
```

#### 5. 结果转换与返回

```
输入: Location[] + ParsedRecommendation
处理:
- 按 ParsedRecommendation 的顺序合并信息
- 为每个推荐生成唯一 ID
- 补充距离、评分等信息
输出: Array<{
  id: string,
  name: string,
  reason: string,
  distance?: number,
  rating?: number
}>
```

### 错误处理策略

| 阶段 | 错误场景 | 处理方案 |
| --- | --- | --- |
| 信息检查 | 缺失必需字段 | 返回 success=false，提示缺失字段 |
| 参数优化 | LLM API 失败 | 使用用户原始偏好作为搜索参数，降级处理 |
| 地点查询 | 高德 API 返回空 | 返回空列表，提示"未找到匹配的景点" |
| 地点查询 | 高德 API 异常 | 记录错误，返回 success=false |
| 结果排序 | LLM 排序失败 | 按距离排序，跳过 LLM 排序理由生成 |
| 全流程 | 超时或其他异常 | 记录详细错误，返回通用错误消息 |


### 性能考虑

- **缓存利用**: LocationService 内置缓存，避免重复查询相同地点
- **并行优化**: 距离批量计算采用 calculateDistanceBatch()，而非逐个计算
- **API 调用次数**: 最多调用 4 次 LLM（检查、参数生成、结果排序、异常处理），以及 1 次地图 API
- **超时控制**: 总流程超时时间为 DialogueManager 配置的 timeout（默认 30s）

## 代码框架

### getRecommendations() 伪代码框架

```typescript
async getRecommendations(): Promise<{
  success: boolean;
  recommendations?: Recommendation[];
  error?: string;
}> {
  // 0. 前置检查
  if (this.state.phase !== DialoguePhase.QUERYING) {
    return { success: false, error: '信息收集不完整，无法生成推荐' };
  }

  try {
    const preferences = this.state.userPreference;
    
    // 1. 阶段1: 信息充分性检查
    logger.debug('阶段1: 检查信息充分性');
    const shouldRecommendDecision = await llmEngine.shouldRecommend(preferences);
    
    if (!shouldRecommendDecision.shouldRecommend) {
      logger.warn('信息不足', { missingInfo: shouldRecommendDecision.missingInfo });
      return { success: false, error: `还需要: ${shouldRecommendDecision.missingInfo.join(', ')}` };
    }

    // 2. 阶段2: 搜索参数优化
    logger.debug('阶段2: 优化搜索参数');
    const searchParamsDecision = await llmEngine.generateSearchParams(preferences);
    const optimizedSearchParams = searchParamsDecision.searchParams;

    // 3. 阶段3: 地点查询
    logger.debug('阶段3: 查询地点', { searchParams: optimizedSearchParams });
    const searchPreference: UserPreference = {
      ...preferences,
      ...optimizedSearchParams, // 合并优化参数
    };
    
    const locations = await locationService.searchRecommendedLocations(searchPreference);
    
    if (locations.length === 0) {
      logger.warn('未找到匹配的地点');
      return { success: false, error: '未找到匹配的景点，请调整搜索条件' };
    }

    logger.debug(`找到 ${locations.length} 个地点`);

    // 4. 阶段4: 结果排序与解释
    logger.debug('阶段4: 排序和生成推荐理由');
    const formattedLocations = this.formatLocationsForLLM(locations);
    
    let parsedRecommendations: ParsedRecommendation | null = null;
    try {
      parsedRecommendations = await llmEngine.parseRecommendations(formattedLocations);
    } catch (error) {
      logger.warn('LLM 排序失败，使用默认排序', error);
      // 降级: 按距离排序
      parsedRecommendations = this.generateDefaultParsedRecommendations(locations);
    }

    // 5. 阶段5: 结果转换与返回
    logger.debug('阶段5: 转换结果');
    const recommendations = this.convertToRecommendations(
      locations,
      parsedRecommendations
    );

    // 更新状态
    this.state.phase = DialoguePhase.RECOMMENDING;

    logger.info('推荐生成成功', {
      count: recommendations.length,
      confidence: searchParamsDecision.confidence,
    });

    return {
      success: true,
      recommendations,
    };

  } catch (error) {
    logger.error('推荐流程异常', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}
```

### 辅助方法框架

```typescript
// 格式化地点信息供 LLM 处理
private formatLocationsForLLM(locations: Location[]): string {
  return locations
    .map((loc, idx) => 
      `${idx + 1}. ${loc.name}\n` +
      `   距离: ${loc.distance?.toFixed(1) || '未知'} km\n` +
      `   标签: ${loc.tags?.join(', ') || '无'}\n` +
      `   地址: ${loc.address || '未知'}`
    )
    .join('\n\n');
}

// 默认排序策略（LLM 失败时的降级方案）
private generateDefaultParsedRecommendations(locations: Location[]): ParsedRecommendation {
  const sorted = [...locations].sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
  
  return {
    locations: sorted.map(loc => ({
      name: loc.name,
      reason: `距离 ${loc.distance?.toFixed(1)} km，${loc.tags?.join('，') || '景点'}`,
      relevanceScore: Math.max(0, 1 - (loc.distance || 100) / 100), // 基于距离的相关性评分
      estimatedTravelTime: this.estimateTravelTime(loc.distance),
    })),
    explanation: '按距离推荐，距离越近越靠前',
  };
}

// 将 Location 和 ParsedRecommendation 转换为最终推荐
private convertToRecommendations(
  locations: Location[],
  parsed: ParsedRecommendation
): Recommendation[] {
  // 建立 name → Location 的映射
  const locationMap = new Map(locations.map(loc => [loc.name, loc]));

  return parsed.locations.map((item, idx) => {
    const location = locationMap.get(item.name);
    
    return {
      id: `rec-${Date.now()}-${idx}`,
      name: item.name,
      reason: item.reason,
      distance: location?.distance,
      rating: location?.rating,
      relevanceScore: item.relevanceScore,
      estimatedTravelTime: item.estimatedTravelTime,
    };
  });
}

// 估算旅行时间
private estimateTravelTime(distanceKm?: number): number {
  if (!distanceKm) return 30;
  // 假设平均速度 50 km/h
  return Math.ceil((distanceKm / 50) * 60);
}
```

### 日志策略

```
INFO:  推荐流程开始 / 推荐生成成功
DEBUG: 各阶段开始时的参数和中间结果
WARN:  信息不足 / LLM 失败降级 / 地点搜索为空
ERROR: 异常错误 / API 调用失败
```