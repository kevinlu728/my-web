/**
 * @file katexLoader.js
 * @description KaTeX数学公式渲染器加载器 - 负责管理KaTeX资源加载
 * @version 1.0.0
 */

// 导入必要的依赖
import logger from '../utils/logger.js';
import resourceConfig from '../config/resources.js';
import { styleResourceLoader } from './styleResourceLoader.js';
import { scriptResourceLoader } from './scriptResourceLoader.js';

/**
 * KaTeX加载器类
 */
class KatexLoader {
    constructor() {
        this.resourceConfig = resourceConfig;
    }
    
    /**
     * 加载KaTeX相关资源
     * @returns {Promise} - 加载完成的Promise
     */
    loadKatexResources() {
        logger.info('📝 加载KaTeX数学公式资源');
        
        // 尝试从资源配置中获取KaTeX资源信息
        let katexCoreConfig;
        let katexThemeConfig;
        
        try {
            katexCoreConfig = this.resourceConfig.resources.scripts['katex-core'];
            katexThemeConfig = this.resourceConfig.resources.styles['katex-theme'];
            
            if (!katexCoreConfig) {
                logger.warn('⚠️ 未在资源配置中找到katex-core配置，将使用默认值');
            }
            if (!katexThemeConfig) {
                logger.warn('⚠️ 未在资源配置中找到katex-theme配置，将使用默认值');
            }
        } catch (error) {
            logger.warn('⚠️ 获取KaTeX资源配置失败，将使用默认值', error);
        }
        
        // 检查是否已加载
        if (window.katexLoaded && window.katex) {
            logger.debug('✓ KaTeX已加载，跳过加载过程');
            return Promise.resolve(true);
        }
        
        // 如果已经在加载中，避免重复加载
        if (window.katexLoading) {
            logger.debug('⏳ KaTeX正在加载中，等待完成...');
            return this._waitForKatexLoaded();
        }
        
        // 标记为正在加载
        window.katexLoading = true;
        
        // 按照标准模式加载主要资源
        return Promise.resolve()
            .then(() => {
                logger.info('📦 加载KaTeX核心库和样式');
                
                // 并行加载JS和CSS
                return Promise.all([
                    this._loadKatexCore(katexCoreConfig),
                    this._loadKatexTheme(katexThemeConfig)
                ]);
            })
            .then(([coreLoaded, cssLoaded]) => {
                if (!coreLoaded) {
                    logger.error('❌ KaTeX核心库加载失败');
                    window.katexLoading = false;
                    return false;
                }
                
                if (!cssLoaded) {
                    logger.warn('⚠️ KaTeX样式加载失败，公式可能样式不完整');
                }
                
                // 标记为加载完成
                window.katexLoaded = true;
                window.katexLoading = false;
                
                logger.info('✅ KaTeX资源加载完成');
                return true;
            })
            .catch(error => {
                logger.error('❌ KaTeX资源加载失败', error.message);
                window.katexLoaded = false;
                window.katexLoading = false;
                return false;
            });
    }
    
