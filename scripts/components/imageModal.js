/**
 * @file imageModal.js
 * @description 图片预览模态框组件，提供图片放大、缩小和移动端手势支持
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-06-10
 * 
 * 该模块提供图片预览模态框功能：
 * - 支持放大/缩小操作
 * - 支持移动端触摸手势
 * - 提供渐入渐出过渡效果
 * - 可自定义样式和行为
 */

import logger from '../utils/logger.js';

class ImageModal {
    constructor() {
        this.modalContainer = null;
        this.isInitialized = false;
    }
    
    /**
     * 初始化模态框
     * @returns {HTMLElement} 模态框容器元素
     */
    initialize() {
        if (this.isInitialized) {
            return this.modalContainer;
        }
        
        logger.info('初始化图片预览模态框');
        
        // 创建模态框DOM结构
        this.createModalElement();
        
        // 添加移动端手势支持
        this.initTouchEvents();
        
        this.isInitialized = true;
        return this.modalContainer;
    }
    
    /**
     * 创建模态框DOM元素
     */
    createModalElement() {
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
                margin-bottom: 10px;
                z-index: 1010; /* 确保关闭按钮位于最上层 */
                text-shadow: 0 0 4px rgba(0, 0, 0, 0.5); /* 简单的文字阴影，提高可见性 */
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
            this.close();
        });
        
        this.modalContainer.addEventListener('click', (e) => {
            if (e.target === this.modalContainer) {
                this.close();
            }
        });
        
        // 添加ESC键关闭功能
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalContainer.classList.contains('active')) {
                this.close();
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
        }, { passive: true });
        
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
        }, { passive: false });
    }
    
    /**
     * 打开图片预览模态框
     * @param {string} imgSrc - 图片URL
     */
    open(imgSrc) {
        // 确保模态框已初始化
        if (!this.isInitialized) {
            this.initialize();
        }
        
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
        
        tempImg.onerror = () => {
            logger.error('图片加载失败:', imgSrc);
            modalImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+5Zu+54mH5Yqg6L295aSx6LSlPC90ZXh0Pjwvc3ZnPg==';
            this.modalContainer.classList.add('active');
        };
        
        tempImg.src = imgSrc;
    }
    
    /**
     * 关闭图片预览模态框
     */
    close() {
        if (this.modalContainer) {
            this.modalContainer.classList.remove('active');
        }
    }
}

// 导出单例实例
export const imageModal = new ImageModal();

// 默认导出类
export default ImageModal;
