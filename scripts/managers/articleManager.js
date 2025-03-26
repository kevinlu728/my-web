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

// 导入目录导航组件
import tableOfContents from '../components/tableOfContents.js';

import { getArticlePlaceholder } from '../utils/placeholder-templates.js';

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
        this.requestIdentifier = 0; // 添加请求标识符
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
        
        // 使用searchArticles工具函数搜索匹配的文章
        const searchResults = searchArticles(this.articles, this.searchTerm);
        if (searchResults.length === 0) {
            console.log(`搜索"${this.searchTerm}"没有找到匹配的文章`);
        }
        
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
        try {
            this.articleCache.setItem('articles', this.articles);
            this.articleCache.setItem('categories', Array.from(new Set(this.articles.map(a => a.category))));
            // 日志调整为低级别
            console.debug('文章列表已保存到缓存');
        } catch (error) {
            console.warn('保存文章到缓存时出错:', error);
        }
    }

    // 从缓存加载文章列表
    loadArticlesFromCache() {
        try {
            const cachedArticles = this.articleCache.getItem('articles');
            if (cachedArticles && cachedArticles.length > 0) {
                this.articles = cachedArticles;
                // 日志调整为低级别
                console.debug('从缓存加载文章列表成功');
                
                // 如果有文章数据，显示在UI上
                if (this.articles.length > 0) {
                    // 同步更新DOM
                    this.filterAndRenderArticles();
                }
                
                // 返回成功加载的标志
                return true;
            }
        } catch (error) {
            console.warn('从缓存加载文章时出错:', error);
        }
        
        // 如果没有缓存数据或出错，返回失败标志
        return false;
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
        const requestId = this.requestIdentifier;
        console.log('开始加载文章:', pageId, '请求ID:', requestId);
        
        try {
            // 检查ID有效性
            if (!pageId || pageId === 'undefined' || pageId === 'null') {
                console.error('Invalid pageId in loadAndDisplayArticle:', pageId);
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
            
            // 打印详细的请求信息
            console.log(`🔍 文章ID详情 - 长度: ${pageId.length}, 格式: ${pageId.includes('-') ? '含连字符' : '无连字符'}`);
            
            // 先尝试从缓存获取
            const cachedData = this.articleCache.getArticleFromCache(pageId);
            
            // 使用缓存数据或从API获取
            if (cachedData) {
                console.log('📦 从缓存加载文章:', pageId);
                
                // 保存缓存中的分页状态，但首先检查缓存数据的有效性
                if (cachedData.hasMore === true && cachedData.nextCursor) {
                    this.hasMore = cachedData.hasMore;
                    this.nextCursor = cachedData.nextCursor;
                    console.log('从缓存恢复分页状态: hasMore=', this.hasMore, 'nextCursor=', this.nextCursor);
                } else {
                    // 如果缓存数据中没有有效的分页信息，强制重置
                    console.log('缓存中没有有效的分页信息，保持重置状态');
                    this.hasMore = false;
                    this.nextCursor = null;
                }
                
                // 如果文章已完全加载，则不需要显示加载更多
                if (cachedData.isFullyLoaded === true) {
                    console.log('🎉 文章已完全加载，无需分页请求');
                    this.hasMore = false;
                    this.nextCursor = null;
                }
                
                // 添加标记，表示这是从缓存加载的数据
                cachedData._fromCache = true;
                
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
            
            // ======= 关键修改点 =======
            // 双重检查：1. 检查当前文章ID是否匹配  2. 检查请求ID是否匹配
            if (this.currentPageId !== pageId || this.requestIdentifier !== requestId) {
                console.log('文章已切换或有更新请求，取消加载:', pageId, '请求ID:', requestId);
                return false;
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
        console.log('设置滚动监听以加载更多内容，hasMore=', this.hasMore, 'nextCursor=', this.nextCursor);
        
        // 如果没有更多内容或nextCursor无效，直接返回不设置监听
        if (!this.hasMore || !this.nextCursor) {
            console.log('没有更多内容或nextCursor无效，跳过设置滚动监听');
            return;
        }
        
        // 先移除可能存在的旧监听器
        if (this.scrollHandler) {
            window.removeEventListener('scroll', this.scrollHandler);
            this.scrollHandler = null;
        }

        // 使用throttle函数创建节流处理函数
        this.scrollHandler = throttle(() => {
            // 每次滚动时再次检查状态，确保不发送无效请求
            if (this.isLoading || !this.hasMore || !this.nextCursor) {
                // 减少日志输出，仅在调试模式时输出
                if (config.debug) {
                    console.log('跳过加载：', 
                        this.isLoading ? '正在加载中' : 
                        !this.hasMore ? '没有更多内容' : 
                        !this.nextCursor ? 'nextCursor无效' : '未知原因');
                }
                return;
            }

            const loadMoreContainer = document.querySelector('.load-more-container');
            if (!loadMoreContainer) return;

            // 检测滚动位置是否接近页面底部
            const scrollPosition = window.scrollY + window.innerHeight;
            const totalHeight = document.documentElement.scrollHeight;
            const scrollPercentage = (scrollPosition / totalHeight) * 100;
            
            // 降低触发门槛，更早地触发加载更多内容
            const isNearPageBottom = scrollPercentage > 85; // 原来是90，现在降低到85
            
            // 备用检测：加载容器是否接近视口底部
            const containerRect = loadMoreContainer.getBoundingClientRect();
            // 当容器进入视图区域的前300px时就开始准备加载
            const isNearViewportBottom = containerRect.top <= window.innerHeight + 300; // 原来是200，增加到300

            // 减少调试日志，仅在调试模式或触发加载时输出
            if (isNearPageBottom && config.debug) {
                console.log('滚动检测：', {
                    '滚动百分比': scrollPercentage.toFixed(2) + '%',
                    '接近页面底部': isNearPageBottom
                });
            }

            // 使用较宽松的条件触发加载
            if (isNearPageBottom || (isNearViewportBottom && containerRect.bottom > 0)) {
                this.triggerLoadMoreContent(loadMoreContainer, scrollPercentage);
            }
        }, 300); // 减少节流时间，从500ms改为300ms，让响应更快
        
        // 添加滚动监听
        window.addEventListener('scroll', this.scrollHandler);
        console.log('滚动监听器已添加');
    }

    // 触发加载更多内容
    triggerLoadMoreContent(loadMoreContainer, scrollPercentage) {
        // 再次检查状态有效性
        if (this.isLoading || !this.hasMore || !this.nextCursor) {
            // 如果状态无效，可能是在文章切换过程中仍触发了滚动事件
            if (!this.hasMore || !this.nextCursor) {
                // 更新UI显示没有更多内容
                if (loadMoreContainer) {
                    loadMoreContainer.innerHTML = '<div class="no-more">没有更多内容</div>';
                }
                // 移除滚动监听
                if (this.scrollHandler) {
                    window.removeEventListener('scroll', this.scrollHandler);
                    this.scrollHandler = null;
                }
            }
            return;
        }
        
        console.log('触发加载更多内容 - 滚动位置: ' + scrollPercentage.toFixed(2) + '%');
        
        // 防抖处理，避免重复触发
        if (this.triggerDebounceTimeout) {
            clearTimeout(this.triggerDebounceTimeout);
        }
        
        // 直接修改加载指示器显示加载中状态
        if (loadMoreContainer) {
            // 显示加载中状态
            loadMoreContainer.innerHTML = '<div class="loading-spinner"></div><div class="loading-text">加载中...</div>';
            
            // 使用防抖延迟，避免频繁触发
            this.triggerDebounceTimeout = setTimeout(() => {
                // 再次检查状态，避免延迟期间状态改变
                if (!this.isLoading && this.hasMore) {
                    console.log('执行加载更多内容操作');
                    this.loadMoreContent();
                    // 清除触发状态
                    this.triggerDebounceTimeout = null;
                } else {
                    // 检查是否还有更多内容
                    if (this.hasMore) {
                        loadMoreContainer.innerHTML = '<div class="loading-text">下拉加载更多</div>';
                    } else {
                        loadMoreContainer.innerHTML = '<div class="no-more">没有更多内容</div>';
                    }
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
                }
                .loading-spinner {
                    transition: transform 0.3s ease;
                }
                .loading-text {
                    transition: opacity 0.3s ease;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // 处理加载更多功能的配置
    configureLoadMoreFeature(articleContainer) {
        // 添加检查确保我们有有效的nextCursor
        const hasValidMoreContent = this.hasMore === true && this.nextCursor && typeof this.nextCursor === 'string' && this.nextCursor.trim() !== '';
        
        console.log('配置加载更多功能，hasMore=', this.hasMore, 'nextCursor=', this.nextCursor, '有效=', hasValidMoreContent);
        
        if (hasValidMoreContent) {
            // 有更多内容，设置滚动监听和平滑加载样式
            this.setupScrollListener();
            this.addSmoothLoadingStyles();
            
            // 确保加载更多容器存在且显示正确文本
            const loadMoreContainer = articleContainer.querySelector('.load-more-container');
            if (loadMoreContainer) {
                loadMoreContainer.innerHTML = '<div class="loading-text">下拉加载更多</div>';
            }
        } else {
            // 重置状态
            this.hasMore = false;
            this.nextCursor = null;
            
            console.log('没有更多内容或nextCursor无效，更新加载指示器显示');
            const loadMoreContainer = articleContainer.querySelector('.load-more-container');
            if (loadMoreContainer) {
                loadMoreContainer.innerHTML = '<div class="no-more">没有更多内容</div>';
            }
            
            // 确保移除滚动监听器
            if (this.scrollHandler) {
                window.removeEventListener('scroll', this.scrollHandler);
                this.scrollHandler = null;
            }
        }
    }

    // 清理加载更多状态
    clearLoadMoreState() {
        this.hasMore = false;
        this.nextCursor = null;
        this.isLoadingMore = false;
        
        // 更新加载更多容器的内容，但不移除它
        const loadMoreContainer = document.querySelector('.load-more-container');
        if (loadMoreContainer) {
            loadMoreContainer.innerHTML = '<div class="no-more">没有更多内容</div>';
        }
        
        // 确保移除滚动监听器
        if (this.scrollHandler) {
            window.removeEventListener('scroll', this.scrollHandler);
            this.scrollHandler = null;
        }
        
        console.log('已更新加载更多状态：没有更多内容');
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
        this.isLoadingMore = false;
        this.hasMore = false;
        this.nextCursor = null;
        this.currentPageId = pageId;
        
        // 重置右侧滚动容器的位置
        const rightColumn = document.querySelector('.blog-content .right-column');
        if (rightColumn) {
            rightColumn.scrollTop = 0;
        }
        
        // 移除可能的滚动监听器
        if (this.scrollHandler) {
            if (this.scrollContainer) {
                this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
            } else {
                window.removeEventListener('scroll', this.scrollHandler);
            }
            this.scrollHandler = null;
        }
        
        // 更新URL参数
        if (window.UrlUtils && window.UrlUtils.updateParam) {
            window.UrlUtils.updateParam('article', pageId);
        }
        
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
            
            // 强制清除之前的所有状态
            this.hasMore = false;
            this.nextCursor = null;
            this.loadedBlocks = [];
            this.clearLoadMoreState();
            
            // 移除可能的滚动监听器
            if (this.scrollHandler) {
                window.removeEventListener('scroll', this.scrollHandler);
                this.scrollHandler = null;
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
                
                // 再次验证分页状态
                if (articleData.hasMore === true && articleData.nextCursor) {
                    this.hasMore = articleData.hasMore;
                    this.nextCursor = articleData.nextCursor;
                } else {
                    // 如果没有有效的分页信息，强制为false
                    this.hasMore = false;
                    this.nextCursor = null;
                }
                
                this.loadedBlocks = articleData.blocks || [];
                
                console.log('分页状态:', {
                    hasMore: this.hasMore,
                    nextCursor: this.nextCursor,
                    nextCursor类型: typeof this.nextCursor,
                    nextCursor长度: this.nextCursor ? this.nextCursor.length : 0,
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
                    if (!this.hasMore) {
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
                this.configureLoadMoreFeature(articleContainer);
                
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

    // 构建加载更多内容的API URL
    buildLoadMoreApiUrl() {
        const apiBaseUrl = config.api?.baseUrl || '/api';
        
        // 严格验证nextCursor是否有效
        if (!this.nextCursor || typeof this.nextCursor !== 'string' || this.nextCursor.trim() === '') {
            console.warn('构建API URL时nextCursor无效:', this.nextCursor);
            return null;
        }
        
        // 验证当前文章ID
        if (!this.currentPageId || typeof this.currentPageId !== 'string' || this.currentPageId.trim() === '') {
            console.warn('构建API URL时currentPageId无效:', this.currentPageId);
            return null;
        }
        
        const cursorParam = `&cursor=${encodeURIComponent(this.nextCursor)}`;
        const url = `${apiBaseUrl}/content/${this.currentPageId}?type=article&page_size=10${cursorParam}`;
        
        console.log('构建API URL:', url);
        return url;
    }

    // 获取更多内容的数据
    async fetchMoreContent() {
        const apiUrl = this.buildLoadMoreApiUrl();
        
        // 检查URL是否有效
        if (!apiUrl) {
            throw new Error('无法构建有效的API URL，nextCursor可能无效');
        }
        
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
        
        // 在渲染前最后一次检查请求标识符
        const currentArticleBody = document.querySelector(`.article-body[data-article-id="${this.currentPageId}"]`);
        
        // 如果找不到当前文章的正文容器，不进行渲染
        if (!currentArticleBody) {
            console.log('未找到当前文章容器，取消渲染');
            return false;
        }
        
        // 保存目录元素引用，确保它不会被销毁
        const tocElement = document.querySelector('.article-toc');
        const isTocCollapsed = tocElement ? tocElement.classList.contains('collapsed') : false;
        const isTocVisible = tocElement ? tocElement.classList.contains('visible') : false;
        
        console.log('保存目录状态:', {
            存在: !!tocElement,
            已折叠: isTocCollapsed,
            移动设备可见: isTocVisible
        });
        
        // 渲染新内容
        const newContent = renderNotionBlocks(newBlocks);
        const articleBody = document.querySelector('.article-body');
        if (articleBody) {
            // 添加新内容前保存滚动位置
            const scrollPos = window.scrollY;
            
            // 添加新内容
            articleBody.insertAdjacentHTML('beforeend', newContent);
            
            // 处理新加载内容中的图片和其他懒加载内容
            imageLazyLoader.processImages(articleBody);
            initializeLazyLoading(articleBody);
            
            // 检查新内容中是否有标题元素
            const hasNewHeadings = newBlocks.some(block => 
                block.type === 'heading_1' || 
                block.type === 'heading_2' || 
                block.type === 'heading_3'
            );
            
            // 如果有新标题，则需要更新目录
            if (hasNewHeadings) {
                console.log('检测到新的标题元素，使用轻量方式更新目录导航');
                
                // 使用新的不销毁容器的方法更新目录内容
                const updateResult = tableOfContents.updateContent();
                console.log('目录更新结果:', updateResult);
                
                // 确保目录状态正确
                if (tocElement) {
                    if (isTocCollapsed) {
                        tocElement.classList.add('collapsed');
                    } else {
                        tocElement.classList.remove('collapsed');
                    }
                    
                    if (isTocVisible) {
                        tocElement.classList.add('visible');
                    } else {
                        tocElement.classList.remove('visible');
                    }
                }
            }
            
            // 防止页面因新内容导致的滚动位置变化
            window.scrollTo({
                top: scrollPos,
                behavior: 'auto'
            });
        }
    }

    // 加载更多内容
    async loadMoreContent() {
        // 保存当前请求标识符
        const requestId = this.requestIdentifier;
        const currentPageId = this.currentPageId;
        
        // 如果正在加载或没有更多内容，则不执行
        if (this.isLoadingMore || !this.hasMore) {
            console.log('跳过加载更多: 已在加载中或没有更多内容');
            return false;
        }
        
        // 添加超时保护，确保状态不会永久卡住
        const loadMoreTimeout = setTimeout(() => {
            if (this.isLoadingMore) {
                console.log('加载更多超时，强制重置状态');
                this.isLoadingMore = false;
            }
        }, 10000); // 10秒超时保护
        
        this.isLoadingMore = true;
        console.log('开始加载更多内容');
        
        try {
            const moreData = await this.fetchMoreContent();
            
            // ======= 关键修改点 =======
            // 双重检查：确保文章ID和请求ID都匹配
            if (this.currentPageId !== currentPageId || this.requestIdentifier !== requestId) {
                console.log('文章已切换或有更新请求，取消加载更多内容');
                this.isLoadingMore = false;
                return false;
            }
            
            if (!moreData || !moreData.blocks) {
                console.log('没有获取到更多内容或格式错误');
                this.isLoadingMore = false;
                return false;
            }
            
            // 处理数据
            const newBlocks = this.processMoreContentData(moreData);
            
            // 更新缓存
            this.updateArticleCache(newBlocks);
            
            // 渲染新内容
            this.renderMoreContent(newBlocks);

            // 如果没有更多内容，确保显示提示
            if (!this.hasMore) {
                console.log('已加载所有内容，更新状态显示');
                // 先更新UI状态以显示"没有更多内容"
                updateLoadMoreStatus(false, false);
            } else {
                // 还有更多内容，更新状态
                updateLoadMoreStatus(false, true);
            }

            // 完成后清除超时
            clearTimeout(loadMoreTimeout);
            this.isLoadingMore = false;
            return true;
        } catch (error) {
            console.error('加载更多内容失败:', error);
            // 确保在错误情况下也重置状态
            clearTimeout(loadMoreTimeout);
            this.isLoadingMore = false;
            return false;
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
        
        // 确保有文章数据
        if (!this.articles || this.articles.length === 0) {
            console.log('欢迎页面需要文章数据，但当前没有数据，尝试加载文章数据...');
            // 尝试从缓存加载
            const cachedArticles = this.loadArticlesFromCache();
            
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
}

export const articleManager = new ArticleManager(); 