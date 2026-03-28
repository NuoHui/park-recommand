# CLI 输出模块快速开始指南

5 分钟上手 CLI 格式化输出和交互功能。

## 🚀 快速开始

### 1. 最简单的用法

```typescript
import { getOutputManager } from '@/output';

const manager = getOutputManager();

// 显示欢迎
manager.showWelcomeAndStart();

// 显示推荐
manager.displayRecommendations(recommendations);
```

### 2. 显示欢迎界面

```typescript
const formatter = getFormatter();
formatter.printWelcome();
```

输出：
```
╔════════════════════════════════════════╗
║  🏞️  深圳公园景点推荐 Agent          ║
╚════════════════════════════════════════╝

[i] 欢迎使用！我是你的深圳景点推荐助手
[i] 输入 recommend 开始推荐，或 help-detail 查看帮助
```

### 3. 显示推荐结果

```typescript
const manager = getOutputManager();

const recommendations = [
  {
    id: '1',
    location: {
      name: '梧桐山风景区',
      latitude: 22.5429,
      longitude: 114.2165,
      distance: 3.2,
      rating: 4.8,
      difficulty: 'medium',
      tags: ['登山', '城市景观'],
    },
    reason: '最符合你的爬山偏好',
    relevanceScore: 0.95,
    estimatedTravelTime: 15,
  },
];

manager.displayRecommendations(recommendations);
```

### 4. 错误处理

```typescript
try {
  // 执行操作
} catch (error) {
  manager.handleError(error, '操作名称');
}
```

### 5. 用户交互

```typescript
const interactive = getInteractiveManager();

// 询问用户
const location = await interactive.askLocation();
const parkType = await interactive.askParkType();
const distance = await interactive.askDistance();

// 显示反馈
interactive.showSuccess('偏好收集完成！');
```

---

## 📚 常用模式

### 模式 1: 完整推荐流程

```typescript
import { getOutputManager } from '@/output';

async function recommendationFlow() {
  const manager = getOutputManager();

  try {
    // 1. 欢迎
    await manager.showWelcomeAndStart();

    // 2. 收集偏好
    const prefs = await manager.runRecommendationFlow();

    // 3. 处理中...
    manager.startRecommendationProcess();
    
    // 实际查询（这里用 await 模拟延迟）
    await sleep(2000);

    // 4. 完成处理
    manager.completeRecommendationProcess();

    // 5. 显示结果
    const recommendations = await queryRecommendations(prefs);
    manager.displayRecommendations(recommendations);

    // 6. 后续操作
    const choice = await manager.getNextSteps();
    handleUserChoice(choice);

  } catch (error) {
    manager.handleError(error, '推荐流程');
  }
}
```

### 模式 2: 仅显示推荐

```typescript
const manager = getOutputManager();

manager.displayRecommendations(recommendations, {
  cardConfig: {
    showRanking: true,
    showTags: true,
    compact: false,
  },
  showSummary: true,
  showStats: true,
  limit: 5,
});
```

### 模式 3: 显示地点详情

```typescript
const manager = getOutputManager();

manager.displayLocationDetail(location);
```

### 模式 4: 进度展示

```typescript
const manager = getOutputManager();

// 方式 1: 加载动画
manager.getInteractive().startLoading('正在查询...');
await sleep(2000);
manager.getInteractive().stopLoading();

// 方式 2: 进度条
for (let i = 0; i <= 10; i++) {
  manager.showProgress(i, 10, '处理中');
  await sleep(500);
}
```

### 模式 5: 消息输出

```typescript
const manager = getOutputManager();

// 信息
manager.getInteractive().showInfo('处理中...');

// 成功
manager.getInteractive().showSuccess('完成！');

// 警告
manager.getInteractive().showWarning('请检查输入');

// 错误
manager.getInteractive().showError('发生错误');
```

---

## 🎨 定制化

### 自定义配置

```typescript
const manager = getOutputManager({
  width: 100,        // 终端宽度
  colorize: true,    // 使用颜色
  verbose: true,     // 详细模式
});
```

### 自定义卡片样式

```typescript
manager.displayRecommendations(recommendations, {
  cardConfig: {
    showRanking: true,           // 显示排名
    showTags: true,              // 显示标签
    showReasonShort: true,       // 显示理由
    compact: false,              // 非紧凑模式
    lineLength: 60,              // 每行 60 字符
  },
  showSummary: true,             // 显示摘要
  showStats: true,               // 显示统计
  separateCards: true,           // 卡片分隔
  limit: 5,                      // 最多显示 5 个
});
```

### 禁用颜色

```typescript
const manager = getOutputManager({ colorize: false });
```

### 紧凑模式

