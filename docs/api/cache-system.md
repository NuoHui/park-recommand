# 缓存系统 API

## 概述

缓存系统采用两层缓存设计，包括内存缓存和磁盘缓存，旨在减少 API 调用，提升应用性能。

## 架构

```
请求 → 内存缓存 → 磁盘缓存 → API 调用 → 结果存储
  │                 │         │          │
  └─ 命中 ─ 返回    │         │          │
                    └─ 命中 ─ 返回      │
                                  │
                                  ▼
                            更新内存和磁盘缓存
```

## 使用方法

### 初始化缓存管理器

```typescript
import CacheManager from './cache/manager';

const cache = new CacheManager({
  enabledMemory: true,      // 启用内存缓存
  enabledDisk: true,        // 启用磁盘缓存
  ttl: 3600,                // 缓存过期时间（秒）
  maxSize: 100,             // 最大缓存条数
  cacheDir: '.cache',       // 缓存目录
});
```

### 基础操作

#### 获取缓存数据

```typescript
// 方式 1: 同步获取（仅内存缓存）
const data = cache.getSync(key);

// 方式 2: 异步获取（内存 + 磁盘）
const data = await cache.get(key);

// 方式 3: 获取并回源（缓存未命中时调用回源函数）
const data = await cache.get(key, async () => {
  return await fetchFromAPI();
});
```

#### 设置缓存数据

```typescript
// 方式 1: 使用全局 TTL
await cache.set(key, value);

// 方式 2: 指定自定义 TTL
await cache.set(key, value, { ttl: 7200 });

// 方式 3: 永不过期
await cache.set(key, value, { ttl: -1 });
```

#### 删除缓存数据

```typescript
// 删除单个键
await cache.delete(key);

// 删除多个键
await cache.delete([key1, key2, key3]);

// 清空所有缓存
await cache.clear();
```

#### 检查缓存

```typescript
// 检查键是否存在
const exists = cache.has(key);

// 获取缓存统计信息
const stats = cache.getStats();
// {
//   memorySize: 42,           // 内存缓存条数
//   diskSize: 158,            // 磁盘缓存条数
//   hits: 1234,               // 缓存命中次数
//   misses: 456,              // 缓存未命中次数
//   hitRate: 0.73,            // 命中率
// }
```

## 缓存策略

### 内存缓存

- **存储介质**: 应用内存
- **容量**: 配置的 `maxSize`（默认 100）
- **淘汰策略**: LRU（最近最少使用）
- **特点**: 快速、容量小、重启后丢失

### 磁盘缓存

- **存储介质**: 本地文件系统
- **容量**: 无限制（受磁盘大小限制）
- **文件格式**: JSON
- **位置**: `.cache/` 目录（可配置）
- **特点**: 持久化、速度慢、重启后保留

### 缓存键生成

缓存键应该能够唯一标识数据：

```typescript
// 地点搜索缓存键
const key = `location:search:${keywords}:${city}`;

// 距离计算缓存键
const key = `distance:${fromLat},${fromLng}:${toLat},${toLng}`;

// LLM 响应缓存键
const key = `llm:${modelName}:${hashedPrompt}`;
```

## 高级用法

### 批量获取

```typescript
// 获取多个键的数据
const keys = ['key1', 'key2', 'key3'];
const results = await Promise.all(
  keys.map(key => cache.get(key))
);
```

### 条件更新

```typescript
// 只有在缓存不存在或过期时才调用 API
const data = await cache.get(key, async () => {
  const result = await API.fetch();
  return result;
});
```

### 缓存预热

```typescript
// 启动时预加载热门数据
async function warmCache() {
  const hotspots = [
    { name: '梧桐山', city: '深圳' },
    { name: '翠竹山', city: '深圳' },
  ];

  for (const spot of hotspots) {
    const key = `location:${spot.name}:${spot.city}`;
    const data = await API.fetchLocation(spot);
    await cache.set(key, data, { ttl: 86400 }); // 缓存 24 小时
  }
}
```

### 手动过期管理

```typescript
// 清理过期缓存
await cache.cleanup();

// 清理特定前缀的缓存
await cache.clearByPrefix('location:');

// 清理内存缓存中的过期数据
cache.trimMemory();
```

## 性能优化建议

### 1. 合理设置 TTL

```typescript
// 不经常变化的数据，TTL 设置较长
const parkData = await cache.get(parkKey, fetchPark, { ttl: 86400 }); // 24 小时

// 实时性强的数据，TTL 设置较短
const weatherData = await cache.get(weatherKey, fetchWeather, { ttl: 300 }); // 5 分钟
```

### 2. 使用合适的缓存键

```typescript
// ✅ 好的缓存键（完整唯一）
const key = `user:${userId}:preferences:${category}`;

// ❌ 不好的缓存键（太通用或重复）
const key = 'user';  // 太通用
const key = 'data';  // 冲突风险高
```

### 3. 批量操作

```typescript
// ✅ 好的做法（批量操作）
const locations = await Promise.all(
  parkNames.map(name => cache.get(`park:${name}`))
);

// ❌ 不好的做法（串行操作）
for (const name of parkNames) {
  const data = await cache.get(`park:${name}`);
  locations.push(data);
}
```

### 4. 错误处理

```typescript
// 缓存 API 请求，包含错误处理
const data = await cache.get(key, async () => {
  try {
    return await API.fetch();
  } catch (error) {
    logger.error('API fetch failed', error);
    // 可以返回默认值或抛出错误
    throw error;
  }
});
```

## 缓存键命名约定

建议使用以下命名格式：

```
{module}:{operation}:{params}

示例:
- location:search:梧桐山:深圳
- distance:39.92,116.41:40.12,116.50
- park:details:pt_1234567
- llm:recommendation:hash_xyz
```

## 配置参考

```typescript
interface CacheConfig {
  // 缓存使能开关
  enabledMemory?: boolean;      // 默认 true
  enabledDisk?: boolean;        // 默认 true

  // 过期时间配置
  ttl?: number;                 // 默认 3600（秒）
  checkPeriod?: number;         // 默认 600（秒）

  // 内存缓存配置
  maxSize?: number;             // 默认 100（条）
  memoryStrategy?: 'lru';       // 默认 LRU

  // 磁盘缓存配置
  cacheDir?: string;            // 默认 '.cache'
  maxDiskSize?: number;         // 默认 1GB

  // 其他配置
  enableStats?: boolean;        // 默认 true（收集统计信息）
  encoding?: string;            // 默认 'utf8'
}
```

## 常见问题

### Q: 缓存数据如何同步？

**A**: 内存缓存是应用级别的，不会在多个进程间同步。磁盘缓存可以在多个进程间共享，但需要注意并发访问。

### Q: 如何清理所有缓存？

**A**:
```typescript
// 清理内存缓存
cache.clear();

// 清理磁盘缓存
const fs = require('fs').promises;
await fs.rm('.cache', { recursive: true });
```

### Q: 缓存会占用多少磁盘空间？

**A**: 取决于缓存的数据量和格式。JSON 格式通常比二进制格式占用更多空间。可以定期清理过期数据来控制大小。

### Q: 如何监控缓存性能？

**A**:
```typescript
const stats = cache.getStats();
console.log(`缓存命中率: ${(stats.hitRate * 100).toFixed(2)}%`);
console.log(`内存缓存条数: ${stats.memorySize}`);
console.log(`磁盘缓存条数: ${stats.diskSize}`);
```

## 下一步

- [结果解析 API](./result-parser.md) - 了解结果解析
- [日志系统 API](./logging.md) - 了解日志系统
- [代码结构](../development/code-structure.md) - 了解代码组织
