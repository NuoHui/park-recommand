# 按需缓存（延迟加载）模式

## 概述

系统已从**启动时预热**改为**按需缓存**模式。

### 工作流程
```
用户查询
  ↓
检查缓存 (Cache Hit?)
  ├─ 是 → 返回缓存结果 ✅ 快速
  └─ 否 → 调用 API (单个请求)
         ↓
       缓存结果
         ↓
       返回结果给用户
         ↓
     下次查询时直接从缓存返回 ✅
```

## 改动总结

### 修改前（启动时预热）
```typescript
// 启动时立即发起 10 个并发请求
CacheWarmer 初始化
  ↓
同时调用 10 个 searchRecommendedLocations()
  ↓
可能触发速率限制 (QPS 限制) ❌
  ↓
缓存预热完成后启动应用
```

**问题：** 触发 API 速率限制 (错误 10021)

### 修改后（按需缓存）
```typescript
// 启动时不调用 API
CacheWarmer 初始化
  ↓
应用启动 (无 API 调用) ✅ 快速启动
  ↓
用户查询时才调用 API (单个请求)
  ↓
结果自动缓存
  ↓
下次查询同一内容时从缓存返回 ✅ 快速响应
```

**优点：** 无速率限制，快速启动，首次查询后高效缓存

## 文件改动

### `src/cache/warmer.ts`

**关键改变：**

1. ✅ 禁用启动预热
```typescript
enableOnStartup: false  // 从 true 改为 false
```

2. ✅ 禁用后台更新
```typescript
updateInterval: 0  // 从 3600000 改为 0
```

3. ✅ 移除预热逻辑
```typescript
// 移除 warmCache() 和 startBackgroundUpdate() 方法
// 改为按需缓存辅助方法
```

4. ✅ 更新初始化日志
```typescript
logger.info('CacheWarmer 已初始化（按需缓存模式）', {
  mode: '按需缓存',
  description: '用户查询时调用 API 并缓存'
});
```

## 性能对比

| 指标 | 启动时预热 | 按需缓存 |
|-----|----------|--------|
| **启动时 API 调用** | 10 个并发 | 0 个 |
| **速率限制** | ❌ 容易触发 | ✅ 不会触发 |
| **启动时间** | ~3-5s（含预热） | <1s（快速） |
| **首次查询** | 立即返回（缓存） | ~500ms（API调用） |
| **后续查询** | 立即返回（缓存） | 立即返回（缓存） |
| **API 调用总数** | 10 + 用户查询 | 仅用户查询 |

## 缓存配置

### 缓存过期时间
```typescript
cacheTTL: 86400000  // 24 小时
```

修改缓存过期时间：
```typescript
const warmer = getCacheWarmer({
  cacheTTL: 3600000  // 改为 1 小时
});
```

## 使用示例

### 用户进行第一次查询
```typescript
// 第一次查询 - 调用 API
const results = await locationService.searchRecommendedLocations({
  location: '公园',
  // ...
});
// 结果自动缓存
// 返回结果给用户
```

### 后续相同查询
```typescript
// 后续查询 - 从缓存返回（无 API 调用）
const results = await locationService.searchRecommendedLocations({
  location: '公园',
  // ...
});
// 直接从缓存返回，速度快
// 无 API 调用
```

## 缓存清空

需要手动清空缓存时：
```typescript
const warmer = getCacheWarmer();
await warmer.clearWarmedCache();
logger.info('已清空所有缓存');
```

## 常见问题

### Q: 如何获取热门景点列表？
**A:** 热门景点列表现在仅用作备用数据。用户通过查询时的搜索关键词动态获取结果，系统会自动缓存这些结果。

### Q: 数据多久更新一次？
**A:** 数据在用户第一次查询后缓存 24 小时。24 小时后缓存过期，下次查询时会调用新的 API。

### Q: 能否手动更新某个景点的缓存？
**A:** 需要手动调用 API 并更新缓存：
```typescript
const results = await locationService.searchRecommendedLocations({
  location: '景点名称'
});
// 这会自动更新缓存
```

### Q: 如何检查缓存统计？
**A:** 使用 LocationService 的缓存统计方法：
```typescript
const stats = locationService.getCacheStats();
console.log(`地点缓存: ${stats.locations}`);
console.log(`距离缓存: ${stats.distances}`);
```

## 监控日志

### 启动时日志
```
INFO: CacheWarmer 已初始化（按需缓存模式）
  mode: 按需缓存
  cacheTTL: 86400000
  description: 用户查询时调用 API 并缓存
```

### 查询时日志
```
DEBUG: POI 搜索: keywords=公园, region=深圳
DEBUG: POI 搜索完成: 找到 20 个结果
DEBUG: 查询结果已缓存
```

### 缓存命中日志
```
DEBUG: 从缓存返回结果
```

## 总结

✅ **按需缓存的优势：**
- 不触发 API 速率限制
- 快速应用启动 (<1s)
- 首次查询后高效缓存
- 用户体验一致

✅ **改动已完成：**
- 禁用启动预热
- 禁用后台更新
- 移除批量 API 调用
- 启用按需缓存模式

🚀 **系统现已采用按需缓存模式运行！**
