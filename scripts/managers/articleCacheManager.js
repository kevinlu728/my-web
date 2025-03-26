/**
 * @file articleCacheManager.js
 * @description 文章缓存管理器，负责文章数据的缓存和检索
 * @version 1.0.0
 * @created 2024-03-26
 * 
 * 该模块负责：
 * - 文章数据的缓存存储和获取
 * - 缓存的有效期管理
 * - 批量缓存操作
 * - 缓存状态检查
 */

import { ArticleCache } from '../utils/article-cache.js';

class ArticleCacheManager {
    constructor() {
        // 初始化缓存管理器，使用与原articleManager相同的配置
        this.articleCache = new ArticleCache({
            cachePrefix: 'article_cache_',
            expirationTime: 30 * 60 * 1000 // 30分钟缓存有效期
        });
        
        // 初始时清理过期缓存
        this.clearExpiredCache();
    }

    /**
     * 获取文章内容从缓存
     * @param {string} pageId - 文章ID
     * @returns {Object|null} 文章数据或null
     */
    getArticleFromCache(pageId) {
        if (!pageId) return null;
        
        try {
            const cachedData = this.articleCache.getArticleFromCache(pageId);
            if (cachedData) {
                console.log('📦 从缓存加载文章:', pageId);
                
                // 添加标记，表示这是从缓存加载的数据
                cachedData._fromCache = true;
                return cachedData;
            }
            return null;
        } catch (error) {
            console.warn('从缓存获取文章失败:', error);
            return null;
        }
    }

    /**
     * 保存文章内容到缓存
     * @param {string} pageId - 文章ID
     * @param {Object} articleData - 文章数据
     */
    setArticleCache(pageId, articleData) {
        if (!pageId || !articleData) return;
        
        try {
            this.articleCache.setArticleCache(pageId, articleData);
            console.debug('文章已保存到缓存:', pageId);
        } catch (error) {
            console.warn('保存文章到缓存失败:', error);
        }
    }

    /**
     * 更新文章缓存，合并新的内容块
     * @param {string} pageId - 文章ID
     * @param {Array} newBlocks - 新的内容块
     * @param {boolean} hasMore - 是否还有更多内容
     * @param {string} nextCursor - 下一页的游标
     */
    updateArticleCache(pageId, newBlocks, hasMore, nextCursor) {
        if (!pageId || !newBlocks || newBlocks.length === 0) return;
        
        try {
            // 从缓存获取现有数据，合并内容再更新
            const cachedData = this.getArticleFromCache(pageId) || {};
            const mergedBlocks = (cachedData.blocks || []).concat(newBlocks);
            
            // 更新缓存
            const articleData = {
                page: cachedData.page,
                blocks: mergedBlocks,
                hasMore: hasMore,
                nextCursor: nextCursor,
                isFullyLoaded: !hasMore // 如果没有更多内容，标记为完全加载
            };
            
            this.setArticleCache(pageId, articleData);
        } catch (error) {
            console.warn('更新文章缓存失败:', error);
        }
    }

    /**
     * 将文章列表保存到缓存
     * @param {Array} articles - 文章列表
     */
    saveArticlesToCache(articles) {
        if (!articles || articles.length === 0) return;
        
        try {
            this.articleCache.setItem('articles', articles);
            this.articleCache.setItem('categories', Array.from(new Set(articles.map(a => a.category))));
            console.debug('文章列表已保存到缓存');
        } catch (error) {
            console.warn('保存文章列表到缓存失败:', error);
        }
    }

    /**
     * 从缓存加载文章列表
     * @returns {Array|null} 文章列表或null
     */
    loadArticlesFromCache() {
        try {
            const cachedArticles = this.articleCache.getItem('articles');
            if (cachedArticles && cachedArticles.length > 0) {
                console.debug('从缓存加载文章列表成功');
                return cachedArticles;
            }
        } catch (error) {
            console.warn('从缓存加载文章列表失败:', error);
        }
        return null;
    }

    /**
     * 清理过期的缓存
     */
    clearExpiredCache() {
        try {
            this.articleCache.clearExpiredCache();
            console.debug('过期缓存已清理');
        } catch (error) {
            console.warn('清理过期缓存失败:', error);
        }
    }

    /**
     * 清除特定文章的缓存
     * @param {string} pageId - 文章ID
     */
    clearArticleCache(pageId) {
        if (!pageId) return;
        
        try {
            this.articleCache.removeItem(`article_${pageId}`);
            console.debug('已清除文章缓存:', pageId);
        } catch (error) {
            console.warn('清除文章缓存失败:', error);
        }
    }

    /**
     * 清除所有文章缓存
     */
    clearAllArticleCache() {
        try {
            // 获取所有以article_开头的缓存键
            const keys = Object.keys(localStorage);
            const articleKeys = keys.filter(key => key.startsWith(this.articleCache.cachePrefix));
            
            // 删除所有文章缓存
            articleKeys.forEach(key => {
                localStorage.removeItem(key);
            });
            
            console.debug('已清除所有文章缓存');
        } catch (error) {
            console.warn('清除所有文章缓存失败:', error);
        }
    }

    /**
     * 检查文章缓存是否存在且有效
     * @param {string} pageId - 文章ID
     * @returns {boolean} 是否存在有效缓存
     */
    hasValidCache(pageId) {
        if (!pageId) return false;
        
        try {
            const cachedData = this.articleCache.getArticleFromCache(pageId);
            return !!cachedData;
        } catch (error) {
            return false;
        }
    }
}

// 导出单例实例
export const articleCacheManager = new ArticleCacheManager(); 