#!/usr/bin/env node
/**
 * 自動重試排程器 v3.0
 * 
 * 功能特色:
 * - 智慧失敗檢測和自動重試
 * - 多種排程策略 (定時、觸發、智慧)
 * - 失敗分析和優化建議
 * - 完整的監控和通知系統
 */

const cron = require('node-cron');
const { exec } = require('child_process');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class AutoRetryScheduler {
    constructor() {
        this.config = {
            // 排程設定
            schedules: {
                daily: '0 9,15,21 * * *',        // 每天 9、15、21點
                hourly: '0 * * * *',             // 每小時
                testing: '*/5 * * * *'           // 測試用：每5分鐘
            },
            
            // 重試設定
            retryConfig: {
                maxRetries: 3,              // 最多重試3次
                retryInterval: 300000,      // 重試間隔5分鐘
                backoffMultiplier: 1.5,     // 指數退避係數
                failureThreshold: 0.6       // 成功率低於60%觸發重試
            },
            
            // 爬蟲配置
            crawlerVersions: [
                { name: 'ultra-fast', file: 'ultra-fast-crawler.js', priority: 1 },
                { name: 'enhanced', file: 'enhanced-stable-crawler.js', priority: 2 },
                { name: 'stable', file: 'stable-review-crawler.js', priority: 3 }
            ],
            
            // Telegram設定
            telegramConfig: {
                botToken: '7659930552:AAF_jF1rAXFnjFO176-9X5fKfBwbrko8BNc',
                adminGroup: '-1002658082392',
                testMode: true
            }
        };
        
        this.state = {
            isRunning: false,
            lastExecution: null,
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            currentRetries: 0,
            executionHistory: []
        };
        
        this.logs = [];
    }
    
    /**
     * 啟動排程器
     */
    async start() {
        this.log('🚀 啟動自動重試排程器 v3.0', 'INFO');
        
        // 根據環境選擇排程
        const scheduleType = process.env.NODE_ENV === 'production' ? 'daily' : 'testing';
        const schedule = this.config.schedules[scheduleType];
        
        this.log(`📅 使用 ${scheduleType} 排程: ${schedule}`, 'INFO');
        
        // 設定定時任務
        cron.schedule(schedule, async () => {
            await this.executeScheduledCrawl();
        });
        
        // 設定監控任務 (每分鐘檢查一次)
        cron.schedule('* * * * *', async () => {
            await this.monitorSystem();
        });
        
        // 立即執行一次測試
        if (process.env.IMMEDIATE_RUN === 'true') {
            setTimeout(() => this.executeScheduledCrawl(), 5000);
        }
        
        this.log('✅ 排程器啟動成功', 'SUCCESS');
        
        // 發送啟動通知
        await this.sendTelegramNotification('🤖 自動重試排程器已啟動\n📅 排程模式: ' + scheduleType);
        
        // 保持程序運行
        this.keepAlive();
    }
    
    /**
     * 執行排程爬蟲
     */
    async executeScheduledCrawl() {
        if (this.state.isRunning) {
            this.log('⚠️ 爬蟲正在執行中，跳過本次排程', 'WARN');
            return;
        }
        
        this.state.isRunning = true;
        this.state.lastExecution = new Date();
        this.state.totalExecutions++;
        
        this.log(`\n🎯 開始執行第 ${this.state.totalExecutions} 次排程爬蟲`, 'INFO');
        
        let success = false;
        let executionResult = null;
        
        // 按優先級嘗試不同版本的爬蟲
        for (const crawler of this.config.crawlerVersions) {
            try {
                this.log(`🔄 嘗試執行 ${crawler.name} 爬蟲...`, 'INFO');
                
                executionResult = await this.executeCrawler(crawler);
                
                if (executionResult.success) {
                    success = true;
                    this.log(`✅ ${crawler.name} 爬蟲執行成功`, 'SUCCESS');
                    break;
                } else {
                    this.log(`❌ ${crawler.name} 爬蟲執行失敗: ${executionResult.error}`, 'ERROR');
                }
                
            } catch (error) {
                this.log(`❌ ${crawler.name} 爬蟲執行異常: ${error.message}`, 'ERROR');
                executionResult = { success: false, error: error.message };
            }
        }
        
        // 記錄執行結果
        this.recordExecution(success, executionResult);
        
        // 根據結果採取行動
        if (success) {
            this.state.successfulExecutions++;
            this.state.currentRetries = 0;  // 重置重試計數
            await this.onExecutionSuccess(executionResult);
        } else {
            this.state.failedExecutions++;
            await this.onExecutionFailure(executionResult);
        }
        
        this.state.isRunning = false;
        
        // 保存狀態
        await this.saveState();
    }
    
    /**
     * 執行單個爬蟲
     */
    async executeCrawler(crawler) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            exec(`node ${crawler.file}`, {
                cwd: __dirname,
                timeout: 300000  // 5分鐘超時
            }, (error, stdout, stderr) => {
                const duration = Date.now() - startTime;
                
                if (error) {
                    resolve({
                        success: false,
                        error: error.message,
                        crawler: crawler.name,
                        duration: duration,
                        output: stderr
                    });
                } else {
                    // 檢查輸出中是否包含成功標記
                    const successIndicators = [
                        '✅ 爬蟲執行完成',
                        '✅ 增強版爬蟲執行完成',
                        '✅ 超高速爬蟲執行完成'
                    ];
                    
                    const isSuccess = successIndicators.some(indicator => 
                        stdout.includes(indicator)
                    );
                    
                    resolve({
                        success: isSuccess,
                        error: isSuccess ? null : '執行完成但未找到成功標記',
                        crawler: crawler.name,
                        duration: duration,
                        output: stdout
                    });
                }
            });
        });
    }
    
    /**
     * 記錄執行結果
     */
    recordExecution(success, result) {
        const execution = {
            timestamp: new Date().toISOString(),
            success: success,
            crawler: result?.crawler || 'unknown',
            duration: result?.duration || 0,
            error: result?.error,
            retryCount: this.state.currentRetries
        };
        
        this.state.executionHistory.push(execution);
        
        // 只保留最近100次記錄
        if (this.state.executionHistory.length > 100) {
            this.state.executionHistory = this.state.executionHistory.slice(-100);
        }
    }
    
    /**
     * 處理執行成功
     */
    async onExecutionSuccess(result) {
        this.log('🎉 排程執行成功！', 'SUCCESS');
        
        // 分析性能
        const avgDuration = this.calculateAverageExecutionTime();
        const successRate = this.calculateSuccessRate();
        
        // 發送成功通知
        if (this.config.telegramConfig.testMode) {
            const notification = `✅ 自動爬蟲執行成功\n` +
                `🕒 執行時間: ${Math.round(result.duration / 1000)}秒\n` +
                `🎯 成功率: ${(successRate * 100).toFixed(1)}%\n` +
                `📊 平均耗時: ${Math.round(avgDuration / 1000)}秒`;
            
            await this.sendTelegramNotification(notification);
        }
    }
    
    /**
     * 處理執行失敗
     */
    async onExecutionFailure(result) {
        this.log('💥 排程執行失敗！', 'ERROR');
        
        this.state.currentRetries++;
        
        // 檢查是否需要立即重試
        if (this.state.currentRetries <= this.config.retryConfig.maxRetries) {
            this.log(`🔄 將在 ${this.config.retryConfig.retryInterval / 1000} 秒後進行第 ${this.state.currentRetries} 次重試`, 'WARN');
            
            // 計算退避延遲
            const delay = this.config.retryConfig.retryInterval * 
                Math.pow(this.config.retryConfig.backoffMultiplier, this.state.currentRetries - 1);
            
            setTimeout(() => {
                this.executeScheduledCrawl();
            }, delay);
        } else {
            // 達到最大重試次數
            this.log('🚨 達到最大重試次數，停止重試', 'ERROR');
            
            // 發送失敗警報
            const alert = `🚨 爬蟲系統連續失敗警報\n` +
                `❌ 連續失敗次數: ${this.state.currentRetries}\n` +
                `🕒 最後嘗試時間: ${new Date().toLocaleString('zh-TW')}\n` +
                `📝 錯誤信息: ${result?.error || '未知錯誤'}\n` +
                `🔧 建議檢查系統狀態和網路連接`;
            
            await this.sendTelegramNotification(alert);
            
            // 重置重試計數，等待下次排程
            this.state.currentRetries = 0;
        }
    }
    
    /**
     * 監控系統狀態
     */
    async monitorSystem() {
        // 檢查系統健康度
        const successRate = this.calculateSuccessRate();
        const avgResponseTime = this.calculateAverageExecutionTime();
        
        // 如果成功率過低，發送警告
        if (successRate < this.config.retryConfig.failureThreshold && 
            this.state.totalExecutions > 5) {
            
            this.log(`⚠️ 系統成功率過低: ${(successRate * 100).toFixed(1)}%`, 'WARN');
            
            // 每小時最多發送一次警告
            const lastWarning = this.getLastWarningTime();
            if (!lastWarning || Date.now() - lastWarning > 3600000) {
                const warning = `⚠️ 系統性能警告\n` +
                    `📉 成功率: ${(successRate * 100).toFixed(1)}%\n` +
                    `⏱️ 平均響應時間: ${Math.round(avgResponseTime / 1000)}秒\n` +
                    `🔄 建議檢查網路和系統資源`;
                
                await this.sendTelegramNotification(warning);
                this.setLastWarningTime(Date.now());
            }
        }
    }
    
    /**
     * 計算成功率
     */
    calculateSuccessRate() {
        if (this.state.totalExecutions === 0) return 1;
        return this.state.successfulExecutions / this.state.totalExecutions;
    }
    
    /**
     * 計算平均執行時間
     */
    calculateAverageExecutionTime() {
        const recentExecutions = this.state.executionHistory
            .filter(e => e.success)
            .slice(-10);  // 最近10次成功執行
        
        if (recentExecutions.length === 0) return 0;
        
        const totalDuration = recentExecutions.reduce((sum, e) => sum + e.duration, 0);
        return totalDuration / recentExecutions.length;
    }
    
    /**
     * 發送Telegram通知
     */
    async sendTelegramNotification(message) {
        try {
            const payload = JSON.stringify({
                chat_id: this.config.telegramConfig.adminGroup,
                text: `🤖 [自動排程器]\n\n${message}\n\n⏰ ${new Date().toLocaleString('zh-TW')}`
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
                if (res.statusCode === 200) {
                    this.log('📱 Telegram通知發送成功', 'SUCCESS');
                } else {
                    this.log(`❌ Telegram通知發送失敗: ${res.statusCode}`, 'ERROR');
                }
            });
            
            req.on('error', (error) => {
                this.log(`❌ Telegram通知發送錯誤: ${error.message}`, 'ERROR');
            });
            
            req.write(payload);
            req.end();
            
        } catch (error) {
            this.log(`❌ Telegram通知異常: ${error.message}`, 'ERROR');
        }
    }
    
    /**
     * 保存系統狀態
     */
    async saveState() {
        try {
            const stateFile = path.join(__dirname, 'scheduler-state.json');
            await fs.writeFile(stateFile, JSON.stringify(this.state, null, 2));
            this.log('💾 系統狀態已保存', 'INFO');
        } catch (error) {
            this.log(`❌ 保存狀態失敗: ${error.message}`, 'ERROR');
        }
    }
    
    /**
     * 載入系統狀態
     */
    async loadState() {
        try {
            const stateFile = path.join(__dirname, 'scheduler-state.json');
            const data = await fs.readFile(stateFile, 'utf8');
            const savedState = JSON.parse(data);
            
            // 合併狀態（保留當前的運行狀態）
            this.state = {
                ...this.state,
                ...savedState,
                isRunning: false  // 啟動時重置運行狀態
            };
            
            this.log('📂 系統狀態已載入', 'INFO');
        } catch (error) {
            this.log('📂 未找到保存的狀態，使用預設值', 'INFO');
        }
    }
    
    /**
     * 記錄日誌
     */
    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        console.log(logMessage);
        
        this.logs.push({
            timestamp: timestamp,
            level: level,
            message: message
        });
        
        // 只保留最近1000條日誌
        if (this.logs.length > 1000) {
            this.logs = this.logs.slice(-1000);
        }
    }
    
    /**
     * 獲取/設置警告時間
     */
    getLastWarningTime() {
        return this.state.lastWarningTime || null;
    }
    
    setLastWarningTime(time) {
        this.state.lastWarningTime = time;
    }
    
    /**
     * 保持程序運行
     */
    keepAlive() {
        // 每6小時輸出一次狀態
        setInterval(() => {
            const successRate = this.calculateSuccessRate();
            const uptime = process.uptime();
            
            this.log(`📊 系統運行狀態：運行時間 ${Math.round(uptime / 3600)}小時，成功率 ${(successRate * 100).toFixed(1)}%`, 'INFO');
        }, 6 * 3600 * 1000);
        
        // 處理程序退出
        process.on('SIGINT', async () => {
            this.log('🛑 收到停止信號，正在保存狀態...', 'WARN');
            await this.saveState();
            await this.sendTelegramNotification('🛑 自動重試排程器已停止');
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            this.log('🛑 收到終止信號，正在保存狀態...', 'WARN');
            await this.saveState();
            await this.sendTelegramNotification('🛑 自動重試排程器已終止');
            process.exit(0);
        });
        
        // 未處理的異常
        process.on('uncaughtException', async (error) => {
            this.log(`💥 未處理異常: ${error.message}`, 'FATAL');
            await this.saveState();
            await this.sendTelegramNotification(`💥 系統異常：${error.message}`);
            process.exit(1);
        });
    }
    
    /**
     * 獲取系統狀態報告
     */
    getStatusReport() {
        const successRate = this.calculateSuccessRate();
        const avgTime = this.calculateAverageExecutionTime();
        const uptime = process.uptime();
        
        return {
            uptime: Math.round(uptime / 3600),
            totalExecutions: this.state.totalExecutions,
            successfulExecutions: this.state.successfulExecutions,
            failedExecutions: this.state.failedExecutions,
            successRate: successRate,
            averageExecutionTime: avgTime,
            currentRetries: this.state.currentRetries,
            lastExecution: this.state.lastExecution,
            isRunning: this.state.isRunning
        };
    }
}

// 如果直接執行此檔案
if (require.main === module) {
    const scheduler = new AutoRetryScheduler();
    
    scheduler.loadState().then(() => {
        scheduler.start();
    }).catch(error => {
        console.error('❌ 排程器啟動失敗:', error);
        process.exit(1);
    });
}

module.exports = AutoRetryScheduler;