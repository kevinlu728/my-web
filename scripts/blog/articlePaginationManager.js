/**
 * @file articlePaginationManager.js
 * @description 文章分页管理器，负责处理文章的"加载更多"功能
 * @version 1.0.0
 * @created 2024-03-26
 * 
 * 该模块负责：
 * - 监听滚动事件以触发加载更多
 * - 处理分页加载请求
 * - 渲染新加载的内容
 * - 管理加载状态和UI反馈
 */


import { renderMoreBlocks } from './articleRenderer.js';
import { articleCacheManager } from './articleCacheManager.js';   
import { updateLoadMoreStatus } from '../utils/article-utils.js';
import { throttle, showLoadingSpinner } from '../utils/common-utils.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';

class ArticlePaginationManager {
    constructor() {
        // 分页状态
        this.hasMore = false;
        this.nextCursor = null;
        this.currentPageId = null;
        this.loadedBlocks = [];
        
        // 加载状态
        this.isLoading = false;
        this.isLoadingMore = false;
        this.requestIdentifier = 0;
        
        // 滚动监听
        this.scrollHandler = null;
        this.scrollContainer = null;
        
        // 防抖/节流相关
        this.triggerDebounceTimeout = null;
        
        // 绑定方法的this上下文
        this._handleWindowResize = this._handleWindowResize.bind(this);
        
        // 添加窗口尺寸变化监听
        window.addEventListener('resize', this._handleWindowResize);
    }

    /**
     * 处理加载更多功能的配置
     * @param {HTMLElement} articleContainer - 文章容器元素
     */
    configureLoadMoreFeature(articleContainer) {
        // 添加检查确保我们有有效的nextCursor
        const hasValidMoreContent = this.hasMore === true && this.nextCursor && typeof this.nextCursor === 'string' && this.nextCursor.trim() !== '';
        
        logger.info('配置加载更多功能，hasMore=', this.hasMore, 'nextCursor=', this.nextCursor, '有效=', hasValidMoreContent);
        
        if (hasValidMoreContent) {
            // 有更多内容，设置滚动监听和平滑加载样式
            this._setupScrollListener();
            this._addSmoothLoadingStyles();
        } else {
            // 重置状态
            this.hasMore = false;
            this.nextCursor = null;
            
            // 确保移除滚动监听器
            if (this.scrollHandler) {
                if (this.scrollContainer) {
                    this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
                } else {
                    window.removeEventListener('scroll', this.scrollHandler);
                }
                this.scrollHandler = null;
            }
        }
        this.updateLoadMoreContainer(this.isLoading, this.hasMore);
    }

