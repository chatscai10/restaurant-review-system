#!/usr/bin/env node
/**
 * 雲端自動化查詢排程器
 * 支援多種雲端平台的定時任務
 * 
 * 功能特色:
 * - 每日凌晨1點自動執行
 * - 支援多店家配置
 * - 自動Telegram通知
 * - 錯誤處理和重試機制
 * - 執行日誌記錄
 */

const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class CloudScheduler {
    constructor() {
        // 從環境變數或配置文件讀取設定
        this.config = {
            // Telegram設定
            telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc',
            telegramChatIds: this.parseChatIds(process.env.TELEGRAM_CHAT_IDS || '-1002658082392'),
            
            // 查詢配置
            queryConfig: this.parseQueryConfig(),
            
            // 執行設定
            maxRetries: 3,
            retryDelay: 60000, // 1分鐘
            timeout: 300000,   // 5分鐘
        };
        
        this.browser = null;
        this.results = [];
        this.executionLog = [];
    }
    
    /**
     * 解析Telegram群組ID
     */
    parseChatIds(chatIdsStr) {
        return chatIdsStr.split(',').map(id => id.trim()).filter(id => id);
    }
    
    /**
     * 解析查詢配置
     */
    parseQueryConfig() {
        // 嘗試從環境變數讀取
        const configStr = process.env.QUERY_CONFIG;
        if (configStr) {
            try {
                return JSON.parse(configStr);
            } catch (e) {
                console.log('📋 使用預設查詢配置');
            }
        }
        
        // 預設配置
        return [
            {
                name: '不早脆皮雞排 中壢龍崗店',
                urls: {
                    google: 'https://maps.app.goo.gl/fS8RAzxJpBjVpSQT9?g_st=com.google.maps.preview.copy',
                    uber: 'https://www.ubereats.com/store-browse-uuid/dcbd639d-d703-5c60-a55e-7ddb1a6954f9?diningMode=DELIVERY',
                    panda: 'https://foodpanda.page.link/yhvLQKDDAScTN5rq7'
                }
            }
            // 可以添加更多店家
        ];
    }
    
    /**
     * 初始化瀏覽器
     */
    async initBrowser() {
        this.log('🚀 初始化無頭瀏覽器...');
        
        const browserOptions = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--window-size=1920,1080'
            ]
        };
        
        // 雲端環境特殊配置
        if (process.env.NODE_ENV === 'production' || process.env.CI) {
            browserOptions.executablePath = process.env.CHROME_EXECUTABLE_PATH || 
                                           '/usr/bin/google-chrome-stable';
        }
        
        this.browser = await puppeteer.launch(browserOptions);
        this.log('✅ 瀏覽器初始化成功');
    }
    
    /**
     * 執行自動查詢
     */
    async executeScheduledQuery() {
        const startTime = new Date();
        this.log(`⏰ 開始執行定時查詢 - ${startTime.toISOString()}`);
        
        try {
            await this.initBrowser();
            
            for (const storeConfig of this.config.queryConfig) {
                this.log(`🏪 正在查詢: ${storeConfig.name}`);
                
                const storeResult = {
                    name: storeConfig.name,
                    platforms: {},
                    summary: {
                        totalPlatforms: 0,
                        successPlatforms: 0,
                        averageRating: 0,
                        totalReviews: 0
                    },
                    timestamp: new Date().toISOString()
                };
                
                // 查詢各平台
                for (const [platform, url] of Object.entries(storeConfig.urls)) {
                    try {
                        this.log(`  🔍 查詢 ${platform.toUpperCase()}...`);
                        const result = await this.scrapeWithRetry(platform, url);
                        storeResult.platforms[platform] = result;
                        
                        if (result.success) {
                            storeResult.summary.successPlatforms++;
                            if (result.rating) {
                                storeResult.summary.averageRating += parseFloat(result.rating);
                            }
                            if (result.reviewCount) {
                                const reviews = this.parseReviewCount(result.reviewCount);
                                storeResult.summary.totalReviews += reviews;
                            }
                        }
                        
                        storeResult.summary.totalPlatforms++;
                        
                    } catch (error) {
                        this.log(`  ❌ ${platform.toUpperCase()} 查詢失敗: ${error.message}`);
                        storeResult.platforms[platform] = {
                            success: false,
                            error: error.message,
                            platform: platform
                        };
                    }
                }
                
                // 計算平均評分
                if (storeResult.summary.successPlatforms > 0) {
                    storeResult.summary.averageRating = 
                        (storeResult.summary.averageRating / storeResult.summary.successPlatforms).toFixed(1);
                }
                
                this.results.push(storeResult);
                this.log(`  ✅ ${storeConfig.name} 查詢完成`);
            }
            
            // 發送通知
            await this.sendScheduledNotification();
            
            // 保存執行記錄
            await this.saveExecutionLog();
            
            const endTime = new Date();
            const duration = Math.round((endTime - startTime) / 1000);
            this.log(`🎉 定時查詢完成，耗時 ${duration} 秒`);
            
            return {
                success: true,
                duration: duration,
                results: this.results.length,
                timestamp: startTime.toISOString()
            };
            
        } catch (error) {
            this.log(`💥 定時查詢執行失敗: ${error.message}`);
            
            // 發送錯誤通知
            await this.sendErrorNotification(error);
            
            return {
                success: false,
                error: error.message,
                timestamp: startTime.toISOString()
            };
            
        } finally {
            if (this.browser) {
                await this.browser.close();
                this.log('🔄 瀏覽器已關閉');
            }
        }
    }
    
    /**
     * 帶重試的爬取
     */
    async scrapeWithRetry(platform, url, retryCount = 0) {
        try {
            return await this.scrapePlatform(platform, url);
        } catch (error) {
            if (retryCount < this.config.maxRetries) {
                this.log(`  🔄 ${platform} 重試 ${retryCount + 1}/${this.config.maxRetries}`);
                await this.sleep(this.config.retryDelay);
                return await this.scrapeWithRetry(platform, url, retryCount + 1);
            }
            throw error;
        }
    }
    
    /**
     * 爬取單一平台
     */
    async scrapePlatform(platform, url) {
        const page = await this.browser.newPage();
        
        try {
            // 設置超時和User-Agent
            await page.setDefaultTimeout(this.config.timeout);
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // 導航到頁面
            await page.goto(url, { waitUntil: 'networkidle0', timeout: this.config.timeout });
            
            // 等待頁面載入
            await this.sleep(5000);
            
            let result = { success: false, platform: platform };
            
            switch (platform) {
                case 'google':
                    result = await this.scrapeGoogleMaps(page);
                    break;
                case 'uber':
                    result = await this.scrapeUberEats(page);
                    break;
                case 'panda':
                    result = await this.scrapeFoodpanda(page);
                    break;
                default:
                    throw new Error(`不支援的平台: ${platform}`);
            }
            
            result.platform = platform;
            result.success = true;
            result.url = url;
            
            return result;
            
        } finally {
            await page.close();
        }
    }
    
    /**
     * Google Maps 爬取
     */
    async scrapeGoogleMaps(page) {
        const result = {};
        
        // 店名
        try {
            const nameElement = await page.waitForSelector('h1.DUwDvf, h1[data-attrid="title"]', { timeout: 10000 });
            result.storeName = await nameElement.textContent();
        } catch (e) {
            result.storeName = '未找到';
        }
        
        // 評分
        try {
            const ratingElement = await page.$('span.MW4etd');
            if (ratingElement) {
                result.rating = await ratingElement.textContent();
            }
        } catch (e) {
            result.rating = null;
        }
        
        // 評論數
        try {
            const reviewElement = await page.$('span.UY7F9');
            if (reviewElement) {
                const text = await reviewElement.textContent();
                const match = text.match(/\(([\d,]+)/);
                if (match) {
                    result.reviewCount = match[1];
                }
            }
        } catch (e) {
            result.reviewCount = null;
        }
        
        return result;
    }
    
    /**
     * UberEats 爬取
     */
    async scrapeUberEats(page) {
        const result = {};
        
        // 等待頁面載入
        await this.sleep(8000);
        
        // 店名
        try {
            const nameSelectors = ['h1[data-testid="store-title"]', 'h1', '[data-testid="store-info-name"]'];
            for (const selector of nameSelectors) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        result.storeName = await element.textContent();
                        if (result.storeName && result.storeName.trim()) break;
                    }
                } catch (e) {
                    continue;
                }
            }
        } catch (e) {
            result.storeName = '未找到';
        }
        
        // 評分和評論數的處理邏輯...
        // (簡化版，實際會包含更多選擇器)
        
        return result;
    }
    
    /**
     * Foodpanda 爬取
     */
    async scrapeFoodpanda(page) {
        const result = {};
        
        // 等待頁面載入
        await this.sleep(10000);
        
        // 類似的爬取邏輯...
        
        return result;
    }
    
    /**
     * 發送定時通知
     */
    async sendScheduledNotification() {
        this.log('📱 準備發送定時通知...');
        
        const message = this.formatScheduledMessage();
        
        const sendPromises = this.config.telegramChatIds.map(chatId => 
            this.sendTelegramMessage(message, chatId)
        );
        
        const results = await Promise.allSettled(sendPromises);
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        
        this.log(`📨 通知發送完成: ${successCount}/${this.config.telegramChatIds.length} 個群組`);
    }
    
    /**
     * 格式化定時訊息
     */
    formatScheduledMessage() {
        const timestamp = new Date().toLocaleString('zh-TW');
        
        let message = `🤖 每日自動查詢報告\\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\\n`;
        message += `⏰ 執行時間: ${timestamp}\\n`;
        message += `📊 查詢店家: ${this.results.length} 家\\n\\n`;
        
        this.results.forEach((store, index) => {
            message += `🏪 ${store.name}\\n`;
            message += `📈 平均評分: ${store.summary.averageRating}/5.0\\n`;
            message += `✅ 成功平台: ${store.summary.successPlatforms}/${store.summary.totalPlatforms}\\n`;
            message += `💬 總評論數: ${store.summary.totalReviews}\\n`;
            
            // 平台詳細資訊
            for (const [platform, data] of Object.entries(store.platforms)) {
                const emoji = this.getPlatformEmoji(platform);
                if (data.success) {
                    message += `${emoji} ${data.rating || 'N/A'} (${data.reviewCount || 'N/A'} 評論)\\n`;
                } else {
                    message += `${emoji} ❌ 查詢失敗\\n`;
                }
            }
            
            if (index < this.results.length - 1) {
                message += `\\n━━━━━━━━━━━━━━━━━━━━━━\\n`;
            }
        });
        
        message += `\\n🤖 由雲端自動化系統提供`;
        
        return message;
    }
    
    /**
     * 發送錯誤通知
     */
    async sendErrorNotification(error) {
        const message = `🚨 自動查詢系統錯誤\\n` +
                       `━━━━━━━━━━━━━━━━━━━━━━\\n` +
                       `⏰ 錯誤時間: ${new Date().toLocaleString('zh-TW')}\\n` +
                       `❌ 錯誤訊息: ${error.message}\\n\\n` +
                       `🔧 建議檢查系統狀態或聯繫管理員`;
        
        const sendPromises = this.config.telegramChatIds.map(chatId => 
            this.sendTelegramMessage(message, chatId)
        );
        
        await Promise.allSettled(sendPromises);
    }
    
    /**
     * 發送Telegram訊息
     */
    async sendTelegramMessage(message, chatId) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            });
            
            const options = {
                hostname: 'api.telegram.org',
                port: 443,
                path: `/bot${this.config.telegramBotToken}/sendMessage`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            };
            
            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(responseData);
                        result.ok ? resolve(result) : reject(new Error(result.description));
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            
            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }
    
    /**
     * 保存執行記錄
     */
    async saveExecutionLog() {
        try {
            const logData = {
                timestamp: new Date().toISOString(),
                results: this.results,
                executionLog: this.executionLog,
                summary: {
                    totalStores: this.results.length,
                    totalPlatforms: this.results.reduce((sum, store) => sum + store.summary.totalPlatforms, 0),
                    successfulQueries: this.results.reduce((sum, store) => sum + store.summary.successPlatforms, 0)
                }
            };
            
            const logFile = `scheduled_query_${new Date().toISOString().split('T')[0]}.json`;
            await fs.writeFile(logFile, JSON.stringify(logData, null, 2));
            this.log(`📄 執行記錄已保存: ${logFile}`);
            
        } catch (error) {
            this.log(`❌ 保存執行記錄失敗: ${error.message}`);
        }
    }
    
    /**
     * 工具方法
     */
    getPlatformEmoji(platform) {
        const emojiMap = {
            'google': '🗺️',
            'uber': '🚗',
            'panda': '🐼'
        };
        return emojiMap[platform] || '📱';
    }
    
    parseReviewCount(reviewCountStr) {
        if (!reviewCountStr) return 0;
        const num = parseInt(reviewCountStr.replace(/[^\\d]/g, ''));
        return isNaN(num) ? 0 : num;
    }
    
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);
        this.executionLog.push(logMessage);
    }
}

// 主執行函數
async function main() {
    const scheduler = new CloudScheduler();
    
    try {
        const result = await scheduler.executeScheduledQuery();
        
        if (result.success) {
            console.log('✅ 定時查詢執行成功');
            process.exit(0);
        } else {
            console.error('❌ 定時查詢執行失敗');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('💥 系統錯誤:', error);
        process.exit(1);
    }
}

// 如果直接執行此腳本
if (require.main === module) {
    main();
}

module.exports = { CloudScheduler };