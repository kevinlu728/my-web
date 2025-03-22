/**
 * @file articleManager.js
 * @description 文章管理器，负责文章数据的获取、缓存和渲染
 * @author 陆凯
 * @version 2.0.0
 * @created 2024-03-09
 * @updated 2024-03-20
 * 
 * 该模块是网站文章功能的核心管理器，负责：
 * - 从API获取文章列表和详情
 * - 管理文章数据的本地缓存
 * - 处理文章的渲染和显示
 * - 实现文章的分页和加载更多功能
 * - 处理文章的分类和筛选
 * - 管理文章的搜索功能
 * 
 * 主要方法：
 * - loadArticles: 加载文章列表
 * - displayArticle: 显示单篇文章
 * - loadAndDisplayArticle: 加载并显示文章
 * - searchArticles: 搜索文章
 * - filterArticlesByCategory: 按分类筛选文章
 * 
 * 该模块依赖于notionService.js获取数据，依赖于articleRenderer.js渲染内容。
 */

import { showStatus, showLoading, showError } from '../utils/utils.js';
import { getArticles, getArticleContent } from '../services/notionService.js';
import { categoryManager } from './categoryManager.js';
import { renderNotionBlocks, initializeLazyLoading } from '../components/articleRenderer.js';

// 导入工具函数
import { throttle, highlightSearchTerm, getFormattedPageId } from '../utils/article-utils.js';
import { ArticleCache } from '../utils/article-cache.js';
import { processArticleListData, searchArticles, filterArticlesByCategory } from '../utils/article-data-processor.js';
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
import { UrlUtils } from '../utils/url-utils.js';

import { imageLazyLoader } from '../utils/image-lazy-loader.js';
import { categoryConfig } from '../config/categories.js';
import config from '../config/config.js';

class ArticleManager {
    constructor() {
        this.articles = [];
        this.currentDatabaseId = null;
        this.searchTerm = '';
        this.currentCategory = 'all';
        this.isLoading = false;
        this.currentLoadingId = null;
        this.abortController = null;
        this.hasMore = false;
        this.nextCursor = null;
        this.isFetchingMore = false;
        this.fetchDelay = 1000; // 防抖延迟，单位毫秒
        this.fetchDelayTimer = null;
        
        // 初始化缓存管理器
        this.articleCache = new ArticleCache({
            cachePrefix: 'article_cache_',
            expirationTime: 30 * 60 * 1000 // 30分钟缓存有效期
        });
        
        // 清理过期缓存
        this.articleCache.clearExpiredCache();
        
        // 添加分类名称映射
        this.categoryNameMap = categoryConfig.nameMap || {
            'Test': '测试',
            'Computer Basis': '计算机基础',
            'Data Structure and Algorithm': '数据结构和算法',
            'Programming Language': '编程语言',
            'Mobile Tech': '终端技术',
        };
        
        this.initializeSearch();
        
        // 添加请求控制相关属性
        this.loadingStatus = new Map(); // 记录每篇文章的加载状态
    }

