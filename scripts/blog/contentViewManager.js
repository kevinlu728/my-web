/**
 * @file contentViewManager.js
 * @description 内容视图管理器，管理文章容器的不同显示模式
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-05-30
 */

import logger from '../utils/logger.js';

// 视图模式常量
export const ViewMode = {
    WELCOME: 'welcome',
    ARTICLE: 'article',
    LOADING: 'loading',
    ERROR: 'error'
};

class ContentViewManager {
    constructor() {
        this.currentMode = null;
        this.container = null;
        this.initialized = false;
        this.pendingModeChanges = []; // 添加待处理队列
    }
    
    /**
     * 初始化内容视图管理器
     * @param {string} containerId 容器ID，默认为'article-container'
     */
    initialize(containerId = 'article-container') {
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            logger.warn(`内容容器[${containerId}]不存在`);
            return false;
        }
        
        this.initialized = true;
        logger.info('内容视图管理器初始化完成');
        
        // 处理待处理的视图模式变更
        if (this.pendingModeChanges.length > 0) {
            logger.info(`处理${this.pendingModeChanges.length}个待处理的视图模式变更`);
            // 只处理最后一个待处理的模式变更，忽略中间态
            const lastChange = this.pendingModeChanges[this.pendingModeChanges.length - 1];
            this.setMode(lastChange.mode, lastChange.options);
            this.pendingModeChanges = [];
        }
        
        return true;
    }
    
    /**
     * 设置视图模式
     * @param {string} mode 视图模式
     * @param {Object} options 选项
     */
    setMode(mode, options = {}) {
        if (!this.initialized) {
            logger.warn('内容视图管理器未初始化，模式变更将排队');
            this.pendingModeChanges.push({mode, options});
            return false;
        }
        
        if (this.currentMode === mode && !options.force) {
            logger.info(`已经处于${mode}模式，不执行切换`);
            return false;
        }
        
        logger.info(`切换内容视图模式: ${this.currentMode || 'none'} -> ${mode}`);
        
        // 移除之前的模式类
        if (this.currentMode) {
            this.container.classList.remove(`view-mode-${this.currentMode.toLowerCase()}`);
        }
        
        // 添加新的模式类
        this.container.classList.add(`view-mode-${mode.toLowerCase()}`);
        
        // 更新当前模式
        this.currentMode = mode;
        
        // 触发自定义事件
        const event = new CustomEvent('viewModeChanged', {
            detail: { mode, previousMode: this.currentMode }
        });
        this.container.dispatchEvent(event);
        
        return true;
    }
    
    /**
     * 获取当前视图模式
     * @returns {string} 当前视图模式
     */
    getCurrentMode() {
        return this.currentMode;
    }
    
    /**
     * 标记内容为给定类型
     * @param {Element} element 要标记的元素
     * @param {string} contentType 内容类型
     */
    markContent(element, contentType) {
        if (!element) return;
        
        // 移除所有内容类型标记
        ['welcome-content', 'article-content', 'loading-content', 'error-content'].forEach(cls => {
            element.classList.remove(cls);
        });
        
        // 添加指定的内容类型
        element.classList.add(`${contentType}-content`);
    }
}

export const contentViewManager = new ContentViewManager(); 