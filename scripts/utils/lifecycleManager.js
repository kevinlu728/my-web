/**
 * @file lifecycleManager.js
 * @description 页面生命周期管理器，负责统一管理模块的初始化和清理
 * @created 2024-05-24
 */

import logger from './logger.js';

class LifecycleManager {
    constructor() {
        this.cleanupHandlers = new Map();
        this.pageId = null;
        this.initialized = false;
    }
    
    /**
     * 初始化生命周期管理器
     * @param {string} pageId 页面标识符
     */
    initialize(pageId) {
        if (this.initialized) {
            this.cleanup();
        }
        
        this.pageId = pageId;
        this.initialized = true;
        
        // 添加页面卸载事件监听
        window.addEventListener('unload', this._handleUnload.bind(this));
        
        logger.info(`生命周期管理器已初始化，页面ID: ${pageId}`);
    }
    
    /**
     * 注册清理处理函数
     * @param {string} moduleId 模块ID
     * @param {Function} cleanupFn 清理函数
     */
    registerCleanup(moduleId, cleanupFn) {
        if (typeof cleanupFn !== 'function') {
            logger.warn(`无法注册模块[${moduleId}]的清理函数: 不是函数`);
            return;
        }
        
        this.cleanupHandlers.set(moduleId, cleanupFn);
        logger.debug(`已注册模块[${moduleId}]的清理函数`);
    }
    
    /**
     * 清理所有已注册模块
     */
    cleanup() {
        logger.info(`开始清理页面[${this.pageId}]的所有模块...`);
        
        this.cleanupHandlers.forEach((cleanupFn, moduleId) => {
            try {
                cleanupFn();
                logger.debug(`模块[${moduleId}]清理完成`);
            } catch (error) {
                logger.error(`清理模块[${moduleId}]时出错:`, error);
            }
        });
        
        this.cleanupHandlers.clear();
        logger.info('所有模块清理完成');
    }
    
    /**
     * 页面卸载时的处理函数
     * @private
     */
    _handleUnload() {
        this.cleanup();
    }
}

// 单例实例
export const lifecycleManager = new LifecycleManager();
export default lifecycleManager; 