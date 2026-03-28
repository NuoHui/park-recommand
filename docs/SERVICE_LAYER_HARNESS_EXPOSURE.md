# LLM 和地图服务层 Harness 集成指南

## 概述

为了保护现有的公共 API 同时支持 Harness 层的调用，需要为 LLM 和地图服务添加内部接口。本指南说明如何设计这些接口。

## 设计原则

1. **不改变公共 API** - 保持现有的 public 方法不变
2. **添加内部接口** - 新增 `execute*` 方法供 Harness 调用
3. **共享实现** - 内部接口复用现有的实现逻辑
4. **向后兼容** - 旧代码继续可用

## LLM 服务层改造

### 现有 API 保持不变

```typescript
// src/llm/service.ts (保持原样)
export class LLMService {
  async callLLM(request: any): Promise<LLMResponse> {
    // 现有实现
  }
}
```

### 添加内部 Harness 接口

```typescript
// src/llm/service.ts (添加新方法)

export class LLMService {
  // 保持现有的公共方法...
  
  /**
   * 内部方法：供 Harness 层调用
   * 不包含任何额外的约束检查（由 Harness 统一处理）
   * @internal
   */
  async executeDirectCall(request: any): Promise<LLMResponse> {
    // 直接执行 LLM 调用，不经过额外的验证
    return this.client.call(request);
  }

  /**
   * 内部方法：执行意图识别
   * @internal
   */
  async executeIntentRecognition(userInput: string): Promise<IntentParsing> {
    return this.engine.recognizeIntent(userInput);
  }

  /**
   * 内部方法：执行推荐决策
   * @internal
   */
  async executeRecommendationDecision(preference: UserPreference): Promise<RecommendationDecision> {
    return this.engine.generateSearchParams(preference);
  }

  /**
   * 内部方法：执行结果解析
   * @internal
   */
  async executeResponseParsing(response: string): Promise<ParsedRecommendation> {
    return this.engine.parseRecommendations(response);
  }
}
```

### 导出内部接口

```typescript
// src/llm/internal-api.ts (新文件)

import { LLMService } from './service';

export interface ILLMInternalAPI {
  executeDirectCall(request: any): Promise<any>;
  executeIntentRecognition(userInput: string): Promise<any>;
  executeRecommendationDecision(preference: any): Promise<any>;
  executeResponseParsing(response: string): Promise<any>;
}

export function getLLMInternalAPI(): ILLMInternalAPI {
  const service = getLLMService();
  return {
    executeDirectCall: (request) => service.executeDirectCall(request),
    executeIntentRecognition: (userInput) => service.executeIntentRecognition(userInput),
    executeRecommendationDecision: (preference) => service.executeRecommendationDecision(preference),
    executeResponseParsing: (response) => service.executeResponseParsing(response),
  };
}
```

## 地图服务层改造

### 现有 API 保持不变

```typescript
// src/map/service.ts (保持原样)
export class LocationService {
  async searchRecommendedLocations(params: any): Promise<any> {
    // 现有实现
  }
}
```

### 添加内部 Harness 接口

```typescript
// src/map/service.ts (添加新方法)

export class LocationService {
  // 保持现有的公共方法...
  
  /**
   * 内部方法：供 Harness 层调用
   * @internal
   */
  async executeLocationSearch(params: MapSearchParams): Promise<MapSearchResponse> {
    return this.client.searchLocations(params);
  }

  /**
   * 内部方法：执行距离计算
   * @internal
   */
  async executeDistanceCalculation(params: MapDistanceParams): Promise<MapDistanceResult> {
    return this.client.calculateDistance(params);
  }

  /**
   * 内部方法：执行地理编码
   * @internal
   */
  async executeGeocoding(params: MapGeocodeParams): Promise<MapGeocodeResponse> {
    return this.client.geocode(params);
  }

  /**
   * 内部方法：执行反向地理编码
   * @internal
   */
  async executeReverseGeocoding(params: MapReverseGeocodeParams): Promise<MapReverseGeocodeResponse> {
    return this.client.reverseGeocode(params);
  }
}
```

### 导出内部接口

```typescript
// src/map/internal-api.ts (新文件)

import { LocationService } from './service';

export interface IMapInternalAPI {
  executeLocationSearch(params: any): Promise<any>;
  executeDistanceCalculation(params: any): Promise<any>;
  executeGeocoding(params: any): Promise<any>;
  executeReverseGeocoding(params: any): Promise<any>;
}

export function getMapInternalAPI(): IMapInternalAPI {
  const service = getLocationService();
  return {
    executeLocationSearch: (params) => service.executeLocationSearch(params),
    executeDistanceCalculation: (params) => service.executeDistanceCalculation(params),
    executeGeocoding: (params) => service.executeGeocoding(params),
    executeReverseGeocoding: (params) => service.executeReverseGeocoding(params),
  };
}
```

## Harness 中的使用

### LLM 工具注册

