/**
 * @file gridjsLoader.js
 * @description GridJS表格库资源加载管理器
 * @author 陆凯
 * @version 1.1.0
 * @created 2024-03-22
 * @updated 2025-04-15
 * 
 * 该模块负责管理GridJS表格库相关资源的加载：
 * - 负责加载GridJS核心库和样式表
 * - 通过resourceManager系统实现资源加载和回退
 * - 提供资源加载状态跟踪和事件通知
 * - 实现资源加载超时和失败处理
 * - 支持多CDN源加载和本地资源回退
 * 
 * 主要方法：
 * - loadGridjsResources: 加载GridJS相关资源
 * - _loadGridjsCore: 加载GridJS核心JavaScript库
 * - _loadGridjsTheme: 加载GridJS主题样式表
 * - _getResourceUrls: 获取资源的URL信息
 * 
 * 内部使用scriptResourceLoader和styleResourceLoader加载实际资源
 */

import logger from '../utils/logger.js';
import resourceConfig from '../config/resources.js';
import { styleResourceLoader } from './styleResourceLoader.js';
import { scriptResourceLoader } from './scriptResourceLoader.js';

/**
 * GridJS加载控制，最终的加载由
 */
class GridjsLoader {
    constructor() {
        this.resourceConfig = resourceConfig;
        this.loadingPromise = null;
    }
    
    /**
     * 加载GridJS相关资源
     * @returns {Promise} - 加载完成的Promise
     */
    loadGridjsResources() {
        logger.info('📊 加载GridJS表格资源');

        // 尝试从资源配置中获取GridJS资源信息
        let gridjsCoreConfig;
        let gridjsThemeConfig;
        
        try {
            gridjsCoreConfig = this.resourceConfig.resources.scripts['gridjs-core'];
            gridjsThemeConfig = this.resourceConfig.resources.styles['gridjs-theme'];
            
            if (!gridjsCoreConfig) {
                logger.warn('⚠️ 未在资源配置中找到gridjs-core配置,将使用默认值');
            }
            if (!gridjsThemeConfig) {
                logger.warn('⚠️ 未在资源配置中找到gridjs-theme配置,将使用默认值');
            }
        } catch (error) {
            logger.warn('⚠️ 获取GridJS资源配置失败,将使用默认值', error);
        }
        
        // 检查是否已加载
        if (window.gridjsLoaded && window.gridjs) {
            logger.debug('✓ GridJS已加载,跳过加载过程');
            return Promise.resolve(true);
        }
        
        // 如果已经在加载中，避免重复加载
        if (window.gridjsLoading) {
            logger.debug('⏳ GridJS正在加载中,等待完成...');
            return this._waitForGridjsLoaded();
        }
        
        // 如果已有加载Promise，直接返回
        if (this.loadingPromise) {
            return this.loadingPromise;
        }
        
        // 标记为正在加载
        window.gridjsLoading = true;
        
        // 执行加载
        // 由于已接入事件系统，且底层加载器已经打印错误日志，所以在then、catch中简化处理，避免过多日志。未来考虑删除这个Promise。
        this.loadingPromise = Promise.resolve()
            .then(() => {
                logger.info('📦 加载GridJS核心库和样式');
                
                // 并行加载JS和CSS
                return Promise.all([
                    this._loadGridjsCore(gridjsCoreConfig),
                    this._loadGridjsTheme(gridjsThemeConfig)
                ]);
            })
            .then(([coreLoaded, cssLoaded]) => {
                if (!coreLoaded) {
                    window.gridjsLoading = false;
                    return false;
                }
                
                // 标记为加载完成
                window.gridjsLoaded = true;
                window.gridjsLoading = false;
                return true;
            })
            .catch(error => {
                window.gridjsLoaded = false;
                window.gridjsLoading = false;
                return false;
            });
            
        return this.loadingPromise;
    }
    
