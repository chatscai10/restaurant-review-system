# 🚀 Railway 部署步驟 - 修復真實數據問題

## 🎯 目標
解決當前部署返回 N/A 值的問題，部署到 Railway 獲取真實餐廳評價數據。

## 📋 部署前準備

### 1. 確認代碼修復
- ✅ 修復了 CloudCrawler 的數據格式問題 (字符串→數字)
- ✅ 完善了 WebCrawler 的備用機制
- ✅ Docker 配置包含完整 Chrome 支持
- ✅ 環境變數設置正確

### 2. 檢查必要文件
```
- Dockerfile ✅
- railway.json ✅  
- package.json ✅
- server.js ✅
- utils/webCrawler.js ✅ (修復版)
- utils/cloudCrawler.js ✅ (修復版)
```

## 🌐 Railway 部署步驟

### 步驟 1: 前往 Railway 官網
1. 訪問 https://railway.app
2. 使用 GitHub 帳號登入
3. 點擊 "New Project"

### 步驟 2: 連接 GitHub 倉庫
1. 選擇 "Deploy from GitHub repo"
2. 選擇 `restaurant-review-system` 倉庫
3. 點擊 "Deploy Now"

### 步驟 3: 配置環境變數
在 Railway 專案設定中添加：
```
NODE_ENV = production
PUPPETEER_EXECUTABLE_PATH = /usr/bin/google-chrome-stable
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = true
TELEGRAM_BOT_TOKEN = 7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc
TELEGRAM_CHAT_IDS = -1002658082392
PORT = 3003
```

### 步驟 4: 監控部署過程
1. 查看部署日誌
2. 確認 Chrome 安裝成功
3. 等待部署完成（約 5-10 分鐘）

### 步驟 5: 獲取部署 URL
部署完成後會得到類似網址：
- `https://restaurant-review-system-production.up.railway.app`

## 🧪 部署後測試

### 測試 1: 健康檢查
```bash
curl https://your-app.up.railway.app/
```
應該看到首頁正常載入

### 測試 2: API 端點測試
```bash
curl -X POST https://your-app.up.railway.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"stores":[{"name":"測試店家","urls":{"google":"https://maps.app.goo.gl/fS8RAzxJpBjVpSQT9"}}]}'
```

### 測試 3: 真實數據驗證
1. 訪問管理後台：`https://your-app.up.railway.app/admin`
2. 添加測試分店：
   - 中壢龍崗
   - Google Maps: https://maps.app.goo.gl/fS8RAzxJpBjVpSQT9
   - UberEats: https://www.ubereats.com/store-browse-uuid/dcbd639d-d703-5c60-a55e-7ddb1a6954f9
   - Foodpanda: https://foodpanda.page.link/yhvLQKDDAScTN5rq7
3. 執行立即查詢
4. 確認返回真實評分（不是 N/A）

## 🔧 GAS 混合架構配置

Railway 部署完成後，配置 Google Apps Script：

### 1. 更新 GAS 代碼中的 API URL
```javascript
const CONFIG = {
  CRAWLER_API_URL: 'https://your-railway-app.up.railway.app',
  // ... 其他配置
};
```

### 2. 測試 GAS 連接
```javascript
function testRun() {
  main(); // 執行一次測試
}
```

### 3. 設定定時觸發器
```javascript
function setupTrigger() {
  // 每天凌晨 1 點自動執行
}
```

## 📊 成功指標

### ✅ 部署成功標準
- [ ] Railway 部署狀態為 "Running"
- [ ] 健康檢查通過
- [ ] Chrome 瀏覽器可正常啟動
- [ ] API 端點正常響應

### ✅ 數據質量標準  
- [ ] Google Maps 返回真實評分（不是模擬數據）
- [ ] UberEats 返回正確商店資訊
- [ ] Foodpanda 能正確解析短連結
- [ ] 平均評分計算正確（不是 0.0）

### ✅ 自動化功能標準
- [ ] Telegram 通知正常發送
- [ ] GAS 定時觸發器運作正常
- [ ] 管理後台功能完整
- [ ] 錯誤處理機制運作

## 🚨 常見問題解決

### 問題 1: 部署超時
**原因**: Chrome 安裝時間較長
**解決**: 等待更久，或檢查 Dockerfile 配置

### 問題 2: 記憶體不足
**原因**: Railway 免費方案記憶體限制
**解決**: 升級到 $5/月 方案

### 問題 3: 仍返回 N/A 值
**原因**: Chrome 啟動失敗或網站封鎖
**解決**: 檢查錯誤日誌，調整 User-Agent

## 🎉 部署完成確認

當所有測試通過後：

1. **更新 GAS 配置** - 指向新的 Railway URL
2. **測試完整流程** - 從 GAS 觸發到 Telegram 通知
3. **設定監控** - 確保服務穩定運行
4. **文檔更新** - 記錄新的 API 端點

---

**估計部署時間**: 10-15 分鐘
**月度成本**: $5 USD  
**功能完整度**: 100% (真實數據 + 自動化)