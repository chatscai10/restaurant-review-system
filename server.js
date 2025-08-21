const express = require('express');
const cors = require('cors');
const path = require('path');
const { ReviewAnalyzer } = require('./utils/reviewAnalyzer');
const { TelegramNotifier } = require('./utils/telegramNotifier');

const app = express();
const PORT = process.env.PORT || 3003;

// 中間件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 初始化評價分析器和Telegram通知器
const reviewAnalyzer = new ReviewAnalyzer();
const telegramNotifier = new TelegramNotifier();

// 主頁路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API路由 - 分析分店評價
app.post('/api/analyze-stores', async (req, res) => {
    try {
        const { stores } = req.body;
        
        if (!stores || !Array.isArray(stores) || stores.length === 0) {
            return res.status(400).json({
                error: '請提供有效的分店數據'
            });
        }

        console.log(`🔍 開始分析 ${stores.length} 個分店的評價`);
        
        // 分析每個分店
        const results = {
            summary: {
                totalStores: stores.length,
                averageRating: 0,
                totalPlatforms: 0,
                totalReviews: 0,
                analysisTime: new Date().toISOString()
            },
            stores: []
        };

        let totalRating = 0;
        let validStores = 0;

        for (const store of stores) {
            console.log(`📊 分析分店: ${store.name}`);
            
            const storeResult = {
                id: store.id,
                name: store.name,
                averageRating: 0,
                platforms: {},
                insights: null
            };

            let storeRating = 0;
            let validPlatforms = 0;

            // 分析各平台
            for (const [platform, url] of Object.entries(store.urls)) {
                if (url && url.trim()) {
                    try {
                        console.log(`  🌐 分析 ${platform}: ${url.substring(0, 50)}...`);
                        
                        // 驗證URL格式
                        if (!isValidUrl(url)) {
                            throw new Error('網址格式不正確');
                        }
                        
                        // 檢查URL是否完整
                        if (!isCompleteUrl(url, platform)) {
                            console.log(`❌ URL驗證失敗 - 平台: ${platform}, URL: ${url}, 長度: ${url.length}`);
                            throw new Error(`網址不完整或不正確 - 平台: ${platform}, URL長度: ${url.length}`);
                        }
                        
                        const startTime = Date.now();
                        const platformResult = await reviewAnalyzer.analyzeUrl(url, platform);
                        const duration = Date.now() - startTime;
                        
                        console.log(`  ⏱️ ${platform} 分析耗時: ${duration}ms`);
                        
                        storeResult.platforms[platform] = {
                            ...platformResult,
                            analysisTime: duration,
                            timestamp: new Date().toISOString()
                        };
                        
                        if (platformResult.success && platformResult.rating) {
                            storeRating += platformResult.rating;
                            validPlatforms++;
                            results.summary.totalReviews += platformResult.reviewCount || 0;
                            console.log(`  ✅ ${platform} 成功: ${platformResult.storeName} (${platformResult.rating}/5.0)`);
                        } else {
                            console.log(`  ⚠️ ${platform} 無數據: ${platformResult.error || '未知錯誤'}`);
                        }
                    } catch (error) {
                        console.error(`❌ ${platform} 分析失敗:`, error.message);
                        storeResult.platforms[platform] = {
                            success: false,
                            error: error.message,
                            url: url,
                            timestamp: new Date().toISOString()
                        };
                    }
                } else {
                    storeResult.platforms[platform] = {
                        success: false,
                        error: '未提供網址',
                        url: null,
                        timestamp: new Date().toISOString()
                    };
                }
            }

            // 計算分店平均評分
            if (validPlatforms > 0) {
                storeResult.averageRating = storeRating / validPlatforms;
                totalRating += storeResult.averageRating;
                validStores++;
            }

            // 生成分店洞察
            storeResult.insights = generateStoreInsights(storeResult);
            
            results.stores.push(storeResult);
            results.summary.totalPlatforms += validPlatforms;
        }

        // 計算總體統計
        if (validStores > 0) {
            results.summary.averageRating = totalRating / validStores;
        }

        console.log(`✅ 分析完成 - 平均評分: ${results.summary.averageRating.toFixed(2)}`);
        
        res.json(results);

    } catch (error) {
        console.error('分析錯誤:', error);
        res.status(500).json({
            error: '分析過程中發生錯誤',
            details: error.message
        });
    }
});

