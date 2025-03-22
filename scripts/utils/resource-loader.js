/**
 * @file resource-loader.js
 * @description 资源加载器，提供资源加载错误处理和回退机制
 * @author 陆凯
 * @version 1.1.0
 * @created 2024-03-22
 * 
 * 该模块负责优化资源加载:
 * - 提供CSS和JS资源加载的回退机制
 * - 处理CDN资源加载失败的情况
 * - 可选择性地预加载关键资源
 * - 监控资源加载性能
 */

// 导入集中式资源配置
import resourceConfig from '../config/resources.js';

class ResourceLoader {
    constructor() {
        this.loadedResources = new Set();
        this.failedResources = new Set();
        this.resourceConfig = resourceConfig;
        this.cdnMappings = {};
        this.isInitialized = false;
        
        // 从资源配置中初始化CDN映射
        this.initializeCdnMappings();
        
        // 初始化
        this.initializeErrorHandling();
        this.scanExistingResources();
    }
    
    /**
     * 从资源配置初始化CDN映射
     */
    initializeCdnMappings() {
        // 处理样式资源
        Object.keys(this.resourceConfig.resources.styles).forEach(styleName => {
            const style = this.resourceConfig.resources.styles[styleName];
            if (style.resourceId) {
                const urls = [style.primary, ...(style.fallbacks || [])].map(config => {
                    if (config.provider === 'jsdelivr') {
                        return this.resourceConfig.cdnProviders.jsdelivr.npmTemplate
                            .replace('{package}', config.package)
                            .replace('{version}', config.version)
                            .replace('{path}', config.path);
                    } else if (config.provider === 'cdnjs') {
                        return this.resourceConfig.cdnProviders.cdnjs.template
                            .replace('{library}', config.library)
                            .replace('{version}', config.version)
                            .replace('{path}', config.path);
                    } else if (config.provider === 'local') {
                        return this.resourceConfig.cdnProviders.local.template
                            .replace('{library}', config.library)
                            .replace('{path}', config.path);
                    }
                    return '';
                }).filter(url => url);
                
                this.cdnMappings[style.resourceId] = urls;
            }
        });
        
        // 处理脚本资源
        Object.keys(this.resourceConfig.resources.scripts).forEach(scriptName => {
            const script = this.resourceConfig.resources.scripts[scriptName];
            if (script.resourceId) {
                const urls = [script.primary, ...(script.fallbacks || [])].map(config => {
                    if (config.provider === 'jsdelivr') {
                        return this.resourceConfig.cdnProviders.jsdelivr.npmTemplate
                            .replace('{package}', config.package)
                            .replace('{version}', config.version)
                            .replace('{path}', config.path);
                    } else if (config.provider === 'cdnjs') {
                        return this.resourceConfig.cdnProviders.cdnjs.template
                            .replace('{library}', config.library)
                            .replace('{version}', config.version)
                            .replace('{path}', config.path);
                    } else if (config.provider === 'local') {
                        return this.resourceConfig.cdnProviders.local.template
                            .replace('{library}', config.library)
                            .replace('{path}', config.path);
                    }
                    return '';
                }).filter(url => url);
                
                this.cdnMappings[script.resourceId] = urls;
            }
        });
        
        console.log('✅ 资源映射已从配置初始化，共有', Object.keys(this.cdnMappings).length, '个资源配置');
    }
    
    /**
     * 扫描页面中已存在的资源，提取它们的类型和本地回退路径
     */
    scanExistingResources() {
        // 寻找带有data-resource-type属性的资源
        const resourceElements = document.querySelectorAll('[data-resource-type]');
        
        resourceElements.forEach(element => {
            const resourceType = element.getAttribute('data-resource-type');
            const localFallback = element.getAttribute('data-local-fallback');
            
            if (resourceType && localFallback) {
                console.log(`识别到已存在的资源: ${resourceType}, 本地路径: ${localFallback}`);
                
                // 更新或添加到映射中
                if (!this.cdnMappings[resourceType]) {
                    this.cdnMappings[resourceType] = [];
                }
                
                // 确保本地回退路径是最后一个选项
                const currentUrl = element.href || element.src;
                if (currentUrl) {
                    if (!this.cdnMappings[resourceType].includes(currentUrl)) {
                        this.cdnMappings[resourceType].unshift(currentUrl);
                    }
                }
                
                if (!this.cdnMappings[resourceType].includes(localFallback)) {
                    this.cdnMappings[resourceType].push(localFallback);
                }
            }
        });
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
        
        console.log('✅ 资源加载错误处理机制已初始化');
    }
    
