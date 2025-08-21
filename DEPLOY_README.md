# 🚀 雲端部署說明

## 快速部署到Vercel

### 方法1: 自動化腳本部署
```bash
# 執行自動部署腳本
deploy.bat
```

### 方法2: 手動部署
```bash
# 1. 安裝Vercel CLI
npm install -g vercel

# 2. 登入Vercel帳號
vercel login

# 3. 部署項目
vercel

# 4. 跟隨提示設定項目
```

### 方法3: GitHub連接
1. 將代碼推送到GitHub
2. 前往 https://vercel.com
3. 點擊"New Project"
4. 連接GitHub倉庫
5. 自動部署

## 🔧 環境變數設定

在Vercel Dashboard中設定以下環境變數：

```
TELEGRAM_BOT_TOKEN=7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc
TELEGRAM_CHAT_IDS=-1002658082392,-1234567890
NODE_ENV=production
```

## 📱 部署後測試

部署完成後，訪問：
- 主頁面: `https://your-project.vercel.app`
- 管理後台: `https://your-project.vercel.app/admin`

## 🎯 下一步設定

1. 在管理後台配置分店資訊
2. 設定Telegram群組
3. 測試查詢功能
4. 配置GitHub Actions自動化