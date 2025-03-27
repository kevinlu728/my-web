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
// 导入资源加载器
import { resourceLoader } from '../utils/resource-loader.js';
import logger from '../utils/logger.js';

logger.info('🚀 tech-blog.js 开始加载...');

/**
 * 初始化页面
 */
async function initializePage() {
    logger.info('开始初始化页面...');
    
    // 检查依赖项
    logger.info('检查依赖项：');
    logger.info('- imageLazyLoader:', !!imageLazyLoader);
    logger.info('- articleManager:', !!articleManager);
    logger.info('- categoryManager:', !!categoryManager);
    logger.info('- apiService:', !!window.apiService);

    const currentDatabaseId = config.notion.databaseId || config.debug.defaultDatabaseId;
    logger.info('当前数据库ID:', currentDatabaseId);

    // 直接处理加载遮罩
    handleLoadingMask('fade');
    
    // 检查API服务可用性
    if (window.apiService) {
        logger.info('✅ 检测到apiService，将使用API服务自动选择功能');
        try {
            const apiStatus = await window.apiService.testConnection();
            if (apiStatus.success) {
                logger.info('✅ API服务连接成功，使用实现:', apiStatus.implementation);
            } else {
                logger.warn('⚠️ API服务连接测试失败，将回退到直接服务调用');
            }
        } catch (error) {
            logger.error('❌ API服务测试出错:', error);
        }
    } else {
        logger.info('⚠️ 未检测到apiService，将使用直接服务调用');
    }

    // 扩展 articleManager 的显示文章方法
    if (articleManager && articleManager.showArticle) {
        const originalShowArticle = articleManager.showArticle;
        articleManager.showArticle = async function(pageId) {
            logger.info('📄 准备加载文章:', pageId);
            
            // 检查是否已经加载了相同的文章
            const container = document.getElementById('article-container');
            const articleBody = container.querySelector('.article-body');
            
            if (articleBody && articleBody.getAttribute('data-article-id') === pageId) {
                logger.info('文章已加载，跳过重复加载:', pageId);
                return; // 如果已经加载了相同的文章，跳过
            }
            
            // 移除占位内容
            if (container && container.querySelector('.placeholder-content')) {
                logger.info('移除占位内容...');
                // 添加淡出效果
                const placeholder = container.querySelector('.placeholder-content');
                placeholder.style.transition = 'opacity 0.3s ease';
                placeholder.style.opacity = '0';
                
                // 等待淡出动画完成后移除元素
                setTimeout(() => {
                    if (placeholder.parentNode === container) {
                        container.removeChild(placeholder);
                    }
                }, 300);
            }
            
            // 调用原始方法加载文章
            return originalShowArticle.call(this, pageId);
        };
        logger.info('✅ articleManager.showArticle 方法扩展完成');
    } else {
        logger.error('❌ articleManager 或 showArticle 方法未找到');
    }

    // 重写 showWelcomePage 方法，使用新的占位图样式
    if (articleManager && articleManager.showWelcomePage) {
        const originalShowWelcomePage = articleManager.showWelcomePage;
        articleManager.showWelcomePage = function() {
            logger.info('显示欢迎页...');
            
            const container = document.getElementById('article-container');
            if (container) {
                // 检查是否已有内容(不是占位图)
                if (container.querySelector('.welcome-page') || 
                    container.querySelector('.article-body')) {
                    // 如果已经有欢迎页或文章内容，直接返回，避免重复渲染
                    logger.info('已有页面内容，跳过欢迎页重新渲染');
                    return;
                }
                
                // 检查是否已存在占位图
                let placeholder = container.querySelector('.placeholder-content');
                
                // 如果不存在占位图，才创建新的占位图
                if (!placeholder) {
                    container.innerHTML = `
                        <div class="placeholder-content">
                            <div class="placeholder-image"></div>
                            <div class="placeholder-text">正在准备内容</div>
                            <div class="placeholder-hint">欢迎页面加载中，请稍候片刻...</div>
                        </div>
                    `;
                    placeholder = container.querySelector('.placeholder-content');
                }
                
                // 直接调用原始方法显示欢迎页内容，仅保留很短的延迟
                setTimeout(() => {
                    originalShowWelcomePage.call(this);
                }, 100);
            }
        };
        logger.info('✅ articleManager.showWelcomePage 方法扩展完成');
    }

    // 初始化文章管理器
    logger.info('初始化文章管理器...');
    await articleManager.initialize(currentDatabaseId);

    // 设置分类变更回调
    categoryManager.setOnCategoryChange((category) => {
        logger.info('分类变更为:', category);
        articleManager.filterAndRenderArticles();
    });

    // 创建API服务包装函数，优先使用apiService，失败时回退到原始服务
    const wrappedGetDatabaseInfo = async (databaseId) => {
        try {
            // 如果apiService可用且提供了getDatabaseInfo方法
            if (window.apiService && typeof window.apiService.getDatabaseInfo === 'function') {
                logger.info('通过apiService获取数据库信息');
                return await window.apiService.getDatabaseInfo(databaseId);
            }
            // 回退到原始实现
            logger.info('通过原始服务获取数据库信息');
            return await getDatabaseInfo(databaseId);
        } catch (error) {
            logger.error('获取数据库信息失败:', error);
            // 确保返回一个合理的结果
            return { success: false, error: error.message };
        }
    };

    const wrappedTestApiConnection = async () => {
        try {
            // 如果apiService可用
            if (window.apiService) {
                logger.info('通过apiService测试API连接');
                return await window.apiService.testConnection();
            }
            // 回退到原始实现
            logger.info('通过原始服务测试API连接');
            return await testApiConnection();
        } catch (error) {
            logger.error('API连接测试失败:', error);
            return { success: false, error: error.message };
        }
    };

    const wrappedGetDatabases = async () => {
        try {
            // 如果apiService可用且提供了getDatabases方法
            if (window.apiService && typeof window.apiService.getDatabases === 'function') {
                logger.info('通过apiService获取数据库列表');
                return await window.apiService.getDatabases();
            }
            // 回退到原始实现
            logger.info('通过原始服务获取数据库列表');
            return await getDatabases();
        } catch (error) {
            logger.error('获取数据库列表失败:', error);
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
            logger.info(`从URL参数加载文章: ${articleIdFromUrl}`);
            await articleManager.showArticle(articleIdFromUrl);
        } else {
            // 确保文章数据已加载完成后再显示欢迎页面
            logger.info('确保文章数据已加载后显示欢迎页面...');
            // 如果还没有文章数据，先加载文章
            if (!articleManager.articles || articleManager.articles.length === 0) {
                logger.info('文章数据尚未加载，先加载文章数据...');
                await articleManager.loadArticles();
            }
            // 显示欢迎页面
            logger.info('显示欢迎页面...');
            articleManager.showWelcomePage();
        }
    } catch (error) {
        logger.error('页面初始化过程中出错:', error);
        // 即使出错，也尝试加载文章数据再显示欢迎页面
        if (!articleManager.articles || articleManager.articles.length === 0) {
            try {
                await articleManager.loadArticles();
            } catch (loadError) {
                logger.error('加载文章数据出错:', loadError);
            }
        }
        articleManager.showWelcomePage();
    }

    logger.info('✅ 页面初始化完成！');
    
    // 初始化辅助功能
    setupDebugShortcut();
    initializeHelpPopup();
    initializeArticleSearch();
    initializeArticleList();
    
    // 初始化左栏宽度调整功能
    initializeResizableLeftColumn();
    
    // 为页面图片应用样式（如果有的话）
    applyImageStyles();
    
    // 彻底移除加载遮罩
    handleLoadingMask('remove');
    
    // 清除"正在初始化页面..."的状态消息
    showStatus('', false);
}

