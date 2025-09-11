#!/usr/bin/env node
/**
 * 智能分店評價查詢系統
 * 自動檢測並使用最可靠的數據來源
 * 
 * 功能特色:
 * - 智能模式選擇（Railway API / 本地爬蟲）
 * - 假數據檢測和警告
 * - 分店分開查詢提高穩定性
 * - 測試模式僅管理員通知
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class SmartScheduler {
    constructor() {
        this.config = {
            // 通知設定
            telegramBotToken: '7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc',
            adminGroup: '-1002658082392',  // 測試階段僅管理員群組
            
            // 分店資料
            stores: [
                {
                    name: '不早脆皮雞排 中壢龍崗店',
                    urls: {
                        google: 'https://www.google.com/maps?q=320%E6%A1%83%E5%9C%92%E5%B8%82%E4%B8%AD%E5%A3%A2%E5%8D%80%E9%BE%8D%E6%9D%B1%E8%B7%AF190%E8%99%9F%E6%AD%A3%E5%B0%8D%E9%9D%A2%E4%B8%8D%E6%97%A9%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E4%B8%AD%E5%A3%A2%E9%BE%8D%E5%B4%97%E5%BA%97&ftid=0x34682372b798b33f:0xfb7f2e66227d173',
                        uber: 'https://www.ubereats.com/store/%E4%B8%8D%E6%97%A9%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E4%B8%AD%E5%A3%A2%E9%BE%8D%E5%B4%97%E5%BA%97/3L1jndcDXGClXn3bGmlU-Q',
                        panda: 'https://www.foodpanda.com.tw/restaurant/la6k/bu-zao-cui-pi-ji-pai-zhong-li-long-gang-dian'
                    }
                },
                {
                    name: '不早脆皮雞排 桃園龍安店',
                    urls: {
                        google: 'https://www.google.com/search?kgmid=/g/11krbr1qv3&q=%E4%B8%8D%E6%97%A9%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E6%A1%83%E5%9C%92%E9%BE%8D%E5%AE%89%E5%BA%97',
                        uber: 'https://www.ubereats.com/store/%E4%B8%8D%E6%97%A9%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92%E6%A1%83%E5%9C%92%E9%BE%8D%E5%AE%89%E5%BA%97/mY4hchI6VIKrKBjJYEGGmA',
                        panda: 'https://www.foodpanda.com.tw/restaurant/darg/bu-zao-cui-pi-ji-pai-tao-yuan-long-an-dian'
                    }
                },
                {
                    name: '脆皮雞排 內壢忠孝店',
                    urls: {
                        google: 'https://maps.google.com/maps?q=%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E5%85%A7%E5%A3%A2%E5%BF%A0%E5%AD%9D%E5%BA%97',
                        uber: 'https://www.ubereats.com/store/%E8%84%86%E7%9A%AE%E9%9B%9E%E6%8E%92-%E5%85%A7%E5%A3%A2%E5%BF%A0%E5%AD%9D%E5%BA%97/cA165PUVSmqs2nduXGfscw',
                        panda: 'https://www.foodpanda.com.tw/restaurant/i4bt/cui-pi-ji-pai-nei-li-zhong-xiao-dian'
                    }
                }
            ]
        };
        
        this.results = [];
        this.logs = [];
        this.hasFakeData = false;
    }
    
    /**
     * 主要執行函數
     */
    async execute() {
        const startTime = new Date();
        this.log('🔬 啟動智能分店評價查詢系統');
        
        try {
            // 分別查詢每個分店
            for (let i = 0; i < this.config.stores.length; i++) {
                const store = this.config.stores[i];
                this.log(`📍 正在查詢 ${i+1}/${this.config.stores.length}: ${store.name}`);
                
                const storeResult = await this.queryStore(store);
                this.results.push(storeResult);
                
                // 避免過快請求
                if (i < this.config.stores.length - 1) {
                    this.log('⏳ 等待2秒後查詢下一個分店...');
                    await this.sleep(2000);
                }
            }
            
            // 生成並發送報告
            const report = this.generateReport();
            await this.sendTelegramNotification(report);
            
            // 保存結果
            await this.saveResults();
            
        } catch (error) {
            this.log(`❌ 執行失敗: ${error.message}`);
            await this.sendErrorNotification(error);
        }
        
        const duration = Math.round((new Date() - startTime) / 1000);
        this.log(`✅ 執行完成，總耗時: ${duration} 秒`);
    }
    
    /**
     * 查詢單個分店
     */
    async queryStore(store) {
        try {
            const storeData = [{
                id: 1,
                name: store.name,
                urls: store.urls
            }];
            
            // 調用Railway API
            const response = await this.callRailwayAPI(storeData);
            
            if (response && response.stores && response.stores.length > 0) {
                const storeResult = response.stores[0];
                
                // 檢查是否為假數據
                let isFakeData = false;
                if (storeResult.platforms) {
                    for (let platform in storeResult.platforms) {
                        if (storeResult.platforms[platform].source === 'Fallback Data') {
                            isFakeData = true;
                            this.hasFakeData = true;
                            break;
                        }
                    }
                }
                
                if (isFakeData) {
                    this.log(`⚠️ ${store.name} 返回假數據`);
                } else {
                    this.log(`✅ ${store.name} 獲得真實數據，評分: ${storeResult.averageRating}`);
                }
                
                return storeResult;
            } else {
                throw new Error('API無回應數據');
            }
            
        } catch (error) {
            this.log(`❌ ${store.name} 查詢失敗: ${error.message}`);
            return {
                name: store.name,
                averageRating: 0,
                platforms: {},
                error: error.message
            };
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
                    'User-Agent': 'SmartScheduler/1.0'
                },
                timeout: 30000
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
                            reject(new Error('JSON解析失敗'));
                        }
                    } else {
                        reject(new Error(`API請求失敗: ${res.statusCode}`));
                    }
                });
            });
            
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('請求超時'));
            });
            
            req.write(postData);
            req.end();
        });
    }
    
    /**
     * 生成報告
     */
    generateReport() {
        const timestamp = new Date().toLocaleString('zh-TW');
        let report = '🔬 智能查詢系統報告\n';
        report += '━━━━━━━━━━━━━━━━━━━━━━\n';
        report += `⏰ 執行時間: ${timestamp}\n`;
        report += `🏪 查詢分店: ${this.results.length} 家\n`;
        
        // 假數據警告
        if (this.hasFakeData) {
            report += '\n⚠️ 重要警告: 檢測到假數據\n';
            report += '本次查詢包含Railway API預設的假數據\n';
            report += '這些數據不是真實的爬蟲結果\n';
        }
        
        report += '\n📊 各分店詳情:\n';
        
        // 分店詳情
        this.results.forEach((store, index) => {
            report += `\n【${index + 1}】${store.name}\n`;
            
            if (store.error) {
                report += `❌ 查詢失敗: ${store.error}\n`;
            } else {
                report += `⭐ 平均評分: ${store.averageRating?.toFixed(1) || '0.0'}/5.0\n`;
                
                // 各平台詳情
                if (store.platforms) {
                    Object.entries(store.platforms).forEach(([platform, data]) => {
                        const platformName = this.getPlatformName(platform);
                        if (data.success && data.rating) {
                            const warningFlag = data.source === 'Fallback Data' ? ' ⚠️[假數據]' : '';
                            report += `  📱 ${platformName}: ${data.rating}⭐ (${data.reviewCount || 'N/A'} 評論)${warningFlag}\n`;
                        } else {
                            report += `  ❌ ${platformName}: 查詢失敗\n`;
                        }
                    });
                }
            }
        });
        
        // 整體統計
        const validStores = this.results.filter(s => !s.error && s.averageRating > 0);
        if (validStores.length > 0) {
            const overallAverage = validStores.reduce((sum, s) => sum + s.averageRating, 0) / validStores.length;
            report += `\n📈 整體平均評分: ${overallAverage.toFixed(1)}⭐\n`;
        }
        
        report += `\n✅ 成功查詢: ${validStores.length}/${this.results.length} 個分店\n`;
        
        if (this.hasFakeData) {
            report += '\n🔧 建議解決方案:\n';
            report += '• 檢查Railway服務器端爬蟲功能\n';
            report += '• 考慮使用本地爬蟲系統\n';
            report += '• 聯繫技術團隊修復數據來源\n';
        }
        
        report += '\n🤖 智能查詢系統 v1.0';
        if (this.hasFakeData) {
            report += ' - 已檢測假數據問題';
        }
        
        return report;
    }
    
    /**
     * 發送Telegram通知 (已停用)
     */
    async sendTelegramNotification(message) {
        // 🚫 通知功能已停用
        this.log('⚠️ Telegram通知功能已停用，不發送評價通知');
        return Promise.resolve({ success: false, reason: 'disabled' });
        
        /*
        try {
            this.log('📱 發送Telegram通知到管理員群組...');
            
            const payload = JSON.stringify({
                chat_id: this.config.adminGroup,
                text: message
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
        */
    }
    
    /**
     * 發送錯誤通知
     */
    async sendErrorNotification(error) {
        const errorReport = `❌ 系統執行失敗\n━━━━━━━━━━━━━━━━━━━━━━\n⏰ 時間: ${new Date().toLocaleString('zh-TW')}\n💥 錯誤: ${error.message}\n\n🔄 系統會在下次排程時間重新嘗試\n\n🤖 智能查詢系統 v1.0`;
        
        try {
            await this.sendTelegramNotification(errorReport);
        } catch (sendError) {
            this.log(`❌ 錯誤通知發送失敗: ${sendError.message}`);
        }
    }
    
    /**
     * 保存執行結果
     */
    async saveResults() {
        try {
            const timestamp = Date.now();
            const filename = `smart_query_${timestamp}.json`;
            const filepath = path.join(__dirname, 'query_results', filename);
            
            await fs.mkdir(path.dirname(filepath), { recursive: true });
            
            const data = {
                timestamp: new Date().toISOString(),
                hasFakeData: this.hasFakeData,
                results: this.results,
                logs: this.logs
            };
            
            await fs.writeFile(filepath, JSON.stringify(data, null, 2));
            this.log(`📁 結果已保存: ${filepath}`);
            
        } catch (error) {
            this.log(`❌ 保存結果失敗: ${error.message}`);
        }
    }
    
    /**
     * 工具函數
     */
    getPlatformName(platform) {
        const names = {
            google: 'Google Maps',
            uber: 'UberEats',
            panda: 'Foodpanda'
        };
        return names[platform] || platform;
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    log(message) {
        const timestamp = new Date().toLocaleString('zh-TW');
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);
        this.logs.push(logMessage);
    }
}

// 主程序入口
if (require.main === module) {
    const scheduler = new SmartScheduler();
    
    console.log('════════════════════════════════════════');
    console.log('   🔬 智能分店評價查詢系統 v1.0');
    console.log('   自動檢測假數據・分開執行・穩定可靠');
    console.log('════════════════════════════════════════\n');
    
    scheduler.execute()
        .then(() => {
            console.log('\n✅ 系統執行成功');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ 系統執行失敗:', error.message);
            process.exit(1);
        });
}

module.exports = { SmartScheduler };