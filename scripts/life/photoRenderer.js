/**
 * @file photoRenderer.js
 * @description 照片渲染器，负责照片的渲染和UI交互
 * @created 2024-07-16
 * 
 * 该模块负责:
 * 1. 照片墙的渲染
 * 2. 照片元素的创建
 * 3. Masonry布局管理
 * 4. 照片详情查看
 * 5. UI交互效果
 */

import logger from '../utils/logger.js';
import { vanillaLoader } from '../resource/vanillaLoader.js';
import { masonryLoader } from '../resource/masonryLoader.js';
import { resourceEvents, RESOURCE_EVENTS } from '../resource/resourceEvents.js';

class PhotoRenderer {
    constructor() {
        this.lazyLoadInstance = null;
        this.masonryInstance = null;
        this.resourceLoadStatus = {
            'vanilla-lazyload': false,
            'masonry': false,
            'imagesLoaded': false
        };
    }

    /**
     * 初始化渲染器
     * @param {HTMLElement} container 容器元素
     */
    initialize(container) {
        logger.info('初始化照片渲染器...');
        this.container = container;
        this.initResourceEventListeners();
        this.loadImageLazyloadResources();
    }

    initResourceEventListeners() {
        // 监听资源加载成功事件
        resourceEvents.on(RESOURCE_EVENTS.LOADING_SUCCESS, (data) => {
            // 更新加载状态
            if (data.resourceId in this.resourceLoadStatus) {
                this.resourceLoadStatus[data.resourceId] = true;
                logger.info(`🔄 资源 ${data.resourceId} 加载成功 [来源: ${data.sender || '未知'}]`);
                
                // 检查是否需要初始化相应组件
                if (data.resourceId === 'vanilla-lazyload') {
                    logger.info('✅ VanillaLazyload已加载成功，准备初始化图片懒加载');
                    
                    // 延迟以确保样式完全应用
                    setTimeout(() => {
                        this.initImageLazyLoad();
                    }, 300);
                } else if (data.resourceId === 'masonry' && this.photoGridContainer) {
                    logger.info('✅ Masonry已加载成功，准备初始化瀑布流');
                    // 当Masonry资源加载且容器已存在时，初始化布局
                    this.initMasonryLayout(this.photoGridContainer);
                }
            }
        });
        
        // 监听资源加载失败事件，处理降级方案
        resourceEvents.on(RESOURCE_EVENTS.LOADING_FAILURE, (data) => {
            if (data.resourceId in this.resourceLoadStatus) {
                logger.warn(`⚠️ ${data.resourceId}加载失败，图片懒加载或瀑布流功能可能不可用 [来源: ${data.sender || '未知'}]`);
            }
        });
    }

    loadImageLazyloadResources() {
        if (typeof LazyLoad === 'undefined') {
            logger.info('正在加载图片懒加载所需的资源(当前使用VanillaLazyload库)...');
            vanillaLoader.loadVanillaResources()
                .then(() => {
                    // 这里只打印日志，真正的渲染会在事件监听器中触发
                    logger.info('VanillaLazyload库加载成功');
                })
                .catch(error => {
                    logger.error('VanillaLazyload库加载失败:', error.message);
                });
        }
        if (typeof Masonry === 'undefined') {
            logger.info('正在加载瀑布流所需的资源(当前使用Masonry库)...');
            masonryLoader.loadMasonryResources()
                .then(() => {
                    logger.info('Masonry库加载成功');
                })
                .catch(error => {
                    logger.error('Masonry库加载失败:', error.message);
                });
        }
    }

    /**
     * 初始化图片懒加载功能
     */
    initImageLazyLoad() {
        try {
            if (typeof LazyLoad === 'undefined') {
                logger.warn('LazyLoad库未加载，图片懒加载功能将不可用');
                return;
            }
            
            // 销毁之前的实例
            if (this.lazyLoadInstance) {
                this.lazyLoadInstance.destroy();
            }
            
            this.lazyLoadInstance = new LazyLoad({
                elements_selector: '.lazy',
                threshold: 300,
                callback_loaded: (el) => {
                    el.classList.add('loaded');
                    // 触发布局更新
                    if (this.masonryInstance) {
                        this.masonryInstance.layout();
                    }
                }
            });
            
            logger.info('LazyLoad初始化成功');
        } catch (error) {
            logger.error('初始化LazyLoad失败:', error);
        }
    }

