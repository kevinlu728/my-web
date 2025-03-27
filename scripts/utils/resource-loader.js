/**
 * @file resource-loader.js
 * @description 资源加载器，提供资源加载错误处理和回退机制
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
 * 重构历史:
 * - 2024-04-14: 将CDN映射逻辑分离到cdn-mapper.js
 * - 2024-05-01: 将资源检查逻辑分离到resource-checker.js
 * - 2024-05-01: 将超时管理逻辑分离到resource-timeout.js
 */

// 导入集中式资源配置
import resourceConfig from '../config/resources.js';
import { CdnMapper } from './cdn-mapper.js';
import { resourceStyles } from './resource-styles.js';
import { resourceChecker } from './resource-checker.js';
import { resourceTimeout } from './resource-timeout.js';
import logger from './logger.js';

class ResourceLoader {
    constructor() {
        this.loadedResources = new Set();
        this.failedResources = new Set();
        this.resourceConfig = resourceConfig;
        
        // 创建CDN映射器实例
        this.cdnMapper = new CdnMapper(resourceConfig);
        
        // 配置项：是否启用KaTeX本地资源（根据您的情况，我们设置为false）
        this.katexLocalResourceConfirmed = false;
        
        // 更新resourceChecker的配置
        resourceChecker.updateConfig({
            katexLocalResourceConfirmed: this.katexLocalResourceConfirmed
        });
        
        // 配置资源超时管理器
        resourceTimeout.updateConfig({
            timeoutCallback: this.handleResourceTimeout.bind(this)
        });
        
        // 设置resourceStyles的依赖
        resourceStyles.setDependencies({
            handleResourceError: this.handleResourceError.bind(this),
            setResourceTimeout: this.setResourceTimeout.bind(this),
            clearResourceTimeout: this.clearResourceTimeout.bind(this)
        });
        
        // 初始化
        this.initializeErrorHandling();
        this.cdnMapper.scanExistingResources();
    }
    
    /**
     * 初始化全局资源错误处理
     */
    initializeErrorHandling() {
        // 监听资源加载错误
        window.addEventListener('error', (event) => {
            if (event.target && (event.target.tagName === 'LINK' || event.target.tagName === 'SCRIPT')) {
                const url = event.target.href || event.target.src;
                if (url) {
                    this.handleResourceError(event.target, url);
                }
            }
        }, true);
    }
    
    /**
     * 处理资源加载错误
     * @param {HTMLElement} element - 加载失败的DOM元素
     * @param {string} url - 资源URL
     */
    handleResourceError(element, url) {
        // 检查URL和元素的有效性
        if (!element) {
            logger.warn('⚠️ 无法处理资源错误：DOM元素为空');
            return;
        }
        
        if (!url || typeof url !== 'string') {
            logger.warn('⚠️ 无法处理资源错误：无效的URL', url);
            return;
        }
    
        // 如果已经处理过此资源，则跳过
        if (this.failedResources.has(url)) return;
        this.failedResources.add(url);
        
        logger.warn(`⚠️ 资源加载失败: ${url}`);
        
        // 检查元素是否有自定义的资源类型
        const resourceType = element.getAttribute('data-resource-type');
        const localFallback = element.getAttribute('data-local-fallback');
        
        // 获取资源优先级
        let priority = this.getResourcePriorityByUrl(url, resourceType);
        
        // 检查本地回退资源是否存在（针对KaTeX等非关键资源）
        if (localFallback && 
            (url.includes('katex') || resourceType?.includes('katex')) && 
            priority !== 'critical' && 
            priority !== 'high') {
            
            // 检查本地资源是否存在
            const localResourceExists = resourceChecker.checkLocalResourceExists(localFallback);
            
            if (!localResourceExists) {
                logger.debug(`ℹ️ 非关键资源 ${url} 加载失败，本地回退资源不存在，跳过回退`);
                // 处理资源加载失败，但不尝试加载本地资源
                this.handleCriticalResourceFailure(this.getResourceBaseName(url), priority);
                return;
            }
        }
        
        // 对于CSS资源，尝试回退
        if (element.tagName === 'LINK' && element.rel === 'stylesheet') {
            // 如果元素有本地回退路径，优先使用它
            if (resourceType && localFallback) {
                logger.info(`🔄 使用指定的本地回退: ${localFallback}`);
                this.applyResourceFallback(element, url, localFallback);
            } else {
                // 否则使用通用回退机制
                this.tryFallbackCss(element, url);
            }
        }
        
        // 对于其他资源，可以添加特定处理
    }
    
