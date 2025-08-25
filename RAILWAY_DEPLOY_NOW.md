# 🚀 Railway 立即部署 - 一鍵解決方案

## 🎯 立即部署連結
**直接點擊下方按鈕進行一鍵部署**：

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/OTcNAY)

或者手動部署：
1. **Railway官網**: https://railway.app
2. **New Project** → **Deploy from GitHub repo**
3. **選擇倉庫**: `chatscai10/restaurant-review-system`

## ⚙️ 必要環境變數配置
部署後立即在Railway控制台設定：

```bash
NODE_ENV=production
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
TELEGRAM_BOT_TOKEN=7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc
TELEGRAM_CHAT_IDS=-1002658082392
PORT=3003
```

## 📋 環境變數設定步驟
1. 部署完成後，進入Railway專案控制台
2. 點擊「Variables」標籤
3. 逐一添加上述環境變數
4. 點擊「Deploy」重新部署

## 🔍 部署監控
**查看部署進度**:
- 在Railway控制台點擊「Deployments」
- 監控構建日誌確認Chrome安裝成功
- 等待狀態變為「Success」

## ✅ 部署成功標識
看到以下訊息表示成功：
```
✅ Chrome installed successfully
✅ Dependencies installed
✅ Application started on port 3003
✅ Health check passed
```

## 🧪 立即測試
部署完成後獲得網址，例如：
`https://restaurant-review-system-production.up.railway.app`

**測試步驟**:
1. **訪問首頁**: 確認網站載入正常
2. **進入管理後台**: `/admin` 路徑
3. **添加測試分店**:
   - 名稱: 中壢龍崗
   - Google: https://maps.app.goo.gl/fS8RAzxJpBjVpSQT9
   - Uber: https://www.ubereats.com/store-browse-uuid/dcbd639d-d703-5c60-a55e-7ddb1a6954f9
   - Panda: https://foodpanda.page.link/yhvLQKDDAScTN5rq7
4. **執行查詢**: 點擊「立即查詢」
5. **驗證結果**: 確認評分不是N/A

## 🎉 預期成功結果
```
🏪 餐廳評價查詢結果
📅 2025-01-25 16:00

🏷️ 中壢龍崗
🗺️ Google Maps: 4.2⭐ (真實評論數)
🚗 UberEats: 4.3⭐ (真實評論數)
🐼 Foodpanda: 4.1⭐ (真實評論數)
📊 平均評分: 4.2⭐ (3/3個平台)

✈️ Telegram通知已發送
```

## 🔧 故障排除
如果遇到問題：

1. **部署失敗**: 檢查GitHub倉庫是否公開
2. **Chrome錯誤**: 確認Dockerfile配置正確
3. **環境變數**: 確保所有必要變數都已設定
4. **記憶體不足**: 升級Railway方案

## 📱 配置Telegram通知
部署成功後，測試Telegram通知：
- 執行一次查詢
- 檢查群組是否收到通知
- 確認通知格式正確

---

**估計部署時間**: 5-8分鐘  
**立即解決**: N/A評分問題  
**獲得功能**: 真實數據爬取 + 自動通知