// 导出显示文章的全局函数
window.showArticle = async (pageId) => {
    logger.info('🔄 调用全局 showArticle 函数:', pageId);
    return articleManager.showArticle(pageId);
};

// 设置一个标志来跟踪初始化是否已完成
let pageInitialized = false;

// 页面加载完成后初始化
window.addEventListener('load', () => {
    logger.info('📃 页面加载完成，开始初始化...');
    
    // 避免重复初始化
    if (pageInitialized) {
        logger.info('页面已经初始化，跳过重复初始化');
        return;
    }
    
    // 显示加载状态提示
    showStatus('正在初始化页面...', false);
    
    // 监听资源加载器的内容解锁事件
    document.addEventListener('content-unblocked', () => {
        logger.info('🎉 内容已解锁，开始初始化页面');
        // 初始化页面
        initializePage().catch(error => {
            logger.error('❌ 初始化失败:', error);
            showStatus('页面初始化失败，请刷新重试', true, 'error');
        }).finally(() => {
            // 初始化完成，设置标志
            pageInitialized = true;
            
            // 清除加载状态消息
            showStatus('', false);
        });
    }, { once: true });
    
    // 检查是否使用资源加载器解锁了内容
    if (window.contentUnblocked) {
        logger.info('内容已经被解锁，立即初始化页面');
        // 触发内容解锁事件
        document.dispatchEvent(new Event('content-unblocked'));
    } else {
        logger.info('等待内容解锁事件...');
        // 增加超时保护，防止事件未触发
        setTimeout(() => {
            if (!pageInitialized) {
                logger.warn('⚠️ 内容解锁事件在10秒内未触发，强制初始化页面');
                document.dispatchEvent(new Event('content-unblocked'));
            }
        }, 10000);
    }
    
    // 添加返回顶部按钮
    initializeBackToTop();
});

