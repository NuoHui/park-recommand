# 🚀 如何运行 LLM 单元测试

## ⚡ 超快速开始（5 分钟）

### 1️⃣ 配置 API Key

创建或编辑 `.env` 文件：

```bash
# 使用 OpenAI
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini

# 或使用 Anthropic
# LLM_PROVIDER=anthropic
# ANTHROPIC_API_KEY=sk-ant-your-api-key-here
# ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

### 2️⃣ 运行测试

```bash
npm run test:llm
```

### 3️⃣ 查看结果

**成功** 🎉
```
🎉 所有测试通过！LLM 系统准备就绪。
```

**失败** ⚠️
```
⚠️  部分测试失败，请检查错误信息。
```

---

## 📋 所有可用命令

### 最常用

```bash
# ⚡ 快速测试 LLM（推荐）
npm run test:llm

# 🧪 完整单元测试
npm run test:unit

# 🏗️ 构建项目
npm run build
```

### 所有测试命令

```bash
# 快速测试 LLM（所有 6 个测试）
npm run test:llm

# 单元测试
npm run test:unit

# 集成测试
npm run test:integration

# 集成测试：宝安西乡公园推荐场景
npm run test:integration

# E2E 测试
npm run test:e2e

# 性能测试
npm run test:perf

# 所有测试
npm run test
```

### 开发命令

```bash
# 开发模式（监听变化）
npm run dev:watch

# 格式化代码
npm run format

# 代码检查
npm run lint
```

---

## 🎯 我想...

### 快速验证 LLM 是否可用

```bash
npm run test:llm
```

预期输出：`🎉 所有测试通过！` ✅

---

### 运行特定场景的集成测试

**场景**：推荐深圳宝安西乡附近的公园（距离不限制）

```bash
npm run test:integration
```

**测试流程**：
1. ✅ 地点解析 - 宝安西乡 → 经纬度
2. ✅ 类型识别 - 提取"公园"关键词
3. ✅ 距离偏好 - 识别"距离不限制"
4. ✅ 地图查询 - 获取周边公园 POI
5. ✅ 完整推荐 - 生成有序推荐列表
6. ✅ 结果验证 - 检查推荐完整性

**预期输出**：
```
✅ 集成测试报告 - 宝安西乡公园推荐
   ✅ 6/6 测试通过
   📍 推荐结果: 5+ 条公园推荐
   💯 字段完整率: 100%
```

---

### 详细了解测试

阅读文档：

| 需求 | 文档 | 阅读时间 |
|------|------|---------|
| 快速指南 | `TESTING-QUICK-START.md` | 3 分钟 |
| 完整指南 | `docs/LLM-TESTING-GUIDE.md` | 15 分钟 |
| 代码示例 | `docs/LLM-USAGE-EXAMPLES.md` | 15 分钟 |
| 流程图 | `docs/LLM-TEST-FLOW.md` | 10 分钟 |
| 完整总结 | `UNIT-TESTING-SUMMARY.md` | 20 分钟 |

---

### 解决测试失败

**步骤 1**: 查看错误信息

```
❌ 环境配置
❌ 缺少 OPENAI_API_KEY 配置
```

**步骤 2**: 查看文档

查看 `TESTING-QUICK-START.md` 的**快速故障排除**部分

**步骤 3**: 按照建议修复

常见问题：
- API Key 配置 → 检查 `.env` 文件
- 连接超时 → 检查网络/代理
- 模型不存在 → 确认模型名称

**步骤 4**: 重新运行测试

```bash
npm run test:llm
```

---

### 在生产环境使用

1. **确保测试全部通过**
   ```bash
   npm run test:llm
   ```

2. **构建项目**
   ```bash
   npm run build
   ```

3. **运行应用**
   ```bash
   npm start rec
   ```

4. **定期验证**
   ```bash
   # 定期运行此命令确保系统正常
   npm run test:llm
   ```

---

## 📊 测试结构

```
完整测试系统
│
├── 单元测试 (npm run test:unit)
│   ├── LLM 测试 (6 个)
│   │   ├── 环境配置验证
│   │   ├── 连接验证
│   │   ├── 基础调用
│   │   ├── 偏好提取
│   │   ├── 决策生成
│   │   └── 推荐解析
│   └── 高德地图测试 (8 个)
│       ├── 客户端初始化
│       ├── API 连接验证
│       ├── POI 文本搜索
│       ├── 地址编码
│       ├── 反向地址编码
│       ├── 距离计算
│       ├── 批量距离计算
│       └── 地点服务连接
│
├── 集成测试 (npm run test:integration)
│   └── 宝安西乡公园推荐场景 (6 个)
│       ├── 地点解析 - 宝安西乡坐标获取
│       ├── 类型识别 - 识别"公园"关键词
│       ├── 距离偏好识别 - 无限制距离
│       ├── 地图查询 - 获取周边公园
│       ├── 完整推荐流程 - 端到端验证
│       └── 结果验证 - 推荐内容完整性检查
│
├── E2E 测试 (npm run test:e2e)
│   └── 暂未实现
│
├── 性能测试 (npm run test:perf)
│   └── 暂未实现
│
└── 相关文档
    ├── TESTING-QUICK-START.md (快速入门)
    ├── UNIT-TESTING-SUMMARY.md (完整总结)
    ├── docs/LLM-TESTING-GUIDE.md (详细指南)
    ├── docs/LLM-USAGE-EXAMPLES.md (代码示例)
    └── docs/LLM-TEST-FLOW.md (流程图)
