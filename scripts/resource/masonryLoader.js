import logger from '../utils/logger.js';
import resourceConfig from '../config/resources.js';
import { scriptResourceLoader } from './scriptResourceLoader.js';

/**
 * Masonry加载器类
 */
class MasonryLoader {
    constructor() {
        this.resourceConfig = resourceConfig;
        this.loadingPromise = null;
    }
    
    /**
     * 加载Masonry相关资源
     * @returns {Promise} - 加载完成的Promise
     */
    loadMasonryResources() {
        logger.info('🧱 加载Masonry资源');

        // 尝试从资源配置中获取Masonry资源信息
        let masonryConfig;
        let imagesLoadedConfig;
        
        try {
            masonryConfig = this.resourceConfig.resources.scripts['masonry'];
            imagesLoadedConfig = this.resourceConfig.resources.scripts['imagesLoaded'];
            
            if (!masonryConfig) {
                logger.warn('⚠️ 未在资源配置中找到masonry配置,将使用默认值');
            }
            if (!imagesLoadedConfig) {
                logger.warn('⚠️ 未在资源配置中找到imagesLoaded配置,将使用默认值');
            }
        } catch (error) {
            logger.warn('⚠️ 获取Masonry资源配置失败,将使用默认值', error);
        }
        
        // 检查是否已加载
        if (window.masonryLoaded && typeof Masonry !== 'undefined' && typeof imagesLoaded !== 'undefined') {
            logger.debug('✓ Masonry已加载,跳过加载过程');
            return Promise.resolve(true);
        }
        
        // 如果已经在加载中，避免重复加载
        if (window.masonryLoading) {
            logger.debug('⏳ Masonry正在加载中,等待完成...');
            return this._waitForMasonryLoaded();
        }
        
        // 如果已有加载Promise，直接返回
        if (this.loadingPromise) {
            return this.loadingPromise;
        }
        
        // 标记为正在加载
        window.masonryLoading = true;
        
        // 执行加载
        // 由于已接入事件系统，且底层加载器已经打印错误日志，所以在then、catch中简化处理，避免过多日志。未来考虑删除这个Promise。
        this.loadingPromise = Promise.resolve()
            .then(() => {
                logger.info('📦 加载Masonry和imagesLoaded');
                
                // 并行加载两个JS
                return Promise.all([
                    this._loadMasonry(masonryConfig),
                    this._loadImagesLoaded(imagesLoadedConfig)
                ]);
            })
            .then(([masonryLoaded, imagesLoadedLoaded]) => {
                if (!masonryLoaded) {
                    window.masonryLoading = false;
                    return false;
                }
                
                // 标记为加载完成
                window.masonryLoaded = true;
                window.masonryLoading = false;
                return true;
            })
            .catch(error => {
                window.masonryLoaded = false;
                window.masonryLoading = false;
                return false;
            });
            
        return this.loadingPromise;
    }
    
