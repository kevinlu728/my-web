/**
 * @file photoWallManager.js
 * @description 照片墙管理器，负责照片数据管理和渲染
 * @created 2024-05-23
 * 
 * 该模块负责:
 * 1. 照片数据管理
 * 2. 照片墙渲染
 * 3. 照片筛选和排序
 * 4. 懒加载整合
 * 5. 模块特定交互处理
 */

import logger from '../utils/logger.js';
import { ModuleType } from './lifeViewManager.js';
import lifecycleManager from '../utils/lifecycleManager.js';
import { formatDateToCN } from '../utils/common-utils.js';
import { photoPaginationManager } from './photoPaginationManager.js';

// 照片墙管理器
class PhotoWallManager {
    constructor() {
        this.currentDatabaseId = null;
        this.photos = []; // 所有照片数据
        this.filteredPhotos = []; // 经过筛选的照片
        this.containerId = null; // 容器元素ID
        this.container = null; // 容器元素
        this.lazyLoadInstance = null; // vanilla-lazyload实例
        this.currentPage = 1; // 当前页码，用于分页加载
        this.photosPerPage = 9; // 每页显示照片数
        this.isLoading = false; // 用于控制无限滚动加载
    }

    /**
     * 初始化照片墙管理器
     * @param {Array} photos 照片数据数组
     */
    async initialize(databaseId, containerId) {
        logger.info('初始化照片墙管理器，数据库ID:', databaseId);
        this.currentDatabaseId = databaseId;

        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            logger.error(`未找到容器元素: #${containerId}`);
            throw new Error(`未找到容器元素: #${containerId}`);
        }
        
        const mockPhotos = this.generateMockPhotos();
        this.photos = mockPhotos;
        this.filteredPhotos = [...mockPhotos]; // 初始未筛选
        
        // 初始化懒加载
        this.initLazyLoad();
        
        // 设置容器基础样式
        this.setupContainer();
        
        // 注册清理函数
        lifecycleManager.registerCleanup('photoWallManager', this.cleanup.bind(this));
        