// API路由 - 發送Telegram通知
app.post('/api/send-telegram-notification', async (req, res) => {
    try {
        const { analysisResults, telegramGroups } = req.body;
        
        if (!analysisResults || !analysisResults.stores) {
            return res.status(400).json({
                success: false,
                error: '請提供有效的分析結果數據'
            });
        }

        console.log('✈️ 準備發送Telegram通知...');
        
        // 如果提供了群組配置，設定到通知器
        if (telegramGroups && Array.isArray(telegramGroups)) {
            telegramNotifier.setGroups(telegramGroups);
        }
        
        // 轉換數據格式為Telegram通知所需的格式
        const notificationData = transformResultsForTelegram(analysisResults);
        
        // 發送Telegram通知
        const result = await telegramNotifier.sendQueryResults(notificationData, telegramGroups);
        
        if (result.success) {
            console.log('✅ Telegram通知發送成功');
            res.json({
                success: true,
                message: result.message || 'Telegram通知發送成功',
                details: result.details
            });
        } else {
            console.error('❌ Telegram通知發送失敗:', result.error);
            res.status(500).json({
                success: false,
                error: result.error || 'Telegram通知發送失敗',
                details: result.details
            });
        }
    } catch (error) {
        console.error('Telegram通知API錯誤:', error);
        res.status(500).json({
            success: false,
            error: '發送Telegram通知時發生錯誤',
            details: error.message
        });
    }
});

// API路由 - 獲取Telegram群組配置
app.get('/api/telegram-groups', (req, res) => {
    try {
        const groups = telegramNotifier.getGroups();
        res.json({
            success: true,
            groups: groups
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '獲取群組配置失敗'
        });
    }
});

// API路由 - 測試Telegram群組連接
app.post('/api/test-telegram-group', async (req, res) => {
    try {
        const { chatId, groupName } = req.body;
        
        if (!chatId) {
            return res.status(400).json({
                success: false,
                error: '請提供群組ID'
            });
        }
        
        const result = await telegramNotifier.testGroupConnection(chatId, groupName);
        
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '測試群組連接失敗',
            details: error.message
        });
    }
});

// 健康檢查
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: '分店評價查詢系統',
        timestamp: new Date().toISOString()
    });
});

// 轉換分析結果為Telegram通知格式
function transformResultsForTelegram(analysisResults) {
    const stores = [];
    
    // 提取第一個分店名稱作為搜尋關鍵字
    const firstStoreName = analysisResults.stores[0]?.name || '分店評價查詢';
    
    // 轉換每個分店的平台數據
    analysisResults.stores.forEach(store => {
        // Google Maps
        if (store.platforms.google?.success) {
            stores.push({
                platform: 'google',
                name: store.name,
                rating: store.platforms.google.rating,
                reviewCount: store.platforms.google.reviewCount,
                url: store.platforms.google.url || '未提供'
            });
        }
        
        // UberEats
        if (store.platforms.uber?.success) {
            stores.push({
                platform: 'uber',
                name: store.name,
                rating: store.platforms.uber.rating,
                reviewCount: store.platforms.uber.reviewCount,
                url: store.platforms.uber.url || '未提供'
            });
        }
        
        // Foodpanda
        if (store.platforms.panda?.success) {
            stores.push({
                platform: 'panda',
                name: store.name,
                rating: store.platforms.panda.rating,
                reviewCount: store.platforms.panda.reviewCount,
                url: store.platforms.panda.url || '未提供'
            });
        }
    });
    
    return {
        stores: stores,
        searchQuery: firstStoreName,
        timestamp: new Date().toISOString()
    };
}

// 生成分店洞察
function generateStoreInsights(storeResult) {
    const platforms = Object.entries(storeResult.platforms).filter(([_, data]) => data.success);
    
    if (platforms.length === 0) {
        return '無法獲取評價數據，建議檢查網址是否正確';
    }
    
    const avgRating = storeResult.averageRating;
    let insights = [];
    
    if (avgRating >= 4.5) {
        insights.push('表現優秀！繼續保持高品質服務');
    } else if (avgRating >= 4.0) {
        insights.push('表現良好，可考慮進一步提升服務品質');
    } else if (avgRating >= 3.5) {
        insights.push('表現一般，建議重點改善客戶體驗');
    } else {
        insights.push('需要緊急改善服務品質和客戶滿意度');
    }
    
    // 平台差異分析
    const ratings = platforms.map(([_, data]) => data.rating).filter(r => r);
    if (ratings.length > 1) {
        const maxRating = Math.max(...ratings);
        const minRating = Math.min(...ratings);
        const diff = maxRating - minRating;
        
        if (diff > 0.5) {
            insights.push(`各平台評分差異較大(${diff.toFixed(1)}分)，建議統一服務標準`);
        }
    }
    
    return insights.join('；');
}