    /**
     * 等待Masonry加载完成
     * @private
     * @returns {Promise} - 加载完成的Promise
     */
    _waitForMasonryLoaded() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (window.masonryLoaded) {
                    clearInterval(checkInterval);
                    clearTimeout(timeout);
                    resolve(true);
                }
            }, 100);
            
            // 设置超时，避免无限等待
            const timeout = setTimeout(() => {
                clearInterval(checkInterval);
                logger.warn('等待Masonry加载超时');
                resolve(false);
            }, 5000);
        });
    }
    
    /**
     * 加载Masonry库
     * @private
     * @param {Object} masonryConfig - Masonry库配置
     * @returns {Promise} - 加载完成的Promise
     */
    _loadMasonry(masonryConfig) {
        return new Promise(resolve => {
            try {
                const version = this.resourceConfig?.versions?.masonry || '4.2.2';
                
                // 从配置或默认值获取URL
                let urls = this._getResourceUrls('scripts', 'masonry', masonryConfig);
                if (!urls || !urls.primaryUrl) {
                    urls = this._getDefaultMasonryUrls(version);
                    logger.debug('⚠️ 未找到有效的Masonry URL,使用默认值');
                }
                
                // 构建加载选项
                const options = {
                    async: true,  // 异步加载
                    attributes: {
                        'data-resource-group': 'layout',
                        'data-resource-id': 'masonry',
                        'data-resource-type': 'masonry',
                        'data-local-fallback': urls.localUrl
                    },
                    fallbacks: urls.fallbackUrls || [],
                    localFallback: urls.localUrl
                };

                logger.debug(`Masonry的URL: ${urls.primaryUrl} , 本地回退URL: ${urls.localUrl}`);
                if (urls.fallbackUrls && urls.fallbackUrls.length > 0) {
                    logger.debug(`Masonry的备用URLs: ${urls.fallbackUrls.join(', ')}`);
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
                        throw new Error('Masonry加载失败');
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
     * 加载ImagesLoaded库
     * @private
     * @param {Object} imagesLoadedConfig - ImagesLoaded库配置
     * @returns {Promise} - 加载完成的Promise
     */
    _loadImagesLoaded(imagesLoadedConfig) {
        return new Promise(resolve => {
            try {
                const version = this.resourceConfig?.versions?.imagesLoaded || '5.0.0';
                
                // 从配置或默认值获取URL
                let urls = this._getResourceUrls('scripts', 'imagesLoaded', imagesLoadedConfig);
                if (!urls || !urls.primaryUrl) {
                    urls = this._getDefaultImagesLoadedUrls(version);
                    logger.debug('⚠️ 未找到有效的ImagesLoaded URL,使用默认值');
                }
                
                // 构建加载选项
                const options = {
                    attributes: {
                        'data-resource-group': 'layout',
                        'data-resource-id': 'imagesLoaded',
                        'data-resource-type': 'imagesLoaded',
                        'data-local-fallback': urls.localUrl
                    },
                    fallbacks: urls.fallbackUrls || [],
                    localFallback: urls.localUrl
                };
                
                logger.debug(`ImagesLoaded的URL: ${urls.primaryUrl} , 本地回退URL: ${urls.localUrl}`);
                if (urls.fallbackUrls && urls.fallbackUrls.length > 0) {
                    logger.debug(`ImagesLoaded的备用URLs(包括备用CDN和本地回退): ${urls.fallbackUrls.join(', ')}`);
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
                        throw new Error('Masonry加载失败');
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
     * 获取默认的Masonry库URL
     * @private
     * @param {string} version - Masonry版本
     * @returns {Object} - 包含主URL、回退URL和本地URL的对象
     */
    _getDefaultMasonryUrls(version) {
        return {
            primaryUrl: `https://cdn.jsdelivr.net/npm/masonry-layout@${version}/dist/masonry.pkgd.min.js`,
            fallbackUrls: [
                `https://cdnjs.cloudflare.com/ajax/libs/masonry-layout/${version}/masonry.pkgd.min.js`
            ],
            localUrl: `/assets/libs/masonry/masonry.pkgd.min.js`
        };
    }
    
    /**
     * 获取默认的ImagesLoaded库URL
     * @private
     * @param {string} version - ImagesLoaded版本
     * @returns {Object} - 包含主URL、回退URL和本地URL的对象
     */
    _getDefaultImagesLoadedUrls(version) {
        return {
            primaryUrl: `https://cdn.jsdelivr.net/npm/imagesloaded@${version}/imagesloaded.pkgd.min.js`,
            fallbackUrls: [
                `https://cdnjs.cloudflare.com/ajax/libs/imagesloaded/${version}/imagesloaded.pkgd.min.js`
            ],
            localUrl: `/assets/libs/imagesloaded/imagesloaded.pkgd.min.js`
        };
    }
}

// 创建并导出单例实例
const masonryLoader = new MasonryLoader();

// 同时提供命名导出和默认导出
export { masonryLoader, MasonryLoader };
export default masonryLoader; 