# 📑 文档完整索引

## 📖 主文档

### 项目级
- [项目 README](../README.md) - 项目概览、快速开始、功能介绍、常用命令

### 文档中心
- [docs/README.md](./README.md) - 文档导航和快速查找

## 🧪 测试文档 (guides/)

### 测试执行
- [HOW-TO-RUN-TESTS.md](./guides/HOW-TO-RUN-TESTS.md) - 详细的测试运行指南
- [QUICK-TEST-GUIDE.md](./guides/QUICK-TEST-GUIDE.md) - 快速参考命令

### 功能测试
- [LLM-TESTING-GUIDE.md](./guides/LLM-TESTING-GUIDE.md) - LLM 集成测试指南

### 开发指南
- [GIT-HOOKS-GUIDE.md](./guides/GIT-HOOKS-GUIDE.md) - Git Hooks 配置

### 问题排查
- [TROUBLESHOOTING.md](./guides/TROUBLESHOOTING.md) - 常见问题和解决方案

## 📊 技术报告 (reports/)

### 系统设计
- [DESIGN-REVIEW.md](./reports/DESIGN-REVIEW.md) - 系统设计评审文档

### 其他报告
- [reports/](./reports/) - 其他技术报告和分析文档

## 📋 技术规范 (specs/)

### 核心规范
- [ON-DEMAND-CACHING.md](./specs/ON-DEMAND-CACHING.md) - 按需缓存实现规范

## 🚀 快速命令

```bash
# 查看主文档
cat README.md

# 查看快速测试指南
cat guides/QUICK-TEST-GUIDE.md

# 查看故障排除
cat guides/TROUBLESHOOTING.md

# 运行测试
npm test
npm run test:amap
npm run test:llm
```

## 📂 文档统计

| 目录 | 类型 | 数量 | 说明 |
|------|------|------|------|
| guides/ | 指南 | 24 | 日常使用指南 |
| reports/ | 报告 | 22 | 技术报告和分析 |
| specs/ | 规范 | 1 | 技术规范 |
| **合计** | | **47+** | |

## 🔍 按主题查找

### 🧪 我要...
- **运行测试** → [HOW-TO-RUN-TESTS.md](./guides/HOW-TO-RUN-TESTS.md)
- **快速查看命令** → [QUICK-TEST-GUIDE.md](./guides/QUICK-TEST-GUIDE.md)
- **测试 LLM** → [LLM-TESTING-GUIDE.md](./guides/LLM-TESTING-GUIDE.md)
- **解决问题** → [TROUBLESHOOTING.md](./guides/TROUBLESHOOTING.md)

### 🏗️ 我要...
- **了解架构** → [项目 README 的系统架构章节](../README.md#-系统架构)
- **查看设计** → [DESIGN-REVIEW.md](./reports/DESIGN-REVIEW.md)
- **了解缓存** → [ON-DEMAND-CACHING.md](./specs/ON-DEMAND-CACHING.md)

### 🔧 我要...
- **配置 Git** → [GIT-HOOKS-GUIDE.md](./guides/GIT-HOOKS-GUIDE.md)
- **快速开始** → [项目 README](../README.md)
- **环境配置** → [项目 README 的环境变量章节](../README.md#-环境变量配置)

---

**文档最后更新**: 2024-03-28  
**版本**: 1.0.0

**提示**: 大多数文档位置已简化。建议从 [项目 README](../README.md) 或 [docs/README.md](./README.md) 开始。
