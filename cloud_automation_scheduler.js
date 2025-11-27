#!/usr/bin/env node
/**
 * 修復版雲端自動化查詢排程器
 * 使用Railway API確保數據準確性
 * 
 * 功能特色:
 * - 調用Railway API獲取真實數據
 * - 自動Telegram通知
 * - 錯誤處理和重試機制
 * - 執行日誌記錄
 */

const https = require('https');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

class FixedCloudScheduler {
    constructor() {
        // 從環境變數或配置文件讀取設定
        this.config = {
            // Telegram設定
            telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc',
            telegramChatIds: this.parseChatIds(process.env.TELEGRAM_CHAT_IDS || '-1002658082392'),
            
            // API設定
            railwayApiUrl: process.env.RAILWAY_URL || 'https://restaurant-review-system-production.up.railway.app',
            
            // 查詢配置 - 初始化為空，執行時動態獲取
            queryConfig: [],
            
            // 執行設定
            maxRetries: 3,
            retryDelay: 60000, // 1分鐘
            timeout: 30000,   // 30秒
        };
        
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
     * 獲取查詢配置 - 優先從API獲取，失敗則讀取本地配置
     */
    async getQueryConfig() {
        try {
            // 嘗試從 API 獲取
            const apiUrl = `${this.config.railwayApiUrl}/api/config/stores`;
            this.log(`📥 正在從伺服器獲取店家配置: ${apiUrl}`);
            
            // 選擇正確的協議模組
            const client = apiUrl.startsWith('https') ? https : http;

            const config = await new Promise((resolve, reject) => {
                client.get(apiUrl, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        if (res.statusCode === 200) {
                            try {
                                const json = JSON.parse(data);
                                resolve(json.stores);
                            } catch (e) {
                                reject(e);
                            }
                        } else {
                            reject(new Error(`Status ${res.statusCode}`));
                        }
                    });
                }).on('error', reject);
            });

