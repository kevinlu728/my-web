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
            const response = await fetch(`/api/article-content/${pageId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // 处理表格块的子块数据
            if (data.results) {
                console.log('开始处理文章块数据...');
                for (let i = 0; i < data.results.length; i++) {
                    const block = data.results[i];
                    if (block.type === 'table' && block.has_children) {
                        console.log('发现表格块，获取子块数据...');
                        try {
                            // 获取表格的子块数据
                            const tableResponse = await fetch(`/api/blocks/${block.id}/children`);
                            if (tableResponse.ok) {
                                const tableData = await tableResponse.json();
                                console.log('获取到表格子块数据:', tableData);
                                // 将子块数据添加到表格块中
                                block.children = tableData.results;
                            } else {
                                console.error('获取表格子块数据失败:', tableResponse.status);
                            }
                        } catch (error) {
                            console.error('获取表格子块数据出错:', error);
                        }
                    }
                }
            }

            return data;
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

            articleContainer.innerHTML = '<div class="loading">加载中...</div>';
            
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
            `;

            // 处理文章中的图片
            console.log('🖼️ 处理文章中的图片...');
            const articleBody = articleContainer.querySelector('.article-body');
            if (articleBody) {
                // 先确保所有图片都有正确的src属性
                const images = articleBody.getElementsByTagName('img');
                for (let img of images) {
                    // 检查是否是 SVG 数据 URL
                    if (img.src && !img.src.startsWith('data:image/svg+xml')) {
                        console.log('找到图片URL:', img.src);
                        // 保存原始URL
                        img.setAttribute('data-original-src', img.src);
                    }
                }

                // 然后处理懒加载
                imageLazyLoader.processImages(articleBody);
            } else {
                console.warn('⚠️ 未找到文章内容区域');
            }
            
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

    // 更新数据库ID
    updateDatabaseId(newDatabaseId) {
        this.currentDatabaseId = newDatabaseId;
        this.loadArticles();
    }
}

export const articleManager = new ArticleManager(); 