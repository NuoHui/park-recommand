# 开发环境设置

## 前置要求

### 系统要求

- **操作系统**: macOS、Linux 或 Windows (WSL2)
- **内存**: 最少 4GB（建议 8GB+）
- **磁盘**: 最少 2GB 可用空间

### 软件要求

- **Node.js**: 18.0.0 或更高版本
- **npm**: 9.0.0 或更高版本
- **Git**: 最新版本
- **文本编辑器**: VS Code（推荐）或其他支持 TypeScript 的编辑器

## 环境变量配置

### 1. 复制示例文件

```bash
cp .env.example .env
```

### 2. 获取 API Keys

#### OpenAI API Key

1. 访问 [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. 创建新的 API Key
3. 复制到 `.env`:
   ```env
   OPENAI_API_KEY=sk-your-key-here
   ```

#### 高德 API Key

1. 访问 [https://lbs.amap.com/api/webservice/](https://lbs.amap.com/api/webservice/)
2. 创建新的 Web Service Key
3. 复制到 `.env`:
   ```env
   AMAP_API_KEY=your-key-here
   ```

### 3. 完整配置示例

```env
# LLM 配置
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview

# 地图 API 配置
AMAP_API_KEY=your-key

# 开发配置
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
```

## 安装步骤

### 1. 克隆项目

```bash
git clone <repository-url>
cd park-recommand
```

### 2. 安装依赖

```bash
npm install
```

### 3. 验证安装

```bash
npm run build
```

如果编译成功，说明环境配置正确。

## IDE 配置

### VS Code 推荐配置

#### 安装扩展

1. **ES7+ React/Redux/React-Native snippets**
   - 提供 JavaScript/TypeScript 代码片段

2. **TypeScript Vue Plugin**
   - TypeScript 支持

3. **ESLint**
   - 代码检查

4. **Prettier - Code formatter**
   - 代码格式化

5. **REST Client**
   - API 测试工具

#### 工作区设置

创建 `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "search.exclude": {
    "node_modules": true,
    ".cache": true,
    "dist": true
  }
}
```

## 常见开发任务

### 开发流程

```bash
# 1. 启动开发服务器（热重载）
npm run dev

# 2. 在另一个终端监听文件变化
npm run build -- --watch

# 3. 定期检查代码质量
npm run lint
npm run format
```

### 代码编写

#### 创建新模块

```bash
# 1. 在 src 中创建新目录
mkdir -p src/modules/my-module

# 2. 创建模块文件
touch src/modules/my-module/index.ts
touch src/modules/my-module/types.ts
touch src/modules/my-module/module.test.ts

# 3. 在 src/modules/index.ts 中导出
echo "export * from './my-module';" >> src/modules/index.ts
```

#### 编写测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- cache.test

# 监视模式（自动重新运行）
npm test -- --watch
```

### 调试

#### 启用详细日志

```bash
# 方式 1: 命令行传入
DEBUG=true LOG_LEVEL=debug npm run dev

# 方式 2: 修改 .env
LOG_LEVEL=debug
npm run dev
```

#### VS Code 调试

创建 `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "program": "${workspaceFolder}/dist/index.js",
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

## Git 工作流

### 提交前检查

```bash
# 1. 格式化代码
npm run format

# 2. 检查代码质量
npm run lint

# 3. 运行测试
npm test

# 4. 提交代码
git add .
git commit -m "feat: 描述你的修改"
```

### 分支管理

```bash
# 创建特性分支
git checkout -b feature/my-feature

# 定期同步主分支
git fetch origin
git rebase origin/main

# 提交 PR 前推送分支
git push origin feature/my-feature
```

## 性能优化

### 构建优化

```bash
# 分析构建大小
npm run build -- --analyze

# 检查依赖
npm ls

# 查找未使用的依赖
npm install -g depcheck
depcheck
```

### 运行时监控

```bash
# 查看内存占用
node --max-old-space-size=2048 dist/index.js

# 性能分析
node --prof dist/index.js
node --prof-process isolate-*.log > profile.txt
```

## 常见问题

### Q: TypeScript 编译失败

**A**: 
```bash
# 清理并重新安装
npm run clean
npm install
npm run build
```

### Q: 环境变量未加载

**A**:
```bash
# 检查 .env 文件
cat .env

# 重启开发服务器
npm run dev
```

### Q: 依赖冲突

**A**:
```bash
# 清理 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### Q: 修改后代码未生效

**A**:
```bash
# 清理缓存
npm run clean

# 重新构建
npm run build

# 重启应用
npm start
```

## 推荐工具

### 命令行工具

| 工具 | 用途 | 安装 |
|------|------|------|
| nvm | Node 版本管理 | `curl -o- https://raw.github.com/...` |
| yarn | 包管理器 | `npm install -g yarn` |
| pm2 | 进程管理 | `npm install -g pm2` |
| nodemon | 文件监听 | `npm install -g nodemon` |

### 浏览器工具

- Chrome DevTools - 网络调试
- REST Client - API 测试
- JSON Viewer - JSON 格式化

## 下一步

- [测试指南](./testing.md) - 编写和运行测试
- [贡献指南](./contributing.md) - 提交代码
- [代码结构](./code-structure.md) - 了解项目结构
