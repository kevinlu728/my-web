/**
 * @file debugPanel.js
 * @description 调试面板组件，提供开发过程中的调试工具
 * @author 陆凯
 * @version 1.2.0
 * @created 2024-03-07
 * @updated 2024-06-20
 * 
 * 该组件提供了一个可折叠的调试面板，用于开发过程中查看和调试网站状态：
 * - 显示当前页面加载的资源
 * - 显示API请求和响应
 * - 提供性能指标监控
 * - 支持日志输出和错误捕获
 * - 测试API连接
 * - 管理数据库配置
 * - 监控外部资源加载状态
 * 
 * 调试面板仅在开发环境中可见，生产环境自动禁用。
 * 可通过键盘快捷键切换面板显示状态。
 */

import logger from '../utils/logger.js';

// 初始化调试面板
export function initDebugPanel(currentDatabaseId, { 
    onConfigUpdate, 
    onRefresh, 
    showStatus,
    getDatabaseInfo,
    testApiConnection,
    getDatabases
}) {
    // 防止重复初始化
    if (window._debugPanelInitialized) {
        logger.info('调试面板已初始化，跳过重复初始化');
        return;
    }
    
    // 标记初始化状态
    window._debugPanelInitialized = true;
    
    // 清除可能存在的旧事件监听器
    const clearOldListeners = () => {
        const buttons = ['update-config-btn', 'show-integration-guide', 'refresh-btn', 
                          'debug-btn', 'test-api-btn', 'list-db-btn', 'api-select-btn'];
        
        buttons.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const newEl = el.cloneNode(true);
                el.parentNode.replaceChild(newEl, el);
            }
        });
        
        // 重新绑定切换按钮事件，因为上面的操作会清除它
        const toggle = document.getElementById('debug-mode-toggle');
        if (toggle) {
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
            
            // 恢复开关状态
            const debugMode = localStorage.getItem('debug-mode') === 'true';
            newToggle.checked = debugMode;
            
            // 重新绑定事件
            newToggle.addEventListener('change', function(e) {
                const debugPanel = document.getElementById('debug-panel');
                debugPanel.style.display = e.target.checked ? 'block' : 'none';
                localStorage.setItem('debug-mode', e.target.checked);
                
                if (e.target.checked) {
                    updateEnvironmentInfoFromAPI();
                }
            });
        }
    };
    
    // 清除旧事件监听器
    clearOldListeners();
    
    // 初始化环境信息区域 (优先初始化)
    initEnvironmentInfo();
    
    // 初始化数据库 ID 输入框
    const databaseIdInput = document.getElementById('database-id');
    if (databaseIdInput) {
        databaseIdInput.value = currentDatabaseId;
    } else {
        logger.warn('数据库ID输入框元素不存在，无法设置初始值');
    }
    
    // 显示面板状态
    const debugPanel = document.getElementById('debug-panel');
    const debugMode = localStorage.getItem('debug-mode') === 'true';
    debugPanel.style.display = debugMode ? 'block' : 'none';
    
    // 设置面板拖拽功能
    initDraggablePanel(debugPanel);
    
    // 修复键盘快捷键处理函数
    // 使用命名函数便于后续移除
    const keyboardShortcutHandler = function(e) {
        const isMac = navigator.platform.indexOf('Mac') !== -1;
        const modifierKey = isMac ? e.metaKey : e.ctrlKey;
        
        // 使用keyCode 75 (字母K)和altKey替代之前的组合
        if (modifierKey && e.altKey && e.keyCode === 75) {
            const toggleCheckbox = document.getElementById('debug-mode-toggle');
            if (toggleCheckbox) {
                toggleCheckbox.checked = !toggleCheckbox.checked;
                
                // 触发change事件
                toggleCheckbox.dispatchEvent(new Event('change'));
            }
            
            // 阻止默认行为
            e.preventDefault();
            e.stopPropagation();
        }
    };

    // 移除可能存在的旧键盘事件监听器
    document.removeEventListener('keydown', window._debugPanelKeyHandler);
    window._debugPanelKeyHandler = keyboardShortcutHandler;
    document.addEventListener('keydown', window._debugPanelKeyHandler);
    
    // 添加更新配置按钮事件
    const updateConfigBtn = document.getElementById('update-config-btn');
    if (updateConfigBtn) {
        updateConfigBtn.addEventListener('click', function() {
            // 防止重复点击
            if (this.disabled) return;
            this.disabled = true;
            
            const databaseIdInput = document.getElementById('database-id');
            const newDatabaseId = databaseIdInput ? databaseIdInput.value.trim() : '';
            
            if (!newDatabaseId) {
                showStatus('数据库ID不能为空', true);
                this.disabled = false;
                return;
            }
            
            logger.info('更新数据库ID:', newDatabaseId);
            onConfigUpdate(newDatabaseId);
            showStatus('配置已更新', false);
            
            // 1秒后恢复按钮
            setTimeout(() => {
                this.disabled = false;
            }, 1000);
        });
    } else {
        logger.warn('更新配置按钮不存在，无法绑定事件');
    }
    
    // 添加查看集成指南按钮事件
    const guideBtn = document.getElementById('show-integration-guide');
    if (guideBtn) {
        guideBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            let guideContainer = document.getElementById('integration-guide');
            
            if (!guideContainer) {
                // 创建集成指南
                guideContainer = document.createElement('div');
                guideContainer.id = 'integration-guide';
                guideContainer.className = 'integration-guide';
                guideContainer.innerHTML = `
                    <div class="guide-header">
                        <h3>集成指南</h3>
                        <button class="close-guide-btn">×</button>
                    </div>
                    <div class="guide-content">
                        <p>要访问数据库，请确保已完成以下步骤：</p>
                        <ol>
                            <li>创建 Notion 集成并获取 Secret Token</li>
                            <li>在数据库页面点击 "共享" 并添加集成</li>
                            <li>复制数据库 ID (URL中32位字符串)</li>
                        </ol>
                        <p>更多信息请参考 <a href="https://developers.notion.com/docs" target="_blank">Notion API 文档</a></p>
                    </div>
                `;
                
                // 添加关闭指南事件
                guideContainer.querySelector('.close-guide-btn').addEventListener('click', function() {
                    guideContainer.remove();
                });
                
                const debugPanel = document.getElementById('debug-panel');
                if (debugPanel) {
                    debugPanel.appendChild(guideContainer);
                } else {
                    document.body.appendChild(guideContainer);
                }
            } else {
                // 如果已存在，则移除
                guideContainer.remove();
            }
        });
    } else {
        logger.warn('集成指南按钮不存在，无法绑定事件');
    }
    
    // 添加刷新按钮事件
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            // 防止重复点击
            if (this.disabled) return;
            this.disabled = true;
            
            logger.info('刷新数据请求');
            onRefresh();
            
            // 1秒后恢复按钮
            setTimeout(() => {
                this.disabled = false;
            }, 1000);
        });
    } else {
        logger.warn('刷新按钮不存在，无法绑定事件');
    }
    
    // 添加调试按钮事件
    const debugBtn = document.getElementById('debug-btn');
    if (debugBtn) {
        debugBtn.addEventListener('click', async function() {
            // 防止重复点击
            if (this.disabled) return;
            this.disabled = true;
            
            try {
                const databaseIdInput = document.getElementById('database-id');
                const databaseId = databaseIdInput ? databaseIdInput.value.trim() : '';
                
                if (!databaseId) {
                    showStatus('数据库ID不能为空', true);
                    this.disabled = false;
                    return;
                }
                
                showStatus('正在获取数据库信息...', false);
                logger.info('获取数据库信息:', databaseId);
                
                const result = await getDatabaseInfo(databaseId);
                
                if (result.success) {
                    logger.info('数据库信息:', result);
                    
                    // 格式化并显示数据库信息
                    const title = result.data.title || '未命名数据库';
                    const properties = Object.keys(result.data.properties || {}).join(', ') || '无属性';
                    
                    showStatus(`数据库: ${title}\n包含属性: ${properties}`, false);
                } else {
                    showStatus(`获取失败: ${result.error || '未知错误'}`, true);
                    logger.error('获取数据库信息失败:', result.error);
                }
            } catch (error) {
                showStatus(`获取失败: ${error.message || '未知错误'}`, true);
                logger.error('获取数据库信息错误:', error);
            } finally {
                // 1秒后恢复按钮
                setTimeout(() => {
                    this.disabled = false;
                }, 1000);
            }
        });
    } else {
        logger.warn('调试按钮不存在，无法绑定事件');
    }
    
    // 添加测试API按钮事件
    const testApiBtn = document.getElementById('test-api-btn');
    if (testApiBtn) {
        testApiBtn.addEventListener('click', async function() {
            // 防止重复点击
            if (this.disabled) return;
            this.disabled = true;
            
            try {
                showStatus('正在测试API连接...', false);
                logger.info('测试API连接');
                
                const result = await testApiConnection();
                
                if (result.success) {
                    showStatus(`API连接成功!\n实现类型: ${result.implementation || '标准'}`, false);
                    logger.info('API连接成功:', result);
                    
                    // 更新环境信息
                    updateEnvironmentInfo({
                        apiVersion: result.version || '未知',
                        apiImpl: result.implementation || '标准'
                    });
                } else {
                    showStatus(`API连接失败: ${result.error || '未知错误'}`, true);
                    logger.error('API连接测试失败:', result.error);
                }
            } catch (error) {
                showStatus(`API连接错误: ${error.message || '未知错误'}`, true);
                logger.error('API连接测试错误:', error);
            } finally {
                // 1秒后恢复按钮
                setTimeout(() => {
                    this.disabled = false;
                }, 1000);
            }
        });
    } else {
        logger.warn('测试API按钮不存在，无法绑定事件');
    }
    
    // 添加获取所有数据库按钮事件
    const listDbBtn = document.getElementById('list-db-btn');
    if (listDbBtn) {
        listDbBtn.addEventListener('click', async function() {
            // 防止重复点击
            if (this.disabled) return;
            this.disabled = true;
            
            try {
                showStatus('正在获取所有数据库...', false);
                logger.info('获取所有数据库');
                
                const result = await getDatabases();
                
                if (result.success) {
                    const dbCount = result.results ? result.results.length : 0;
                    logger.info(`找到 ${dbCount} 个数据库:`, result.results);
                    
                    if (dbCount > 0) {
                        // 格式化并显示可用数据库
                        let dbInfo = `找到 ${dbCount} 个数据库:\n`;
                        
                        result.results.forEach((db, index) => {
                            const title = db.title || '未命名数据库 #' + (index + 1);
                            dbInfo += `${index + 1}. ${title} (${db.id})\n`;
                        });
                        
                        showStatus(dbInfo, false);
                        
                        // 添加API选择按钮
                        let apiSelectBtn = document.getElementById('api-select-btn');
                        
                        if (!apiSelectBtn) {
                            apiSelectBtn = document.createElement('button');
                            apiSelectBtn.id = 'api-select-btn';
                            apiSelectBtn.textContent = '选择数据库';
                            
                            const debugControls = document.getElementById('debug-controls');
                            if (debugControls) {
                                debugControls.appendChild(apiSelectBtn);
                            }
                        }
                        
                        // 更新按钮事件
                        apiSelectBtn.onclick = function() {
                            // 创建选择菜单
                            const selectMenu = document.createElement('div');
                            selectMenu.className = 'api-select-menu';
                            
                            // 添加数据库选项
                            result.results.forEach(db => {
                                const option = document.createElement('div');
                                option.className = 'api-select-option';
                                option.textContent = db.title || '未命名数据库';
                                option.setAttribute('data-id', db.id);
                                
                                option.onclick = function() {
                                    const dbId = this.getAttribute('data-id');
                                    const databaseIdInput = document.getElementById('database-id');
                                    if (databaseIdInput) {
                                        databaseIdInput.value = dbId;
                                    }
                                    selectMenu.remove();
                                };
                                
                                selectMenu.appendChild(option);
                            });
                            
                            // 添加关闭按钮
                            const closeBtn = document.createElement('div');
                            closeBtn.className = 'api-select-close';
                            closeBtn.textContent = '关闭';
                            closeBtn.onclick = function() {
                                selectMenu.remove();
                            };
                            
                            selectMenu.appendChild(closeBtn);
                            
                            // 添加到面板
                            const debugPanel = document.getElementById('debug-panel');
                            if (debugPanel) {
                                debugPanel.appendChild(selectMenu);
                            } else {
                                document.body.appendChild(selectMenu);
                            }
                        };
                    } else {
                        showStatus('未找到可用的数据库', true);
                    }
                } else {
                    showStatus(`获取失败: ${result.error || '未知错误'}`, true);
                    logger.error('获取数据库列表失败:', result.error);
                }
            } catch (error) {
                showStatus(`获取失败: ${error.message || '未知错误'}`, true);
                logger.error('获取数据库列表错误:', error);
            } finally {
                // 1秒后恢复按钮
                setTimeout(() => {
                    this.disabled = false;
                }, 1000);
            }
        });
    } else {
        logger.warn('列出数据库按钮不存在，无法绑定事件');
    }
    
    // 如果window.apiService存在，添加API选择功能
    if (window.apiService && typeof window.apiService.autoSelectBestApi === 'function') {
        // 检查是否有测试API按钮
        let apiSelectBtn = document.getElementById('api-select-btn');
        
        // 如果没有按钮，创建一个
        if (!apiSelectBtn) {
            const debugControls = document.getElementById('debug-controls');
            
            if (debugControls) {
                apiSelectBtn = document.createElement('button');
                apiSelectBtn.id = 'api-select-btn';
                apiSelectBtn.textContent = '自动选择API';
                
                // 添加到debug-controls容器
                debugControls.appendChild(apiSelectBtn);
            }
        }
        
        // 添加事件处理
        if (apiSelectBtn) {
            apiSelectBtn.addEventListener('click', async function() {
                // 防止重复点击
                if (this.disabled) return;
                this.disabled = true;
                
                try {
                    showStatus('正在自动选择最佳API实现...');
                    const result = await window.apiService.autoSelectBestApi();
                    logger.info('API自动选择结果:', result);
                    
                    if (result.success) {
                        showStatus(`已选择 ${result.selectedImplementation} API实现`);
                        alert(`API自动选择成功!\n\n已选择: ${result.selectedImplementation} API实现`);
                        
                        // 更新环境信息
                        updateEnvironmentInfo({
                            implementation: result.selectedImplementation
                        });
                    } else {
                        showStatus('无法连接到任何API实现', true);
                        alert('无法连接到任何API实现。\n\n请检查网络连接和API配置。');
                    }
                } catch (error) {
                    logger.error('API自动选择失败:', error);
                    showStatus(`API自动选择失败: ${error.message}`, true);
                    alert(`API自动选择失败: ${error.message}`);
                } finally {
                    this.disabled = false;
                }
            });
        }
    }
    
    logger.info('调试面板初始化完成');
}

