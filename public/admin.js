/**
 * 管理後台 JavaScript
 * 分店評價系統設定管理
 */

class AdminManager {
    constructor() {
        this.stores = [];
        this.groups = [];
        this.executionLogs = [];
        this.currentEditingStore = null;
        this.currentEditingGroup = null;
        
        this.init();
    }
    
    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.updateStats();
        this.calculateNextExecution();
        this.refreshLogs();
    }
    
    /**
     * 載入所有設定
     */
    async loadSettings() {
        try {
            // 載入分店設定
            const storesResponse = await fetch('/api/admin/stores');
            if (storesResponse.ok) {
                this.stores = await storesResponse.json();
            }
            
            // 載入群組設定
            const groupsResponse = await fetch('/api/admin/groups');
            if (groupsResponse.ok) {
                this.groups = await groupsResponse.json();
            }
            
            // 載入Telegram設定
            const telegramResponse = await fetch('/api/admin/telegram-config');
            if (telegramResponse.ok) {
                const telegramConfig = await telegramResponse.json();
                document.getElementById('bot-token').value = telegramConfig.botToken || '';
            }
            
            this.renderStores();
            this.renderGroups();
            
        } catch (error) {
            console.error('載入設定失敗:', error);
            this.showAlert('載入設定失敗', 'danger');
        }
    }
    
    /**
     * 設置事件監聽器
     */
    setupEventListeners() {
        // Tab 切換事件
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const targetTab = e.target.getAttribute('href');
                if (targetTab === '#logs-tab') {
                    this.refreshLogs();
                }
            });
        });
        
        // 表單提交事件
        document.getElementById('store-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveStore();
        });
        
        document.getElementById('group-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveGroup();
        });
    }
    
    /**
     * 渲染分店列表
     */
    renderStores() {
        const container = document.getElementById('stores-list');
        
        if (this.stores.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-store fa-3x text-muted mb-3"></i>
                    <h6 class="text-muted">尚未新增任何分店</h6>
                    <button class="btn btn-gradient mt-2" onclick="addNewStore()">
                        <i class="fas fa-plus"></i> 新增第一家分店
                    </button>
                </div>
            `;
            return;
        }
        
        const storesHtml = this.stores.map((store, index) => `
            <div class="store-item" data-store-id="${store.id}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-2">
                            ${store.name}
                            ${store.enabled ? 
                                '<span class="status-badge bg-success text-white ms-2">啟用</span>' : 
                                '<span class="status-badge bg-secondary text-white ms-2">停用</span>'
                            }
                        </h6>
                        
                        <div class="row">
                            ${store.urls.google ? `
                                <div class="col-md-4">
                                    <div class="platform-url">
                                        <small class="text-muted d-block">🗺️ Google Maps</small>
                                        <a href="${store.urls.google}" target="_blank" class="text-truncate d-block">
                                            ${this.truncateUrl(store.urls.google)}
                                        </a>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${store.urls.uber ? `
                                <div class="col-md-4">
                                    <div class="platform-url">
                                        <small class="text-muted d-block">🚗 UberEats</small>
                                        <a href="${store.urls.uber}" target="_blank" class="text-truncate d-block">
                                            ${this.truncateUrl(store.urls.uber)}
                                        </a>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${store.urls.panda ? `
                                <div class="col-md-4">
                                    <div class="platform-url">
                                        <small class="text-muted d-block">🐼 Foodpanda</small>
                                        <a href="${store.urls.panda}" target="_blank" class="text-truncate d-block">
                                            ${this.truncateUrl(store.urls.panda)}
                                        </a>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="ms-3">
                        <button class="btn btn-outline-gradient btn-sm me-1" 
                                onclick="editStore(${index})" title="編輯">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" 
                                onclick="deleteStore(${index})" title="刪除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = storesHtml;
        this.updateStats();
    }
    
    /**
     * 渲染群組列表
     */
    renderGroups() {
        const container = document.getElementById('groups-list');
        
        if (this.groups.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-users fa-3x text-muted mb-3"></i>
                    <h6 class="text-muted">尚未新增任何通知群組</h6>
                    <button class="btn btn-gradient mt-2" onclick="addNewGroup()">
                        <i class="fas fa-plus"></i> 新增第一個群組
                    </button>
                </div>
            `;
            return;
        }
        
        const groupsHtml = this.groups.map((group, index) => `
            <div class="group-item" data-group-id="${group.id}">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">
                            ${group.name}
                            ${group.enabled ? 
                                '<span class="status-badge bg-success text-white ms-2">啟用</span>' : 
                                '<span class="status-badge bg-secondary text-white ms-2">停用</span>'
                            }
                        </h6>
                        <code class="text-muted">${group.chatId}</code>
                    </div>
                    
                    <div class="ms-3">
                        <button class="btn btn-outline-info btn-sm me-1" 
                                onclick="testGroup(${index})" title="測試">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                        <button class="btn btn-outline-gradient btn-sm me-1" 
                                onclick="editGroup(${index})" title="編輯">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-sm" 
                                onclick="deleteGroup(${index})" title="刪除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = groupsHtml;
    }
    
    /**
     * 更新統計資訊
     */
    updateStats() {
        document.getElementById('total-stores').textContent = this.stores.length;
        
        const totalPlatforms = this.stores.reduce((total, store) => {
            return total + Object.keys(store.urls).filter(key => store.urls[key]).length;
        }, 0);
        
        document.getElementById('total-platforms').textContent = totalPlatforms;
    }
    
    /**
     * 計算下次執行時間
     */
    calculateNextExecution() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(1, 0, 0, 0); // 設定為凌晨1點
        
        const timeString = tomorrow.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        document.getElementById('next-execution').textContent = timeString;
    }
    
    /**
     * 新增分店
     */
    addNewStore() {
        this.currentEditingStore = null;
        document.getElementById('store-form').reset();
        document.getElementById('store-id').value = '';
        
        const modal = new bootstrap.Modal(document.getElementById('storeModal'));
        modal.show();
    }
    
    /**
     * 編輯分店
     */
    editStore(index) {
        const store = this.stores[index];
        this.currentEditingStore = index;
        
        document.getElementById('store-id').value = store.id || '';
        document.getElementById('store-name').value = store.name;
        document.getElementById('google-url').value = store.urls.google || '';
        document.getElementById('uber-url').value = store.urls.uber || '';
        document.getElementById('panda-url').value = store.urls.panda || '';
        document.getElementById('store-enabled').checked = store.enabled !== false;
        
        const modal = new bootstrap.Modal(document.getElementById('storeModal'));
        modal.show();
    }
    
    /**
     * 儲存分店
     */
    async saveStore() {
        const formData = {
            id: document.getElementById('store-id').value || this.generateId(),
            name: document.getElementById('store-name').value.trim(),
            urls: {
                google: document.getElementById('google-url').value.trim(),
                uber: document.getElementById('uber-url').value.trim(),
                panda: document.getElementById('panda-url').value.trim()
            },
            enabled: document.getElementById('store-enabled').checked
        };
        
        if (!formData.name) {
            this.showAlert('請輸入分店名稱', 'warning');
            return;
        }
        
        // 檢查是否至少有一個網址
        const hasUrl = Object.values(formData.urls).some(url => url);
        if (!hasUrl) {
            this.showAlert('請至少輸入一個平台網址', 'warning');
            return;
        }
        
        try {
            if (this.currentEditingStore !== null) {
                // 編輯現有分店
                this.stores[this.currentEditingStore] = formData;
            } else {
                // 新增分店
                this.stores.push(formData);
            }
            
            await this.saveStores();
            this.renderStores();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('storeModal'));
            modal.hide();
            
            this.showAlert('分店設定已儲存', 'success');
            
        } catch (error) {
            console.error('儲存分店失敗:', error);
            this.showAlert('儲存分店失敗', 'danger');
        }
    }
    
    /**
     * 刪除分店
     */
    async deleteStore(index) {
        if (confirm('確定要刪除此分店嗎？')) {
            this.stores.splice(index, 1);
            await this.saveStores();
            this.renderStores();
            this.showAlert('分店已刪除', 'info');
        }
    }
    
    /**
     * 新增群組
     */
    addNewGroup() {
        this.currentEditingGroup = null;
        document.getElementById('group-form').reset();
        document.getElementById('group-id').value = '';
        
        const modal = new bootstrap.Modal(document.getElementById('groupModal'));
        modal.show();
    }
    
    /**
     * 編輯群組
     */
    editGroup(index) {
        const group = this.groups[index];
        this.currentEditingGroup = index;
        
        document.getElementById('group-id').value = group.id || '';
        document.getElementById('group-name').value = group.name;
        document.getElementById('group-chat-id').value = group.chatId;
        document.getElementById('group-enabled').checked = group.enabled !== false;
        
        const modal = new bootstrap.Modal(document.getElementById('groupModal'));
        modal.show();
    }
    
    /**
     * 儲存群組
     */
    async saveGroup() {
        const formData = {
            id: document.getElementById('group-id').value || this.generateId(),
            name: document.getElementById('group-name').value.trim(),
            chatId: document.getElementById('group-chat-id').value.trim(),
            enabled: document.getElementById('group-enabled').checked
        };
        
        if (!formData.name || !formData.chatId) {
            this.showAlert('請填寫完整的群組資訊', 'warning');
            return;
        }
        
        if (!formData.chatId.startsWith('-')) {
            this.showAlert('群組ID必須以負號(-)開頭', 'warning');
            return;
        }
        
        try {
            if (this.currentEditingGroup !== null) {
                // 編輯現有群組
                this.groups[this.currentEditingGroup] = formData;
            } else {
                // 新增群組
                this.groups.push(formData);
            }
            
            await this.saveGroups();
            this.renderGroups();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('groupModal'));
            modal.hide();
            
            this.showAlert('群組設定已儲存', 'success');
            
        } catch (error) {
            console.error('儲存群組失敗:', error);
            this.showAlert('儲存群組失敗', 'danger');
        }
    }
    
    /**
     * 刪除群組
     */
    async deleteGroup(index) {
        if (confirm('確定要刪除此群組嗎？')) {
            this.groups.splice(index, 1);
            await this.saveGroups();
            this.renderGroups();
            this.showAlert('群組已刪除', 'info');
        }
    }
    
    /**
     * 測試單一群組
     */
    async testSingleGroup() {
        const groupName = document.getElementById('group-name').value.trim();
        const chatId = document.getElementById('group-chat-id').value.trim();
        
        if (!chatId) {
            this.showAlert('請輸入群組ID', 'warning');
            return;
        }
        
        await this.testGroupConnection(chatId, groupName || '測試群組');
    }
    
    /**
     * 測試群組連接
     */
    async testGroup(index) {
        const group = this.groups[index];
        await this.testGroupConnection(group.chatId, group.name);
    }
    
    /**
     * 測試群組連接核心邏輯
     */
    async testGroupConnection(chatId, groupName) {
        this.showLoading('測試群組連接中...');
        
        try {
            const response = await fetch('/api/test-telegram-group', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chatId: chatId,
                    groupName: groupName
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert(`群組 "${groupName}" 測試成功！`, 'success');
            } else {
                this.showAlert(`群組測試失敗: ${result.error}`, 'danger');
            }
            
        } catch (error) {
            console.error('測試群組失敗:', error);
            this.showAlert('測試群組時發生錯誤', 'danger');
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * 測試所有群組
     */
    async testAllGroups() {
        const enabledGroups = this.groups.filter(group => group.enabled);
        
        if (enabledGroups.length === 0) {
            this.showAlert('沒有啟用的群組可以測試', 'warning');
            return;
        }
        
        this.showLoading('測試所有群組中...');
        
        let successCount = 0;
        let totalCount = enabledGroups.length;
        
        for (const group of enabledGroups) {
            try {
                const response = await fetch('/api/test-telegram-group', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        chatId: group.chatId,
                        groupName: group.name
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    successCount++;
                }
                
            } catch (error) {
                console.error(`測試群組 ${group.name} 失敗:`, error);
            }
        }
        
        this.hideLoading();
        this.showAlert(`群組測試完成: ${successCount}/${totalCount} 成功`, 
                      successCount === totalCount ? 'success' : 'warning');
    }
    
    /**
     * 儲存所有設定
     */
    async saveAllSettings() {
        this.showLoading('儲存設定中...');
        
        try {
            await Promise.all([
                this.saveStores(),
                this.saveGroups(),
                this.saveTelegramConfig()
            ]);
            
            this.showAlert('所有設定已儲存', 'success');
            
        } catch (error) {
            console.error('儲存設定失敗:', error);
            this.showAlert('儲存設定失敗', 'danger');
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * 儲存分店設定
     */
    async saveStores() {
        const response = await fetch('/api/admin/stores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.stores)
        });
        
        if (!response.ok) {
            throw new Error('儲存分店設定失敗');
        }
    }
    
    /**
     * 儲存群組設定
     */
    async saveGroups() {
        const response = await fetch('/api/admin/groups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.groups)
        });
        
        if (!response.ok) {
            throw new Error('儲存群組設定失敗');
        }
    }
    
    /**
     * 儲存Telegram設定
     */
    async saveTelegramConfig() {
        const botToken = document.getElementById('bot-token').value.trim();
        
        if (botToken) {
            const response = await fetch('/api/admin/telegram-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ botToken })
            });
            
            if (!response.ok) {
                throw new Error('儲存Telegram設定失敗');
            }
        }
    }
    
    /**
     * 更新排程
     */
    async updateSchedule() {
        this.showLoading('更新排程設定中...');
        
        try {
            const scheduleData = {
                time: document.getElementById('schedule-time').value,
                frequency: document.getElementById('schedule-frequency').value,
                enabled: document.getElementById('enable-schedule').checked
            };
            
            const response = await fetch('/api/admin/schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(scheduleData)
            });
            
            if (response.ok) {
                this.showAlert('排程設定已更新', 'success');
                this.calculateNextExecution();
            } else {
                throw new Error('更新排程失敗');
            }
            
        } catch (error) {
            console.error('更新排程失敗:', error);
            this.showAlert('更新排程失敗', 'danger');
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * 測試排程
     */
    async testSchedule() {
        this.showLoading('執行測試查詢中...');
        
        try {
            const response = await fetch('/api/admin/test-schedule', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert('測試查詢執行成功！', 'success');
                this.refreshLogs();
            } else {
                this.showAlert(`測試查詢失敗: ${result.error}`, 'danger');
            }
            
        } catch (error) {
            console.error('測試排程失敗:', error);
            this.showAlert('測試排程時發生錯誤', 'danger');
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * 重新整理執行記錄
     */
    async refreshLogs() {
        try {
            const response = await fetch('/api/admin/execution-logs');
            if (response.ok) {
                this.executionLogs = await response.json();
                this.renderLogs();
            }
        } catch (error) {
            console.error('載入執行記錄失敗:', error);
        }
    }
    
    /**
     * 渲染執行記錄
     */
    renderLogs() {
        const container = document.getElementById('execution-logs');
        
        if (this.executionLogs.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-list-alt fa-3x text-muted mb-3"></i>
                    <h6 class="text-muted">暫無執行記錄</h6>
                </div>
            `;
            return;
        }
        
        const logsHtml = this.executionLogs.map(log => `
            <div class="alert ${log.success ? 'alert-success' : 'alert-danger'} mb-2">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">
                            ${log.success ? '✅' : '❌'} 
                            ${log.type || '查詢執行'}
                        </h6>
                        <p class="mb-1">${log.message}</p>
                        <small class="text-muted">${new Date(log.timestamp).toLocaleString('zh-TW')}</small>
                    </div>
                    ${log.details ? `
                        <button class="btn btn-sm btn-outline-secondary" 
                                onclick="showLogDetails('${log.id}')">
                            詳情
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = logsHtml;
    }
    
    /**
     * 清除執行記錄
     */
    async clearLogs() {
        if (confirm('確定要清除所有執行記錄嗎？')) {
            try {
                const response = await fetch('/api/admin/execution-logs', {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    this.executionLogs = [];
                    this.renderLogs();
                    this.showAlert('執行記錄已清除', 'info');
                }
                
            } catch (error) {
                console.error('清除記錄失敗:', error);
                this.showAlert('清除記錄失敗', 'danger');
            }
        }
    }
    
    /**
     * 工具方法
     */
    generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    }
    
    truncateUrl(url, maxLength = 40) {
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength) + '...';
    }
    
    showLoading(message = '處理中...') {
        document.getElementById('loading-text').textContent = message;
        const modal = new bootstrap.Modal(document.getElementById('loadingModal'));
        modal.show();
    }
    
    hideLoading() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('loadingModal'));
        if (modal) {
            modal.hide();
        }
    }
    
    showAlert(message, type = 'info') {
        // 創建 alert 元素
        const alertId = 'alert_' + Date.now();
        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', alertHtml);
        
        // 3秒後自動移除
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                alertElement.remove();
            }
        }, 3000);
    }

    // 新增：獲取排程器狀態
    async getSchedulerStatus() {
        try {
            const response = await fetch('/api/admin/scheduler/status');
            if (response.ok) {
                const status = await response.json();
                return status;
            }
        } catch (error) {
            console.error('獲取排程狀態失敗:', error);
        }
        return null;
    }

    // 新增：更新排程狀態顯示
    async updateScheduleStatus() {
        try {
            const status = await this.getSchedulerStatus();
            if (status) {
                // 更新狀態顯示
                const statusElement = document.querySelector('.schedule-info');
                if (statusElement) {
                    const isRunning = status.isRunning;
                    const lastExecution = status.lastExecution;
                    const schedule = status.schedule;
                    
                    statusElement.innerHTML = `
                        <h5><i class="fas fa-clock"></i> 雲端自動化排程</h5>
                        <p class="mb-2">系統將自動在指定時間執行查詢並發送通知</p>
                        <div class="row">
                            <div class="col-md-6">
                                <strong>目前設定：</strong> 
                                ${schedule ? `${schedule.frequency === 'daily' ? '每天' : schedule.frequency === 'weekdays' ? '工作日' : '每週'} ${schedule.time}` : '未設定'}
                            </div>
                            <div class="col-md-6">
                                <strong>狀態：</strong> 
                                <span class="badge ${schedule && schedule.enabled ? 'bg-success' : 'bg-warning'}">
                                    ${schedule && schedule.enabled ? '已啟用' : '已停用'}
                                </span>
                            </div>
                        </div>
                        <div class="row mt-2">
                            <div class="col-md-6">
                                <strong>排程器：</strong> 
                                <span class="badge ${isRunning ? 'bg-success' : 'bg-danger'}">
                                    ${isRunning ? '運行中' : '已停止'}
                                </span>
                            </div>
                            <div class="col-md-6">
                                <strong>最後執行：</strong> 
                                <small class="text-muted">
                                    ${lastExecution ? new Date(lastExecution.timestamp).toLocaleString('zh-TW') : '尚未執行'}
                                </small>
                            </div>
                        </div>
                        ${lastExecution ? `
                        <div class="row mt-1">
                            <div class="col-md-12">
                                <small class="text-muted">
                                    執行結果: ${lastExecution.success ? '✅ 成功' : '❌ 失敗'}
                                    ${lastExecution.error ? ` (${lastExecution.error})` : ''}
                                    ${lastExecution.storesCount ? ` - 查詢了 ${lastExecution.storesCount} 間分店` : ''}
                                </small>
                            </div>
                        </div>
                        ` : ''}
                    `;
                }
            }
        } catch (error) {
            console.error('更新排程狀態失敗:', error);
        }
    }
}

