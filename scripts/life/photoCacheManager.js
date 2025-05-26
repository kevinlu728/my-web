/**
 * @file photoCacheManager.js
 * @description 照片缓存管理器，负责照片数据的本地缓存管理
 * @created 2024-05-28
 * 
 * 该模块负责:
 * 1. 照片数据的本地缓存存储
 * 2. 照片元数据的缓存管理
 * 3. 缓存过期策略
 * 4. 与照片管理器和分页管理器的集成
 */

import logger from '../utils/logger.js';
import lifecycleManager from '../utils/lifecycleManager.js';
import { lifeViewManager } from './lifeViewManager.js';

class PhotoCacheManager {
    constructor() {
        this.cacheKeyPrefix = 'photo_cache_';
        this.metadataKey = 'photo_cache_metadata';
        
        // 分层缓存时间策略
        this.cacheExpiration = {
            photoList: 8 * 60 * 60 * 1000,     // 照片列表：8小时
            pagination: 4 * 60 * 60 * 1000,    // 分页数据：4小时
            photo: 3 * 24 * 60 * 60 * 1000,    // 单张照片：3天
            recentlyViewed: 7 * 24 * 60 * 60 * 1000  // 最近查看：7天
        };
        
        this.defaultExpiration = 8 * 60 * 60 * 1000; // 默认为8小时
        this.enabled = true; // 控制是否启用缓存
        
        // 初始化检查
        this._initializeCache();
    }
    
    /**
     * 初始化缓存系统
     */
    _initializeCache() {
        try {
            // 检查是否支持localStorage
            if (typeof localStorage === 'undefined') {
                logger.warn('本地存储不可用，缓存功能将被禁用');
                this.enabled = false;
                return;
            }
            
            // 读取缓存元数据
            const metadata = this._getMetadata();
            
            // 清理过期缓存
            this._cleanExpiredCache(metadata);
            
            // 注册清理函数
            lifecycleManager.registerCleanup('photoCacheManager', this.cleanup.bind(this));
            
            logger.info('照片缓存管理器初始化完成');
        } catch (error) {
            logger.error('缓存系统初始化失败:', error);
            this.enabled = false;
        }
    }
    
    /**
     * 获取缓存元数据
     * @returns {Object} 缓存元数据
     */
    _getMetadata() {
        try {
            const metadataStr = localStorage.getItem(this.metadataKey);
            if (metadataStr) {
                return JSON.parse(metadataStr);
            }
        } catch (error) {
            logger.error('读取缓存元数据失败:', error);
        }
        
        // 如果没有元数据或解析失败，返回空对象
        return {
            lastCleanup: Date.now(),
            cacheEntries: {}
        };
    }
    
    /**
     * 保存缓存元数据
     * @param {Object} metadata 要保存的元数据
     */
    _saveMetadata(metadata) {
        try {
            localStorage.setItem(this.metadataKey, JSON.stringify(metadata));
        } catch (error) {
            logger.error('保存缓存元数据失败:', error);
            
            // 如果存储空间不足，尝试清理一些缓存
            if (error.name === 'QuotaExceededError') {
                this._emergencyCleanup();
                
                // 再次尝试保存
                try {
                    localStorage.setItem(this.metadataKey, JSON.stringify(metadata));
                } catch (retryError) {
                    logger.error('紧急清理后仍无法保存元数据:', retryError);
                }
            }
        }
    }
    
    /**
     * 清理过期缓存
     * @param {Object} metadata 缓存元数据
     */
    _cleanExpiredCache(metadata) {
        const now = Date.now();
        let hasChanges = false;
        
        // 只在距离上次清理超过1小时时执行
        if (!metadata.lastCleanup || (now - metadata.lastCleanup > 60 * 60 * 1000)) {
            logger.info('开始清理过期缓存...');
            
            Object.keys(metadata.cacheEntries || {}).forEach(key => {
                const entry = metadata.cacheEntries[key];
                
                // 检查是否过期
                if (entry.expiration && entry.expiration < now) {
                    // 删除缓存数据
                    localStorage.removeItem(this.cacheKeyPrefix + key);
                    delete metadata.cacheEntries[key];
                    hasChanges = true;
                    
                    logger.debug(`已清理过期缓存: ${key}`);
                }
            });
            
            // 更新上次清理时间
            metadata.lastCleanup = now;
            hasChanges = true;
            
            logger.info('缓存清理完成');
        }
        
        // 如果有变更，保存元数据
        if (hasChanges) {
            this._saveMetadata(metadata);
        }
    }
    
