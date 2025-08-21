/**
 * 服務器排程功能模組
 * 添加到現有server.js中的排程功能
 */

// 添加排程狀態API
function addSchedulerAPI(app, scheduler) {
    
    // 獲取排程狀態
    app.get('/api/admin/scheduler/status', async (req, res) => {
        try {
            const status = await scheduler.getStatus();
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: '獲取排程狀態失敗' });
        }
    });

    // 啟動排程器
    app.post('/api/admin/scheduler/start', async (req, res) => {
        try {
            await scheduler.start();
            res.json({ success: true, message: '排程器已啟動' });
        } catch (error) {
            res.status(500).json({ error: '啟動排程器失敗: ' + error.message });
        }
    });

    // 停止排程器
    app.post('/api/admin/scheduler/stop', async (req, res) => {
        try {
            scheduler.stop();
            res.json({ success: true, message: '排程器已停止' });
        } catch (error) {
            res.status(500).json({ error: '停止排程器失敗: ' + error.message });
        }
    });

    // 更新測試排程功能 - 使用新的排程器
    app.post('/api/admin/test-schedule-new', async (req, res) => {
        try {
            console.log('🧪 開始測試排程查詢...');
            
            // 使用新的排程器執行一次查詢
            await scheduler.runOnce();
            
            res.json({ 
                success: true, 
                message: '測試查詢執行完成！請檢查Telegram群組是否收到通知，並查看執行記錄頁面了解詳細結果。' 
            });
            
        } catch (error) {
            console.error('測試排程失敗:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    });

    console.log('✅ 排程API端點已添加');
}

// 初始化排程器並自動啟動
async function initializeScheduler(scheduler) {
    try {
        console.log('🚀 正在初始化自動排程系統...');
        
        // 自動啟動排程器
        await scheduler.start();
        
        console.log('✅ 自動排程系統初始化完成');
        console.log('📅 系統將按照設定的時間自動執行查詢和通知');
        
    } catch (error) {
        console.error('❌ 排程系統初始化失敗:', error.message);
    }
}

module.exports = { addSchedulerAPI, initializeScheduler };