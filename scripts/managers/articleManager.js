// 文章管理模块
import { showStatus, showLoading, showError } from '../utils/utils.js';
import { getArticles, getArticleContent } from '../services/notionService.js';
import { categoryManager } from './categoryManager.js';
import { renderNotionBlocks, initializeLazyLoading } from '../components/articleRenderer.js';
import { imageLazyLoader } from '../utils/image-lazy-loader.js';
import { categoryConfig } from '../config/categories.js';

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
            'Compter Basis': '计算机基础',
        };
        this.initializeSearch();
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
    initialize(databaseId) {
        this.currentDatabaseId = databaseId;
        this.loadArticles();
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
            const articleList = document.getElementById('article-list');
            if (!articleList) return;

            showLoading(articleList, '加载中...');

            // 清理过期缓存
            this.clearExpiredCache();

            // 尝试从缓存获取文章列表
            const cachedList = this.getArticleFromCache('article_list');
            if (cachedList) {
                console.log('📦 从缓存加载文章列表');
                this.articles = cachedList;
                this.renderArticleList();
                categoryManager.updateCategories(this.articles);
                this.showWelcomePage();
                return;
            }

            console.log('🌐 从网络加载文章列表');
            const response = await fetch('/api/articles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ database_id: this.currentDatabaseId })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data || !data.results) {
                articleList.innerHTML = '<li class="error">加载失败: 无效的数据格式</li>';
                return;
            }
            
            if (data.results.length === 0) {
                articleList.innerHTML = '<li>暂无文章</li>';
                return;
            }

            this.articles = data.results;
            
            // 缓存文章列表
            this.setArticleCache('article_list', this.articles);
            
            // 更新分类列表
            categoryManager.updateCategories(this.articles);
            
            // 显示文章列表
            this.renderArticleList();

            // 在数据加载完成后显示欢迎页面
            this.showWelcomePage();
            
        } catch (error) {
            console.error('Error loading articles:', error);
            const articleList = document.getElementById('article-list');
            if (articleList) {
                articleList.innerHTML = `<li class="error">加载失败: ${error.message}</li>`;
            }
            showStatus(`加载文章列表失败: ${error.message}`, true);
        }
    }

    // 搜索文章
    searchArticles(articles) {
        if (!this.searchTerm) return articles;

        return articles.filter(article => {
            const title = article.properties?.Title?.title[0]?.plain_text || '';
            const category = this.getArticleCategory(article);
            
            return title.toLowerCase().includes(this.searchTerm) ||
                   category.toLowerCase().includes(this.searchTerm);
        });
    }

    // 获取文章分类
    getArticleCategory(article) {
        const categoryProp = article.properties?.Category;
        if (categoryProp) {
            if (categoryProp.type === 'select' && categoryProp.select?.name) {
                return categoryProp.select.name;
            } else if (categoryProp.type === 'multi_select' && categoryProp.multi_select?.length > 0) {
                return categoryProp.multi_select[0].name;
            }
        }
        return '未分类';
    }

    // 高亮搜索结果
    highlightSearchTerm(text) {
        if (!this.searchTerm || !text) return text;
        
        const regex = new RegExp(this.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        return text.replace(regex, match => `<span class="search-highlight">${match}</span>`);
    }

    // 过滤并渲染文章列表
    filterAndRenderArticles() {
        const currentCategory = categoryManager.getCurrentCategory();
        const filteredArticles = this.searchArticles(this.articles);
        
        const articleList = document.getElementById('article-list');
        if (!articleList) return;

        if (filteredArticles.length === 0) {
            articleList.innerHTML = '<li class="no-results">没有找到匹配的文章</li>';
            return;
        }

        // 按发布日期排序
        const sortedArticles = filteredArticles.sort((a, b) => {
            const dateA = a.properties?.['Publish Date']?.date?.start || '';
            const dateB = b.properties?.['Publish Date']?.date?.start || '';
            return dateB.localeCompare(dateA); // 降序排列，最新的在前
        });

        articleList.innerHTML = sortedArticles.map(article => {
            const title = article.properties?.Title?.title[0]?.plain_text || '无标题';
            const category = this.getArticleCategory(article);
            
            // 使用 Publish Date 字段
            let date = '';
            const publishDate = article.properties?.['Publish Date']?.date?.start;
            if (publishDate) {
                // 转换日期格式为 YYYY/M/D
                const dateObj = new Date(publishDate);
                date = `${dateObj.getFullYear()}/${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
            }
            
            // 只在搜索时高亮显示
            const highlightedTitle = this.searchTerm ? this.highlightSearchTerm(title) : title;
            
            return `
                <li class="article-item" data-category="${category}">
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

    // 过滤文章列表（覆盖原方法）
    filterArticles(category) {
        const articleList = document.getElementById('article-list');
        if (!articleList) return;

        const articles = Array.from(articleList.children);
        
        articles.forEach(article => {
            if (article.classList.contains('loading') || article.classList.contains('no-results')) return;
            
            const articleCategory = article.dataset.category;
            if (category === 'all' || articleCategory === category) {
                article.style.display = '';
            } else {
                article.style.display = 'none';
            }
        });
    }

    // 加载和显示文章内容
    async loadAndDisplayArticle(pageId) {
        try {
            // 初始化加载状态
            this.isLoading = false;
            this.hasMore = true;
            this.nextCursor = null;
            
            // 先尝试从缓存获取
            const cachedData = this.getArticleFromCache(pageId);
            if (cachedData) {
                console.log('📦 从缓存加载文章:', pageId);
                return cachedData;
            }

            console.log('🌐 从网络加载文章:', pageId);
            showStatus('加载中...', false);
            
            let retryCount = 0;
            const maxRetries = 3;
            const timeout = 10000; // 10秒超时
            
            while (retryCount < maxRetries) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => {
                        controller.abort();
                        console.log('请求超时，正在中断...');
                    }, timeout);
                    
                    console.log(`正在发起第${retryCount + 1}次请求...`);
                    
                    const response = await fetch(`/api/article-content/${pageId}?page_size=10`, {
                        signal: controller.signal,
                        headers: {
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache'
                        }
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) {
                        throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
                    }

                    console.log('服务器响应成功，正在解析数据...');
                    const data = await response.json();
                    
                    // 更新分页状态
                    this.hasMore = data.hasMore;
                    this.nextCursor = data.nextCursor;
                    this.currentPageId = pageId;

                    // 存储已加载的块
                    this.loadedBlocks = data.blocks || [];
                    console.log(`成功加载 ${this.loadedBlocks.length} 个内容块`);

                    // 缓存文章数据
                    const articleData = {
                        page: data.page,
                        results: this.loadedBlocks,
                        hasMore: this.hasMore,
                        nextCursor: this.nextCursor
                    };
                    this.setArticleCache(pageId, articleData);

                    return articleData;
                } catch (error) {
                    retryCount++;
                    console.error(`第${retryCount}次请求失败:`, error);
                    
                    if (error.name === 'AbortError') {
                        console.log('请求超时，正在重试...');
                        if (retryCount < maxRetries) {
                            showStatus('加载超时，正在重试...', true);
                        }
                    } else {
                        console.log(`加载失败，第${retryCount}次重试...`);
                        if (retryCount < maxRetries) {
                            showStatus('加载失败，正在重试...', true);
                        }
                    }
                    
                    if (retryCount === maxRetries) {
                        throw new Error('加载失败，请稍后重试');
                    }
                    
                    // 指数退避重试
                    const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
                    console.log(`等待 ${delay}ms 后重试...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        } catch (error) {
            console.error('文章加载失败:', error);
            showStatus('加载失败', true);
            throw error;
        }
    }

    // 显示文章内容
    async showArticle(pageId) {
        try {
            console.log('📄 开始加载文章:', pageId);
            const articleContainer = document.getElementById('article-container');
            if (!articleContainer) return;

            // 移除之前的滚动监听器
            if (this.scrollHandler) {
                window.removeEventListener('scroll', this.scrollHandler);
                this.scrollHandler = null;
            }

            // 显示优化后的加载状态
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

            const articleData = await this.loadAndDisplayArticle(pageId);
            if (!articleData) {
                throw new Error('无法加载文章数据');
            }
            
            // 提取文章标题
            const title = articleData.page?.properties?.Title?.title[0]?.plain_text || 
                        articleData.page?.properties?.Name?.title[0]?.plain_text || 
                        '无标题';
            
            console.log('🔄 渲染文章内容...');
            
            // 渲染文章内容
            const contentHtml = renderNotionBlocks(articleData.results || []);
            
            // 更新DOM
            articleContainer.innerHTML = `
                <h1 class="article-title">${title}</h1>
                <div class="article-body">
                    ${contentHtml}
                </div>
                ${this.hasMore ? '<div class="load-more-container"><div class="loading-spinner"></div></div>' : ''}
            `;

            // 处理文章中的图片
            console.log('🖼️ 处理文章中的图片...');
            const articleBody = articleContainer.querySelector('.article-body');
            if (articleBody) {
                imageLazyLoader.processImages(articleBody);
                // 初始化表格和代码块的懒加载
                initializeLazyLoading(articleBody);
            }
            
            // 添加滚动监听
            this.scrollHandler = this.throttle(() => {
                if (this.isLoading || !this.hasMore) return;

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
            
            // 如果有代码高亮需求，可以在这里调用Prism
            if (window.Prism) {
                try {
                    Prism.highlightAll();
                } catch (error) {
                    console.warn('代码高亮失败:', error);
                }
            } else {
                console.warn('Prism.js未加载，代码块将不会高亮显示');
            }

            console.log('✅ 文章加载完成');
            
        } catch (error) {
            console.error('❌ 加载文章失败:', error);
            const articleContainer = document.getElementById('article-container');
            if (articleContainer) {
                articleContainer.innerHTML = `
                    <div class="error-container">
                        <div class="error-icon">❌</div>
                        <div class="error-message">加载文章失败</div>
                        <div class="error-details">${error.message}</div>
                        <button class="retry-button" onclick="showArticle('${pageId}')">重新加载</button>
                    </div>
                `;
            }
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
        if (!this.hasMore || this.isLoading || !this.currentPageId) return;

        try {
            this.isLoading = true;
            console.log('加载更多内容...');

            // 更新加载状态显示
            const loadMoreContainer = document.querySelector('.load-more-container');
            if (loadMoreContainer) {
                loadMoreContainer.innerHTML = '<div class="loading-spinner"></div><div class="loading-text">加载中...</div>';
            }

            const timeout = 10000; // 10秒超时
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                const response = await fetch(
                    `/api/article-content/${this.currentPageId}?page_size=10${this.nextCursor ? `&cursor=${this.nextCursor}` : ''}`,
                    { signal: controller.signal }
                );

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                // 更新分页状态
                this.hasMore = data.hasMore;
                this.nextCursor = data.nextCursor;

                // 处理新加载的块
                if (data.blocks && data.blocks.length > 0) {
                    // 添加到已加载的块中
                    this.loadedBlocks = this.loadedBlocks.concat(data.blocks);
                    
                    // 更新缓存
                    const articleData = {
                        page: data.page,
                        results: this.loadedBlocks,
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

                    // 如果有代码高亮需求，重新调用Prism
                    if (window.Prism) {
                        try {
                            Prism.highlightAll();
                        } catch (error) {
                            console.warn('代码高亮失败:', error);
                        }
                    }
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
                if (error.name === 'AbortError') {
                    throw new Error('加载超时，请检查网络连接后重试');
                }
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
        const articleContainer = document.getElementById('article-container');
        if (!articleContainer || !this.articles.length) return;

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
                if (category && category !== '未分类') categories.add(category);
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

            // 添加悬停效果的样式
            const hoverStyle = document.createElement('style');
            hoverStyle.textContent = `
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
            `;
            document.head.appendChild(hoverStyle);

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
            // 按发布日期排序并获取最新的3篇文章
            const recentArticles = [...this.articles]
                .filter(article => article.properties?.['Publish Date']?.date?.start) // 只显示有发布日期的文章
                .sort((a, b) => {
                    const dateA = a.properties?.['Publish Date']?.date?.start || '';
                    const dateB = b.properties?.['Publish Date']?.date?.start || '';
                    return dateB.localeCompare(dateA);
                })
                .slice(0, 3);

            recentArticlesContainer.innerHTML = recentArticles
                .map(article => {
                    const title = article.properties?.Title?.title[0]?.plain_text || '无标题';
                    const publishDate = article.properties?.['Publish Date']?.date?.start;
                    const date = publishDate ? new Date(publishDate).toLocaleDateString('zh-CN') : '';

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
                    color: #666;
                }
                
                .welcome-section {
                    margin-bottom: 2.5rem;
                }
                
                .welcome-section h2 {
                    font-size: 1.5rem;
                    color: #34495e;
                    margin-bottom: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .welcome-section ul {
                    list-style: none;
                    padding: 0;
                }
                
                .welcome-section ul li {
                    margin: 0.8rem 0;
                    color: #666;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .welcome-section ul li:before {
                    content: "•";
                    color: #3498db;
                    font-weight: bold;
                    margin-right: 0.5rem;
                }
                
                .category-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.8rem;
                }
                
                .category-tag {
                    padding: 0.4rem 1rem;
                    background-color: #f8f9fa;
                    border-radius: 20px;
                    color: #666;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .category-tag:hover {
                    background-color: #e9ecef;
                    color: #333;
                }
                
                .recent-articles {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .recent-article-item {
                    padding: 1rem;
                    background-color: #f8f9fa;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                    cursor: pointer;
                }
                
                .recent-article-item:hover {
                    background-color: #e9ecef;
                    transform: translateX(5px);
                }
                
                .recent-article-title {
                    color: #2c3e50;
                    font-weight: 500;
                    margin-bottom: 0.5rem;
                }
                
                .recent-article-date {
                    color: #666;
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
}

export const articleManager = new ArticleManager(); 