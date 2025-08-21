const fs = require('fs');
const path = require('path');

/**
 * 自動排程執行器
 * 負責定時執行餐廳評價查詢和通知
 */
class AutoScheduler {
    constructor(reviewAnalyzer, telegramNotifier) {
        this.reviewAnalyzer = reviewAnalyzer;
        this.telegramNotifier = telegramNotifier;
        this.intervals = new Map(); // 存儲定時器
        this.isRunning = false;
        
        this.configPath = path.join(__dirname, '..', 'config');
        this.scheduleFile = path.join(this.configPath, 'schedule.json');
        this.storesFile = path.join(this.configPath, 'stores.json');
        this.groupsFile = path.join(this.configPath, 'groups.json');
        this.logsFile = path.join(this.configPath, 'schedule_logs.json');
    }

    /**
     * 啟動排程系統
     */
    async start() {
        if (this.isRunning) {
            console.log('⚠️ 排程系統已經在運行中');
            return;
        }

        console.log('🚀 啟動自動排程系統...');
        this.isRunning = true;

        // 載入排程配置
        await this.loadAndSetupSchedule();
        
        // 每分鐘檢查一次是否需要執行
        this.checkInterval = setInterval(() => {
            this.checkSchedule();
        }, 60000); // 每分鐘檢查一次

        console.log('✅ 自動排程系統啟動完成');
    }

    /**
     * 停止排程系統
     */
    stop() {
        console.log('🛑 停止自動排程系統...');
        
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        // 清除所有定時器
        this.intervals.forEach((interval, key) => {
            clearInterval(interval);
        });
        this.intervals.clear();

        this.isRunning = false;
        console.log('✅ 自動排程系統已停止');
    }

    /**
     * 載入排程配置並設置定時器
     */
    async loadAndSetupSchedule() {
        try {
            const schedule = await this.loadConfig(this.scheduleFile, {
                time: '01:00',
                frequency: 'daily',
                enabled: true
            });

            if (schedule.enabled) {
                console.log(`📅 排程設定: ${schedule.frequency} ${schedule.time}`);
            } else {
                console.log('⏸️ 排程功能已停用');
            }
        } catch (error) {
            console.error('❌ 載入排程配置失敗:', error.message);
        }
    }

    /**
     * 檢查是否需要執行排程
     */
    async checkSchedule() {
        try {
            const schedule = await this.loadConfig(this.scheduleFile);
            if (!schedule || !schedule.enabled) {
                return;
            }

            const now = new Date();
            const currentTime = now.toTimeString().substring(0, 5); // HH:MM 格式
            const currentDay = now.getDay(); // 0=Sunday, 1=Monday, etc.

            // 檢查時間是否匹配
            if (currentTime !== schedule.time) {
                return;
            }

            // 檢查頻率是否匹配
            if (!this.shouldRun(schedule.frequency, currentDay)) {
                return;
            }

            console.log(`⏰ 排程時間到達，開始執行查詢... (${currentTime})`);
            await this.executeScheduledQuery();

        } catch (error) {
            console.error('❌ 排程檢查失敗:', error.message);
            await this.logError('排程檢查失敗', error.message);
        }
    }

    /**
     * 判斷是否應該執行
     */
    shouldRun(frequency, currentDay) {
        switch (frequency) {
            case 'daily':
                return true;
            case 'weekdays':
                return currentDay >= 1 && currentDay <= 5; // Monday to Friday
            case 'weekly':
                return currentDay === 1; // Monday
            default:
                return false;
        }
    }

