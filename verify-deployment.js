#!/usr/bin/env node
/**
 * 部署驗證腳本
 * 在Railway上執行這個腳本來確認正在執行的是哪個檔案
 */

console.log('🔍 部署驗證腳本啟動');
console.log('執行時間:', new Date().toISOString());
console.log('檔案名稱: verify-deployment.js');
console.log('');

// 檢查是否是smart-scheduler.js被執行
const fs = require('fs');
const path = require('path');

console.log('📂 當前工作目錄:', process.cwd());
console.log('📝 當前執行檔案:', __filename);
console.log('');

// 檢查package.json
try {
    const packageJson = require('./package.json');
    console.log('📦 Package.json 啟動腳本:', packageJson.scripts.start);
    console.log('');
} catch (error) {
    console.log('❌ 無法讀取package.json:', error.message);
}

// 檢查檔案存在性
const files = ['smart-scheduler.js', 'cloud-enhanced-crawler.js'];
files.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file} 存在`);
        
        // 檢查smart-scheduler.js的修改
        if (file === 'smart-scheduler.js') {
            const content = fs.readFileSync(file, 'utf8');
            const hasDisableFlag = content.includes('🚫 通知功能已停用');
            console.log(`   ${hasDisableFlag ? '✅' : '❌'} 包含停用標記`);
        }
    } else {
        console.log(`❌ ${file} 不存在`);
    }
});

console.log('');
console.log('🚨 如果看到這個訊息，表示verify-deployment.js正在執行');
console.log('但實際應該執行的是smart-scheduler.js');
console.log('');
console.log('建議：檢查Railway Dashboard的部署設定');