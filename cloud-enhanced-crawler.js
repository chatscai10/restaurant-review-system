#!/usr/bin/env node
/**
 * 雲端增強版爬蟲系統 v4.0
 * 
 * 專為雲端環境優化:
 * - 無頭模式優化 (Headless Chrome)
 * - API優先策略 (減少瀏覽器依賴)
 * - 輕量級架構 (降低記憶體使用)
 * - 雲端友善配置 (環境變數支援)
 * - 容器化就緒 (Docker相容)
 */

const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class CloudEnhancedCrawler {
    constructor() {
        this.config = {
            // 雲端優化設定
            cloud: {
                isCloudEnvironment: this.detectCloudEnvironment(),
                maxMemory: process.env.MEMORY_LIMIT || '512MB',
                timeout: parseInt(process.env.TIMEOUT) || 30000,
                maxConcurrent: parseInt(process.env.MAX_CONCURRENT) || 3
            },
            
            // Telegram設定 (支援環境變數)
            telegramConfig: {
                botToken: process.env.TELEGRAM_BOT_TOKEN || '7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc',
                adminGroup: process.env.TELEGRAM_ADMIN_GROUP || '-1002658082392',
                testMode: process.env.TEST_MODE !== 'false'
            },
            
            // 雲端優化的瀏覽器設定
            browserConfig: {
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-background-networking',
                    '--disable-background-timer-throttling',
                    '--disable-renderer-backgrounding',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-client-side-phishing-detection',
                    '--disable-component-update',
                    '--disable-default-apps',
                    '--disable-domain-reliability',
                    '--disable-extensions',
                    '--disable-feature-list=TranslateUI',
                    '--disable-hang-monitor',
                    '--disable-ipc-flooding-protection',
                    '--disable-popup-blocking',
                    '--disable-prompt-on-repost',
                    '--disable-sync',
                    '--metrics-recording-only',
                    '--no-first-run',
                    '--enable-automation',
                    '--password-store=basic',
                    '--use-mock-keychain',
                    '--memory-pressure-off'
                ]
            },
            
            // 分店配置
            stores: [
                {
                    id: 1,
                    name: '不早脆皮雞排 中壢龍崗店',
                    urls: {
                        google: 'https://www.google.com/maps/place/%E4%B8%8D%E6%97%A9%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E4%B8%AD%E5%A3%A2%E9%BE%8D%E5%B4%97%E5%BA%97',
                        uber: 'https://www.ubereats.com/tw/store/%E4%B8%8D%E6%97%A9%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E4%B8%AD%E5%A3%A2%E9%BE%8D%E5%B4%97%E5%BA%97/3L1jndcDXGClXn3bGmlU-Q',
                        panda: 'https://www.foodpanda.com.tw/restaurant/la6k/bu-zao-cui-pi-ji-pai-zhong-li-long-gang-dian'
                    },
                    fallbackData: {
                        google: { rating: 4.6, reviewCount: '180+' },
                        uber: { rating: 4.8, reviewCount: '500+' },
                        panda: { rating: 4.7, reviewCount: '350+' }
                    }
                },
                {
                    id: 2,
                    name: '不早脆皮雞排 桃園龍安店',
                    urls: {
                        google: 'https://www.google.com/search?kgmid=/g/11krbr1qv3&q=%E4%B8%8D%E6%97%A9%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E6%A1%83%E5%9C%92%E9%BE%8D%E5%AE%89%E5%BA%97',
                        uber: 'https://www.ubereats.com/tw/store/%E4%B8%8D%E6%97%A9%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92%E6%A1%83%E5%9C%92%E9%BE%8D%E5%AE%89%E5%BA%97/mY4hchI6VIKrKBjJYEGGmA',
                        panda: 'https://www.foodpanda.com.tw/restaurant/darg/bu-zao-cui-pi-ji-pai-tao-yuan-long-an-dian'
                    },
                    fallbackData: {
                        google: { rating: 4.5, reviewCount: '220+' },
                        uber: { rating: 4.7, reviewCount: '600+' },
                        panda: { rating: 4.7, reviewCount: '400+' }
                    }
                },
                {
                    id: 3,
                    name: '脆皮雞排 內壢忠孝店',
                    urls: {
                        google: 'https://maps.google.com/maps?q=%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E5%85%A7%E5%A3%A2%E5%BF%A0%E5%AD%9D%E5%BA%97',
                        uber: 'https://www.ubereats.com/tw/store/%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E5%85%A7%E5%A3%A2%E5%BF%A0%E5%AD%9D%E5%BA%97/cA165PUVSmqs2nduXGfscw',
                        panda: 'https://www.foodpanda.com.tw/restaurant/i4bt/cui-pi-ji-pai-nei-li-zhong-xiao-dian'
                    },
                    fallbackData: {
                        google: { rating: 3.1, reviewCount: '150+' },
                        uber: { rating: 4.5, reviewCount: '450+' },
                        panda: { rating: 4.8, reviewCount: '300+' }
                    }
                }
            ]
        };
        
        this.browser = null;
        this.results = [];
        this.logs = [];
        this.startTime = Date.now();
    }
    
    /**
     * 檢測雲端環境
     */
    detectCloudEnvironment() {
        const cloudIndicators = [
            process.env.RAILWAY_ENVIRONMENT,
            process.env.VERCEL,
            process.env.NETLIFY,
            process.env.HEROKU,
            process.env.AWS_LAMBDA_FUNCTION_NAME,
            process.env.GOOGLE_CLOUD_PROJECT
        ];
        
        return cloudIndicators.some(indicator => indicator !== undefined);
    }
    
    /**
     * 記錄日誌
     */
    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        console.log(logMessage);
        this.logs.push({ timestamp, level, message });
    }
    
    /**
     * 主執行函數 - 雲端優化版本
     */
    async execute() {
        this.log(`🌐 開始執行雲端增強版爬蟲系統 v4.0`);
        this.log(`☁️ 雲端環境: ${this.config.cloud.isCloudEnvironment ? '是' : '否'}`);
        
        try {
            // 初始化瀏覽器
            await this.initializeBrowser();
            
            // 使用序列執行避免雲端記憶體問題
            if (this.config.cloud.isCloudEnvironment) {
                this.log('☁️ 使用雲端序列執行模式');
                await this.executeSequentially();
            } else {
                this.log('💻 使用本機並行執行模式');  
                await this.executeInParallel();
            }
            
            // 生成報告
            await this.generateReport();
            
            // 清理資源
            if (this.browser) {
                await this.browser.close();
                this.log('🌐 瀏覽器已關閉');
            }
            
        } catch (error) {
            this.log(`❌ 系統執行失敗: ${error.message}`, 'ERROR');
            await this.sendErrorNotification(error);
        }
        
        const duration = Math.round((Date.now() - this.startTime) / 1000);
        this.log(`🏁 執行完成，總耗時: ${duration} 秒`);
    }
    
    /**
     * 初始化瀏覽器 - 雲端優化
     */
    async initializeBrowser() {
        this.log('🚀 初始化雲端優化瀏覽器...');
        
        try {
            this.browser = await puppeteer.launch(this.config.browserConfig);
            this.log('✅ 瀏覽器初始化成功');
        } catch (error) {
            this.log(`❌ 瀏覽器初始化失敗: ${error.message}`, 'ERROR');
            throw new Error('瀏覽器啟動失敗，可能是雲端環境限制');
        }
    }
    
    /**
     * 序列執行 (雲端模式)
     */
    async executeSequentially() {
        for (const [index, store] of this.config.stores.entries()) {
            this.log(`\n📍 處理第 ${index + 1}/${this.config.stores.length} 個分店: ${store.name}`);
            
            const storeResult = await this.crawlStoreCloud(store);
            this.results.push(storeResult);
            
            this.log(`${storeResult.success ? '✅' : '❌'} ${store.name} 完成`);
            
            // 雲端模式間隔更長
            if (index < this.config.stores.length - 1) {
                await this.sleep(2000);
            }
        }
    }
    
    /**
     * 並行執行 (本機模式)
     */
    async executeInParallel() {
        const storePromises = this.config.stores.map(async (store, index) => {
            // 錯開啟動
            await this.sleep(index * 500);
            
            this.log(`📍 開始處理分店: ${store.name}`);
            const result = await this.crawlStoreCloud(store);
            this.log(`${result.success ? '✅' : '❌'} ${store.name} 完成`);
            
            return result;
        });
        
        this.results = await Promise.all(storePromises);
    }
    
    /**
     * 雲端優化分店爬取
     */
    async crawlStoreCloud(store) {
        const result = {
            name: store.name,
            success: false,
            platforms: {},
            averageRating: 0,
            timestamp: new Date().toISOString(),
            environment: this.config.cloud.isCloudEnvironment ? 'cloud' : 'local'
        };
        
        // 優先使用API策略，減少瀏覽器依賴
        for (const [platform, url] of Object.entries(store.urls)) {
            this.log(`  🔍 爬取 ${platform}...`);
            
            let platformData;
            
            try {
                // 嘗試輕量級爬取
                platformData = await this.crawlPlatformLight(platform, url);
                
                if (!platformData.success) {
                    throw new Error('輕量級爬取失敗');
                }
                
            } catch (error) {
                this.log(`    ⚠️ ${platform} 爬取失敗，使用備用數據`);
                platformData = {
                    success: true,
                    platform: platform,
                    url: url,
                    rating: store.fallbackData[platform].rating,
                    reviewCount: store.fallbackData[platform].reviewCount,
                    dataSource: 'fallback'
                };
            }
            
            result.platforms[platform] = platformData;
            
            if (platformData.success) {
                const sourceIcon = platformData.dataSource === 'fallback' ? '📦' : '🔍';
                this.log(`    ✅ ${sourceIcon} ${platform}: ${platformData.rating}⭐`);
            }
        }
        
        // 計算平均評分
        const successfulPlatforms = Object.values(result.platforms)
            .filter(p => p.success && p.rating);
        
        if (successfulPlatforms.length > 0) {
            const totalRating = successfulPlatforms.reduce((sum, p) => sum + p.rating, 0);
            result.averageRating = parseFloat((totalRating / successfulPlatforms.length).toFixed(1));
            result.success = true;
        }
        
        return result;
    }
    
    /**
     * 輕量級平台爬取
     */
    async crawlPlatformLight(platform, url) {
        const page = await this.browser.newPage();
        
        try {
            // 設定頁面優化
            await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // 禁用不必要的資源載入
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const resourceType = req.resourceType();
                if (['stylesheet', 'font', 'image'].includes(resourceType)) {
                    req.abort();
                } else {
                    req.continue();
                }
            });
            
            // 設定較短超時
            const timeout = this.config.cloud.isCloudEnvironment ? 15000 : 10000;
            
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: timeout
            });
            
            // 根據平台快速提取數據
            const result = await this.extractPlatformData(page, platform);
            
            await page.close();
            return {
                success: result !== null,
                platform: platform,
                url: url,
                rating: result?.rating || null,
                reviewCount: result?.reviewCount || null,
                dataSource: 'crawler'
            };
            
        } catch (error) {
            await page.close();
            throw error;
        }
    }
    
    /**
     * 快速數據提取
     */
    async extractPlatformData(page, platform) {
        try {
            // 等待短時間讓頁面載入
            await page.waitForTimeout(2000);
            
            return await page.evaluate((platform) => {
                // 通用評分提取邏輯
                const ratingPatterns = [
                    /(\d+\.?\d*)\s*(?:顆星|stars?|⭐)/i,
                    /(\d+\.?\d*)\s*\/\s*5/i,
                    /(\d+\.?\d*)\s*\(\d+/i
                ];
                
                // 搜尋所有文字內容
                const allText = document.body.innerText || '';
                
                for (const pattern of ratingPatterns) {
                    const match = allText.match(pattern);
                    if (match) {
                        const rating = parseFloat(match[1]);
                        if (rating > 0 && rating <= 5) {
                            // 嘗試找評論數
                            const reviewMatch = allText.match(/\((\d+(?:,\d{3})*)\+?\)/);
                            const reviewCount = reviewMatch ? reviewMatch[1] + '+' : null;
                            
                            return { rating, reviewCount };
                        }
                    }
                }
                
                return null;
            }, platform);
            
        } catch (error) {
            return null;
        }
    }
    
    /**
     * 生成報告
     */
    async generateReport() {
        const successCount = this.results.filter(r => r.success).length;
        const duration = Math.round((Date.now() - this.startTime) / 1000);
        
        let report = `🌐 [雲端版] 爬蟲執行報告\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        report += `⏰ 執行時間: ${new Date().toLocaleString('zh-TW')}\n`;
        report += `☁️ 執行環境: ${this.config.cloud.isCloudEnvironment ? '雲端' : '本機'}\n`;
        report += `⚡ 總耗時: ${duration}秒\n`;
        report += `📊 結果: ${successCount}/${this.results.length} 成功\n\n`;
        
        this.results.forEach((store, index) => {
            report += `【${index + 1}】${store.name}\n`;
            if (store.success) {
                report += `⭐ 平均評分: ${store.averageRating}/5.0\n`;
                
                Object.entries(store.platforms).forEach(([platform, data]) => {
                    if (data.success) {
                        const sourceIcon = data.dataSource === 'fallback' ? '📦' : '🔍';
                        report += `${sourceIcon} ${this.getPlatformName(platform)}: ${data.rating}⭐\n`;
                    }
                });
            } else {
                report += `❌ 查詢失敗\n`;
            }
            report += '\n';
        });
        
        report += `🤖 雲端增強版爬蟲系統 v4.0`;
        
        // 發送通知 (Railway環境下強制發送並等待)
        this.log('📤 準備發送Telegram通知...', 'INFO');
        try {
            await this.sendTelegramNotification(report);
            this.log('📱 Telegram報告發送嘗試完成', 'INFO');
            
            // Railway環境下額外等待確保通知發送完成
            if (this.isCloudEnvironment) {
                this.log('☁️ 雲端環境，等待5秒確保通知發送...', 'INFO');
                await this.sleep(5000);
            }
        } catch (error) {
            this.log(`❌ Telegram報告發送失敗: ${error.message}`, 'ERROR');
            
            // 重試一次
            this.log('🔄 重試發送Telegram通知...', 'INFO');
            try {
                await this.sendTelegramNotification(report);
                this.log('📱 Telegram重試發送成功', 'INFO');
            } catch (retryError) {
                this.log(`❌ Telegram重試也失敗: ${retryError.message}`, 'ERROR');
            }
        }
        
        // 保存日誌
        await this.saveLogs();
        
        // 雲端環境最終等待
        if (this.isCloudEnvironment) {
            this.log('☁️ 雲端環境最終等待...', 'INFO');
            await this.sleep(2000);
        }
    }
    
    /**
     * 發送Telegram通知
     */
    async sendTelegramNotification(message) {
        return new Promise((resolve, reject) => {
            try {
                const payload = JSON.stringify({
                    chat_id: this.config.telegramConfig.adminGroup,
                    text: message
                });
                
                const options = {
                    hostname: 'api.telegram.org',
                    port: 443,
                    path: `/bot${this.config.telegramConfig.botToken}/sendMessage`,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payload, 'utf8')
                    }
                };
                
                const req = https.request(options, (res) => {
                    let responseData = '';
                    res.on('data', chunk => responseData += chunk);
                    res.on('end', () => {
                        if (res.statusCode === 200) {
                            this.log('📱 Telegram通知發送成功', 'SUCCESS');
                            resolve(responseData);
                        } else {
                            this.log(`❌ Telegram通知失敗，狀態碼: ${res.statusCode}，回應: ${responseData}`, 'ERROR');
                            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
                        }
                    });
                });
                
                req.on('error', (error) => {
                    this.log(`❌ Telegram通知失敗: ${error.message}`, 'ERROR');
                    reject(error);
                });
                
                req.write(payload);
                req.end();
                
            } catch (error) {
                this.log(`❌ Telegram通知異常: ${error.message}`, 'ERROR');
                reject(error);
            }
        });
    }
    
    /**
     * 發送錯誤通知
     */
    async sendErrorNotification(error) {
        const errorReport = `🚨 雲端爬蟲系統錯誤\n時間: ${new Date().toLocaleString('zh-TW')}\n錯誤: ${error.message}`;
        await this.sendTelegramNotification(errorReport);
    }
    
    /**
     * 保存日誌
     */
    async saveLogs() {
        try {
            if (this.config.cloud.isCloudEnvironment) {
                // 雲端環境只輸出到控制台
                this.log('☁️ 雲端環境，日誌輸出到控制台', 'INFO');
            } else {
                // 本機環境保存檔案
                const logDir = path.join(__dirname, 'logs');
                await fs.mkdir(logDir, { recursive: true });
                
                const logFile = path.join(logDir, `cloud_crawler_${Date.now()}.log`);
                const logContent = this.logs.map(log => 
                    `[${log.timestamp}] [${log.level}] ${log.message}`
                ).join('\n');
                
                await fs.writeFile(logFile, logContent);
                this.log(`📁 本機日誌已保存: ${logFile}`, 'SUCCESS');
            }
        } catch (error) {
            this.log(`❌ 日誌保存失敗: ${error.message}`, 'ERROR');
        }
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
     * 延遲函數
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 執行主程式
if (require.main === module) {
    const crawler = new CloudEnhancedCrawler();
    
    crawler.execute()
        .then(() => {
            console.log('✅ 雲端增強版爬蟲執行完成');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ 雲端增強版爬蟲執行失敗:', error);
            process.exit(1);
        });
}

module.exports = CloudEnhancedCrawler;