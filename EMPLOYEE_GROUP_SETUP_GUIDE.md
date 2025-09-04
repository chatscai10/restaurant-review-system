# 👥 員工群組通知設定指南

## 🎯 功能說明

系統現在支援同時發送通知到管理員群組和員工群組，讓所有相關人員都能即時收到評分更新。

## 🔧 Railway環境變數設定

### 基本設定 (已配置)
```bash
TELEGRAM_BOT_TOKEN = 7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc
TELEGRAM_ADMIN_GROUP = -1002658082392  # 管理員群組 (現有)
```

### 新增員工群組設定
```bash
TELEGRAM_EMPLOYEE_GROUP = -1234567890    # 員工群組ID (待設定)
NOTIFY_BOTH_GROUPS = true                # 啟用雙群組通知
```

## 📱 設定步驟

### 1. 取得員工群組ID
1. 將Bot添加到員工群組
2. 在群組中發送訊息
3. 查看Bot日誌或使用Telegram API取得群組ID
4. 群組ID格式通常為負數，例如：`-1234567890`

### 2. 設定Railway環境變數
```bash
railway variables --set "TELEGRAM_EMPLOYEE_GROUP=-1234567890"
railway variables --set "NOTIFY_BOTH_GROUPS=true"
```

### 3. 重新部署
```bash
railway up
```

## 🎨 通知格式 (已修復)

修復後的通知格式適合員工查看：

```
每日平台評分自動更新
獎金以每月5號的更新訊息為計算
━━━━━━━━━━━━━━━━━━━━━━

不早脆皮雞排 中壢龍崗店

Google Maps 4.6⭐ (1,183 評論)
https://www.google.com/maps/place/不早脆皮雞排-中壢龍崗店

UberEats 4.8⭐ (600+ 評論)
https://www.ubereats.com/tw/store/...

Foodpanda 4.7⭐ (500+ 評論)
https://www.foodpanda.com.tw/restaurant/...

[其他分店...]

⏰ 2025/9/2 下午6:23:16 | ☁️ Railway雲端 | ⚡ 34秒
🤖 自動評分系統 v4.0 | 📊 成功率: 3/3
```

## 🔄 運作邏輯

### 系統決策流程
```javascript
// 1. 總是發送到管理員群組
await sendTelegramToGroup(adminGroup, report, '管理員群組');

// 2. 如果啟用雙群組通知且設定了員工群組
if (employeeGroup && notifyBothGroups) {
    await sendTelegramToGroup(employeeGroup, report, '員工群組');
}
```

### 日誌輸出
```
📤 準備發送Telegram通知...
📱 管理員群組通知發送成功
📤 準備發送到員工群組...
📱 員工群組通知發送成功
📱 Telegram報告發送嘗試完成
```

## 🎛️ 控制選項

### 選項1：只發送到管理員群組 (預設)
```bash
NOTIFY_BOTH_GROUPS = false
# 或不設定此變數
```

### 選項2：同時發送到兩個群組
```bash
TELEGRAM_EMPLOYEE_GROUP = -1234567890
NOTIFY_BOTH_GROUPS = true
```

### 選項3：動態控制
可透過修改環境變數即時啟用/停用員工群組通知，無需修改程式碼。

## 🛡️ 安全考量

1. **權限控制**：員工群組只收到評分資訊，不包含敏感的系統管理資訊
2. **Bot權限**：確保Bot在兩個群組都有發送訊息權限
3. **群組管理**：建議員工群組設為只能管理員邀請

## 🧪 測試方式

### 本機測試
```bash
set TELEGRAM_EMPLOYEE_GROUP=-1234567890
set NOTIFY_BOTH_GROUPS=true
node cloud-enhanced-crawler.js
```

### Railway測試
設定環境變數後，系統會在下次執行時自動發送到兩個群組。

## 📊 監控與維護

### 成功指標
- 兩個群組都收到通知
- 日誌顯示兩次發送成功
- 無錯誤訊息

### 常見問題
1. **群組ID錯誤**：檢查負數格式
2. **Bot權限不足**：確認Bot在群組中有發送權限
3. **環境變數未生效**：重新部署Railway

---

**準備狀態**: ✅ 代碼已實現，等待群組ID設定  
**下一步**: 取得員工群組ID並設定環境變數  
**建議**: 先在測試群組驗證功能正常後再切換到正式員工群組