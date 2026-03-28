# 📚 文档指南

## 🎯 快速导航

### 👤 我想快速开始
→ **`guides/HOW-TO-RUN-TESTS.md`** - 5 分钟快速开始

### 🧪 我想运行测试
→ **`guides/QUICK-TEST-GUIDE.md`** - 测试快速指南

### 🔧 我想配置 Git Hooks
→ **`guides/GIT-HOOKS-GUIDE.md`** - Git Hooks 详细说明

### 💻 我是开发者，想深入了解
→ **`guides/LLM-TESTING-GUIDE.md`** - LLM 完整文档  
→ **`guides/E2E-TESTING-GUIDE.md`** - E2E 测试文档

### 🐛 我遇到了问题
→ **`guides/TROUBLESHOOTING.md`** - 故障排除指南

---

## 📁 文档目录结构

```
docs/
├── README.md                 (本文件)
├── INDEX.md                  (详细文档索引)
│
├── guides/                   (📖 使用指南 - 日常使用)
│   ├── HOW-TO-RUN-TESTS.md
│   ├── QUICK-TEST-GUIDE.md
│   ├── TESTING-QUICK-START.md
│   ├── QUICK-START.md
│   ├── LLM-TESTING-GUIDE.md
│   ├── LLM-USAGE-EXAMPLES.md
│   ├── E2E-TESTING-GUIDE.md
│   ├── GIT-HOOKS-GUIDE.md
│   └── TROUBLESHOOTING.md
│
├── reports/                  (📊 技术报告 - 参考资料)
│   ├── DESIGN-REVIEW.md
│   ├── ARCHITECTURE-CHECKLIST.md
│   ├── IMPLEMENTATION-REPORT.md
│   └── ... (15+ 其他报告)
│
├── specs/                    (📋 规范文档 - 技术规范)
│   ├── INTEGRATION-FLOW.md
│   ├── integration-guide.md
│   ├── ON-DEMAND-CACHING.md
│   └── ... (其他集成文档)
│
└── archives/                 (📦 归档文件 - 过时文档)
    ├── AMAP-CHECKLIST.md
    ├── LEGACY_DOCS.md
    └── ... (历史文档)
```

---

## 📖 按用途分类

### 🚀 **新用户/快速开始**
1. `guides/HOW-TO-RUN-TESTS.md` - 首先读这个
2. `guides/QUICK-TEST-GUIDE.md` - 快速运行测试
3. `guides/QUICK-START.md` - 项目快速开始

### 🧪 **测试工程师**
- `guides/TESTING-QUICK-START.md` - 测试入门
- `guides/UNIT-TESTING-SETUP.md` - 单元测试设置
- `guides/E2E-TESTING-GUIDE.md` - E2E 测试
- `guides/LLM-TESTING-GUIDE.md` - LLM 测试
- `guides/QUICK-TEST-GUIDE.md` - 快速参考

### 💻 **开发者**
- `guides/LLM-TESTING-GUIDE.md` - LLM 完整文档
- `guides/LLM-USAGE-EXAMPLES.md` - 代码示例
- `guides/GIT-HOOKS-GUIDE.md` - 提交前检查
- `specs/INTEGRATION-FLOW.md` - 集成规范
- `reports/IMPLEMENTATION-REPORT.md` - 实现细节

### 🏗️ **架构师/技术主管**
- `reports/DESIGN-REVIEW.md` - 设计审查
- `reports/ARCHITECTURE-CHECKLIST.md` - 架构检查清单
- `reports/IMPLEMENTATION-SUMMARY.md` - 实现总结
- `specs/integration-guide.md` - 集成指南

### 🔍 **问题排查**
- `guides/TROUBLESHOOTING.md` - 故障排除指南
- `reports/DIAGNOSIS-REPORT.md` - 诊断报告
- `reports/ISSUE-ANALYSIS.md` - 问题分析

---

## 🎯 常见任务

### 任务 1: 运行测试
```bash
# 查看文档
cat guides/HOW-TO-RUN-TESTS.md

# 然后运行
npm run test:all
```

