/**
 * 脚本资源加载器
 * 负责管理脚本资源的加载
 */
class ScriptResourceLoader {
    constructor() {
        // 移除独立的loadedResources集合
        // 将通过setDependencies方法注入resourceManager的loadedResources
    }

    /**
     * 设置依赖方法和资源
     * 允许依赖注入，避免循环依赖
     * @param {Object} dependencies - 依赖对象
     */
    setDependencies(dependencies) {
        if (dependencies.loadedResources) {
            this.loadedResources = dependencies.loadedResources;
        }
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

    /**
     * 加载脚本
     * @param {string} url - 脚本URL
     * @param {Object} resource - 资源对象（包含资源属性和元数据）
     * @param {Object} options - 加载选项
     * @returns {Promise} - 加载完成的Promise
     */
    loadScript(url, resource = {}, options = {}) {
        // 确保loadedResources存在
        const loadedResources = this.loadedResources || new Set();
        
        // 合并选项
        const loadOptions = {
            async: false,
            defer: false,
            once: true,
            ...options
        };
        
        // 如果只加载一次且已加载过，则直接返回成功
        if (loadOptions.once && loadedResources.has(url)) {
            logger.debug(`⏭️ 脚本 ${url} 已加载，跳过`);
            return Promise.resolve(true);
        }
        
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = url;
            
            // 设置脚本属性
            if (loadOptions.async) script.async = true;
            if (loadOptions.defer) script.defer = true;
            
            // 获取资源优先级
            let priority = resource.priority || 'medium';
            
            // 设置加载超时
            if (typeof this.setResourceTimeout === 'function') {
                this.setResourceTimeout('scripts', url, priority);
            }
            
            // 处理属性
            let attributes = {};
            // 优先使用资源对象的attributes
            if (resource.attributes) {
                attributes = resource.attributes;
            } 
            // 如果选项中也有attributes，合并它们
            if (options.attributes) {
                attributes = {...attributes, ...options.attributes};
            }
            
            // 确保Prism文件有data-local-fallback属性
            if (url.includes('prism') && !attributes['data-local-fallback']) {
                // 构建本地回退路径
                let localPath = url;
                
                if (url.startsWith('http')) {
                    const fileName = url.split('/').pop();
                    if (url.includes('components')) {
                        localPath = `/assets/libs/prism/components/${fileName}`;
                    } else {
                        localPath = `/assets/libs/prism/${fileName}`;
                    }
                }
                
                attributes['data-local-fallback'] = localPath;
            }
            
            // 设置属性
            Object.entries(attributes).forEach(([key, value]) => {
                script.setAttribute(key, value);
            });
            
            // 设置加载事件处理
            script.onload = () => {
                // 清除超时处理器
                if (typeof this.clearResourceTimeout === 'function') {
                    this.clearResourceTimeout(url);
                }
                
                // 记录已加载资源
                if (this.loadedResources) {
                    this.loadedResources.add(url);
                }
                
                const mode = loadOptions.async ? '异步' : (loadOptions.defer ? '延迟' : '阻塞式');
                logger.debug(`✅ ${mode}加载脚本完成: ${url}`);
                
                // 执行onResourceLoaded回调（如果有）
                if (typeof loadOptions.onResourceLoaded === 'function') {
                    loadOptions.onResourceLoaded(url, true);
                }
                
                resolve(true);
            };
            
            script.onerror = () => {
                // 清除超时处理器
                if (typeof this.clearResourceTimeout === 'function') {
                    this.clearResourceTimeout(url);
                }
                
                // 错误处理
                if (this.handleResourceError) {
                    this.handleResourceError(script, url);
                } else {
                    const mode = loadOptions.async ? '异步' : (loadOptions.defer ? '延迟' : '阻塞式');
                    logger.warn(`❌ ${mode}脚本加载失败: ${url}`);
                }
                
                // 执行onResourceLoaded回调（如果有）
                if (typeof loadOptions.onResourceLoaded === 'function') {
                    loadOptions.onResourceLoaded(url, false);
                }
                
                resolve(false);
            };
            
            // 添加到文档
            document.head.appendChild(script);
        });
    }
}

// 创建一个单例实例
const scriptResourceLoader = new ScriptResourceLoader();

// 导出单例和类
export { scriptResourceLoader, ScriptResourceLoader };
export default scriptResourceLoader;