// 如果 articleManager 有一个 displayArticleContent 方法
// 我们需要覆盖它以处理图片
if (typeof articleManager.displayArticleContent === 'function') {
    const originalDisplayContent = articleManager.displayArticleContent;
    articleManager.displayArticleContent = function(article) {
        if (article && article.content) {
            logger.info('🔄 准备处理文章内容中的图片...');
            // 处理 HTML 内容中的图片
            article.content = imageLazyLoader.processHTMLContent(article.content);
        }
        
        // 调用原始方法
        const result = originalDisplayContent.call(this, article);
        
        // 在内容显示后处理图片懒加载和代码块懒加载
        setTimeout(() => {
            const articleBody = document.querySelector('.article-body');
            if (articleBody) {
                logger.info('🖼️ 开始处理新加载的文章图片...');
                imageLazyLoader.processImages(articleBody);
                
                logger.info('🔄 初始化代码块和表格懒加载...');
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
    logger.info('正在应用文章图片样式...');
    const images = document.querySelectorAll('.article-body img');
    logger.info(`找到 ${images.length} 张文章图片`);
    
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
            logger.info('图片被点击');
            // 这里可以添加点击放大功能
        };
    });
    
    logger.info('图片样式已应用');
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
        logger.warn('初始化拖动功能失败: 未找到必要的DOM元素');
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
                
                // 同时初始化拖动手柄和右栏的位置
                const leftPadding = 15; // 左侧内边距
                const handleWidth = 3; // 拖动手柄宽度（从6px减小到3px）
                
                // 初始化拖动手柄位置
                if (resizeHandle) {
                    resizeHandle.style.left = `${leftPadding + width}px`;
                }
                
                // 初始化右栏的左边距
                const rightColumn = document.querySelector('.right-column');
                if (rightColumn) {
                    rightColumn.style.marginLeft = `${leftPadding + width + handleWidth}px`;
                }
            }
        } catch (e) {
            logger.error('解析保存的宽度值时出错:', e);
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
        
        // 同时更新拖动手柄和右栏的位置
        const leftPadding = 15; // 左侧内边距
        const handleWidth = 3; // 拖动手柄宽度（从6px减小到3px）
        
        // 更新拖动手柄位置
        if (resizeHandle) {
            resizeHandle.style.left = `${leftPadding + defaultWidth}px`;
        }
        
        // 更新右栏的左边距
        const rightColumn = document.querySelector('.right-column');
        if (rightColumn) {
            rightColumn.style.marginLeft = `${leftPadding + defaultWidth + handleWidth}px`;
        }
        
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
        
        // 同时更新拖动手柄和右栏的位置
        const leftPadding = 15; // 左侧内边距
        const handleWidth = 3; // 恢复原始拖动手柄宽度
        
        // 更新拖动手柄位置
        if (resizeHandle) {
            resizeHandle.style.transition = 'none';
            resizeHandle.style.left = `${leftPadding + newWidth}px`;
        }
        
        // 更新右栏的左边距
        const rightColumn = document.querySelector('.right-column');
        if (rightColumn) {
            rightColumn.style.transition = 'none';
            rightColumn.style.marginLeft = `${leftPadding + newWidth + handleWidth}px`;
        }
        
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
        
        // 恢复拖动手柄和右栏的过渡效果
        if (resizeHandle) {
            resizeHandle.style.transition = '';
        }
        
        const rightColumn = document.querySelector('.right-column');
        if (rightColumn) {
            rightColumn.style.transition = '';
        }
        
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
    logger.info('setupDebugShortcut: 未实现的函数');
}

/**
 * 初始化帮助弹窗
 */
function initializeHelpPopup() {
    // 这个函数在实际代码中应该会被实现
    logger.info('initializeHelpPopup: 未实现的函数');
}

/**
 * 初始化文章搜索功能
 */
function initializeArticleSearch() {
    // 这个函数在实际代码中应该会被实现
    logger.info('initializeArticleSearch: 未实现的函数');
}

