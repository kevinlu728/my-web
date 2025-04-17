/**
 * 资源样式加载器
 * 该模块是最底层的资源加载器，所有样式资源加载最终都通过该模块进行。
 */

import { resourceEvents, RESOURCE_EVENTS } from './resourceEvents.js';
import logger from '../utils/logger.js';

class StyleResourceLoader {
    constructor() {
        this.dependencies = null;
    }

    /**
     * 设置依赖方法
     * 允许依赖注入，避免循环依赖
     * @param {Object} dependencies - 依赖方法对象
     */
    setDependencies(dependencies) {
        this.dependencies = dependencies;
        logger.debug('样式资源加载器已设置依赖');
    }

    /**
     * 加载CSS资源
     * @param {string} url - CSS文件URL
     * @param {object} resource - 资源对象
     * @param {boolean} [nonBlocking=false] - 是否使用非阻塞方式加载
     * @returns {Promise} 加载完成的Promise
     */
    loadCss(url, resource, nonBlocking = false) {
        return new Promise((resolve, reject) => {
            // 检查URL是否有效
            if (!url || typeof url !== 'string') {
                logger.warn('⚠️ 尝试加载无效的CSS URL:', url);
                return reject(new Error('无效的CSS URL'));
            }
            
            // 确保loadedResources存在
            const loadedResources = this.dependencies?.loadedResources || new Set();
            
            // 跳过已加载的资源
            if (loadedResources.has(url)) {
                return resolve(true);
            }
            
            // 获取资源优先级
            let priority = 'medium';
            if (resource && resource.priority) {
                priority = resource.priority;
            }
            
            // 设置加载超时
            if (typeof this.dependencies?.setResourceTimeout === 'function') {
                this.dependencies.setResourceTimeout('styles', url, priority);
            }
            
            // 创建<link>元素
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            
            // 如果是非阻塞加载，设置media属性
            if (nonBlocking) {
                link.media = 'print'; // 初始不应用，不阻塞
            }
            
            // 添加自定义属性
            if (resource && resource.attributes) {
                Object.entries(resource.attributes).forEach(([key, value]) => {
                    link.setAttribute(key, value);
                });
            }
            
            // 设置onload事件
            link.onload = () => {
                // 清除超时处理器
                if (typeof this.dependencies?.clearResourceTimeout === 'function') {
                    this.dependencies.clearResourceTimeout(url);
                }
                
                // 如果是非阻塞加载，加载完成后应用样式
                if (nonBlocking) {
                    link.media = 'all';
                }
                
                // 确保loadedResources存在
                if (this.dependencies?.loadedResources) {
                    this.dependencies.loadedResources.add(url);
                }
                
                const mode = nonBlocking ? '非阻塞' : '阻塞式';
                logger.debug(`✅ ${mode}加载CSS完成: ${url}`);
                
                // 解析Promise
                resolve(true);
            };
            
            link.onerror = (err) => {
                // 清除超时处理器
                if (typeof this.dependencies?.clearResourceTimeout === 'function') {
                    this.dependencies.clearResourceTimeout(url);
                }
                
                // 记录错误但不阻塞
                if (typeof this.dependencies?.handleResourceError === 'function') {
                    this.dependencies.handleResourceError(link, url);
                } else {
                    const mode = nonBlocking ? '非阻塞' : '阻塞式';
                    logger.warn(`❌ ${mode}CSS加载失败: ${url}`);
                }
                
                // 决定是否拒绝Promise
                if (nonBlocking) {
                    // 非阻塞方式下拒绝Promise
                    reject(new Error(`CSS加载失败: ${url}`));
                } else {
                    // 阻塞方式下解析Promise，以免影响整体流程
                    resolve(false);
                }
            };
            
            // 添加到文档
            document.head.appendChild(link);
        });
    }
    
    /**
     * 非阻塞方式加载CSS (保持向后兼容)
     * @param {string} url - CSS文件URL
     * @param {object} resource - 资源对象
     * @returns {Promise} - 加载完成的Promise
     */
    loadCssNonBlocking(url, resource) {
        return this.loadCss(url, resource, true);
    }