    /**
     * 添加平滑加载的CSS样式
     */
    _addSmoothLoadingStyles() {
        if (!document.getElementById('smooth-loader-style')) {
            const style = document.createElement('style');
            style.id = 'smooth-loader-style';
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
     * 设置文章滚动监听以加载更多内容
     */
    _setupScrollListener() {
        logger.info('设置滚动监听以加载更多内容，hasMore=', this.hasMore, 'nextCursor=', this.nextCursor);
        
        // 如果没有更多内容或nextCursor无效，直接返回不设置监听
        if (!this.hasMore || !this.nextCursor) {
            logger.info('没有更多内容或nextCursor无效，跳过设置滚动监听');
            return;
        }
        
        // 先移除可能存在的旧监听器
        if (this.scrollHandler) {
            if (this.scrollContainer) {
                this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
            } else {
                window.removeEventListener('scroll', this.scrollHandler);
            }
            this.scrollHandler = null;
        }

        // 在博客页面检查是否使用自定义滚动区域
        if (window.innerWidth <= 768) {
            // 小屏幕使用主内容区域
            this.scrollContainer = document.querySelector('.blog-content');
        } else {
            // 大屏幕使用右侧栏
            this.scrollContainer = document.querySelector('.blog-content .right-column');
        }

        this.scrollContainer = document.querySelector('.blog-content .right-column');
        
        // 如果没有找到特定的滚动容器，使用window作为后备
        if (!this.scrollContainer) {
            logger.warn('未找到滚动容器，将使用window作为滚动容器');
            this.scrollContainer = window;
        }

        // 使用throttle函数创建节流处理函数
        this.scrollHandler = throttle(() => {this._handleScroll()}, 200); 
        
        // 添加滚动监听到正确的容器
        this.scrollContainer.addEventListener('scroll', this.scrollHandler);
        
        // 新增：主动触发初始检查，可能页面一开始就需要加载更多
        setTimeout(() => this._checkIfShouldLoadMore(), 1000);
        
        // 新增：添加定期检查机制，解决滚动事件可能不触发的问题
        this._setupPeriodicCheck();
    }

    _handleScroll() {
        // 使用改进的方法检测是否应该触发加载
        if (this._shouldTriggerLoad()) {
            const loadMoreContainer = document.querySelector('.load-more-container');
            this._triggerLoadMore(loadMoreContainer);
        }
    }

    /**
     * 处理窗口尺寸变化事件
     */
    _handleWindowResize() {
        // 只有在博客页面才重新应用滚动行为
        if (this.currentPageId && this.hasMore && this.nextCursor) {
            // 尺寸变化可能导致滚动容器变化，需要重新设置监听器
            logger.debug('窗口尺寸变化，重新设置滚动监听');
            this._setupScrollListener();
        }
    }

    /**
     * 检测滚动位置是否接近底部 - 适应不同滚动容器
     * @private
     * @returns {boolean} 是否应该触发加载
     */
    _shouldTriggerLoad() {
        // 如果正在加载或没有更多数据，则不应该加载
        if (this.isLoading || !this.hasMore || !this.nextCursor) {
            return;
        }

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
        let viewportHeight;
        let scrollBottom;
        let totalHeight;
        
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
     * 检查是否应该加载更多并执行加载
     * @private
     */
    _checkIfShouldLoadMore() {
        // 先检查是否有资格加载更多，例如是否有下一个游标和当前文章ID等
        if (!this.hasMore || !this.nextCursor || this.isLoadingMore) {
            logger.debug('⏸️ [分页检查] 目前不需要加载更多内容');
            return false;
        }
        
        // 确保加载状态没有错误地保持锁定超过预期时间
        if (this.isLoadingMore && Date.now() - this._loadingStartTime > 15000) {
            logger.warn('检测到加载状态锁定超过15秒，强制重置状态');
            this.isLoadingMore = false;
            this.isLoading = false;
        }
        
        // 检查是否应该触发加载
        if (this._shouldTriggerLoad()) {
            const loadMoreContainer = document.querySelector('.load-more-container');
            if (loadMoreContainer) {
                this._triggerLoadMore(loadMoreContainer);
            }
        }
        
        // 条件满足，开始加载更多
        this._triggerLoadMore();
        return true;
    }

    /**
     * 设置定期检查机制，确保即使没有滚动事件也能检测到需要加载的情况
     * @private
     */
    _setupPeriodicCheck() {
        // 清除可能存在的旧定时器
        if (this._periodicCheckInterval) {
            clearInterval(this._periodicCheckInterval);
        }
        
        // 添加定期检查，每2秒检查一次是否应该加载更多
        this._periodicCheckInterval = setInterval(() => {
            this._checkIfShouldLoadMore();
        }, 2000);
        
        // 确保页面不可见时暂停检查，节省资源
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                clearInterval(this._periodicCheckInterval);
            } else {
                // 页面再次可见时，重新开始检查并立即执行一次检查
                clearInterval(this._periodicCheckInterval);
                this._checkIfShouldLoadMore();
                this._setupPeriodicCheck();
            }
        });
    }

    /**
     * 触发加载更多内容，在真正加载更多内容之前做一些准备工作
     * @param {HTMLElement} loadMoreContainer - 加载更多容器元素
     * @param {number} scrollPercentage - 滚动百分比
     */
    _triggerLoadMore(loadMoreContainer) {
        // 记录加载开始时间，用于超时检测
        this._loadingStartTime = Date.now();
        
        // 再次检查状态有效性
        if (this.isLoading || !this.hasMore || !this.nextCursor) {
            // 如果状态无效，可能是在文章切换过程中仍触发了滚动事件
            if (!this.hasMore || !this.nextCursor) {
                this.updateLoadMoreContainer(this.isLoading, this.hasMore);
                // 移除滚动监听
                if (this.scrollHandler) {
                    if (this.scrollContainer) {
                        this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
                    } else {
                        window.removeEventListener('scroll', this.scrollHandler);
                    }
                    this.scrollHandler = null;
                }
            }
            return;
        }
        
        // 防抖处理，避免重复触发
        if (this.triggerDebounceTimeout) {
            clearTimeout(this.triggerDebounceTimeout);
        }
        
        // 直接修改加载指示器显示加载中状态
        if (loadMoreContainer) {
            // 显示加载中状态
            this.updateLoadMoreContainer(true, this.hasMore);
            
            // 使用防抖延迟，避免频繁触发
            this.triggerDebounceTimeout = setTimeout(() => {
                // 再次检查状态，避免延迟期间状态改变
                if (!this.isLoading && this.hasMore) {
                    logger.info('执行加载更多内容操作');

                    this.loadMoreContent((pageId, newBlocks, hasMore, nextCursor) => {
                        // 使用缓存管理器
                        articleCacheManager.updateArticleCache(pageId, newBlocks, hasMore, nextCursor);
                    });
                    
                    // 清除触发状态
                    this.triggerDebounceTimeout = null;
                } else {
                    // 检查是否还有更多内容
                    if (this.hasMore) {
                        loadMoreContainer.innerHTML = '<div class="loading-text">下拉加载更多</div>';
                    } else {
                        loadMoreContainer.innerHTML = '<div class="no-more">没有更多内容</div>';
                    }
                }
            }, 300); // 300毫秒的防抖延迟
        }
    }