/**
 * 初始化文章列表
 */
function initializeArticleList() {
    // 这个函数在实际代码中应该会被实现
    logger.info('initializeArticleList: 未实现的函数');
}

/**
 * 初始化返回顶部按钮
 * 当页面滚动超过一定距离时显示按钮，点击按钮可平滑回到顶部
 */
function initializeBackToTop() {
    logger.info('初始化返回顶部按钮...');
    
    // 创建按钮元素
    const backToTopBtn = document.createElement('div');
    backToTopBtn.className = 'back-to-top';
    backToTopBtn.innerHTML = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.41 15.41L12 10.83L16.59 15.41L18 14L12 8L6 14L7.41 15.41Z"/>
        </svg>
    `;
    document.body.appendChild(backToTopBtn);
    
    // 检查按钮是否添加成功
    if (!document.querySelector('.back-to-top')) {
        logger.error('返回顶部按钮创建失败');
        return;
    }
    
    logger.info('✅ 返回顶部按钮创建成功');
    
    // 监听滚动事件，控制按钮显示隐藏
    let scrollThreshold = 300; // 滚动超过300px显示按钮
    let scrollingTimer;
    
    window.addEventListener('scroll', () => {
        clearTimeout(scrollingTimer);
        
        // 检查是否超过阈值
        if (window.scrollY > scrollThreshold) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
        
        // 延迟一段时间后检查是否停止滚动
        scrollingTimer = setTimeout(() => {
            // 这里可以添加额外的逻辑，比如一段时间不滚动后隐藏按钮
        }, 200);
    });
    
    // 点击按钮回到顶部
    backToTopBtn.addEventListener('click', () => {
        logger.info('点击返回顶部');
        
        // 平滑滚动回顶部
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // 聚焦到页面顶部的元素（可选）
        const firstFocusableElement = document.querySelector('h1, h2, p, .article-title');
        if (firstFocusableElement) {
            setTimeout(() => {
                firstFocusableElement.setAttribute('tabindex', '-1');
                firstFocusableElement.focus();
                
                // 移除tabindex，保持DOM干净
                setTimeout(() => {
                    firstFocusableElement.removeAttribute('tabindex');
                }, 100);
            }, 500);
        }
    });
    
    logger.info('✅ 返回顶部按钮初始化完成');
}

/**
 * 处理加载遮罩
 * @param {string} action - 'fade' 淡出遮罩，'remove' 彻底移除遮罩
 */
function handleLoadingMask(action = 'fade') {
    const container = document.getElementById('article-container');
    if (!container) {
        logger.warn('未找到文章容器，无法处理加载遮罩');
        return;
    }
    
    const placeholder = container.querySelector('.placeholder-content');
    if (!placeholder) {
        logger.info('加载占位内容不存在或已被移除');
        return;
    }
    
    if (action === 'fade') {
        logger.info('淡出加载占位内容...');
        placeholder.style.transition = 'opacity 0.5s ease';
        placeholder.style.opacity = '0.5'; // 降低不透明度但不完全隐藏
    } else if (action === 'remove') {
        logger.info('彻底移除加载占位内容...');
        // 先确保淡出效果完成
        placeholder.style.transition = 'opacity 0.5s ease';
        placeholder.style.opacity = '0';
        
        // 延迟移除元素，等待淡出动画完成
        setTimeout(() => {
            if (placeholder.parentNode) {
                placeholder.parentNode.removeChild(placeholder);
            }
        }, 550);
    }
}

// 预加载关键资源，使用资源加载器的非阻塞加载机制
function preloadCriticalResources() {
    // 检查资源加载器是否可用
    if (!resourceLoader) {
        logger.warn('⚠️ 资源加载器不可用，跳过预加载');
        return;
    }

    logger.info('🔍 使用非阻塞方式加载关键资源...');
    
    try {
        // 调用资源加载器的非阻塞核心内容加载
        resourceLoader.loadNonBlockingCoreContent();
        logger.info('✅ 非阻塞核心内容加载已启动');
    } catch (error) {
        logger.error('❌ 非阻塞资源加载失败:', error);
        // 设置全局标志，指示内容已解锁，以便初始化可以继续
        window.contentUnblocked = true;
    }
}

// 在页面DOM加载完成后预加载关键资源
document.addEventListener('DOMContentLoaded', () => {
    logger.info('DOM内容已加载，准备预加载关键资源');
    preloadCriticalResources();
});

// 导出函数供外部使用
export { initializePage, applyImageStyles }; 