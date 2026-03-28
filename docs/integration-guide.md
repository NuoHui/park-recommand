# LLM + 地图 API 集成指南

## 📋 概述

本文档详细说明了如何在推荐系统中实现 LLM 和地图 API 的完整集成。实现了真正的智能推荐流程，替代了之前的模拟数据。

---

## 🏗️ 架构设计

### 整体流程

```
用户对话
   ↓
信息收集 (DialogueManager)
   ↓
LLM 信息检查 (shouldRecommend)
   ↓
LLM 参数优化 (generateSearchParams)
   ↓
地图 API 查询 (searchRecommendedLocations)
   ↓
距离计算 (calculateDistance)
   ↓
LLM 排序解析 (parseRecommendations)
   ↓
格式化输出
   ↓
返回推荐给用户
```

---

## 🔄 各个环节的职责

### 1. LLM 的职责

#### 1.1 信息充分性检查 (`shouldRecommend`)

**输入**: 用户偏好对象
```typescript
{
  location: "南山区",
  parkType: "hiking",
  maxDistance: 5
}
```

**输出**: 决策结果
```typescript
{
  shouldRecommend: true,
  reasoning: "信息充分，可以进行推荐",
  confidence: 0.95,
  missingInfo: []
}
```

**作用**: 
- 判断是否收集了足够的信息
- 如果不足，返回缺失的信息列表
- 避免进行低质量的搜索

#### 1.2 搜索参数优化 (`generateSearchParams`)

**输入**: 用户偏好

**输出**: 优化的搜索参数
```typescript
{
  location: "深圳南山区",
  parkType: "hiking",
  maxDistance: 5,
  keywords: ["登山", "爬山", "山峰"],
  reasoning: "根据用户偏好，在南山区周边搜索爬山景点",
  confidence: 0.85
}
```

**作用**:
- 理解用户偏好的隐含意图
- 生成最优的搜索关键词
- 调整搜索范围和参数
- 记录搜索逻辑供调试

#### 1.3 推荐理由生成和排序 (`parseRecommendations`)

**输入**: 地图 API 返回的景点 JSON

**输出**: 排序和解析结果
```typescript
{
  locations: [
    {
      name: "梧桐山风景区",
      reason: "深圳最热门的爬山地点，海拔943米，是登山爱好者的必去之地",
      relevanceScore: 0.95,
      estimatedTravelTime: 25
    },
    {
      name: "羊台山",
      reason: "南山区热门爬山景点，距离近，难度适中，适合周末游玩",
      relevanceScore: 0.87,
      estimatedTravelTime: 18
    }
  ],
  explanation: "根据你的偏好，推荐了深圳南山区最热门的两个爬山景点"
}
```

**作用**:
- 对景点进行相关性评分
- 为每个推荐生成自然语言理由
- 排序景点优先级
- 提供整体推荐说明

---

### 2. 地图 API 的职责

#### 2.1 景点搜索 (`searchRecommendedLocations`)

**输入**: 用户偏好 (包含位置、类型等)

**输出**: 地点列表
```typescript
[
  {
    name: "梧桐山风景区",
    latitude: 22.5431,
    longitude: 113.9606,
    address: "深圳市罗湖区梧桐山1088号",
    distance: 2.5,  // 单位: km
    tags: ["爬山", "高评分", "热门"],
    rating: 4.8,
    phone: "0755-12345678"
  },
  // ... 更多景点
]
```

**作用**:
- 调用高德 POI 搜索 API
- 根据关键词和区域搜索景点
- 返回结构化的地点信息

#### 2.2 距离计算 (`calculateDistance`)

**输入**: 起点坐标、终点坐标、出行方式

**输出**: 距离 (公里)

**处理逻辑**:
1. 先检查缓存
2. 缓存命中 → 返回缓存数据
3. 缓存未命中 → 调用高德距离计算 API
4. 如果 API 失败 → 使用 Haversine 公式估算 (直线距离 × 系数)

**特点**:
- 支持开车/步行两种模式
- 结果自动缓存
- 失败时自动降级估算

#### 2.3 缓存管理

**地点缓存**:
```typescript
locationCache = {
  "梧桐山:shenzhen": {
    data: { name, latitude, longitude, ... },
    timestamp: 1234567890
  }
}
```

**距离缓存**:
```typescript
distanceCache = {
  "113.9606,22.5431:113.9700,22.5500:driving": {
    data: 2500,  // 单位: 米
    timestamp: 1234567890
  }
}
```

**优势**:
- 减少 API 调用次数
- 降低延迟
- 节省 API 配额成本

---

## 📝 实现细节

### DialogueManager.getRecommendations() 流程

