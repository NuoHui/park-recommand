# CLI 框架实现说明

## 📋 概览

使用 Commander.js 框架实现了完整的 CLI 命令框架，包括：

- ✅ 主命令和子命令定义
- ✅ 命令行参数解析
- ✅ 多轮交互式对话
- ✅ 状态机管理
- ✅ 缓存系统框架
- ✅ 完整的帮助系统

## 🏗️ 项目结构

```
src/cli/
├── index.ts                 # CLI 主框架
├── commands/
│   ├── recommend.ts        # 推荐命令（主要命令）
│   ├── history.ts          # 历史查看命令
│   └── help.ts             # 详细帮助命令
│
src/dialogue/
├── manager.ts              # 对话管理器（多轮对话）
└── state-machine.ts        # 状态机（对话流程控制）
│
src/cache/
└── manager.ts              # 缓存管理（本地数据缓存）
```

## 🎯 核心功能

### 1. 命令定义 (src/cli/index.ts)

使用 Commander.js 定义了以下命令：

```
park-recommender
├── recommend|rec [options]    # 获取景点推荐（主命令）
├── history [options]          # 查看推荐历史
├── help-detail                # 显示详细帮助
└── [默认]                     # 显示欢迎界面和帮助
```

**主命令选项：**
- `-t, --type <type>` - 景点类型 (park|hiking|both)
- `-d, --distance <km>` - 最大距离
- `-l, --location <location>` - 起始位置
- `-i, --interactive` - 交互模式

### 2. 推荐命令 (src/cli/commands/recommend.ts)

**交互模式流程：**

```
1. 初始化对话 → 显示欢迎信息
2. 收集位置信息 → 用户输入地址
3. 收集景点类型 → 用户选择 (P/H/B)
4. 收集距离偏好 → 用户选择 (1-4)
5. 发送到 LLM → 获取推荐
6. 展示结果 → 格式化输出推荐列表
```

**关键特性：**
- 使用 readline 模块实现交互
- 完整的用户输入验证
- 结构化的推荐结果展示
- 彩色输出和格式化

### 3. 对话管理器 (src/dialogue/manager.ts)

**核心功能：**

```typescript
class DialogueManager {
  // 初始化对话会话
  async initialize(): Promise<void>
  
  // 添加用户输入
  async addUserInput(content: string): Promise<void>
  
  // 获取推荐结果
  async getRecommendations(): Promise<RecommendationResult>
  
  // 获取对话状态
  getState(): DialogueState
  getUserPreference(): UserPreference
  getMessages(): DialogueMessage[]
  
  // 结束对话
  async close(): Promise<void>
}
```

**配置选项：**

```typescript
interface DialogueManagerConfig {
  maxTurns?: number          // 最大对话轮数（默认: 10）
  timeout?: number           // 超时时间（默认: 30000ms）
  logHistory?: boolean       // 记录历史（默认: true）
}
```

### 4. 状态机 (src/dialogue/state-machine.ts)

**对话阶段流转：**

```
GREETING
  ↓
COLLECTING_LOCATION
  ↓
COLLECTING_TYPE
  ↓
COLLECTING_DISTANCE
  ↓ (可选)
COLLECTING_DIFFICULTY
  ↓
QUERYING
  ↓
RECOMMENDING
  ↓
COMPLETED
```

**状态机 API：**

```typescript
class StateMachine {
  transition(nextState: DialoguePhase): boolean    // 状态转移
  getState(): DialoguePhase                        // 获取当前状态
  canTransitionTo(nextState: DialoguePhase): boolean
  getAllowedNextStates(): DialoguePhase[]
  reset(): void                                    // 重置状态机
}
```

### 5. 缓存系统 (src/cache/manager.ts)

**特性：**
- 双层缓存（内存 + 磁盘）
- JSON 文件存储
- 过期时间管理
- 自动清理

**API：**

```typescript
class CacheManager {
  static getInstance(): CacheManager    // 单例模式
  
  async set<T>(key: string, value: T, expirationSeconds: number)
  async get<T>(key: string): Promise<T | null>
  async delete(key: string): Promise<void>
  async clear(): Promise<void>
  
  async getHistory(limit: number): Promise<HistoryItem[]>
}
```

## 💻 使用示例

### 开发模式

```bash
# 显示帮助
npm run dev -- --help

# 显示版本
npm run dev -- --version

# 推荐命令帮助
npm run dev -- recommend --help

# 进入交互模式推荐
npm run dev -- recommend

# 快速推荐（指定参数）
npm run dev -- recommend -t hiking -d 5 -l "南山区"

# 查看历史
npm run dev -- history

# 显示详细帮助
npm run dev -- help-detail
```

