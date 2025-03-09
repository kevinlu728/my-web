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
        this.onCategoryChange = null;
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
        this.renderCategoryList();
    }

    // 渲染分类列表UI
    renderCategoryList() {
        const categoryList = document.getElementById('category-list');
        if (!categoryList) return;

        categoryList.innerHTML = Array.from(this.categories.entries())
            .sort((a, b) => {
                // 确保"全部文章"始终在最前面
                if (a[0] === 'all') return -1;
                if (b[0] === 'all') return 1;
                return a[0].localeCompare(b[0]); // 其他分类按字母顺序排序
            })
            .map(([category, count]) => `
                <li class="category-item ${category === this.currentCategory ? 'active' : ''}" 
                    data-category="${category}">
                    <span class="category-name">${this.getCategoryDisplayName(category)}</span>
                    <span class="category-count">(${count})</span>
                </li>
            `).join('');

        this.bindCategoryEvents();
    }

    // 绑定分类点击事件
    bindCategoryEvents() {
        const categoryList = document.getElementById('category-list');
        if (!categoryList) return;

        categoryList.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', () => {
                this.currentCategory = item.dataset.category;
                this.updateCategoryActive();
                if (this.onCategoryChange) {
                    this.onCategoryChange(this.currentCategory);
                }
            });
        });
    }

    // 更新分类的激活状态
    updateCategoryActive() {
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.toggle('active', item.dataset.category === this.currentCategory);
        });
    }

    // 获取当前选中的分类
    getCurrentCategory() {
        return this.currentCategory;
    }

    // 设置分类变更的回调函数
    setOnCategoryChange(callback) {
        this.onCategoryChange = callback;
    }

    // 选择分类
    selectCategory(category) {
        this.currentCategory = category;
        this.updateCategoryActive();
        if (this.onCategoryChange) {
            this.onCategoryChange(this.currentCategory);
        }
    }
}

export const categoryManager = new CategoryManager(); 