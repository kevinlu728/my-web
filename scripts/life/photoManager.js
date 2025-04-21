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
import { ModuleType } from './lifeViewManager.js';
import { photoPaginationManager } from './photoPaginationManager.js';
import { photoRenderer } from './photoRenderer.js';

import lifecycleManager from '../utils/lifecycleManager.js';
import { processPhotoListData } from '../utils/photo-utils.js';
import { generateMockPhotos } from '../utils/mock-utils.js';
import logger from '../utils/logger.js';

// 照片墙管理器
class PhotoManager {
    constructor() {
        this.currentDatabaseId = null;
        this.photos = []; // 所有照片数据
        this.filteredPhotos = []; // 经过筛选的照片
        this.containerId = null; // 容器元素ID
        this.container = null; // 容器元素
        this.currentPage = 1; // 当前页码，用于分页加载
        this.photosPerPage = 9; // 每页显示照片数
        this.isLoading = false; // 用于控制无限滚动加载
        this.scrollListeners = []; // 用于存储滚动监听器
    }

    /**
     * 初始化照片墙管理器
     * @param {string} databaseId 数据库ID
     * @param {string} containerId 容器元素ID
     */
    async initialize(databaseId, containerId) {
        logger.info('初始化照片管理器，数据库ID:', databaseId);
        this.currentDatabaseId = databaseId;

        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            logger.error(`未找到容器元素: #${containerId}`);
            throw new Error(`未找到容器元素: #${containerId}`);
        }
        // 创建照片网格容器（如果不存在）
        if (!this.container.querySelector('.photo-grid')) {
            const photoGrid = document.createElement('div');
            photoGrid.className = 'photo-grid';
            this.container.appendChild(photoGrid);
        }
        
        // 获取照片数据
        this.photos = await this.loadPhotos();
        this.filteredPhotos = [...this.photos];
        
        // 初始化渲染器
        photoRenderer.initialize(this.container);

        // 初始化分页管理器
        photoPaginationManager.initialize(
            this.photos, 
            this.photosPerPage,
            this.onLoadMore.bind(this)
        );

        this.render();
        
        // 注册清理函数
        lifecycleManager.registerCleanup('photoManager', this.cleanup.bind(this));
        
