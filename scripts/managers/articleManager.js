/**
 * @file articleManager.js
 * @description 文章管理器，负责文章数据的获取、缓存和渲染
 * @author 陆凯
 * @version 3.0.0
 * @created 2024-03-09
 * @updated 2024-03-26
 * 
 * 该模块是网站文章功能的核心管理器，负责：
 * - 从API获取文章列表和详情
 * - 处理文章的渲染和显示
 * - 实现文章的分页和加载更多功能
 * - 处理文章的分类和筛选
 * 
 * 主要方法：
 * - loadArticles: 加载文章列表
 * - displayArticle: 显示单篇文章
 * - loadAndDisplayArticle: 加载并显示文章
 * - filterArticlesByCategory: 按分类筛选文章
 * 
 * 该模块依赖于notionService.js获取数据，依赖于articleRenderer.js渲染内容。
 * 搜索功能已移至articleSearchManager.js模块。
 */

import { showStatus, showLoading, showError } from '../utils/utils.js';
import { getArticles, getArticleContent } from '../services/notionService.js';
import { categoryManager } from './categoryManager.js';
import { renderNotionBlocks, initializeLazyLoading } from '../components/articleRenderer.js';

// 导入工具函数
import { throttle, getFormattedPageId } from '../utils/article-utils.js';
import { processArticleListData, filterArticlesByCategory } from '../utils/article-data-processor.js';
import { 
    renderArticleList, 
    filterArticleListByCategory, 
    showArticleLoadingState, 
    displayArticleContent, 
    showArticleError, 
    updateActiveArticle, 
    updateLoadMoreStatus 
} from '../utils/article-ui.js';
import { renderWelcomePage } from '../components/welcomePageRenderer.js';
import { articleRouteUtils } from '../utils/article-route-utils.js';
import { articlePaginationManager } from './articlePaginationManager.js';
import { articleCacheManager } from './articleCacheManager.js';
import { articleSearchManager } from './articleSearchManager.js';

import { imageLazyLoader } from '../utils/image-lazy-loader.js';
import { categoryConfig } from '../config/categories.js';
import config from '../config/config.js';

// 导入目录导航组件
import tableOfContents from '../components/tableOfContents.js';

import { getArticlePlaceholder } from '../utils/placeholder-templates.js';

class ArticleManager {
    constructor() {
        this.articles = [];
        this.currentDatabaseId = null;
        this.currentCategory = 'all';
        this.isLoading = false;
        this.currentLoadingId = null;
        this.abortController = null;
        this.fetchDelay = 1000; // 防抖延迟，单位毫秒
        this.fetchDelayTimer = null;
        
        // 添加分类名称映射
        this.categoryNameMap = categoryConfig.nameMap || {
            'Test': '测试',
            'Computer Basis': '计算机基础',
            'Data Structure and Algorithm': '数据结构和算法',
            'Programming Language': '编程语言',
            'Mobile Tech': '终端技术',
        };
        
        // 添加请求控制相关属性
        this.loadingStatus = new Map(); // 记录每篇文章的加载状态
        this.requestIdentifier = 0; // 添加请求标识符
    }

