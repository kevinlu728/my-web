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
import lifecycleManager from '../utils/lifecycleManager.js';
import notionAPIService from '../services/notionAPIService.js';
import { processPhotoListData } from '../utils/photo-utils.js';

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
        this._handleScroll = this._handleScroll.bind(this);
        this._handleWindowResize = this._handleWindowResize.bind(this);
        
        // 添加窗口尺寸变化监听
        window.addEventListener('resize', this._handleWindowResize);

        // 注册清理函数
        lifecycleManager.registerCleanup('photoPaginationManager', this.cleanup.bind(this));
    }

    /**
     * 初始化照片分页
     * @param {Array} photos 所有照片数据
     * @param {number} photosPerPage 每页照片数量
     * @param {Function} onLoadMore 加载更多的回调函数
     */
    initialize(photos, photosPerPage = 9, onLoadMore = null) {
        logger.info('初始化照片分页, 照片总数:', photos ? photos.length : 0);
        
        // 设置基础属性
        this.allPhotos = photos || [];
        this.filteredPhotos = [...this.allPhotos]; // 初始时复制所有照片到过滤列表
        this.photosPerPage = photosPerPage;
        this.currentPage = 1;
        this.isLoading = false;
        this.onLoadMore = onLoadMore; // 保存回调函数
        
        logger.debug(`照片分页管理器初始化完成: 总照片数=${this.allPhotos.length}, 过滤后照片数=${this.filteredPhotos.length}`);
        
        // 添加平滑加载过渡效果
        this._addSmoothLoadingStyles();
        
        // 设置滚动监听
        this._setupScrollListener();
        
        return {
            hasMore: this.hasMorePhotos(),
            photosToShow: this.getPhotosForCurrentPage()
        };
    }

    /** 
     * 添加平滑加载过渡样式
     */
    _addSmoothLoadingStyles() {
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
    _filterPhotosByModule() {
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
    _setupScrollListener() {
        // 移除可能已存在的滚动监听
        if (this.scrollHandler) {
            if (this.scrollContainer) {
                this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
            } else {
                window.removeEventListener('scroll', this.scrollHandler);
            }
        }

        // 检查是否使用自定义滚动区域
        if (window.innerWidth <= 768) {
            // 小屏幕使用主内容区域
            this.scrollContainer = document.querySelector('.life-content');
        } else {
            // 大屏幕使用右侧栏
            this.scrollContainer = document.querySelector('.life-content .right-column');
        }
        
        if (!this.scrollContainer) {
            logger.warn('未找到滚动容器，将使用window作为滚动容器');
            this.scrollContainer = window;
        }
        
        // 简化滚动处理函数，减少节流延迟
        this.scrollHandler = throttle(this._handleScroll, 100);
        
        // 添加滚动监听
        this.scrollContainer.addEventListener('scroll', this.scrollHandler);
        
        // 初始检查，确保短内容页面也能加载更多
        setTimeout(() => this._handleScroll(), 500);
    }

    /**
     * 处理滚动事件
     */
    _handleScroll() {  
        if (this._shouldTriggerLoad()) {
            const loadMoreContainer = document.querySelector('.load-more-container');
            this._triggerLoadMore(loadMoreContainer, 0);
        }
    }

    /**
     * 处理窗口尺寸变化事件
     */
    _handleWindowResize() {
        // 窗口尺寸变化后重新设置滚动监听
        // logger.debug('窗口尺寸变化，重新设置滚动监听');  //日志太多，注释掉
        this._setupScrollListener();
    }

    /**
     * 检测滚动位置是否接近底部 - 适应不同滚动容器
     * @returns {boolean} 是否应该触发加载
     */
    _shouldTriggerLoad() {
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
     * 触发加载更多内容，在真正加载更多内容之前做一些准备工作
     * @param {HTMLElement} loadMoreContainer - 加载更多容器元素
     * @param {number} scrollPercentage - 滚动百分比
     */
    _triggerLoadMore(loadMoreContainer, scrollPercentage) {
        // 记录加载开始时间，用于超时检测
        this._loadingStartTime = Date.now();
        
        if (!this.hasMorePhotos) {
            // 更新UI显示没有更多内容
            if (loadMoreContainer) {
                loadMoreContainer.innerHTML = '<div class="no-more">没有更多内容</div>';
            }
            // 移除滚动监听
            if (this.scrollHandler) {
                if (this.scrollContainer) {
                    this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
                } else {
                    window.removeEventListener('scroll', this.scrollHandler);
                }
                this.scrollHandler = null;
            }
            return;
        }
        
        logger.info('触发加载更多内容 - 滚动位置: ' + scrollPercentage.toFixed(2) + '%');
        
        // 防抖处理，避免重复触发
        if (this.triggerDebounceTimeout) {
            clearTimeout(this.triggerDebounceTimeout);
        }
        
        if (loadMoreContainer) {
            // 使用防抖延迟，避免频繁触发
            this.triggerDebounceTimeout = setTimeout(() => {
                // 再次检查状态，避免延迟期间状态改变
                if (!this.isLoading && this.hasMorePhotos()) {
                    logger.info('执行加载更多照片操作');

                    // 使用回调函数通知外部（照片墙管理器），照片墙管理器会再次调用下面的loadMorePhotos方法，获取新照片。
                    if (typeof this.onLoadMore === 'function') {
                        this.onLoadMore();
                    }
                    
                    // 清除触发状态
                    this.triggerDebounceTimeout = null;
                } else {
                    if (this.hasMorePhotos()) {
                        loadMoreContainer.innerHTML = '<div class="loading-text">下拉加载更多</div>';
                    } else {
                        loadMoreContainer.innerHTML = '<div class="no-more">没有更多照片</div>';
                    }
                }
            }, 300); // 300毫秒的防抖延迟
        }
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
        this.updateLoadMoreContainer(true);
        
        try {
            // 检查是否有分页信息
            const hasApiPagination = this.photoManager && 
                                    this.photoManager.paginationInfo && 
                                    this.photoManager.paginationInfo.hasMore;
            
            let newPhotos = [];
            
            // 如果有下一页且有游标，则使用API加载
            if (hasApiPagination && this.photoManager.paginationInfo.nextCursor) {
                logger.info('使用API加载更多照片，游标:', this.photoManager.paginationInfo.nextCursor);
                
                const response = await notionAPIService.getPhotos({
                    lifeDatabaseId: this.photoManager.currentDatabaseId,
                    startCursor: this.photoManager.paginationInfo.nextCursor,
                    pageSize: this.photosPerPage,
                    sorts: [{ 
                        property: "Photo Date", 
                        direction: "descending" 
                    }]
                });
                
                if (response && response.photos && response.photos.length > 0) {
                    // 处理API返回的照片数据，使用照片工具中的统一处理函数
                    const processedPhotos = processPhotoListData(response.photos);
                    newPhotos = processedPhotos;
                    
                    // 更新分页信息
                    this.photoManager.paginationInfo.hasMore = response.hasMore;
                    this.photoManager.paginationInfo.nextCursor = response.nextCursor;
                    
                    // 添加到总照片集合中
                    this.photoManager.photos = [...this.photoManager.photos, ...newPhotos];
                    
                    // 如果有过滤，也更新过滤后的照片集合
                    if (this.currentFilter) {
                        // 应用同样的过滤规则
                        const filteredNewPhotos = this.applyFilter(newPhotos, this.currentFilter);
                        this.filteredPhotos = [...this.filteredPhotos, ...filteredNewPhotos];
                    } else {
                        this.filteredPhotos = [...this.filteredPhotos, ...newPhotos];
                    }
                    
                    logger.info(`从API加载了${newPhotos.length}张新照片，更新游标:`, response.nextCursor);
                }
            } else {
                // 如果没有API分页信息或游标，回退到原来的本地分页方式
                logger.info('使用本地分页加载更多照片');
                
                // 先获取当前页码对应的照片
                const nextPage = this.currentPage + 1;
                const startIndex = (nextPage - 1) * this.photosPerPage;
                const endIndex = nextPage * this.photosPerPage;
                newPhotos = this.filteredPhotos.slice(startIndex, endIndex);
                
                logger.info(`使用本地分页：第${nextPage}页，起始索引=${startIndex}，结束索引=${endIndex}，照片数=${newPhotos.length}`);
            }
            
            // 仅在成功获取到照片后才增加页码
            if (newPhotos && newPhotos.length > 0) {
                this.currentPage++;
                logger.info(`成功加载第${this.currentPage}页，共${newPhotos.length}张新照片`);
                
                this.isLoading = false;
                return newPhotos;
            } else {
                logger.warn(`未找到更多照片，保持在第${this.currentPage}页`);
                this.isLoading = false;
                this.updateLoadMoreContainer(false);
                return [];
            }
        } catch (error) {
            logger.error('加载更多照片失败:', error);
            this.isLoading = false;
            this.updateLoadMoreContainer(false, true);
            return [];
        }
    }

    /**
     * 检查是否还有更多照片可加载
     * @returns {boolean} 是否有更多照片
     */
    hasMorePhotos() {
        // 首先检查API分页信息
        if (this.photoManager && 
            this.photoManager.paginationInfo && 
            this.photoManager.paginationInfo.hasMore) {
            return true;
        }
        
        // 然后检查本地分页
        const nextPage = this.currentPage + 1;
        const startIndex = (nextPage - 1) * this.photosPerPage;
        
        return startIndex < this.filteredPhotos.length;
    }

    /**
     * 获取当前页的照片
     * @returns {Array} 当前页照片数组
     */
    getPhotosForCurrentPage() {
        // 安全检查
        if (!this.filteredPhotos || this.filteredPhotos.length === 0) {
            logger.warn('无照片数据可供渲染');
            return [];
        }
        
        const startIndex = 0;
        const endIndex = this.currentPage * this.photosPerPage;
        
        logger.debug(`获取当前页照片: startIndex=${startIndex}, endIndex=${endIndex}, 总数=${this.filteredPhotos.length}`);
        
        // 返回从开始到当前页的所有照片（用于初次渲染，显示当前页之前的所有照片）
        const result = this.filteredPhotos.slice(startIndex, endIndex);
        logger.debug(`返回了 ${result.length} 张照片用于渲染`);
        
        return result;
    }

    /**
     * 获取加载更多容器
     * 关键：直接从右侧栏获取，而非从照片墙容器
     */
    getLoadMoreContainer() {
        // 先尝试获取右侧栏中的加载更多容器
        const rightColumn = document.querySelector('.life-content .right-column');
        if (rightColumn) {
            let container = rightColumn.querySelector('.load-more-container');
            if (container) {
                return container;
            }
        }
        
        // 如果找不到，返回null，由调用者处理
        return null;
    }

    /**
     * 更新加载更多容器状态
     */
    updateLoadMoreContainer(isLoading, hasError = false) {
        // 使用专门的方法获取加载更多容器
        const loadMoreContainer = this.getLoadMoreContainer();
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
            loadMoreContainer.innerHTML = '<div class="no-more">没有更多照片</div>';
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
            // 因为照片墙和加载更多容器的位置存在冲突且无法解决，所以尽量减少加载更多容器的显示。
            // 正常状态，有更多内容可加载
            // showLoadingSpinner('下拉加载更多', loadMoreContainer, {
            //     containerClass: 'loading-container'
            // });
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
        this.updateLoadMoreContainer(false);
        
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