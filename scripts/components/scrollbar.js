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
const PageTypes = {
    HOME: 'home-page',
    BLOG: 'article-page'
};

/**
 * 滚动条目标元素选择器
 */
const ScrollTargets = {
    BLOG_LEFT_COLUMN: '.blog-content .left-column',
    BLOG_ARTICLE_TREE: '.article-tree-container',
    BLOG_RIGHT_COLUMN: '.blog-content .right-column',
    BLOG_CONTENT: '.blog-content',
    ARTICLE_TOC: '.article-toc',
    HOME_CONTENT: '.home-content'
};

/**
 * 检测当前页面类型
 * @returns {string} 页面类型
 */
function detectPageType() {
    const body = document.body;
    if (body.classList.contains(PageTypes.BLOG)) {
        return PageTypes.BLOG;
    }
    if (body.classList.contains(PageTypes.HOME)) {
        return PageTypes.HOME;
    }
    // 默认返回首页类型
    return PageTypes.HOME;
}

/**
 * 为目标元素应用滚动条样式
 * @param {string} selector - 目标元素选择器
 * @param {string} styleClass - 样式类名
 */
function applyScrollbarStyle(selector, styleClass) {
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
    
    logger.debug(`✅ 已为 ${elements.length} 个 ${selector} 元素应用 ${styleClass} 样式`);
}

/**
 * 初始化博客页面的滚动条
 */
function initializeBlogPageScrollbars() {
    logger.debug('初始化博客页面滚动条...');
    
    // 确保博客页面Body禁用默认滚动
    document.body.style.overflow = 'hidden';
    
    // 应用左侧栏窄版滚动条
    applyScrollbarStyle(ScrollTargets.BLOG_LEFT_COLUMN, ScrollbarClasses.NARROW);
    
    // 应用文章树容器窄版滚动条
    applyScrollbarStyle(ScrollTargets.BLOG_ARTICLE_TREE, ScrollbarClasses.NARROW);
    
    // 应用右侧栏通用滚动条
    applyScrollbarStyle(ScrollTargets.BLOG_RIGHT_COLUMN, ScrollbarClasses.CUSTOM);
    
    // 应用博客主内容区滚动条（小屏幕模式下使用）
    applyScrollbarStyle(ScrollTargets.BLOG_CONTENT, ScrollbarClasses.CUSTOM);
    
    // 应用文章目录滚动条
    applyScrollbarStyle(ScrollTargets.ARTICLE_TOC, ScrollbarClasses.NARROW);
    
    // 在博客页面禁用窗口滚动并使用右侧栏滚动
    enableCustomScrolling();
}

/**
 * 初始化首页的滚动条
 * 首页只应用样式，不应用复杂的滚动逻辑
 */
function initializeHomePageScrollbars() {
    logger.debug('初始化首页滚动条样式...');
    
    // 应用全局滚动条样式
    document.body.classList.add(ScrollbarClasses.CUSTOM);
    
    // 应用首页内容区滚动条
    applyScrollbarStyle(ScrollTargets.HOME_CONTENT, ScrollbarClasses.CUSTOM);
    
    // 首页不需要其他复杂的滚动逻辑处理
    logger.debug('首页滚动条样式应用完成');
}

/**
 * 初始化滚动事件监听器 - 仅用于博客页面
 */
function initializeScrollListeners() {
    logger.debug('初始化博客页面滚动事件监听器...');
    
    // 博客页面右侧栏滚动事件
    const rightColumn = document.querySelector(ScrollTargets.BLOG_RIGHT_COLUMN);
    if (rightColumn) {
        rightColumn.addEventListener('scroll', handleRightColumnScroll);
        logger.debug('✅ 已为右侧栏添加滚动事件监听器');
    }
    
    // 小屏幕模式下博客主内容区滚动事件
    const blogContent = document.querySelector(ScrollTargets.BLOG_CONTENT);
    if (blogContent) {
        blogContent.addEventListener('scroll', handleBlogContentScroll);
        logger.debug('✅ 已为博客主内容区添加滚动事件监听器');
    }
    
    // 窗口尺寸变化事件
    window.addEventListener('resize', handleWindowResize);
    logger.debug('✅ 已为窗口添加尺寸变化事件监听器');
}

