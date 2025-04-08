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
// 保留原始服务导入，以便在apiService不可用时使用
import { getDatabaseInfo, testApiConnection, getDatabases } from '../services/notionService.js';
import { resourceManager } from '../resource/resourceManager.js';
import { articleManager } from './articleManager.js';
import { categoryManager } from './categoryManager.js';
import { welcomePageManager } from './welcomePageManager.js';
import { contentViewManager, ViewMode } from './contentViewManager.js';
import { initializeLazyLoading } from './articleRenderer.js';
import { imageLazyLoader } from './imageLazyLoader.js';
import { scrollToTop } from '../components/scrollbar.js';
import { initDebugPanel } from '../components/debugPanel.js';

// 导入工具函数
import { showStatus, showError } from '../utils/common-utils.js';
import logger from '../utils/logger.js';

logger.info('🚀 tech-blog.js 开始加载...');

// 在页面DOM加载完成后预加载关键资源
document.addEventListener('DOMContentLoaded', () => {
    logger.info('DOM内容已加载，准备预加载关键资源');
    preloadCriticalResources();
});

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

// 在预加载关键资源函数中添加欢迎页面骨架屏相关资源
function preloadCriticalResources() {
    try {
        // 检查资源加载器是否可用
        if (!resourceManager) {
            logger.warn('⚠️ 资源加载器不可用，跳过预加载');
            // 设置全局标志，指示内容已解锁
            window.contentUnblocked = true;
            document.dispatchEvent(new Event('content-unblocked'));
            return;
        }

        logger.info('🔍 使用非阻塞方式加载关键资源...');
        
        // 检查方法是否存在
        if (typeof resourceManager.loadNonBlockingCoreContent !== 'function') {
            throw new Error('资源加载器中缺少loadNonBlockingCoreContent方法');
        }
        
        // 调用资源加载器的非阻塞核心内容加载
        resourceManager.loadNonBlockingCoreContent()
            .then(() => {
                logger.info('✅ 非阻塞核心内容加载已完成');
                
                // 预加载欢迎页面数据
                welcomePageManager.preloadWelcomePageData();
            })
            .catch(error => {
                logger.error('❌ 非阻塞资源加载失败:', error.message);
                // 确保内容已解锁，以便初始化可以继续
                window.contentUnblocked = true;
                document.dispatchEvent(new Event('content-unblocked'));
            });
    } catch (error) {
        // 捕获同步错误
        logger.error('❌ 非阻塞资源加载初始化失败:', error.message);
        // 设置全局标志，指示内容已解锁，以便初始化可以继续
        window.contentUnblocked = true;
        document.dispatchEvent(new Event('content-unblocked'));
    }
}

/**
 * 初始化页面
 * @param {boolean} forceApiTest - 是否强制检查API可用性
 * @returns {Promise<void>}
 */
export async function initializePage(forceApiTest = false) {
    try {
        // 防止重复初始化 - 添加初始化锁
        if (window._pageInitializing === true) {
            logger.info('页面正在初始化中，跳过重复初始化');
            return;
        }
        
        // 设置初始化锁
        window._pageInitializing = true;
        
        // 检查是否已经初始化
        if (window.blogPageInitialized && !forceApiTest) {
            logger.info('页面已初始化，跳过初始化过程');
            window._pageInitializing = false; // 释放锁
            return;
        }

        // 设置状态
        window.blogPageInitialized = true;
        window.blogPageLoading = true;

        try {
            logger.info('初始化技术博客页面...');
            
            // 添加环境类名到body元素
            const config = window.config || {};
            if (config.getEnvironment) {
                const env = config.getEnvironment();
                document.body.classList.add(env);
                logger.info(`当前环境: ${env}`);
            }
            
            // 检查依赖项
            logger.info('检查依赖项：');
            logger.info('- imageLazyLoader:', !!imageLazyLoader);
            logger.info('- articleManager:', !!articleManager);
            logger.info('- categoryManager:', !!categoryManager);
            logger.info('- apiService:', !!window.apiService);

            // 初始化返回顶部按钮
            initializeBackToTop();
            
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

            // 重写 showWelcomePage 方法，使用新的占位图样式
            if (articleManager && articleManager.showWelcomePage) {
                const originalShowWelcomePage = articleManager.showWelcomePage;
                articleManager.showWelcomePage = function() {
                    logger.info('显示欢迎页面 (使用视图管理器和欢迎页管理器)');
                    
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

            // 初始化欢迎页面管理器
            logger.info('初始化欢迎页面管理器...');
            welcomePageManager.initialize({
                getArticles: () => articleManager.getArticles(),
                onCategorySelect: (category) => {
                    categoryManager.selectCategory(category);
                },
                onArticleSelect: (articleId) => {
                    articleManager.showArticle(articleId);
                }
            });

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
                    // 视图管理器会自动处理视图模式
                    determineInitialViewState();
                    // 委托给欢迎页管理器处理
                    welcomePageManager.ensureArticleDataAndShowWelcome(() => articleManager.loadArticles());
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
            
            // 修复FontAwesome图标显示 - 移至此处执行，确保DOM已加载完毕
            fixFontAwesomeIcons();
            
            // 彻底移除加载遮罩
            handleLoadingMask('remove');
            
            // 清除"正在初始化页面..."的状态消息
            showStatus('', false);

            // 初始化内容视图管理器
            logger.info('初始化内容视图管理器...');
            contentViewManager.initialize('article-container');

            // 监听视图模式变化
            document.getElementById('article-container')?.addEventListener('viewModeChanged', (event) => {
                logger.info(`内容视图模式已变更: ${event.detail.previousMode} -> ${event.detail.mode}`);
            });

            // 在contentViewManager初始化后调用
            determineInitialViewState();
        } catch (error) {
            logger.error('初始化页面时出错:', error);
            window.blogPageLoading = false;
            throw error;
        } finally {
            // 释放初始化锁
            window._pageInitializing = false;
        }
    } catch (error) {
        logger.error('页面初始化过程中发生严重错误:', error);
        showError('页面初始化失败，请稍后重试');
        window._pageInitializing = false; // 确保锁总是释放
        throw error;
    }
}

/**
 * 修复FontAwesome图标显示问题
 * 确保树状列表中的图标正确使用FontAwesome而非Unicode，并添加平滑旋转动画
 */
function fixFontAwesomeIcons() {
    // 监听DOM变化，确保在图标创建后应用正确样式
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                // 查找新添加的树形图标
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // 元素节点
                        const icons = node.querySelectorAll ? 
                            node.querySelectorAll('.tree-toggle i') : [];
                        
                        if (icons.length > 0) {
                            icons.forEach(applyFontAwesomeStyle);
                        } else if (node.classList && node.classList.contains('fas')) {
                            applyFontAwesomeStyle(node);
                        }
                    }
                });
            }
        });
    });
    
    // 监视整个文档，特别是树形容器区域
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
    
    // 立即处理已有的图标
    setTimeout(() => {
        document.querySelectorAll('.tree-toggle i').forEach(applyFontAwesomeStyle);
        logger.info('✅ 已应用FontAwesome样式到现有图标');
    }, 100);
    
    // 处理单个图标元素
    function applyFontAwesomeStyle(icon) {
        if (!icon) return;
        
        // 确保使用FontAwesome字体
        icon.style.fontFamily = '"Font Awesome 6 Free", FontAwesome, sans-serif';
        icon.style.fontWeight = '900';
        icon.style.display = 'inline-block';
        
        // 确保内容为空，让FontAwesome的默认图标机制生效
        if (icon.innerHTML === '▶' || icon.innerHTML === '▼') {
            icon.innerHTML = '';
        }
        
        // 确保有正确的基础类名
        if (icon.parentNode && icon.parentNode.classList.contains('tree-toggle')) {
            if (!icon.classList.contains('fas')) {
                icon.classList.add('fas');
            }
            
            // 统一使用fa-chevron-right，方向通过CSS旋转控制
            if (!icon.classList.contains('fa-chevron-right')) {
                icon.classList.remove('fa-chevron-down'); // 移除任何向下箭头类
                icon.classList.add('fa-chevron-right');   // 统一使用向右箭头类
            }
        }
    }
}

