# 🤖 雲端自動化查詢設置指南

## 📋 功能概述

此雲端自動化系統可以：
- ⏰ **每天凌晨1點自動執行**查詢
- 🔍 **多店家、多平台**同時監控
- 📱 **自動Telegram通知**查詢結果
- 🔄 **錯誤重試機制**，確保穩定性
- 📊 **執行日誌記錄**，便於追蹤
- 🆓 **完全免費**（使用GitHub Actions）

## 🚀 快速設置步驟

### 1. 🎯 準備GitHub倉庫

```bash
# 1. 創建新的GitHub倉庫
# 2. 將專案代碼推送到倉庫
git init
git add .
git commit -m "初始化分店評價自動查詢系統"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/restaurant-rating-monitor.git
git push -u origin main
```

### 2. 🔐 設置GitHub Secrets

在GitHub倉庫中，進入 `Settings` → `Secrets and variables` → `Actions`，添加以下Secrets：

#### 必須設置的Secrets：

**TELEGRAM_BOT_TOKEN**
```
7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc
```

**TELEGRAM_CHAT_IDS**
```
-1002658082392,-1234567890,-1987654321
```
*多個群組ID用逗號分隔*

#### 可選設置的Secrets：

**QUERY_CONFIG** (自定義查詢配置)
```json
[
  {
    "name": "不早脆皮雞排 中壢龍崗店",
    "urls": {
      "google": "https://maps.app.goo.gl/fS8RAzxJpBjVpSQT9?g_st=com.google.maps.preview.copy",
      "uber": "https://www.ubereats.com/store-browse-uuid/dcbd639d-d703-5c60-a55e-7ddb1a6954f9?diningMode=DELIVERY",
      "panda": "https://foodpanda.page.link/yhvLQKDDAScTN5rq7"
    }
  },
  {
    "name": "另一家餐廳",
    "urls": {
      "google": "Google Maps 網址",
      "uber": "UberEats 網址",
      "panda": "Foodpanda 網址"
    }
  }
]
```

### 3. ✅ 啟用GitHub Actions

1. 進入倉庫的 `Actions` 頁面
2. 找到 `🤖 每日分店評價自動查詢` 工作流程
3. 點擊 `Enable workflow`

### 4. 🧪 測試執行

#### 手動測試：
1. 在 `Actions` 頁面找到工作流程
2. 點擊 `Run workflow`
3. 選擇 `main` 分支
4. 勾選 `啟用調試模式`（可選）
5. 點擊 `Run workflow`

## ⏰ 執行時間設置

### 預設時間
- **台灣時間**: 每天凌晨 01:00
- **UTC時間**: 每天 17:00
- **Cron表達式**: `0 17 * * *`

### 自定義時間
修改 `.github/workflows/daily-restaurant-check.yml` 中的cron表達式：

```yaml
schedule:
  # 台灣時間 02:30 = UTC 18:30
  - cron: '30 18 * * *'
  
  # 台灣時間 12:00 = UTC 04:00  
  - cron: '0 4 * * *'
```

## 📱 通知格式範例

### 成功通知
```
🤖 每日自動查詢報告
━━━━━━━━━━━━━━━━━━━━━━
⏰ 執行時間: 2025/8/21 上午1:00:32
📊 查詢店家: 1 家

🏪 不早脆皮雞排 中壢龍崗店
📈 平均評分: 4.7/5.0
✅ 成功平台: 3/3
💬 總評論數: 2283

🗺️ 4.6 (1183 評論)
🚗 4.8 (600+ 評論)
🐼 4.7 (500+ 評論)

🤖 由雲端自動化系統提供
```

### 錯誤通知
```
🚨 自動查詢系統錯誤
━━━━━━━━━━━━━━━━━━━━━━
⏰ 錯誤時間: 2025/8/21 上午1:05:12
❌ 錯誤訊息: Navigation timeout exceeded

🔧 建議檢查系統狀態或聯繫管理員
```

## 🔧 高級配置

### 多店家監控
在 `QUERY_CONFIG` Secret 中添加更多店家：

```json
[
  {
    "name": "店家A",
    "urls": { ... }
  },
  {
    "name": "店家B", 
    "urls": { ... }
  },
  {
    "name": "店家C",
    "urls": { ... }
  }
]
```

### 多群組通知
在 `TELEGRAM_CHAT_IDS` 中添加更多群組：
```
-1002658082392,-1234567890,-1987654321
```

### 重試機制調整
修改 `cloud_automation_scheduler.js`：
```javascript
this.config = {
    maxRetries: 5,        // 最大重試次數
    retryDelay: 120000,   // 重試間隔(毫秒)
    timeout: 600000,      // 超時時間(毫秒)
};
```

## 📊 監控與維護

### 查看執行日誌
1. 進入 `Actions` 頁面
2. 點擊最新的執行記錄
3. 查看 `📊 執行每日分店查詢` 步驟的日誌

### 下載執行記錄
1. 在執行記錄頁面的 `Artifacts` 區域
2. 下載 `daily-query-logs-XXX` 文件
3. 包含詳細的JSON格式執行記錄

### 健康檢查
系統自動執行健康檢查，包括：
- 查詢任務執行狀態
- 系統資源使用情況
- 錯誤率統計

## 🚨 故障排除

### 常見問題

#### 1. 查詢失敗
**原因**: 網站反爬蟲機制或載入超時
**解決**: 
- 檢查網址是否有效
- 增加等待時間
- 更新選擇器

#### 2. Telegram通知失敗
**原因**: Bot Token或Chat ID錯誤
**解決**:
- 驗證 `TELEGRAM_BOT_TOKEN` 是否正確
- 確認 `TELEGRAM_CHAT_IDS` 格式正確
- 確保Bot已加入目標群組

#### 3. GitHub Actions執行失敗
**原因**: 依賴安裝或環境配置問題
**解決**:
- 檢查 `.github/workflows/` 配置
- 查看Actions執行日誌
- 更新依賴版本

### 調試模式
啟用調試模式獲取更詳細日誌：
1. 手動觸發工作流程
2. 勾選 `啟用調試模式`
3. 查看詳細執行過程

## 💰 成本說明

### GitHub Actions 免費額度
- **公開倉庫**: 完全免費，無限制
- **私人倉庫**: 每月2000分鐘免費額度
- **本系統消耗**: 約5-10分鐘/次，每月約300分鐘

### Telegram 通知
- **完全免費**: 無任何費用
- **無限制**: 訊息數量無限制

## 🔒 安全性說明

### 數據保護
- **Secrets加密**: 所有敏感信息GitHub Secrets加密存儲
- **執行隔離**: 每次執行使用獨立的環境
- **日誌清理**: 執行日誌30天後自動刪除

### 隱私保護
- **無數據收集**: 系統不收集或存儲個人信息
- **本地處理**: 所有數據處理在GitHub Actions環境中進行
- **定期清理**: 臨時文件自動清理

## 📞 技術支援

### 聯繫方式
- **GitHub Issues**: 在倉庫中創建Issue
- **Telegram群組**: 在配置的群組中反饋問題

### 更新通知
系統會通過Telegram自動通知：
- 執行成功/失敗狀態
- 系統錯誤和異常
- 建議的維護操作

---

## 🎉 部署完成！

設置完成後，系統將：
1. ✅ 每天凌晨1點自動執行查詢
2. 📱 自動發送結果到Telegram群組
3. 📊 記錄詳細的執行日誌
4. 🔄 遇到錯誤自動重試
5. 🚨 異常時發送警告通知

**享受完全自動化的分店評價監控服務！** 🚀