// 初始化环境信息区域
function initEnvironmentInfo() {
    const apiVersionEl = document.getElementById('api-version');
    const envModeEl = document.getElementById('env-mode');
    const apiImplEl = document.getElementById('api-impl');
    
    if (!apiVersionEl && !envModeEl && !apiImplEl) {
        logger.warn('未找到环境信息显示元素，无法初始化环境信息区域');
        return;
    }
    
    // 导入配置对象 (如果没有全局引用的话)
    const config = window.config || {};
    
    if (apiVersionEl) {
        apiVersionEl.textContent = '2022-06-28';  // 默认值
    }
    
    if (envModeEl) {
        // 使用配置对象的 getEnvironment 方法，而不是 process.env
        envModeEl.textContent = config.getEnvironment ? config.getEnvironment() : '开发';
    }
    
    if (apiImplEl) {
        apiImplEl.textContent = window.apiService?.implementation || '标准';
    }
    
    // 第一次打开时立即更新环境信息
    if (localStorage.getItem('debug-mode') === 'true') {
        // 立即尝试获取环境信息，不等待其他初始化
        setTimeout(() => updateEnvironmentInfoFromAPI(), 0);
    }
}

// 更新环境信息
function updateEnvironmentInfo(data = {}) {
    const apiVersionEl = document.getElementById('api-version');
    const envModeEl = document.getElementById('env-mode');
    const apiImplEl = document.getElementById('api-impl');
    
    if (!data) return;
    
    // 如果没有找到环境信息元素，记录警告并退出
    if (!apiVersionEl && !envModeEl && !apiImplEl) {
        logger.warn('未找到环境信息显示元素，无法更新环境信息');
        return;
    }
    
    if (apiVersionEl && data.apiVersion) {
        apiVersionEl.textContent = data.apiVersion;
    }
    
    if (envModeEl && data.environment) {
        envModeEl.textContent = data.environment;
    }
    
    if (apiImplEl && (data.apiImpl || data.implementation)) {
        apiImplEl.textContent = data.apiImpl || data.implementation;
    }
}

