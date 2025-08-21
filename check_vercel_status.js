const https = require('https');

/**
 * 檢查Vercel部署狀態和實際可用網址
 */

const possibleUrls = [
    // 主要網址格式
    'https://restaurant-review-system.vercel.app',
    'https://restaurant-review-system-chatscai10.vercel.app',
    'https://restaurant-review-system-git-master-chatscai10.vercel.app',
    'https://restaurant-review-system-chatscai10-4188s-projects.vercel.app',
    'https://restaurant-review-system-git-master-chatscai10-4188s-projects.vercel.app',
    
    // 其他可能的格式
    'https://restaurant-review-system-ai3gzxwcy-chatscai10-4188s-projects.vercel.app',
    'https://restaurant-review-system-ai3gzxwcy.vercel.app',
    'https://restaurant-review-system-99vy12n1e-chatscai10-4188s-projects.vercel.app',
    'https://restaurant-review-system-99vy12n1e.vercel.app'
];

async function checkUrl(url) {
    return new Promise((resolve) => {
        console.log(`🔍 檢查: ${url}`);
        
        const request = https.get(url, { timeout: 10000 }, (response) => {
            const { statusCode } = response;
            const success = statusCode >= 200 && statusCode < 400;
            
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                const isHtml = data.includes('<html') || data.includes('<!DOCTYPE');
                const hasTitle = data.includes('餐廳評價查詢') || data.includes('Restaurant Review');
                
                resolve({
                    url,
                    success,
                    statusCode,
                    hasHtmlContent: isHtml,
                    hasExpectedContent: hasTitle,
                    contentLength: data.length,
                    response: success && isHtml ? '✅ 成功載入' : '❌ 載入失敗'
                });
            });
        });

        request.on('error', (error) => {
            resolve({
                url,
                success: false,
                error: error.message,
                response: '❌ 連接失敗'
            });
        });

        request.on('timeout', () => {
            request.destroy();
            resolve({
                url,
                success: false,
                error: 'Request timeout',
                response: '⏰ 請求超時'
            });
        });
    });
}

async function checkAllUrls() {
    console.log('🚀 開始檢查Vercel部署狀態...\n');
    
    const results = [];
    for (const url of possibleUrls) {
        const result = await checkUrl(url);
        results.push(result);
        
        console.log(`${result.response} - ${url}`);
        if (result.success && result.hasExpectedContent) {
            console.log(`   ✨ 找到可用部署！內容長度: ${result.contentLength} bytes`);
        }
        console.log('');
        
        // 如果找到可用的，可以提前結束檢查
        if (result.success && result.hasExpectedContent) {
            console.log('🎉 找到可用的部署網址！');
            break;
        }
        
        // 避免請求過於頻繁
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const workingUrls = results.filter(r => r.success);
    const fullyWorkingUrls = results.filter(r => r.success && r.hasExpectedContent);
    
    console.log('\n📊 檢查結果總結:');
    console.log(`✅ 可訪問網址: ${workingUrls.length}`);
    console.log(`🎯 完全正常網址: ${fullyWorkingUrls.length}`);
    console.log(`❌ 失敗網址: ${results.length - workingUrls.length}`);
    
    if (fullyWorkingUrls.length > 0) {
        console.log('\n🌟 推薦使用網址:');
        fullyWorkingUrls.forEach(url => {
            console.log(`   🔗 ${url.url}`);
            console.log(`      📊 管理後台: ${url.url}/admin`);
        });
        
        console.log('\n🧪 測試功能:');
        console.log('   1. 訪問主頁面確認載入正常');
        console.log('   2. 進入管理後台設定分店和群組');
        console.log('   3. 測試餐廳評價查詢功能');
        console.log('   4. 驗證Telegram通知是否正常');
    } else {
        console.log('\n⚠️  部署可能仍在進行中，請稍後再次檢查');
        console.log('   建議：前往Vercel Dashboard確認部署狀態');
        console.log('   網址：https://vercel.com/dashboard');
    }
    
    return results;
}

checkAllUrls().catch(console.error);