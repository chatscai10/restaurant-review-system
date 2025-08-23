/**
 * Google Apps Script - 餐廳評價自動查詢系統
 * 混合架構：GAS負責定時和通知，外部服務負責爬蟲
 */

// 配置常量
const CONFIG = {
  // Telegram設定
  TELEGRAM_BOT_TOKEN: '7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc',
  TELEGRAM_CHAT_IDS: ['-1002658082392'], // 可以添加多個群組ID
  
  // 外部爬蟲服務URL（Railway部署的服務）
  CRAWLER_API_URL: 'https://restaurant-review-system-production.up.railway.app',
  
  // Google Sheets ID（用於存儲數據）
  SPREADSHEET_ID: '', // 請替換為您的Google Sheets ID
  
  // 餐廳配置
  RESTAURANTS: [
    {
      name: '中壢龍崗',
      urls: {
        google: 'https://maps.app.goo.gl/fS8RAzxJpBjVpSQT9?g_st=com.google.maps.preview.copy',
        uber: 'https://www.ubereats.com/store-browse-uuid/dcbd639d-d703-5c60-a55e-7ddb1a6954f9?diningMode=DELIVERY',
        panda: 'https://foodpanda.page.link/yhvLQKDDAScTN5rq7'
      },
      enabled: true
    }
    // 可以添加更多餐廳
  ]
};

/**
 * 主要執行函數 - 設定為時間觸發器
 */
function main() {
  console.log('🚀 開始執行餐廳評價自動查詢...');
  
  try {
    // 檢查爬蟲服務是否可用
    if (!checkCrawlerService()) {
      console.error('❌ 爬蟲服務不可用，中止執行');
      return;
    }
    
    // 執行查詢
    const results = performRestaurantQuery();
    
    if (results && results.length > 0) {
      // 保存到Google Sheets
      saveToSheets(results);
      
      // 發送Telegram通知
      sendTelegramNotification(results);
      
      console.log('✅ 執行完成');
    } else {
      console.log('⚠️ 沒有獲取到有效數據');
    }
    
  } catch (error) {
    console.error('❌ 執行過程中發生錯誤:', error);
    sendErrorNotification(error.message);
  }
}

/**
 * 檢查外部爬蟲服務是否可用
 */
function checkCrawlerService() {
  try {
    const response = UrlFetchApp.fetch(`${CONFIG.CRAWLER_API_URL}/api/health`, {
      method: 'GET',
      muteHttpExceptions: true,
      timeout: 10000
    });
    
    return response.getResponseCode() === 200;
  } catch (error) {
    console.error('爬蟲服務檢查失敗:', error);
    return false;
  }
}

/**
 * 執行餐廳查詢
 */