```typescript
async getRecommendations() {
  // 1️⃣ 前置检查：确保处于 QUERYING 阶段
  if (this.state.phase !== DialoguePhase.QUERYING) {
    return { success: false, error: '...' };
  }

  try {
    // 2️⃣ 获取服务实例
    const llmService = getLLMService();
    const locationService = getLocationService();
    await llmService.initialize();

    // 3️⃣ LLM 信息检查
    const shouldRecommend = await llmEngine.shouldRecommend(preferences);
    if (!shouldRecommend.shouldRecommend) {
      return { success: false, error: shouldRecommend.reasoning };
    }

    // 4️⃣ LLM 搜索参数优化
    const searchDecision = await llmEngine.generateSearchParams(preferences);

    // 5️⃣ 地图 API 查询
    const locations = await locationService.searchRecommendedLocations(preferences);
    if (!locations || locations.length === 0) {
      // 降级处理
      const fallback = await this.getFallbackRecommendations(preferences);
      if (fallback.length > 0) {
        const formatted = await this.formatRecommendations(fallback, ...);
        this.state.phase = DialoguePhase.RECOMMENDING;
        return { success: true, recommendations: formatted };
      }
      return { success: false, error: '未找到景点' };
    }

    // 6️⃣ LLM 排序解析
    const parsed = await llmEngine.parseRecommendations(JSON.stringify(locations));

    // 7️⃣ 格式化输出
    const recommendations = await this.formatRecommendations(locations, parsed);

    // 8️⃣ 状态转移
    this.state.phase = DialoguePhase.RECOMMENDING;

    return { success: true, recommendations };
  } catch (error) {
    // 捕获异常，进行降级处理
    const fallback = await this.getFallbackRecommendations(...);
    if (fallback.length > 0) {
      return { success: true, recommendations: fallback };
    }
    return { success: false, error: error.message };
  }
}
```

### 辅助方法

#### formatRecommendations()

将原始地点数据转换为最终推荐格式：

```typescript
private async formatRecommendations(
  locations: Location[],
  parsedData: ParsedRecommendation
): Promise<Recommendation[]> {
  // 1. 创建 LLM 解析数据的查找表
  const reasonMap = new Map();
  const scoreMap = new Map();
  
  parsedData.locations.forEach(item => {
    reasonMap.set(item.name.toLowerCase(), item.reason);
    scoreMap.set(item.name.toLowerCase(), item.relevanceScore);
  });

  // 2. 按相关性排序
  const sorted = locations
    .map(loc => ({
      ...loc,
      relevanceScore: scoreMap.get(loc.name.toLowerCase()) || 0.5,
      reason: reasonMap.get(loc.name.toLowerCase()) || '根据你的偏好推荐',
    }))
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
    .slice(0, 5); // 最多 5 个

  // 3. 转换格式
  return sorted.map(loc => ({
    id: `rec-${loc.name.replace(/\s+/g, '-')}`,
    name: loc.name,
    reason: loc.reason,
    distance: loc.distance ? Math.round(loc.distance * 10) / 10 : undefined,
    rating: loc.rating ? Math.round(loc.rating * 10) / 10 : undefined,
  }));
}
```

#### getFallbackRecommendations()

当地图 API 失败时的降级方案：

```typescript
private async getFallbackRecommendations(
  preferences: UserPreference
): Promise<Location[]> {
  try {
    // 第一层降级：获取热门景点
    const popular = await locationService.getPopularLocations(5);
    if (popular && popular.length > 0) {
      return popular;
    }
  } catch (error) {
    logger.warn('热门景点获取失败');
  }

  // 第二层降级：返回模拟数据
  return this.generateMockRecommendations();
}
```

---

## 🔄 错误处理和降级策略

### 三层降级机制

```
正常流程
├─ LLM 检查失败
│  └─ 返回：缺失信息错误
│
├─ 地点搜索返回 0 结果
│  └─ 第一层降级：获取热门景点
│
├─ 热门景点获取失败
│  └─ 第二层降级：使用模拟数据
│
└─ 异常捕获
   └─ 第三层降级：返回预设景点
```

### 具体实现

| 情况 | 处理方式 | 返回结果 |
|------|--------|--------|
| LLM 信息不足 | 返回缺失信息 | `success: false, error: "缺少位置信息"` |
| 地点搜索为空 | 尝试热门景点 | 如果有热门景点则返回，否则继续降级 |
| API 异常 | 捕获异常进行降级 | 返回降级结果或最后的模拟数据 |
| 所有方案失败 | 用户友好的错误提示 | `success: false, error: "系统暂时无法查询"` |

---

## 📊 数据流转示例

### 示例：用户查询爬山景点

#### 步骤 1: 用户输入
```
用户: "我在南山区，想找周末爬山的地方，最多5公里"
```

#### 步骤 2: 信息提取
```json
{
  "location": "南山区",
  "parkType": "hiking",
  "maxDistance": 5
}
```

#### 步骤 3: LLM 信息检查
```json
{
  "shouldRecommend": true,
  "reasoning": "已获得位置、景点类型和距离信息，可以进行推荐",
  "confidence": 0.95
}
```

