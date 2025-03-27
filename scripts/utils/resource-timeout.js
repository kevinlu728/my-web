/**
 * @file resource-timeout.js
 * @description 资源超时管理模块，负责处理资源加载超时逻辑
 * @created 2024-05-01
 */

import logger from './logger.js';

/**
 * 资源超时管理器类
 * 负责管理资源加载超时逻辑
 */
class ResourceTimeout {
    /**
     * 初始化资源超时管理器
     * @param {Object} config - 配置对象
     */
    constructor(config = {}) {
        // 超时处理器映射
        this.timeoutHandlers = new Map();
        
        // 不同优先级资源的超时设置
        this.resourceTimeouts = {
            critical: config.criticalTimeout || 5000,   // 关键资源等待5秒
            high: config.highTimeout || 8000,           // 高优先级资源等待8秒
            medium: config.mediumTimeout || 12000,      // 中等优先级资源等待12秒
            low: config.lowTimeout || 20000             // 低优先级资源等待20秒
        };
        
        // 超时回调函数
        this.timeoutCallback = config.timeoutCallback || null;
    }

    /**
     * 设置资源加载超时处理
     * @param {string} resourceType - 资源类型 (styles/scripts)
     * @param {string} url - 资源URL
     * @param {string} priority - 资源优先级 (critical/high/medium/low)
     * @param {Function} callback - 超时回调函数，如果未提供则使用默认回调
     * @returns {number} 超时处理器ID
     */
    setResourceTimeout(resourceType, url, priority = 'medium', callback) {
        // 如果已经有超时处理器，则先清除
        if (this.timeoutHandlers.has(url)) {
            clearTimeout(this.timeoutHandlers.get(url));
            this.timeoutHandlers.delete(url);
        }
        
        // 根据优先级获取超时时间
        let timeout = this.resourceTimeouts[priority] || 8000; // 默认8秒
        
        // 确定回调函数
        const timeoutCallback = callback || this.timeoutCallback;
        
        // 设置超时处理
        const handler = setTimeout(() => {
            logger.warn(`⏱️ 资源加载超时 (${timeout}ms): ${url}`);
            
            // 移除超时处理器
            this.timeoutHandlers.delete(url);
            
            // 创建超时事件
            const event = new CustomEvent('resource-timeout', {
                detail: { 
                    url, 
                    resourceType,
                    priority,
                    timeoutMs: timeout
                }
            });
            document.dispatchEvent(event);
            
            // 执行超时回调
            if (typeof timeoutCallback === 'function') {
                timeoutCallback(url, resourceType, priority, timeout);
            }
            
        }, timeout);
        
        // 保存超时处理器
        this.timeoutHandlers.set(url, handler);
        
        return handler;
    }
    
    /**
     * 取消资源的超时处理
     * @param {string} url - 资源URL
     * @returns {boolean} 是否成功清除
     */
    clearResourceTimeout(url) {
        if (this.timeoutHandlers.has(url)) {
            clearTimeout(this.timeoutHandlers.get(url));
            this.timeoutHandlers.delete(url);
            return true;
        }
        return false;
    }
    
    /**
     * 获取指定优先级的超时时长
     * @param {string} priority - 资源优先级
     * @returns {number} 超时时长（毫秒）
     */
    getTimeoutDuration(priority) {
        return this.resourceTimeouts[priority] || this.resourceTimeouts.medium;
    }
    
    /**
     * 更新超时配置
     * @param {Object} config - 新的超时配置
     */
    updateConfig(config) {
        if (config.criticalTimeout) this.resourceTimeouts.critical = config.criticalTimeout;
        if (config.highTimeout) this.resourceTimeouts.high = config.highTimeout;
        if (config.mediumTimeout) this.resourceTimeouts.medium = config.mediumTimeout;
        if (config.lowTimeout) this.resourceTimeouts.low = config.lowTimeout;
        if (config.timeoutCallback) this.timeoutCallback = config.timeoutCallback;
    }
    
    /**
     * 清除所有超时处理器
     */
    clearAllTimeouts() {
        for (const [url, handler] of this.timeoutHandlers.entries()) {
            clearTimeout(handler);
        }
        this.timeoutHandlers.clear();
    }
    
    /**
     * 检查URL是否有活跃的超时处理器
     * @param {string} url - 资源URL
     * @returns {boolean} 是否有活跃的超时处理器
     */
    hasActiveTimeout(url) {
        return this.timeoutHandlers.has(url);
    }
    
    /**
     * 获取当前活跃的超时处理器数量
     * @returns {number} 活跃的超时处理器数量
     */
    getActiveTimeoutsCount() {
        return this.timeoutHandlers.size;
    }
}

// 创建单例实例
const resourceTimeout = new ResourceTimeout();

// 导出单例和类
export { resourceTimeout, ResourceTimeout };
export default resourceTimeout; 