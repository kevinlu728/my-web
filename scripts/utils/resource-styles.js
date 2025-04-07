/**
 * 资源样式模块 - 处理样式资源的加载、注入和管理
 * 从ResourceLoader中提取的样式相关功能
 */

import logger from './logger.js';

class ResourceStyles {
    /**
     * 初始化资源样式处理器
     */
    constructor() {
        // 已加载的资源集合
        this.loadedResources = new Set();
        // 资源加载超时处理器
        this.resourceTimeouts = {};
    }

    /**
     * 加载CSS资源
     * @param {string} url - CSS文件URL
     * @param {object} resource - 资源对象
     * @returns {Promise} 加载完成的Promise
     */
    loadCss(url, resource) {
        return new Promise((resolve, reject) => {
            // 检查URL是否有效
            if (!url || typeof url !== 'string') {
                logger.warn('⚠️ 尝试加载无效的CSS URL:', url);
                return reject(new Error('无效的CSS URL'));
            }
            
            // 跳过已加载的资源
            if (this.loadedResources.has(url)) {
                return resolve();
            }
            
            // 获取资源优先级
            let priority = 'medium';
            if (resource && resource.priority) {
                priority = resource.priority;
            }
            
            // 设置加载超时
            if (typeof this.setResourceTimeout === 'function') {
                this.setResourceTimeout('styles', url, priority);
            }
            
            // 创建<link>元素
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            
            // 添加自定义属性
            if (resource && resource.attributes) {
                Object.entries(resource.attributes).forEach(([key, value]) => {
                    link.setAttribute(key, value);
                });
            }
            
            // 设置onload事件
            link.onload = () => {
                // 清除超时处理器
                if (typeof this.clearResourceTimeout === 'function') {
                    this.clearResourceTimeout(url);
                }
                
                this.loadedResources.add(url);
                logger.debug(`✅ CSS加载完成: ${url}`);
                resolve();
            };
            
            link.onerror = (err) => {
                // 清除超时处理器
                if (typeof this.clearResourceTimeout === 'function') {
                    this.clearResourceTimeout(url);
                }
                
                // 记录错误但不阻塞
                if (typeof this.handleResourceError === 'function') {
                    this.handleResourceError(link, url);
                }
                logger.warn(`❌ CSS加载失败: ${url}`);
                
                // 虽然加载失败，但仍然解析Promise，以免影响整体流程
                resolve();
            };
            
            // 添加到文档
            document.head.appendChild(link);
        });
    }
    
    /**
     * 非阻塞方式加载CSS
     * @param {string} url - CSS文件URL
     * @param {object} resource - 资源对象
     */
    loadCssNonBlocking(url, resource) {
        // 检查URL是否有效
        if (!url || typeof url !== 'string') {
            logger.warn('⚠️ 尝试加载无效的CSS URL:', url);
            return;
        }
        
        // 跳过已加载的资源
        if (this.loadedResources.has(url)) {
            return;
        }
        
        // 获取资源优先级
        let priority = 'medium';
        if (resource && resource.priority) {
            priority = resource.priority;
        }
        
        // 设置加载超时
        if (typeof this.setResourceTimeout === 'function') {
            this.setResourceTimeout('styles', url, priority);
        }
        
        // 创建<link>元素但使用media="print"和onload切换技术
        // 这样CSS不会阻塞渲染
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        link.media = 'print'; // 初始不应用，不阻塞
        
        // 添加自定义属性
        if (resource && resource.attributes) {
            Object.entries(resource.attributes).forEach(([key, value]) => {
                link.setAttribute(key, value);
            });
        }
        
        // 设置onload事件，当CSS加载完成时应用样式
        link.onload = () => {
            // 清除超时处理器
            if (typeof this.clearResourceTimeout === 'function') {
                this.clearResourceTimeout(url);
            }
            
            // 样式已加载，现在应用它
            link.media = 'all';
            this.loadedResources.add(url);
            logger.debug(`✅ 非阻塞加载CSS完成: ${url}`);
        };
        
        link.onerror = () => {
            // 清除超时处理器
            if (typeof this.clearResourceTimeout === 'function') {
                this.clearResourceTimeout(url);
            }
            
            // 记录错误但不阻塞
            if (typeof this.handleResourceError === 'function') {
                this.handleResourceError(link, url);
            } else {
                logger.warn(`❌ 非阻塞CSS加载失败: ${url}`);
            }
        };
        
        // 添加到文档
        document.head.appendChild(link);
    }

