/**
 * @file resourceEvents.js
 * @description 资源加载事件系统 - 提供资源加载过程中的事件发布/订阅机制
 * @created 2024-05-10
 * 
 * 该模块实现了一个发布/订阅模式的事件系统，用于处理资源加载过程中的各种事件：
 * - 资源开始加载
 * - 资源加载成功
 * - 资源加载失败
 * - 资源回退到备用源
 * - 资源加载超时
 * 
 * 这样不同组件可以通过事件机制进行松耦合的通信，提高系统可维护性。
 */

import logger from '../utils/logger.js';

// 定义资源事件类型
export const RESOURCE_EVENTS = {
    // 资源加载生命周期事件
    LOADING_START: 'resource:loading:start',     // 资源开始加载
    LOADING_SUCCESS: 'resource:loading:success',  // 资源加载成功
    LOADING_FAILURE: 'resource:loading:failure',  // 资源加载失败
    LOADING_TIMEOUT: 'resource:loading:timeout',  // 资源加载超时
    
    // 资源回退相关事件
    FALLBACK_START: 'resource:fallback:start',    // 开始尝试回退
    FALLBACK_SUCCESS: 'resource:fallback:success', // 回退加载成功
    FALLBACK_FAILURE: 'resource:fallback:failure', // 所有回退都失败
    
    // 资源检查事件
    CHECK_START: 'resource:check:start',          // 开始检查资源
    CHECK_RESULT: 'resource:check:result',        // 资源检查结果
    
    // 资源状态事件
    STATE_CHANGE: 'resource:state:change'         // 资源状态变化
};

// 定义资源加载状态
export const RESOURCE_STATES = {
    PENDING: 'pending',       // 等待加载
    LOADING: 'loading',       // 正在加载
    LOADED: 'loaded',         // 加载成功
    FAILED: 'failed',         // 加载失败
    TIMEOUT: 'timeout',       // 加载超时
    FALLBACK: 'fallback',     // 正在尝试回退
    ALL_FAILED: 'all_failed'  // 所有尝试都失败
};

/**
 * 资源事件管理器类
 * 实现发布/订阅模式，管理资源加载过程中的各种事件
 */
class ResourceEventManager {
    constructor() {
        // 事件监听器映射
        this.listeners = new Map();
        
        // 资源状态跟踪
        this.resourceStates = new Map();
        
        // 初始化
        this.init();
    }
    
    /**
     * 初始化事件管理器
     */
    init() {
        logger.debug('🔌 初始化资源事件管理器');
        
        // 添加全局状态变更监听器
        this.on(RESOURCE_EVENTS.STATE_CHANGE, (data) => {
            this.updateResourceState(data.resourceId, data.state, data.details);
        });
        
        // 绑定资源生命周期事件到状态变更
        this.bindLifecycleEventsToStateChange();
    }
    
    /**
     * 将生命周期事件绑定到状态变更
     * 这样当触发生命周期事件时，会自动更新资源状态
     */
    bindLifecycleEventsToStateChange() {
        // 资源开始加载
        this.on(RESOURCE_EVENTS.LOADING_START, (data) => {
            this.emit(RESOURCE_EVENTS.STATE_CHANGE, {
                resourceId: data.resourceId,
                state: RESOURCE_STATES.LOADING,
                details: data
            });
        });
        
        // 资源加载成功
        this.on(RESOURCE_EVENTS.LOADING_SUCCESS, (data) => {
            this.emit(RESOURCE_EVENTS.STATE_CHANGE, {
                resourceId: data.resourceId,
                state: RESOURCE_STATES.LOADED,
                details: data
            });
        });
        
        // 资源加载失败
        this.on(RESOURCE_EVENTS.LOADING_FAILURE, (data) => {
            this.emit(RESOURCE_EVENTS.STATE_CHANGE, {
                resourceId: data.resourceId,
                state: RESOURCE_STATES.FAILED,
                details: data
            });
        });
        
        // 资源加载超时
        this.on(RESOURCE_EVENTS.LOADING_TIMEOUT, (data) => {
            this.emit(RESOURCE_EVENTS.STATE_CHANGE, {
                resourceId: data.resourceId,
                state: RESOURCE_STATES.TIMEOUT,
                details: data
            });
        });
        
        // 开始回退
        this.on(RESOURCE_EVENTS.FALLBACK_START, (data) => {
            this.emit(RESOURCE_EVENTS.STATE_CHANGE, {
                resourceId: data.resourceId,
                state: RESOURCE_STATES.FALLBACK,
                details: data
            });
        });
        
        // 所有回退都失败
        this.on(RESOURCE_EVENTS.FALLBACK_FAILURE, (data) => {
            this.emit(RESOURCE_EVENTS.STATE_CHANGE, {
                resourceId: data.resourceId,
                state: RESOURCE_STATES.ALL_FAILED,
                details: data
            });
        });
    }
    
    /**
     * 注册事件监听器
     * @param {string} eventType - 事件类型
     * @param {Function} listener - 监听器函数
     * @returns {Function} - 用于移除监听器的函数
     */
    on(eventType, listener) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        
        this.listeners.get(eventType).add(listener);
        
