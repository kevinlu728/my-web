/**
 * @file welcomePageManager.js
 * @description 欢迎页面管理器，负责欢迎页面的显示和更新
 * @author 陆凯
 * @version 1.1.0
 * @created 2024-05-30
 * @updated 2024-06-01
 * 
 * 该模块负责欢迎页面的管理，包括：
 * - 显示欢迎页面
 * - 处理欢迎页面所需的文章数据
 * - 欢迎页面的事件处理
 * 
 * 该模块与articleManager解耦，但目前仍需引用articleManager获取文章数据
 */

import { renderWelcomePage } from './welcomePageRenderer.js';
import { contentViewManager, ViewMode, ViewEvents } from './contentViewManager.js';
import { categoryConfig } from '../config/categories.js';
import { welcomePageSkeleton } from '../utils/skeleton-loader.js';
import logger from '../utils/logger.js';
import { articleCacheManager } from './articleCacheManager.js';

// 欢迎页面缓存键
const WELCOME_PAGE_CACHE_KEY = 'welcome_page';

class WelcomePageManager {
    constructor() {
        this.categoryNameMap = categoryConfig.nameMap || {
            'Test': '测试',
            'Computer Basis': '计算机基础',
            'Data Structure and Algorithm': '数据结构和算法',
            'Programming Language': '编程语言',
            'Mobile Tech': '终端技术',
        };
        this.initialized = false;
        
        // 添加新属性
        this.cachedData = null;
    }

    /**
     * 初始化欢迎页面管理器
     * @param {Object} options 选项
     * @param {Array} options.articles 文章数据
     * @param {Function} options.getArticles 获取文章数据的函数
     * @param {Function} options.onCategorySelect 分类选择回调
     * @param {Function} options.onArticleSelect 文章选择回调
     */
    initialize(options = {}) {
        logger.info('初始化欢迎页面管理器');
        this.getArticles = options.getArticles;
        this.onCategorySelect = options.onCategorySelect;
        this.onArticleSelect = options.onArticleSelect;
        this.initialized = true;
        
        // 立即显示骨架屏，否则骨架屏显示太晚，会立即被隐藏，导致无法看到骨架屏
        welcomePageSkeleton.show(this.getWelcomePageContainer());

        // 确保有文章数据时创建缓存
        const articles = typeof this.getArticles === 'function' ? this.getArticles() : [];
        if (articles && articles.length > 0) {
            logger.info('初始化时发现文章数据，创建欢迎页面缓存');
            this.saveToCache(this.prepareWelcomeData(articles));
        }

        // 初始化后立即尝试加载缓存
        // this.showWelcomePage();
    }

    /**
     * 显示欢迎页面 - 增强的缓存版本
     * @param {Array} [articles] 可选的文章数据，如不提供则从getArticles获取
     */
    showWelcomePage(articles) {
        logger.info('显示欢迎页面');
        
        if (!this.initialized) {
            logger.warn('欢迎页面管理器尚未初始化');
            return;
        }

        // 通知视图管理器准备显示欢迎页面 - 添加的事件通信
        contentViewManager.dispatchViewEvent(ViewEvents.BEFORE_WELCOME); 
        // contentViewManager.setMode(ViewMode.LOADING);
        
        // 优先使用传入的文章数据，并保存到缓存中
        if (articles && articles.length > 0) {
            logger.info('使用传入的文章数据渲染欢迎页面并更新缓存');
            this.saveToCache(this.prepareWelcomeData(articles));
            this.renderWelcomePage(articles);

            contentViewManager.dispatchViewEvent(ViewEvents.AFTER_WELCOME);
            return;
        }
        
        // 尝试使用缓存数据
        if (this.cachedData) {
            logger.info('从缓存渲染欢迎页面');
            // 使用缓存数据渲染欢迎页面
            this.renderWelcomePageFromCache(this.cachedData);
            
            // 尝试在背景中异步刷新数据
            this.refreshDataInBackground();

            contentViewManager.dispatchViewEvent(ViewEvents.AFTER_WELCOME);
            return;
        }
        
        // 没有缓存，尝试从getArticles获取
        const freshArticles = typeof this.getArticles === 'function' ? this.getArticles() : [];
        
        if (freshArticles && freshArticles.length > 0) {
            logger.info('使用getArticles获取的数据渲染欢迎页面');
            // 保存到缓存
            this.saveToCache(this.prepareWelcomeData(freshArticles));
            this.renderWelcomePage(freshArticles);
            contentViewManager.dispatchViewEvent(ViewEvents.AFTER_WELCOME);
            return;
        }
        
        // 如果没有任何数据，显示基本欢迎页面已在方法开始时完成
        logger.info('没有可用数据，保持骨架屏');
        // 没有文章数据时，不应该保持骨架屏（否则骨架屏将不会消失），而是应该显示一个固定内容版本的欢迎页面，确保用户能看到欢迎页面。待实现

    }

    /**
     * 准备欢迎页面缓存数据
     * @param {Array} articles 完整文章数据
     * @returns {Object} 精简的欢迎页面数据
     */
    prepareWelcomeData(articles) {
        if (!articles || articles.length === 0) return null;
        
        // 提取分类数据
        const categories = Array.from(
            new Set(articles.map(article => article.category).filter(Boolean))
        );
        
        // 获取最近的5篇文章
        const recentArticles = [...articles]
            .filter(article => article.publish_date || article.created_time)
            .sort((a, b) => {
                if (a.publish_date && b.publish_date) {
                    return new Date(b.publish_date) - new Date(a.publish_date);
                }
                if (a.publish_date) return -1;
                if (b.publish_date) return 1;
                return new Date(b.created_time) - new Date(a.created_time);
            })
            .slice(0, 5)
            .map(article => ({
                id: article.id,
                title: article.title,
                publish_date: article.publish_date,
                created_time: article.created_time,
                category: article.category
            }));
            
        return {
            categories,
            recentArticles,
            timestamp: Date.now()
        };
    }