        logger.info(`照片墙管理器初始化完成，共加载 ${this.photos.length} 张照片`);
    }

    /**
     * 从API加载照片数据
     * @param {Object} options 加载选项
     * @returns {Promise<Array>} 照片数组
     */
    async loadPhotos(options = {}) {
        try {
            // 从API获取照片数据
            logger.info('从Notion API获取照片数据...');
            const response = await notionAPIService.getPhotos({
                lifeDatabaseId: this.currentDatabaseId,
                limit: 100,
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
            
            logger.info(`成功从API获取到 ${response.photos.length} 张照片`);
            
            // 处理Notion数据到应用所需的格式
            const processedPhotos = processPhotoListData(response.photos);
            logger.info(`处理后的照片数量: ${processedPhotos.length}张`);
            
            this.photos = processedPhotos;
            this.hasMore = response.hasMore;
            this.nextCursor = response.nextCursor;
            this.filteredPhotos = [...this.photos]; // 初始未筛选
            
            // 保存分页信息，供加载更多使用
            this.paginationInfo = {
                hasMore: this.hasMore,
                nextCursor: this.nextCursor
            };

            return this.photos;
        } catch (error) {
            logger.error('从API获取照片失败:', error);
            logger.warn('使用模拟数据作为备用');
            
            // 作为备用，使用模拟数据
            const mockPhotos = generateMockPhotos();
            logger.debug(`生成了 ${mockPhotos.length} 张模拟照片数据`);
            this.photos = mockPhotos;
            this.filteredPhotos = [...mockPhotos];
            this.hasMore = false;
            this.nextCursor = null;
            
            return this.photos;
        }
    }

    /**
     * 渲染照片墙
     */
    async render() {
        if (!this.container) return;
        
        // 获取当前页照片
        let photosToShow = photoPaginationManager.getPhotosForCurrentPage();
        
        // 如果分页管理器没有返回照片，但我们有照片数据，则使用前N张
        if ((!photosToShow || photosToShow.length === 0) && this.filteredPhotos.length > 0) {
            logger.warn('分页管理器未返回照片，使用备用方式获取照片');
            photosToShow = this.filteredPhotos.slice(0, this.photosPerPage);
            logger.debug(`备用方式获取了 ${photosToShow.length} 张照片`);
        }
        
        logger.debug(`准备渲染 ${photosToShow.length} / ${this.filteredPhotos.length} 张照片`);
        
        // 使用渲染器渲染照片
        photoRenderer.render(
            this.container, 
            photosToShow, 
            this.filteredPhotos.length
        );
        
        // 更新加载状态
        photoPaginationManager.updateLoadMoreContainer(false);
        
        // 更新筛选信息
        photoRenderer.updateFilterInfo(window.pageState.currentModule, this.filteredPhotos.length);
    }

    /**
     * 加载更多照片
     */
    async onLoadMore() {
        logger.info('加载更多照片...');
        
        try {
            // 使用photoPaginationManager加载更多照片
            const newPhotos = await photoPaginationManager.loadMorePhotos();
            
            if (newPhotos && newPhotos.length > 0) {
                logger.info(`获取到${newPhotos.length}张新照片，准备渲染`);
                
                // 确保在调用渲染之前DOM已准备好
                setTimeout(() => {
                    // 渲染新照片
                    this.renderMorePhotos(newPhotos);
                    
                    // 保存更新后的filteredPhotos总数
                    this.filteredPhotos = photoPaginationManager.filteredPhotos;
                    
                    // 更新筛选信息
                    photoRenderer.updateFilterInfo(window.pageState.currentModule, this.filteredPhotos.length);
                    
                    // 强制更新加载指示器状态
                    photoPaginationManager.updateLoadMoreContainer(false);
                    
                    logger.info('完成新照片渲染和UI更新');
                }, 0);
            } else {
                logger.warn('未获取到新照片，跳过渲染');
                // 重置加载状态
                photoPaginationManager.updateLoadMoreContainer(false);
            }
        } catch (error) {
            logger.error('加载照片出错:', error);
            // 确保错误情况下也重置加载状态
            photoPaginationManager.updateLoadMoreContainer(false, true);
        }
    }

    /**
     * 渲染更多照片
     * @param {Array} newPhotos 新照片数组
     */
    renderMorePhotos(newPhotos) {
        if (!newPhotos || newPhotos.length === 0) return;
        
        // 使用渲染器渲染更多照片
        photoRenderer.renderMorePhotos(
            this.container, 
            newPhotos,
            this.onPhotoDetailClick.bind(this)
        );
    }

    /**
     * 打开照片详情
     * @param {Object} photo 照片数据
     */
    onPhotoDetailClick(photo) {
        // 使用原始大图URL
        const imageUrl = photo.originalUrl || photo.coverUrl;
        
        // 创建模态窗口显示大图
        const modal = document.createElement('div');
        modal.className = 'photo-detail-modal';
        modal.innerHTML = `
            <div class="photo-detail-container">
                <button class="close-btn">&times;</button>
                <img src="${imageUrl}" alt="${photo.title}" class="photo-detail-img">
                <div class="photo-detail-info">
                    <h2>${photo.title}</h2>
                    <p class="photo-detail-date">${formatDateToCN(photo.date)}</p>
                    <p class="photo-detail-description">${photo.description || '无描述'}</p>
                </div>
            </div>
        `;
        
        // 添加关闭按钮事件
        modal.querySelector('.close-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // 点击模态窗口背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        document.body.appendChild(modal);
    }

    /**
     * 按模块类型筛选照片
     * @param {string} moduleType 模块类型
     */
    filterByModule(moduleType) {
        logger.info(`按模块筛选照片: ${moduleType}`);
        
        if (moduleType === ModuleType.ALL) {
            this.filteredPhotos = [...this.photos];
        } else {
            this.filteredPhotos = this.photos.filter(photo => {
                const category = photo.category?.toLowerCase();
                
                switch (moduleType) {
                    case ModuleType.MOVIE:
                        return category === 'movie';
                    case ModuleType.FOOTBALL:
                        return category === 'football';
                    case ModuleType.TRAVEL:
                        return category === 'travel';
                    default:
                        return true;
                }
            });
        }
        
        logger.info(`筛选后照片数量: ${this.filteredPhotos.length}`);
        
        // 重置分页状态
        this.currentPage = 1;
        
        // 更新UI
        this.render();
        
        // 更新筛选信息
        photoRenderer.updateFilterInfo(moduleType, this.filteredPhotos.length);
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
    }
}

// 创建单例实例
export const photoManager = new PhotoManager(); 
export default PhotoManager; 