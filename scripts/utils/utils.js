// 通用工具函数

// 防抖函数
export function debounce(func, wait = 300) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// 显示状态消息
export function showStatus(message, isError = false, type = 'info') {
    const statusEl = document.getElementById('status-message');
    if (!statusEl) {
        console.warn('Status element not found');
        return;
    }
    
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    
    if (isError) {
        statusEl.className = 'status-message error';
    } else if (type === 'success') {
        statusEl.className = 'status-message success';
    } else {
        statusEl.className = 'status-message info';
    }
}

// 显示加载中状态
export function showLoading(message = '加载中...') {
    const articleList = document.getElementById('article-list');
    if (!articleList) {
        console.warn('Article list element not found');
        return;
    }
    
    articleList.innerHTML = `
        <li class="loading">
            <div class="loading-spinner"></div>
            <span>${message}</span>
        </li>`;
}

// 显示错误信息
export function showError(message) {
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = 'status-message error';
    }
    
    const articleList = document.getElementById('article-list');
    if (articleList) {
        articleList.innerHTML = `<li class="error">${message}</li>`;
    }
    
    console.error(message);
} 