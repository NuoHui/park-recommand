# 结果解析器 - 快速开始指南

## 5 分钟上手

### 安装和初始化

```typescript
import { ResultParser, RecommendationSortBy } from '@/parser';

// 获取单例
const parser = ResultParser.getInstance();
```

### 1. 解析 LLM 响应

#### 方案 A: 只解析结构

```typescript
// 从 LLM 的查询响应中提取参数
const queryResult = await parser.parseQueryResponse(llmResponse);

if (queryResult.success) {
  console.log('搜索位置:', queryResult.data?.location);
  console.log('最大距离:', queryResult.data?.max_distance, 'km');
}
```

#### 方案 B: 端到端处理

```typescript
// 直接从 LLM 响应生成推荐列表
const result = await parser.processRecommendations(
  llmResponse,
  userPreference,
  {
    sortBy: RecommendationSortBy.RELEVANCE,
    limit: 5
  }
);

if (result.success) {
  result.data?.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec.location.name}`);
    console.log(`   距离: ${rec.location.distance} km`);
    console.log(`   评分: ${rec.location.rating} ⭐`);
  });
}
```

### 2. 验证结果质量

```typescript
import { validateRecommendations } from '@/parser';

// 验证推荐结果
const validation = validateRecommendations(recommendations, preference);

if (!validation.valid) {
  console.log('⚠️ 存在问题:');
  validation.issues.forEach(issue => {
    console.log(`  • [${issue.field}] ${issue.message}`);
  });
}

console.log(`质量评分: ${validation.score}/100`);
```

### 3. 常见使用场景

#### 场景 1: 基本推荐

```typescript
const recommendations = await parser.processRecommendations(
  llmResponse,
  { location: '福田', maxDistance: 5 },
  { limit: 3 }
);
```

#### 场景 2: 高质量推荐

```typescript
const recommendations = await parser.processRecommendations(
  llmResponse,
  preference,
  {
    sortBy: RecommendationSortBy.RELEVANCE,
    filter: { minRelevance: 0.8 },
    limit: 5,
    deduplicateByName: true
  }
);
```

#### 场景 3: 距离优先推荐

```typescript
const recommendations = await parser.processRecommendations(
  llmResponse,
  preference,
  {
    sortBy: RecommendationSortBy.DISTANCE,
    filter: { maxDistance: 10 },
    limit: 3
  }
);
```

## API 参考

### ResultParser

#### parseQueryResponse(responseText)
从 LLM 的查询响应中解析搜索参数

**参数**: `responseText` - LLM 的原始响应
**返回**: `Promise<ParseResult<LLMQueryResponse>>`

**示例**:
```typescript
const result = await parser.parseQueryResponse(llmText);
console.log(result.data?.park_type);  // "hiking"
```

#### parseRecommendationResponse(responseText)
从 LLM 的推荐响应中解析推荐项

**参数**: `responseText` - LLM 的原始响应
**返回**: `Promise<ParseResult<LLMRecommendationResponse>>`

**示例**:
```typescript
const result = await parser.parseRecommendationResponse(llmText);
result.data?.recommendations?.forEach(rec => {
  console.log(rec.name, rec.relevance_score);
});
```

#### convertToRecommendations(items, preference, options)
将推荐项转换为完整的推荐对象

**参数**:
- `items` - 推荐项数组
- `preference` - 用户偏好
- `options` - 可选的优化参数

**返回**: `Promise<Recommendation[]>`

**示例**:
```typescript
const recommendations = await parser.convertToRecommendations(
  items,
  { location: '南山', maxDistance: 10 },
  { sortBy: RecommendationSortBy.DISTANCE }
);
```

#### processRecommendations(responseText, preference, options)
完整的端到端处理（推荐）

**参数**:
- `responseText` - LLM 的原始响应
- `preference` - 用户偏好
- `options` - 可选的优化参数

**返回**: `Promise<ParseResult<Recommendation[]>>`

#### getStats()
获取解析统计信息

**返回**: `ParseStats` 对象

**示例**:
```typescript
const stats = parser.getStats();
console.log(`成功率: ${(stats.successCount / stats.totalAttempts * 100).toFixed(1)}%`);
console.log(`平均耗时: ${stats.averageParseTime.toFixed(2)}ms`);
```

### RecommendationValidator

#### validateRecommendations(recommendations, preference)
验证推荐列表

**参数**:
- `recommendations` - 推荐数组
- `preference` - 用户偏好

**返回**: `ValidationResult` 对象

#### validateQueryResponse(response)
验证查询响应

**参数**: `response` - LLM 查询响应
**返回**: `ValidationResult` 对象

#### generateReport(result)
生成格式化的验证报告

**参数**: `result` - ValidationResult 对象
**返回**: 格式化的报告字符串

## 优化选项详解

### RecommendationOptions

```typescript
interface RecommendationOptions {
  sortBy?: RecommendationSortBy;        // 排序方式
  filter?: RecommendationFilter;        // 过滤条件
  limit?: number;                       // 返回数量限制
  deduplicateByName?: boolean;          // 按名称去重
  enrichWithLocationData?: boolean;     // 整合地点数据
}
```

#### 排序方式 (RecommendationSortBy)

| 方式 | 说明 | 适用场景 |
|------|------|---------|
| RELEVANCE | 相关度优先 | 默认推荐 |
| DISTANCE | 最近优先 | 时间紧张 |
| RATING | 评分优先 | 质量优先 |
| TRAVEL_TIME | 最快优先 | 交通便利 |
| POPULARITY | 热度优先 | 人气景点 |

#### 过滤条件 (RecommendationFilter)

```typescript
{
  minRelevance: 0.8,        // 最小相关度
  maxDistance: 10,          // 最大距离 (km)
  minRating: 4,             // 最小评分
  excludeTags: ['困难'],    // 排除标签
  includeTags: ['公园']     // 只包含标签
}
```

## 常见模式

### 模式 1: 简单推荐

```typescript
// 快速获取推荐，使用默认配置
const recs = await parser.processRecommendations(
  llmResponse,
  userPreference
);
```

### 模式 2: 高质量推荐

```typescript
// 获取高相关度的推荐
const recs = await parser.processRecommendations(
  llmResponse,
  preference,
  {
    filter: { minRelevance: 0.8 },
    limit: 5,
    deduplicateByName: true
  }
);
```

### 模式 3: 距离优化

```typescript
// 获取最近的景点
const recs = await parser.processRecommendations(
  llmResponse,
  preference,
  {
    sortBy: RecommendationSortBy.DISTANCE,
    filter: { maxDistance: 5 }
  }
);
```

### 模式 4: 多条件组合

```typescript
// 高质量、近距离、高评分
const recs = await parser.processRecommendations(
  llmResponse,
  preference,
  {
    sortBy: RecommendationSortBy.RATING,
    filter: {
      minRelevance: 0.75,
      maxDistance: 10,
      minRating: 4.5,
      includeTags: ['热门']
    },
    limit: 3
  }
);
```

## 错误处理

### 基本错误处理

```typescript
const result = await parser.processRecommendations(response, preference);