    /**
     * 更新懒加载
     */
    updateImageLazyLoad() {
        if (this.lazyLoadInstance) {
            setTimeout(() => {
                this.lazyLoadInstance.update();
            }, 100);
        }
    }

    /**
     * 渲染照片墙
     * @param {HTMLElement} container 容器元素
     * @param {Array} photos 要渲染的照片数组
     * @param {number} totalCount 照片总数
     * @param {Function} clickHandler 点击处理函数
     */
    render(container, photos, totalCount, clickHandler) {
        if (!container) {
            logger.error('渲染照片墙失败：未提供容器');
            return;
        }
        
        logger.debug(`获取到 ${photos ? photos.length : 0} 张照片准备渲染，总数: ${totalCount}`);
        
        const photoGrid = container.querySelector('.photo-grid');
        if (!photoGrid) {
            logger.error('未找到照片网格容器');
            return;
        }
        
        // 存储网格容器引用，供资源加载事件使用
        this.photoGridContainer = photoGrid;
        
        // 清空网格内容（保留网格和间隙尺寸元素）
        const gridSizer = photoGrid.querySelector('.grid-sizer');
        const gutterSizer = photoGrid.querySelector('.gutter-sizer');
        photoGrid.innerHTML = '';
        
        // 重新添加必要的布局元素
        if (gridSizer) {
            photoGrid.appendChild(gridSizer);
        } else {
            const newGridSizer = document.createElement('div');
            newGridSizer.className = 'grid-sizer';
            photoGrid.appendChild(newGridSizer);
        }
        
        if (gutterSizer) {
            photoGrid.appendChild(gutterSizer);
        } else {
            const newGutterSizer = document.createElement('div');
            newGutterSizer.className = 'gutter-sizer';
            photoGrid.appendChild(newGutterSizer);
        }
        
        // 无照片处理
        if (!photos || photos.length === 0) {
            logger.warn('没有照片数据可渲染');
            photoGrid.innerHTML += '<div class="no-photos">暂无照片</div>';
            return;
        }
        
        // 渲染照片
        photos.forEach(photo => {
            const photoElement = this.createPhotoElement(photo, clickHandler);
            photoGrid.appendChild(photoElement);
        });
        
        // 确保DOM更新后再初始化布局
        setTimeout(() => {
            // 根据资源加载状态决定是否初始化
            if (this.resourceLoadStatus && this.resourceLoadStatus.masonry) {
                logger.info('✅ Masonry资源已加载，立即初始化瀑布流布局');
                this.initMasonryLayout(photoGrid);
            } else {
                logger.info('⏳ Masonry资源尚未加载，等待资源加载完成后再初始化');
                // 不执行初始化，等待资源加载事件触发
            }
            
            // 懒加载更新
            if (this.resourceLoadStatus && this.resourceLoadStatus['vanilla-lazyload']) {
                this.updateImageLazyLoad();
            }
            
            logger.info(`照片墙渲染完成，已显示 ${photos.length} / ${totalCount} 张照片`);
        }, 0);
    }

