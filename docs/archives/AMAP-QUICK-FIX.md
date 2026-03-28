# 高德 API 错误 (10002) - 快速修复指南

## 🔴 错误症状

```
POI 搜索失败: 高德 API 错误: SERVICE_NOT_AVAILABLE (10002)
```

## ✅ 快速修复（3 步）

### Step 1: 修复 API 基础 URL

**编辑 `.env` 文件:**

```diff
- AMAP_BASE_URL=https://restapi.amap.com
+ AMAP_BASE_URL=https://restapi.amap.com/v3
```

### Step 2: 地区参数使用中文

代码中的地区参数应使用中文名称：

```typescript
// ❌ 错误
const region = 'shenzhen';

// ✅ 正确
const region = '深圳';
```

### Step 3: 坐标格式正确处理

高德 API 返回的坐标格式为字符串 `"经度,纬度"`:

```typescript
// ✅ 正确处理
if (typeof poi.location === 'string') {
  const [lon, lat] = poi.location.split(',').map(Number);
}
```

## 📊 修复结果

| 项 | 前 | 后 |
|----|----|----|
| POI 搜索结果 | 0 | 20+ |
| 坐标显示 | undefined | ✅ 正确 |
| API 状态 | ❌ 失败 | ✅ 成功 |

## 🧪 验证

```bash
npm run build      # ✅ 编译成功
npm run dev        # ✅ 正常运行
```

## 📝 更多信息

详见: `AMAP-API-FIX-REPORT.md`

---

**问题已解决** ✅
