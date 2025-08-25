const fs = require('fs').promises;
const path = require('path');

/**
 * 記憶系統 - 保存和比較歷史評分數據
 * 功能：保存昨天數據，計算評分變化，提供比較報告
 */
class MemorySystem {
    constructor() {
        this.dataDir = path.join(__dirname, 'memory-data');
        this.todayFile = path.join(this.dataDir, 'today-data.json');
        this.yesterdayFile = path.join(this.dataDir, 'yesterday-data.json');
        this.historyFile = path.join(this.dataDir, 'history-log.json');
    }

    /**
     * 初始化記憶系統目錄
     */
    async init() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            console.log('📁 記憶系統目錄已建立');
        } catch (error) {
            console.error('❌ 記憶系統初始化失敗:', error.message);
        }
    }

    /**
     * 保存今日數據
     */
    async saveToday(storeData) {
        try {
            const todayData = {
                timestamp: new Date().toISOString(),
                date: new Date().toISOString().split('T')[0],
                stores: storeData.stores || [],
                summary: storeData.summary || {}
            };

            await this.init();
            await fs.writeFile(this.todayFile, JSON.stringify(todayData, null, 2));
            
            console.log(`💾 今日數據已保存 - ${todayData.stores.length} 個分店`);
            
            // 同時記錄到歷史日誌
            await this.addToHistory(todayData);

        } catch (error) {
            console.error('❌ 保存今日數據失敗:', error.message);
        }
    }

    /**
     * 載入昨日數據
     */
    async loadYesterday() {
        try {
            const data = await fs.readFile(this.yesterdayFile, 'utf8');
            const yesterdayData = JSON.parse(data);
            
            console.log(`📖 載入昨日數據 - ${yesterdayData.date}`);
            return yesterdayData;
            
        } catch (error) {
            console.log('⚠️ 無昨日數據可比較 (首次使用)');
            return null;
        }
    }

    /**
     * 轉換今日數據為昨日數據
     */
    async rotateDays() {
        try {
            // 檢查今日數據是否存在
            const todayExists = await fs.access(this.todayFile).then(() => true).catch(() => false);
            
            if (todayExists) {
                // 將今日數據移動到昨日
                const todayData = await fs.readFile(this.todayFile, 'utf8');
                await fs.writeFile(this.yesterdayFile, todayData);
                
                console.log('🔄 數據已輪替：今日 → 昨日');
            }
            
        } catch (error) {
            console.error('❌ 數據輪替失敗:', error.message);
        }
    }

    /**
     * 比較今日與昨日數據
     */
    async compareWithYesterday(todayData) {
        const yesterdayData = await this.loadYesterday();
        
        if (!yesterdayData) {
            return {
                hasComparison: false,
                message: '無昨日數據可比較'
            };
        }

        const comparison = {
            hasComparison: true,
            date: {
                today: new Date().toISOString().split('T')[0],
                yesterday: yesterdayData.date
            },
            summary: this.compareSummary(todayData.summary, yesterdayData.summary),
            stores: this.compareStores(todayData.stores, yesterdayData.stores)
        };

        console.log(`📊 比較完成 - 今日 vs ${yesterdayData.date}`);
        return comparison;
    }

    /**
     * 比較總結數據
     */
    compareSummary(today, yesterday) {
        const todayRating = today?.averageRating || 0;
        const yesterdayRating = yesterday?.averageRating || 0;
        const difference = todayRating - yesterdayRating;

        return {
            averageRating: {
                today: todayRating,
                yesterday: yesterdayRating,
                difference: Math.round(difference * 100) / 100,
                change: difference > 0 ? 'increase' : difference < 0 ? 'decrease' : 'same',
                changeText: this.getChangeText(difference)
            }
        };
    }

    /**
     * 比較分店數據
     */
    compareStores(todayStores, yesterdayStores) {
        const comparison = [];

        todayStores.forEach(todayStore => {
            const yesterdayStore = yesterdayStores.find(s => s.name === todayStore.name);
            
            if (yesterdayStore) {
                const todayRating = todayStore.averageRating || 0;
                const yesterdayRating = yesterdayStore.averageRating || 0;
                const difference = todayRating - yesterdayRating;

                comparison.push({
                    storeName: todayStore.name,
                    rating: {
                        today: todayRating,
                        yesterday: yesterdayRating,
                        difference: Math.round(difference * 100) / 100,
                        change: difference > 0 ? 'increase' : difference < 0 ? 'decrease' : 'same',
                        changeText: this.getChangeText(difference)
                    },
                    platforms: this.comparePlatforms(todayStore.platforms, yesterdayStore.platforms)
                });
            } else {
                comparison.push({
                    storeName: todayStore.name,
                    rating: {
                        today: todayStore.averageRating || 0,
                        yesterday: null,
                        difference: null,
                        change: 'new',
                        changeText: '新增分店'
                    }
                });
            }
        });

        return comparison;
    }

    /**
     * 比較各平台數據
     */
    comparePlatforms(todayPlatforms, yesterdayPlatforms) {
        const platformComparison = {};

        Object.keys(todayPlatforms || {}).forEach(platform => {
            const todayPlatform = todayPlatforms[platform];
            const yesterdayPlatform = yesterdayPlatforms?.[platform];

            if (yesterdayPlatform && todayPlatform?.rating && yesterdayPlatform?.rating) {
                const difference = todayPlatform.rating - yesterdayPlatform.rating;
                
                platformComparison[platform] = {
                    today: todayPlatform.rating,
                    yesterday: yesterdayPlatform.rating,
                    difference: Math.round(difference * 100) / 100,
                    change: difference > 0 ? 'increase' : difference < 0 ? 'decrease' : 'same',
                    changeText: this.getChangeText(difference)
                };
            }
        });

        return platformComparison;
    }

    /**
     * 獲取變化文字描述
     */
    getChangeText(difference) {
        if (difference === 0) return '無變化';
        if (difference > 0) return `+${difference.toFixed(1)}`;
        return `${difference.toFixed(1)}`;
    }

    /**
     * 添加到歷史記錄
     */
    async addToHistory(data) {
        try {
            let history = [];
            
            // 嘗試載入現有歷史
            try {
                const historyData = await fs.readFile(this.historyFile, 'utf8');
                history = JSON.parse(historyData);
            } catch (error) {
                // 歷史文件不存在，從空開始
            }

            // 添加新記錄
            history.push({
                date: data.date,
                timestamp: data.timestamp,
                averageRating: data.summary?.averageRating,
                storeCount: data.stores?.length || 0
            });

            // 保留最近30天的記錄
            if (history.length > 30) {
                history = history.slice(-30);
            }

            await fs.writeFile(this.historyFile, JSON.stringify(history, null, 2));
            
        } catch (error) {
            console.error('❌ 添加歷史記錄失敗:', error.message);
        }
    }

    /**
     * 生成記憶報告
     */
    generateMemoryReport(comparison) {
        if (!comparison.hasComparison) {
            return '📝 記憶報告：首次查詢，無歷史數據可比較';
        }

        let report = `📝 記憶報告 (${comparison.date.today} vs ${comparison.date.yesterday})\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━\n`;

        // 總體變化
        const summaryChange = comparison.summary.averageRating;
        report += `📊 整體平均評分: ${summaryChange.today}⭐ `;
        
        if (summaryChange.change !== 'same') {
            const arrow = summaryChange.change === 'increase' ? '📈' : '📉';
            report += `${arrow} (${summaryChange.changeText})\n`;
        } else {
            report += `➖ (無變化)\n`;
        }

        // 分店變化
        report += `\n🏪 分店評分變化:\n`;
        comparison.stores.forEach(store => {
            const rating = store.rating;
            report += `• ${store.storeName}: ${rating.today}⭐`;
            
            if (rating.change !== 'new' && rating.change !== 'same') {
                const arrow = rating.change === 'increase' ? '📈' : '📉';
                report += ` ${arrow} (${rating.changeText})`;
            }
            report += `\n`;
        });

        return report;
    }

    /**
     * 獲取評分變化標示
     */
    getRatingChangeIndicator(difference) {
        if (!difference || difference === 0) return '';
        if (difference > 0) return ` 📈(+${difference.toFixed(1)})`;
        return ` 📉(${difference.toFixed(1)})`;
    }
}

module.exports = { MemorySystem };