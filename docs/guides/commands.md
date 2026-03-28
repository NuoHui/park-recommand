# 命令参考

## npm 脚本

### 开发相关

#### npm run dev

启动开发模式（含热重载）

```bash
npm run dev
```

特点：
- TypeScript 即时编译
- 文件变化自动重启
- 详细的日志输出
- 适合本地开发

#### npm run build

编译 TypeScript 代码

```bash
npm run build
```

输出：
- 编译结果在 `dist/` 目录
- 生成 JavaScript 和类型定义文件

#### npm start

生产模式运行已编译的代码

```bash
npm run build
npm start
```

特点：
- 高性能执行
- 适合实际使用
- 无热重载功能

### 代码质量

#### npm run lint

检查代码风格和问题

```bash
npm run lint
```

检查范围：
- TypeScript 类型检查
- ESLint 规则验证
- 代码风格一致性

#### npm run format

自动格式化代码

```bash
npm run format
```

使用工具：
- Prettier 格式化
- 自动修复 ESLint 问题

### 清理

#### npm run clean

清理构建产物

```bash
npm run clean
```

删除内容：
- `dist/` 目录
- `.cache/` 目录（可选）

### 测试

#### npm test

运行测试套件

```bash
npm test
```

测试类型：
- 单元测试
- 集成测试

## CLI 命令

应用启动后的交互命令：

### 基础流程

应用启动时自动进入交互模式，按照提示操作：

```bash
npm run dev
```

### 获取帮助

在推荐结果后选择 "详情" 或其他选项查看帮助

```
[?] 需要帮助吗？
    > 详情 (1)
    > 重新推荐 (2)
    > 路线规划 (3)
    > 退出 (4)
```

## 环境变量命令

### 查看当前配置

```bash
# 查看所有 .env 配置
cat .env

# 查看特定配置
grep "OPENAI_API_KEY" .env

# 查看所有 API Key 配置
grep -E "^[A-Z_]*KEY" .env
```

### 修改配置

```bash
# 编辑 .env 文件
nano .env      # macOS/Linux
# 或
code .env      # 使用 VS Code

# 修改后需要重启应用使配置生效
```

## 调试命令

### 启用详细日志

```bash
DEBUG=true npm run dev
```

输出详细的调试信息，包括：
- API 请求和响应
- 缓存操作
- 内部状态变化

### 更改日志级别

```bash
LOG_LEVEL=debug npm run dev
```

日志级别（从最详细到最少）：
- `debug` - 详细的调试信息
- `info` - 一般信息
- `warn` - 警告信息
- `error` - 错误信息

### 查看实时日志

```bash
# 查看应用日志
tail -f logs/app.log

# 过滤错误日志
tail -f logs/app.log | grep "ERROR"

# 过滤特定模块
tail -f logs/app.log | grep "LLM\|API\|Cache"
```

## 性能分析

### 测试响应时间

运行应用并记录时间：

```bash
# 记录开始时间
time npm run dev

# 或手动计时：按 Ctrl+C 停止计时
```

### 监控内存占用

```bash
# macOS
top -l 1 | grep "node"

# Linux
ps aux | grep "node"
```

### 查看日志中的性能指标

```bash
# 查看请求耗时
grep "duration" logs/app.log

# 查看缓存命中率
grep "cache" logs/app.log
```

## 文件操作命令

### 清理日志

```bash
# 清理过期日志（保留最新 10 个）
find logs -name "app.log.*" -type f | sort | head -n -10 | xargs rm

# 或清理所有日志
rm logs/*.log*
```

### 清理缓存

```bash
# 清理缓存目录
rm -rf .cache

# 应用会在下次运行时重建缓存
```

### 管理环境变量

```bash
# 备份当前配置
cp .env .env.backup

# 恢复备份
cp .env.backup .env

# 复位为示例配置
cp .env.example .env
```

## 快速参考

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式 |
| `npm run build` | 编译代码 |
| `npm start` | 生产运行 |
| `npm run lint` | 代码检查 |
| `npm run format` | 代码格式化 |
| `npm run clean` | 清理构建 |
| `npm test` | 运行测试 |
| `npm run build && npm start` | 完整生产流程 |

## 下一步

- [基础使用](./usage.md) - 应用使用指南
- [故障排查](./troubleshooting.md) - 解决常见问题
- [配置说明](../getting-started/configuration.md) - 详细配置参考
