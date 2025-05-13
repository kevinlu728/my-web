/**
 * @file imageLazyLoader.js
 * @description 图片懒加载工具，实现图片的延迟加载和优化
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-08
 * 
 * 该模块实现了图片的懒加载功能，提高页面加载性能和用户体验：
 * - 使用IntersectionObserver监测图片可见性
 * - 图片进入视口时才加载
 * - 支持渐进式加载效果
 * - 支持加载失败的回退处理
 * - 支持响应式图片
 * - 支持WebP等现代图片格式的检测和使用
 * 
 * 主要方法：
 * - processImages: 处理页面中的所有图片
 * - loadImage: 加载单个图片
 * - setupIntersectionObserver: 设置交叉观察器
 */

import logger from '../utils/logger.js';
import { showLoadingSpinner } from '../utils/common-utils.js';
import { vanillaLoader } from '../resource/vanillaLoader.js';
import { resourceEvents, RESOURCE_EVENTS } from '../resource/resourceEvents.js';
import { imageModal } from '../components/imageModal.js';

class ImageLazyLoader {
    constructor() {
        this.observer = null;
    }
    
    initialize() {
        logger.info('初始化图片懒加载');
        this.initResourceEventListeners();
        this.loadImageResources();
        this.initIntersectionObserver();

        // 初始化图片预览模态框
        imageModal.initialize();
    }

    initResourceEventListeners() {
        // 创建加载状态跟踪对象
        const loadStatus = {
            'vanilla-lazyload': false,
        };
        
        // 监听资源加载成功事件
        resourceEvents.on(RESOURCE_EVENTS.LOADING_SUCCESS, (data) => {
            // 更新加载状态
            if (data.resourceId === 'vanilla-lazyload') {
                loadStatus[data.resourceId] = true;
                logger.info(`🔄 资源 ${data.resourceId} 加载成功 [来源: ${data.sender || '未知'}]`);
                
                // 检查所有必要资源是否都已加载
                if (loadStatus['vanilla-lazyload']) {
                    logger.info('✅ VanillaLazyload已加载成功，准备初始化图片懒加载');
                    
                    // 延迟以确保样式完全应用
                    setTimeout(() => {
                        this.initImageLazyLoad();
                    }, 200);
                }
            }
        });
        
        // 监听资源加载失败事件，处理降级方案
        resourceEvents.on(RESOURCE_EVENTS.LOADING_FAILURE, (data) => {
            if (data.resourceId === 'vanilla-lazyload') {
                logger.warn(`⚠️ VanillaLazyload加载失败，图片懒加载功能可能不可用 [来源: ${data.sender || '未知'}]`);
            }
        });
    }

    loadImageResources() {
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
    }

    initIntersectionObserver() {
        try {
            this.observer = new IntersectionObserver(this.onIntersection.bind(this), {
                rootMargin: '0px', // 改为0px，不提前加载
                threshold: 0.01 // 当图片有1%进入视口时触发
            });
            
            const imageBlocks = document.querySelectorAll('.lazy-image');
            logger.info(`找到 ${imageBlocks.length} 个图片块`);
            
            imageBlocks.forEach(block => this.observer.observe(block));
        } catch (error) {
            logger.error('初始化图片懒加载失败:', error.message);
            
            // 降级处理：立即加载所有图片
            document.querySelectorAll('.lazy-image').forEach(block => this.loadImage(block));
        }
    }

    /**
     * IntersectionObserver 回调函数 - 用于原生实现的降级方案
     * @param {IntersectionObserverEntry[]} entries 
     */
    onIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.getAttribute('data-src');
                
