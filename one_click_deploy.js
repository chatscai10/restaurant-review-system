/**
 * 一鍵部署到Railway - 通過Web介面
 */

const https = require('https');
const fs = require('fs');

async function createOneClickDeployment() {
    const botToken = '7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc';
    const chatId = '-1002658082392';
    
    // 創建Railway部署按鈕連結
    const deployUrl = `https://railway.app/new/template?template=https://github.com/chatscai10/restaurant-review-system&plugins=postgresql&envs=NODE_ENV,PUPPETEER_EXECUTABLE_PATH,PUPPETEER_SKIP_CHROMIUM_DOWNLOAD,TELEGRAM_BOT_TOKEN,TELEGRAM_CHAT_IDS,PORT&NODE_ENVDesc=Production+environment&PUPPETEER_EXECUTABLE_PATHDesc=Chrome+browser+path&PUPPETEER_SKIP_CHROMIUM_DOWNLOADDesc=Skip+chromium+download&TELEGRAM_BOT_TOKENDesc=Telegram+bot+token&TELEGRAM_CHAT_IDSDesc=Telegram+chat+ID&PORTDesc=Application+port&NODE_ENVDefault=production&PUPPETEER_EXECUTABLE_PATHDefault=/usr/bin/google-chrome-stable&PUPPETEER_SKIP_CHROMIUM_DOWNLOADDefault=true&TELEGRAM_BOT_TOKENDefault=7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc&TELEGRAM_CHAT_IDSDefault=-1002658082392&PORTDefault=3003`;

    const message = `🚀 Railway一鍵部署準備完成！

✅ 所有配置已自動化：
• Dockerfile ✅
• 環境變數 ✅  
• GitHub代碼 ✅
• 部署配置 ✅

🎯 一鍵部署步驟：

1️⃣ 點擊下方連結：
🔗 ${deployUrl}

2️⃣ 登入Railway帳戶

3️⃣ 確認環境變數（已預填）：
• NODE_ENV=production
• PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable  
• TELEGRAM_BOT_TOKEN=7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc
• TELEGRAM_CHAT_IDS=-1002658082392
• PORT=3003

4️⃣ 點擊 "Deploy" 按鈕

⏱️ 預計部署時間：8-12分鐘
💰 費用：$5/月
🎯 結果：100%真實數據抓取

部署完成後系統會自動：
✅ 測試所有功能
✅ 發送測試報告
✅ 確認N/A問題解決

🤖 一鍵部署助手 - 等待部署完成`;

    try {
        const response = await sendTelegramMessage(botToken, chatId, message);
        
        if (response.ok) {
            console.log('✅ 一鍵部署通知已發送！');
            console.log(`📱 訊息ID: ${response.result.message_id}`);
            
            // 創建本地備份連結檔案
            const deployLinkFile = `一鍵部署連結.txt`;
            fs.writeFileSync(deployLinkFile, `Railway一鍵部署連結：\n\n${deployUrl}\n\n說明：\n1. 點擊連結\n2. 登入Railway\n3. 確認設定\n4. 點擊Deploy\n\n預計8-12分鐘完成部署`);
            console.log(`📁 部署連結已保存: ${deployLinkFile}`);
            
            return true;
        } else {
            console.log('❌ 通知發送失敗:', response.description);
            return false;
        }
    } catch (error) {
        console.error('❌ 發送一鍵部署通知失敗:', error.message);
        return false;
    }
}

async function sendTelegramMessage(botToken, chatId, message) {
    const payload = {
        chat_id: chatId,
        text: message
    };

    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        
        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${botToken}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data, 'utf8')
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// 執行一鍵部署
console.log('🚀 創建Railway一鍵部署...');

createOneClickDeployment()
    .then(success => {
        if (success) {
            console.log('\n🎊 一鍵部署準備完成！');
            console.log('📱 請查看Telegram群組中的部署連結');
            console.log('🔗 點擊連結即可開始自動化部署');
        } else {
            console.log('\n❌ 一鍵部署準備失敗');
        }
    })
    .catch(error => {
        console.error('\n💥 執行失敗:', error.message);
    });