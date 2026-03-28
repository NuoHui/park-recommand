# 高德 API 配置检查清单

## ✅ 配置验证

### 1. 环境变量检查

- [ ] `.env` 文件存在
- [ ] `AMAP_API_KEY` 已设置
- [ ] `AMAP_BASE_URL=https://restapi.amap.com/v3` (包含 `/v3` 路径)
- [ ] 没有拼写错误

**检查命令:**
```bash
grep -E "AMAP_API_KEY|AMAP_BASE_URL" .env
```

**应输出:**
```
AMAP_API_KEY=68b6b8799fb1de379e7f21abdf762f6d
AMAP_BASE_URL=https://restapi.amap.com/v3
```

### 2. 代码检查

- [ ] `src/map/service.ts` 中地区参数使用中文
- [ ] `src/types/map.ts` 中 location 类型支持字符串
- [ ] `convertPOI()` 方法正确处理坐标格式

**检查命令:**
```bash
grep -n "region\s*=" src/map/service.ts | head -3
```

**应输出:**
```
76:      const region = '深圳';
131:  async getLocationDetails(name: string, region = '深圳'): Promise<Location | null> {
249:        region: '深圳',
```

### 3. 编译检查

- [ ] 项目编译成功 (无错误)
- [ ] 生成的 dist 文件夹存在
- [ ] 没有 TypeScript 类型错误

**检查命令:**
```bash
npm run build 2>&1 | tail -3
```

**应输出:**
```
✅ 完成：共处理 34 个文件
```

### 4. 运行时检查

- [ ] API 连接成功
- [ ] POI 搜索返回结果 > 0
- [ ] 坐标显示正确 (不是 undefined)

**检查命令:**
```bash
npm run dev
# 然后测试搜索功能
```

## 🧪 快速测试

### 测试 API 连接

```bash
curl -s "https://restapi.amap.com/v3/ip?key=YOUR_API_KEY" | grep -o '"status":"[^"]*"'
```

**应返回:** `"status":"1"`

### 测试 POI 搜索

```bash
curl -s "https://restapi.amap.com/v3/place/text?keywords=公园&region=深圳&key=YOUR_API_KEY&pagesize=1" | grep -o '"count":[0-9]*'
```

**应返回:** `"count":` 后跟非零数字

### 测试坐标格式

```bash
curl -s "https://restapi.amap.com/v3/place/text?keywords=公园&region=深圳&key=YOUR_API_KEY&pagesize=1" | grep -o '"location":"[^"]*"'
```

**应返回:** 格式如 `"location":"113.972602,22.518968"`

## 🔍 故障排除

### 问题 1: 返回 0 个结果

**原因:** 地区参数不正确

**解决:**
```bash
# ❌ 错误
region=shenzhen

# ✅ 正确
region=深圳
```

### 问题 2: 坐标显示 undefined

**原因:** 坐标格式处理错误

**检查:**
```typescript
// 应该正确处理字符串格式
if (typeof poi.location === 'string') {
  const [lon, lat] = poi.location.split(',').map(Number);
}
```

### 问题 3: SERVICE_NOT_AVAILABLE 错误

**原因:** API URL 不完整

**解决:**
```env
# ❌ 错误
AMAP_BASE_URL=https://restapi.amap.com

# ✅ 正确
AMAP_BASE_URL=https://restapi.amap.com/v3
```

### 问题 4: API Key 无效

**解决步骤:**
1. 访问 https://lbs.amap.com/console/overview
2. 检查 API 是否已启用
3. 检查配额使用情况
4. 重新生成 API Key

## 📋 完整检查流程

```bash
# 1. 验证环境变量
echo "检查 API Key..."
grep AMAP_API_KEY .env

# 2. 验证编译
echo "编译项目..."
npm run build

# 3. 验证运行
echo "测试 API..."
npm run dev &
sleep 2
# 发送测试请求或查看日志

# 4. 查看日志
tail -20 logs/app.log
```

## ✅ 验证成功标志

所有以下条件都满足时，说明配置正确：

- ✅ `npm run build` 无错误
- ✅ `.env` 中有 `AMAP_BASE_URL=https://restapi.amap.com/v3`
- ✅ 代码中地区参数使用中文
- ✅ POI 搜索返回 > 0 个结果
- ✅ 坐标显示为有效数字 (不是 undefined)
- ✅ 日志显示 "✓ 高德 API 连接成功"

## 📞 获取帮助

如果仍有问题：

1. 查看详细报告: `AMAP-API-FIX-REPORT.md`
2. 快速参考: `AMAP-QUICK-FIX.md`
3. 联系高德地图支持: api@autonavi.com
4. 查看日志: `logs/app.log`

---

**最后更新:** 2026-03-28  
**文档版本:** 1.0
