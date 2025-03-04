// 通用工具函数
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

// 防抖函数
export function debounce(func, wait = 300) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// 其他工具函数... 