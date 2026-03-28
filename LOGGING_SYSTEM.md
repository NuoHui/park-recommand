# 日志系统技术文档

## 概述

本项目实现了一个完整的企业级日志系统，基于 Winston 日志库，提供以下核心功能：

- ✅ **多级别日志记录** (ERROR, WARN, INFO, DEBUG, VERBOSE)
- ✅ **灵活的输出配置** (控制台、文件、综合输出)
- ✅ **上下文管理** (会话、操作、模块追踪)
- ✅ **性能监控** (计时、指标、统计)
- ✅ **错误追踪** (异常收集、分类统计)
- ✅ **中间件集成** (API、缓存、对话、性能)
- ✅ **预设配置** (开发、生产、测试、调试模式)

## 架构设计

### 核心组件

```
┌─────────────────────────────────────────┐
│         日志系统架构图                   │
└─────────────────────────────────────────┘

┌──────────────────────────┐
│   应用代码               │
└──────────────┬───────────┘
               │
       ┌───────▼────────────────────────┐
       │   日志 API 接口 (ILogger)       │
       │  - error/warn/info/debug        │
       │  - metric/startTimer            │
       │  - setContext/clearContext      │
       └───────┬────────────────────────┘
               │
       ┌───────▼──────────────────────────┐
       │    Logger 实现 (Winston)         │
       │  - 日志级别管理                  │
       │  - 日志格式化                    │
       │  - 统计收集                      │
       └───────┬──────────────────────────┘
               │
       ┌───────┴──────────────┬──────────┐
       │                      │          │
  ┌────▼─────┐        ┌──────▼──┐  ┌───▼───┐
  │ 控制台    │        │ 错误文件 │  │综合文件│
  │ Transport│        │Transport │  │Trans.  │
  └──────────┘        └──────────┘  └────────┘

┌──────────────────────────────────────────┐
│      中间件层 (LoggingSystem)             │
├──────────────────────────────────────────┤
│ • API 日志中间件                          │
│ • 缓存日志中间件                          │
│ • 对话日志中间件                          │
│ • 性能监控中间件                          │
│ • 错误追踪中间件                          │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│      上下文管理 (LogContextManager)       │
├──────────────────────────────────────────┤
│ • 上下文创建/删除                         │
│ • 会话追踪                                │
│ • 操作 ID 管理                            │
│ • 异步上下文绑定                          │
└──────────────────────────────────────────┘
```

### 文件结构

```
src/logger/
├── types.ts           - 类型定义 (44 行)
│   ├── LogLevel enum
│   ├── LoggerConfig interface
│   ├── LogContext interface
│   ├── ILogger interface
│   └── ...
├── logger.ts          - Logger 核心实现 (350+ 行)
│   ├── Logger class
│   ├── getLogger() function
│   └── Winston 集成
├── config.ts          - 配置管理 (280+ 行)
│   ├── LOGGER_PRESETS
│   ├── getConfigFromEnv()
│   └── LoggerConfigManager
├── context.ts         - 上下文管理 (250+ 行)
│   ├── LogContextManager
│   ├── withContext()
│   └── createContextDecorator()
├── middleware.ts      - 中间件实现 (350+ 行)
│   ├── createApiLoggingMiddleware()
│   ├── createCacheLoggingMiddleware()
│   ├── createDialogueLoggingMiddleware()
│   ├── createPerformanceMonitorMiddleware()
│   ├── createErrorTrackingMiddleware()
│   └── LoggingSystem 集成类
└── index.ts           - 模块导出 (40 行)
```

## 核心 API

### 1. Logger 接口 (ILogger)

```typescript
interface ILogger {
  error(message: string, options?: LogOptions): void;
  warn(message: string, options?: LogOptions): void;
  info(message: string, options?: LogOptions): void;
  debug(message: string, options?: LogOptions): void;
  verbose(message: string, options?: LogOptions): void;
  metric(name: string, value: number, context?: LogContext): void;
  startTimer(label: string): () => void;
  setContext(context: LogContext): void;
  clearContext(): void;
  getWinstonLogger(): WinstonLogger;
  close(): Promise<void>;
}
```

### 2. 日志级别

```typescript
enum LogLevel {
  ERROR = 'error',       // 错误 - 系统错误、异常
  WARN = 'warn',         // 警告 - 潜在问题、不寻常情况
  INFO = 'info',         // 信息 - 重要事件、业务流程
  DEBUG = 'debug',       // 调试 - 诊断信息、开发调试
  VERBOSE = 'verbose',   // 详细 - 最详细的调试信息
}
```

