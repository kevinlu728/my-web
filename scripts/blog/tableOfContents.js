/**
 * @file tableOfContents.js
 * @description 实现类似Notion的右侧目录导航功能
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-05-12
 */

import logger from '../utils/logger.js';
import { throttle } from '../utils/common-utils.js';

/**
 * 文章目录导航类
 * 功能：
 * 1. 自动解析文章内的标题元素(H1-H3)
 * 2. 生成带缩进层级的目录列表
 * 3. 固定在页面右侧
 * 4. 滚动同步高亮当前位置
 * 5. 点击跳转到对应位置
 */
class TableOfContents {
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
        logger.info('初始化文章目录导航...');
        
        // 获取文章内容元素
        this.articleElement = document.querySelector(this.config.articleSelector);
        if (!this.articleElement) {
            // logger.warn('未找到文章内容元素:', this.config.articleSelector);  //暂时注释掉，避免干扰排查
            return false;
        }
        
        // 获取右侧栏元素并设置CSS变量
        this.updateRightColumnTopVariable();
        
        // 提取文章中的标题
        this.extractHeadings();
        
        // 如果没有提取到标题，则不显示目录
        if (this.headings.length === 0) {
            logger.warn('文章中未找到标题元素');
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
        logger.info('目录导航初始化完成，共解析', this.headings.length, '个标题');
        
        // 设置位置监听，确保目录位置与左栏保持同步
        this.setupPositionObserver();
        
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
            // 设置CSS变量，仅用于目录导航的位置定位，不影响右栏本身
            document.documentElement.style.setProperty('--toc-top', `${rect.top}px`);
            logger.info('已设置目录顶部位置变量:', `${rect.top}px`);
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
        container.classList.add('article-toc', 'light-scrollbar');
        
        // 不再添加额外的样式覆盖，使用CSS文件中的统一样式
        // 只保留底部显示修复的功能，避免添加可能导致冲突的样式
        
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
            
            // 折叠状态下隐藏标题和调整容器高度
            const tocTitle = this.tocContainer.querySelector('.toc-title');
            if (tocTitle) {
                tocTitle.style.display = 'none';
            }
            
            // 添加CSS类控制高度和滚动条
            this.tocContainer.style.overflowY = 'hidden';
            this.tocContainer.style.overflowX = 'hidden';
            
            // 调整按钮位置使其居中
            toggleBtn.style.position = 'static';
            toggleBtn.style.margin = '0 auto';
        } else {
            // 展开状态使用 >> 图标
            toggleBtn.innerHTML = '<i class="fas fa-angle-double-right"></i>';
            toggleBtn.title = '折叠目录';
            
            // 确保按钮位于右上角
            toggleBtn.style.position = 'absolute';
            toggleBtn.style.top = '16px';
            toggleBtn.style.right = '16px';
            toggleBtn.style.margin = '0';
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
                
                // 恢复滚动
                this.tocContainer.style.overflowY = 'auto';
                this.tocContainer.style.height = '';
                this.tocContainer.style.maxHeight = '';
                
                // 重置按钮位置为右上角
                toggleBtn.style.position = 'absolute';
                toggleBtn.style.top = '16px';
                toggleBtn.style.right = '16px';
                toggleBtn.style.margin = '0';
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
                
                // 控制高度和隐藏滚动条
                this.tocContainer.style.overflowY = 'hidden';
                this.tocContainer.style.overflowX = 'hidden';
                
                // 修复高度
                this.tocContainer.style.height = 'auto';
                
                // 调整按钮位置使其居中
                toggleBtn.style.position = 'static';
                toggleBtn.style.margin = '0 auto';
            }
        });
    }

    /**
     * 设置滚动监听，实现目录高亮
     */
    setupScrollListener() {
        // 移除旧的监听器（如果存在）
        if (this.scrollHandler) {
            window.removeEventListener('scroll', this.scrollHandler);
        }
        
        // 创建新的滚动监听
        this.scrollHandler = throttle(() => {
            this.updateActiveHeading();
        }, 100); // 100ms的节流，优化性能
        
        // 添加滚动监听器
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
            
            // 如果是底部的项目，确保额外滚动一些距离
            const itemIndex = Array.from(allItems).indexOf(activeItem);
            if (itemIndex >= allItems.length - 3) { // 如果是最后三个项目之一
                // 延迟执行一次额外的滚动，确保底部项完全可见
                setTimeout(() => {
                    const containerRect = this.tocContainer.getBoundingClientRect();
                    const itemRect = activeItem.getBoundingClientRect();
                    if (itemRect.bottom > containerRect.bottom - 40) {
                        this.tocContainer.scrollTop += 40; // 额外滚动一些距离
                    }
                }, 50);
            }
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
            // 增加额外的偏移量确保底部项完全可见
            this.tocContainer.scrollTop += itemRect.bottom - containerRect.bottom + 30;
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
        tocItems.forEach((item, index) => {
            // 移除旧的事件监听器（防止重复绑定）
            const oldClickHandler = item._clickHandler;
            if (oldClickHandler) {
                item.removeEventListener('click', oldClickHandler);
            }
            
            // 确保链接元素具有正确的样式和属性
            item.style.cursor = 'pointer';
            item.style.pointerEvents = 'auto';
            
            // 使用箭头函数保持this引用
            const clickHandler = (e) => {
                logger.info(`目录项 ${index+1} 被点击: ${item.textContent}`);
                e.preventDefault();
                e.stopPropagation(); // 阻止事件冒泡
                
                // 保存点击前的目录位置
                const tocPositionBefore = this.tocContainer.getBoundingClientRect().top;
                
                // 获取目标标题ID
                const targetId = item.getAttribute('href').substring(1);
                logger.info(`查找目标标题: #${targetId}`);
                
                const targetHeading = document.getElementById(targetId);
                
                if (targetHeading) {
                    logger.info(`找到目标标题，滚动到: #${targetId}`);
                    
                    try {
                        // 点击时临时固定目录位置，避免在滚动过程中位置变化
                        const rightColumn = document.querySelector('.blog-content .right-column');
                        const rightColumnTop = rightColumn.getBoundingClientRect().top;
                        
                        // 添加特殊类，并强制设置位置
                        this.tocContainer.classList.add('fixed-during-scroll');
                        this.tocContainer.style.top = `${rightColumnTop}px`;
                        
                        // 获取右栏的滚动元素
                        const rightColumnScrollElement = rightColumn; // 右栏本身是可滚动元素
                        
                        // 计算目标位置（相对于右栏）
                        // 注意：这里使用的是相对于右栏的位置，而不是整个窗口
                        const targetOffsetTop = targetHeading.offsetTop - 80; // 减去头部空间
                        
                        // 滚动右栏到目标位置，而不是滚动整个窗口
                        rightColumnScrollElement.scrollTo({
                            top: targetOffsetTop,
                            behavior: 'smooth'
                        });
                        
                        // 确保在滚动后修复目录位置
                        setTimeout(() => {
                            // 移除特殊类
                            this.tocContainer.classList.remove('fixed-during-scroll');
                            
                            // 滚动完成后重新设置目录位置
                            this.updateRightColumnPosition(tocPositionBefore);
                        }, 400); // 延长时间确保滚动完成
                        
                        // 高亮当前点击的目录项
                        this.tocContainer.querySelectorAll('.toc-item').forEach(el => {
                            el.classList.remove('active');
                        });
                        item.parentElement.classList.add('active');
                        
                        // 更新URL（但不会改变页面滚动位置）
                        if (history.pushState) {
                            history.pushState(null, null, `#${targetId}`);
                        } else {
                            // 这种方式可能会导致页面滚动，所以需要小心使用
                            // 如果目标已经滚动到位，这里只更新hash部分
                            const currentScrollPos = rightColumnScrollElement.scrollTop;
                            location.hash = `#${targetId}`;
                            rightColumnScrollElement.scrollTop = currentScrollPos;
                        }
                    } catch (error) {
                        logger.error(`滚动到目标位置时出错:`, error);
                        // 使用最简单的方法作为最后手段
                        try {
                            // 尝试直接滚动到元素，这将滚动右栏
                            targetHeading.scrollIntoView({behavior: 'smooth'});
                        } catch (e) {
                            // 如果上面的方法也失败，直接更新hash（可能导致页面滚动）
                            location.hash = `#${targetId}`;
                        }
                        
                        // 即使出错也尝试修复位置
                        setTimeout(() => {
                            this.updateRightColumnPosition(tocPositionBefore);
                        }, 300);
                    }
                } else {
                    logger.warn(`未找到目标标题元素: #${targetId}`);
                    // 尝试重新定位所有标题
                    this.extractHeadings();
                    const retryTarget = document.getElementById(targetId);
                    if (retryTarget) {
                        logger.info(`重新扫描后找到标题，跳转到 #${targetId}`);
                        retryTarget.scrollIntoView({behavior: 'smooth'});
                        
                        // 修复目录位置
                        setTimeout(() => {
                            this.updateRightColumnPosition(tocPositionBefore);
                        }, 300);
                    }
                }
            };
            
            // 保存点击处理函数的引用
            item._clickHandler = clickHandler;
            
            // 添加事件监听器，使用捕获模式确保事件被处理
            item.addEventListener('click', clickHandler, true);
            
            // 为父元素（li.toc-item）也添加点击事件
            const parentItem = item.parentElement;
            if (parentItem && parentItem.classList.contains('toc-item')) {
                parentItem.style.cursor = 'pointer';
                parentItem.style.pointerEvents = 'auto';
                
                // 移除旧的事件监听器
                const oldParentClickHandler = parentItem._clickHandler;
                if (oldParentClickHandler) {
                    parentItem.removeEventListener('click', oldParentClickHandler);
                }
                
                // 添加新的点击处理函数
                const parentClickHandler = (e) => {
                    // 只有当点击的不是链接本身时才触发
                    if (e.target !== item) {
                        logger.info(`目录项父元素被点击，转发到链接: ${item.textContent}`);
                        // 模拟点击链接
                        clickHandler(e);
                    }
                };
                
                // 保存点击处理函数的引用
                parentItem._clickHandler = parentClickHandler;
                
                // 添加事件监听器，使用捕获模式
                parentItem.addEventListener('click', parentClickHandler, true);
            }
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
        this.resizeHandler = throttle(() => {
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
        
        // 清除位置观察器
        if (this._positionObserver) {
            clearInterval(this._positionObserver);
            this._positionObserver = null;
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
     * 更新目录内容而不重建整个目录
     * 这个方法比refresh()更温和，不会导致目录闪烁或消失
     * @returns {boolean} 是否成功更新
     */
    updateContent() {
        logger.info('开始更新目录内容，保持容器状态...');
        
        // 保存当前目录状态
        const currentState = {
            isInitialized: this.initialized,
            isCollapsed: document.querySelector('.article-toc.collapsed') !== null,
            visibleClass: document.querySelector('.article-toc.visible') !== null,
            tocContainer: this.tocContainer,
            scrollTop: this.tocContainer ? this.tocContainer.scrollTop : 0
        };
        
        // 如果没有初始化过，则执行完整初始化
        if (!this.initialized || !this.tocContainer) {
            logger.info('目录尚未初始化，执行完整初始化');
            return this.initialize();
        }
        
        // 获取文章内容元素
        this.articleElement = document.querySelector(this.config.articleSelector);
        if (!this.articleElement) {
            // logger.warn('未找到文章内容元素:', this.config.articleSelector);  //暂时注释掉，避免干扰排查
            return false;
        }
        
        // 保存现有目录容器的引用和类名
        const existingContainer = this.tocContainer;
        const existingClasses = existingContainer.className;
        
        // 提取文章中的标题
        this.extractHeadings();
        
        // 如果没有提取到标题，保持现状
        if (this.headings.length === 0) {
            logger.warn('文章中未找到标题元素，保持现有目录');
            return false;
        }
        
        // 保持容器但只更新内部内容
        const existingToggleBtn = existingContainer.querySelector('.toc-toggle-btn');
        const existingTocTitle = existingContainer.querySelector('.toc-title');
        
        // 清空现有列表但保留容器和标题
        const existingList = existingContainer.querySelector('.toc-list');
        if (existingList) {
            existingList.remove();
        }
        
        // 创建新的目录列表
        const tocList = document.createElement('ul');
        tocList.className = 'toc-list';
        tocList.style.pointerEvents = 'auto'; // 确保列表可以接收鼠标事件
        
        // 遍历所有标题生成目录项
        this.headings.forEach(heading => {
            const tocItem = document.createElement('li');
            tocItem.className = `toc-item toc-level-${heading.level}`;
            tocItem.setAttribute('data-target', heading.id);
            tocItem.style.pointerEvents = 'auto'; // 确保项目可以接收鼠标事件
            tocItem.style.zIndex = '10'; // 增加z-index确保在顶层
            
            const tocLink = document.createElement('a');
            tocLink.href = `#${heading.id}`;
            tocLink.textContent = heading.text;
            tocLink.style.pointerEvents = 'auto'; // 确保链接可以接收鼠标事件
            tocLink.style.cursor = 'pointer'; // 明确指示可点击
            tocLink.style.zIndex = '10'; // 增加z-index确保在顶层
            
            tocItem.appendChild(tocLink);
            tocList.appendChild(tocItem);
        });
        
        // 将新列表添加到容器中
        existingContainer.appendChild(tocList);
        
        // 明确设置容器可接收鼠标事件
        existingContainer.style.pointerEvents = 'auto';
        
        logger.info('重新设置目录项点击事件...');
        // 设置目录项点击事件 - 确保这里调用了更新的方法
        this.setupTocItemClickEvents();
        
        // 确保滚动监听器仍然有效
        this.setupScrollListener();
        
        // 还原折叠状态
        if (currentState.isCollapsed) {
            existingContainer.classList.add('collapsed');
        }
        
        // 还原可见状态（针对移动设备）
        if (currentState.visibleClass) {
            existingContainer.classList.add('visible');
        }
        
        // 还原滚动位置
        if (currentState.scrollTop > 0) {
            this.tocContainer.scrollTop = currentState.scrollTop;
        }
        
        logger.info('目录内容更新完成，新标题数:', this.headings.length);
        return true;
    }

    /**
     * 刷新目录
     * 用于文章内容更新后重新生成目录
     * 注意：此方法会完全销毁并重建目录
     */
    refresh() {
        // 先尝试使用不销毁容器的更新方法
        if (this.updateContent()) {
            return true;
        }
        
        // 如果轻量更新失败，则执行完全刷新
        logger.info('目录轻量更新失败，执行完全刷新');
        
        // 更新右侧栏顶部位置变量
        this.updateRightColumnTopVariable();
        
        if (this.initialized) {
            this.destroy();
        }
        return this.initialize();
    }

    /**
     * 设置位置观察器，持续监听目录与左栏的对齐情况
     */
    setupPositionObserver() {
        // 清除之前的位置观察器
        if (this._positionObserver) {
            clearInterval(this._positionObserver);
            this._positionObserver = null;
        }
        
        // 获取初始位置
        const rightColumn = document.querySelector('.blog-content .right-column');
        if (!rightColumn || !this.tocContainer) return;
        
        const initialRightColumnTop = rightColumn.getBoundingClientRect().top;
        document.documentElement.style.setProperty('--toc-top', `${initialRightColumnTop}px`);
        logger.info(`初始目录位置: ${initialRightColumnTop}px`);
        
        // 创建位置观察器，每300ms检查一次位置关系
        this._positionObserver = setInterval(() => {
            if (!this.tocContainer || !document.body.contains(this.tocContainer)) {
                clearInterval(this._positionObserver);
                this._positionObserver = null;
                return;
            }
            
            // 如果目录正在特殊状态（滚动中或手动调整中），不干预位置
            if (this.tocContainer.classList.contains('fixed-during-scroll') || 
                this.tocContainer.classList.contains('freeze-position')) {
                return;
            }
            
            const rightColumn = document.querySelector('.blog-content .right-column');
            if (!rightColumn) return;
            
            const rightColumnTop = rightColumn.getBoundingClientRect().top;
            const tocTop = this.tocContainer.getBoundingClientRect().top;
            const positionDiff = Math.abs(tocTop - rightColumnTop);
            
            // 如果位置差异超过5px，更新位置
            if (positionDiff > 5) {
                document.documentElement.style.setProperty('--toc-top', `${rightColumnTop}px`);
                
                // 在滚动过程中可能会有位置误差，如果超过阈值则直接将目录顶部与右栏对齐
                if (positionDiff > 20) {
                    this.tocContainer.style.top = `${rightColumnTop}px`;
                    logger.info(`强制矫正目录位置: ${rightColumnTop}px (差值: ${positionDiff}px)`);
                }
            }
        }, 300); // 频率提高到300ms，以便更及时地检测并修正位置变化
    }

    /**
     * 恢复右侧目录的位置
     * @param {number} originalPosition - 原始位置，通常是点击前的位置
     */
    updateRightColumnPosition(originalPosition) {
        if (!this.tocContainer) return;
        
        try {
            // 获取右侧栏元素作为参考
            const rightColumn = document.querySelector('.blog-content .right-column');
            if (!rightColumn) return;
            
            // 获取右侧栏当前位置
            const rightColumnTop = rightColumn.getBoundingClientRect().top;
            
            // 直接更新CSS变量为右栏的顶部位置
            document.documentElement.style.setProperty('--toc-top', `${rightColumnTop}px`);
            
            // 强制目录容器使用新的top值
            this.tocContainer.style.top = `${rightColumnTop}px`;
            
            logger.info(`更新目录位置: ${rightColumnTop}px`);
        } catch (error) {
            logger.error('调整目录位置时出错:', error);
        }
    }
}

// 创建单例实例
export const tableOfContents = new TableOfContents();

// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => tableOfContents.initialize(), 100);
});

