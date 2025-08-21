/**
 * Telegram 飛機通知系統
 * 用於發送分店評價查詢結果到指定群組
 */

const https = require('https');

class TelegramNotifier {
    constructor() {
        // Telegram Bot 配置 (從CLAUDE.md中的配置)
        this.botToken = '7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc';
        this.defaultChatId = '-1002658082392';
        this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
        
        // 預設群組配置
        this.defaultGroups = [
            { name: '主要群組', chatId: '-1002658082392', enabled: true },
            { name: '備用群組1', chatId: '', enabled: false },
            { name: '備用群組2', chatId: '', enabled: false }
        ];
    }

    /**
     * 發送查詢結果通知
     * @param {Object} results - 查詢結果
     * @param {Array} results.stores - 分店數據陣列
     * @param {string} results.searchQuery - 搜尋關鍵字
     * @param {Date} results.timestamp - 查詢時間
     * @param {Array} customGroups - 自定義群組配置 (可選)
     */
    async sendQueryResults(results, customGroups = null) {
        try {
            const message = this.formatQueryMessage(results);
            const groups = customGroups || this.defaultGroups;
            const enabledGroups = groups.filter(group => group.enabled && group.chatId);
            
            if (enabledGroups.length === 0) {
                // 如果沒有啟用的群組，使用預設群組
                await this.sendMessage(message, this.defaultChatId);
                console.log('✈️ Telegram通知已發送 (預設群組)');
                return { success: true, message: 'Telegram通知發送成功 (預設群組)' };
            }
            
            // 並行發送到所有啟用的群組
            const sendPromises = enabledGroups.map(async (group) => {
                try {
                    await this.sendMessage(message, group.chatId);
                    console.log(`✈️ Telegram通知已發送到: ${group.name}`);
                    return { group: group.name, success: true };
                } catch (error) {
                    console.error(`❌ 發送到 ${group.name} 失敗:`, error.message);
                    return { group: group.name, success: false, error: error.message };
                }
            });
            
            const sendResults = await Promise.all(sendPromises);
            const successCount = sendResults.filter(r => r.success).length;
            const failCount = sendResults.length - successCount;
            
            console.log(`✈️ Telegram通知完成: ${successCount}/${sendResults.length} 群組成功`);
            return { 
                success: successCount > 0, 
                message: `發送到 ${successCount}/${sendResults.length} 個群組`,
                details: sendResults
            };
            
        } catch (error) {
            console.error('❌ Telegram通知發送失敗:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 格式化查詢結果訊息
     * @param {Object} results - 查詢結果
     * @returns {string} 格式化後的訊息
     */
    formatQueryMessage(results) {
        const { stores, searchQuery, timestamp } = results;
        const timeStr = timestamp ? new Date(timestamp).toLocaleString('zh-TW') : new Date().toLocaleString('zh-TW');
        
        let message = `✈️ 分店評價查詢結果通知\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `🔍 搜尋關鍵字: ${searchQuery || '未提供'}\n`;
        message += `⏰ 查詢時間: ${timeStr}\n`;
        message += `📊 查詢結果: ${stores.length} 個平台\n\n`;

        if (stores.length === 0) {
            message += `❌ 未找到任何評價數據\n`;
        } else {
            stores.forEach((store, index) => {
                const platformEmoji = this.getPlatformEmoji(store.platform);
                const ratingStars = this.formatRating(store.rating);
                
                message += `${platformEmoji} ${this.getPlatformName(store.platform)}\n`;
                message += `🏪 分店: ${store.name || '未知'}\n`;
                message += `${ratingStars} 評分: ${store.rating || 'N/A'}\n`;
                message += `💬 評論數: ${store.reviewCount || 'N/A'}\n`;
                
                // 添加其他資訊
                if (store.deliveryTime) {
                    message += `🚚 外送時間: ${store.deliveryTime}\n`;
                }
                if (store.deliveryFee) {
                    message += `💰 外送費: ${store.deliveryFee}\n`;
                }
                
                message += `🔗 網址: ${store.url || '未提供'}\n`;
                
                if (index < stores.length - 1) {
                    message += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
                }
            });
        }

        message += `\n🤖 由分店評價查詢系統自動發送`;
        
        return message;
    }

    /**
     * 獲取平台表情符號
     * @param {string} platform - 平台名稱
     * @returns {string} 對應的表情符號
     */
    getPlatformEmoji(platform) {
        const emojiMap = {
            'google': '🗺️',
            'uber': '🚗',
            'panda': '🐼',
            'ubereats': '🚗',
            'foodpanda': '🐼'
        };
        return emojiMap[platform?.toLowerCase()] || '📱';
    }

    /**
     * 獲取平台中文名稱
     * @param {string} platform - 平台名稱
     * @returns {string} 中文名稱
     */
    getPlatformName(platform) {
        const nameMap = {
            'google': 'Google Maps',
            'uber': 'UberEats',
            'panda': 'Foodpanda',
            'ubereats': 'UberEats',
            'foodpanda': 'Foodpanda'
        };
        return nameMap[platform?.toLowerCase()] || platform || '未知平台';
    }

    /**
     * 格式化評分為星星
     * @param {number|string} rating - 評分
     * @returns {string} 星星表示
     */
    formatRating(rating) {
        if (!rating) return '⭐';
        
        const numRating = parseFloat(rating);
        if (isNaN(numRating)) return '⭐';
        
        const fullStars = Math.floor(numRating);
        const hasHalfStar = numRating - fullStars >= 0.5;
        
        let stars = '⭐'.repeat(Math.min(fullStars, 5));
        if (hasHalfStar && fullStars < 5) {
            stars += '✨'; // 半星
        }
        
        return stars;
    }

    /**
     * 發送訊息到Telegram
     * @param {string} message - 要發送的訊息
     * @param {string} chatId - 群組ID (可選，預設使用 defaultChatId)
     * @returns {Promise} 發送結果
     */
    async sendMessage(message, chatId = null) {
        return new Promise((resolve, reject) => {
            const targetChatId = chatId || this.defaultChatId;
            const data = JSON.stringify({
                chat_id: targetChatId,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: false
            });

            const options = {
                hostname: 'api.telegram.org',
                port: 443,
                path: `/bot${this.botToken}/sendMessage`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const result = JSON.parse(responseData);
                        if (result.ok) {
                            resolve(result);
                        } else {
                            reject(new Error(`Telegram API錯誤: ${result.description}`));
                        }
                    } catch (error) {
                        reject(new Error(`解析回應失敗: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`請求失敗: ${error.message}`));
            });

