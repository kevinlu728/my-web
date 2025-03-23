/**
 * @file tableOfContents.js
 * @description 实现类似Notion的右侧目录导航功能
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-05-12
 */

/**
 * 文章目录导航类
 * 功能：
 * 1. 自动解析文章内的标题元素(H1-H3)
 * 2. 生成带缩进层级的目录列表
 * 3. 固定在页面右侧
 * 4. 滚动同步高亮当前位置
 * 5. 点击跳转到对应位置
 */
export class TableOfContents {
    /**
     * 构造函数
     * @param {Object} options 配置选项
     * @param {string} options.articleSelector 文章内容选择器
     * @param {string} options.containerSelector 目录容器选择器
     * @param {Array<string>} options.headingSelectors 要提取的标题选择器
     */
    constructor(options = {}) {
        // 默认配置
        this.config = {
            articleSelector: '.article-body',
            containerSelector: '#toc-container',
            headingSelectors: ['h1', 'h2', 'h3'],
            tocTitle: '目录',
            ...options
        };

        // 存储文章内容元素
        this.articleElement = null;
        
        // 存储目录容器元素
        this.tocContainer = null;
        
        // 存储所有提取的标题元素
        this.headings = [];
        
        // 滚动处理函数（使用throttle优化性能）
        this.scrollHandler = null;
        
        // 标记是否已初始化
        this.initialized = false;
        
        // 当前激活的目录项
        this.activeHeading = null;
    }

    /**
     * 初始化目录功能
     */
    initialize() {
        console.log('初始化文章目录导航...');
        
        // 获取文章内容元素
        this.articleElement = document.querySelector(this.config.articleSelector);
        if (!this.articleElement) {
            console.warn('未找到文章内容元素:', this.config.articleSelector);
            return false;
        }
        
        // 获取右侧栏元素并设置CSS变量
        this.updateRightColumnTopVariable();
        
        // 提取文章中的标题
        this.extractHeadings();
        
        // 如果没有提取到标题，则不显示目录
        if (this.headings.length === 0) {
            console.warn('文章中未找到标题元素');
            return false;
        }
        
        // 创建目录容器
        this.createTocContainer();
        
        // 创建目录内容
        this.renderToc();
        
        // 设置滚动监听
        this.setupScrollListener();
        
        // 初始化目录项点击事件
        this.setupTocItemClickEvents();
        
        // 为移动设备添加目录切换按钮
        this.setupMobileTocToggle();
        
        // 监听窗口大小变化
        this.setupResizeListener();
        
        // 标记为已初始化
        this.initialized = true;
        console.log('目录导航初始化完成，共解析', this.headings.length, '个标题');
        
        return true;
    }

    /**
     * 获取右侧栏顶部位置并设置CSS变量
     */
    updateRightColumnTopVariable() {
        // 获取右侧栏元素
        const rightColumn = document.querySelector('.blog-content .right-column');
        if (rightColumn) {
            // 获取右侧栏相对于视口的位置信息
            const rect = rightColumn.getBoundingClientRect();
            // 设置CSS变量，用于目录导航的位置定位
            document.documentElement.style.setProperty('--right-column-top', `${rect.top}px`);
            console.log('已设置目录顶部位置变量:', `${rect.top}px`);
        }
    }

    /**
     * 提取文章中的标题
     */
    extractHeadings() {
        this.headings = [];
        
        // 如果文章元素不存在，返回空数组
        if (!this.articleElement) return [];
        
        // 提取所有符合条件的标题元素
        const selector = this.config.headingSelectors.join(',');
        const headingElements = this.articleElement.querySelectorAll(selector);
        
        // 将标题元素转换为数组并存储
        headingElements.forEach((heading, index) => {
            // 为每个标题添加ID（如果没有）
            if (!heading.id) {
                heading.id = `heading-${index}`;
            }
            
            // 获取标题级别（h1=>1, h2=>2, h3=>3）
            const level = parseInt(heading.tagName.substring(1));
            
            // 将标题信息存储到数组
            this.headings.push({
                id: heading.id,
                text: heading.textContent,
                level: level,
                element: heading
            });
        });
        
        return this.headings;
    }

