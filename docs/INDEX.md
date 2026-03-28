# 📚 完整文档索引

👉 **首先查看** `docs/README.md` 获取快速导航！

---

## 🚀 快速开始

| 文件 | 用途 |
|------|------|
| `guides/HOW-TO-RUN-TESTS.md` | 如何运行测试 |
| `guides/QUICK-TEST-GUIDE.md` | 快速参考 |
| `guides/QUICK-START.md` | 项目快速开始 |

---

## 🧪 测试文档 (guides/)

| 文件 | 说明 |
|------|------|
| `TESTING-QUICK-START.md` | 测试快速开始 |
| `UNIT-TESTING-SETUP.md` | 单元测试设置 |
| `UNIT-TESTING-SUMMARY.md` | 单元测试总结 |
| `E2E-TESTING-GUIDE.md` | E2E 测试指南 |
| `E2E-TESTING-DELIVERY.md` | E2E 测试交付 |
| `LLM-TESTING-GUIDE.md` | LLM 测试完整指南 |
| `LLM-USAGE-EXAMPLES.md` | LLM 使用示例 |
| `LLM-TEST-FLOW.md` | LLM 测试流程 |
| `README-TESTING.md` | 测试系统介绍 |
| `TESTING-SETUP-COMPLETE.md` | 测试设置完成报告 |
| `TROUBLESHOOTING.md` | 故障排除指南 |

---

## 🔧 Git Hooks 文档 (guides/)

| 文件 | 说明 |
|------|------|
| `GIT-HOOKS-GUIDE.md` | 详细配置指南 |
| `GIT-HOOKS-SETUP.md` | 快速参考 |

---

## 📊 技术报告 (reports/)

### 设计和架构
- `DESIGN-REVIEW.md` - 设计审查
- `DESIGN-REVIEW-SUMMARY.md` - 设计审查总结
- `DESIGN-REVIEW-QUICK-REFERENCE.txt` - 设计快速参考
- `ARCHITECTURE-CHECKLIST.md` - 架构检查清单

### 实现报告
- `IMPLEMENTATION-REPORT.md` - 完整实现报告
- `IMPLEMENTATION-SUMMARY.md` - 实现总结
- `COMPLETION-REPORT.txt` - 完成报告
- `PROJECT-COMPLETION-REPORT.md` - 项目完成报告
- `PHASE1-COMPLETION-SUMMARY.md` - 第一阶段总结
- `TASK-COMPLETION-RECORD.md` - 任务完成记录

### 诊断和问题
- `DIAGNOSIS-REPORT.md` - 诊断报告
- `ISSUE-ANALYSIS.md` - 问题分析
- `ANALYSIS-COMPLETE.md` - 完整分析
- `FIX-SUMMARY.md` - 修复总结
- `COMPILATION-FIX-REPORT.md` - 编译修复报告
- `AMAP-API-FIX-REPORT.md` - AMAP API 修复报告
- `RATE-LIMIT-FIX.md` - 速率限制修复
- `CURRENT-STATUS.md` - 当前状态
- `CHANGES.md` - 更改日志

### 性能和缓存
- `CACHING-STRATEGY.md` - 缓存策略
- `MIGRATION-TO-ON-DEMAND-CACHING.md` - 迁移到按需缓存
- `PERFORMANCE-OPTIMIZATION-PROGRESS.md` - 性能优化进度
- `MANAGER-INTEGRATION-SUMMARY.md` - 管理器集成总结

---

## 📋 集成规范 (specs/)

| 文件 | 说明 |
|------|------|
| `INTEGRATION-FLOW.md` | 集成流程 |
| `INTEGRATION-VERIFICATION-REPORT.md` | 集成验证报告 |
| `integration-guide.md` | 集成指南 |
| `integration-quick-reference.md` | 集成快速参考 |
| `DIALOGUE-MANAGER-INTEGRATION-REPORT.md` | 对话管理器集成 |
| `ON-DEMAND-CACHING.md` | 按需缓存规范 |
| `NEXT-TASKS-PLAN.md` | 下一步任务计划 |

---

## 📦 归档文件 (archives/)

这些是过时或历史文档，保留供参考。

| 文件 | 说明 |
|------|------|
| `AMAP-CHECKLIST.md` | AMAP 检查清单 |
| `AMAP-QUICK-FIX.md` | AMAP 快速修复 |
| `LEGACY_DOCS.md` | 遗留文档 |
| `TESTING-SUMMARY.md` | 测试总结 (旧版本) |

---

## 🎯 按用户类型推荐

### 👤 普通用户
1. `guides/HOW-TO-RUN-TESTS.md`
2. `guides/QUICK-TEST-GUIDE.md`
3. `guides/TROUBLESHOOTING.md` (需要时)

### 💻 开发者
1. `guides/LLM-TESTING-GUIDE.md`
2. `guides/LLM-USAGE-EXAMPLES.md`
3. `guides/GIT-HOOKS-GUIDE.md`
4. `reports/DESIGN-REVIEW.md`
5. `specs/INTEGRATION-FLOW.md`

### 🏗️ 架构师
1. `reports/DESIGN-REVIEW.md`
2. `reports/ARCHITECTURE-CHECKLIST.md`
3. `specs/INTEGRATION-FLOW.md`
4. `reports/CACHING-STRATEGY.md`

### 🔍 QA/测试
1. `guides/E2E-TESTING-GUIDE.md`
2. `guides/QUICK-TEST-GUIDE.md`
3. `guides/TROUBLESHOOTING.md`
4. `reports/DIAGNOSIS-REPORT.md`

---

## 📂 目录结构概览

```
docs/
├── README.md              ← 首先查看这个！
├── INDEX.md               ← 你现在在这里
├── guides/                (日常使用文档)
│   ├── HOW-TO-RUN-TESTS.md
│   ├── QUICK-TEST-GUIDE.md
│   ├── LLM-TESTING-GUIDE.md
│   └── ... (15+ 个文件)
├── reports/               (技术报告)
│   ├── DESIGN-REVIEW.md
│   ├── IMPLEMENTATION-REPORT.md
│   └── ... (22+ 个文件)
├── specs/                 (技术规范)
│   ├── INTEGRATION-FLOW.md
│   └── ... (8+ 个文件)
└── archives/              (归档文件)
    └── ... (5+ 个文件)
```

---

## 🚀 快速命令

```bash
# 查看文档概览
cat docs/README.md

# 查看测试指南
cat docs/guides/HOW-TO-RUN-TESTS.md

# 查看所有指南
ls -la docs/guides/

# 查看技术报告
ls -la docs/reports/

# 查看集成规范
ls -la docs/specs/

# 列出所有文档
find docs -name "*.md" | sort
```

---

## 💡 查找文档的方法

### 方法 1: 按文件名搜索
```bash
find docs -name "*testing*" -type f
```

### 方法 2: 按内容搜索
```bash
grep -r "keyword" docs/
```

### 方法 3: 按分类浏览
```bash
ls docs/guides/     # 查看所有指南
ls docs/reports/    # 查看所有报告
ls docs/specs/      # 查看所有规范
```

---

## ✨ 文档特点

✅ **清晰分类** - 4 个分类目录，易于查找  
✅ **快速入门** - `guides/` 包含所有常用文档  
✅ **详细参考** - `reports/` 和 `specs/` 提供深入内容  
✅ **历史保留** - 旧文档在 `archives/` 中保存  
✅ **专业结构** - 符合开源项目标准  

---

*最后更新: 2026-03-28*

**提示**: 首先阅读 `docs/README.md` 获取快速导航！
