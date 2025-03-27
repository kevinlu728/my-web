/**
 * @file articleSearchManager.js
 * @description 文章搜索管理器，负责文章的搜索功能
 * @version 1.0.1
 * @created 2024-03-26
 * 
 * 该模块负责：
 * - 处理搜索输入和交互
 * - 执行文章搜索逻辑
 * - 管理搜索结果的显示
 * - 处理搜索状态重置
 */

import { highlightSearchTerm } from '../utils/article-utils.js';
import { searchArticles } from '../utils/article-data-processor.js';
import logger from '../utils/logger.js';

class ArticleSearchManager {
    constructor() {
        // 搜索状态
        this.searchTerm = '';
        this.searchResults = [];
        this.isSearching = false;
        
        // DOM元素引用
        this.searchInput = null;
        this.clearButton = null;
        
        // 回调函数
        this.onSearchResultsCallback = null;
        this.onResetSearchCallback = null;
        this.getArticlesCallback = null;
    }

    /**
     * 初始化搜索功能和UI元素
     * @param {Object} options - 配置选项
     * @param {Function} options.onSearchResults - 搜索结果回调函数
     * @param {Function} options.onResetSearch - 重置搜索回调函数
     * @param {Function} options.getArticles - 获取文章数据的回调函数
     */
    initialize(options = {}) {
        this.searchInput = document.getElementById('article-search');
        this.clearButton = document.getElementById('search-clear');
        
        // 保存回调函数
        if (options.onSearchResults && typeof options.onSearchResults === 'function') {
            this.onSearchResultsCallback = options.onSearchResults;
        }
        
        if (options.onResetSearch && typeof options.onResetSearch === 'function') {
            this.onResetSearchCallback = options.onResetSearch;
        }
        
        // 保存获取文章数据的回调
        if (options.getArticles && typeof options.getArticles === 'function') {
            this.getArticlesCallback = options.getArticles;
        }
        
        this.setupEventListeners();
        
        logger.debug('文章搜索管理器已初始化');
    }

    /**
     * 设置搜索相关的事件监听
     */
    setupEventListeners() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.trim().toLowerCase();
                this.updateClearButton();
                
