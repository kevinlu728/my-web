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
        this.timeoutHandlers = new Map(); // 存储超时处理器
        this.resourceTimeouts = {
            critical: 3000,   // 关键资源等待3秒
            high: 5000,       // 高优先级资源等待5秒
            medium: 8000,     // 中等优先级资源等待8秒
            low: 15000        // 低优先级资源等待15秒
        };
        
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
     * 启用资源加载的超时处理
     * 对于阻塞页面加载的资源，设置超时自动继续
     * @param {string} resourceType - 资源类型
     * @param {string} url - 资源URL
     * @param {string} priority - 资源优先级
     */
    setResourceTimeout(resourceType, url, priority = 'medium') {
        // 如果已经有超时处理器，先清除
        if (this.timeoutHandlers.has(url)) {
            clearTimeout(this.timeoutHandlers.get(url));
        }
        
        // 根据优先级确定超时时间
        const timeout = this.resourceTimeouts[priority] || 5000;
        
        // 设置新的超时处理器
        const handler = setTimeout(() => {
            console.warn(`⏱️ 资源加载超时 (${timeout}ms): ${url}`);
            
            // 移除超时处理器
            this.timeoutHandlers.delete(url);
            
            // 把资源标记为已加载，即使实际上可能失败了
            // 这样可以防止无限等待，让页面渲染继续
            this.loadedResources.add(url);
            
            // 发送自定义事件通知资源超时
            const event = new CustomEvent('resource-timeout', {
                detail: { 
                    url, 
                    resourceType,
                    priority,
                    timeoutMs: timeout
                }
            });
            document.dispatchEvent(event);
            
            // 对于关键资源，尝试注入基本功能样式
            if (priority === 'critical') {
                const resourceName = this.getResourceBaseName(url);
                this.handleCriticalResourceFailure(resourceName);
            }
        }, timeout);
        
        // 保存超时处理器
        this.timeoutHandlers.set(url, handler);
        
        return handler;
    }
    
    /**
     * 取消资源的超时处理
     * @param {string} url - 资源URL
     */
    clearResourceTimeout(url) {
        if (this.timeoutHandlers.has(url)) {
            clearTimeout(this.timeoutHandlers.get(url));
            this.timeoutHandlers.delete(url);
        }
    }

    /**
     * 加载无阻塞核心内容
     * 这个方法确保即使外部资源加载失败，页面内容也能显示
     */
    loadNonBlockingCoreContent() {
        console.log('🚀 初始化非阻塞核心内容加载...');
        
        // 立即解除内容加载阻塞，不等待任何资源
        // 这确保内容渲染和资源加载完全并行
        setTimeout(() => {
            this.unblockContentLoading();
            // 设置全局标志，通知其他组件内容已解锁
            window.contentUnblocked = true;
        }, 100);
        
        // 为关键样式注入内联替代，确保基本样式立即可用
        this.injectCriticalInlineStyles();
        
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
                    this.loadCssNonBlocking(url, resource);
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
            console.warn(`⚠️ 资源 ${url} (${priority}) 加载超时`);
            
            // 对于CSS，为缺失的样式注入最小替代
            if (resourceType === 'styles') {
                const resourceName = this.getResourceBaseName(url);
                this.handleCriticalResourceFailure(resourceName);
            }
        }, { once: false });
        
        // 然后加载其他高优先级资源，但是在后台进行，不阻塞内容显示
        setTimeout(() => {
            this.loadHighPriorityResources()
                .catch(error => console.warn('加载高优先级资源时出错:', error));
        }, 300);
        
        return Promise.resolve(true); // 立即返回，不阻塞内容加载
    }
    
    /**
     * 解除内容加载阻塞
     * 移除阻塞内容显示的CSS和其他限制
     */
    unblockContentLoading() {
        // 移除可能阻塞内容显示的样式
        const contentBlockers = document.querySelectorAll('.content-loading-mask, .loading-overlay');
        contentBlockers.forEach(el => {
            // 平滑过渡
            el.style.transition = 'opacity 0.3s ease';
            el.style.opacity = '0';
            
            // 延迟后移除元素
            setTimeout(() => {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 350);
        });
        
        // 添加自定义事件通知页面内容可以显示了
        document.dispatchEvent(new CustomEvent('content-unblocked'));
        
        console.log('🎉 内容加载阻塞已解除，页面内容可以显示');
    }
    
    /**
     * 非阻塞方式加载CSS
     * @param {string} url - CSS文件URL
     * @param {object} resource - 资源对象
     */
    loadCssNonBlocking(url, resource) {
        // 检查URL是否有效
        if (!url || typeof url !== 'string') {
            console.warn('⚠️ 尝试加载无效的CSS URL:', url);
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
        this.setResourceTimeout('styles', url, priority);
        
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
            this.clearResourceTimeout(url);
            
            // 样式已加载，现在应用它
            link.media = 'all';
            this.loadedResources.add(url);
            console.log(`✅ 非阻塞加载CSS完成: ${url}`);
        };
        
        link.onerror = () => {
            // 清除超时处理器
            this.clearResourceTimeout(url);
            
            // 记录错误但不阻塞
            this.handleResourceError(link, url);
            console.warn(`❌ 非阻塞CSS加载失败: ${url}`);
        };
        
        // 添加到文档
        document.head.appendChild(link);
    }
    
    /**
     * 优先加载基本样式并解除内容阻塞
     * 这个方法确保基本样式尽快加载，而页面内容不被阻塞
     */
    prioritizeContentRendering() {
        console.log('🚀 优先处理内容渲染...');
        
        // 为关键样式注入内联替代，确保基本样式立即可用
        this.injectCriticalInlineStyles();
        
        // 立即解除内容阻塞
        setTimeout(() => {
            this.unblockContentLoading();
            // 设置全局标志，通知其他组件内容已解锁
            window.contentUnblocked = true;
        }, 50);
        
        // 加载高优先级资源，但不阻塞渲染
        setTimeout(() => {
            this.loadResourcesByPriority('high')
                .catch(error => console.warn('加载高优先级资源时出错:', error));
            
            // 然后加载中优先级资源
            setTimeout(() => {
                this.loadResourcesByPriority('medium')
                    .catch(error => console.warn('加载中优先级资源时出错:', error));
            }, 1000);
        }, 300);
        
        // 延迟加载低优先级资源
        setTimeout(() => {
            this.lazyLoadLowPriorityResources();
        }, 2000);
        
        return true;
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
        
        const style = document.createElement('style');
        style.id = 'critical-inline-styles';
        style.textContent = `
            /* 仅保留加载相关的最小样式，移除所有与布局相关的样式 */
            
            /* 加载动画 */
            @keyframes resource-spinner {
                to {transform: rotate(360deg);}
            }
            
            /* 资源加载器专用样式 - 避免与分页加载样式冲突 */
            .resource-loading-spinner {
                width: 50px;
                height: 50px;
                border: 3px solid rgba(0,0,0,0.1);
                border-radius: 50%;
                border-top-color: #0366d6;
                animation: resource-spinner 1s ease-in-out infinite;
                margin: 20px auto;
            }
            
            /* 加载遮罩样式 */
            .content-loading-mask {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(255,255,255,0.8);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 100;
                transition: opacity 0.3s ease;
            }
            
            .content-loading-text {
                margin-top: 16px;
                font-size: 16px;
                color: #333;
                text-align: center; /* 确保文本居中 */
                width: 100%; /* 占据全宽 */
            }
            
            /* 移除分页加载样式，避免与articleManager.js冲突 */
            
            /* 基本的图标回退样式 - 仅在图标资源加载失败时使用 */
            .fas, .far, .fab, .bi, .material-icons {
                font-family: sans-serif;
            }
            
            /* 代码块最小回退样式 - 仅在代码高亮资源加载失败时使用 */
            pre, code {
                background-color: #f6f8fa;
                border-radius: 3px;
                font-family: monospace;
            }
        `;
        
        document.head.appendChild(style);
        console.log('✅ 已注入最小必要的关键内联样式');
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
        
        // 1. 首先优先处理内容渲染，无论资源是否加载完成
        this.prioritizeContentRendering();
        
        // 2. 在DOM加载后（但不阻塞内容显示）继续加载资源
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📃 DOM已加载，继续优化资源加载');
            
            // 确保所有关键元素都有资源组标记
            ensureResourceGroupMarkers();
            
            // 检查加载失败的资源
            setTimeout(() => {
                this.checkForFailedResources();
            }, 2000);
        });
        
        // 3. 监听页面完全加载事件
        window.addEventListener('load', () => {
            console.log('🏁 页面完全加载，设置基于可见性的后续资源加载');
            
            // 如果浏览器支持Intersection Observer，为可见性加载做准备
            if ('IntersectionObserver' in window) {
                this.setupVisibilityBasedLoading();
            }
        });
    }
    
    /**
     * 检查加载失败的资源
     * 这是一个额外的安全措施，检查任何可能的资源加载失败
     */
    checkForFailedResources() {
        console.log('🔍 检查资源加载状态...');
        
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
                console.warn(`检查样式表加载状态时出错:`, e);
            }
            
            if (!loaded && !this.failedResources.has(href)) {
                console.warn(`检测到可能失败的样式表: ${href}`);
                this.handleResourceError(link, href);
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
        
        console.log('🔍 资源加载状态检查完成');
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
            
            // 获取资源优先级
            let priority = 'medium';
            if (resource && resource.priority) {
                priority = resource.priority;
            }
            
            // 设置加载超时
            this.setResourceTimeout('styles', url, priority);
            
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
                // 清除超时处理器
                this.clearResourceTimeout(url);
                
                this.loadedResources.add(url);
                resolve(link);
            };
            
            link.onerror = (error) => {
                // 清除超时处理器
                this.clearResourceTimeout(url);
                
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