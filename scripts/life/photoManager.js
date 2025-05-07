/**
 * @file photoManager.js
 * @description 照片墙管理器，负责照片数据管理和渲染
 * @created 2024-05-23
 * 
 * 该模块负责:
 * 1. 照片数据管理
 * 2. 照片墙数据处理
 * 3. 照片筛选和排序
 * 4. 与API交互
 */

import notionAPIService from '../services/notionAPIService.js';
import { lifeViewManager, ModuleType } from './lifeViewManager.js';
import { photoPaginationManager, DEFAULT_PHOTOS_PER_PAGE } from './photoPaginationManager.js';
import { photoRenderer } from './photoRenderer.js';
import { photoCacheManager } from './photoCacheManager.js';
import { photoDetailManager } from './photoDetailManager.js';
import lifecycleManager from '../utils/lifecycleManager.js';
import { processPhotoListData } from '../utils/photo-utils.js';
import { generateMockPhotos } from '../utils/mock-utils.js';
import logger from '../utils/logger.js';

// 照片墙管理器
class PhotoManager {
    constructor() {
        this.lifeDatabaseId = null;
        this.photos = []; // 已加载的全部照片
        this.paginationInfo = null; // 分页信息
        this.isLoading = false; // 用于控制无限滚动加载
        this.scrollListeners = []; // 用于存储滚动监听器
        this.currentModuleType = ModuleType.ALL;
        this.currentModulePhotos = [];
    }

    /**
     * 初始化照片墙管理器
     * @param {string} databaseId 数据库ID
     * @param {string} containerId 容器元素ID
     */
    async initialize(databaseId) {
        logger.info('初始化照片管理器，数据库ID:', databaseId);
        this.lifeDatabaseId = databaseId;

        const container = this.getPhotoContainer();
        if (!container) {
            logger.error('未找到照片墙容器元素');
            throw new Error('未找到照片墙容器元素');
        }
        
        // 创建照片网格容器（如果不存在）
        if (!container.querySelector('.photo-grid')) {
            const photoGrid = document.createElement('div');
            photoGrid.className = 'photo-grid';
            container.appendChild(photoGrid);
        }
        
        lifeViewManager.dispatchViewEvent('loadingStart');
        
        // 获取照片数据
        const processedPhotos = await this.loadPhotos();
        this.photos = [...processedPhotos];
        
        // 初始化渲染器
        photoRenderer.initialize(container);

        // 初始化分页管理器
        photoPaginationManager.initialize(
            this.lifeDatabaseId,
            processedPhotos, 
            this.paginationInfo,
            this.onNewPhotosLoaded.bind(this)
        );

        // 初始化照片详情管理器
        photoDetailManager.initialize();

        lifeViewManager.dispatchViewEvent('loadingEnd');
        
        this.render(this.photos);
        
        // 注册清理函数
        lifecycleManager.registerCleanup('photoManager', this.cleanup.bind(this));
        
        logger.info(`照片管理器初始化完成，共加载 ${processedPhotos.length} 张照片`);
    }

    /**
     * 从API加载照片数据
     * @param {Object} options 加载选项
     * @returns {Promise<Array>} 照片数组
     */
    async loadPhotos(options = {}) {
        try {
            // 先尝试从缓存获取照片数据
            const cachedData = photoCacheManager.getCachedPhotoList(this.lifeDatabaseId, options);
            
            if (cachedData && cachedData.photos && cachedData.photos.length > 0) {
                logger.info(`🔄 [渲染准备] 使用缓存数据显示 ${cachedData.photos.length} 张照片`);
                
                // 恢复分页信息
                this.paginationInfo = cachedData.paginationInfo;
                
                return cachedData.photos;
            }
            
            // 如果缓存未命中，从API获取数据，首次加载100张，后续分页管理器加载更多照片时每次加载pageSize张
            logger.info('📡 [API请求] 正在从Notion API获取照片数据...');
            const response = await notionAPIService.getPhotos({
                lifeDatabaseId: this.lifeDatabaseId,
                pageSize: DEFAULT_PHOTOS_PER_PAGE,
                sorts: [{ 
                    property: "Photo Date", 
                    direction: "descending" 
                }]
            });
            
            // 检查响应
            if (!response || !response.photos || !Array.isArray(response.photos)) {
                logger.error('API返回的照片数据无效:', response);
                throw new Error('API返回的照片数据无效');
            }
            
            logger.info(`📡 [API成功] 获取到 ${response.photos.length} 张照片`);
            
            // 处理Notion数据到应用所需的格式
            const processedPhotos = processPhotoListData(response.photos);
            logger.info(`处理后的照片数量: ${processedPhotos.length}张`);
            
            this.paginationInfo = {
                hasMore: response.hasMore,
                nextCursor: response.nextCursor
            }
            
            // 缓存照片数据
            photoCacheManager.cachePhotoList(
                this.lifeDatabaseId, 
                processedPhotos, 
                options, 
                this.paginationInfo
            );

            return processedPhotos;
        } catch (error) {
            logger.error('❌ [API错误] 获取照片失败:', error.message);
            // logger.warn('⚠️ [备用数据] 使用模拟数据代替');
            throw error;
        }
    }