    /**
     * 渲染更多照片（追加模式）
     * @param {HTMLElement} container 容器元素
     * @param {Array} newPhotos 新照片数组
     * @param {Function} clickHandler 照片点击处理函数
     */
    renderMorePhotos(container, newPhotos, clickHandler) {
        logger.info('渲染更多照片...');
        if (!container || !newPhotos || newPhotos.length === 0) {
            logger.warn('无法渲染新照片：参数无效或无新照片');
            return;
        }
        
        const photoGrid = container.querySelector('.photo-grid');
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
            const photoElement = this.createPhotoElement(photo, clickHandler);
            // 确保设置浮动
            photoElement.style.float = 'left';
            // 添加到临时容器
            fragment.appendChild(photoElement);
            // 保存引用以便后续处理
            newElements.push(photoElement);
        });
        
        // 添加到实际DOM
        photoGrid.appendChild(fragment);
        
        // 更新图片懒加载
        this.updateImageLazyLoad();
        
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
     * 初始化Masonry布局
     * @param {HTMLElement} photoGrid 照片网格容器
     */
    initMasonryLayout(photoGrid) {
        if (!photoGrid) {
            logger.error('未找到照片网格容器');
            return;
        }
        
        try {
            // 确保Masonry已加载
            if (typeof Masonry === 'undefined') {
                logger.warn('Masonry库未加载，瀑布流布局将不可用');
                return;
            }
            
            // 防止重复初始化，只有在没有实例或实例已销毁时才创建新实例
            if (this.masonryInstance && this.masonryInstance.element === photoGrid) {
                logger.debug('Masonry实例已存在且关联到当前容器，跳过重复初始化');
                this.masonryInstance.layout(); // 重新布局以适应新内容
                return;
            }
            
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
            
            logger.info(`瀑布流布局初始化成功: ${items.length}个项目，容器宽度${photoGrid.offsetWidth}px`);
        } catch (error) {
            logger.error('初始化Masonry失败:', error);
        }
    }

    /**
     * 创建照片元素
     * @param {Object} photo 照片数据对象
     * @param {Function} clickHandler 照片点击处理函数
     * @returns {HTMLElement} 照片DOM元素
     */
    createPhotoElement(photo, clickHandler) {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.setAttribute('data-id', photo.id);
        photoItem.setAttribute('data-category', photo.category);
        photoItem.setAttribute('data-custom-field', photo.customField);
        
        // 获取模块标签
        let moduleLabel = '未知';
        let moduleClass = 'unknown';
        
        // 改用category而不是type来确定标签
        const category = photo.category ? photo.category.toLowerCase() : '';
        
        switch(category) {
            case 'movie':
                moduleLabel = '电影';
                moduleClass = 'movie';
                break;
            case 'football':
                moduleLabel = '足球';
                moduleClass = 'football';
                break;
            case 'travel':
                moduleLabel = '旅行';
                moduleClass = 'travel';
                break;
            case 'test':
                moduleLabel = '测试';
                moduleClass = 'test';
                break;
            default:
                moduleLabel = photo.category || '未分类';  // 如果有其他分类则显示原始分类名
                moduleClass = 'unknown';
        }
        
        // 使用缩略图作为显示图片，使用data-original属性存储原始图片URL
        photoItem.innerHTML = `
            <div class="photo-img-container">
                <span class="module-tag ${moduleClass}">${moduleLabel}</span>
                <img 
                    class="photo-img lazy"
                    src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
                    data-src="${photo.thumbnailUrl || photo.coverUrl}"
                    data-original="${photo.originalUrl || photo.coverUrl}"
                    alt="${photo.title}"
                    onload="this.classList.add('loaded'); if(window.msnry) window.msnry.layout();"
                >
            </div>
            <div class="photo-info">
                <h3 class="photo-title">${photo.title}</h3>
                <div class="photo-custom-field" data-field="${photo.customFieldType}">${photo.customField}</div>
            </div>
        `;
        
        // 添加点击事件，查看原始大图
        if (clickHandler) {
            photoItem.addEventListener('click', () => clickHandler(photo));
        }
        
        return photoItem;
    }

    /**
     * 清理函数
     */
    cleanup() {
        logger.info('清理照片渲染器...');
        
        // 销毁懒加载实例
        if (this.lazyLoadInstance) {
            this.lazyLoadInstance.destroy();
        }
        
        // 销毁Masonry实例
        if (this.masonryInstance) {
            this.masonryInstance.destroy();
            this.masonryInstance = null;
        }
        
        // 移除全局引用
        window.msnry = null;
    }
}

// 创建单例实例
export const photoRenderer = new PhotoRenderer();
export default photoRenderer;