/**
 * @file lifeViewManager.js
 * @description 生活频道视图管理器，负责视图状态和事件管理
 * @created 2024-05-23
 * 
 * 该模块负责:
 * 1. 视图状态管理
 * 2. 视图事件处理
 * 3. 视图模式切换
 * 4. 提供关键常量和枚举
 */

import logger from '../utils/logger.js';
import lifecycleManager from '../utils/lifecycleManager.js';

// 模块类型枚举
export const ModuleType = {
    MOVIE: 'movie',
    FOOTBALL: 'football',
    TRAVEL: 'travel',
    FOOD: 'food',
    ALL: 'all'
};

// 视图模式枚举
export const ViewMode = {
    LOADING: 'loading',
    GRID: 'grid',  // 网格视图模式
    DETAIL: 'detail', // 详情视图模式
    ERROR: 'error'
};

// 视图事件枚举
export const ViewEvents = {
    LOADING_START: 'loadingStart',
    LOADING_END: 'loadingEnd',
    BEFORE_RENDER: 'beforeRender',
    AFTER_RENDER: 'afterRender',
    MODE_CHANGED: 'viewModeChanged',
    THEME_CHANGED: 'themeChanged',
    PHOTO_SELECTED: 'photoSelected'
};

/**
 * 生活频道视图管理器
 */
class LifeViewManager {
    constructor() {
        // this.container = null;
        this.currentMode = null;
        this.initialized = false;
        this.pendingModeChanges = [];
        this.eventHandlers = {}; // 存储事件处理函数，便于清理

        // 注册清理函数
        lifecycleManager.registerCleanup('lifeViewManager', this.cleanup.bind(this));
    }
    
    /**
     * 初始化视图管理器
     * @param {string} containerId 容器元素ID
     */
    initialize(containerId) {
        logger.info('初始化视图管理器...');
        
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            logger.error(`未找到视图容器: #${containerId}`);
            return;
        }
        
        this.initialized = true;
        
        // 处理待处理的模式变更
        this.processPendingModeChanges();
        
        // 发布初始化完成事件
        document.dispatchEvent(new CustomEvent('lifeViewManager:initialized', {
            detail: { manager: this }
        }));
        logger.info('视图管理器初始化完成');
    }
    
    /**
     * 处理待处理的模式变更
     */
    processPendingModeChanges() {
        if (this.pendingModeChanges.length > 0) {
            logger.info(`处理${this.pendingModeChanges.length}个待处理的模式变更`);
            
            while (this.pendingModeChanges.length > 0) {
                const { mode, options } = this.pendingModeChanges.shift();
                this.setMode(mode, options);
            }
        }
    }
    
    /**
     * 设置视图模式
     * @param {string} mode 视图模式
     * @param {Object} options 配置选项
     * @returns {boolean} 是否成功设置模式
     */
    setMode(mode, options = {}) {
        if (!this.initialized) {
            logger.warn('视图管理器未初始化，模式变更将排队');
            this.pendingModeChanges.push({mode, options});
            return false;
        }
        
        if (this.currentMode === mode && !options.force) {
            logger.info(`已经处于${mode}模式，不执行切换`);
            return false;
        }
        
        logger.info(`切换视图模式: ${this.currentMode || 'none'} -> ${mode}`);
        
        // 移除之前的模式类
        if (this.currentMode) {
            this.container.classList.remove(`view-mode-${this.currentMode.toLowerCase()}`);
        }
        
        // 添加新的模式类
        this.container.classList.add(`view-mode-${mode.toLowerCase()}`);
        
        // 更新当前模式
        const previousMode = this.currentMode;
        this.currentMode = mode;
        
        // 触发自定义事件
        const event = new CustomEvent(ViewEvents.MODE_CHANGED, {
            detail: { mode, previousMode }
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
     * 注册事件监听器
     * @param {string} eventName 事件名称
     * @param {Function} handler 事件处理函数
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
        // 移除所有事件监听器
        Object.keys(this.eventHandlers).forEach(eventName => {
            this.off(eventName);
        });
        
        // this.container = null;
        this.initialized = false;
        this.currentMode = null;
        
        logger.info('视图管理器已销毁');
    }

    /**
     * 重置视图管理器状态
     * 不完全销毁，保留容器引用，但重置其他状态
     */
    reset() {      
        // 移除所有事件监听器
        Object.keys(this.eventHandlers).forEach(eventName => {
            this.off(eventName);
        });
        
        // 移除视图模式类
        if (this.container && this.currentMode) {
            this.container.classList.remove(`view-mode-${this.currentMode.toLowerCase()}`);
            // 默认重置为网格模式
            this.container.classList.add(`view-mode-${ViewMode.GRID.toLowerCase()}`);
        }
        
        this.currentMode = ViewMode.GRID;
        this.pendingModeChanges = [];
        this.eventHandlers = {};
        return true;
    }
    
    /**
     * 清理函数 - 兼容生命周期管理器
     */
    cleanup() {
        this.reset();
        logger.info('视图管理器已清理');
    }
}

// 创建单例实例
export const lifeViewManager = new LifeViewManager();
export default LifeViewManager;