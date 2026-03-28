# 📚 文档中心

深圳公园景点推荐 CLI Agent 的完整文档和指南。

## 🚀 快速导航

### 📖 新手入门
- 查看项目根目录的 **[README.md](../README.md)** - 快速开始和功能介绍
- 运行 `npm run test:amap` - 查看单元测试实例

### 🧪 测试和开发
- **测试运行**: 参考根目录 README 的"测试"章节
- **单元测试**: 查看 `src/__tests__/unit/` 目录
- **命令参考**: 参考根目录 README 的"常用命令"章节

### 📂 文档目录

```
docs/
├── README.md                   ← 本文件
├── INDEX.md                    ← 完整文档索引（可选）
├── guides/                     # 日常使用指南
│   ├── HOW-TO-RUN-TESTS.md    # 如何运行测试
│   ├── QUICK-TEST-GUIDE.md    # 测试快速指南
│   ├── LLM-TESTING-GUIDE.md   # LLM 测试指南
│   ├── TROUBLESHOOTING.md     # 故障排除
│   └── ...                     # 其他指南
├── reports/                    # 技术报告和分析
│   ├── DESIGN-REVIEW.md       # 系统设计
│   └── ...                     # 其他报告
└── specs/                      # 技术规范
    └── ON-DEMAND-CACHING.md   # 缓存规范
```

## 🎯 按需求查找

### 我想...

- **📖 快速了解项目** → 查看 [项目 README](../README.md)
- **🧪 运行测试** → 查看 [README - 测试章节](../README.md#-测试)
- **🔧 配置环境** → 查看 [README - 环境变量配置](../README.md#-环境变量配置)
- **🐛 解决问题** → 查看 [guides/TROUBLESHOOTING.md](./guides/TROUBLESHOOTING.md)
- **📊 理解架构** → 查看 [README - 系统架构](../README.md#-系统架构)
- **💡 了解 LLM** → 查看 [guides/LLM-TESTING-GUIDE.md](./guides/LLM-TESTING-GUIDE.md)

## 📋 核心文档

### 指南 (guides/)

| 文档 | 描述 |
|------|------|
| **HOW-TO-RUN-TESTS.md** | 详细的测试运行指南 |
| **QUICK-TEST-GUIDE.md** | 快速测试参考 |
| **LLM-TESTING-GUIDE.md** | LLM 集成和测试 |
| **TROUBLESHOOTING.md** | 常见问题和解决方案 |
| **GIT-HOOKS-GUIDE.md** | Git 提交钩子配置 |

### 报告 (reports/)

| 文档 | 描述 |
|------|------|
| **DESIGN-REVIEW.md** | 系统设计评审 |
| 其他 | 各阶段的技术报告 |

### 规范 (specs/)

| 文档 | 描述 |
|------|------|
| **ON-DEMAND-CACHING.md** | 按需缓存规范 |

## 🔗 相关链接

- **项目仓库**: 见 git 配置
- **API 文档**: 内联在源代码注释中
- **类型定义**: `src/types/` 目录

## 📞 需要帮助？

1. **查看故障排除**: [TROUBLESHOOTING.md](./guides/TROUBLESHOOTING.md)
2. **查看测试指南**: [HOW-TO-RUN-TESTS.md](./guides/HOW-TO-RUN-TESTS.md)
3. **运行诊断脚本**: `npm run diagnose:llm`
4. **查看项目 README**: [../README.md](../README.md)

---

**最后更新**: 2024-03-28  
**版本**: 1.0.0
