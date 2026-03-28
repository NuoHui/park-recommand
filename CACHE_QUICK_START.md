# 缓存系统快速开始指南

## 5 分钟快速上手

### 1. 导入模块

```typescript
import { CacheManager, CacheCategory } from '@/cache';
```

### 2. 获取缓存管理器实例

```typescript
const cache = CacheManager.getInstance();
```

### 3. 基本操作

#### 设置缓存

```typescript
// 设置地点缓存（7 天过期）
await cache.set(
  'park:info:001',
  {
    name: '梧桐山风景区',
    latitude: 22.5429,
    longitude: 114.2165,
    rating: 4.8,
  },
  7 * 24 * 60 * 60, // 7 天
  CacheCategory.LOCATION
);
```

#### 获取缓存

```typescript
const location = await cache.get('park:info:001', CacheCategory.LOCATION);
if (location) {
  console.log(`找到：${location.name}`);
} else {
  console.log('缓存未命中，从 API 获取');
}
```

#### 删除缓存

```typescript
await cache.delete('park:info:001', CacheCategory.LOCATION);
```

### 4. 批量操作

#### 批量设置地点（自动去重）

```typescript
const locations = [
  { name: '梧桐山', latitude: 22.5429, longitude: 114.2165 },
  { name: '翠竹山公园', latitude: 22.5431, longitude: 114.0579 },
  // 重复的数据会自动去重
  { name: '梧桐山', latitude: 22.5429, longitude: 114.2165 },
];

await cache.setLocations(locations, 'parks:shenzhen');
```

#### 批量获取

```typescript
const cached = await cache.getLocations('parks');
console.log(`检索到 ${cached.length} 个唯一地点`);
```

### 5. 查看统计

```typescript
const stats = cache.getStats();
console.log(`
缓存总数: ${stats.total}
总大小: ${(stats.totalSize / 1024).toFixed(2)} KB
已过期: ${stats.expiredCount}
`);
```

---

## 常见用途

### 场景 1: 缓存地点搜索结果

```typescript
async function searchParks(keyword) {
  const cacheKey = `search:${keyword}`;
  
  // 先查缓存
  let results = await cache.get(cacheKey);
  if (results) {
    console.log('从缓存获取');
    return results;
  }
  
  // 没有缓存，调用 API
  results = await mapAPI.searchPOI(keyword);
  
  // 保存到缓存（24 小时）
  await cache.set(cacheKey, results, 86400, CacheCategory.LOCATION);
  
  return results;
}
```

### 场景 2: 缓存距离计算

```typescript
async function getDistance(from, to) {
  const cacheKey = `dist:${from.lat},${from.lon}_${to.lat},${to.lon}`;
  
  let distance = await cache.get(cacheKey, CacheCategory.DISTANCE);
  if (distance !== null) {
    return distance;
  }
  
  distance = await mapAPI.calculateDistance(from, to);
  
  // 距离数据保存 7 天
  await cache.set(cacheKey, distance, 7 * 24 * 60 * 60, CacheCategory.DISTANCE);
  
  return distance;
}
```

### 场景 3: 缓存 LLM 响应

```typescript
async function getLLMRecommendation(preference) {
  const cacheKey = `llm:${JSON.stringify(preference)}`;
  
  let response = await cache.get(cacheKey, CacheCategory.LLM_RESPONSE);
  if (response) {
    return response;
  }
  
  response = await llmService.recommend(preference);
  
  // LLM 响应保存 24 小时
  await cache.set(cacheKey, response, 86400, CacheCategory.LLM_RESPONSE);
  
  return response;
}
```

### 场景 4: 用户会话缓存

```typescript
async function saveUserSession(userId, preferences) {
  const cacheKey = `session:${userId}`;
  
  // 会话缓存 2 小时
  await cache.set(
    cacheKey,
    {
      userId,
      preferences,
      timestamp: Date.now(),
    },
    2 * 60 * 60,
    CacheCategory.SESSION
  );
}

async function getUserSession(userId) {
  return await cache.get(`session:${userId}`, CacheCategory.SESSION);
}
```

---

## 去重和合并

### 自动去重示例

```typescript
import { Deduplicator } from '@/cache';

const locations = [
  { name: '公园 A', latitude: 22.5, longitude: 114.0 },
  { name: '公园 A', latitude: 22.5001, longitude: 114.0001 }, // 重复
  { name: '公园 B', latitude: 22.6, longitude: 114.1 },
];

// 去重
const deduped = Deduplicator.deduplicateLocations(locations);
console.log(`${locations.length} → ${deduped.length} 项`); // 3 → 2 项

// 合并信息
const merged = Deduplicator.mergeLocations(locations);
console.log(`合并后有更丰富的信息`);
```

### 相似度检测

```typescript
const similarity = Deduplicator.calculateStringSimilarity(
  '梧桐山', 
  '梧桐山风景区'
);
console.log(`相似度：${(similarity * 100).toFixed(1)}%`); // 85.7%
```

---

## 维护和清理

### 定期清理过期缓存

```typescript
// 手动清理
const result = await cache.cleanup();
console.log(`删除 ${result.deletedCount} 项，释放 ${result.freedSize} 字节`);

// 定期清理（每 6 小时）
setInterval(async () => {
  const result = await cache.cleanup();
  console.log(`缓存清理: ${result.deletedCount} 项`);
}, 6 * 60 * 60 * 1000);
```