```typescript
manager.displayRecommendations(recommendations, {
  cardConfig: { compact: true },
});
```

---

## 📊 输出示例

### 推荐列表

```
✓ 推荐完成！为你精选了以下景点：

#1 梧桐山风景区
   📍 3.2 公里 | ⭐ 4.8/5.0 | 📈 难度: 中等
   根据你的爬山偏好和距离要求，这是最合适的选择
   相关度: ██████████░░░░░░░░ 95%
   #登山 #城市景观 #生态保护区
   ⏱️  15 分钟

─────────────────────────────────────────

#2 翠竹山公园
   📍 1.5 公里 | ⭐ 4.5/5.0 | 📈 难度: 简单
   距离最近，适合快速游玩
   相关度: █████████░░░░░░░░░ 88%
   #竹林 #古刹 #休闲步道
   ⏱️  8 分钟

📊 共 2 个推荐，平均相关度 0.92
[i] 所有推荐都已根据你的偏好精心挑选。更多信息可通过 detail 命令查看。
```

### 地点详情

```
╔════════════════════════════════════════════════╗
║ 📍 梧桐山风景区 - 详细信息                    ║
╚════════════════════════════════════════════════╝

基础信息
  地址: 深圳市罗湖区梧桐山社区
  坐标: [22.5429, 114.2165]

评价信息
  距离: 3.2 公里
  评分: ★★★★★ 4.8/5.0
  难度: 中等 (3-5小时)

详细信息
  描述: 城市登山绝佳去处，360° 城市天际线景观
  游玩时间: 2-3 小时
  标签: #登山, #城市景观, #生态保护区

联系方式
  电话: 0755-12345678
  网站: www.wutongshan.gov.cn
  开放时间: 06:00-18:00
```

### 错误提示

```
✗ 网络连接失败
   代码: NETWORK_ERROR
   [i] 请检查网络连接或重试。如问题持续，请查看日志或联系支持。
```

---

## 🔄 交互示例

### 问题提示

```typescript
interactive.prompt('你更喜欢哪种景点？', [
  '公园 (P)',
  '爬山 (H)',
  '都可以 (B)',
]);

const response = await interactive.getUserInput();
```

输出：
```
[?] 你更喜欢哪种景点？
    [1] 公园 (P)
    [2] 爬山 (H)
    [3] 都可以 (B)

> h
```

### 确认操作

```typescript
const confirmed = await interactive.confirm('确认删除历史记录吗？');
if (confirmed) {
  // 执行删除
}
```

---

## 🎯 常见用法速查

| 功能 | 代码 |
|------|------|
| 显示欢迎 | `formatter.printWelcome()` |
| 显示推荐 | `manager.displayRecommendations(recs)` |
| 显示地点详情 | `manager.displayLocationDetail(loc)` |
| 显示错误 | `manager.handleError(err)` |
| 显示成功 | `interactive.showSuccess('完成')` |
| 显示警告 | `interactive.showWarning('警告')` |
| 显示加载 | `interactive.startLoading('处理中')` |
| 显示进度条 | `manager.showProgress(i, total)` |
| 询问位置 | `await interactive.askLocation()` |
| 询问类型 | `await interactive.askParkType()` |
| 询问距离 | `await interactive.askDistance()` |
| 询问难度 | `await interactive.askDifficulty()` |

---

## 💡 提示

1. **单例使用**: 使用单例模式获取管理器
   ```typescript
   const manager = getOutputManager();  // 全局唯一实例
   ```

2. **链式调用**: 大多数方法都支持返回 Promise
   ```typescript
   const prefs = await manager.runRecommendationFlow();
   ```

3. **颜色支持**: 自动检测终端颜色支持
   ```typescript
   const manager = getOutputManager({ colorize: true });
   ```

4. **响应式**: 自动适配终端宽度
   ```typescript
   const manager = getOutputManager({ width: 80 });
   ```

5. **错误处理**: 统一的错误处理方式
   ```typescript
   manager.handleError(error, '操作名');
   ```

---

## 🔗 相关资源

- [完整 API 文档](./CLI_OUTPUT.md)
- [使用示例](./examples/cli-output-example.ts)
- [类型定义](./src/output/types.ts)

---

## 🐛 常见问题

**Q: 如何禁用颜色?**
```typescript
getOutputManager({ colorize: false })
```

**Q: 如何自定义宽度?**
```typescript
getOutputManager({ width: 100 })
```

**Q: 如何显示详细信息?**
```typescript
getOutputManager({ verbose: true })
```

**Q: 如何处理长文本?**
```typescript
// 自动截断，可通过 lineLength 调整
cardConfig: { lineLength: 50 }
```

---

**开始使用**: `import { getOutputManager } from '@/output'`