    // 初始化搜索功能
    initializeSearch() {
        const searchInput = document.getElementById('article-search');
        const clearButton = document.getElementById('search-clear');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.trim().toLowerCase();
                this.updateClearButton();
                
                if (this.searchTerm) {
                    this.performSearch();
                } else {
                    this.resetSearch();
                }
            });
        }
        
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    this.searchTerm = '';
                    this.updateClearButton();
                    this.resetSearch();
                }
            });
        }
    }

    // 更新清除按钮的显示状态
    updateClearButton() {
        const clearButton = document.getElementById('search-clear');
        if (clearButton) {
            clearButton.classList.toggle('visible', this.searchTerm.length > 0);
        }
    }

    // 执行搜索
    performSearch() {
        if (!this.articles || this.articles.length === 0) return;
        
        console.log(`执行搜索，关键词: "${this.searchTerm}"`);
        
        // 使用searchArticles工具函数搜索匹配的文章
        const searchResults = searchArticles(this.articles, this.searchTerm);
        console.log(`找到 ${searchResults.length} 篇匹配的文章`);
        
        if (searchResults.length === 0) {
            // 显示无结果提示
            const rootChildren = document.querySelector('#article-tree .root-item > .tree-children');
            if (rootChildren) {
                rootChildren.innerHTML = `<li class="no-results">没有找到与 "${this.searchTerm}" 相关的文章</li>`;
            }
            return;
        }
        
        // 找出搜索结果中涉及的所有分类
        const categories = new Set();
        searchResults.forEach(article => {
            categories.add(article.category || 'Uncategorized');
        });
        
        // 在树中展示搜索结果
        const rootItem = document.querySelector('#article-tree .root-item');
        if (rootItem) {
            // 确保根节点展开
            rootItem.classList.add('expanded');
            
            // 更新根节点计数
            const rootCount = rootItem.querySelector('.item-count');
            if (rootCount) {
                rootCount.textContent = `(${searchResults.length})`;
            }
            
            // 清空并重建分类节点
            const rootChildren = rootItem.querySelector('.tree-children');
            if (rootChildren) {
                rootChildren.innerHTML = '';
                
                // 为每个包含搜索结果的分类创建节点
                Array.from(categories).sort().forEach(category => {
                    // 过滤该分类下的搜索结果
                    const categoryResults = searchResults.filter(article => 
                        (article.category || 'Uncategorized') === category
                    );
                    
                    if (categoryResults.length === 0) return;
                    
                    // 创建分类节点
                    const categoryNode = document.createElement('li');
                    categoryNode.className = 'tree-item category-tree-item expanded';
                    categoryNode.dataset.category = category;
                    
                    // 创建分类内容
                    categoryNode.innerHTML = `
                        <div class="tree-item-content">
                            <span class="tree-toggle"><i class="fas fa-chevron-right"></i></span>
                            <span class="item-name">${this.getCategoryDisplayName(category)}</span>
                            <span class="item-count">(${categoryResults.length})</span>
                        </div>
                        <ul class="tree-children">
                            <!-- 搜索结果将在这里动态添加 -->
                        </ul>
                    `;
                    
                    // 添加分类点击事件
                    const categoryContent = categoryNode.querySelector('.tree-item-content');
                    categoryContent.addEventListener('click', (e) => {
                        e.stopPropagation();
                        categoryNode.classList.toggle('expanded');
                    });
                    
                    // 添加该分类下的搜索结果
                    const categoryChildren = categoryNode.querySelector('.tree-children');
                    categoryResults.forEach(article => {
                        const articleNode = document.createElement('li');
                        articleNode.className = 'tree-item article-tree-item';
                        articleNode.dataset.articleId = article.id;
                        
                        // 提取并高亮标题
                        const title = article.title || 'Untitled';
                        const highlightedTitle = highlightSearchTerm(title, this.searchTerm);
                        
                        // 不再显示日期
                        articleNode.innerHTML = `
                            <div class="tree-item-content">
                                <span class="item-name">${highlightedTitle}</span>
                            </div>
                        `;
                        
                        // 添加文章点击事件
                        articleNode.querySelector('.tree-item-content').addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.showArticle(article.id);
                        });
                        
                        categoryChildren.appendChild(articleNode);
                    });
                    
                    rootChildren.appendChild(categoryNode);
                });
            }
        }
    }

    // 重置搜索
    resetSearch() {
        console.log('重置搜索...');
        categoryManager.updateCategories(this.articles);
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
            
            console.log('重构articleManager.js第一阶段：提取工具函数');
            
            console.log(`开始加载文章，数据库ID: ${this.currentDatabaseId}`);
            
            // 添加超时控制
            const timeoutId = setTimeout(() => {
                if (this.abortController) {
                    console.warn('⚠️ 加载文章列表超时（8秒），尝试从缓存加载');
                    this.abortController.abort();
                    // 尝试从缓存获取文章列表
                    const cachedArticles = this.articleCache.getArticleFromCache('article_list');
                    if (cachedArticles) {
                        console.log('✅ 从缓存加载文章列表成功');
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
                    const testData = await testResponse.json();
                    console.log('API 测试成功:', testData);
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
            
            console.log(`成功获取 ${articles.length} 篇文章，hasMore: ${hasMore}, nextCursor: ${nextCursor}`);
            
            // 保存文章列表和分页信息
            this.hasMore = hasMore;
            this.nextCursor = nextCursor;
            
            // 使用processArticleListData处理原始数据
            this.articles = processArticleListData(articles);
            
            // A. 使用ArticleCache缓存文章列表
            this.articleCache.setArticleCache('article_list', this.articles);
            
            // 应用搜索过滤
            this.filterAndRenderArticles();
            
            // 如果没有文章，显示提示
            if (articles.length === 0) {
                showStatus('没有找到文章', false, 'info');
            }
            
            return this.articles;
        } catch (error) {
            console.error('Error loading articles:', error);
            
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
            
            // B. 尝试从缓存获取文章列表
            const cachedArticles = this.articleCache.getArticleFromCache('article_list');
            if (cachedArticles) {
                console.log('✅ 从缓存加载文章列表成功');
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

    // 将文章列表保存到缓存
    saveArticlesToCache() {
        if (!this.articles || this.articles.length === 0) return;
        
        try {
            localStorage.setItem('article_list_cache', JSON.stringify({
                articles: this.articles,
                timestamp: Date.now()
            }));
            console.log('✅ 文章列表已保存到缓存');
        } catch (e) {
            console.warn('无法保存文章列表到缓存:', e);
        }
    }

    // 从缓存加载文章列表
    loadArticlesFromCache() {
        console.log('🔍 尝试从缓存加载文章列表...');
        
        try {
            const cached = localStorage.getItem('article_list_cache');
            if (cached) {
                const { articles, timestamp } = JSON.parse(cached);
                
                // 检查缓存是否过期（24小时）
                const now = Date.now();
                const maxAge = 24 * 60 * 60 * 1000; // 24小时
                
                if (now - timestamp < maxAge) {
                    console.log('✅ 从缓存加载文章列表成功');
                    this.articles = articles;
                    
                    // 应用搜索过滤
                    this.filterAndRenderArticles();
                    
                    return this.articles;
                } else {
                    console.log('缓存已过期');
                }
            }
        } catch (e) {
            console.warn('从缓存加载文章列表失败:', e);
        }
        
        console.log('❌ 未找到有效的文章列表缓存');
        return this.articles || [];
    }

    // 过滤并渲染文章列表
    filterAndRenderArticles() {
        // 获取当前分类
        const currentCategory = categoryManager.getCurrentCategory();
        
        // 如果有搜索词，应用搜索功能
        if (this.searchTerm) {
            console.log(`使用搜索词过滤: "${this.searchTerm}"`);
            this.performSearch();
            return;  // 搜索模式下不进行其他处理
        }
        
        // 如果没有搜索词，则完全交由categoryManager处理类别显示
        console.log(`交由categoryManager处理分类: "${currentCategory}"`);
        
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
        this.clearLoadMoreState();
        this.currentLoadingId = null;
    }

    // 加载和显示文章内容
    async loadAndDisplayArticle(pageId) {
        // 检查ID有效性
        if (!pageId || pageId === 'undefined' || pageId === 'null') {
            console.error('Invalid pageId in loadAndDisplayArticle:', pageId);
            throw new Error('无效的文章ID');
        }
        
        // 初始化加载状态
        this.isLoading = true;
        this.hasMore = false;
        this.nextCursor = null;
        
        // 创建新的 AbortController
        this.abortController = new AbortController();
        this.currentLoadingId = pageId;
        
        // 打印详细的请求信息
        console.log(`🔍 文章ID详情 - 长度: ${pageId.length}, 格式: ${pageId.includes('-') ? '含连字符' : '无连字符'}`);
        
        try {
            // 先尝试从缓存获取
            const cachedData = this.articleCache.getArticleFromCache(pageId);
            
            // 使用缓存数据或从API获取
            if (cachedData) {
                console.log('📦 从缓存加载文章:', pageId);
                
                // 保存缓存中的分页状态
                this.hasMore = cachedData.hasMore;
                this.nextCursor = cachedData.nextCursor;
                
                // 如果文章已完全加载，则不需要显示加载更多
                if (cachedData.isFullyLoaded === true) {
                    console.log('🎉 文章已完全加载，无需分页请求');
                    this.hasMore = false;
                    this.nextCursor = null;
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
            
            console.log('API返回的文章内容:', articleData);
            
            // 检查article结构是否有效
            if (!articleData || !articleData.blocks) {
                throw new Error('无效的文章内容');
            }
            
            // 缓存文章内容
            this.articleCache.setArticleCache(pageId, {
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

    // 设置文章滚动监听
    setupScrollListener() {
        console.log('设置滚动监听以加载更多内容');
        
        // 先移除可能存在的旧监听器
            if (this.scrollHandler) {
                window.removeEventListener('scroll', this.scrollHandler);
                this.scrollHandler = null;
            }

        // 使用throttle函数创建节流处理函数
        this.scrollHandler = throttle(() => {
                        if (this.isLoading || !this.hasMore) {
                            // 减少日志输出，仅在调试模式时输出
                            if (config.debug) {
                                console.log('跳过加载：', this.isLoading ? '正在加载中' : '没有更多内容');
                            }
                            return;
                        }

                        const loadMoreContainer = document.querySelector('.load-more-container');
                        if (!loadMoreContainer) return;

            // 检测滚动位置是否接近页面底部
                        const scrollPosition = window.scrollY + window.innerHeight;
                        const totalHeight = document.documentElement.scrollHeight;
                        const scrollPercentage = (scrollPosition / totalHeight) * 100;
                        const isNearPageBottom = scrollPercentage > 90;
                        
            // 备用检测：加载容器是否接近视口底部
                        const containerRect = loadMoreContainer.getBoundingClientRect();
                        const isNearViewportBottom = containerRect.top <= window.innerHeight + 200;

                        // 减少调试日志，仅在调试模式或触发加载时输出
                        if (isNearPageBottom && config.debug) {
                            console.log('滚动检测：', {
                                '滚动百分比': scrollPercentage.toFixed(2) + '%',
                                '接近页面底部': isNearPageBottom
                            });
                        }

                        // 使用最可靠的条件作为主要触发条件
                        if (isNearPageBottom || (isNearViewportBottom && containerRect.bottom > 0)) {
                this.triggerLoadMoreContent(loadMoreContainer, scrollPercentage);
            }
        }, 500);
        
        // 添加滚动监听
        window.addEventListener('scroll', this.scrollHandler);
        console.log('滚动监听器已添加');
    }

    // 触发加载更多内容
    triggerLoadMoreContent(loadMoreContainer, scrollPercentage) {
        // 如果正在加载或没有更多内容，立即返回
        if (this.isLoading || !this.hasMore) {
            return;
        }
        
                            console.log('触发加载更多内容 - 滚动位置: ' + scrollPercentage.toFixed(2) + '%');
        
        // 添加防抖处理，避免重复触发
        if (this.triggerDebounceTimeout) {
            clearTimeout(this.triggerDebounceTimeout);
        }
                            
                            // 平滑加载过程：先将加载指示器显示为"准备加载"状态
                            if (loadMoreContainer) {
                                // 使用CSS class控制状态，而不是直接修改innerHTML
                                loadMoreContainer.classList.add('loading-prepare');
                                
            // 使用防抖延迟，避免频繁触发
            this.triggerDebounceTimeout = setTimeout(() => {
                                    // 再次检查状态，避免延迟期间状态改变
                                    if (!this.isLoading && this.hasMore) {
                    console.log('执行加载更多内容操作');
                                        this.loadMoreContent();
                    // 清除触发状态
                    this.triggerDebounceTimeout = null;
                } else {
                    // 如果状态变了，移除准备加载状态
                    loadMoreContainer.classList.remove('loading-prepare');
                                    }
            }, 300); // 300毫秒的防抖延迟
                            }
                        }
                    
    // 添加平滑加载的CSS样式
    addSmoothLoadingStyles() {
                    if (!document.getElementById('smooth-loader-style')) {
                        const style = document.createElement('style');
                        style.id = 'smooth-loader-style';
                        style.innerHTML = `
                            .load-more-container {
                                transition: opacity 0.3s ease;
                                opacity: 0.6;
                            }
                            .load-more-container.loading-prepare {
                                opacity: 1;
                            }
                            .loading-spinner {
                                transition: transform 0.3s ease;
                            }
                            .loading-prepare .loading-spinner {
                                transform: scale(1.1);
                            }
                        `;
                        document.head.appendChild(style);
                    }
    }

    // 处理加载更多功能的配置
    configureLoadMoreFeature(articleContainer) {
        if (this.hasMore) {
            this.setupScrollListener();
            this.addSmoothLoadingStyles();
                } else {
                    console.log('没有更多内容，移除加载指示器');
                    const loadMoreContainer = articleContainer.querySelector('.load-more-container');
                    if (loadMoreContainer) {
                        loadMoreContainer.remove();
            }
        }
    }

    // 清理加载更多状态
    clearLoadMoreState() {
        // 清除滚动处理器
        if (this.scrollHandler) {
            window.removeEventListener('scroll', this.scrollHandler);
            this.scrollHandler = null;
        }
        
        // 清除防抖延迟定时器
        if (this.triggerDebounceTimeout) {
            clearTimeout(this.triggerDebounceTimeout);
            this.triggerDebounceTimeout = null;
        }
        
                // 重置加载状态
                this.isLoading = false;
        
        // 移除加载指示器的准备状态
        const loadMoreContainer = document.querySelector('.load-more-container');
        if (loadMoreContainer) {
            loadMoreContainer.classList.remove('loading-prepare');
        }
        
        console.log('已清理加载更多状态');
    }

    // 准备加载文章
    prepareArticleLoading(pageId) {
        // 防止重复加载同一篇文章
        if (this.currentLoadingId === pageId && this.isLoading) {
            console.log(`文章 ${pageId} 正在加载中，忽略重复请求`);
            return false;
        }

        // 更新树中的选中状态
        categoryManager.updateActiveState(null, pageId);

        // 如果正在加载其他文章，先取消那个加载
        if (this.currentLoadingId && this.currentLoadingId !== pageId) {
            this.cancelCurrentLoading();
        }

        // 清理之前的加载更多状态
        this.clearLoadMoreState();

        // 重置滚动位置
        window.scrollTo({
            top: 0,
            behavior: 'instant' 
        });

        // 记录当前正在加载的文章ID
        this.currentLoadingId = pageId;
        this.isLoading = true;

        // 使用showArticleLoadingState显示加载状态
        showArticleLoadingState();
        
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
            
            // 准备加载
            if (!this.prepareArticleLoading(pageId)) {
                return false;
            }

            try {
                // 更新URL参数
                UrlUtils.updateParam('article', pageId);
                
                // 加载文章数据
                const articleData = await this.loadAndDisplayArticle(pageId);
                if (!articleData) {
                    console.log('文章加载已取消');
                    return false;
                }
                
                console.log('文章数据:', articleData);
                
                // 设置当前页面ID和分页状态
                this.currentPageId = pageId;
                this.hasMore = articleData.hasMore;
                this.nextCursor = articleData.nextCursor;
                this.loadedBlocks = articleData.blocks || [];
                
                console.log('分页状态:', {
                    hasMore: this.hasMore,
                    nextCursor: this.nextCursor,
                    blocksCount: this.loadedBlocks.length
                });
                
                // 显示文章内容
                const articleBody = displayArticleContent(
                    articleData, 
                    renderNotionBlocks, 
                    'article-container', 
                    this.hasMore
                );
                
                // 处理懒加载
                if (articleBody) {
                    initializeLazyLoading(articleBody);
                }
                
                // 配置加载更多功能
                this.configureLoadMoreFeature(articleContainer);
                
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

    // 构建加载更多内容的API URL
    buildLoadMoreApiUrl() {
        const apiBaseUrl = config.api?.baseUrl || '/api';
        const cursorParam = this.nextCursor ? `&cursor=${this.nextCursor}` : '';
        return `${apiBaseUrl}/content/${this.currentPageId}?type=article&page_size=10${cursorParam}`;
    }

    // 获取更多内容的数据
    async fetchMoreContent() {
        const apiUrl = this.buildLoadMoreApiUrl();
                console.log('加载更多内容 URL:', apiUrl);
                
                const response = await fetch(apiUrl);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('加载更多内容响应:', data);
                
        return data;
    }

    // 处理新加载的内容数据
    processMoreContentData(data) {
                // 更新分页状态
                this.hasMore = data.hasMore;
                this.nextCursor = data.nextCursor;

        // 如果没有新的内容块，直接返回
        if (!data.blocks || data.blocks.length === 0) {
            console.log('没有新的内容块');
            return null;
        }
        
                    console.log(`加载了 ${data.blocks.length} 个新块`);
                    
                    // 添加到已加载的块中
                    this.loadedBlocks = this.loadedBlocks || [];
                    this.loadedBlocks = this.loadedBlocks.concat(data.blocks);
                    
        return data.blocks;
    }

    // 更新缓存数据
    updateArticleCache(newBlocks) {
        if (!newBlocks || newBlocks.length === 0) return;
        
        // 从缓存获取现有数据，合并内容再更新
        const cachedData = this.articleCache.getArticleFromCache(this.currentPageId) || {};
        const mergedBlocks = (cachedData.blocks || []).concat(newBlocks);
        
        // 更新缓存
                    const articleData = {
            page: cachedData.page,
                        blocks: mergedBlocks,
                        hasMore: this.hasMore,
                        nextCursor: this.nextCursor,
                        isFullyLoaded: !this.hasMore // 如果没有更多内容，标记为完全加载
                    };
                    
        this.articleCache.setArticleCache(this.currentPageId, articleData);
    }

    // 渲染新加载的内容
    renderMoreContent(newBlocks) {
        if (!newBlocks || newBlocks.length === 0) return;
                    
                    // 渲染新内容
        const newContent = renderNotionBlocks(newBlocks);
                    const articleBody = document.querySelector('.article-body');
                    if (articleBody) {
                        articleBody.insertAdjacentHTML('beforeend', newContent);
                        // 处理新加载内容中的图片和其他懒加载内容
                        imageLazyLoader.processImages(articleBody);
                        initializeLazyLoading(articleBody);
                    }
    }

    // 加载更多内容
    async loadMoreContent() {
        try {
            // 如果已经在加载中，则忽略此次请求
            if (this.isLoading) {
                console.log('已经在加载更多内容，忽略此次请求');
                return;
            }
            
            this.isLoading = true;
            console.log('加载更多内容...');

            // 使用updateLoadMoreStatus更新加载状态
            updateLoadMoreStatus(true, this.hasMore);

            // 确保有当前页面ID
            if (!this.currentPageId) {
                console.error('没有当前页面ID，无法加载更多内容');
                throw new Error('无法加载更多内容');
            }

            console.log('当前页面ID:', this.currentPageId);
            console.log('下一页游标:', this.nextCursor);

            try {
                // 获取更多内容
                const data = await this.fetchMoreContent();
                
                // 处理数据
                const newBlocks = this.processMoreContentData(data);
                
                // 更新缓存
                this.updateArticleCache(newBlocks);
                
                // 渲染新内容
                this.renderMoreContent(newBlocks);

                // 更新加载更多按钮状态
                updateLoadMoreStatus(false, this.hasMore);

                // 如果没有更多内容，移除滚动监听器
                if (!this.hasMore) {
                    this.clearLoadMoreState();
                    console.log('已加载所有内容，移除滚动监听');
                }

            } catch (error) {
                console.error('加载更多内容请求失败:', error);
                throw error;
            }

        } catch (error) {
            console.error('加载更多内容失败:', error);
            showStatus('加载更多内容失败: ' + error.message, true);
            
            // 显示错误状态
            updateLoadMoreStatus(false, this.hasMore, error.message);
        } finally {
            // 确保状态被正确清理
            this.isLoading = false;
            
            // 移除加载指示器的准备状态
            const loadMoreContainer = document.querySelector('.load-more-container');
            if (loadMoreContainer) {
                loadMoreContainer.classList.remove('loading-prepare');
            }
        }
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
            
            // 更新分类列表
            if (articles && articles.length > 0) {
                console.log('更新分类列表...');
                categoryManager.updateCategories(articles);
                
                // 设置分类变更和文章选择回调
                categoryManager.setOnCategoryChange((category) => {
                    console.log('分类变更:', category);
                    this.filterAndRenderArticles();
                });
                
                categoryManager.setOnArticleSelect((articleId) => {
                    console.log('文章选择:', articleId);
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
            // 获取URL中的文章ID参数
            const articleId = UrlUtils.getParam('article');
            
            // 如果URL中有文章ID，则加载该文章
            if (articleId) {
                console.log('从URL加载文章:', articleId);
                this.currentPageId = articleId;
                await this.showArticle(articleId);
                return true;
            }
            
            // 获取类别参数
            const category = UrlUtils.getParam('category');
            if (category) {
                console.log('从URL选择类别:', category);
                categoryManager.selectCategory(category);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('从URL初始化失败:', error);
            return false;
        }
    }

    // 清理过期缓存
    clearExpiredCache() {
        this.articleCache.clearExpiredCache();
    }

    // 获取分类的显示名称
    getCategoryDisplayName(category) {
        return this.categoryNameMap[category] || category;
    }

    // 显示欢迎页面
    showWelcomePage() {
        console.log('显示欢迎页面');
        
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
}

export const articleManager = new ArticleManager(); 