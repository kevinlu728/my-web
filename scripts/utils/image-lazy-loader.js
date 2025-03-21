/**
 * @file image-lazy-loader.js
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
 * 
 * 导出单例imageLazyLoader供其他模块使用。
 */

class ImageLazyLoader {
    constructor() {
        // 检查浏览器是否支持 IntersectionObserver
        this.hasIntersectionObserver = 'IntersectionObserver' in window;
        this.observer = null;
        this.modalContainer = null;
        
        // 默认替代图（一个简单的灰色图片的 base64）
        this.fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+5Zu+54mH5Yqg6L295aSx6LSlPC90ZXh0Pjwvc3ZnPg==';
        
        // 占位图
        this.placeholderImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
        
        if (this.hasIntersectionObserver) {
            // 创建 IntersectionObserver 实例
            this.observer = new IntersectionObserver(this.onIntersection.bind(this), {
                rootMargin: '50px 0px', // 提前50px开始加载
                threshold: 0.01 // 当图片有1%进入视口时触发
            });
        }

        // 创建图片预览模态框
        this.createImageModal();
        
        // 添加移动端手势支持
        this.initTouchEvents();
    }

    /**
     * 创建加载状态指示器
     * @returns {HTMLElement}
     */
    createLoader() {
        const loader = document.createElement('div');
        loader.className = 'image-loader';
        return loader;
    }