    /**
     * 根据URL或资源类型获取资源优先级
     * @param {string} url - 资源URL
     * @param {string} resourceType - 资源类型
     * @returns {string} 资源优先级 ('critical', 'high', 'medium', 'low')
     */
    getResourcePriorityByUrl(url, resourceType) {
        // 尝试从资源配置中获取优先级
        let priority = null;
        
        try {
            if (resourceType) {
                // 尝试从样式资源中查找优先级
                if (this.resourceConfig.resources && this.resourceConfig.resources.styles) {
                    Object.entries(this.resourceConfig.resources.styles).forEach(([name, res]) => {
                        if (res.resourceId === resourceType || name === resourceType) {
                            priority = res.priority;
                        }
                    });
                }
                
                // 尝试从脚本资源中查找优先级
                if (!priority && this.resourceConfig.resources && this.resourceConfig.resources.scripts) {
                    Object.entries(this.resourceConfig.resources.scripts).forEach(([name, res]) => {
                        if (res.resourceId === resourceType || name === resourceType) {
                            priority = res.priority;
                        }
                    });
                }
            }
            
            // 如果通过resourceType未找到，则通过URL进行启发式判断
            if (!priority) {
                if (url.includes('bootstrap') || url.includes('fontawesome') || resourceType?.includes('bootstrap') || resourceType?.includes('fontawesome')) {
                    priority = 'high'; // Bootstrap和FontAwesome通常是高优先级
                } else if (url.includes('katex') || url.includes('math') || resourceType?.includes('katex')) {
                    priority = 'medium'; // KaTeX是中等优先级
                    logger.debug('📌 检测到KaTeX资源，设置为中等优先级');
                } else {
                    priority = 'low'; // 默认为低优先级
                }
            }
        } catch (e) {
            logger.warn('获取资源优先级时出错', e);
            priority = 'medium'; // 出错时默认为中等优先级
        }
        
        return priority;
    }
    
    /**
     * 直接应用指定的资源回退
     * @param {HTMLElement} element - DOM元素
     * @param {string} originalUrl - 原始URL
     * @param {string} fallbackUrl - 回退URL
     * @returns {boolean} 是否成功应用回退
     */
    applyResourceFallback(element, originalUrl, fallbackUrl) {
        // 先检查是否为已知不存在的资源路径
        if (resourceChecker.isNonExistentResource(fallbackUrl)) {
            logger.debug(`🔍 跳过不存在的本地回退资源: ${fallbackUrl}`);
            return false;
        }
        
        logger.info(`🔄 直接应用回退资源: ${fallbackUrl}`);
        
        if (element.tagName === 'LINK') {
            // 创建新的link元素并替换失败的元素
            const newLink = document.createElement('link');
            newLink.rel = 'stylesheet';
            newLink.href = fallbackUrl;
            newLink.onload = () => logger.info(`✅ 回退资源加载成功: ${fallbackUrl}`);
            newLink.onerror = () => {
                logger.error(`❌ 回退资源加载失败: ${fallbackUrl}`);
                
                // 如果是katex相关资源而且回退失败，标记为不存在
                if (fallbackUrl.includes('/katex/')) {
                    resourceChecker.markResourceAsNonExistent(fallbackUrl);
                }
                
                // 尝试从资源配置中获取优先级
                let priority = this.getResourcePriorityByUrl(originalUrl, element.getAttribute('data-resource-type'));
                
                // 处理回退资源失败
                this.handleCriticalResourceFailure(this.getResourceBaseName(originalUrl), priority);
            };
            
            // 复制原始元素的属性
            Array.from(element.attributes).forEach(attr => {
                if (attr.name !== 'href') {
                    newLink.setAttribute(attr.name, attr.value);
                }
            });
            
            // 替换元素
            element.parentNode.replaceChild(newLink, element);
            this.loadedResources.add(fallbackUrl);
            
            return true;
        } else if (element.tagName === 'SCRIPT') {
            // 处理JavaScript资源的回退
            const newScript = document.createElement('script');
            newScript.src = fallbackUrl;
            newScript.async = element.async;
            newScript.defer = element.defer;
            newScript.onload = () => logger.info(`✅ 回退脚本加载成功: ${fallbackUrl}`);
            newScript.onerror = () => {
                logger.error(`❌ 回退脚本加载失败: ${fallbackUrl}`);
                
                // 如果是katex相关资源而且回退失败，标记为不存在
                if (fallbackUrl.includes('/katex/')) {
                    resourceChecker.markResourceAsNonExistent(fallbackUrl);
                }
                
                // 获取资源优先级
                let priority = this.getResourcePriorityByUrl(originalUrl, element.getAttribute('data-resource-type'));
                
                this.handleCriticalResourceFailure(this.getResourceBaseName(originalUrl), priority);
            };
            
            // 复制原始元素的属性
            Array.from(element.attributes).forEach(attr => {
                if (attr.name !== 'src') {
                    newScript.setAttribute(attr.name, attr.value);
                }
            });
            
            // 替换元素
            element.parentNode.replaceChild(newScript, element);
            this.loadedResources.add(fallbackUrl);
            
            return true;
        }
        
        return false;
    }
    
