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
import { generateMockPhotos } from '../utils/mock-utils.js';
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
        this.masonryInstance = null; // 添加Masonry实例属性
        this.scrollListeners = []; // 用于存储滚动监听器
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
        
        const mockPhotos = generateMockPhotos();
        logger.debug(`生成了 ${mockPhotos.length} 张模拟照片数据`);
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
        
        // 获取或创建照片网格容器
        let photoGrid = this.container.querySelector('.photo-grid');
        
        if (!photoGrid) {
            photoGrid = document.createElement('div');
            photoGrid.className = 'photo-grid';
            this.container.appendChild(photoGrid);
        }
        
        // 添加网格尺寸基准元素（关键优化点）
        if (!photoGrid.querySelector('.grid-sizer')) {
            const gridSizer = document.createElement('div');
            gridSizer.className = 'grid-sizer';
            photoGrid.appendChild(gridSizer);
        }
        
        // 关键修复：不要在照片墙容器中查找或创建加载更多容器
        // 而是使用右侧栏中已经存在的加载更多容器
        
        // 初始化照片分页管理器，传入加载更多的回调函数
        const result = photoPaginationManager.initialize(
            this.photos, 
            window.pageState?.currentModule || ModuleType.ALL,
            this.onLoadMore.bind(this)
        );
        
        // 确保初始化后有正确的筛选照片引用
        this.filteredPhotos = photoPaginationManager.filteredPhotos;
        
        // 初始化无限滚动
        this.initInfiniteScroll();
        
        // 关键修复：初始化后立即渲染照片
        setTimeout(() => this.render(), 0);
        
        logger.info('照片墙容器结构设置完成');
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
     * 初始化Masonry布局 - 标准实现
     */
    initMasonryLayout() {
        const photoGrid = this.container.querySelector('.photo-grid');
        if (!photoGrid) {
            logger.error('未找到照片网格容器');
            return;
        }
        
        try {
            // 清理之前的实例
            if (this.masonryInstance) {
                this.masonryInstance.destroy();
                this.masonryInstance = null;
            }
            
            // 确保有间隙元素
            if (!photoGrid.querySelector('.gutter-sizer')) {
                const gutterSizer = document.createElement('div');
                gutterSizer.className = 'gutter-sizer';
                photoGrid.appendChild(gutterSizer);
            }
            
            // 确保有网格尺寸元素
            if (!photoGrid.querySelector('.grid-sizer')) {
                const gridSizer = document.createElement('div');
                gridSizer.className = 'grid-sizer';
                photoGrid.appendChild(gridSizer);
            }
            
            // 强制设置所有项目的浮动
            const items = photoGrid.querySelectorAll('.photo-item');
            items.forEach(item => {
                item.style.float = 'left';
            });
            
            // 修正后的Masonry配置
            this.masonryInstance = new Masonry(photoGrid, {
                itemSelector: '.photo-item',
                columnWidth: '.grid-sizer',
                gutter: '.gutter-sizer',
                percentPosition: true,
                transitionDuration: 0
            });
            
            // 设置全局引用，用于图片加载回调
            window.msnry = this.masonryInstance;
            
            // 监控图片加载
            if (typeof imagesLoaded !== 'undefined') {
                imagesLoaded(photoGrid).on('progress', () => {
                    this.masonryInstance.layout();
                }).on('always', () => {
                    setTimeout(() => this.masonryInstance.layout(), 100);
                });
            }
            
            // 添加调试信息
            logger.info(`瀑布流布局初始化成功: ${items.length}个项目，容器宽度${photoGrid.offsetWidth}px`);
        } catch (error) {
            logger.error('初始化Masonry失败:', error);
        }
    }

    /**
     * 设置加载更多容器
     */
    setupLoadMoreContainer() {
        // 移除已有的加载更多容器
        const existingContainer = document.querySelector('.load-more-container');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        // 获取右侧栏元素
        const rightColumn = document.querySelector('.life-content .right-column');
        if (!rightColumn) return;
        
        // 创建加载更多容器，但不放在照片墙容器内，而是直接放在右侧栏底部
        const loadMoreContainer = document.createElement('div');
        loadMoreContainer.className = 'load-more-container';
        
        // 关键：将加载容器添加为右侧栏的直接子元素，而非照片墙的子元素
        rightColumn.appendChild(loadMoreContainer);
        
        // 初始化加载状态
        photoPaginationManager.updateLoadMoreContainer(false);
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
        
        // 清空网格内容（保留grid-sizer元素）
        const gridSizer = photoGrid.querySelector('.grid-sizer');
        photoGrid.innerHTML = '';
        
        // 重新添加grid-sizer - 这是Pinterest风格布局的关键
        if (gridSizer) {
            photoGrid.appendChild(gridSizer);
        } else {
            const newGridSizer = document.createElement('div');
            newGridSizer.className = 'grid-sizer';
            photoGrid.appendChild(newGridSizer);
        }
        
        // 获取当前页照片
        const photosToShow = photoPaginationManager.getPhotosForCurrentPage();
        
        logger.debug(`获取到 ${photosToShow ? photosToShow.length : 0} 张照片准备渲染`);
        
        // 无照片处理
        if (!photosToShow || photosToShow.length === 0) {
            photoGrid.innerHTML = '<div class="no-photos">暂无照片</div>';
            return;
        }
        
        // 保存筛选后的照片总数，用于UI显示
        this.filteredPhotos = photoPaginationManager.filteredPhotos;
        
        // 清理照片网格中可能存在的加载更多容器，然后添加到右侧栏底部
        // this.setupLoadMoreContainer();
        
        // 渲染照片
        photosToShow.forEach(photo => {
            const photoElement = this.createPhotoElement(photo);
            photoGrid.appendChild(photoElement);
        });
        
        // 确保DOM更新后再初始化Masonry
        setTimeout(() => {
            this.initMasonryLayout();
            
            // 更新加载状态
            photoPaginationManager.updateLoadMoreContainer(false);
            
            // 更新懒加载
            if (this.lazyLoadInstance) {
                setTimeout(() => {
                    this.lazyLoadInstance.update();
                }, 100);
            }
            
            // 更新筛选信息
            this.updateFilterInfo();
        }, 0);
        
        logger.info(`照片墙渲染完成，已显示 ${photosToShow.length} / ${this.filteredPhotos.length} 张照片`);
    }
    
    /**
     * 创建照片元素 - 标准实现
     * @param {Object} photo 照片数据对象
     * @returns {HTMLElement} 照片DOM元素
     */
    createPhotoElement(photo) {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.setAttribute('data-id', photo.id);
        photoItem.setAttribute('data-type', photo.type);
        
        // 获取模块标签
        let moduleLabel = '未知';
        let moduleClass = 'unknown';
        
        switch(photo.type) {
            case 'MOVIE':
                moduleLabel = '电影';
                moduleClass = 'movie';
                break;
            case 'FOOTBALL':
                moduleLabel = '足球';
                moduleClass = 'football';
                break;
            case 'TRAVEL':
                moduleLabel = '旅行';
                moduleClass = 'travel';
                break;
        }
        
        // 使用mock-utils.js中生成的实际宽高
        photoItem.innerHTML = `
            <div class="photo-img-container">
                <span class="module-tag ${moduleClass}">${moduleLabel}</span>
                <img 
                    class="photo-img"
                    src="${photo.thumbnailUrl}"
                    alt="${photo.title}"
                    onload="this.classList.add('loaded'); if(window.msnry) window.msnry.layout();"
                >
            </div>
            <div class="photo-info">
                <h3 class="photo-title">${photo.title}</h3>
                <div class="photo-date">${formatDateToCN(photo.date)}</div>
            </div>
        `;
        
        // 添加点击事件
        photoItem.addEventListener('click', () => {
            this.openPhotoDetail(photo);
        });
        
        return photoItem;
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
                    this.updateFilterInfo();
                    
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
     * 渲染更多照片（追加模式）
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
        
        // 创建临时容器，保存所有新元素
        const fragment = document.createDocumentFragment();
        const newElements = [];
        
        // 追加新照片到文档片段
        newPhotos.forEach(photo => {
            const photoElement = this.createPhotoElement(photo);
            // 确保设置浮动
            photoElement.style.float = 'left';
            // 添加到临时容器
            fragment.appendChild(photoElement);
            // 保存引用以便后续处理
            newElements.push(photoElement);
        });
        
        // 添加到实际DOM
        photoGrid.appendChild(fragment);
        
        // 更新懒加载
        if (this.lazyLoadInstance) {
            setTimeout(() => {
                this.lazyLoadInstance.update();
            }, 50);
        }
        
        // 关键修复：使用Masonry的appended方法添加新元素
        if (this.masonryInstance) {
            // 告诉Masonry有新元素被添加
            this.masonryInstance.appended(newElements);
            
            // 在图片加载后重新布局
            if (typeof imagesLoaded !== 'undefined') {
                imagesLoaded(newElements).on('progress', () => {
                    this.masonryInstance.layout();
                }).on('always', () => {
                    // 所有新图片加载完成后最终布局
                    this.masonryInstance.layout();
                });
            } else {
                // 如果没有imagesLoaded库，延迟布局以等待图片加载
                setTimeout(() => {
                    this.masonryInstance.layout();
                }, 200);
            }
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
        
        // 清理滚动监听器
        if (this.scrollListeners && this.scrollListeners.length) {
            this.scrollListeners.forEach(removeListener => removeListener());
            this.scrollListeners = [];
        }
        
        // 清理分页管理器
        photoPaginationManager.cleanup();
        
        // 销毁懒加载实例
        if (this.lazyLoadInstance) {
            this.lazyLoadInstance.destroy();
        }
        
        // 销毁Masonry实例
        if (this.masonryInstance) {
            this.masonryInstance.destroy();
            this.masonryInstance = null;
        }
        
        // 重置状态
        this.isLoading = false;
    }
}

// 创建单例实例
export const photoWallManager = new PhotoWallManager(); 
export default PhotoWallManager; 