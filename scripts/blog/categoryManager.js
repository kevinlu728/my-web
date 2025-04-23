/**
 * @file categoryManager.js
 * @description 分类管理器，负责文章分类的管理和显示
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-09
 * 
 * 该模块负责文章分类功能管理：
 * - 加载和解析分类数据
 * - 渲染分类导航菜单
 * - 处理分类的选择和切换
 * - 与articleManager协作实现按分类筛选文章
 * - 管理分类的状态和UI交互
 */

// import { articleManager } from './articleManager.js';
import { categoryConfig } from '../config/categories.js';
import { articleTreeSkeleton } from '../utils/skeleton-loader.js';
import logger from '../utils/logger.js';
import { articleRouteUtils } from '../utils/article-router.js';

/**
 * 分类管理器类
 */
class CategoryManager {
    constructor() {
        this.articleTree = null;
        this.categoryList = null;
        this.expandedCategories = new Set();
        this.selectedCategory = 'all';
        this.currentHoverCategory = null;
        this.categoryMap = {};
        this.categoryLoadPromises = {};
        this.renderedCategoriesCount = 0;
        this.isTreeRendering = false;
        this.categories = new Map();
        this.currentArticleId = null;
        this.onCategoryChange = null;
        this.onArticleSelect = null;
        this.articles = [];
        
        // 添加事件订阅
        document.addEventListener('articleManager:initialized', (e) => {
            logger.debug('接收到文章管理器初始化事件');
            this.articleManager = e.detail.manager;
        });
        
        document.addEventListener('articleSearchManager:initialized', (e) => {
            logger.debug('接收到搜索管理器初始化事件');
            this.articleSearchManager = e.detail.manager;
        });
    }

    /**
     * 公开初始化完成事件
     */
    notifyInitialized() {
        logger.debug('分类管理器初始化完成，发送初始化事件');
        document.dispatchEvent(new CustomEvent('categoryManager:initialized', {
            detail: { manager: this }
        }));
    }

    /**
     * 初始化分类管理器
     */
    initialize() {
        logger.info('初始化分类管理器');
        this.articleTree = document.getElementById('article-tree');
        this.categoryList = document.getElementById('category-list');
        
        if (!this.articleTree) {
            logger.warn('分类树容器未找到');
            return;
        }
        
        // 立即显示骨架屏，稍后在更新分类列表（updateCategories）后会隐藏
        this.showTreeSkeleton();
    }

    /**
     * 显示文章列表骨架屏
     */
    showTreeSkeleton() {
        const treeContainer = document.querySelector('#article-tree .root-item > .tree-children');
        if (!treeContainer) {
            logger.warn('分类树容器未找到');
            return;
        }

        logger.info('显示文章列表骨架屏');
        articleTreeSkeleton.show(treeContainer);
    }
    
    /**
     * 隐藏文章列表骨架屏
     */
    hideTreeSkeleton() {
        const treeContainer = document.querySelector('#article-tree .root-item > .tree-children');
        if (!treeContainer) return;
        
        articleTreeSkeleton.hide(treeContainer);
        logger.info('隐藏文章列表骨架屏');
    }

    // 获取分类的显示名称
    getCategoryDisplayName(category) {
        if (this.categoryMap[category]) {
            return this.categoryMap[category].name || category;
        }
        return categoryConfig.nameMap[category] || category;
    }

    // 更新分类列表
    updateCategories(articles) {
        if (!articles || articles.length === 0) {
            return;
        }
        
        logger.info('更新分类列表');
        this.articles = articles;
        this.categories.clear();
        this.categories.set('all', 0); // 初始化"全部"分类

        // 统计每个分类的文章数量
        articles.forEach(article => {
            let category = 'Uncategorized';
            
            // 如果文章对象已经包含 category 属性，直接使用
            if (article.category) {
                category = article.category;
            }
            // 否则尝试从 properties 中提取
            else if (article.properties) {
                const categoryProp = article.properties.Category;
                if (categoryProp) {
                    if (categoryProp.select && categoryProp.select.name) {
                        category = categoryProp.select.name;
                    } else if (categoryProp.multi_select && Array.isArray(categoryProp.multi_select) && categoryProp.multi_select.length > 0) {
                        category = categoryProp.multi_select[0].name;
                    }
                }
            }
            
            this.categories.set(category, (this.categories.get(category) || 0) + 1);
            this.categories.set('all', this.categories.get('all') + 1);
        });

        this.renderArticleTree();
        
        // 最后确保隐藏骨架屏
        this.hideTreeSkeleton();
    }

