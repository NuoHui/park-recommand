# 缓存策略快速参考

## 当前模式：按需缓存 ✅

```
用户查询
  ↓
查询缓存？
  ├─ 缓存命中 → 立即返回 (~50ms)
  └─ 缓存未命中 → 调用 API (~500ms) → 缓存结果 → 返回
```

## 关键配置

| 配置项 | 值 | 说明 |
|------|-----|------|
| 启动预热 | `false` | 禁用 |
| 后台更新 | `false` | 禁用 |
| 缓存 TTL | 24 小时 | 自动过期 |
| 并发限制 | 无 | 按需单个调用 |

## API 调用时机

| 场景 | 行为 |
|-----|------|
| 应用启动 | ❌ 不调用 API |
| 用户查询（首次） | ✅ 调用 API |
| 用户查询（重复） | ❌ 不调用 API（从缓存） |
| 后台 | ❌ 无后台任务 |

## 常用操作

### 获取缓存预热器
```typescript
import { getCacheWarmer } from '@/cache/warmer';

const warmer = getCacheWarmer();
```

### 清空缓存
```typescript
await warmer.clearWarmedCache();
console.log('缓存已清空');
```

### 查看缓存统计
```typescript
import { getLocationService } from '@/map/service';

const service = getLocationService();
const stats = service.getCacheStats();
console.log(`地点缓存: ${stats.locations}`);
console.log(`距离缓存: ${stats.distances}`);
```

### 调整缓存 TTL
```typescript
const warmer = getCacheWarmer({
  cacheTTL: 3600000  // 改为 1 小时
});
```

## 监控指标

### 启动时日志
```
CacheWarmer 已初始化（按需缓存模式）
```

### 查询时日志
```
// 首次查询
POI 搜索: keywords=公园, region=深圳
POI 搜索完成: 找到 20 个结果
查询结果已缓存

// 后续查询（相同内容）
从缓存返回结果
```

## 故障排除

### 症状：同一查询每次都调用 API
**原因：** 缓存键生成不一致或缓存过期  
**解决：** 检查 LocationService 中的缓存键生成逻辑

### 症状：缓存占用空间过大
**原因：** 用户查询了大量不同的内容  
**解决：** 定期清空缓存或减少 TTL
```typescript
await warmer.clearWarmedCache();
```

### 症状：需要立即更新某个景点的数据
**原因：** 缓存还未过期  
**解决：** 清空缓存后用户会触发新的 API 查询
```typescript
await warmer.clearWarmedCache();
// 用户下次查询时会调用新的 API
```

## 性能目标

| 指标 | 目标 | 当前 |
|-----|-----|-----|
| 应用启动时间 | <1s | ✅ |
| 首次查询响应 | <600ms | ✅ |
| 缓存查询响应 | <100ms | ✅ |
| API 调用频率 | 无速率限制 | ✅ |

## 与旧模式对比

### 启动时预热（已弃用）
```typescript
// 启动时立即调用 10 个 API
enableOnStartup: true
updateInterval: 3600000
```
❌ 会触发速率限制  
❌ 启动时间长 (3-5s)  
❌ API 调用量多

### 按需缓存（当前）
```typescript
// 启动时不调用 API
enableOnStartup: false
updateInterval: 0
```
✅ 不触发速率限制  
✅ 启动时间短 (<1s)  
✅ API 调用量最少

## 总结

✨ **系统采用按需缓存模式：**
- ✅ 用户查询时按需调用 API
- ✅ 自动缓存查询结果 24 小时
- ✅ 无启动时预热
- ✅ 无后台更新任务
- ✅ 快速应用启动
- ✅ 不触发 API 速率限制
