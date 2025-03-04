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
export function showLoading(element, message = '加载中...') {
    element.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <span>${message}</span>
        </div>`;
}

// 显示错误信息
export function showError(element, title, message, url = '') {
    let content = `<p>${message}</p>`;
    if (url) {
        content += `<p><a href="${url}" target="_blank">点击这里在 Notion 中查看</a></p>`;
    }
    
    element.innerHTML = `
        <h2 class="article-title">${title}</h2>
        <div class="article-body">
            ${content}
        </div>`;
} 