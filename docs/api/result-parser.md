# 结果解析器 API

## 概述

结果解析器负责解析和验证来自 LLM API 和地图 API 的响应数据，确保数据的正确性和一致性。

## LLM 结果解析

### 推荐结果解析

```typescript
import { LLMResultParser } from './llm/parser';

const parser = new LLMResultParser();

// 解析 LLM 推荐结果
const result = parser.parseRecommendations(llmResponse);
```

#### 输入格式

```json
{
  "content": "[{\"name\": \"梧桐山\", \"score\": 0.95, \"reason\": \"距离近，难度适中\"}]",
  "stop_reason": "end_turn"
}
```

#### 输出格式

```typescript
interface ParsedRecommendation {
  name: string;               // 景点名称
  score: number;              // 推荐评分 (0-1)
  reason: string;             // 推荐理由
  rank: number;               // 排名
}

// 结果
[
  {
    name: '梧桐山',
    score: 0.95,
    reason: '距离近，难度适中',
    rank: 1
  }
]
```

### 错误处理

```typescript
// 解析失败时的处理
try {
  const result = parser.parseRecommendations(llmResponse);
} catch (error) {
  if (error instanceof ParseError) {
    logger.error('Failed to parse LLM response', {
      rawResponse: llmResponse,
      reason: error.message,
    });
    
    // 返回默认值或重试
    return getDefaultRecommendations();
  }
}
```

## 地图 API 结果解析

### 位置搜索结果

```typescript
interface ParsedLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  city: string;
  district: string;
}
```

#### 使用示例

```typescript
const mapParser = new MapResultParser();

// 解析地图搜索结果
const location = mapParser.parseLocation(amapResponse);

console.log(location);
// {
//   id: 'pt_1234567',
//   name: '梧桐山',
//   lat: 22.5431,
//   lng: 114.0456,
//   address: '深圳市罗湖区...',
//   city: '深圳',
//   district: '罗湖区'
// }
```

### 周边搜索结果

```typescript
interface ParsedSearchResult {
  locations: Location[];
  total: number;
  pageIndex: number;
  pageSize: number;
}
```

#### 使用示例

```typescript
const results = mapParser.parseNearbySearch(amapResponse);

// 获取前 5 个结果
const topResults = results.locations.slice(0, 5);
```

### 距离计算结果

```typescript
interface ParsedDistance {
  from: Location;
  to: Location;
  distance: number;          // 米
  duration: number;          // 秒
  distanceKm: number;        // 公里（计算得出）
}
```

#### 使用示例

```typescript
const distance = mapParser.parseDistance(amapResponse);

console.log(`距离: ${distance.distanceKm} km`);
console.log(`时间: ${Math.round(distance.duration / 60)} 分钟`);
```

## 数据验证

### 验证规则

```typescript
interface ValidationRules {
  location: {
    nameRequired: true;
    latRange: [-90, 90];
    lngRange: [-180, 180];
  };
  recommendation: {
    scoreRange: [0, 1];
    nameRequired: true;
  };
  distance: {
    minDistance: 0;
    maxDistance: 100000000;  // 地球周长
  };
}
```

### 验证函数

```typescript
// 验证位置数据
function validateLocation(location: Location): boolean {
  return (
    location.name &&
    location.lat >= -90 && location.lat <= 90 &&
    location.lng >= -180 && location.lng <= 180
  );
}

// 验证推荐数据
function validateRecommendation(rec: Recommendation): boolean {
  return (
    rec.name &&
    rec.score >= 0 && rec.score <= 1
  );
}

// 使用
if (!validateLocation(location)) {
  throw new Error('Invalid location data');
}
```

## 批量解析

### 解析多个结果

```typescript
// 解析多个位置
const locations = amapResponse.pois.map(poi => 
  mapParser.parseLocation(poi)
).filter(validateLocation);

// 使用 Promise.all 并行解析
const parsePromises = responses.map(response =>
  Promise.resolve(mapParser.parseRecommendations(response))
);
const results = await Promise.all(parsePromises);
```