    /**
     * 尝试为CSS资源使用回退
     * @param {HTMLElement} linkElement - Link元素
     * @param {string} originalUrl - 原始URL
     */
    tryFallbackCss(linkElement, originalUrl) {
        try {
            const resourceName = this.getResourceBaseName(originalUrl);
            
            // 获取资源优先级
            const resourceType = linkElement.getAttribute('data-resource-type');
            const priority = this.getResourcePriorityByUrl(originalUrl, resourceType);
            
            // 对于非关键的KaTeX资源，可以直接跳过回退处理
            if ((originalUrl.includes('katex') || (resourceType && resourceType.includes('katex'))) && 
                priority !== 'critical' && 
                priority !== 'high' && 
                !this.katexLocalResourceConfirmed) {
                logger.debug(`ℹ️ 跳过非关键KaTeX资源的回退: ${resourceName}`);
                this.handleCriticalResourceFailure(resourceName, priority);
                return;
            }
            
            // 查找该资源的CDN映射
            if (!resourceType) {
                logger.warn(`⚠️ 无法获取资源类型: ${originalUrl}`);
                return;
            }
            
            // 获取下一个回退URL
            const nextFallbackUrl = this.cdnMapper.getNextFallbackUrl(resourceType, originalUrl);
            if (nextFallbackUrl) {
                // 检查是否为已知不存在的资源
                if (resourceChecker.isNonExistentResource(nextFallbackUrl)) {
                    logger.debug(`🔍 跳过不存在的回退资源: ${nextFallbackUrl}`);
                    this.handleCriticalResourceFailure(resourceName, priority);
                    return;
                }
                
                logger.info(`🔄 尝试使用CDN回退: ${nextFallbackUrl}`);
                this.applyResourceFallback(linkElement, originalUrl, nextFallbackUrl);
                return;
            }
            
            // 处理回退资源失败
            this.handleCriticalResourceFailure(resourceName, priority);
        } catch (error) {
            logger.error('CSS回退处理出错:', error);
        }
    }
    