```typescript
import { getLLMInternalAPI } from '@/llm/internal-api';
import { LLMExecutorWrapper } from '@/harness/integration/llm-executor-wrapper';

const harness = initializeHarness();
const llmWrapper = new LLMExecutorWrapper(harness);
const llmAPI = getLLMInternalAPI();

// 注册各个 LLM 操作
llmWrapper.registerLLMTool('llm-direct-call', (args) => 
  llmAPI.executeDirectCall(args)
);

llmWrapper.registerLLMTool('llm-intent-recognition', (args) => 
  llmAPI.executeIntentRecognition(args)
);

llmWrapper.registerLLMTool('llm-recommendation', (args) => 
  llmAPI.executeRecommendationDecision(args)
);

llmWrapper.registerLLMTool('llm-parse-response', (args) => 
  llmAPI.executeResponseParsing(args)
);
```

### 地图工具注册

```typescript
import { getMapInternalAPI } from '@/map/internal-api';
import { MapExecutorWrapper } from '@/harness/integration/map-executor-wrapper';

const harness = initializeHarness();
const mapWrapper = new MapExecutorWrapper(harness);
const mapAPI = getMapInternalAPI();

// 注册各个地图操作
mapWrapper.registerMapTool('amap-location-search', (args) => 
  mapAPI.executeLocationSearch(args)
);

mapWrapper.registerMapTool('amap-distance', (args) => 
  mapAPI.executeDistanceCalculation(args)
);

mapWrapper.registerMapTool('amap-geocoding', (args) => 
  mapAPI.executeGeocoding(args)
);

mapWrapper.registerMapTool('amap-reverse-geocoding', (args) => 
  mapAPI.executeReverseGeocoding(args)
);
```

## 集成步骤

### 第一步：添加内部接口方法

在 `src/llm/service.ts` 和 `src/map/service.ts` 中添加 `execute*` 方法。

```typescript
// 不需要修改现有逻辑，只是在适当的地方添加新方法
// 这些方法应该调用现有的私有实现，或者是非常轻量级的包装
```

### 第二步：创建内部 API 接口

创建 `src/llm/internal-api.ts` 和 `src/map/internal-api.ts`，导出内部接口。

### 第三步：在 Harness 集成层注册工具

在初始化 Harness 时，通过内部 API 注册工具。

```typescript
// src/cli/commands/recommend.ts 或类似的地方
async function setupHarness() {
  const harness = initializeHarness();
  
  // 设置 LLM 工具
  setupLLMTools(harness);
  
  // 设置地图工具
  setupMapTools(harness);
  
  return harness;
}
```

### 第四步：在对话管理器中使用

```typescript
// src/dialogue/manager.ts
export class DialogueManager {
  async getRecommendations() {
    const harness = getGlobalHarness();
    
    const result = await harness.execute('llm-recommendation', {
      preferences: this.state.userPreference
    });
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.data;
  }
}
```

## 设计优势

### 1. 保护现有代码
- 现有的 public API 完全保持不变
- 旧代码无需修改

### 2. 清晰的层次划分
- Harness 层负责约束、资源、监控
- 服务层专注于业务逻辑
- 两层独立，便于维护

### 3. 灵活的集成方式
- 可以渐进式地迁移现有功能
- 不必一次性改造所有代码

### 4. 便于测试和调试
- 可以直接调用服务层的内部接口进行单元测试
- Harness 层有独立的测试用例

## 示例完整流程

```typescript
// 第一步：初始化 Harness 和注册工具
const { harness, llm, map } = createHarnessWithWrappers();

// 第二步：通过包装器执行调用
const recommendations = await llm.executeLLMCall('llm-recommendation', {
  preferences: {
    location: '深圳南山',
    type: 'park',
    difficulty: 'easy'
  }
});

// 第三步：监控和审计自动进行
const stats = harness.getStats();
console.log('Token 使用:', stats.resources.tokenTracker);
console.log('告警:', stats.monitoring);

// 第四步：查询审计日志
const logs = harness.getExecutionTracker().getSessionAuditLogs(harness.getSessionId());
console.log('审计日志:', logs);
```

## 迁移计划

- **第一阶段**：添加内部接口方法到服务层
- **第二阶段**：创建内部 API 导出文件
- **第三阶段**：在 Harness 集成层注册工具
- **第四阶段**：逐步改造现有的 CLI 命令和对话管理器
- **第五阶段**：测试、性能优化、文档完善

## 常见问题

**Q: 为什么要分离内部接口？**
A: 保护现有 API 的同时，提供专门的 Harness 调用接口，便于版本升级和功能演进。

**Q: 现有代码会受影响吗？**
A: 不会。新增的方法不会改变现有的 public API，旧代码继续正常工作。

**Q: 性能会下降吗？**
A: 不会。新增的方法只是简单包装，性能开销可忽略。

**Q: 何时开始集成？**
A: 可以立即开始。建议从关键的 API 调用开始，逐步扩展。
