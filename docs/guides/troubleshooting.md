# 🆘 故障排除指南

如果在使用 park-recommender 时遇到问题，请参考本指南。

---

## ❌ 常见问题

### 1. "暂无推荐结果"

**症状**: 执行 `park-recommender rec` 后，系统返回 `[!] 暂无推荐结果`

**可能原因**:
- LLM API 连接失败（已通过降级处理改善）
- 高德 API 无该地区的数据
- 搜索关键词过于具体

**解决方案**:

✅ **已修复**: 系统现在会自动尝试多个数据源（高德、热门景点、模拟数据）

如果仍然无结果，请：
1. 检查网络连接
   ```bash
   ping -c 3 dashscope-intl.aliyuncs.com  # LLM API
   ping -c 3 restapi.amap.com              # 高德 API
   ```

2. 验证 API Key
   ```bash
   # 检查 .env 文件中的 API Key 是否正确
   cat .env | grep "API_KEY"
   ```

3. 查看日志
   ```bash
   tail -f logs/app.log
   ```

---

### 2. "OPENAI_API_KEY is not configured"

**症状**: 启动时报错

**原因**: 环境变量未配置

**解决方案**:
```bash
# 编辑 .env 文件
nano .env

# 或创建新的 .env 文件
cat > .env << EOF
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-3.5-turbo
AMAP_API_KEY=your-amap-key-here
EOF
```

---

### 3. "AMAP_API_KEY is required"

**症状**: 启动时报错

**原因**: 缺少高德地图 API Key

**解决方案**:
1. 获取 API Key
   - 访问 https://lbs.amap.com/
   - 注册/登录账户
   - 创建应用并获取 Web API Key

2. 添加到 .env
   ```env
   AMAP_API_KEY=your_api_key_here
   ```

---

### 4. "超时错误" 或 "请求失败"

**症状**: 查询时超时或网络错误

**原因**:
- 网络连接缓慢
- API 服务临时不可用
- 防火墙阻止

**解决方案**:
```bash
# 检查网络连接
ping 8.8.8.8

# 增加超时时间 (修改 src/config/env.ts)
// timeout: 60000 (改为更大的值)

# 重新构建
npm run build

# 重试
npm run dev
```

---

### 5. LLM API 连接失败

**症状**: 日志中看到 "Failed to connect to LLM API"

**可能原因**:
- API Key 无效或过期
- 账户配额用完
- 服务不可用
- 网络问题

**解决方案**:

**方案 A**: 验证通义千问 API
```bash
# 测试通义千问 API
curl -X POST https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions \
  -H "Authorization: Bearer sk-your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-plus",
    "messages": [{"role": "user", "content": "test"}],
    "temperature": 0.7,
    "max_tokens": 100
  }'
```

**方案 B**: 切换到官方 OpenAI API
```bash
# 编辑 .env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_BASE_URL=https://api.openai.com/v1

# 重新构建
npm run build
npm run dev
```

---

## ✅ 故障排除步骤

如果遇到任何问题，按以下步骤排查：

### 第 1 步: 检查基本配置
```bash
# 确保 .env 文件存在且有效
ls -la .env
cat .env

# 检查必需的变量
grep -E "OPENAI_API_KEY|AMAP_API_KEY" .env
```

### 第 2 步: 检查依赖
```bash
# 确保所有依赖都已安装
npm install

# 清理并重新构建
npm run clean
npm run build
```

### 第 3 步: 查看详细日志
```bash
# 启用调试模式
DEBUG=true npm run dev

# 或查看日志文件
tail -f logs/app.log
```

### 第 4 步: 测试各个组件

**测试高德 API**:
```bash
curl "https://restapi.amap.com/v3/place/text?keywords=公园&region=深圳&key=YOUR_KEY&pagesize=1"
# 应该返回: { "status": "1", "count": "...", "pois": [...] }
```

**测试 LLM API**:
```bash
curl -X POST https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions \
  -H "Authorization: Bearer sk-YOUR-KEY" \
  -d '...'
# 应该返回: { "choices": [...] }
```

### 第 5 步: 查看系统日志
```bash
# macOS
system_log show --level debug | grep park-recommender

# Linux
journalctl -u park-recommender -f

# 查看应用日志
tail -n 50 logs/app.log
```

---

## 🎯 快速测试

运行以下命令来快速测试各个组件：

```bash
# 1. 构建项目
npm run build

# 2. 运行交互式推荐
node dist/index.js rec

# 3. 输入测试数据
# 位置: 南山
# 类型: P (公园)
# 距离: 1 (3km以内)

# 4. 应该看到推荐结果
# ✓ 推荐完成！
# #1 深圳湾公园 ...
```

---

## 📊 系统状态检查

### 检查项清单

- [ ] `.env` 文件存在且包含所有必需的 API Key
- [ ] 网络连接正常（能访问外部 API）
- [ ] `npm install` 已执行，所有依赖已安装
- [ ] `npm run build` 成功（无 TypeScript 错误）
- [ ] 至少一个 API 可用（高德或 LLM）
- [ ] 日志目录存在 (`logs/`)

### 状态指标

```
✅ 绿色 (完全正常):
  - 所有 API 都可用
  - 返回完整的推荐结果

🟡 黄色 (降级模式):
  - 一个 API 不可用，但系统仍工作
  - 返回来自其他来源的数据

🔴 红色 (无法运行):
  - 没有任何 API 可用
  - 或所有必需配置缺失
```

---

## 🆘 获取帮助

如果问题仍未解决：

1. **检查相关文档**
   - `DIAGNOSIS-REPORT.md` - 详细诊断报告
   - `ISSUE-ANALYSIS.md` - 问题分析和修复说明

2. **查看日志**
   ```bash
   tail -f logs/app.log
   ```

3. **提供以下信息**
   - 完整的错误消息
   - 日志输出
   - 运行的命令
   - 系统信息 (`uname -a`)

---

## 💡 最佳实践

1. **定期检查 API 配额**
   - 高德: https://lbs.amap.com/
   - 通义千问: https://bailian.console.aliyun.com/

2. **监控性能指标**
   ```bash
   # 查看性能指标（在推荐完成后）
   npm run dev  # 日志中会显示 "性能指标"
   ```

3. **保持日志**
   - 定期检查 `logs/app.log`
   - 设置日志轮转防止文件过大

4. **备用方案**
   - 准备备用 LLM API Key
   - 如果主 API 失败，可快速切换

---

## 📞 联系支持

如需进一步帮助，请提供：
- 系统环境信息
- 完整的日志输出
- 重现问题的具体步骤