            req.write(data);
            req.end();
        });
    }

    /**
     * 發送測試訊息
     */
    async sendTestMessage() {
        try {
            const testMessage = `🧪 Telegram通知測試\n` +
                              `⏰ 測試時間: ${new Date().toLocaleString('zh-TW')}\n` +
                              `✅ 如果您收到此訊息，表示Telegram通知功能正常運作！\n\n` +
                              `🤖 分店評價查詢系統`;

            await this.sendMessage(testMessage);
            console.log('✈️ 測試訊息發送成功');
            return { success: true };
        } catch (error) {
            console.error('❌ 測試訊息發送失敗:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 設定群組配置
     * @param {Array} groups - 群組配置陣列
     */
    setGroups(groups) {
        if (Array.isArray(groups) && groups.length > 0) {
            this.defaultGroups = groups;
            console.log(`✅ 已設定 ${groups.length} 個群組配置`);
        }
    }

    /**
     * 獲取當前群組配置
     * @returns {Array} 群組配置
     */
    getGroups() {
        return this.defaultGroups;
    }

    /**
     * 測試特定群組連接
     * @param {string} chatId - 群組ID
     * @param {string} groupName - 群組名稱
     */
    async testGroupConnection(chatId, groupName = '測試群組') {
        try {
            const testMessage = `🧪 群組連接測試\\n` +
                              `📱 群組: ${groupName}\\n` +
                              `⏰ 測試時間: ${new Date().toLocaleString('zh-TW')}\\n` +
                              `✅ 如果您收到此訊息，表示此群組配置正常！`;

            await this.sendMessage(testMessage, chatId);
            console.log(`✅ 群組 "${groupName}" 連接測試成功`);
            return { success: true, group: groupName };
        } catch (error) {
            console.error(`❌ 群組 "${groupName}" 連接測試失敗:`, error.message);
            return { success: false, group: groupName, error: error.message };
        }
    }

    /**
     * 驗證配置
     */
    validateConfig() {
        if (!this.botToken) {
            throw new Error('缺少Telegram Bot Token');
        }
        if (!this.defaultChatId) {
            throw new Error('缺少預設 Telegram Chat ID');
        }
        return true;
    }
}

module.exports = { TelegramNotifier };

// 如果直接執行此文件，進行測試
if (require.main === module) {
    async function test() {
        const notifier = new TelegramNotifier();
        
        console.log('🧪 開始Telegram通知測試...');
        
        try {
            // 驗證配置
            notifier.validateConfig();
            console.log('✅ 配置驗證通過');
            
            // 發送測試訊息
            const result = await notifier.sendTestMessage();
            
            if (result.success) {
                console.log('🎉 Telegram通知系統測試成功！');
                
                // 模擬查詢結果測試
                console.log('\n📊 測試查詢結果格式...');
                const mockResults = {
                    stores: [
                        {
                            platform: 'uber',
                            name: '不早脆皮雞排 中壢龍崗店',
                            rating: 4.8,
                            reviewCount: '600+',
                            deliveryTime: '25-40 分鐘',
                            deliveryFee: 'NT$35',
                            url: 'https://www.ubereats.com/store-browse-uuid/dcbd639d-d703-5c60-a55e-7ddb1a6954f9?diningMode=DELIVERY'
                        },
                        {
                            platform: 'panda',
                            name: '不早脆皮雞排 (中壢龍崗店)',
                            rating: 4.7,
                            reviewCount: '500+',
                            url: 'https://foodpanda.page.link/yhvLQKDDAScTN5rq7'
                        }
                    ],
                    searchQuery: '不早脆皮雞排',
                    timestamp: new Date()
                };
                
                await notifier.sendQueryResults(mockResults);
                console.log('✅ 查詢結果通知測試完成');
                
            } else {
                console.error('❌ 測試失敗:', result.error);
            }
            
        } catch (error) {
            console.error('💥 測試過程中發生錯誤:', error.message);
        }
    }
    
    test().catch(console.error);
}