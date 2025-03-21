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

// 资源加载状态跟踪对象
const resourceStatus = {
    resources: {},
    statusElement: null,
    listElement: null,
    
    // 添加资源记录
    addResource: function(name, url) {
        const resourceId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        this.resources[resourceId] = {
            name: name,
            url: url,
            status: 'loading',
            startTime: new Date().getTime()
        };
        
        this.updateStatusUI();
        return resourceId;
    },
    
    // 更新资源状态
    updateResource: function(resourceId, status) {
        if (this.resources[resourceId]) {
            this.resources[resourceId].status = status;
            this.resources[resourceId].endTime = new Date().getTime();
            this.updateStatusUI();
        }
    },
    
    // 更新UI显示
    updateStatusUI: function() {
        if (!this.listElement) return;
        
        // 清空列表
        this.listElement.innerHTML = '';
        
        // 按状态排序：错误 > 加载中 > 成功
        const sortedResources = Object.values(this.resources).sort((a, b) => {
            const priority = { 'error': 0, 'loading': 1, 'success': 2 };
            return priority[a.status] - priority[b.status];
        });
        
        // 添加每个资源的状态
        sortedResources.forEach(resource => {
            const item = document.createElement('li');
            item.className = 'resource-status-item';
            
            let statusIcon = '';
            if (resource.status === 'loading') {
                statusIcon = '<i class="status-icon status-loading fas fa-spinner fa-spin"></i>';
            } else if (resource.status === 'success') {
                statusIcon = '<i class="status-icon status-success fas fa-check"></i>';
            } else if (resource.status === 'error') {
                statusIcon = '<i class="status-icon status-error fas fa-times"></i>';
            }
            
            item.innerHTML = `
                ${statusIcon}
                <span class="resource-name">${resource.name}</span>
            `;
            
            this.listElement.appendChild(item);
        });
        
        // 更新错误和加载中资源的计数
        const hasFailedResources = Object.values(this.resources).some(res => res.status === 'error');
        const hasLoadingResources = Object.values(this.resources).some(res => res.status === 'loading');
        
        // 如果有任何加载失败的资源，更新标题
        const statusTitle = document.querySelector('.resource-status-title');
        if (statusTitle) {
            if (hasFailedResources) {
                statusTitle.innerHTML = '资源加载状态 <span class="resource-status-alert">⚠️</span>';
                statusTitle.classList.add('has-error');
            } else if (!hasLoadingResources) {
                statusTitle.innerHTML = '资源加载状态 ✅';
                statusTitle.classList.remove('has-error');
            } else {
                statusTitle.innerHTML = '资源加载状态';
                statusTitle.classList.remove('has-error');
            }
        }
    },
    
    // 初始化资源状态监控
    init: function() {
        // 创建原始loadScript函数的扩展版本
        const originalLoadScript = window.loadScript;
        window.loadScript = (src, backupSrc) => {
            const resourceName = src.split('/').pop();
            const resourceId = this.addResource(resourceName, src);
            
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.async = false; // 保持执行顺序
                script.src = src;
                
                script.onload = () => {
                    this.updateResource(resourceId, 'success');
                    resolve(script);
                };
                
                script.onerror = function() {
                    console.warn(`加载脚本失败: ${src}`);
                    
                    if (backupSrc) {
                        console.log(`尝试备用源: ${backupSrc}`);
                        this.src = backupSrc;
                        
                        // 备用源也可能失败
                        this.onerror = function() {
                            console.error(`备用源也加载失败: ${backupSrc}`);
                            resourceStatus.updateResource(resourceId, 'error');
                            reject(new Error(`Failed to load script from main and backup sources: ${src}, ${backupSrc}`));
                        };
                    } else {
                        resourceStatus.updateResource(resourceId, 'error');
                        reject(new Error(`Failed to load script: ${src}`));
                    }
                };
                
                document.head.appendChild(script);
            });
        };
    }
};

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
        console.log('调试面板已初始化，跳过重复初始化');
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
    document.getElementById('database-id').value = currentDatabaseId;
    
    // 显示面板状态
    const debugPanel = document.getElementById('debug-panel');
    const debugMode = localStorage.getItem('debug-mode') === 'true';
    debugPanel.style.display = debugMode ? 'block' : 'none';
    
    // 设置面板拖拽功能
    initDraggablePanel(debugPanel);
    
    // 添加键盘快捷键切换调试面板 (Ctrl+Shift+D 或 Mac上的 Command+Shift+D)
    // 使用命名函数便于后续移除
    const keyboardShortcutHandler = function(e) {
        const isMac = navigator.platform.indexOf('Mac') !== -1;
        const modifierKey = isMac ? e.metaKey : e.ctrlKey; // Mac用metaKey(Command键)
        
        if (modifierKey && e.shiftKey && e.key === 'D') {
            const toggleCheckbox = document.getElementById('debug-mode-toggle');
            toggleCheckbox.checked = !toggleCheckbox.checked;
            
            // 触发change事件
            toggleCheckbox.dispatchEvent(new Event('change'));
            
            // 阻止默认行为
            e.preventDefault();
        }
    };
    
    // 移除可能存在的旧键盘事件监听器
    document.removeEventListener('keydown', window._debugPanelKeyHandler);
    window._debugPanelKeyHandler = keyboardShortcutHandler;
    document.addEventListener('keydown', window._debugPanelKeyHandler);
    
    // 添加更新配置按钮事件
    document.getElementById('update-config-btn').addEventListener('click', function() {
        // 防止重复点击
        if (this.disabled) return;
        this.disabled = true;
        
        const databaseIdInput = document.getElementById('database-id');
        const newDatabaseId = databaseIdInput.value.trim();
        
        if (!newDatabaseId) {
            showStatus('数据库 ID 不能为空', true);
            this.disabled = false;
            return;
        }
        
        showStatus(`配置已更新，数据库 ID: ${newDatabaseId}`);
        onConfigUpdate(newDatabaseId);
        this.disabled = false;
    });
    
    // 添加集成指南显示/隐藏事件
    document.getElementById('show-integration-guide').addEventListener('click', function(e) {
        e.preventDefault();
        
        // 检查集成指南容器是否存在，如果不存在则创建
        let guideContainer = document.getElementById('integration-guide');
        if (!guideContainer) {
            guideContainer = document.createElement('div');
            guideContainer.id = 'integration-guide';
            guideContainer.className = 'integration-guide';
            
            // 创建关闭按钮
            const closeButton = document.createElement('button');
            closeButton.className = 'close-guide-btn';
            closeButton.textContent = '关闭';
            closeButton.addEventListener('click', function() {
                guideContainer.style.display = 'none';
            });
            
            // 创建指南内容
            const guideContent = document.createElement('div');
            guideContent.className = 'guide-content';
            guideContent.innerHTML = `
                <h4>Notion API 集成指南</h4>
                <p>要正确使用 Notion API，请确保：</p>
                <ol>
                    <li>在 <a href="https://www.notion.so/my-integrations" target="_blank">Notion Integrations</a> 页面创建集成</li>
                    <li>获取 API 密钥并设置在项目配置中</li>
                    <li>在 Notion 数据库页面点击 "分享" 按钮，将数据库与集成共享</li>
                    <li>复制数据库 ID (在数据库 URL 中找到，格式为 32 个字符的字符串)</li>
                </ol>
                <p>更多信息可以参考 <a href="https://developers.notion.com/docs" target="_blank">Notion API 文档</a></p>
            `;
            
            // 添加到容器
            guideContainer.appendChild(closeButton);
            guideContainer.appendChild(guideContent);
            
            // 添加到页面
            document.getElementById('debug-panel').appendChild(guideContainer);
        }
        
        // 显示集成指南
        guideContainer.style.display = 'block';
    });
    
    // 添加刷新按钮事件
    document.getElementById('refresh-btn').addEventListener('click', function() {
        // 防止重复点击
        if (this.disabled) return;
        this.disabled = true;
        
        onRefresh();
        
        // 延迟恢复按钮，防止频繁点击
        setTimeout(() => {
            this.disabled = false;
        }, 1000);
    });
    
    // 添加调试按钮事件
    document.getElementById('debug-btn').addEventListener('click', async function() {
        // 防止重复点击
        if (this.disabled) return;
        this.disabled = true;
        
        try {
            const databaseId = document.getElementById('database-id').value.trim();
            if (!databaseId) {
                showStatus('数据库 ID 不能为空', true);
                this.disabled = false;
                return;
            }
            
            showStatus('正在获取数据库信息...');
            const data = await getDatabaseInfo(databaseId);
            console.log('Database Info:', data);
            
            let infoMessage = '';
            
            if (data.success === false) {
                infoMessage = `获取数据库信息失败: ${data.error || '未知错误'}`;
                showStatus(infoMessage, true);
            } else {
                // 创建数据库信息摘要
                const dbName = data.title?.[0]?.plain_text || data.title || '无标题数据库';
                const createdTime = data.created_time ? new Date(data.created_time).toLocaleString() : '未知';
                const lastEditedTime = data.last_edited_time ? new Date(data.last_edited_time).toLocaleString() : '未知';
                
                infoMessage = `数据库: ${dbName}\n`;
                infoMessage += `ID: ${databaseId}\n`;
                infoMessage += `创建时间: ${createdTime}\n`;
                infoMessage += `最后编辑: ${lastEditedTime}\n`;
                
                if (data.properties) {
                    infoMessage += `\n字段数量: ${Object.keys(data.properties).length}\n`;
                    infoMessage += '字段列表:\n';
                    
                    for (const [key, prop] of Object.entries(data.properties)) {
                        infoMessage += `- ${key} (${prop.type})\n`;
                    }
                }
                
                showStatus('数据库信息获取成功');
            }
            
            alert(infoMessage || '数据库信息已在控制台输出');
        } catch (error) {
            console.error('Error fetching database info:', error);
            showStatus(`获取数据库信息失败: ${error.message}`, true);
            alert(`获取数据库信息失败: ${error.message}`);
        } finally {
            this.disabled = false;
        }
    });
    
    // 添加测试 API 连接按钮事件
    document.getElementById('test-api-btn').addEventListener('click', async function() {
        // 防止重复点击
        if (this.disabled) return;
        this.disabled = true;
        
        try {
            showStatus('正在测试 API 连接...');
            const data = await testApiConnection();
            console.log('API Test Result:', data);
            
            // 处理不同格式的返回结果
            let infoMessage = '';
            
            if (data.success === false) {
                infoMessage = `API 连接测试失败: ${data.error || '未知错误'}`;
                showStatus(infoMessage, true);
            } else {
                // 尝试获取API服务的实现信息
                const implementation = data.implementation || (data.service?.implementation) || '标准实现';
                const apiVersion = data.apiVersion || data.service?.apiVersion || data.env?.apiVersion || '未知';
                const timestamp = data.timestamp || data.time || new Date().toISOString();
                
                infoMessage = '✅ API 连接测试成功\n\n';
                infoMessage += `API实现: ${implementation}\n`;
                infoMessage += `API版本: ${apiVersion}\n`;
                infoMessage += `测试时间: ${new Date(timestamp).toLocaleString()}\n`;
                
                // 添加其他可能有用的信息
                if (data.service) {
                    infoMessage += `服务状态: ${data.service.connected ? '已连接' : '未连接'}\n`;
                }
                
                if (data.env) {
                    infoMessage += `\n环境信息:\n`;
                    infoMessage += `- 环境: ${data.env.nodeEnv || '未知'}\n`;
                    infoMessage += `- Notion Key: ${data.env.hasNotionKey ? '已设置' : '未设置'}\n`;
                    infoMessage += `- Notion DB: ${data.env.hasNotionDb ? '已设置' : '未设置'}\n`;
                }
                
                showStatus('API 连接测试成功');
            }
            
            alert(infoMessage || 'API 连接测试成功，详情请查看控制台');
        } catch (error) {
            console.error('Error testing API:', error);
            showStatus(`API 连接测试失败: ${error.message}`, true);
            alert(`API 连接测试失败: ${error.message}`);
        } finally {
            this.disabled = false;
        }
    });
    
    // 添加列出数据库按钮事件
    document.getElementById('list-db-btn').addEventListener('click', async function() {
        // 防止重复点击
        if (this.disabled) return;
        this.disabled = true;
        
        try {
            showStatus('正在获取数据库列表...');
            const data = await getDatabases();
            console.log('Databases:', data);
            
            let dbInfo = '';
            
            if (data.success === false) {
                dbInfo = `获取数据库列表失败: ${data.error || '未知错误'}`;
                showStatus(dbInfo, true);
            } else {
                dbInfo = '找到的数据库:\n\n';
                
                if (data.results && data.results.length > 0) {
                    data.results.forEach((db, index) => {
                        let title = '无标题';
                        
                        // 尝试从不同属性中获取标题
                        if (db.title && Array.isArray(db.title) && db.title.length > 0) {
                            title = db.title[0].plain_text || title;
                        } else if (db.properties && db.properties.title) {
                            title = '数据库 ' + (index + 1);
                        }
                        
                        // 添加创建时间信息
                        const createdTime = db.created_time 
                            ? new Date(db.created_time).toLocaleString()
                            : '未知时间';
                        
                        dbInfo += `${index + 1}. ${title}\n`;
                        dbInfo += `   ID: ${db.id}\n`;
                        dbInfo += `   创建于: ${createdTime}\n\n`;
                    });
                } else {
                    dbInfo += '没有找到数据库，或您没有访问权限\n\n';
                    dbInfo += '请确保：\n';
                    dbInfo += '1. Notion API密钥已正确设置\n';
                    dbInfo += '2. 您的集成已与至少一个数据库共享\n';
                }
                
                showStatus(`已找到 ${data.results ? data.results.length : 0} 个数据库`);
            }
            
            alert(dbInfo);
        } catch (error) {
            console.error('Error listing databases:', error);
            showStatus(`获取数据库列表失败: ${error.message}`, true);
            alert(`获取数据库列表失败: ${error.message}`);
        } finally {
            this.disabled = false;
        }
    });
    
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
                    console.log('API自动选择结果:', result);
                    
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
                    console.error('API自动选择失败:', error);
                    showStatus(`API自动选择失败: ${error.message}`, true);
                    alert(`API自动选择失败: ${error.message}`);
                } finally {
                    this.disabled = false;
                }
            });
        }
    }
    
    // 初始化资源加载监控区域
    initResourceMonitor();
    
    // 初始化资源加载状态跟踪
    resourceStatus.init();
    
    console.log('调试面板初始化完成');
}

