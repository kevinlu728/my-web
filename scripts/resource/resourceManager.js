/**
 * @file resource-loader.js
 * @description 资源加载器 - 负责加载和管理各种外部资源并提供统一的回退机制
 * @author 陆凯
 * @version 1.2.0
 * @created 2024-03-22
 * @modified 2024-05-01
 * 
 * 该模块负责优化资源加载:
 * - 提供CSS和JS资源加载的回退机制
 * - 处理CDN资源加载失败的情况
 * - 可选择性地预加载关键资源
 * - 监控资源加载性能
 * 
 * @CDN回退流程 重要！！
 * -------------
 * 当从CDN加载资源时，系统采用以下回退流程以确保资源可靠加载：
 * 1. 首先尝试从主要CDN源(Primary URL)加载资源
 * 2. 如果主要源加载失败，尝试从备用CDN源(Fallback URLs)加载
 * 3. 如果所有CDN源都失败，最终回退到本地资源(Local URL)
 * 
 */

import logger from '../utils/logger.js';
import resourceConfig from '../config/resources.js';
import resourceTimeout from './resourceTimeout.js';
import { resourceChecker } from './resourceChecker.js';
import { styleResourceLoader } from './styleResourceLoader.js';
import { scriptResourceLoader } from './scriptResourceLoader.js';
// 添加事件系统引入
import { resourceEvents, RESOURCE_EVENTS } from './resourceEvents.js';

class ResourceManager {
    constructor() {
        this.loadedResources = new Set();
        this.failedResources = new Set();
        this.resourceConfig = resourceConfig;
        
        // 目前把初始化放在构造函数中，是希望尽早初始化，但也考虑从构造函数中移除，改为由页面（比如tech-blog.js）手动调用。
        this.initialize();
    }

    initialize() {
        logger.info('资源管理器初始化（日志级别尚未更新，早期日志使用info级别）...');

        // 1. 先初始化事件系统监听器
        this.initializeEventListeners();
        
        // 2. 初始化浏览器默认错误事件监听器
        this.initializeBrowserEventListeners();

        // 3. 设置资源加载器依赖
        if (styleResourceLoader && typeof styleResourceLoader.setDependencies === 'function') {
            styleResourceLoader.setDependencies({
                setResourceTimeout: this.setResourceTimeout.bind(this),
                clearResourceTimeout: this.clearResourceTimeout.bind(this),
                handleResourceError: this.handleResourceError.bind(this),
                loadedResources: this.loadedResources
            });
        } else {
            logger.warn('⚠️ 样式资源加载器未初始化，跳过依赖设置');
        }

        if (scriptResourceLoader && typeof scriptResourceLoader.setDependencies === 'function') {
            scriptResourceLoader.setDependencies({
                setResourceTimeout: this.setResourceTimeout.bind(this),
                clearResourceTimeout: this.clearResourceTimeout.bind(this),
                handleResourceError: this.handleResourceError.bind(this),
                loadedResources: this.loadedResources
            });
        } else {
            logger.warn('⚠️ 脚本资源加载器未初始化，跳过依赖设置');
        }

        // 4. 初始化内部状态
        this._resourceFallbackStatus = new Map();
    }

    /**
     * 初始化事件监听器
     * 监听资源相关事件并处理
     */
    initializeEventListeners() {
        // 监听资源加载失败事件
        resourceEvents.on(RESOURCE_EVENTS.LOADING_FAILURE, (data) => {
            logger.info(`📢 收到资源加载失败事件: ${data.resourceId || data.resourceType || '未知资源'} [来源: ${data.sender || '未知'}]`);
            // 只在有URL和资源类型时尝试额外处理
            if (data.url && !this.failedResources.has(data.url)) {
                const element = document.querySelector(`link[href="${data.url}"], script[src="${data.url}"]`);
                if (element) {
                    // 避免重复处理
                    // this.failedResources.add(data.url);
                    logger.info(`🔄 通过事件系统触发错误处理: ${data.url}`);
                    this.handleResourceError(element, data.url, data.resourceId);
                }
            }
        });
        
        // 监听资源超时事件 - 新增
        resourceEvents.on(RESOURCE_EVENTS.LOADING_TIMEOUT, (data) => {
            logger.info(`📢 收到资源加载超时事件: ${data.resourceId || data.resourceType || '未知资源'} [来源: ${data.sender || '未知'}]`);
            if (data.url && !this.failedResources.has(data.url)) {
                const element = document.querySelector(`link[href="${data.url}"], script[src="${data.url}"]`);
                if (element) {
                    // 避免重复处理
                    // this.failedResources.add(data.url);
                    logger.info(`⏱️ 通过事件系统处理超时资源: ${data.url}`);
                    // 对超时的资源应用与加载失败相同的处理逻辑
                    this.handleResourceError(element, data.url, data.resourceId);
                }
            }
        });
    }