    /**
     * 渲染照片墙
     */
    async render(photosOfCurrentModule) {
        const container = this.getPhotoContainer();
        if (!container) return;
        
        lifeViewManager.dispatchViewEvent('beforeRender');
        
        // 获取当前页照片
        let photosToShow = photoPaginationManager.getPhotosForCurrentPage();
        
        logger.debug(`准备渲染 ${photosToShow.length} 张照片,当前模块共 ${photosOfCurrentModule.length} 张照片`);
        
        // 使用渲染器渲染照片
        photoRenderer.render(
            container, 
            photosToShow, 
            photosOfCurrentModule.length,
            this.onPhotoDetailClick.bind(this)
        );
        
        // 更新加载状态
        photoPaginationManager.updateLoadMoreContainer(false);
        
        lifeViewManager.dispatchViewEvent('afterRender');
    }

    /**
     * 加载更多照片
     */
    onNewPhotosLoaded(newPhotos, needUpdateTotalPhotos = true) {
        if (!newPhotos || newPhotos.length === 0) {
            logger.warn('照片管理器未接收到新照片，跳过渲染');
            return;
        }
        
        logger.info(`获取到 ${newPhotos.length} 张新照片，准备渲染`);
        if (needUpdateTotalPhotos) {
            this.photos = [...this.photos, ...newPhotos];
            logger.info(`加载新照片后，当前共有 ${this.photos.length} 张照片`);
        }
        
        // 确保在调用渲染之前DOM已准备好
        setTimeout(() => {
            // 渲染新照片
            this.renderMorePhotos(newPhotos);
            
            // 强制更新加载指示器状态
            photoPaginationManager.updateLoadMoreContainer(false);
            
            logger.info('完成新照片渲染和UI更新');
        }, 0);
    }

    /**
     * 渲染更多照片
     * @param {Array} newPhotos 新照片数组
     */
    renderMorePhotos(newPhotos) {
        if (!newPhotos || newPhotos.length === 0) return;
        
        const container = this.getPhotoContainer();
        if (!container) return;

        // 使用渲染器渲染更多照片
        photoRenderer.renderMorePhotos(
            container, 
            newPhotos,
            this.onPhotoDetailClick.bind(this)
        );
    }

    /**
     * 打开照片详情
     * @param {Object} photo 照片数据对象
     */
    onPhotoDetailClick(photo) {
        logger.info(`点击照片: ${photo.title}`);
        lifeViewManager.dispatchViewEvent('photoSelected', { photoId: photo.id });
        
        // 缓存选中的照片，提高再次访问性能
        photoCacheManager.cachePhoto(photo);
        
        // 获取当前模块所有照片，便于前后导航
        const currentModulePhotos = this.getCurrentModulePhotos();
        const currentIndex = currentModulePhotos.findIndex(p => p.id === photo.id);
        logger.debug(`当前照片索引: ${currentIndex}/${currentModulePhotos.length}`);
        
        // 使用照片详情管理器显示照片详情
        photoDetailManager.openPhotoDetail(photo, currentModulePhotos, currentIndex);
    }

    /**
     * 按模块类型筛选照片
     * @param {string} moduleType 模块类型
     */
    filterByModule(moduleType) {
        logger.info(`按模块筛选照片: ${moduleType}`);
        this.currentModuleType = moduleType;
        
        let currentModulePhotos = [];
        if (moduleType === ModuleType.ALL) {
            currentModulePhotos = [...this.photos];
        } else {
            currentModulePhotos = this.photos.filter(photo => {
                // 优先检查categories数组
                if (photo.categories && Array.isArray(photo.categories)) {
                    const typeToFind = moduleType.toLowerCase();
                    return photo.categories.some(cat => cat.toLowerCase() === typeToFind);
                } else {
                    // 向后兼容 - 使用单个category
                    const category = photo.category?.toLowerCase();
                    switch (moduleType) {
                        case ModuleType.MOVIE:
                            return category === 'movie';
                        case ModuleType.FOOTBALL:
                            return category === 'football';
                        case ModuleType.TRAVEL:
                            return category === 'travel';
                        case ModuleType.FOOD:
                            return category === 'food';
                        default:
                            return true;
                    }
                }
            });
        }
        logger.info(`当前模块的照片数量: ${currentModulePhotos.length}`);
        this.currentModulePhotos = currentModulePhotos;

        // 重要修复: 同步更新分页管理器中的照片数据
        photoPaginationManager.filterPhotosByModule(moduleType, currentModulePhotos);

        // 更新UI
        this.render(currentModulePhotos);
    }

    getPhotos() {
        return this.photos;
    }

    getCurrentModulePhotos() {
        if (this.currentModulePhotos && this.currentModulePhotos.length > 0) {
            return this.currentModulePhotos;
        }
        return this.photos;
    }

    getPhotoContainer() {
        return document.getElementById('photo-wall-container');
    }

    /**
     * 清理函数
     */
    cleanup() {
        logger.info('清理照片墙管理器...');
        
        // 清理滚动监听器
        if (this.scrollListeners && this.scrollListeners.length) {
            this.scrollListeners.forEach(removeListener => removeListener());
            this.scrollListeners = [];
        }
        
        // 清理渲染器
        photoRenderer.cleanup();
        
        // 清理分页管理器
        photoPaginationManager.cleanup();
        
        // 重置状态
        this.isLoading = false;
        this.photos = [];
        this.paginationInfo = null;
        this.lifeDatabaseId = null;
    }
}

// 创建单例实例
export const photoManager = new PhotoManager(); 
export default PhotoManager; 