### 3. 配置预设

```typescript
// 开发环境
LOGGER_PRESETS.development = {
  level: LogLevel.DEBUG,
  colorize: true,
  console: true,
  file: false,
};

// 生产环境
LOGGER_PRESETS.production = {
  level: LogLevel.INFO,
  colorize: false,
  console: true,
  file: true,
  maxFileSize: 10485760,
  maxFiles: 20,
};

// 测试环境
LOGGER_PRESETS.test = {
  level: LogLevel.WARN,
  console: false,
  file: false,
};

// 调试模式
LOGGER_PRESETS.debug = {
  level: LogLevel.VERBOSE,
  colorize: true,
  console: true,
  file: true,
};
```

## 使用指南

### 基础用法

```typescript
import { getLogger } from '@/logger';

const logger = getLogger();

// 记录不同级别的日志
logger.error('发生错误');
logger.warn('发生警告');
logger.info('重要信息');
logger.debug('调试信息');

// 记录错误对象
try {
  // some code
} catch (error) {
  logger.error('操作失败', {
    error: error as Error,
    data: { operationId: 'op_123' },
  });
}
```

### 性能计时

```typescript
const logger = getLogger();

// 启动计时器
const stopTimer = logger.startTimer('api_call');

// 执行操作
await someAsyncOperation();

// 结束计时器，自动记录性能指标
stopTimer();

// 或者获取耗时
const duration = stopTimer(); // 返回毫秒数
```

### 上下文管理

```typescript
import { getLogger, LogContextManager } from '@/logger';

const logger = getLogger();
const contextManager = LogContextManager.getInstance();

// 创建上下文
const contextId = contextManager.createContext({
  module: 'api_service',
  operationId: 'op_123',
  sessionId: 'session_456',
  tags: ['user_request'],
});

// 设置当前上下文
contextManager.setCurrentContext(contextId);

// 后续日志自动包含上下文信息
logger.info('执行操作');
// 输出: [时间] [INFO] [op_123] [api_service] 执行操作

// 清除上下文
contextManager.deleteContext(contextId);
```

### 异步操作上下文

```typescript
import { withContext } from '@/logger';

// 在异步函数中自动管理上下文
const result = await withContext(
  {
    module: 'recommendation',
    tags: ['recommendation_engine'],
  },
  async (contextId) => {
    logger.info('生成推荐');
    // 执行推荐逻辑
    return recommendations;
  }
);
// 函数结束后自动清除上下文
```

### 性能指标

```typescript
const logger = getLogger();

// 记录性能指标
logger.metric('api_response_time', 125); // ms
logger.metric('cache_hit_rate', 0.85);   // 百分比
logger.metric('db_connections', 5);      // 连接数

// 获取指标统计
const stats = logger.getStatistics();
console.log(stats);
// {
//   byLevel: { error: 5, warn: 12, info: 45, debug: 120 },
//   byModule: { api: 50, db: 40, cache: 30 },
//   errors: 5,
//   warnings: 12,
//   total: 182,
//   period: { start: 1699123456789, end: 1699123589456 }
// }

// 获取特定指标的统计
const responseTimeStats = logger.getMetricStats('api_response_time');
// { count: 10, min: 50, max: 250, avg: 120 }
```

### 完整的日志系统集成

```typescript
import { getLoggingSystem } from '@/logger';

const loggingSystem = getLoggingSystem();

// 获取各个中间件
const apiMiddleware = loggingSystem.getApiMiddleware();
const cacheMiddleware = loggingSystem.getCacheMiddleware();
const dialogueLogger = loggingSystem.getDialogueMiddleware();
const perfMonitor = loggingSystem.getPerformanceMiddleware();
const errorTracker = loggingSystem.getErrorMiddleware();

// 记录系统启动
loggingSystem.logSystemStart('1.0.0');

// 使用各个中间件...

// 生成系统报告
console.log(loggingSystem.generateReport());
```

## 中间件使用

### API 日志中间件

```typescript
const apiMiddleware = loggingSystem.getApiMiddleware();

// 自动记录 API 调用时间和错误
const result = await apiMiddleware(
  async () => {
    // 执行 API 调用
    return await mapService.searchLocations(query);
  },
  {
    name: 'map_search',
    context: { module: 'map_service' },
  }
);
```

### 缓存日志中间件