    /**
     * 设置资源超时处理
     * 委托给resourceTimeout模块
     * @param {string} resourceType - 资源类型
     * @param {string} url - 资源URL
     * @param {string} priority - 资源优先级
     * @returns {number} 超时处理器ID
     */
    setResourceTimeout(resourceType, url, priority = 'medium') {
        return resourceTimeout.setResourceTimeout(resourceType, url, priority);
    }   
    
    /**
     * 取消资源的超时处理
     * 委托给resourceTimeout模块
     * @param {string} url - 资源URL
     */
    clearResourceTimeout(url) {
        resourceTimeout.clearResourceTimeout(url);
    }

    /**
     * 初始化浏览器默认错误事件监听器
     * 当浏览器尝试加载<script> 脚本、<link rel="stylesheet"> 样式表、<img> 图片、其他外部资源（如 <audio>, <video> 等）并失败时，会自动触发 error 事件：
     */
    initializeBrowserEventListeners() {
        // 使用类实例属性替代局部变量，降低内存占用
        this.processedErrors = new Set();
        
        // 优化的错误处理函数
        const handleBrowserDefaultError = (event) => {
            // 只处理资源元素错误
            if (!event.target || (event.target.tagName !== 'LINK' && event.target.tagName !== 'SCRIPT')) {
                return;
            }
            
                const url = event.target.href || event.target.src;
            if (!url) return;
            
            // 检查是否已处理 - 使用两个集合进行检查
            if (this.processedErrors.has(url) || this.failedResources.has(url)) {
                        logger.debug(`⏭️ 跳过重复处理的错误: ${url}`);
                        return;
                    }
                    
            // 标记为已处理
            this.processedErrors.add(url);
            
            // 清理设置 - 使用清理延迟作为常量
            const CLEANUP_DELAY = 5000; // 5秒
            setTimeout(() => this.processedErrors.delete(url), CLEANUP_DELAY);
            
            // 提取资源信息
            const resourceType = event.target.getAttribute('data-resource-type');
            const resourceId = event.target.getAttribute('data-resource-id') || 
                              this.resourceConfig.extractResourceId(url, resourceType);
            
            // 触发资源加载失败事件
            resourceEvents.emit(RESOURCE_EVENTS.LOADING_FAILURE, {
                url,
                resourceType,
                resourceId,
                element: event.target,
                reason: 'load-error',
                priority: event.target.getAttribute('data-priority') || 'medium',
                sender: 'resourceManager.handleBrowserDefaultError'
            });

            // 注释掉，因为已经通过事件系统触发错误处理，不需要重复处理
            // this.handleResourceError(event.target, url, resourceId);
        };
        
        // 使用事件捕获
        window.addEventListener('error', handleBrowserDefaultError, true);
    }
    
    /**
     * 处理资源错误
     * 根据资源类型和URL尝试加载回退/备用资源
     * @param {HTMLElement} element - 错误的资源元素
     * @param {string} url - 资源URL
     * @param {string} [resourceId] - 可选的资源ID
     * @returns {boolean} - 是否成功处理了错误
     */
    handleResourceError(element, url, resourceId = null) {
        // 1. 参数检查 - 提供更完整的错误信息
        if (!element) {
            logger.warn('⚠️ 资源错误处理：元素为空，无法继续');
            return false;
        }
        
        if (!url) {
            logger.warn('⚠️ 资源错误处理：URL为空，无法继续');
            return false;
        }
        
        // 2. 重复处理检查 - 添加返回值
        if (this.failedResources.has(url)) {
            logger.debug(`⏭️ 跳过已处理的资源错误: ${url}`);
            return true; // 已处理过，视为处理成功
        }
        
        // 3. 记录失败资源
        this.failedResources.add(url);
        
        // 4. 资源信息提取 - 添加资源类型推断
        const resourceType = element.getAttribute('data-resource-type');
        const priority = element.getAttribute('data-priority') || 'medium';
        const reason = element.getAttribute('data-timeout-aborted') || 'load-error';
        
        // 获取或生成resourceId
        const finalResourceId = resourceId || 
                              element.getAttribute('data-resource-id') || 
                              this.resourceConfig.extractResourceId(url, resourceType);
        
        // 5. 取消任何未完成的超时处理
        this.clearResourceTimeout(url);
        
        logger.warn(`❌ 资源加载失败: ${url} (${resourceType || '未知类型'})`);
        
        // 7. 处理回退逻辑
        return this.handleResourceFallback(element, url, resourceType, finalResourceId, priority);
    }
    
