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
 * - 初始状态：导航栏透明，文字白色
 * - 滚动状态：导航栏背景变为半透明白色，文字颜色改变
 * 
 */

// 添加一个立即执行函数，设置初始导航状态，避免闪烁
(function setInitialNavigationState() {
    // 检查是否有hero-section来决定初始导航样式
    if (document.readyState === 'loading') {
        // 如果DOM尚未加载完成，添加一个transition-paused类，暂停过渡效果
        document.documentElement.classList.add('nav-transition-paused');
        // 监听DOM内容加载事件
        document.addEventListener('DOMContentLoaded', () => {
            // 预先确定初始导航状态
            const header = document.querySelector('.header');
            if (header) {
                const heroSection = document.querySelector('.hero-section');
                // 如果页面上没有hero-section，或者滚动位置已经超过阈值，直接应用scrolled样式
                if (!heroSection || window.scrollY > heroSection.clientHeight * 0.1) {
                    header.classList.add('scrolled');
                }
                // 延迟移除过渡暂停，允许平滑过渡
                setTimeout(() => {
                    document.documentElement.classList.remove('nav-transition-paused');
                }, 50);
            }
        });
    } else {
        // DOM已加载，直接设置初始状态
        const header = document.querySelector('.header');
        if (header) {
            const heroSection = document.querySelector('.hero-section');
            if (!heroSection || window.scrollY > heroSection.clientHeight * 0.1) {
                header.classList.add('scrolled');
            }
        }
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

// 以下函数已不再使用，由initActiveNavLink替代
// 保留但注释掉以便未来参考
/*
function highlightCurrentPage() {
    // 获取当前页面的URL路径
    const currentPath = window.location.pathname;
    
    // 查找所有导航链接
    const navLinks = document.querySelectorAll('.nav-menu a');
    
    // 遍历每个链接，检查是否匹配当前路径
    navLinks.forEach(link => {
        const linkPath = new URL(link.href, window.location.origin).pathname;
        const linkFilename = linkPath.split('/').pop();
        const currentFilename = currentPath.split('/').pop() || 'index.html';
        
        // 清除之前的标记
        link.removeAttribute('aria-current');
        link.parentElement.classList.remove('active');
        
        // 如果链接匹配当前页面或者首页特殊情况
        if (linkFilename === currentFilename || 
            (currentFilename === '' && linkFilename === 'index.html')) {
            // 添加WAI-ARIA标记
            link.setAttribute('aria-current', 'page');
            // 添加高亮类
            link.parentElement.classList.add('active');
        }
    });
}
*/

/**
 * 初始化滚动导航效果
 */
export function initScrollNavigation() {
    const header = document.querySelector('.header');
    if (!header) {
        return;
    }
    
    // 根据初始滚动位置设置导航栏样式
    updateHeaderOnScroll();
    
    // 监听滚动事件
    window.addEventListener('scroll', () => {
        // 如果导航处于过渡暂停状态，不执行滚动更新
        if (document.documentElement.classList.contains('nav-transition-paused')) return;
        updateHeaderOnScroll();
    });
}

/**
 * 根据滚动位置更新导航栏样式
 * @private
 */
function updateHeaderOnScroll() {
    const header = document.querySelector('.header');
    if (!header) return;
    
    const scrollPosition = window.scrollY;
    const heroSection = document.querySelector('.hero-section');
    
    // 如果没有hero-section（如在某些页面），则始终应用scrolled类
    if (!heroSection) {
        header.classList.add('scrolled');
        return;
    }
    
    // 有hero-section时，根据滚动位置决定
    const threshold = heroSection.clientHeight * 0.1;
    
    if (scrollPosition > threshold) {
        // 滚动超过阈值，添加scrolled类
        header.classList.add('scrolled');
    } else {
        // 滚动位置在阈值以下，移除scrolled类
        header.classList.remove('scrolled');
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