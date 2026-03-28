# 代码结构指南

## 项目布局

```
park-recommand/
├── src/                          # 源代码目录
│   ├── index.ts                 # 应用入口
│   ├── config/                  # 配置管理
│   │   ├── env.ts              # 环境变量配置
│   │   └── constants.ts        # 常量定义
│   ├── types/                   # TypeScript 类型定义
│   │   ├── common.ts           # 通用类型
│   │   ├── park.ts             # 景点相关类型
│   │   ├── dialogue.ts         # 对话相关类型
│   │   ├── llm.ts              # LLM 相关类型
│   │   └── api.ts              # API 相关类型
│   ├── utils/                   # 工具函数库
│   │   ├── logger.ts           # 日志工具
│   │   ├── format.ts           # 格式化工具
│   │   ├── validators.ts       # 验证工具
│   │   └── errors.ts           # 错误处理
│   ├── cli/                     # CLI 框架
│   │   ├── index.ts            # CLI 入口
│   │   ├── commands/           # 命令定义
│   │   │   └── recommend.ts   # 推荐命令
│   │   └── prompts/            # 交互提示
│   │       └── questions.ts   # 问题定义
│   ├── dialogue/               # 对话管理
│   │   ├── manager.ts          # 对话管理器
│   │   ├── state-machine.ts    # 状态机
│   │   └── context.ts          # 对话上下文
│   ├── llm/                     # LLM 集成
│   │   ├── client.ts           # LLM 客户端
│   │   ├── engine.ts           # LLM 引擎
│   │   ├── prompts.ts          # Prompt 模板
│   │   ├── parser.ts           # 结果解析
│   │   └── models/             # LLM 模型配置
│   │       ├── openai.ts      # OpenAI 配置
│   │       └── anthropic.ts   # Anthropic 配置
│   ├── map/                     # 地图服务
│   │   ├── service.ts          # 地图服务逻辑
│   │   ├── amap.ts             # 高德 API
│   │   └── types.ts            # 地图相关类型
│   ├── cache/                   # 缓存系统
│   │   ├── manager.ts          # 缓存管理器
│   │   ├── storage.ts          # 本地存储
│   │   └── strategies/         # 缓存策略
│   │       └── lru.ts         # LRU 淘汰策略
│   └── services/               # 业务服务
│       ├── recommender.ts       # 推荐服务
│       └── location.ts         # 位置服务
├── dist/                        # 编译输出
├── logs/                        # 日志文件
├── .cache/                      # 缓存目录
├── docs/                        # 文档目录
├── examples/                    # 示例项目
├── package.json
├── tsconfig.json
├── .env.example
├── .eslintrc.json
├── prettier.config.json
├── .gitignore
└── README.md
```

## 模块职责

### src/config/

**目的**: 集中管理应用配置

**主要文件**:
- `env.ts` - 读取和验证环境变量
- `constants.ts` - 应用常量定义

**示例** (`env.ts`):
```typescript
export const config = {
  llm: {
    provider: process.env.LLM_PROVIDER,
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL,
    },
  },
  map: {
    apiKey: process.env.AMAP_API_KEY,
  },
};
```

### src/types/

**目的**: 定义 TypeScript 类型和接口

**主要文件**:
- `common.ts` - 通用类型
- `park.ts` - 景点数据结构
- `dialogue.ts` - 对话相关类型
- `llm.ts` - LLM 请求/响应类型
- `api.ts` - 外部 API 类型

**示例** (`park.ts`):
```typescript
export interface Park {
  id: string;
  name: string;
  location: Location;
  rating: number;
  difficulty: 'easy' | 'medium' | 'hard';
  distance: number; // km
}
```

### src/utils/

**目的**: 提供通用工具函数

**主要文件**:
- `logger.ts` - Winston 日志封装
- `format.ts` - 输出格式化
- `validators.ts` - 数据验证
- `errors.ts` - 自定义错误类

**示例** (`logger.ts`):
```typescript
export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.json(),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/app.log' }),
  ],
});
```

### src/cli/

**目的**: CLI 框架和交互管理

**结构**:
```
cli/
├── index.ts          # CLI 入口（Commander 配置）
├── commands/         # 命令处理
│   └── recommend.ts # 推荐命令实现
└── prompts/         # 用户交互
    └── questions.ts # 问卷定义
```

**责任分工**:
- `index.ts` - 程序入口和命令路由
- `commands/` - 具体命令逻辑
- `prompts/` - 用户交互流程

### src/dialogue/

**目的**: 多轮对话管理

**文件职责**:
- `manager.ts` - 对话流程管理
- `state-machine.ts` - 状态转移逻辑
- `context.ts` - 对话上下文存储

**状态流转**:
```
START → GET_LOCATION → GET_TYPE → GET_DISTANCE → PROCESS → RESULT → END
```

### src/llm/

**目的**: LLM API 集成

**文件职责**:
- `client.ts` - LLM 客户端封装（支持 OpenAI/Claude）
- `engine.ts` - 高级 LLM 操作（如重试、缓存）
- `prompts.ts` - Prompt 模板库
- `parser.ts` - 结果解析和验证

