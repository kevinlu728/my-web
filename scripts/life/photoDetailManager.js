import logger from '../utils/logger.js';
/**
 * 照片详情管理器
 * 负责处理照片详情模态框显示、交互及相关事件
 */
class PhotoDetailManager {
    initialize() {
    }

    /**
     * 打开照片详情模态框
     * @param {Object} photo 照片数据对象
     * @param {Array} currentPhotos 当前模块所有照片
     * @param {number} currentIndex 当前照片在数组中的索引
     */
    openPhotoDetail(photo, currentPhotos, currentIndex) {
        logger.info(`显示照片详情: ${photo.title}`);
        
        // 创建模态窗口
        const modal = this._createPhotoDetailModal(photo, currentPhotos, currentIndex);
        
        // 防止滚动
        document.body.style.overflow = 'hidden';
        
        // 添加模态窗口到DOM
        document.body.appendChild(modal);
    }
    
    /**
     * 创建照片详情模态框
     * @private
     * @param {Object} photo 照片数据对象
     * @param {Array} currentPhotos 当前模块所有照片
     * @param {number} currentIndex 当前照片在数组中的索引
     * @returns {HTMLElement} 模态框DOM元素
     */
    _createPhotoDetailModal(photo, currentPhotos, currentIndex) {
        // 创建模态窗口显示大图
        const modal = document.createElement('div');
        modal.className = 'photo-detail-modal';
        
        // 使用原始大图URL
        const imageUrl = photo.originalUrl || photo.coverUrl;
        
        // 生成模态框HTML内容
        const photoDetailHTML = this._generatePhotoDetailHTML(photo, imageUrl, currentPhotos, currentIndex);
        
        // 设置模态框内容
        modal.innerHTML = photoDetailHTML;
        
        // 设置事件处理
        this._setupModalEventHandlers(modal, photo, currentPhotos, currentIndex);
        
        return modal;
    }
    
    /**
     * 生成照片详情HTML内容
     * @private
     * @param {Object} photo 照片数据对象
     * @param {string} imageUrl 图片URL
     * @param {Array} currentPhotos 当前模块所有照片
     * @param {number} currentIndex 当前照片在数组中的索引
     * @returns {string} HTML内容
     */
    _generatePhotoDetailHTML(photo, imageUrl, currentPhotos, currentIndex) {
        // 准备扩展字段HTML
        const extendedFieldHTML = this._generateExtendedFieldHTML(photo);
        
        // 准备分类标签HTML
        const categoriesHTML = this._generateCategoriesHTML(photo);
        
        // 添加导航按钮（仅当有多张照片时显示）
        const navigationHTML = this._generateNavigationHTML(currentPhotos, currentIndex);
        
        // 添加图片控制按钮
        const controlsHTML = this._generateControlsHTML(navigationHTML);
        
        // 返回组合后的HTML内容
        return `
            <div class="photo-detail-container">
                <button class="close-btn">&times;</button>
                <div class="photo-detail-image-wrapper">
                    <img src="${imageUrl}" alt="${photo.title}" class="photo-detail-img">
                    <div class="photo-detail-loader">加载中...</div>
                    ${controlsHTML}
                </div>
                <div class="photo-detail-info">
                    <h2>${photo.title}</h2>
                    <p class="photo-detail-date">${this._formatDate(photo.date)}</p>
                    ${extendedFieldHTML}
                    ${categoriesHTML}
                    <div class="photo-detail-description">${photo.description || '无描述'}</div>
                </div>
            </div>
        `;
    }
    
    /**
     * 格式化日期
     * @private
     * @param {string|Date} date 日期对象或字符串
     * @returns {string} 格式化后的日期字符串
     */
    _formatDate(date) {
        if (!date) return '未知日期';
        
        try {
            const dateObj = new Date(date);
            return dateObj.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return date.toString();
        }
    }
    
    /**
     * 生成扩展字段HTML
     * @private
     * @param {Object} photo 照片数据对象
     * @returns {string} HTML内容
     */
    _generateExtendedFieldHTML(photo) {
        if (!photo.extendedField) {
            return '';
        }
        
        return `
            <div class="photo-detail-extended">
                <span class="extended-label">${photo.extendedFieldType === 'location' ? '拍摄地点' : '相关信息'}:</span>
                <span class="extended-value">${photo.extendedField}</span>
            </div>
        `;
    }
    