    /**
     * 注入Font Awesome备用样式
     * 当Font Awesome无法加载时，提供基本图标替代
     */
    injectFontAwesomeFallbackStyles() {
        logger.info('🔄 注入Font Awesome备用样式...');
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
     * 加载样式资源
     * @param {Object} options - 加载选项
     * @param {string} options.url - 样式URL
     * @param {string} [options.id] - 元素ID
     * @param {Object} [options.attributes] - 附加属性
     * @param {number} [options.timeout] - 超时时间(毫秒)
     * @param {string} [options.priority] - 资源优先级(high|medium|low)
     * @param {boolean} [options.nonBlocking] - 是否非阻塞加载
     * @returns {Promise} 加载结果Promise
     */
    loadStylesheet(options) {
        const { 
            url, 
            id, 
            attributes = {}, 
            timeout = 10000, 
            priority = 'medium',
            nonBlocking = false  // 新增非阻塞选项
        } = options;
        
        if (!url) {
            logger.error('❌ 加载样式错误: 未提供URL');
            return Promise.reject(new Error('未提供URL'));
        }
        
        // 提取资源ID和类型
        const resourceType = attributes['data-resource-type'] || this.getResourceTypeFromUrl(url);
        const resourceId = attributes['data-resource-id'] || 
                          (this.dependencies?.extractResourceId ? 
                           this.dependencies.extractResourceId(url, resourceType) : 
                           this.getResourceIdFromUrl(url));
        
        // 触发资源加载开始事件
        resourceEvents.emit(RESOURCE_EVENTS.LOADING_START, {
            url,
            resourceType,
            resourceId,
            priority,
            resourceKind: 'stylesheet'
        });
        
        logger.info(`🔄 开始加载样式资源: ${url}`);
        
        return new Promise((resolve, reject) => {
            // 检查是否已加载
            if (this.dependencies?.loadedResources && this.dependencies.loadedResources.has(url)) {
                logger.info(`✅ 样式已加载，跳过: ${url}`);
                
                // 触发已加载事件
                resourceEvents.emit(RESOURCE_EVENTS.LOADING_SUCCESS, {
                    url,
                    resourceType,
                    resourceId,
                    priority,
                    resourceKind: 'stylesheet',
                    fromCache: true
                });
                
                resolve({ url, status: 'cached' });
                return;
            }
            
            // 检查是否已存在
            const existingLink = document.getElementById(id) || 
                                document.querySelector(`link[href="${url}"]`);
            
            if (existingLink) {
                logger.info(`✅ 样式已存在，跳过: ${url}`);
                
                // 触发已存在事件
                resourceEvents.emit(RESOURCE_EVENTS.LOADING_SUCCESS, {
                    url,
                    resourceType,
                    resourceId,
                    priority,
                    resourceKind: 'stylesheet',
                    fromCache: true
                });
                
                resolve({ url, element: existingLink, status: 'existing' });
                return;
            }
            
            // 创建link元素
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            
            // 如果是非阻塞加载，设置media属性
            if (nonBlocking) {
                link.media = 'print'; // 初始不应用，不阻塞
            }
            
            // 设置ID
            if (id) link.id = id;
            
            // 设置其他属性
            Object.entries(attributes).forEach(([key, value]) => {
                link.setAttribute(key, value);
            });
            
            // 确保设置了data-resource-type
            if (!link.hasAttribute('data-resource-type') && resourceType) {
                link.setAttribute('data-resource-type', resourceType);
            }
            
            // 确保设置了data-resource-id
            if (!link.hasAttribute('data-resource-id') && resourceId) {
                link.setAttribute('data-resource-id', resourceId);
            }
            
            // 确保设置了data-priority
            if (!link.hasAttribute('data-priority')) {
                link.setAttribute('data-priority', priority);
            }
            
            // 设置加载事件
            link.onload = () => {
                logger.info(`✅ 样式加载成功: ${url}`);
                
                // 清除超时
                if (this.dependencies?.clearResourceTimeout) {
                    this.dependencies.clearResourceTimeout(url);
                }
                
                // 添加到已加载资源
                if (this.dependencies?.loadedResources) {
                    this.dependencies.loadedResources.add(url);
                }
                
                // 如果是非阻塞加载，加载完成后应用样式
                if (nonBlocking) {
                    link.media = 'all';
                }
                
                // 触发加载成功事件
                resourceEvents.emit(RESOURCE_EVENTS.LOADING_SUCCESS, {
                    url,
                    resourceType,
                    resourceId,
                    element: link,
                    priority,
                    resourceKind: 'stylesheet'
                });
                
                resolve({ url, element: link, status: 'loaded' });
            };
            
            // 设置错误事件
            link.onerror = () => {
                logger.error(`❌ link.onerror事件触发，样式加载失败: ${url}`);
                
                // 清除超时
                if (this.dependencies?.clearResourceTimeout) {
                    this.dependencies.clearResourceTimeout(url);
                }
                
                // 触发加载失败事件
                resourceEvents.emit(RESOURCE_EVENTS.LOADING_FAILURE, {
                    url,
                    resourceType,
                    resourceId,
                    element: link,
                    reason: 'load-error',
                    priority,
                    resourceKind: 'stylesheet',
                    sender: 'styleResourceLoader'
                });
                
                // 尝试处理错误
                if (this.dependencies?.handleResourceError) {
                    this.dependencies.handleResourceError(link, url, resourceId);
                }
                
                reject(new Error(`样式加载失败: ${url}`));
            };
            
            // 设置超时
            if (this.dependencies?.setResourceTimeout) {
                this.dependencies.setResourceTimeout(resourceType, url, priority);
            }
            
            // 添加到文档
            document.head.appendChild(link);
            
            logger.debug(`🔄 样式资源已添加到DOM: ${url}`);
        });
    }
}

// 创建一个单例实例
const styleResourceLoader = new StyleResourceLoader();

// 导出单例和类
export { styleResourceLoader, StyleResourceLoader };
export default styleResourceLoader; 