    /**
     * 執行排程查詢
     */
    async executeScheduledQuery() {
        const startTime = new Date();
        const logId = `schedule_${Date.now()}`;

        try {
            console.log('🔍 開始執行排程查詢...');
            
            // 載入配置
            const stores = await this.loadConfig(this.storesFile, []);
            const groups = await this.loadConfig(this.groupsFile, []);

            if (stores.length === 0) {
                throw new Error('尚未配置任何分店');
            }

            const enabledStores = stores.filter(store => store.enabled !== false);
            if (enabledStores.length === 0) {
                throw new Error('沒有啟用的分店');
            }

            console.log(`📊 準備查詢 ${enabledStores.length} 間分店`);

            // 執行查詢
            const results = [];
            for (const store of enabledStores) {
                console.log(`🔍 查詢分店: ${store.name}`);
                
                const storeResult = {
                    name: store.name,
                    platforms: {}
                };

                // 查詢各平台
                for (const [platform, url] of Object.entries(store.urls)) {
                    if (url) {
                        try {
                            const result = await this.reviewAnalyzer.analyzeUrl(url, platform);
                            storeResult.platforms[platform] = result;
                        } catch (error) {
                            console.error(`❌ ${store.name} - ${platform} 查詢失敗:`, error.message);
                            storeResult.platforms[platform] = {
                                success: false,
                                error: error.message,
                                url: url
                            };
                        }
                    }
                }

                results.push(storeResult);
                
                // 避免請求過於頻繁
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // 發送通知
            if (groups.length > 0) {
                console.log(`📱 準備發送通知到 ${groups.length} 個群組`);
                await this.sendNotifications(results, groups);
            }

            const endTime = new Date();
            const duration = endTime - startTime;

            // 記錄成功執行
            await this.logExecution(logId, {
                success: true,
                startTime,
                endTime,
                duration: Math.round(duration / 1000),
                storesCount: enabledStores.length,
                groupsCount: groups.length,
                results: results.map(r => ({
                    name: r.name,
                    platforms: Object.keys(r.platforms).length,
                    successful: Object.values(r.platforms).filter(p => p.success).length
                }))
            });

            console.log(`✅ 排程查詢執行完成，耗時 ${Math.round(duration / 1000)} 秒`);

        } catch (error) {
            const endTime = new Date();
            const duration = endTime - startTime;

            console.error('❌ 排程查詢執行失敗:', error.message);
            
            await this.logExecution(logId, {
                success: false,
                startTime,
                endTime,
                duration: Math.round(duration / 1000),
                error: error.message
            });
        }
    }

    /**
     * 發送Telegram通知
     */
    async sendNotifications(results, groups) {
        try {
            // 準備通知數據
            const telegramStores = [];
            results.forEach(storeResult => {
                for (const [platform, data] of Object.entries(storeResult.platforms)) {
                    if (data.success) {
                        telegramStores.push({
                            platform: platform,
                            name: data.storeName || storeResult.name,
                            rating: data.rating,
                            reviewCount: data.reviewCount,
                            deliveryTime: data.deliveryTime,
                            deliveryFee: data.deliveryFee,
                            url: data.url
                        });
                    }
                }
            });

            if (telegramStores.length === 0) {
                console.log('⚠️ 沒有成功的查詢結果，跳過通知發送');
                return;
            }

            // 發送到各個群組
            const enabledGroups = groups.filter(group => group.enabled !== false);
            for (const group of enabledGroups) {
                try {
                    console.log(`📱 發送通知到群組: ${group.name} (${group.chatId})`);
                    await this.telegramNotifier.sendMessage(telegramStores, group.chatId);
                    
                    // 避免觸發限制
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error(`❌ 發送通知到群組 ${group.name} 失敗:`, error.message);
                }
            }

            console.log(`✅ 通知發送完成`);
        } catch (error) {
            console.error('❌ 發送通知失敗:', error.message);
            throw error;
        }
    }

    /**
     * 記錄執行日誌
     */
    async logExecution(logId, data) {
        try {
            const logs = await this.loadConfig(this.logsFile, []);
            
            const logEntry = {
                id: logId,
                timestamp: new Date().toISOString(),
                type: 'scheduled',
                ...data
            };

            logs.unshift(logEntry); // 添加到開頭
            
            // 只保留最近50次記錄
            if (logs.length > 50) {
                logs.splice(50);
            }

            await this.saveConfig(this.logsFile, logs);
        } catch (error) {
            console.error('❌ 記錄執行日誌失敗:', error.message);
        }
    }

    /**
     * 記錄錯誤日誌
     */
    async logError(message, error) {
        await this.logExecution(`error_${Date.now()}`, {
            success: false,
            error: `${message}: ${error}`,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 載入JSON配置
     */
    async loadConfig(filepath, defaultValue = {}) {
        try {
            if (!fs.existsSync(filepath)) {
                return defaultValue;
            }
            const data = fs.readFileSync(filepath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`載入配置失敗 ${filepath}:`, error.message);
            return defaultValue;
        }
    }

    /**
     * 儲存JSON配置
     */
    async saveConfig(filepath, data) {
        try {
            const dir = path.dirname(filepath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(`儲存配置失敗 ${filepath}:`, error.message);
            return false;
        }
    }

    /**
     * 立即執行一次查詢（測試用）
     */
    async runOnce() {
        console.log('🧪 立即執行一次排程查詢...');
        await this.executeScheduledQuery();
    }

    /**
     * 獲取排程狀態
     */
    async getStatus() {
        const schedule = await this.loadConfig(this.scheduleFile);
        const logs = await this.loadConfig(this.logsFile, []);
        
        return {
            isRunning: this.isRunning,
            schedule,
            lastExecution: logs.length > 0 ? logs[0] : null,
            totalExecutions: logs.length
        };
    }
}

module.exports = { AutoScheduler };