    /**
     * 创建目录容器
     */
    createTocContainer() {
        // 检查是否已存在目录容器
        let container = document.querySelector(this.config.containerSelector);
        
        // 如果容器不存在，则创建一个
        if (!container) {
            container = document.createElement('div');
            container.id = this.config.containerSelector.substring(1); // 移除#前缀
            document.body.appendChild(container);
        }
        
        // 清空容器内容
        container.innerHTML = '';
        
        // 设置容器样式
        container.classList.add('article-toc');
        
        // 存储容器引用
        this.tocContainer = container;
    }

    /**
     * 渲染目录内容
     */
    renderToc() {
        if (!this.tocContainer || this.headings.length === 0) return;
        
        // 创建目录标题
        const tocTitle = document.createElement('div');
        tocTitle.className = 'toc-title';
        tocTitle.textContent = this.config.tocTitle;
        this.tocContainer.appendChild(tocTitle);
        
        // 添加折叠/展开按钮
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'toc-toggle-btn';
        
        // 默认使用展开状态的图标
        toggleBtn.innerHTML = '<i class="fas fa-angle-double-right"></i>';
        toggleBtn.title = '折叠目录';
        toggleBtn.setAttribute('aria-label', '折叠目录');
        
        this.tocContainer.appendChild(toggleBtn);
        
        // 创建目录列表
        const tocList = document.createElement('ul');
        tocList.className = 'toc-list';
        
        // 遍历所有标题生成目录项
        this.headings.forEach(heading => {
            const tocItem = document.createElement('li');
            tocItem.className = `toc-item toc-level-${heading.level}`;
            tocItem.setAttribute('data-target', heading.id);
            
            const tocLink = document.createElement('a');
            tocLink.href = `#${heading.id}`;
            tocLink.textContent = heading.text;
            
            tocItem.appendChild(tocLink);
            tocList.appendChild(tocItem);
        });
        
        this.tocContainer.appendChild(tocList);
        
        // 添加折叠/展开功能
        this.setupTocToggle(toggleBtn, tocList);
    }

    /**
     * 设置目录折叠/展开功能
     * @param {HTMLElement} toggleBtn 折叠/展开按钮
     * @param {HTMLElement} tocList 目录列表
     */
    setupTocToggle(toggleBtn, tocList) {
        if (!toggleBtn || !tocList || !this.tocContainer) return;
        
        // 检查是否有保存的目录状态
        const isTocCollapsed = localStorage.getItem('tocCollapsed') === 'true';
        
        // 根据保存的状态设置初始状态
        if (isTocCollapsed) {
            this.tocContainer.classList.add('collapsed');
            tocList.style.display = 'none';
            toggleBtn.innerHTML = '<div class="hamburger-icon"><span></span><span></span><span></span></div>';
            toggleBtn.title = '展开目录';
            
            // 折叠状态下隐藏标题
            const tocTitle = this.tocContainer.querySelector('.toc-title');
            if (tocTitle) {
                tocTitle.style.display = 'none';
            }
        } else {
            // 展开状态使用 >> 图标
            toggleBtn.innerHTML = '<i class="fas fa-angle-double-right"></i>';
            toggleBtn.title = '折叠目录';
        }
        
        // 添加点击事件
        toggleBtn.addEventListener('click', () => {
            const isCollapsed = this.tocContainer.classList.contains('collapsed');
            const tocTitle = this.tocContainer.querySelector('.toc-title');
            
            if (isCollapsed) {
                // 展开目录
                this.tocContainer.classList.remove('collapsed');
                tocList.style.display = 'block';
                toggleBtn.innerHTML = '<i class="fas fa-angle-double-right"></i>';
                toggleBtn.title = '折叠目录';
                localStorage.setItem('tocCollapsed', 'false');
                
                // 显示标题
                if (tocTitle) {
                    tocTitle.style.display = 'block';
                }
            } else {
                // 折叠目录
                this.tocContainer.classList.add('collapsed');
                tocList.style.display = 'none';
                toggleBtn.innerHTML = '<div class="hamburger-icon"><span></span><span></span><span></span></div>';
                toggleBtn.title = '展开目录';
                localStorage.setItem('tocCollapsed', 'true');
                
                // 隐藏标题
                if (tocTitle) {
                    tocTitle.style.display = 'none';
                }
            }
        });
    }