// 全域函數
let adminManager;

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    adminManager = new AdminManager();
});

// 全域函數定義
function addNewStore() {
    adminManager.addNewStore();
}

function editStore(index) {
    adminManager.editStore(index);
}

function deleteStore(index) {
    adminManager.deleteStore(index);
}

function saveStore() {
    adminManager.saveStore();
}

function addNewGroup() {
    adminManager.addNewGroup();
}

function editGroup(index) {
    adminManager.editGroup(index);
}

function deleteGroup(index) {
    adminManager.deleteGroup(index);
}

function saveGroup() {
    adminManager.saveGroup();
}

function testGroup(index) {
    adminManager.testGroup(index);
}

function testSingleGroup() {
    adminManager.testSingleGroup();
}

function testAllGroups() {
    adminManager.testAllGroups();
}

function saveAllSettings() {
    adminManager.saveAllSettings();
}

function updateSchedule() {
    adminManager.updateSchedule();
}

function testSchedule() {
    adminManager.testSchedule();
}

function refreshLogs() {
    adminManager.refreshLogs();
}

function clearLogs() {
    adminManager.clearLogs();
}

// 新增：排程器狀態管理
function updateScheduleStatus() {
    adminManager.updateScheduleStatus();
}

// 頁面載入時自動更新排程狀態
document.addEventListener('DOMContentLoaded', function() {
    // 等待管理器初始化後更新狀態
    setTimeout(() => {
        if (typeof adminManager !== 'undefined') {
            updateScheduleStatus();
            // 每30秒自動更新一次狀態
            setInterval(updateScheduleStatus, 30000);
        }
    }, 1000);
});