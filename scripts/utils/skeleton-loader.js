/**
 * @file skeleton-loader.js
 * @description 提供骨架屏加载器功能，用于文章列表和欢迎页面的加载状态显示
 * @author Claude AI
 * @version 1.0.0
 * @created 2024-07-11
 */

import logger from './logger.js';
import { getArticleTreeSkeletonTemplate, getWelcomePageSkeletonTemplate, getArticlePageSkeletonTemplate } from './placeholder-templates.js';

/**
 * 文章树形列表骨架屏加载器
 */
export const articleTreeSkeleton = {
    // 骨架屏配置
    config: {
        enabled: true, // 默认启用骨架屏
        categories: [
            { name: 'AI', width: 'skeleton-cat-name-1' },
            { name: '终端技术', width: 'skeleton-cat-name-2' },
            { name: '编程语言', width: 'skeleton-cat-name-3' },
            { name: '数据结构和算法', width: 'skeleton-cat-name-4' },
            { name: '计算机基础', width: 'skeleton-cat-name-5' },
            { name: '测试', width: 'skeleton-cat-name-6' }
        ]
    },
    
    /**
     * 显示骨架屏
     * @param {HTMLElement} container - 骨架屏容器
     */
    show(container) {
        if (!this.config.enabled) {
            logger.info('骨架屏已禁用，使用默认加载提示');
            this.showFallback(container);
            return;
        }
        
        try {
            if (!container) {
                logger.warn('骨架屏容器不存在');
                return;
            }
            
            // 防止重复添加骨架屏
            if (container.querySelector('.article-tree-skeleton')) {
                logger.debug('骨架屏已存在，跳过重复显示');
                return;
            }

            // 清空容器
            container.innerHTML = '';
            
            // 添加骨架屏标识类，用于应用高度样式
            container.classList.add('skeleton-loaded');
            
            // 创建骨架屏HTML - 使用模板
            const skeletonHTML = getArticleTreeSkeletonTemplate();
            
            // 添加到容器
            container.innerHTML = skeletonHTML;
            
            logger.info('文章树形列表骨架屏已显示');
        } catch (error) {
            logger.error('显示骨架屏失败:', error);
            this.showFallback(container);
        }
    },
    
    /**
     * 隐藏骨架屏
     * @param {HTMLElement} container - 骨架屏容器
     */
    hide(container) {
        try {
            if (!container) {
                logger.warn('骨架屏容器不存在');
                return;
            }
            
            // 检查是否有骨架屏
            const skeletonElement = container.querySelector('.article-tree-skeleton');
            if (skeletonElement) {
                // 添加淡出效果
                skeletonElement.style.opacity = '0';
                
                // 延迟移除元素
                setTimeout(() => {
                    if (container && container.contains(skeletonElement)) {
                        container.removeChild(skeletonElement);
                    }
                    container.classList.remove('skeleton-loaded');
                }, 100);
                
                logger.info('文章树形列表骨架屏已隐藏');
            }
        } catch (error) {
            logger.error('隐藏骨架屏失败:', error);
        }
    },
    
    /**
     * 显示降级的加载提示
     * @param {HTMLElement} container - 容器
     */
    showFallback(container) {
        if (!container) return;
        
        container.innerHTML = `
            <div class="fallback-loading">
                <div class="loading-spinner small"></div>
                <div>加载文章列表中...</div>
            </div>
        `;
        
        logger.info('已显示降级加载提示');
    },
    
    /**
     * 加载配置
     */
    loadConfig() {
        try {
            // 从localStorage加载配置
            const enabled = localStorage.getItem('article_tree_skeleton_enabled');
            if (enabled !== null) {
                this.config.enabled = enabled === 'true';
                logger.info(`从存储加载骨架屏配置: ${this.config.enabled ? '启用' : '禁用'}`);
            }
        } catch (e) {
            logger.warn('无法从localStorage加载骨架屏配置');
        }
    },
    
    /**
     * 初始化骨架屏加载器
     */
    initialize() {
        this.loadConfig();
        logger.info('文章列表骨架屏加载器已初始化', this.config.enabled ? '已启用' : '已禁用');
        return this;
    }
};

/**
 * 欢迎页面骨架屏加载器
 */