    /**
     * 处理资源回退逻辑
     * 根据资源策略尝试不同的回退机制
     * @param {HTMLElement} element - 资源元素
     * @param {string} url - 原始资源URL
     * @param {string} resourceType - 资源类型
     * @param {string} resourceId - 资源ID
     * @param {string} priority - 资源优先级
     * @returns {boolean} - 是否成功启动回退流程
     */
    handleResourceFallback(element, url, resourceType, resourceId, priority) {
        // 获取资源的加载策略
        const strategy = this.resourceConfig.getResourceStrategy(resourceType);
        
        // 获取资源来源 - 判断是CDN资源还是本地资源
        const isLocalResource = url.includes('/assets/') || 
            element.hasAttribute('data-local-resource') ||
            element.getAttribute('data-source') === 'local-resource';
        
        // 记录资源信息用于日志和事件
        const resourceInfo = {
            resourceId,
            resourceType,
            url,
            priority,
            strategy,
            isLocalResource
        };
        
        logger.info(`🔍 资源回退处理: ${url} (策略: ${strategy})`);
        
        // 根据不同策略和资源来源处理回退
        
        // 情况1: 本地资源加载失败 - 无论什么策略，都直接应用最终备用方案
        if (isLocalResource) {
            logger.warn(`⚠️ 本地资源加载失败，应用备用方案: ${url}`);
            
            // 触发回退失败事件
            resourceEvents.emit(RESOURCE_EVENTS.FALLBACK_FAILURE, {
                ...resourceInfo,
                fallbackType: 'none'
            });
            
            // 应用最终备用方法
            this.applyFinalFallback(element, resourceType);
            return true; // 成功处理了错误（应用了最终备用方案）
        }
        
        // 情况2: CDN资源加载失败，使用local-only策略 - 不应该出现，但为安全起见处理
        if (strategy === 'local-only') {
            logger.warn(`⚠️ 发现意外情况：local-only策略的资源从CDN加载失败: ${url}`);
            // 直接应用备用方案
            this.applyFinalFallback(element, resourceType);
            return true;
        }
        
        // 情况3: CDN资源加载失败，使用cdn-only策略 - 尝试备用CDN，如果没有则应用最终备用方案
        if (strategy === 'cdn-only') {
            if (this.tryLoadFromCDN(element, url, resourceType)) {
                return true; // 成功启动了CDN回退
            }
            
            // 没有可用的备用CDN，应用最终备用方案
            logger.warn(`⚠️ cdn-only策略的资源无可用备用CDN: ${url}`);
            this.applyFinalFallback(element, resourceType);
            return true;
        }
        
        // 情况4: CDN资源加载失败，使用cdn-first策略 - 先尝试备用CDN，然后尝试本地资源
        if (strategy === 'cdn-first') {
            // 先尝试备用CDN
            if (this.tryLoadFromCDN(element, url, resourceType)) {
                return true; // 成功启动了CDN回退
            }
            
            // 如果没有可用的备用CDN，尝试本地资源
            if (this.tryLoadFromLocal(element, url, resourceType)) {
                return true; // 成功启动了本地回退
            }
        }
        
        // 如果上述所有策略都未能处理，则应用最终备用方案但返回false
        logger.warn(`⚠️ 无法为资源 ${url} 启动任何有效的回退策略`);
        this.applyFinalFallback(element, resourceType);
        return false; // 改为false，表示没有成功启动任何回退策略
    }
    
