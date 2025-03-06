/**
 * 图片懒加载工具
 * 简化版本 - 不使用外部服务，直接通过 CSS 控制图片大小
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
                    <button class="zoom-out">-</button>
                </div>
                <div class="modal-loading">
                    <div class="progress-bar">
                        <div class="progress"></div>
                    </div>
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
            }
            
            .modal-content img {
                max-width: 100%;
                max-height: 90vh;
                object-fit: contain;
                transform-origin: center;
                transition: transform 0.3s ease;
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
                bottom: -40px;
                right: 0;
                display: flex;
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
            
            .modal-loading {
                position: absolute;
                bottom: -20px;
                left: 0;
                width: 100%;
                height: 4px;
                background: rgba(255, 255, 255, 0.2);
            }
            
            .progress-bar {
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.1);
            }
            
            .progress {
                width: 0%;
                height: 100%;
                background: #3498db;
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
        let scale = 1;
        
        zoomIn.addEventListener('click', () => {
            scale = Math.min(scale * 1.2, 3);
            img.style.transform = `scale(${scale})`;
        });
        
        zoomOut.addEventListener('click', () => {
            scale = Math.max(scale / 1.2, 0.5);
            img.style.transform = `scale(${scale})`;
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
        const progress = this.modalContainer.querySelector('.progress');
        
        // 重置缩放
        modalImg.style.transform = 'scale(1)';
        progress.style.width = '0%';
        
        // 加载新图片
        const tempImg = new Image();
        tempImg.onload = () => {
            modalImg.src = imgSrc;
            this.modalContainer.classList.add('active');
            progress.style.width = '100%';
        };
        
        tempImg.src = imgSrc;
        
        // 模拟进度条
        let width = 0;
        const interval = setInterval(() => {
            if (width >= 90) {
                clearInterval(interval);
            } else {
                width++;
                progress.style.width = width + '%';
            }
        }, 20);
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
            // 获取原始图片URL
            const originalSrc = img.getAttribute('data-original-src') || img.src;
            
            if (!originalSrc || originalSrc.startsWith('data:image/svg+xml')) {
                console.log('⚠️ 图片没有有效的源URL');
                return;
            }

            console.log(`🖼️ 处理图片 ${index + 1}:`, originalSrc);

            // 创建包装容器
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.width = '100%';
            wrapper.style.minHeight = '100px';
            wrapper.style.textAlign = 'left'; // 确保容器左对齐
            wrapper.style.margin = '0'; // 移除容器的边距
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
                // 保存原始URL到data-src
                img.setAttribute('data-src', originalSrc);
                // 设置占位图
                img.src = this.placeholderImage;
                img.classList.add('lazy-image');
                this.observer.observe(img);
            } else {
                // 如果不支持 IntersectionObserver，直接加载图片
                img.src = originalSrc;
            }
            
            // 处理加载完成
            img.addEventListener('load', () => {
                if (!img.src.startsWith('data:image/svg+xml')) {
                    console.log('✅ 图片加载完成:', img.src);
                    if (loader.parentNode === wrapper) {
                        loader.remove();
                    }
                    img.classList.add('loaded');
                    img.classList.remove('lazy-image');
                    this.applyCustomStyles(img);
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
                        img.src = originalSrc + '?retry=' + Date.now();
                    }, 1000 * Math.pow(2, retryCount));
                    
                } else {
                    console.error('❌ 图片加载失败（已达到最大重试次数）:', originalSrc);
                    if (loader.parentNode === wrapper) {
                        loader.remove();
                    }
                    const errorElement = this.createErrorElement();
                    wrapper.appendChild(errorElement);
                    img.style.display = 'none';
                }
            });
            
            this.applyCustomStyles(img);
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
        // 基础样式
        img.style.maxWidth = '80%';  // 增大默认图片尺寸
        img.style.height = 'auto';
        img.style.margin = '1.5rem 0'; // 移除 auto，只保留上下边距
        img.style.display = 'block';
        
        // 在移动设备上调整
        if (window.innerWidth <= 768) {
            img.style.maxWidth = '100%'; // 移动端使用全宽
        }

        // 获取图片容器并设置样式
        const wrapper = img.parentElement;
        if (wrapper) {
            wrapper.style.textAlign = 'left'; // 确保容器左对齐
            wrapper.style.margin = '0'; // 移除容器的边距
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
}

// 导出实例
export const imageLazyLoader = new ImageLazyLoader();

// 默认导出类
export default ImageLazyLoader;