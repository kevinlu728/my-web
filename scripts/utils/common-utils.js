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

import logger from './logger.js';

// 防抖函数
export function debounce(func, wait = 300) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * 节流函数 - 限制函数在特定时间内只能执行一次
 * @param {Function} func 要执行的函数
 * @param {number} limit 时间间隔（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 格式化日期为YYYY/M/D格式
 * @param {string|Date} date 日期对象或日期字符串
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date) {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    return `${dateObj.getFullYear()}/${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
}

/**
 * 格式化日期
 * @param {Date} date 日期对象
 * @returns {string} 格式化的日期字符串
 */
export function formatDateToCN(date) {
    if (!(date instanceof Date)) {
        try {
            date = new Date(date);
        } catch (e) {
            return '';
        }
    }
    
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * 检查缓存是否过期
 * @param {number} timestamp 缓存的时间戳
 * @param {number} expirationTime 过期时间（毫秒）
 * @returns {boolean} 是否已过期
 */
export function isCacheExpired(timestamp, expirationTime) {
    return Date.now() - timestamp > expirationTime;
}

// 显示状态消息
export function showStatus(message, isError = false, type = 'info') {
    const statusEl = document.getElementById('status-message');
    if (!statusEl) {
        logger.warn('Status element not found');
        return;
    }
    
    // 如果消息为空，直接隐藏整个状态条
    if (!message || message.trim() === '') {
        statusEl.style.display = 'none';
        return;
    }
    
    // 确保状态条可见
    statusEl.style.display = 'block';
    
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

/**
 * 显示加载动画
 * @param {string} text - 加载提示文本
 * @param {string} container - 容器元素的选择器
 * @param {string} customClass - 自定义类名
 */
export function showLoading(text = '加载中...', container = '.main-content', customClass = 'loading') {
    const containerEl = document.querySelector(container);
    if (!containerEl) return;

    // 创建加载动画元素
    const loadingEl = document.createElement('div');
    loadingEl.classList.add(customClass);
    loadingEl.innerHTML = `<span>${text}</span>`;
    containerEl.appendChild(loadingEl);

    // 防止快速加载闪烁
    return {
        clear: () => {
            setTimeout(() => {
                if (loadingEl && loadingEl.parentNode) {
                    loadingEl.parentNode.removeChild(loadingEl);
                }
            }, 300);
        }
    };
}

/**
 * 显示通用加载动画
 * @param {string} text - 加载提示文本
 * @param {string} container - 容器元素的选择器或DOM元素
 * @param {Object} options - 配置选项
 * @param {string} options.containerClass - 容器自定义类名
 * @param {string} options.spinnerClass - 加载动画自定义类名
 * @param {string} options.textClass - 文本自定义类名
 * @param {string} options.theme - 主题 (primary, success, warning, danger)
 * @param {string} options.size - 尺寸 (small, normal, large)
 * @param {boolean} options.inline - 是否使用内联布局
 * @param {boolean} options.useOverlay - 是否使用遮罩
 * @returns {Object} 包含clear方法的对象
 */
export function showLoadingSpinner(text = '加载中...', container = '.main-content', options = {}) {
    // 默认选项
    const defaultOptions = {
        containerClass: 'loading-container',
        spinnerClass: 'loading-spinner',
        textClass: 'loading-text',
        theme: '',
        size: '',
        inline: false,
        useOverlay: false
    };

    // 合并选项
    const mergedOptions = {...defaultOptions, ...options};
    
    // 获取容器元素
    const containerEl = typeof container === 'string' 
        ? document.querySelector(container) 
        : container;
        
    if (!containerEl) {
        logger.warn(`找不到容器: ${container}`);
        return { clear: () => {} };
    }

    // 创建加载容器
    const loadingContainer = document.createElement('div');
    
    // 确保containerClass不为空字符串再添加
    if (mergedOptions.containerClass && typeof mergedOptions.containerClass === 'string' && mergedOptions.containerClass.trim() !== '') {
        loadingContainer.classList.add(mergedOptions.containerClass);
    }
    
    // 添加主题和尺寸类 - 确保只有当theme和size不为空时才添加对应的类
    if (mergedOptions.theme && typeof mergedOptions.theme === 'string' && mergedOptions.theme.trim() !== '') {
        loadingContainer.classList.add(`loading-${mergedOptions.theme}`);
    }
    
    if (mergedOptions.size && typeof mergedOptions.size === 'string' && mergedOptions.size.trim() !== '') {
        loadingContainer.classList.add(`loading-${mergedOptions.size}`);
    }
    
    if (mergedOptions.inline) {
        loadingContainer.classList.add('loading-inline');
    }
    
    if (mergedOptions.useOverlay) {
        loadingContainer.classList.add('loading-overlay');
    }
    
    // 创建加载动画元素
    const spinner = document.createElement('div');
    // 确保spinnerClass不为空字符串再添加
    if (mergedOptions.spinnerClass && typeof mergedOptions.spinnerClass === 'string' && mergedOptions.spinnerClass.trim() !== '') {
        spinner.classList.add(mergedOptions.spinnerClass);
    } else {
        // 默认使用loading-spinner类
        spinner.classList.add('loading-spinner');
    }
    loadingContainer.appendChild(spinner);
    
    // 创建加载文本
    if (text) {
        const textEl = document.createElement('div');
        // 确保textClass不为空字符串再添加
        if (mergedOptions.textClass && typeof mergedOptions.textClass === 'string' && mergedOptions.textClass.trim() !== '') {
            textEl.classList.add(mergedOptions.textClass);
        } else {
            // 默认使用loading-text类
            textEl.classList.add('loading-text');
        }
        textEl.textContent = text;
        loadingContainer.appendChild(textEl);
    }
    
    // 添加到容器
    containerEl.appendChild(loadingContainer);
    
    // 返回清除方法
    return {
        clear: (delay = 300) => {
            setTimeout(() => {
                if (loadingContainer && loadingContainer.parentNode) {
                    // 添加淡出动画
                    loadingContainer.style.opacity = '0';
                    loadingContainer.style.transition = 'opacity 0.2s ease';
                    
                    // 动画结束后移除元素
                    setTimeout(() => {
                        if (loadingContainer.parentNode) {
                            loadingContainer.parentNode.removeChild(loadingContainer);
                        }
                    }, 200);
                }
            }, delay);
        },
        // 获取加载容器元素
        getElement: () => loadingContainer
    };
}

// 显示错误信息
export function showError(message) {
    // 确保message不为undefined、null或空字符串
    let errorMessage = '发生未知错误';
    
    if (message && typeof message === 'string' && message.trim() !== '') {
        errorMessage = message;
    } else if (message && typeof message === 'object') {
        // 尝试从错误对象中提取有用信息
        if (message.message && typeof message.message === 'string' && message.message.trim() !== '') {
            errorMessage = message.message;
        } else if (message.name) {
            errorMessage = `错误类型: ${message.name}`;
        }
    }
    
    // 在UI中显示错误信息
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
        statusEl.textContent = errorMessage;
        statusEl.className = 'status-message error';
    }
    
    // 在文章树中显示错误信息
    const treeChildren = document.querySelector('#article-tree .root-item > .tree-children');
    if (treeChildren) {
        treeChildren.innerHTML = `<li class="error">${errorMessage}</li>`;
    }
    
    // 记录错误
    logger.error(`发生错误: ${errorMessage}`, message);
} 