    /**
     * 处理资源加载错误
     * @param {HTMLElement} element - 加载失败的DOM元素
     * @param {string} url - 资源URL
     */
    handleResourceError(element, url) {
        // 检查URL和元素的有效性
        if (!element) {
            console.warn('⚠️ 无法处理资源错误：DOM元素为空');
            return;
        }
        
        if (!url || typeof url !== 'string') {
            console.warn('⚠️ 无法处理资源错误：无效的URL', url);
            return;
        }
    
        // 如果已经处理过此资源，则跳过
        if (this.failedResources.has(url)) return;
        this.failedResources.add(url);
        
        console.warn(`⚠️ 资源加载失败: ${url}`);
        
        // 检查元素是否有自定义的资源类型
        const resourceType = element.getAttribute('data-resource-type');
        const localFallback = element.getAttribute('data-local-fallback');
        
        // 对于CSS资源，尝试回退
        if (element.tagName === 'LINK' && element.rel === 'stylesheet') {
            // 如果元素有本地回退路径，优先使用它
            if (resourceType && localFallback) {
                console.log(`🔍 使用指定的本地回退: ${localFallback}`);
                this.applyResourceFallback(element, url, localFallback);
            } else {
                // 否则使用通用回退机制
                this.tryFallbackCss(element, url);
            }
        }
        
        // 对于其他资源，可以添加特定处理
    }
    
    /**
     * 直接应用指定的资源回退
     * @param {HTMLElement} element - DOM元素
     * @param {string} originalUrl - 原始URL
     * @param {string} fallbackUrl - 回退URL
     */
    applyResourceFallback(element, originalUrl, fallbackUrl) {
        console.log(`🔄 直接应用回退资源: ${fallbackUrl}`);
        
        if (element.tagName === 'LINK') {
            // 创建新的link元素并替换失败的元素
            const newLink = document.createElement('link');
            newLink.rel = 'stylesheet';
            newLink.href = fallbackUrl;
            newLink.onload = () => console.log(`✅ 回退资源加载成功: ${fallbackUrl}`);
            newLink.onerror = () => {
                console.error(`❌ 回退资源加载失败: ${fallbackUrl}`);
                this.handleCriticalResourceFailure(this.getResourceBaseName(originalUrl));
            };
            
            // 替换原元素
            if (element.parentNode) {
                element.parentNode.replaceChild(newLink, element);
            } else {
                document.head.appendChild(newLink);
            }
        } else if (element.tagName === 'SCRIPT') {
            // 创建新的script元素并替换失败的元素
            const newScript = document.createElement('script');
            if (element.type) newScript.type = element.type;
            if (element.async) newScript.async = element.async;
            if (element.defer) newScript.defer = element.defer;
            
            newScript.src = fallbackUrl;
            newScript.onload = () => console.log(`✅ 回退脚本加载成功: ${fallbackUrl}`);
            newScript.onerror = () => console.error(`❌ 回退脚本加载失败: ${fallbackUrl}`);
            
            // 替换原元素
            if (element.parentNode) {
                element.parentNode.replaceChild(newScript, element);
            } else {
                document.head.appendChild(newScript);
            }
        }
    }
    
