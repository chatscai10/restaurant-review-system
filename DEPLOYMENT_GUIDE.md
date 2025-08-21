# 🚀 分店評價查詢系統 - 部署指南

## 📋 系統概覽

本系統包含以下核心功能：
- 🔍 **多平台查詢**: Google Maps + UberEats + Foodpanda
- 🛠️ **管理後台**: 分店設定、群組管理、排程配置
- 📱 **Telegram通知**: 多群組自動通知
- ⏰ **雲端自動化**: GitHub Actions 定時執行
- 📊 **執行監控**: 完整的日誌記錄

## 🌐 訪問地址

### 本地開發環境
- **查詢頁面**: http://localhost:3003
- **管理後台**: http://localhost:3003/admin

### 雲端部署後
- **查詢頁面**: https://your-domain.com
- **管理後台**: https://your-domain.com/admin

## 🛠️ 本地部署步驟

### 1. 環境準備
```bash
# 確保已安裝 Node.js 16+
node --version

# 安裝依賴
npm install
```

### 2. 配置設定
```bash
# 啟動服務器
npm start
# 或
node server.js
```

### 3. 初始設定
1. 打開瀏覽器訪問 http://localhost:3003/admin
2. 配置分店資訊
3. 設定Telegram群組
4. 測試功能

## ☁️ 雲端部署選項

### Option 1: Vercel 部署（推薦）

#### 步驟1: 準備代碼
```bash
# 創建 vercel.json 配置文件
cat > vercel.json << 'EOF'
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
EOF
```

#### 步驟2: 部署到 Vercel
```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入 Vercel
vercel login

# 部署
vercel
```

#### 步驟3: 設定環境變數
在 Vercel Dashboard 中設定：
- `TELEGRAM_BOT_TOKEN`: 你的Telegram Bot Token
- `NODE_ENV`: production

### Option 2: Heroku 部署

#### 步驟1: 準備 Heroku
```bash
# 安裝 Heroku CLI
# 登入 Heroku
heroku login

# 創建應用
heroku create your-app-name
```

#### 步驟2: 創建 Procfile
```bash
echo "web: node server.js" > Procfile
```

#### 步驟3: 部署
```bash
git add .
git commit -m "準備部署到 Heroku"
git push heroku main
```

#### 步驟4: 設定環境變數
```bash
heroku config:set TELEGRAM_BOT_TOKEN=your_bot_token
heroku config:set NODE_ENV=production
```

### Option 3: Railway 部署

#### 步驟1: 連接 GitHub
1. 前往 https://railway.app
2. 連接你的GitHub倉庫
3. 選擇專案進行部署

#### 步驟2: 設定環境變數
在Railway Dashboard中設定：
- `TELEGRAM_BOT_TOKEN`: 你的Bot Token
- `PORT`: 3003

## 🔧 生產環境配置

### 1. 環境變數設定
```bash
# .env 文件（不要提交到Git）
TELEGRAM_BOT_TOKEN=your_bot_token_here
NODE_ENV=production
PORT=3003

# Telegram群組ID（可選，也可以在管理後台設定）
TELEGRAM_CHAT_IDS=-1002658082392,-1234567890
```

### 2. 安全性設定
```javascript
// 可在 server.js 中添加額外安全性
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// 安全標頭
app.use(helmet());

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分鐘
  max: 100 // 限制每個IP 100次請求
});
app.use('/api', limiter);
```

### 3. 域名和HTTPS
```bash
# 使用 Cloudflare 或其他CDN
# 設定自定義域名
# 啟用HTTPS證書
```

## 🤖 GitHub Actions 自動化設定

### 1. 設定 GitHub Secrets
在GitHub倉庫設定中添加：

**TELEGRAM_BOT_TOKEN**:
```
7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc
```

**TELEGRAM_CHAT_IDS**:
```
-1002658082392,-1234567890,-1987654321
```

**QUERY_CONFIG** (可選):
```json
[
  {
    "name": "不早脆皮雞排 中壢龍崗店",
    "urls": {
      "google": "https://maps.app.goo.gl/fS8RAzxJpBjVpSQT9",
      "uber": "https://www.ubereats.com/store-browse-uuid/dcbd639d-d703-5c60-a55e-7ddb1a6954f9",
      "panda": "https://foodpanda.page.link/yhvLQKDDAScTN5rq7"
    }
  }
]
```