export const welcomePageSkeleton = {
    // 骨架屏配置
    config: {
        enabled: true, // 默认启用骨架屏
    },
    
    /**
     * 显示欢迎页面骨架屏
     * @param {HTMLElement|string} container - 骨架屏容器或容器ID
     */
    show(container) {
        if (!this.config.enabled) {
            logger.info('欢迎页面骨架屏已禁用，使用默认加载提示');
            this.showFallback(container);
            return;
        }
        
        try {
            // 获取容器元素
            const containerElement = typeof container === 'string' 
                ? document.getElementById(container) 
                : container;
                
            if (!containerElement) {
                logger.warn('欢迎页面骨架屏容器不存在');
                return;
            }
            
            // 防止重复添加骨架屏
            if (containerElement.querySelector('.welcome-page-skeleton')) {
                logger.debug('欢迎页面骨架屏已存在，跳过重复显示');
                return;
            }

            // 清空容器 - 这一步很关键，确保容器是空的
            containerElement.innerHTML = '';
            
            // 添加骨架屏标识类，用于应用高度样式
            containerElement.classList.add('welcome-skeleton-loaded');
            
            // 创建骨架屏HTML - 使用模板
            const skeletonHTML = getWelcomePageSkeletonTemplate();
            
            // 添加到容器
            containerElement.innerHTML = skeletonHTML;
            
            // 检查是否真的添加成功
            const addedSkeleton = containerElement.querySelector('.welcome-page-skeleton');
            if (addedSkeleton) {
                logger.info('欢迎页面骨架屏已显示');
            } else {
                logger.error('欢迎页面骨架屏HTML已设置但未找到元素');
            }
        } catch (error) {
            logger.error('显示欢迎页面骨架屏失败:', error);
            this.showFallback(container);
        }
    },
    
    /**
     * 隐藏欢迎页面骨架屏
     * @param {HTMLElement|string} container - 骨架屏容器或容器ID
     */
    hide(container) {
        try {
            // 获取容器元素
            const containerElement = typeof container === 'string' 
                ? document.getElementById(container) 
                : container;
                
            if (!containerElement) {
                logger.warn('欢迎页面骨架屏容器不存在');
                return;
            }
            
            // 检查是否有骨架屏
            const skeletonElement = containerElement.querySelector('.welcome-page-skeleton');
            if (skeletonElement) {
                // 添加淡出效果
                skeletonElement.style.opacity = '0';
                
                // 延迟移除元素
                setTimeout(() => {
                    if (containerElement && containerElement.contains(skeletonElement)) {
                        containerElement.removeChild(skeletonElement);
                    }
                    containerElement.classList.remove('welcome-skeleton-loaded');
                }, 100);
                
                logger.info('欢迎页面骨架屏已隐藏');
            }
        } catch (error) {
            logger.error('隐藏欢迎页面骨架屏失败:', error);
        }
    },
    
    /**
     * 显示降级的加载提示
     * @param {HTMLElement|string} container - 容器或容器ID
     */
    showFallback(container) {
        // 获取容器元素
        const containerElement = typeof container === 'string' 
            ? document.getElementById(container) 
            : container;
            
        if (!containerElement) return;
        
        containerElement.innerHTML = `
            <div class="placeholder-content">
                <div class="placeholder-text">正在准备内容...</div>
                <div class="placeholder-hint">欢迎页面加载中，请稍候片刻...</div>
            </div>
        `;
        
        logger.info('已显示欢迎页面降级加载提示');
    },
    
    /**
     * 加载配置
     */
    loadConfig() {
        try {
            // 从localStorage加载配置
            const enabled = localStorage.getItem('welcome_page_skeleton_enabled');
            if (enabled !== null) {
                this.config.enabled = enabled === 'true';
                logger.info(`从存储加载欢迎页面骨架屏配置: ${this.config.enabled ? '启用' : '禁用'}`);
            }
        } catch (e) {
            logger.warn('无法从localStorage加载欢迎页面骨架屏配置');
        }
    },
    
    /**
     * 初始化骨架屏加载器
     */
    initialize() {
        this.loadConfig();
        logger.info('欢迎页面骨架屏加载器已初始化', this.config.enabled ? '已启用' : '已禁用');
        return this;
    }
};

