/**
 * @file tech-blog.js
 * @description 技术博客页面主控制器，负责整体页面生命周期和状态管理
 * @author 陆凯
 * @version 1.2.0
 * @created 2024-03-09
 * @updated 2024-05-15
 * 
 * 该模块是博客应用的核心控制器，负责以下功能：
 * 1. 页面生命周期管理：初始化、加载和状态转换
 * 2. 组件协调：协调文章管理器、分类管理器和视图管理器
 * 3. 状态管理：通过统一的 pageState 对象管理应用状态
 * 4. 资源加载：预加载核心资源，确保页面性能
 * 5. 事件处理：初始化和处理视图事件
 * 6. 视图控制：管理不同视图状态间的转换
 * 7. 辅助功能：提供UI增强和修复
 * 
 * 该模块不直接处理文章内容和分类列表，这些由专门的管理器负责。
 * 而是通过事件通信和API调用来协调这些模块的工作。
 * 
 */

import { getDatabaseInfo, testApiConnection, getDatabases } from '../services/notionService.js';
import { resourceManager } from '../resource/resourceManager.js';
import { articleManager } from './articleManager.js';
import { categoryManager } from './categoryManager.js';
import { welcomePageManager } from './welcomePageManager.js';
import { contentViewManager, ViewMode, ViewEvents } from './contentViewManager.js';
import { imageLazyLoader } from './imageLazyLoader.js';
import { scrollToTop } from '../components/scrollbar.js';
import { initDebugPanel } from '../components/debugPanel.js';

import { showStatus, showError } from '../utils/common-utils.js';
import logger from '../utils/logger.js';

logger.info('🚀 tech-blog.js 开始加载...');

/**
 * 创建全局页面状态对象，统一管理页面状态
 */
window.pageState = {
    initialized: false,  // 页面是否已初始化
    initializing: false, // 页面是否正在初始化
    loading: false,      // 页面是否正在加载内容
    error: null          // 出错信息
};

/**
 * 当DOM结构加载完成时执行的初始化操作
 */
