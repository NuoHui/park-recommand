# 日志系统快速开始指南

## 5 分钟快速上手

### 1. 基础日志记录

```typescript
import { getLogger } from '@/logger';

const logger = getLogger();

logger.info('应用启动');
logger.warn('警告消息');
logger.error('错误消息');
logger.debug('调试信息');
```

### 2. 记录错误

```typescript
try {
  // some code
} catch (error) {
  logger.error('操作失败', {
    error: error as Error,
    data: { operationId: 'op_123' },
  });
}
```

### 3. 性能计时

```typescript
const stopTimer = logger.startTimer('api_call');

await someAsyncOperation();

stopTimer(); // 自动记录性能指标
```

### 4. 上下文管理

```typescript
import { withContext } from '@/logger';

const result = await withContext(
  { module: 'api_service', tags: ['api_call'] },
  async (contextId) => {
    logger.info('执行操作');
    return await operation();
  }
);
```

### 5. 性能指标

```typescript
logger.metric('api_response_time', 125);
logger.metric('cache_hit_rate', 0.85);

const stats = logger.getStatistics();
console.log(stats);
```

## 常见场景

### 场景 1: API 服务日志

```typescript
import { getLoggingSystem } from '@/logger';

const loggingSystem = getLoggingSystem();
const apiMiddleware = loggingSystem.getApiMiddleware();

export async function fetchUserData(userId: string) {
  return await apiMiddleware(
    async () => {
      const response = await axios.get(`/api/users/${userId}`);
      return response.data;
    },
    {
      name: 'fetch_user_data',
      context: { module: 'user_service', userId },
    }
  );
}
```

### 场景 2: 对话流程日志

```typescript
import { getLoggingSystem } from '@/logger';

const loggingSystem = getLoggingSystem();
const dialogueLogger = loggingSystem.getDialogueMiddleware();

async function recommendPark(userInput: string, sessionId: string) {
  dialogueLogger.logUserInput(userInput, { sessionId, module: 'dialogue' });

  try {
    const prompt = buildPrompt(userInput);
    dialogueLogger.logLlmRequest(prompt, { sessionId });

    const response = await llm.complete(prompt);
    dialogueLogger.logLlmResponse(response, { sessionId });

    const recommendations = parseResponse(response);
    dialogueLogger.logRecommendation('Shenzhen', recommendations.length, {
      sessionId,
    });

    return recommendations;
  } catch (error) {
    dialogueLogger.logError('recommendation', error as Error, { sessionId });
    throw error;
  }
}
```

### 场景 3: 性能监控

```typescript
import { getLoggingSystem } from '@/logger';

const loggingSystem = getLoggingSystem();
const perfMonitor = loggingSystem.getPerformanceMiddleware();

async function processData(data: any[]) {
  // 追踪多个操作
  for (const item of data) {
    await perfMonitor.track('process_item', async () => {
      return await processItem(item);
    });
  }

  // 显示性能统计
  const metrics = perfMonitor.getMetrics();
  console.log('性能指标:', metrics.process_item);
}
```

### 场景 4: 错误追踪

```typescript
import { getLoggingSystem } from '@/logger';

const loggingSystem = getLoggingSystem();
const errorTracker = loggingSystem.getErrorMiddleware();

process.on('uncaughtException', (error) => {
  errorTracker.trackError(error, { tags: ['uncaught_exception'] });

  // 显示错误统计
  const stats = errorTracker.getErrorStats();
  console.log('错误统计:', stats);

  process.exit(1);
});
```

### 场景 5: 缓存日志

```typescript
import { getLoggingSystem } from '@/logger';

const loggingSystem = getLoggingSystem();
const cacheMiddleware = loggingSystem.getCacheMiddleware();

export async function getLocation(locationId: string) {
  return await cacheMiddleware(
    async () => {
      // 尝试从缓存获取
      return await cache.get(`location_${locationId}`);
    },
    { key: `location_${locationId}` }
  );
  // 缓存命中时输出: Cache hit: location_123
  // 缓存未命中时输出: Cache miss: location_123
}
```

## 环境配置

### 开发环境

```bash
NODE_ENV=development
LOG_LEVEL=debug
LOG_COLORIZE=true
LOG_CONSOLE=true
LOG_FILE=false
```

### 生产环境