    /**
     * 加载更多内容
     * @param {Function} updateCacheCallback - 更新缓存的回调函数
     * @returns {Promise<boolean>} 是否成功加载更多内容
     */
    async loadMoreContent(updateCacheCallback) {
        // 检查是否在加载中
        if (this.isLoadingMore) {
            logger.info('⏸️ [分页跳过] 正在加载，跳过重复请求');
            return false;
        }
        
        // 保存当前请求标识符
        const requestId = this.requestIdentifier;
        const currentPageId = this.currentPageId;
        
        // 如果正在加载或没有更多内容，则不执行
        if (this.isLoadingMore || !this.hasMore) {
            logger.info('跳过加载更多: 已在加载中或没有更多内容');
            return false;
        }
        
        // 添加超时保护，确保状态不会永久卡住
        const loadMoreTimeout = setTimeout(() => {
            if (this.isLoadingMore) {
                logger.warn('加载更多超时，强制重置状态');
                this.isLoadingMore = false;
            }
        }, 10000); // 10秒超时保护
        
        this.isLoadingMore = true;
        logger.info('开始加载更多内容');
        
        try {
            const moreData = await this.fetchMoreContent();
            
            // 双重检查：确保文章ID和请求ID都匹配
            if (this.currentPageId !== currentPageId || this.requestIdentifier !== requestId) {
                logger.info('文章已切换或有更新请求，取消加载更多内容');
                this.isLoadingMore = false;
                return false;
            }
            
            if (!moreData || !moreData.blocks) {
                logger.warn('没有获取到更多内容或格式错误');
                this.isLoadingMore = false;
                return false;
            }
            
            // 处理数据
            const newBlocks = this.processMoreContentData(moreData);
            
            // 更新缓存
            if (typeof updateCacheCallback === 'function') {
                logger.info(`🔄 [分页缓存] 更新缓存，${newBlocks.length}个新块，游标：${
                    this.nextCursor ? this.nextCursor.substring(0, 8) + '...' : '无'
                }`);
                updateCacheCallback(this.currentPageId, newBlocks, this.hasMore, this.nextCursor);
            }
            
            // 渲染新内容
            // 在渲染前最后一次检查请求标识符
            const currentArticleBody = document.querySelector(`.article-body[data-article-id="${this.currentPageId}"]`);
            if (!currentArticleBody) {
                logger.warn('未找到当前文章的正文容器，取消渲染');
                return false;
            }
            const renderResult = renderMoreBlocks(newBlocks);

            // 如果没有更多内容，确保显示提示
            if (!this.hasMore) {
                logger.info('✅ [分页完成] 已加载所有内容，文章完整加载');
                // 先更新UI状态以显示"没有更多内容"
                updateLoadMoreStatus(false, false);
            } else {
                // 还有更多内容，更新状态
                logger.info('📑 [分页就绪] 还有更多内容可加载');
                updateLoadMoreStatus(false, true);
            }

            // 完成后清除超时
            clearTimeout(loadMoreTimeout);
            this.isLoadingMore = false;
            return renderResult;
        } catch (error) {
            logger.error('❌ [分页错误] 加载更多内容失败:', error);
            // 确保在错误情况下也重置状态
            clearTimeout(loadMoreTimeout);
            this.isLoadingMore = false;
            return false;
        }
    }

    /**
     * 获取更多内容的数据
     * @returns {Promise<Object>} 包含更多内容的响应数据
     */
    async fetchMoreContent() {
        const apiUrl = this.buildLoadMoreApiUrl();
        
        // 检查URL是否有效
        if (!apiUrl) {
            throw new Error('无法构建有效的API URL，nextCursor可能无效');
        }
        
        logger.info('加载更多内容 URL:', apiUrl);
        
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        logger.debug('加载更多内容响应:', data);
        
        return data;
    }