document.addEventListener('DOMContentLoaded', () => {
    logger.info('DOM内容已加载，开始初始化...');
    
    // 1. 预加载关键资源
    preloadCriticalResources();
    
    // 2. 初始化拖动手柄。稍微延迟以确保所有样式已加载
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
 * 当页面完全加载后执行的操作
 */
window.addEventListener('load', () => {
    logger.info('📃 页面加载完成，开始初始化...');
    
    // 避免重复初始化 - 使用统一的状态变量
    if (window.pageState.initialized) {
        logger.info('页面已经初始化，跳过重复初始化');
        return;
    }
    
    showStatus('正在初始化页面...', false);
    
    // 监听资源加载器的内容解锁事件
    document.addEventListener('content-unblocked', () => {
        logger.info('🎉 内容已解锁，开始初始化页面');
        // 初始化页面
        initializePage().catch(error => {
            logger.error('❌ 初始化失败:', error);
            showStatus('页面初始化失败，请刷新重试', true, 'error');
            window.pageState.error = error;
        }).finally(() => {
            // 初始化完成，设置统一状态标志
            window.pageState.initialized = true;
            window.pageState.initializing = false;
            
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
            if (!window.pageState.initialized) {
                logger.warn('⚠️ 内容解锁事件在10秒内未触发，强制初始化页面');
                document.dispatchEvent(new Event('content-unblocked'));
            }
        }, 10000);
    }
});

/**
 * 预加载核心资源并解锁内容
 * 通过资源管理器加载关键CSS和JS资源，然后初始化欢迎页面
 */
function preloadCriticalResources() {
    // 如果资源管理器不可用，立即解锁内容并返回
    if (!resourceManager || typeof resourceManager.loadNonBlockingCoreContent !== 'function') {
        logger.warn('⚠️ 资源管理器不可用或缺少必要方法，跳过预加载');
        unlockContent();
        return;
    }

    logger.info('🔍 开始非阻塞方式加载关键资源...');
    
    // 使用资源管理器加载核心内容
    resourceManager.loadNonBlockingCoreContent()
        .then(() => {
            logger.info('✅ 核心资源加载完成，预加载欢迎页面数据');
            welcomePageManager.preloadWelcomePageData();
        })
        .catch(error => {
            logger.error('❌ 核心资源加载失败:', error.message);
            unlockContent();
        });
}

/**
 * 解锁内容并触发内容解锁事件
 * 在资源加载失败或不可用时使用此函数
 */
function unlockContent() {
    window.contentUnblocked = true;
    document.dispatchEvent(new Event('content-unblocked'));
}

/**
 * 初始化技术博客页面
 * @param {boolean} forceApiTest 是否强制进行API测试
 * @returns {Promise<void>}
 */
export async function initializePage(forceApiTest = false) {
    // ===== 锁检查和初始状态设置 =====
    // 防止重复初始化 - 使用统一的状态锁
    if (window.pageState.initializing) {
        logger.info('页面正在初始化中，跳过重复初始化');
        return;
    }
    
    // 设置初始化锁
    window.pageState.initializing = true;
    
    try {
        // 检查是否已经初始化 - 使用统一的状态变量
        if (window.pageState.initialized && !forceApiTest) {
            logger.info('页面已初始化，跳过初始化过程');
            window.pageState.initializing = false; // 释放锁
            return;
        }

        // 设置状态 - 使用统一的状态变量
        window.pageState.loading = true;

        // ===== 1. 环境准备和基础设置 =====
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
        logger.info('- articleManager:', !!articleManager);
        logger.info('- categoryManager:', !!categoryManager);
        logger.info('- imageLazyLoader:', !!imageLazyLoader);
        logger.info('- apiService:', !!window.apiService);
        
        const currentDatabaseId = config.notion.databaseId || config.debug.defaultDatabaseId;
        logger.info('当前数据库ID:', currentDatabaseId);


        // 初始化内容视图管理器，下面需要使用
        contentViewManager.initialize('article-container');

        // 更新视图状态
        updateViewState('loading');
        
        // ===== 2. API服务检查和包装 =====
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
        
        // ===== 3. 核心组件初始化 =====
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
        
        // ===== 4. 内容显示处理 =====
        // 检查URL中是否有指定文章参数
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const articleIdFromUrl = urlParams.get('article');
            
            if (articleIdFromUrl) {
                // 仅当URL中指定了文章ID时才加载文章
                logger.info(`从URL参数加载文章: ${articleIdFromUrl}`);
                await articleManager.showArticle(articleIdFromUrl);
            } else {
                // 更新视图状态
                updateViewState('auto');
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
        
        // ===== 5. 辅助功能初始化 =====
        logger.info('✅ 页面初始化完成！开始初始化辅助功能...');
        
        // 初始化视图事件
        initializeViewEvents();

        // 初始化左栏宽度调整功能
        initializeResizableLeftColumn();
        
        // 初始化返回顶部按钮
        initializeBackToTop();
        
        // 修复FontAwesome图标显示 - 移至此处执行，确保DOM已加载完毕
        fixFontAwesomeIcons();
        
        // ===== 6. 收尾工作 =====
        // 更新视图状态
        updateViewState('auto');
        
        // 清除"正在初始化页面..."的状态消息
        showStatus('', false);

        // 监听视图模式变化
        document.getElementById('article-container')?.addEventListener('viewModeChanged', (event) => {
            logger.info(`内容视图模式已变更: ${event.detail.previousMode} -> ${event.detail.mode}`);
        });

    } catch (error) {
        // 统一错误处理
        logger.error('页面初始化过程中发生错误:', error.message);
 
        // 重置状态标志 - 使用统一的状态变量
        window.pageState.loading = false;
        window.pageState.error = error;
        
        // 错误分类处理（可选）
        if (error.name === 'NetworkError') {
            logger.error('网络连接错误，请检查网络连接');
            showStatus('网络连接失败，请检查您的网络设置', true, 'error');
        } else if (error.name === 'DataError') {
            logger.error('数据加载错误:', error.message);
            showStatus('加载数据时出错，请稍后再试', true, 'error');
        } else {
            logger.error('其它类型错误:', error.message);
            showError('页面初始化失败，请稍后重试');
        }
        
        // 此处不再抛出错误，让调用者通过Promise.catch捕获
    } finally {
        // 确保在所有情况下都释放锁 - 使用统一的状态变量
        window.pageState.initializing = false;
    }
}

function initializeViewEvents() {
    logger.info('初始化视图事件监听...');
    
    // 注册视图事件处理程序
    contentViewManager.on(ViewEvents.BEFORE_WELCOME, (e) => {
        const container = document.getElementById('article-container');
        if (!container) return;
        
        // 检查是否已有内容(不是占位图)
        if (container.querySelector('.welcome-page') || 
            container.querySelector('.article-body')) {
            logger.info('已有页面内容，跳过欢迎页重新渲染');
            return;
        }
        
        // 如果需要加载欢迎页，准备视图状态
        logger.info('准备显示欢迎页面...');
    });
    
    contentViewManager.on(ViewEvents.LOADING_START, (e) => {
        // 显示加载状态
        showStatus('正在加载内容...', false);
    });
    
    contentViewManager.on(ViewEvents.LOADING_END, (e) => {
        // 隐藏加载状态
        showStatus('', false);
    });
    
    // 监听文章内容显示前事件
    contentViewManager.on(ViewEvents.BEFORE_ARTICLE, (e) => {
        const articleId = e.detail.articleId;
        logger.info(`准备显示文章: ${articleId}`);
        
        // 移除此处的URL更新，因为articleManager.js中已经处理了
        // updateBrowserHistory(articleId);
    });
    
    // 监听视图模式变更
    contentViewManager.on(ViewEvents.MODE_CHANGED, (e) => {
        logger.info(`视图模式已变更: ${e.detail.previousMode} -> ${e.detail.mode}`);
    });

    // 修改文章内容显示后的事件处理，添加标记防止循环
    contentViewManager.on(ViewEvents.AFTER_ARTICLE, (e) => {
        // 使用一个标记来防止重复处理
        const articleId = e.detail.articleId;
        const processingKey = `article_processed_${articleId}`;
        
        // 检查是否已经处理过这篇文章
        if (window[processingKey]) {
            logger.debug(`文章 ${articleId} 已处理过样式，跳过`);
            return;
        }
        
        logger.info('文章内容已显示，应用图片样式');
        const articleBody = document.querySelector('.article-body');
        if (articleBody) {
            imageLazyLoader.applyArticleImageStyles(articleBody);
            // 设置标记，表示已处理
            window[processingKey] = true;
            
            // 清理标记（可选，防止内存泄漏）
            setTimeout(() => {
                delete window[processingKey];
            }, 5000); // 5秒后清理
        }
    });
}

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
 * 更新视图状态 - 添加状态检查防止循环
 */
function updateViewState(state = 'auto') {
    try {
        logger.debug(`准备更新视图状态: ${state}`);
        
        // 获取当前状态以避免无意义的重复设置
        const currentMode = contentViewManager.getCurrentMode();
        
        // 处理'loading'状态
        if (state === 'loading') {
            // 避免重复设置加载状态
            if (currentMode === ViewMode.LOADING) {
                logger.debug('已经是加载状态，跳过重复设置');
                return;
            }
            contentViewManager.setMode(ViewMode.LOADING);
            return;
        }
        
        // 处理'auto'状态
        if (state === 'auto') {
            const urlParams = new URLSearchParams(window.location.search);
            const articleId = urlParams.get('article');
            
            // 如果有文章ID且当前不是文章模式，设置为文章模式
            if (articleId && currentMode !== ViewMode.ARTICLE) {
                contentViewManager.setMode(ViewMode.ARTICLE);
            } 
            // 如果没有文章ID且当前不是欢迎模式，设置为欢迎模式
            else if (!articleId && currentMode !== ViewMode.WELCOME) {
                contentViewManager.setMode(ViewMode.WELCOME);
            } else {
                logger.debug(`当前已是正确模式(${currentMode})，跳过状态更新`);
            }
            return;
        }
        
        // 处理特定的ViewMode值
        if (Object.values(ViewMode).includes(state)) {
            // 避免重复设置相同状态
            if (currentMode === state) {
                logger.debug(`已经是${state}状态，跳过重复设置`);
                return;
            }
            contentViewManager.setMode(state);
        } else {
            logger.warn(`未知的视图状态: ${state}，保持当前状态`);
        }
    } catch (error) {
        logger.error('更新视图状态时出错:', error);
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