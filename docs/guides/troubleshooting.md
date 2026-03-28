# 常见问题与故障排查

## 安装问题

### npm install 失败

**症状**: 
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**解决方案**:
```bash
# 清除缓存并重新安装
npm cache clean --force
npm install

# 或使用强制安装（npm 7+）
npm install --legacy-peer-deps
```

### Node.js 版本不兼容

**症状**: 
```
TypeError: Class constructor cannot be invoked without 'new'
```

**解决方案**:
```bash
# 检查版本
node --version

# 需要升级到 18+
# 使用 nvm（Node 版本管理器）
nvm install 18
nvm use 18
```

## 配置问题

### API Key 错误

**症状**:
```
[ERROR] Invalid API key
[ERROR] Authentication failed
```

**解决方案**:
1. 确认 `.env` 文件中的 API Key 正确
2. 检查 API Key 是否过期
3. 验证 `LLM_PROVIDER` 与 API Key 类型匹配
4. 如使用 OpenAI，确保账号有有效支付方式

```bash
# 验证配置文件
cat .env | grep -E "^(LLM_PROVIDER|OPENAI_API_KEY|AMAP_API_KEY)"
```

### 环境变量未加载

**症状**:
```
[ERROR] AMAP_API_KEY is not set
```

**解决方案**:
```bash
# 确保 .env 文件存在
ls -la .env

# 检查文件内容
cat .env

# 重新启动应用
npm run dev
```

## 运行时问题

### 应用启动后无响应

**症状**: 应用启动但无任何提示输入

**解决方案**:
1. 检查日志输出
2. 验证网络连接
3. 检查防火墙设置

```bash
# 查看详细日志
DEBUG=true npm run dev
```

### "Cannot find module" 错误

**症状**:
```
Error: Cannot find module 'xxx'
```

**解决方案**:
```bash
# 重新安装依赖
npm install

# 清理并重新构建
npm run clean
npm run build
```

### TypeScript 编译错误

**症状**:
```
error TS2307: Cannot find module 'xxx'
```

**解决方案**:
```bash
# 检查 tsconfig.json
cat tsconfig.json

# 清理并重建
npm run clean
npm run build

# 或强制重新安装
npm cache clean --force
npm install
```

## API 相关问题

### 地图 API 失败

**症状**:
```
[ERROR] Failed to fetch location: Invalid API key
```

**解决方案**:
1. 验证高德 API Key 是否有效
2. 检查是否选择了正确的 API 类型（Web Service）
3. 确认 API 配额未超

```bash
# 手动测试 API
curl "https://restapi.amap.com/v3/place/text?key=YOUR_KEY&keywords=公园&city=深圳"
```

### LLM API 超时

**症状**:
```
[ERROR] LLM request timeout
```

**解决方案**:
1. 增加超时时间（`.env`）
   ```env
   OPENAI_TIMEOUT=60000  # 60 秒
   ```
2. 检查网络连接
3. 尝试使用更快的模型
   ```env
   OPENAI_MODEL=gpt-3.5-turbo
   ```

### API 速率限制

**症状**:
```
[ERROR] Rate limit exceeded
[ERROR] Too many requests
```

**解决方案**:
1. 等待几分钟后重试
2. 检查账户配额
3. 查看 API 使用统计

## 性能问题

### 响应很慢

**症状**: 推荐结果需要 10+ 秒才返回

**解决方案**:
1. 检查缓存配置
   ```env
   CACHE_ENABLED=true
   CACHE_TTL=3600
   ```
2. 减少 API 超时时间
3. 尝试更快的 LLM 模型

```bash
# 查看性能日志
tail -f logs/app.log | grep "duration"
```

### 高内存占用

**症状**: 应用运行时占用内存很高

**解决方案**:
1. 减少缓存大小
   ```env
   CACHE_MAX_SIZE=50  # 从 100 降低到 50
   ```
2. 关闭调试模式
   ```env
   DEBUG=false
   LOG_LEVEL=warn
   ```

## 输出相关问题

### 位置识别错误

**症状**: 输入位置后识别为其他城市的地点

**解决方案**:
1. 使用更具体的地址
2. 使用行政区名称
3. 查看识别结果并选择正确的地点

### 推荐结果不理想

**症状**: 推荐的景点不符合预期

**解决方案**:
1. 调整距离范围
2. 修改景点类型偏好
3. 选择 "重新推荐" 获取其他选项
4. 检查是否正确输入了位置

## 日志分析

### 查看日志文件

```bash
# 查看最新日志
tail -f logs/app.log

# 查看特定错误
grep "ERROR" logs/app.log

# 查看 API 调用记录
grep "API" logs/app.log
```

### 启用详细日志

```bash
# 设置调试模式
DEBUG=true npm run dev

# 或修改 .env
LOG_LEVEL=debug
npm run dev
```

## 获取帮助

如果上述方案未能解决问题：

1. **收集信息**:
   ```bash
   node --version
   npm --version
   cat .env
   tail logs/app.log
   ```

2. **检查文档**:
   - [安装指南](./installation.md)
   - [配置说明](./configuration.md)
   - [API 文档](../api/cache-system.md)

3. **提交 Issue**:
   - 在 GitHub 上提交详细的 Issue
   - 包含错误日志和重现步骤

## 常见错误代码

| 错误代码 | 含义 | 解决方案 |
|---------|------|--------|
| 401 | 认证失败 | 检查 API Key |
| 403 | 禁止访问 | 检查 API 权限或配额 |
| 404 | 未找到 | 检查请求 URL 或 API 端点 |
| 429 | 速率限制 | 等待后重试 |
| 500 | 服务器错误 | 稍后重试 |
| 503 | 服务不可用 | 检查 API 状态 |

## 下一步

- [联系支持](../../issues) - 提交 Issue
- [查看日志](../api/logging.md) - 了解日志系统
- [系统架构](../architecture/overview.md) - 理解系统工作原理
