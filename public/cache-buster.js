// 強制緩存清除腳本
console.log('🔄 強制清除瀏覽器緩存...');
console.log('📅 時間戳:', new Date().toISOString());

// 添加時間戳到所有資源
const links = document.querySelectorAll('link[rel="stylesheet"]');
links.forEach(link => {
    const href = link.href;
    if (href.includes('?')) {
        link.href = href + '&v=' + Date.now();
    } else {
        link.href = href + '?v=' + Date.now();
    }
});

// 強制刷新頁面
setTimeout(() => {
    window.location.href = window.location.href + '?v=' + Date.now();
}, 100);