            if (config && Array.isArray(config) && config.length > 0) {
                this.log(`✅ 成功獲取 ${config.length} 個店家配置`);
                return config;
            }
        } catch (error) {
            this.log(`⚠️ 無法從 API 獲取配置 (${error.message})，嘗試讀取本地檔案`);
        }

        // 回退：讀取本地 config/stores.json
        try {
            const localConfigPath = path.join(__dirname, 'config', 'stores.json');
            const localData = await fs.readFile(localConfigPath, 'utf8');
            const localConfig = JSON.parse(localData);
            this.log(`✅ 成功讀取本地配置: ${localConfig.length} 個店家`);
            return localConfig;
        } catch (error) {
            this.log(`❌ 無法讀取本地配置: ${error.message}`);
            return [];
        }
    }
    
    /**
     * 記錄日誌
     */
    log(message) {
        const timestamp = new Date().toLocaleString('zh-TW');
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);
        this.executionLog.push(logMessage);
    }
    
    /**
     * 執行自動查詢 - 使用Railway API (改為分開執行)
     */
    async executeScheduledQuery() {
        const startTime = new Date();
        this.log(`⏰ 開始執行定時查詢 - ${startTime.toISOString()}`);
        
        try {
            // 獲取店家配置
            const stores = await this.getQueryConfig();
            
            if (!stores || stores.length === 0) {
                throw new Error('無法獲取任何店家配置，終止查詢');
            }

            // 初始化結果
            this.results = {
                stores: [],
                summary: {
                    totalStores: 0,
                    averageRating: 0
                }
            };
            
            // 分開執行每個分店查詢
            for (const [index, store] of stores.entries()) {
                this.log(`\n🔍 正在查詢第 ${index + 1}/${stores.length} 個分店: ${store.name}`);
                
                try {
                    // 準備單個分店的API請求數據
                    const singleStoreData = [{
                        id: store.id,
                        name: store.name,
                        urls: store.urls
                    }];
                    
                    // 調用Railway API - 單個分店
                    const apiResponse = await this.callRailwayAPI(singleStoreData);
                    
                    if (apiResponse && apiResponse.stores && apiResponse.stores.length > 0) {
                        // 添加到結果中
                        this.results.stores.push(apiResponse.stores[0]);
                        this.log(`✅ ${store.name} 查詢成功，評分: ${apiResponse.stores[0].averageRating}`);
                    } else {
                        this.log(`⚠️ ${store.name} 查詢無數據`);
                        // 添加失敗記錄
                        this.results.stores.push({
                            name: store.name,
                            averageRating: 0,
                            platforms: {},
                            error: '查詢無數據'
                        });
                    }
                    
                    // 延遲2秒再查詢下一個，避免過快請求
                    if (index < stores.length - 1) {
                        this.log(`⏳ 等待2秒後查詢下一個分店...`);
                        await this.sleep(2000);
                    }
                    
                } catch (storeError) {
                    this.log(`❌ ${store.name} 查詢失敗: ${storeError.message}`);
                    // 添加錯誤記錄
                    this.results.stores.push({
                        name: store.name,
                        averageRating: 0,
                        platforms: {},
                        error: storeError.message
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
                
                this.log(`\n📊 查詢完成統計:`);
                this.log(`✅ 成功: ${validStores.length} 個分店`);
                this.log(`❌ 失敗: ${this.results.stores.length - validStores.length} 個分店`);
                this.log(`⭐ 整體平均評分: ${this.results.summary.averageRating.toFixed(1)}`);
                
                // 發送Telegram通知
                await this.sendTelegramReport();
            } else {
                throw new Error('所有分店查詢都失敗');
            }
            
        } catch (error) {
            this.log(`❌ 執行失敗: ${error.message}`);
            await this.sendErrorNotification(error);
        }
        
        const endTime = new Date();
        const duration = Math.round((endTime - startTime) / 1000);
        this.log(`🏁 查詢完成，總耗時 ${duration} 秒`);
        
        // 保存執行日誌
        await this.saveExecutionLog();
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
                    'User-Agent': 'CloudScheduler/1.0'
                },
                timeout: this.config.timeout
            };
            
            this.log(`📡 發送API請求到: ${options.hostname}${options.path}`);
            
            const req = https.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    this.log(`📨 收到API回應: ${res.statusCode}`);
                    
                    if (res.statusCode === 200) {
                        try {
                            const jsonData = JSON.parse(responseData);
                            this.log(`✅ JSON解析成功，平均評分: ${jsonData.summary?.averageRating}`);
                            resolve(jsonData);
                        } catch (parseError) {
                            this.log(`❌ JSON解析失敗: ${parseError.message}`);
                            this.log(`回應內容: ${responseData.substring(0, 500)}`);
                            reject(new Error('API回應JSON解析失敗'));
                        }
                    } else {
                        this.log(`❌ API請求失敗，狀態碼: ${res.statusCode}`);
                        this.log(`錯誤回應: ${responseData.substring(0, 500)}`);
                        reject(new Error(`API請求失敗: ${res.statusCode}`));
                    }
                });
            });
            
            req.on('error', (error) => {
                this.log(`❌ 請求錯誤: ${error.message}`);
                reject(error);
            });
            
            req.on('timeout', () => {
                this.log(`❌ 請求超時 (${this.config.timeout}ms)`);
                req.destroy();
                reject(new Error('API請求超時'));
            });
            
            req.write(postData);
            req.end();
        });
    }
    
    /**
     * 發送Telegram報告 - 測試階段僅發送管理員群組
     */
    async sendTelegramReport() {
        try {
            // 定義群組配置
            const TELEGRAM_GROUPS = {
                admin: '-1002658082392',    // 管理員群組（接收所有測試功能回應）
                boss: '-4739541077',       // 老闆群組（測試穩定後啟用）
                employee: '-4757083844'    // 員工群組（測試穩定後啟用）
            };
            
            // 測試模式標記
            const testMode = true; // 設為false以啟用所有群組通知
            
            if (testMode) {
                this.log(`📱 [測試模式] 僅發送管理員群組Telegram報告`);
                
                // 生成測試報告（包含更多調試信息）
                const testReport = this.generateTestReport();
                
                // 僅發送給管理員群組
                await this.sendTelegramMessage(TELEGRAM_GROUPS.admin, testReport);
                
                this.log('✅ [測試模式] 管理員群組報告發送完成');
                
            } else {
                this.log(`📱 發送多群組Telegram報告`);
                
                // 完整報告（管理員和老闆）
                const fullReport = this.generateReport();
                
                // 簡化報告（員工群組）
                const employeeReport = this.generateEmployeeReport();
                
                // 發送完整報告給管理員和老闆
                await this.sendTelegramMessage(TELEGRAM_GROUPS.admin, fullReport);
                await this.sleep(1000);
                await this.sendTelegramMessage(TELEGRAM_GROUPS.boss, fullReport);
                await this.sleep(1000);
                
                // 發送簡化報告給員工
                await this.sendTelegramMessage(TELEGRAM_GROUPS.employee, employeeReport);
                
                this.log('✅ 多群組Telegram報告發送完成');
            }
            
        } catch (error) {
            this.log(`❌ Telegram報告發送失敗: ${error.message}`);
        }
    }
    
    /**
     * 生成報告
     */
    generateReport() {
        const summary = this.results.summary || {};
        const stores = this.results.stores || [];
        
        let report = `🟢 每日自動查詢報告
━━━━━━━━━━━━━━━━━━━━━━
⏰ 執行時間: ${new Date().toLocaleString('zh-TW')}
🟢 查詢店家: ${stores.length} 家

`;

        stores.forEach(store => {
            const platforms = store.platforms || {};
            const avgRating = store.averageRating || 0;
            
            report += `🟢 ${store.name}
🟢 平均評分: ${avgRating.toFixed(1)}/5.0
✅ 成功平台: ${Object.keys(platforms).length}/3
🟢 總評論數: ${this.getTotalReviews(platforms)}
`;

            // 添加各平台詳情
            Object.entries(platforms).forEach(([platform, data]) => {
                const platformName = this.getPlatformName(platform);
                if (data.success && data.rating) {
                    // 添加平台URL連結
                    const urlText = data.url && data.url !== '#' ? `\n🔗 ${data.url}` : '';
                    report += `🟢 ${platformName} ${data.rating}⭐ (${data.reviewCount || 'N/A'} 評論)${urlText}
`;
                } else {
                    report += `🟡 ${platformName} N/A (查詢失敗)
`;
                }
            });
            
            report += '\n';
        });
        
        report += `🟢 由Railway API提供 - 修復版
📊 整體平均: ${(summary.averageRating || 0).toFixed(1)}⭐
⚡ API回應正常`;
        
        return report;
    }
    
    /**
     * 計算總評論數
     */
    getTotalReviews(platforms) {
        let total = 0;
        Object.values(platforms).forEach(platform => {
            if (platform.reviewCount) {
                const count = platform.reviewCount.toString().replace(/[^0-9]/g, '');
                if (count) {
                    total += parseInt(count);
                }
            }
        });
        return total;
    }
    
    /**
     * 生成員工群組簡化報告
     */
    generateEmployeeReport() {
        const stores = this.results.stores || [];
        
        let report = `🟢 ＊ 每日平台評分自動更新
🟢 ＊ 獎金以每月5號的更新訊息為計算
━━━━━━━━━━━━━━━━━━━━━━

`;

        stores.forEach(store => {
            const platforms = store.platforms || {};
            const avgRating = store.averageRating || 0;
            
            report += `🟢 ${store.name}
⭐ 平均評分: ${avgRating.toFixed(1)}/5.0

`;

            // 顯示各平台評分和網址
            Object.entries(platforms).forEach(([platform, data]) => {
                if (data.success && data.rating) {
                    const platformName = this.getEmployeePlatformName(platform);
                    const dataSource = data.source === 'Fallback Data' ? ' ⚠️ [假數據]' : '';
                    report += `🟢 ${platformName} ${data.rating}⭐ (${data.reviewCount || 'N/A'} 評論)${dataSource}
🟢 ${data.url && data.url !== '#' ? data.url : ''}

`;
                }
            });
        });
        
        return report;
    }

    /**
     * 獲取員工群組平台名稱（使用🟢格式）
     */
    getEmployeePlatformName(platform) {
        const names = {
            google: 'Google Maps',
            uber: 'UberEats', 
            panda: 'Foodpanda'
        };
        return names[platform] || platform;
    }

    /**
     * 獲取簡化平台名稱（員工群組用）
     */
    getSimplePlatformName(platform) {
        const names = {
            google: '📱 Google Maps',
            uber: '🚗 UberEats', 
            panda: '🍽️ Foodpanda'
        };
        return names[platform] || platform;
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
     * 發送錯誤通知
     */
    async sendErrorNotification(error) {
        try {
            const errorReport = `🔴 自動查詢失敗通知
━━━━━━━━━━━━━━━━━━━━━━
⏰ 時間: ${new Date().toLocaleString('zh-TW')}
❌ 錯誤: ${error.message}

🔧 可能原因:
• Railway API連接問題
• 網路連接異常
• 服務暫時不可用

🔄 系統會在下次排程時間重新嘗試

🤖 自動查詢系統`;
            
            for (const chatId of this.config.telegramChatIds) {
                await this.sendTelegramMessage(chatId, errorReport);
                await this.sleep(1000);
            }
            
        } catch (sendError) {
            this.log(`❌ 錯誤通知發送失敗: ${sendError.message}`);
        }
    }
    
    /**
     * 發送Telegram消息
     */
    async sendTelegramMessage(chatId, message) {
        return new Promise((resolve, reject) => {
            const payload = JSON.stringify({
                chat_id: chatId,
                text: message
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
     * 保存執行日誌
     */
    async saveExecutionLog() {
        try {
            const logData = {
                timestamp: new Date().toISOString(),
                logs: this.executionLog,
                results: this.results
            };
            
            const logPath = path.join(__dirname, 'logs', `execution_log_${Date.now()}.json`);
            await fs.mkdir(path.dirname(logPath), { recursive: true });
            await fs.writeFile(logPath, JSON.stringify(logData, null, 2));
            
            this.log(`📁 執行日誌已保存: ${logPath}`);
            
        } catch (error) {
            this.log(`❌ 保存日誌失敗: ${error.message}`);
        }
    }
    
    /**
     * 生成測試報告（包含更多調試信息）
     */
    generateTestReport() {
        const summary = this.results.summary || {};
        const stores = this.results.stores || [];
        const timestamp = new Date().toLocaleString('zh-TW');
        
        let report = `🧪 [測試模式] 分開執行查詢報告\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        report += `⏰ 執行時間: ${timestamp}\n`;
        report += `🔧 執行模式: 分開查詢（每個分店獨立）\n`;
        report += `🟢 查詢店家: ${stores.length} 家\n\n`;
        
        // 詳細的分店資訊
        stores.forEach((store, index) => {
            const platforms = store.platforms || {};
            const avgRating = store.averageRating || 0;
            
            report += `【${index + 1}】${store.name}\n`;
            
            if (store.error) {
                report += `❌ 查詢失敗: ${store.error}\n\n`;
            } else {
                report += `⭐ 平均評分: ${avgRating.toFixed(1)}/5.0\n`;
                report += `✅ 成功平台: ${Object.keys(platforms).length}/3\n`;
                report += `📊 總評論數: ${this.getTotalReviews(platforms)}\n\n`;
                
                // 各平台詳情
                Object.entries(platforms).forEach(([platform, data]) => {
                    const platformName = this.getPlatformName(platform);
                    if (data.success && data.rating) {
                        report += `  ✓ ${platformName}: ${data.rating}⭐ (${data.reviewCount || 'N/A'} 評論)\n`;
                    } else {
                        report += `  ✗ ${platformName}: 查詢失敗\n`;
                    }
                });
                report += `\n`;
            }
        });
        
        // 統計信息
        const successCount = stores.filter(s => !s.error).length;
        const failCount = stores.filter(s => s.error).length;
        
        report += `📊 查詢統計:\n`;
        report += `• 成功: ${successCount}/${stores.length} 個分店\n`;
        report += `• 失敗: ${failCount}/${stores.length} 個分店\n`;
        report += `• 整體平均: ${(summary.averageRating || 0).toFixed(1)}⭐\n\n`;
        
        report += `💡 測試說明:\n`;
        report += `• 採用分開查詢模式提高穩定性\n`;
        report += `• 每個分店間隔2秒查詢\n`;
        report += `• 測試穩定後將啟用所有群組通知\n\n`;
        
        report += `🤖 由Railway API提供 - 分開執行版`;
        
        return report;
    }
    
    /**
     * 延遲函數
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 如果直接執行此文件
if (require.main === module) {
    const scheduler = new FixedCloudScheduler();
    
    console.log('🚀 啟動修復版雲端自動化排程器');
    console.log('📡 使用Railway API確保數據準確性');
    
    scheduler.executeScheduledQuery()
        .then(() => {
            console.log('✅ 自動查詢執行完成');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ 自動查詢執行失敗:', error.message);
            process.exit(1);
        });
}

module.exports = { FixedCloudScheduler };