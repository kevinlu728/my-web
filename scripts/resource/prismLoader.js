/**
 * @file prismLoader.js
 * @description Prism代码高亮加载器
 * 负责管理Prism相关资源的加载逻辑，最终通过scriptResourceLoader和styleResourceLoader加载。
 * @version 1.0.2
 */

// 导入必要的依赖
import logger from '../utils/logger.js';
import resourceConfig from '../config/resources.js';
import { resourceEvents, RESOURCE_EVENTS } from '../resource/resourceEvents.js';
import { styleResourceLoader } from './styleResourceLoader.js';
import { scriptResourceLoader } from './scriptResourceLoader.js';

/**
 * Prism代码高亮加载器类
 */
class PrismLoader {
    constructor() {
        this.resourceConfig = resourceConfig;
    }
    
    /**
     * 加载Prism相关资源
     * @returns {Promise} - 加载完成的Promise
     */
    loadPrismResources() {
        logger.info('📝 加载代码高亮资源');
        
        // 尝试从资源配置中获取Prism资源信息
        let prismCoreConfig;
        let prismThemeConfig;
        let prismComponentsConfig;
        
        try {
            prismCoreConfig = this.resourceConfig.resources.scripts['prism-core'];
            prismThemeConfig = this.resourceConfig.resources.styles['prism-theme'];
            prismComponentsConfig = this.resourceConfig.resources.scripts['prism-lan-components'];
            if (!prismCoreConfig) {
                logger.warn('⚠️ 未在资源配置中找到prism-core配置,将使用默认值');
            }
            if (!prismThemeConfig) {
                logger.warn('⚠️ 未在资源配置中找到prism-theme配置,将使用默认值');
            }
            if (!prismComponentsConfig) {
                logger.warn('⚠️ 未在资源配置中找到prism-components配置,将使用默认值');
            }
        } catch (error) {
            logger.warn('⚠️ 获取Prism资源配置失败,将使用默认值', error);
        }
        
        // 检查是否已加载，与其他资源加载函数保持一致的风格
        if (window.prismLoaded && window.Prism) {
            logger.debug('✓ Prism已加载,跳过加载过程');
            return Promise.resolve(true);
        }
        
        // 如果已经在加载中，避免重复加载
        if (window.prismLoading) {
            logger.debug('⏳ Prism正在加载中,等待完成...');
            return this._waitForPrismLoaded(prismThemeConfig);
        }
        
        // 标记为正在加载
        window.prismLoading = true;
        
        // 执行加载
        // 由于已接入事件系统，且底层加载器已经打印错误日志，所以在then、catch中简化处理，避免过多日志。未来考虑删除这个Promise。
        return Promise.resolve()
            .then(() => {
                logger.info('📦 加载Prism核心库和样式');
                
                // 并行加载JS和CSS
                return Promise.all([
                    this._loadPrismCore(prismCoreConfig),
                    this._loadPrismTheme(prismThemeConfig),
                    // this._loadPrismLanguageComponents(prismComponentsConfig)  // 注释掉，因为语言组件的加载已经移到监听器中
                ]);
            })
            .then(([coreLoaded, cssLoaded, lanComponentsLoaded]) => {
                if (!coreLoaded) {
                    window.prismLoading = false;
                    return false;
                }
                window.prismLoaded = true;
                window.prismLoading = false;
                return true;
            })
            .catch(error => {
                window.prismLoaded = false;
                window.prismLoading = false;
                return false;
            });
    }
    

