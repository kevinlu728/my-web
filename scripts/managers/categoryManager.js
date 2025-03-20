/**
 * @file categoryManager.js
 * @description 分类管理器，负责文章分类的管理和显示
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-09
 * 
 * 该模块负责管理网站的文章分类功能：
 * - 加载和解析分类数据
 * - 渲染分类导航菜单
 * - 处理分类的选择和切换
 * - 与articleManager协作实现按分类筛选文章
 * - 管理分类的状态和UI交互
 * 
 * 主要方法：
 * - loadCategories: 加载分类数据
 * - renderCategoryMenu: 渲染分类菜单
 * - handleCategorySelection: 处理分类选择
 * - getCategoryBySlug: 根据slug获取分类
 * - updateActiveCategoryUI: 更新活动分类的UI状态
 * 
 * 该模块使用config/categories.js中的配置数据，并与articleManager协作。
 */

import { categoryConfig } from '../config/categories.js';

class CategoryManager {
    constructor() {
        this.categories = new Map();
        this.currentCategory = 'all';
        this.currentArticleId = null;
        this.expandedCategories = new Set();
        this.onCategoryChange = null;
        this.onArticleSelect = null;
        this.articles = [];
    }

    // 获取分类的显示名称
    getCategoryDisplayName(category) {
        return categoryConfig.nameMap[category] || category;
    }

    // 更新分类列表
    updateCategories(articles) {
        if (!articles || articles.length === 0) {
            console.log('没有文章，不更新分类');
            return;
        }
        
        console.log(`更新分类列表，共 ${articles.length} 篇文章`);
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
            
            console.log(`文章 "${article.title || '无标题'}" 的分类: ${category}`);
            this.categories.set(category, (this.categories.get(category) || 0) + 1);
            this.categories.set('all', this.categories.get('all') + 1);
        });

        console.log('分类统计结果:', Object.fromEntries(this.categories));
        this.renderArticleTree();
    }

    // 渲染文章树形列表
    renderArticleTree() {
        const articleTree = document.getElementById('article-tree');
        if (!articleTree) return;

        // 清除除根节点以外的所有内容
        const rootItem = articleTree.querySelector('.root-item');
        if (!rootItem) return;

        // 更新根节点信息
        const rootItemContent = rootItem.querySelector('.item-count');
        if (rootItemContent) {
            rootItemContent.textContent = `(${this.categories.get('all') || 0})`;
        }

        // 清除所有子项
        const treeChildren = rootItem.querySelector('.tree-children');
        if (treeChildren) {
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
                if (this.expandedCategories.has(category)) {
                    categoryNode.classList.add('expanded');
                }

                // 创建分类内容
                categoryNode.innerHTML = `
                    <div class="tree-item-content">
                        <span class="tree-toggle"><i class="fas fa-chevron-right"></i></span>
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

        // 为根节点添加点击事件
        const rootContent = rootItem.querySelector('.tree-item-content');
        if (rootContent) {
            rootContent.addEventListener('click', (e) => {
                e.stopPropagation();
                rootItem.classList.toggle('expanded');
                this.updateActiveState('all');
            });
        }

        // 默认展开根节点
        rootItem.classList.add('expanded');
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
        
        console.log(`${category} 分类下的文章:`, filteredArticles.length);
        
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
            
            // 不再显示日期
            articleNode.innerHTML = `
                <div class="tree-item-content">
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
            this.currentCategory = category;
            
            // 移除所有激活状态
            document.querySelectorAll('#article-tree .tree-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // 设置新的激活状态
            if (category === 'all') {
                document.querySelector('#article-tree .root-item').classList.add('active');
            } else {
                document.querySelector(`#article-tree .category-tree-item[data-category="${category}"]`)?.classList.add('active');
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
        }
    }

    // 展开到指定文章
    expandToArticle(articleId) {
        if (!articleId) return;
        
        // 查找文章所属的分类
        const article = this.articles.find(a => a.id === articleId);
        if (!article) return;
        
        let category = 'Uncategorized';
        if (article.category) {
            category = article.category;
        } else if (article.properties && article.properties.Category) {
            const categoryProp = article.properties.Category;
            if (categoryProp.select && categoryProp.select.name) {
                category = categoryProp.select.name;
            } else if (categoryProp.multi_select && categoryProp.multi_select.length > 0) {
                category = categoryProp.multi_select[0].name;
            }
        }
        
        // 展开根节点
        const rootItem = document.querySelector('#article-tree .root-item');
        if (rootItem) {
            rootItem.classList.add('expanded');
        }
        
        // 展开分类节点
        const categoryNode = document.querySelector(`#article-tree .category-tree-item[data-category="${category}"]`);
        if (categoryNode) {
            categoryNode.classList.add('expanded');
            this.expandedCategories.add(category);
            
            // 加载分类下的文章
            this.loadArticlesForCategory(category, categoryNode);
            
            // 更新激活状态
            this.updateActiveState(null, articleId);
        }
    }

    // 获取当前选中的分类
    getCurrentCategory() {
        return this.currentCategory;
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
        this.updateActiveState(category);
    }
}

export const categoryManager = new CategoryManager(); 