**使用示例**:
```typescript
const engine = new LLMEngine(config.llm);
const result = await engine.generateRecommendations({
  location: '南山区',
  type: 'hiking',
  maxDistance: 5,
});
```

### src/map/

**目的**: 地图 API 服务

**文件职责**:
- `service.ts` - 地图服务接口
- `amap.ts` - 高德 API 实现
- `types.ts` - 地图相关类型

**核心方法**:
```typescript
// 位置编码
geocode(address: string)

// 周边搜索
searchNearby(location: Location, keywords: string)

// 距离计算
calculateDistance(from: Location, to: Location)

// 批量距离计算
calculateDistanceBatch(from: Location, to: Location[])
```

### src/cache/

**目的**: 缓存管理系统

**文件职责**:
- `manager.ts` - 缓存管理（两层缓存）
- `storage.ts` - 本地存储（JSON）
- `strategies/` - 缓存策略实现

**缓存层次**:
1. **L1 缓存**: 内存缓存（速度快，容量小）
2. **L2 缓存**: 磁盘缓存（速度慢，容量大）

**使用示例**:
```typescript
const cache = new CacheManager();

// 获取数据（先查内存，再查磁盘，最后调用 API）
const data = await cache.get(key, async () => {
  return await fetchFromAPI();
});

// 设置数据
await cache.set(key, data, { ttl: 3600 });

// 清理过期数据
await cache.cleanup();
```

### src/services/

**目的**: 高级业务逻辑

**文件职责**:
- `recommender.ts` - 推荐算法
- `location.ts` - 位置处理

**推荐流程**:
```typescript
const recommender = new Recommender(config);

const results = await recommender.recommend({
  location: userLocation,
  type: userPreference,
  maxDistance: userDistance,
});
```

## 代码组织原则

### 1. 单一职责原则 (SRP)

每个文件只有一个主要职责：
- `manager.ts` 只管理状态
- `service.ts` 只处理业务逻辑
- `types.ts` 只定义类型

### 2. 依赖注入 (DI)

避免全局状态，通过参数注入依赖：

```typescript
// ❌ 不好
class UserService {
  private logger = logger; // 全局依赖
}

// ✅ 好
class UserService {
  constructor(private logger: Logger) {}
}
```

### 3. 类型安全

充分利用 TypeScript 的类型系统：

```typescript
// 定义清晰的接口
interface RecommendationRequest {
  location: string;
  type: 'park' | 'hiking' | 'all';
  maxDistance: number;
}

// 明确的返回类型
async recommend(req: RecommendationRequest): Promise<Park[]> {
  // ...
}
```

### 4. 错误处理

使用自定义错误类：

```typescript
export class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
  ) {
    super(message);
  }
}

// 使用
try {
  await fetchData();
} catch (error) {
  if (error instanceof APIError) {
    logger.error(error.message, { code: error.code });
  }
}
```

### 5. 异步处理

使用 async/await，避免回调地狱：

```typescript
// 串行执行
async function process() {
  const data = await fetchData();
  const processed = await processData(data);
  return processed;
}

// 并行执行
async function parallel() {
  const [data1, data2] = await Promise.all([
    fetchData1(),
    fetchData2(),
  ]);
}
```

## 导入导出规范

### 命名导出

模块提供多个功能时使用命名导出：

```typescript
// park/service.ts
export class LocationService { }
export interface Park { }
export const parseLocation = () => { }

// 使用
import { LocationService, Park, parseLocation } from './park/service';
```

### 默认导出

模块只有一个主要功能时使用默认导出：

```typescript
// cache/manager.ts
export default class CacheManager { }

// 使用
import CacheManager from './cache/manager';
```

### 索引文件 (index.ts)

用于简化导入路径：

```typescript
// dialogue/index.ts
export { DialogueManager } from './manager';
export { StateMachine } from './state-machine';
export type { DialogueContext } from './context';

// 使用
import { DialogueManager } from './dialogue'; // 而不是 './dialogue/manager'
```

## 测试文件组织

测试文件与源文件相邻，使用 `.test.ts` 或 `.spec.ts` 后缀：

```
src/
├── cache/
│   ├── manager.ts
│   ├── manager.test.ts      # 测试文件
│   └── storage.ts
```

## 配置文件位置

- `tsconfig.json` - TypeScript 配置
- `.eslintrc.json` - ESLint 配置
- `prettier.config.json` - Prettier 配置
- `.env` - 环境变量
- `.gitignore` - Git 忽略规则

## 编译输出

TypeScript 编译到 `dist/` 目录：

```
dist/
├── index.js
├── config/
│   ├── env.js
│   └── constants.js
├── types/
├── utils/
├── cli/
├── dialogue/
├── llm/
├── map/
├── cache/
└── services/
```

## 下一步

- [开发环境](./setup.md) - 设置开发环境
- [测试指南](./testing.md) - 编写测试
- [贡献指南](./contributing.md) - 提交代码