                if (this.searchTerm) {
                    // 获取文章数据并执行搜索
                    this.performSearchWithArticles();
                } else {
                    this.resetSearch();
                }
            });
        }
        
        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => {
                if (this.searchInput) {
                    this.searchInput.value = '';
                    this.searchTerm = '';
                    this.updateClearButton();
                    this.resetSearch();
                }
            });
        }
    }

    /**
     * 更新清除按钮的显示状态
     */
    updateClearButton() {
        if (this.clearButton) {
            this.clearButton.classList.toggle('visible', this.searchTerm.length > 0);
        }
    }

    /**
     * 获取文章数据并执行搜索
     */
    performSearchWithArticles() {
        // 通过回调获取文章数据
        let articles = [];
        if (this.getArticlesCallback) {
            articles = this.getArticlesCallback();
        } else {
            // 尝试从全局articleManager获取数据
            if (window.articleManager && typeof window.articleManager.getArticles === 'function') {
                articles = window.articleManager.getArticles();
            }
        }
        
        // 使用获取到的文章数据执行搜索
        this.performSearch(articles);
    }

    /**
     * 执行搜索操作
     * @param {Array} articles - 文章列表
     */
    performSearch(articles) {
        if (!articles || articles.length === 0) {
            logger.info('没有文章数据可搜索');
            this.displayNoResults();
            return;
        }
        
        this.isSearching = true;
        logger.info(`使用搜索词过滤: "${this.searchTerm}"`);
        
        // 使用searchArticles工具函数搜索匹配的文章
        this.searchResults = searchArticles(articles, this.searchTerm);
        
        if (this.searchResults.length === 0) {
            logger.info(`搜索"${this.searchTerm}"没有找到匹配的文章`);
            this.displayNoResults();
        } else {
            this.displaySearchResults();
        }
        
        // 如果有回调函数，调用它
        if (this.onSearchResultsCallback) {
            this.onSearchResultsCallback(this.searchResults, this.searchTerm);
        }
    }

    /**
     * 显示无搜索结果提示
     */
    displayNoResults() {
        const rootChildren = document.querySelector('#article-tree .root-item > .tree-children');
        if (rootChildren) {
            rootChildren.innerHTML = `<li class="no-results">没有找到与 "${this.searchTerm}" 相关的文章</li>`;
        }
    }

    /**
     * 显示搜索结果
     */
    displaySearchResults() {
        // 找出搜索结果中涉及的所有分类
        const categories = new Set();
        this.searchResults.forEach(article => {
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
                rootCount.textContent = `(${this.searchResults.length})`;
            }
            
            // 清空并重建分类节点
            const rootChildren = rootItem.querySelector('.tree-children');
            if (rootChildren) {
                rootChildren.innerHTML = '';
                
                // 为每个包含搜索结果的分类创建节点
                Array.from(categories).sort().forEach(category => {
                    // 过滤该分类下的搜索结果
                    const categoryResults = this.searchResults.filter(article => 
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
                            <span class="tree-toggle"><i class="fas fa-chevron-down"></i></span>
                            <span class="category-icon"><i class="fas fa-tag"></i></span>
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
                                <span class="article-icon"><i class="fas fa-file-alt"></i></span>
                                <span class="item-name">${highlightedTitle}</span>
                            </div>
                        `;
                        
                        // 添加文章点击事件
                        articleNode.querySelector('.tree-item-content').addEventListener('click', (e) => {
                            e.stopPropagation();
                            // 触发自定义事件，让外部可以处理文章选择
                            const event = new CustomEvent('articleSelected', { 
                                detail: { articleId: article.id } 
                            });
                            document.dispatchEvent(event);
                        });
                        
                        categoryChildren.appendChild(articleNode);
                    });
                    
                    rootChildren.appendChild(categoryNode);
                });
            }
        }
    }

    /**
     * 重置搜索状态并恢复原始文章树
     */
    resetSearch() {
        logger.info('重置搜索...');
        
        this.isSearching = false;
        this.searchResults = [];
        
        // 调用重置搜索的回调函数
        if (this.onResetSearchCallback) {
            this.onResetSearchCallback();
        }
    }

    /**
     * 获取分类的显示名称
     * @param {string} category - 分类名称
     * @returns {string} 显示用的分类名称
     */
    getCategoryDisplayName(category) {
        // 使用导入的分类映射，后续可以从外部注入
        return category;
    }

    /**
     * 设置分类显示名称映射
     * @param {Object} mapping - 分类名称映射表
     */
    setCategoryNameMapping(mapping) {
        if (mapping && typeof mapping === 'object') {
            this.getCategoryDisplayName = (category) => {
                return mapping[category] || category;
            };
        }
    }

    /**
     * 获取当前搜索结果
     * @returns {Array} 搜索结果
     */
    getSearchResults() {
        return this.searchResults;
    }

    /**
     * 获取当前搜索词
     * @returns {string} 搜索词
     */
    getSearchTerm() {
        return this.searchTerm;
    }

    /**
     * 是否正在搜索中
     * @returns {boolean} 是否搜索中
     */
    isInSearchMode() {
        return this.isSearching;
    }

    /**
     * 以编程方式设置搜索词并执行搜索
     * @param {string} term - 搜索词
     * @param {Array} articles - 文章列表
     */
    setSearchTerm(term, articles) {
        if (typeof term !== 'string') return;
        
        // 更新搜索输入框
        if (this.searchInput) {
            this.searchInput.value = term;
        }
        
        this.searchTerm = term.trim().toLowerCase();
        this.updateClearButton();
        
        if (this.searchTerm) {
            if (articles) {
                this.performSearch(articles);
            } else {
                this.performSearchWithArticles();
            }
        } else {
            this.resetSearch();
        }
    }

    /**
     * 清除搜索
     */
    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        
        this.searchTerm = '';
        this.updateClearButton();
        this.resetSearch();
    }
}

// 导出单例实例
export const articleSearchManager = new ArticleSearchManager(); 