    /**
     * 等待KaTeX加载完成
     * @private
     * @returns {Promise} - 加载完成的Promise
     */
    _waitForKatexLoaded() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (window.katexLoaded) {
                    clearInterval(checkInterval);
                    clearTimeout(timeout);
                    resolve(true);
                }
            }, 100);
            
            // 设置超时，避免无限等待
            const timeout = setTimeout(() => {
                clearInterval(checkInterval);
                logger.warn('等待KaTeX加载超时');
                resolve(false);
            }, 5000);
        });
    }
    
    /**
     * 加载KaTeX核心库
     * @private
     * @param {Object} coreConfig - KaTeX核心配置
     * @returns {Promise} - 加载完成的Promise
     */
    _loadKatexCore(coreConfig) {
        return new Promise(resolve => {
            try {
                const version = this.resourceConfig?.versions?.katex || '0.16.9';
                
                // 从配置或默认值获取URL
                let urls = this._getResourceUrls('scripts', 'katex-core', coreConfig);
                if (!urls || !urls.primaryUrl) {
                    urls = this._getDefaultKatexCoreUrls(version);
                    logger.debug('⚠️ 未找到有效的KaTeX URL，使用默认值');
                }
                
                // 构建加载选项
                const options = {
                    async: true,  // 异步加载
                    attributes: {
                        'data-resource-group': 'math',
                        'data-resource-id': 'katex-core',
                        'data-resource-type': 'katex'
                    },
                    fallbacks: urls.fallbackUrls.filter(url => !url.includes('/assets/libs/katex/')) || []
                };

                logger.debug(`KaTeX核心URL: ${urls.primaryUrl}`);
                if (urls.fallbackUrls && urls.fallbackUrls.length > 0) {
                    logger.debug(`KaTeX核心备用CDN URLs: ${urls.fallbackUrls.join(', ')}, 禁用本地回退`);
                }
                
                // 从选项中明确移除本地回退
                // 因为我们没有本地KaTeX资源，避免无效的回退尝试
                options.localFallback = null;
                
                // 加载脚本
                scriptResourceLoader.loadScript(urls.primaryUrl, options)
                    .then(success => {
                        if (success) {
                            logger.info('✓ KaTeX核心加载成功');
                            resolve(true);
                        } else {
                            logger.error('❌ KaTeX核心无法加载，公式功能将不可用');
                            resolve(false);
                        }
                    })
                    .catch(error => {
                        logger.error('❌ KaTeX核心加载出错', error.message);
                        resolve(false);
                    });
            } catch (error) {
                logger.error('❌ 加载KaTeX核心库时出错', error.message);
                resolve(false);
            }
        });
    }
    
    /**
     * 加载KaTeX CSS样式
     * @private
     * @param {Object} themeConfig - KaTeX CSS配置
     * @returns {Promise} - 加载完成的Promise
     */
    _loadKatexTheme(themeConfig) {
        return new Promise(resolve => {
            try {
                const version = this.resourceConfig?.versions?.katex || '0.16.9';
                
                // 从配置或默认值获取URL
                let urls = this._getResourceUrls('styles', 'katex-theme', themeConfig);
                if (!urls || !urls.primaryUrl) {
                    urls = this._getDefaultKatexThemeUrls(version);
                    logger.debug('⚠️ 未找到有效的KaTeX CSS URL，使用默认值');
                }
                
                logger.debug(`KaTeX CSS URL: ${urls.primaryUrl}`);
                
                // 构建加载选项
                const options = {
                    // 过滤掉本地回退URL
                    fallbacks: urls.fallbackUrls.filter(url => !url.includes('/assets/libs/katex/')) || [],
                    localFallback: null, // 明确设置为null，避免尝试本地回退
                    attributes: {
                        'data-resource-group': 'math',
                        'data-resource-id': 'katex-theme',
                        'data-resource-type': 'katex'
                    }
                };

                logger.debug(`KaTeX主题URL: ${urls.primaryUrl}`);
                if (urls.fallbackUrls && urls.fallbackUrls.length > 0) {
                    logger.debug(`KaTeX主题备用CDN URLs: ${urls.fallbackUrls.join(', ')}, 禁用本地回退`);
                }
                
                // 加载CSS (非阻塞)
                styleResourceLoader.loadCss(urls.primaryUrl, options, true)
                    .then(success => {
                        if (success) {
                            logger.info('✓ KaTeX CSS加载成功');
                            resolve(true);
                        } else {
                            logger.warn('⚠️ KaTeX CSS加载失败，公式可能样式不完整');
                            // 尝试加载内联样式
                            this._injectBasicKatexStyles();
                            resolve(false);
                        }
                    })
                    .catch(error => {
                        logger.error('❌ KaTeX CSS加载出错', error.message);
                        // 尝试加载内联样式
                        this._injectBasicKatexStyles();
                        resolve(false);
                    });
            } catch (error) {
                logger.error('❌ 加载KaTeX CSS时出错', error.message);
                // 尝试加载内联样式
                this._injectBasicKatexStyles();
                resolve(false);
            }
        });
    }
    
    /**
     * 当KaTeX CSS加载失败时注入基本样式
     * @private
     */
    _injectBasicKatexStyles() {
        logger.info('注入基本KaTeX样式作为回退');
        
        const style = document.createElement('style');
        style.textContent = `
            /* 基本KaTeX样式回退 */
            .katex {
                font: normal 1.21em KaTeX_Main, Times New Roman, serif;
                line-height: 1.2;
                white-space: normal;
                text-indent: 0;
            }
            
            .katex-display {
                display: block;
                margin: 1em 0;
                text-align: center;
            }
            
            .katex-inline {
                display: inline;
                margin: 0;
            }
            
            /* 基本公式样式 */
            .equation-block .katex-display {
                overflow-x: auto;
                overflow-y: hidden;
                padding: 0.5em;
            }
            
            /* 等待加载样式 */
            .waiting-for-katex {
                background-color: #f9f9f9;
                border-radius: 3px;
                border: 1px solid #eee;
            }
        `;
        
        document.head.appendChild(style);
        
        // 标记为已注入基本样式
        window.katexBasicStylesInjected = true;
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
     * 获取默认的KaTeX核心库URL
     * @private
     * @param {string} version - KaTeX版本
     * @returns {Object} - 包含主URL和回退URL的对象
     */
    _getDefaultKatexCoreUrls(version) {
        return {
            primaryUrl: `https://cdn.jsdelivr.net/npm/katex@${version}/dist/katex.min.js`,
            fallbackUrls: [
                `https://cdnjs.cloudflare.com/ajax/libs/KaTeX/${version}/katex.min.js`
            ],
            localUrl: `/assets/libs/katex/katex.min.js`
        };
    }
    
    /**
     * 获取默认的KaTeX主题样式URL
     * @private
     * @param {string} version - KaTeX版本
     * @returns {Object} - 包含主URL和回退URL的对象
     */
    _getDefaultKatexThemeUrls(version) {
        return {
            primaryUrl: `https://cdn.jsdelivr.net/npm/katex@${version}/dist/katex.min.css`,
            fallbackUrls: [
                `https://cdnjs.cloudflare.com/ajax/libs/KaTeX/${version}/katex.min.css`
            ],
            localUrl: `/assets/libs/katex/katex.min.css`
        };
    }
    
    /**
     * 渲染公式
     * @param {string} formula - 公式文本
     * @param {boolean} displayMode - 是否为显示模式
     * @returns {string} - 渲染后的HTML
     */
    renderFormula(formula, displayMode = true) {
        try {
            if (!window.katex) {
                logger.warn('KaTeX未加载，无法渲染公式');
                return `<div class="katex-fallback">${formula}</div>`;
            }
            
            return window.katex.renderToString(formula, {
                displayMode: displayMode,
                throwOnError: false,
                strict: false,
                trust: true
            });
        } catch (error) {
            logger.error('渲染公式失败:', error.message);
            return `<div class="katex-error">公式渲染错误: ${error.message}</div>`;
        }
    }
}

// 创建并导出单例实例
const katexLoader = new KatexLoader();

// 同时提供命名导出和默认导出
export { katexLoader, KatexLoader };
export default katexLoader; 