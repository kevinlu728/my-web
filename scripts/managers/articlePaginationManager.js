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

import { throttle } from '../utils/article-utils.js';
import { initializeLazyLoading } from '../components/articleRenderer.js';
import { imageLazyLoader } from '../utils/image-lazy-loader.js';
import { updateLoadMoreStatus } from '../utils/article-ui.js';
import tableOfContents from '../components/tableOfContents.js';
import config from '../config/config.js';
import { articleCacheManager } from './articleCacheManager.js';
import logger from '../utils/logger.js';
import { showLoadingSpinner } from '../utils/utils.js';

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
        this.handleWindowResize = this.handleWindowResize.bind(this);
        
        // 添加窗口尺寸变化监听
        window.addEventListener('resize', this.handleWindowResize);
    }

    /**
     * 检测滚动位置是否接近底部 - 适应不同滚动容器
     * @private
     * @returns {boolean} 是否应该触发加载
     */
    _shouldTriggerLoad() {
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
        
        // 调试日志
        if (config.debug && (isAtBottom || isNearPageBottom || isContainerNearOrInView)) {
            logger.info('增强滚动检测:', {
                '滚动百分比': scrollPercentage.toFixed(2) + '%',
                '到达底部': isAtBottom,
                '容器可见或接近': isContainerNearOrInView,
                '接近底部': isNearPageBottom,
                '容器位置': `顶部${containerRect.top.toFixed(0)}px, 底部${containerRect.bottom.toFixed(0)}px`,
                '视口高度': viewportHeight,
                '内容总高度': totalHeight,
                '当前滚动位置': scrollBottom
            });
        }
        
        // 综合多个条件判断是否应该触发加载
        return isAtBottom || (isNearPageBottom && isContainerNearOrInView);
    }

    /**
     * 设置文章滚动监听以加载更多内容
     */
    setupScrollListener() {
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

        // 获取正确的滚动容器
        const pageType = document.body.classList.contains('article-page') ? 'article-page' : 'home-page';
        
        // 根据页面类型确定滚动容器
        if (pageType === 'article-page') {
            // 在博客页面检查是否使用自定义滚动区域
            if (window.innerWidth <= 768) {
                // 小屏幕使用主内容区域
                this.scrollContainer = document.querySelector('.blog-content');
            } else {
                // 大屏幕使用右侧栏
                this.scrollContainer = document.querySelector('.blog-content .right-column');
            }
        }
        
        // 如果没有找到特定的滚动容器，使用window作为后备
        if (!this.scrollContainer) {
            this.scrollContainer = window;
        }
        
        logger.info('使用滚动容器:', this.scrollContainer === window ? 'window' : this.scrollContainer.className);

        // 使用throttle函数创建节流处理函数
        this.scrollHandler = throttle(() => {
            // 基本状态检查保持不变
            if (this.isLoading || !this.hasMore || !this.nextCursor) {
                if (config.debug) {
                    logger.info('跳过加载：', 
                        this.isLoading ? '正在加载中' : 
                        !this.hasMore ? '没有更多内容' : 
                        !this.nextCursor ? 'nextCursor无效' : '未知原因');
                }
                return;
            }

            // 使用改进的方法检测是否应该触发加载
            if (this._shouldTriggerLoad()) {
                const loadMoreContainer = document.querySelector('.load-more-container');
                this.triggerLoadMoreContent(loadMoreContainer, 0);
            }
        }, 200); 
        
        // 添加滚动监听到正确的容器
        this.scrollContainer.addEventListener('scroll', this.scrollHandler);
        logger.info('滚动监听器已添加到', this.scrollContainer === window ? 'window' : '自定义容器');
        
        // 新增：主动触发初始检查，可能页面一开始就需要加载更多
        setTimeout(() => this._checkIfShouldLoadMore(), 1000);
        
        // 新增：添加定期检查机制，解决滚动事件可能不触发的问题
        this._setupPeriodicCheck();
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
     * 检查是否应该加载更多并执行加载
     * @private
     */
    _checkIfShouldLoadMore() {
        // 如果没有更多内容或正在加载，则跳过
        if (this.isLoading || this.isLoadingMore || !this.hasMore || !this.nextCursor) {
            return;
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
                this.triggerLoadMoreContent(loadMoreContainer, 0);
            }
        }
    }

    /**
     * 触发加载更多内容
     * @param {HTMLElement} loadMoreContainer - 加载更多容器元素
     * @param {number} scrollPercentage - 滚动百分比
     */
    triggerLoadMoreContent(loadMoreContainer, scrollPercentage) {
        // 记录加载开始时间，用于超时检测
        this._loadingStartTime = Date.now();
        
        // 再次检查状态有效性
        if (this.isLoading || !this.hasMore || !this.nextCursor) {
            // 如果状态无效，可能是在文章切换过程中仍触发了滚动事件
            if (!this.hasMore || !this.nextCursor) {
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
            }
            return;
        }
        
        logger.info('触发加载更多内容 - 滚动位置: ' + scrollPercentage.toFixed(2) + '%');
        
        // 防抖处理，避免重复触发
        if (this.triggerDebounceTimeout) {
            clearTimeout(this.triggerDebounceTimeout);
        }
        
        // 直接修改加载指示器显示加载中状态
        if (loadMoreContainer) {
            // 显示加载中状态
            showLoadingState();
            
            // 使用防抖延迟，避免频繁触发
            this.triggerDebounceTimeout = setTimeout(() => {
                // 再次检查状态，避免延迟期间状态改变
                if (!this.isLoading && this.hasMore) {
                    logger.info('执行加载更多内容操作');
                    
                    // 导入渲染函数，使得加载更多能够直接触发
                    import('../components/articleRenderer.js').then(({ renderNotionBlocks }) => {
                        this.loadMoreContent(renderNotionBlocks, (pageId, newBlocks, hasMore, nextCursor) => {
                            // 使用缓存管理器
                            articleCacheManager.updateArticleCache(pageId, newBlocks, hasMore, nextCursor);
                        });
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
     * 添加平滑加载的CSS样式
     */
    addSmoothLoadingStyles() {
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
     * 处理加载更多功能的配置
     * @param {HTMLElement} articleContainer - 文章容器元素
     */
    configureLoadMoreFeature(articleContainer) {
        // 添加检查确保我们有有效的nextCursor
        const hasValidMoreContent = this.hasMore === true && this.nextCursor && typeof this.nextCursor === 'string' && this.nextCursor.trim() !== '';
        
        logger.info('配置加载更多功能，hasMore=', this.hasMore, 'nextCursor=', this.nextCursor, '有效=', hasValidMoreContent);
        
        if (hasValidMoreContent) {
            // 有更多内容，设置滚动监听和平滑加载样式
            this.setupScrollListener();
            this.addSmoothLoadingStyles();
            
            // 确保加载更多容器存在且显示正确文本
            const loadMoreContainer = articleContainer.querySelector('.load-more-container');
            if (loadMoreContainer) {
                loadMoreContainer.innerHTML = '<div class="loading-text">下拉加载更多</div>';
            }
        } else {
            // 重置状态
            this.hasMore = false;
            this.nextCursor = null;
            
            logger.info('没有更多内容或nextCursor无效，更新加载指示器显示');
            const loadMoreContainer = articleContainer.querySelector('.load-more-container');
            if (loadMoreContainer) {
                loadMoreContainer.innerHTML = '<div class="no-more">没有更多内容</div>';
            }
            
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
    }

    /**
     * 清理加载更多状态
     */
    clearLoadMoreState() {
        this.hasMore = false;
        this.nextCursor = null;
        this.isLoadingMore = false;
        
        // 更新加载更多容器的内容，但不移除它
        const loadMoreContainer = document.querySelector('.load-more-container');
        if (loadMoreContainer) {
            loadMoreContainer.innerHTML = '<div class="no-more">没有更多内容</div>';
        }
        
        // 确保移除滚动监听器
        if (this.scrollHandler) {
            if (this.scrollContainer) {
                this.scrollContainer.removeEventListener('scroll', this.scrollHandler);
            } else {
                window.removeEventListener('scroll', this.scrollHandler);
            }
            this.scrollHandler = null;
        }
        
        // 不要重置滚动容器引用，因为可能还需要在同一页面中使用
        
        logger.info('已更新加载更多状态：没有更多内容');
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
     * 渲染新加载的内容
     * @param {Array} newBlocks - 新加载的内容块
     * @param {Function} renderNotionBlocks - 渲染函数
     * @returns {boolean} 是否成功渲染
     */
    renderMoreContent(newBlocks, renderNotionBlocks) {
        if (!newBlocks || newBlocks.length === 0) return false;
        
        // 在渲染前最后一次检查请求标识符
        const currentArticleBody = document.querySelector(`.article-body[data-article-id="${this.currentPageId}"]`);
        
        // 如果找不到当前文章的正文容器，不进行渲染
        if (!currentArticleBody) {
            logger.warn('未找到当前文章容器，取消渲染');
            return false;
        }
        
        // 保存目录元素引用，确保它不会被销毁
        const tocElement = document.querySelector('.article-toc');
        const isTocCollapsed = tocElement ? tocElement.classList.contains('collapsed') : false;
        const isTocVisible = tocElement ? tocElement.classList.contains('visible') : false;
        
        logger.info('保存目录状态:', {
            存在: !!tocElement,
            已折叠: isTocCollapsed,
            移动设备可见: isTocVisible
        });
        
        // 渲染新内容
        const newContent = renderNotionBlocks(newBlocks);
        const articleBody = document.querySelector('.article-body');
        if (articleBody) {
            // 添加新内容前保存滚动位置
            const scrollPos = window.scrollY;
            
            // 添加新内容
            articleBody.insertAdjacentHTML('beforeend', newContent);
            
            // 处理新加载内容中的图片和其他懒加载内容
            imageLazyLoader.processImages(articleBody);
            initializeLazyLoading(articleBody);
            
            // 检查新内容中是否有标题元素
            const hasNewHeadings = newBlocks.some(block => 
                block.type === 'heading_1' || 
                block.type === 'heading_2' || 
                block.type === 'heading_3'
            );
            
            // 如果有新标题，则需要更新目录
            if (hasNewHeadings) {
                logger.info('检测到新的标题元素，使用轻量方式更新目录导航');
                
                // 使用新的不销毁容器的方法更新目录内容
                const updateResult = tableOfContents.updateContent();
                logger.info('目录更新结果:', updateResult);
                
                // 确保目录状态正确
                if (tocElement) {
                    if (isTocCollapsed) {
                        tocElement.classList.add('collapsed');
                    } else {
                        tocElement.classList.remove('collapsed');
                    }
                    
                    if (isTocVisible) {
                        tocElement.classList.add('visible');
                    } else {
                        tocElement.classList.remove('visible');
                    }
                }
            }
            
            // 防止页面因新内容导致的滚动位置变化
            window.scrollTo({
                top: scrollPos,
                behavior: 'auto'
            });
            
            return true;
        }
        
        return false;
    }

    /**
     * 加载更多内容
     * @param {Function} renderNotionBlocks - 渲染函数
     * @param {Function} updateCacheCallback - 更新缓存的回调函数
     * @returns {Promise<boolean>} 是否成功加载更多内容
     */
    async loadMoreContent(renderNotionBlocks, updateCacheCallback) {
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
                updateCacheCallback(this.currentPageId, newBlocks, this.hasMore, this.nextCursor);
            }
            
            // 渲染新内容
            const renderResult = this.renderMoreContent(newBlocks, renderNotionBlocks);

            // 如果没有更多内容，确保显示提示
            if (!this.hasMore) {
                logger.info('已加载所有内容，更新状态显示');
                // 先更新UI状态以显示"没有更多内容"
                updateLoadMoreStatus(false, false);
            } else {
                // 还有更多内容，更新状态
                updateLoadMoreStatus(false, true);
            }

            // 完成后清除超时
            clearTimeout(loadMoreTimeout);
            this.isLoadingMore = false;
            return renderResult;
        } catch (error) {
            logger.error('加载更多内容失败:', error);
            // 确保在错误情况下也重置状态
            clearTimeout(loadMoreTimeout);
            this.isLoadingMore = false;
            return false;
        }
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

    /**
     * 处理窗口尺寸变化事件
     */
    handleWindowResize() {
        // 只有在博客页面才重新应用滚动行为
        if (this.currentPageId && this.hasMore && this.nextCursor) {
            // 尺寸变化可能导致滚动容器变化，需要重新设置监听器
            logger.info('窗口尺寸变化，重新设置滚动监听');
            this.setupScrollListener();
        }
    }
}

// 导出单例实例
export const articlePaginationManager = new ArticlePaginationManager();

// 显示加载状态
function showLoadingState() {
    const loadMoreContainer = document.querySelector('.load-more-container');
    if (!loadMoreContainer) return;
    
    // 清除容器内容，避免加载指示器重复添加
    loadMoreContainer.innerHTML = '';
    
    showLoadingSpinner('加载中...', loadMoreContainer, {
        containerClass: 'loading-container'
    });
} 