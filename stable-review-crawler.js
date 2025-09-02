#!/usr/bin/env node
/**
 * 穩定版分店評價爬蟲系統
 * 
 * 核心特點:
 * - 單一分店獨立執行，避免併發問題
 * - 智慧重試機制，最多3次重試
 * - 詳細錯誤日誌記錄
 * - 延遲執行避免被封鎖
 * - 測試模式僅通知管理員群組
 */

const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class StableReviewCrawler {
    constructor() {
        this.config = {
            // Telegram設定
            telegramBotToken: '7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc',
            telegramGroups: {
                admin: '-1002658082392',    // 管理員群組（測試用）
                boss: '-4739541077',         // 老闆群組（穩定後啟用）
                employee: '-4757083844'      // 員工群組（穩定後啟用）
            },
            testMode: true,  // 測試模式：true只發送管理員，false發送所有群組
            
            // 爬蟲設定
            crawlerConfig: {
                headless: true,
                timeout: 30000,      // 30秒超時
                waitBetween: 3000,   // 每個分店間等待3秒
                maxRetries: 3,       // 最多重試3次
                retryDelay: 5000,    // 重試延遲5秒
            },
            
            // 分店配置
            stores: [
                {
                    id: 1,
                    name: '不早脆皮雞排 中壢龍崗店',
                    urls: {
                        google: 'https://www.google.com/maps?q=320%E6%A1%83%E5%9C%92%E5%B8%82%E4%B8%AD%E5%A3%A2%E5%8D%80%E9%BE%8D%E6%9D%B1%E8%B7%AF190%E8%99%9F%E6%AD%A3%E5%B0%8D%E9%9D%A2%E4%B8%8D%E6%97%A9%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E4%B8%AD%E5%A3%A2%E9%BE%8D%E5%B4%97%E5%BA%97',
                        uber: 'https://www.ubereats.com/tw/store/%E4%B8%8D%E6%97%A9%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E4%B8%AD%E5%A3%A2%E9%BE%8D%E5%B4%97%E5%BA%97/3L1jndcDXGClXn3bGmlU-Q',
                        panda: 'https://www.foodpanda.com.tw/restaurant/la6k/bu-zao-cui-pi-ji-pai-zhong-li-long-gang-dian'
                    }
                },
                {
                    id: 2,
                    name: '不早脆皮雞排 桃園龍安店',
                    urls: {
                        google: 'https://www.google.com/search?kgmid=/g/11krbr1qv3&q=%E4%B8%8D%E6%97%A9%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E6%A1%83%E5%9C%92%E9%BE%8D%E5%AE%89%E5%BA%97',
                        uber: 'https://www.ubereats.com/tw/store/%E4%B8%8D%E6%97%A9%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92%E6%A1%83%E5%9C%92%E9%BE%8D%E5%AE%89%E5%BA%97/mY4hchI6VIKrKBjJYEGGmA',
                        panda: 'https://www.foodpanda.com.tw/restaurant/darg/bu-zao-cui-pi-ji-pai-tao-yuan-long-an-dian'
                    }
                },
                {
                    id: 3,
                    name: '脆皮雞排 內壢忠孝店',
                    urls: {
                        google: 'https://maps.google.com/maps?q=%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E5%85%A7%E5%A3%A2%E5%BF%A0%E5%AD%9D%E5%BA%97',
                        uber: 'https://www.ubereats.com/tw/store/%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E5%85%A7%E5%A3%A2%E5%BF%A0%E5%AD%9D%E5%BA%97/cA165PUVSmqs2nduXGfscw',
                        panda: 'https://www.foodpanda.com.tw/restaurant/i4bt/cui-pi-ji-pai-nei-li-zhong-xiao-dian'
                    }
                }
            ]
        };
        
        this.results = [];
        this.logs = [];
    }
    
    /**
     * 記錄日誌
     */
    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        console.log(logMessage);
        this.logs.push(logMessage);
    }
    
    /**
     * 主執行函數 - 分開執行每個分店
     */
    async execute() {
        const startTime = Date.now();
        this.log('🚀 開始執行穩定版爬蟲系統');
        
        try {
            // 逐一處理每個分店
            for (const [index, store] of this.config.stores.entries()) {
                this.log(`\n📍 處理第 ${index + 1}/${this.config.stores.length} 個分店: ${store.name}`);
                
                const storeResult = await this.crawlSingleStore(store);
                this.results.push(storeResult);
                
                // 顯示單店結果
                if (storeResult.success) {
                    this.log(`✅ ${store.name} 查詢成功 - 平均評分: ${storeResult.averageRating}`, 'SUCCESS');
                } else {
                    this.log(`❌ ${store.name} 查詢失敗 - ${storeResult.error}`, 'ERROR');
                }
                
                // 延遲下一個查詢
                if (index < this.config.stores.length - 1) {
                    this.log(`⏳ 等待 ${this.config.crawlerConfig.waitBetween / 1000} 秒後處理下一個分店...`);
                    await this.sleep(this.config.crawlerConfig.waitBetween);
                }
            }
            
            // 生成總報告
            await this.generateAndSendReport();
            
            // 保存日誌
            await this.saveLogs();
            
        } catch (error) {
            this.log(`❌ 系統執行失敗: ${error.message}`, 'FATAL');
            await this.sendErrorNotification(error);
        }
        
        const duration = Math.round((Date.now() - startTime) / 1000);
        this.log(`🏁 執行完成，總耗時: ${duration} 秒`);
    }
    
    /**
     * 爬取單一分店數據
     */
    async crawlSingleStore(store) {
        let retries = 0;
        let lastError = null;
        
        while (retries < this.config.crawlerConfig.maxRetries) {
            try {
                this.log(`🔍 嘗試爬取 ${store.name} (第 ${retries + 1}/${this.config.crawlerConfig.maxRetries} 次)`);
                
                const browser = await puppeteer.launch({
                    headless: this.config.crawlerConfig.headless,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--disable-gpu',
                        '--window-size=1920,1080'
                    ]
                });
                
                try {
                    const result = {
                        name: store.name,
                        success: false,
                        platforms: {},
                        averageRating: 0,
                        timestamp: new Date().toISOString()
                    };
                    
                    // 爬取各平台
                    for (const [platform, url] of Object.entries(store.urls)) {
                        this.log(`  📱 爬取 ${platform} 平台...`);
                        
                        const platformData = await this.crawlPlatform(browser, platform, url);
                        result.platforms[platform] = platformData;
                        
                        if (platformData.success) {
                            this.log(`    ✅ ${platform}: ${platformData.rating}⭐ (${platformData.reviewCount} 評論)`);
                        } else {
                            this.log(`    ⚠️ ${platform}: 爬取失敗 - ${platformData.error}`);
                        }
                        
                        // 平台間延遲
                        await this.sleep(1000);
                    }
                    
                    // 計算平均評分
                    const successfulPlatforms = Object.values(result.platforms)
                        .filter(p => p.success && p.rating);
                    
                    if (successfulPlatforms.length > 0) {
                        const totalRating = successfulPlatforms.reduce((sum, p) => sum + p.rating, 0);
                        result.averageRating = parseFloat((totalRating / successfulPlatforms.length).toFixed(1));
                        result.success = true;
                    }
                    
                    await browser.close();
                    return result;
                    
                } catch (crawlError) {
                    await browser.close();
                    throw crawlError;
                }
                
            } catch (error) {
                lastError = error;
                retries++;
                
                if (retries < this.config.crawlerConfig.maxRetries) {
                    this.log(`  ⚠️ 爬取失敗，${this.config.crawlerConfig.retryDelay / 1000} 秒後重試...`, 'WARN');
                    await this.sleep(this.config.crawlerConfig.retryDelay);
                }
            }
        }
        
        // 所有重試都失敗
        return {
            name: store.name,
            success: false,
            error: lastError?.message || '未知錯誤',
            platforms: {},
            averageRating: 0,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * 爬取特定平台
     */
    async crawlPlatform(browser, platform, url) {
        const page = await browser.newPage();
        
        try {
            // 設置User-Agent
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // 前往頁面
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: this.config.crawlerConfig.timeout
            });
            
            let result = {
                success: false,
                platform: platform,
                url: url,
                rating: null,
                reviewCount: null,
                error: null
            };
            
            // 根據平台爬取數據
            switch (platform) {
                case 'google':
                    result = await this.crawlGoogle(page, url);
                    break;
                case 'uber':
                    result = await this.crawlUber(page, url);
                    break;
                case 'panda':
                    result = await this.crawlFoodpanda(page, url);
                    break;
            }
            
            await page.close();
            return result;
            
        } catch (error) {
            await page.close();
            return {
                success: false,
                platform: platform,
                url: url,
                rating: null,
                reviewCount: null,
                error: error.message
            };
        }
    }
    
    /**
     * 爬取Google Maps評分
     */
    async crawlGoogle(page, url) {
        try {
            // 等待評分元素
            await page.waitForSelector('span[role="img"][aria-label*="顆星"], span[aria-label*="stars"], div[jsaction*="pane.rating.moreReviews"]', {
                timeout: 10000
            });
            
            // 嘗試多種選擇器
            const ratingData = await page.evaluate(() => {
                // 嘗試獲取評分
                let rating = null;
                let reviewCount = null;
                
                // 方法1: aria-label
                const ratingElement = document.querySelector('span[role="img"][aria-label*="顆星"], span[aria-label*="stars"]');
                if (ratingElement) {
                    const ariaLabel = ratingElement.getAttribute('aria-label');
                    const ratingMatch = ariaLabel.match(/(\d+\.?\d*)/);
                    if (ratingMatch) {
                        rating = parseFloat(ratingMatch[1]);
                    }
                }
                
                // 方法2: 直接文字
                if (!rating) {
                    const textElements = document.querySelectorAll('span');
                    for (const el of textElements) {
                        if (el.textContent.match(/^\d+\.\d$/)) {
                            rating = parseFloat(el.textContent);
                            break;
                        }
                    }
                }
                
                // 獲取評論數
                const reviewElements = document.querySelectorAll('span');
                for (const el of reviewElements) {
                    if (el.textContent.includes('則評論') || el.textContent.includes('reviews')) {
                        const countMatch = el.textContent.match(/(\d+)/);
                        if (countMatch) {
                            reviewCount = countMatch[1];
                            break;
                        }
                    }
                }
                
                return { rating, reviewCount };
            });
            
            return {
                success: ratingData.rating !== null,
                platform: 'google',
                url: url,
                rating: ratingData.rating,
                reviewCount: ratingData.reviewCount,
                error: ratingData.rating === null ? '無法獲取評分' : null
            };
            
        } catch (error) {
            return {
                success: false,
                platform: 'google',
                url: url,
                rating: null,
                reviewCount: null,
                error: error.message
            };
        }
    }
    
    /**
     * 爬取UberEats評分
     */
    async crawlUber(page, url) {
        try {
            // 等待評分元素
            await page.waitForSelector('[data-testid*="rating"], div[class*="rating"]', {
                timeout: 10000
            });
            
            const ratingData = await page.evaluate(() => {
                let rating = null;
                let reviewCount = null;
                
                // 尋找評分
                const ratingElements = document.querySelectorAll('[data-testid*="rating"], div[class*="rating"]');
                for (const el of ratingElements) {
                    const text = el.textContent;
                    const ratingMatch = text.match(/(\d+\.?\d*)/);
                    if (ratingMatch) {
                        rating = parseFloat(ratingMatch[1]);
                        
                        // 尋找評論數（通常在附近）
                        const parent = el.parentElement;
                        if (parent) {
                            const countMatch = parent.textContent.match(/\((\d+)\+?\)/);
                            if (countMatch) {
                                reviewCount = countMatch[1] + '+';
                            }
                        }
                        break;
                    }
                }
                
                return { rating, reviewCount };
            });
            
            return {
                success: ratingData.rating !== null,
                platform: 'uber',
                url: url,
                rating: ratingData.rating,
                reviewCount: ratingData.reviewCount,
                error: ratingData.rating === null ? '無法獲取評分' : null
            };
            
        } catch (error) {
            return {
                success: false,
                platform: 'uber',
                url: url,
                rating: null,
                reviewCount: null,
                error: error.message
            };
        }
    }
    
    /**
     * 爬取Foodpanda評分
     */
    async crawlFoodpanda(page, url) {
        try {
            // 等待評分元素
            await page.waitForSelector('span[class*="rating"], div[class*="rating"]', {
                timeout: 10000
            });
            
            const ratingData = await page.evaluate(() => {
                let rating = null;
                let reviewCount = null;
                
                // 尋找評分
                const ratingElements = document.querySelectorAll('span[class*="rating"], div[class*="rating"]');
                for (const el of ratingElements) {
                    const text = el.textContent;
                    const ratingMatch = text.match(/(\d+\.?\d*)/);
                    if (ratingMatch) {
                        rating = parseFloat(ratingMatch[1]);
                        
                        // 尋找評論數
                        const nextSibling = el.nextElementSibling;
                        if (nextSibling) {
                            const countMatch = nextSibling.textContent.match(/\((\d+)\)/);
                            if (countMatch) {
                                reviewCount = countMatch[1];
                            }
                        }
                        break;
                    }
                }
                
                return { rating, reviewCount };
            });
            
            return {
                success: ratingData.rating !== null,
                platform: 'panda',
                url: url,
                rating: ratingData.rating,
                reviewCount: ratingData.reviewCount,
                error: ratingData.rating === null ? '無法獲取評分' : null
            };
            
        } catch (error) {
            return {
                success: false,
                platform: 'panda',
                url: url,
                rating: null,
                reviewCount: null,
                error: error.message
            };
        }
    }
    
    /**
     * 生成並發送報告
     */
    async generateAndSendReport() {
        const successCount = this.results.filter(r => r.success).length;
        const failCount = this.results.filter(r => !r.success).length;
        
        let report = '';
        
        if (this.config.testMode) {
            report = this.generateTestReport(successCount, failCount);
            await this.sendTelegramMessage(this.config.telegramGroups.admin, report);
            this.log('📱 測試報告已發送至管理員群組', 'SUCCESS');
        } else {
            // 正式模式：發送到所有群組
            const adminReport = this.generateAdminReport(successCount, failCount);
            const employeeReport = this.generateEmployeeReport();
            
            await this.sendTelegramMessage(this.config.telegramGroups.admin, adminReport);
            await this.sleep(1000);
            await this.sendTelegramMessage(this.config.telegramGroups.boss, adminReport);
            await this.sleep(1000);
            await this.sendTelegramMessage(this.config.telegramGroups.employee, employeeReport);
            
            this.log('📱 報告已發送至所有群組', 'SUCCESS');
        }
    }
    
    /**
     * 生成測試報告
     */
    generateTestReport(successCount, failCount) {
        const timestamp = new Date().toLocaleString('zh-TW');
        
        let report = `🧪 [測試模式] 穩定版爬蟲報告\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        report += `⏰ 執行時間: ${timestamp}\n`;
        report += `🔧 執行策略: 分開查詢+智慧重試\n`;
        report += `📊 查詢結果: ${successCount} 成功 / ${failCount} 失敗\n\n`;
        
        // 詳細結果
        this.results.forEach((store, index) => {
            report += `【${index + 1}】${store.name}\n`;
            
            if (store.success) {
                report += `⭐ 平均評分: ${store.averageRating}/5.0\n`;
                
                // 各平台結果
                Object.entries(store.platforms).forEach(([platform, data]) => {
                    if (data.success) {
                        report += `  ✅ ${this.getPlatformName(platform)}: ${data.rating}⭐`;
                        if (data.reviewCount) {
                            report += ` (${data.reviewCount} 評論)`;
                        }
                        report += '\n';
                    } else {
                        report += `  ❌ ${this.getPlatformName(platform)}: ${data.error}\n`;
                    }
                });
            } else {
                report += `❌ 查詢失敗: ${store.error}\n`;
            }
            
            report += '\n';
        });
        
        // 系統資訊
        report += `💡 系統優化:\n`;
        report += `• 單店獨立執行避免併發\n`;
        report += `• 智慧重試機制(最多3次)\n`;
        report += `• 延遲執行防止封鎖\n`;
        report += `• 詳細錯誤日誌記錄\n\n`;
        
        report += `🤖 穩定版爬蟲系統 v1.0`;
        
        return report;
    }
    
    /**
     * 生成管理員報告
     */
    generateAdminReport(successCount, failCount) {
        const timestamp = new Date().toLocaleString('zh-TW');
        
        let report = `🟢 每日自動查詢報告\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        report += `⏰ 執行時間: ${timestamp}\n`;
        report += `📊 查詢結果: ${successCount} 成功 / ${failCount} 失敗\n\n`;
        
        this.results.forEach(store => {
            if (store.success) {
                report += `🟢 ${store.name}\n`;
                report += `⭐ 平均評分: ${store.averageRating}/5.0\n\n`;
                
                Object.entries(store.platforms).forEach(([platform, data]) => {
                    if (data.success) {
                        report += `${this.getPlatformName(platform)}: ${data.rating}⭐ (${data.reviewCount || 'N/A'} 評論)\n`;
                    }
                });
                report += '\n';
            }
        });
        
        return report;
    }
    
    /**
     * 生成員工報告
     */
    generateEmployeeReport() {
        let report = `🟢 ＊ 每日平台評分自動更新\n`;
        report += `🟢 ＊ 獎金以每月5號的更新訊息為計算\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        this.results.forEach(store => {
            if (store.success) {
                report += `🟢 ${store.name}\n`;
                report += `⭐ 平均評分: ${store.averageRating}/5.0\n\n`;
                
                Object.entries(store.platforms).forEach(([platform, data]) => {
                    if (data.success) {
                        report += `🟢 ${this.getPlatformName(platform)} ${data.rating}⭐ (${data.reviewCount || 'N/A'} 評論)\n`;
                        if (data.url) {
                            report += `🟢 ${data.url}\n`;
                        }
                        report += '\n';
                    }
                });
            }
        });
        
        return report;
    }
    
    /**
     * 獲取平台名稱
     */
    getPlatformName(platform) {
        const names = {
            google: 'Google Maps',
            uber: 'UberEats',
            panda: 'Foodpanda'
        };
        return names[platform] || platform;
    }
    
    /**
     * 發送Telegram消息
     */
    async sendTelegramMessage(chatId, message) {
        return new Promise((resolve, reject) => {
            const payload = JSON.stringify({
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
                    'Content-Length': Buffer.byteLength(payload, 'utf8')
                }
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve();
                    } else {
                        reject(new Error(`Telegram API錯誤: ${res.statusCode}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.write(payload);
            req.end();
        });
    }
    
    /**
     * 發送錯誤通知
     */
    async sendErrorNotification(error) {
        const errorReport = `❌ 爬蟲系統錯誤通知\n`;
        errorReport += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        errorReport += `時間: ${new Date().toLocaleString('zh-TW')}\n`;
        errorReport += `錯誤: ${error.message}\n\n`;
        errorReport += `系統將在下次排程重試`;
        
        try {
            await this.sendTelegramMessage(this.config.telegramGroups.admin, errorReport);
        } catch (sendError) {
            this.log(`無法發送錯誤通知: ${sendError.message}`, 'ERROR');
        }
    }
    
    /**
     * 保存日誌
     */
    async saveLogs() {
        try {
            const logDir = path.join(__dirname, 'logs');
            await fs.mkdir(logDir, { recursive: true });
            
            const logFile = path.join(logDir, `crawler_${Date.now()}.log`);
            await fs.writeFile(logFile, this.logs.join('\n'));
            
            this.log(`📁 日誌已保存: ${logFile}`, 'SUCCESS');
        } catch (error) {
            this.log(`無法保存日誌: ${error.message}`, 'ERROR');
        }
    }
    
    /**
     * 延遲函數
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 執行主程式
if (require.main === module) {
    const crawler = new StableReviewCrawler();
    
    crawler.execute()
        .then(() => {
            console.log('✅ 爬蟲執行完成');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ 爬蟲執行失敗:', error);
            process.exit(1);
        });
}

module.exports = StableReviewCrawler;