    /**
     * 从缓存加载欢迎页面数据
     * @returns {Object|null} 缓存的欢迎页面数据或null
     */
    loadFromCache() {
        try {
            logger.info('尝试从缓存加载欢迎页面数据');
            
            // 使用 articleCacheManager 获取缓存
            const cachedData = articleCacheManager.getArticleFromCache(WELCOME_PAGE_CACHE_KEY);
            
            if (!cachedData) {
                logger.info('❌ [缓存未命中] 欢迎页面缓存不存在或已过期');
                return null;
            }
            
            logger.info('✅ [缓存命中] 从缓存加载了欢迎页面数据');
            
            // 保存到实例变量
            this.cachedData = cachedData;
            
            return cachedData;
        } catch (error) {
            logger.error('从缓存加载欢迎页面数据失败:', error);
            return null;
        }
    }

    /**
     * 将欢迎页面数据保存到缓存
     * @param {Object} data 要缓存的数据
     */
    saveToCache(data) {
        try {
            if (!data) {
                logger.warn('没有数据可缓存');
                return;
            }
            
            // 使用 articleCacheManager 保存数据
            articleCacheManager.setArticleCache(WELCOME_PAGE_CACHE_KEY, data);
            
            // 保存到实例变量
            this.cachedData = data;
            
            logger.info('📦 [缓存写入] 欢迎页面数据已缓存');
        } catch (error) {
            logger.error('保存欢迎页面数据到缓存失败:', error);
        }
    }
    
    /**
     * 渲染欢迎页面
     * @param {Array} articles 文章列表
     * @param {boolean} fromCache 是否来自缓存
     */
    renderWelcomePage(articles, fromCache = false) {
        if (!articles || articles.length === 0) {
            logger.warn('没有文章数据用于渲染欢迎页面');
            return;
        }
        
        // 获取容器
        const container = this.getWelcomePageContainer();
        if (!container) {
            logger.warn('找不到文章容器元素，无法渲染欢迎页面');
            return;
        } 
        welcomePageSkeleton.hide(container);
        
        renderWelcomePage({
            articles: articles,
            onCategorySelect: this.onCategorySelect,
            onArticleSelect: this.onArticleSelect,
            categoryConfig: {
                nameMap: this.categoryNameMap,
                colors: categoryConfig.colors,
                order: categoryConfig.order
            },
            fromCache: fromCache
        });
        
        // 设置内容视图模式
        contentViewManager.setMode(ViewMode.WELCOME);
        
        logger.info(`欢迎页面渲染完成，共 ${articles.length} 篇文章${fromCache ? ' (从缓存)' : ''}`);
    }
    
    /**
     * 从缓存数据渲染欢迎页面
     * @param {Object} cachedData 缓存的欢迎页面数据
     */
    renderWelcomePageFromCache(cachedData) {
        if (!cachedData) return;
        
        const { recentArticles } = cachedData;
        
        logger.info('使用缓存数据渲染欢迎页面');
        
        // 获取容器
        const container = this.getWelcomePageContainer();
        if (!container) {
            logger.warn('找不到文章容器元素，无法渲染欢迎页面');
            return;
        }
        welcomePageSkeleton.hide(container);

        renderWelcomePage({
            articles: recentArticles,
            onCategorySelect: this.onCategorySelect,
            onArticleSelect: this.onArticleSelect,
            categoryConfig: {
                nameMap: this.categoryNameMap,
                colors: categoryConfig.colors,
                order: categoryConfig.order
            },
            fromCache: true
        });

        contentViewManager.setMode(ViewMode.WELCOME);
    }
    
    /**
     * 在后台异步刷新数据
     */
    async refreshDataInBackground() {
        if (!this.getArticles || typeof this.getArticles !== 'function') {
            return;
        }
        
        // 使用setTimeout以避免阻塞主线程
        setTimeout(async () => {
            try {
                logger.info('在后台刷新欢迎页面数据');
                
                // 获取最新文章数据
                const articles = this.getArticles();
                
                if (articles && articles.length > 0) {
                    // 保存到缓存
                    this.saveToCache(this.prepareWelcomeData(articles));
                    
                    // 如果当前显示的是欢迎页面，刷新内容
                    const container = this.getWelcomePageContainer();
                    if (container && container.querySelector('.welcome-page')) {
                        logger.info('检测到欢迎页面，刷新内容');
                        this.renderWelcomePage(articles);
                    }
                }
            } catch (error) {
                logger.error('后台刷新欢迎页面数据失败:', error);
            }
        }, 1000); // 延迟1秒执行
    }

    // 获取欢迎页面容器，欢迎页面和文章内容页面共用一个容器
    getWelcomePageContainer() {
        return document.getElementById('article-container');
    }
    
    /**
     * 检查缓存状态
     * @returns {Object} 缓存状态信息
     */
    checkCacheStatus() {
        try {
            // 使用 articleCacheManager 检查缓存
            const hasCache = articleCacheManager.hasValidCache(WELCOME_PAGE_CACHE_KEY);
            
            const status = {
                hasCache,
                hasInstanceCache: !!this.cachedData,
                cacheManagerEnabled: articleCacheManager.enabled
            };
            
            logger.info('欢迎页面缓存状态:', status);
            
            return status;
        } catch (error) {
            logger.error('检查缓存状态失败:', error);
            return { error: true };
        }
    }
}

export const welcomePageManager = new WelcomePageManager(); 