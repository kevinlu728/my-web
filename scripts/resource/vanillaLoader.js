import logger from '../utils/logger.js';
import resourceConfig from '../config/resources.js';
import { styleResourceLoader } from './styleResourceLoader.js';
import { scriptResourceLoader } from './scriptResourceLoader.js';

/**
 * VanillaLazyload加载器类
 */
class VanillaLoader {
    constructor() {
        this.resourceConfig = resourceConfig;
        this.loadingPromise = null;
    }
    
    /**
     * 加载VanillaLazyload相关资源
     * @returns {Promise} - 加载完成的Promise
     */
    loadVanillaResources() {
        logger.info('🖼️ 加载VanillaLazyload资源');

        // 尝试从资源配置中获取VanillaLazyload资源信息
        let vanillaLazyloadConfig;
        
        try {
            vanillaLazyloadConfig = this.resourceConfig.resources.scripts['vanilla-lazyload'];
            
            if (!vanillaLazyloadConfig) {
                logger.warn('⚠️ 未在资源配置中找到vanilla-lazyload配置,将使用默认值');
            }
        } catch (error) {
            logger.warn('⚠️ 获取VanillaLazyload资源配置失败,将使用默认值', error);
        }
        
        // 检查是否已加载
        if (window.vanillaLoaded && typeof LazyLoad !== 'undefined') {
            logger.debug('✓ VanillaLazyload已加载,跳过加载过程');
            return Promise.resolve(true);
        }
        
        // 如果已经在加载中，避免重复加载
        if (window.vanillaLoading) {
            logger.debug('⏳ VanillaLazyload正在加载中,等待完成...');
            return this._waitForVanillaLazyloadLoaded();
        }
        
        // 如果已有加载Promise，直接返回
        if (this.loadingPromise) {
            return this.loadingPromise;
        }
        
        // 标记为正在加载
        window.vanillaLoading = true;
        
        // 执行加载
        // 由于已接入事件系统，且底层加载器已经打印错误日志，所以在then、catch中简化处理，避免过多日志。未来考虑删除这个Promise。
        this.loadingPromise = Promise.resolve()
            .then(() => {
                logger.info('📦 加载VanillaLazyload');
                
                // 并行加载JS和CSS
                return Promise.all([
                    this._loadVanillaLazyload(vanillaLazyloadConfig)
                ]);
            })
            .then(([vanillaLazyloadLoaded]) => {
                if (!vanillaLazyloadLoaded) {
                    window.vanillaLoading = false;
                    return false;
                }
                
                // 标记为加载完成
                window.vanillaLoaded = true;
                window.vanillaLoading = false;
                return true;
            })
            .catch(error => {
                window.vanillaLoaded = false;
                window.vanillaLoading = false;
                return false;
            });
            
        return this.loadingPromise;
    }
    
    /**
     * 等待VanillaLazyload加载完成
     * @private
     * @returns {Promise} - 加载完成的Promise
     */
    _waitForVanillaLazyloadLoaded() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (window.vanillaLoaded) {
                    clearInterval(checkInterval);
                    clearTimeout(timeout);
                    resolve(true);
                }
            }, 100);
            
            // 设置超时，避免无限等待
            const timeout = setTimeout(() => {
                clearInterval(checkInterval);
                logger.warn('等待VanillaLazyload加载超时');
                resolve(false);
            }, 5000);
        });
    }
    
    /**
     * 加载VanillaLazyload核心库
     * @private
     * @param {Object} coreConfig - VanillaLazyload配置
     * @returns {Promise} - 加载完成的Promise
     */
    _loadVanillaLazyload(coreConfig) {
        return new Promise(resolve => {
            try {
                const version = this.resourceConfig?.versions?.vanillaLazyload || '17.8.5';
                
                // 从配置或默认值获取URL
                let urls = this._getResourceUrls('scripts', 'vanilla-lazyload', coreConfig);
                if (!urls || !urls.primaryUrl) {
                    urls = this._getDefaultVanillaLazyloadUrls(version);
                    logger.debug('⚠️ 未找到有效的VanillaLazyload URL,使用默认值');
                }
                
                // 构建加载选项
                const options = {
                    async: true,  // 异步加载
                    attributes: {
                        'data-resource-group': 'image',
                        'data-resource-id': 'vanilla-lazyload',
                        'data-resource-type': 'vanilla',
                        'data-local-fallback': urls.localUrl
                    },
                    fallbacks: urls.fallbackUrls || [],
                    localFallback: urls.localUrl
                };

                logger.debug(`VanillaLazyload的URL: ${urls.primaryUrl} , 本地回退URL: ${urls.localUrl}`);
                if (urls.fallbackUrls && urls.fallbackUrls.length > 0) {
                    logger.debug(`VanillaLazyload的备用URLs: ${urls.fallbackUrls.join(', ')}`);
                }
                
                // 加载脚本
                // 由于已接入事件系统，且底层加载器已经打印错误日志，所以在then、catch中简化处理，避免过多日志。
                scriptResourceLoader.loadScript({
                    url: urls.primaryUrl,
                    attributes: options.attributes,
                    priority: 'high'
                })
                .then(result => {
                    // 检查是否成功加载
                    if (result && (result.status === 'loaded' || result.status === 'cached' || result.status === 'existing')) {
                        resolve(true);
                    } else {
                        throw new Error('VanillaLazyload加载失败');
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
     * 获取默认的VanillaLazyload核心库URL
     * @private
     * @param {string} version - VanillaLazyload版本
     * @returns {Object} - 包含主URL、回退URL和本地URL的对象
     */
    _getDefaultVanillaLazyloadUrls(version) {
        return {
            primaryUrl: `https://cdn.jsdelivr.net/npm/vanilla-lazyload@${version}/dist/lazyload.min.js`,
            fallbackUrls: [
                `https://cdnjs.cloudflare.com/ajax/libs/vanilla-lazyload/${version}/lazyload.min.js`
            ],
            localUrl: `/assets/libs/vanilla-lazyload/lazyload.min.js`
        };
    }
}

// 创建并导出单例实例
const vanillaLoader = new VanillaLoader();

// 同时提供命名导出和默认导出
export { vanillaLoader, VanillaLoader };
export default vanillaLoader; 