    /**
     * 从URL中提取资源基本名称
     * @param {string} url - 资源URL
     * @returns {string} 资源基本名称
     */
    getResourceBaseName(url) {
        if (!url || typeof url !== 'string') return '';
        
        try {
            // 尝试提取文件名
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/');
            const fileName = pathParts[pathParts.length - 1];
            
            return fileName || urlObj.pathname;
        } catch (e) {
            // 如果URL解析失败，尝试简单的路径分割
            const parts = url.split('/');
            return parts[parts.length - 1] || url;
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
            actualPriority = this.getResourcePriorityByUrl(resourceName, resourceName);
        }
        
        // 对于已知本地不存在的KaTeX资源，设置为静默处理
        if (resourceName.includes('katex') && !this.katexLocalResourceConfirmed) {
            silent = true;
        }
        
        // 对于常见的基础资源，如果所有回退都失败，使用统一的回退样式文件
        if (!silent) {
            if (resourceName === 'bootstrap-icons.css' || resourceName.includes('fontawesome')) {
                resourceStyles.injectBasicIconStyles();
            } else if (resourceName === 'katex.min.css' || resourceName.includes('katex')) {
                resourceStyles.injectBasicKatexStyles();
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
     * 预加载关键资源
     */
    preloadCriticalResources() {
        const criticalResources = this.getCriticalResources();
        logger.debug(`🚀 开始预加载 ${criticalResources.length} 个关键资源...`);
        
        criticalResources.forEach(resource => {
            if (!resource) return;
            
            const link = document.createElement('link');
            link.rel = 'preload';
            
            // 根据扩展名确定正确的as属性
            const url = resource.primary;
            if (url.endsWith('.css')) {
                link.as = 'style';
            } else if (url.endsWith('.js')) {
                link.as = 'script';
                link.setAttribute('crossorigin', 'anonymous');
            } else if (url.endsWith('.woff2') || url.endsWith('.woff') || url.endsWith('.ttf')) {
                link.as = 'font';
                link.setAttribute('crossorigin', 'anonymous');
            } else if (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.webp')) {
                link.as = 'image';
            }
            
            link.href = url;
            document.head.appendChild(link);
            
            this.loadedResources.add(url);
            logger.debug(`🔍 预加载关键资源: ${url}`);
        });
    }
    
    /**
     * 获取关键资源
     * 遍历所有资源配置，找出优先级为'critical'的资源
     * @returns {Array} 关键资源列表
     */
    getCriticalResources() {
        const criticalResources = [];
        
        // 处理样式资源
        if (this.resourceConfig.resources && this.resourceConfig.resources.styles) {
            Object.keys(this.resourceConfig.resources.styles).forEach(name => {
                const resource = this.resourceConfig.resources.styles[name];
                if (resource.priority === 'critical') {
                    criticalResources.push(this.getResourceUrls('styles', name));
                }
            });
        }
        
        // 处理脚本资源
        if (this.resourceConfig.resources && this.resourceConfig.resources.scripts) {
            Object.keys(this.resourceConfig.resources.scripts).forEach(name => {
                const resource = this.resourceConfig.resources.scripts[name];
                if (resource.priority === 'critical') {
                    criticalResources.push(this.getResourceUrls('scripts', name));
                }
            });
        }
        
        return criticalResources;
    }
    
    /**
     * 加载高优先级资源
     * 这些资源应在页面加载后立即加载
     */
    loadHighPriorityResources() {
        const highPriorityResources = this.resourceConfig.getHighPriorityResources();
        logger.debug(`🚀 开始加载 ${highPriorityResources.length} 个高优先级资源...`);
        
        // 使用Promise.all并行加载所有高优先级资源
        return Promise.all(
            highPriorityResources.map(resource => {
                // 跳过已加载的资源或无效资源
                if (!resource || !resource.primary || this.loadedResources.has(resource.primary)) {
                    return Promise.resolve();
                }
                
                // 根据资源类型确定加载方法
                if (typeof resource.primary === 'string') {
                    if (resource.primary.endsWith('.css')) {
                        return resourceStyles.loadCss(resource.primary, resource);
                    } else if (resource.primary.endsWith('.js')) {
                        return this.loadScript(resource.primary, resource);
                    }
                } else {
                    logger.warn('⚠️ 无效的资源 primary URL:', resource);
                }
                
                return Promise.resolve();
            })
        );
    }
    
    /**
     * 按需加载指定优先级的资源
     * @param {string} priority - 资源优先级 ('medium', 'low')
     * @returns {Promise} 加载完成的Promise
     */
    loadResourcesByPriority(priority) {
        const resources = this.getResourcesByPriority(priority);
        logger.debug(`🚀 开始加载 ${resources.length} 个${priority}优先级资源...`);
        
        return Promise.all(
            resources.map(item => {
                return this.loadResource(item.type, item.name);
            })
        );
    }
    
    /**
     * 获取指定优先级的资源
     * @param {string} priority - 资源优先级 ('critical', 'high', 'medium', 'low')
     * @returns {Array} 资源列表
     */
    getResourcesByPriority(priority) {
        const result = [];
        
        // 处理样式资源
        if (this.resourceConfig.resources && this.resourceConfig.resources.styles) {
            Object.keys(this.resourceConfig.resources.styles).forEach(name => {
                const resource = this.resourceConfig.resources.styles[name];
                if (resource.priority === priority) {
                    result.push({
                        type: 'styles',
                        name: name
                    });
                }
            });
        }
        
        // 处理脚本资源
        if (this.resourceConfig.resources && this.resourceConfig.resources.scripts) {
            Object.keys(this.resourceConfig.resources.scripts).forEach(name => {
                const resource = this.resourceConfig.resources.scripts[name];
                if (resource.priority === priority) {
                    result.push({
                        type: 'scripts',
                        name: name
                    });
                }
            });
        }
        
        return result;
    }
    
    /**
     * 延迟加载低优先级资源
     * 在页面空闲时或特定条件下加载
     */
    lazyLoadLowPriorityResources() {
        // 如果浏览器支持requestIdleCallback，使用它在空闲时间加载
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                this.loadResourcesByPriority('low');
            }, { timeout: 5000 }); // 设置5秒超时，确保资源最终会被加载
        } else {
            // 否则使用setTimeout延迟加载
            setTimeout(() => {
                this.loadResourcesByPriority('low');
            }, 2000); // 2秒后加载低优先级资源
        }
    }
    
