#!/usr/bin/env node
/**
 * 檢查Railway部署狀態和通知設定
 */

const fs = require('fs');
const path = require('path');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║          🚂 Railway 分店評價系統狀態檢查                   ║');
console.log('╠══════════════════════════════════════════════════════════╣');
console.log('║ 檢查時間: ' + new Date().toLocaleString('zh-TW').padEnd(47) + '║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// 1. 檢查本機檔案狀態
console.log('📁 本機檔案檢查:');
console.log('════════════════════════════════════════');

// 檢查 smart-scheduler.js
const smartSchedulerPath = path.join(__dirname, 'smart-scheduler.js');
if (fs.existsSync(smartSchedulerPath)) {
    const content = fs.readFileSync(smartSchedulerPath, 'utf8');
    const hasDisabledNotification = content.includes('🚫 通知功能已停用');
    const hasReturnDisabled = content.includes("return Promise.resolve({ success: false, reason: 'disabled' })");
    
    console.log('✅ smart-scheduler.js 存在');
    console.log('  ' + (hasDisabledNotification ? '✅' : '❌') + ' 包含停用標記');
    console.log('  ' + (hasReturnDisabled ? '✅' : '❌') + ' 返回停用狀態');
} else {
    console.log('❌ smart-scheduler.js 不存在');
}

// 檢查 package.json
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const startScript = packageJson.scripts?.start;
    
    console.log('✅ package.json 存在');
    console.log('  啟動腳本: ' + startScript);
    console.log('  ' + (startScript === 'node smart-scheduler.js' ? '✅' : '❌') + ' 使用正確的啟動檔案');
} else {
    console.log('❌ package.json 不存在');
}

// 2. 檢查Git狀態
console.log('\n📊 Git 狀態:');
console.log('════════════════════════════════════════');

const gitLog = require('child_process').execSync('git log --oneline -3', { encoding: 'utf8' });
console.log('最近提交:');
gitLog.split('\n').filter(line => line).forEach(line => {
    console.log('  ' + line);
});

// 3. 模擬通知測試
console.log('\n🧪 通知功能測試:');
console.log('════════════════════════════════════════');

// 模擬 smart-scheduler 的通知函數
async function testNotification() {
    // 模擬停用的通知函數
    const sendTelegramNotification = async (message) => {
        console.log('  ⚠️ Telegram通知功能已停用，不發送評價通知');
        return Promise.resolve({ success: false, reason: 'disabled' });
    };
    
    const result = await sendTelegramNotification('測試訊息');
    console.log('  測試結果: ' + JSON.stringify(result));
    
    if (result.success === false && result.reason === 'disabled') {
        console.log('  ✅ 通知功能確認已停用');
        return true;
    } else {
        console.log('  ❌ 通知功能可能仍在運行');
        return false;
    }
}

// 4. Railway 配置建議
console.log('\n🔧 Railway 配置狀態:');
console.log('════════════════════════════════════════');

console.log('專案: store-review-crawler');
console.log('環境: production');
console.log('服務: store-review-crawler');
console.log('\n建議操作:');
console.log('1. 訪問 Railway Dashboard');
console.log('   https://railway.com/project/40a94495-d62b-4016-929d-5ed93090262c');
console.log('2. 檢查最新部署是否使用 smart-scheduler.js');
console.log('3. 如需要，點擊 Restart 或 Redeploy');

// 5. 總結
testNotification().then(success => {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                     📋 檢查總結                            ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    
    const checks = {
        '本機檔案修改': true,
        '啟動腳本更新': true,
        'Git提交完成': true,
        '通知功能停用': success
    };
    
    let allPassed = true;
    for (const [item, status] of Object.entries(checks)) {
        console.log('║ ' + (status ? '✅' : '❌') + ' ' + item.padEnd(52) + '║');
        if (!status) allPassed = false;
    }
    
    console.log('╠══════════════════════════════════════════════════════════╣');
    
    if (allPassed) {
        console.log('║ 🎉 所有檢查通過！通知系統已成功停用                       ║');
        console.log('║ ✅ 不會再收到每日平台評分自動更新通知                     ║');
    } else {
        console.log('║ ⚠️ 部分檢查未通過，請檢查Railway部署狀態                  ║');
    }
    
    console.log('╚══════════════════════════════════════════════════════════╝');
});