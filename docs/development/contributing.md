# 贡献指南

感谢你对本项目的兴趣！本指南将帮助你有效地贡献代码。

## 行为准则

- 尊重他人，维护友好的社区环境
- 接受建设性的批评
- 关注对社区最有利的事情
- 在讨论中保持专业和礼貌

## 如何贡献

### 1. 报告 Bug

#### 创建 Issue 前的检查

- 确认 Bug 尚未被报告
- 检查文档和常见问题
- 收集尽可能多的信息

#### Issue 模板

```
## 描述
[简洁描述 Bug 是什么]

## 复现步骤
1. [第一步]
2. [第二步]
3. ...

## 预期行为
[应该发生什么]

## 实际行为
[实际发生了什么]

## 环境信息
- Node.js 版本: [版本号]
- npm 版本: [版本号]
- 操作系统: [OS]

## 附加信息
[错误日志、截图等]
```

### 2. 建议功能

#### 建议流程

1. 在 GitHub Issues 中描述你的想法
2. 等待核心团队的反馈
3. 如果被接受，可以开始实现

#### 建议模板

```
## 功能描述
[清楚地描述你的功能建议]

## 为什么需要这个功能？
[解释这个功能的用处]

## 可能的实现方式
[描述一种或多种实现方法]

## 相关的 Issue
[引用相关 Issue，如 #123]
```

### 3. 提交代码

#### 开发流程

1. **Fork 项目**
   ```bash
   git clone https://github.com/your-username/park-recommand.git
   ```

2. **创建特性分支**
   ```bash
   git checkout -b feature/my-feature
   ```

3. **进行更改并测试**
   ```bash
   npm run lint
   npm test
   ```

4. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 添加新功能"
   git push origin feature/my-feature
   ```

5. **创建 Pull Request**
   - 在 GitHub 上创建 PR
   - 清楚地描述你的更改
   - 等待代码审查

#### Commit 消息规范

使用 Conventional Commits 格式：

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

**类型**:
- `feat`: 新功能
- `fix`: 修复 Bug
- `refactor`: 代码重构
- `style`: 代码风格变更（不影响功能）
- `test`: 添加或更新测试
- `docs`: 文档更新
- `perf`: 性能优化
- `chore`: 构建、依赖等改进

**示例**:
```
feat(cache): 实现 LRU 缓存淘汰策略

- 添加 LRU 类实现
- 集成到 CacheManager
- 添加相关测试

Closes #123
```

## 代码规范

### TypeScript 规范

```typescript
// 使用完整的类型注解
function processData(data: Park[]): Recommendation[] {
  // ...
}

// 避免 any 类型
// ❌ 不好
function process(data: any): any {
  // ...
}

// ✅ 好
function process(data: Park[]): Park[] {
  // ...
}
```

### 命名规范

```typescript
// 类名 - PascalCase
class UserService {}

// 函数名、变量名 - camelCase
const getUserData = () => {};
let userCount = 0;

// 常量 - UPPER_SNAKE_CASE
const MAX_CACHE_SIZE = 100;
const API_TIMEOUT = 30000;

// 私有成员 - 前缀下划线
private _internalState = {};

// 接口 - I 前缀（可选）
interface IUserService {
  getUser(id: string): Promise<User>;
}
```

### 代码格式化

```bash
# 格式化代码
npm run format

# 检查代码
npm run lint
```

## 测试要求

### 测试覆盖率

- **总体目标**: > 80%
- **关键模块**: > 90%

### 编写测试

```typescript
// 对于新功能，必须包含测试
describe('NewFeature', () => {
  test('should work correctly', () => {
    const result = newFeature();
    expect(result).toBeDefined();
  });
});
```

### 运行测试

```bash
# 运行所有测试
npm test

# 监视模式
npm test -- --watch

# 生成覆盖率报告
npm test -- --coverage
```

## 文档要求

### 代码注释

```typescript
/**
 * 计算推荐的景点
 * @param input - 用户输入参数
 * @returns 推荐景点列表
 * @throws {Error} 如果输入无效
 */
function recommend(input: UserInput): Promise<Park[]> {
  // ...
}
```

### 更新文档

对于新功能，需要更新相应的文档：

- API 文档 (`docs/api/`)
- 使用指南 (`docs/guides/`)
- 架构文档 (`docs/architecture/`)

## PR 审查流程

1. **提交 PR**
   - 写好清晰的 PR 描述
   - 关联相关 Issue

2. **代码审查**
   - 核心团队会进行审查
   - 可能会要求进行修改
   - 进行讨论和改进

3. **批准和合并**
   - 至少需要一个批准
   - 所有测试必须通过
   - 可以合并到主分支

## 常见问题

### Q: 如何在本地测试我的更改？

**A**:
```bash
# 编译代码
npm run build

# 运行测试
npm test

# 手动测试
npm run dev
```

### Q: 如何同步我的 Fork 与主项目？

**A**:
```bash
# 添加上游远程
git remote add upstream https://github.com/original-project/park-recommand.git

# 获取上游更改
git fetch upstream

# 重新基于上游主分支
git rebase upstream/main
```

### Q: 如何处理合并冲突？

**A**:
```bash
# 手动解决冲突
# 编辑冲突文件

# 标记为已解决
git add .

# 完成 rebase 或 merge
git rebase --continue
# 或
git merge --continue
```

### Q: 如何在发布前更新版本号？

**A**: 遵循 Semantic Versioning：
- `patch`: 修复 Bug (1.0.0 → 1.0.1)
- `minor`: 新功能 (1.0.0 → 1.1.0)
- `major`: 重大变更 (1.0.0 → 2.0.0)

## 获取帮助

- 📖 查看 [完整文档](../README.md)
- 💬 在 Issues 中提问
- 📧 通过邮件联系
- 🤝 加入社区讨论

## 认可

感谢所有为项目做出贡献的开发者！

---

## 许可证

通过提交 PR，你同意你的代码将在项目的许可证下发布（通常为 MIT）。

希望看到你的贡献！