        // 返回用于取消监听的函数
        return () => this.off(eventType, listener);
    }
    
    /**
     * 移除事件监听器
     * @param {string} eventType - 事件类型
     * @param {Function} listener - 要移除的监听器函数
     */
    off(eventType, listener) {
        if (!this.listeners.has(eventType)) return;
        
        const eventListeners = this.listeners.get(eventType);
        eventListeners.delete(listener);
        
        // 如果没有监听器了，移除整个事件类型
        if (eventListeners.size === 0) {
            this.listeners.delete(eventType);
        }
    }
    
    /**
     * 触发事件
     * @param {string} eventType - 事件类型
     * @param {Object} data - 事件数据
     */
    emit(eventType, data) {
        // 添加时间戳
        const eventData = {
            ...data,
            timestamp: Date.now(),
            eventType
        };
        
        if (this.listeners.has(eventType)) {
            const eventListeners = this.listeners.get(eventType);
            eventListeners.forEach(listener => {
                try {
                    listener(eventData);
                } catch (error) {
                    logger.error(`事件监听器执行出错 (${eventType}):`, error);
                }
            });
        }
        
        // 触发通用事件监听器(如果存在)
        if (this.listeners.has('*')) {
            const globalListeners = this.listeners.get('*');
            globalListeners.forEach(listener => {
                try {
                    listener(eventData);
                } catch (error) {
                    logger.error(`通用事件监听器执行出错:`, error);
                }
            });
        }
    }
    
    /**
     * 只监听一次事件
     * @param {string} eventType - 事件类型
     * @param {Function} listener - 监听器函数
     */
    once(eventType, listener) {
        const onceWrapper = (data) => {
            listener(data);
            this.off(eventType, onceWrapper);
        };
        
        return this.on(eventType, onceWrapper);
    }
    
    /**
     * 更新资源状态
     * @param {string} resourceId - 资源ID
     * @param {string} state - 新状态
     * @param {Object} details - 状态详情
     */
    updateResourceState(resourceId, state, details = {}) {
        // 更新状态映射
        this.resourceStates.set(resourceId, {
            state,
            timestamp: Date.now(),
            details,
            history: this.getResourceStateHistory(resourceId)
        });
        
        logger.debug(`📝 资源 "${resourceId}" 状态变更为: ${state}`);
    }
    
    /**
     * 获取资源状态历史
     * @param {string} resourceId - 资源ID
     * @returns {Array} - 状态历史记录
     */
    getResourceStateHistory(resourceId) {
        const currentState = this.resourceStates.get(resourceId);
        const history = currentState?.history || [];
        
        if (currentState && currentState.state) {
            return [...history, {
                state: currentState.state,
                timestamp: currentState.timestamp
            }];
        }
        
        return history;
    }
    
    /**
     * 获取资源当前状态
     * @param {string} resourceId - 资源ID
     * @returns {Object|null} - 资源状态对象或null
     */
    getResourceState(resourceId) {
        return this.resourceStates.get(resourceId) || null;
    }
    
    /**
     * 检查资源是否处于指定状态
     * @param {string} resourceId - 资源ID
     * @param {string|Array} states - 要检查的状态或状态数组
     * @returns {boolean} - 是否匹配指定状态
     */
    isResourceInState(resourceId, states) {
        const resourceState = this.getResourceState(resourceId);
        if (!resourceState) return false;
        
        if (Array.isArray(states)) {
            return states.includes(resourceState.state);
        }
        
        return resourceState.state === states;
    }
    
    /**
     * 检查资源是否已加载完成
     * @param {string} resourceId - 资源ID
     * @returns {boolean} - 是否已加载完成
     */
    isResourceLoaded(resourceId) {
        return this.isResourceInState(resourceId, RESOURCE_STATES.LOADED);
    }
    
    /**
     * 等待资源达到指定状态
     * @param {string} resourceId - 资源ID
     * @param {string|Array} targetStates - 目标状态或状态数组
     * @param {number} timeout - 超时时间(毫秒)
     * @returns {Promise} - 解析为资源状态的Promise
     */
    waitForResourceState(resourceId, targetStates, timeout = 10000) {
        return new Promise((resolve, reject) => {
            // 如果资源已经处于目标状态，直接返回
            if (this.isResourceInState(resourceId, targetStates)) {
                return resolve(this.getResourceState(resourceId));
            }
            
            // 设置超时
            const timeoutId = setTimeout(() => {
                this.off(RESOURCE_EVENTS.STATE_CHANGE, stateChangeHandler);
                reject(new Error(`等待资源 "${resourceId}" 达到状态 ${targetStates} 超时`));
            }, timeout);
            
            // 监听状态变化
            const stateChangeHandler = (data) => {
                if (data.resourceId !== resourceId) return;
                
                const stateMatches = Array.isArray(targetStates) 
                    ? targetStates.includes(data.state)
                    : data.state === targetStates;
                
                if (stateMatches) {
                    clearTimeout(timeoutId);
                    this.off(RESOURCE_EVENTS.STATE_CHANGE, stateChangeHandler);
                    resolve(this.getResourceState(resourceId));
                }
            };
            
            this.on(RESOURCE_EVENTS.STATE_CHANGE, stateChangeHandler);
        });
    }
    
    /**
     * 等待资源加载完成
     * @param {string} resourceId - 资源ID
     * @param {number} timeout - 超时时间(毫秒)
     * @returns {Promise} - 解析为资源状态的Promise
     */
    waitForResourceLoaded(resourceId, timeout = 10000) {
        return this.waitForResourceState(resourceId, RESOURCE_STATES.LOADED, timeout);
    }
    
    /**
     * 重置资源状态
     * @param {string} resourceId - 资源ID，如果不提供则重置所有资源
     */
    resetResourceState(resourceId) {
        if (resourceId) {
            this.resourceStates.delete(resourceId);
        } else {
            this.resourceStates.clear();
        }
    }
}

// 创建单例实例
const resourceEvents = new ResourceEventManager();

// 导出单例、类和常量
export { resourceEvents, ResourceEventManager };

export default resourceEvents; 