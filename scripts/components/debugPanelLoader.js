/**
 * @file debugPanelLoader.js
 * @description 调试面板加载器，负责动态加载调试面板组件并初始化
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-06-28
 */

import { initDebugPanel } from './debugPanel.js';

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
    const {
        containerId = 'debug-toggle-container',
        panelContainerId = 'debug-panel-container',
        databaseId = '1a932af826e680df8bf7f320b51930b9',
        callbacks = {}
    } = options;
    
    try {
        console.log('正在加载调试面板组件...');
        
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
        
        // 获取容器元素
        let toggleContainer = document.getElementById(containerId);
        const panelContainer = document.getElementById(panelContainerId);
        
        if (!toggleContainer) {
            console.warn(`调试开关容器 #${containerId} 不存在，将创建一个新的`);
            
            // 创建一个新的容器
            const newContainer = document.createElement('div');
            newContainer.id = containerId;
            
            // 如果要放在侧边栏，尝试找到左栏
            const leftColumn = document.querySelector('.left-column');
            if (leftColumn) {
                leftColumn.appendChild(newContainer);
            } else {
                // 否则添加到body
                document.body.appendChild(newContainer);
            }
            
            // 更新引用
            toggleContainer = newContainer;
        }
        
        // 将开关部分添加到指定容器
        if (toggleContainer) {
            toggleContainer.innerHTML = '';
            toggleContainer.appendChild(debugSection.cloneNode(true));
        } else {
            throw new Error('无法创建或找到调试开关容器');
        }
        
        // 处理面板容器
        if (!panelContainer) {
            console.warn(`调试面板容器 #${panelContainerId} 不存在，将面板直接添加到body`);
            
            // 直接将面板添加到body末尾
            document.body.appendChild(debugPanel.cloneNode(true));
        } else {
            // 将面板添加到指定容器
            panelContainer.innerHTML = ''; // 清空现有内容
            panelContainer.appendChild(debugPanel.cloneNode(true));
        }
        
        console.log('调试面板组件加载完成');
        
        // 确保DOM已经更新
        setTimeout(() => {
            try {
                // 设置正确的快捷键文本
                const shortcutEl = document.getElementById('debug-shortcut');
                if (shortcutEl) {
                    const isMac = navigator.platform.indexOf('Mac') !== -1;
                    shortcutEl.textContent = isMac ? '⌘+Shift+D' : 'Ctrl+Shift+D';
                }
                
                // 初始化调试面板功能
                initDebugPanel(databaseId, {
                    onConfigUpdate: callbacks.onConfigUpdate || function(newDbId) {
                        console.log('数据库ID已更新:', newDbId);
                    },
                    onRefresh: callbacks.onRefresh || function() {
                        console.log('刷新请求');
                        location.reload();
                    },
                    showStatus: callbacks.showStatus || function(message, isError) {
                        console.log(isError ? `错误: ${message}` : message);
                        
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
                        if (window.apiService && typeof window.apiService.getDatabaseInfo === 'function') {
                            return await window.apiService.getDatabaseInfo(dbId);
                        }
                        return { success: false, error: 'API服务不可用' };
                    },
                    testApiConnection: callbacks.testApiConnection || async function() {
                        if (window.apiService && typeof window.apiService.testConnection === 'function') {
                            return await window.apiService.testConnection();
                        }
                        return { success: false, error: 'API服务不可用' };
                    },
                    getDatabases: callbacks.getDatabases || async function() {
                        if (window.apiService && typeof window.apiService.getDatabases === 'function') {
                            return await window.apiService.getDatabases();
                        }
                        return { success: false, error: 'API服务不可用' };
                    }
                });
                
                console.log('调试面板初始化完成');
            } catch (error) {
                console.error('初始化调试面板失败:', error);
            }
        }, 0);
    } catch (error) {
        console.error('加载调试面板失败:', error);
    }
} 