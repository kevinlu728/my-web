/**
 * @file articleCacheManager.js
 * @description 文章缓存管理器，负责文章数据的缓存和检索
 * @version 1.2.0
 * @created 2024-03-26
 * @updated 2024-05-28
 * 
 * 该模块负责：
 * - 文章数据的缓存存储和获取
 * - 缓存的有效期管理（分层缓存策略）
 * - 批量缓存操作
 * - 缓存状态检查
 * - 缓存启用/禁用控制
 */

import logger from '../utils/logger.js';

/**
 * 检查缓存是否过期
 * @param {number} timestamp 缓存时间戳
 * @param {number} expirationTime 过期时间(毫秒)
 * @returns {boolean} 是否已过期
 */
function isCacheExpired(timestamp, expirationTime) {
    return Date.now() - timestamp > expirationTime;
}

class ArticleCacheManager {
    constructor() {
        // 缓存基础配置
        this.cachePrefix = 'article_cache_';
        
        // 分层缓存时间策略
        this.cacheExpiration = {
            articleList: 60 * 60 * 1000,          // 文章列表：1小时
            articleContent: 24 * 60 * 60 * 1000,  // 文章内容：24小时
            categories: 24 * 60 * 60 * 1000,      // 分类数据：24小时
            recentlyViewed: 7 * 24 * 60 * 60 * 1000 // 最近查看：7天
        };
        
        // 控制是否启用缓存
        this.enabled = true;
        
        // 初始化检查
        this._initializeCache();
    }
    
    /**
     * 初始化缓存系统，主要是检查localStorage是否可用，并清理过期缓存
     */
    _initializeCache() {
        try {
            if (typeof localStorage === 'undefined') {
                logger.warn('本地存储不可用，缓存功能将被禁用');
                this.enabled = false;
                return;
            }

            // 清理过期缓存
            this._clearExpiredCache();

            logger.info('文章缓存管理器初始化完成');
        } catch (error) {
            logger.error('缓存系统初始化失败:', error);
            this.enabled = false;
        }
    }
    
    /**
     * 获取缓存键
     * @param {string} pageId 文章ID
     * @returns {string} 缓存键
     */
    _getCacheKey(pageId) {
        return `${this.cachePrefix}${pageId}`;
    }

    /**
     * 确定缓存项的类型和过期时间
     * @param {string} pageId 文章或数据ID
     * @returns {number} 相应的过期时间(毫秒)
     */
    _getExpirationForItem(pageId) {
        if (pageId === 'articles') {
            return this.cacheExpiration.articleList;
        } else if (pageId === 'categories') {
            return this.cacheExpiration.categories;
        } else if (pageId.startsWith('recently_')) {
            return this.cacheExpiration.recentlyViewed;
        } else {
            // 默认为文章内容
            return this.cacheExpiration.articleContent;
        }
    }

    /**
     * 获取文章内容从缓存
     * @param {string} pageId - 文章ID
     * @returns {Object|null} 文章数据或null
     */
    getArticleFromCache(pageId) {
        // 如果缓存被禁用，直接返回null
        if (!this.enabled) {
            logger.debug('⏸️ [缓存禁用] 跳过缓存读取');
            return null;
        }
        
        if (!pageId) return null;
        
        try {
            const cacheKey = this._getCacheKey(pageId);
            const cached = localStorage.getItem(cacheKey);
            if (!cached) {
                logger.info(`❌ [缓存未命中] 文章: ${pageId}`);
                return null;
            }

            const { data, timestamp, expirationType } = JSON.parse(cached);
            
            // 获取过期时间 - 优先使用存储的类型，否则根据ID推断
            let expirationTime;
            if (expirationType && this.cacheExpiration[expirationType]) {
                expirationTime = this.cacheExpiration[expirationType];
            } else {
                expirationTime = this._getExpirationForItem(pageId);
            }
            
            if (isCacheExpired(timestamp, expirationTime)) {
                // 缓存过期，删除
                localStorage.removeItem(cacheKey);
                logger.info(`⏱️ [缓存过期] 文章: ${pageId}, 已删除 (过期类型: ${expirationType || '未知'})`);
                return null;
            }

            // 缓存命中日志
            if (pageId === 'articles') {
                logger.info(`✅ [缓存命中] 文章列表, 文章数: ${data.length || 0}`);
            } else if (pageId === 'categories') {
                logger.info(`✅ [缓存命中] 分类数据, 分类数: ${data.length || 0}`);
            } else {
                // 增加调试日志，查看缓存内容
                logger.debug('缓存数据概览:', {
                    有页面信息: !!data.page,
                    块数量: data.blocks?.length || 0,
                    有更多: data.hasMore,
                    是否完整: data.isFullyLoaded
                });
                
                logger.info(`✅ [缓存命中] 文章: ${pageId}, 块数量: ${data.blocks?.length || 0}`);
            }
            
            // 添加标记，表示这是从缓存加载的数据
            data._fromCache = true;
            return data;
        } catch (error) {
            logger.warn('❌ [缓存错误] 读取缓存失败:', error);
            return null;
        }
    }

