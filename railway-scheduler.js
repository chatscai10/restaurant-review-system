#!/usr/bin/env node
/**
 * Railway專用排程器 - 定時執行爬蟲
 * 使用cron表達式進行排程
 */

const cron = require('node-cron');
const { exec } = require('child_process');
const https = require('https');

class RailwayScheduler {
    constructor() {
        this.config = {
            // Railway環境變數
            telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc',
            telegramAdminGroup: process.env.TELEGRAM_ADMIN_GROUP || '-1002658082392',
            
            // 排程設定 - 每天 9:00, 15:00, 21:00
            scheduleExpression: '0 9,15,21 * * *',
            
            // Railway特定設定
            isRailway: !!process.env.RAILWAY_ENVIRONMENT,
            memoryLimit: process.env.RAILWAY_MEMORY_LIMIT || '512MB'
        };
        
        this.executionCount = 0;
    }
    
    /**
     * 啟動排程器
     */
    start() {
        console.log('🚂 Railway排程器啟動');
        console.log(`📅 排程: ${this.config.scheduleExpression}`);
        console.log(`☁️ Railway環境: ${this.config.isRailway ? '是' : '否'}`);
        
        // 發送啟動通知
        this.sendTelegramMessage('🚂 Railway排程器已啟動\n📅 每日自動執行: 9:00, 15:00, 21:00');
        
        // 設定排程任務
        cron.schedule(this.config.scheduleExpression, () => {
            this.executeScheduledCrawl();
        }, {
            timezone: "Asia/Taipei"
        });
        
        // 立即執行一次測試
        setTimeout(() => {
            console.log('🧪 執行初始測試...');
            this.executeScheduledCrawl();
        }, 5000);
        
        // 保持程序運行
        this.keepAlive();
    }
    
    /**
     * 執行排程爬蟲
     */
    async executeScheduledCrawl() {
        this.executionCount++;
        const startTime = Date.now();
        
        console.log(`\n🎯 開始執行第 ${this.executionCount} 次排程爬蟲`);
        
        try {
            // 使用child_process執行爬蟲
            const result = await this.runCrawler();
            
            const duration = Math.round((Date.now() - startTime) / 1000);
            console.log(`✅ 爬蟲執行成功，耗時 ${duration} 秒`);
            
            // 發送成功通知
            const successMessage = `✅ Railway自動執行成功\n` +
                `🕒 執行時間: ${new Date().toLocaleString('zh-TW')}\n` +
                `⏱️ 耗時: ${duration}秒\n` +
                `🔄 執行次數: ${this.executionCount}`;
            
            await this.sendTelegramMessage(successMessage);
            
        } catch (error) {
            const duration = Math.round((Date.now() - startTime) / 1000);
            console.error(`❌ 爬蟲執行失敗: ${error.message}`);
            
            // 發送失敗通知
            const errorMessage = `❌ Railway執行失敗\n` +
                `🕒 執行時間: ${new Date().toLocaleString('zh-TW')}\n` +
                `⏱️ 耗時: ${duration}秒\n` +
                `❗ 錯誤: ${error.message}`;
            
            await this.sendTelegramMessage(errorMessage);
        }
    }
    
    /**
     * 執行爬蟲程序
     */
    runCrawler() {
        return new Promise((resolve, reject) => {
            exec('node cloud-enhanced-crawler.js', {
                timeout: 180000, // 3分鐘超時
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    console.log('爬蟲輸出:', stdout);
                    if (stderr) console.error('爬蟲錯誤:', stderr);
                    resolve(stdout);
                }
            });
        });
    }
    
    /**
     * 發送Telegram消息
     */
    async sendTelegramMessage(message) {
        try {
            const payload = JSON.stringify({
                chat_id: this.config.telegramAdminGroup,
                text: `🚂 [Railway排程器]\n\n${message}\n\n⏰ ${new Date().toLocaleString('zh-TW')}`
            });
            
            const options = {
                hostname: 'api.telegram.org',
                port: 443,
                path: `/bot${this.config.telegramBotToken}/sendMessage`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload, 'utf8')
                }
            };
            
            const req = https.request(options, (res) => {
                if (res.statusCode === 200) {
                    console.log('📱 Telegram通知發送成功');
                } else {
                    console.log(`❌ Telegram通知失敗: ${res.statusCode}`);
                }
            });
            
            req.on('error', (error) => {
                console.error(`❌ Telegram請求錯誤: ${error.message}`);
            });
            
            req.write(payload);
            req.end();
            
        } catch (error) {
            console.error(`❌ Telegram通知異常: ${error.message}`);
        }
    }
    
    /**
     * 保持程序運行
     */
    keepAlive() {
        // 每小時輸出狀態
        setInterval(() => {
            const uptime = Math.round(process.uptime() / 3600);
            console.log(`📊 Railway排程器運行狀態: ${uptime}小時，執行 ${this.executionCount} 次`);
        }, 3600000);
        
        // 處理程序退出
        process.on('SIGINT', () => {
            console.log('🛑 收到停止信號');
            this.sendTelegramMessage('🛑 Railway排程器已停止');
            process.exit(0);
        });
        
        process.on('SIGTERM', () => {
            console.log('🛑 收到終止信號');
            this.sendTelegramMessage('🛑 Railway排程器已終止');
            process.exit(0);
        });
    }
}

// 執行排程器
if (require.main === module) {
    const scheduler = new RailwayScheduler();
    scheduler.start();
}

module.exports = RailwayScheduler;