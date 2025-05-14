/**
 * @file scrollbar.js
 * @description 统一管理网站的滚动条样式和行为
 * @author 陆凯
 * @created 2024-05-23
 * 
 * 该组件负责：
 * 1. 为页面元素应用自定义滚动条样式
 * 2. 处理滚动相关的事件监听
 * 3. 提供滚动相关的工具函数
 * 4. 针对不同页面类型应用不同的滚动行为
 */

import logger from '../utils/logger.js';

/**
 * 自定义滚动条CSS类
 */
const ScrollbarClasses = {
    CUSTOM: 'custom-scrollbar',
    NARROW: 'narrow-scrollbar'
};

/**
 * 页面类型枚举
 */
export const PageTypes = {
    HOME: 'home-page',
    BLOG: 'blog-page',
    LIFE: 'life-page'
};

/**
 * 滚动条目标元素选择器
 */
const ScrollTargets = {
    HOME_CONTENT: '.home-content',
    BLOG_CONTENT: '.blog-content',
    BLOG_LEFT_COLUMN: '.blog-content .left-column',
    BLOG_ARTICLE_TREE: '.article-tree-container',
    BLOG_RIGHT_COLUMN: '.blog-content .right-column',
    ARTICLE_TOC: '.article-toc',
    LIFE_CONTENT: '.life-content',
    LIFE_RIGHT_COLUMN: '.life-content .right-column',
};

class Scrollbar {
    constructor() {
        this.pageType = null;
    }
    /**
     * 初始化滚动条
     * 与其他组件保持一致的初始化函数
     */
    initialize() {
        logger.debug('初始化滚动条...');

        // 检测页面类型
        this.pageType = this.detectPageType();
        logger.debug(`检测到页面类型: ${this.pageType}`);
        
        try {
            // 根据页面类型应用不同的滚动行为
            this.initSpecificScrollbarStyles();

            if (this.pageType === PageTypes.BLOG || this.pageType === PageTypes.LIFE) {
                // 为博客页面或生活页面添加全局滚动事件监听器
                this.initScrollListeners();
                // 由scrollbar来负责初始化返回顶部按钮，之前是由tech-blog.js负责的。
                this.initBackToTop();
            }
            
            logger.debug('✅ 滚动条初始化完成');
        } catch (error) {
            logger.error('❌ 滚动条初始化失败:', error);
        }
    }

    /**
     * 检测当前页面类型
     * @returns {string} 页面类型
     */
    detectPageType() {
        const body = document.body;
        if (body.classList.contains(PageTypes.BLOG)) {
            return PageTypes.BLOG;
        } else if (body.classList.contains(PageTypes.LIFE)) {
            return PageTypes.LIFE;
        }
        // 默认返回首页类型
        return PageTypes.HOME;
    }