```bash
NODE_ENV=production
LOG_LEVEL=info
LOG_COLORIZE=false
LOG_CONSOLE=true
LOG_FILE=true
LOG_DIR=./logs
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=20
```

### 测试环境

```bash
NODE_ENV=test
LOG_LEVEL=warn
LOG_CONSOLE=false
LOG_FILE=false
```

## 配置选项

### 预设配置应用

```typescript
import { LoggerConfigManager } from '@/logger';

const configManager = LoggerConfigManager.getInstance();

// 应用开发配置
configManager.applyPreset('development');

// 应用生产配置
configManager.applyPreset('production');

// 应用测试配置
configManager.applyPreset('test');

// 应用调试配置
configManager.applyPreset('debug');

// 应用最小化配置
configManager.applyPreset('minimal');
```

### 自定义配置

```typescript
import { getLogger } from '@/logger';

const logger = getLogger({
  level: 'debug',
  colorize: true,
  console: true,
  file: true,
  logDir: './custom-logs',
  maxFileSize: 5242880,
  maxFiles: 15,
  format: 'json',
  timestamp: true,
  stack: true,
});
```

## 日志输出示例

### 控制台输出

```
[2024-01-15 10:30:45] [INFO] [op_a1b2c3d4] 应用启动 {version: "1.0.0"}
[2024-01-15 10:30:46] [DEBUG] [op_a1b2c3d4] [api_service] 执行查询 [tags: database_query]
[2024-01-15 10:30:47] [WARN] [op_a1b2c3d4] 缓存大小接近限制
[2024-01-15 10:30:48] [ERROR] [op_a1b2c3d4] 数据库连接失败 {error: "Connection timeout"}
```

### 文件输出 (JSON)

```json
{
  "level": "info",
  "message": "推荐完成",
  "timestamp": "2024-01-15T10:30:50.123Z",
  "context": {
    "module": "recommendation",
    "operationId": "op_456",
    "sessionId": "session_789",
    "tags": ["recommendation_engine"],
    "metrics": {
      "duration": 1250,
      "resultCount": 3,
      "cacheHits": 1
    }
  }
}
```

## 集成步骤

### 第 1 步：应用初始化

```typescript
// src/index.ts
import { getLogger, LoggerConfigManager, getLoggingSystem } from '@/logger';

// 初始化日志配置
const configManager = LoggerConfigManager.getInstance();
configManager.applyPreset(process.env.NODE_ENV || 'development');

// 初始化日志系统
const loggingSystem = getLoggingSystem();
loggingSystem.logSystemStart('1.0.0');

const logger = getLogger();
logger.info('应用初始化完成');
```

### 第 2 步：集成到服务模块

```typescript
// src/services/map.ts
import { getLoggingSystem } from '@/logger';

const loggingSystem = getLoggingSystem();
const apiMiddleware = loggingSystem.getApiMiddleware();

export async function searchLocations(query: string) {
  return await apiMiddleware(
    async () => {
      return await axios.get('/api/search', { params: { q: query } });
    },
    { name: 'search_locations', context: { module: 'map_service' } }
  );
}
```

### 第 3 步：集成到对话引擎

```typescript
// src/dialogue/engine.ts
import { getLoggingSystem, withContext } from '@/logger';

const loggingSystem = getLoggingSystem();

export async function processUserInput(input: string, sessionId: string) {
  return await withContext(
    { module: 'dialogue', sessionId },
    async () => {
      const dialogueLogger = loggingSystem.getDialogueMiddleware();
      dialogueLogger.logUserInput(input, { sessionId });

      // 处理用户输入...

      const recommendations = await generateRecommendations(input);
      dialogueLogger.logRecommendation('Shenzhen', recommendations.length, {
        sessionId,
      });

      return recommendations;
    }
  );
}
```

### 第 4 步：全局错误处理

```typescript
// src/error-handler.ts
import { getLoggingSystem } from '@/logger';

const loggingSystem = getLoggingSystem();
const errorTracker = loggingSystem.getErrorMiddleware();

// 捕获未处理的异常
process.on('uncaughtException', (error) => {
  errorTracker.trackError(error, { tags: ['uncaught_exception'] });
  console.error('Fatal error:', error);
  process.exit(1);
});

// 捕获未处理的 Promise 拒绝
process.on('unhandledRejection', (reason) => {
  errorTracker.trackError(new Error(String(reason)), {
    tags: ['unhandled_rejection'],
  });
  console.error('Unhandled rejection:', reason);
});
```