### 2. 啟用工作流程
1. 進入GitHub倉庫的 Actions 頁面
2. 找到 "🤖 每日分店評價自動查詢" 工作流程
3. 點擊 "Enable workflow"
4. 手動測試一次確保正常運作

## 📊 監控和維護

### 1. 日誌查看
```bash
# 本地日誌
tail -f logs/app.log

# Vercel 日誌
vercel logs

# Heroku 日誌
heroku logs --tail
```

### 2. 健康檢查
- 定期檢查 `/admin` 頁面的執行記錄
- 監控Telegram通知是否正常
- 檢查GitHub Actions執行狀態

### 3. 備份配置
```bash
# 備份配置文件
cp -r config/ config_backup_$(date +%Y%m%d)/

# 定期導出設定
curl http://localhost:3003/api/admin/stores > stores_backup.json
curl http://localhost:3003/api/admin/groups > groups_backup.json
```

## 🚨 故障排除

### 常見問題

#### 1. 服務器無法啟動
```bash
# 檢查端口是否被佔用
netstat -tulpn | grep 3003

# 檢查 Node.js 版本
node --version

# 重新安裝依賴
rm -rf node_modules package-lock.json
npm install
```

#### 2. Telegram通知失敗
- 檢查Bot Token是否正確
- 確認Bot已加入所有群組
- 驗證群組ID格式（必須有負號）
- 測試網路連接

#### 3. 查詢失敗
- 檢查網址是否有效
- 驗證反爬蟲機制變化
- 增加查詢間隔時間
- 更新選擇器

#### 4. GitHub Actions 失敗
- 檢查 Secrets 設定
- 驗證YAML語法
- 查看執行日誌
- 檢查權限設定

### 調試模式
```bash
# 啟用調試模式
DEBUG=* node server.js

# 或設定環境變數
export DEBUG=app:*
npm start
```

## 📈 性能優化

### 1. 緩存設定
```javascript
// 添加Redis緩存（可選）
const redis = require('redis');
const client = redis.createClient();

// 緩存查詢結果
app.use('/api', (req, res, next) => {
  const key = `cache:${req.originalUrl}`;
  client.get(key, (err, result) => {
    if (result) {
      res.json(JSON.parse(result));
    } else {
      next();
    }
  });
});
```

### 2. 數據庫升級
```javascript
// 可升級為使用真正數據庫
const mongoose = require('mongoose');
// 或
const { Pool } = require('pg');
```

### 3. CDN 加速
- 使用 Cloudflare CDN
- 靜態資源分離
- 圖片優化

## 🔐 安全性檢查清單

- [ ] HTTPS 證書已配置
- [ ] 環境變數不包含在代碼中
- [ ] API 有適當的速率限制
- [ ] 敏感資訊已加密存儲
- [ ] 定期更新依賴包
- [ ] 設定適當的CORS策略
- [ ] 啟用安全標頭
- [ ] 日誌不包含敏感信息

## 📞 技術支援

### 聯繫方式
- **GitHub Issues**: 在倉庫中創建Issue
- **Telegram**: 在配置的群組中反饋
- **Email**: your-email@domain.com

### 文檔資源
- [API文檔](./API_DOCUMENTATION.md)
- [架構說明](./ARCHITECTURE.md) 
- [常見問題](./FAQ.md)

---

## 🎉 部署完成檢查清單

部署完成後，請確認：

- [ ] ✅ 網站可以正常訪問
- [ ] ✅ 管理後台功能正常
- [ ] ✅ 分店查詢功能正常
- [ ] ✅ Telegram通知測試成功
- [ ] ✅ GitHub Actions工作流程啟用
- [ ] ✅ 所有配置已儲存
- [ ] ✅ 執行記錄正常顯示
- [ ] ✅ 域名和HTTPS配置（如適用）

**🚀 恭喜！您的分店評價自動化查詢系統已成功部署！**