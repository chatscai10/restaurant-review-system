# 🚀 手動部署指南

## 方法1: Vercel網頁部署（最簡單）

### 步驟1: 上傳到GitHub
1. 創建GitHub倉庫
2. 上傳所有文件到倉庫

### 步驟2: Vercel連接GitHub
1. 前往 https://vercel.com/new
2. 選擇"Import Git Repository"
3. 連接到您的GitHub倉庫
4. 點擊"Deploy"

### 步驟3: 設定環境變數
在Vercel Dashboard → Settings → Environment Variables 添加：
```
TELEGRAM_BOT_TOKEN=7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc
TELEGRAM_CHAT_IDS=-1002658082392
NODE_ENV=production
```

### 步驟4: 重新部署
點擊"Redeploy"讓環境變數生效

## 方法2: Railway部署

### 步驟1: 連接GitHub
1. 前往 https://railway.app
2. 點擊"Start a New Project"
3. 選擇"Deploy from GitHub repo"
4. 連接您的倉庫

### 步驟2: 設定環境變數
在Railway Dashboard → Variables 添加：
```
TELEGRAM_BOT_TOKEN=7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc
TELEGRAM_CHAT_IDS=-1002658082392
PORT=3003
```

## 方法3: Render部署

### 步驟1: 創建Web Service
1. 前往 https://render.com
2. 點擊"New Web Service"
3. 連接GitHub倉庫

### 步驟2: 配置設定
- Build Command: `npm install`
- Start Command: `npm start`
- Environment: Node

### 步驟3: 環境變數
添加相同的環境變數

## 🧪 部署後測試

部署完成後：
1. 訪問主頁面確認正常
2. 訪問 `/admin` 管理後台
3. 配置分店和群組
4. 執行測試查詢

## 📱 獲取部署網址

部署完成後，您會獲得如下格式的網址：
- Vercel: `https://your-project-name.vercel.app`
- Railway: `https://your-project-name.up.railway.app`
- Render: `https://your-project-name.onrender.com`

## 🔧 故障排除

### 部署失敗
1. 檢查package.json語法
2. 確認所有文件已上傳
3. 查看部署日誌錯誤信息

### 功能不正常
1. 檢查環境變數設定
2. 確認Telegram Bot Token正確
3. 測試網址是否可訪問

## 📞 需要幫助？

如果遇到部署問題：
1. 檢查各平台的部署日誌
2. 確認所有文件完整
3. 聯繫平台客服支援