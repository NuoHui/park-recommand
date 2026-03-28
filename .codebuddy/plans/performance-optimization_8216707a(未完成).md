---
name: performance-optimization
overview: 实现异步处理优化、缓存预热、API批量查询，全面提升系统响应速度，目标< 1.8s
todos:
  - id: perf-queue-system
    content: 实现请求队列管理系统（优先级队列、去重、并发控制）
    status: pending
  - id: perf-cache-warmer
    content: 实现缓存预热器（启动加载 10+ 热门景点、后台定时更新）
    status: pending
    dependencies:
      - perf-queue-system
  - id: perf-batch-optimizer
    content: 实现 API 批量查询优化器（地图批距离、LLM 队列、流式响应）
    status: pending
    dependencies:
      - perf-queue-system
  - id: perf-metrics-collector
    content: 实现性能监控和指标收集模块（延迟、吞吐量、命中率）
    status: pending
    dependencies:
      - perf-queue-system
  - id: perf-integrate-map
    content: 集成批量查询到地图服务（替换距离计算逻辑）
    status: pending
    dependencies:
      - perf-batch-optimizer
  - id: perf-integrate-dialogue
    content: 集成流式响应和性能监控到对话管理（推荐流程优化）
    status: pending
    dependencies:
      - perf-queue-system
      - perf-batch-optimizer
  - id: perf-integrate-llm
    content: 集成 LLM 队列管理到 LLM 引擎（请求去重和优先级）
    status: pending
    dependencies:
      - perf-batch-optimizer
  - id: perf-testing-benchmark
    content: 编写性能测试和基准测试（验证 1.8s 目标、缓存命中率 85%+）
    status: pending
    dependencies:
      - perf-integrate-map
      - perf-integrate-dialogue
      - perf-integrate-llm
  - id: perf-documentation
    content: 生成性能优化文档、性能报告、最佳实践指南
    status: pending
    dependencies:
      - perf-testing-benchmark
---

## 用户需求

实现性能优化模块，通过三项核心功能提升系统响应速度：

1. **异步处理优化**

- 实现请求队列和并发控制机制，防止 API 过载
- 添加全局超时控制和错误恢复策略
- 使用 Promise.allSettled 进行容错并发处理
- 目标：支持 10+ 并发请求，单次超时 < 30s

2. **缓存预热机制**

- 系统启动时预加载深圳常见景点元数据（10+ 热门景点）
- 支持用户历史查询数据的复用
- 智能缓存键生成和查询优化
- 目标：首次冷启动 < 2s，命中率 > 85%

3. **API 批量查询优化**

- 地图 API 批量距离计算（单次 ≤ 10 个地点）
- LLM 请求队列管理（优先级队列、超时重试）
- 响应结果流式返回给用户
- 目标：推荐流程总耗时 < 1.8s（相比当前 ~3s）

## 核心指标目标

| 指标 | 当前 | 目标 | 改进 |
| --- | --- | --- | --- |
| 推荐流程耗时 | ~3.0s | < 1.8s | ↓40% |
| 缓存命中率 | ~60% | > 85% | ↑25% |
| 冷启动时间 | - | < 2.0s | ✓新增 |
| 并发支持 | 1 | 10+ | ✓新增 |
| 错误恢复率 | 70% | > 95% | ↑25% |


## 交付物

1. 请求队列管理器（请求去重、优先级、超时）
2. 缓存预热器（启动加载、后台更新）
3. API 批量查询优化器（距离计算、LLM 队列）
4. 性能监控和指标收集模块
5. 完整的性能测试报告和优化文档

## 技术栈选择

基于当前项目实现，采用以下技术方案：

### 核心技术

- **请求管理**: 自实现队列系统（优先级队列、去重、超时）+ 内置 Promise 处理
- **缓存预热**: 应用启动钩子 + 后台定时任务 + 增量更新
- **并发控制**: Promise.all/allSettled + 信号量模式（Semaphore）
- **性能追踪**: 自实现指标收集器（延迟、吞吐量、缓存命中率）
- **流式返回**: 异步生成器（async generator）+ 渐进式输出

## 实现方案

### 方案 1: 请求队列管理器

**设计目标**:

- 支持请求去重（相同参数合并）
- 优先级队列（用户交互 > 预加载）
- 自动超时和重试机制
- 并发数限制（最多 N 个并发请求）

**核心组件**:

```
RequestQueueManager
├── PriorityQueue (优先级队列)
├── RequestDeduplicator (请求去重)
├── ConcurrencyController (并发控制 - Semaphore)
├── TimeoutHandler (超时和重试)
└── MetricsCollector (性能指标)
```

**关键特性**:

- 使用优先级队列（PriorityQueue）管理待处理请求
- Semaphore 模式限制并发数
- 请求指纹（fingerprint）去重
- 指数退避重试策略
- 自动超时恢复和降级

**性能提升**:

- 并发处理 10+ 请求：响应时间从串行 30s 降至并行 3s（↓90%）
- 请求去重：减少 30-40% 的重复 API 调用

---

### 方案 2: 缓存预热器

**设计目标**:

- 启动时加载 10+ 深圳常见景点
- 后台定期更新缓存
- 支持用户历史查询的缓存复用

**核心组件**:

```
CacheWarmer
├── HotspotLoader (加载热门景点)
├── PreloadScheduler (后台定时任务)
├── IncrementalUpdater (增量更新)
└── CacheValidator (缓存有效性检查)
```

**预热策略**:

1. **启动预热** (冷启动): 加载 10 个热门景点 + 常见距离计算 (~1.5s)
2. **后台预热** (运行中): 每 5 分钟更新一次热门数据
3. **用户历史** (智能学习): 缓存用户近期查询结果

**热门景点列表** (初始化):

- 梧桐山风景区、南山公园、莲花山公园、翠竹山公园
- 东湖公园、荔枝公园、香蜜公园、中心公园
- 深圳湾公园、福田红树林生态保护区 (共 10 个)

**性能提升**:

- 冷启动时间: ~2s（相比之前的 API 查询 ~1.5s）
- 缓存命中率从 60% 提升到 85%+
- 热查询响应时间 < 50ms

---

### 方案 3: API 批量查询优化器

**设计目标**:

- 地图 API 批量距离计算（减少 API 调用数）
- LLM 请求队列优化（去重、合并）
- 响应流式返回（渐进式输出推荐结果）

**核心组件**:

```
BatchQueryOptimizer
├── MapApiBatchProcessor (地图 API 批量处理)
├── LLMQueueManager (LLM 请求队列)
├── StreamingResponseBuilder (流式响应)
└── AdaptiveCoalescing (请求合并)
```

**具体优化**:

1. **地图 API 批量处理**:

- 将多个距离计算合并到一个 API 调用（max 10 个）
- 使用已有的 `calculateDistanceBatch()` 优化
- 请求缓存命中时直接返回，避免 API 调用
- 批次处理间隔 50ms（平衡吞吐量和延迟）

2. **LLM 请求队列**:

- 相同用户偏好的请求去重合并
- 优先级区分（用户交互 vs 预加载）
- 单个 LLM 调用最多 500ms 超时
- 失败自动降级到缓存或默认推荐

3. **流式响应** (async generator):

- 第一条推荐：100ms 内返回（快速反馈）
- 后续推荐：每 100-200ms 返回一条
- 用户可逐步看到推荐结果

**性能提升**:

- 地图 API 调用数 ↓60% (从 25 个并行调用降至 3 个批次)
- 推荐流程总耗时 ↓40% (从 3.0s → 1.8s)
- LLM 请求响应时间稳定 < 30s

---

## 架构设计

```
┌─────────────────────────────────────────────────────┐
│            应用启动 (Initialize)                    │
├─────────────────────────────────────────────────────┤
│  1. 创建 RequestQueueManager (并发控制)            │
│  2. 启动 CacheWarmer (预热热门景点)                │
│  3. 初始化 MetricsCollector (性能监控)             │
│  4. 启动后台定时任务 (增量更新)                    │
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│            用户推荐请求流程 (Optimized)             │
├─────────────────────────────────────────────────────┤
│  1. 请求入队 (RequestQueueManager)                 │
│     ├─ 去重检查 (已有相同请求)                     │
│     ├─ 优先级分配                                  │
│     └─ 超时设置 (30s)                              │
│                                                    │
│  2. 缓存检查 (CacheManager)                        │
│     ├─ 内存缓存 (快)                               │
│     ├─ 磁盘缓存 (中)                               │
│     └─ 缓存预热数据                                │
│                                                    │
│  3. 并发处理 (Semaphore)                           │
│     ├─ 地图查询 (BatchQueryOptimizer)              │
│     ├─ LLM 调用 (QueueManager)                     │
│     └─ 距离计算 (批量优化)                         │
│                                                    │
│  4. 流式返回 (AsyncGenerator)                      │
│     ├─ 第一条 < 100ms                              │
│     ├─ 后续 < 200ms/条                             │
│     └─ 总耗时 < 1.8s                               │
│                                                    │
│  5. 指标收集 (MetricsCollector)                    │
│     ├─ 响应时间                                    │
│     ├─ 缓存命中率                                  │
│     ├─ API 调用数                                  │
│     └─ 错误率                                      │
└─────────────────────────────────────────────────────┘
```