    /**
     * 等待Prism加载完成 (内部辅助方法)
     * @private
     * @param {Object} themeConfig - Prism主题配置
     * @returns {Promise} - 完成的Promise
     */
    _waitForPrismLoaded(themeConfig) {
        return new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (window.prismLoaded) {
                    clearInterval(checkInterval);
                    clearTimeout(timeout);
                    resolve(true);
                }
            }, 100);
            
            // 设置超时，避免无限等待
            const timeout = setTimeout(() => {
                clearInterval(checkInterval);
                logger.warn('等待Prism加载超时');
                resolve(false);
            }, 5000);
        });
    }

    /**
     * 加载Prism核心库 (内部辅助方法)
     * @private
     * @param {Object} coreConfig - Prism核心配置
     * @returns {Promise} - 加载完成的Promise
     */
    _loadPrismCore(coreConfig) {
        return new Promise(resolve => {
            try {
                const version = this.resourceConfig?.versions?.prism || '1.29.0';
                
                // 从配置或默认值获取URL
                let urls = this._getResourceUrls('scripts', 'prism-core', coreConfig);
                if (!urls || !urls.primaryUrl) {
                    urls = this._getDefaultPrismCoreUrls(version);
                    logger.warn('⚠️ 未找到有效的Prism URL,使用默认值');
                }
                
                // 构建加载选项
                const options = {
                    async: true,  // 异步加载
                    attributes: {
                        'data-resource-group': 'code',
                        'data-resource-id': 'prism-core',
                        'data-resource-type': 'prism',
                        'data-local-fallback': urls.localUrl
                    },
                    fallbacks: urls.fallbackUrls || [],
                    localFallback: urls.localUrl
                };

                logger.debug(`Prism核心库的URL: ${urls.primaryUrl} , 本地回退URL: ${urls.localUrl}`);
                if (urls.fallbackUrls && urls.fallbackUrls.length > 0) {
                    logger.debug(`Prism核心库的备用URLs: ${urls.fallbackUrls.join(', ')}`);
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
     * 加载Prism主题 (内部辅助方法)
     * @private
     * @param {Object} themeConfig - Prism主题配置
     * @returns {Promise<boolean>} - 加载完成的Promise
     */
    _loadPrismTheme(themeConfig) {
        return new Promise(resolve => {
            try {
                const version = this.resourceConfig?.versions?.prism || '1.29.0';
                
                // 使用传入的主题配置获取URL
                let urls = this._getResourceUrls('styles', 'prism-theme', themeConfig);
                if (!urls || !urls.primaryUrl) {
                    urls = this._getDefaultPrismThemeUrls(version);
                        logger.debug('⚠️ 未找到有效的Prism主题URL,使用默认值');
                }
                
                // 构建选项对象
                const options = {
                    attributes: {
                        'data-resource-group': 'code',
                        'data-resource-id': 'prism-theme',
                        'data-resource-type': 'prism',
                        'data-local-fallback': urls.localUrl
                        },
                        fallbacks: urls.fallbackUrls || [],
                        localFallback: urls.localUrl
                };

                logger.debug(`Prism主题的URL: ${urls.primaryUrl} , 本地回退URL: ${urls.localUrl}`);
                if (urls.fallbackUrls && urls.fallbackUrls.length > 0) {
                        logger.debug(`Prism主题的备用URLs: ${urls.fallbackUrls.join(', ')}`);
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
     * 加载Prism语言组件
     * @private
     * @param {Object} prismComponentsConfig - Prism语言组件配置
     * @returns {Promise<boolean>} - 加载完成的Promise
     */
    loadPrismLanguageComponents() {
        let prismComponentsConfig;
        try {
            prismComponentsConfig = this.resourceConfig.resources.scripts['prism-lan-components'];
        } catch (error) {
            logger.warn('⚠️ 获取Prism语言组件配置失败', error);
        }

        // 1. 准备和分析语言列表
        const { 
            processedComponents, 
            originalCount, 
            baseLangs, 
            dependentLangs, 
            normalLangs 
        } = this._preparePrismLanguages(prismComponentsConfig);
        
        if (originalCount === 0) {
            return Promise.resolve(true);
        }
        
        // 2. 创建加载单个语言的函数
        const loadLanguage = this._createLanguageLoader(processedComponents);
        
        // 3. 按依赖顺序加载所有语言组件
        return this._executeLanguageLoading(
            baseLangs, 
            dependentLangs, 
            normalLangs, 
            loadLanguage, 
            processedComponents, 
            originalCount
        );
    }

    /**
     * 准备Prism语言列表，处理依赖关系
     * @private
     * @param {Object} prismComponentsConfig - Prism语言组件配置
     * @returns {Object} - 包含处理后的语言列表和状态对象
     */
    _preparePrismLanguages(prismComponentsConfig) {
        // 使用传入的配置而不是从resourceConfig获取
        // 提取语言依赖和默认语言列表
        const source = prismComponentsConfig?.source || {};
        const dependencyMap = source.languageDependencies || {};
        const defaultLanguages = source.defaultLanguages || ['c', 'cpp', 'java', 'javascript', 'python'];
        
        // 从配置参数中获取语言列表
        let languages = [];
        if (prismComponentsConfig && prismComponentsConfig.languages && Array.isArray(prismComponentsConfig.languages)) {
            languages = prismComponentsConfig.languages;
        } else {
            // 使用配置中的默认语言
            languages = defaultLanguages;
        }       
        // 过滤无效语言
        const validLanguages = languages.filter(lang => typeof lang === 'string' && lang.trim());       
        // 如果没有有效语言，则返回空结果
        if (validLanguages.length === 0) {
            return { 
                processedComponents: new Map(), 
                originalCount: 0, 
                baseLangs: [], 
                dependentLangs: [], 
                normalLangs: [] 
            };
        }
        
        // 追踪原始请求的组件数量
        const originalCount = validLanguages.length;
        
        logger.debug(`🔄 加载 ${originalCount} 个Prism语言组件`);
        
        // 记录已处理的组件状态
        const processedComponents = new Map();
        
        // 构建完整的语言列表，包括依赖项
        const allLanguages = [...validLanguages]; // 初始化为用户指定的语言
        
        // 添加所有依赖
        validLanguages.forEach(lang => {
            const langId = lang.toLowerCase().trim();
            processedComponents.set(langId, { requested: true, loaded: false });
            
            if (dependencyMap[langId]) {
                dependencyMap[langId].forEach(depLang => {
                    if (!allLanguages.includes(depLang)) {
                        allLanguages.push(depLang);
                        // 标记为依赖添加，而非直接请求
                        processedComponents.set(depLang, { requested: false, loaded: false });
                        logger.debug(`添加 ${langId} 的依赖语言: ${depLang}`);
                    }
                });
            }
        });
        
        // 将语言按依赖关系分组
        const baseLangs = []; // 作为依赖的基础语言
        const dependentLangs = []; // 依赖其他语言的语言
        const normalLangs = []; // 没有依赖关系的语言
        
        allLanguages.forEach(lang => {
            const langId = lang.toLowerCase().trim();
            
            // 判断此语言是否是其他语言的依赖
            const isBaseLang = Object.values(dependencyMap).some(deps => 
                deps.includes(langId)
            );
            
            // 判断此语言是否依赖其他语言
            const isDependentLang = dependencyMap[langId] && dependencyMap[langId].length > 0;
            
            if (isBaseLang) {
                baseLangs.push(langId);
            } else if (isDependentLang) {
                dependentLangs.push(langId);
            } else {
                normalLangs.push(langId);
            }
        });
        return { processedComponents, originalCount, baseLangs, dependentLangs, normalLangs };
    }

    /**
     * 创建加载单个语言组件的函数
     * @private
     * @param {Map} processedComponents - 记录语言加载状态的Map
     * @returns {Function} - 加载单个语言的函数
     */
    _createLanguageLoader(processedComponents) {
        // 直接使用本地路径作为基本路径
        const basePath = '/assets/libs/prism/components/';
        
        // 加载单个语言组件的函数
        return function loadLanguage(langId) {
            return new Promise(resolve => {
                // 已经加载过这个组件则跳过
                if (window.Prism && window.Prism.languages && window.Prism.languages[langId]) {
                    logger.debug(`Prism语言组件 ${langId} 已加载`);
                    // 更新状态
                    if (processedComponents.has(langId)) {
                        processedComponents.get(langId).loaded = true;
                    }
                    return resolve({ loaded: true, skipped: true, langId });
                }
                
                // JavaScript作为Prism核心的一部分可能已经加载
                if ((langId === 'javascript' || langId === 'js') && 
                    window.Prism && window.Prism.languages && window.Prism.languages.javascript) {
                    logger.debug(`Prism核心已包含 ${langId} 语言支持`);
                    // 更新状态
                    if (processedComponents.has(langId)) {
                        processedComponents.get(langId).loaded = true;
                    }
                    return resolve({ loaded: true, skipped: true, langId });
                }
                
                // 由于语言组件较多，为了减少网络请求，语言组件目前使用本地资源
                const scriptUrl = `${basePath}prism-${langId}.min.js`;
                
                // 配置脚本加载选项
                const scriptOptions = {
                    url: scriptUrl,
                    id: `prism-lan-components-${langId}`,
                    attributes: {
                        'data-resource-group': 'code',
                        'data-resource-id': `prism-lan-components-${langId}`,
                        'data-resource-type': 'prism'
                    },
                    priority: 'medium',
                    async: true
                };
                
                // 使用scriptResourceLoader加载脚本
                scriptResourceLoader.loadScript(scriptOptions)
                    .then(() => {
                        // 延迟检查，确保组件有时间初始化
                        setTimeout(() => {
                            if (window.Prism && window.Prism.languages && window.Prism.languages[langId]) {
                                logger.info(`✓ Prism ${langId} 语言组件加载成功`);
                                // 更新状态
                                if (processedComponents.has(langId)) {
                                    processedComponents.get(langId).loaded = true;
                                }
                                resolve({ loaded: true, skipped: false, langId });
                            } else {
                                logger.warn(`⚠️ Prism ${langId} 组件已加载但未正确初始化`);
                                resolve({ loaded: false, skipped: false, langId });
                            }
                        }, 50); // 短暂延迟确保初始化
                    })
                    .catch(error => {
                        logger.error(`❌ 无法加载Prism ${langId} 语言组件: ${error.message}`);
                        resolve({ loaded: false, skipped: false, langId });
                    });
            });
        };
    }

    /**
     * 执行语言组件加载过程
     * @private
     * @param {Array} baseLangs - 基础语言列表
     * @param {Array} dependentLangs - 依赖型语言列表
     * @param {Array} normalLangs - 普通语言列表
     * @param {Function} loadLanguage - 加载单个语言的函数
     * @param {Map} processedComponents - 记录语言加载状态的Map
     * @param {number} originalCount - 原始请求的语言数量
     * @returns {Promise<boolean>} - 加载成功与否的Promise
     */
    _executeLanguageLoading(baseLangs, dependentLangs, normalLangs, loadLanguage, processedComponents, originalCount) {
        // 分三步加载
        return Promise.resolve()
            // 步骤1: 加载基础语言
            .then(() => {
                return Promise.all(baseLangs.map(loadLanguage));
            })
            // 步骤2: 短暂延迟后加载依赖型语言
            .then((baseResults) => {
                if (dependentLangs.length === 0) return baseResults;
                
                // 关键：在加载依赖型语言前添加延迟，确保基础语言组件完全初始化
                return new Promise(resolve => {
                    setTimeout(() => {
                        // 确认基础语言是否都已正确初始化
                        const baseInitialized = baseLangs.every(lang => 
                            window.Prism && window.Prism.languages && window.Prism.languages[lang]
                        );
                        
                        if (!baseInitialized) {
                            logger.warn('某些基础语言组件未正确初始化,可能影响依赖型语言');
                        }
                        
                        Promise.all(dependentLangs.map(loadLanguage))
                            .then(depResults => {
                                resolve([...baseResults, ...depResults]);
                            });
                    }, 200); // 延迟200毫秒确保基础语言组件完全初始化
                });
            })
            // 步骤3: 加载普通语言
            .then(previousResults => {
                return Promise.all(normalLangs.map(loadLanguage))
                    .then(normResults => [...previousResults, ...normResults]);
            })
            // 处理结果
            .then(allResults => {
                // 计算原始请求的组件中成功加载的数量
                const requestedComponents = Array.from(processedComponents.entries())
                    .filter(([_, status]) => status.requested);
                
                const loadedRequestedCount = requestedComponents
                    .filter(([_, status]) => status.loaded)
                    .length;
                
                // 计算所有组件的加载情况
                const totalSuccessCount = allResults.filter(r => r.loaded).length;
                const loadedDependenciesCount = totalSuccessCount - loadedRequestedCount;
                
                // 输出简明的日志
                logger.info(`加载了 ${loadedRequestedCount}/${originalCount} 个请求的Prism语言组件` + 
                          (loadedDependenciesCount > 0 ? `,以及 ${loadedDependenciesCount} 个依赖组件` : ''));
                
                // 触发语言组件加载完成事件
                resourceEvents.emit(RESOURCE_EVENTS.LOADING_SUCCESS, {
                    resourceId: 'prism-all-lan-components',
                    resourceType: 'prism-components',
                    status: 'loaded',
                    loadedCount: totalSuccessCount,
                    requestedCount: originalCount,
                    sender: 'prismLoader'
                });
                
                // this._highlightCode();
                
                window.prismLoading = false;
                window.prismLoaded = true;
                
                return totalSuccessCount > 0;
            })
            .catch(err => {
                logger.error('加载Prism语言组件时出错', err.message);
                window.prismLoading = false;
                window.prismLoaded = false;
                return false;
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
     * 获取默认的Prism核心URL
     * @private
     * @param {string} version - Prism版本
     * @returns {Object} - 包含主URL和回退URL的对象
     */
    _getDefaultPrismCoreUrls(version) {
        return {
            primaryUrl: `https://cdn.jsdelivr.net/npm/prismjs@${version}/prism.min.js`,
            fallbackUrls: [
                `https://cdnjs.cloudflare.com/ajax/libs/prism/${version}/prism.min.js`,
                `https://unpkg.com/prismjs@${version}/prism.min.js`
            ],
            localUrl: `/assets/libs/prism/prism.min.js`
        };
    }
    
    /**
     * 获取默认的Prism主题URL
     * @private
     * @param {string} version - Prism版本
     * @returns {Object} - 包含主URL和回退URL的对象
     */
    _getDefaultPrismThemeUrls(version) {
        return {
            primaryUrl: `https://cdn.jsdelivr.net/npm/prismjs@${version}/themes/prism-tomorrow.min.css`,
            fallbackUrls: [
                `https://cdnjs.cloudflare.com/ajax/libs/prism/${version}/themes/prism-tomorrow.min.css`
            ],
            localUrl: `/assets/libs/prism/themes/prism-tomorrow.min.css`
        };
    }
}

// 创建并导出单例实例
const prismLoader = new PrismLoader();

// 同时提供命名导出和默认导出，保持与其他加载器一致
export { prismLoader, PrismLoader };
export default prismLoader;