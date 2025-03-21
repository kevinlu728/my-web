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
// 保留原始服务导入，以便在apiService不可用时使用
import { getDatabaseInfo, testApiConnection, getDatabases } from '../services/notionService.js';
import { showStatus } from '../utils/utils.js';
import { categoryManager } from '../managers/categoryManager.js';
import { articleManager } from '../managers/articleManager.js';
import config from '../config/config.js';
import { imageLazyLoader } from '../utils/image-lazy-loader.js';
import { initializeLazyLoading } from '../components/articleRenderer.js';

console.log('🚀 tech-blog.js 开始加载...');

/**
 * 初始化页面
 */
async function initializePage() {
    console.log('开始初始化页面...');
    
    // 检查依赖项
    console.log('检查依赖项：');
    console.log('- imageLazyLoader:', !!imageLazyLoader);
    console.log('- articleManager:', !!articleManager);
    console.log('- categoryManager:', !!categoryManager);
    console.log('- apiService:', !!window.apiService);

    const currentDatabaseId = config.notion.databaseId || config.debug.defaultDatabaseId;
    console.log('当前数据库ID:', currentDatabaseId);

    // 检查API服务可用性
    if (window.apiService) {
        console.log('✅ 检测到apiService，将使用API服务自动选择功能');
        try {
            const apiStatus = await window.apiService.testConnection();
            if (apiStatus.success) {
                console.log('✅ API服务连接成功，使用实现:', apiStatus.implementation);
            } else {
                console.warn('⚠️ API服务连接测试失败，将回退到直接服务调用');
            }
        } catch (error) {
            console.error('❌ API服务测试出错:', error);
        }
    } else {
        console.log('⚠️ 未检测到apiService，将使用直接服务调用');
    }

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
        articleManager.filterAndRenderArticles();
    });

    // 创建API服务包装函数，优先使用apiService，失败时回退到原始服务
    const wrappedGetDatabaseInfo = async (databaseId) => {
        try {
            // 如果apiService可用且提供了getDatabaseInfo方法
            if (window.apiService && typeof window.apiService.getDatabaseInfo === 'function') {
                console.log('通过apiService获取数据库信息');
                return await window.apiService.getDatabaseInfo(databaseId);
            }
            // 回退到原始实现
            console.log('通过原始服务获取数据库信息');
            return await getDatabaseInfo(databaseId);
        } catch (error) {
            console.error('获取数据库信息失败:', error);
            // 确保返回一个合理的结果
            return { success: false, error: error.message };
        }
    };

    const wrappedTestApiConnection = async () => {
        try {
            // 如果apiService可用
            if (window.apiService) {
                console.log('通过apiService测试API连接');
                return await window.apiService.testConnection();
            }
            // 回退到原始实现
            console.log('通过原始服务测试API连接');
            return await testApiConnection();
        } catch (error) {
            console.error('API连接测试失败:', error);
            return { success: false, error: error.message };
        }
    };

    const wrappedGetDatabases = async () => {
        try {
            // 如果apiService可用且提供了getDatabases方法
            if (window.apiService && typeof window.apiService.getDatabases === 'function') {
                console.log('通过apiService获取数据库列表');
                return await window.apiService.getDatabases();
            }
            // 回退到原始实现
            console.log('通过原始服务获取数据库列表');
            return await getDatabases();
        } catch (error) {
            console.error('获取数据库列表失败:', error);
            return { success: false, error: error.message, results: [] };
        }
    };

    // 初始化调试面板
    initDebugPanel(currentDatabaseId, {
        onConfigUpdate: (newDatabaseId) => articleManager.updateDatabaseId(newDatabaseId),
        onRefresh: () => articleManager.loadArticles(),
        showStatus,
        // 使用包装后的API函数
        getDatabaseInfo: wrappedGetDatabaseInfo,
        testApiConnection: wrappedTestApiConnection,
        getDatabases: wrappedGetDatabases
    });

    // 检查URL中是否有指定文章参数
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const articleIdFromUrl = urlParams.get('article');
        
        if (articleIdFromUrl) {
            // 仅当URL中指定了文章ID时才加载文章
            console.log(`从URL参数加载文章: ${articleIdFromUrl}`);
            await articleManager.showArticle(articleIdFromUrl);
        } else {
            // 默认显示欢迎页面
            console.log('显示欢迎页面...');
            articleManager.showWelcomePage();
        }
    } catch (error) {
        console.error('页面初始化过程中出错:', error);
        console.log('显示欢迎页面...');
        articleManager.showWelcomePage();
    }

    console.log('✅ 页面初始化完成！');
    
    // 初始化辅助功能
    setupDebugShortcut();
    initializeHelpPopup();
    initializeArticleSearch();
    initializeArticleList();
    
    // 初始化左栏宽度调整功能
    initializeResizableLeftColumn();
    
    // 为页面图片应用样式（如果有的话）
    applyImageStyles();
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

/**
 * 初始化可调整宽度的左侧栏
 * 允许用户拖动调整左侧导航栏的宽度，实现类似飞书文档的丝滑体验
 */