## 文件结构和集成点

```
src/
├── performance/                      # 新增性能优化模块
│   ├── queue/
│   │   ├── types.ts               # 队列相关类型定义
│   │   ├── priority-queue.ts       # 优先级队列实现
│   │   ├── deduplicator.ts         # 请求去重器
│   │   ├── request-queue.ts        # 请求队列管理器
│   │   └── index.ts                # 导出
│   ├── concurrency/
│   │   ├── semaphore.ts            # 并发控制（信号量）
│   │   ├── timeout-handler.ts      # 超时和重试管理
│   │   └── index.ts                # 导出
│   ├── cache-warmer/
│   │   ├── types.ts                # 预热相关类型
│   │   ├── warmup.ts               # 缓存预热实现
│   │   ├── scheduler.ts            # 后台任务调度器
│   │   └── index.ts                # 导出
│   ├── batch-optimizer/
│   │   ├── map-batch.ts            # 地图 API 批处理
│   │   ├── llm-queue.ts            # LLM 队列管理
│   │   ├── streaming.ts            # 流式响应
│   │   └── index.ts                # 导出
│   ├── metrics/
│   │   ├── collector.ts            # 性能指标收集器
│   │   ├── reporter.ts             # 性能报告生成器
│   │   └── index.ts                # 导出
│   └── index.ts                    # 性能模块总导出
│
├── map/
│   └── service.ts                  # 修改：集成 BatchQueryOptimizer
├── llm/
│   └── engine.ts                   # 修改：集成 LLMQueueManager
├── cache/
│   └── manager.ts                  # 修改：集成 CacheWarmer
├── dialogue/
│   └── manager.ts                  # 修改：集成流式响应
│
└── index.ts                        # 修改：初始化性能优化系统
```

## 集成要点

### 1. 应用启动时（src/index.ts）

```typescript
- 初始化 RequestQueueManager
- 启动 CacheWarmer 预热热门数据
- 启动后台定时任务（MetricsReporter）
```

### 2. 推荐流程修改（dialogue/manager.ts）

```typescript
- 推荐请求进入 RequestQueueManager
- 使用流式响应替代阻塞式等待
- 收集性能指标到 MetricsCollector
```

### 3. 地图服务修改（map/service.ts）

```typescript
- 使用 BatchQueryOptimizer.batchDistance() 替代单个距离计算
- 保持现有 calculateDistanceBatch() 兼容
```

### 4. LLM 调用修改（llm/engine.ts）

```typescript
- 将 LLM 调用纳入 LLMQueueManager
- 支持请求去重和优先级排序
```

## 性能指标说明

| 指标 | 说明 | 现有值 | 目标值 | 测量方法 |
| --- | --- | --- | --- | --- |
| 推荐流程耗时 (p50) | 中位数响应时间 | ~3.0s | < 1.8s | Date.now() 计时 |
| 推荐流程耗时 (p99) | 99分位数响应时间 | ~5.0s | < 3.0s | 性能分布统计 |
| 缓存命中率 | 缓存命中 / 总请求 | ~60% | > 85% | CacheManager 统计 |
| 冷启动时间 | 应用启动到首个推荐 | - | < 2.0s | 启动计时 |
| API 调用数 | 单次推荐的 API 调用总数 | ~25 | < 10 | RequestQueueManager 计数 |
| 并发支持 | 同时处理的请求数 | 1 | 10+ | Semaphore 容量 |
| 错误恢复率 | 失败请求的恢复成功率 | ~70% | > 95% | 重试统计 |


## 实现风险和应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 预热数据过期 | 推荐质量下降 | 后台定时更新 (5min) |
| 缓存内存溢出 | 应用崩溃 | LRU 淘汰策略 + 大小限制 (100MB) |
| API 限流 | 请求被拒 | 批处理 + 退避重试 |
| 并发争竞 | 死锁或数据不一致 | 使用 Map/Set 的原子性 + 无锁设计 |
| 流式响应中断 | 用户不完整 | 每条推荐记录状态，支持重连 |