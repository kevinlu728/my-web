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
     * @param {Object} options - 配置选项
     */
    loadScript(url, options = {}) {
        // 确保loadedResources存在
        const loadedResources = this.loadedResources || new Set();
        
        // 如果只加载一次且已加载过，则直接返回成功
        if (options.once && loadedResources.has(url)) {
            logger.debug(`⏭️ 脚本 ${url} 已加载，跳过`);
            return Promise.resolve(true);
        }
        
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = url;
            
            // 设置脚本属性
            if (options.async) script.async = true;
            if (options.defer) script.defer = true;
            
            // 确保即使加载失败也会有本地回退路径
            if (options.attributes) {
                // 如果是Prism相关文件，确保有data-local-fallback属性
                if (url.includes('prism') && !options.attributes['data-local-fallback']) {
                    // 尝试构建一个本地回退路径
                    let localPath = url;
                    
                    // 如果是外部URL，尝试转换为本地路径
                    if (url.startsWith('http')) {
                        const fileName = url.split('/').pop();
                        if (url.includes('components')) {
                            localPath = `/assets/libs/prism/components/${fileName}`;
                        } else {
                            localPath = `/assets/libs/prism/${fileName}`;
                        }
                    }
                    
                    options.attributes['data-local-fallback'] = localPath;
                }
                
                // 设置其他自定义属性
                Object.entries(options.attributes).forEach(([key, value]) => {
                    script.setAttribute(key, value);
                });
            }
            
            // 设置加载和错误处理
            script.onload = () => {
                // 确保loadedResources存在
                if (this.loadedResources) {
                    this.loadedResources.add(url);
                }
                resolve(true);
            };
            
            script.onerror = () => {
                logger.warn(`❌ 脚本加载失败: ${url}`);
                // 错误处理由全局错误处理器处理
                if (this.handleResourceError) {
                    this.handleResourceError(script, url);
                }
                resolve(false);
            };
            
            // 添加到文档中
            document.head.appendChild(script);
        });
    }
}

// 创建一个单例实例
const scriptResourceLoader = new ScriptResourceLoader();

// 导出单例和类
export { scriptResourceLoader, ScriptResourceLoader };
export default scriptResourceLoader;
