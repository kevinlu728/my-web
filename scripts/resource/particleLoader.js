/**
 * @file particleLoader.js
 * @description 粒子背景资源加载器，负责加载和管理particles.js库资源
 * @author 陆凯
 * @version 1.0.2
 * @created 2024-03-09
 * @updated 2024-07-12
 * 
 * 该模块负责particles.js库及相关资源的智能加载与管理：
 * - 从配置或默认值获取资源URL
 * - 处理资源加载状态跟踪
 * - 提供多CDN回退和本地资源降级方案
 * - 防止重复加载，提高性能
 * - 发送资源加载事件，协调其他组件
 * 
 * 主要方法：
 * - loadParticleResources: 加载particles.js库
 * - _loadParticleCore: 内部方法，加载核心库
 * - _waitForParticleLoaded: 等待加载完成的Promise
 */

import logger from '../utils/logger.js';
import resourceConfig from '../config/resources.js';
import { scriptResourceLoader } from './scriptResourceLoader.js';

class ParticleLoader {
    constructor() {
        this.resourceConfig = resourceConfig;
    }

    /**
     * 加载粒子背景相关资源
     * @returns {Promise} - 加载完成的Promise
     */
    loadParticleResources() {
        logger.info('📝 加载粒子背景资源');
        
        // 尝试从资源配置中获取粒子背景资源信息
        let particleConfig;
        
        try {
            particleConfig = this.resourceConfig.resources.scripts['particles'];
            
            if (!particleConfig) {
                logger.warn('⚠️ 未在资源配置中找到particles配置,将使用默认值');
            }
        } catch (error) {
            logger.warn('⚠️ 获取粒子背景资源配置失败,将使用默认值', error);
        }
        
        // 检查是否已加载
        if (window.particleLoaded && typeof particlesJS !== 'undefined') {
            logger.debug('✓ 粒子背景已加载,跳过加载过程');
            return Promise.resolve(true);
        }
        
        // 如果已经在加载中，避免重复加载
        if (window.particleLoading) {
            logger.debug('⏳ 粒子背景正在加载中,等待完成...');
            return this._waitForParticleLoaded();
        }
        
        // 标记为正在加载
        window.particleLoading = true;
        
        // 按照标准模式加载主要资源
        return Promise.resolve()
            .then(() => {
                logger.info('📦 加载粒子背景库');
                
                // 并行加载JS和CSS
                return Promise.all([
                    this._loadParticleCore(particleConfig),
                ]);
            })
            .then(([coreLoaded, cssLoaded]) => {
                if (!coreLoaded) {
                    window.particleLoading = false;
                    return false;
                }
                
                // 标记为加载完成
                window.particleLoaded = true;
                window.particleLoading = false;
                return true;
            })
            .catch(error => {
                window.particleLoaded = false;
                window.particleLoading = false;
                return false;
            });
    }

    /**
     * 等待Particle加载完成
     * @private
     * @returns {Promise} - 加载完成的Promise
     */
    _waitForParticleLoaded() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (window.particleLoaded) {
                    clearInterval(checkInterval);
                    clearTimeout(timeout);
                    resolve(true);
                }
            }, 100);
            
            // 设置超时，避免无限等待
            const timeout = setTimeout(() => {
                clearInterval(checkInterval);
                logger.warn('等待Particle加载超时');
                resolve(false);
            }, 5000);
        });
    }

    /**
     * 加载Particle核心库
     * @private
     * @param {Object} coreConfig - Particle核心配置
     * @returns {Promise} - 加载完成的Promise
     */
    _loadParticleCore(coreConfig) {
        return new Promise(resolve => {
            try {
                const version = this.resourceConfig?.versions?.particles || '2.0.0';
                
                // 从配置或默认值获取URL
                let urls = this._getResourceUrls('scripts', 'particles', coreConfig);
                if (!urls || !urls.primaryUrl) {
                    urls = this._getDefaultParticleCoreUrls(version);
                    logger.debug('⚠️ 未找到有效的Particle URL,使用默认值');
                }
                
                // 构建加载选项
                const options = {
                    async: true,  // 异步加载
                    attributes: {
                        'data-resource-group': 'animation',
                        'data-resource-id': 'particles',
                        'data-resource-type': 'particles',
                        'data-local-fallback': urls.localUrl
                    },
                    fallbacks: urls.fallbackUrls || [],
                    localFallback: urls.localUrl
                };

                logger.debug(`Particle核心库的URL: ${urls.primaryUrl} , 本地回退URL: ${urls.localUrl}`);
                if (urls.fallbackUrls && urls.fallbackUrls.length > 0) {
                    logger.debug(`Particle核心库的备用URLs: ${urls.fallbackUrls.join(', ')}`);
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
                        throw new Error('Particle核心库加载失败');
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
     * 获取默认的Particle核心库URL
     * @private
     * @param {string} version - Particle版本
     * @returns {Object} - 包含主URL、回退URL和本地URL的对象
     */
    _getDefaultParticleCoreUrls(version) {
        return {
            primaryUrl: `https://cdn.jsdelivr.net/npm/particles.js@${version}/particles.min.js`,
            fallbackUrls: [
                `https://cdnjs.cloudflare.com/ajax/libs/particles.js/${version}/particles.min.js`
            ],
            localUrl: `/assets/libs/particles/particles.min.js`
        };
    }
}

// 创建并导出单例实例
const particleLoader = new ParticleLoader();

// 同时提供命名导出和默认导出
export { particleLoader, ParticleLoader };
export default particleLoader; 