                if (src) {
                    logger.debug('图片进入视图范围，开始加载:', src);
                    img.src = src;
                    img.classList.add('loaded');
                    img.removeAttribute('data-src');
                    this.observer.unobserve(img);
                    
                    // 清除加载指示器
                    const wrapper = img.parentElement;
                    if (wrapper) {
                        const loader = wrapper.querySelector('.loader-container');
                        if (loader) loader.remove();
                    }
                    
                    // 应用自定义样式
                    if (img.naturalWidth && img.naturalHeight) {
                        this.applyCustomStyles(img);
                    }
                }
            }
        });
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
            
            // 创建新的LazyLoad实例
            logger.info('正在初始化Vanilla-LazyLoad...');
            
            // 配置LazyLoad选项
            const lazyLoadOptions = {
                elements_selector: '.lazy-image', // 选择器
                threshold: 0,                     // 无预加载阈值，进入视口才加载
                use_native: true,                 // 使用原生懒加载（如果浏览器支持）
                data_src: 'src',                  // data-src属性
                unobserve_completed: true,        // 取消观察已完成加载的元素，提高性能
                callback_enter: (element) => {    // 元素进入视口回调
                    logger.debug('图片进入视口:', element.getAttribute('data-src') || element.src);
                    
                    // 预先设置图片样式，避免初始加载时的巨大尺寸
                    this.presetImageSize(element);
                    
                    // 设置加载超时，如果15秒内未加载完成，则触发错误处理
                    if (!element._loadTimeout) {
                        element._loadTimeout = setTimeout(() => {
                            if (!element.complete && !element.classList.contains('loaded')) {
                                logger.warn('图片加载超时:', element.getAttribute('data-src') || element.src);
                                // 触发错误处理
                                this.handleImageError(element);
                            }
                        }, 15000); // 15秒超时
                    }
                },
                callback_loaded: (element) => {   // 加载完成回调
                    // 清除加载超时
                    if (element._loadTimeout) {
                        clearTimeout(element._loadTimeout);
                        element._loadTimeout = null;
                    }
                    
                    element.classList.add('loaded');
                    
                    // 处理图片容器的加载指示器
                    const wrapper = element.parentElement;
                    if (wrapper) {
                        const loader = wrapper.querySelector('.loader-container');
                        if (loader) loader.remove();
                    }
                    
                    // 应用自定义样式
                    this.applyCustomStyles(element);
                    
                    // 为图片添加点击放大功能
                    this.addZoomToImage(element);
                    
                    logger.debug('图片加载完成:', element.getAttribute('data-src') || element.src);
                },
                callback_error: (element) => {    // 加载错误回调
                    // 清除加载超时
                    if (element._loadTimeout) {
                        clearTimeout(element._loadTimeout);
                        element._loadTimeout = null;
                    }
                    
                    logger.warn('图片加载失败:', element.getAttribute('data-src') || element.src);
                    
                    // 处理重试逻辑
                    const retryCount = parseInt(element.dataset.retryCount || '0');
                    const maxRetries = 3;
                    
                    if (retryCount < maxRetries) {
                        element.dataset.retryCount = (retryCount + 1).toString();
                        
                        const originalSrc = element.getAttribute('data-src') || 
                                          element.getAttribute('data-original-src') || 
                                          element.src.split('?')[0];
                        
                        logger.warn(`⚠️ 图片加载失败，正在进行第 ${retryCount + 1} 次重试:`, originalSrc);
                        
                        // 使用递增的延迟 (2秒, 5秒, 10秒)
                        const retryDelay = 2000 * (retryCount + 1);
                        
                        setTimeout(() => {
                            if (this.lazyLoadInstance) {
                                // 更新图片来源并重试加载
                                element.setAttribute('data-src', originalSrc + '?retry=' + Date.now());
                                this.lazyLoadInstance.update();
                            }
                        }, retryDelay);
                    } else {
                        logger.error('❌ 图片加载失败（已达到最大重试次数）:', element.getAttribute('data-src') || element.src);
                        this.handleImageError(element);
                    }
                },
                callback_finish: () => {          // 所有图片处理完成
                    logger.info('所有可见图片加载完成');
                    
                    // 检查是否有未加载的图片（在视口外的）
                    const unloadedImages = document.querySelectorAll('img.lazy-image:not(.loaded)');
                    if (unloadedImages.length > 0) {
                        logger.info(`还有 ${unloadedImages.length} 张图片未加载（在视口外）`);
                    }
                    
                    // 确保所有加载完的图片都有放大功能
                    this.addZoomFunctionality();
                },
                cancel_on_exit: false,           // 图片离开视口时不取消加载
                restore_on_error: false          // 发生错误时不恢复原始src
            };
            
            // 创建LazyLoad实例
            this.lazyLoadInstance = new LazyLoad(lazyLoadOptions);
            
            // 为图片添加点击放大功能
            this.addZoomFunctionality();
            
            logger.info('Vanilla-LazyLoad初始化完成');
            
            // 监听页面滚动事件，动态更新懒加载
            this.setupScrollListener();
        } catch (error) {
            logger.error('初始化LazyLoad失败:', error);
            
            // 降级为原生IntersectionObserver实现
            logger.info('降级使用原生IntersectionObserver实现懒加载');
            this.initIntersectionObserver();
        }
    }

    /**
     * 预先设置图片尺寸，避免加载后的尺寸变化
     * @param {HTMLImageElement} img - 图片元素
     */
    presetImageSize(img) {
        if (!img) return;
        
        // 预先设置图片样式，防止加载时出现巨大尺寸
        img.style.maxWidth = '60%'; // 限制为60%的宽度，与applyCustomStyles一致
        img.style.display = 'block';
        img.style.margin = '0 auto';
        img.style.height = 'auto';
        
        // 预先添加放大提示样式
        img.style.cursor = 'zoom-in';
        
        // 获取父元素并设置居中对齐
        const wrapper = img.parentElement;
        if (wrapper && (wrapper.classList.contains('image-wrapper') || wrapper.classList.contains('article-image-container'))) {
            wrapper.style.textAlign = 'center';
        }
    }
    
    /**
     * 为图片添加点击放大功能
     */
    addZoomFunctionality() {
        // 查找所有图片，无论是否已加载
        const allImages = document.querySelectorAll('img.lazy-image');
        allImages.forEach(img => {
            this.addZoomToImage(img);
        });
        
        logger.debug(`已检查 ${allImages.length} 张图片的放大功能`);
    }

    /**
     * 为单个图片添加放大功能
     * @param {HTMLImageElement} img - 图片元素
     */
    addZoomToImage(img) {
        if (!img || img.hasClickHandler) return;
        
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', () => {
            const imgSrc = img.getAttribute('data-src') || img.src;
            imageModal.open(imgSrc);
        });
        img.hasClickHandler = true;
        
        logger.debug('已为图片添加放大功能:', img.src);
    }

    /**
     * 应用自定义样式到图片
     * @param {HTMLImageElement} img - 图片元素
     */
    applyCustomStyles(img) {
        // 安全检查 - 确保图片元素存在并且不是空的占位图
        if (!img || !img.complete || !img.naturalWidth) {
            return; // 图片还没有加载完成，不应用样式
        }
        
        const containerWidth = img.parentElement.offsetWidth;
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;
        
        // 计算60%的尺寸
        const targetWidth = Math.round(naturalWidth * 0.6);
        const targetHeight = Math.round(naturalHeight * 0.6);
        
        // 设置图片样式
        img.style.display = 'block';
        img.style.margin = '0 auto'; // 居中对齐
        
        // 如果60%后的宽度仍然大于容器宽度，则进一步缩放
        if (targetWidth > containerWidth * 0.9) {
            const scale = (containerWidth * 0.9) / targetWidth;
            img.style.width = Math.round(targetWidth * scale) + 'px';
            img.style.height = Math.round(targetHeight * scale) + 'px';
        } else {
            // 否则使用60%的尺寸
            img.style.width = targetWidth + 'px';
            img.style.height = targetHeight + 'px';
        }
        
        // 控制高度上限以避免过大图片
        if (parseInt(img.style.height) > 600) {
            const ratio = 600 / parseInt(img.style.height);
            img.style.height = '600px';
            img.style.width = Math.round(parseInt(img.style.width) * ratio) + 'px';
        }

        // 获取图片容器并设置样式
        const wrapper = img.parentElement;
        if (wrapper) {
            wrapper.style.textAlign = 'center'; // 始终保持居中对齐
            wrapper.style.margin = '0.5rem auto';
        }
    }

    /**
     * 处理图片加载失败
     * @param {HTMLImageElement} imgElement - 图片元素
     */
    handleImageError(imgElement) {
        const wrapper = imgElement.parentElement;
        
        // 先清除所有已存在的错误提示
        const existingErrors = wrapper ? wrapper.querySelectorAll('.error-message') : [];
        existingErrors.forEach(error => error.remove());
        
        // 清除所有可能存在的加载指示器
        if (wrapper) {
            const loaders = wrapper.querySelectorAll('.loader-container');
            loaders.forEach(loader => loader.remove());
        }
        
        // 如果父元素不存在，直接返回
        if (!wrapper) {
            logger.error('处理图片错误时无法找到父元素');
            return;
        }
        
        // 创建新的错误提示
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-message';
        errorContainer.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>图片加载失败</span>
        `;
        
        // 隐藏原始图片
        imgElement.style.display = 'none';
        
        // 在图片后面插入错误提示
        wrapper.appendChild(errorContainer);
    
        // 点击重试
        errorContainer.onclick = () => {
            // 移除错误提示
            errorContainer.remove();
            
            // 显示加载中状态
            const loaderContainer = document.createElement('div');
            loaderContainer.className = 'loader-container';
            loaderContainer.style.position = 'absolute';
            loaderContainer.style.top = '5px'; // 减少顶部距离，与_createLoaderForImage保持一致
            loaderContainer.style.left = '50%';
            loaderContainer.style.transform = 'translateX(-50%)';
            loaderContainer.style.width = '160px'; // 减小宽度，与_createLoaderForImage保持一致
            loaderContainer.style.height = '80px'; // 减小高度，与_createLoaderForImage保持一致
            loaderContainer.style.backgroundColor = '#f5f5f5';
            loaderContainer.style.borderRadius = '6px'; // 与_createLoaderForImage保持一致
            loaderContainer.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            loaderContainer.style.zIndex = '1';
            
            // 添加加载指示器
            if (typeof showLoadingSpinner === 'function') {
                showLoadingSpinner('重新加载中', loaderContainer, {
                    size: 'small',
                    theme: 'secondary'
                });
            } else {
                loaderContainer.textContent = '重新加载中...';
            }
            
            wrapper.appendChild(loaderContainer);
            
            // 显示图片
            imgElement.style.display = '';
            
            // 获取原始URL，避免带有重试参数的URL
            let originalSrc = imgElement.dataset.src || imgElement.getAttribute('data-original-src');
            if (!originalSrc) {
                originalSrc = imgElement.src;
                
                // 移除可能存在的重试参数
                const urlWithoutParams = originalSrc.split('?')[0];
                if (urlWithoutParams !== originalSrc) {
                    originalSrc = urlWithoutParams;
                }
            }
            
            logger.info('尝试预加载图片:', originalSrc);
            
            // 先尝试使用fetch预加载图片
            fetch(originalSrc, { method: 'HEAD', cache: 'no-cache', mode: 'no-cors' })
                .then(() => {
                    logger.info('图片预加载成功，开始加载图片');
            // 重新加载图片
                    imgElement.src = originalSrc + '?fresh=' + Date.now();
                    // 标记为等待加载
                    imgElement.classList.remove('loaded');
                    // 重置重试计数
                    imgElement.dataset.retryCount = '0';
                })
                .catch(err => {
                    logger.error('图片预加载失败:', err);
                    // 仍然尝试直接加载
                    imgElement.src = originalSrc + '?retry=' + Date.now();
                    // 重置重试计数
                    imgElement.dataset.retryCount = '0';
                })
                .finally(() => {
                    // 设置超时移除加载器
                    setTimeout(() => {
                        if (loaderContainer && loaderContainer.parentNode) {
                            loaderContainer.remove();
                        }
                    }, 10000); // 10秒后移除加载器，无论加载成功与否
                });
            
            // 如果存在LazyLoad实例，通知其更新
            if (this.lazyLoadInstance) {
                setTimeout(() => this.lazyLoadInstance.update(), 100);
            }
        };
    }

    /**
     * 设置滚动监听来更新懒加载
     */
    setupScrollListener() {
        // 使用节流函数防止过于频繁触发
        let scrollTimeout;
        const throttleDelay = 300; // 300ms的节流延迟
        
        const throttledScroll = () => {
            if (!scrollTimeout) {
                scrollTimeout = setTimeout(() => {
                    if (this.lazyLoadInstance) {
                        this.lazyLoadInstance.update();
                    }
                    scrollTimeout = null;
                }, throttleDelay);
            }
        };
        
        // 找到实际滚动的容器
        let scrollContainer;
        
        // 检查当前是否为博客页面
        const isBlogPage = document.querySelector('.blog-content');
        
        if (isBlogPage) {
            // 博客页面使用特定容器
            if (window.innerWidth <= 768) {
                // 移动设备使用主内容区域
                scrollContainer = document.querySelector('.blog-content');
                logger.info('在移动设备上使用主内容区域作为滚动容器');
            } else {
                // 桌面设备使用右侧栏
                scrollContainer = document.querySelector('.blog-content .right-column');
                logger.info('在桌面设备上使用右侧栏作为滚动容器');
            }
        }
        
        // 如果没有找到特定容器，回退到全局监听
        if (!scrollContainer) {
            scrollContainer = window;
            logger.info('未找到特定滚动容器，使用全局窗口作为滚动容器');
        }
        
        // 保存滚动容器引用以便后续清理
        this.scrollContainer = scrollContainer;
        
        // 添加滚动事件监听器到正确的容器
        scrollContainer.addEventListener('scroll', throttledScroll, { passive: true });
        
        // 窗口大小变化时仍需全局监听
        window.addEventListener('resize', throttledScroll, { passive: true });
        
        // 记录监听器以便将来需要移除
        this.scrollListener = throttledScroll;
        
        logger.info('已设置图片懒加载滚动监听');
    }

    /**
     * 更新懒加载
     */
    updateImageLazyLoad() {
        if (this.lazyLoadInstance) {
            logger.info('🔄 更新图片懒加载实例，重新检测需要加载的图片...');
            setTimeout(() => {
                try {
                    // 更新LazyLoad实例，处理新增的图片
                    this.lazyLoadInstance.update();
                    
                    // 查找任何新增的图片并添加点击放大功能
                    this.addZoomFunctionality();
                    
                    logger.info('图片懒加载实例已更新');
                } catch (error) {
                    logger.error('更新懒加载实例时出错:', error);
                }
            }, 100);
        } else {
            logger.warn('懒加载实例不存在，无法更新');
            
            // 尝试重新初始化
            this.initialize();
        }
    }
    
    /**
     * 处理文章内的所有图片 - 修改为使用LazyLoad
     * @param {HTMLElement} container - 包含图片的容器元素
     */
    processImages(container) {
        const images = container.querySelectorAll('img:not([data-lazy-processed])');
        
        if (!images.length) {
            logger.debug('没有新的图片需要处理');
            
            // 如果没有新图片，但已有LazyLoad实例，更新已存在的图片
            if (this.lazyLoadInstance) {
                this.lazyLoadInstance.update();
            }
            return;
        }
        
        logger.debug(`处理${images.length}张新图片懒加载`);
        
        // 批量处理图片以减少重排/重绘
        images.forEach((img, index) => {
            // 获取原始图片URL
            const originalSrc = img.getAttribute('data-original-src') || img.src;

            if (!originalSrc || originalSrc.startsWith('data:image/svg+xml')) {
                logger.warn('⚠️ 图片没有有效的源URL');
                // 标记为已处理，避免重复尝试
                img.setAttribute('data-lazy-processed', 'true');
                return;
            }
            
            // 准备图片，添加必要的属性和类
            this._prepareImageForLazyLoading(img, originalSrc);
        });
        
        // 处理完所有图片后，一次性更新LazyLoad实例
        if (this.lazyLoadInstance) {
            setTimeout(() => this.lazyLoadInstance.update(), 50);
        } else {
            // 尝试初始化LazyLoad
            this.initImageLazyLoad();
        }
    }

    /**
     * 为懒加载准备单个图片元素
     * @param {HTMLImageElement} img - 图片元素
     * @param {string} originalSrc - 原始图片URL
     * @private
     */
    _prepareImageForLazyLoading(img, originalSrc) {
        // 检查图片是否已经在 image-wrapper 中
        let wrapper = img.parentElement;
        let needsWrapper = true;
        
        if (wrapper && wrapper.classList.contains('image-wrapper')) {
            // 已经在包装容器中，不需要再创建
            needsWrapper = false;
            logger.debug('图片已有包装容器，跳过创建步骤');
            
            // 确保容器属性正确
            wrapper.style.textAlign = 'center';
        }
        
        if (needsWrapper) {
            // 创建包装容器，该容器用于承载实际图片
            wrapper = document.createElement('div');
            wrapper.className = 'image-wrapper';
            wrapper.style.position = 'relative';
            wrapper.style.display = 'block';
            wrapper.style.width = '100%';
            wrapper.style.margin = '0.5rem auto';
            wrapper.style.textAlign = 'center'; // 默认居中对齐
            
            // 将图片放入包装器
            img.parentNode.insertBefore(wrapper, img);
            wrapper.appendChild(img);
        }
        
        // 添加加载指示器（只添加一次）
        const existingLoaders = wrapper.querySelectorAll('.loader-container');
        if (existingLoaders.length === 0) {
            this._createLoaderForImage(wrapper);
        }
        
        // 为Vanilla-LazyLoad准备图片
        img.classList.add('lazy-image');
        img.setAttribute('data-src', originalSrc);
        
        // 预先设置样式，避免加载时出现巨大尺寸
        this.presetImageSize(img);
        
        // 重要：不再设置占位图，保持原始src
        // 如果已加载，则不修改src；如果未加载，将src属性暂时置空
        if (!img.classList.contains('loaded')) {
            // 为了避免浏览器加载原始图片，将src清空
            img.removeAttribute('src');
        }
        
        // 处理响应式图片
        this.setupResponsiveImage(img);
        
        // 标记图片已处理
        img.setAttribute('data-lazy-processed', 'true');
    }
    
    /**
     * 为图片创建加载指示器
     * @param {HTMLElement} wrapper - 图片包装器元素
     * @private
     */
    _createLoaderForImage(wrapper) {
        // 创建加载指示器容器
        const loaderContainer = document.createElement('div');
        loaderContainer.className = 'loader-container';
        loaderContainer.style.position = 'absolute';
        loaderContainer.style.top = '5px'; // 减少顶部距离
        loaderContainer.style.left = '50%';
        loaderContainer.style.transform = 'translateX(-50%)';
        loaderContainer.style.width = '160px'; // 减小宽度
        loaderContainer.style.height = '80px'; // 减小高度
        loaderContainer.style.backgroundColor = '#f5f5f5';
        loaderContainer.style.borderRadius = '6px';
        loaderContainer.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        loaderContainer.style.zIndex = '1';
        
        // 添加加载指示器
        showLoadingSpinner('图片加载中', loaderContainer, {
            size: 'small',
            theme: 'secondary'
        });
            
        wrapper.appendChild(loaderContainer);
    }

    /**
     * 处理响应式图片
     * @param {HTMLImageElement} img - 图片元素
     */
    setupResponsiveImage(img) {
        // 检查原始图片是否已定义了srcset
        const originalSrcset = img.getAttribute('data-original-srcset');
        const originalSizes = img.getAttribute('data-original-sizes');
        
        if (originalSrcset) {
            // 设置data-srcset属性，让LazyLoad库处理响应式加载
            img.setAttribute('data-srcset', originalSrcset);
            logger.debug('设置响应式图片srcset:', originalSrcset);
        }
        
        if (originalSizes) {
            // 设置data-sizes属性
            img.setAttribute('data-sizes', originalSizes);
            logger.debug('设置响应式图片sizes:', originalSizes);
        } else if (originalSrcset) {
            // 如果有srcset但没有sizes，设置为auto
            img.setAttribute('data-sizes', 'auto');
        }
    }

    /**
     * 清理懒加载相关资源
     */
    cleanup() {
        logger.info('清理图片懒加载资源...');
        
        // 销毁LazyLoad实例
        if (this.lazyLoadInstance) {
            try {
                this.lazyLoadInstance.destroy();
            } catch (error) {
                logger.warn('销毁LazyLoad实例时出错:', error);
            }
            this.lazyLoadInstance = null;
        }
        
        // 移除滚动监听器
        if (this.scrollListener) {
            if (this.scrollContainer) {
                try {
                    this.scrollContainer.removeEventListener('scroll', this.scrollListener);
                } catch (error) {
                    logger.warn('从滚动容器移除监听器时出错:', error);
                }
            }
            
            try {
                window.removeEventListener('resize', this.scrollListener);
            } catch (error) {
                logger.warn('从窗口移除监听器时出错:', error);
            }
            
            this.scrollListener = null;
        }
        
        // 断开IntersectionObserver连接
        if (this.observer) {
            try {
                this.observer.disconnect();
            } catch (error) {
                logger.warn('断开IntersectionObserver连接时出错:', error);
            }
            this.observer = null;
        }
        
        // 清理图片上的超时计时器
        document.querySelectorAll('img.lazy-image').forEach(img => {
            if (img._loadTimeout) {
                clearTimeout(img._loadTimeout);
                img._loadTimeout = null;
            }
        });
        
        // 重置引用
        this.scrollContainer = null;
        
        logger.info('图片懒加载资源已清理');
    }
}

// 导出实例
export const imageLazyLoader = new ImageLazyLoader();

// 默认导出类
export default ImageLazyLoader;