```typescript
const cacheMiddleware = loggingSystem.getCacheMiddleware();

// 自动记录缓存命中/未命中
const data = await cacheMiddleware(
  async () => {
    return await cache.get(key);
  },
  {
    key: 'location_123',
  }
);
```

### 对话日志中间件

```typescript
const dialogueLogger = loggingSystem.getDialogueMiddleware();

// 记录用户输入
dialogueLogger.logUserInput('推荐爬山景点', {
  sessionId: 'session_123',
});

// 记录 LLM 请求
dialogueLogger.logLlmRequest(prompt, {
  sessionId: 'session_123',
});

// 记录 LLM 响应
dialogueLogger.logLlmResponse(response, {
  sessionId: 'session_123',
});

// 记录推荐结果
dialogueLogger.logRecommendation('深圳市', 3, {
  sessionId: 'session_123',
});

// 记录错误
dialogueLogger.logError('llm_call', error, {
  sessionId: 'session_123',
});
```

### 性能监控中间件

```typescript
const perfMonitor = loggingSystem.getPerformanceMiddleware();

// 追踪操作性能
await perfMonitor.track('database_query', async () => {
  return await db.query(sql);
});

// 获取性能指标
const metrics = perfMonitor.getMetrics();
// {
//   database_query: {
//     count: 10,
//     avgTime: 125,
//     totalTime: 1250
//   },
//   api_call: { ... }
// }

// 重置指标
perfMonitor.reset();
```

### 错误追踪中间件

```typescript
const errorTracker = loggingSystem.getErrorMiddleware();

// 追踪错误
try {
  // some code
} catch (error) {
  errorTracker.trackError(error as Error, {
    module: 'api_service',
    tags: ['network_error'],
  });
}

// 获取所有错误
const allErrors = errorTracker.getErrors();

// 获取特定类型的错误
const networkErrors = errorTracker.getErrors((err) =>
  err.message.includes('network')
);

// 获取错误统计
const stats = errorTracker.getErrorStats();
// { Error: 5, TypeError: 2, ReferenceError: 1 }

// 清除错误日志
errorTracker.clear();
```

## 环境变量配置

日志系统支持通过环境变量进行配置：

```bash
# 日志级别 (error, warn, info, debug, verbose)
LOG_LEVEL=debug

# 是否启用日志
LOG_ENABLED=true

# 是否启用颜色输出
LOG_COLORIZE=true

# 是否输出到控制台
LOG_CONSOLE=true

# 是否输出到文件
LOG_FILE=true

# 日志目录
LOG_DIR=./logs

# 日志格式 (json, text, combine)
LOG_FORMAT=combine

# 是否包含时间戳
LOG_TIMESTAMP=true

# 是否包含堆栈跟踪
LOG_STACK=true

# 日志文件最大大小（字节）
LOG_MAX_SIZE=5242880

# 日志文件最大保留数
LOG_MAX_FILES=10
```

## 日志输出示例

### 控制台输出 (开发环境)

```
[2024-01-15 10:30:45] [INFO] [op_a1b2c3d4] [api_service] 执行操作 {operationId: "op_123"}
[2024-01-15 10:30:46] [DEBUG] [op_a1b2c3d4] [api_service] 调试信息 [tags: user_request] {duration: 150ms}
[2024-01-15 10:30:47] [ERROR] [op_a1b2c3d4] [api_service] 操作失败 {code: "ERR_001"}
```

### 文件输出 (JSON 格式)

```json
{
  "level": "error",
  "message": "数据库连接失败",
  "timestamp": "2024-01-15T10:30:48.123Z",
  "context": {
    "module": "database",
    "operationId": "op_456",
    "sessionId": "session_789"
  },
  "error": {
    "message": "Connection timeout",
    "name": "TimeoutError",
    "stack": "Error: Connection timeout\n    at ..."
  }
}
```

## 性能考虑

### 文件轮转

- 默认日志文件大小限制：5MB
- 默认最多保留 10 个日志文件
- 超出限制时自动创建新文件

### 内存使用

- 指标历史：保留最近 1000 个数据点
- 上下文：支持并发上下文隔离
- 错误追踪：保留最近 100 个异常

### 性能优化建议

1. **生产环境** 使用 `production` 预设配置
2. **禁用颜色输出** 减少处理开销
3. **适当提高日志级别** 减少日志数量
4. **定期清理日志文件** 释放磁盘空间

## 集成示例

### 与 API 服务集成