    /**
     * 初始化特定页面的滚动条，为该页面各部分应用滚动条样式
     */
    initSpecificScrollbarStyles() {
        logger.debug('初始化特定页面的滚动条...');

        if (this.pageType === PageTypes.BLOG) {
            // 确保页面Body禁用默认滚动
            document.body.style.overflow = 'hidden';

            // 应用左侧栏窄版滚动条
            this.applyScrollbarStyle(ScrollTargets.BLOG_LEFT_COLUMN, ScrollbarClasses.NARROW); 
            // 应用文章树容器窄版滚动条
            this.applyScrollbarStyle(ScrollTargets.BLOG_ARTICLE_TREE, ScrollbarClasses.NARROW);
            // 应用右侧栏通用滚动条
            this.applyScrollbarStyle(ScrollTargets.BLOG_RIGHT_COLUMN, ScrollbarClasses.CUSTOM);
            // 应用博客主内容区滚动条（小屏幕模式下使用）
            this.applyScrollbarStyle(ScrollTargets.BLOG_CONTENT, ScrollbarClasses.CUSTOM);
            // 应用文章目录滚动条
            this.applyScrollbarStyle(ScrollTargets.ARTICLE_TOC, ScrollbarClasses.NARROW);

            // 禁用窗口滚动并使用右侧栏滚动
            this.enableCustomScrolling();
        } else if (this.pageType === PageTypes.LIFE) {
            // 确保页面Body禁用默认滚动
            document.body.style.overflow = 'hidden';

            // 应用右侧栏通用滚动条
            this.applyScrollbarStyle(ScrollTargets.LIFE_RIGHT_COLUMN, ScrollbarClasses.CUSTOM);
            // 应用博客主内容区滚动条（小屏幕模式下使用）
            this.applyScrollbarStyle(ScrollTargets.LIFE_CONTENT, ScrollbarClasses.CUSTOM);

            // 禁用窗口滚动并使用右侧栏滚动
            this.enableCustomScrolling();
        } else {
            // 首页只应用样式，不需要其他复杂的滚动逻辑
            // 应用全局滚动条样式
            document.body.classList.add(ScrollbarClasses.CUSTOM);
            // 应用首页内容区滚动条，首页已移除home-content外层容器 
            // this.applyScrollbarStyle(ScrollTargets.HOME_CONTENT, ScrollbarClasses.CUSTOM);
        }
    }
    /**
     * 为目标元素应用滚动条样式
     * @param {string} selector - 目标元素选择器
     * @param {string} styleClass - 样式类名
     */
    applyScrollbarStyle(selector, styleClass) {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) {
            logger.warn(`⚠️ 找不到元素: ${selector}`);
            return;
        }
        