    /**
     * 将文章数据写入缓存
     * @param {string} pageId 文章ID
     * @param {Object} data 文章数据
     */
    setArticleCache(pageId, data) {
        // 如果缓存被禁用，跳过缓存操作
        if (!this.enabled) {
            logger.debug('⏸️ [缓存禁用] 跳过缓存写入');
            return;
        }
        
        if (!pageId || !data) return;
        
        try {
            const cacheKey = this._getCacheKey(pageId);
            
            // 确定缓存类型
            let expirationType;
            if (pageId === 'articles') {
                expirationType = 'articleList';
            } else if (pageId === 'categories') {
                expirationType = 'categories';
            } else if (pageId.startsWith('recently_')) {
                expirationType = 'recentlyViewed';
            } else {
                expirationType = 'articleContent';
            }
            
            const cacheData = {
                data,
                timestamp: Date.now(),
                expirationType: expirationType
            };
            
            // 添加调试日志
            if (pageId === 'articles') {
                logger.debug('缓存文章列表:', {
                    文章数: data.length || 0,
                    缓存类型: expirationType,
                    过期时间: `${this.cacheExpiration[expirationType] / (60 * 60 * 1000)}小时`
                });
            } else if (pageId === 'categories') {
                logger.debug('缓存分类数据:', {
                    分类数: data.length || 0,
                    缓存类型: expirationType,
                    过期时间: `${this.cacheExpiration[expirationType] / (60 * 60 * 1000)}小时`
                });
            } else {
                logger.debug('缓存文章内容:', {
                    页面ID: pageId,
                    块数量: data.blocks?.length || 0,
                    是否有更多: data.hasMore,
                    是否完整加载: data.isFullyLoaded,
                    缓存类型: expirationType,
                    过期时间: `${this.cacheExpiration[expirationType] / (60 * 60 * 1000)}小时`
                });
            }
            
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            
            // 写入成功日志
            if (pageId === 'articles') {
                logger.info(`📦 [缓存写入] 文章列表: ${data.length}篇文章, 类型: ${expirationType}`);
            } else if (pageId === 'categories') {
                logger.info(`📦 [缓存写入] 分类数据: ${data.length}个分类, 类型: ${expirationType}`);
            } else {
                logger.info(`📦 [缓存写入] 文章: ${pageId}, 块数量: ${data.blocks?.length || 0}, 类型: ${expirationType}`);
            }
        } catch (error) {
            logger.warn('❌ [缓存错误] 写入缓存失败:', error);
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
        // 如果缓存被禁用，跳过更新
        if (!this.enabled) {
            logger.debug('⏸️ [缓存禁用] 跳过缓存更新');
            return;
        }
        
        if (!pageId || !newBlocks || newBlocks.length === 0) return;
        
        try {
            // 从缓存获取现有数据，合并内容再更新
            const cachedData = this.getArticleFromCache(pageId) || {};
            const currentBlocks = cachedData.blocks || [];
            
            // 检测并过滤掉重复的块
            const uniqueNewBlocks = newBlocks.filter(newBlock => {
                // 检查新块是否已存在于当前缓存的块中
                return !currentBlocks.some(existingBlock => existingBlock.id === newBlock.id);
            });
            
            if (uniqueNewBlocks.length < newBlocks.length) {
                logger.debug(`🔍 [缓存去重] 过滤掉了 ${newBlocks.length - uniqueNewBlocks.length} 个重复块`);
            }
            
            // 合并块（只添加非重复的块）
            const mergedBlocks = currentBlocks.concat(uniqueNewBlocks);
            
            // 更新缓存
            const articleData = {
                page: cachedData.page,
                blocks: mergedBlocks,
                hasMore: hasMore,
                nextCursor: nextCursor,
                isFullyLoaded: !hasMore // 如果没有更多内容，标记为完全加载
            };
            
            this.setArticleCache(pageId, articleData);
            logger.info(`🔄 [缓存更新] 文章: ${pageId}, 新增: ${uniqueNewBlocks.length}块, 总计: ${mergedBlocks.length}块`);
        } catch (error) {
            logger.warn('❌ [缓存错误] 更新文章缓存失败:', error);
        }
    }

    /**
     * 将文章列表保存到缓存
     * @param {Array} articles - 文章列表
     */
    saveArticlesToCache(articles) {
        // 如果缓存被禁用，跳过保存
        if (!this.enabled) {
            logger.debug('⏸️ [缓存禁用] 跳过保存文章列表');
            return;
        }
        
        if (!articles || articles.length === 0) return;
        
        try {
            this.setArticleCache('articles', articles);
            this.setArticleCache('categories', Array.from(new Set(articles.map(a => a.category))));
        } catch (error) {
            logger.warn('❌ [缓存错误] 保存文章列表到缓存失败:', error);
        }
    }

    /**
     * 从缓存加载文章列表
     * @returns {Array|null} 文章列表或null
     */
    loadArticlesFromCache() {
        // 如果缓存被禁用，返回null
        if (!this.enabled) {
            logger.debug('⏸️ [缓存禁用] 跳过加载文章列表');
            return null;
        }
        
        try {
            const cachedArticles = this.getArticleFromCache('articles');
            if (cachedArticles && cachedArticles.length > 0) {
                return cachedArticles;
            }
        } catch (error) {
            logger.warn('❌ [缓存错误] 从缓存加载文章列表失败:', error);
        }
        return null;
    }

    /**
     * 清理过期的缓存
     */
    _clearExpiredCache() {
        // 如果缓存被禁用，跳过清理
        if (!this.enabled) {
            logger.debug('⏸️ [缓存禁用] 跳过清理过期缓存');
            return;
        }
        
        try {
            let expiredCount = 0;
            let corruptedCount = 0;
            let typeStats = {};
            
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.cachePrefix)) {
                    try {
                        const cached = JSON.parse(localStorage.getItem(key));
                        const pageId = key.substring(this.cachePrefix.length);
                        
                        // 获取过期时间 - 优先使用存储的类型，否则根据ID推断
                        let expirationTime;
                        if (cached.expirationType && this.cacheExpiration[cached.expirationType]) {
                            expirationTime = this.cacheExpiration[cached.expirationType];
                            typeStats[cached.expirationType] = (typeStats[cached.expirationType] || 0) + 1;
                        } else {
                            expirationTime = this._getExpirationForItem(pageId);
                            typeStats['inferred'] = (typeStats['inferred'] || 0) + 1;
                        }
                        
                        if (isCacheExpired(cached.timestamp, expirationTime)) {
                            localStorage.removeItem(key);
                            expiredCount++;
                            
                            if (cached.expirationType) {
                                typeStats[`expired_${cached.expirationType}`] = 
                                    (typeStats[`expired_${cached.expirationType}`] || 0) + 1;
                            }
                        }
                    } catch (e) {
                        // 如果项目解析失败，删除它
                        localStorage.removeItem(key);
                        corruptedCount++;
                    }
                }
            });
            
            if (expiredCount > 0 || corruptedCount > 0) {
                logger.info(`🧹 [缓存清理] 已删除 ${expiredCount} 个过期项目, ${corruptedCount} 个损坏项目`);
                logger.debug('缓存统计:', typeStats);
            } else {
                logger.debug('过期缓存已检查，无需清理');
            }
        } catch (error) {
            logger.warn('❌ [缓存错误] 清理过期缓存失败:', error);
        }
    }

    /**
     * 清除所有文章缓存
     */
    clearAllArticleCache() {
        // 如果缓存被禁用，跳过清除
        if (!this.enabled) {
            logger.debug('⏸️ [缓存禁用] 跳过清除所有缓存');
            return;
        }
        
        try {
            // 获取所有以article_开头的缓存键
            const keys = Object.keys(localStorage);
            const articleKeys = keys.filter(key => key.startsWith(this.cachePrefix));
            
            // 删除所有文章缓存
            articleKeys.forEach(key => {
                localStorage.removeItem(key);
            });
            
            logger.info(`🧹 [缓存清理] 已清除所有 ${articleKeys.length} 个文章缓存`);
        } catch (error) {
            logger.warn('❌ [缓存错误] 清除所有文章缓存失败:', error);
        }
    }
}

// 导出单例实例
export const articleCacheManager = new ArticleCacheManager(); 