    /**
     * 生成分类标签HTML
     * @private
     * @param {Object} photo 照片数据对象
     * @returns {string} HTML内容
     */
    _generateCategoriesHTML(photo) {
        // 获取分类标签显示文本
        const getCategoryLabel = (category) => {
            switch(category.toLowerCase()) {
                case 'movie': return '电影';
                case 'football': return '足球';
                case 'travel': return '旅行';
                case 'food': return '美食';
                case 'family': return '家庭';
                default: return category;
            }
        };
        
        if (photo.categories && photo.categories.length > 0) {
            return `
                <div class="photo-detail-categories">
                    ${photo.categories.map(cat => `<span class="category-tag ${cat.toLowerCase()}">${getCategoryLabel(cat)}</span>`).join('')}
                </div>
            `;
        } else if (photo.category) {
            return `
                <div class="photo-detail-categories">
                    <span class="category-tag ${photo.category.toLowerCase()}">${getCategoryLabel(photo.category)}</span>
                </div>
            `;
        }
        
        return '';
    }
    
    /**
     * 生成导航按钮HTML
     * @private
     * @param {Array} currentPhotos 当前模块所有照片
     * @param {number} currentIndex 当前照片在数组中的索引
     * @returns {string} HTML内容
     */
    _generateNavigationHTML(currentPhotos, currentIndex) {
        if (currentPhotos.length <= 1) {
            logger.warn('没有获取到当前模块的照片，前后导航功能不可用');
            return '';
        }
        
        return `
            <div class="photo-navigation">
                <button class="nav-btn prev-btn" ${currentIndex <= 0 ? 'disabled' : ''}>&lt;</button>
                <span class="nav-counter">${currentIndex + 1} / ${currentPhotos.length}</span>
                <button class="nav-btn next-btn" ${currentIndex >= currentPhotos.length - 1 ? 'disabled' : ''}>&gt;</button>
            </div>
        `;
    }
    
    /**
     * 生成控制按钮HTML
     * @private
     * @param {string} navigationHTML 导航按钮HTML
     * @returns {string} HTML内容
     */
    _generateControlsHTML(navigationHTML) {
        return `
            <div class="photo-detail-controls">
                <button class="control-btn zoom-in-btn" title="放大">+</button>
                <button class="control-btn zoom-out-btn" title="缩小">-</button>
                <button class="control-btn reset-zoom-btn" title="重置">↺</button>
                <button class="control-btn fullscreen-btn" title="全屏查看">⬚</button>
                ${navigationHTML}
            </div>
        `;
    }
    
    /**
     * 设置模态框的事件处理
     * @private
     * @param {HTMLElement} modal 模态框元素
     * @param {Object} photo 照片数据对象
     * @param {Array} currentPhotos 当前模块所有照片
     * @param {number} currentIndex 当前照片在数组中的索引
     */
    _setupModalEventHandlers(modal, photo, currentPhotos, currentIndex) {
        // 添加关闭按钮事件和背景点击关闭事件
        this._setupCloseEvents(modal);
        
        // 添加键盘事件支持
        const keyHandler = this._setupKeyboardEvents(modal, currentPhotos, currentIndex);
        
        // 图片加载和错误处理
        this._setupImageHandlers(modal);
        
        // 缩放控制
        const { zoomImage, resetZoom } = this._setupZoomControls(modal);
        
        // 全屏切换
        this._setupFullscreenControls(modal, resetZoom);
        
        // 导航控制
        this._setupNavigationControls(modal, currentPhotos, currentIndex);
        
        // 触摸滑动
        this._setupTouchGestures(modal, currentPhotos, currentIndex);
        
        // 在模态框上存储关键函数供其他事件使用
        modal._handlers = {
            keyHandler,
            zoomImage,
            resetZoom,
            closeModal: () => this._closeModal(modal, keyHandler)
        };
    }
    
