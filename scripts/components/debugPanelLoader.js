/**
 * @file debugPanelLoader.js
 * @description 调试面板加载器，负责动态加载调试面板组件并初始化
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-06-28
 */

import { initDebugPanel } from './debugPanel.js';
import logger from '../utils/logger.js';

/**
 * 加载调试面板组件
 * @param {Object} options - 配置选项
 * @param {string} options.containerId - 放置调试开关的容器ID (默认: debug-toggle-container)
 * @param {string} options.panelContainerId - 放置调试面板的容器ID (默认: debug-panel-container)
 * @param {string} options.databaseId - 当前数据库ID
 * @param {Object} options.callbacks - 回调函数对象
 * @returns {Promise<void>}
 */
export async function loadDebugPanel(options = {}) {
    try {
        // 导入配置模块
        const config = window.config || {};
        
        // 检查是否为生产环境
        const isProduction = config.getEnvironment && config.getEnvironment() === 'production';
        
        // 在生产环境中直接返回，不进行后续操作
        if (isProduction) {
            logger.info('在生产环境中不加载调试面板');
            // 移除可能已存在的调试面板元素
            const existingPanel = document.getElementById('debug-panel');
            if (existingPanel) {
                existingPanel.remove();
            }
            return;
        }
        
        // 添加环境标记到body，方便CSS选择器使用
        document.body.classList.add(isProduction ? 'production' : 'development');
        
        // 只在开发环境继续执行
        const containerId = options.containerId || 'debug-toggle-container';
        const panelContainerId = options.panelContainerId || 'debug-panel-container';
        const databaseId = options.databaseId || '';
        const callbacks = options.callbacks || {};
        
        // 获取放置调试开关的容器
        const container = document.getElementById(containerId);
        if (!container) {
            logger.warn(`调试开关容器不存在: #${containerId}`);
            return;
        }
        
        // 获取放置调试面板的容器
        const panelContainer = document.getElementById(panelContainerId);
        if (!panelContainer) {
            logger.warn(`调试面板容器不存在: #${panelContainerId}`);
            return;
        }
        
        // 获取组件HTML
        const response = await fetch('./components/debug-panel.html');
        if (!response.ok) {
            throw new Error(`加载调试面板组件失败: ${response.status} ${response.statusText}`);
        }
        
        const html = await response.text();
        
        // 解析HTML为DOM
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 提取调试开关部分和面板部分
        const debugSection = doc.querySelector('.debug-section');
        const debugPanel = doc.querySelector('#debug-panel');
        
        if (!debugSection || !debugPanel) {
            throw new Error('调试面板HTML结构不完整，无法加载组件');
        }
        
        // 将开关部分添加到指定容器
        if (container) {
            container.innerHTML = '';
            container.appendChild(debugSection.cloneNode(true));
        } else {
            throw new Error('无法创建或找到调试开关容器');
        }
        
        // 处理面板容器
        if (!panelContainer) {
            logger.warn(`调试面板容器 #${panelContainerId} 不存在，将面板直接添加到body`);
            
            // 直接将面板添加到body末尾
            document.body.appendChild(debugPanel.cloneNode(true));
        } else {
            // 将面板添加到指定容器
            panelContainer.innerHTML = ''; // 清空现有内容
            panelContainer.appendChild(debugPanel.cloneNode(true));
        }
        
        logger.info('调试面板组件加载完成');
        
        // 确保DOM已经更新
        setTimeout(() => {
            try {
                // 再次检查环境，防止期间环境变化
                if (config.getEnvironment && config.getEnvironment() === 'production') {
                    logger.info('环境已变为生产环境，取消调试面板初始化');
                    return;
                }
                
                // 设置正确的快捷键文本
                const shortcutEl = document.getElementById('debug-shortcut');
                if (shortcutEl) {
                    const isMac = navigator.platform.indexOf('Mac') !== -1;
                    shortcutEl.textContent = isMac ? '⌘+⌥+K' : 'Ctrl+Alt+K';
                }
                
                // 确认调试面板元素存在后再初始化
                const debugPanelEl = document.getElementById('debug-panel');
                if (!debugPanelEl) {
                    logger.warn('调试面板元素不存在，无法初始化调试面板');
                    return;
                }
                
                // 初始化调试面板功能
                initDebugPanel(databaseId, {
                    onConfigUpdate: callbacks.onConfigUpdate || function(newDbId) {
                        logger.info('数据库ID已更新:', newDbId);
                    },
                    onRefresh: callbacks.onRefresh || function() {
                        logger.info('刷新请求');
                        location.reload();
                    },
                    showStatus: callbacks.showStatus || function(message, isError) {
                        logger.info(isError ? `错误: ${message}` : message);
                        
                        // 简单的状态显示
                        const statusEl = document.getElementById('status-message');
                        if (statusEl) {
                            statusEl.textContent = message;
                            statusEl.style.color = isError ? 'red' : 'green';
                            statusEl.style.display = 'block';
                            
                            // 3秒后隐藏
                            setTimeout(() => {
                                statusEl.style.display = 'none';
                            }, 3000);
                        }
                    },
                    getDatabaseInfo: callbacks.getDatabaseInfo || async function(dbId) {
                        try {
                            if (window.apiService && typeof window.apiService.getDatabaseInfo === 'function') {
                                const result = await window.apiService.getDatabaseInfo(dbId);
                                
                                // 格式适配层：统一返回格式，提高兼容性
                                // 检查各种可能的成功响应格式
                                if (result.success === true || 
                                    (result.data && !result.error) || 
                                    (result.results && !result.error)) {
                                    
                                    return {
                                        success: true,
                                        data: result.data || result,
                                        results: result.results || (result.data ? [result.data] : [])
                                    };
                                } else {
                                    // 统一错误响应格式
                                    return {
                                        success: false,
                                        error: result.error || '未知错误'
                                    };
                                }
                            }
                            return { success: false, error: 'API服务不可用' };
                        } catch (error) {
                            logger.error('获取数据库信息出错:', error);
                            return { 
                                success: false, 
                                error: error.message || '未知错误' 
                            };
                        }
                    },
                    testApiConnection: callbacks.testApiConnection || async function() {
                        if (window.apiService && typeof window.apiService.testConnection === 'function') {
                            return await window.apiService.testConnection();
                        }
                        return { success: false, error: 'API服务不可用' };
                    },
                    getDatabases: callbacks.getDatabases || async function() {
                        try {
                            if (window.apiService && typeof window.apiService.getDatabases === 'function') {
                                const result = await window.apiService.getDatabases();
                                
                                // 格式适配层：统一返回格式
                                // 不同的API实现可能返回不同格式
                                if (result.success === true || 
                                    (result.results && Array.isArray(result.results)) ||
                                    (Array.isArray(result))) {
                                    
                                    return {
                                        success: true,
                                        results: result.results || result
                                    };
                                } else {
                                    // 统一错误响应格式
                                    return {
                                        success: false,
                                        error: result.error || '未知错误'
                                    };
                                }
                            }
                            return { success: false, error: 'API服务不可用' };
                        } catch (error) {
                            logger.error('获取数据库列表出错:', error);
                            return { 
                                success: false, 
                                error: error.message || '未知错误' 
                            };
                        }
                    }
                });
                
                logger.info('调试面板初始化完成');
            } catch (error) {
                logger.error('初始化调试面板失败:', error);
            }
        }, 0);
    } catch (error) {
        logger.error('加载调试面板失败:', error);
    }
} 