    /**
     * 紧急清理，当存储空间不足时调用
     */
    _emergencyCleanup() {
        logger.warn('存储空间不足，执行紧急缓存清理');
        
        try {
            const metadata = this._getMetadata();
            const entries = metadata.cacheEntries || {};
            const keys = Object.keys(entries);
            
            // 如果没有缓存项，无需清理
            if (keys.length === 0) return;
            
            // 按过期时间排序，优先删除即将过期的
            keys.sort((a, b) => {
                const expA = entries[a].expiration || 0;
                const expB = entries[b].expiration || 0;
                return expA - expB;
            });
            
            // 删除前1/3的缓存
            const deleteCount = Math.max(1, Math.floor(keys.length / 3));
            for (let i = 0; i < deleteCount; i++) {
                const key = keys[i];
                localStorage.removeItem(this.cacheKeyPrefix + key);
                delete entries[key];
                
                logger.debug(`紧急清理缓存: ${key}`);
            }
            
            // 保存更新后的元数据
            this._saveMetadata(metadata);
            
            logger.info(`紧急清理完成，删除了 ${deleteCount} 项缓存`);
        } catch (error) {
            logger.error('紧急清理过程中出错:', error);
        }
    }
    
    /**
     * 生成缓存键
     * @param {string} type 缓存类型
     * @param {string} id 标识符
     * @returns {string} 缓存键
     */
    _generateCacheKey(type, id) {
        return `${type}_${id}`;
    }
    
    /**
     * 根据数据库ID和过滤器生成查询缓存键
     * @param {string} databaseId 数据库ID
     * @param {Object} filter 过滤条件
     * @returns {string} 缓存键
     */
    _generateQueryCacheKey(databaseId, filter = null) {
        let key = `query_${databaseId}`;
        if (filter) {
            key += `_${JSON.stringify(filter)}`;
        }
        return key;
    }
    
    /**
     * 根据游标生成分页缓存键
     * @param {string} databaseId 数据库ID
     * @param {string} cursor 分页游标
     * @returns {string} 缓存键
     */
    _generatePaginationCacheKey(databaseId, cursor) {
        return `pagination_${databaseId}_${cursor}`;
    }
    
    /**
     * 缓存照片列表
     * @param {string} databaseId 数据库ID
     * @param {Array} photos 照片数组
     * @param {Object} filter 过滤条件
     * @param {Object} paginationInfo 分页信息
     * @param {number} expiration 过期时间(毫秒)，默认24小时
     */
    cachePhotoList(databaseId, photos, filter = null, paginationInfo = null, expiration = null) {
        if (!this.enabled || !photos) return;
        
        try {
            // 生成缓存键
            const cacheKey = this._generateQueryCacheKey(databaseId, filter);
            
            // 准备缓存数据
            const cacheData = {
                photos: photos,
                timestamp: Date.now(),
                paginationInfo: paginationInfo
            };
            
            // 使用photoList的默认缓存时间，除非明确指定
            const expirationTime = Date.now() + (expiration || this.cacheExpiration.photoList);
            
            // 存储照片列表
            localStorage.setItem(this.cacheKeyPrefix + cacheKey, JSON.stringify(cacheData));
            
            // 更新元数据
            const metadata = this._getMetadata();
            metadata.cacheEntries = metadata.cacheEntries || {};
            metadata.cacheEntries[cacheKey] = {
                type: 'photoList',
                timestamp: Date.now(),
                expiration: expirationTime,
                count: photos.length
            };
            this._saveMetadata(metadata);
            
            logger.info(`📦 [缓存写入] 照片列表已缓存：${photos.length}张照片 (${cacheKey})`);
            
            // 触发缓存更新事件
            lifeViewManager.dispatchViewEvent('photoCacheUpdated', {
                cacheKey: cacheKey,
                count: photos.length
            });
        } catch (error) {
            logger.error('缓存照片列表失败:', error);
        }
    }
    