    /**
     * 按需加载特定的资源组
     * @param {string} resourceGroup - 资源组名称
     * @returns {Promise} 加载完成的Promise
     */
    loadResourceGroup(resourceGroup) {
        logger.debug(`📦 加载资源组: ${resourceGroup}`);
        
        switch (resourceGroup) {
            case 'core':
                // 加载核心资源，一般包括字体图标等
                return Promise.all([
                    this.loadResource('styles', 'bootstrap-icons'),
                    // 注释掉Font Awesome加载，改为直接加载fallback.css
                    // this.loadResource('styles', 'font-awesome')
                    resourceStyles.injectBasicIconStyles() // 直接使用回退样式
                ]);
                
            case 'syntax-highlighting':
                // 加载语法高亮相关资源
                this.loadResource('style', 'prism');
                this.loadResource('script', 'prism');
                
                // 加载代码区域行号插件
                this.loadResource('style', 'prism-line-numbers');
                this.loadResource('script', 'prism-line-numbers');
                
                // 加载代码区域工具栏插件
                this.loadResource('style', 'prism-toolbar');
                this.loadResource('script', 'prism-toolbar');
                
                // 加载代码复制按钮插件
                this.loadResource('script', 'prism-copy-to-clipboard');
                
                // 在普通日志之前添加防抖
                const syntaxLoadedIndicator = document.createElement('div');
                syntaxLoadedIndicator.id = 'syntax-resources-loaded';
                syntaxLoadedIndicator.style.display = 'none';
                document.body.appendChild(syntaxLoadedIndicator);
                
                // 设置一个延迟，确保资源有时间加载
                setTimeout(() => {
                    // 创建资源加载完成事件
                    const event = new CustomEvent('syntaxResourcesLoaded');
                    document.dispatchEvent(event);
                    
                    logger.debug('代码高亮资源加载完成');
                    
                    // 应用代码高亮
                    if (window.Prism) {
                        window.Prism.highlightAll();
                        logger.debug('代码高亮已应用');
                    }
                }, 500);
                break;
                
            case 'math':
                // 加载数学公式渲染相关资源
                return Promise.all([
                    this.loadResource('scripts', 'katex-core'),
                    this.loadResource('scripts', 'katex-auto-render'),
                    this.loadResource('styles', 'katex')
                ]);
                
            case 'chart':
                // 加载图表相关资源
                return this.loadResource('scripts', 'chart');
                
            case 'diagram':
                // 加载流程图相关资源
                return this.loadResource('scripts', 'mermaid');
                
            case 'tagcloud':
                // 加载标签云相关资源
                return Promise.all([
                    this.loadResource('scripts', 'd3'),
                    this.loadResource('scripts', 'd3-cloud')
                ]);
                
            case 'animation':
                // 加载动画相关资源
                return this.loadResource('scripts', 'particles');
                
            case 'code':
                // 加载代码高亮相关资源
                return Promise.all([
                    this.loadResource('scripts', 'prism-core'),
                    this.loadResource('scripts', 'prism-components'),
                    this.loadResource('styles', 'prism-theme')
                ]).then(() => {
                    logger.debug('代码高亮资源加载完成');
                    
                    // 如果页面中有Prism，触发代码高亮刷新
                    if (window.Prism && typeof window.Prism.highlightAll === 'function') {
                        // 延迟执行以确保DOM已更新
                        setTimeout(() => {
                            try {
                                window.Prism.highlightAll();
                                logger.debug('代码高亮已应用');
                            } catch (e) {
                                logger.warn('❌ 应用代码高亮失败:', e);
                            }
                        }, 100);
                    }
                });
                
            default:
                logger.warn(`⚠️ 未知的资源组: "${resourceGroup}"`);
                return Promise.resolve();
        }
    }
    