    // 加载文章列表
    async loadArticles() {
        try {
            // 取消之前的请求
            this.cancelCurrentLoading();
            
            // 创建新的 AbortController
            this.abortController = new AbortController();
            const signal = this.abortController.signal;
            
            // 显示加载状态
            showLoading('正在加载文章列表...');
            
            console.log(`开始加载文章，数据库ID: ${this.currentDatabaseId}`);
            
            // 添加超时控制
            const timeoutId = setTimeout(() => {
                if (this.abortController) {
                    console.warn('⚠️ 加载文章列表超时（8秒），尝试从缓存加载');
                    this.abortController.abort();
                    // 尝试从缓存获取文章列表
                    const cachedArticles = articleCacheManager.loadArticlesFromCache();
                    if (cachedArticles) {
                        console.log('📦 从缓存加载文章列表成功');
                        this.articles = cachedArticles;
                        this.filterAndRenderArticles();
                        return this.articles;
                    }
                }
            }, 8000); // 8秒超时
            
            // 测试 API 连接
            try {
                console.log('测试 API 连接...');
                const testResponse = await fetch('/api/hello');
                if (testResponse.ok) {
                    console.log('API 测试成功');
                } else {
                    console.error('API 测试失败:', testResponse.status, testResponse.statusText);
                    showError(`API连接测试失败: ${testResponse.status} ${testResponse.statusText}`);
                }
            } catch (testError) {
                console.error('API 测试异常:', testError);
            }
            
            // 获取文章列表
            console.log('正在从 API 获取文章列表...');
            const result = await getArticles(this.currentDatabaseId);
            
            // 清除超时
            clearTimeout(timeoutId);
            
            // 如果请求已取消，不继续处理
            if (signal.aborted) {
                console.log('文章列表加载已取消');
                return this.articles || []; // 返回现有文章
            }
            
            // 处理新的响应格式
            const articles = result.articles;
            const hasMore = result.hasMore;
            const nextCursor = result.nextCursor;
            
            console.log(`成功获取 ${articles.length} 篇文章`);
            
            // 保存文章列表和分页信息
            this.hasMore = hasMore;
            this.nextCursor = nextCursor;
            
            // 使用processArticleListData处理原始数据
            this.articles = processArticleListData(articles);
            
            // 使用缓存管理器缓存文章列表
            articleCacheManager.saveArticlesToCache(this.articles);
            
            // 应用筛选和渲染
            this.filterAndRenderArticles();
            
            // 如果没有文章，显示提示
            if (articles.length === 0) {
                showStatus('没有找到文章', false, 'info');
            }
            
            return this.articles;
        } catch (error) {
            console.error('加载文章列表失败:', error);
            
            // 显示错误状态
            if (error.name === 'AbortError') {
                console.log('请求被中止，尝试使用缓存');
            } else {
                showError(`加载文章列表失败: ${error.message}`);
                
                // 尝试显示更加用户友好的错误信息
                if (error.message.includes('failed with status 500')) {
                    showError('服务器内部错误，请稍后再试或联系管理员');
                } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                    showError('网络连接错误，请检查您的网络连接');
                }
            }
            
            // 使用缓存管理器尝试从缓存获取文章列表
            const cachedArticles = articleCacheManager.loadArticlesFromCache();
            if (cachedArticles) {
                console.log('📦 从缓存加载文章列表成功');
                this.articles = cachedArticles;
                this.filterAndRenderArticles();
                return this.articles;
            }
            
            return this.articles || [];
        } finally {
            // 清除 AbortController
            this.abortController = null;
        }
    }

    // 过滤并渲染文章列表
    filterAndRenderArticles() {
        // 获取当前分类
        const currentCategory = categoryManager.getCurrentCategory();
        
        // 检查是否处于搜索模式
        if (articleSearchManager.isInSearchMode()) {
            console.log('使用搜索管理器处理...');
            articleSearchManager.performSearch(this.articles);
            return;  // 搜索模式下不进行其他处理
        }
        
        // 如果没有搜索词，则完全交由categoryManager处理类别显示
        console.log(`处理分类: "${currentCategory}"`);
        
        // 如果当前是查看全部文章
        if (currentCategory === 'all') {
            categoryManager.updateCategories(this.articles);
        } 
        // 如果是特定分类，让categoryManager处理显示
        else {
            // 注意：这里不做任何额外处理，因为categoryManager.updateActiveState已经
            // 在点击分类时被调用，并且会处理UI更新
        }
    }

    // 渲染文章列表（覆盖原方法）
    renderArticleList() {
        this.filterAndRenderArticles();
    }

    // 取消当前加载
    cancelCurrentLoading() {
        if (this.abortController) {
            console.log('取消当前加载请求');
            this.abortController.abort();
            this.abortController = null;
        }
        this.currentLoadingId = null;
    }

    // 加载和显示文章内容
    async loadAndDisplayArticle(pageId) {
        const requestId = this.requestIdentifier;
        console.log('开始加载文章:', pageId);
        
        try {
            // 检查ID有效性
            if (!pageId || pageId === 'undefined' || pageId === 'null') {
                console.error('无效的文章ID:', pageId);
                throw new Error('无效的文章ID');
            }
            
            // 初始化加载状态
            this.isLoading = true;
            this.hasMore = false;
            this.nextCursor = null;
            this.loadedBlocks = [];
            
            // 创建新的 AbortController
            this.abortController = new AbortController();
            this.currentLoadingId = pageId;
            
            // 先尝试从缓存获取，使用缓存管理器
            const cachedData = articleCacheManager.getArticleFromCache(pageId);
            
            // 使用缓存数据或从API获取
            if (cachedData) {
                console.log('📦 从缓存加载文章:', pageId);
                
                // 保存缓存中的分页状态
                if (cachedData.hasMore === true && cachedData.nextCursor) {
                    articlePaginationManager.updateState({
                        hasMore: cachedData.hasMore,
                        nextCursor: cachedData.nextCursor
                    });
                    console.log('从缓存恢复分页状态');
                } else {
                    // 如果缓存数据中没有有效的分页信息，强制重置
                    console.log('缓存中没有有效的分页信息，保持重置状态');
                    articlePaginationManager.updateState({
                        hasMore: false,
                        nextCursor: null
                    });
                }
                
                // 如果文章已完全加载，则不需要显示加载更多
                if (cachedData.isFullyLoaded === true) {
                    console.log('文章已完全加载，无需分页请求');
                    articlePaginationManager.updateState({
                        hasMore: false,
                        nextCursor: null
                    });
                }
                
                this.isLoading = false;
                return cachedData;
            }

            console.log('🌐 从网络加载文章:', pageId);
            
            // 设置超时控制
            const timeoutId = setTimeout(() => {
                if (this.abortController) {
                    console.warn('⚠️ 加载文章内容超时（12秒），中断请求');
                    this.abortController.abort();
                    showStatus('加载文章超时，请尝试刷新页面', true, 'warning');
                }
            }, 12000); // 12秒超时
            
            // 从API获取文章
            const articleData = await getArticleContent(pageId);
            
            // 清除超时
            clearTimeout(timeoutId);
            
            // 检查article结构是否有效
            if (!articleData || !articleData.blocks) {
                throw new Error('无效的文章内容');
            }
            
            // 双重检查：1. 检查当前文章ID是否匹配  2. 检查请求ID是否匹配
            if (this.currentPageId !== pageId || this.requestIdentifier !== requestId) {
                console.log('文章已切换或有更新请求，取消加载');
                return false;
            }
            
            // 缓存文章内容，使用缓存管理器
            articleCacheManager.setArticleCache(pageId, {
                ...articleData,
                isFullyLoaded: !articleData.hasMore // 只有当没有更多内容时才标记为完全加载
            });
            
            this.isLoading = false;
            return articleData;
        } catch (error) {
            console.error('加载文章失败:', error);
            this.isLoading = false;
            throw error;
        } finally {
            if (this.currentLoadingId === pageId) {
                this.abortController = null;
            }
        }
    }
    
    // 验证文章ID
    validateArticleId(pageId) {
            if (!pageId || pageId === 'undefined' || pageId === 'null') {
            console.error('无效的文章ID:', pageId);
                return false;
            }
        return true;
    }

    // 准备加载文章
    prepareArticleLoading(pageId) {
        console.log('准备加载文章:', pageId);
        
        // 增加请求标识符，用于防止内容混合
        this.requestIdentifier = Date.now();
        
        // 获取文章容器
        const articleContainer = document.getElementById('article-container');
        if (!articleContainer) {
            console.error('找不到文章容器');
            return false;
        }
        
        // 重置文章容器内容 - 使用导入的占位图模板
        articleContainer.innerHTML = getArticlePlaceholder();
        
        // 重置状态
        this.isLoading = true;
        this.currentPageId = pageId;
        
        // 重置分页管理器的状态
        articlePaginationManager.reset();
        articlePaginationManager.updateState({
            currentPageId: pageId,
            requestIdentifier: this.requestIdentifier
        });
        
        // 重置右侧滚动容器的位置
        const rightColumn = document.querySelector('.blog-content .right-column');
        if (rightColumn) {
            rightColumn.scrollTop = 0;
        }
        
        // 重置主窗口滚动位置到顶部，解决切换文章时滚动位置保留的问题
        window.scrollTo({
            top: 0,
            behavior: 'auto'
        });
        
        // 更新URL参数 - 使用路由工具
        articleRouteUtils.updateArticleParam(pageId);
        
        console.log('文章加载准备完成');
        return true;
    }

    // 显示文章内容
    async showArticle(pageId) {
        try {
            console.log('开始加载文章:', pageId);
            const articleContainer = document.getElementById('article-container');
            if (!articleContainer) return false;

            // 验证文章ID
            if (!this.validateArticleId(pageId)) {
                showError('无效的文章ID');
                return false;
            }
            
            // 重置分页管理器的状态
            articlePaginationManager.reset();
            
            // 准备加载
            if (!this.prepareArticleLoading(pageId)) {
                return false;
            }

            try {
                // 更新URL参数 - 使用路由工具
                articleRouteUtils.updateArticleParam(pageId);
                
                // 加载文章数据
                const articleData = await this.loadAndDisplayArticle(pageId);
                if (!articleData) {
                    console.log('文章加载已取消');
                    return false;
                }
                
                // 设置当前页面ID和分页状态
                this.currentPageId = pageId;
                
                // 更新分页管理器的状态
                articlePaginationManager.updateState({
                    hasMore: articleData.hasMore === true && articleData.nextCursor ? true : false,
                    nextCursor: articleData.hasMore === true && articleData.nextCursor ? articleData.nextCursor : null,
                    loadedBlocks: articleData.blocks || []
                });
                
                // 显示文章内容
                const articleBody = displayArticleContent(
                    articleData, 
                    renderNotionBlocks, 
                    'article-container', 
                    articlePaginationManager.hasMore
                );
                
                // 处理懒加载
                if (articleBody) {
                    initializeLazyLoading(articleBody);
                    
                    // 检查是否从缓存加载
                    if (articleData._fromCache) {
                        console.log('从缓存加载的文章，进行优化的渲染检查...');
                        // 使用较短延迟减少视觉上的延迟感
                        setTimeout(() => {
                            const container = document.getElementById('article-container');
                            if (container) {
                                // 添加类以触发视觉效果，表明内容在重新加载
                                container.classList.add('cache-refresh');
                                setTimeout(() => container.classList.remove('cache-refresh'), 500);
                            }
                        }, 100); // 减少延迟时间，降低等待感
                    }
                    
                    // 修改这里：确保当没有更多内容时，显示提示
                    if (!articlePaginationManager.hasMore) {
                        const articleContainer = document.getElementById('article-container');
                        // 查找或创建加载更多容器
                        let loadMoreContainer = articleContainer.querySelector('.load-more-container');
                        if (!loadMoreContainer) {
                            loadMoreContainer = document.createElement('div');
                            loadMoreContainer.className = 'load-more-container';
                            articleBody.appendChild(loadMoreContainer);
                        }
                        loadMoreContainer.innerHTML = '<div class="no-more">没有更多内容</div>';
                    }
                }
                
                // 配置加载更多功能
                articlePaginationManager.configureLoadMoreFeature(articleContainer);
                
                // 当文章加载完成后初始化目录导航
                if (articleBody) {
                    // 初始化目录导航
                    const hasInitialized = tableOfContents.initialize();
                    
                    // 如果文章没有目录（标题不足），则销毁之前的目录
                    if (!hasInitialized) {
                        tableOfContents.destroy();
                    }
                }
                
                return true;
            } catch (error) {
                console.error('渲染文章失败:', error);
                
                // 使用showArticleError显示错误信息
                showArticleError(error.message, 'article-container', pageId);
                return false;
            } finally {
                // 重置加载状态
                this.isLoading = false;
            }
        } catch (error) {
            console.error('显示文章失败:', error);
            return false;
        }
    }

    // 修改为使用缓存管理器的updateArticleCache
    async loadMoreContent() {
        return await articlePaginationManager.loadMoreContent(
            renderNotionBlocks,
            // 传递更新缓存的回调函数，使用缓存管理器
            (pageId, newBlocks, hasMore, nextCursor) => {
                articleCacheManager.updateArticleCache(pageId, newBlocks, hasMore, nextCursor);
            }
        );
    }

    // 更新数据库ID
    updateDatabaseId(newDatabaseId) {
        this.currentDatabaseId = newDatabaseId;
        this.loadArticles();
    }

    // 初始化
    async initialize(databaseId) {
        console.log('初始化文章管理器，数据库ID:', databaseId);
        this.currentDatabaseId = databaseId;
        
        try {
            // 加载文章列表
            const articles = await this.loadArticles();
            
            // 初始化搜索管理器
            articleSearchManager.initialize({
                onSearchResults: (searchResults, searchTerm) => {
                    console.log(`搜索结果: ${searchResults.length} 个匹配项`);
                },
                onResetSearch: () => {
                    console.log('重置搜索状态');
                    this.filterAndRenderArticles();
                },
                // 添加获取文章数据的回调函数
                getArticles: () => {
                    return this.articles;
                }
            });
            
            // 监听文章选择事件
            document.addEventListener('articleSelected', (e) => {
                if (e.detail && e.detail.articleId) {
                    console.log('从搜索结果中选择文章');
                    this.showArticle(e.detail.articleId);
                }
            });
            
            // 更新分类列表
            if (articles && articles.length > 0) {
                console.log('更新分类列表...');
                categoryManager.updateCategories(articles);
                
                // 设置分类变更和文章选择回调
                categoryManager.setOnCategoryChange((category) => {
                    console.log('分类变更:', category);
                    
                    // 如果在搜索状态，清除搜索
                    if (articleSearchManager.isInSearchMode()) {
                        articleSearchManager.clearSearch();
                    }
                    
                    this.filterAndRenderArticles();
                });
                
                categoryManager.setOnArticleSelect((articleId) => {
                    console.log('文章选择');
                    this.showArticle(articleId);
                });
                
                // 从URL初始化状态
                await this.initializeFromUrl();
                
                // 如果URL中没有指定文章，则显示欢迎页面
                if (!this.currentPageId) {
                    console.log('显示欢迎页面...');
                    this.showWelcomePage();
                }
            } else {
                console.log('没有文章，不更新分类');
            }
            
            return articles;
        } catch (error) {
            console.error('初始化失败:', error);
            showError('初始化失败: ' + error.message);
            throw error;
        }
    }
    
    // 从URL初始化状态
    async initializeFromUrl() {
        try {
            // 使用新的路由工具从URL初始化
            return await articleRouteUtils.initializeFromUrl(
                // 文章显示回调
                async (articleId) => {
                    this.currentPageId = articleId;
                    await this.showArticle(articleId);
                },
                // 分类选择回调
                (category) => {
                    categoryManager.selectCategory(category);
                }
            );
        } catch (error) {
            console.error('从URL初始化失败:', error);
            return false;
        }
    }

    // 获取分类的显示名称
    getCategoryDisplayName(category) {
        return this.categoryNameMap[category] || category;
    }

    // 显示欢迎页面
    showWelcomePage() {
        console.log('显示欢迎页面');
        
        // 确保有文章数据
        if (!this.articles || this.articles.length === 0) {
            console.log('欢迎页面需要文章数据，但当前没有数据，尝试加载文章数据...');
            // 尝试从缓存加载
            const cachedArticles = articleCacheManager.loadArticlesFromCache();
            
            if (cachedArticles && cachedArticles.length > 0) {
                console.log('从缓存加载到文章数据:', cachedArticles.length);
                this.articles = cachedArticles;
            } else {
                console.log('缓存中没有文章数据，将异步加载文章数据');
                // 异步加载文章，并在加载完成后显示欢迎页面
                this.loadArticles().then(() => {
                    if (this.articles && this.articles.length > 0) {
                        console.log('文章数据加载完成，重新渲染欢迎页面');
                        this.renderWelcomePage();
                    }
                }).catch(err => {
                    console.error('加载文章数据失败:', err);
                });
                
                // 显示一个简单的加载中状态，避免空白页面
                const container = document.getElementById('article-container');
                if (container) {
                    container.innerHTML = `
                        <div class="welcome-page">
                            <div class="welcome-header">
                                <h1>温故知新，回望前行</h1>
                                <p class="welcome-subtitle">这里记录了一些技术学习和思考，欢迎讨论</p>
                            </div>
                            <div class="welcome-content">
                                <p>正在加载文章数据，请稍候...</p>
                            </div>
                        </div>
                    `;
                }
                return; // 等待异步加载完成
            }
        }
        
        // 现在确保有文章数据，渲染欢迎页面
        this.renderWelcomePage();
    }
    
    // 实际渲染欢迎页面的方法
    renderWelcomePage() {
        // 使用welcomePageRenderer组件渲染欢迎页面
        renderWelcomePage({
            articles: this.articles,
            onCategorySelect: (category) => {
                categoryManager.selectCategory(category);
            },
            onArticleSelect: (articleId) => {
                this.showArticle(articleId);
            },
            categoryConfig: {
                nameMap: this.categoryNameMap,
                colors: categoryConfig.colors
            }
        });
    }

    // 添加一个新方法，用于强制重置加载状态 - 可在页面中暴露使用
    resetLoadingState() {
        console.log('强制重置加载状态');
        this.isLoading = false;
        this.isLoadingMore = false;
        
        // 移除加载中指示器
        const loadingIndicator = document.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
        
        // 如果页面卡在加载中状态，尝试恢复UI
        const articleContainer = document.getElementById('article-container');
        const loadingElement = articleContainer?.querySelector('.placeholder-content');
        if (loadingElement && articleContainer) {
            // 如果内容区只有加载占位符，显示一个错误提示
            articleContainer.innerHTML = `
                <div class="error-message">
                    <p>加载内容超时，请<a href="javascript:void(0)" onclick="window.articleManager.resetLoadingState()">刷新</a>重试</p>
                </div>
            `;
        }
    }
    
    /**
     * 获取文章列表
     * @returns {Array} 文章列表
     */
    getArticles() {
        return this.articles;
    }
}

export const articleManager = new ArticleManager(); 