    /**
     * 获取缓存的照片列表
     * @param {string} databaseId 数据库ID
     * @param {Object} filter 过滤条件
     * @returns {Object|null} 照片数据或null
     */
    getCachedPhotoList(databaseId, filter = null) {
        if (!this.enabled) return null;
        
        try {
            // 生成缓存键
            const cacheKey = this._generateQueryCacheKey(databaseId, filter);
            
            // 获取缓存数据
            const cachedData = localStorage.getItem(this.cacheKeyPrefix + cacheKey);
            if (!cachedData) return null;
            
            // 解析缓存数据
            const cacheData = JSON.parse(cachedData);
            
            // 检查是否有照片数据
            if (!cacheData || !cacheData.photos || !Array.isArray(cacheData.photos)) {
                return null;
            }
            
            // 读取元数据以检查过期
            const metadata = this._getMetadata();
            const entry = metadata.cacheEntries && metadata.cacheEntries[cacheKey];
            
            // 如果已过期，返回null
            if (entry && entry.expiration && entry.expiration < Date.now()) {
                logger.debug(`缓存已过期: ${cacheKey}`);
                return null;
            }
            
            // 如果缓存命中
            if (cacheData && cacheData.photos) {
                logger.info(`✅ [缓存命中] 照片列表：${cacheData.photos.length}张照片 (${cacheKey})`);
                return cacheData;
            }
            
            // 缓存未命中时
            logger.info(`❌ [缓存未命中] 照片列表 (${cacheKey})`);
            return null;
        } catch (error) {
            logger.error('获取缓存照片列表失败:', error);
            return null;
        }
    }
    
    /**
     * 缓存分页数据
     * @param {string} databaseId 数据库ID
     * @param {string} cursor 分页游标
     * @param {Array} photos 照片数组
     * @param {Object} paginationInfo 分页信息
     * @param {number} expiration 过期时间(毫秒)，默认24小时
     */
    cachePaginationData(databaseId, cursor, photos, paginationInfo, expiration = null) {
        if (!this.enabled || !photos || !cursor) return;
        
        try {
            // 生成缓存键
            const cacheKey = this._generatePaginationCacheKey(databaseId, cursor);
            
            // 准备缓存数据
            const cacheData = {
                photos: photos,
                timestamp: Date.now(),
                paginationInfo: paginationInfo
            };
            
            // 使用pagination的默认缓存时间
            const expirationTime = Date.now() + (expiration || this.cacheExpiration.pagination);
            
            // 存储分页数据
            localStorage.setItem(this.cacheKeyPrefix + cacheKey, JSON.stringify(cacheData));
            
            // 更新元数据
            const metadata = this._getMetadata();
            metadata.cacheEntries = metadata.cacheEntries || {};
            metadata.cacheEntries[cacheKey] = {
                type: 'pagination',
                timestamp: Date.now(),
                expiration: expirationTime,
                count: photos.length
            };
            this._saveMetadata(metadata);
            
            logger.info(`📦 [缓存写入] 分页数据已缓存：游标=${cursor}，${photos.length}张照片`);
            
            // 触发缓存更新事件
            lifeViewManager.dispatchViewEvent('photoCacheUpdated', {
                cacheKey: cacheKey,
                count: photos.length
            });
        } catch (error) {
            logger.error('缓存分页数据失败:', error);
        }
    }
    
    /**
     * 获取缓存的分页数据
     * @param {string} databaseId 数据库ID
     * @param {string} cursor 分页游标
     * @returns {Object|null} 分页数据或null
     */
    getCachedPaginationData(databaseId, cursor) {
        if (!this.enabled || !cursor) return null;
        
        try {
            // 生成缓存键
            const cacheKey = this._generatePaginationCacheKey(databaseId, cursor);
            
            // 获取缓存数据
            const cachedData = localStorage.getItem(this.cacheKeyPrefix + cacheKey);
            if (!cachedData) return null;
            
            // 解析缓存数据
            const cacheData = JSON.parse(cachedData);
            
            // 检查是否有照片数据
            if (!cacheData || !cacheData.photos || !Array.isArray(cacheData.photos)) {
                return null;
            }
            
            // 读取元数据以检查过期
            const metadata = this._getMetadata();
            const entry = metadata.cacheEntries && metadata.cacheEntries[cacheKey];
            
            // 如果已过期
            if (entry && entry.expiration && entry.expiration < Date.now()) {
                logger.info(`⏱️ [缓存过期] 分页数据：游标=${cursor}`);
                return null;
            }
            
            // 缓存命中
            logger.info(`✅ [缓存命中] 分页数据：游标=${cursor}，${cacheData.photos.length}张照片`);
            
            return cacheData;
        } catch (error) {
            logger.error('获取缓存分页数据失败:', error);
            return null;
        }
    }
    
    /**
     * 缓存单张照片
     * @param {Object} photo 照片对象
     * @param {number} expiration 过期时间(毫秒)，默认24小时
     */
    cachePhoto(photo, expiration = null) {
        if (!this.enabled || !photo || !photo.id) return;
        
        try {
            // 生成缓存键
            const cacheKey = this._generateCacheKey('photo', photo.id);
            
            // 存储照片
            localStorage.setItem(this.cacheKeyPrefix + cacheKey, JSON.stringify({
                photo: photo,
                timestamp: Date.now()
            }));
            
            // 使用photo的默认缓存时间
            const expirationTime = Date.now() + (expiration || this.cacheExpiration.photo);
            
            // 更新元数据
            const metadata = this._getMetadata();
            metadata.cacheEntries = metadata.cacheEntries || {};
            metadata.cacheEntries[cacheKey] = {
                type: 'photo',
                timestamp: Date.now(),
                expiration: expirationTime
            };
            this._saveMetadata(metadata);
            
            logger.debug(`已缓存照片: ${photo.id} - ${photo.title}`);
        } catch (error) {
            logger.error('缓存照片失败:', error);
        }
    }
    