// 导出显示文章的全局函数
window.showArticle = async (pageId) => {
    logger.info('🔄 调用全局 showArticle 函数:', pageId);
    return articleManager.showArticle(pageId);
};

// 设置一个标志来跟踪初始化是否已完成
let pageInitialized = false;



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
            separatorLine.style.opacity = '0'; // 恢复到低不透明度状态
        }
    }
    
    // 双击重置宽度
    resizeHandle.addEventListener('dblclick', () => {
        const defaultWidth = 300;
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
        const separatorLine = document.querySelector('.separator-line');
        
        if (leftColumn && resizeHandle) {
            // 确保拖动手柄是可见的 - 直接设置内联样式以确保优先级最高
            resizeHandle.style.visibility = 'visible';
            resizeHandle.style.cursor = 'col-resize';
            
            if (separatorLine) {
                separatorLine.style.width = '3px';
                separatorLine.style.backgroundColor = '#77a0ff';
            }
            
            logger.info('✅ 拖动手柄初始化完成，设置为低可见度状态');
        } else {
            logger.warn('⚠️ 未找到拖动手柄或左侧栏元素，无法初始化');
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
 */
function initializeBackToTop() {
    logger.info('初始化返回顶部按钮...');
    
    // 检查是否已存在返回顶部按钮，避免重复创建
    if (document.querySelector('.back-to-top')) {
        logger.info('返回顶部按钮已存在，跳过创建');
        return;
    }
    
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
    
    logger.debug('✅ 返回顶部按钮创建成功');
    
    // 点击按钮回到顶部，使用scrollToTop函数
    backToTopBtn.addEventListener('click', () => {
        logger.info('点击返回顶部');
        
        // 使用scrollToTop处理滚动行为
        if (typeof scrollToTop === 'function') {
            scrollToTop(true); // 使用平滑滚动
        } else {
            // 回退方案：使用默认滚动
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
        
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
    
    logger.debug('✅ 返回顶部按钮初始化完成');
    
    // 注意：按钮的显示/隐藏现在由scrollbar.js中的滚动事件处理
}

/**
 * 处理加载遮罩
 * @param {string} action - 'fade' 淡出遮罩，'remove' 彻底移除遮罩
 */
function handleLoadingMask(action = 'fade') {
    // 使用视图管理器控制加载状态
    if (action === 'fade') {
        contentViewManager.setMode(ViewMode.LOADING);
    } else if (action === 'remove') {
        // 根据当前状态设置适当的模式
        determineInitialViewState();
    }
}

// 在初始化流程中添加
function determineInitialViewState() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('article');
        
        if (articleId) {
            contentViewManager.setMode(ViewMode.ARTICLE);
        } else {
            contentViewManager.setMode(ViewMode.WELCOME);
        }
    } catch (error) {
        logger.error('确定初始视图状态时出错:', error);
        // 出错时默认设置为欢迎页模式
        try {
            contentViewManager.setMode('welcome');
        } catch (e) {
            // 忽略二次错误
        }
    }
} 