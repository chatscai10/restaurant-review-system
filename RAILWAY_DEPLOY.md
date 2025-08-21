# 🚀 Railway 部署指南

## 為什麼選擇Railway？
- ✅ 支持Docker和完整Chrome瀏覽器
- ✅ 可以運行真實的Puppeteer爬蟲
- ✅ 價格便宜 ($5/月)
- ✅ 部署簡單
- ✅ 自動SSL證書
- ✅ 自動域名

## 部署步驟

### 方法1: GitHub連接 (推薦)

1. **前往Railway**: https://railway.app
2. **登入並新建專案**: 
   - 點擊 "New Project"
   - 選擇 "Deploy from GitHub repo"
   - 選擇 `restaurant-review-system` 倉庫

3. **自動部署**: Railway會自動：
   - 檢測到Dockerfile
   - 安裝Chrome瀏覽器
   - 安裝所有依賴
   - 啟動應用

4. **設定環境變數**:
   ```
   TELEGRAM_BOT_TOKEN = 7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc
   TELEGRAM_CHAT_IDS = -1002658082392
   NODE_ENV = production
   PORT = 3003
   ```

5. **獲取網址**: 部署完成後會得到類似：
   - `https://restaurant-review-system-production.up.railway.app`

### 方法2: Railway CLI

```bash
# 安裝Railway CLI
npm install -g @railway/cli

# 登入
railway login

# 初始化專案
railway init

# 部署
railway up
```

## 部署後測試

1. **訪問主頁**: `https://your-app.up.railway.app`
2. **管理後台**: `https://your-app.up.railway.app/admin`
3. **測試真實數據**: 
   - 進入管理後台
   - 設定分店網址
   - 執行查詢測試
   - 確認獲取真實評價數據

## 特點

### 真實數據抓取
- ✅ Google Maps 真實評分和評論數
- ✅ UberEats 真實餐廳資訊
- ✅ Foodpanda 真實外送資訊
- ✅ 完整的Chrome瀏覽器支持

### 自動化功能
- ✅ 定時自動查詢
- ✅ Telegram群組通知
- ✅ 完整管理後台
- ✅ 執行記錄和監控

## 成本估算

- **Railway基本方案**: $5/月
- **包含功能**:
  - 512MB RAM
  - 1GB存儲空間
  - 無限流量
  - 自動SSL
  - 自動域名

## 故障排除

### 常見問題
1. **Chrome安裝失敗**: 檢查Dockerfile配置
2. **記憶體不足**: 升級到更大方案
3. **網路超時**: 增加爬蟲timeout設定

### 檢查日誌
```bash
railway logs
```

## 備用方案

如果Railway不適合，可以考慮：
1. **Render.com** - 類似Railway，$7/月
2. **Fly.io** - 更便宜，但設定複雜
3. **DigitalOcean** - VPS，完全控制

---

**部署完成後，您將擁有：**
- 🌐 穩定的雲端餐廳評價系統
- 🔍 真實數據抓取功能
- 📱 自動Telegram通知
- ⏰ 定時自動查詢
- 🛠️ 完整管理界面