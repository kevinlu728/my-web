/**
 * @file photoPaginationManager.js
 * @description 照片分页管理器，负责处理照片的无限滚动加载功能
 * @version 1.0.0
 * @created 2024-05-27
 * 
 * 该模块负责：
 * - 监听滚动事件以触发加载更多照片
 * - 处理分页加载逻辑
 * - 管理加载状态和UI反馈
 * - 提供模拟数据分页加载
 */

import { ModuleType } from './lifeViewManager.js';
import logger from '../utils/logger.js';
import { throttle, showLoadingSpinner } from '../utils/common-utils.js';

class PhotoPaginationManager {
    constructor() {
        // 分页状态
        this.currentPage = 1;
        this.photosPerPage = 9;
        this.hasMore = true;
        this.allPhotos = [];
        this.filteredPhotos = [];
        this.currentModuleType = ModuleType.ALL;
        
        // 加载状态
        this.isLoading = false;
        
        // 滚动监听
        this.scrollHandler = null;
        this.scrollContainer = null;
        
        // 绑定方法的this上下文
        this.handleScroll = this.handleScroll.bind(this);
        this.handleWindowResize = this.handleWindowResize.bind(this);
        
        // 添加窗口尺寸变化监听
        window.addEventListener('resize', this.handleWindowResize);
    }

    /**
     * 初始化照片分页
     * @param {Array} allPhotos 所有照片数据
     * @param {string} moduleType 当前模块类型
     * @param {Function} onLoadMore 加载更多的回调函数
     */
    initialize(allPhotos, moduleType = ModuleType.ALL, onLoadMore = null) {
        logger.info('初始化照片分页, 照片总数:', allPhotos.length, '模块类型:', moduleType);
        
        this.allPhotos = allPhotos || [];
        this.currentModuleType = moduleType;
        this.currentPage = 1;
        this.isLoading = false;
        this.onLoadMore = onLoadMore; // 保存回调函数
        
        // 添加平滑加载过渡效果
        this.addSmoothLoadingStyles();
        
        // 根据模块类型筛选照片
        this.filterPhotosByModule();
        
        // 设置滚动监听
        this.setupScrollListener();
        
        return {
            hasMore: this.hasMorePhotos(),
            photosToShow: this.getPhotosForCurrentPage()
        };
    }

    /**
     * 处理窗口尺寸变化事件
     */
    handleWindowResize() {
        // 窗口尺寸变化后重新设置滚动监听
        // logger.debug('窗口尺寸变化，重新设置滚动监听');  //日志太多，注释掉
        this.setupScrollListener();
    }