```

---

## 🔧 环境设置

### 前提条件

- Node.js 18+
- npm 或 yarn
- 有效的 LLM API Key

### 获取 API Key

**OpenAI**:
1. 访问 https://platform.openai.com/api-keys
2. 创建新的 API Key
3. 复制到 `.env` 文件

**Anthropic Claude**:
1. 访问 https://console.anthropic.com/
2. 创建新的 API Key
3. 复制到 `.env` 文件

### 验证配置

运行此命令检查配置是否正确：

```bash
npm run test:llm
```

如果看到 `✅ OpenAI API Key 已配置` 或 `✅ Anthropic API Key 已配置`，说明配置正确。

---

## 📈 理解测试结果

### 完全成功 ✅

```
通过: 6 / 6
成功率: 100%

🎉 所有测试通过！LLM 系统准备就绪。
```

**含义**: LLM 系统完全正常，可以使用
**下一步**: 运行 `npm start rec` 进行推荐

### 部分成功 ⚠️

```
通过: 3 / 6
成功率: 50%

⚠️  部分测试失败，请检查错误信息。
```

**含义**: 某些功能有问题
**下一步**: 查看失败的测试和错误信息，按照提示修复

### 完全失败 ❌

```
通过: 0 / 6
成功率: 0%

❌ 测试执行过程中发生错误
```

**含义**: 系统无法工作
**下一步**: 检查 `.env` 配置和网络连接

---

## 🐛 常见问题解答

### Q: 显示 "API Key not configured"

**A**: 检查 `.env` 文件
```bash
# 查看 .env 文件是否存在
cat .env

# 确保包含正确的 API Key
# 应该看到类似:
# OPENAI_API_KEY=sk-...
```

### Q: 显示 "Connection timeout"

**A**: 可能是网络问题
```bash
# 检查网络连接
ping api.openai.com

# 如果需要代理，设置环境变量
export HTTP_PROXY=http://proxy:8080
npm run test:llm
```

### Q: 显示 "Model not found"

**A**: 检查模型名称
```bash
# 确保使用正确的模型名称
# OpenAI: gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo
# Anthropic: claude-3-5-sonnet-20241022, claude-3-opus-20240229
```

### Q: 测试运行缓慢

**A**: 这是正常的，LLM 调用需要时间
```
典型运行时间: 15-20 秒
这包括:
- 连接建立: 1-2 秒
- 每个 LLM 调用: 2-5 秒
```

### Q: 可以离线运行测试吗？

**A**: 不可以，LLM 测试需要网络连接

---

## 📞 获取更多帮助

| 问题类型 | 查看文档 |
|---------|--------|
| 快速 5 分钟指南 | `TESTING-QUICK-START.md` |
| 详细故障排除 | `docs/TROUBLESHOOTING.md` |
| 常见问题 FAQ | `docs/LLM-TESTING-GUIDE.md` |
| 代码使用示例 | `docs/LLM-USAGE-EXAMPLES.md` |
| 完整系统总结 | `UNIT-TESTING-SUMMARY.md` |
| 流程图和决策树 | `docs/LLM-TEST-FLOW.md` |

---

## ✅ 快速检查清单

在运行测试前，检查以下内容：

- [ ] 已安装 Node.js 18+ (`node --version`)
- [ ] 已运行 `npm install`
- [ ] 已创建 `.env` 文件
- [ ] 已配置 LLM 提供商 (OpenAI 或 Anthropic)
- [ ] 已设置 API Key
- [ ] 已运行 `npm run build`

如果全部完成，现在可以运行：

```bash
npm run test:llm
```

---

**使用提示**: 如果第一次不确定，就运行 `npm run test:llm`！  
该脚本会自动检查所有配置并告诉你哪里有问题。

🎉 **祝你使用愉快！**
