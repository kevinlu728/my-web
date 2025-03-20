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
import { getArticles, getArticleContent } from '../services/notionService.js';
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
            'Programming Language': '编程语言',
            'Mobile Tech': '终端技术',
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
                
                // 设置分类变更和文章选择回调
                categoryManager.setOnCategoryChange((category) => {
                    console.log('分类变更:', category);
                    this.filterAndRenderArticles();
                });
                
                categoryManager.setOnArticleSelect((articleId) => {
                    console.log('文章选择:', articleId);
                    this.showArticle(articleId);
                });
                
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
        
        // 搜索匹配的文章
        const searchResults = this.searchArticles(this.articles);
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
                        const highlightedTitle = this.highlightSearchTerm(title);
                        
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
            
            console.log(`开始加载文章，数据库ID: ${this.currentDatabaseId}`);
            
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
            
            // 如果请求已取消，不继续处理
            if (signal.aborted) {
                console.log('文章列表加载已取消');
                return [];
            }
            
            // 处理新的响应格式
            const articles = result.articles;
            const hasMore = result.hasMore;
            const nextCursor = result.nextCursor;
            
            console.log(`成功获取 ${articles.length} 篇文章，hasMore: ${hasMore}, nextCursor: ${nextCursor}`);
            
            // 保存文章列表和分页信息
            this.articles = articles;
            this.hasMore = hasMore;
            this.nextCursor = nextCursor;
            
            // 处理原始Notion数据，提取所需字段
            this.processArticleData();
            
            // 应用搜索过滤
            this.filterAndRenderArticles();
            
            // 显示成功状态
            // showStatus('文章列表加载成功', false, 'success');
            
            // 如果没有文章，显示提示
            if (articles.length === 0) {
                showStatus('没有找到文章', false, 'info');
            }
            
            return this.articles;
        } catch (error) {
            console.error('Error loading articles:', error);
            
            // 显示错误状态
            showError(`加载文章列表失败: ${error.message}`);
            
            // 尝试显示更加用户友好的错误信息
            if (error.message.includes('failed with status 500')) {
                showError('服务器内部错误，请稍后再试或联系管理员');
            } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                showError('网络连接错误，请检查您的网络连接');
            }
            
            return [];
        } finally {
            // 清除 AbortController
            this.abortController = null;
        }
    }

    // 处理文章数据，转换为应用需要的格式
    processArticleData() {
        if (!this.articles || !Array.isArray(this.articles)) {
            console.error('无效的文章数据:', this.articles);
            return;
        }
        
        console.log('处理文章数据...');
        const processedArticles = [];
        
        for (const page of this.articles) {
            try {
                // 确保页面有 ID
                if (!page.id) {
                    console.error('文章缺少ID:', page);
                    continue;
                }
                
                // 提取标题
                let title = 'Untitled';
                
                // 尝试从 properties 中获取标题
                if (page.properties) {
                    // 尝试从 Name 或 Title 属性中获取标题
                    const titleProperty = page.properties.Name || page.properties.Title;
                    
                    if (titleProperty && titleProperty.title && Array.isArray(titleProperty.title) && titleProperty.title.length > 0) {
                        title = titleProperty.title.map(t => t.plain_text || '').join('');
                    }
                }
                
                // 提取 URL
                let url = '';
                if (page.url) {
                    url = page.url;
                } else if (page.public_url) {
                    url = page.public_url;
                }
                
                // 使用原始 ID
                const pageId = page.id;
                
                // 提取创建时间
                const createdTime = page.created_time ? new Date(page.created_time) : new Date();
                
                // 提取最后编辑时间
                const lastEditedTime = page.last_edited_time ? new Date(page.last_edited_time) : new Date();
                
                // 提取分类
                let category = 'Uncategorized';
                if (page.properties && page.properties.Category) {
                    const categoryProp = page.properties.Category;
                    
                    if (categoryProp.select && categoryProp.select.name) {
                        category = categoryProp.select.name;
                    } else if (categoryProp.multi_select && Array.isArray(categoryProp.multi_select) && categoryProp.multi_select.length > 0) {
                        category = categoryProp.multi_select.map(c => c.name).join(', ');
                    }
                }
                
                // 提取发布时间
                let publishDate = null;
                if (page.properties && page.properties['Publish Date'] && page.properties['Publish Date'].date) {
                    publishDate = page.properties['Publish Date'].date.start;
                }
                
                // 构建文章对象
                const article = {
                    id: pageId,
                    title: title,
                    url: url,
                    created_time: page.created_time,
                    last_edited_time: page.last_edited_time,
                    publish_date: publishDate,
                    category: category,
                    properties: page.properties, // 保留原始属性以备后用
                    originalPage: page // 保留原始页面数据
                };
                
                processedArticles.push(article);
            } catch (error) {
                console.error('处理文章数据时出错:', error, page);
            }
        }
        
        // 按发布时间排序，没有发布时间的排在最后
        processedArticles.sort((a, b) => {
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
        });
        
        console.log(`处理完成，共 ${processedArticles.length} 篇文章`);
        this.articles = processedArticles;
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
        
        console.log('过滤后的文章数量:', filteredArticles.length);
        
        // 如果是查看全部文章，更新分类下的文章数量
        if (currentCategory === 'all') {
            categoryManager.updateCategories(filteredArticles);
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
            const cachedData = this.getArticleFromCache(pageId);
            if (cachedData && cachedData.isComplete) { // 只有完整加载的文章才使用缓存
                console.log('📦 从缓存加载文章:', pageId);
                this.isLoading = false;
                return cachedData;
            }

            console.log('🌐 从网络加载文章:', pageId);
            
            // 从API获取文章
            const articleData = await getArticleContent(pageId);
            console.log('API返回的文章内容:', articleData);
            
            // 检查article结构是否有效
            if (!articleData || !articleData.blocks) {
                throw new Error('无效的文章内容');
            }
            
            // 缓存文章内容
            this.setArticleCache(pageId, {
                ...articleData,
                isComplete: true
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
    
    // 格式化页面ID，确保使用正确的格式
    getFormattedPageId(pageId) {
        // 如果ID包含连字符，直接返回
        if (pageId.includes('-')) {
            return pageId;
        }
        
        // 如果ID是纯数字字符串，这可能是错误的ID
        if (/^\d+$/.test(pageId)) {
            console.warn(`发现纯数字ID: ${pageId}，这可能不是有效的Notion页面ID`);
            return pageId;
        }
        
        // 如果ID是32个字符但没有连字符，添加连字符
        if (pageId.length === 32) {
            // 按照Notion UUID格式添加连字符: 8-4-4-4-12
            return `${pageId.substring(0, 8)}-${pageId.substring(8, 12)}-${pageId.substring(12, 16)}-${pageId.substring(16, 20)}-${pageId.substring(20)}`;
        }
        
        // 其他情况，尽量返回原始ID
        return pageId;
    }

    // 显示文章内容
    async showArticle(pageId) {
        try {
            console.log('开始加载文章:', pageId);
            const articleContainer = document.getElementById('article-container');
            if (!articleContainer) return;

            // 防止无效ID或重复加载
            if (!pageId || pageId === 'undefined' || pageId === 'null') {
                console.error('Invalid pageId provided:', pageId);
                showError('无效的文章ID');
                return false;
            }
            
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

            // 移除之前的滚动监听器
            if (this.scrollHandler) {
                window.removeEventListener('scroll', this.scrollHandler);
                this.scrollHandler = null;
            }

            // 重置滚动位置
            window.scrollTo({
                top: 0,
                behavior: 'instant' 
            });

            // 记录当前正在加载的文章ID
            this.currentLoadingId = pageId;
            this.isLoading = true;

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
                // 更新URL，但不触发页面重载
                if (history.pushState) {
                    const newurl = window.location.protocol + "//" + window.location.host + 
                               window.location.pathname + `?article=${pageId}`;
                    window.history.pushState({path: newurl}, '', newurl);
                }
                
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
                    <div class="article-body" data-article-id="${articleData.page?.id || ''}">
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
                }
                
                // 处理加载更多功能
                if (this.hasMore) {
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
                } else {
                    console.log('没有更多内容，移除加载指示器');
                    const loadMoreContainer = articleContainer.querySelector('.load-more-container');
                    if (loadMoreContainer) {
                        loadMoreContainer.remove();
                    }
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
            } finally {
                // 重置加载状态
                this.isLoading = false;
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
                // 使用新的统一API端点
                const apiUrl = `${config.api?.baseUrl || '/api'}/content/${this.currentPageId}?type=article&page_size=10${this.nextCursor ? `&cursor=${this.nextCursor}` : ''}`;
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
            // 按发布时间排序并获取最新的5篇文章
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
                .slice(0, 5);

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

    // 高亮活动文章
    highlightActiveArticle(pageId) {
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

    /**
     * 显示文章内容
     * @param {Object} article 文章对象
     */
    displayArticleContent(article) {
        console.log('开始显示文章内容:', article);
        
        if (!article || !article.blocks) {
            console.error('无效的文章内容');
            showError('无效的文章内容');
            return false;
        }
        
        try {
            // 获取文章容器
            const articleContainer = document.getElementById('article-container');
            if (!articleContainer) {
                console.error('找不到文章容器');
                return false;
            }
            
            // 提取标题
            let title = '无标题';
            if (article.page && article.page.properties) {
                const titleProp = article.page.properties.Title || article.page.properties.Name;
                if (titleProp && titleProp.title && titleProp.title.length > 0) {
                    title = titleProp.title[0].plain_text;
                }
            }
            
            // 使用文章渲染器渲染内容
            const contentHtml = renderNotionBlocks(article.blocks);
            
            // 更新DOM
            articleContainer.innerHTML = `
                <h1 class="article-title">${title}</h1>
                <div class="article-body" data-article-id="${article.page?.id || ''}">
                    ${contentHtml || '<p>该文章暂无内容</p>'}
                </div>
            `;
            
            // 初始化懒加载
            const articleBody = articleContainer.querySelector('.article-body');
            if (articleBody) {
                // 处理图片懒加载
                if (window.imageLazyLoader) {
                    imageLazyLoader.processImages(articleBody);
                }
                
                // 处理代码块和表格懒加载
                initializeLazyLoading(articleBody);
            }
            
            return true;
        } catch (error) {
            console.error('显示文章内容失败:', error);
            showError(`显示文章内容失败: ${error.message}`);
            return false;
        }
    }
}

export const articleManager = new ArticleManager(); 