export const articlePageSkeleton = {
    // 骨架屏配置
    config: {
        enabled: true, // 默认启用骨架屏
    },
    
    /**
     * 显示文章内容页面（即具体文章页面）骨架屏
     * @param {HTMLElement|string} container - 骨架屏容器或容器ID
     */
    show(container) {
        if (!this.config.enabled) {
            logger.info('文章内容页面骨架屏已禁用，使用默认加载提示');
            this.showFallback(container);
            return;
        }
        
        try {
            // 获取容器元素
            const containerElement = typeof container === 'string' 
                ? document.getElementById(container) 
                : container;
                
            if (!containerElement) {
                logger.warn('文章内容页面骨架屏容器不存在');
                return;
            }
            
            // 防止重复添加骨架屏
            if (containerElement.querySelector('.article-skeleton')) {
                logger.debug('文章内容页面骨架屏已存在，跳过重复显示');
                return;
            }

            // 清空容器 - 这一步很关键，确保容器是空的
            containerElement.innerHTML = '';
            
            // 添加骨架屏标识类，用于应用高度样式
            containerElement.classList.add('article-skeleton-loaded');
            
            // 创建骨架屏HTML - 使用模板
            const skeletonHTML = getArticlePageSkeletonTemplate();
            
            // 添加到容器
            containerElement.innerHTML = skeletonHTML;
            
            // 检查是否真的添加成功
            const addedSkeleton = containerElement.querySelector('.article-skeleton');
            if (addedSkeleton) {
                logger.info('文章内容页面骨架屏已显示');
            } else {
                logger.error('文章内容页面骨架屏HTML已设置但未找到元素');
            }
        } catch (error) {
            logger.error('显示文章内容页面骨架屏失败:', error.message);
            this.showFallback(container);
        }
    },
    
    /**
     * 隐藏文章内容骨架屏
     * @param {HTMLElement|string} container - 骨架屏容器或容器ID
     */
    hide(container) {
        try {
            // 获取容器元素
            const containerElement = typeof container === 'string' 
                ? document.getElementById(container) 
                : container;
                
            if (!containerElement) {
                logger.warn('文章内容页面骨架屏容器不存在');
                return;
            }
            
            // 检查是否有骨架屏
            const skeletonElement = containerElement.querySelector('.article-skeleton');
            if (skeletonElement) {
                // 添加淡出效果
                skeletonElement.style.opacity = '0';
                
                // 延迟移除元素
                setTimeout(() => {
                    if (containerElement && containerElement.contains(skeletonElement)) {
                        containerElement.removeChild(skeletonElement);
                    }
                    containerElement.classList.remove('article-skeleton-loaded');
                }, 100);
                
                logger.info('文章内容页面骨架屏已隐藏');
            }
        } catch (error) {
            logger.error('隐藏文章内容页面骨架屏失败:', error);
        }
    },
    
    /**
     * 显示降级的加载提示
     * @param {HTMLElement|string} container - 容器或容器ID
     */
    showFallback(container) {
        // 获取容器元素
        const containerElement = typeof container === 'string' 
            ? document.getElementById(container) 
            : container;
            
        if (!containerElement) return;
        
        containerElement.innerHTML = `
            <div class="placeholder-content">
                <div class="placeholder-text">正在准备内容...</div>
                <div class="placeholder-hint">文章内容页面加载中，请稍候片刻...</div>
            </div>
        `;
        
        logger.info('已显示文章内容降级加载提示');
    },
    
    /**
     * 加载配置
     */
    loadConfig() {
        try {
            // 从localStorage加载配置
            const enabled = localStorage.getItem('article_page_skeleton_enabled');
            if (enabled !== null) {
                this.config.enabled = enabled === 'true';
                logger.info(`从存储加载文章内容页面骨架屏配置: ${this.config.enabled ? '启用' : '禁用'}`);
            }
        } catch (e) {
            logger.warn('无法从localStorage加载文章内容页面骨架屏配置');
        }
    },
    
    /**
     * 初始化骨架屏加载器
     */
    initialize() {
        this.loadConfig();
        logger.info('文章内容页面骨架屏加载器已初始化', this.config.enabled ? '已启用' : '已禁用');
        return this;
    }
}

// 自动初始化骨架屏加载器
articleTreeSkeleton.initialize();
welcomePageSkeleton.initialize(); 
articlePageSkeleton.initialize();