    /**
     * 创建错误提示元素
     * @returns {HTMLElement}
     */
    createErrorElement() {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'image-error';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <p>图片加载失败</p>
        `;
        return errorDiv;
    }

    /**
     * 创建图片预览模态框
     */
    createImageModal() {
        this.modalContainer = document.createElement('div');
        this.modalContainer.className = 'image-modal';
        this.modalContainer.innerHTML = `
            <div class="modal-content">
                <img src="" alt="预览图片">
                <div class="modal-close">&times;</div>
                <div class="modal-zoom">
                    <button class="zoom-in">+</button>
                    <div class="zoom-level">100%</div>
                    <button class="zoom-out">-</button>
                </div>
                <div class="modal-scale-bar">
                    <div class="scale-indicator" style="width: 33.3%"></div>
                </div>
            </div>
        `;
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .image-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .image-modal.active {
                display: flex;
                opacity: 1;
            }
            
            .modal-content {
                position: relative;
                margin: auto;
                max-width: 90%;
                max-height: 90%;
                padding-bottom: 50px; /* 为底部控件留出空间 */
            }
            
            .modal-content img {
                max-width: 100%;
                max-height: 90vh;
                object-fit: contain;
                transform-origin: center;
                transition: transform 0.3s ease;
                margin-bottom: 20px; /* 与底部控件保持距离 */
            }
            
            .modal-close {
                position: absolute;
                top: -40px;
                right: 0;
                color: white;
                font-size: 30px;
                cursor: pointer;
                padding: 10px;
            }
            
            .modal-zoom {
                position: absolute;
                bottom: 20px;
                right: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .modal-zoom button {
                background: white;
                border: none;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 20px;
                line-height: 1;
            }
            
            .zoom-level {
                color: white;
                font-size: 14px;
                min-width: 50px;
                text-align: center;
            }
            
            .modal-scale-bar {
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 4px;
                background: rgba(255, 255, 255, 0.2);
            }
            
            .scale-indicator {
                height: 100%;
                background: #3498db;
                width: 33.3%; /* 默认 1.0 缩放比例 */
                transition: width 0.3s ease;
            }

            .image-loader {
                position: relative;
                min-height: 100px;
                background-color: #f5f5f5;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .image-loader::before {
                content: '';
                position: absolute;
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* 适配移动设备 */
            @media (max-width: 768px) {
                .modal-content {
                    padding-bottom: 60px; /* 移动设备上增加更多空间 */
                }
                
                .modal-zoom {
                    bottom: 25px;
                    right: 50%;
                    transform: translateX(50%); /* 居中显示 */
                }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(this.modalContainer);
        
        // 添加事件监听
        this.modalContainer.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal();
        });
        
        this.modalContainer.addEventListener('click', (e) => {
            if (e.target === this.modalContainer) {
                this.closeModal();
            }
        });
        
        // 添加缩放功能
        const img = this.modalContainer.querySelector('img');
        const zoomIn = this.modalContainer.querySelector('.zoom-in');
        const zoomOut = this.modalContainer.querySelector('.zoom-out');
        const zoomLevel = this.modalContainer.querySelector('.zoom-level');
        const scaleIndicator = this.modalContainer.querySelector('.scale-indicator');
        
        // 缩放相关变量
        let scale = 1;
        const minScale = 0.5;
        const maxScale = 3;
        
        // 更新缩放显示
        const updateZoomDisplay = () => {
            // 更新百分比文本
            zoomLevel.textContent = `${Math.round(scale * 100)}%`;
            
            // 更新进度条
            // 将缩放范围（0.5到3）映射到宽度范围（0%到100%）
            const scaleRange = maxScale - minScale;
            const scalePosition = scale - minScale;
            const scalePercentage = (scalePosition / scaleRange) * 100;
            scaleIndicator.style.width = `${scalePercentage}%`;
        };
        
        // 初始化显示
        updateZoomDisplay();
        
        zoomIn.addEventListener('click', () => {
            scale = Math.min(scale * 1.2, maxScale);
            img.style.transform = `scale(${scale})`;
            updateZoomDisplay();
        });
        
        zoomOut.addEventListener('click', () => {
            scale = Math.max(scale / 1.2, minScale);
            img.style.transform = `scale(${scale})`;
            updateZoomDisplay();
        });
    }

    /**
     * 初始化移动端手势支持
     */
    initTouchEvents() {
        if (!this.modalContainer) return;
        
        const img = this.modalContainer.querySelector('img');
        let startX = 0;
        let startY = 0;
        let initialScale = 1;
        let currentScale = 1;
        
        // 处理双指缩放
        this.modalContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                const distance = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                startX = distance;
                initialScale = currentScale;
            }
        });
        
        this.modalContainer.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const distance = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                currentScale = initialScale * (distance / startX);
                currentScale = Math.min(Math.max(currentScale, 0.5), 3);
                img.style.transform = `scale(${currentScale})`;
            }
        });
    }

    /**
     * 打开图片预览模态框
     */
    openModal(imgSrc) {
        const modalImg = this.modalContainer.querySelector('img');
        const scaleIndicator = this.modalContainer.querySelector('.scale-indicator');
        const zoomLevel = this.modalContainer.querySelector('.zoom-level');
        
        // 重置缩放
        modalImg.style.transform = 'scale(1)';
        scaleIndicator.style.width = '33.3%'; // 恢复到默认宽度（对应缩放比例1.0）
        zoomLevel.textContent = '100%';
        
        // 加载新图片
        const tempImg = new Image();
        tempImg.onload = () => {
            modalImg.src = imgSrc;
            this.modalContainer.classList.add('active');
        };
        
        tempImg.src = imgSrc;
    }

    /**
     * 关闭图片预览模态框
     */
    closeModal() {
        this.modalContainer.classList.remove('active');
    }

    /**
     * 处理文章内容中的所有图片
     * @param {HTMLElement} container - 包含图片的容器元素
     */
    processImages(container) {
        const images = container.querySelectorAll('img');
        
        if (!images.length) {
            console.log('📢 容器中没有找到图片');
            return;
        }
        console.log(`🎯 找到 ${images.length} 张图片，开始处理懒加载...`);
        
        images.forEach((img, index) => {
            // 获取原始图片URL和尺寸信息
            const originalSrc = img.getAttribute('data-original-src') || img.src;
            console.log('图片信息:', {
                src: originalSrc,
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
                width: img.width,
                height: img.height,
                dataWidth: img.getAttribute('data-width'),
                dataHeight: img.getAttribute('data-height'),
                dataset: img.dataset
            });

            if (!originalSrc || originalSrc.startsWith('data:image/svg+xml')) {
                console.log('⚠️ 图片没有有效的源URL');
                return;
            }

            // 创建包装容器
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.width = 'fit-content';
            wrapper.style.maxWidth = '100%';
            wrapper.style.minHeight = '50px';
            wrapper.style.margin = '0.5rem 0'; // 减小上下边距
            img.parentNode.insertBefore(wrapper, img);
            wrapper.appendChild(img);
            
            // 添加点击放大功能
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', () => {
                this.openModal(originalSrc);
            });
            
            // 添加加载状态指示器
            const loader = this.createLoader();
            wrapper.appendChild(loader);
            
            // 设置懒加载
            if (this.hasIntersectionObserver) {
                img.setAttribute('data-src', originalSrc);
                img.src = this.placeholderImage;
                img.classList.add('lazy-image');
                this.observer.observe(img);
            } else {
                img.src = originalSrc;
            }
            
            // 处理加载完成
            img.addEventListener('load', () => {
                if (!img.src.startsWith('data:image/svg+xml')) {
                    console.log('✅ 图片加载完成:', {
                        src: img.src,
                        naturalWidth: img.naturalWidth,
                        naturalHeight: img.naturalHeight
                    });
                    
                    if (loader.parentNode === wrapper) {
                        loader.remove();
                    }
                    img.classList.add('loaded');
                    img.classList.remove('lazy-image');
                    
                    // 使用图片的原始尺寸
                    if (img.naturalWidth && img.naturalHeight) {
                        this.applyCustomStyles(img);
                    }
                }
            });
            
            // 处理加载错误
            img.addEventListener('error', () => {
                if (img.src.startsWith('data:image/svg+xml')) return;
                
                const retryCount = parseInt(img.dataset.retryCount || '0');
                const maxRetries = 3;
                
                if (retryCount < maxRetries) {
                    img.dataset.retryCount = (retryCount + 1).toString();
                    console.log(`⚠️ 图片加载失败，正在进行第 ${retryCount + 1} 次重试:`, originalSrc);
                    
                    setTimeout(() => {
                        // 清除所有已存在的错误提示
                        const existingErrors = wrapper.querySelectorAll('.error-message');
                        existingErrors.forEach(error => error.remove());
                        
                        img.src = originalSrc + '?retry=' + Date.now();
                    }, 1000 * Math.pow(2, retryCount));
                    
                } else {
                    console.error('❌ 图片加载失败（已达到最大重试次数）:', originalSrc);
                    if (loader.parentNode === wrapper) {
                        loader.remove();
                    }
                    // 使用统一的错误处理方法
                    this.handleImageError(img);
                }
            });
        });
    }

    /**
     * IntersectionObserver 回调函数
     * @param {IntersectionObserverEntry[]} entries 
     */
    onIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.getAttribute('data-src');
                
                if (src) {
                    console.log('🔍 图片进入视图范围，开始加载:', src);
                    img.src = src;
                    img.removeAttribute('data-src');
                    this.observer.unobserve(img);
                }
            }
        });
    }

    /**
     * 应用自定义样式到图片
     * @param {HTMLImageElement} img - 图片元素
     */
    applyCustomStyles(img) {
        const containerWidth = img.parentElement.offsetWidth;
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;
        
        // 计算60%的尺寸
        const targetWidth = Math.round(naturalWidth * 0.6);
        const targetHeight = Math.round(naturalHeight * 0.6);
        
        // 设置图片样式
        img.style.display = 'block';
        
        // 如果60%后的宽度仍然大于容器宽度，则进一步缩放
        if (targetWidth > containerWidth) {
            const scale = containerWidth / targetWidth;
            img.style.width = '100%';
            img.style.height = (targetHeight * scale) + 'px';
        } else {
            // 否则使用60%的尺寸
            img.style.width = targetWidth + 'px';
            img.style.height = targetHeight + 'px';
        }

        // 获取图片容器并设置样式
        const wrapper = img.parentElement;
        if (wrapper) {
            wrapper.style.textAlign = 'left';
            wrapper.style.margin = '0.2rem 0';
            
            // 如果目标宽度小于容器宽度的60%，允许内联显示
            if (targetWidth < containerWidth * 0.6) {
                wrapper.style.display = 'inline-block';
                wrapper.style.marginRight = '1rem';
            } else {
                wrapper.style.display = 'block';
                wrapper.style.marginRight = '0';
            }
        }
    }

    /**
     * 处理从 Notion 获取的 HTML 内容
     * @param {string} htmlContent - 从 Notion 获取的 HTML 内容
     * @returns {string} - 处理后的 HTML 内容
     */
    processHTMLContent(htmlContent) {
        // 创建一个临时的 DOM 元素来解析 HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // 处理所有图片
        const images = tempDiv.querySelectorAll('img');
        console.log('找到图片数量:', images.length);
        
        images.forEach((img, index) => {
            const originalSrc = img.src;
            if (originalSrc) {
                console.log(`图片 ${index + 1} URL:`, originalSrc);
                img.setAttribute('data-src', originalSrc);
                img.src = this.placeholderImage;
                img.classList.add('lazy-image');
            }
        });
        
        // 返回处理后的 HTML
        return tempDiv.innerHTML;
    }

    // 处理图片加载失败
    handleImageError(imgElement) {
        const wrapper = imgElement.parentElement;
        
        // 先清除所有已存在的错误提示
        const existingErrors = wrapper.querySelectorAll('.error-message');
        existingErrors.forEach(error => error.remove());
        
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
            // 显示图片
            imgElement.style.display = '';
            // 重新加载图片
            imgElement.src = imgElement.dataset.src || imgElement.getAttribute('data-original-src');
        };
    }
}

// 导出实例
export const imageLazyLoader = new ImageLazyLoader();

// 默认导出类
export default ImageLazyLoader;