        elements.forEach(element => {
            if (!element.classList.contains(styleClass)) {
                element.classList.add(styleClass);
            }
        });
    }

    /**
     * 启用自定义滚动行为
     * 在博客页面禁用窗口滚动，使用自定义滚动区域
     */
    enableCustomScrolling() {
        // 禁用Body滚动
        document.body.style.overflow = 'hidden';

        let rightColumn = null;
        let content = null;
        if (this.pageType === PageTypes.BLOG) {
            rightColumn = document.querySelector(ScrollTargets.BLOG_RIGHT_COLUMN);
            content = document.querySelector(ScrollTargets.BLOG_CONTENT);
        } else if (this.pageType === PageTypes.LIFE) {
            rightColumn = document.querySelector(ScrollTargets.LIFE_RIGHT_COLUMN);
            content = document.querySelector(ScrollTargets.LIFE_CONTENT);
        }

        // 启用右侧栏滚动
        if (rightColumn) {
            rightColumn.style.overflowY = 'auto';
            rightColumn.style.overflowX = 'hidden';
        }
        
        // 小屏幕模式下启用博客主内容区滚动
        if (window.innerWidth <= 768) {
            if (content) {
                content.style.overflowY = 'auto';
                content.style.overflowX = 'hidden';
                
                // 小屏幕模式下禁用右侧栏独立滚动
                if (rightColumn) {
                    rightColumn.style.overflowY = 'visible';
                }
            }
        }
    }

    initScrollListeners() {
        let rightColumn = null;
        let content = null;
        if (this.pageType === PageTypes.BLOG) {
            rightColumn = document.querySelector(ScrollTargets.BLOG_RIGHT_COLUMN);
            content = document.querySelector(ScrollTargets.BLOG_CONTENT);
        } else if (this.pageType === PageTypes.LIFE) {
            rightColumn = document.querySelector(ScrollTargets.LIFE_RIGHT_COLUMN);
            content = document.querySelector(ScrollTargets.LIFE_CONTENT);
        }

        if (rightColumn) {
            rightColumn.addEventListener('scroll', this.handleRightColumnScroll.bind(this));
            logger.debug('✅ 已为右侧栏添加滚动事件监听器');
        }
        if (content) {
            content.addEventListener('scroll', this.handleContentScroll.bind(this));
            logger.debug('✅ 已为主内容区添加滚动事件监听器');
        }
        
        // 窗口尺寸变化事件
        window.addEventListener('resize', this.handleWindowResize);
        logger.debug('✅ 已为窗口添加尺寸变化事件监听器');
    }

    /**
     * 处理右侧栏滚动事件
     * @param {Event} event - 滚动事件
     */
    handleRightColumnScroll(event) {
        const rightColumn = event.target;
        const scrollTop = rightColumn.scrollTop;
        
        // 显示/隐藏返回顶部按钮
        this.toggleBackToTopButton(scrollTop > 300);
        
        // 处理文章目录的激活状态
        if (this.pageType === PageTypes.BLOG) {
            this.updateTocActiveState(scrollTop);
        }
    }

    /**
     * 处理主内容区滚动事件（小屏幕模式）
     * @param {Event} event - 滚动事件
     */
    handleContentScroll(event) {
        const content = event.target;
        const scrollTop = content.scrollTop;
        
        // 显示/隐藏返回顶部按钮
        this.toggleBackToTopButton(scrollTop > 300);
    }

    /**
     * 处理窗口尺寸变化事件
     */
    handleWindowResize() {
        // 在博客页面或生活页面才重新应用滚动行为
        if (this.pageType === PageTypes.BLOG || this.pageType === PageTypes.LIFE) {
            this.enableCustomScrolling();
        }
    }

    /**
     * 初始化返回顶部按钮
     */
    initBackToTop() {
        logger.debug('初始化返回顶部按钮...');
        
        // 检查是否已存在返回顶部按钮，避免重复创建
        if (document.querySelector('.back-to-top')) {
            logger.info('返回顶部按钮已存在，跳过创建');
            return;
        }
        
        // 创建按钮元素
        const backToTopBtn = document.createElement('div');
        backToTopBtn.className = 'back-to-top';
        backToTopBtn.innerHTML = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.41 15.41L12 10.83L16.59 15.41L18 14L12 8L6 14L7.41 15.41Z"/>
            </svg>
        `;
        document.body.appendChild(backToTopBtn);
        
        // 检查按钮是否添加成功
        if (!document.querySelector('.back-to-top')) {
            logger.error('返回顶部按钮创建失败');
            return;
        }
        
        logger.debug('✅ 返回顶部按钮创建成功');
        
        // 点击按钮回到顶部，使用scrollToTop函数
        backToTopBtn.addEventListener('click', () => {
            logger.info('点击返回顶部');
            
            // 使用scrollToTop处理滚动行为
            if (typeof this.scrollToTop === 'function') {
                logger.info('使用scrollToTop处理滚动行为');
                this.scrollToTop(true); // 使用平滑滚动
            } else {
                logger.info('使用window.scrollTo处理滚动行为');
                // 回退方案：使用默认滚动
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
            
            // 聚焦到页面顶部的元素（可选）
            const firstFocusableElement = document.querySelector('h1, h2, p, .article-title');
            if (firstFocusableElement) {
                setTimeout(() => {
                    firstFocusableElement.setAttribute('tabindex', '-1');
                    firstFocusableElement.focus();
                    
                    // 移除tabindex，保持DOM干净
                    setTimeout(() => {
                        firstFocusableElement.removeAttribute('tabindex');
                    }, 100);
                }, 500);
            }
        });
        
        logger.debug('✅ 返回顶部按钮初始化完成');
        
        // 注意：按钮的显示/隐藏现在由scrollbar.js中的滚动事件处理
    }

    /**
     * 检查初始滚动位置，并相应地显示/隐藏返回顶部按钮
     */
    checkInitialScrollPosition() {
        let rightColumn = null;
        let content = null;
        if (this.pageType === PageTypes.BLOG) {
            rightColumn = document.querySelector(ScrollTargets.BLOG_RIGHT_COLUMN);
            content = document.querySelector(ScrollTargets.BLOG_CONTENT);

        } else if (this.pageType === PageTypes.LIFE) {
            rightColumn = document.querySelector(ScrollTargets.LIFE_RIGHT_COLUMN);
            content = document.querySelector(ScrollTargets.LIFE_CONTENT);
        }

        let shouldShow = false;

        if (this.pageType === PageTypes.BLOG || this.pageType === PageTypes.LIFE) {
            // 博客页面，检查右侧栏或主内容区的滚动位置
            if (window.innerWidth <= 768) {
                if (content) {
                    shouldShow = content.scrollTop > 300;
                }
            } else {
                if (rightColumn) {
                    shouldShow = rightColumn.scrollTop > 300;
                }
            }
        } else {
            // 其他页面，检查窗口滚动位置
            shouldShow = window.scrollY > 300;
        }
        
        logger.debug(`初始滚动检查: ${shouldShow ? '应显示' : '应隐藏'}返回顶部按钮`);
        this.toggleBackToTopButton(shouldShow);
    }

    /**
     * 显示/隐藏返回顶部按钮
     * @param {boolean} show - 是否显示
     */
    toggleBackToTopButton(show) {
        const backToTopButton = document.querySelector('.back-to-top');
        if (!backToTopButton) {
            // logger.warn('未找到返回顶部按钮元素');  //暂时注释掉，避免干扰问题排查
            return;
        }
        
        if (show) {
            backToTopButton.classList.add('visible');
            // 确保元素可见
            backToTopButton.style.opacity = '1';
            backToTopButton.style.visibility = 'visible';
            backToTopButton.style.transform = 'translateY(0)';
        } else {
            backToTopButton.classList.remove('visible');
            // 恢复为CSS定义的默认隐藏状态
            backToTopButton.style.opacity = '';
            backToTopButton.style.visibility = '';
            backToTopButton.style.transform = '';
        }
    }

    /**
     * 更新文章目录的激活状态，博客页面使用
     * @param {number} scrollTop - 滚动位置
     */
    updateTocActiveState(scrollTop) {
        const headings = document.querySelectorAll('.article-body h2, .article-body h3');
        const tocItems = document.querySelectorAll('.toc-item');
        
        if (headings.length === 0 || tocItems.length === 0) return;
        
        // 查找当前可见的标题
        let currentHeadingIndex = -1;
        const offset = 100; // 偏移量，确保正确高亮
        
        for (let i = 0; i < headings.length; i++) {
            const headingTop = headings[i].getBoundingClientRect().top;
            
            if (headingTop > offset) {
                break;
            }
            
            currentHeadingIndex = i;
        }
        
        // 更新目录项激活状态
        tocItems.forEach(item => item.classList.remove('active'));
        
        if (currentHeadingIndex >= 0 && currentHeadingIndex < tocItems.length) {
            tocItems[currentHeadingIndex].classList.add('active');
        }
    }

    /**
     * 滚动到指定元素
     * @param {string|Element} target - 目标元素或选择器
     * @param {Object} options - 滚动选项
     * @param {number} options.offset - 偏移量
     * @param {boolean} options.smooth - 是否使用平滑滚动
     */
    scrollToElement(target, options = {}) {
        const defaultOptions = {
            offset: 0,
            smooth: true
        };
        
        const { offset, smooth } = { ...defaultOptions, ...options };
        
        let element;
        if (typeof target === 'string') {
            element = document.querySelector(target);
        } else {
            element = target;
        }
        
        if (!element) {
            logger.warn(`⚠️ 找不到目标元素: ${target}`);
            return;
        }
        
        if (this.pageType === PageTypes.BLOG) {
            // 博客页面，滚动右侧栏或主内容区（小屏幕）
            if (window.innerWidth <= 768) {
                const blogContent = document.querySelector(ScrollTargets.BLOG_CONTENT);
                if (blogContent) {
                    const elementTop = element.getBoundingClientRect().top;
                    const containerTop = blogContent.getBoundingClientRect().top;
                    const scrollTop = elementTop - containerTop - offset;
                    
                    blogContent.scrollTo({
                        top: scrollTop,
                        behavior: smooth ? 'smooth' : 'auto'
                    });
                }
            } else {
                const rightColumn = document.querySelector(ScrollTargets.BLOG_RIGHT_COLUMN);
                if (rightColumn) {
                    const elementTop = element.getBoundingClientRect().top;
                    const containerTop = rightColumn.getBoundingClientRect().top;
                    const scrollTop = elementTop - containerTop - offset;
                    
                    rightColumn.scrollTo({
                        top: scrollTop,
                        behavior: smooth ? 'smooth' : 'auto'
                    });
                }
            }
        } else {
            // 首页，使用窗口滚动
            const elementTop = element.getBoundingClientRect().top;
            const scrollTop = elementTop + window.scrollY - offset;
            
            window.scrollTo({
                top: scrollTop,
                behavior: smooth ? 'smooth' : 'auto'
            });
        }
    }

    /**
     * 滚动到页面顶部
     * @param {boolean} smooth - 是否使用平滑滚动
     */
    scrollToTop(smooth = true) {
        let rightColumn = null;
        let content = null;
        if (this.pageType === PageTypes.BLOG) {
            rightColumn = document.querySelector(ScrollTargets.BLOG_RIGHT_COLUMN);
            content = document.querySelector(ScrollTargets.BLOG_CONTENT);

        } else if (this.pageType === PageTypes.LIFE) {
            rightColumn = document.querySelector(ScrollTargets.LIFE_RIGHT_COLUMN);
            content = document.querySelector(ScrollTargets.LIFE_CONTENT);
        }
        
        if (this.pageType === PageTypes.BLOG || this.pageType === PageTypes.LIFE) {
            // 滚动右侧栏或主内容区（小屏幕）
            if (window.innerWidth <= 768) {
                if (content) {
                    content.scrollTo({
                        top: 0,
                        behavior: smooth ? 'smooth' : 'auto'
                    });
                }
            } else {
                if (rightColumn) {
                    rightColumn.scrollTo({
                        top: 0,
                        behavior: smooth ? 'smooth' : 'auto'
                    });
                }
            }
        } else {
            // 首页，使用窗口滚动
            window.scrollTo({
                top: 0,
                behavior: smooth ? 'smooth' : 'auto'
            });
        }
    }

    /**
     * 禁用自定义滚动行为，恢复默认滚动
     * 在需要恢复默认滚动行为时使用
     */
    disableCustomScrolling() {
        // 恢复Body的默认滚动行为
        document.body.style.overflow = '';

        let rightColumn = null;
        let content = null;
        if (this.pageType === PageTypes.BLOG) {
            rightColumn = document.querySelector(ScrollTargets.BLOG_RIGHT_COLUMN);
            content = document.querySelector(ScrollTargets.BLOG_CONTENT);

        } else if (this.pageType === PageTypes.LIFE) {
            rightColumn = document.querySelector(ScrollTargets.LIFE_RIGHT_COLUMN);
            content = document.querySelector(ScrollTargets.LIFE_CONTENT);
        }
        
        // 禁用右侧栏滚动
        if (rightColumn) {
            rightColumn.style.overflowY = '';
            rightColumn.style.overflowX = '';
        }
        
        // 小屏幕模式下禁用博客主内容区滚动
        if (content) {
            content.style.overflowY = '';
            content.style.overflowX = '';
        }
        
        logger.debug('已禁用自定义滚动行为，恢复默认滚动');
    }

    /**
     * 判断是否应该显示返回顶部按钮
     * @returns {boolean} 是否应显示
     */
    shouldShowBackToTop() {
        let rightColumn = null;
        let content = null;
        if (this.pageType === PageTypes.BLOG) {
            rightColumn = document.querySelector(ScrollTargets.BLOG_RIGHT_COLUMN);
            content = document.querySelector(ScrollTargets.BLOG_CONTENT);

        } else if (this.pageType === PageTypes.LIFE) {
            rightColumn = document.querySelector(ScrollTargets.LIFE_RIGHT_COLUMN);
            content = document.querySelector(ScrollTargets.LIFE_CONTENT);
        }
        
        if (this.pageType === PageTypes.BLOG || this.pageType === PageTypes.LIFE) {
            // 博客页面，检查右侧栏或主内容区的滚动位置
            if (window.innerWidth <= 768) {
                if (content) {
                    return content.scrollTop > 300;
                }
            } else {
                if (rightColumn) {
                    return rightColumn.scrollTop > 300;
                }
            }
        } else {
            // 其他页面，检查窗口滚动位置
            return window.scrollY > 300;
        }
    }

}

export const scrollbar = new Scrollbar();
export default Scrollbar;
