/**
 * @file article-cache.js
 * @description 文章缓存管理工具
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-20
 */

import { isCacheExpired } from './article-utils.js';

/**
 * 文章缓存管理类
 */
export class ArticleCache {
    /**
     * 创建文章缓存管理器
     * @param {Object} options 缓存选项
     * @param {string} options.cachePrefix 缓存键前缀
     * @param {number} options.expirationTime 缓存过期时间(毫秒)
     */
    constructor(options = {}) {
        this.cachePrefix = options.cachePrefix || 'article_cache_';
        this.expirationTime = options.expirationTime || 30 * 60 * 1000; // 默认30分钟
    }

    /**
     * 获取缓存键
     * @param {string} pageId 文章ID
     * @returns {string} 缓存键
     */
    getCacheKey(pageId) {
        return `${this.cachePrefix}${pageId}`;
    }

    /**
     * 从缓存获取文章
     * @param {string} pageId 文章ID
     * @returns {Object|null} 缓存的文章数据或null
     */
    getArticleFromCache(pageId) {
        try {
            const cacheKey = this.getCacheKey(pageId);
            const cached = localStorage.getItem(cacheKey);
            if (!cached) return null;

            const { data, timestamp } = JSON.parse(cached);
            if (isCacheExpired(timestamp, this.expirationTime)) {
                // 缓存过期，删除
                localStorage.removeItem(cacheKey);
                return null;
            }

            // 增加调试日志，查看缓存内容
            console.log('缓存数据概览:', {
                有页面信息: !!data.page,
                块数量: data.blocks?.length || 0,
                有更多: data.hasMore,
                是否完整: data.isFullyLoaded
            });

            return data;
        } catch (error) {
            console.warn('读取缓存失败:', error);
            return null;
        }
    }

    /**
     * 将文章数据写入缓存
     * @param {string} pageId 文章ID
     * @param {Object} data 文章数据
     */
    setArticleCache(pageId, data) {
        try {
            const cacheKey = this.getCacheKey(pageId);
            const cacheData = {
                data,
                timestamp: Date.now()
            };
            
            // 添加调试日志
            console.log('写入缓存:', {
                页面ID: pageId,
                块数量: data.blocks?.length || 0,
                是否有更多: data.hasMore,
                是否完整加载: data.isFullyLoaded
            });
            
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('写入缓存失败:', error);
        }
    }

    /**
     * 清理过期缓存
     */
    clearExpiredCache() {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.cachePrefix)) {
                    try {
                        const cached = JSON.parse(localStorage.getItem(key));
                        if (isCacheExpired(cached.timestamp, this.expirationTime)) {
                            localStorage.removeItem(key);
                        }
                    } catch (e) {
                        // 如果项目解析失败，删除它
                        console.warn(`删除损坏的缓存项: ${key}`);
                        localStorage.removeItem(key);
                    }
                }
            });
        } catch (error) {
            console.warn('清理缓存失败:', error);
        }
    }

    /**
     * 移除特定文章的缓存
     * @param {string} pageId 文章ID
     */
    removeArticleCache(pageId) {
        const cacheKey = this.getCacheKey(pageId);
        localStorage.removeItem(cacheKey);
    }

    /**
     * 清除所有文章缓存
     */
    clearAllCache() {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.cachePrefix)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.warn('清除所有缓存失败:', error);
        }
    }

    /**
     * 更新缓存的文章
     * @param {string} pageId 文章ID
     * @param {Object} newData 新的文章数据
     * @returns {boolean} 是否成功更新
     */
    updateArticleCache(pageId, newData) {
        try {
            const existingData = this.getArticleFromCache(pageId);
            if (!existingData) return false;

            const updatedData = {
                ...existingData,
                ...newData
            };

            this.setArticleCache(pageId, updatedData);
            return true;
        } catch (error) {
            console.warn('更新缓存失败:', error);
            return false;
        }
    }
}