    /**
     * 设置滚动监听，实现目录高亮
     */
    setupScrollListener() {
        // 移除之前的滚动监听
        if (this.scrollHandler) {
            window.removeEventListener('scroll', this.scrollHandler);
            this.scrollHandler = null;
        }
        
        // 创建新的滚动监听
        this.scrollHandler = this.throttle(() => {
            this.updateActiveHeading();
        }, 100); // 100ms的节流，优化性能
        
        window.addEventListener('scroll', this.scrollHandler);
        
        // 初始化时执行一次更新
        this.updateActiveHeading();
    }

    /**
     * 更新当前活动标题
     */
    updateActiveHeading() {
        if (!this.headings.length) return;
        
        // 获取当前滚动位置
        const scrollPosition = window.scrollY + 100; // 添加偏移量，提前高亮
        
        // 找出当前可见的标题
        let currentHeading = null;
        
        // 遍历所有标题元素
        for (let i = 0; i < this.headings.length; i++) {
            const heading = this.headings[i];
            const headingPosition = heading.element.getBoundingClientRect().top + window.scrollY;
            
            // 如果标题位置在滚动位置之上，则认为是当前标题
            if (headingPosition <= scrollPosition) {
                currentHeading = heading;
            } else {
                // 如果找到一个标题位置在滚动位置之下，则跳出循环
                break;
            }
        }
        
        // 如果没有找到当前标题（例如页面顶部）
        if (!currentHeading && this.headings.length > 0) {
            currentHeading = this.headings[0];
        }
        
        // 如果当前标题与上次不同，则更新高亮
        if (currentHeading && (!this.activeHeading || this.activeHeading.id !== currentHeading.id)) {
            this.updateActiveTocItem(currentHeading.id);
            this.activeHeading = currentHeading;
        }
    }

