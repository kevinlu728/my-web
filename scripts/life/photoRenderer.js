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
        this.initResourceEventListeners();
        this.loadResources();
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
                    }, 200);
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

    loadResources() {
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
            
            logger.info('初始化LazyLoad图片懒加载，应用高斯模糊效果...');
            
            this.lazyLoadInstance = new LazyLoad({
                elements_selector: '.lazy',
                threshold: 300,
                callback_loaded: (el) => {             
                    // 清除模糊效果
                    el.classList.remove('blur-effect');
                    
                    // 添加加载完成类名
                    el.classList.add('loaded');
                    
                    // 移除容器的加载状态
                    const container = el.closest('.photo-img-container');
                    if (container) {
                        container.classList.remove('placeholder-loading');
                        
                        // 图片加载后移除最小高度限制
                        container.style.minHeight = '0';
                        container.style.height = 'auto';
                        
                        // 强制直接隐藏占位符元素，确保在各个环境表现一致
                        const placeholder = container.querySelector('.photo-placeholder');
                        if (placeholder) {
                            placeholder.style.display = 'none';
                        }
                    }
                    
                    // 触发布局更新
                    if (this.masonryInstance) {
                        setTimeout(() => {
                            this.masonryInstance.layout();
                        }, 50);
                    }
                },
                callback_error: (el) => {
                    logger.error(`图片加载失败: ${el.getAttribute('data-src')}`);
                    // 为失败的图片添加样式，显示错误状态
                    el.classList.add('error');
                    const container = el.closest('.photo-img-container');
                    if (container) {
                        container.classList.add('load-error');
                    }
                },
                callback_enter: (el) => {
                    // logger.debug(`图片进入视口，开始加载: ${el.getAttribute('data-src')}`);
                }
            });
            
            logger.info('✅ LazyLoad初始化成功，高斯模糊效果已启用');
        } catch (error) {
            logger.error('初始化LazyLoad失败:', error);
        }
    }

    /**
     * 更新懒加载
     */
    updateImageLazyLoad() {
        if (this.lazyLoadInstance) {
            logger.info('🔄 更新图片懒加载实例，重新检测需要加载的图片...');
            setTimeout(() => {
                try {
                    // 获取当前所有lazy图片
                    const lazyImages = document.querySelectorAll('.photo-img.lazy');
                    logger.debug(`发现 ${lazyImages.length} 张待处理的懒加载图片`);
                    
                    // 更新懒加载实例
                    this.lazyLoadInstance.update();
                    
                    // 添加更详细的日志以追踪懒加载进度
                    if (lazyImages.length > 0) {
                        // 记录已加载和未加载的图片数量
                        const loadedImages = document.querySelectorAll('.photo-img.lazy.loaded');
                        logger.debug(`懒加载状态: ${loadedImages.length}/${lazyImages.length} 张图片已加载`);
                    }
                } catch (error) {
                    logger.error('更新懒加载实例时出错:', error);
                }
            }, 100);
        } else {
            logger.warn('懒加载实例不存在，无法更新');
        }
    }

    /**
     * 渲染照片墙
     * @param {HTMLElement} container 容器元素
     * @param {Array} photos 要渲染的照片数组
     * @param {number} countOfCurrentModule 当前模块照片总数
     * @param {Function} clickHandler 点击处理函数
     */
    render(container, photos, countOfCurrentModule, clickHandler) {
        if (!container) {
            logger.error('渲染照片墙失败：未提供容器');
            return;
        }
        
        logger.debug(`渲染 ${photos ? photos.length : 0} 张照片,当前模块共 ${countOfCurrentModule} 张照片`);
        
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
        
        logger.info(`✨ 开始渲染 ${photos.length} 张照片，应用高斯模糊效果`);
        
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
            
            logger.info(`照片墙渲染完成，已显示 ${photos.length} / ${countOfCurrentModule} 张照片`);
        }, 0);
    }

    /**
     * 渲染更多照片（追加模式）
     * @param {HTMLElement} container 容器元素
     * @param {Array} newPhotos 新照片数组
     * @param {Function} clickHandler 照片点击处理函数
     */
    renderMorePhotos(container, newPhotos, clickHandler) {
        if (!container || !newPhotos || newPhotos.length === 0) {
            logger.warn('无法渲染新照片：参数无效或无新照片');
            return;
        }
        
        const photoGrid = container.querySelector('.photo-grid');
        if (!photoGrid) {
            logger.error('未找到照片网格容器');
            return;
        }
        
        logger.info(`✨ 开始渲染 ${newPhotos.length} 张新照片，应用高斯模糊效果`);
        
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
            
            // 修正后的Masonry配置 - 关键修改以适应不同比例照片
            this.masonryInstance = new Masonry(photoGrid, {
                itemSelector: '.photo-item',
                columnWidth: '.grid-sizer',
                gutter: '.gutter-sizer',
                percentPosition: true,
                transitionDuration: 300, // 添加过渡效果使重排更平滑
                // 增加图片加载前的稳定性
                initLayout: true,
                resize: true
            });
            
            // 设置全局引用，用于图片加载回调
            window.msnry = this.masonryInstance;
            
            // 监控图片加载
            if (typeof imagesLoaded !== 'undefined') {
                imagesLoaded(photoGrid).on('progress', (instance, image) => {
                    // logger.debug(`图片加载进度: ${instance.progressedCount}/${instance.images.length}`);
                    
                    // 确保当前图片父元素移除加载状态
                    const imgEl = image.img;
                    if (imgEl && imgEl.classList) {
                        // 移除模糊效果
                        imgEl.classList.remove('blur-effect');
                        
                        // 添加加载完成类
                        imgEl.classList.add('loaded');
                        
                        // 移除容器占位状态
                        const container = imgEl.closest('.photo-img-container');
                        if (container) {
                            container.classList.remove('placeholder-loading');
                            
                            // 图片加载后移除最小高度限制
                            container.style.minHeight = '0';
                            container.style.height = 'auto';
                            
                            // 强制隐藏占位符
                            const placeholder = container.querySelector('.photo-placeholder');
                            if (placeholder) {
                                placeholder.style.display = 'none';
                            }
                        }
                    }
                    
                    // 每张图片加载完成后重新布局
                    if (this.masonryInstance) {
                        this.masonryInstance.layout();
                    }
                }).on('always', () => {
                    logger.info('所有图片加载完成，执行最终布局');
                    // 遍历所有图片，强制清除模糊效果
                    const allImages = photoGrid.querySelectorAll('.photo-img');
                    allImages.forEach(img => {
                        img.classList.remove('blur-effect');
                        img.classList.add('loaded');
                        const container = img.closest('.photo-img-container');
                        if (container) {
                            container.classList.remove('placeholder-loading');
                            
                            // 移除最小高度限制
                            container.style.minHeight = '0';
                            container.style.height = 'auto';
                            
                            // 强制直接隐藏占位符元素
                            const placeholder = container.querySelector('.photo-placeholder');
                            if (placeholder) {
                                placeholder.style.display = 'none';
                            }
                        }
                    });
                    
                    // 稍微延迟以确保DOM完全更新
                    setTimeout(() => {
                        if (this.masonryInstance) {
                            this.masonryInstance.layout();
                        }
                    }, 200);
                });
            }   
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
        
        // 使用categories数组设置data-category属性
        const categoryAttr = photo.categories && photo.categories.length > 0 
            ? photo.categories.join(' ').toLowerCase() 
            : (photo.category ? photo.category.toLowerCase() : 'unknown');
        photoItem.setAttribute('data-category', categoryAttr);
        
        photoItem.setAttribute('data-extended-field', photo.extendedField);
        
        // 生成分类标签HTML
        let categoryTagsHTML = '';
        // 优先使用categories数组
        if (photo.categories && Array.isArray(photo.categories) && photo.categories.length > 0) {
            categoryTagsHTML = photo.categories.map(cat => {
                // 确定标签类和标签文本
                let moduleClass = 'unknown';
                let moduleLabel = cat;
                
                // 映射标签名称
                switch(cat.toLowerCase()) {
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
                    case 'food':
                        moduleLabel = '美食';
                        moduleClass = 'food';
                        break;
                    case 'family':
                        moduleLabel = '家庭';
                        moduleClass = 'family';
                        break;
                    case 'test':
                        moduleLabel = '测试';
                        moduleClass = 'test';
                        break;
                }
                
                return `<span class="module-tag ${moduleClass.toLowerCase()}">${moduleLabel}</span>`;
            }).join('');
        } else {
            // 向后兼容 - 如果没有categories数组，使用单个category
            let moduleLabel = '未知';
            let moduleClass = 'unknown';
            
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
                case 'food':
                    moduleLabel = '美食';
                    moduleClass = 'food';
                    break;
                case 'family':
                    moduleLabel = '家庭';
                    moduleClass = 'family';
                    break;
                case 'test':
                    moduleLabel = '测试';
                    moduleClass = 'test';
                    break;
                default:
                    moduleLabel = photo.category || '未分类';
                    moduleClass = 'unknown';
            }
            
            categoryTagsHTML = `<span class="module-tag ${moduleClass}">${moduleLabel}</span>`;
        }
        
        // 创建模糊版本的图片URL (保持相同URL但添加模糊指示符，实际模糊效果通过CSS实现)
        const thumbnailUrl = photo.thumbnailUrl || photo.coverUrl;
        
        // 使用缩略图作为显示图片，使用data-original属性存储原始图片URL
        photoItem.innerHTML = `
            <div class="photo-img-container placeholder-loading">
                
                <img 
                    class="photo-img lazy blur-effect"
                    src="${thumbnailUrl}" 
                    data-src="${thumbnailUrl}"
                    data-original="${photo.originalUrl || photo.coverUrl}"
                    alt="${photo.title}"
                >
                <div class="photo-placeholder">
                    <div class="placeholder-animation"></div>
                </div>
            </div>
            <div class="photo-info">
                <h3 class="photo-title">${photo.title}</h3>
                <div class="photo-info-row">
                    <div class="photo-extended-field" data-field="${photo.extendedFieldType}">${photo.extendedField}</div>
                    ${categoryTagsHTML}
                </div>
            </div>
        `;
        
        // 添加点击事件，查看原始大图
        if (clickHandler) {
            // 优化: 使图片容器和标题都可点击，而不仅仅是整个卡片
            const imgContainer = photoItem.querySelector('.photo-img-container');
            if (imgContainer) {
                imgContainer.style.cursor = 'pointer';
                imgContainer.addEventListener('click', (e) => {
                    e.stopPropagation(); // 防止事件冒泡
                    clickHandler(photo);
                });
            }
            
            const photoTitle = photoItem.querySelector('.photo-title');
            if (photoTitle) {
                photoTitle.style.cursor = 'pointer';
                photoTitle.addEventListener('click', (e) => {
                    e.stopPropagation(); // 防止事件冒泡
                    clickHandler(photo);
                });
            }
            
            // 保留卡片整体的点击事件作为备份
            photoItem.addEventListener('click', () => clickHandler(photo));
        }
        
        // 模拟获取图片尺寸，添加一个隐藏的图片预加载
        const preloadImg = new Image();
        preloadImg.onload = () => {
            const imgRatio = preloadImg.height / preloadImg.width;
            // 设置占位符的高度，应该与最终图片比例一致
            const placeholders = photoItem.querySelectorAll('.photo-placeholder');
            if (placeholders.length > 0) {
                // 使用最小高度而不是padding-bottom来设置容器高度
                const container = photoItem.querySelector('.photo-img-container');
                if (container) {
                    // 根据图片宽高比计算高度
                    const containerWidth = container.offsetWidth;
                    const expectedHeight = containerWidth * imgRatio;
                    // 设置最小高度而不是padding-bottom
                    container.style.minHeight = expectedHeight + 'px';
                }
            }
            
            // 获取图片元素
            const imgElement = photoItem.querySelector('.photo-img');
            if (imgElement) {
                // 设置加载事件
                imgElement.addEventListener('load', function() {
                    // 移除模糊效果
                    imgElement.classList.remove('blur-effect');
                    imgElement.classList.add('loaded');
                    
                    // 移除占位符
                    const container = imgElement.closest('.photo-img-container');
                    if (container) {
                        container.classList.remove('placeholder-loading');
                        // 图片加载后移除最小高度限制
                        container.style.minHeight = '0';
                        container.style.height = 'auto';
                        
                        // 强制直接隐藏占位符元素
                        const placeholder = container.querySelector('.photo-placeholder');
                        if (placeholder) {
                            placeholder.style.display = 'none';
                        }
                    }
                    
                    // 通知Masonry重新布局
                    if (window.msnry) {
                        window.msnry.layout();
                    }
                }, {once: true}); // 只触发一次
            }
            
            // 通知Masonry重新布局
            if (window.msnry) {
                window.msnry.layout();
            }
        };
        
        preloadImg.onerror = () => {
            // 图片加载失败也需要显示内容
            const placeholders = photoItem.querySelectorAll('.photo-placeholder');
            if (placeholders.length > 0) {
                // 设置默认的最小高度
                const container = photoItem.querySelector('.photo-img-container');
                if (container) {
                    const containerWidth = container.offsetWidth;
                    // 使用4:3的比例
                    container.style.minHeight = (containerWidth * 0.75) + 'px';
                }
            }
            
            // 添加错误样式
            const container = photoItem.querySelector('.photo-img-container');
            if (container) {
                container.classList.add('load-error');
            }
            
            // 通知Masonry重新布局
            if (window.msnry) {
                window.msnry.layout();
            }
        };
        
        preloadImg.src = thumbnailUrl;
        
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
            this.lazyLoadInstance = null;
        }
        
        // 销毁Masonry实例
        if (this.masonryInstance) {
            this.masonryInstance.destroy();
            this.masonryInstance = null;
        }
        
        // 移除全局引用
        window.msnry = null;
        
        // 清理资源加载状态
        this.resourceLoadStatus = {
            'vanilla-lazyload': false,
            'masonry': false,
            'imagesLoaded': false
        };
        
        // 清理容器引用
        this.photoGridContainer = null;
    }
}

// 创建单例实例
export const photoRenderer = new PhotoRenderer();
export default photoRenderer;