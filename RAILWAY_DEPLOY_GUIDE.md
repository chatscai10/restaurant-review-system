# 🚂 Railway 部署指南

## 📋 準備工作清單

### ✅ 已完成準備
- [x] 雲端優化爬蟲 (`cloud-enhanced-crawler.js`)
- [x] Railway排程器 (`railway-scheduler.js`)
- [x] 部署配置檔案 (`railway.toml`)
- [x] 套件管理 (`package.json` 已更新)
- [x] Git忽略檔案 (`.gitignore`)

## 🚀 Railway 部署步驟

### 方式一: GitHub 連接部署 (推薦)

1. **GitHub 上傳**
```bash
# 初始化Git倉庫
git init
git add .
git commit -m "Railway deployment ready"

# 推送到GitHub
git remote add origin https://github.com/你的用戶名/分店評價系統.git
git push -u origin main
```

2. **Railway 連接**
- 登入 Railway: https://railway.app
- 點擊 "New Project"
- 選擇 "Deploy from GitHub repo"
- 選擇你的倉庫
- Railway 會自動檢測並部署

### 方式二: Railway CLI 部署

1. **安裝 Railway CLI**
```bash
npm install -g @railway/cli
```

2. **登入並部署**
```bash
# 登入Railway
railway login

# 建立新專案
railway init

# 部署
railway up
```

## ⚙️ 環境變數設定

在Railway Dashboard中設定以下環境變數：

```bash
TELEGRAM_BOT_TOKEN=7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc
TELEGRAM_ADMIN_GROUP=-1002658082392
NODE_ENV=production
MEMORY_LIMIT=512MB
TIMEOUT=30000
TEST_MODE=false
```

## 📊 部署配置說明

### package.json 設定
```json
{
  "scripts": {
    "start": "node cloud-enhanced-crawler.js"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
```

### railway.toml 設定
```toml
[build]
  builder = "NIXPACKS"
  buildCommand = "npm install"

[deploy]
  startCommand = "npm start"
  restartPolicyType = "ON_FAILURE"
  restartPolicyMaxRetries = 3
```

## 🎯 部署後驗證步驟

### 1. 檢查部署狀態
- Railway Dashboard > Your Project > Deployments
- 確認狀態為 "Success"

### 2. 查看日誌
- Railway Dashboard > Your Project > Logs
- 應該看到爬蟲執行成功訊息

### 3. 驗證Telegram通知
- 檢查管理員群組是否收到通知
- 確認通知內容包含執行結果

### 4. 測試手動執行
```bash
# 透過Railway CLI觸發
railway run node cloud-enhanced-crawler.js
```

## 🕐 自動排程設定

### 選項一: 使用內建排程器
- 主程式: `cloud-enhanced-crawler.js` (單次執行)
- 適用: 外部觸發或手動執行

### 選項二: 使用Railway排程器
- 主程式: `railway-scheduler.js` (持續運行)
- 自動排程: 每日 9:00, 15:00, 21:00
- 修改package.json:
```json
"start": "node railway-scheduler.js"
```

## 📱 Telegram 通知設定

### 測試模式 (當前)
- 僅發送管理員群組: `-1002658082392`
- 包含詳細執行資訊

### 生產模式 (可選)
- 發送所有群組
- 設定環境變數: `TEST_MODE=false`

## 🔧 故障排除

### 常見問題

1. **部署失敗**
```bash
# 檢查logs
railway logs

# 重新部署
railway up --detach
```

2. **記憶體不足**
- 調整環境變數: `MEMORY_LIMIT=1GB`
- 或升級Railway方案

3. **Puppeteer問題**
- Railway已預裝Chrome
- 無需額外配置

4. **超時問題**
- 調整環境變數: `TIMEOUT=60000`
- 增加重試次數

## 📊 監控與維護

### 日誌監控
```bash
# 實時查看日誌
railway logs --tail

# 下載日誌
railway logs > deployment.log
```

### 重啟服務
```bash
# 重新部署
railway up

# 重啟服務  
railway restart
```

### 更新代碼
```bash
# 推送新版本
git push

# Railway會自動重新部署
```

## 💰 成本估算

### Railway 定價
- **Starter**: $5/月 (512MB RAM, 1 vCPU)
- **Pro**: $20/月 (8GB RAM, 8 vCPU)

### 預估使用量
- 每日3次執行，每次約12秒
- 月總執行時間: ~18分鐘
- 推薦: Starter方案足夠

## ✅ 部署檢查清單

- [ ] GitHub倉庫建立
- [ ] Railway專案建立
- [ ] 環境變數設定
- [ ] 首次部署成功
- [ ] Telegram通知測試
- [ ] 日誌輸出檢查
- [ ] 排程功能測試
- [ ] 錯誤處理測試

---

**準備就緒！** 現在可以開始Railway部署流程。