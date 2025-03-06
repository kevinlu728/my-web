// 文章管理模块
import { showStatus, showLoading, showError } from '../utils/utils.js';
import { getArticles, getArticleContent } from '../services/notionService.js';
import { categoryManager } from './categoryManager.js';
import { renderNotionBlocks } from '../components/articleRenderer.js';
import { imageLazyLoader } from '../utils/image-lazy-loader.js';

class ArticleManager {
    constructor() {
        this.articles = [];
        this.currentDatabaseId = null;
        this.searchTerm = '';
        this.initializeSearch();
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
            
            // 更新分类列表
            categoryManager.updateCategories(this.articles);
            
            // 显示文章列表
            this.renderArticleList();
            
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

        articleList.innerHTML = filteredArticles.map(article => {
            const title = article.properties?.Title?.title[0]?.plain_text || '无标题';
            const category = this.getArticleCategory(article);
            const date = article.created_time ? new Date(article.created_time).toLocaleDateString('zh-CN') : '';
            
            // 只在搜索时高亮显示
            const highlightedTitle = this.searchTerm ? this.highlightSearchTerm(title) : title;
            
            const articleElement = `
                <li class="article-item" data-category="${category}">
                    <a href="#" onclick="showArticle('${article.id}'); return false;">
                        <span class="article-title-text">${highlightedTitle}</span>
                        ${date ? `<span class="article-date">${date}</span>` : ''}
                    </a>
                </li>
            `;

            return articleElement;
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
            
            const response = await fetch(`/api/article-content/${pageId}?page_size=10`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // 更新分页状态
            this.hasMore = data.hasMore;
            this.nextCursor = data.nextCursor;
            this.currentPageId = pageId;

            // 存储已加载的块
            this.loadedBlocks = data.blocks || [];
            
            // 处理表格块的子块数据
            if (this.loadedBlocks.length > 0) {
                console.log('开始处理文章块数据...');
                for (let i = 0; i < this.loadedBlocks.length; i++) {
                    const block = this.loadedBlocks[i];
                    if (block.type === 'table' && block.has_children) {
                        console.log('发现表格块，获取子块数据...');
                        try {
                            const tableData = await this.loadTableData(block.id);
                            if (tableData && tableData.results) {
                                block.children = tableData.results;
                            }
                        } catch (error) {
                            console.error('获取表格子块数据出错:', error);
                        }
                    }
                }
            }

            return {
                page: data.page,
                results: this.loadedBlocks,
                hasMore: this.hasMore,
                nextCursor: this.nextCursor
            };
        } catch (error) {
            console.error('Error loading article content:', error);
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

            articleContainer.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">加载中...</div>
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
            }
            
            // 添加滚动监听
            this.scrollHandler = () => {
                if (this.isLoading || !this.hasMore) return;

                const loadMoreContainer = document.querySelector('.load-more-container');
                if (!loadMoreContainer) return;

                const containerRect = loadMoreContainer.getBoundingClientRect();
                const isNearBottom = containerRect.top <= window.innerHeight + 100;

                if (isNearBottom) {
                    console.log('触发加载更多内容...');
                    this.loadMoreContent();
                }
            };

            // 添加节流处理
            this.throttledScrollHandler = this.throttle(this.scrollHandler, 200);
            window.addEventListener('scroll', this.throttledScrollHandler);
            
            // 如果有代码高亮需求，可以在这里调用Prism
            if (window.Prism) {
                Prism.highlightAll();
            }

            console.log('✅ 文章加载完成');
            
        } catch (error) {
            console.error('❌ 加载文章失败:', error);
            const articleContainer = document.getElementById('article-container');
            if (articleContainer) {
                articleContainer.innerHTML = `<div class="error">加载文章失败: ${error.message}</div>`;
            }
            showStatus(`加载文章失败: ${error.message}`, true);
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

            const response = await fetch(
                `/api/article-content/${this.currentPageId}?page_size=10&cursor=${this.nextCursor}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // 更新分页状态
            this.hasMore = data.hasMore;
            this.nextCursor = data.nextCursor;

            // 处理新加载的块
            if (data.blocks && data.blocks.length > 0) {
                for (const block of data.blocks) {
                    if (block.type === 'table' && block.has_children) {
                        const tableData = await this.loadTableData(block.id);
                        if (tableData && tableData.results) {
                            block.children = tableData.results;
                        }
                    }
                }
                
                // 添加到已加载的块中
                this.loadedBlocks = this.loadedBlocks.concat(data.blocks);
                
                // 渲染新内容
                const newContent = renderNotionBlocks(data.blocks);
                const articleBody = document.querySelector('.article-body');
                if (articleBody) {
                    articleBody.insertAdjacentHTML('beforeend', newContent);
                    // 处理新加载内容中的图片
                    imageLazyLoader.processImages(articleBody);
                }
            }

            // 更新加载更多按钮状态
            if (loadMoreContainer) {
                if (this.hasMore) {
                    loadMoreContainer.innerHTML = '<div class="loading-spinner"></div>';
                } else {
                    loadMoreContainer.innerHTML = '<div class="no-more">没有更多内容</div>';
                }
            }

        } catch (error) {
            console.error('加载更多内容失败:', error);
            showStatus('加载更多内容失败', true);
            
            // 显示错误状态
            const loadMoreContainer = document.querySelector('.load-more-container');
            if (loadMoreContainer) {
                loadMoreContainer.innerHTML = '<div class="error">加载失败，请稍后重试</div>';
            }
        } finally {
            this.isLoading = false;
        }
    }

    // 加载表格数据的辅助方法
    async loadTableData(blockId) {
        try {
            const response = await fetch(`/api/blocks/${blockId}/children`);
            if (!response.ok) {
                throw new Error(`Failed to fetch table data: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error loading table data:', error);
            return null;
        }
    }

    // 更新数据库ID
    updateDatabaseId(newDatabaseId) {
        this.currentDatabaseId = newDatabaseId;
        this.loadArticles();
    }
}

export const articleManager = new ArticleManager(); 