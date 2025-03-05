// 分类管理模块
class CategoryManager {
    constructor() {
        this.categories = new Map();
        this.currentCategory = 'all';
        this.onCategoryChange = null;
    }

    // 更新分类列表
    updateCategories(articles) {
        this.categories.clear();
        this.categories.set('all', 0); // 初始化"全部"分类

        // 统计每个分类的文章数量
        articles.forEach(article => {
            let category = '未分类';
            const categoryProp = article.properties?.Category;
            
            if (categoryProp) {
                if (categoryProp.type === 'select' && categoryProp.select?.name) {
                    category = categoryProp.select.name;
                } else if (categoryProp.type === 'multi_select' && categoryProp.multi_select?.length > 0) {
                    category = categoryProp.multi_select[0].name;
                }
            }
            
            this.categories.set(category, (this.categories.get(category) || 0) + 1);
            this.categories.set('all', this.categories.get('all') + 1);
        });

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
                    <span class="category-name">${category === 'all' ? '全部文章' : category}</span>
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
}

export const categoryManager = new CategoryManager(); 