# LLM + 地图 API 集成 - 快速参考

## 🎯 核心流程 (7 步)

```
1. 前置检查 (Phase == QUERYING?)
   ↓
2. 初始化服务 (LLMService, LocationService)
   ↓
3. LLM.shouldRecommend() → 检查信息充分性
   ↓
4. LLM.generateSearchParams() → 优化搜索参数
   ↓
5. LocationService.searchRecommendedLocations() → 查询景点
   ↓
6. LLM.parseRecommendations() → 排序和生成理由
   ↓
7. formatRecommendations() → 格式化输出
```

---

## 📍 LLM 职责

### shouldRecommend(preferences)
```typescript
输入: UserPreference { location, parkType, maxDistance }
输出: RecommendationDecision {
  shouldRecommend: boolean,
  reasoning: string,
  confidence: 0-1,
  missingInfo?: string[]
}
职责: 判断信息是否充分
```

### generateSearchParams(preferences)
```typescript
输入: UserPreference
输出: RecommendationDecision {
  searchParams: { location, keywords[], maxDistance, ... },
  reasoning: string,
  confidence: 0-1
}
职责: 优化搜索参数，理解隐含意图
```

### parseRecommendations(locationsJson)
```typescript
输入: JSON string of Location[]
输出: ParsedRecommendation {
  locations: [{ name, reason, relevanceScore, ... }],
  explanation: string
}
职责: 排序景点，生成推荐理由
```

---

## 🗺️ 地图 API 职责

### searchRecommendedLocations(preference)
```typescript
输入: UserPreference { location, parkType, maxDistance }
输出: Location[] {
  name, latitude, longitude, distance, tags, rating, ...
}
职责: 调用高德 API，返回景点列表
降级: 如果失败，使用缓存或热门景点
```

### calculateDistance(lat1, lon1, lat2, lon2, mode)
```typescript
输入: 两个坐标点，出行方式 (driving|walking)
输出: number (公里)
职责: 计算真实距离
降级: 如果 API 失败，使用 Haversine 公式估算
缓存: 自动缓存结果
```

---

## 💾 缓存策略

### 地点缓存
```
Key: "${name}:${region}"
Value: Location object
TTL: configurable (env.cacheExpiration)
```

### 距离缓存
```
Key: "${lon1},${lat1}:${lon2},${lat2}:${mode}"
Value: distance in meters
TTL: configurable
```

### 缓存统计
```typescript
const stats = locationService.getCacheStats();
console.log(stats.locations);  // 缓存的地点数
console.log(stats.distances);  // 缓存的距离数
```

---

## 🔄 错误处理

### 三层降级

| 层级 | 触发条件 | 处理方式 |
|-----|--------|--------|
| 1 | 地点搜索无结果 | → 获取热门景点 |
| 2 | 热门景点也失败 | → 返回模拟数据 |
| 3 | 异常捕获 | → 降级或错误提示 |

### 常见错误处理

```typescript
// 错误 1: LLM 服务未初始化
if (!llmService.isInitialized()) {
  await llmService.initialize();
}

// 错误 2: 地点搜索为空
if (!locations || locations.length === 0) {
  const fallback = await getFallbackRecommendations();
  if (fallback.length > 0) return fallback;
}

// 错误 3: 异常捕获
try {
  // ... API 调用
} catch (error) {
  // 进行降级处理
}
```

---

## 📊 返回格式

### 推荐结果

```typescript
{
  success: boolean,
  recommendations?: [
    {
      id: string,                    // "rec-梧桐山风景区"
      name: string,                  // "梧桐山风景区"
      reason: string,                // "推荐理由"
      distance?: number,             // 2.5 (km)
      rating?: number                // 4.8 (0-5)
    }
  ],
  error?: string                      // 错误信息
}
```

### 返回示例

```typescript
// 成功
{
  success: true,
  recommendations: [
    {
      id: "rec-梧桐山风景区",
      name: "梧桐山风景区",
      reason: "深圳最热门的爬山地点",
      distance: 2.5,
      rating: 4.8
    }
  ]
}

// 失败
{
  success: false,
  error: "缺少位置信息"
}
```

---

## 🔧 关键方法调用

### 获取推荐（主方法）

```typescript
const manager = new DialogueManager();
await manager.initialize();

// ... 收集用户偏好 ...
const result = await manager.getRecommendations();

if (result.success) {
  console.log(result.recommendations);
} else {
  console.log(result.error);
}
```

### 获取服务实例

```typescript
// LLM 服务
const llmService = getLLMService();
await llmService.initialize();
const engine = llmService.getEngine();

// 地点服务
const locationService = getLocationService();
```

### 手动查询

```typescript
// 搜索景点
const locations = await locationService
  .searchRecommendedLocations(preference);

// 计算距离
const distance = await locationService.calculateDistance(
  22.5, 113.9,  // from
  22.6, 114.0,  // to
  'driving'     // mode
);

// 获取热门景点
const popular = await locationService.getPopularLocations(5);
```

---

## 📈 性能优化建议

### 1. 缓存优化
```typescript
// 清空过期缓存
locationService.clearCache();

// 查看缓存统计
const stats = locationService.getCacheStats();
if (stats.locations > 1000) {
  locationService.clearCache();
}
```

### 2. 并行处理
```typescript
// 并行计算多个景点的距离
const distances = await locationService.calculateDistanceBatch(
  userLat, userLon,
  [loc1, loc2, loc3],
  'driving'
);
```

### 3. 结果限制
```typescript
// formatRecommendations() 已限制最多返回 5 个
// 地图搜索已限制最多返回 25 个
// 这些值可在代码中调整
```

---

## 🧪 测试清单

- [ ] LLM 信息检查逻辑
- [ ] 搜索参数优化逻辑
- [ ] 地点搜索 API 调用
- [ ] 距离计算正确性
- [ ] 推荐排序顺序
- [ ] 缓存命中率
- [ ] 异常降级处理
- [ ] 错误消息可读性
- [ ] 性能响应时间
- [ ] 端到端集成测试

---

## 📞 故障排查

### 问题 1: "信息不足"
**原因**: 用户未提供位置、景点类型或距离
**解决**: 引导用户提供缺失信息

### 问题 2: "未找到景点"
**原因**: 搜索条件过于严格或该地区无景点
**解决**: 扩大搜索范围或使用不同关键词

### 问题 3: 距离计算异常
**原因**: API 失败或坐标无效
**解决**: 自动降级到 Haversine 估算

### 问题 4: 推荐质量差
**原因**: LLM 排序不理想
**解决**: 调整 LLM 的 temperature 和 prompt

### 问题 5: 响应超时
**原因**: API 调用过多或网络慢
**解决**: 检查缓存是否命中，优化并行处理

---

## 🎓 相关文档

- [集成指南](./integration-guide.md) - 详细说明
- [示例代码](../examples/llm-map-integration-example.ts) - 完整演示

---

## 💡 最佳实践

1. **始终检查初始化状态** - 避免未初始化的服务错误
2. **实现三层降级** - 确保在任何情况下都能返回结果
3. **监控缓存大小** - 定期清理过期缓存
4. **记录详细日志** - 便于调试和优化
5. **优雅处理异常** - 向用户返回友好的错误提示
6. **测试边界情况** - 空结果、无网络、超时等