    /**
     * 注入关键的内联样式
     * 确保基本的布局和样式即使在外部资源失败时也能正常显示
     */
    injectCriticalInlineStyles() {
        // 检查是否已经注入了关键样式
        if (document.getElementById('critical-inline-styles')) {
            return;
        }
        
        // 确保已经加载了包含所有回退样式的文件
        if (!document.getElementById('basic-icon-styles')) {
            this.injectBasicIconStyles();
            // 设置ID以标记为已完成
            const marker = document.createElement('meta');
            marker.id = 'critical-inline-styles';
            document.head.appendChild(marker);
            // 由于我们已经加载了包含所有回退样式的文件，可以直接返回
            return;
        }
        
        logger.debug('✅ 已加载最小必要的关键内联样式');
    }

    /**
     * 当图标CDN加载失败时提供最小的必要图标样式
     */
    injectBasicIconStyles() {
        // 检查是否已经注入了图标样式
        if (document.getElementById('basic-icon-styles')) {
            return;
        }
        
        // 始终从外部文件加载基本图标样式，无论Font Awesome是否加载成功
        const link = document.createElement('link');
        link.id = 'basic-icon-styles';
        link.rel = 'stylesheet';
        link.href = 'styles/fallback.css';
        
        // 添加自定义属性，标记为本地回退
        link.setAttribute('data-resource-type', 'icon-fallback');
        link.setAttribute('data-is-fallback', 'true');
        
        document.head.appendChild(link);
        logger.debug('已加载基本图标回退样式');
    }
    
    /**
     * 注入基本KaTeX样式
     * 当KaTeX CDN加载失败时提供最小的必要数学公式样式
     */
    injectBasicKatexStyles() {
        // 检查是否已经注入了KaTeX样式
        if (document.getElementById('basic-katex-styles')) {
            return;
        }
        
        // 确保已经加载了图标样式文件（它们在同一个文件中）
        if (!document.getElementById('basic-icon-styles')) {
            this.injectBasicIconStyles();
            // 由于我们已经加载了包含所有回退样式的文件，可以直接返回
            return;
        }
        
        logger.debug('已加载基本KaTeX回退样式');
    }

    /**
     * 注入Font Awesome备用样式
     * 当Font Awesome无法加载时，提供基本图标替代
     */
    injectFontAwesomeFallbackStyles() {
        // 避免重复注入
        if (document.getElementById('fa-fallback-styles')) {
            logger.debug('Font Awesome备用样式已存在，跳过注入');
            return;
        }
        
        logger.info('💉 注入Font Awesome备用图标样式');
        
        // 创建样式元素
        const style = document.createElement('style');
        style.id = 'fa-fallback-styles';
        
        // 基本的图标映射
        style.textContent = `
            /* Font Awesome备用样式 - 使用Unicode字符 */
            .no-fontawesome .fas.fa-check:before { content: "✓"; }
            .no-fontawesome .fas.fa-times:before { content: "✗"; }
            .no-fontawesome .fas.fa-star:before { content: "★"; }
            .no-fontawesome .fas.fa-user:before { content: "👤"; }
            .no-fontawesome .fas.fa-home:before { content: "🏠"; }
            .no-fontawesome .fas.fa-search:before { content: "🔍"; }
            .no-fontawesome .fas.fa-cog:before { content: "⚙"; }
            .no-fontawesome .fas.fa-bars:before { content: "☰"; }
            /* 保留原有的图标映射... */
        `;
        
        // 添加到文档
        document.head.appendChild(style);
        
        // 添加no-fontawesome类标记
        document.documentElement.classList.add('no-fontawesome');
    }

    /**
     * 设置依赖方法
     * 允许依赖注入，避免循环依赖
     * @param {Object} dependencies - 依赖方法对象
     */
    setDependencies(dependencies) {
        if (dependencies.handleResourceError) {
            this.handleResourceError = dependencies.handleResourceError;
        }
        if (dependencies.setResourceTimeout) {
            this.setResourceTimeout = dependencies.setResourceTimeout;
        }
        if (dependencies.clearResourceTimeout) {
            this.clearResourceTimeout = dependencies.clearResourceTimeout;
        }
    }

}

// 创建一个单例实例并导出
const resourceStyles = new ResourceStyles();

// 导出单例和类
export { resourceStyles, ResourceStyles };
export default resourceStyles; 