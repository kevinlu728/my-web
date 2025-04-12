/**
 * @file gridjsLoader.js
 * @description Gridjs表格渲染器加载器
 * 负责管理Gridjs相关资源的加载逻辑，最终通过scriptResourceLoader和styleResourceLoader加载。
 * @version 1.0.0
 */

// 导入必要的依赖
import logger from '../utils/logger.js';
import resourceConfig from '../config/resources.js';
import { styleResourceLoader } from './styleResourceLoader.js';
import { scriptResourceLoader } from './scriptResourceLoader.js';

/**
 * Grid.js加载器类
 */
class GridjsLoader {
    constructor() {
        this.resourceConfig = resourceConfig;
        this.loadingPromise = null;
    }
    
    /**
     * 加载Grid.js相关资源
     * @returns {Promise} - 加载完成的Promise
     */
    loadGridjsResources() {
        logger.info('📊 加载Grid.js表格资源');

        // 尝试从资源配置中获取Grid.js资源信息
        let gridjsCoreConfig;
        let gridjsThemeConfig;
        
        try {
            gridjsCoreConfig = this.resourceConfig.resources.scripts['gridjs-core'];
            gridjsThemeConfig = this.resourceConfig.resources.styles['gridjs-theme'];
            
            if (!gridjsCoreConfig) {
                logger.warn('⚠️ 未在资源配置中找到gridjs-core配置，将使用默认值');
            }
            if (!gridjsThemeConfig) {
                logger.warn('⚠️ 未在资源配置中找到gridjs-theme配置，将使用默认值');
            }
        } catch (error) {
            logger.warn('⚠️ 获取Grid.js资源配置失败，将使用默认值', error);
        }
        
        // 检查是否已加载
        if (window.gridjsLoaded && window.gridjs) {
            logger.debug('✓ Grid.js已加载，跳过加载过程');
            return Promise.resolve(true);
        }
        
        // 如果已经在加载中，避免重复加载
        if (window.gridjsLoading) {
            logger.debug('⏳ Grid.js正在加载中，等待完成...');
            return this._waitForGridjsLoaded();
        }
        
        // 如果已有加载Promise，直接返回
        if (this.loadingPromise) {
            return this.loadingPromise;
        }
        
        // 标记为正在加载
        window.gridjsLoading = true;
        
        // 执行加载
        this.loadingPromise = Promise.resolve()
            .then(() => {
                logger.info('📦 加载Grid.js核心库和样式');
                
                // 并行加载JS和CSS
                return Promise.all([
                    this._loadGridjsCore(gridjsCoreConfig),
                    this._loadGridjsTheme(gridjsThemeConfig)
                ]);
            })
            .then(([coreLoaded, cssLoaded]) => {
                if (!coreLoaded) {
                    logger.error('❌ Grid.js核心库加载失败');
                    window.gridjsLoading = false;
                    return false;
                }
                
                if (!cssLoaded) {
                    logger.warn('⚠️ Grid.js样式加载失败，表格可能样式不完整');
                }
                
                // 标记为加载完成
                window.gridjsLoaded = true;
                window.gridjsLoading = false;
                
                logger.info('✅ Grid.js资源加载完成');
                return true;
            })
            .catch(error => {
                logger.error('❌ Grid.js资源加载失败', error.message);
                window.gridjsLoaded = false;
                window.gridjsLoading = false;
                return false;
            });
            
        return this.loadingPromise;
    }
    
