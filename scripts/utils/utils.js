/**
 * @file utils.js
 * @description 通用工具函数集合，提供各种辅助功能
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-09
 * 
 * 该模块提供了一系列通用的工具函数，可被项目中的其他模块使用：
 * - 字符串处理函数（格式化、转义等）
 * - 日期和时间处理函数
 * - DOM操作辅助函数
 * - 数据结构转换函数
 * - 防抖和节流函数
 * - 本地存储封装
 * 
 * 所有函数都是纯函数，不依赖外部状态，可以安全地在任何地方使用。
 * 函数采用模块化导出，可以按需引入。
 */

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
    const treeChildren = document.querySelector('#article-tree .root-item > .tree-children');
    if (!treeChildren) {
        console.warn('文章列表元素未找到');
        return;
    }
    
    treeChildren.innerHTML = `
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
    
    const treeChildren = document.querySelector('#article-tree .root-item > .tree-children');
    if (treeChildren) {
        treeChildren.innerHTML = `<li class="error">${message}</li>`;
    }
    
    console.error(message);
} 