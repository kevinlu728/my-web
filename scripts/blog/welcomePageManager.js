/**
 * @file welcomePageManager.js
 * @description 欢迎页面管理器，负责欢迎页面的显示和更新
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-05-30
 * 
 * 该模块负责欢迎页面的管理，包括：
 * - 显示欢迎页面
 * - 处理欢迎页面所需的文章数据
 * - 欢迎页面的事件处理
 * 
 * 该模块与articleManager解耦，但目前仍需引用articleManager获取文章数据
 */

import { renderWelcomePage } from './welcomePageRenderer.js';
import { contentViewManager, ViewMode } from './contentViewManager.js';
import { categoryConfig } from '../config/categories.js';
import { welcomePageSkeleton } from '../utils/skeleton-loader.js';
import logger from '../utils/logger.js';

// 缓存键名常量
const WELCOME_PAGE_CACHE_KEY = 'welcome_page_data';
const WELCOME_PAGE_CACHE_TIMESTAMP_KEY = 'welcome_page_timestamp';
const CACHE_MAX_AGE = 30 * 60 * 1000; // 30分钟缓存有效期

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
        
        // 初始化后立即尝试加载缓存
        this.loadFromCache();
    }

    preloadWelcomePageData() {
        // 立即显示欢迎页面骨架屏
        logger.info('预加载欢迎页面骨架屏和欢迎页面的缓存数据');
        this.showWelcomePageSkeleton();
        this.loadFromCache();
        setTimeout(() => this.refreshDataInBackground(), 2000);
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
        
        // 首先显示骨架屏，避免白屏
        this.showWelcomePageSkeleton();
        
        // 优先使用传入的文章数据，并保存到缓存中
        if (articles && articles.length > 0) {
            logger.info('使用传入的文章数据渲染欢迎页面并更新缓存');
            this.saveToCache(this.prepareWelcomeData(articles));
            this.renderWelcomePage(articles);
            return;
        }
        
        // 尝试使用缓存数据
        if (this.cachedData) {
            logger.info('从缓存渲染欢迎页面');
            // 使用缓存数据渲染欢迎页面
            this.renderWelcomePageFromCache(this.cachedData);
            
            // 尝试在背景中异步刷新数据
            this.refreshDataInBackground();
            return;
        }
        
        // 没有缓存，尝试从getArticles获取
        const freshArticles = typeof this.getArticles === 'function' ? this.getArticles() : [];
        
        if (freshArticles && freshArticles.length > 0) {
            logger.info('使用getArticles获取的数据渲染欢迎页面');
            // 保存到缓存
            this.saveToCache(this.prepareWelcomeData(freshArticles));
            this.renderWelcomePage(freshArticles);
            return;
        }
        
        // 如果没有任何数据，显示基本欢迎页面已在方法开始时完成
        logger.info('没有可用数据，保持骨架屏');
    }
    
    /**
     * 显示欢迎页面骨架屏
     */
    showWelcomePageSkeleton() {
        const container = document.getElementById('article-container');
        if (!container) {
            logger.warn('文章容器不存在，无法显示欢迎页面骨架屏');
            return;
        }
        
        // 确保内容视图处于加载状态
        contentViewManager.setMode(ViewMode.LOADING);
        
        // 使用骨架屏加载器显示骨架屏
        welcomePageSkeleton.show(container);
        
        // 只在骨架屏显示后再标记内容
        setTimeout(() => {
            contentViewManager.markContent(container, 'welcome');
        }, 10);
    }
    
    /**
     * 渲染欢迎页面
     * @param {Array} articles 文章数据
     */
    renderWelcomePage(articles) {
        // 获取容器
        const container = document.getElementById('article-container');
        
        renderWelcomePage({
            articles: articles,
            onCategorySelect: this.onCategorySelect,
            onArticleSelect: this.onArticleSelect,
            categoryConfig: {
                nameMap: this.categoryNameMap,
                colors: categoryConfig.colors,
                order: categoryConfig.order
            }
        });
        
        // 隐藏骨架屏
        if (container) {
            welcomePageSkeleton.hide(container);
            contentViewManager.markContent(container, 'welcome');
            contentViewManager.setMode(ViewMode.WELCOME);
        }
    }
    
    /**
     * 确保有文章数据并显示欢迎页面
     * @param {Function} loadArticles 加载文章的函数
     * @returns {Promise<void>}
     */
    async ensureArticleDataAndShowWelcome(loadArticles) {
        // 先显示骨架屏
        this.showWelcomePageSkeleton();
        
        // 获取文章数据
        let articles = typeof this.getArticles === 'function' ? this.getArticles() : [];
        
        // 如果没有文章数据且提供了加载函数，则加载文章
        if ((!articles || articles.length === 0) && typeof loadArticles === 'function') {
            logger.info('没有文章数据，尝试加载文章数据...');
            try {
                articles = await loadArticles();
            } catch (error) {
                logger.error('加载文章数据失败:', error);
            }
        }
        
        // 使用文章数据渲染欢迎页面
        if (articles && articles.length > 0) {
            logger.info('使用文章数据渲染欢迎页面');
            this.renderWelcomePage(articles);
        }
    }
    
    /**
     * 从缓存加载欢迎页面数据
     * @returns {Object|null} 缓存的欢迎页面数据或null
     */
    loadFromCache() {
        try {
            logger.info('尝试从缓存加载欢迎页面数据');
            
            // 检查缓存时间戳
            const timestamp = localStorage.getItem(WELCOME_PAGE_CACHE_TIMESTAMP_KEY);
            if (!timestamp) {
                logger.info('缓存中没有时间戳');
                return null;
            }
            
            // 检查缓存是否过期
            const cacheAge = Date.now() - parseInt(timestamp, 10);
            if (cacheAge > CACHE_MAX_AGE) {
                logger.info('缓存已过期');
                return null;
            }
            
            // 获取缓存数据
            const cachedDataStr = localStorage.getItem(WELCOME_PAGE_CACHE_KEY);
            if (!cachedDataStr) {
                logger.info('缓存中没有数据');
                return null;
            }
            
            // 解析缓存数据
            const cachedData = JSON.parse(cachedDataStr);
            logger.info('从缓存加载到欢迎页面数据');
            
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
            
            logger.info('保存欢迎页面数据到缓存');
            
            // 保存数据
            localStorage.setItem(WELCOME_PAGE_CACHE_KEY, JSON.stringify(data));
            
            // 保存时间戳
            localStorage.setItem(WELCOME_PAGE_CACHE_TIMESTAMP_KEY, Date.now().toString());
            
            // 保存到实例变量
            this.cachedData = data;
        } catch (error) {
            logger.error('保存欢迎页面数据到缓存失败:', error);
        }
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
     * 从缓存数据渲染欢迎页面
     * @param {Object} cachedData 缓存的欢迎页面数据
     */
    renderWelcomePageFromCache(cachedData) {
        if (!cachedData) return;
        
        const { recentArticles } = cachedData;
        
        logger.info('使用缓存数据渲染欢迎页面');
        
        // 获取容器
        const container = document.getElementById('article-container');
        
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
        
        // 隐藏骨架屏
        if (container) {
            welcomePageSkeleton.hide(container);
            contentViewManager.markContent(container, 'welcome');
            contentViewManager.setMode(ViewMode.WELCOME);
        }
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
                    const container = document.getElementById('article-container');
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
}

export const welcomePageManager = new WelcomePageManager(); 