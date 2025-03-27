/**
 * @file init-lazy-loading.js
 * @description 懒加载初始化模块，协调各种懒加载功能的初始化
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-06
 * 
 * 该模块负责协调和初始化网站中的各种懒加载功能：
 * - 图片懒加载
 * - 表格懒加载
 * - 代码块懒加载
 * - 其他内容的懒加载
 * 
 * 提供了一个统一的入口点来初始化所有懒加载功能，简化了主程序的逻辑。
 * 根据页面内容自动检测需要懒加载的元素，并应用相应的懒加载处理。
 * 
 * 主要导出函数：
 * - initLazyLoading: 初始化所有懒加载功能
 */

import { imageLazyLoader } from './image-lazy-loader.js';
import logger from './logger.js';

// 在 DOMContentLoaded 事件触发后初始化
document.addEventListener('DOMContentLoaded', () => {
    logger.info('初始化图片懒加载...');
    
    // 处理文章内容中的图片
    const articleBody = document.querySelector('.article-body');
    if (articleBody) {
        logger.info('找到文章内容区域，开始处理图片...');
        imageLazyLoader.processImages(articleBody);
    } else {
        logger.info('未找到文章内容区域');
    }
    
    // 添加样式确认
    logger.debug('CSS样式检查:');
    const testImg = document.querySelector('.article-body img');
    if (testImg) {
        const styles = window.getComputedStyle(testImg);
        logger.debug('图片最大宽度:', styles.maxWidth);
        logger.debug('图片显示方式:', styles.display);
        logger.debug('图片外边距:', styles.margin);
    }
    
    // 监听动态加载的内容
    // 例如，如果有 AJAX 加载的内容，可以在加载完成后调用
    // imageLazyLoader.processImages(newlyLoadedContainer);
    
    logger.info('图片懒加载功能已初始化');
});

// 导出初始化函数，以便在需要时手动调用
export function initLazyLoading(container = document) {
    imageLazyLoader.processImages(container);
} 