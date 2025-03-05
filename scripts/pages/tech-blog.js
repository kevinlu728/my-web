// 技术博客页面主逻辑
import { initDebugPanel } from '../components/debugPanel.js';
import { getDatabaseInfo, testApiConnection, getDatabases } from '../services/notionService.js';
import { showStatus } from '../utils/utils.js';
import { categoryManager } from '../managers/categoryManager.js';
import { articleManager } from '../managers/articleManager.js';
import config from '../config/config.js';

// 初始化页面
function initializePage() {
    const currentDatabaseId = config.notion.databaseId || config.debug.defaultDatabaseId;

    // 设置分类变更的回调
    categoryManager.setOnCategoryChange((category) => {
        articleManager.filterArticles(category);
    });

    // 初始化文章管理器
    articleManager.initialize(currentDatabaseId);

    // 设置调试面板中的默认值
    const databaseIdInput = document.getElementById('database-id');
    if (databaseIdInput) {
        databaseIdInput.value = currentDatabaseId;
    }

    // 初始化调试面板
    initDebugPanel(currentDatabaseId, {
        onConfigUpdate: (newDatabaseId) => articleManager.updateDatabaseId(newDatabaseId),
        onRefresh: () => articleManager.loadArticles(),
        showStatus,
        getDatabaseInfo,
        testApiConnection,
        getDatabases
    });
}

// 导出显示文章的全局函数
window.showArticle = (pageId) => articleManager.showArticle(pageId);

// 页面加载完成后初始化
window.addEventListener('load', initializePage);

export { initializePage }; 