    /**
     * 尝试从备用CDN加载资源
     * @param {HTMLElement} element - 资源元素
     * @param {string} url - 当前URL
     * @param {string} resourceType - 资源类型
     * @returns {boolean} 是否已处理
     */
    tryLoadFromCDN(element, url, resourceType) {
        // 获取资源ID
        const resourceId = element.getAttribute('data-resource-id') || 
                         resourceType || 
                         this.resourceConfig.extractResourceId(url, resourceType);
                         
        // 确定资源类型
        const type = element.tagName === 'LINK' ? 'styles' : 'scripts';
        
        // 获取下一个可用的CDN URL
        const nextCdnUrl = this.resourceConfig.getNextCdnUrl(type, resourceId);
        
        if (!nextCdnUrl) {
            logger.info(`🔍 没有可用的备用CDN: ${resourceId}`);
            return false;
        }
        
        logger.info(`🔄 尝试备用CDN: ${nextCdnUrl}`);
        
        // 触发回退开始事件 - 新增
        resourceEvents.emit(RESOURCE_EVENTS.FALLBACK_START, {
            resourceId,
            resourceType,
            originalUrl: url,
            fallbackUrl: nextCdnUrl,
            fallbackType: 'cdn',
            priority: element.getAttribute('data-priority') || 'medium'
        });
        
        // 替换资源元素
        const newElement = this.replaceResourceElement(element, nextCdnUrl, resourceType);
        
        if (newElement) {
            // 设置加载成功处理
            newElement.addEventListener('load', () => {
                logger.info(`✅ 备用CDN加载成功: ${nextCdnUrl}`);
                this.loadedResources.add(nextCdnUrl);
                setTimeout(() => {
                    newElement.media = 'all';
                }, 1500);
                
                // 触发回退成功事件 - 新增
                resourceEvents.emit(RESOURCE_EVENTS.FALLBACK_SUCCESS, {
                    resourceId,
                    resourceType,
                    originalUrl: url,
                    fallbackUrl: nextCdnUrl,
                    fallbackType: 'cdn',
                    priority: element.getAttribute('data-priority') || 'medium'
                });
                
                // 触发加载成功事件 - 新增
                resourceEvents.emit(RESOURCE_EVENTS.LOADING_SUCCESS, {
                    resourceId,
                    resourceType,
                    url: nextCdnUrl,
                    isReplacement: true,
                    priority: element.getAttribute('data-priority') || 'medium'
                });
            });
        }
        
        return true;
    }
    
    /**
     * 尝试从本地加载资源
     * @param {HTMLElement} element - 资源元素
     * @param {string} url - 资源URL
     * @param {string} resourceType - 资源类型
     */
    tryLoadFromLocal(element, url, resourceType) {
        // 获取资源ID
        const resourceId = element.getAttribute('data-resource-id') || 
                         resourceType || 
                         this.resourceConfig.extractResourceId(url, resourceType);
                         
        // 尝试从元素属性中获取本地备用URL
        let localUrl = element.getAttribute('data-local-fallback');
        
        if (!localUrl) {
            logger.warn(`⚠️ 无法确定本地URL: ${url}`);
            this.applyFinalFallback(element, resourceType);
            return;
        }
        
        logger.info(`🔄 尝试从本地加载: ${localUrl}`);
        
        // 触发回退开始事件 - 新增
        resourceEvents.emit(RESOURCE_EVENTS.FALLBACK_START, {
            resourceId,
            resourceType,
            originalUrl: url,
            fallbackUrl: localUrl,
            fallbackType: 'local',
            priority: element.getAttribute('data-priority') || 'medium'
        });
        
        // 替换为本地资源元素
        const newElement = this.replaceResourceElement(element, localUrl, resourceType, true);
        
        if (newElement) {
            // 设置加载成功处理
            newElement.addEventListener('load', () => {
                logger.info(`✅ 本地资源加载成功: ${localUrl}`);
                this.loadedResources.add(localUrl);
                
                setTimeout(() => {
                    newElement.media = 'all';
                }, 200);

                // 触发回退成功事件 - 新增
                resourceEvents.emit(RESOURCE_EVENTS.FALLBACK_SUCCESS, {
                    resourceId,
                    resourceType,
                    originalUrl: url,
                    fallbackUrl: localUrl,
                    fallbackType: 'local',
                    priority: element.getAttribute('data-priority') || 'medium'
                });
                
                // 触发加载成功事件 - 新增
                resourceEvents.emit(RESOURCE_EVENTS.LOADING_SUCCESS, {
                    resourceId,
                    resourceType, 
                    url: localUrl,
                    isReplacement: true,
                    priority: element.getAttribute('data-priority') || 'medium'
                });
            });
            
            // 设置加载失败处理
            newElement.addEventListener('error', () => {
                logger.warn(`❌ 本地资源加载失败: ${localUrl}`);
                
                // 触发回退失败事件 - 新增
                resourceEvents.emit(RESOURCE_EVENTS.FALLBACK_FAILURE, {
                    resourceId,
                    resourceType,
                    originalUrl: url,
                    fallbackUrl: localUrl,
                    fallbackType: 'local',
                    priority: element.getAttribute('data-priority') || 'medium'
                });
                
                // 应用最终备用方法
                this.applyFinalFallback(newElement, resourceType);
            });
        }

        return true;
    }
    
