/**
 * 脚本资源加载器
 * 该模块是最底层的资源加载器，所有脚本资源加载最终都通过该模块进行。
 */
import { resourceEvents, RESOURCE_EVENTS } from './resourceEvents.js';
import logger from '../utils/logger.js';

class ScriptResourceLoader {
    constructor() {
        this.dependencies = null;
        this.loadedScripts = new Set();
    }

    /**
     * 设置依赖方法和资源
     * 允许依赖注入，避免循环依赖
     * @param {Object} dependencies - 依赖对象
     */
    setDependencies(dependencies) {
        this.dependencies = dependencies;
        logger.info('脚本资源加载器已设置依赖');
    }

    /**
     * 加载脚本
     * @param {Object} options - 加载选项
     * @returns {Promise} 加载结果Promise
     */
    loadScript(options) {
        const { url, id, attributes = {}, timeout = 10000, priority = 'medium', async = true, defer = false } = options;
        
        if (!url) {
            logger.error('❌ 加载脚本错误: 未提供URL');
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
            resourceKind: 'script'
        });
        
        logger.info(`🔄 开始加载脚本资源: ${url}`);
        
        return new Promise((resolve, reject) => {
            // 检查是否已加载
            if (this.loadedScripts.has(url) || 
                (this.dependencies?.loadedResources && this.dependencies.loadedResources.has(url))) {
                logger.info(`✅ 脚本已加载，跳过: ${url}`);
                
                // 触发已加载事件
                resourceEvents.emit(RESOURCE_EVENTS.LOADING_SUCCESS, {
                    url,
                    resourceType,
                    resourceId,
                    priority,
                    resourceKind: 'script',
                    fromCache: true
                });
                
                resolve({ url, status: 'cached' });
                return;
            }
            
            // 检查是否已存在
            const existingScript = document.getElementById(id) || 
                                  document.querySelector(`script[src="${url}"]`);
            
            if (existingScript) {
                logger.info(`✅ 脚本已存在，跳过: ${url}`);
                
                // 触发已存在事件
                resourceEvents.emit(RESOURCE_EVENTS.LOADING_SUCCESS, {
                    url,
                    resourceType,
                    resourceId,
                    priority,
                    resourceKind: 'script',
                    fromCache: true
                });
                
                resolve({ url, element: existingScript, status: 'existing' });
                return;
            }
            
            // 创建script元素
            const script = document.createElement('script');
            script.src = url;
            
            // 设置async和defer
            script.async = async;
            script.defer = defer;
            
            // 设置ID
            if (id) script.id = id;
            
            // 设置其他属性
            Object.entries(attributes).forEach(([key, value]) => {
                script.setAttribute(key, value);
            });
            
            // 确保设置了data-resource-type
            if (!script.hasAttribute('data-resource-type') && resourceType) {
                script.setAttribute('data-resource-type', resourceType);
            }
            
            // 确保设置了data-resource-id
            if (!script.hasAttribute('data-resource-id') && resourceId) {
                script.setAttribute('data-resource-id', resourceId);
            }
            
            // 确保设置了data-priority
            if (!script.hasAttribute('data-priority')) {
                script.setAttribute('data-priority', priority);
            }
            
            // 设置加载事件
            script.onload = () => {
                logger.info(`✅ script.onload事件触发,脚本加载成功: ${url}`);
                
                // 清除超时
                if (this.dependencies?.clearResourceTimeout) {
                    this.dependencies.clearResourceTimeout(url);
                }
                
                // 添加到已加载资源
                this.loadedScripts.add(url);
                if (this.dependencies?.loadedResources) {
                    this.dependencies.loadedResources.add(url);
                }
                
                // 触发加载成功事件
                resourceEvents.emit(RESOURCE_EVENTS.LOADING_SUCCESS, {
                    url,
                    resourceType,
                    resourceId,
                    element: script,
                    priority,
                    resourceKind: 'script'
                });
                
                resolve({ url, element: script, status: 'loaded' });
            };
            
            // 设置错误事件
            script.onerror = () => {
                logger.error(`❌ script.onerror事件触发,脚本加载失败: ${url}`);
                
                // 清除超时
                if (this.dependencies?.clearResourceTimeout) {
                    this.dependencies.clearResourceTimeout(url);
                }
                
                // 触发加载失败事件
                resourceEvents.emit(RESOURCE_EVENTS.LOADING_FAILURE, {
                    url,
                    resourceType,
                    resourceId,
                    element: script,
                    reason: 'load-error',
                    priority,
                    resourceKind: 'script',
                    sender: 'scriptResourceLoader'
                });
                
                // 尝试处理错误
                if (this.dependencies?.handleResourceError) {
                    this.dependencies.handleResourceError(script, url, resourceId);
                }
                
                reject(new Error(`脚本加载失败: ${url}`));
            };
            
            // 设置超时
            if (this.dependencies?.setResourceTimeout) {
                this.dependencies.setResourceTimeout(resourceType, url, priority);
            }
            
            // 添加到文档
            document.head.appendChild(script);
            
            logger.debug(`🔄 脚本资源已添加到DOM: ${url}`);
        });
    }
}

// 创建单例
export const scriptResourceLoader = new ScriptResourceLoader();
export default scriptResourceLoader;