### 生产模式

```bash
# 构建
npm run build

# 运行（使用 tsx）
npm start

# 或使用 Node.js 运行编译后的代码
node dist/index.js recommend
```

## 🎨 UI/UX 设计

### 欢迎界面

```
╔══════════════════════════════════════════╗
║  🏞️  深圳公园景点推荐 Agent             ║
║      Park & Hiking Recommender          ║
╚══════════════════════════════════════════╝

  Park & Hiking Recommender for Shenzhen Users
  版本: 1.0.0
```

### 交互流程示例

```
[i] 进入交互推荐模式...
──────────────────────────────────────

[?] 请告诉我你的所在位置或地址: 南山区
好的！你更喜欢哪种景点？
- P: 公园 (Park)
- H: 爬山 (Hiking)
- B: 都可以 (Both)

[?] 请选择 [P/H/B]: h
好的！你希望景点距离多远？
[1] 3 km 以内
[2] 5 km 以内
[3] 10 km 以内
[4] 无限制

[?] 请选择 [1-4]: 2

[i] 正在分析你的偏好并获取推荐...

✓ 推荐完成！

──────────────────────────────────────
推荐结果:
──────────────────────────────────────

#1  梧桐山风景区
    距离: 3.2 km
    评分: ★★★★★ 4.8/5.0
    推荐理由: 根据你的偏好，这是一个很好的登山选择

#2  翠竹山公园
    距离: 1.5 km
    评分: ★★★★☆ 4.5/5.0
    推荐理由: 距离近，适合休闲散步

#3  莲花山公园
    距离: 2.8 km
    评分: ★★★★☆ 4.3/5.0
    推荐理由: 城市公园，景观开阔

──────────────────────────────────────
```

## 📊 数据流

```
用户输入
  ↓
CLI 命令解析
  ↓
对话管理器处理
  ↓
状态机管理流程
  ↓
用户偏好收集
  ↓
[TODO] LLM 决策
  ↓
[TODO] 地图 API 查询
  ↓
[TODO] 结果解析和展示
  ↓
缓存管理（保存历史）
```

## 🔍 实现细节

### 交互式输入处理

使用 Node.js 原生 `readline` 模块：

```typescript
const readline = await import('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(`[?] ${prompt}`, (answer) => {
      resolve(answer);
    });
  });
};
```

### 对话状态维护

每条消息都包含完整的元数据：

```typescript
interface DialogueMessage {
  id: string                    // UUID
  role: 'user' | 'assistant'   // 角色
  content: string               // 内容
  timestamp: number             // 时间戳
  metadata?: Record<string, any> // 附加数据
}
```

### 彩色输出

使用 chalk 库实现终端颜色：

```typescript
import { color } from '@/utils/format';

console.log(color.primary('主要信息'));      // 青蓝色
console.log(color.success('成功信息'));      // 绿色
console.log(color.warning('警告信息'));      // 黄色
console.log(color.error('错误信息'));        // 红色
console.log(color.info('信息提示'));         // 蓝色
console.log(color.neutral('中立信息'));      // 灰色
```

## 🔧 扩展点

### 1. 添加新命令

在 `src/cli/index.ts` 中添加：

```typescript
program
  .command('new-command')
  .description('命令描述')
  .action(newCommandFunction);
```

### 2. 修改对话流程

编辑 `src/dialogue/manager.ts` 的 `handleXxxInput` 方法

### 3. 扩展状态机

更新 `src/dialogue/state-machine.ts` 中的 `TRANSITIONS` 映射

## 📋 待完成功能

- [ ] LLM 决策引擎集成
- [ ] 地图 API 集成
- [ ] 结果解析器
- [ ] 推荐结果缓存
- [ ] 历史查询功能
- [ ] 用户偏好学习
- [ ] 路线规划
- [ ] 天气集成

## 🎯 下一步

完成以下模块：

1. **build-dialogue-engine** - ✅ 已完成基础框架
2. **integrate-llm-service** - 集成 OpenAI/Claude API
3. **integrate-map-api** - 集成高德地图
4. **build-result-parser** - 解析 LLM 响应
5. **implement-cache-layer** - 完整缓存实现

## 📚 参考

- [Commander.js 文档](https://github.com/tj/commander.js)
- [Chalk 文档](https://github.com/chalk/chalk)
- [Node.js readline](https://nodejs.org/api/readline.html)
