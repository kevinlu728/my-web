/**
 * @file navigation.js
 * @description 导航菜单组件，处理网站导航栏的交互逻辑
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-09
 * 
 * 该组件负责处理网站导航菜单的所有交互功能，包括：
 * - 移动端汉堡菜单的展开/收起
 * - 菜单项点击后的导航菜单收起
 * - 响应式导航栏的适配
 * 
 * 通过initNavigation函数暴露功能，可被主入口文件调用。
 */

export function initNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
    
    // 高亮当前页面
    highlightCurrentPage();
}

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

export default { initNavigation }; 