### 任务 2: 配置 Git Hooks
```bash
# 查看指南
cat guides/GIT-HOOKS-GUIDE.md

# 然后正常提交
git commit -m "your message"
```

### 任务 3: 学习 LLM 功能
```bash
# 查看完整指南
cat guides/LLM-TESTING-GUIDE.md

# 查看代码示例
cat guides/LLM-USAGE-EXAMPLES.md
```

### 任务 4: 参与开发
```bash
# 了解架构
cat reports/DESIGN-REVIEW.md

# 了解集成流程
cat specs/INTEGRATION-FLOW.md

# 查看代码示例
cat guides/LLM-USAGE-EXAMPLES.md
```

---

## 📊 文档统计

| 分类 | 文件数 | 用途 |
|------|--------|------|
| **guides/** | 15+ | 日常使用、快速参考 |
| **reports/** | 22+ | 技术分析、设计文档 |
| **specs/** | 8+ | 技术规范、集成指南 |
| **archives/** | 5+ | 历史文档、过时内容 |

**总计**: ~50 个文档，清晰分类

---

## 💡 如何使用

### 方法 1: 按角色选择
```bash
# 新手用户
cat guides/HOW-TO-RUN-TESTS.md

# 开发者
cat guides/LLM-TESTING-GUIDE.md
cat guides/LLM-USAGE-EXAMPLES.md

# 架构师
cat reports/DESIGN-REVIEW.md
```

### 方法 2: 按任务选择
```bash
# 运行测试
cat guides/QUICK-TEST-GUIDE.md

# 提交代码
cat guides/GIT-HOOKS-GUIDE.md

# 集成功能
cat specs/INTEGRATION-FLOW.md
```

### 方法 3: 查看完整索引
```bash
cat INDEX.md
```

---

## ⚡ 最常用的文件

```
✅ guides/HOW-TO-RUN-TESTS.md              - 必读
✅ guides/QUICK-TEST-GUIDE.md              - 快速参考
✅ guides/GIT-HOOKS-GUIDE.md               - 提交前检查
✅ guides/LLM-TESTING-GUIDE.md             - 开发必读
✅ guides/TROUBLESHOOTING.md               - 遇到问题时查看
```

---

## 🚀 建议阅读顺序

**第一次使用 (30 分钟)**
```
1. guides/HOW-TO-RUN-TESTS.md (5 min)
2. guides/QUICK-TEST-GUIDE.md (5 min)
3. npm run test:all (10 min)
4. guides/TROUBLESHOOTING.md (10 min 如有问题)
```

**深入开发 (2 小时)**
```
1. guides/LLM-TESTING-GUIDE.md (30 min)
2. guides/LLM-USAGE-EXAMPLES.md (30 min)
3. reports/DESIGN-REVIEW.md (30 min)
4. specs/INTEGRATION-FLOW.md (30 min)
```

**系统学习 (1 天)**
```
1. 快速开始文档
2. 所有 guides/ 文件
3. 相关的 reports/ 文件
4. 相关的 specs/ 文件
```

---

## 📝 文档管理

- ✅ **重要文档**: 保存在 `guides/` 中，日常使用
- ✅ **参考资料**: 保存在 `reports/` 和 `specs/` 中，需要时查看
- ✅ **过时文档**: 保存在 `archives/` 中，保留以供参考

---

## 🔗 相关资源

- 主 README: `../README.md` - 项目概述
- 源代码: `../src/` - 项目代码
- 测试代码: `../src/__tests__/` - 测试文件

---

## ✨ 特点

✅ **清晰分类** - 文档按用途分类，易于查找  
✅ **快速参考** - 常用文档在 `guides/` 中，开箱即用  
✅ **详细文档** - 深入学习的详细文档在对应分类中  
✅ **历史保留** - 旧文档保存在 `archives/` 中，方便回顾  
✅ **专业结构** - 符合开源项目最佳实践  

---

**最后更新**: 2026-03-28

**建议**: 首先阅读 `guides/HOW-TO-RUN-TESTS.md`，然后根据需要选择其他文档。
