# Git Hooks 配置指南

## 📋 概述

本项目配置了自动 Git Hooks，用于在提交代码前自动运行测试和代码检查，确保代码质量。

## 🔧 已配置的 Hooks

### 1. **pre-commit** 钩子
在提交前自动运行所有测试（Unit、Integration、E2E）

**行为**：
- ✅ 运行所有三类测试
- ✅ 所有测试通过才允许提交
- ❌ 如果测试失败，阻止提交

**执行命令**：
```bash
npm run test:all
```

**执行时间**：约 30-60 秒（取决于测试数量和系统性能）

### 2. **commit-msg** 钩子
验证提交信息的格式和长度

**验证规则**：
- 提交信息不能为空
- 最少 10 个字符
- 建议使用有意义的信息

**示例**：
```bash
# ✅ 良好的提交信息
git commit -m "feat: add LLM recommendation engine"
git commit -m "fix: resolve park filtering bug in search"

# ❌ 不良的提交信息
git commit -m "fix"              # 太短
git commit -m ""                 # 空消息
```

## 🚀 安装和启用

### 第一次使用
当你克隆或下载项目后，运行：

```bash
# 安装依赖和 husky hooks
npm install

# 或者手动初始化
npm run prepare
```

### 验证安装
查看 hooks 是否正确安装：

```bash
# 列出所有 hooks
ls -la .husky/

# 查看 pre-commit hook 内容
cat .husky/pre-commit

# 查看 commit-msg hook 内容
cat .husky/commit-msg
```

## 📊 工作流程

```
开发 → 暂存文件 → 运行 pre-commit hook
         ↓
    所有测试通过? 
    ├─ YES → 允许提交 ✅
    └─ NO  → 阻止提交，显示失败信息 ❌
```

## 💡 常见场景

### 场景 1: 测试失败
```bash
$ git commit -m "add new feature"

# 输出：
# ❌ Tests Failed - Commit Blocked
# 
# Fix the failing tests and try again:
# • npm run test:unit
# • npm run test:integration
# • npm run test:e2e
# • npm run test:all
```

**解决方案**：
```bash
# 查看详细的测试失败信息
npm run test:all

# 修复问题后重试
git commit -m "add new feature"
```

### 场景 2: 跳过 hooks（不推荐）
如果确实需要跳过 hooks（紧急情况），可以使用 `--no-verify` 标志：

```bash
git commit -m "message" --no-verify
```

⚠️ **警告**：使用此标志将绕过所有检查，可能导致错误的代码被提交。

### 场景 3: 禁用特定 hook
如果要临时禁用某个 hook：

```bash
# 重命名 pre-commit hook（禁用）
mv .husky/pre-commit .husky/pre-commit.bak

# 恢复 hook
mv .husky/pre-commit.bak .husky/pre-commit
```

## 🔍 手动检查

如果想在提交前手动运行检查：

```bash
# 运行所有测试
npm run test:all

# 只运行单元测试
npm run test:unit

# 只运行集成测试
npm run test:integration

# 只运行 E2E 测试
npm run test:e2e

# 代码检查和格式化
npm run lint
npm run format
```

## 📝 Hook 脚本位置

所有 hook 脚本存储在 `.husky/` 目录下：

```
.husky/
├── pre-commit      # 提交前运行的检查
├── commit-msg      # 验证提交信息
└── _/
    └── husky.sh    # Husky 内部脚本
```

## ⚙️ 配置文件

### package.json 中的配置

```json
{
  "scripts": {
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "prepare": "husky install"
  },
  "lint-staged": {
    "src/**/*.ts": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

## 🆘 故障排除

### 问题 1: Hook 不执行
**症状**：提交时没有运行测试

**解决方案**：
```bash
# 重新安装 husky
npm run prepare

# 设置文件权限
chmod +x .husky/pre-commit .husky/commit-msg

# 验证
ls -la .husky/pre-commit
```

### 问题 2: 权限拒绝错误
**症状**：`.husky/pre-commit: permission denied`

**解决方案**：
```bash
# 添加执行权限
chmod +x .husky/pre-commit .husky/commit-msg
```

### 问题 3: 在 Windows 上不工作
**症状**：Hooks 在 Windows 上无法执行

**解决方案**：
```bash
# 确保 Git 配置正确
git config core.hooksPath .husky

# 重新安装 husky
npm run prepare
```

### 问题 4: 测试超时
**症状**：Pre-commit hook 花费太长时间

**解决方案**：
- 检查测试是否有性能问题
- 只运行必要的测试
- 或者在 `.husky/pre-commit` 中添加超时

```bash
# 在 hook 中添加超时（例如 120 秒）
timeout 120 npm run test:all
```

## 📚 相关文档

- [Testing Guide](./LLM-TESTING-GUIDE.md) - 测试框架详细说明
- [How to Run Tests](../HOW-TO-RUN-TESTS.md) - 运行测试指南
- [Husky Documentation](https://typicode.github.io/husky/) - Husky 官方文档

## 🎯 最佳实践

1. **定期运行测试**
   ```bash
   npm run test:all
   ```

2. **在提交前验证**
   ```bash
   # 自动检查
   git commit -m "message"
   
   # 或者手动检查
   npm run test:all
   git commit -m "message"
   ```

3. **保持测试快速**
   - 优化测试性能
   - 只测试需要的部分
   - 定期审查测试

4. **记录有意义的提交信息**
   ```bash
   git commit -m "feat: add park recommendation algorithm"
   git commit -m "fix: resolve search timeout issue"
   git commit -m "docs: update testing guide"
   ```

## ✅ 总结

使用 Git Hooks 的好处：

✅ 自动化质量检查  
✅ 防止有问题的代码进入仓库  
✅ 确保代码一致性  
✅ 节省代码审查时间  
✅ 提高团队效率  

---

**需要帮助？** 查看相关的测试文档或运行 `npm run test:all` 获取详细错误信息。
