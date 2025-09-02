#!/usr/bin/env node
/**
 * 增強版自動化查詢排程器
 * 支援Railway API與本地爬蟲雙模式
 * 
 * 功能特色:
 * - 智能選擇：Railway API或本地真實爬蟲
 * - 真實數據保證：自動檢測並標記假數據
 * - 分店分開執行：提高穩定性
 * - Telegram智能通知：測試模式僅管理員
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class EnhancedScheduler {
    constructor() {
        this.config = {
            // 執行模式選擇
            crawlerMode: 'auto', // 'railway', 'local', 'auto'
            
            // Telegram設定
            telegramBotToken: '7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc',
            telegramGroups: {
                admin: '-1002658082392',    // 管理員群組（測試階段）
                boss: '-4739541077',       // 老闆群組
                employee: '-4757083844'    // 員工群組
            },
            testMode: true, // 設為false啟用所有群組
            
            // API設定
            railwayApiUrl: 'https://restaurant-review-system-production.up.railway.app',
            timeout: 30000,
            maxRetries: 3,
            
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
        this.executionLog = [];
        this.useLocalCrawler = false;
    }
    
    /**
     * 智能選擇爬蟲模式
     */
    async selectCrawlerMode() {
        this.log('🤖 智能選擇爬蟲模式...');
        
        if (this.config.crawlerMode === 'local') {
            this.log('📝 用戶指定使用本地爬蟲');
            this.useLocalCrawler = true;
            return true;
        }
        
        if (this.config.crawlerMode === 'railway') {
            this.log('📝 用戶指定使用Railway API');
            this.useLocalCrawler = false;
            return true;
        }
        
        // auto模式：先測試Railway API
        this.log('🔍 自動模式：測試Railway API品質...');
        
        try {
            const testStore = {
                id: 1,
                name: '測試分店',
                urls: this.config.stores[0].urls
            };
            
            const testResult = await this.callRailwayAPI([testStore]);
            
            // 檢查是否為Fallback Data
            let isFallbackData = false;
            if (testResult.stores && testResult.stores[0]) {
                const platforms = testResult.stores[0].platforms || {};
                for (let platform in platforms) {
                    if (platforms[platform].source === 'Fallback Data') {
                        isFallbackData = true;
                        break;
                    }
                }
            }
            
            if (isFallbackData) {
                this.log('⚠️ Railway API返回假數據，切換到本地爬蟲模式');
                this.useLocalCrawler = true;
            } else {
                this.log('✅ Railway API返回真實數據，使用Railway模式');
                this.useLocalCrawler = false;
            }
            
        } catch (error) {
            this.log('❌ Railway API測試失敗，切換到本地爬蟲模式');
            this.useLocalCrawler = true;
        }
        
        return true;
    }
    
    /**
     * 執行主程序
     */
    async execute() {
        const startTime = new Date();
        this.log('🚀 啟動增強版自動化查詢排程器');
        
        try {
            // 智能選擇爬蟲模式
            await this.selectCrawlerMode();
            
            if (this.useLocalCrawler) {
                this.log('🔬 使用本地真實爬蟲系統');
                await this.executeLocalCrawler();
            } else {
                this.log('🛡️ 使用Railway API模式');
                await this.executeRailwayMode();
            }
            
            // 發送通知
            await this.sendNotifications();
            
            // 保存日誌
            await this.saveExecutionLog();
            
        } catch (error) {
            this.log(`❌ 執行失敗: ${error.message}`);
            await this.sendErrorNotification(error);
        }
        
        const endTime = new Date();
        const duration = Math.round((endTime - startTime) / 1000);
        this.log(`✅ 執行完成，總耗時: ${duration} 秒`);
    }
    
    /**
     * 執行本地爬蟲
     */
    async executeLocalCrawler() {
        try {
            const { LocalCrawlerSystem } = require('./local-crawler-system');
            const crawler = new LocalCrawlerSystem();
            
            this.log('🔬 啟動本地爬蟲系統...');
            await crawler.execute();
            
            // 獲取爬蟲結果
            this.results = {
                stores: crawler.results,
                summary: {
                    totalStores: crawler.results.length,
                    averageRating: this.calculateOverallAverage(crawler.results),
                    dataSource: 'Local Real Crawler',
                    timestamp: new Date().toISOString()
                }
            };
            
            this.log(`✅ 本地爬蟲完成，獲得 ${crawler.results.length} 個分店數據`);
            
        } catch (error) {
            this.log(`❌ 本地爬蟲失敗: ${error.message}`);
            this.log('🔄 回退到Railway API模式...');
            await this.executeRailwayMode();
        }
    }
    
    /**
     * 執行Railway API模式
     */
    async executeRailwayMode() {
        this.results = {
            stores: [],
            summary: {
                totalStores: 0,
                averageRating: 0
            }
        };
        
        // 分開查詢每個分店
        for (const [index, store] of this.config.stores.entries()) {
            this.log(`🔍 正在查詢第 ${index + 1}/${this.config.stores.length} 個分店: ${store.name}`);
            
            try {
                const singleStoreData = [{
                    id: 1,
                    name: store.name,
                    urls: store.urls
                }];
                
                const apiResponse = await this.callRailwayAPI(singleStoreData);
                
                if (apiResponse && apiResponse.stores && apiResponse.stores.length > 0) {
                    this.results.stores.push(apiResponse.stores[0]);
                    this.log(`✅ ${store.name} 查詢成功`);
                } else {
                    this.log(`⚠️ ${store.name} 查詢無數據`);
                    this.results.stores.push({
                        name: store.name,
                        averageRating: 0,
                        platforms: {},
                        error: '查詢無數據'
                    });
                }
                
                // 延遲避免過快請求
                if (index < this.config.stores.length - 1) {
                    await this.sleep(2000);
                }
                
            } catch (error) {
                this.log(`❌ ${store.name} 查詢失敗: ${error.message}`);
                this.results.stores.push({
                    name: store.name,
                    averageRating: 0,
                    platforms: {},
                    error: error.message
                });
            }
        }
        
        // 計算總體統計
        if (this.results.stores.length > 0) {
            const validStores = this.results.stores.filter(s => !s.error && s.averageRating > 0);
            this.results.summary.totalStores = this.results.stores.length;
            
            if (validStores.length > 0) {
                const totalRating = validStores.reduce((sum, store) => sum + store.averageRating, 0);
                this.results.summary.averageRating = totalRating / validStores.length;
            }
        }
    }
    
    /**
     * 調用Railway API
     */
    async callRailwayAPI(storesData) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({ stores: storesData });
            
            const options = {
                hostname: 'restaurant-review-system-production.up.railway.app',
                port: 443,
                path: '/api/analyze',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'User-Agent': 'EnhancedScheduler/2.0'
                },
                timeout: this.config.timeout
            };
            
            const req = https.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const jsonData = JSON.parse(responseData);
                            resolve(jsonData);
                        } catch (parseError) {
                            reject(new Error('API回應JSON解析失敗'));
                        }
                    } else {
                        reject(new Error(`API請求失敗: ${res.statusCode}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('API請求超時'));
            });
            
            req.write(postData);
            req.end();
        });
    }
    
    /**
     * 發送通知
     */
    async sendNotifications() {
        const report = this.generateReport();
        
        if (this.config.testMode) {
            this.log('📱 [測試模式] 僅發送管理員群組');
            await this.sendTelegramMessage(this.config.telegramGroups.admin, report);
        } else {
            this.log('📱 發送多群組通知');
            await this.sendTelegramMessage(this.config.telegramGroups.admin, report);
            await this.sleep(1000);
            await this.sendTelegramMessage(this.config.telegramGroups.boss, report);
            await this.sleep(1000);
            await this.sendTelegramMessage(this.config.telegramGroups.employee, this.generateEmployeeReport());
        }
    }
    
    /**
     * 生成報告
     */
    generateReport() {
        const summary = this.results.summary || {};
        const stores = this.results.stores || [];
        const timestamp = new Date().toLocaleString('zh-TW');
        
        let report = `🔬 增強版自動查詢報告\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        report += `⏰ 執行時間: ${timestamp}\n`;
        report += `🔧 執行模式: ${this.useLocalCrawler ? '本地真實爬蟲' : 'Railway API'}\n`;
        report += `🏪 查詢分店: ${stores.length} 家\n\n`;
        
        let hasFallbackData = false;
        
        stores.forEach((store, index) => {
            const platforms = store.platforms || {};
            const avgRating = store.averageRating || 0;
            
            report += `【${index + 1}】${store.name}\n`;
            
            if (store.error) {
                report += `❌ 查詢失敗: ${store.error}\n\n`;
            } else {
                report += `⭐ 平均評分: ${avgRating.toFixed(1)}/5.0\n`;
                
                Object.entries(platforms).forEach(([platform, data]) => {
                    const platformName = this.getPlatformName(platform);
                    if (data.success && data.rating) {
                        const sourceWarning = data.source === 'Fallback Data' ? ' ⚠️[假數據]' : '';
                        if (data.source === 'Fallback Data') hasFallbackData = true;
                        report += `  ✅ ${platformName}: ${data.rating}⭐ (${data.reviewCount || 'N/A'} 評論)${sourceWarning}\n`;
                    } else {
                        report += `  ❌ ${platformName}: 查詢失敗\n`;
                    }
                });
                report += '\n';
            }
        });
        
        report += `📊 整體統計:\n`;
        report += `⭐ 整體平均: ${(summary.averageRating || 0).toFixed(1)}⭐\n`;
        report += `📈 成功率: ${this.getSuccessRate()}%\n`;
        
        if (hasFallbackData) {
            report += `\n⚠️ 警告: 部分數據為Railway API的預設假數據\n`;
            report += `建議使用本地爬蟲模式獲取真實數據\n`;
        }
        
        report += `\n🤖 增強版排程器 v2.0 - ${this.useLocalCrawler ? '真實數據保證' : '智能回退機制'}`;
        
        return report;
    }\n    \n    /**\n     * 生成員工報告\n     */\n    generateEmployeeReport() {\n        const stores = this.results.stores || [];\n        \n        let report = '🍗 每日平台評分更新\\n';\n        report += '━━━━━━━━━━━━━━━━━━━━━━\\n\\n';\n        \n        stores.forEach(store => {\n            const platforms = store.platforms || {};\n            const avgRating = store.averageRating || 0;\n            \n            report += `🏪 ${store.name}\\n`;\n            report += `⭐ 平均評分: ${avgRating.toFixed(1)}/5.0\\n\\n`;\n            \n            Object.entries(platforms).forEach(([platform, data]) => {\n                if (data.success && data.rating) {\n                    const platformName = this.getPlatformName(platform);\n                    const dataWarning = data.source === 'Fallback Data' ? ' ⚠️' : '';\n                    report += `📱 ${platformName}: ${data.rating}⭐${dataWarning}\\n`;\n                }\n            });\n            report += '\\n';\n        });\n        \n        report += '💰 獎金以每月5號數據為準\\n';\n        report += `🤖 ${this.useLocalCrawler ? '真實數據爬蟲' : 'API數據'} v2.0`;\n        \n        return report;\n    }\n    \n    /**\n     * 發送Telegram消息\n     */\n    async sendTelegramMessage(chatId, message) {\n        return new Promise((resolve, reject) => {\n            const payload = JSON.stringify({\n                chat_id: chatId,\n                text: message\n            });\n            \n            const options = {\n                hostname: 'api.telegram.org',\n                port: 443,\n                path: `/bot${this.config.telegramBotToken}/sendMessage`,\n                method: 'POST',\n                headers: {\n                    'Content-Type': 'application/json',\n                    'Content-Length': Buffer.byteLength(payload, 'utf8')\n                }\n            };\n            \n            const req = https.request(options, (res) => {\n                let data = '';\n                res.on('data', chunk => data += chunk);\n                res.on('end', () => {\n                    if (res.statusCode === 200) {\n                        resolve();\n                    } else {\n                        reject(new Error(`Telegram API錯誤: ${res.statusCode}`));\n                    }\n                });\n            });\n            \n            req.on('error', reject);\n            req.write(payload);\n            req.end();\n        });\n    }\n    \n    /**\n     * 發送錯誤通知\n     */\n    async sendErrorNotification(error) {\n        const errorReport = `❌ 系統執行失敗\\n━━━━━━━━━━━━━━━━━━━━━━\\n⏰ 時間: ${new Date().toLocaleString('zh-TW')}\\n💥 錯誤: ${error.message}\\n\\n🔧 模式: ${this.useLocalCrawler ? '本地爬蟲' : 'Railway API'}\\n🔄 系統會在下次排程時間重新嘗試\\n\\n🤖 增強版排程器 v2.0`;\n        \n        try {\n            await this.sendTelegramMessage(this.config.telegramGroups.admin, errorReport);\n        } catch (sendError) {\n            this.log(`❌ 錯誤通知發送失敗: ${sendError.message}`);\n        }\n    }\n    \n    /**\n     * 計算整體平均評分\n     */\n    calculateOverallAverage(stores) {\n        const validStores = stores.filter(s => s.averageRating > 0);\n        if (validStores.length === 0) return 0;\n        \n        const total = validStores.reduce((sum, store) => sum + store.averageRating, 0);\n        return total / validStores.length;\n    }\n    \n    /**\n     * 計算成功率\n     */\n    getSuccessRate() {\n        const stores = this.results.stores || [];\n        if (stores.length === 0) return 0;\n        \n        const successCount = stores.filter(s => !s.error && s.averageRating > 0).length;\n        return Math.round((successCount / stores.length) * 100);\n    }\n    \n    /**\n     * 獲取平台名稱\n     */\n    getPlatformName(platform) {\n        const names = {\n            google: 'Google Maps',\n            uber: 'UberEats',\n            panda: 'Foodpanda'\n        };\n        return names[platform] || platform;\n    }\n    \n    /**\n     * 保存執行日誌\n     */\n    async saveExecutionLog() {\n        try {\n            const logData = {\n                timestamp: new Date().toISOString(),\n                mode: this.useLocalCrawler ? 'local-crawler' : 'railway-api',\n                logs: this.executionLog,\n                results: this.results\n            };\n            \n            const logPath = path.join(__dirname, 'logs', `enhanced_log_${Date.now()}.json`);\n            await fs.mkdir(path.dirname(logPath), { recursive: true });\n            await fs.writeFile(logPath, JSON.stringify(logData, null, 2));\n            \n            this.log(`📁 執行日誌已保存: ${logPath}`);\n        } catch (error) {\n            this.log(`❌ 保存日誌失敗: ${error.message}`);\n        }\n    }\n    \n    /**\n     * 工具函數\n     */\n    sleep(ms) {\n        return new Promise(resolve => setTimeout(resolve, ms));\n    }\n    \n    log(message) {\n        const timestamp = new Date().toLocaleString('zh-TW');\n        const logMessage = `[${timestamp}] ${message}`;\n        console.log(logMessage);\n        this.executionLog.push(logMessage);\n    }\n}\n\n// 主程序入口\nif (require.main === module) {\n    const scheduler = new EnhancedScheduler();\n    \n    console.log('════════════════════════════════════════');\n    console.log('   增強版自動化查詢排程器 v2.0');\n    console.log('   智能選擇・真實數據・回退機制');\n    console.log('════════════════════════════════════════\\n');\n    \n    scheduler.execute()\n        .then(() => {\n            console.log('\\n✅ 排程執行成功');\n            process.exit(0);\n        })\n        .catch(error => {\n            console.error('\\n❌ 排程執行失敗:', error.message);\n            process.exit(1);\n        });\n}\n\nmodule.exports = { EnhancedScheduler };