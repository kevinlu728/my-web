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
import resourceConfig, { resourceStrategies } from '../config/resources.js';
import resourceTimeout from './resourceTimeout.js';
import { resourceChecker } from './resourceChecker.js';
import { styleResourceLoader } from './styleResourceLoader.js';
import { scriptResourceLoader } from './scriptResourceLoader.js';
import { prismLoader } from './prismLoader.js';

// 替换为从resources.js导入的策略
const RESOURCE_STRATEGIES = resourceStrategies.mapping;

class ResourceManager {
    constructor() {
        logger.info('ResourceManager构造函数（日志级别尚未更新，早期日志使用info级别）');
        this.loadedResources = new Set();
        this.failedResources = new Set();
        this.resourceConfig = resourceConfig;
        
        // 添加防御性检查，确保依赖模块可用
        if (resourceChecker && typeof resourceChecker.updateConfig === 'function') {
            // 更新resourceChecker的配置
        } else {
            logger.warn('⚠️ 资源检查器未初始化，跳过配置更新');
        }
        
        // 添加防御性检查，确保依赖模块可用
        if (resourceTimeout && typeof resourceTimeout.updateConfig === 'function') {
            // 配置资源超时管理器，使用内联函数而不是绑定方法
            resourceTimeout.updateConfig({
                    timeoutCallback: (resourceType, url, priority) => {
                        logger.warn(`⏱️ 资源加载超时: ${url} (${resourceType}, 优先级: ${priority})`);
                        // 如果有必要，可以在这里添加更多的处理逻辑
                    }
            });
        } else {
            logger.warn('⚠️ 资源超时管理器未初始化，跳过超时配置');
        }
        
        // 添加防御性检查，确保依赖模块可用
        if (styleResourceLoader && typeof styleResourceLoader.setDependencies === 'function') {
            // 设置resourceStyles的依赖
            styleResourceLoader.setDependencies({
                setResourceTimeout: this.setResourceTimeout.bind(this),
                clearResourceTimeout: this.clearResourceTimeout.bind(this),
                handleResourceError: this.handleResourceError.bind(this)
            });
        } else {
            logger.warn('⚠️ 样式资源加载器未初始化，跳过依赖设置');
        }

        if (scriptResourceLoader && typeof scriptResourceLoader.setDependencies === 'function') {
            // 设置scriptResourceLoader的依赖
            scriptResourceLoader.setDependencies({
                setResourceTimeout: this.setResourceTimeout.bind(this),
                clearResourceTimeout: this.clearResourceTimeout.bind(this),
                handleResourceError: this.handleResourceError.bind(this)
            });
        } else {
            logger.warn('⚠️ 脚本资源加载器未初始化，跳过依赖设置');
        }

        // 初始化错误处理和资源扫描
        this.initializeErrorHandling();
        
        // 资源错误处理策略映射
        this.errorHandlers = {
            'font-awesome': () => styleResourceLoader && styleResourceLoader.injectFontAwesomeFallbackStyles(),
            'bootstrap-icons': () => styleResourceLoader && styleResourceLoader.injectBasicIconStyles(),
            // 保留其他现有错误处理器
        };
        
        // 记录已处理资源的回退状态
        this._resourceFallbackStatus = new Map();
        
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
     * 初始化全局资源错误处理
     */
    initializeErrorHandling() {
        // 记录已处理的错误URL，避免重复处理
        const processedErrors = new Set();
        
        // 监听资源加载错误
        window.addEventListener('error', (event) => {
            if (event.target && (event.target.tagName === 'LINK' || event.target.tagName === 'SCRIPT')) {
                const url = event.target.href || event.target.src;
                if (url) {
                    // 检查是否已处理过该URL的错误
                    if (processedErrors.has(url)) {
                        logger.debug(`⏭️ 跳过重复处理的错误: ${url}`);
                        return;
                    }
                    
                    // 标记为已处理
                    processedErrors.add(url);
                    
                    // 设置超时清理，防止集合无限增长
                    setTimeout(() => processedErrors.delete(url), 5000);
                    
                    this.handleResourceError(event.target, url);
                }
            }
        }, true);
    }
    
    /**
     * 加载博客页面所需的资源
     * 先加载关键的回退样式，然后解除内容阻塞，最后加载高优先级资源
     */
    loadBlogPageResources() {
        logger.debug('🚀 加载博客页面所需资源...');
        
        // 立即注入关键内联样式
        styleResourceLoader.injectCriticalInlineStyles();

        // 立即解除内容阻塞
        setTimeout(() => {
            document.dispatchEvent(new Event('content-unblocked'));
        }, 50);
        
        // // 加载高优先级资源，但不阻塞渲染
        // setTimeout(() => {
        //     this.loadResourcesByPriority('high')
        //         .catch(error => logger.warn('加载高优先级资源时出错:', error));
            
        //     // 然后加载中优先级资源
        //     setTimeout(() => {
        //         this.loadResourcesByPriority('medium')
        //             .catch(error => logger.warn('加载中优先级资源时出错:', error));
        //     }, 1000);

        //     // 延迟加载低优先级资源
        //     setTimeout(() => {
        //         this.lazyLoadLowPriorityResources();
        //     }, 2000);
        // }, 300);
        
        // 检查加载失败的资源
        setTimeout(() => {
            this.checkForFailedResources();
        }, 2000);
    }

    /**
     * 解除内容加载阻塞
     * 移除阻塞内容显示的CSS和其他限制
     */
    unblockContentLoading() {
        // 移除可能阻塞内容显示的元素或使其淡出
        const placeholders = document.querySelectorAll('.placeholder-content');
        placeholders.forEach(el => {
            // 平滑过渡
            el.style.transition = 'opacity 0.5s ease';
            el.style.opacity = '0';
            
            // 延迟后移除元素
            setTimeout(() => {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 550);
        });
        // 添加自定义事件通知页面内容可以显示了
        document.dispatchEvent(new Event('content-unblocked'));
        
        logger.debug('🎉 内容加载阻塞已解除，页面内容可以显示');
    }
    /**
     * 按优先级加载资源
     */
    loadResourcesByPriority(priority) {
        logger.info(`📦 加载${priority}优先级资源`);
        
        let priorityResources = [];
        try {
            priorityResources = this.resourceConfig.getResourcesByPriority(priority) || [];
        } catch (error) {
            logger.error(`获取${priority}优先级资源时出错:`, error);
            return Promise.resolve([]);
        }
        
        if (priorityResources.length === 0) {
            logger.debug(`没有找到${priority}优先级的资源`);
            return Promise.resolve([]);
        }
        
        // 资源加载promises
        const loadPromises = priorityResources.map(resourceInfo => {
            const { type, name, resource } = resourceInfo;
            
            // 防御性检查：确保资源对象有效
            if (!resource || !resource.primary) {
                logger.warn(`⚠️ 跳过无效资源: ${name}`);
                return Promise.resolve(null);
            }
            
            // 对于样式资源
            if (type === 'styles') {
                return styleResourceLoader.loadCss(
                    resource.primary,
                    {
                        resourceType: name,
                        fallbacks: resource.fallbacks || [],
                        attributes: resource.attributes || {}
                    },
                    true  // 非阻塞模式
                );
            }
            
            // 对于脚本资源
            if (type === 'scripts') {
                return scriptResourceLoader.loadScript(
                    resource.primary,
                    resource,  // 传递完整的资源对象
                    {
                        async: true,
                        defer: true
                    }
                );
            }
            
            return Promise.resolve(null);
        });
        
        return Promise.all(loadPromises);
    }
    /**
     * 懒加载低优先级资源
     * 仅在页面完全加载后执行
     */
    lazyLoadLowPriorityResources() {
        logger.info('🐢 开始懒加载低优先级资源');
        
        // 只有在页面完全加载后，才加载低优先级资源
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    this.loadResourcesByPriority('low');
                }, 2000); // 给页面加载后留出2秒缓冲时间
            });
            return;
        }
        
        // 如果页面已加载完成，延迟加载低优先级资源
        setTimeout(() => {
            this.loadResourcesByPriority('low');
        }, 1000);
    }
    /**
     * 确保页面中的关键元素都有资源组标记
     * 这样可以根据可见性按需加载资源
     */
    ensureResourceGroupMarkers() {
        logger.debug('🔍 确保页面元素有正确的资源组标记...');
        
        // 为代码块添加标记
        document.querySelectorAll('pre code, .code-block, code[class*="language-"]').forEach(el => {
            const parent = el.closest('pre') || el;
            if (!parent.hasAttribute('data-resource-group')) {
                parent.setAttribute('data-resource-group', 'code');
                logger.debug('📌 为代码块添加资源组标记: code');
            }
        });
        
        // 为数学公式添加标记
        document.querySelectorAll('.math, .formula, .katex').forEach(el => {
            if (!el.hasAttribute('data-resource-group')) {
                el.setAttribute('data-resource-group', 'math');
                logger.debug('📌 为数学公式添加资源组标记: math');
            }
        });
        
        // 为标签云添加标记
        document.querySelectorAll('.tag-cloud').forEach(el => {
            if (!el.hasAttribute('data-resource-group')) {
                el.setAttribute('data-resource-group', 'tagcloud');
                logger.debug('📌 为标签云添加资源组标记: tagcloud');
            }
        });
        
        // 为文章容器添加核心资源组标记
        const articleContainer = document.getElementById('article-container');
        if (articleContainer && !articleContainer.hasAttribute('data-resource-group')) {
            articleContainer.setAttribute('data-resource-group', 'core');
            logger.debug('📌 为文章容器添加资源组标记: core');
        }
        
        logger.debug('✅ 资源组标记完成');
    }
    /**
     * 设置基于可见性的资源加载
     * 当特定元素进入视口时加载相关资源
     */
    setupVisibilityBasedLoading() {
        // 先确保所有元素都有正确的资源组标记
        this.ensureResourceGroupMarkers();
        
        // 正确保存this引用
        const self = this;
        
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const resourceGroup = element.getAttribute('data-resource-group');
                    
                    if (resourceGroup) {
                        logger.info(`📋 懒加载资源组: ${resourceGroup}`);
                        
                        // 现在self正确引用ResourceLoader实例
                        self.loadResourceGroup(resourceGroup).then(() => {
                            logger.debug(`✅ 资源组 "${resourceGroup}" 已加载`);
                            
                            // 资源加载后初始化
                            if (resourceGroup === 'code' && window.Prism) {
                                window.Prism.highlightElement(element);
                            }
                            
                            observer.unobserve(element);
                        });
                    }
                }
            });
        }, {
            root: null,
            rootMargin: '100px',
            threshold: 0.1
        });
        
        document.querySelectorAll('[data-resource-group]').forEach(element => {
                observer.observe(element);
        });
        
        this.lazyLoadObserver = observer;
    }

    /**
     * 加载特定资源组
     * @param {string} groupName - 资源组名称
     * @returns {Promise} - 加载完成的Promise
     */
    loadResourceGroup(groupName) {
        logger.info(`🧩 加载资源组: ${groupName}`);
        
        if (!groupName) {
            return Promise.reject(new Error('资源组名称不能为空'));
        }
        
        // 记录已尝试加载的资源组
        if (!this._loadedResourceGroups) {
            this._loadedResourceGroups = new Set();
        }
        
        // 如果已经加载过，直接返回成功
        if (this._loadedResourceGroups.has(groupName)) {
            logger.debug(`资源组 "${groupName}" 已加载，跳过`);
            return Promise.resolve(true);
        }
        
        // 根据资源组类型加载不同资源
        let loadPromise;
        
        switch (groupName) {
            case 'core':
                // core组被视为基础资源组，已在初始化时加载
                logger.debug(`基础资源组 "core" 已默认加载`);
                this._loadedResourceGroups.add(groupName);
                return Promise.resolve(true);
            
            case 'code':
                // 加载代码高亮相关资源
                logger.debug(`加载"code"资源组`);
                loadPromise = prismLoader.loadCodeHighlightResources();
                break;
            
            case 'math':
                // 简单地将math组标记为已加载，不需要实际加载资源
                logger.debug('简单地将math资源组标记为已加载');
                this._loadedResourceGroups.add(groupName);
                return Promise.resolve(true);
            
            default:
                logger.warn(`⚠️ 未知的资源组: ${groupName}`);
                return Promise.resolve(false);

        }
        
        return loadPromise.then(result => {
            if (result) {
                // 标记资源组为已加载
                this._loadedResourceGroups.add(groupName);
            }
            return result;
        });
    }

    /**
     * 获取资源的加载策略
     * @param {string} resourceType - 资源类型
     * @returns {string} - 加载策略
     */
    getResourceStrategy(resourceType) {
        if (!resourceType) return RESOURCE_STRATEGIES.default;
        
        // 检查特定资源类型
        for (const [type, strategy] of Object.entries(RESOURCE_STRATEGIES)) {
            if (resourceType.includes(type)) return strategy;
        }
        
        // 回退到默认策略
        return RESOURCE_STRATEGIES.default;
    }
    
    /**
     * 处理资源加载错误
     * @param {HTMLElement} element - 加载失败的DOM元素
     * @param {string} url - 资源URL
     */
    handleResourceError(element, url) {
        logger.debug(`🔄 处理资源加载错误: ${url}`);
        // 基本验证
        if (!element) {
            logger.error('❌ handleResourceError: 无效的元素');
            return;
        }
        
        // 如果元素已从DOM中移除，记录但不进一步处理
        if (!element.parentNode) {
            logger.warn(`⚠️ 资源 ${url} 加载失败，但元素已从DOM中移除`);
            return;
        }
    
        // 检查是否已经处理过这个URL，避免重复处理
        if (this.failedResources.has(url)) {
            logger.debug(`🔄 资源 ${url} 已被标记为失败，跳过重复处理`);
            return;
        }
        
        // 将URL添加到失败资源集合中
        this.failedResources.add(url);
        
        logger.warn(`⚠️ 资源加载失败: ${url}`);
        
        // 获取资源信息
        const resourceType = element.getAttribute('data-resource-type');
        const resourceId = element.getAttribute('data-resource-id') || resourceConfig.getResourceBaseName(url);
        const localFallback = element.getAttribute('data-local-fallback');
        
        // 获取资源策略
        const strategy = this.getResourceStrategy(resourceType);
        // 根据策略和资源类型处理错误
        this.handleResourceByStrategy(element, url, resourceType, resourceId, strategy, localFallback);
    }   
    /**
     * 根据策略处理资源错误
     * @param {HTMLElement} element - 加载失败的DOM元素
     * @param {string} url - 资源URL
     * @param {string} resourceType - 资源类型
     * @param {string} resourceId - 资源ID
     * @param {string} strategy - 加载策略
     * @param {string} localFallback - 本地回退路径
     */
    handleResourceByStrategy(element, url, resourceType, resourceId, strategy, localFallback) {
        // 构造资源键，用于跟踪回退状态
        const resourceKey = `${resourceType || 'unknown'}-${resourceId}`;
        
        // 获取当前回退状态
        const currentStatus = this._resourceFallbackStatus.get(resourceKey) || {
            tried: new Set([url]), // 记录已尝试的URL
            step: 0 // 回退步骤，0=CDN, 1=本地, 2=备用
        };
        
        // 更新回退状态
        this._resourceFallbackStatus.set(resourceKey, currentStatus);
        
        // 根据策略和当前步骤决定下一步操作
        if (strategy === 'local-first') {
            // 本地优先策略
            if (currentStatus.step === 0) {
                // 本地资源失败，尝试CDN
                currentStatus.step = 1;
                this.tryLoadFromCDN(element, resourceType, resourceId);
            } else if (currentStatus.step === 1) {
                // CDN也失败，使用备用方案
                currentStatus.step = 2;
                this.applyFallbackMethod(element, resourceType, resourceId);
            }
        } else {
            // CDN优先策略
            if (currentStatus.step === 0) {
                // CDN失败，尝试本地资源
                currentStatus.step = 1;
                this.tryLoadFromLocal(element, resourceType, resourceId, localFallback);
            } else if (currentStatus.step === 1) {
                // 本地资源也失败，使用备用方案
                currentStatus.step = 2;
                this.applyFallbackMethod(element, resourceType, resourceId);
            }
        }
    }
    /**
     * 处理关键资源加载失败
     * @param {string} resourceName - 资源名称
     * @param {string} priority - 资源优先级，默认为null（自动检测）
     * @param {boolean} silent - 是否静默处理（不显示错误消息）
     */
    handleCriticalResourceFailure(resourceName, priority = null, silent = false) {
        // 检测资源的实际优先级
        let actualPriority = priority;
        if (!actualPriority) {
            actualPriority = resourceConfig.getResourcePriorityByUrl(resourceName, resourceName);
        }
        
        // 对于常见的基础资源，如果所有回退都失败，使用统一的回退样式文件
        if (!silent) {
            if (resourceName === 'bootstrap-icons.css' || resourceName.includes('fontawesome')) {
                styleResourceLoader.injectBasicIconStyles();
            } else if (resourceName === 'katex.min.css' || resourceName.includes('katex')) {
                styleResourceLoader.injectBasicKatexStyles();
            }
        }
        
        // 静默模式下不显示消息
        if (silent) {
            if (actualPriority === 'critical' || actualPriority === 'high') {
                logger.debug(`ℹ️ 静默处理 ${actualPriority} 优先级资源: ${resourceName}`);
            }
            return;
        }
        
        // 根据实际优先级选择适当的消息级别
        if (actualPriority === 'critical') {
            // 只有真正的关键资源才显示错误
            logger.error(`❌ 关键资源加载失败: ${resourceName}`);
        } else if (actualPriority === 'high') {
            logger.warn(`⚠️ 高优先级资源加载失败: ${resourceName}`);
        } else if (actualPriority === 'medium') {
            logger.debug(`ℹ️ 中优先级资源加载失败: ${resourceName}`);
        } else {
            logger.debug(`ℹ️ 低优先级资源加载失败: ${resourceName}`);
        }
    }
    
    /**
     * 尝试从CDN加载资源
     * @param {HTMLElement} element - 原始元素
     * @param {string} resourceType - 资源类型
     * @param {string} resourceId - 资源ID
     */
    tryLoadFromCDN(element, resourceType, resourceId) {
        // 获取下一个CDN URL, getNextCdnUrl方法尚未实现，需在resources.js中实现
        const cdnUrl = this.resourceConfig.getNextCdnUrl(resourceType, resourceId); 
        
        if (!cdnUrl) {
            logger.warn(`⚠️ 没有可用的CDN资源: ${resourceType}-${resourceId}`);
            this.applyFallbackMethod(element, resourceType, resourceId);
            return;
        }
        
        logger.info(`🔄 尝试从CDN加载资源: ${cdnUrl}`);
        
        // 创建新元素并替换
        this.replaceResourceElement(element, cdnUrl, resourceType);
    }   
    /**
     * 尝试从本地加载资源
     * @param {HTMLElement} element - 原始元素
     * @param {string} resourceType - 资源类型
     * @param {string} resourceId - 资源ID
     * @param {string} localFallback - 本地回退URL
     */
    tryLoadFromLocal(element, resourceType, resourceId, localFallback) {
        logger.debug(`🔄 tryLoadFromLocal, 尝试从本地加载资源: ${resourceId}`);
        // 优先使用指定的本地回退路径
        let localUrl = localFallback;
        
        // 如果没有提供本地回退路径，尝试从预定义映射中获取
        if (!localUrl) {
            logger.info(`没有提供本地回退路径，尝试从预定义映射中获取`);
            // 预定义的资源映射
            const localResourceMap = {
                'font-awesome': '/assets/libs/font-awesome/all.min.css',
                'bootstrap-icons': '/assets/libs/bootstrap-icons/bootstrap-icons.css',
                'prism-theme': '/assets/libs/prism/themes/prism-tomorrow.min.css',
                'prism': '/assets/libs/prism/prism.min.js',
                'katex': '/assets/libs/katex/katex.min.css'
            };
            
            localUrl = localResourceMap[resourceId];
        }
        
        if (!localUrl) {
            logger.warn(`⚠️ 没有可用的本地资源: ${resourceType}-${resourceId}`);
            this.applyFallbackMethod(element, resourceType, resourceId);
            return;
        }
        
        logger.info(`🔄 尝试从本地加载资源: ${localUrl}`);
        
        // 创建新元素并替换
        const newElement = this.replaceResourceElement(element, localUrl, resourceType);
        
        // 添加一个成功加载的事件监听器
        if (newElement) {
            newElement.addEventListener('load', () => {
                // window.prismThemeLoaded = true
                logger.info(`✅ 成功从本地加载资源: ${localUrl}`);
            });
        }
    }
    
    /**
     * 应用最终的备用方法
     * @param {HTMLElement} element - 原始元素
     * @param {string} resourceType - 资源类型
     * @param {string} resourceId - 资源ID
     */
    applyFallbackMethod(element, resourceType, resourceId) {
        logger.info(`🔄 应用备用方案: ${resourceType}-${resourceId}`);
        
        // 检查是否有特定的错误处理器
        if (resourceType && this.errorHandlers[resourceType]) {
            this.errorHandlers[resourceType]();
            return;
        }
        
        // 特殊资源处理
        if (resourceType === 'font-awesome' || resourceId.includes('font-awesome')) {
            styleResourceLoader.injectFontAwesomeFallbackStyles();
            document.documentElement.classList.add('no-fontawesome');
        } else if (resourceType === 'bootstrap-icons' || resourceId.includes('bootstrap-icons')) {
            styleResourceLoader.injectBasicIconStyles();
        } 
        // 可以继续添加其他资源类型的处理...
        
        // 通用处理 - 根据优先级处理
        const priority = element.getAttribute('data-priority') || 'medium';
        this.handleCriticalResourceFailure(resourceId, priority);
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
            newElement.rel = 'stylesheet';
            newElement.href = localUrl; // 直接使用localUrl，不添加任何后缀
        } else {
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
     * 检查加载失败的资源
     * 这是一个额外的安全措施，检查任何可能的资源加载失败
     */
    checkForFailedResources() {
        logger.debug('🔍 检查资源加载状态...');
        
        // 确保this上下文可用
        const self = this;
        
        // 检查样式表
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            
            // 检查样式表是否加载成功
            let loaded = false;
            try {
                // 尝试访问样式表规则，如果加载失败会抛出错误
                Array.from(document.styleSheets).forEach(sheet => {
                    if (sheet.href === link.href) {
                        try {
                            // 尝试读取规则以确认加载成功
                            const rules = sheet.cssRules;
                            loaded = true;
                        } catch (e) {
                            // 对于跨域样式表，无法读取规则，但这不意味着加载失败
                            if (e.name === 'SecurityError') {
                                loaded = true; // 假设跨域样式表已加载
                            }
                        }
                    }
                });
            } catch (e) {
                logger.warn(`检查样式表加载状态时出错:`, e);
            }
            
            if (!loaded && !self.failedResources.has(href)) {
                logger.warn(`检测到可能失败的样式表: ${href}`);
                self.handleResourceError(link, href);
            }
        });
        
        // 检查脚本
        const scripts = document.querySelectorAll('script[src]');
        scripts.forEach(script => {
            const src = script.getAttribute('src');
            if (!src) return;
            
            // 目前没有可靠的方法检查脚本是否真正加载成功
            // 我们依赖onerror事件处理失败的脚本
        });
        
        logger.debug('🔍 资源加载状态检查完成');
    }

}

// 创建一个单例实例并导出
const resourceManager = new ResourceManager();

// 导出单例和类
export { resourceManager, ResourceManager };
export default resourceManager;
