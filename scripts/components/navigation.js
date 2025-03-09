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
    
    if (hamburger && navMenu) {
        // 汉堡菜单点击事件
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // 点击菜单项后关闭菜单
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
}

export default { initNavigation }; 