    /**
     * 尝试为CSS使用回退CDN
     * @param {HTMLLinkElement} linkElement - 链接元素
     * @param {string} originalUrl - 原始URL
     */
    tryFallbackCss(linkElement, originalUrl) {
        // 从URL获取资源基本名称
        const resourceName = this.getResourceBaseName(originalUrl);
        
        // 如果有匹配的回退资源
        if (this.cdnMappings[resourceName]) {
            const fallbacks = this.cdnMappings[resourceName];
            // 找到当前URL在回退列表中的索引
            const currentIndex = fallbacks.findIndex(url => originalUrl.includes(url));
            
            // 如果有下一个回退选项
            if (currentIndex < fallbacks.length - 1) {
                const nextFallback = fallbacks[currentIndex + 1];
                console.log(`🔄 尝试使用回退资源: ${nextFallback}`);
                
                // 创建新的link元素并替换失败的元素
                const newLink = document.createElement('link');
                newLink.rel = 'stylesheet';
                newLink.href = nextFallback;
                newLink.onload = () => console.log(`✅ 回退资源加载成功: ${nextFallback}`);
                newLink.onerror = () => this.handleResourceError(newLink, nextFallback);
                
                // 替换原元素
                if (linkElement.parentNode) {
                    linkElement.parentNode.replaceChild(newLink, linkElement);
                } else {
                    document.head.appendChild(newLink);
                }
            } else {
                console.warn(`❌ 所有回退选项均已尝试: ${resourceName}`);
                this.handleCriticalResourceFailure(resourceName);
            }
        } else {
            console.warn(`❓ 未找到资源的回退选项: ${resourceName}`);
        }
    }
    
    /**
     * 从URL获取资源基本名称
     * @param {string} url - 资源URL
     * @returns {string} 资源基本名称
     */
    getResourceBaseName(url) {
        // 尝试匹配已知的资源名称
        for (const key in this.cdnMappings) {
            if (this.cdnMappings[key].some(mappingUrl => url.includes(mappingUrl) || url.endsWith(key))) {
                return key;
            }
        }
        
        // 如果没有匹配，尝试提取文件名
        const urlParts = url.split('/');
        return urlParts[urlParts.length - 1].split('?')[0]; // 移除查询参数
    }
    
    /**
     * 处理关键资源加载失败
     * @param {string} resourceName - 资源名称
     */
    handleCriticalResourceFailure(resourceName) {
        // 对于关键CSS，如果所有回退都失败，尝试内联最小样式
        if (resourceName === 'bootstrap-icons.css') {
            this.injectBasicIconStyles();
        } else if (resourceName === 'katex.min.css') {
            this.injectBasicKatexStyles();
        }
        
        // 可以添加用户通知
        console.error(`❌ 关键资源加载失败: ${resourceName}`);
    }
    
    /**
     * 注入基本的图标样式
     */
    injectBasicIconStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 最小Bootstrap图标回退样式 */
            .bi {
                display: inline-block;
                width: 1em;
                height: 1em;
                vertical-align: -0.125em;
            }
            