// 从API获取并更新环境信息
async function updateEnvironmentInfoFromAPI() {
    try {
        // 导入配置对象 (如果没有全局引用的话)
        const config = window.config || {};
        
        // 检查是否有apiService可用
        if (!window.apiService || typeof window.apiService.testConnection !== 'function') {
            logger.warn('API服务不可用，无法更新环境信息');
            return;
        }
        
        // 调用API获取环境信息
        const result = await window.apiService.testConnection();
        
        if (result.success) {
            // 更新环境信息UI
            updateEnvironmentInfo({
                apiVersion: result.version || result.apiVersion,
                environment: result.environment || config.getEnvironment?.() || '开发',
                apiImpl: result.implementation || result.apiImpl
            });
            
            logger.info('环境信息更新成功:', result);
        } else {
            logger.warn('无法从API获取环境信息:', result.error);
        }
    } catch (error) {
        logger.error('更新环境信息时出错:', error);
    }
}

// 初始化可拖拽面板
function initDraggablePanel(panel) {
    if (!panel) return;
    
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let isDragging = false;
    
    panel.addEventListener('mousedown', function(e) {
        // 只有点击顶部区域才能拖动（高度30px）
        const rect = panel.getBoundingClientRect();
        if (e.clientY - rect.top > 30) return;
        
        e.preventDefault();
        isDragging = true;
        
        // 获取鼠标位置
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        // 添加移动和停止事件监听器
        document.addEventListener('mousemove', dragMove);
        document.addEventListener('mouseup', dragStop);
        
        // 添加拖动时的样式
        panel.style.cursor = 'grabbing';
    });
    
    function dragMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        // 计算新位置
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        // 设置面板新位置
        const newTop = (panel.offsetTop - pos2);
        const newLeft = (panel.offsetLeft - pos1);
        
        // 确保面板不会超出视图边界
        const maxTop = window.innerHeight - 60; // 保证至少有拖动条在视口内
        const maxLeft = window.innerWidth - 60;
        
        panel.style.top = Math.min(Math.max(0, newTop), maxTop) + 'px';
        panel.style.left = Math.min(Math.max(0, newLeft), maxLeft) + 'px';
        
        // 移动面板时移除bottom和right的定位，改为使用top和left
        panel.style.bottom = 'auto';
        panel.style.right = 'auto';
    }
    
    function dragStop() {
        isDragging = false;
        document.removeEventListener('mousemove', dragMove);
        document.removeEventListener('mouseup', dragStop);
        panel.style.cursor = '';
        
        // 保存面板位置到localStorage
        localStorage.setItem('debug-panel-position', JSON.stringify({
            top: panel.style.top,
            left: panel.style.left
        }));
    }
    
    // 恢复上次保存的位置
    try {
        const savedPosition = JSON.parse(localStorage.getItem('debug-panel-position'));
        if (savedPosition && savedPosition.top && savedPosition.left) {
            panel.style.top = savedPosition.top;
            panel.style.left = savedPosition.left;
            panel.style.bottom = 'auto';
            panel.style.right = 'auto';
        }
    } catch (error) {
        logger.warn('恢复调试面板位置失败:', error);
    }
} 