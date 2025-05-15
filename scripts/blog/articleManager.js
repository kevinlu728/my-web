/**
 * @file articleManager.js
 * @description 文章管理器，负责文章数据的获取、缓存、渲染和状态管理
 * @author 陆凯
 * @version 1.2.0
 * @created 2024-03-09
 * @updated 2024-05-15
 * 
 * 该模块是网站文章功能的核心管理器，负责：
 * - 从API获取文章列表和详情数据
 * - 处理文章的分类和筛选
 * - 处理文章的渲染和显示逻辑
 * - 实现文章的分页和加载更多功能
 * - 管理文章缓存，提高页面性能
 * - 协调与视图管理器的状态同步
 * - 防止重复加载相同文章，优化性能
 * 
 * 主要方法：
 * - initialize: 初始化文章管理器
 * - loadArticles: 加载文章列表
 * - loadArticle: 加载单篇文章，包含重复加载检测
 * - loadArticleData: 加载文章内容
 * 
 * 依赖关系：
 * - 依赖 notionAPIService.js 获取API数据
 * - 依赖 contentViewManager.js 管理视图状态
 * - 依赖 categoryManager.js 管理文章列表
 * - 依赖 articleSearchManager.js 
 * - 依赖 articlePaginationManager.js 管理分页
 * - 依赖 articleCacheManager.js 管理缓存
 * - 依赖 articleRenderer.js 渲染内容
 * - 依赖 welcomePageManager.js 管理欢迎页面
 */
import notionAPIService from '../services/notionAPIService.js';
import { contentViewManager, ViewMode, ViewEvents } from './contentViewManager.js';
import { categoryManager } from './categoryManager.js';
import { articleSearchManager } from './articleSearchManager.js';
import { articlePaginationManager } from './articlePaginationManager.js';
import { articleCacheManager } from './articleCacheManager.js';
import { welcomePageManager } from './welcomePageManager.js';
import { renderArticleContent } from './articleRenderer.js';
import { tableOfContents } from './tableOfContents.js';

// 导入工具函数
import { categoryConfig } from '../config/categories.js';
import { articleRouteUtils } from '../utils/article-router.js';
import { validateArticleId, showArticleError, processArticleListData } from '../utils/article-utils.js';
import { articlePageSkeleton } from '../utils/skeleton-loader.js';
import { getArticlePlaceholder } from '../utils/placeholder-templates.js';
import { showStatus, showError } from '../utils/common-utils.js';
import logger from '../utils/logger.js';