    /**
     * 构建加载更多内容的API URL
     * @returns {string|null} API URL或null
     */
    buildLoadMoreApiUrl() {
        const apiBaseUrl = config.api?.baseUrl || '/api';
        
        // 严格验证nextCursor是否有效
        if (!this.nextCursor || typeof this.nextCursor !== 'string' || this.nextCursor.trim() === '') {
            logger.warn('构建API URL时nextCursor无效:', this.nextCursor);
            return null;
        }
        
        // 验证当前文章ID
        if (!this.currentPageId || typeof this.currentPageId !== 'string' || this.currentPageId.trim() === '') {
            logger.warn('构建API URL时currentPageId无效:', this.currentPageId);
            return null;
        }
        
        const cursorParam = `&cursor=${encodeURIComponent(this.nextCursor)}`;
        const url = `${apiBaseUrl}/content/${this.currentPageId}?type=article&page_size=10${cursorParam}`;
        
        logger.info('构建API URL:', url);
        return url;
    }

    /**
     * 处理新加载的内容数据
     * @param {Object} data - 从API获取的数据
     * @returns {Array|null} 新的内容块或null
     */
    processMoreContentData(data) {
        // 更新分页状态
        this.hasMore = data.hasMore;
        this.nextCursor = data.nextCursor;

        // 如果没有新的内容块，直接返回
        if (!data.blocks || data.blocks.length === 0) {
            logger.info('没有新的内容块');
            return null;
        }
        
        logger.info(`加载了 ${data.blocks.length} 个新块`);
        
        // 添加到已加载的块中
        this.loadedBlocks = this.loadedBlocks || [];
        this.loadedBlocks = this.loadedBlocks.concat(data.blocks);
        
        return data.blocks;
    }

    /**
     * 更新内部状态
     * @param {Object} params - 要更新的参数
     */
    updateState(params) {
        if (params.hasMore !== undefined) this.hasMore = params.hasMore;
        if (params.nextCursor !== undefined) this.nextCursor = params.nextCursor;
        if (params.currentPageId !== undefined) this.currentPageId = params.currentPageId;
        if (params.loadedBlocks !== undefined) this.loadedBlocks = params.loadedBlocks;
        if (params.requestIdentifier !== undefined) this.requestIdentifier = params.requestIdentifier;
    }

    /**
     * 更新加载更多容器
     * @param {boolean} isLoading 是否正在加载
     * @param {boolean} hasError 是否发生错误
     */
    updateLoadMoreContainer(isLoading, hasMore, hasError = false) {
        const loadMoreContainer = document.querySelector('.load-more-container');
        if (!loadMoreContainer) return;
        
        // 清除容器内容
        loadMoreContainer.innerHTML = '';
        
        if (isLoading) {
            // 显示加载动画和文字
            showLoadingSpinner('加载中...', loadMoreContainer, {
                containerClass: 'loading-container'
            });
        } else if (!hasMore) {
            // 没有更多内容，显示提示信息
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
                    this.loadMoreContent((pageId, newBlocks, hasMore, nextCursor) => {
                        // 使用缓存管理器
                        articleCacheManager.updateArticleCache(pageId, newBlocks, hasMore, nextCursor);
                    });
                });
            }
        } else {
            // 正常状态，有更多内容可加载
            showLoadingSpinner('下拉加载更多', loadMoreContainer, {
                containerClass: 'loading-container'
            });
        }
    }

    /**
     * 重置所有内部状态
     */
    reset() {
        this.hasMore = false;
        this.nextCursor = null;
        this.currentPageId = null;
        this.loadedBlocks = [];
        this.isLoading = false;
        this.isLoadingMore = false;
        
        // 移除滚动监听器
        if (this.scrollHandler) {
            if (this.scrollContainer) {
                this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
            } else {
                window.removeEventListener('scroll', this.scrollHandler);
            }
            this.scrollHandler = null;
        }
        
        // 移除窗口尺寸变化监听器并重新添加
        window.removeEventListener('resize', this.handleWindowResize);
        window.addEventListener('resize', this.handleWindowResize);
        
        // 重置滚动容器引用
        this.scrollContainer = null;
        
        // 新增：清除定期检查间隔
        if (this._periodicCheckInterval) {
            clearInterval(this._periodicCheckInterval);
            this._periodicCheckInterval = null;
        }
    }
    
    cleanup() {
        // 移除事件监听
        if (this.scrollHandler && this.scrollContainer) {
            this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
        }
        
        window.removeEventListener('resize', this.handleWindowResize);
        
        this.reset();
        logger.info('文章分页管理器已清理');
    }
}

// 导出单例实例
export const articlePaginationManager = new ArticlePaginationManager();