/**
 * 启用自定义滚动行为
 * 在博客页面禁用窗口滚动，使用自定义滚动区域
 */
function enableCustomScrolling() {
    if (detectPageType() === PageTypes.BLOG) {
        // 禁用Body滚动
        document.body.style.overflow = 'hidden';
        
        // 启用右侧栏滚动
        const rightColumn = document.querySelector(ScrollTargets.BLOG_RIGHT_COLUMN);
        if (rightColumn) {
            rightColumn.style.overflowY = 'auto';
            rightColumn.style.overflowX = 'hidden';
        }
        
        // 小屏幕模式下启用博客主内容区滚动
        if (window.innerWidth <= 768) {
            const blogContent = document.querySelector(ScrollTargets.BLOG_CONTENT);
            if (blogContent) {
                blogContent.style.overflowY = 'auto';
                blogContent.style.overflowX = 'hidden';
                
                // 小屏幕模式下禁用右侧栏独立滚动
                if (rightColumn) {
                    rightColumn.style.overflowY = 'visible';
                }
            }
        }
    }
}

/**
 * 处理右侧栏滚动事件
 * @param {Event} event - 滚动事件
 */
function handleRightColumnScroll(event) {
    const rightColumn = event.target;
    const scrollTop = rightColumn.scrollTop;
    
    // 显示/隐藏返回顶部按钮
    toggleBackToTopButton(scrollTop > 300);
    
    // 处理文章目录的激活状态
    updateTocActiveState(scrollTop);
}

/**
 * 处理博客主内容区滚动事件（小屏幕模式）
 * @param {Event} event - 滚动事件
 */
function handleBlogContentScroll(event) {
    const blogContent = event.target;
    const scrollTop = blogContent.scrollTop;
    
    // 显示/隐藏返回顶部按钮
    toggleBackToTopButton(scrollTop > 300);
}

/**
 * 处理窗口尺寸变化事件
 */
function handleWindowResize() {
    // 只有在博客页面才重新应用滚动行为
    if (detectPageType() === PageTypes.BLOG) {
        enableCustomScrolling();
    }
}

/**
 * 显示/隐藏返回顶部按钮
 * @param {boolean} show - 是否显示
 */