    /**
     * 更新活动目录项
     * @param {string} id 要激活的标题ID
     */
    updateActiveTocItem(id) {
        if (!this.tocContainer) return;
        
        // 移除所有项的活动状态
        const allItems = this.tocContainer.querySelectorAll('.toc-item');
        allItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // 添加当前项的活动状态
        const activeItem = this.tocContainer.querySelector(`.toc-item[data-target="${id}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
            
            // 确保滚动目录，使当前项可见
            this.scrollTocToItem(activeItem);
        }
    }

    /**
     * 滚动目录使指定项可见
     * @param {HTMLElement} item 目录项元素
     */
    scrollTocToItem(item) {
        if (!this.tocContainer || !item) return;
        
        // 获取容器和项的位置信息
        const containerRect = this.tocContainer.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        
        // 检查项是否在容器可视区域内
        const isAbove = itemRect.top < containerRect.top;
        const isBelow = itemRect.bottom > containerRect.bottom;
        
        // 如果不在可视区域，则滚动
        if (isAbove) {
            this.tocContainer.scrollTop += itemRect.top - containerRect.top - 20;
        } else if (isBelow) {
            this.tocContainer.scrollTop += itemRect.bottom - containerRect.bottom + 20;
        }
    }

    /**
     * 设置目录项点击事件
     */
    setupTocItemClickEvents() {
        if (!this.tocContainer) return;
        
        // 获取所有目录项
        const tocItems = this.tocContainer.querySelectorAll('.toc-item a');
        
        // 为每个目录项添加点击事件
        tocItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // 获取目标标题ID
                const targetId = item.getAttribute('href').substring(1);
                const targetHeading = document.getElementById(targetId);
                
                if (targetHeading) {
                    // 计算目标位置（考虑固定导航栏等因素）
                    const offset = targetHeading.getBoundingClientRect().top + window.scrollY - 80;
                    
                    // 平滑滚动到目标位置
                    window.scrollTo({
                        top: offset,
                        behavior: 'smooth'
                    });
                    
                    // 更新URL（可选）
                    history.pushState(null, null, `#${targetId}`);
                }
            });
        });
    }

    /**
     * 为移动设备添加目录切换按钮
     */
    setupMobileTocToggle() {
        // 移除之前的按钮（如果有）
        const existingToggle = document.querySelector('.toc-toggle');
        if (existingToggle && existingToggle.parentNode) {
            existingToggle.parentNode.removeChild(existingToggle);
        }
        
        // 创建新的切换按钮
        const toggleButton = document.createElement('div');
        toggleButton.className = 'toc-toggle';
        
        // 使用与折叠状态相同的三条线图标
        toggleButton.innerHTML = '<div class="hamburger-icon mobile"><span></span><span></span><span></span></div>';
        toggleButton.title = '显示目录';
        document.body.appendChild(toggleButton);
        
        // 添加切换事件
        toggleButton.addEventListener('click', () => {
            if (this.tocContainer) {
                this.tocContainer.classList.toggle('visible');
            }
        });
        
        // 点击目录外部区域时关闭目录
        document.addEventListener('click', (e) => {
            if (this.tocContainer && 
                this.tocContainer.classList.contains('visible') &&
                !this.tocContainer.contains(e.target) &&
                !toggleButton.contains(e.target)) {
                this.tocContainer.classList.remove('visible');
            }
        });
    }

    /**
     * 设置窗口大小变化监听器
     */
    setupResizeListener() {
        // 创建一个节流版本的更新函数，避免频繁更新
        this.resizeHandler = this.throttle(() => {
            this.updateRightColumnTopVariable();
        }, 100);
        
        // 添加窗口大小变化监听器
        window.addEventListener('resize', this.resizeHandler);
    }

    /**
     * 销毁目录功能
     */
    destroy() {
        // 移除滚动监听
        if (this.scrollHandler) {
            window.removeEventListener('scroll', this.scrollHandler);
            this.scrollHandler = null;
        }
        
        // 移除窗口大小变化监听器
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
        
        // 移除目录容器
        if (this.tocContainer) {
            this.tocContainer.innerHTML = '';
            // 可选：完全移除容器
            if (this.tocContainer.parentNode) {
                this.tocContainer.parentNode.removeChild(this.tocContainer);
            }
        }
        
        // 移除移动端切换按钮
        const toggleButton = document.querySelector('.toc-toggle');
        if (toggleButton && toggleButton.parentNode) {
            toggleButton.parentNode.removeChild(toggleButton);
        }
        
        // 重置属性
        this.headings = [];
        this.activeHeading = null;
        this.initialized = false;
    }

    /**
     * 刷新目录
     * 用于文章内容更新后重新生成目录
     */
    refresh() {
        // 更新右侧栏顶部位置变量
        this.updateRightColumnTopVariable();
        
        if (this.initialized) {
            this.destroy();
        }
        this.initialize();
    }

    /**
     * 简单的节流函数实现
     * @param {Function} func 要执行的函数
     * @param {number} delay 延迟时间(ms)
     * @returns {Function} 节流后的函数
     */
    throttle(func, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = new Date().getTime();
            if (now - lastCall < delay) {
                return;
            }
            lastCall = now;
            return func(...args);
        };
    }
}

// 创建单例实例
const tableOfContents = new TableOfContents();

export default tableOfContents;