            /* 添加一些关键图标的Unicode回退 */
            .bi-chevron-right::before { content: "›"; }
            .bi-chevron-down::before { content: "⌄"; }
            .bi-search::before { content: "🔍"; }
            .bi-x::before { content: "×"; }
        `;
        document.head.appendChild(style);
        console.log('✅ 已注入基本图标回退样式');
    }
    
    /**
     * 注入基本的KaTeX样式
     */
    injectBasicKatexStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 最小KaTeX回退样式 */
            .katex { font-family: monospace; }
            .katex-display { margin: 1em 0; text-align: center; }
        `;
        document.head.appendChild(style);
        console.log('✅ 已注入基本KaTeX回退样式');
    }
    
    /**
     * 预加载关键资源
     */
    preloadCriticalResources() {
        const criticalResources = this.getCriticalResources();
        console.log(`🚀 开始预加载 ${criticalResources.length} 个关键资源...`);
        
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
            console.log(`🔍 预加载关键资源: ${url}`);
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
        console.log(`🚀 开始加载 ${highPriorityResources.length} 个高优先级资源...`);
        
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
                        return this.loadCss(resource.primary, resource);
                    } else if (resource.primary.endsWith('.js')) {
                        return this.loadScript(resource.primary, resource);
                    }
                } else {
                    console.warn('⚠️ 无效的资源 primary URL:', resource);
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
        console.log(`🚀 开始加载 ${resources.length} 个${priority}优先级资源...`);
        
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
        // 检查参数有效性
        if (!resourceGroup || typeof resourceGroup !== 'string') {
            console.warn('⚠️ 尝试加载无效的资源组:', resourceGroup);
            return Promise.resolve();
        }
        
        console.log(`🚀 按需加载资源组: ${resourceGroup}`);
        
        switch (resourceGroup) {
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
                    console.log('✅ 代码高亮资源加载完成');
                    
                    // 如果页面中有Prism，触发代码高亮刷新
                    if (window.Prism && typeof window.Prism.highlightAll === 'function') {
                        // 延迟执行以确保DOM已更新
                        setTimeout(() => {
                            try {
                                window.Prism.highlightAll();
                                console.log('✅ 代码高亮已应用');
                            } catch (e) {
                                console.warn('❌ 应用代码高亮失败:', e);
                            }
                        }, 100);
                    }
                });
                
            case 'core':
                // 加载核心资源，一般包括字体图标等
                return Promise.all([
                    this.loadResource('styles', 'bootstrap-icons'),
                    this.loadResource('styles', 'font-awesome')
                ]);
                
            default:
                console.warn(`⚠️ 未知的资源组: "${resourceGroup}"`);
                return Promise.resolve();
        }
    }
    
    /**
     * 初始化页面资源加载策略
     * 按照优先级逐步加载资源
     */
    initResourceLoadingStrategy() {
        if (this.isInitialized) {
            console.log('🔍 资源加载策略已初始化，跳过');
            return;
        }
        
        console.log('🚀 初始化资源加载策略...');
        this.isInitialized = true;
        
        // 1. 预加载关键资源（通常是CSS）
        this.preloadCriticalResources();
        
        // 2. 在DOMContentLoaded后加载高优先级资源
        document.addEventListener('DOMContentLoaded', () => {
            this.loadHighPriorityResources().then(() => {
                console.log('✅ 高优先级资源加载完成');
                
                // 3. 开始加载中等优先级资源
                this.loadResourcesByPriority('medium').then(() => {
                    console.log('✅ 中等优先级资源加载完成');
                });
                
                // 4. 安排在空闲时间加载低优先级资源
                this.lazyLoadLowPriorityResources();
            });
        });
        
        // 5. 监听页面完全加载事件
        window.addEventListener('load', () => {
            console.log('🏁 页面完全加载，继续加载剩余资源');
            
            // 如果浏览器支持Intersection Observer，为可见性加载做准备
            if ('IntersectionObserver' in window) {
                this.setupVisibilityBasedLoading();
            }
        });
    }
    
    /**
     * 设置基于可见性的资源加载
     * 当特定元素进入视口时加载相关资源
     */
    setupVisibilityBasedLoading() {
        // 先确保所有元素都有正确的资源组标记
        if (typeof ensureResourceGroupMarkers === 'function') {
            ensureResourceGroupMarkers();
        }
        
        // 创建Intersection Observer
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    if (!element || !element.dataset) return;
                    
                    const resourceGroup = element.dataset.resourceGroup;
                    
                    if (resourceGroup && typeof resourceGroup === 'string') {
                        console.log(`📍 元素可见，加载资源组: ${resourceGroup}`);
                        this.loadResourceGroup(resourceGroup);
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
                console.log(`👁️ 监视元素加载资源组: ${element.dataset.resourceGroup}`);
            }
        });
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
            console.warn(`⚠️ 无效的资源请求: 类型=${resourceType}, 名称=${resourceName}`);
            return Promise.resolve(); // 返回已解决的Promise，避免中断链
        }
        
        const resource = this.getResourceUrls(resourceType, resourceName);
        if (!resource) {
            console.warn(`⚠️ 资源未找到: ${resourceType}.${resourceName}`);
            return Promise.resolve(); // 返回已解决的Promise而不是拒绝，避免中断链
        }
        
        // 特殊处理Prism组件
        if (resourceName === 'prism-components' && resource.components && resource.getUrls) {
            console.log(`🔍 处理Prism组件集合 (${resource.components.length}个组件)`);
            
            // 返回加载所有组件的Promise
            return Promise.all(
                resource.components.map(component => {
                    const urls = resource.getUrls(component);
                    if (urls && urls.length > 0) {
                        return this.loadScript(urls[0], { fallbacks: urls.slice(1) });
                    }
                    return Promise.resolve();
                })
            );
        }
        
        // 验证资源对象的primary字段是否有效
        if (!resource.primary || typeof resource.primary !== 'string') {
            console.warn(`⚠️ 资源对象缺少有效的primary URL: ${resourceType}.${resourceName}`, resource);
            return Promise.resolve();
        }
        
        // 根据资源类型选择加载方法
        if (resourceType === 'styles') {
            return this.loadCss(resource.primary, resource);
        } else if (resourceType === 'scripts') {
            return this.loadScript(resource.primary, resource);
        }
        
        console.warn(`⚠️ 不支持的资源类型: ${resourceType}`);
        return Promise.resolve();
    }
    
    /**
     * 动态加载JavaScript资源
     * @param {string} url - JS文件URL
     * @param {object} resource - 资源对象，包含备用URL
     * @returns {Promise} 加载完成的Promise
     */
    loadScript(url, resource) {
        return new Promise((resolve, reject) => {
            // 检查URL是否有效
            if (!url || typeof url !== 'string') {
                console.warn('⚠️ 尝试加载无效的脚本URL:', url);
                resolve(); // 不阻塞Promise链
                return;
            }
            
            // 跳过已加载的资源
            if (this.loadedResources.has(url)) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.async = false; // 保持执行顺序
            
            // 添加自定义属性
            if (resource && resource.attributes) {
                Object.entries(resource.attributes).forEach(([key, value]) => {
                    script.setAttribute(key, value);
                });
            }
            
            script.src = url;
            
            script.onload = () => {
                this.loadedResources.add(url);
                resolve(script);
            };
            
            script.onerror = (error) => {
                this.handleResourceError(script, url);
                // 虽然错误处理会尝试回退，但我们仍然完成Promise以避免阻塞
                resolve();
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * 动态加载CSS资源
     * @param {string} url - CSS文件URL
     * @param {object} resource - 资源对象，包含备用URL
     * @returns {Promise} 加载完成的Promise
     */
    loadCss(url, resource) {
        return new Promise((resolve, reject) => {
            // 检查URL是否有效
            if (!url || typeof url !== 'string') {
                console.warn('⚠️ 尝试加载无效的CSS URL:', url);
                resolve(); // 不阻塞Promise链
                return;
            }
            
            // 跳过已加载的资源
            if (this.loadedResources.has(url)) {
                resolve();
                return;
            }
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            
            // 添加自定义属性
            if (resource && resource.attributes) {
                Object.entries(resource.attributes).forEach(([key, value]) => {
                    link.setAttribute(key, value);
                });
            }
            
            link.href = url;
            
            link.onload = () => {
                this.loadedResources.add(url);
                resolve(link);
            };
            
            link.onerror = (error) => {
                this.handleResourceError(link, url);
                // 虽然错误处理会尝试回退，但我们仍然完成Promise以避免阻塞
                resolve();
            };
            
            document.head.appendChild(link);
        });
    }
}

// 导出单例
export const resourceLoader = new ResourceLoader();

/**
 * 检查并修复页面上的资源组标记
 * 确保所有关键元素都有正确的资源组标记
 */
function ensureResourceGroupMarkers() {
    // 为body添加animation资源组标记（用于Particles.js）
    if (!document.body.hasAttribute('data-resource-group')) {
        document.body.setAttribute('data-resource-group', 'animation');
        console.log('✅ 已为body添加animation资源组标记');
    }
    
    // 为文章容器添加core资源组标记
    const articleContainer = document.getElementById('article-container');
    if (articleContainer && !articleContainer.hasAttribute('data-resource-group')) {
        articleContainer.setAttribute('data-resource-group', 'core');
        console.log('✅ 已为文章容器添加core资源组标记');
    }
    
    // 为代码块添加code资源组标记
    document.querySelectorAll('pre code, .code-block, code[class*="language-"]').forEach(el => {
        const parent = el.closest('pre') || el;
        if (!parent.hasAttribute('data-resource-group')) {
            parent.setAttribute('data-resource-group', 'code');
        }
    });
    
    // 为数学公式添加math资源组标记
    document.querySelectorAll('.math-block, .formula, .math, .katex').forEach(el => {
        if (!el.hasAttribute('data-resource-group')) {
            el.setAttribute('data-resource-group', 'math');
        }
    });
    
    // 为图表添加chart资源组标记
    document.querySelectorAll('.chart-container').forEach(el => {
        if (!el.hasAttribute('data-resource-group')) {
            el.setAttribute('data-resource-group', 'chart');
        }
    });
    
    // 为流程图添加diagram资源组标记
    document.querySelectorAll('.mermaid').forEach(el => {
        if (!el.hasAttribute('data-resource-group')) {
            el.setAttribute('data-resource-group', 'diagram');
        }
    });
    
    // 为标签云添加tagcloud资源组标记
    document.querySelectorAll('.tag-cloud').forEach(el => {
        if (!el.hasAttribute('data-resource-group')) {
            el.setAttribute('data-resource-group', 'tagcloud');
        }
    });
    
    console.log('✅ 资源组标记检查和修复完成');
}

// 在文档加载完成后自动初始化
document.addEventListener('DOMContentLoaded', () => {
    // 暴露给全局以便调试
    window.resourceLoader = resourceLoader;
    
    // 确保所有关键元素都有资源组标记
    ensureResourceGroupMarkers();
    
    // 扫描现有资源以确保映射更新
    resourceLoader.scanExistingResources();
    
    // 显示控制台中的初始化成功消息
    console.log('✅ 资源加载器已初始化');
    
    // 清理不需要的预加载资源 - 作为第二道防线
    cleanupUnusedPreloads();
    
    // 监视并阻止新添加的预加载标签
    monitorDynamicPreloads();
    
    // 如果页面中有失败的资源，尝试修复
    setTimeout(() => {
        const failedLinks = document.querySelectorAll('link[rel="stylesheet"][href]:not([href^="data:"])');
        failedLinks.forEach(link => {
            // 检查stylesheet是否已加载
            const isLoaded = Array.from(document.styleSheets).some(sheet => {
                try {
                    return sheet.href === link.href;
                } catch (e) {
                    return false;
                }
            });
            
            if (!isLoaded) {
                console.warn(`检测到可能失败但未触发onerror的资源: ${link.href}`);
                resourceLoader.handleResourceError(link, link.href);
            }
        });
    }, 3000); // 给资源3秒加载时间
});

/**
 * 清理不需要的预加载资源
 * 移除那些预加载但实际未使用的资源，避免控制台警告
 */
function cleanupUnusedPreloads() {
    // 已知不需要的预加载资源URL部分
    const unnecessaryPreloads = [
        'highlight.js@11.7.0/styles/tomorrow.min.css',
        'katex@0.16.8/dist/katex.min.css'
    ];
    
    // 查找所有预加载链接
    const preloads = document.querySelectorAll('link[rel="preload"]');
    let removedCount = 0;
    
    // 检查并移除不需要的预加载
    preloads.forEach(link => {
        const href = link.getAttribute('href');
        if (href && unnecessaryPreloads.some(url => href.includes(url))) {
            console.log(`🧹 [资源加载器] 移除不需要的预加载资源: ${href}`);
            if (link.parentNode) {
                link.parentNode.removeChild(link);
                removedCount++;
            }
        }
    });
    
    if (removedCount > 0) {
        console.log(`[资源加载器] 已移除 ${removedCount} 个不需要的预加载资源`);
    }
}

/**
 * 监视并阻止动态添加的预加载标签
 */
function monitorDynamicPreloads() {
    // 已知不需要的预加载资源URL部分
    const unnecessaryPreloads = [
        'highlight.js@11.7.0/styles/tomorrow.min.css',
        'katex@0.16.8/dist/katex.min.css'
    ];
    
    // 使用MutationObserver监视DOM变化
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            // 检查新添加的节点
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    // 检查是否是预加载标签
                    if (node.nodeName === 'LINK' && node.rel === 'preload') {
                        const href = node.getAttribute('href');
                        if (href && unnecessaryPreloads.some(url => href.includes(url))) {
                            console.warn(`🚫 [资源加载器] 检测到并移除动态添加的预加载: ${href}`);
                            node.parentNode.removeChild(node);
                        }
                    }
                });
            }
        });
    });
    
    // 开始监视整个文档中的链接添加
    observer.observe(document, { 
        childList: true, 
        subtree: true 
    });
    
    console.log('✅ [资源加载器] 已开始监视动态添加的预加载标签');
} 