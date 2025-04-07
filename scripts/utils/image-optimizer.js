/**
 * @file image-optimizer.js
 * @description 图片优化工具，提供图片处理和优化功能
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-06
 * 
 * 该模块提供了一系列图片处理和优化功能：
 * - 图片格式转换（如JPEG转WebP）
 * - 图片尺寸调整
 * - 图片质量优化
 * - 响应式图片源集生成
 * - 图片加载性能优化
 * 
 * 主要方法：
 * - optimizeImage: 优化单个图片
 * - generateSrcset: 生成响应式图片源集
 * - detectImageSupport: 检测浏览器对特定图片格式的支持
 * - preloadCriticalImages: 预加载关键图片
 * 
 * 该模块与imageLazyLoader.js配合使用，提供完整的图片优化解决方案。
 */

import logger from './logger.js';

// Cloudinary 配置
const CLOUDINARY_CLOUD_NAME = 'demo'; // 使用 Cloudinary 的演示账号，实际使用时应替换为自己的账号

/**
 * 通过 Cloudinary 优化图片 URL
 * @param {string} originalUrl - 原始图片 URL
 * @param {Object} options - 优化选项
 * @returns {string} - 优化后的图片 URL
 */
export function optimizeImageUrl(originalUrl, options = {}) {
    // 默认选项
    const defaultOptions = {
        scale: 0.5,         // 默认缩放比例为原图的 50%
        quality: 'auto',    // 自动质量
        format: 'auto',     // 自动格式（WebP/AVIF 等）
        fetchFormat: 'auto', // 自动选择最佳格式
        skipCloudinary: false // 新增选项，是否跳过Cloudinary处理
    };

    // 合并选项
    const settings = { ...defaultOptions, ...options };
    
    // 检查URL是否有效或跳过处理
    if (!originalUrl || !originalUrl.startsWith('http') || settings.skipCloudinary) {
        return originalUrl;
    }
    
    try {
        // 构建 Cloudinary URL
        // 使用相对比例缩放而非固定宽度
        const encodedUrl = encodeURIComponent(originalUrl);
        const transformations = [
            `c_scale,w_${Math.round(settings.scale * 100)}p`, // 使用相对比例缩放
            `q_${settings.quality}`,
            `f_${settings.format}`,
            `fl_progressive`
        ].join(',');
        
        return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/${transformations}/${encodedUrl}`;
    } catch (error) {
        logger.error('图片 URL 优化失败:', error);
        return originalUrl;
    }
}

/**
 * 根据设备和容器大小获取最佳缩放比例
 * @param {HTMLImageElement} img - 图片元素
 * @returns {Object} - 优化选项
 */
export function getOptimalImageSettings(img) {
    // 获取图片容器宽度或视口宽度
    const containerWidth = img.parentElement ? img.parentElement.offsetWidth : window.innerWidth;
    const viewportWidth = window.innerWidth;
    
    // 根据设备和容器大小确定合适的缩放比例
    let scale = 0.5; // 默认缩放比例为原图的 50%
    
    if (viewportWidth < 768) {
        // 移动设备
        scale = 0.4; // 缩小到原图的 40%
    } else if (containerWidth < 600) {
        // 小容器
        scale = 0.45; // 缩小到原图的 45%
    } else if (containerWidth > 1200) {
        // 大容器
        scale = 0.6; // 缩小到原图的 60%
    }
    
    return {
        scale,
        quality: 'auto',
        format: 'auto'
    };
}

/**
 * 处理 HTML 内容中的图片 URL
 * @param {string} htmlContent - HTML 内容
 * @returns {string} - 处理后的 HTML 内容
 */
export function processHtmlImages(htmlContent) {
    // 创建临时 DOM 元素
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // 处理所有图片
    const images = tempDiv.querySelectorAll('img');
    images.forEach(img => {
        const originalSrc = img.getAttribute('src');
        if (originalSrc && originalSrc.startsWith('http')) {
            // 保存原始 URL
            img.setAttribute('data-original-src', originalSrc);
            
            // 设置优化后的 URL
            const optimizedUrl = optimizeImageUrl(originalSrc);
            img.setAttribute('data-src', optimizedUrl); // 用于懒加载
        }
    });
    
    return tempDiv.innerHTML;
}

export default {
    optimizeImageUrl,
    getOptimalImageSettings,
    processHtmlImages
}; 