    /**
     * 获取缓存的照片
     * @param {string} photoId 照片ID
     * @returns {Object|null} 照片对象或null
     */
    getCachedPhoto(photoId) {
        if (!this.enabled || !photoId) return null;
        
        try {
            // 生成缓存键
            const cacheKey = this._generateCacheKey('photo', photoId);
            
            // 获取缓存数据
            const cachedData = localStorage.getItem(this.cacheKeyPrefix + cacheKey);
            if (!cachedData) return null;
            
            // 解析缓存数据
            const cacheData = JSON.parse(cachedData);
            
            // 检查是否有照片数据
            if (!cacheData || !cacheData.photo) {
                return null;
            }
            
            // 读取元数据以检查过期
            const metadata = this._getMetadata();
            const entry = metadata.cacheEntries && metadata.cacheEntries[cacheKey];
            
            // 如果已过期，返回null
            if (entry && entry.expiration && entry.expiration < Date.now()) {
                logger.debug(`照片缓存已过期: ${photoId}`);
                return null;
            }
            
            logger.debug(`从缓存获取照片: ${photoId}`);
            
            return cacheData.photo;
        } catch (error) {
            logger.error('获取缓存照片失败:', error);
            return null;
        }
    }
    
    /**
     * 清除所有缓存
     */
    clearAllCache() {
        if (!this.enabled) return;
        
        try {
            logger.info('🧹 [缓存清理] 清除所有照片缓存...');
            
            // 获取元数据
            const metadata = this._getMetadata();
            
            // 删除所有缓存项
            Object.keys(metadata.cacheEntries || {}).forEach(key => {
                localStorage.removeItem(this.cacheKeyPrefix + key);
            });
            
            // 重置元数据
            metadata.cacheEntries = {};
            metadata.lastCleanup = Date.now();
            this._saveMetadata(metadata);
            
            logger.info('🧹 [缓存清理] 所有照片缓存已清除');
            
            // 触发缓存清除事件
            lifeViewManager.dispatchViewEvent('photoCacheCleared', {});
        } catch (error) {
            logger.error('清除照片缓存失败:', error);
        }
    }
    
    /**
     * 获取缓存统计信息
     * @returns {Object} 缓存统计信息
     */
    getStatistics() {
        if (!this.enabled) return { enabled: false };
        
        try {
            const metadata = this._getMetadata();
            const entries = metadata.cacheEntries || {};
            const keys = Object.keys(entries);
            
            // 计算总数和各类型数量
            let totalSize = 0;
            const stats = {
                enabled: true,
                totalEntries: keys.length,
                byType: {
                    photoList: 0,
                    pagination: 0,
                    photo: 0
                },
                totalPhotos: 0,
                lastCleanup: metadata.lastCleanup
            };
            
            keys.forEach(key => {
                const entry = entries[key];
                if (entry.type) {
                    stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;
                }
                
                if (entry.count) {
                    stats.totalPhotos += entry.count;
                }
                
                // 估算存储空间使用
                try {
                    const item = localStorage.getItem(this.cacheKeyPrefix + key);
                    totalSize += item ? item.length * 2 : 0; // UTF-16 字符占2字节
                } catch (e) {}
            });
            
            // 添加元数据
            try {
                const metadataStr = localStorage.getItem(this.metadataKey);
                totalSize += metadataStr ? metadataStr.length * 2 : 0;
            } catch (e) {}
            
            // 转换为KB
            stats.estimatedSize = Math.round(totalSize / 1024);
            
            return stats;
        } catch (error) {
            logger.error('获取缓存统计失败:', error);
            return { enabled: this.enabled, error: true };
        }
    }

    /**
     * 清理函数
     * @param {boolean} clearCache 是否同时清除缓存，默认为false
     */
    cleanup(clearCache = false) {
        // 如果需要，清除缓存
        if (clearCache) {
            this.clearAllCache();
        }
        
        // 重置状态
        this.enabled = true;
        
        logger.info('照片缓存管理器已清理');
    }
}

// 创建单例实例
export const photoCacheManager = new PhotoCacheManager();
export default photoCacheManager;