#!/usr/bin/env node
/**
 * 本地真實爬蟲系統
 * 直接爬取Google Maps、UberEats、Foodpanda的真實評價數據
 * 
 * 功能特色:
 * - 使用Puppeteer進行真實網頁爬取
 * - 支援三大平台評價爬取
 * - 智能等待和錯誤處理
 * - 真實數據保證（非模擬數據）
 */

const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class LocalCrawlerSystem {
    constructor() {
        this.config = {
            // Telegram設定
            telegramBotToken: '7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc',
            telegramAdminGroup: '-1002658082392', // 測試階段僅管理員群組
            
            // 爬蟲設定
            headless: false, // 設為false可觀察爬蟲過程
            timeout: 60000,  // 60秒超時
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            
            // 查詢配置
            stores: [
                {
                    name: '不早脆皮雞排 中壢龍崗店',
                    urls: {
                        google: 'https://www.google.com/maps/place/%E4%B8%8D%E6%97%A9%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E4%B8%AD%E5%A3%A2%E9%BE%8D%E5%B4%97%E5%BA%97/@24.9352827,121.2450851,17z/data=!3m1!4b1!4m6!3m5!1s0x34682372b798b33f:0xfb7f2e66227d173!8m2!3d24.9352827!4d121.24766!16s%2Fg%2F11q92wl5cl',
                        uber: 'https://www.ubereats.com/tw/store/%E4%B8%8D%E6%97%A9%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E4%B8%AD%E5%A3%A2%E9%BE%8D%E5%B4%97%E5%BA%97/3L1jndcDXGClXn3bGmlU-Q',
                        panda: 'https://www.foodpanda.com.tw/restaurant/la6k/bu-zao-cui-pi-ji-pai-zhong-li-long-gang-dian'
                    }
                },
                {
                    name: '不早脆皮雞排 桃園龍安店',
                    urls: {
                        google: 'https://www.google.com/maps/place/%E4%B8%8D%E6%97%A9%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E6%A1%83%E5%9C%92%E9%BE%8D%E5%AE%89%E5%BA%97/@25.0177778,121.2911111,17z',
                        uber: 'https://www.ubereats.com/tw/store/%E4%B8%8D%E6%97%A9%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92%E6%A1%83%E5%9C%92%E9%BE%8D%E5%AE%89%E5%BA%97/mY4hchI6VIKrKBjJYEGGmA',
                        panda: 'https://www.foodpanda.com.tw/restaurant/darg/bu-zao-cui-pi-ji-pai-tao-yuan-long-an-dian'
                    }
                },
                {
                    name: '脆皮雞排 內壢忠孝店',
                    urls: {
                        google: 'https://www.google.com/maps/search/%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E5%85%A7%E5%A3%A2%E5%BF%A0%E5%AD%9D%E5%BA%97',
                        uber: 'https://www.ubereats.com/tw/store/%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E5%85%A7%E5%A3%A2%E5%BF%A0%E5%AD%9D%E5%BA%97/cA165PUVSmqs2nduXGfscw',
                        panda: 'https://www.foodpanda.com.tw/restaurant/i4bt/cui-pi-ji-pai-nei-li-zhong-xiao-dian'
                    }
                }
            ]
        };
        
        this.results = [];
        this.browser = null;
    }
    
    /**
     * 初始化瀏覽器
     */
    async initBrowser() {
        try {
            this.log('🚀 啟動Puppeteer瀏覽器...');
            this.browser = await puppeteer.launch({
                headless: this.config.headless,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--window-size=1920,1080'
                ]
            });
            this.log('✅ 瀏覽器啟動成功');
        } catch (error) {
            this.log(`❌ 瀏覽器啟動失敗: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * 爬取Google Maps評價
     */
    async crawlGoogleMaps(url, storeName) {
        const page = await this.browser.newPage();
        await page.setUserAgent(this.config.userAgent);
        
        try {
            this.log(`🔍 正在爬取 ${storeName} 的Google Maps評價...`);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: this.config.timeout });
            
            // 等待評分元素出現
            await page.waitForSelector('div[role="img"][aria-label*="星"]', { timeout: 10000 });
            
            // 獲取評分
            const ratingData = await page.evaluate(() => {
                // 查找評分元素
                const ratingElement = document.querySelector('div[role="img"][aria-label*="星"]');
                if (!ratingElement) return null;
                
                const ariaLabel = ratingElement.getAttribute('aria-label');
                const ratingMatch = ariaLabel.match(/(\d+\.?\d*)\s*星/);
                const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
                
                // 查找評論數
                const reviewElements = document.querySelectorAll('button[aria-label*="則評論"]');
                let reviewCount = null;
                if (reviewElements.length > 0) {
                    const reviewText = reviewElements[0].getAttribute('aria-label');
                    const reviewMatch = reviewText.match(/(\d+[,\d]*)\s*則評論/);
                    reviewCount = reviewMatch ? reviewMatch[1] : null;
                }
                
                return {
                    rating: rating,
                    reviewCount: reviewCount || 'N/A',
                    source: 'Real Crawler',
                    timestamp: new Date().toISOString()
                };
            });
            
            await page.close();
            
            if (ratingData && ratingData.rating) {
                this.log(`✅ Google Maps: ${ratingData.rating}⭐ (${ratingData.reviewCount} 評論)`);
                return {
                    success: true,
                    ...ratingData,
                    url: url
                };
            } else {
                throw new Error('無法獲取評分數據');
            }
            
        } catch (error) {
            this.log(`❌ Google Maps爬取失敗: ${error.message}`);
            await page.close();
            return {
                success: false,
                error: error.message,
                source: 'Real Crawler',
                url: url
            };
        }
    }
    
    /**
     * 爬取UberEats評價
     */
    async crawlUberEats(url, storeName) {
        const page = await this.browser.newPage();
        await page.setUserAgent(this.config.userAgent);
        
        try {
            this.log(`🔍 正在爬取 ${storeName} 的UberEats評價...`);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: this.config.timeout });
            
            // 等待頁面載入
            await page.waitForTimeout(3000);
            
            // 嘗試獲取評分
            const ratingData = await page.evaluate(() => {
                // 查找評分元素（UberEats的評分通常在頁面頂部）
                const ratingElements = document.querySelectorAll('[data-testid*="rating"], div[class*="rating"]');
                let rating = null;
                let reviewCount = null;
                
                for (const element of ratingElements) {
                    const text = element.textContent;
                    const ratingMatch = text.match(/(\d+\.?\d*)/);
                    if (ratingMatch && parseFloat(ratingMatch[1]) <= 5) {
                        rating = parseFloat(ratingMatch[1]);
                        
                        // 尋找相鄰的評論數
                        const parent = element.parentElement;
                        if (parent) {
                            const reviewText = parent.textContent;
                            const reviewMatch = reviewText.match(/\((\d+[+]?)\)/);
                            if (reviewMatch) {
                                reviewCount = reviewMatch[1];
                            }
                        }
                        break;
                    }
                }
                
                return {
                    rating: rating,
                    reviewCount: reviewCount || 'N/A',
                    source: 'Real Crawler',
                    timestamp: new Date().toISOString()
                };
            });
            
            await page.close();
            
            if (ratingData && ratingData.rating) {
                this.log(`✅ UberEats: ${ratingData.rating}⭐ (${ratingData.reviewCount} 評論)`);
                return {
                    success: true,
                    ...ratingData,
                    url: url
                };
            } else {
                // 如果無法爬取，返回預設值（但標記為爬取失敗）
                throw new Error('無法獲取評分數據');
            }
            
        } catch (error) {
            this.log(`❌ UberEats爬取失敗: ${error.message}`);
            await page.close();
            return {
                success: false,
                error: error.message,
                source: 'Real Crawler Failed',
                url: url
            };
        }
    }
    
    /**
     * 爬取Foodpanda評價
     */
    async crawlFoodpanda(url, storeName) {
        const page = await this.browser.newPage();
        await page.setUserAgent(this.config.userAgent);
        
        try {
            this.log(`🔍 正在爬取 ${storeName} 的Foodpanda評價...`);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: this.config.timeout });
            
            // 等待頁面載入
            await page.waitForTimeout(3000);
            
            // 嘗試獲取評分
            const ratingData = await page.evaluate(() => {
                // 查找評分元素
                const ratingElements = document.querySelectorAll('[class*="rating"], [data-testid*="rating"], span[class*="star"]');
                let rating = null;
                let reviewCount = null;
                
                for (const element of ratingElements) {
                    const text = element.textContent;
                    const ratingMatch = text.match(/(\d+\.?\d*)/);
                    if (ratingMatch && parseFloat(ratingMatch[1]) <= 5) {
                        rating = parseFloat(ratingMatch[1]);
                        
                        // 尋找評論數
                        const reviewElements = document.querySelectorAll('[class*="review"], [class*="rating-count"]');
                        for (const reviewEl of reviewElements) {
                            const reviewText = reviewEl.textContent;
                            const reviewMatch = reviewText.match(/(\d+[+]?)/);
                            if (reviewMatch) {
                                reviewCount = reviewMatch[1];
                                break;
                            }
                        }
                        break;
                    }
                }
                
                return {
                    rating: rating,
                    reviewCount: reviewCount || 'N/A',
                    source: 'Real Crawler',
                    timestamp: new Date().toISOString()
                };
            });
            
            await page.close();
            
            if (ratingData && ratingData.rating) {
                this.log(`✅ Foodpanda: ${ratingData.rating}⭐ (${ratingData.reviewCount} 評論)`);
                return {
                    success: true,
                    ...ratingData,
                    url: url
                };
            } else {
                throw new Error('無法獲取評分數據');
            }
            
        } catch (error) {
            this.log(`❌ Foodpanda爬取失敗: ${error.message}`);
            await page.close();
            return {
                success: false,
                error: error.message,
                source: 'Real Crawler Failed',
                url: url
            };
        }
    }
    
    /**
     * 執行爬蟲主程序
     */
    async execute() {
        const startTime = new Date();
        this.log('🔬 開始執行本地真實爬蟲系統');
        
        try {
            // 初始化瀏覽器
            await this.initBrowser();
            
            // 爬取每個分店
            for (const store of this.config.stores) {
                this.log(`\n📍 正在處理: ${store.name}`);
                
                const storeResult = {
                    name: store.name,
                    platforms: {},
                    averageRating: 0,
                    timestamp: new Date().toISOString()
                };
                
                // 爬取Google Maps
                if (store.urls.google) {
                    storeResult.platforms.google = await this.crawlGoogleMaps(store.urls.google, store.name);
                    await this.sleep(2000); // 避免過快請求
                }
                
                // 爬取UberEats
                if (store.urls.uber) {
                    storeResult.platforms.uber = await this.crawlUberEats(store.urls.uber, store.name);
                    await this.sleep(2000);
                }
                
                // 爬取Foodpanda
                if (store.urls.panda) {
                    storeResult.platforms.panda = await this.crawlFoodpanda(store.urls.panda, store.name);
                    await this.sleep(2000);
                }
                
                // 計算平均評分
                const validRatings = [];
                Object.values(storeResult.platforms).forEach(platform => {
                    if (platform.success && platform.rating) {
                        validRatings.push(platform.rating);
                    }
                });
                
                if (validRatings.length > 0) {
                    storeResult.averageRating = validRatings.reduce((a, b) => a + b, 0) / validRatings.length;
                    this.log(`📊 ${store.name} 平均評分: ${storeResult.averageRating.toFixed(1)}⭐`);
                }
                
                this.results.push(storeResult);
                
                // 分店間延遲
                if (store !== this.config.stores[this.config.stores.length - 1]) {
                    this.log('⏳ 等待3秒後處理下一個分店...');
                    await this.sleep(3000);
                }
            }
            
            // 關閉瀏覽器
            await this.browser.close();
            
            // 生成報告
            await this.generateReport();
            
            // 發送Telegram通知
            await this.sendTelegramNotification();
            
            // 保存結果
            await this.saveResults();
            
        } catch (error) {
            this.log(`❌ 爬蟲執行失敗: ${error.message}`);
            if (this.browser) {
                await this.browser.close();
            }
            throw error;
        }
        
        const endTime = new Date();
        const duration = Math.round((endTime - startTime) / 1000);
        this.log(`\n✅ 爬蟲執行完成，總耗時: ${duration} 秒`);
    }
    
    /**
     * 生成報告
     */
    async generateReport() {
        let report = '📊 真實數據爬取報告\n';
        report += '━━━━━━━━━━━━━━━━━━━━━━\n';
        report += `⏰ 執行時間: ${new Date().toLocaleString('zh-TW')}\n`;
        report += `🔬 數據來源: 本地真實爬蟲\n\n`;
        
        for (const store of this.results) {
            report += `📍 ${store.name}\n`;
            report += `⭐ 平均評分: ${store.averageRating.toFixed(1)}/5.0\n`;
            
            Object.entries(store.platforms).forEach(([platform, data]) => {
                const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
                if (data.success) {
                    report += `  ✅ ${platformName}: ${data.rating}⭐ (${data.reviewCount} 評論)\n`;
                } else {
                    report += `  ❌ ${platformName}: 爬取失敗 - ${data.error}\n`;
                }
            });
            report += '\n';
        }
        
        // 計算總體統計
        const allRatings = this.results
            .filter(s => s.averageRating > 0)
            .map(s => s.averageRating);
        
        if (allRatings.length > 0) {
            const overallAverage = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
            report += `📈 整體平均評分: ${overallAverage.toFixed(1)}⭐\n`;
        }
        
        report += '\n🤖 本地爬蟲系統 v1.0 - 真實數據保證';
        
        this.report = report;
        console.log('\n' + report);
    }
    
    /**
     * 發送Telegram通知
     */
    async sendTelegramNotification() {
        try {
            this.log('📱 發送Telegram通知...');
            
            const payload = JSON.stringify({
                chat_id: this.config.telegramAdminGroup,
                text: this.report
            });
            
            return new Promise((resolve, reject) => {
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
                            this.log('✅ Telegram通知發送成功');
                            resolve();
                        } else {
                            this.log(`❌ Telegram通知失敗: ${res.statusCode}`);
                            reject(new Error(`Telegram API錯誤: ${res.statusCode}`));
                        }
                    });
                });
                
                req.on('error', (error) => {
                    this.log(`❌ Telegram請求錯誤: ${error.message}`);
                    reject(error);
                });
                
                req.write(payload);
                req.end();
            });
            
        } catch (error) {
            this.log(`❌ Telegram通知發送失敗: ${error.message}`);
        }
    }
    
    /**
     * 保存結果到文件
     */
    async saveResults() {
        try {
            const timestamp = Date.now();
            const filename = `crawler_results_${timestamp}.json`;
            const filepath = path.join(__dirname, 'crawler_results', filename);
            
            await fs.mkdir(path.dirname(filepath), { recursive: true });
            
            const data = {
                timestamp: new Date().toISOString(),
                results: this.results,
                report: this.report
            };
            
            await fs.writeFile(filepath, JSON.stringify(data, null, 2));
            this.log(`📁 結果已保存: ${filepath}`);
            
        } catch (error) {
            this.log(`❌ 保存結果失敗: ${error.message}`);
        }
    }
    
    /**
     * 工具函數：延遲
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 工具函數：日誌記錄
     */
    log(message) {
        const timestamp = new Date().toLocaleString('zh-TW');
        console.log(`[${timestamp}] ${message}`);
    }
}

// 主程序入口
if (require.main === module) {
    const crawler = new LocalCrawlerSystem();
    
    console.log('════════════════════════════════════════');
    console.log('   本地真實爬蟲系統 v1.0');
    console.log('   直接爬取平台真實評價數據');
    console.log('════════════════════════════════════════\n');
    
    crawler.execute()
        .then(() => {
            console.log('\n✅ 系統執行成功');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ 系統執行失敗:', error.message);
            process.exit(1);
        });
}

module.exports = { LocalCrawlerSystem };