        logger.info(`照片墙管理器初始化完成，共加载 ${this.photos.length} 张照片`);
    }

    /**
     * 生成模拟照片数据
     * @returns {Array} 模拟照片数据数组
     */
    generateMockPhotos() {
        const mockPhotos = [];
        
        // 电影模块照片
        for (let i = 1; i <= 9; i++) {
            mockPhotos.push({
                id: `movie-${i}`,
                title: `电影 ${i}`,
                type: ModuleType.MOVIE,
                thumbnailUrl: `https://via.placeholder.com/300x450?text=Movie+${i}`,
                highResUrl: `https://via.placeholder.com/1200x1800?text=Movie+${i}`,
                date: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                tags: ['电影', '海报'],
                metadata: {
                    director: `导演 ${i}`,
                    year: 2020 + Math.floor(i / 3),
                    rating: (Math.random() * 2 + 7).toFixed(1),
                    comment: `这是电影${i}的简短评论，描述电影的特点和感受。`
                }
            });
        }
        
        // 足球模块照片
        for (let i = 1; i <= 9; i++) {
            mockPhotos.push({
                id: `football-${i}`,
                title: `足球赛事 ${i}`,
                type: ModuleType.FOOTBALL,
                thumbnailUrl: `https://via.placeholder.com/400x300?text=Football+${i}`,
                highResUrl: `https://via.placeholder.com/1600x1200?text=Football+${i}`,
                date: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                tags: ['足球', '比赛'],
                metadata: {
                    match: `比赛 ${i}`,
                    location: `场地 ${i}`,
                    result: `${Math.floor(Math.random() * 5)}:${Math.floor(Math.random() * 3)}`,
                    description: `这是足球比赛${i}的精彩瞬间，记录了比赛的关键时刻。`
                },
                gifUrl: `https://via.placeholder.com/400x300?text=Football+GIF+${i}`
            });
        }
        
        // 旅游模块照片
        for (let i = 1; i <= 9; i++) {
            mockPhotos.push({
                id: `travel-${i}`,
                title: `旅行地点 ${i}`,
                type: ModuleType.TRAVEL,
                thumbnailUrl: `https://via.placeholder.com/400x300?text=Travel+${i}`,
                highResUrl: `https://via.placeholder.com/1600x1200?text=Travel+${i}`,
                date: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                tags: ['旅游', '风景'],
                metadata: {
                    location: `地点 ${i}`,
                    country: `国家 ${i}`,
                    description: `这是旅行地点${i}的美丽风景，记录了旅行的难忘瞬间。`
                }
            });
        }
        
        return mockPhotos;
    }

    /**
     * 初始化懒加载功能
     */
    initLazyLoad() {
        // 检查vanilla-lazyload是否可用
        if (typeof LazyLoad === 'undefined') {
            logger.warn('LazyLoad库未加载，将使用基础图片加载');
            return;
        }
        
        try {
            // 初始化LazyLoad
            this.lazyLoadInstance = new LazyLoad({
                elements_selector: '.lazy', // 懒加载图片的选择器
                threshold: 300, // 提前300px加载
                callback_loaded: (el) => {
                    // 图片加载完成后移除模糊效果
                    el.classList.add('loaded');
                    
                    // 如果是缩略图，尝试预加载高清图
                    if (el.dataset.highres && !el.dataset.highresLoaded) {
                        const preloadImg = new Image();
                        preloadImg.onload = () => {
                            el.dataset.highresLoaded = 'true';
                        };
                        preloadImg.src = el.dataset.highres;
                    }
                }
            });
            
            logger.info('懒加载功能初始化成功');
        } catch (error) {
            logger.error('初始化懒加载功能失败:', error);
        }
    }
    
    /**
     * 设置容器基础样式和结构
     */
    setupContainer() {
        if (!this.container) return;
        
        logger.info('设置照片墙容器结构...');
        
        // 确保容器内有照片网格和标准加载容器
        if (!this.container.querySelector('.photo-grid')) {
            this.container.innerHTML = `
                <div class="photo-grid"></div>
                <div class="load-more-container">
                    <!-- 加载指示器将由updateLoaderStatus动态添加 -->
                </div>
            `;
        } else if (!this.container.querySelector('.load-more-container')) {
            // 如果已有网格但没有加载容器，添加加载容器
            const loadMoreContainer = document.createElement('div');
            loadMoreContainer.className = 'load-more-container';
            this.container.appendChild(loadMoreContainer);
        }
        
        // 初始化照片分页管理器，传入加载更多的回调函数
        const result = photoPaginationManager.initialize(
            this.photos, 
            window.pageState?.currentModule || ModuleType.ALL,
            this.loadMorePhotos.bind(this)
        );
        
        // 确保初始化后有正确的筛选照片引用
        this.filteredPhotos = photoPaginationManager.filteredPhotos;
        
        // 初始化无限滚动
        this.initInfiniteScroll();
    }
    
    /**
     * 初始化无限滚动
     */
    initInfiniteScroll() {
        // 先渲染第一页
        this.render();
        
        // 显示筛选信息
        this.updateFilterInfo();
    }

    /**
     * 渲染照片墙
     */
    async render() {
        if (!this.container) return;
        
        const photoGrid = this.container.querySelector('.photo-grid');
        if (!photoGrid) {
            logger.error('未找到照片网格容器');
            return;
        }
        
        // 清空网格
        photoGrid.innerHTML = '';
        
        // 获取当前页照片
        const photosToShow = photoPaginationManager.getPhotosForCurrentPage();
        
        if (!photosToShow || photosToShow.length === 0) {
            photoGrid.innerHTML = '<div class="no-photos">暂无照片</div>';
            return;
        }
        
        // 保存筛选后的照片总数，用于UI显示
        this.filteredPhotos = photoPaginationManager.filteredPhotos;
        
        // 渲染照片
        photosToShow.forEach(photo => {
            const photoElement = this.createPhotoElement(photo);
            photoGrid.appendChild(photoElement);
        });
        
        // 更新加载状态
        photoPaginationManager.updateLoaderStatus(false);
        
        // 更新懒加载
        if (this.lazyLoadInstance) {
            this.lazyLoadInstance.update();
        }
        
        logger.info(`照片墙渲染完成，已显示 ${photosToShow.length} / ${this.filteredPhotos.length} 张照片`);
        
        // 添加：初始渲染后立即检查是否需要加载更多
        // 这对于内容较少的页面非常有用
        setTimeout(() => {
            // 确保没有更多内容时也能正确显示
            if (photoPaginationManager.shouldLoadMorePhotos()) {
                photoPaginationManager.loadMorePhotos();
            }
        }, 100);
    }
    
    /**
     * 创建照片元素
     * @param {Object} photo 照片数据
     * @returns {HTMLElement} 照片元素
     */
    createPhotoElement(photo) {
        const photoCard = document.createElement('div');
        photoCard.className = 'photo-card';
        photoCard.dataset.id = photo.id;
        photoCard.dataset.type = photo.type;
        
        // 确定模块样式类
        const moduleClass = `${photo.type}-card`;
        photoCard.classList.add(moduleClass);
        
        // 创建卡片内部结构
        photoCard.innerHTML = `
            <div class="photo-card-inner">
                <div class="photo-img-container">
                    <img 
                        class="photo-img lazy" 
                        data-src="${photo.thumbnailUrl}" 
                        data-high-res="${photo.highResUrl}"
                        alt="${photo.title}"
                    />
                    <div class="photo-badge ${photo.type}-badge">${this.getModuleLabel(photo.type)}</div>
                </div>
                <div class="photo-info">
                    <h3 class="photo-title">${photo.title}</h3>
                    <div class="photo-date">${formatDateToCN(photo.date)}</div>
                    ${this.getModuleSpecificContent(photo)}
                    <div class="photo-tags">
                        ${photo.tags.map(tag => `<span class="photo-tag">${tag}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
        
        // 绑定点击事件
        photoCard.addEventListener('click', () => {
            this.handlePhotoClick(photo);
        });
        
        return photoCard;
    }
    
    /**
     * 获取模块特定内容
     * @param {Object} photo 照片数据
     * @returns {string} 模块特定HTML内容
     */
    getModuleSpecificContent(photo) {
        switch(photo.type) {
            case ModuleType.MOVIE:
                return `
                    <div class="movie-metadata">
                        <div class="movie-rating">${photo.metadata.rating} <i class="fas fa-star"></i></div>
                        <div class="movie-year">${photo.metadata.year}</div>
                        <div class="movie-director">导演: ${photo.metadata.director}</div>
                    </div>
                `;
            case ModuleType.FOOTBALL:
                return `
                    <div class="football-metadata">
                        <div class="match-result">${photo.metadata.result}</div>
                        <div class="match-location">${photo.metadata.location}</div>    
                    </div>
                `;
            case ModuleType.TRAVEL:
                return `
                    <div class="travel-metadata">
                        <div class="travel-location">${photo.metadata.location}</div>
                    </div>
                `;
            default:
                return '';
        }
    }
    
    /**
     * 获取模块显示标签
     * @param {string} moduleType 模块类型
     * @returns {string} 显示标签
     */
    getModuleLabel(moduleType) {
        switch(moduleType) {
            case ModuleType.MOVIE:
                return '电影';
            case ModuleType.FOOTBALL:
                return '足球';
            case ModuleType.TRAVEL:
                return '旅行';
            default:
                return '';
        }
    }
    
    /**
     * 根据模块类型筛选照片
     * @param {string} moduleType 模块类型
     */
    filterByModule(moduleType) {
        logger.info(`按模块类型筛选照片: ${moduleType}`);
        
        // 使用photoPaginationManager处理筛选
        const { photosToShow, hasMore } = photoPaginationManager.changeModuleType(moduleType);
        
        // 使用筛选后的照片更新UI
        this.filteredPhotos = photosToShow;
        this.hasMore = hasMore;
        
        // 重新渲染
        this.render();
        
        // 更新筛选信息
        this.updateFilterInfo();
    }
    
    /**
     * 加载更多照片
     */
    async loadMorePhotos() {
        if (!photoPaginationManager.hasMorePhotos() || photoPaginationManager.isLoading) {
            logger.info('没有更多照片或正在加载，跳过加载更多');
            return;
        }
        
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
                    this.updateFilterInfo();
                    
                    // 强制更新加载指示器状态
                    photoPaginationManager.updateLoaderStatus(false);
                    
                    logger.info('完成新照片渲染和UI更新');
                }, 0);
            } else {
                logger.warn('未获取到新照片，跳过渲染');
                // 重置加载状态
                photoPaginationManager.updateLoaderStatus(false);
            }
        } catch (error) {
            logger.error('加载照片出错:', error);
            // 确保错误情况下也重置加载状态
            photoPaginationManager.updateLoaderStatus(false, true);
        }
    }

    /**
     * 仅渲染更多照片（追加方式）
     * @param {Array} newPhotos 新照片数组
     */
    renderMorePhotos(newPhotos) {
        logger.info('渲染更多照片...');
        if (!this.container || !newPhotos || newPhotos.length === 0) {
            logger.warn('无法渲染新照片：参数无效或无新照片');
            return;
        }
        
        const photoGrid = this.container.querySelector('.photo-grid');
        if (!photoGrid) {
            logger.error('未找到照片网格容器');
            return;
        }
        
        logger.info(`开始渲染 ${newPhotos.length} 张新照片`);
        
        // 追加新照片
        newPhotos.forEach(photo => {
            const photoElement = this.createPhotoElement(photo);
            photoGrid.appendChild(photoElement);
        });
        
        // 更新懒加载
        if (this.lazyLoadInstance) {
            setTimeout(() => {
                this.lazyLoadInstance.update();
                logger.info('懒加载实例已更新');
            }, 100);
        }
        
        logger.info(`成功追加渲染了 ${newPhotos.length} 张新照片`);
    }

    /**
     * 更新筛选信息
     */
    updateFilterInfo() {
        const filterTextEl = document.querySelector('.filter-text strong');
        const photosCountEl = document.querySelector('.photos-count');
        
        if (filterTextEl) {
            const moduleType = window.pageState.currentModule;
            switch(moduleType) {
                case ModuleType.MOVIE:
                    filterTextEl.textContent = '电影';
                    break;
                case ModuleType.FOOTBALL:
                    filterTextEl.textContent = '足球';
                    break;
                case ModuleType.TRAVEL:
                    filterTextEl.textContent = '旅行';
                    break;
                default:
                    filterTextEl.textContent = '全部内容';
            }
        }
        
        if (photosCountEl) {
            photosCountEl.textContent = `共 ${this.filteredPhotos.length} 项`;
        }
    }

    /**
     * 清理函数
     */
    cleanup() {
        logger.info('清理照片墙管理器...');
        
        // 清理分页管理器
        photoPaginationManager.cleanup();
        
        // 销毁懒加载实例
        if (this.lazyLoadInstance) {
            this.lazyLoadInstance.destroy();
        }
        
        // 重置状态
        this.isLoading = false;
    }
}

// 创建单例实例
export const photoWallManager = new PhotoWallManager(); 
export default PhotoWallManager; 