    /**
     * 等待Grid.js加载完成
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
                logger.warn('等待Grid.js加载超时');
                resolve(false);
            }, 5000);
        });
    }
    
    /**
     * 加载Grid.js核心库
     * @private
     * @param {Object} coreConfig - Grid.js核心库配置
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
                    logger.debug('⚠️ 未找到有效的Grid.js URL，使用默认值');
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

                logger.debug(`Gridjs核心URL: ${urls.primaryUrl} , 本地回退URL: ${urls.localUrl}`);
                if (urls.fallbackUrls && urls.fallbackUrls.length > 0) {
                    logger.debug(`Gridjs核心备用URLs(包括备用CDN和本地回退): ${urls.fallbackUrls.join(', ')}`);
                }
                
                // 加载脚本
                scriptResourceLoader.loadScript(urls.primaryUrl, options)
                    .then(success => {
                        if (success) {
                            logger.info('✓ Grid.js核心加载成功');
                            resolve(true);
                        } else {
                            logger.error('❌ Grid.js核心无法加载，表格功能将回退');
                            resolve(false);
                        }
                    })
                    .catch(error => {
                        logger.error('❌ Grid.js核心加载出错', error.message);
                        resolve(false);
                    });
            } catch (error) {
                logger.error('❌ 加载Grid.js核心时出错', error.message);
                resolve(false);
            }
        });
    }
    
    /**
     * 加载Grid.js样式
     * @private
     * @param {Object} themeConfig - Grid.js主题样式配置
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
                    logger.debug('⚠️ 未找到有效的Grid.js主题URL，使用默认值');
                }
                
                logger.debug(`Grid.js主题URL: ${urls.primaryUrl}`);
                
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
                
                logger.debug(`Gridjs主题URL: ${urls.primaryUrl} , 本地回退URL: ${urls.localUrl}`);
                if (urls.fallbackUrls && urls.fallbackUrls.length > 0) {
                    logger.debug(`Gridjs主题备用URLs(包括备用CDN和本地回退): ${urls.fallbackUrls.join(', ')}`);
                }

                // 加载CSS
                styleResourceLoader.loadCss(urls.primaryUrl, options)
                    .then(success => {
                        if (success) {
                            logger.info('✓ Grid.js主题加载成功');
                            resolve(true);
                        } else {
                            logger.warn('⚠️ Grid.js主题加载失败，将使用基本样式');
                            this._injectBasicGridjsStyles();
                            resolve(false);
                        }
                    })
                    .catch(error => {
                        logger.error('❌ Grid.js主题加载出错', error.message);
                        this._injectBasicGridjsStyles();
                        resolve(false);
                    });
            } catch (error) {
                logger.error('❌ 加载Grid.js主题时出错', error.message);
                this._injectBasicGridjsStyles();
                resolve(false);
            }
        });
    }
    
    /**
     * 当Grid.js CSS加载失败时注入基本样式
     * @private
     */
    _injectBasicGridjsStyles() {
        logger.info('注入基本Grid.js样式作为回退');
        
        const style = document.createElement('style');
        style.textContent = `
            /* 基本Grid.js样式回退 */
            .gridjs-container {
                color: #000;
                display: inline-block;
                padding: 2px;
                width: 100%;
            }
            
            .gridjs-wrapper {
                box-shadow: 0 1px 3px 0 rgba(0,0,0,.1), 0 1px 2px 0 rgba(0,0,0,.06);
                border-radius: .375rem;
                border: 1px solid #e5e7eb;
                overflow: hidden;
                width: 100%;
            }
            
            .gridjs-table {
                border-collapse: collapse;
                display: table;
                width: 100%;
            }
            
            .gridjs-th {
                background-color: #f9fafb;
                font-weight: 600;
                padding: 12px 24px;
                position: relative;
                text-align: left;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .gridjs-td {
                border-bottom: 1px solid #e5e7eb;
                padding: 12px 24px;
            }
            
            .gridjs-tr:hover .gridjs-td {
                background-color: #f9fafb;
            }
            
            .gridjs-footer {
                background-color: #f9fafb;
                border-top: 1px solid #e5e7eb;
                padding: 12px 24px;
            }
            
            .gridjs-pagination {
                color: #6b7280;
            }
            
            .gridjs-pagination .gridjs-pages button {
                background-color: transparent;
                border: 1px solid #d1d5db;
                border-radius: .375rem;
                color: #6b7280;
                cursor: pointer;
                margin: 0 5px;
                padding: 5px 10px;
            }
            
            .gridjs-pagination .gridjs-pages button:hover {
                background-color: #f3f4f6;
            }
            
            .gridjs-pagination .gridjs-pages button.gridjs-currentPage {
                background-color: #3b82f6;
                border-color: #3b82f6;
                color: #fff;
            }
        `;
        
        document.head.appendChild(style);
        
        // 标记为已注入基本样式
        window.gridjsBasicStylesInjected = true;
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
     * 获取默认的Grid.js核心库URL
     * @private
     * @param {string} version - Grid.js版本
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
     * 获取默认的Grid.js主题样式URL
     * @private
     * @param {string} version - Grid.js版本
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