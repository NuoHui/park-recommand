# 测试指南

## 概述

项目使用 Jest 作为测试框架，支持单元测试、集成测试和 E2E 测试。

## 测试结构

```
src/
├── modules/
│   ├── cache/
│   │   ├── manager.ts
│   │   ├── manager.test.ts       # 单元测试
│   │   └── manager.integration.test.ts  # 集成测试
│   └── llm/
│       ├── engine.ts
│       └── engine.test.ts
```

## 运行测试

### 基础命令

```bash
# 运行所有测试
npm test

# 运行特定文件的测试
npm test -- cache.test

# 监听模式（自动重新运行）
npm test -- --watch

# 生成覆盖率报告
npm test -- --coverage

# 仅运行失败的测试
npm test -- --onlyFailed
```

### 覆盖率目标

| 指标 | 目标 | 说明 |
|------|------|------|
| 语句覆盖率 | > 80% | 代码行覆盖 |
| 分支覆盖率 | > 75% | 条件分支覆盖 |
| 函数覆盖率 | > 80% | 函数调用覆盖 |
| 行覆盖率 | > 80% | 物理行覆盖 |

## 单元测试

### 基础示例

```typescript
// cache/manager.test.ts
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import CacheManager from './manager';

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager({ ttl: 3600 });
  });

  afterEach(() => {
    cache.clear();
  });

  test('should set and get value', async () => {
    const key = 'test-key';
    const value = { name: 'test' };

    await cache.set(key, value);
    const result = await cache.get(key);

    expect(result).toEqual(value);
  });

  test('should return null for non-existent key', async () => {
    const result = await cache.get('non-existent');
    expect(result).toBeNull();
  });

  test('should respect TTL', async () => {
    const cache = new CacheManager({ ttl: 1 });
    await cache.set('key', 'value');

    // 立即获取应该成功
    expect(await cache.get('key')).toBe('value');

    // 等待 2 秒后应该过期
    await new Promise(resolve => setTimeout(resolve, 2000));
    expect(await cache.get('key')).toBeNull();
  });
});
```

### Mock 和 Stub

```typescript
import { jest } from '@jest/globals';

describe('LocationService', () => {
  let service: LocationService;
  let mapApiMock: jest.Mock;

  beforeEach(() => {
    mapApiMock = jest.fn();
    service = new LocationService({ mapApi: mapApiMock });
  });

  test('should call map API', async () => {
    mapApiMock.mockResolvedValue({
      locations: [{ name: '梧桐山' }],
    });

    const result = await service.search('梧桐山');

    expect(mapApiMock).toHaveBeenCalledWith('梧桐山');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('梧桐山');
  });

  test('should handle API error', async () => {
    mapApiMock.mockRejectedValue(new Error('API Error'));

    await expect(service.search('梧桐山'))
      .rejects
      .toThrow('API Error');
  });
});
```

## 集成测试

### 数据库集成

```typescript
describe('CacheManager Integration', () => {
  let cache: CacheManager;

  beforeEach(async () => {
    cache = new CacheManager({
      enableDisk: true,
      cacheDir: '.cache-test',
    });
    await cache.initialize();
  });

  afterEach(async () => {
    await cache.cleanup();
  });

  test('should persist data to disk', async () => {
    await cache.set('key1', { data: 'test' });

    // 创建新实例，应该能从磁盘读取
    const cache2 = new CacheManager({
      enableDisk: true,
      cacheDir: '.cache-test',
    });
    const result = await cache2.get('key1');

    expect(result).toEqual({ data: 'test' });
  });
});
```

### API 集成测试

```typescript
describe('RecommendationService Integration', () => {
  let service: RecommendationService;
  let mapService: MapService;
  let llmEngine: LLMEngine;

  beforeEach(async () => {
    mapService = new MapService(config.map);
    llmEngine = new LLMEngine(config.llm);
    service = new RecommendationService({ mapService, llmEngine });
  });

  test('should generate recommendations', async () => {
    const input = {
      location: '南山区',
      type: 'hiking',
      maxDistance: 5,
    };

    const recommendations = await service.recommend(input);

    expect(recommendations).toBeDefined();
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0]).toHaveProperty('name');
    expect(recommendations[0]).toHaveProperty('distance');
  });
});
```

## 异步测试

