/**
 * @file article-utils.js
 * @description 文章相关工具函数
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-20
 */

import { UrlUtils } from './url-utils.js';
import logger from './logger.js';

/**
 * 节流函数 - 限制函数在特定时间内只能执行一次
 * @param {Function} func 要执行的函数
 * @param {number} limit 时间间隔（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 在文本中高亮显示搜索词
 * @param {string} text 原始文本
 * @param {string} searchTerm 要高亮的搜索词
 * @returns {string} 包含高亮HTML的文本
 */
export function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return text.replace(regex, match => `<span class="search-highlight">${match}</span>`);
}

/**
 * 格式化Notion页面ID，确保使用正确的格式
 * @param {string} pageId 原始页面ID
 * @returns {string} 格式化后的页面ID
 */
export function getFormattedPageId(pageId) {
    // 如果ID包含连字符，直接返回
    if (pageId.includes('-')) {
        return pageId;
    }
    
    // 如果ID是纯数字字符串，这可能是错误的ID
    if (/^\d+$/.test(pageId)) {
        logger.warn(`发现纯数字ID: ${pageId}，这可能不是有效的Notion页面ID`);
        return pageId;
    }
    
    // 如果ID是32个字符但没有连字符，添加连字符
    if (pageId.length === 32) {
        // 按照Notion UUID格式添加连字符: 8-4-4-4-12
        return `${pageId.substring(0, 8)}-${pageId.substring(8, 12)}-${pageId.substring(12, 16)}-${pageId.substring(16, 20)}-${pageId.substring(20)}`;
    }
    
    // 其他情况，尽量返回原始ID
    return pageId;
}

/**
 * 格式化日期为YYYY/M/D格式
 * @param {string|Date} date 日期对象或日期字符串
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date) {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    return `${dateObj.getFullYear()}/${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
}

/**
 * 检查缓存是否过期
 * @param {number} timestamp 缓存的时间戳
 * @param {number} expirationTime 过期时间（毫秒）
 * @returns {boolean} 是否已过期
 */
export function isCacheExpired(timestamp, expirationTime) {
    return Date.now() - timestamp > expirationTime;
}

/**
 * 从Notion属性中提取标题
 * @param {Object} properties Notion页面属性对象
 * @returns {string} 提取的标题或默认值
 */
export function extractTitleFromProperties(properties) {
    if (!properties) return 'Untitled';
    
    // 尝试从 Name 或 Title 属性中获取标题
    const titleProperty = properties.Name || properties.Title;
    
    if (titleProperty && titleProperty.title && Array.isArray(titleProperty.title) && titleProperty.title.length > 0) {
        return titleProperty.title.map(t => t.plain_text || '').join('');
    }
    
    return 'Untitled';
}

/**
 * 从Notion属性中提取分类
 * @param {Object} properties Notion页面属性对象
 * @returns {string} 提取的分类或默认值
 */
export function extractCategoryFromProperties(properties) {
    if (!properties || !properties.Category) return 'Uncategorized';
    
    const categoryProp = properties.Category;
    
    if (categoryProp.select && categoryProp.select.name) {
        return categoryProp.select.name;
    } else if (categoryProp.multi_select && Array.isArray(categoryProp.multi_select) && categoryProp.multi_select.length > 0) {
        return categoryProp.multi_select.map(c => c.name).join(', ');
    }
    
    return 'Uncategorized';
}

/**
 * 从URL中提取查询参数
 * @param {string} paramName 参数名
 * @returns {string|null} 参数值或null
 * @deprecated 请使用 UrlUtils.getParam 代替
 */
export function getQueryParam(paramName) {
    return UrlUtils.getParam(paramName);
}

/**
 * 更新URL查询参数而不重新加载页面
 * @param {string} paramName 参数名
 * @param {string} value 参数值
 * @deprecated 请使用 UrlUtils.updateParam 代替
 */
export function updateUrlParam(paramName, value) {
    UrlUtils.updateParam(paramName, value);
} 