    /**
     * 等待GridJS加载完成
     * @private
     * @returns {Promise} - 加载完成的Promise
     */
    _waitForGridjsLoaded() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (window.gridjsLoaded) {
                    clearInterval(checkInterval);
                    clearTimeout(timeout);
                    resolve(true);
                }
            }, 100);
            
            // 设置超时，避免无限等待
            const timeout = setTimeout(() => {
                clearInterval(checkInterval);
                logger.warn('等待GridJS加载超时');
                resolve(false);
            }, 5000);
        });
    }
    
    /**
     * 加载GridJS核心库
     * @private
     * @param {Object} coreConfig - GridJS核心库配置
     * @returns {Promise} - 加载完成的Promise
     */
    _loadGridjsCore(coreConfig) {
        return new Promise(resolve => {
            try {
                const version = this.resourceConfig?.versions?.gridjs || '6.0.6';
                
                // 从配置或默认值获取URL
                let urls = this._getResourceUrls('scripts', 'gridjs-core', coreConfig);
                if (!urls || !urls.primaryUrl) {
                    urls = this._getDefaultGridjsCoreUrls(version);
                    logger.debug('⚠️ 未找到有效的GridJS URL,使用默认值');
                }
                
                // 构建加载选项
                const options = {
                    async: true,  // 异步加载
                    attributes: {
                        'data-resource-group': 'table',
                        'data-resource-id': 'gridjs-core',
                        'data-resource-type': 'table',
                        'data-local-fallback': urls.localUrl
                    },
                    fallbacks: urls.fallbackUrls || [],
                    localFallback: urls.localUrl
                };

                logger.debug(`Gridjs核心库的URL: ${urls.primaryUrl} , 本地回退URL: ${urls.localUrl}`);
                if (urls.fallbackUrls && urls.fallbackUrls.length > 0) {
                    logger.debug(`Gridjs核心库的备用URLs: ${urls.fallbackUrls.join(', ')}`);
                }
                
                // 加载脚本
                // 由于已接入事件系统，且底层加载器已经打印错误日志，所以在then、catch中简化处理，避免过多日志。
                scriptResourceLoader.loadScript({
                    url: urls.primaryUrl,
                    attributes: options.attributes,
                    priority: 'medium'
                })
                .then(result => {
                    // 检查是否成功加载
                    if (result && (result.status === 'loaded' || result.status === 'cached' || result.status === 'existing')) {
                        resolve(true);
                    } else {
                        throw new Error('GridJS核心库加载失败');
                    }
                })
                .catch(error => {
                    resolve(false);
                });
            } catch (error) {
                resolve(false);
            }
        });
    }
    
    /**
     * 加载GridJS样式
     * @private
     * @param {Object} themeConfig - GridJS主题样式配置
     * @returns {Promise} - 加载完成的Promise
     */
    _loadGridjsTheme(themeConfig) {
        return new Promise(resolve => {
            try {
                const version = this.resourceConfig?.versions?.gridjs || '6.0.6';
                
                // 从配置或默认值获取URL
                let urls = this._getResourceUrls('styles', 'gridjs-theme', themeConfig);
                if (!urls || !urls.primaryUrl) {
                    urls = this._getDefaultGridjsThemeUrls(version);
                    logger.debug('⚠️ 未找到有效的GridJS主题URL,使用默认值');
                }
                
                // 构建加载选项
                const options = {
                    attributes: {
                        'data-resource-group': 'table',
                        'data-resource-id': 'gridjs-theme',
                        'data-resource-type': 'table',
                        'data-local-fallback': urls.localUrl
                    },
                    fallbacks: urls.fallbackUrls || [],
                    localFallback: urls.localUrl
                };
                
                logger.debug(`GridJS主题的URL: ${urls.primaryUrl} , 本地回退URL: ${urls.localUrl}`);
                if (urls.fallbackUrls && urls.fallbackUrls.length > 0) {
                    logger.debug(`Gridjs主题的备用URLs(包括备用CDN和本地回退): ${urls.fallbackUrls.join(', ')}`);
                }

                // 加载CSS
                // 由于已接入事件系统，且底层加载器已经打印错误日志，所以在then、catch中简化处理，避免过多日志。
                styleResourceLoader.loadStylesheet({
                    url: urls.primaryUrl,
                    attributes: options.attributes,
                    priority: 'medium',
                    nonBlocking: true
                })
                .then(success => {
                    if (success) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                })
                .catch(error => {
                    resolve(false);
                });
            } catch (error) {
                resolve(false);
            }
        });
    }
    
    /**
     * 从配置中获取资源URL信息
     * @private
     * @param {string} resourceType - 资源类型 ('scripts' 或 'styles')
     * @param {string} resourceName - 资源名称
     * @param {Object} config - 资源配置
     * @returns {Object} - 包含主URL、回退URL和本地URL的对象
     */
    _getResourceUrls(resourceType, resourceName, config) {
        try {
            // 直接使用resourceConfig的getResourceUrl方法获取资源信息
            const urlInfo = this.resourceConfig.getResourceUrl(resourceType, resourceName);
            
            // 从获得的结果中提取我们需要的数据
            const result = {
                primaryUrl: (typeof urlInfo === 'string') ? urlInfo : urlInfo.primary,
                fallbackUrls: (urlInfo && Array.isArray(urlInfo.fallbacks)) ? urlInfo.fallbacks : [],
                localUrl: null
            };
            
            // 从配置中获取本地回退路径
            if (config?.attributes?.['data-local-fallback']) {
                result.localUrl = config.attributes['data-local-fallback'];
            }
            
            return result;
        } catch (error) {
            logger.warn(`获取${resourceName}资源URL时出错`, error);
            return { primaryUrl: null, fallbackUrls: [], localUrl: null };
        }
    }
    
    /**
     * 获取默认的GridJS核心库URL
     * @private
     * @param {string} version - GridJS版本
     * @returns {Object} - 包含主URL、回退URL和本地URL的对象
     */
    _getDefaultGridjsCoreUrls(version) {
        return {
            primaryUrl: `https://cdn.jsdelivr.net/npm/gridjs@${version}/dist/gridjs.umd.js`,
            fallbackUrls: [
                `https://cdnjs.cloudflare.com/ajax/libs/gridjs/${version}/gridjs.umd.js`
            ],
            localUrl: `/assets/libs/gridjs/gridjs.umd.js`
        };
    }
    
    /**
     * 获取默认的GridJS主题样式URL
     * @private
     * @param {string} version - GridJS版本
     * @returns {Object} - 包含主URL、回退URL和本地URL的对象
     */
    _getDefaultGridjsThemeUrls(version) {
        return {
            primaryUrl: `https://cdn.jsdelivr.net/npm/gridjs@${version}/dist/theme/mermaid.min.css`,
            fallbackUrls: [
                `https://cdnjs.cloudflare.com/ajax/libs/gridjs/${version}/mermaid.min.css`
            ],
            localUrl: `/assets/libs/gridjs/theme/mermaid.min.css`
        };
    }
}

// 创建并导出单例实例
const gridjsLoader = new GridjsLoader();

// 同时提供命名导出和默认导出
export { gridjsLoader, GridjsLoader };
export default gridjsLoader; 