function toggleBackToTopButton(show) {
    const backToTopButton = document.querySelector('.back-to-top');
    if (!backToTopButton) {
        logger.warn('未找到返回顶部按钮元素');
        return;
    }
    
    logger.debug(`切换返回顶部按钮可见性: ${show ? '显示' : '隐藏'}`);
    
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
 * 更新文章目录的激活状态
 * @param {number} scrollTop - 滚动位置
 */
function updateTocActiveState(scrollTop) {
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
function scrollToElement(target, options = {}) {
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
    
    const pageType = detectPageType();
    
    if (pageType === PageTypes.BLOG) {
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
function scrollToTop(smooth = true) {
    const pageType = detectPageType();
    
    if (pageType === PageTypes.BLOG) {
        // 博客页面，滚动右侧栏或主内容区（小屏幕）
        if (window.innerWidth <= 768) {
            const blogContent = document.querySelector(ScrollTargets.BLOG_CONTENT);
            if (blogContent) {
                blogContent.scrollTo({
                    top: 0,
                    behavior: smooth ? 'smooth' : 'auto'
                });
            }
        } else {
            const rightColumn = document.querySelector(ScrollTargets.BLOG_RIGHT_COLUMN);
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
function disableCustomScrolling() {
    // 恢复Body的默认滚动行为
    document.body.style.overflow = '';
    
    // 禁用右侧栏滚动
    const rightColumn = document.querySelector(ScrollTargets.BLOG_RIGHT_COLUMN);
    if (rightColumn) {
        rightColumn.style.overflowY = '';
        rightColumn.style.overflowX = '';
    }
    
    // 小屏幕模式下禁用博客主内容区滚动
    const blogContent = document.querySelector(ScrollTargets.BLOG_CONTENT);
    if (blogContent) {
        blogContent.style.overflowY = '';
        blogContent.style.overflowX = '';
    }
    
    logger.debug('已禁用自定义滚动行为，恢复默认滚动');
}

/**
 * 初始化滚动条
 * 与其他组件保持一致的初始化函数
 */
function initScrollbar() {
    logger.debug('初始化滚动条...');
    
    try {
        // 检测页面类型
        const pageType = detectPageType();
        logger.debug(`检测到页面类型: ${pageType}`);
        
        // 根据页面类型应用不同的滚动行为
        if (pageType === PageTypes.BLOG) {
            initializeBlogPageScrollbars();
        } else {
            initializeHomePageScrollbars();
        }
        
        // 只为博客页面添加全局滚动事件监听器
        if (pageType === PageTypes.BLOG) {
            initializeScrollListeners();
        }
        
        logger.debug('✅ 滚动条初始化完成');
    } catch (error) {
        logger.error('❌ 滚动条初始化失败:', error);
    }
}

// 页面加载后初始化
document.addEventListener('DOMContentLoaded', () => {
    logger.info('滚动组件加载完成，初始化滚动事件监听...');
    // 初始化滚动行为
    initScrollbar();
    
    // 检查当前页面滚动位置，决定是否显示返回顶部按钮
    checkInitialScrollPosition();
});

// 窗口加载完成后再次检查，以防动态内容改变了页面高度
window.addEventListener('load', () => {
    logger.info('页面完全加载，再次检查滚动位置...');
    checkInitialScrollPosition();
    
    // 定期检查返回顶部按钮是否存在并正确显示
    setTimeout(() => {
        if (!document.querySelector('.back-to-top.visible') && shouldShowBackToTop()) {
            logger.info('页面已滚动但返回顶部按钮未显示，强制显示按钮');
            toggleBackToTopButton(true);
        }
    }, 1000);
});

/**
 * 检查初始滚动位置，并相应地显示/隐藏返回顶部按钮
 */
function checkInitialScrollPosition() {
    // 检查页面类型
    const pageType = detectPageType();
    let shouldShow = false;
    
    if (pageType === PageTypes.BLOG) {
        // 博客页面，检查右侧栏或主内容区的滚动位置
        if (window.innerWidth <= 768) {
            const blogContent = document.querySelector(ScrollTargets.BLOG_CONTENT);
            if (blogContent) {
                shouldShow = blogContent.scrollTop > 300;
            }
        } else {
            const rightColumn = document.querySelector(ScrollTargets.BLOG_RIGHT_COLUMN);
            if (rightColumn) {
                shouldShow = rightColumn.scrollTop > 300;
            }
        }
    } else {
        // 其他页面，检查窗口滚动位置
        shouldShow = window.scrollY > 300;
    }
    
    logger.debug(`初始滚动检查: ${shouldShow ? '应显示' : '应隐藏'}返回顶部按钮`);
    toggleBackToTopButton(shouldShow);
}

/**
 * 判断是否应该显示返回顶部按钮
 * @returns {boolean} 是否应显示
 */
function shouldShowBackToTop() {
    const pageType = detectPageType();
    
    if (pageType === PageTypes.BLOG) {
        // 博客页面，检查右侧栏或主内容区的滚动位置
        if (window.innerWidth <= 768) {
            const blogContent = document.querySelector(ScrollTargets.BLOG_CONTENT);
            return blogContent ? blogContent.scrollTop > 300 : false;
        } else {
            const rightColumn = document.querySelector(ScrollTargets.BLOG_RIGHT_COLUMN);
            return rightColumn ? rightColumn.scrollTop > 300 : false;
        }
    } else {
        // 其他页面，检查窗口滚动位置
        return window.scrollY > 300;
    }
}

// 导出函数供外部使用
export { 
    enableCustomScrolling, 
    disableCustomScrolling,
    scrollToElement,
    scrollToTop,
    initScrollbar,
    PageTypes,
    ScrollTargets
}; 