// 錯誤處理
app.use((err, req, res, next) => {
    console.error('服務器錯誤:', err);
    res.status(500).json({
        error: '內部服務器錯誤',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// URL 驗證輔助函數
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function isCompleteUrl(url, platform) {
    const lowerUrl = url.toLowerCase();
    
    switch (platform) {
        case 'google':
            return lowerUrl.includes('google.com') || lowerUrl.includes('goo.gl');
        case 'uber':
            return lowerUrl.includes('ubereats.com') && url.length > 30;
        case 'panda':
            return (lowerUrl.includes('foodpanda.com') || lowerUrl.includes('foodpanda.page.link')) && url.length > 20;
        default:
            return url.length > 10;
    }
}

// ==========================================
// 管理後台 API 端點
// ==========================================

const fs = require('fs').promises;

// 設定文件路徑
const STORES_CONFIG_FILE = path.join(__dirname, 'config', 'stores.json');
const GROUPS_CONFIG_FILE = path.join(__dirname, 'config', 'telegram-groups.json');
const TELEGRAM_CONFIG_FILE = path.join(__dirname, 'config', 'telegram-config.json');
const SCHEDULE_CONFIG_FILE = path.join(__dirname, 'config', 'schedule.json');
const EXECUTION_LOGS_FILE = path.join(__dirname, 'config', 'execution-logs.json');

// 確保配置目錄存在
async function ensureConfigDir() {
    const configDir = path.join(__dirname, 'config');
    try {
        await fs.access(configDir);
    } catch (error) {
        await fs.mkdir(configDir, { recursive: true });
    }
}

// 載入JSON配置文件
async function loadJsonConfig(filePath, defaultValue = []) {
    try {
        await ensureConfigDir();
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return defaultValue;
    }
}

// 儲存JSON配置文件
async function saveJsonConfig(filePath, data) {
    try {
        await ensureConfigDir();
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`儲存配置失敗 ${filePath}:`, error);
        return false;
    }
}

// 管理後台主頁
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 載入分店配置
app.get('/api/admin/stores', async (req, res) => {
    try {
        const stores = await loadJsonConfig(STORES_CONFIG_FILE, []);
        res.json(stores);
    } catch (error) {
        res.status(500).json({ error: '載入分店配置失敗' });
    }
});

// 儲存分店配置
app.post('/api/admin/stores', async (req, res) => {
    try {
        const stores = req.body;
        const success = await saveJsonConfig(STORES_CONFIG_FILE, stores);
        
        if (success) {
            res.json({ success: true, message: '分店配置已儲存' });
        } else {
            res.status(500).json({ error: '儲存分店配置失敗' });
        }
    } catch (error) {
        res.status(500).json({ error: '儲存分店配置失敗' });
    }
});

// 載入群組配置
app.get('/api/admin/groups', async (req, res) => {
    try {
        const groups = await loadJsonConfig(GROUPS_CONFIG_FILE, []);
        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: '載入群組配置失敗' });
    }
});

// 儲存群組配置
app.post('/api/admin/groups', async (req, res) => {
    try {
        const groups = req.body;
        const success = await saveJsonConfig(GROUPS_CONFIG_FILE, groups);
        
        if (success) {
            res.json({ success: true, message: '群組配置已儲存' });
        } else {
            res.status(500).json({ error: '儲存群組配置失敗' });
        }
    } catch (error) {
        res.status(500).json({ error: '儲存群組配置失敗' });
    }
});

// 載入Telegram配置
app.get('/api/admin/telegram-config', async (req, res) => {
    try {
        const config = await loadJsonConfig(TELEGRAM_CONFIG_FILE, {});
        // 不返回完整Token，只返回部分用於顯示
        const safeConfig = {
            ...config,
            botToken: config.botToken ? config.botToken.substring(0, 10) + '...' : ''
        };
        res.json(safeConfig);
    } catch (error) {
        res.status(500).json({ error: '載入Telegram配置失敗' });
    }
});

// 儲存Telegram配置
app.post('/api/admin/telegram-config', async (req, res) => {
    try {
        const config = req.body;
        const success = await saveJsonConfig(TELEGRAM_CONFIG_FILE, config);
        
        if (success) {
            res.json({ success: true, message: 'Telegram配置已儲存' });
        } else {
            res.status(500).json({ error: '儲存Telegram配置失敗' });
        }
    } catch (error) {
        res.status(500).json({ error: '儲存Telegram配置失敗' });
    }
});

// 載入排程配置
app.get('/api/admin/schedule', async (req, res) => {
    try {
        const schedule = await loadJsonConfig(SCHEDULE_CONFIG_FILE, {
            time: '01:00',
            frequency: 'daily',
            enabled: true
        });
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ error: '載入排程配置失敗' });
    }
});