function initializeResizableLeftColumn() {
    const leftColumn = document.querySelector('.left-column');
    const resizeHandle = document.querySelector('.resize-handle');
    const separatorLine = document.querySelector('.separator-line');
    
    if (!leftColumn || !resizeHandle) {
        console.warn('初始化拖动功能失败: 未找到必要的DOM元素');
        return;
    }
    
    // 从本地存储中获取保存的宽度
    const savedWidth = localStorage.getItem('leftColumnWidth');
    if (savedWidth) {
        try {
            const width = parseInt(savedWidth, 10);
            if (width >= 200 && width <= window.innerWidth * 0.4) {
                leftColumn.style.width = width + 'px';
                leftColumn.style.flex = `0 0 ${width}px`;
            }
        } catch (e) {
            console.error('解析保存的宽度值时出错:', e);
        }
    }
    
    let isResizing = false;
    let startPageX;
    let startWidth;
    
    // 添加特殊的拖动指示器，类似飞书文档
    function showDragIndicator() {
        // 显示分隔线，确保它在全高的区域内可见
        if (separatorLine) {
            separatorLine.style.height = '100%';
            separatorLine.style.opacity = '1';
        }
    }
    
    // 隐藏拖动指示器
    function hideDragIndicator() {
        if (separatorLine) {
            separatorLine.style.opacity = '0.6';
        }
    }
    
    // 双击重置宽度
    resizeHandle.addEventListener('dblclick', () => {
        const defaultWidth = 250;
        leftColumn.style.width = `${defaultWidth}px`;
        leftColumn.style.flex = `0 0 ${defaultWidth}px`;
        localStorage.setItem('leftColumnWidth', String(defaultWidth));
    });
    
    // 处理拖动开始
    function handleDragStart(e) {
        e.preventDefault();
        
        // 如果是触摸事件，获取第一个触摸点
        startPageX = e.pageX || (e.touches && e.touches[0].pageX);
        startWidth = leftColumn.offsetWidth;
        
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        resizeHandle.classList.add('active');
        
        // 显示拖动指示器
        showDragIndicator();
        
        // 添加全局事件监听器
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('touchmove', handleDrag, { passive: false });
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchend', handleDragEnd);
        
        // 阻止文本选择，提升拖动体验
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        document.body.style.msUserSelect = 'none';
    }
    
    // 处理拖动过程
    function handleDrag(e) {
        if (!isResizing) return;
        
        e.preventDefault();
        const pageX = e.pageX || (e.touches && e.touches[0].pageX);
        
        if (!pageX) return;
        
        const deltaX = pageX - startPageX;
        let newWidth = startWidth + deltaX;
        
        // 设置最小和最大宽度限制
        const minWidth = 200;
        const maxWidth = Math.min(window.innerWidth * 0.4, 480); // 最大宽度不超过40%或480px
        
        if (newWidth < minWidth) {
            newWidth = minWidth;
        } else if (newWidth > maxWidth) {
            newWidth = maxWidth;
        }
        
        // 立即应用新宽度，无需动画过渡
        leftColumn.style.transition = 'none';
        leftColumn.style.width = `${newWidth}px`;
        leftColumn.style.flex = `0 0 ${newWidth}px`;
        
        // 请求动画帧以确保平滑渲染
        requestAnimationFrame(() => {
            document.body.style.cursor = 'col-resize';
        });
    }
    
    // 处理拖动结束
    function handleDragEnd() {
        if (!isResizing) return;
        
        isResizing = false;
        document.body.style.cursor = '';
        resizeHandle.classList.remove('active');
        
        // 隐藏拖动指示器
        hideDragIndicator();
        
        // 恢复过渡效果
        leftColumn.style.transition = '';
        
        // 移除全局事件监听器
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('touchmove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchend', handleDragEnd);
        
        // 恢复文本选择功能
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        document.body.style.msUserSelect = '';
        
        // 保存当前宽度到本地存储
        localStorage.setItem('leftColumnWidth', String(leftColumn.offsetWidth));
    }
    
    // 注册事件监听器
    resizeHandle.addEventListener('mousedown', handleDragStart);
    resizeHandle.addEventListener('touchstart', handleDragStart, { passive: false });
    
    // 窗口大小变化时调整
    window.addEventListener('resize', () => {
        const maxWidth = Math.min(window.innerWidth * 0.4, 480);
        const currentWidth = leftColumn.offsetWidth;
        
        if (currentWidth > maxWidth) {
            leftColumn.style.width = `${maxWidth}px`;
            leftColumn.style.flex = `0 0 ${maxWidth}px`;
            localStorage.setItem('leftColumnWidth', String(maxWidth));
        }
    });
}

// 当DOM加载完成时，确保拖动手柄正确初始化
document.addEventListener('DOMContentLoaded', () => {
    // 稍微延迟以确保所有样式已加载
    setTimeout(() => {
        const leftColumn = document.querySelector('.left-column');
        const resizeHandle = document.querySelector('.resize-handle');
        
        if (leftColumn && resizeHandle) {
            // 确保拖动手柄是可见的
            resizeHandle.style.visibility = 'visible';
        }
    }, 100);
});

/**
 * 设置调试模式快捷键
 */
function setupDebugShortcut() {
    // 这个函数在实际代码中应该会被实现
    console.log('setupDebugShortcut: 未实现的函数');
}

/**
 * 初始化帮助弹窗
 */
function initializeHelpPopup() {
    // 这个函数在实际代码中应该会被实现
    console.log('initializeHelpPopup: 未实现的函数');
}

/**
 * 初始化文章搜索功能
 */
function initializeArticleSearch() {
    // 这个函数在实际代码中应该会被实现
    console.log('initializeArticleSearch: 未实现的函数');
}

/**
 * 初始化文章列表
 */
function initializeArticleList() {
    // 这个函数在实际代码中应该会被实现
    console.log('initializeArticleList: 未实现的函数');
}

// 导出函数供外部使用
export { initializePage, applyImageStyles }; 