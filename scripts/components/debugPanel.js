// 调试面板模块

// 初始化调试面板
export function initDebugPanel(currentDatabaseId, { 
    onConfigUpdate, 
    onRefresh, 
    showStatus,
    getDatabaseInfo,
    testApiConnection,
    getDatabases
}) {
    // 初始化数据库 ID 输入框
    document.getElementById('database-id').value = currentDatabaseId;
    
    // 添加调试模式开关事件
    document.getElementById('debug-mode-toggle').addEventListener('change', function(e) {
        const debugPanel = document.getElementById('debug-panel');
        debugPanel.style.display = e.target.checked ? 'block' : 'none';
        
        // 保存调试模式状态到 localStorage
        localStorage.setItem('debug-mode', e.target.checked);
    });
    
    // 从 localStorage 恢复调试模式状态
    const debugMode = localStorage.getItem('debug-mode') === 'true';
    document.getElementById('debug-mode-toggle').checked = debugMode;
    document.getElementById('debug-panel').style.display = debugMode ? 'block' : 'none';
    
    // 添加更新配置按钮事件
    document.getElementById('update-config-btn').addEventListener('click', function() {
        const databaseIdInput = document.getElementById('database-id');
        const newDatabaseId = databaseIdInput.value.trim();
        
        if (!newDatabaseId) {
            showStatus('数据库 ID 不能为空', true);
            return;
        }
        
        showStatus(`配置已更新，数据库 ID: ${newDatabaseId}`);
        onConfigUpdate(newDatabaseId);
    });
    
    // 添加集成指南显示/隐藏事件
    document.getElementById('show-integration-guide').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('integration-guide').style.display = 'block';
    });
    
    // 添加刷新按钮事件
    document.getElementById('refresh-btn').addEventListener('click', onRefresh);
    
    // 添加调试按钮事件
    document.getElementById('debug-btn').addEventListener('click', async function() {
        try {
            const databaseId = document.getElementById('database-id').value.trim();
            if (!databaseId) {
                showStatus('数据库 ID 不能为空', true);
                return;
            }
            
            showStatus('正在获取数据库信息...');
            const data = await getDatabaseInfo(databaseId);
            console.log('Database Info:', data);
            showStatus('数据库信息已在控制台输出');
            alert('数据库信息已在控制台输出');
        } catch (error) {
            console.error('Error fetching database info:', error);
            showStatus(`获取数据库信息失败: ${error.message}`, true);
            alert(`获取数据库信息失败: ${error.message}`);
        }
    });
    
    // 添加测试 API 连接按钮事件
    document.getElementById('test-api-btn').addEventListener('click', async function() {
        try {
            showStatus('正在测试 API 连接...');
            const data = await testApiConnection();
            console.log('API Test Result:', data);
            showStatus('API 连接测试成功');
            alert('API 连接测试成功，详情请查看控制台');
        } catch (error) {
            console.error('Error testing API:', error);
            showStatus(`API 连接测试失败: ${error.message}`, true);
            alert(`API 连接测试失败: ${error.message}`);
        }
    });
    
    // 添加列出数据库按钮事件
    document.getElementById('list-db-btn').addEventListener('click', async function() {
        try {
            showStatus('正在获取数据库列表...');
            const data = await getDatabases();
            console.log('Databases:', data);
            
            let dbInfo = '找到的数据库:\n\n';
            if (data.results && data.results.length > 0) {
                data.results.forEach((db, index) => {
                    let title = '无标题';
                    
                    // 尝试从不同属性中获取标题
                    if (db.title && Array.isArray(db.title) && db.title.length > 0) {
                        title = db.title[0].plain_text || title;
                    } else if (db.properties && db.properties.title) {
                        title = '数据库 ' + (index + 1);
                    }
                    
                    dbInfo += `${index + 1}. ${title} (ID: ${db.id})\n`;
                });
            } else {
                dbInfo += '没有找到数据库';
            }
            
            showStatus(`已找到 ${data.results ? data.results.length : 0} 个数据库`);
            alert(dbInfo);
        } catch (error) {
            console.error('Error listing databases:', error);
            showStatus(`获取数据库列表失败: ${error.message}`, true);
            alert(`获取数据库列表失败: ${error.message}`);
        }
    });
} 