    /**
     * 设置关闭事件
     * @private
     * @param {HTMLElement} modal 模态框元素
     */
    _setupCloseEvents(modal) {
        // 添加关闭按钮事件
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this._closeModal(modal, modal._handlers?.keyHandler);
            });
        }
        
        // 点击模态窗口背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this._closeModal(modal, modal._handlers?.keyHandler);
            }
        });
    }
    
    /**
     * 设置键盘事件
     * @private
     * @param {HTMLElement} modal 模态框元素
     * @param {Array} currentPhotos 当前模块所有照片
     * @param {number} currentIndex 当前照片在数组中的索引
     * @returns {Function} 键盘事件处理函数
     */
    _setupKeyboardEvents(modal, currentPhotos, currentIndex) {
        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                this._closeModal(modal, keyHandler);
            } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
                // 左箭头 - 前一张
                this._navigateToPhoto(currentPhotos, currentIndex - 1, modal, keyHandler);
            } else if (e.key === 'ArrowRight' && currentIndex < currentPhotos.length - 1) {
                // 右箭头 - 后一张
                this._navigateToPhoto(currentPhotos, currentIndex + 1, modal, keyHandler);
            } else if (e.key === '+' || e.key === '=') {
                // 放大
                modal._handlers?.zoomImage(0.1);
            } else if (e.key === '-') {
                // 缩小
                modal._handlers?.zoomImage(-0.1);
            } else if (e.key === '0') {
                // 重置缩放
                modal._handlers?.resetZoom();
            }
        };
        
        document.addEventListener('keydown', keyHandler);
        return keyHandler;
    }
    
    /**
     * 设置图片加载和错误处理
     * @private
     * @param {HTMLElement} modal 模态框元素
     */
    _setupImageHandlers(modal) {
        const detailImg = modal.querySelector('.photo-detail-img');
        const loader = modal.querySelector('.photo-detail-loader');
        
        if (!detailImg || !loader) return;
        
        detailImg.onload = function() {
            if (loader) {
                loader.style.display = 'none';
            }
            // 添加加载完成类，触发淡入动画
            detailImg.classList.add('loaded');
            
            // 调整图片包装器尺寸以适应图片
            const imgWrapper = detailImg.closest('.photo-detail-image-wrapper');
            if (imgWrapper) {
                const imgRatio = detailImg.naturalHeight / detailImg.naturalWidth;
                
                // 如果是特别高的图片，调整布局方向
                if (imgRatio > 1.5 && window.innerWidth > 768) {
                    const container = modal.querySelector('.photo-detail-container');
                    if (container && !modal.classList.contains('fullscreen')) {
                        container.style.flexDirection = 'row-reverse';
                    }
                }
            }
        };
        
        detailImg.onerror = function() {
            if (loader) {
                loader.textContent = '图片加载失败';
                loader.classList.add('load-error');
            }
            // 显示错误状态
            detailImg.classList.add('error');
            const imgWrapper = detailImg.closest('.photo-detail-image-wrapper');
            if (imgWrapper) {
                imgWrapper.classList.add('load-error');
            }
        };
    }
    
    /**
     * 设置缩放控制
     * @private
     * @param {HTMLElement} modal 模态框元素
     * @returns {Object} 包含缩放相关函数的对象
     */
    _setupZoomControls(modal) {
        const detailImg = modal.querySelector('.photo-detail-img');
        const zoomInBtn = modal.querySelector('.zoom-in-btn');
        const zoomOutBtn = modal.querySelector('.zoom-out-btn');
        const resetZoomBtn = modal.querySelector('.reset-zoom-btn');
        
        // 当图片或按钮不存在时直接返回空函数
        if (!detailImg || !zoomInBtn || !zoomOutBtn || !resetZoomBtn) {
            return {
                zoomImage: () => {},
                resetZoom: () => {}
            };
        }
        
        let currentZoom = 1;
        const MIN_ZOOM = 0.5;
        const MAX_ZOOM = 3;
        
        // 缩放函数
        const zoomImage = (delta) => {
            currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom + delta));
            detailImg.style.transform = `scale(${currentZoom})`;
            
            // 更新按钮状态
            zoomInBtn.disabled = currentZoom >= MAX_ZOOM;
            zoomOutBtn.disabled = currentZoom <= MIN_ZOOM;
        };
        
        // 重置缩放函数
        const resetZoom = () => {
            currentZoom = 1;
            detailImg.style.transform = 'scale(1)';
            
            // 更新按钮状态
            zoomInBtn.disabled = false;
            zoomOutBtn.disabled = false;
        };
        
        // 添加按钮点击事件
        zoomInBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            zoomImage(0.1);
        });
        
        zoomOutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            zoomImage(-0.1);
        });
        
        resetZoomBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetZoom();
        });
        
        return { zoomImage, resetZoom };
    }
    
    /**
     * 设置全屏控制
     * @private
     * @param {HTMLElement} modal 模态框元素
     * @param {Function} resetZoom 重置缩放函数
     */
    _setupFullscreenControls(modal, resetZoom) {
        const fullscreenBtn = modal.querySelector('.fullscreen-btn');
        
        if (!fullscreenBtn) return;
        
        // 切换全屏模式
        const toggleFullscreen = () => {
            modal.classList.toggle('fullscreen');
            
            // 更新全屏按钮图标
            if (modal.classList.contains('fullscreen')) {
                fullscreenBtn.textContent = '⤧';  // 退出全屏图标
                fullscreenBtn.title = '退出全屏';
            } else {
                fullscreenBtn.textContent = '⬚';  // 全屏图标
                fullscreenBtn.title = '全屏查看';
            }
            
            // 重置缩放
            if (typeof resetZoom === 'function') {
                resetZoom();
            }
        };
        
        // 按钮点击事件
        fullscreenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFullscreen();
        });
        
        // 添加图片双击全屏切换
        const imgWrapper = modal.querySelector('.photo-detail-image-wrapper');
        if (imgWrapper) {
            imgWrapper.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                toggleFullscreen();
            });
        }
    }
    
    /**
     * 设置导航控制
     * @private
     * @param {HTMLElement} modal 模态框元素
     * @param {Array} currentPhotos 当前模块所有照片
     * @param {number} currentIndex 当前照片在数组中的索引
     */
    _setupNavigationControls(modal, currentPhotos, currentIndex) {
        const prevBtn = modal.querySelector('.prev-btn');
        const nextBtn = modal.querySelector('.next-btn');
        
        if (!prevBtn || !nextBtn) return;
        
        // 前一张按钮
        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentIndex > 0) {
                    this._navigateToPhoto(currentPhotos, currentIndex - 1, modal, modal._handlers?.keyHandler);
                }
            });
        }
        
        // 后一张按钮
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentIndex < currentPhotos.length - 1) {
                    this._navigateToPhoto(currentPhotos, currentIndex + 1, modal, modal._handlers?.keyHandler);
                }
            });
        }
    }
    
    /**
     * 设置触摸手势
     * @private
     * @param {HTMLElement} modal 模态框元素
     * @param {Array} currentPhotos 当前模块所有照片
     * @param {number} currentIndex 当前照片在数组中的索引
     */
    _setupTouchGestures(modal, currentPhotos, currentIndex) {
        let touchStartX = 0;
        let touchEndX = 0;
        
        // 处理滑动手势
        const handleSwipe = () => {
            const SWIPE_THRESHOLD = 100; // 滑动阈值
            
            if (touchEndX - touchStartX > SWIPE_THRESHOLD) {
                // 向右滑动 - 前一张
                if (currentIndex > 0) {
                    this._navigateToPhoto(currentPhotos, currentIndex - 1, modal, modal._handlers?.keyHandler);
                }
            } else if (touchStartX - touchEndX > SWIPE_THRESHOLD) {
                // 向左滑动 - 后一张
                if (currentIndex < currentPhotos.length - 1) {
                    this._navigateToPhoto(currentPhotos, currentIndex + 1, modal, modal._handlers?.keyHandler);
                }
            }
        };
        
        modal.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });
        
        modal.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        });
    }
    
    /**
     * 导航到指定照片
     * @private
     * @param {Array} photos 照片数组
     * @param {number} index 目标照片索引
     * @param {HTMLElement} modal 当前模态框
     * @param {Function} keyHandler 键盘事件处理函数
     */
    _navigateToPhoto(photos, index, modal, keyHandler) {
        if (index < 0 || index >= photos.length) return;
        
        // 关闭当前模态框
        this._closeModal(modal, keyHandler);
        
        // 短暂延迟后打开新照片
        setTimeout(() => {
            this.openPhotoDetail(photos[index], photos, index);
        }, 300);
    }
    
    /**
     * 关闭模态窗口
     * @private
     * @param {HTMLElement} modal 模态框元素
     * @param {Function} keyHandler 键盘事件处理函数
     */
    _closeModal(modal, keyHandler) {
        // 添加关闭动画
        modal.style.animation = 'fadeOut 0.3s forwards';
        
        // 移除键盘事件监听
        if (typeof keyHandler === 'function') {
            document.removeEventListener('keydown', keyHandler);
        }
        
        // 动画结束后移除元素
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
            // 恢复滚动
            document.body.style.overflow = '';
        }, 300);
    }
}

// 创建单例实例
const photoDetailManager = new PhotoDetailManager();

// 导出照片详情管理器
export { photoDetailManager }; 