function performRestaurantQuery() {
  const results = [];
  
  for (const restaurant of CONFIG.RESTAURANTS) {
    if (!restaurant.enabled) continue;
    
    console.log(`🔍 查詢餐廳: ${restaurant.name}`);
    
    try {
      // 調用外部爬蟲服務
      const response = UrlFetchApp.fetch(`${CONFIG.CRAWLER_API_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({
          stores: [restaurant]
        }),
        timeout: 60000 // 60秒超時
      });
      
      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        results.push(...(data.stores || []));
        console.log(`✅ ${restaurant.name} 查詢完成`);
      } else {
        console.error(`❌ ${restaurant.name} 查詢失敗: HTTP ${response.getResponseCode()}`);
      }
      
    } catch (error) {
      console.error(`❌ ${restaurant.name} 查詢出錯:`, error);
    }
    
    // 避免請求過於頻繁
    Utilities.sleep(2000);
  }
  
  return results;
}

/**
 * 保存數據到Google Sheets
 */
function saveToSheets(results) {
  if (!CONFIG.SPREADSHEET_ID) {
    console.log('⚠️ 未設定Google Sheets ID，跳過保存');
    return;
  }
  
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getActiveSheet();
    
    // 準備數據行
    const timestamp = new Date();
    
    for (const store of results) {
      for (const [platform, data] of Object.entries(store.platforms || {})) {
        if (data.success) {
          const row = [
            timestamp,
            store.name,
            platform,
            data.rating || 'N/A',
            data.reviewCount || 'N/A',
            data.deliveryTime || 'N/A',
            data.deliveryFee || 'N/A',
            data.url
          ];
          
          sheet.appendRow(row);
        }
      }
    }
    
    console.log('✅ 數據已保存到Google Sheets');
    
  } catch (error) {
    console.error('❌ 保存到Google Sheets失敗:', error);
  }
}

/**
 * 發送Telegram通知
 */
function sendTelegramNotification(results) {
  try {
    const message = formatTelegramMessage(results);
    
    for (const chatId of CONFIG.TELEGRAM_CHAT_IDS) {
      const response = UrlFetchApp.fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });
      
      if (response.getResponseCode() === 200) {
        console.log(`✅ Telegram通知已發送到 ${chatId}`);
      } else {
        console.error(`❌ Telegram通知發送失敗: ${response.getContentText()}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 發送Telegram通知失敗:', error);
  }
}

/**
 * 格式化Telegram消息
 */
function formatTelegramMessage(results) {
  const timestamp = new Date().toLocaleString('zh-TW');
  let message = `🏪 <b>餐廳評價查詢結果</b>\n`;
  message += `📅 查詢時間: ${timestamp}\n\n`;
  
  for (const store of results) {
    message += `🏷️ <b>${store.name}</b>\n`;
    
    let platformCount = 0;
    let totalRating = 0;
    let validPlatforms = 0;
    
    // 統計各平台數據
    for (const [platform, data] of Object.entries(store.platforms || {})) {
      platformCount++;
      
      if (data.success) {
        validPlatforms++;
        const platformName = getPlatformName(platform);
        const rating = data.rating || 'N/A';
        const reviews = data.reviewCount || 'N/A';
        
        message += `${getPlatformEmoji(platform)} <b>${platformName}</b>: ${rating}⭐ (${reviews}則評論)\n`;
        
        if (data.rating && !isNaN(parseFloat(data.rating))) {
          totalRating += parseFloat(data.rating);
        }
      } else {
        const platformName = getPlatformName(platform);
        message += `${getPlatformEmoji(platform)} <b>${platformName}</b>: ❌ 無法取得\n`;
      }
    }
    
    // 計算平均評分
    if (validPlatforms > 0) {
      const avgRating = (totalRating / validPlatforms).toFixed(1);
      message += `📊 <b>平均評分</b>: ${avgRating}⭐ (${validPlatforms}/${platformCount}個平台)\n`;
    }
    
    message += '\n';
  }
  
  message += `🤖 <i>由Google Apps Script自動查詢</i>`;
  return message;
}

/**
 * 發送錯誤通知
 */
function sendErrorNotification(errorMessage) {
  const message = `❌ <b>餐廳查詢系統錯誤</b>\n\n` +
                 `🕐 時間: ${new Date().toLocaleString('zh-TW')}\n` +
                 `📝 錯誤: ${errorMessage}\n\n` +
                 `🔧 請檢查系統狀態`;
  
  for (const chatId of CONFIG.TELEGRAM_CHAT_IDS) {
    try {
      UrlFetchApp.fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });
    } catch (error) {
      console.error('發送錯誤通知失敗:', error);
    }
  }
}

/**
 * 輔助函數
 */
function getPlatformName(platform) {
  const names = {
    google: 'Google Maps',
    uber: 'UberEats',
    panda: 'Foodpanda'
  };
  return names[platform] || platform;
}

function getPlatformEmoji(platform) {
  const emojis = {
    google: '🗺️',
    uber: '🚗',
    panda: '🐼'
  };
  return emojis[platform] || '🏪';
}

/**
 * 設定定時觸發器（手動執行一次即可）
 */
function setupTrigger() {
  // 刪除現有觸發器
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'main') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // 創建新的每日觸發器（凌晨1點執行）
  ScriptApp.newTrigger('main')
    .timeBased()
    .everyDays(1)
    .atHour(1)
    .create();
    
  console.log('✅ 定時觸發器已設定（每天凌晨1點執行）');
}

/**
 * 手動測試函數
 */
function testRun() {
  console.log('🧪 手動測試執行...');
  main();
}

/**
 * 初始化Google Sheets（手動執行一次）
 */
function initializeSheets() {
  if (!CONFIG.SPREADSHEET_ID) {
    console.log('❌ 請先設定SPREADSHEET_ID');
    return;
  }
  
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getActiveSheet();
    
    // 設定標題行
    const headers = [
      '查詢時間',
      '餐廳名稱', 
      '平台',
      '評分',
      '評論數',
      '外送時間',
      '外送費',
      '網址'
    ];
    
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    
    console.log('✅ Google Sheets已初始化');
    
  } catch (error) {
    console.error('❌ 初始化Google Sheets失敗:', error);
  }
}