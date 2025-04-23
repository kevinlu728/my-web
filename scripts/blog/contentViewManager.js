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

// 视图状态事件
export const ViewEvents = {
    MODE_CHANGED: 'viewModeChanged',
    BEFORE_WELCOME: 'beforeWelcomeShow',
    AFTER_WELCOME: 'afterWelcomeShow',
    BEFORE_ARTICLE: 'beforeArticleShow',
    AFTER_ARTICLE: 'afterArticleShow',
    LOADING_START: 'contentLoadingStart',
    LOADING_END: 'contentLoadingEnd'
};

class ContentViewManager {
    constructor() {
        this.currentMode = null;
        this.container = null;
        this.initialized = false;
        this.pendingModeChanges = [];
        this.eventHandlers = {}; // 添加事件处理程序存储
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
     * 更新视图状态 - 添加状态检查防止循环
     */
    updateViewState(state = 'auto') {
        try {
            logger.debug(`准备更新视图状态: ${state}`);
            
            // 获取当前状态以避免无意义的重复设置
            const currentMode = this.getCurrentMode();
            
            // 处理'loading'状态
            if (state === 'loading') {
                // 避免重复设置加载状态
                if (currentMode === ViewMode.LOADING) {
                    logger.debug('已经是加载状态，跳过重复设置');
                    return;
                }
                this.setMode(ViewMode.LOADING);
                return;
            }
            
            // 处理'auto'状态
            if (state === 'auto') {
                const urlParams = new URLSearchParams(window.location.search);
                const articleId = urlParams.get('article');
                
                // 如果有文章ID且当前不是文章模式，设置为文章模式
                if (articleId && currentMode !== ViewMode.ARTICLE) {
                    this.setMode(ViewMode.ARTICLE);
                } 
                // 如果没有文章ID且当前不是欢迎模式，设置为欢迎模式
                else if (!articleId && currentMode !== ViewMode.WELCOME) {
                    this.setMode(ViewMode.WELCOME);
                } else {
                    logger.debug(`当前已是正确模式(${currentMode})，跳过状态更新`);
                }
                return;
            }
            
            // 处理特定的ViewMode值
            if (Object.values(ViewMode).includes(state)) {
                // 避免重复设置相同状态
                if (currentMode === state) {
                    logger.debug(`已经是${state}状态，跳过重复设置`);
                    return;
                }
                this.setMode(state);
            } else {
                logger.warn(`未知的视图状态: ${state}，保持当前状态`);
            }
        } catch (error) {
            logger.error('更新视图状态时出错:', error);
        }
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
     * 标记内容为给定类型（目前没有使用，待废弃）
     * @param {Element} element 要标记的元素
     * @param {string} contentType 内容类型
     */
    markContent(element, contentType) {
        if (!element) return;
        
        // 移除所有内容类型标记
        element.classList.remove('welcome-content');
        
        // 添加指定的内容类型
        element.classList.add(`${contentType}-content`);
    }
    
    /**
     * 发送视图事件
     * @param {string} eventName 事件名称
     * @param {Object} detail 事件详情
     */
    dispatchViewEvent(eventName, detail = {}) {
        if (!this.container) return;
        
        logger.debug(`发送视图事件: ${eventName}`, detail);
        const event = new CustomEvent(eventName, { detail });
        this.container.dispatchEvent(event);
    }
    
    /**
     * 注册视图事件处理程序
     * @param {string} eventName 事件名称
     * @param {Function} handler 处理函数
     */
    on(eventName, handler) {
        if (!this.container) {
            logger.warn('视图容器未初始化，无法注册事件');
            return;
        }
        
        // 存储处理程序以便于清理
        this.eventHandlers[eventName] = this.eventHandlers[eventName] || [];
        this.eventHandlers[eventName].push(handler);
        
        // 注册事件监听器
        this.container.addEventListener(eventName, handler);
    }
    
    /**
     * 开始加载
     * @param {string} loadingType 加载类型
     */
    startLoading(loadingType = 'general') {
        this.setMode(ViewMode.LOADING);
        this.dispatchViewEvent(ViewEvents.LOADING_START, { loadingType });
    }
    
    /**
     * 结束加载
     * @param {string} loadingType 加载类型
     */
    endLoading(loadingType = 'general') {
        this.dispatchViewEvent(ViewEvents.LOADING_END, { loadingType });
    }
    
    /**
     * 移除事件监听器
     * @param {string} eventName 事件名称
     * @param {Function} handler 事件处理函数，不提供则移除该事件的所有处理函数
     */
    off(eventName, handler) {
        if (!this.container) return;
        
        if (handler && this.eventHandlers[eventName]) {
            // 移除特定处理函数
            const index = this.eventHandlers[eventName].indexOf(handler);
            if (index !== -1) {
                this.container.removeEventListener(eventName, handler);
                this.eventHandlers[eventName].splice(index, 1);
            }
        } else if (this.eventHandlers[eventName]) {
            // 移除该事件的所有处理函数
            this.eventHandlers[eventName].forEach(h => {
                this.container.removeEventListener(eventName, h);
            });
            delete this.eventHandlers[eventName];
        }
    }
    
    /**
     * 销毁视图管理器
     */
    destroy() {
        logger.info('销毁内容视图管理器...');
        
        // 移除所有事件监听器
        Object.keys(this.eventHandlers).forEach(eventName => {
            this.off(eventName);
        });
        
        this.container = null;
        this.initialized = false;
        this.currentMode = null;
        
        logger.info('内容视图管理器已销毁');
    }
}

export const contentViewManager = new ContentViewManager(); 