// 儲存排程配置
app.post('/api/admin/schedule', async (req, res) => {
    try {
        const schedule = req.body;
        const success = await saveJsonConfig(SCHEDULE_CONFIG_FILE, schedule);
        
        if (success) {
            res.json({ success: true, message: '排程配置已儲存' });
        } else {
            res.status(500).json({ error: '儲存排程配置失敗' });
        }
    } catch (error) {
        res.status(500).json({ error: '儲存排程配置失敗' });
    }
});

// 測試排程（立即執行一次查詢）
app.post('/api/admin/test-schedule', async (req, res) => {
    try {
        // 載入分店和群組配置
        const stores = await loadJsonConfig(STORES_CONFIG_FILE, []);
        const groups = await loadJsonConfig(GROUPS_CONFIG_FILE, []);
        
        if (stores.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: '尚未配置任何分店' 
            });
        }
        
        // 記錄開始時間
        const startTime = new Date();
        console.log('🧪 開始測試排程查詢...');
        
        // 執行查詢
        const enabledStores = stores.filter(store => store.enabled !== false);
        const queryResults = [];
        
        for (const store of enabledStores) {
            try {
                console.log(`📊 正在查詢: ${store.name}`);
                
                const storeResult = {
                    name: store.name,
                    platforms: {},
                    summary: {
                        averageRating: 0,
                        totalPlatforms: 0,
                        successPlatforms: 0
                    }
                };
                
                // 查詢各個平台
                for (const [platform, url] of Object.entries(store.urls)) {
                    if (url) {
                        try {
                            console.log(`  🔍 查詢 ${platform}: ${url.substring(0, 50)}...`);
                            const result = await reviewAnalyzer.analyzeUrl(url, platform);
                            
                            // 確保URL被保存到結果中
                            result.url = url;
                            storeResult.platforms[platform] = result;
                            
                            if (result.success && result.rating) {
                                storeResult.summary.successPlatforms++;
                                storeResult.summary.averageRating += parseFloat(result.rating);
                            }
                            storeResult.summary.totalPlatforms++;
                            
                        } catch (error) {
                            console.error(`  ❌ ${platform} 查詢失敗:`, error.message);
                            storeResult.platforms[platform] = {
                                success: false,
                                error: error.message,
                                platform: platform
                            };
                            storeResult.summary.totalPlatforms++;
                        }
                    }
                }
                
                // 計算平均評分
                if (storeResult.summary.successPlatforms > 0) {
                    storeResult.summary.averageRating = 
                        (storeResult.summary.averageRating / storeResult.summary.successPlatforms).toFixed(1);
                } else {
                    storeResult.summary.averageRating = 0;
                }
                
                queryResults.push(storeResult);
                console.log(`  ✅ ${store.name} 查詢完成`);
                
            } catch (error) {
                console.error(`查詢 ${store.name} 失敗:`, error);
                queryResults.push({
                    name: store.name,
                    error: error.message,
                    platforms: {},
                    summary: {
                        averageRating: 0,
                        totalPlatforms: 0,
                        successPlatforms: 0
                    }
                });
            }
        }
        
        // 發送Telegram通知
        const enabledGroups = groups.filter(group => group.enabled !== false);
        if (enabledGroups.length > 0 && queryResults.length > 0) {
            try {
                // 轉換數據格式為Telegram通知期望的格式
                const telegramStores = [];
                queryResults.forEach(storeResult => {
                    // 為每個平台創建一個通知項目
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

                await telegramNotifier.sendQueryResults({
                    stores: telegramStores,
                    searchQuery: '排程測試',
                    timestamp: startTime
                }, enabledGroups);
            } catch (error) {
                console.error('發送測試通知失敗:', error);
            }
        }
        
        // 記錄執行結果
        const executionTime = Math.round((new Date() - startTime) / 1000);
        const logEntry = {
            id: 'test_' + Date.now(),
            type: '排程測試',
            success: true,
            message: `測試查詢完成，查詢了 ${queryResults.length} 家分店`,
            timestamp: startTime.toISOString(),
            details: {
                executionTime,
                stores: queryResults.length,
                groups: enabledGroups.length
            }
        };
        
        await addExecutionLog(logEntry);
        
        res.json({ 
            success: true, 
            message: '測試查詢執行成功',
            results: queryResults.length,
            executionTime
        });
        
    } catch (error) {
        console.error('測試排程失敗:', error);
        
        // 記錄錯誤
        const logEntry = {
            id: 'test_error_' + Date.now(),
            type: '排程測試',
            success: false,
            message: `測試失敗: ${error.message}`,
            timestamp: new Date().toISOString()
        };
        
        await addExecutionLog(logEntry);
        
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 載入執行記錄
app.get('/api/admin/execution-logs', async (req, res) => {
    try {
        const logs = await loadJsonConfig(EXECUTION_LOGS_FILE, []);
        // 按時間倒序排列，最新的在前面
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json(logs.slice(0, 50)); // 只返回最近50條記錄
    } catch (error) {
        res.status(500).json({ error: '載入執行記錄失敗' });
    }
});

// 清除執行記錄
app.delete('/api/admin/execution-logs', async (req, res) => {
    try {
        const success = await saveJsonConfig(EXECUTION_LOGS_FILE, []);
        
        if (success) {
            res.json({ success: true, message: '執行記錄已清除' });
        } else {
            res.status(500).json({ error: '清除執行記錄失敗' });
        }
    } catch (error) {
        res.status(500).json({ error: '清除執行記錄失敗' });
    }
});

// 添加執行記錄
async function addExecutionLog(logEntry) {
    try {
        const logs = await loadJsonConfig(EXECUTION_LOGS_FILE, []);
        logs.unshift(logEntry); // 添加到開頭
        
        // 只保留最近100條記錄
        if (logs.length > 100) {
            logs.splice(100);
        }
        
        await saveJsonConfig(EXECUTION_LOGS_FILE, logs);
    } catch (error) {
        console.error('添加執行記錄失敗:', error);
    }
}

// 雲端配置同步API（用於GitHub Actions）
app.get('/api/cloud/config', async (req, res) => {
    try {
        const stores = await loadJsonConfig(STORES_CONFIG_FILE, []);
        const groups = await loadJsonConfig(GROUPS_CONFIG_FILE, []);
        const telegramConfig = await loadJsonConfig(TELEGRAM_CONFIG_FILE, {});
        
        // 只返回啟用的配置
        const enabledStores = stores.filter(store => store.enabled !== false);
        const enabledGroups = groups.filter(group => group.enabled !== false);
        
        res.json({
            stores: enabledStores,
            telegramGroups: enabledGroups,
            telegramBotToken: telegramConfig.botToken || process.env.TELEGRAM_BOT_TOKEN
        });
    } catch (error) {
        res.status(500).json({ error: '載入雲端配置失敗' });
    }
});

// 雲端執行結果回報API
app.post('/api/cloud/report', async (req, res) => {
    try {
        const { success, results, error, executionTime, timestamp } = req.body;
        
        const logEntry = {
            id: 'cloud_' + Date.now(),
            type: '雲端自動查詢',
            success,
            message: success ? 
                `雲端查詢完成，查詢了 ${results || 0} 家分店` : 
                `雲端查詢失敗: ${error}`,
            timestamp: timestamp || new Date().toISOString(),
            details: {
                executionTime,
                results,
                source: 'github-actions'
            }
        };
        
        await addExecutionLog(logEntry);
        
        res.json({ success: true, message: '執行結果已記錄' });
        
    } catch (error) {
        console.error('記錄雲端執行結果失敗:', error);
        res.status(500).json({ error: '記錄執行結果失敗' });
    }
});

// 啟動服務器
app.listen(PORT, () => {
    console.log(`🚀 分店評價查詢系統已啟動`);
    console.log(`📡 服務器運行於: http://localhost:${PORT}`);
    console.log(`🔍 打開瀏覽器訪問: http://localhost:${PORT}`);
    console.log(`⏰ 啟動時間: ${new Date().toLocaleString('zh-TW')}`);
});

module.exports = app;