#### 步骤 4: LLM 参数优化
```json
{
  "location": "深圳南山区",
  "parkType": "hiking",
  "maxDistance": 5,
  "keywords": ["登山", "爬山", "山峰"],
  "confidence": 0.85
}
```

#### 步骤 5: 地图 API 查询
```json
[
  {
    "name": "梧桐山风景区",
    "latitude": 22.5431,
    "longitude": 113.9606,
    "distance": 2.5,
    "tags": ["爬山", "高评分", "热门"]
  },
  {
    "name": "羊台山",
    "latitude": 22.5200,
    "longitude": 113.9500,
    "distance": 4.2,
    "tags": ["爬山", "难度中等"]
  }
]
```

#### 步骤 6: LLM 排序解析
```json
{
  "locations": [
    {
      "name": "梧桐山风景区",
      "reason": "深圳最热门的爬山地点，是登山爱好者必去的景点",
      "relevanceScore": 0.95,
      "estimatedTravelTime": 25
    },
    {
      "name": "羊台山",
      "reason": "南山区热门景点，距离近，难度适中，适合周末游玩",
      "relevanceScore": 0.87,
      "estimatedTravelTime": 18
    }
  ]
}
```

#### 步骤 7: 最终推荐
```json
[
  {
    "id": "rec-梧桐山风景区",
    "name": "梧桐山风景区",
    "reason": "深圳最热门的爬山地点，是登山爱好者必去的景点",
    "distance": 2.5,
    "rating": 4.8
  },
  {
    "id": "rec-羊台山",
    "name": "羊台山",
    "reason": "南山区热门景点，距离近，难度适中，适合周末游玩",
    "distance": 4.2,
    "rating": 4.5
  }
]
```

---

## 🧪 测试和验证

### 运行集成示例

```bash
npm run example:integration
# 或
ts-node examples/llm-map-integration-example.ts
```

### 输出示例

```
═══════════════════════════════════════════════════════════
   LLM + 地图 API 集成演示
═══════════════════════════════════════════════════════════

📌 步骤 1: 初始化对话管理器
✅ 对话管理器已初始化

📌 步骤 2: 收集用户偏好信息
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 用户: "我在南山区"
   进度: COLLECTING_LOCATION (33% 完成)

✅ 用户偏好已收集:
   位置: 南山区
   景点类型: hiking
   最大距离: 5 km

📌 步骤 3: LLM 信息充分性检查
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 信息充分性: ✓ 充分
   理由: 已获得位置、景点类型和距离信息，可以进行推荐
   信心度: 95%

... (更多输出)

✅ 推荐成功! 共 2 个推荐:

   🎯 1. 梧桐山风景区
      ID: rec-梧桐山风景区
      推荐理由: 深圳最热门的爬山地点，是登山爱好者必去的景点
      距离: 2.5 km
      评分: 4.8/5

   🎯 2. 羊台山
      ID: rec-羊台山
      推荐理由: 南山区热门景点，距离近，难度适中，适合周末游玩
      距离: 4.2 km
      评分: 4.5/5
```

---

## ✅ 关键特性总结

| 特性 | 说明 |
|------|------|
| **真实数据** | 调用真实的高德 API，返回真实景点数据 |
| **智能优化** | LLM 优化搜索参数，提高查询精准度 |
| **多层降级** | 三层降级机制，确保服务可用性 |
| **缓存机制** | 地点和距离数据缓存，提升性能 |
| **自然语言** | LLM 生成自然、友好的推荐理由 |
| **错误恢复** | 完善的异常处理和恢复机制 |
| **可观测性** | 详细的日志记录，便于调试和优化 |

---

## 🚀 性能指标

### 预期响应时间

| 阶段 | 耗时 | 说明 |
|------|------|------|
| LLM 信息检查 | ~200ms | 本地检查，无 API 调用 |
| LLM 参数优化 | ~1000ms | 一次 LLM API 调用 |
| 地点搜索 | ~800ms | 高德 API 调用 |
| 距离计算 | ~500ms | 多个 API 调用或缓存命中 |
| LLM 排序解析 | ~1000ms | 一次 LLM API 调用 |
| **总耗时** | **~4000ms** | 不包含网络延迟 |

### 缓存效果

- 首次查询：4000-5000ms
- 缓存命中：500-1000ms (减少 80% 以上的耗时)

---

## 📚 相关文件

- `src/dialogue/manager.ts` - DialogueManager 实现
- `src/llm/engine.ts` - LLMEngine 实现
- `src/map/service.ts` - LocationService 实现
- `examples/llm-map-integration-example.ts` - 完整示例

---

## 🔗 参考资源

- [高德地图 API 文档](https://lbs.amap.com/api/)
- [LLM 类型定义](../src/types/llm.ts)
- [通用类型定义](../src/types/common.ts)
