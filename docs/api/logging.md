# 日志系统 API

## 概述

日志系统使用 Winston 库实现，支持多种输出格式和目标，便于调试和监控。

## 日志级别

从高到低的严重程度：

| 级别 | 数值 | 说明 | 使用场景 |
|------|------|------|---------|
| error | 0 | 错误 | 应用崩溃、关键错误 |
| warn | 1 | 警告 | 可能的问题、弃用 API |
| info | 2 | 信息 | 重要事件、流程进展 |
| debug | 3 | 调试 | 详细信息、中间状态 |

## 基础用法

### 初始化日志

```typescript
import { logger } from './utils/logger';

// 使用全局 logger
logger.info('Application started');
logger.warn('High memory usage');
logger.error('Database connection failed', { error: err });
logger.debug('Debug information', { data });
```

### 配置日志级别

通过环境变量或代码配置：

```env
# .env
LOG_LEVEL=debug
```

或在代码中：

```typescript
logger.level = 'debug';
```

## 日志输出

### 控制台输出

日志同时输出到：
- 控制台（`stdout`）
- 日志文件（`logs/app.log`）

### 文件输出

日志文件位置：

```
logs/
├── app.log                # 主日志文件
├── app.log.2024-01-01    # 按日期分割的日志
└── app.log.2024-01-02
```

## 高级用法

### 结构化日志

记录结构化信息便于后续分析：

```typescript
logger.info('User recommendation generated', {
  userId: user.id,
  location: input.location,
  duration: endTime - startTime,
  resultCount: results.length,
  metadata: {
    cacheHit: true,
    apiCalls: 2,
  },
});
```

输出格式（JSON）：

```json
{
  "level": "info",
  "message": "User recommendation generated",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "userId": "user_123",
  "location": "南山区",
  "duration": 1523,
  "resultCount": 5,
  "metadata": {
    "cacheHit": true,
    "apiCalls": 2
  }
}
```

### 错误日志

```typescript
try {
  await fetchData();
} catch (error) {
  logger.error('Failed to fetch data', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context: {
      operation: 'fetch_data',
      retryCount: 3,
    },
  });
}
```

### 性能监控

```typescript
const startTime = Date.now();

await performHeavyOperation();

const duration = Date.now() - startTime;
logger.info('Operation completed', {
  operation: 'heavy_operation',
  duration,
  durationMs: `${duration}ms`,
});
```

### 条件日志

```typescript
// 只在调试模式下记录详细信息
if (process.env.DEBUG === 'true') {
  logger.debug('Detailed information', { internalState });
}

// 或使用日志级别判断
if (logger.isDebugEnabled()) {
  logger.debug('Debug info');
}
```

## 日志配置

### 完整配置示例

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'park-recommander' },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
    
    // 文件输出
    new winston.transports.File({
      filename: 'logs/app.log',
      format: winston.format.json(),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    }),
    
    // 错误日志单独文件
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.json(),
    }),
  ],
});
```

## 查看日志

### 实时日志

```bash
# 查看实时日志
tail -f logs/app.log

# 查看特定级别的日志
tail -f logs/app.log | grep '"level":"error"'

# 查看特定操作的日志
tail -f logs/app.log | grep '"operation":"fetch_data"'
```

### 日志分析

```bash
# 查找所有错误
grep '"level":"error"' logs/app.log

# 查看最近 100 条日志
tail -100 logs/app.log

# 按操作类型统计
grep '"operation"' logs/app.log | jq -r '.operation' | sort | uniq -c

# 计算平均响应时间
grep '"operation":"recommendation"' logs/app.log | jq '.duration' | awk '{sum+=$1; count++} END {print "Average:", sum/count}'
```

### 日志可视化工具

推荐工具：
- `logstash` - 日志处理和转换
- `elasticsearch` - 日志存储和搜索
- `kibana` - 日志可视化分析
- `splunk` - 企业级日志分析

## 环境变量配置

```env
# 日志级别
LOG_LEVEL=info

# 日志文件路径
LOG_FILE_PATH=logs/app.log

# 日志文件最大大小（字节）
LOG_FILE_MAX_SIZE=10485760  # 10MB

# 保留的最大日志文件数
LOG_FILE_MAX_FILES=10

# 日志格式
LOG_FORMAT=json

# 控制台输出
LOG_CONSOLE_ENABLED=true
```

## 性能影响

### 日志开销

| 操作 | 耗时 | 影响 |
|------|------|------|
| 记录单条日志 | 0.1-1ms | 低 |
| JSON 格式化 | 1-5ms | 中 |
| 文件 I/O | 5-50ms | 高 |
| 批量写入 | 低 | 推荐 |

### 优化建议

```typescript
// ✅ 好的做法 - 使用缓冲
logger.info('Batch operation', { count: 1000 });

// ❌ 不好的做法 - 逐个记录
for (let i = 0; i < 1000; i++) {
  logger.info(`Item ${i} processed`);
}
```

## 日志安全

### 避免记录敏感信息

```typescript
// ❌ 不要记录 API Key
logger.info('API configured', { apiKey: config.apiKey });

// ✅ 只记录非敏感信息
logger.info('API configured', { 
  provider: config.provider,
  modelName: config.modelName 
});

// ❌ 不要记录用户密码
logger.info('User login', { password: user.password });

// ✅ 只记录用户 ID
logger.info('User login', { userId: user.id, timestamp: Date.now() });
```

### 日志加密

如需记录敏感信息，使用加密：

```typescript
const encrypted = encrypt(sensitiveData);
logger.debug('Sensitive operation', { data: encrypted });
```

## 集成示例

### API 请求日志

```typescript
async function logApiCall(name: string, request: any, response: any) {
  const duration = response.duration || 0;
  
  if (response.status >= 400) {
    logger.warn(`API call failed: ${name}`, {
      endpoint: request.url,
      status: response.status,
      duration,
      error: response.error,
    });
  } else {
    logger.debug(`API call: ${name}`, {
      endpoint: request.url,
      status: response.status,
      duration,
      resultSize: JSON.stringify(response).length,
    });
  }
}
```

### 数据库操作日志

```typescript
async function logDbOperation(operation: string, query: string) {
  const startTime = Date.now();
  
  try {
    const result = await executeQuery(query);
    const duration = Date.now() - startTime;
    
    logger.debug(`Database operation: ${operation}`, {
      query: query.substring(0, 100), // 只记录前 100 个字符
      duration,
      rowsAffected: result.rowCount,
    });
    
    return result;
  } catch (error) {
    logger.error(`Database operation failed: ${operation}`, {
      query,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
```

## 常见问题

### Q: 如何修改日志级别？

**A**: 修改 `.env` 或代码中的 `LOG_LEVEL`：

```env
LOG_LEVEL=debug
```

### Q: 日志文件太大怎么办？

**A**: 配置日志轮转（已在默认配置中）：

```env
LOG_FILE_MAX_SIZE=10485760      # 10MB
LOG_FILE_MAX_FILES=10           # 最多 10 个文件
```

### Q: 如何只查看错误日志？

**A**:
```bash
grep '"level":"error"' logs/app.log

# 或
tail -f logs/error.log
```

### Q: 如何分析日志性能？

**A**:
```bash
# 统计各操作平均耗时
cat logs/app.log | jq -s 'group_by(.operation) | map({operation: .[0].operation, avg_duration: (map(.duration) | add / length)})' | jq '.'
```

## 下一步

- [缓存系统 API](./cache-system.md) - 了解缓存系统
- [结果解析 API](./result-parser.md) - 了解结果解析
- [代码结构](../development/code-structure.md) - 了解项目结构