    /**
     * 添加平滑加载过渡样式
     */
    addSmoothLoadingStyles() {
        if (!document.getElementById('photo-smooth-loader-style')) {
            const style = document.createElement('style');
            style.id = 'photo-smooth-loader-style';
            style.innerHTML = `
                .load-more-container {
                    transition: opacity 0.3s ease;
                }
                .loading-spinner {
                    transition: transform 0.3s ease;
                }
                .loading-text {
                    transition: opacity 0.3s ease;
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * 根据当前模块类型筛选照片
     */
    filterPhotosByModule() {
        if (this.currentModuleType === ModuleType.ALL) {
            this.filteredPhotos = [...this.allPhotos];
        } else {
            this.filteredPhotos = this.allPhotos.filter(photo => 
                photo.type === this.currentModuleType
            );
        }
        
        logger.info(`照片已筛选，当前模块: ${this.currentModuleType}, 筛选后数量: ${this.filteredPhotos.length}`);
    }

    /**
     * 设置滚动监听
     */
    setupScrollListener() {
        // 移除可能已存在的滚动监听
        if (this.scrollHandler) {
            if (this.scrollContainer) {
                this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
            } else {
                window.removeEventListener('scroll', this.scrollHandler);
            }
        }
        
        // 确定滚动容器
        this.scrollContainer = document.querySelector('.life-content .right-column');
        
        if (!this.scrollContainer) {
            logger.warn('未找到滚动容器，将使用window作为滚动容器');
            this.scrollContainer = window;
        }
        
        // 简化滚动处理函数，减少节流延迟
        this.scrollHandler = throttle(this.handleScroll, 100);
        
        // 添加滚动监听
        this.scrollContainer.addEventListener('scroll', this.scrollHandler);
        
        // 添加调试标记到DOM
        this.scrollContainer.dataset.hasScrollListener = 'true';
        
        // 初始检查，确保短内容页面也能加载更多
        setTimeout(() => this.handleScroll(), 500);
        
        // logger.info('照片分页滚动监听已设置, 容器:', this.scrollContainer === window ? 'window' : '.right-column');  //日志太多，注释掉
    }

    /**
     * 处理滚动事件
     */
    handleScroll() {
        if (this.isLoading || !this.hasMorePhotos()) {
            return;
        }
        
        if (this.shouldLoadMorePhotos()) {
            logger.info('触发加载更多照片');
            
            // 使用回调函数通知外部加载更多照片
            if (typeof this.onLoadMore === 'function') {
                this.onLoadMore();
            }
        }
    }

    /**
     * 判断是否应该加载更多照片
     * @returns {boolean} 是否应该加载更多
     */
    shouldLoadMorePhotos() {
        // 如果正在加载或没有更多照片，则不应该加载
        if (this.isLoading || !this.hasMorePhotos()) {
            return false;
        }
        
        // 获取加载容器
        const loadMoreContainer = document.querySelector('.load-more-container');
        if (!loadMoreContainer) return false;

        // 检查加载容器的可见性和内容
        if (loadMoreContainer.querySelector('.no-more')) {
            // 如果显示"没有更多内容"，则不触发加载
            return false;
        }
        
        // 检查容器是否可见
        const containerRect = loadMoreContainer.getBoundingClientRect();
        
        // 获取viewport高度和总高度
        let viewportHeight, scrollBottom, totalHeight;
        
        if (this.scrollContainer === window) {
            viewportHeight = window.innerHeight;
            scrollBottom = window.scrollY + viewportHeight;
            totalHeight = document.documentElement.scrollHeight;
        } else {
            viewportHeight = this.scrollContainer.clientHeight;
            scrollBottom = this.scrollContainer.scrollTop + viewportHeight;
            totalHeight = this.scrollContainer.scrollHeight;
        }
        
        // 改进底部检测 - 提高误差容忍度
        const isAtBottom = totalHeight - scrollBottom < 10; // 10px误差容忍
        
        // 容器是否在视图内或接近视图
        const isContainerNearOrInView = containerRect.top <= viewportHeight + 500; // 增加预加载距离
        
        // 是否接近页面底部
        const scrollPercentage = (scrollBottom / totalHeight) * 100;
        const isNearPageBottom = scrollPercentage > 85;
        
        // 综合多个条件判断是否应该触发加载
        return isAtBottom || (isNearPageBottom && isContainerNearOrInView);
    }

    /**
     * 检查是否还有更多照片
     * @returns {boolean} 是否有更多照片
     */
    hasMorePhotos() {
        return this.currentPage * this.photosPerPage < this.filteredPhotos.length;
    }

    /**
     * 获取当前页的照片
     * @returns {Array} 当前页照片数组
     */
    getPhotosForCurrentPage() {
        const startIndex = 0;
        const endIndex = this.currentPage * this.photosPerPage;
        
        // 返回从开始到当前页的所有照片（用于初次渲染，显示当前页之前的所有照片）
        return this.filteredPhotos.slice(startIndex, endIndex);
    }

    /**
     * 加载更多照片
     * @returns {Promise<Array>} 新加载的照片数组
     */
    async loadMorePhotos() {
        if (this.isLoading || !this.hasMorePhotos()) {
            logger.info('跳过加载：isLoading=', this.isLoading, 'hasMore=', this.hasMorePhotos());
            return [];
        }
        
        this.isLoading = true;
        this.updateLoaderStatus(true);
        
        try {
            // 模拟异步加载延迟
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // 先获取当前页码对应的照片
            const nextPage = this.currentPage + 1;
            const startIndex = (nextPage - 1) * this.photosPerPage;
            const endIndex = nextPage * this.photosPerPage;
            const newPhotos = this.filteredPhotos.slice(startIndex, endIndex);
            
            // 调试输出，帮助排查问题
            logger.info(`尝试加载第${nextPage}页照片：起始索引=${startIndex}，结束索引=${endIndex}，找到照片=${newPhotos.length}张`);
            logger.info(`当前筛选照片总数：${this.filteredPhotos.length}`);
            
            // 仅在成功获取到照片后才增加页码
            if (newPhotos && newPhotos.length > 0) {
                this.currentPage = nextPage;
                logger.info(`成功加载第${this.currentPage}页，共${newPhotos.length}张新照片`);
                
                // 修复：直接修改isLoading状态，但不更新UI，让调用者负责UI更新
                this.isLoading = false;
                return newPhotos;
            } else {
                logger.warn(`未找到第${nextPage}页照片，保持在第${this.currentPage}页`);
                this.isLoading = false;
                this.updateLoaderStatus(false);
                return [];
            }
        } catch (error) {
            logger.error('加载更多照片失败:', error);
            this.isLoading = false;
            this.updateLoaderStatus(false, true);
            return [];
        }
    }


    /**
     * 更新加载状态显示
     * @param {boolean} isLoading 是否正在加载
     * @param {boolean} hasError 是否发生错误
     */
    updateLoaderStatus(isLoading, hasError = false) {
        const loadMoreContainer = document.querySelector('.load-more-container');
        if (!loadMoreContainer) return;
        
        // 清除容器内容
        loadMoreContainer.innerHTML = '';
        
        if (isLoading) {
            // 显示加载动画和文字
            showLoadingSpinner('加载中...', loadMoreContainer, {
                containerClass: 'loading-container'
            });
        } else if (!this.hasMorePhotos()) {
            // 没有更多照片，显示提示信息
            loadMoreContainer.innerHTML = '<div class="no-more">没有更多内容</div>';
        } else if (hasError) {
            // 发生错误，显示重试选项
            loadMoreContainer.innerHTML = `
                <div class="error-message">加载失败</div>
                <button class="load-more-btn retry-load">重试</button>
            `;
            const retryBtn = loadMoreContainer.querySelector('.retry-load');
            if (retryBtn) {
                retryBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    // 使用回调函数通知加载更多
                    if (typeof this.onLoadMore === 'function') {
                        this.onLoadMore();
                    }
                });
            }
        } else {
            // 正常状态，有更多内容可加载
            showLoadingSpinner('向下滚动加载更多', loadMoreContainer, {
                containerClass: 'loading-container'
            });
        }
    }

    /**
     * 切换模块类型
     * @param {string} moduleType 模块类型
     */
    changeModuleType(moduleType) {
        if (this.currentModuleType === moduleType) {
            return;
        }
        
        logger.info(`切换模块类型，从 ${this.currentModuleType} 到 ${moduleType}`);
        this.currentModuleType = moduleType;
        this.currentPage = 1;
        this.isLoading = false;
        
        // 重新筛选照片
        this.filterPhotosByModule();
        
        // 更新加载状态
        this.updateLoaderStatus(false);
        
        return {
            hasMore: this.hasMorePhotos(),
            photosToShow: this.getPhotosForCurrentPage()
        };
    }

    /**
     * 重置分页状态
     */
    reset() {
        this.currentPage = 1;
        this.isLoading = false;
        this.allPhotos = [];
        this.filteredPhotos = [];
        
        // 移除滚动监听
        if (this.scrollHandler && this.scrollContainer) {
            this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
            this.scrollHandler = null;
        }
        
        logger.info('照片分页状态已重置');
    }

    /**
     * 清理资源
     */
    cleanup() {
        // 移除事件监听
        if (this.scrollHandler && this.scrollContainer) {
            this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
        }
        
        window.removeEventListener('resize', this.handleWindowResize);
        
        this.reset();
        logger.info('照片分页管理器已清理');
    }
}

// 导出单例实例
export const photoPaginationManager = new PhotoPaginationManager();