### 清空所有缓存

```typescript
await cache.clear();
console.log('所有缓存已清空');
```

### 查看缓存报告

```typescript
console.log(cache.generateReport());
```

输出示例：
```
╔═════════════════════════════════════╗
║     缓存系统统计报告                ║
╚═════════════════════════════════════╝

总体统计:
  • 缓存数: 1234 项
  • 总大小: 5.2 MB
  • 已过期: 45 项
  • 有效率: 96.4%

...
```

---

## 高级用法

### 自定义过期策略

```typescript
import { ExpirationManager, CacheCategory } from '@/cache';

const manager = new ExpirationManager();

// 将 LOCATION 的 TTL 改为 14 天
manager.setPolicy(CacheCategory.LOCATION, 14 * 24 * 60 * 60);

// 获取某个分类的 TTL
const ttl = manager.getTTL(CacheCategory.LOCATION);
console.log(`LOCATION 的 TTL: ${ttl} 秒 (${(ttl / 86400).toFixed(1)} 天)`);
```

### 使用索引加速查询

```typescript
import { getCacheIndexStore } from '@/cache';

const indexStore = getCacheIndexStore();

// 索引地点
const locations = [
  { name: '梧桐山', latitude: 22.5429, longitude: 114.2165 },
  { name: '翠竹山', latitude: 22.5431, longitude: 114.0579 },
];
indexStore.indexLocations(locations);

// 关键词查询
const results = indexStore.queryByKeyword('山', 10);
console.log(`关键词 "山" 的结果: ${results.length} 项`);

// 地理范围查询
const nearby = indexStore.queryBySpatialBounds(22.5, 22.6, 113.9, 114.1);
console.log(`范围内的地点: ${nearby.length} 项`);

// 距离查询
const closest = indexStore.queryByDistance(22.55, 114.0, 5);
console.log(`最近的 5 个地点: ${closest.length} 项`);
```

---

## 性能优化建议

### 1. 合理设置 TTL

```typescript
// ❌ TTL 太短，命中率低
await cache.set(key, data, 60, CacheCategory.LOCATION); // 1 分钟

// ✓ 合理的 TTL
await cache.set(key, data, 86400, CacheCategory.LOCATION); // 1 天
```

### 2. 使用批量操作

```typescript
// ❌ 逐个设置，慢且容易重复
for (const loc of locations) {
  await cache.set(loc.name, loc);
}

// ✓ 批量设置，自动去重
await cache.setLocations(locations);
```

### 3. 预加载常用数据

```typescript
async function initializeCache() {
  // 启动时预加载常用景点
  const popularParks = await mapAPI.getPopularParks();
  await cache.setLocations(popularParks);
}

// 程序启动时调用
await initializeCache();
```

### 4. 定期清理

```typescript
// 定期清理过期数据
const cleanupInterval = setInterval(async () => {
  const result = await cache.cleanup();
  if (result.deletedCount > 0) {
    console.log(`清理了 ${result.deletedCount} 个过期项`);
  }
}, 6 * 60 * 60 * 1000); // 每 6 小时
```

---

## 调试技巧

### 查看缓存统计

```typescript
const stats = cache.getStats();

// 按分类查看统计
Object.entries(stats.byCategory).forEach(([category, stat]) => {
  const hitRate = (stat.hits / (stat.hits + stat.misses) * 100).toFixed(1);
  console.log(`${category}: 命中率 ${hitRate}% (${stat.hits} 命中)`);
});
```

### 监控缓存大小

```typescript
const stats = cache.getStats();
const sizeMB = stats.totalSize / (1024 * 1024);
if (sizeMB > 100) {
  console.warn(`缓存过大: ${sizeMB.toFixed(1)} MB，建议清理`);
  await cache.cleanup();
}
```

### 追踪缓存操作

```typescript
// 启用详细日志
logger.level = 'debug';

// 观察缓存命中情况
const data = await cache.get('key');
// 日志会显示: "内存缓存命中" 或 "磁盘缓存命中" 或未命中
```

---

## 常见错误

### ❌ 错误 1: 忘记 await

```typescript
// 错误：没有 await，缓存可能未完成
cache.set(key, data, ttl);

// 正确：等待缓存完成
await cache.set(key, data, ttl);
```

### ❌ 错误 2: 缓存键冲突

```typescript
// 错误：不同场景使用相同的键
cache.set('park', parkA);
cache.set('park', parkB); // 覆盖了

// 正确：使用有意义的键前缀
cache.set('park:search:keyword1', results1);
cache.set('park:search:keyword2', results2);
```

### ❌ 错误 3: 忽视 TTL

```typescript
// 错误：默认 24 小时可能太长
cache.set(key, llmResponse); // 使用默认 TTL

// 正确：为 LLM 响应设置合适的 TTL
cache.set(key, llmResponse, 3600, CacheCategory.LLM_RESPONSE); // 1 小时
```

---

## 更多资源

- 📖 **完整文档**: `CACHE_SYSTEM.md`
- 💡 **完整示例**: `examples/cache-example.ts`
- 🔗 **源代码**: `src/cache/`

## 获取帮助

遇到问题？

1. 查看日志输出
2. 运行示例代码
3. 查看详细文档
4. 检查 TypeScript 类型定义

---

**Happy caching! 🚀**