    // 渲染文章树形列表
    renderArticleTree(isRerender = false) {
        const articleTree = document.getElementById('article-tree');
        if (!articleTree) return;

        // 清除除根节点以外的所有内容
        const rootItem = articleTree.querySelector('.root-item');
        if (!rootItem) return;

        // 检查是否是重新渲染
        const isAllCollapsed = rootItem.classList.contains('all-collapsed');
        
        // 选择正确的图标 - 如果不是全部折叠状态，则使用向下图标
        const chevronClass = isAllCollapsed ? 'fa-chevron-right' : 'fa-chevron-down';
        
        // 创建根节点内容
        rootItem.innerHTML = `
            <div class="tree-item-content">
                <span class="tree-toggle"><i class="fas ${chevronClass}"></i></span>
                <span class="category-icon"><i class="fas fa-folder"></i></span>
                <span class="item-name">全部文章</span>
                <span class="item-count">(${this.articles.length})</span>
            </div>
            <ul class="tree-children"></ul>
        `;
        
        // 始终为根节点添加点击事件 - 移到这里确保无论如何都会执行
        const rootContent = rootItem.querySelector('.tree-item-content');
        if (rootContent) {
            // 移除现有的事件监听器（如果有）
            rootContent.replaceWith(rootContent.cloneNode(true));
            const newRootContent = rootItem.querySelector('.tree-item-content');
            
            newRootContent.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // 简化判断条件：只要不处于全部收起状态，点击就收起
                // 如果已经是收起状态，点击则展开
                if (!rootItem.classList.contains('all-collapsed')) {
                    // 当用户点击"全部文章"，收起整个列表
                    
                    // 标记为全部收起状态，移除展开类，确保箭头指向正确
                    rootItem.classList.add('all-collapsed');
                    rootItem.classList.remove('expanded');
                    
                    // 更新图标方向
                    const toggleIcon = rootItem.querySelector('.tree-toggle i');
                    if (toggleIcon) {
                        toggleIcon.classList.remove('fa-chevron-down');
                        toggleIcon.classList.add('fa-chevron-right');
                    }
                    
                    // 清空已展开分类集合
                    this.expandedCategories.clear();
                    
                    // 清空所有子分类节点
                    const treeChildren = rootItem.querySelector('.tree-children');
                    if (treeChildren) {
                        treeChildren.innerHTML = '';
                    }
                } else {
                    // 当用户从收起状态点击，则展开并显示分类
                    
                    // 移除全部收起状态，添加展开状态
                    rootItem.classList.remove('all-collapsed');
                    rootItem.classList.add('expanded');
                    
                    // 更新图标方向
                    const toggleIcon = rootItem.querySelector('.tree-toggle i');
                    if (toggleIcon) {
                        toggleIcon.classList.remove('fa-chevron-right');
                        toggleIcon.classList.add('fa-chevron-down');
                    }
                    
                    // 重新渲染分类列表
                    this.renderArticleTree(true);
                }
                
                // 更新激活状态，高亮"全部文章"
                this.updateActiveState('all');
            });
        }

        // 清除所有子项
        const treeChildren = rootItem.querySelector('.tree-children');
        if (treeChildren) {
            // 如果是全部收起状态，则不渲染任何子项
            if (isAllCollapsed) {
                treeChildren.innerHTML = '';
                return;
            }

            treeChildren.innerHTML = '';

            // 使用自定义顺序排序分类
            const sortedCategories = Array.from(this.categories.entries())
                .filter(([category]) => category !== 'all')
                .sort((a, b) => {
                    // 获取分类顺序，如果没有配置则默认为50
                    const orderA = categoryConfig.order[a[0]] || 50;
                    const orderB = categoryConfig.order[b[0]] || 50;
                    
                    // 按顺序值排序（升序）
                    if (orderA !== orderB) {
                        return orderA - orderB;
                    }
                    
                    // 如果顺序值相同，则按名称字母顺序排序
                    return a[0].localeCompare(b[0]);
                });

            sortedCategories.forEach(([category, count]) => {
                // 创建分类节点
                const categoryNode = document.createElement('li');
                categoryNode.className = 'tree-item category-tree-item';
                categoryNode.dataset.category = category;
                
                // 检查是否应该展开该分类
                let chevronClass = 'fa-chevron-right';
                if (this.expandedCategories.has(category)) {
                    categoryNode.classList.add('expanded');
                    chevronClass = 'fa-chevron-down';
                }

                // 创建分类内容
                categoryNode.innerHTML = `
                    <div class="tree-item-content">
                        <span class="tree-toggle"><i class="fas ${chevronClass}"></i></span>
                        <span class="category-icon"><i class="fas fa-tag"></i></span>
                        <span class="item-name">${this.getCategoryDisplayName(category)}</span>
                        <span class="item-count">(${count})</span>
                    </div>
                    <ul class="tree-children">
                        <!-- 文章将在这里动态添加 -->
                    </ul>
                `;

                // 添加分类点击事件
                const categoryContent = categoryNode.querySelector('.tree-item-content');
                categoryContent.addEventListener('click', (e) => {
                    // 阻止事件冒泡
                    e.stopPropagation();
                    
                    // 切换展开/折叠状态
                    categoryNode.classList.toggle('expanded');
                    
                    // 更新图标方向
                    const toggleIcon = categoryNode.querySelector('.tree-toggle i');
                    if (toggleIcon) {
                        if (categoryNode.classList.contains('expanded')) {
                            // 只更改图标类，保留旋转效果
                            toggleIcon.classList.remove('fa-chevron-right');
                            toggleIcon.classList.add('fa-chevron-down');
                        } else {
                            // 只更改图标类，保留旋转效果
                            toggleIcon.classList.remove('fa-chevron-down');
                            toggleIcon.classList.add('fa-chevron-right');
                        }
                    }
                    
                    // 记录展开状态
                    if (categoryNode.classList.contains('expanded')) {
                        this.expandedCategories.add(category);
                        // 加载该分类下的文章
                        this.loadArticlesForCategory(category, categoryNode);
                    } else {
                        this.expandedCategories.delete(category);
                    }
                    
                    // 更新激活状态
                    this.updateActiveState(category);
                });

                // 将分类节点添加到树中
                treeChildren.appendChild(categoryNode);
                
                // 如果该分类已展开，加载其文章
                if (this.expandedCategories.has(category)) {
                    this.loadArticlesForCategory(category, categoryNode);
                }
            });
        }

        // 默认展开根节点（除非处于全部收起状态）
        if (!isAllCollapsed) {
            rootItem.classList.add('expanded');
            
            // 确保根节点图标正确
            const rootToggleIcon = rootItem.querySelector('.tree-toggle i');
            if (rootToggleIcon) {
                rootToggleIcon.classList.remove('fa-chevron-right');
                rootToggleIcon.classList.add('fa-chevron-down');
            }
        } else {
            rootItem.classList.remove('expanded');
            
            // 确保根节点图标正确
            const rootToggleIcon = rootItem.querySelector('.tree-toggle i');
            if (rootToggleIcon) {
                rootToggleIcon.classList.remove('fa-chevron-down');
                rootToggleIcon.classList.add('fa-chevron-right');
            }
        }
    }

    // 加载特定分类下的文章
    loadArticlesForCategory(category, categoryNode) {
        if (!this.articles || !categoryNode) return;
        
        const articlesContainer = categoryNode.querySelector('.tree-children');
        if (!articlesContainer) return;
        
        // 清空现有文章
        articlesContainer.innerHTML = '';
        
        // 过滤属于该分类的文章
        const filteredArticles = this.articles.filter(article => {
            let articleCategory = '';
            
            if (article.category) {
                articleCategory = article.category;
            } else if (article.properties && article.properties.Category) {
                const categoryProp = article.properties.Category;
                if (categoryProp.select && categoryProp.select.name) {
                    articleCategory = categoryProp.select.name;
                } else if (categoryProp.multi_select && categoryProp.multi_select.length > 0) {
                    articleCategory = categoryProp.multi_select[0].name;
                }
            }
            
            return articleCategory === category;
        });
        
        if (filteredArticles.length === 0) {
            articlesContainer.innerHTML = '<li class="no-results">该分类下暂无文章</li>';
            return;
        }
        
        // 添加文章到分类下
        filteredArticles.forEach(article => {
            const articleNode = document.createElement('li');
            articleNode.className = 'tree-item article-tree-item';
            articleNode.dataset.articleId = article.id;
            
            // 如果当前正在查看这篇文章，标记为激活状态
            if (this.currentArticleId === article.id) {
                articleNode.classList.add('active');
            }
            
            // 提取文章标题
            const title = article.title || 'Untitled';
            
            // 添加文档图标和标题
            articleNode.innerHTML = `
                <div class="tree-item-content">
                    <span class="article-icon"><i class="fas fa-file-alt"></i></span>
                    <span class="item-name">${title}</span>
                </div>
            `;
            
            // 添加文章点击事件
            articleNode.querySelector('.tree-item-content').addEventListener('click', (e) => {
                e.stopPropagation();
                this.currentArticleId = article.id;
                this.updateActiveState(null, article.id);
                
                // 触发文章选择回调
                if (this.onArticleSelect) {
                    this.onArticleSelect(article.id);
                }
            });
            
            articlesContainer.appendChild(articleNode);
        });
    }

    // 更新激活状态
    updateActiveState(category = null, articleId = null) {
        // 更新分类激活状态
        if (category) {
            this.selectedCategory = category;
            
            // 移除所有激活状态
            document.querySelectorAll('#article-tree .tree-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // 设置新的激活状态
            if (category === 'all') {
                const rootItem = document.querySelector('#article-tree .root-item');
                rootItem.classList.add('active');
                
                // 从URL中移除分类参数 - 使用新的路由工具
                articleRouteUtils.clearArticleParams();
            } else {
                // 如果选择了特定分类，确保不处于全部收起状态
                const rootItem = document.querySelector('#article-tree .root-item');
                rootItem.classList.remove('all-collapsed');
                
                document.querySelector(`#article-tree .category-tree-item[data-category="${category}"]`)?.classList.add('active');
                // 更新URL分类参数 - 使用新的路由工具
                articleRouteUtils.updateCategoryParam(category);
            }
            
            // 触发分类变更回调
            if (this.onCategoryChange) {
                this.onCategoryChange(category);
            }
        }
        
        // 更新文章激活状态
        if (articleId) {
            this.currentArticleId = articleId;
            
            // 移除所有文章的激活状态
            document.querySelectorAll('#article-tree .article-tree-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // 设置新的激活状态
            document.querySelector(`#article-tree .article-tree-item[data-article-id="${articleId}"]`)?.classList.add('active');
            
            // 重置分类激活状态
            document.querySelectorAll('#article-tree .category-tree-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // 如果选择了文章，确保不处于全部收起状态
            const rootItem = document.querySelector('#article-tree .root-item');
            rootItem.classList.remove('all-collapsed');
        }
    }

    // 获取当前选中的分类
    getCurrentCategory() {
        return this.selectedCategory;
    }

    // 设置分类变更的回调函数
    setOnCategoryChange(callback) {
        this.onCategoryChange = callback;
    }

    // 设置文章选择的回调函数
    setOnArticleSelect(callback) {
        this.onArticleSelect = callback;
    }

    // 选择分类
    selectCategory(category) {
        if (!category) {
            logger.warn('分类名称为空');
            return;
        }
        
        // 只更新激活状态，保持树形结构不变
        this.updateActiveState(category);
        
        // 如果是特定分类，展开该分类节点，确保用户能看到分类下的文章
        if (category !== 'all') {
            const categoryNode = document.querySelector(`#article-tree .category-tree-item[data-category="${category}"]`);
            if (categoryNode && !categoryNode.classList.contains('expanded')) {
                categoryNode.classList.add('expanded');
                this.expandedCategories.add(category);
                
                // 确保加载该分类下的文章
                this.loadArticlesForCategory(category, categoryNode);
            }
        }
    }

    /**
     * 为分类加载文章
     * @param {string} categoryId 分类ID
     * @param {HTMLElement} categoryNode 分类节点
     */
    loadArticlesForCategory(categoryId, categoryNode) {
        if (!categoryId || !categoryNode) return;
        
        try {
            // 获取分类下的文章容器
            const articleContainer = categoryNode.querySelector('.tree-children');
            if (!articleContainer) return;
            
            // 如果已经加载过，不重复加载
            if (articleContainer.childElementCount > 0) return;
            
            // 获取该分类下的文章
            const articles = this.articles.filter(article => article.category === categoryId);
            
            // 如果没有文章，显示提示
            if (articles.length === 0) {
                articleContainer.innerHTML = '<li class="no-articles">暂无文章</li>';
                return;
            }
            
            // 清空容器
            articleContainer.innerHTML = '';
            
            // 按照时间排序文章（最新的在前面）
            const sortedArticles = [...articles].sort((a, b) => {
                const dateA = a.publish_date || a.created_time || '0';
                const dateB = b.publish_date || b.created_time || '0';
                return new Date(dateB) - new Date(dateA);
            });
            
            // 渲染文章列表
            for (const article of sortedArticles) {
                const articleNode = document.createElement('li');
                articleNode.className = 'tree-item article-tree-item';
                articleNode.dataset.articleId = article.id;
                
                // 如果当前正在查看这篇文章，标记为激活状态
                if (this.currentArticleId === article.id) {
                    articleNode.classList.add('active');
                }
                
                // 提取文章标题
                const title = article.title || 'Untitled';
                
                // 添加文档图标和标题
                articleNode.innerHTML = `
                    <div class="tree-item-content">
                        <span class="article-icon"><i class="fas fa-file-alt"></i></span>
                        <span class="item-name">${title}</span>
                    </div>
                `;
                
                // 添加文章点击事件
                articleNode.querySelector('.tree-item-content').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.currentArticleId = article.id;
                    this.updateActiveState(null, article.id);
                    
                    // 触发文章选择回调
                    if (this.onArticleSelect) {
                        this.onArticleSelect(article.id);
                    }
                });
                
                articleContainer.appendChild(articleNode);
            }
        } catch (error) {
            logger.error(`加载分类"${categoryId}"下的文章时出错:`, error.message || error);
        }
    }
}

export const categoryManager = new CategoryManager();

// 初始化完成后发送事件
setTimeout(() => categoryManager.notifyInitialized(), 0);

export default CategoryManager; 