class ArticleManager {
    constructor() {
        this.blogDatabaseId = null;
        this.articles = [];
        this.currentCategory = 'all';
        this.isLoading = false;
        this.currentLoadingId = null;
        this.abortController = null;
        this.fetchDelay = 1000; // 防抖延迟，单位毫秒
        this.fetchDelayTimer = null;
        // 添加加载锁，防止重复加载
        this.loadingLock = false;
        
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

    // 初始化
    async initialize(databaseId) {
        logger.info('初始化文章管理器，数据库ID:', databaseId);
        this.blogDatabaseId = databaseId;
        
        try {
            // 初始化分类管理器
            categoryManager.initialize();

            // 检查URL中是否有指定文章参数
            const urlParams = new URLSearchParams(window.location.search);
            const articleIdFromUrl = urlParams.get('article');

            if (!articleIdFromUrl) {
                logger.info('URL参数不含文章ID,将初始化欢迎页面管理器并显示欢迎页');
                // 初始化欢迎页面管理器，在加载文章列表之前初始化欢迎页面管理器是因为希望尽早显示欢迎页面骨架屏
                this.initWelcomePageManager();
                // 加载文章列表
                const articles = await this.loadArticles();
                // 更新分类列表
                await this.updateCategories(articles);
                // 初始化搜索管理器
                this.initArticleSearchManager();
                // 更新视图状态
                contentViewManager.updateViewState('auto');
                // 委托给欢迎页管理器处理
                welcomePageManager.showWelcomePage(articles);
            } else {
                // 仅当URL中指定了文章ID时才加载文章
                logger.info(`URL参数包含文章ID: ${articleIdFromUrl},将显示指定文章`);
                // 尽早显示文章内容页面骨架屏
                articlePageSkeleton.show(this.getArticleContainer());
                // 加载文章列表
                const articles = await this.loadArticles();
                // 更新分类列表
                await this.updateCategories(articles);
                // 初始化搜索管理器
                this.initArticleSearchManager();
                // 显示指定文章
                await this.loadArticle(articleIdFromUrl);
            }

            // 监听文章选择事件
            document.addEventListener('articleSelected', (e) => {
                if (e.detail && e.detail.articleId) {
                    logger.info('从搜索结果中选择文章');
                    this.loadArticle(e.detail.articleId);
                }
            });
        } catch (error) {
            logger.error('文章管理器初始化失败:', error.message);
            throw error;
        }
    }

    initWelcomePageManager() {
        welcomePageManager.initialize({
            getArticles: () => {
                return this.articles;
            },
            onCategorySelect: (category) => {
                categoryManager.selectCategory(category);
            },
            onArticleSelect: (articleId) => {
                this.loadArticle(articleId);
            }
        });
    }
    initArticleSearchManager() {
        articleSearchManager.initialize({
            // 添加获取文章数据的回调函数
            getArticles: () => {
                return this.articles;
            },
            onSearchResults: (searchResults, searchTerm) => {
                logger.info(`搜索结果: ${searchResults.length} 个匹配项`);
            },
            onResetSearch: () => {
                logger.info('重置搜索状态');
                this.filterAndRenderArticles();
            }
        });
    }
    
    // 加载文章列表
    async loadArticles(options = {}) {
        try {
            // 防止重复加载 - 添加加载锁检查
            if (this.loadingLock === true) {
                logger.info('已有文章列表加载请求正在处理中，跳过重复加载');
                return this.articles || [];
            }
            
            // 设置加载锁
            this.loadingLock = true;
            
            // 取消之前的请求
            this.cancelCurrentLoading();
            
            // 创建新的 AbortController
            this.abortController = new AbortController();
            const signal = this.abortController.signal;
            
            logger.info(`开始加载文章，数据库ID: ${this.blogDatabaseId}`);
            
            // 添加超时控制
            const timeoutId = setTimeout(() => {
                if (this.abortController) {
                    logger.warn('⚠️ [请求超时] 加载文章列表超时（8秒），尝试从缓存加载');
                    this.abortController.abort();
                    // 尝试从缓存获取文章列表
                    const cachedArticles = articleCacheManager.loadArticlesFromCache();
                    if (cachedArticles) {
                        logger.info('✅ [缓存应急] 成功从缓存恢复文章列表');
                        this.articles = cachedArticles;
                        this.filterAndRenderArticles();
                        return this.articles;
                    }
                }
            }, 8000); // 8秒超时
            
            // 早期添加人为延迟是为了确保加载提示可见。但这个延迟会导致articleManager初始化和welcomePageManager初始化的
            // 间隔长达约5秒（即使有缓存），导致页面加载很慢。因此现在移除这个延迟（设为0），但暂时保留这行代码，观察一段时间。
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // 获取文章列表
            logger.info('正在从 API 获取文章列表...');
            const result = await notionAPIService.getArticles(this.blogDatabaseId);
            
            // 清除超时
            clearTimeout(timeoutId);
            
            // 如果请求已取消，不继续处理
            if (signal.aborted) {
                logger.info('文章列表加载已取消');
                return this.articles || []; // 返回现有文章
            }
            
            // 处理新的响应格式
            const articles = result.articles;
            const hasMore = result.hasMore;
            const nextCursor = result.nextCursor;
            
            logger.info(`📡 [API响应] 获取到 ${articles.length} 篇文章`);
            
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
            logger.error('加载文章列表失败:', error.message);
            
            // 显示错误状态
            if (error.name === 'AbortError') {
                logger.info('请求被中止，尝试使用缓存');
            } else {
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
                logger.info('✅ [缓存应急] 成功从缓存恢复文章列表');
                this.articles = cachedArticles;
                this.filterAndRenderArticles();
                return this.articles;
            }
            
            // 错误处理
            categoryManager.hideTreeSkeleton();
            
            return this.articles || [];
        } finally {
            // 清除 AbortController
            this.abortController = null;
            // 无论成功失败都释放加载锁
            this.loadingLock = false;
        }
    }
    // 取消当前加载
    cancelCurrentLoading() {
        if (this.abortController) {
            logger.info('取消当前加载请求');
            this.abortController.abort();
            this.abortController = null;
        }
        this.currentLoadingId = null;
    }

    // 用获取的文章列表数据更新分类列表
    async updateCategories(articles) {
        if (articles && articles.length > 0) {
            logger.info('更新分类列表...');
            categoryManager.updateCategories(articles);
            
            // 设置分类变更和文章选择回调
            categoryManager.setOnCategoryChange((category) => {
                logger.info('分类变更:', category);
                
                // 如果在搜索状态，清除搜索
                if (articleSearchManager.isInSearchMode()) {
                    articleSearchManager.clearSearch();
                }
                
                this.filterAndRenderArticles();
            });
            
            categoryManager.setOnArticleSelect((articleId) => {
                logger.info('文章选择');
                this.loadArticle(articleId);
            });
            
            // 从URL初始化状态
            await this.initializeFromUrl();
            
        } else {
            logger.info('没有文章，不更新分类');
            // 即使没有文章也应该隐藏骨架屏
            categoryManager.hideTreeSkeleton();
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
                    await this.loadArticle(articleId);
                },
                // 分类选择回调
                (category) => {
                    categoryManager.selectCategory(category);
                }
            );
        } catch (error) {
            logger.error('从URL初始化失败:', error);
            return false;
        }
    }

    // 过滤并渲染文章列表
    filterAndRenderArticles() {
        // 获取当前分类
        const currentCategory = categoryManager.getCurrentCategory();
        
        // 检查是否处于搜索模式
        if (articleSearchManager.isInSearchMode()) {
            logger.info('使用搜索管理器处理...');
            articleSearchManager.performSearch(this.articles);
            return;  // 搜索模式下不进行其他处理
        }
        
        // 如果没有搜索词，则完全交由categoryManager处理类别显示
        logger.info(`处理分类: "${currentCategory}"`);
        
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
    
    // 加载单篇文章的内容
    async loadArticle(articleId) {
        // 避免重复加载相同的文章
        if (this.currentArticleId === articleId && document.querySelector('.article-body')) {
            logger.info(`文章 ${articleId} 已经显示，跳过重复加载`);
            return;
        }
        
        this.currentArticleId = articleId;
        
        try {
            logger.info('开始加载文章:', articleId);

            const articleContainer = this.getArticleContainer();
            if (!articleContainer) return false;

            articlePageSkeleton.show(this.getArticleContainer());
            
            // 通知视图管理器开始文章加载 - 添加的事件通信
            contentViewManager.dispatchViewEvent(ViewEvents.LOADING_START, { loadingType: 'article', articleId: articleId });
            
            // 验证文章ID
            if (!validateArticleId(articleId)) {
                logger.error('无效的文章ID');
                return false;
            }
            
            // 重置分页管理器的状态
            articlePaginationManager.reset();
            
            // 准备加载
            if (!this.prepareArticleLoading(articleId)) {
                return false;
            }

            // 在加载开始时设置加载模式
            contentViewManager.setMode(ViewMode.LOADING);
            
            // 通知文章将要显示 - 添加的事件通信
            contentViewManager.dispatchViewEvent(ViewEvents.BEFORE_ARTICLE, { articleId: articleId });
            
            // 更新URL参数 - 使用路由工具
            articleRouteUtils.updateArticleParam(articleId);
            
            // 加载文章数据
            const articleData = await this.loadArticleData(articleId);
            if (!articleData) {
                logger.info('文章加载已取消');
                return false;
            }
            
            // 设置当前页面ID和分页状态
            this.currentPageId = articleId;
            
            // 更新分页管理器的状态
            articlePaginationManager.updateState({
                hasMore: articleData.hasMore === true && articleData.nextCursor ? true : false,
                nextCursor: articleData.hasMore === true && articleData.nextCursor ? articleData.nextCursor : null,
                loadedBlocks: articleData.blocks || []
            });

            // 隐藏文章内容页面骨架屏
            articlePageSkeleton.hide(articleContainer);
            
            // 显示文章内容
            const articleBody = renderArticleContent(
                articleData, 
                'article-container', 
                articlePaginationManager.hasMore
            );
            
            // 处理懒加载
            if (articleBody) {
                // 检查是否从缓存加载
                if (articleData._fromCache) {
                    logger.info('从缓存加载的文章，进行优化的渲染检查...');
                    // 使用较短延迟减少视觉上的延迟感
                    setTimeout(() => {
                        const container = this.getArticleContainer();
                        if (container) {
                            // 添加类以触发视觉效果，表明内容在重新加载
                            container.classList.add('cache-refresh');
                            setTimeout(() => container.classList.remove('cache-refresh'), 500);
                        }
                    }, 100); // 减少延迟时间，降低等待感
                }
                
                // 修改这里：确保当没有更多内容时，显示提示
                if (!articlePaginationManager.hasMore) {
                    const articleContainer = this.getArticleContainer();
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
            
            // 在渲染成功后才设置文章模式
            contentViewManager.setMode(ViewMode.ARTICLE);
            
            // 通知文章已显示 - 添加的事件通信
            contentViewManager.dispatchViewEvent(ViewEvents.AFTER_ARTICLE, { articleId: articleId });
            
            // 通知加载完成 - 添加的事件通信
            contentViewManager.dispatchViewEvent(ViewEvents.LOADING_END, { loadingType: 'article', articleId: articleId });
            
            return true;
            
        } catch (error) {
            logger.error('显示文章失败:', error.message);
            
            // 设置错误模式
            contentViewManager.setMode(ViewMode.ERROR);
            
            // 通知错误 - 添加的事件通信
            contentViewManager.dispatchViewEvent('articleError', { 
                articleId: articleId, 
                error: error.message 
            });
            
            // 重置加载状态
            this.isLoading = false;
            
            throw error;
        } finally {
            // 重置加载状态
            this.isLoading = false;
        }
    }

    // 文章加载前的准备，包括显示占位图、重置状态、更新URL参数等
    prepareArticleLoading(pageId) {
        logger.info('准备加载文章:', pageId);
        
        // 增加请求标识符，用于防止内容混合
        this.requestIdentifier = Date.now();
        
        // 获取文章容器
        const articleContainer = this.getArticleContainer();
        if (!articleContainer) {
            logger.error('找不到文章容器');
            return false;
        }
        
        // 重置文章容器内容 - 使用导入的占位图模板
        // articleContainer.innerHTML = getArticlePlaceholder();
        
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
        
        logger.info('文章加载准备完成');
        return true;
    }
    // 加载文章内容数据
    async loadArticleData(pageId) {
        const requestId = this.requestIdentifier;
        logger.info('开始加载文章:', pageId);
        
        try {
            // 检查ID有效性
            if (!pageId || pageId === 'undefined' || pageId === 'null') {
                logger.error('无效的文章ID:', pageId);
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
                // 不需要重复日志，缓存管理器已记录
                
                // 保存缓存中的分页状态
                if (cachedData.hasMore === true && cachedData.nextCursor) {
                    articlePaginationManager.updateState({
                        hasMore: cachedData.hasMore,
                        nextCursor: cachedData.nextCursor
                    });
                    logger.info('🔄 [分页恢复] 从缓存恢复分页状态，游标: ' + 
                                (cachedData.nextCursor ? cachedData.nextCursor.substring(0, 8) + '...' : 'null'));
                } else {
                    // 如果缓存数据中没有有效的分页信息，强制重置
                    logger.info('⚠️ [分页重置] 缓存中没有有效的分页信息，重置状态');
                    articlePaginationManager.updateState({
                        hasMore: false,
                        nextCursor: null
                    });
                }
                
                // 如果文章已完全加载，则不需要显示加载更多
                if (cachedData.isFullyLoaded === true) {
                    logger.info('👍 [完整加载] 文章已完全加载，无需分页请求');
                    articlePaginationManager.updateState({
                        hasMore: false,
                        nextCursor: null
                    });
                }
                
                this.isLoading = false;
                return cachedData;
            }

            logger.info(`📡 [API请求] 从网络加载文章: ${pageId}`);
            
            // 设置超时控制
            const timeoutId = setTimeout(() => {
                if (this.abortController) {
                    logger.warn('⚠️ 加载文章内容超时（12秒），中断请求');
                    this.abortController.abort();
                    throw new Error('加载文章超时，请尝试刷新页面');
                }
            }, 12000); // 12秒超时
            
            // 从API获取文章
            const articleData = await notionAPIService.getArticleContent(pageId);
            
            // 清除超时
            clearTimeout(timeoutId);
            
            // 检查article结构是否有效
            if (!articleData || !articleData.blocks) {
                throw new Error('无效的文章内容');
            }
            
            // 双重检查：1. 检查当前文章ID是否匹配  2. 检查请求ID是否匹配
            if (this.currentPageId !== pageId || this.requestIdentifier !== requestId) {
                logger.info('文章已切换或有更新请求，取消加载');
                return false;
            }
            
            // 缓存文章内容
            logger.info(`📦 [缓存新文] 文章已加载${articleData.hasMore ? '(部分内容)' : '(全部内容)'}，正在缓存`);
            articleCacheManager.setArticleCache(pageId, {
                ...articleData,
                isFullyLoaded: !articleData.hasMore
            });
            
            this.isLoading = false;
            return articleData;
        } catch (error) {
            logger.error('加载文章数据失败:', error.message);
            this.isLoading = false;
            throw error;
        } finally {
            if (this.currentLoadingId === pageId) {
                this.abortController = null;
            }
        }
    }

    // 修改为使用缓存管理器的updateArticleCache
    async loadMoreContent() {
        return await articlePaginationManager.loadMoreContent(
            // 传递更新缓存的回调函数，使用缓存管理器
            (pageId, newBlocks, hasMore, nextCursor) => {
                articleCacheManager.updateArticleCache(pageId, newBlocks, hasMore, nextCursor);
            }
        );
    }
    
    /**
     * 获取文章列表
     * @returns {Array} 文章列表
     */
    getArticles() {
        return this.articles;
    }

    getArticleContainer() {
        return document.getElementById('article-container');
    }
}

export const articleManager = new ArticleManager();
export default ArticleManager; 