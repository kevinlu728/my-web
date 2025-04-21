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
import { formatDateToCN } from '../utils/common-utils.js';

class PhotoRenderer {
    constructor() {
        this.lazyLoadInstance = null;
        this.masonryInstance = null;
    }

    /**
     * 初始化渲染器
     * @param {HTMLElement} container 容器元素
     */
    initialize(container) {
        this.container = container;
        this.initLazyLoad();
    }

    /**
     * 初始化懒加载功能
     */
    initLazyLoad() {
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
    updateLazyLoad() {
        if (this.lazyLoadInstance) {
            setTimeout(() => {
                this.lazyLoadInstance.update();
            }, 100);
        }
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
        
        // 确保DOM更新后再初始化Masonry
        setTimeout(() => {
            this.initMasonryLayout(photoGrid);
            
            // 更新懒加载
            this.updateLazyLoad();
            
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
        
        // 更新懒加载
        this.updateLazyLoad();
        
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
                <div class="photo-date">${formatDateToCN(photo.date)}</div>
            </div>
        `;
        
        // 添加点击事件，查看原始大图
        if (clickHandler) {
            photoItem.addEventListener('click', () => clickHandler(photo));
        }
        
        return photoItem;
    }

    /**
     * 更新筛选信息显示
     * @param {string} filterType 筛选类型
     * @param {number} count 照片数量
     */
    updateFilterInfo(filterType, count) {
        const filterTextEl = document.querySelector('.filter-text strong');
        const photosCountEl = document.querySelector('.photos-count');
        
        if (filterTextEl) {
            switch(filterType) {
                case 'MOVIE':
                    filterTextEl.textContent = '电影';
                    break;
                case 'FOOTBALL':
                    filterTextEl.textContent = '足球';
                    break;
                case 'TRAVEL':
                    filterTextEl.textContent = '旅行';
                    break;
                default:
                    filterTextEl.textContent = '全部内容';
            }
        }
        
        if (photosCountEl) {
            photosCountEl.textContent = `共 ${count} 项`;
        }
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