### 第 5 步：生成系统报告

```typescript
// src/monitoring.ts
import { getLoggingSystem } from '@/logger';

const loggingSystem = getLoggingSystem();

// 定期生成系统报告
setInterval(() => {
  const report = loggingSystem.generateReport();
  console.log(report);

  // 可选：保存到文件或发送到监控系统
  // saveReportToFile(report);
}, 60000); // 每分钟
```

## 常见用法模式

### 模式 1: 包装异步操作

```typescript
async function wrapAsyncOperation<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const logger = getLogger();
  const stopTimer = logger.startTimer(operationName);

  try {
    logger.debug(`Starting: ${operationName}`);
    const result = await operation();
    logger.info(`Completed: ${operationName}`);
    stopTimer();
    return result;
  } catch (error) {
    logger.error(`Failed: ${operationName}`, {
      error: error as Error,
    });
    stopTimer();
    throw error;
  }
}

// 使用
const data = await wrapAsyncOperation('fetch_data', () => fetchData());
```

### 模式 2: 请求上下文追踪

```typescript
import { withContext, generateOperationId } from '@/logger';

async function handleRequest(request: Request) {
  const operationId = generateOperationId();

  return await withContext(
    {
      operationId,
      module: 'request_handler',
      metadata: { method: request.method, url: request.url },
    },
    async () => {
      logger.info(`Request: ${request.method} ${request.url}`);
      // 处理请求...
      logger.info('Request completed');
    }
  );
}
```

### 模式 3: 性能基准测试

```typescript
async function benchmarkPerformance() {
  const perfMonitor = getLoggingSystem().getPerformanceMiddleware();

  // 运行多次操作以获得统计数据
  for (let i = 0; i < 100; i++) {
    await perfMonitor.track('operation', async () => {
      // 执行操作
      await performOperation();
    });
  }

  // 显示性能统计
  const metrics = perfMonitor.getMetrics();
  console.log('平均耗时:', metrics.operation.avgTime.toFixed(2), 'ms');
  console.log('最小耗时:', metrics.operation.minTime, 'ms');
  console.log('最大耗时:', metrics.operation.maxTime, 'ms');
}
```

## 故障排除

### 问题 1: 日志文件不生成

**解决方案：**
```typescript
// 检查配置
const configManager = LoggerConfigManager.getInstance();
const config = configManager.getConfig();
console.log('当前配置:', config);

// 确保 file: true
configManager.updateConfig({ file: true });

// 检查目录权限
import fs from 'fs';
fs.mkdirSync(config.logDir, { recursive: true });
```

### 问题 2: 日志信息缺失

**解决方案：**
```typescript
// 检查日志级别
const config = configManager.getConfig();
console.log('日志级别:', config.level);

// 降低日志级别以显示更多信息
configManager.updateConfig({ level: 'debug' });

// 查看 Winston Logger 配置
const logger = getLogger() as Logger;
console.log(logger.getWinstonLogger().level);
```

### 问题 3: 性能下降

**解决方案：**
```typescript
// 在生产环境中提高日志级别
configManager.applyPreset('production');

// 禁用颜色输出
configManager.updateConfig({ colorize: false });

// 减少文件 I/O（增大轮转大小）
configManager.updateConfig({
  maxFileSize: 52428800, // 50MB
  maxFiles: 5,
});
```

## 完整示例项目

查看 `examples/logger-example.ts` 文件获取 10 个完整的使用示例。

运行示例：
```bash
npm run dev examples/logger-example.ts
```

## 下一步

1. 阅读完整的 [日志系统文档](./LOGGING_SYSTEM.md)
2. 查看 [项目结构](./README.md)
3. 集成到您的应用模块中
4. 查看 [API 集成示例](./MAP_API_INTEGRATION.md)
5. 了解 [对话引擎](./DIALOGUE_ENGINE.md)

## 获取帮助

- 📚 查看完整的 TypeScript 类型定义：`src/logger/types.ts`
- 💡 查看核心实现：`src/logger/logger.ts`
- 🔧 查看中间件集成：`src/logger/middleware.ts`
- 📖 查看详细文档：`LOGGING_SYSTEM.md`
