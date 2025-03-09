/**
 * @file tech-blog.js
 * @description 技术博客页面脚本，处理技术博客页面的特定功能
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-09
 * 
 * 该模块负责技术博客页面的特定功能：
 * - 初始化文章列表和分类
 * - 处理文章的加载和显示
 * - 实现文章的搜索和筛选
 * - 处理分页和"加载更多"功能
 * - 管理页面的状态和UI交互
 * 
 * 该页面脚本协调articleManager和categoryManager，
 * 实现技术博客页面的完整功能。
 * 
 * 该模块在tech-blog.html页面中被引入和执行。
 */

// 技术博客页面主逻辑
import { initDebugPanel } from '../components/debugPanel.js';
import { getDatabaseInfo, testApiConnection, getDatabases } from '../services/notionService.js';
import { showStatus } from '../utils/utils.js';
import { categoryManager } from '../managers/categoryManager.js';
import { articleManager } from '../managers/articleManager.js';
import config from '../config/config.js';
import { imageLazyLoader } from '../utils/image-lazy-loader.js';
import { initializeLazyLoading } from '../components/articleRenderer.js';

console.log('🚀 tech-blog.js 开始加载...');

// 初始化页面
async function initializePage() {
    console.log('开始初始化页面...');
    
    // 检查依赖项
    console.log('检查依赖项：');
    console.log('- imageLazyLoader:', !!imageLazyLoader);
    console.log('- articleManager:', !!articleManager);
    console.log('- categoryManager:', !!categoryManager);

    const currentDatabaseId = config.notion.databaseId || config.debug.defaultDatabaseId;
    console.log('当前数据库ID:', currentDatabaseId);

    // 扩展 articleManager 的显示文章方法
    if (articleManager && articleManager.showArticle) {
        const originalShowArticle = articleManager.showArticle;
        articleManager.showArticle = async function(pageId) {
            console.log('📄 准备加载文章:', pageId);
            
            try {
                const result = await originalShowArticle.call(this, pageId);
                console.log('✅ 文章加载成功');
                
                // 处理文章中的图片和懒加载内容
                setTimeout(() => {
                    const articleBody = document.querySelector('.article-body');
                    if (articleBody) {
                        console.log('🖼️ 处理文章中的图片...');
                        imageLazyLoader.processImages(articleBody);
                        
                        console.log('🔄 初始化代码块和表格懒加载...');
                        initializeLazyLoading(articleBody);
                    } else {
                        console.warn('⚠️ 未找到文章内容区域');
                    }
                }, 100);
                
                return result;
            } catch (error) {
                console.error('❌ 文章加载失败:', error);
                throw error;
            }
        };
        console.log('✅ articleManager.showArticle 方法扩展完成');
    } else {
        console.error('❌ articleManager 或 showArticle 方法未找到');
    }

    // 初始化文章管理器
    console.log('初始化文章管理器...');
    await articleManager.initialize(currentDatabaseId);

    // 设置分类变更回调
    categoryManager.setOnCategoryChange((category) => {
        console.log('分类变更为:', category);
        articleManager.filterArticles(category);
    });

    // 初始化调试面板
    initDebugPanel(currentDatabaseId, {
        onConfigUpdate: (newDatabaseId) => articleManager.updateDatabaseId(newDatabaseId),
        onRefresh: () => articleManager.loadArticles(),
        showStatus,
        getDatabaseInfo,
        testApiConnection,
        getDatabases
    });

    console.log('✅ 页面初始化完成！');
}

// 导出显示文章的全局函数
window.showArticle = async (pageId) => {
    console.log('🔄 调用全局 showArticle 函数:', pageId);
    return articleManager.showArticle(pageId);
};

// 页面加载完成后初始化
window.addEventListener('load', () => {
    console.log('📃 页面加载完成，开始初始化...');
    initializePage().catch(error => {
        console.error('❌ 初始化失败:', error);
    });
});

// 如果 articleManager 有一个 displayArticleContent 方法
// 我们需要覆盖它以处理图片
if (typeof articleManager.displayArticleContent === 'function') {
    const originalDisplayContent = articleManager.displayArticleContent;
    articleManager.displayArticleContent = function(article) {
        if (article && article.content) {
            console.log('🔄 准备处理文章内容中的图片...');
            // 处理 HTML 内容中的图片
            article.content = imageLazyLoader.processHTMLContent(article.content);
        }
        
        // 调用原始方法
        const result = originalDisplayContent.call(this, article);
        
        // 在内容显示后处理图片懒加载和代码块懒加载
        setTimeout(() => {
            const articleBody = document.querySelector('.article-body');
            if (articleBody) {
                console.log('🖼️ 开始处理新加载的文章图片...');
                imageLazyLoader.processImages(articleBody);
                
                console.log('🔄 初始化代码块和表格懒加载...');
                initializeLazyLoading(articleBody);
            }
        }, 100);
        
        return result;
    };
}

/**
 * 应用图片样式
 * 确保文章中的图片样式正确
 */
function applyImageStyles() {
    console.log('正在应用文章图片样式...');
    const images = document.querySelectorAll('.article-body img');
    console.log(`找到 ${images.length} 张文章图片`);
    
    images.forEach(img => {
        img.style.maxWidth = '50%';
        img.style.height = 'auto';
        img.style.margin = '1.5rem auto';
        img.style.display = 'block';
        
        // 在移动设备上调整
        if (window.innerWidth <= 768) {
            img.style.maxWidth = '80%';
        }
        
        // 添加点击放大功能
        img.onclick = function() {
            console.log('图片被点击');
            // 这里可以添加点击放大功能
        };
    });
    
    console.log('图片样式已应用');
}

// 扩展文章管理器，在显示文章后应用图片样式
const originalDisplayArticle = articleManager.displayArticle;
articleManager.displayArticle = function(articleId) {
    originalDisplayArticle.call(this, articleId);
    
    // 在文章加载后应用样式，添加延迟确保内容已加载
    setTimeout(() => {
        applyImageStyles();
    }, 500);
};

// 导出函数以便其他模块使用
export { applyImageStyles };

export { initializePage }; 