    /**
     * 处理资源超时的回调函数
     * @param {string} url - 资源URL
     * @param {string} resourceType - 资源类型
     * @param {string} priority - 资源优先级
     */
    handleResourceTimeout(url, resourceType, priority) {
        // 把资源标记为已加载，即使实际上可能失败了
        // 这样可以防止无限等待，让页面渲染继续
        this.loadedResources.add(url);
        
        // 处理资源超时，传递优先级确保正确标记资源类型
        const resourceName = this.getResourceBaseName(url);
        
        // 确保KaTeX资源始终使用medium优先级
        let finalPriority = priority;
        if (resourceName.includes('katex') || resourceName === 'katex.min.css' || url.includes('katex')) {
            finalPriority = 'medium';
        }
        
        this.handleCriticalResourceFailure(resourceName, finalPriority);
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
     * 加载无阻塞核心内容
     * 这个方法确保即使外部资源加载失败，页面内容也能显示
     */
    loadNonBlockingCoreContent() {
        logger.debug('🚀 初始化非阻塞核心内容加载...');
        
        // 立即解除内容加载阻塞，不等待任何资源
        // 这确保内容渲染和资源加载完全并行
        setTimeout(() => {
            this.unblockContentLoading();
            // 设置全局标志，通知其他组件内容已解锁
            window.contentUnblocked = true;
        }, 100);
        
        // 先加载关键的回退样式，确保基本样式立即可用
        resourceStyles.injectCriticalInlineStyles();
        
        // 处理关键资源预加载，但设置短超时
        const criticalResources = this.getCriticalResources();
        
        // 对关键资源使用非阻塞方式加载
        criticalResources.forEach(resource => {
            if (!resource || !resource.primary) return;
            
            // 根据资源类型确定加载方法
            const url = resource.primary;
            if (typeof url === 'string') {
                if (url.endsWith('.css')) {
                    // 使用非阻塞方式加载CSS
                    resourceStyles.loadCssNonBlocking(url, resource);
                } else if (url.endsWith('.js')) {
                    // 对于核心脚本，使用async加载
                    const script = document.createElement('script');
                    script.async = true;
                    script.src = url;
                    document.head.appendChild(script);
                }
            }
        });
        
        // 处理任何关键资源的超时
        document.addEventListener('resource-timeout', event => {
            const { url, resourceType, priority } = event.detail;
            logger.warn(`⚠️ 资源 ${url} (${priority}) 加载超时`);
            
            // 对于CSS，为缺失的样式注入最小替代
            if (resourceType === 'styles') {
                const resourceName = this.getResourceBaseName(url);
                this.handleCriticalResourceFailure(resourceName, priority);
            }
        }, { once: false });
        
        // 然后加载其他高优先级资源，但是在后台进行，不阻塞内容显示
        setTimeout(() => {
            this.loadHighPriorityResources()
                .catch(error => logger.warn('加载高优先级资源时出错:', error));
        }, 300);
        
        return Promise.resolve(true); // 立即返回，不阻塞内容加载
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
        document.dispatchEvent(new CustomEvent('content-unblocked'));
        
        logger.debug('🎉 内容加载阻塞已解除，页面内容可以显示');
    }
    
    /**
     * 优先加载基本样式并解除内容阻塞
     * 这个方法确保基本样式尽快加载，而页面内容不被阻塞
     */
    prioritizeContentRendering() {
        logger.debug('🚀 优先处理内容渲染...');
        
        // 加载关键的回退样式
        resourceStyles.injectCriticalInlineStyles();
        
        // 立即解除内容阻塞
        setTimeout(() => {
            this.unblockContentLoading();
            // 设置全局标志，通知其他组件内容已解锁
            window.contentUnblocked = true;
        }, 50);
        
        // 加载高优先级资源，但不阻塞渲染
        setTimeout(() => {
            this.loadResourcesByPriority('high')
                .catch(error => logger.warn('加载高优先级资源时出错:', error));
            
            // 然后加载中优先级资源
            setTimeout(() => {
                this.loadResourcesByPriority('medium')
                    .catch(error => logger.warn('加载中优先级资源时出错:', error));
            }, 1000);
        }, 300);
        
        // 延迟加载低优先级资源
        setTimeout(() => {
            this.lazyLoadLowPriorityResources();
        }, 2000);
        
        return true;
    }
    
    /**
     * 初始化页面资源加载策略
     * 按照优先级逐步加载资源
     */
    initResourceLoadingStrategy() {
        if (this.isInitialized) {
            logger.debug('🔍 资源加载策略已初始化，跳过');
            return;
        }
        
        logger.debug('🚀 初始化资源加载策略...');
        this.isInitialized = true;
        
        // 1. 首先优先处理内容渲染，无论资源是否加载完成
        this.prioritizeContentRendering();
        
        // 2. 在DOM加载后（但不阻塞内容显示）继续加载资源
        document.addEventListener('DOMContentLoaded', () => {
            logger.debug('📃 DOM已加载，继续优化资源加载');
            
            // 确保所有关键元素都有资源组标记
            this.ensureResourceGroupMarkers();
            
            // 检查加载失败的资源
            setTimeout(() => {
                this.checkForFailedResources();
            }, 2000);
        });
        
        // 3. 监听页面完全加载事件
        window.addEventListener('load', () => {
            logger.debug('🏁 页面完全加载，设置基于可见性的后续资源加载');
            
            // 如果浏览器支持Intersection Observer，为可见性加载做准备
            if ('IntersectionObserver' in window) {
                this.setupVisibilityBasedLoading();
            }
        });
    }
    
    /**
     * 确保页面中的关键元素都有资源组标记
     * 这样可以根据可见性按需加载资源
     */
    ensureResourceGroupMarkers() {
        logger.debug('🔍 确保页面元素有正确的资源组标记...');
        
        // 确保this上下文可用
        const self = this;
        
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
        
        // 为图表添加标记
        document.querySelectorAll('.chart, .chart-container').forEach(el => {
            if (!el.hasAttribute('data-resource-group')) {
                el.setAttribute('data-resource-group', 'chart');
                logger.debug('📌 为图表添加资源组标记: chart');
            }
        });
        
        // 为流程图添加标记
        document.querySelectorAll('.mermaid').forEach(el => {
            if (!el.hasAttribute('data-resource-group')) {
                el.setAttribute('data-resource-group', 'diagram');
                logger.debug('📌 为流程图添加资源组标记: diagram');
            }
        });
        
        // 为标签云添加标记
        document.querySelectorAll('.tag-cloud').forEach(el => {
            if (!el.hasAttribute('data-resource-group')) {
                el.setAttribute('data-resource-group', 'tagcloud');
                logger.debug('📌 为标签云添加资源组标记: tagcloud');
            }
        });
        
        // 确保body具有动画资源组标记
        if (!document.body.hasAttribute('data-resource-group')) {
            document.body.setAttribute('data-resource-group', 'animation');
            logger.debug('📌 为body添加资源组标记: animation');
        }
        
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
        
        // 确保this上下文可用
        const self = this;
        
        // 创建Intersection Observer
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    if (!element || !element.dataset) return;
                    
                    const resourceGroup = element.dataset.resourceGroup;
                    
                    if (resourceGroup && typeof resourceGroup === 'string') {
                        logger.debug(`📍 元素可见，加载资源组: ${resourceGroup}`);
                        self.loadResourceGroup(resourceGroup);
                        observer.unobserve(element); // 加载一次后不再观察
                    }
                }
            });
        }, {
            root: null, // 使用视口作为根
            rootMargin: '100px', // 提前100px开始加载
            threshold: 0.1 // 当10%的元素可见时触发
        });
        
        // 观察带有data-resource-group属性的元素
        document.querySelectorAll('[data-resource-group]').forEach(element => {
            if (element && element.dataset && element.dataset.resourceGroup) {
                observer.observe(element);
                logger.debug(`👁️ 监视元素加载资源组: ${element.dataset.resourceGroup}`);
            }
        });
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
    
    /**
     * 根据资源名称获取所有可能的URL
     * @param {string} resourceType - 资源类型 ('styles' 或 'scripts')
     * @param {string} resourceName - 资源名称
     * @returns {object} - 包含主URL和备用URL的对象
     */
    getResourceUrls(resourceType, resourceName) {
        return this.resourceConfig.getResourceUrl(resourceType, resourceName);
    }
    
    /**
     * 加载指定资源
     * @param {string} resourceType - 资源类型 ('styles' 或 'scripts')
     * @param {string} resourceName - 资源名称
     * @param {object} options - 加载选项
     * @returns {Promise} 加载完成的Promise
     */
    loadResource(resourceType, resourceName, options = {}) {
        // 检查参数有效性
        if (!resourceType || !resourceName) {
            logger.warn(`⚠️ 无效的资源请求: 类型=${resourceType}, 名称=${resourceName}`);
            return Promise.resolve(); // 返回已解决的Promise，避免中断链
        }
        
        const resource = this.getResourceUrls(resourceType, resourceName);
        if (!resource) {
            logger.warn(`⚠️ 无效的资源请求: 类型=${resourceType}, 名称=${resourceName}`);
            return Promise.resolve(); // 返回已解决的Promise，避免中断链
        }
        
        // 处理特殊情况：resource.components数组和getUrls方法（例如prism-components）
        if (resource.components && typeof resource.getUrls === 'function') {
            logger.debug(`📦 加载组件集合: ${resourceName} (${resource.components.length}个组件)`);
            
            // 为每个组件创建加载Promise
            const componentPromises = resource.components.map(component => {
                // 使用CdnMapper构建组件URL
                const urls = this.cdnMapper.buildComponentUrls(component, resource.getUrls);
                if (!urls || urls.length === 0) {
                    logger.warn(`⚠️ 组件 ${component.name} 没有可用的URL`);
                    return Promise.resolve();
                }
                
                // 尝试加载第一个URL，如果失败则降级到后续URL
                return this.loadComponentWithFallback(urls, resource.type, component.name);
            });
            
            // 等待所有组件加载完成
            return Promise.all(componentPromises);
        }
        
        // 处理resource.primary是字符串的情况
        if (typeof resource.primary === 'string') {
            // 检查资源是否已经加载
            if (this.loadedResources.has(resource.primary)) {
                logger.debug(`🔍 资源已加载: ${resource.primary}`);
                return Promise.resolve();
            }
            
            // 检查资源是否已经失败
            if (this.failedResources.has(resource.primary)) {
                logger.warn(`⚠️ 资源加载失败: ${resource.primary}`);
                return Promise.resolve();
            }
            
            if (resource.primary.endsWith('.css')) {
                return resourceStyles.loadCss(resource.primary, resource);
            } else if (resource.primary.endsWith('.js')) {
                return this.loadScript(resource.primary, resource);
            }
        }
        // 处理resource.primary是对象的情况
        else if (typeof resource.primary === 'object' && resource.primary) {
            // 使用CdnMapper构建URL
            const url = this.cdnMapper.buildUrlFromProvider(resource.primary);
            
            if (url) {
                // 检查资源是否已经加载
                if (this.loadedResources.has(url)) {
                    logger.debug(`🔍 资源已加载: ${url}`);
                    return Promise.resolve();
                }
                
                // 检查资源是否已经失败
                if (this.failedResources.has(url)) {
                    logger.warn(`⚠️ 资源加载失败: ${url}`);
                    return Promise.resolve();
                }
                
                if (resource.type === 'css' || url.endsWith('.css')) {
                    return resourceStyles.loadCss(url, resource);
                } else if (resource.type === 'js' || url.endsWith('.js')) {
                    return this.loadScript(url, resource);
                }
            }
        }
        
        logger.warn('⚠️ 无效的资源 primary URL:', resource);
        return Promise.resolve(); // 返回已解决的Promise，避免中断链
    }
    
    /**
     * 递归加载组件及其回退资源
     * @param {Array} urls - 要尝试加载的URL列表
     * @param {string} type - 资源类型 ('css' 或 'js')
     * @param {string} componentName - 组件名称(用于日志)
     * @returns {Promise} 加载完成的Promise
     */
    loadComponentWithFallback(urls, type, componentName) {
        if (!urls || urls.length === 0) {
            return Promise.resolve();
        }
        
        // 使用第一个URL
        const url = urls[0];
        
        // 如果已经加载过这个URL，直接返回
        if (this.loadedResources.has(url)) {
            return Promise.resolve();
        }
        
        // 根据类型选择加载方法
        const loadPromise = type === 'css' ? 
            resourceStyles.loadCss(url, { priority: 'medium' }) : 
            this.loadScript(url, { priority: 'medium' });
        
        // 如果当前URL加载失败，尝试下一个URL
        return loadPromise.catch(() => {
            logger.debug(`⚠️ 组件 ${componentName} 加载失败，尝试下一个URL`);
            if (urls.length > 1) {
                // 递归尝试剩余的URL
                return this.loadComponentWithFallback(urls.slice(1), type, componentName);
            }
            return Promise.resolve(); // 所有URL都失败，但不阻断流程
        });
    }
    
    /**
     * 加载JavaScript资源
     * @param {string} url - JavaScript文件URL
     * @param {object} resource - 资源对象
     * @returns {Promise} 加载完成的Promise
     */
    loadScript(url, resource) {
        return new Promise((resolve, reject) => {
            // 检查URL是否有效
            if (!url || typeof url !== 'string') {
                logger.warn('⚠️ 尝试加载无效的JavaScript URL:', url);
                return reject(new Error('无效的JavaScript URL'));
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
            this.setResourceTimeout('scripts', url, priority);
            
            // 创建<script>元素
            const script = document.createElement('script');
            script.src = url;
            
            // 添加自定义属性
            if (resource && resource.attributes) {
                Object.entries(resource.attributes).forEach(([key, value]) => {
                    script.setAttribute(key, value);
                });
            }
            
            // 如果资源需要异步加载
            if (resource && resource.async) {
                script.async = true;
            }
            
            // 如果资源需要延迟加载
            if (resource && resource.defer) {
                script.defer = true;
            }
            
            // 设置onload事件
            script.onload = () => {
                // 清除超时处理器
                this.clearResourceTimeout(url);
                
                this.loadedResources.add(url);
                logger.debug(`✅ JavaScript加载完成: ${url}`);
                resolve();
            };
            
            script.onerror = (err) => {
                // 清除超时处理器
                this.clearResourceTimeout(url);
                
                // 记录错误但不阻塞
                this.handleResourceError(script, url);
                logger.warn(`❌ JavaScript加载失败: ${url}`);
                
                // 虽然加载失败，但仍然解析Promise，以免影响整体流程
                resolve();
            };
            
            // 添加到文档
            document.head.appendChild(script);
        });
    }

    loadResourceGroups(resourceGroups) {
        logger.debug(`🧩 开始加载资源组: ${resourceGroups.join(', ')}`);
        
        // 递归加载资源组
        const loadNext = (index) => {
            // 如果所有资源组都已加载，返回
            if (index >= resourceGroups.length) {
                return Promise.resolve();
            }
            
            // 获取当前资源组
            const group = resourceGroups[index];
            
            // 加载资源组，完成后递归加载下一个
            return this.loadResourceGroup(group)
                .then(() => loadNext(index + 1))
                .catch(error => {
                    logger.error(`❌ 加载资源组 "${group}" 时出错:`, error);
                    return loadNext(index + 1); // 继续加载下一个，不中断整个过程
                });
        };
        
        // 开始加载第一个资源组
        return loadNext(0);
    }
}

// 创建一个单例实例并导出
const resourceLoader = new ResourceLoader();

// 导出单例和类
export { resourceLoader, ResourceLoader };
export default resourceLoader;