if (!result.success) {
  console.error('推荐失败:', result.error);
  // 使用备选方案
  return getDefaultRecommendations();
}

if (result.data?.length === 0) {
  console.warn('没有找到匹配的推荐');
}
```

### 结合验证的完整处理

```typescript
const result = await parser.processRecommendations(response, preference);

if (result.success && result.data) {
  // 验证结果质量
  const validation = validateRecommendations(result.data, preference);
  
  if (validation.score < 60) {
    console.warn('推荐质量不佳，建议重试');
  } else {
    return result.data;  // 使用推荐
  }
}

// 降级处理
return await getAlternativeRecommendations();
```

## 调试技巧

### 查看解析统计

```typescript
const stats = parser.getStats();
console.log('解析统计:', {
  总次数: stats.totalAttempts,
  成功: stats.successCount,
  失败: stats.failureCount,
  成功率: `${(stats.successCount / stats.totalAttempts * 100).toFixed(1)}%`,
  平均耗时: `${stats.averageParseTime.toFixed(2)}ms`
});
```

### 查看原始响应

```typescript
const result = await parser.parseRecommendationResponse(response);
console.log('原始 LLM 响应:', result.raw);
```

### 查看验证报告

```typescript
const validation = validateRecommendations(recommendations, preference);
console.log(RecommendationValidator.generateReport(validation));
```

## 性能优化建议

### 1. 启用缓存
解析器自动使用缓存管理系统，确保：
- 地点信息缓存 7 天
- 距离计算缓存
- 避免重复查询

### 2. 批量处理
一次处理多个推荐比逐个处理更高效。

### 3. 监控统计
```typescript
const stats = parser.getStats();
if (stats.averageParseTime > 100) {
  console.warn('解析性能下降');
}
```

### 4. 内存管理
```typescript
// 定期重置统计信息，释放内存
parser.resetStats();
```

## 完整示例

```typescript
import { ResultParser, RecommendationSortBy, validateRecommendations } from '@/parser';

async function recommendParks(userInput: string, preference: UserPreference) {
  const parser = ResultParser.getInstance();
  
  try {
    // 1. 从 LLM 获取响应
    const llmResponse = await llmClient.generateRecommendations(userInput, preference);
    
    // 2. 解析并处理
    const result = await parser.processRecommendations(
      llmResponse,
      preference,
      {
        sortBy: RecommendationSortBy.RELEVANCE,
        filter: { minRelevance: 0.7 },
        limit: 5,
        deduplicateByName: true
      }
    );
    
    if (!result.success) {
      console.error('解析失败:', result.error);
      return [];
    }
    
    // 3. 验证质量
    const validation = validateRecommendations(result.data!, preference);
    if (validation.score < 60) {
      console.warn('推荐质量不佳');
    }
    
    // 4. 返回推荐
    return result.data;
    
  } catch (error) {
    console.error('推荐失败:', error);
    return [];
  }
}
```

## 进阶用法

### 自定义验证级别

```typescript
// 严格验证
const validation = validateRecommendations(recs, preference);
if (!validation.valid) throw new Error('验证失败');

// 宽松验证
const validation = validateRecommendations(recs, preference);
if (validation.score < 40) throw new Error('质量过低');
```

### 处理特殊情况

```typescript
// 处理部分查询失败
const recs = await parser.convertToRecommendations(
  items,
  preference,
  { enrichWithLocationData: true }
);
// 某些地点查询可能失败，返回的是查询成功的推荐
console.log(`成功转换 ${recs.length}/${items.length} 项`);
```

## 常见问题

**Q: 为什么解析失败？**
A: 检查 LLM 响应是否包含有效的 JSON 结构。查看 `result.raw` 查看原始响应。

**Q: 如何处理相同的地点？**
A: 使用 `deduplicateByName: true` 选项。

**Q: 推荐很少或没有推荐？**
A: 检查 `filter` 条件是否过严格，尝试放宽 `minRelevance` 或 `maxDistance`。

**Q: 性能不够好？**
A: 查看缓存命中率，确保启用了缓存。使用 `limit` 限制结果数量。

## 更多资源

- [完整技术文档](./RESULT_PARSER.md)
- [API 使用示例](./examples/result-parser-example.ts)
- [类型定义](./src/parser/types.ts)
- [验证器详解](./src/parser/validator.ts)
