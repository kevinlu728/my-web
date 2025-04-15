/**
 * @file resource-timeout.js
 * @description 资源超时管理模块，负责处理资源加载超时逻辑
 * @created 2024-05-01
 */

import logger from '../utils/logger.js';
import { resourceEvents, RESOURCE_EVENTS } from './resourceEvents.js';
import { extractResourceId } from '../config/resources.js';

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
            high: config.highTimeout || 5000,    // 高优先级资源等待5秒
            medium: config.mediumTimeout || 3000, // 中等优先级资源等待3秒
            low: config.lowTimeout || 2000        // 低优先级资源等待2秒
        };
        
        // 超时回调函数
        this.timeoutCallback = config.timeoutCallback || null;
    }

    /**
     * 设置资源加载超时处理
     * @param {string} resourceType - 资源类型
     * @param {string} url - 资源URL
     * @param {string} priority - 资源优先级
     * @returns {number} 超时处理器ID
     */
    setResourceTimeout(resourceType, url, priority = 'medium') {
        // 根据资源优先级获取超时时间
        const timeout = this.resourceTimeouts[priority] || this.resourceTimeouts.medium;
        
        // 从URL中提取资源ID
        const resourceId = extractResourceId(url, resourceType);
        
        // 设置超时处理
        const timeoutId = setTimeout(() => {
            this.handleTimeout(url, resourceType, priority, resourceId);
        }, timeout);
        
        // 保存超时处理器ID
        this.timeoutHandlers.set(url, {
            id: timeoutId,
            resourceType,
            priority,
            resourceId,
            timeoutMs: timeout
        });
        
        return timeoutId;
    }
    
    /**
     * 取消资源的超时处理
     * @param {string} url - 资源URL
     * @returns {boolean} 是否成功清除
     */
    clearResourceTimeout(url) {
        if (this.timeoutHandlers.has(url)) {
            clearTimeout(this.timeoutHandlers.get(url).id);
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
     * 清除所有超时处理器
     */
    clearAllTimeouts() {
        for (const [url, handler] of this.timeoutHandlers.entries()) {
            clearTimeout(handler.id);
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

    /**
     * 处理资源加载超时
     * @param {string} url - 资源URL
     * @param {string} resourceType - 资源类型
     * @param {string} priority - 资源优先级
     * @param {string} resourceId - 资源ID
     */
    handleTimeout(url, resourceType, priority, resourceId) {
        // 从超时处理器映射中获取详细信息
        const timeoutInfo = this.timeoutHandlers.get(url) || {
            timeoutMs: this.resourceTimeouts[priority] || this.resourceTimeouts.medium,
            resourceType,
            priority,
            resourceId: resourceId || extractResourceId(url, resourceType)
        };
        
        logger.warn(`⏱️ 资源加载超时 (${timeoutInfo.timeoutMs}ms): ${url}`);
        
        // 移除超时处理器
        this.timeoutHandlers.delete(url);
        
        // 创建超时事件数据
        const timeoutEventData = {
            url,
            resourceType,
            priority,
            resourceId: timeoutInfo.resourceId,
            timeoutMs: timeoutInfo.timeoutMs
        };
        
        // 触发资源超时事件
        resourceEvents.emit(RESOURCE_EVENTS.LOADING_TIMEOUT, timeoutEventData);
        
        // 创建超时事件 (保留原有行为以保证向后兼容)
        const event = new CustomEvent('resource-timeout', {
            detail: timeoutEventData
        });
        document.dispatchEvent(event);
        
        // 执行超时回调
        if (typeof this.timeoutCallback === 'function') {
            this.timeoutCallback(resourceType, url, priority);
        }
        
        // 主动中断加载过程
        this.abortResourceLoading(url);
    }

    /**
     * 主动中断资源加载
     * @param {string} url - 需要中断的资源URL
     */
    abortResourceLoading(url) {
        // 查找对应的DOM元素
        const elements = document.querySelectorAll(`link[href="${url}"], script[src="${url}"]`);
        
        if (elements.length > 0) {
            elements.forEach(element => {
                // 查找已存在的事件处理，避免重复处理
                if (!element.getAttribute('data-timeout-aborted')) {
                    element.setAttribute('data-timeout-aborted', 'true');
                    
                    // 触发自定义error事件，强制进入错误处理流程
                    const errorEvent = new ErrorEvent('error', {
                        message: 'Resource loading aborted due to timeout',
                        error: new Error('Timeout')
                    });
                    
                    // 将errorEvent绑定到元素
                    element.dispatchEvent(errorEvent);
                    
                    // 异步移除元素以中断加载
                    setTimeout(() => {
                        if (element.parentNode) {
                            element.parentNode.removeChild(element);
                        }
                    }, 0);
                    
                    logger.debug(`🛑 已主动中断资源加载: ${url}`);
                }
            });
        }
    }
}

// 创建单例实例
const resourceTimeout = new ResourceTimeout();

// 导出单例和类
export { resourceTimeout, ResourceTimeout };
export default resourceTimeout; 