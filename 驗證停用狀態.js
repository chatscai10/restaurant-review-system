#!/usr/bin/env node
/**
 * 驗證分店評價系統通知停用狀態
 * 測試修改後的程式碼是否正確停用了Telegram通知
 */

const SmartScheduler = require('./smart-scheduler');

async function testNotificationDisabled() {
    console.log('🧪 測試分店評價通知停用功能');
    console.log('==========================================');
    
    try {
        // 創建調度器實例
        const scheduler = new SmartScheduler();
        
        // 測試通知發送功能
        console.log('📱 測試Telegram通知功能...');
        const testMessage = '🧪 這是一個測試訊息，如果您看到這個訊息，表示停用功能沒有生效';
        
        const result = await scheduler.sendTelegramNotification(testMessage);
        
        console.log('📊 測試結果:');
        console.log('  - 返回值:', JSON.stringify(result));
        
        if (result.success === false && result.reason === 'disabled') {
            console.log('✅ 成功！通知功能已正確停用');
            console.log('✅ 系統不會發送評價通知到Telegram');
            return true;
        } else {
            console.log('❌ 失敗！通知功能仍在運行');
            console.log('❌ 需要檢查程式碼修改是否正確');
            return false;
        }
        
    } catch (error) {
        console.error('❌ 測試過程發生錯誤:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 開始驗證系統停用狀態');
    console.log('時間:', new Date().toString());
    console.log('');
    
    const success = await testNotificationDisabled();
    
    console.log('');
    console.log('📋 驗證摘要:');
    if (success) {
        console.log('🎉 驗證通過！分店評價通知已成功停用');
        console.log('✅ Railway部署的服務將不會發送評價通知');
    } else {
        console.log('⚠️ 驗證失敗！需要進一步檢查');
        console.log('🔧 建議重新檢查程式碼修改或重新部署');
    }
    
    return success;
}

// 如果直接執行此腳本
if (require.main === module) {
    main().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('驗證腳本執行失敗:', error);
        process.exit(1);
    });
}

module.exports = { testNotificationDisabled };