```typescript
// src/map/service.ts
import { getLoggingSystem } from '@/logger';

const loggingSystem = getLoggingSystem();
const apiMiddleware = loggingSystem.getApiMiddleware();

export async function searchLocations(query: string) {
  return await apiMiddleware(
    async () => {
      const response = await axios.get('/api/locations', { params: { q: query } });
      return response.data;
    },
    {
      name: 'search_locations',
      context: { module: 'map_service' },
    }
  );
}
```

### 与对话引擎集成

```typescript
// src/dialogue/manager.ts
import { getLoggingSystem, withContext } from '@/logger';

const loggingSystem = getLoggingSystem();
const dialogueLogger = loggingSystem.getDialogueMiddleware();

export async function runDialogue(userInput: string, sessionId: string) {
  return await withContext(
    { module: 'dialogue', sessionId },
    async (contextId) => {
      dialogueLogger.logUserInput(userInput, { sessionId });

      try {
        const result = await processWithLLM(userInput);
        dialogueLogger.logLlmResponse(result, { sessionId });
        return result;
      } catch (error) {
        dialogueLogger.logError('llm_call', error as Error, { sessionId });
        throw error;
      }
    }
  );
}
```

### 与缓存系统集成

```typescript
// src/cache/service.ts
import { getLoggingSystem } from '@/logger';

const loggingSystem = getLoggingSystem();
const cacheMiddleware = loggingSystem.getCacheMiddleware();

export async function getCachedLocation(locationId: string) {
  return await cacheMiddleware(
    async () => {
      return await cache.get(`location_${locationId}`);
    },
    { key: `location_${locationId}` }
  );
}
```

## 常见问题

### Q1: 如何在应用启动时初始化日志系统？

```typescript
import { getLogger, LoggerConfigManager } from '@/logger';

// 在应用入口（main.ts）
const configManager = LoggerConfigManager.getInstance();
configManager.applyPreset(process.env.NODE_ENV || 'development');

const logger = getLogger();
logger.info('应用启动', { data: { version: '1.0.0' } });
```

### Q2: 如何在错误处理中使用日志？

```typescript
import { getLoggingSystem } from '@/logger';

const loggingSystem = getLoggingSystem();
const errorMiddleware = loggingSystem.getErrorMiddleware();

process.on('uncaughtException', (error) => {
  errorMiddleware.trackError(error, { tags: ['uncaught_exception'] });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  errorMiddleware.trackError(new Error(String(reason)), {
    tags: ['unhandled_rejection'],
  });
});
```

### Q3: 如何获取系统运行时的统计信息？

```typescript
import { getLoggingSystem } from '@/logger';

const loggingSystem = getLoggingSystem();

// 在适当的时机（如定时任务）
setInterval(() => {
  const stats = loggingSystem.getSystemStats();
  console.log('系统统计:', stats);

  // 可用于监控告警
  if (stats.logs.errors > 100) {
    logger.warn('错误数量过多！');
  }
}, 60000); // 每分钟检查一次
```

### Q4: 如何在生产环境中安全地处理敏感信息？

```typescript
import { getLogger } from '@/logger';

const logger = getLogger();

// 避免记录敏感信息
logger.info('用户登录', {
  data: {
    username: 'user123',
    // 不要记录密码！
    // password: userPassword,
  },
});

// 或使用中间件过滤
const sanitizedData = sanitizeLogData(data);
logger.info('用户数据', { data: sanitizedData });
```

## 最佳实践

1. **选择合适的日志级别**
   - ERROR: 不可恢复的错误
   - WARN: 潜在问题但不中断
   - INFO: 重要业务事件
   - DEBUG: 开发调试信息

2. **使用上下文追踪请求**
   - 为每个用户会话创建上下文
   - 通过操作 ID 追踪请求链路
   - 使用模块名标识日志来源

3. **记录关键性能指标**
   - API 响应时间
   - 缓存命中率
   - 数据库查询耗时

4. **定期审查和清理日志**
   - 配置日志轮转
   - 设置合理的文件大小限制
   - 定期归档旧日志

5. **避免过度日志记录**
   - 在生产环境使用 INFO 级别
   - 不要记录循环中的详细调试信息
   - 使用日志采样采集高频操作

## 总结

该日志系统提供了企业级的日志管理能力，支持：

- ✅ 灵活的日志级别和输出控制
- ✅ 完整的上下文和请求追踪
- ✅ 性能监控和指标收集
- ✅ 错误追踪和统计分析
- ✅ 多个中间件集成点
- ✅ 预设配置简化使用

通过合理使用这些功能，可以有效地进行应用调试、性能监控和生产环境维护。