### 处理 Promise

```typescript
test('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

// 或使用回调
test('should handle callback', (done) => {
  asyncOperation(() => {
    expect(true).toBe(true);
    done();
  });
});
```

### 超时处理

```typescript
test('should timeout', async () => {
  // 设置 5 秒超时
  jest.setTimeout(5000);

  const result = await longRunningOperation();
  expect(result).toBeDefined();
}, 5000);
```

## 测试最佳实践

### 1. AAA 模式（Arrange, Act, Assert）

```typescript
test('should calculate total price', () => {
  // Arrange - 准备数据
  const items = [
    { name: '物品1', price: 10 },
    { name: '物品2', price: 20 },
  ];

  // Act - 执行操作
  const total = calculateTotal(items);

  // Assert - 验证结果
  expect(total).toBe(30);
});
```

### 2. 描述性的测试名称

```typescript
// ✅ 好
test('should return cached value when key exists', () => {});

// ❌ 不好
test('test cache', () => {});
```

### 3. 测试独立性

```typescript
// ✅ 好 - 每个测试都有自己的 setup 和 teardown
describe('Cache', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager();
  });

  afterEach(() => {
    cache.clear();
  });
});

// ❌ 不好 - 测试之间有依赖关系
describe('Cache', () => {
  const cache = new CacheManager();
  
  test('set value', () => { /* ... */ }); // 依赖于前面的测试
  test('get value', () => { /* ... */ });
});
```

### 4. 测试边界情况

```typescript
test('should handle edge cases', () => {
  // 空值
  expect(process(null)).toThrow();
  expect(process(undefined)).toThrow();

  // 极端值
  expect(process(0)).toBeDefined();
  expect(process(-1)).toBeDefined();
  expect(process(Number.MAX_VALUE)).toBeDefined();

  // 空集合
  expect(process([])).toEqual([]);
  expect(process({})).toEqual({});
});
```

## 测试覆盖率

### 生成覆盖率报告

```bash
npm test -- --coverage
```

输出示例：

```
File          | % Stmts | % Branch | % Funcs | % Lines |
--------------|---------|----------|---------|---------|
All files     |   85.5% |   82.3%  |   88.2% |   86.1% |
 cache/       |   92.1% |   89.5%  |   94.2% |   91.8% |
 llm/         |   78.3% |   75.1%  |   81.4% |   79.2% |
```

### 改进覆盖率

```bash
# 找出未覆盖的代码
npm test -- --coverage --collectCoverageFrom="src/**/*.ts"

# 生成详细的 HTML 报告
npm test -- --coverage --coverageReporters=html
# 在 coverage/index.html 中查看
```

## 持续集成

### GitHub Actions 示例

创建 `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: ${{ matrix.node-version }}
      
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage
      
      - uses: codecov/codecov-action@v2
        with:
          files: ./coverage/coverage-final.json
```

## 调试测试

### 单个测试调试

```bash
# 只运行一个测试
npm test -- --testNamePattern="should set and get value"

# 或使用 test.only
test.only('should set and get value', () => {
  // 只有这个测试会运行
});
```

### VS Code 调试

在 `.vscode/launch.json` 中添加配置：

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}
```

## 常见问题

### Q: 如何测试异步函数？

**A**: 使用 `async/await` 或返回 Promise：

```typescript
// 方式 1: async/await
test('should work', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

// 方式 2: 返回 Promise
test('should work', () => {
  return asyncFunction().then(result => {
    expect(result).toBeDefined();
  });
});
```

### Q: 如何 Mock 外部 API？

**A**: 使用 `jest.mock()` 或 `jest.fn()`：

```typescript
jest.mock('./api');

import * as api from './api';

test('should handle API response', async () => {
  (api.fetch as jest.Mock).mockResolvedValue({ data: 'test' });
  
  const result = await service.getData();
  expect(result).toBeDefined();
});
```

### Q: 覆盖率显示低于目标怎么办？

**A**: 
1. 识别未覆盖的文件
2. 为这些文件添加测试
3. 特别关注分支覆盖

```bash
npm test -- --coverage --verbose
```

## 下一步

- [代码结构](./code-structure.md) - 了解项目结构
- [开发环境](./setup.md) - 设置开发环境
- [贡献指南](./contributing.md) - 提交代码