## 缓存解析结果

```typescript
interface CachedParseResult {
  result: any;
  timestamp: number;
  hash: string;
}

// 缓存解析结果，避免重复解析相同的数据
function cachedParse(input: string, parser: Function): any {
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  
  const cached = cache.get(`parse:${hash}`);
  if (cached) {
    return cached;
  }
  
  const result = parser(input);
  cache.set(`parse:${hash}`, result, { ttl: 3600 });
  return result;
}
```

## 错误类型

### ParseError

```typescript
class ParseError extends Error {
  constructor(
    message: string,
    public code: string,
    public source: 'llm' | 'map',
    public details?: any,
  ) {
    super(message);
  }
}
```

### 常见错误

| 错误代码 | 说明 | 处理方法 |
|---------|------|--------|
| INVALID_JSON | JSON 格式错误 | 记录日志，返回默认值 |
| MISSING_FIELD | 缺少必需字段 | 验证后重试 |
| INVALID_VALUE | 字段值无效 | 清理数据后重试 |
| API_ERROR | API 返回错误 | 记录错误，返回缓存 |

## 性能优化

### 1. 流式解析

```typescript
// 大量数据时，逐个解析而非一次全部
async function* parseStream(dataArray: any[]) {
  for (const item of dataArray) {
    yield parseLocation(item);
  }
}

// 使用
for await (const location of parseStream(locations)) {
  process.result(location);
}
```

### 2. 并行解析

```typescript
// 使用 Promise.all 并行处理
const results = await Promise.all(
  items.map(item => parseAsync(item))
);
```

### 3. 缓存常用结果

```typescript
// 缓存热门地点的解析结果
const HOT_SPOTS = ['梧桐山', '翠竹山', '马峦山'];

function initializeCache() {
  HOT_SPOTS.forEach(spot => {
    const result = parseLocation(spot);
    cacheResult(spot, result);
  });
}
```

## 集成示例

### 完整的推荐流程

```typescript
class RecommendationService {
  private parser = new LLMResultParser();
  private mapParser = new MapResultParser();

  async recommend(input: UserInput): Promise<ParkRecommendation[]> {
    // 1. 获取 LLM 推荐
    const llmResponse = await this.llm.call(prompt);
    const recommendations = this.parser.parseRecommendations(llmResponse);

    // 2. 验证数据
    const validRecs = recommendations.filter(
      rec => rec.score >= 0.7 // 过滤低分推荐
    );

    // 3. 获取详细信息
    const details = await Promise.all(
      validRecs.map(rec => this.getDetails(rec.name))
    );

    // 4. 解析并返回
    return details.map(detail =>
      this.mapParser.parseParkDetail(detail)
    );
  }
}
```

## 调试

### 打印解析日志

```typescript
// 启用详细日志
function parseWithLogging(input: string, parser: Function): any {
  logger.debug('Parsing input', { input });
  
  try {
    const result = parser(input);
    logger.debug('Parse result', { result });
    return result;
  } catch (error) {
    logger.error('Parse error', { error, input });
    throw error;
  }
}
```

### 校验测试

```typescript
import { describe, test, expect } from '@jest/globals';

describe('ResultParser', () => {
  test('should parse valid location', () => {
    const input = { name: '梧桐山', lat: 22.54, lng: 114.04 };
    const result = parser.parseLocation(input);
    
    expect(result.name).toBe('梧桐山');
    expect(result.lat).toBe(22.54);
    expect(result.lng).toBe(114.04);
  });

  test('should throw on invalid location', () => {
    const input = { name: '梧桐山' }; // 缺少坐标
    
    expect(() => parser.parseLocation(input))
      .toThrow(ParseError);
  });
});
```

## 下一步

- [日志系统 API](./logging.md) - 了解日志系统
- [缓存系统 API](./cache-system.md) - 了解缓存系统
- [代码结构](../development/code-structure.md) - 了解代码组织
