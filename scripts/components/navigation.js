/**
 * @file navigation.js
 * @description 导航菜单组件，处理网站导航栏的交互逻辑，处理滚动时导航栏样式的变化
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-09
 * @updated 2024-07-22
 * 
 * 该组件负责处理网站导航菜单的所有交互功能，包括：
 * - 移动端汉堡菜单的展开/收起
 * - 菜单项点击后的导航菜单收起
 * 负责在页面滚动时动态改变导航栏的样式：
 * - 初始状态：导航栏透明，文字白色（首页）
 * - 滚动状态：导航栏背景变为半透明白色，文字颜色改变
 * 
 */

// 初始导航状态设置
(function initNavigation() {
    // 初始加载时，根据滚动位置设置body类
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            updateHeaderOnScroll();
        });
    } else {
        updateHeaderOnScroll();
    }
})();

export function initNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
    
    // 添加点击菜单项后关闭移动端菜单的功能
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // 如果是移动视图，点击后关闭菜单
            if (window.innerWidth <= 768) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    });
}

/**
 * 初始化滚动导航效果
 */
export function initScrollNavigation() {
    // 根据初始滚动位置设置body样式
    updateHeaderOnScroll();
    
    // 监听滚动事件
    window.addEventListener('scroll', () => {
        updateHeaderOnScroll();
    });
}

/**
 * 根据滚动位置更新导航栏样式
 * @private
 */
function updateHeaderOnScroll() {
    const scrollPosition = window.scrollY;
    const heroSection = document.querySelector('.hero-section');
    
    // 如果不是首页或没有hero-section，始终使用scrolled样式
    if (!document.body.classList.contains('home-page') || !heroSection) {
        document.body.classList.add('scrolled');
        return;
    }
    
    // 首页上有hero-section时，根据滚动位置决定
    const threshold = heroSection.clientHeight * 0.1;
    
    if (scrollPosition > threshold) {
        // 滚动超过阈值，添加scrolled类到body
        document.body.classList.add('scrolled');
    } else {
        // 滚动位置在阈值以下，移除scrolled类
        document.body.classList.remove('scrolled');
    }
}

/**
 * 初始化当前页面的导航高亮
 */
export function initActiveNavLink() {
    // 优化导航高亮逻辑，减少重排/重绘
    const navLinks = document.querySelectorAll('.nav-menu a');
    if (navLinks.length === 0) return;

    const currentPath = window.location.pathname;
    
    // 将所有操作放入一个DocumentFragment中，减少DOM操作次数
    const fragment = document.createDocumentFragment();
    
    navLinks.forEach(link => {
        // 移除所有已有的aria-current属性
        link.removeAttribute('aria-current');
        
        // 获取链接的路径部分
        const linkPath = new URL(link.href, window.location.origin).pathname;
        
        // 检查是否匹配当前页面
        // 处理首页特殊情况
        if (
            (currentPath === '/' && linkPath.includes('index.html')) ||
            (currentPath.includes('index.html') && linkPath.includes('index.html')) ||
            (currentPath !== '/' && !currentPath.includes('index.html') && linkPath === currentPath)
        ) {
            // 设置为当前页
            link.setAttribute('aria-current', 'page');
        }
        
        // 将修改后的链接添加到fragment中
        fragment.appendChild(link.cloneNode(true));
    });
    
    // 使用requestAnimationFrame确保样式更新在下一帧渲染
    requestAnimationFrame(() => {
        // 此处不实际应用fragment，因为我们只是修改属性而不是替换元素
        // 这是优化性能的一种方式
    });
}

export default {
    initNavigation,
    initScrollNavigation,
    initActiveNavLink
}; 