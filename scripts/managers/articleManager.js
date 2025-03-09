/**
 * @file articleManager.js
 * @description 文章管理器，负责文章数据的获取、缓存和渲染
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-09
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
import { getArticles, getArticleContent, testApiConnection } from '../services/notionService.js';
import { categoryManager } from './categoryManager.js';
import { renderNotionBlocks, initializeLazyLoading } from '../components/articleRenderer.js';
import { imageLazyLoader } from '../utils/image-lazy-loader.js';
import { categoryConfig } from '../config/categories.js';
import config from '../config/config.js';

class ArticleManager {
    constructor() {
        this.articles = [];
        this.currentDatabaseId = null;
        this.searchTerm = '';
        this.cacheExpiration = 30 * 60 * 1000; // 缓存过期时间：30分钟
        this.cachePrefix = 'article_cache_';
        // 添加分类名称映射
        this.categoryNameMap = {
            'Test': '测试',
            'Computer Basis': '计算机基础',
            'Data Structure and Algorithm': '数据结构和算法',
        };
        this.initializeSearch();
        
        // 添加请求控制相关属性
        this.currentLoadingId = null;
        this.abortController = null;
        this.loadingStatus = new Map(); // 记录每篇文章的加载状态
    }

    // 缓存相关方法
    getCacheKey(pageId) {
        return `${this.cachePrefix}${pageId}`;
    }

    getArticleFromCache(pageId) {
        try {
            const cacheKey = this.getCacheKey(pageId);
            const cached = localStorage.getItem(cacheKey);
            if (!cached) return null;

            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp > this.cacheExpiration) {
                // 缓存过期，删除
                localStorage.removeItem(cacheKey);
                return null;
            }

            return data;
        } catch (error) {
            console.warn('读取缓存失败:', error);
            return null;
        }
    }

    setArticleCache(pageId, data) {
        try {
            const cacheKey = this.getCacheKey(pageId);
            const cacheData = {
                data,
                timestamp: Date.now()
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('写入缓存失败:', error);
        }
    }

    clearExpiredCache() {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.cachePrefix)) {
                    const cached = JSON.parse(localStorage.getItem(key));
                    if (Date.now() - cached.timestamp > this.cacheExpiration) {
                        localStorage.removeItem(key);
                    }
                }
            });
        } catch (error) {
            console.warn('清理缓存失败:', error);
        }
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
                
                // 显示欢迎页面
                console.log('显示欢迎页面...');
                this.showWelcomePage();
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

    // 初始化搜索功能
    initializeSearch() {
        const searchInput = document.getElementById('article-search');
        const clearButton = document.getElementById('search-clear');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.trim().toLowerCase();
                this.updateClearButton();
                this.filterAndRenderArticles();
            });
        }
        
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    this.searchTerm = '';
                    this.updateClearButton();
                    this.filterAndRenderArticles();
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
            
            // 测试 API 连接
            try {
                console.log('测试 API 连接...');
                const testData = await testApiConnection();
                console.log('API 测试成功:', testData);
                
                // 显示环境信息
                if (testData.env) {
                    console.log('环境信息:', testData.env);
                    if (!testData.env.NOTION_API_KEY_EXISTS) {
                        console.warn('警告: Notion API 密钥未设置');
                    }
                    if (!testData.env.NOTION_DATABASE_ID_EXISTS) {
                        console.warn('警告: Notion 数据库 ID 未设置');
                    }
                }
            } catch (testError) {
                console.error('API 测试异常:', testError);
                showError(`API 测试失败: ${testError.message}`);
                throw testError;
            }
            
            // 获取文章列表
            console.log('正在从 API 获取文章列表...');
            const articles = await getArticles(this.currentDatabaseId);
            
            // 如果请求已取消，不继续处理
            if (signal.aborted) {
                console.log('文章列表加载已取消');
                return;
            }
            
            console.log(`成功获取 ${articles.length} 篇文章`);
            
            // 保存文章列表
            this.articles = articles;
            
            // 应用搜索过滤
            this.filterAndRenderArticles();
            
            // 显示成功状态
            showStatus('文章列表加载成功', false, 'success');
            
            // 如果没有文章，显示提示
            if (articles.length === 0) {
                showStatus('没有找到文章', false, 'info');
            }
            
            return articles;
        } catch (error) {
            console.error('Error loading articles:', error);
            
            // 显示错误状态
            showError(`加载文章列表失败: ${error.message}`);
            
            throw error;
        } finally {
            // 清除 AbortController
            this.abortController = null;
        }
    }

    // 搜索文章
    searchArticles(articles) {
        if (!this.searchTerm || !articles || articles.length === 0) return articles;

        const searchTerm = this.searchTerm.toLowerCase();
        console.log(`搜索文章，关键词: "${searchTerm}"`);

        return articles.filter(article => {
            // 提取标题
            let title = '';
            if (article.title) {
                title = article.title;
            } else if (article.properties && article.properties.Title) {
                title = article.properties.Title.title?.[0]?.plain_text || '';
            }
            
            // 提取分类
            const category = this.getArticleCategory(article);
            
            // 搜索匹配
            const titleMatch = title.toLowerCase().includes(searchTerm);
            const categoryMatch = category.toLowerCase().includes(searchTerm);
            
            return titleMatch || categoryMatch;
        });
    }

    // 获取文章分类
    getArticleCategory(article) {
        // 如果文章对象已经包含 category 属性，直接使用
        if (article.category) {
            return article.category;
        }
        
        // 否则尝试从 properties 中提取
        if (article.properties) {
            const categoryProp = article.properties.Category;
            if (categoryProp) {
                if (categoryProp.select && categoryProp.select.name) {
                    return categoryProp.select.name;
                } else if (categoryProp.multi_select && Array.isArray(categoryProp.multi_select) && categoryProp.multi_select.length > 0) {
                    return categoryProp.multi_select[0].name;
                }
            }
        }
        
        // 默认分类
        return 'Uncategorized';
    }

    // 高亮搜索结果
    highlightSearchTerm(text) {
        if (!this.searchTerm || !text) return text;
        
        const regex = new RegExp(this.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        return text.replace(regex, match => `<span class="search-highlight">${match}</span>`);
    }

    // 过滤并渲染文章列表
    filterAndRenderArticles() {
        const articleList = document.getElementById('article-list');
        if (!articleList) return;

        // 获取当前分类
        const currentCategory = categoryManager.getCurrentCategory();
        
        // 如果没有文章，显示提示
        if (!this.articles || this.articles.length === 0) {
            articleList.innerHTML = '<li class="no-results">暂无文章</li>';
            return;
        }
        
        // 应用搜索过滤
        let filteredArticles = this.articles;
        if (this.searchTerm) {
            filteredArticles = this.searchArticles(this.articles);
            if (filteredArticles.length === 0) {
                articleList.innerHTML = `<li class="no-results">没有找到与 "${this.searchTerm}" 相关的文章</li>`;
                return;
            }
        }
        
        console.log('渲染文章列表:', filteredArticles);
        
        // 渲染文章列表
        articleList.innerHTML = filteredArticles.map(article => {
            // 提取标题
            const title = article.title || 'Untitled';
            
            // 提取分类
            const category = article.category || 'Uncategorized';
            
            // 提取日期
            let date = '';
            if (article.publish_date) {
                // 转换日期格式为 YYYY/M/D
                const dateObj = new Date(article.publish_date);
                date = `${dateObj.getFullYear()}/${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
            } else if (article.created_time) {
                // 转换日期格式为 YYYY/M/D
                const dateObj = new Date(article.created_time);
                date = `${dateObj.getFullYear()}/${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
            }
            
            // 只在搜索时高亮显示
            const highlightedTitle = this.searchTerm ? this.highlightSearchTerm(title) : title;
            
            // 检查是否是当前选中的文章
            const isActive = this.currentLoadingId === article.id ? 'active' : '';
            
            return `
                <li class="article-item ${isActive}" data-category="${category}" data-article-id="${article.id}">
                    <a href="#" onclick="showArticle('${article.id}'); return false;">
                        <span class="article-title-text">${highlightedTitle}</span>
                        ${date ? `<span class="article-date">${date}</span>` : ''}
                    </a>
                </li>
            `;
        }).join('');

        // 应用分类过滤
        this.filterArticles(currentCategory);
    }

    // 渲染文章列表（覆盖原方法）
    renderArticleList() {
        this.filterAndRenderArticles();
    }

    // 过滤文章列表
    filterArticles(category) {
        console.log(`过滤文章列表，分类: ${category}`);
        const articleList = document.getElementById('article-list');
        if (!articleList) {
            console.warn('文章列表元素不存在');
            return;
        }

        const articles = Array.from(articleList.children);
        console.log(`文章列表中有 ${articles.length} 篇文章`);
        
        let visibleCount = 0;
        articles.forEach(article => {
            if (article.classList.contains('loading') || article.classList.contains('no-results')) {
                console.log('跳过特殊元素:', article.className);
                return;
            }
            
            const articleCategory = article.dataset.category;
            const shouldShow = category === 'all' || articleCategory === category;
            
            if (shouldShow) {
                article.style.display = '';
                visibleCount++;
            } else {
                article.style.display = 'none';
            }
        });
        
        console.log(`过滤后显示 ${visibleCount} 篇文章`);
        
        // 如果没有可见的文章，显示提示
        if (visibleCount === 0 && articles.length > 0) {
            const noResultsElement = document.createElement('li');
            noResultsElement.className = 'no-results';
            noResultsElement.textContent = `没有 "${category}" 分类的文章`;
            articleList.appendChild(noResultsElement);
        }
    }

    // 取消当前加载
    cancelCurrentLoading() {
        if (this.abortController) {
            console.log('取消当前加载请求');
            this.abortController.abort();
            this.abortController = null;
        }
        this.isLoading = false;
        this.currentLoadingId = null;
    }

    // 加载和显示文章内容
    async loadAndDisplayArticle(pageId) {
        try {
            // 初始化加载状态
            this.isLoading = true;
            this.hasMore = false;
            this.nextCursor = null;
            
            // 创建新的 AbortController
            this.abortController = new AbortController();
            this.currentLoadingId = pageId;
            
            // 先尝试从缓存获取
            const cachedData = this.getArticleFromCache(pageId);
            if (cachedData && cachedData.isComplete) { // 只有完整加载的文章才使用缓存
                console.log('📦 从缓存加载文章:', pageId);
                this.isLoading = false;
                return cachedData;
            }

            console.log('🌐 从网络加载文章:', pageId);
            
            let retryCount = 0;
            const maxRetries = 3;
            const timeout = 10000;
            
            while (retryCount < maxRetries) {
                try {
                    const timeoutId = setTimeout(() => {
                        if (this.abortController) {
                            this.abortController.abort();
                        }
                        console.log('请求超时，正在中断...');
                    }, timeout);
                    
                    console.log(`正在发起第${retryCount + 1}次请求...`);
                    
                    // 使用 notionService 获取文章内容
                    const articleData = await getArticleContent(pageId);
                    
                    clearTimeout(timeoutId);
                    
                    if (!articleData) {
                        throw new Error('获取文章内容失败');
                    }
                    
                    // 缓存文章内容
                    this.setArticleCache(pageId, {
                        ...articleData,
                        isComplete: true
                    });
                    
                    this.isLoading = false;
                    return articleData;
                } catch (error) {
                    retryCount++;
                    console.error(`第${retryCount}次请求失败:`, error);
                    
                    if (retryCount >= maxRetries) {
                        throw error;
                    }
                    
                    // 等待一段时间后重试
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
            }
        } catch (error) {
            console.error('加载文章失败:', error);
            this.isLoading = false;
            throw error;
        } finally {
            this.abortController = null;
        }
    }

    // 显示文章内容
    async showArticle(pageId) {
        try {
            console.log('📄 开始加载文章:', pageId);
            const articleContainer = document.getElementById('article-container');
            if (!articleContainer) return;

            // 更新选中状态
            this.updateActiveArticle(pageId);

            // 如果正在加载其他文章，先取消那个加载
            if (this.currentLoadingId && this.currentLoadingId !== pageId) {
                this.cancelCurrentLoading();
            }

            // 移除之前的滚动监听器
            if (this.scrollHandler) {
                window.removeEventListener('scroll', this.scrollHandler);
                this.scrollHandler = null;
            }

            // 重置滚动位置
            window.scrollTo({
                top: 0,
                behavior: 'instant' // 使用 'instant' 而不是 'smooth' 以避免视觉干扰
            });

            // 显示加载状态
            articleContainer.innerHTML = `
                <div class="article-loading">
                    <div class="loading-content">
                        <div class="loading-skeleton">
                            <div class="skeleton-title"></div>
                            <div class="skeleton-meta"></div>
                            <div class="skeleton-paragraph">
                                <div class="skeleton-line"></div>
                                <div class="skeleton-line"></div>
                                <div class="skeleton-line"></div>
                                <div class="skeleton-line" style="width: 80%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            try {
                const articleData = await this.loadAndDisplayArticle(pageId);
                // 检查是否因切换文章而取消加载
                if (!articleData) {
                    console.log('文章加载已取消');
                    return;
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
                
                // 提取文章标题
                let title = '无标题';
                if (articleData.page && articleData.page.properties) {
                    const titleProp = articleData.page.properties.Title || articleData.page.properties.Name;
                    if (titleProp && titleProp.title && titleProp.title.length > 0) {
                        title = titleProp.title[0].plain_text;
                    }
                }
                
                console.log('🔄 渲染文章内容...');
                
                // 渲染文章内容
                const blocks = articleData.blocks || [];
                console.log('文章块数量:', blocks.length);
                const contentHtml = blocks.length > 0 ? 
                    renderNotionBlocks(blocks) : 
                    '<p>该文章暂无内容</p>';
                
                // 更新DOM
                articleContainer.innerHTML = `
                    <h1 class="article-title">${title}</h1>
                    <div class="article-body">
                        ${contentHtml}
                    </div>
                    ${this.hasMore ? '<div class="load-more-container"><div class="loading-spinner"></div></div>' : ''}
                `;

                // 处理文章中的图片和其他内容
                const articleBody = articleContainer.querySelector('.article-body');
                if (articleBody) {
                    console.log('🖼️ 处理文章中的图片...');
                    imageLazyLoader.processImages(articleBody);
                    initializeLazyLoading(articleBody);
                    
                    // 初始化表格懒加载
                    console.log('初始化表格懒加载...');
                    const tablePlaceholders = articleBody.querySelectorAll('.lazy-block.table-block');
                    console.log(`找到 ${tablePlaceholders.length} 个表格占位符`);
                    
                    if (tablePlaceholders.length > 0) {
                        if (window.tableLazyLoader && typeof window.tableLazyLoader.processAllTables === 'function') {
                            console.log('使用表格懒加载器处理所有表格...');
                            window.tableLazyLoader.processAllTables();
                        } else {
                            console.warn('tableLazyLoader 不可用或缺少processAllTables方法，无法初始化表格懒加载');
                        }
                    }
                }

                // 处理加载更多功能
                if (!this.hasMore) {
                    console.log('没有更多内容，移除加载指示器');
                    const loadMoreContainer = articleContainer.querySelector('.load-more-container');
                    if (loadMoreContainer) {
                        loadMoreContainer.remove();
                    }
                } else {
                    console.log('设置滚动监听以加载更多内容');
                    this.scrollHandler = this.throttle(() => {
                        if (this.isLoading || !this.hasMore) {
                            console.log('跳过加载：', this.isLoading ? '正在加载中' : '没有更多内容');
                            return;
                        }

                        const loadMoreContainer = document.querySelector('.load-more-container');
                        if (!loadMoreContainer) return;

                        const containerRect = loadMoreContainer.getBoundingClientRect();
                        const isNearBottom = containerRect.top <= window.innerHeight + 100;

                        if (isNearBottom) {
                            console.log('触发加载更多内容...');
                            this.loadMoreContent();
                        }
                    }, 200);
                    
                    window.addEventListener('scroll', this.scrollHandler);
                }
                
                return true;
            } catch (error) {
                console.error('渲染文章失败:', error);
                articleContainer.innerHTML = `
                    <h1 class="article-title">加载失败</h1>
                    <div class="article-body">
                        <p>文章加载失败: ${error.message}</p>
                        <p><button onclick="showArticle('${pageId}')">重试</button></p>
                    </div>
                `;
                return false;
            }
        } catch (error) {
            console.error('显示文章失败:', error);
            return false;
        }
    }

    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // 加载更多内容
    async loadMoreContent() {
        try {
            this.isLoading = true;
            console.log('加载更多内容...');

            // 更新加载状态显示
            const loadMoreContainer = document.querySelector('.load-more-container');
            if (loadMoreContainer) {
                loadMoreContainer.innerHTML = '<div class="loading-spinner"></div><div class="loading-text">加载中...</div>';
            }

            // 确保有当前页面ID和下一页游标
            if (!this.currentPageId) {
                console.error('没有当前页面ID，无法加载更多内容');
                throw new Error('无法加载更多内容');
            }

            console.log('当前页面ID:', this.currentPageId);
            console.log('下一页游标:', this.nextCursor);

            try {
                // 使用 notionService 获取更多内容
                const apiUrl = `${config.api?.baseUrl || '/api'}/article-content/${this.currentPageId}?page_size=10${this.nextCursor ? `&cursor=${this.nextCursor}` : ''}`;
                console.log('加载更多内容 URL:', apiUrl);
                
                const response = await fetch(apiUrl);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('加载更多内容响应:', data);
                
                // 更新分页状态
                this.hasMore = data.hasMore;
                this.nextCursor = data.nextCursor;

                // 处理新加载的块
                if (data.blocks && data.blocks.length > 0) {
                    console.log(`加载了 ${data.blocks.length} 个新块`);
                    
                    // 添加到已加载的块中
                    this.loadedBlocks = this.loadedBlocks || [];
                    this.loadedBlocks = this.loadedBlocks.concat(data.blocks);
                    
                    // 更新缓存
                    const articleData = {
                        page: data.page,
                        blocks: this.loadedBlocks,
                        hasMore: this.hasMore,
                        nextCursor: this.nextCursor
                    };
                    this.setArticleCache(this.currentPageId, articleData);
                    
                    // 渲染新内容
                    const newContent = renderNotionBlocks(data.blocks);
                    const articleBody = document.querySelector('.article-body');
                    if (articleBody) {
                        articleBody.insertAdjacentHTML('beforeend', newContent);
                        // 处理新加载内容中的图片和其他懒加载内容
                        imageLazyLoader.processImages(articleBody);
                        initializeLazyLoading(articleBody);
                    }
                } else {
                    console.log('没有新的内容块');
                }

                // 更新加载更多按钮状态
                if (loadMoreContainer) {
                    if (this.hasMore) {
                        loadMoreContainer.innerHTML = '<div class="loading-spinner"></div>';
                    } else {
                        loadMoreContainer.innerHTML = '<div class="no-more">没有更多内容</div>';
                        // 移除滚动监听器
                        if (this.scrollHandler) {
                            window.removeEventListener('scroll', this.scrollHandler);
                            this.scrollHandler = null;
                        }
                    }
                }

            } catch (error) {
                console.error('加载更多内容请求失败:', error);
                throw error;
            }

        } catch (error) {
            console.error('加载更多内容失败:', error);
            showStatus('加载更多内容失败: ' + error.message, true);
            
            // 显示错误状态
            const loadMoreContainer = document.querySelector('.load-more-container');
            if (loadMoreContainer) {
                loadMoreContainer.innerHTML = `
                    <div class="error">
                        ${error.message}，<a href="#" onclick="articleManager.loadMoreContent(); return false;">点击重试</a>
                    </div>
                `;
            }
        } finally {
            this.isLoading = false;
        }
    }

    // 更新数据库ID
    updateDatabaseId(newDatabaseId) {
        this.currentDatabaseId = newDatabaseId;
        this.loadArticles();
    }

    // 显示欢迎页面
    showWelcomePage() {
        console.log('显示欢迎页面');
        const articleContainer = document.getElementById('article-container');
        if (!articleContainer) {
            console.warn('文章容器不存在，无法显示欢迎页面');
            return;
        }
        
        if (!this.articles || this.articles.length === 0) {
            console.warn('没有文章数据，显示简单欢迎页面');
            articleContainer.innerHTML = `
                <div class="welcome-page">
                    <div class="welcome-header">
                        <h1>温故知新，回望前行</h1>
                        <p class="welcome-subtitle">这里记录了一些技术学习和思考，欢迎讨论和指正</p>
                    </div>
                    <div class="welcome-content">
                        <p>暂无文章，请稍后再试</p>
                    </div>
                </div>
            `;
            return;
        }

        articleContainer.innerHTML = `
            <div class="welcome-page">
                <div class="welcome-header">
                    <h1>温故知新，回望前行</h1>
                    <p class="welcome-subtitle">这里记录了一些技术学习和思考，欢迎讨论和指正</p>
                </div>
                
                <div class="welcome-content">
                    <div class="welcome-section">
                        <h2>📚 快速开始</h2>
                        <ul>
                            <li>从左侧文章列表选择感兴趣的主题</li>
                            <li>使用顶部搜索框查找特定内容</li>
                            <li>通过分类筛选相关文章</li>
                        </ul>
                    </div>
                    
                    <div class="welcome-section">
                        <h2>🏷️ 主要分类</h2>
                        <div class="category-tags" id="welcome-categories"></div>
                    </div>
                    
                    <div class="welcome-section">
                        <h2>✨ 最新文章</h2>
                        <div class="recent-articles" id="welcome-recent-articles"></div>
                    </div>
                </div>
            </div>
        `;

        // 添加分类标签
        const categoriesContainer = document.getElementById('welcome-categories');
        if (categoriesContainer) {
            const categories = new Set();
            this.articles.forEach(article => {
                const category = this.getArticleCategory(article);
                if (category && category !== 'Uncategorized') categories.add(category);
            });

            // 定义分类颜色映射
            const categoryColors = this.getCategoryColors();

            categoriesContainer.innerHTML = Array.from(categories)
                .sort()
                .map(category => {
                    const colors = categoryColors[category] || categoryColors.default;
                    const displayName = this.getCategoryDisplayName(category);
                    return `
                        <div class="category-tag" 
                             onclick="categoryManager.selectCategory('${category}')"
                             style="background-color: ${colors.bg}; 
                                    color: ${colors.color};"
                             data-hover-bg="${colors.hoverBg}"
                             data-category="${category}">
                            ${displayName}
                        </div>
                    `;
                }).join('');

            // 添加悬停效果
            const categoryTags = categoriesContainer.getElementsByClassName('category-tag');
            Array.from(categoryTags).forEach(tag => {
                const hoverBg = tag.dataset.hoverBg;
                tag.addEventListener('mouseenter', () => {
                    tag.style.backgroundColor = hoverBg;
                });
                tag.addEventListener('mouseleave', () => {
                    tag.style.backgroundColor = categoryColors[tag.dataset.category]?.bg || categoryColors.default.bg;
                });
            });
        }

        // 添加最新文章
        const recentArticlesContainer = document.getElementById('welcome-recent-articles');
        if (recentArticlesContainer) {
            // 按发布时间排序并获取最新的3篇文章
            const recentArticles = [...this.articles]
                .filter(article => article.publish_date || article.created_time) // 确保有日期
                .sort((a, b) => {
                    // 如果两篇文章都有发布时间，按发布时间降序排序
                    if (a.publish_date && b.publish_date) {
                        return new Date(b.publish_date) - new Date(a.publish_date);
                    }
                    // 如果只有 a 有发布时间，a 排在前面
                    if (a.publish_date) return -1;
                    // 如果只有 b 有发布时间，b 排在前面
                    if (b.publish_date) return 1;
                    // 如果都没有发布时间，按创建时间降序排序
                    return new Date(b.created_time) - new Date(a.created_time);
                })
                .slice(0, 3);

            recentArticlesContainer.innerHTML = recentArticles
                .map(article => {
                    const title = article.title || '无标题';
                    let date = '';
                    // 优先使用发布时间，如果没有则使用创建时间
                    const dateToUse = article.publish_date || article.created_time;
                    if (dateToUse) {
                        const dateObj = new Date(dateToUse);
                        date = `${dateObj.getFullYear()}/${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
                    }

                    return `
                        <div class="recent-article-item" onclick="showArticle('${article.id}')">
                            <div class="recent-article-title">${title}</div>
                            ${date ? `<span class="recent-article-date">${date}</span>` : ''}
                        </div>
                    `;
                }).join('');
        }

        // 添加或更新样式
        const existingStyle = document.getElementById('welcome-page-style');
        if (!existingStyle) {
            const style = document.createElement('style');
            style.id = 'welcome-page-style';
            style.textContent = `
                .welcome-page {
                    padding: 2rem;
                    max-width: 800px;
                    margin: 0 auto;
                }
                
                .welcome-header {
                    text-align: center;
                    margin-bottom: 3rem;
                    padding-bottom: 2rem;
                    border-bottom: 1px solid #eee;
                }
                
                .welcome-header h1 {
                    font-size: 2.5rem;
                    color: #2c3e50;
                    margin-bottom: 1rem;
                }
                
                .welcome-subtitle {
                    font-size: 1.2rem;
                    color: #7f8c8d;
                }
                
                .welcome-section {
                    margin-bottom: 2.5rem;
                }
                
                .welcome-section h2 {
                    font-size: 1.5rem;
                    color: #2c3e50;
                    margin-bottom: 1rem;
                    border-left: 4px solid #3498db;
                    padding-left: 10px;
                }
                
                .welcome-section ul {
                    padding-left: 1.5rem;
                }
                
                .welcome-section li {
                    margin-bottom: 0.5rem;
                    color: #34495e;
                }
                
                .category-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.8rem;
                    margin-top: 1rem;
                }
                
                .category-tag {
                    padding: 0.4rem 1rem;
                    border-radius: 20px;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: none;
                }
                
                .category-tag:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                .recent-articles {
                    margin-top: 1rem;
                }
                
                .recent-article-item {
                    padding: 1rem;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                    background-color: #f8f9fa;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .recent-article-item:hover {
                    background-color: #e9ecef;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                }
                
                .recent-article-title {
                    font-weight: 500;
                    color: #2c3e50;
                }
                
                .recent-article-date {
                    font-size: 0.85rem;
                    color: #7f8c8d;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // 获取分类的显示名称
    getCategoryDisplayName(category) {
        return categoryConfig.nameMap[category] || category;
    }

    // 获取分类颜色
    getCategoryColors() {
        return categoryConfig.colors;
    }

    // 更新选中状态
    updateActiveArticle(pageId) {
        // 移除所有文章的选中状态
        document.querySelectorAll('.article-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // 添加新的选中状态
        const activeArticle = document.querySelector(`.article-item[data-article-id="${pageId}"]`);
        if (activeArticle) {
            activeArticle.classList.add('active');
        }
    }
}

export const articleManager = new ArticleManager(); 