// 初始化环境信息区域
function initEnvironmentInfo() {
    const apiVersionEl = document.getElementById('api-version');
    const envModeEl = document.getElementById('env-mode');
    const apiImplEl = document.getElementById('api-impl');
    
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

// 初始化资源加载监控区域
function initResourceMonitor() {
    // 获取调试面板
    const debugPanel = document.getElementById('debug-panel');
    if (!debugPanel) return;
    
    // 创建资源监控部分
    const resourceMonitorSection = document.createElement('div');
    resourceMonitorSection.id = 'resource-monitor';
    resourceMonitorSection.className = 'resource-monitor-section';
    
    // 添加标题和内容
    resourceMonitorSection.innerHTML = `
        <div class="section-header">
            <div class="resource-status-title">资源加载状态</div>
            <button id="clear-resources-btn" class="clear-resources-btn">清除</button>
        </div>
        <div class="resource-status-container">
            <ul id="resource-status-list" class="resource-status-list"></ul>
        </div>
    `;
    
    // 添加到调试面板
    debugPanel.appendChild(resourceMonitorSection);
    
    // 设置资源状态的列表元素引用
    resourceStatus.listElement = document.getElementById('resource-status-list');
    
    // 添加清除按钮事件
    document.getElementById('clear-resources-btn').addEventListener('click', function() {
        resourceStatus.resources = {};
        resourceStatus.updateStatusUI();
    });
    
    // 初始化资源列表
    resourceStatus.updateStatusUI();
}

// 更新环境信息
function updateEnvironmentInfo(data = {}) {
    const apiVersionEl = document.getElementById('api-version');
    const envModeEl = document.getElementById('env-mode');
    const apiImplEl = document.getElementById('api-impl');
    
    if (!data) return;
    
    if (apiVersionEl && data.apiVersion) {
        apiVersionEl.textContent = data.apiVersion;
    }
    
    if (envModeEl && data.environment) {
        envModeEl.textContent = data.environment;
    }
    
    if (apiImplEl && data.implementation) {
        apiImplEl.textContent = data.implementation;
    }
}

// 从API获取并更新环境信息
async function updateEnvironmentInfoFromAPI() {
    try {
        // 导入配置对象 (如果没有全局引用的话)
        const config = window.config || {};
        
        // 如果apiService可用
        if (window.apiService && typeof window.apiService.testConnection === 'function') {
            const result = await window.apiService.testConnection();
            
            if (result.success) {
                const data = result.data || {};
                const implementation = result.implementation || data.service?.implementation || '标准';
                const apiVersion = data.apiVersion || data.service?.apiVersion || data.env?.apiVersion || '2022-06-28';
                
                // 使用配置对象，而不是 process.env
                const environment = data.env?.nodeEnv || 
                    (config.getEnvironment ? config.getEnvironment() : '开发');
                
                updateEnvironmentInfo({
                    apiVersion,
                    environment,
                    implementation
                });
            }
        }
    } catch (error) {
        console.error('获取环境信息失败:', error);
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
        console.warn('恢复调试面板位置失败:', error);
    }
} 