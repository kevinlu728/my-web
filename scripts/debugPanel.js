// 添加导入声明
import { showStatus } from './utils.js';
import { loadArticles, currentDatabaseId } from './fetchArticles.js';

// 调试面板功能
function initDebugPanel() {
    const debugToggle = document.getElementById('debug-mode-toggle');
    debugToggle.addEventListener('change', handleDebugToggle);
    
    document.getElementById('update-config-btn').addEventListener('click', handleUpdateConfig);
    document.getElementById('refresh-btn').addEventListener('click', loadArticles);
    document.getElementById('debug-btn').addEventListener('click', handleDebugInfo);
}

function handleDebugToggle(e) {
    const debugPanel = document.getElementById('debug-panel');
    debugPanel.style.display = e.target.checked ? 'block' : 'none';
    localStorage.setItem('debug-mode', e.target.checked);
}

function handleUpdateConfig() {
    const databaseIdInput = document.getElementById('database-id');
    currentDatabaseId = databaseIdInput.value.trim();
    if (!currentDatabaseId) {
        showStatus('数据库 ID 不能为空', true);
        return false;
    }
    showStatus(`配置已更新，数据库 ID: ${currentDatabaseId}`);
    loadArticles();
}

async function handleDebugInfo() {
    try {
        if (!currentDatabaseId) {
            showStatus('请先设置数据库ID', true);
            return;
        }
        
        showStatus('正在获取数据库信息...');
        const response = await fetch(`/api/database-info?id=${currentDatabaseId}`);
        const data = await response.json();
        console.log('Database Info:', data);
        showStatus('数据库信息已在控制台输出');
    } catch (error) {
        console.error('Error fetching database info:', error);
        showStatus(`获取数据库信息失败: ${error.message}`, true);
    }
}

// 其他调试相关函数... 

// 导出初始化方法
export { initDebugPanel }; 