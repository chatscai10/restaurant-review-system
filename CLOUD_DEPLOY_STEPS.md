# 🚀 雲端部署詳細步驟

## ✅ 已完成步驟
1. ✅ 創建GitHub倉庫：https://github.com/chatscai10/restaurant-review-system
2. ✅ 推送所有代碼到GitHub
3. ✅ 準備所有配置文件

## 🌐 Vercel部署步驟（需手動操作）

### 步驟1: 訪問Vercel
1. 打開瀏覽器前往：https://vercel.com/new
2. 使用GitHub帳號登入

### 步驟2: 導入GitHub倉庫
1. 點擊 "Import Git Repository"
2. 搜尋並選擇 "restaurant-review-system" 倉庫
3. 點擊 "Import"

### 步驟3: 配置部署設定
- Framework Preset: Node.js
- Root Directory: ./
- Build Command: npm install
- Output Directory: (保持預設)
- Install Command: npm install

### 步驟4: 設定環境變數
在 "Environment Variables" 區域添加：

```
TELEGRAM_BOT_TOKEN = 7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc
TELEGRAM_CHAT_IDS = -1002658082392
NODE_ENV = production
```

### 步驟5: 部署
點擊 "Deploy" 開始部署

## 🔗 部署完成後的網址
部署完成後會獲得類似格式的網址：
- 主要網址：`https://restaurant-review-system.vercel.app`
- 管理後台：`https://restaurant-review-system.vercel.app/admin`

## 📋 部署後測試清單
- [ ] 主頁面正常載入
- [ ] 管理後台可以訪問
- [ ] 可以新增分店
- [ ] 可以設定Telegram群組
- [ ] 測試查詢功能
- [ ] 驗證Telegram通知

## 🔄 備用部署方案

### Railway部署
1. 前往：https://railway.app
2. 點擊 "Start a New Project"
3. 選擇 "Deploy from GitHub repo"
4. 選擇 restaurant-review-system 倉庫
5. 添加相同環境變數

### Render部署
1. 前往：https://render.com
2. 點擊 "New Web Service"
3. 連接GitHub倉庫
4. 設定：
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node

## 📞 需要協助
如果部署遇到問題：
1. 檢查環境變數設定
2. 查看部署日誌
3. 確認所有文件已正確上傳

---
**GitHub倉庫**: https://github.com/chatscai10/restaurant-review-system
**部署時間**: $(date)