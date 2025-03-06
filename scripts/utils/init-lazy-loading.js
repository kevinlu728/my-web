/**
 * 初始化图片懒加载
 * 这个脚本用于在页面加载后处理已有的图片
 */

import { imageLazyLoader } from './image-lazy-loader.js';

// 在 DOMContentLoaded 事件触发后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('初始化图片懒加载...');
    
    // 处理文章内容中的图片
    const articleBody = document.querySelector('.article-body');
    if (articleBody) {
        console.log('找到文章内容区域，开始处理图片...');
        imageLazyLoader.processImages(articleBody);
    } else {
        console.log('未找到文章内容区域');
    }
    
    // 添加样式确认
    console.log('CSS样式检查:');
    const testImg = document.querySelector('.article-body img');
    if (testImg) {
        const styles = window.getComputedStyle(testImg);
        console.log('图片最大宽度:', styles.maxWidth);
        console.log('图片显示方式:', styles.display);
        console.log('图片外边距:', styles.margin);
    }
    
    // 监听动态加载的内容
    // 例如，如果有 AJAX 加载的内容，可以在加载完成后调用
    // imageLazyLoader.processImages(newlyLoadedContainer);
    
    console.log('图片懒加载功能已初始化');
});

// 导出初始化函数，以便在需要时手动调用
export function initLazyLoading(container = document) {
    imageLazyLoader.processImages(container);
} 