    /**
     * 应用最终的备用方法
     * @param {HTMLElement} element - 原始元素
     * @param {string} resourceType - 资源类型
     */
    applyFinalFallback(element, resourceType) {
        logger.info(`🔄 应用备用方案: ${resourceType}`);
        
        // 特殊资源处理
        if (resourceType === 'font-awesome') {
            styleResourceLoader.injectFontAwesomeFallbackStyles();
            document.documentElement.classList.add('no-fontawesome');
        } 
        // 可以继续添加其他资源类型的处理...
    }   
    
    /**
     * 创建新的资源元素替换旧元素
     * @param {HTMLElement} oldElement - 旧元素
     * @param {string} localUrl - 本地URL
     * @param {string} resourceType - 资源类型
     * @param {boolean} isLocal - 是否为本地资源
     */
    replaceResourceElement(oldElement, localUrl, resourceType, isLocal = false) {
        // 创建新元素
        const newElement = document.createElement(oldElement.tagName);
        
        // 设置核心属性 - 确保使用原始的localUrl，不要拼接resourceType
        if (oldElement.tagName === 'LINK') {
            logger.info(`创建新的资源元素: oldElement.tagName === 'LINK'`);
            newElement.rel = 'stylesheet';
            newElement.href = localUrl; // 直接使用localUrl，不添加任何后缀
        } else {
            logger.info(`创建新的资源元素: oldElement.tagName !== 'LINK'`);
            newElement.src = localUrl; // 直接使用localUrl，不添加任何后缀
        }
        
        // 复制其他属性
        Array.from(oldElement.attributes).forEach(attr => {
            // 跳过href/src属性，避免覆盖上面设置的值
            if (attr.name !== 'href' && attr.name !== 'src') {
                newElement.setAttribute(attr.name, attr.value);
            }
        });
        
        // 添加或更新data-resource-type属性
        if (resourceType) {
            newElement.setAttribute('data-resource-type', resourceType);
        }
        
        // 标记为本地资源
        if (isLocal) {
            newElement.setAttribute('data-local-resource', 'true');
        }
            
        // 替换元素
        if (oldElement.parentNode) {
            oldElement.parentNode.replaceChild(newElement, oldElement);
            return newElement;
        }
        
        return null;
    }
    
    /**
     * 加载页面所需的关键资源
     * 该函数用于在页面加载时先加载个别关键资源（比如基本图标和字体），但目前没有实际用处。因为：
     * 1. 高优先级资源 Font Awesome 已经提前加载。其他高优先级资源（如 Bootstrap Icons）目前并没有实际使用，无需加载。
     * 2. 中低优先级资源（如 Prism、Katex等）全部采用懒加载，在包含这些资源的页面中才会由懒加载模块调用加载器（PrismLoader、KatexLoader等）进行加载。
     * 之所以保留该函数，是因为它可能在未来用于加载其他关键资源，而且目前用它来检查加载失败的资源，可以确保在页面加载时及时发现并处理资源加载问题。
     */
    loadCriticalResources() {
        logger.debug('🚀 加载页面所需关键资源...（目前没有实际用处）');
        
        // 使用resourceChecker检查加载失败的资源
        setTimeout(() => {
            if (resourceChecker && typeof resourceChecker.checkForFailedResources === 'function') {
                resourceChecker.checkForFailedResources();
            } else {
                logger.warn('⚠️ 资源检查器未初始化或没有checkForFailedResources方法');
            }
        }, 2000);
    }

}

// 创建一个单例实例并导出
const resourceManager = new ResourceManager();

// 导出单例和类
export { resourceManager, ResourceManager };
export default resourceManager;
