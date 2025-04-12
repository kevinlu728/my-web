/**
 * @file prismLoader.js
 * @description Prism代码高亮加载器
 * 负责管理Prism相关资源的加载逻辑，最终通过scriptResourceLoader和styleResourceLoader加载。
 * @version 1.0.2
 */

// 导入必要的依赖
import logger from '../utils/logger.js';
import resourceConfig from '../config/resources.js';
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
     * 加载代码高亮相关资源
     * @returns {Promise} - 加载完成的Promise
     */
    loadCodeHighlightResources() {
        logger.info('📝 加载代码高亮资源');
        
        // 尝试从资源配置中获取Prism资源信息
        let prismCoreConfig;
        let prismThemeConfig;
        let prismComponentsConfig;
        
        try {
            prismCoreConfig = this.resourceConfig.resources.scripts['prism-core'];
            prismThemeConfig = this.resourceConfig.resources.styles['prism-theme'];
            prismComponentsConfig = this.resourceConfig.resources.scripts['prism-components'];
            if (!prismCoreConfig) {
                logger.warn('⚠️ 未在资源配置中找到prism-core配置，将使用默认值');
            }
            if (!prismThemeConfig) {
                logger.warn('⚠️ 未在资源配置中找到prism-theme配置，将使用默认值');
            }
            if (!prismComponentsConfig) {
                logger.warn('⚠️ 未在资源配置中找到prism-components配置，将使用默认值');
            }
        } catch (error) {
            logger.warn('⚠️ 获取Prism资源配置失败，将使用默认值', error);
        }
        
        // 检查是否已加载，与其他资源加载函数保持一致的风格
        if (window.prismLoaded && window.Prism) {
            logger.debug('✓ Prism已加载，仅确保样式加载完成');
            return this._loadPrismTheme(prismThemeConfig)
                .then(() => {
                    this.applyPrismHighlight();
                    return true;
                })
                .catch(error => {
                    logger.warn('⚠️ Prism主题加载失败，但继续进行代码高亮', error);
                    this.applyPrismHighlight();
                    return true;
                });
        }
        
        // 如果已经在加载中，避免重复加载
        if (window.prismLoading) {
            logger.debug('⏳ Prism正在加载中，等待完成...');
            return this._waitForPrismLoaded(prismThemeConfig);
        }
        
        // 标记为正在加载
        window.prismLoading = true;
        
        // 按照标准模式加载主要资源
        return Promise.resolve()
            .then(() => {
                logger.info('📦 加载Prism核心库');
                return this._loadPrismCore(prismCoreConfig);
            })
            .then(coreLoaded => {
                if (!coreLoaded) {
                    logger.error('❌ Prism核心库加载失败');
                    window.prismLoading = false;
                    return false;
                }
                // 获取要加载的语言组件列表
                let languages = ['java', 'javascript', 'cpp', 'python']; // 默认语言
                
                // 如果配置中有定义组件，使用配置的组件
                if (prismComponentsConfig && prismComponentsConfig.source && prismComponentsConfig.source.components) {
                    languages = prismComponentsConfig.source.components.map(comp => comp.name);
                    logger.debug(`✓ 从配置获取语言组件列表: ${languages.join(', ')}`);
                }
                
                logger.debug('Prism核心库已加载成功，开始加载语言组件');
                // 并行加载语言组件和主题
                return Promise.all([
                    this._loadPrismLanguageComponents(prismComponentsConfig),
                    this._loadPrismTheme(prismThemeConfig)
                ]);
            })
            .then(results => {
                // 标记为加载完成
                window.prismLoaded = true;
                window.prismLoading = false;
                
                // 应用高亮
                this.applyPrismHighlight();
                
                logger.info('✅ 代码高亮资源加载完成');
                return true;
            })
            .catch(error => {
                logger.error('❌ 代码高亮资源加载失败', error.message);
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
                if (window.prismLoaded && window.Prism) {
                    clearInterval(checkInterval);
                    
                    // 使用 finally 替代重复的 then/catch 处理
                    this._loadPrismTheme(themeConfig)
                        .finally(() => {
                            this.applyPrismHighlight();
                            resolve(true);
                        });
                }
            }, 100);
            
            // 防止无限等待
            setTimeout(() => {
                clearInterval(checkInterval);
                if (!window.prismLoaded) {
                    logger.warn('⏱️ Prism库加载超时');
                    resolve(false);
                }
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
                    logger.warn('⚠️ 未找到有效的Prism URL，使用默认值');
                }
                
                // 构建加载选项
                const options = {
                    fallbacks: urls.fallbackUrls || [],
                    localFallback: urls.localUrl,
                    attributes: {
                        'data-resource-group': 'code',
                        'data-resource-id': 'prism-core',
                        'data-resource-type': 'prism',
                        'data-name': 'prism-core',
                        'data-local-fallback': urls.localUrl
                    },
                    attachToWindow: true,
                    onResourceLoaded: (url, success) => {
                        if (success && window.Prism) {
                            logger.info(`✅ Prism核心库成功加载: ${url}`);
                            resolve(true);
                        }
                    }
                };

                logger.debug(`Prism核心URL: ${urls.primaryUrl} ，本地回退URL: ${urls.localUrl}`);
                if (urls.fallbackUrls && urls.fallbackUrls.length > 0) {
                    logger.debug(`Prism核心备用URLs（包括备用CDN和本地回退）: ${urls.fallbackUrls.join(', ')}`);
                }
                
                // 加载脚本
                scriptResourceLoader.loadScript(
                    urls.primaryUrl,
                    {  // 资源对象
                        attributes: options.attributes,
                        priority: 'medium'
                    },
                    {  // 加载选项
                        async: options.async || false,
                        defer: options.defer || false,
                        attachToWindow: options.attachToWindow,
                        onResourceLoaded: options.onResourceLoaded
                    }
                )
                .catch(error => {
                    // 只有在所有回退都失败时才解析为失败
                    // 检查Prism是否已在window上，因为回退加载可能成功了
                    if (!window.Prism) {
                        logger.error('❌ Prism核心库加载失败 (所有来源)', error.message);
                        resolve(false);
                    }
                });
                
                // 添加安全超时
                setTimeout(() => {
                    if (window.Prism) {
                        logger.debug('✅ 检测到Prism已全局可用');
                        resolve(true);
                    } else {
                        logger.warn('⏱️ Prism核心库加载超时');
                        resolve(false);
                    }
                }, 3000);
            } catch (error) {
                logger.error('❌ 加载Prism核心库时出现意外错误', error.message);
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
        // 如果已经加载，不再重复加载
        if (window.prismThemeLoaded) {
            logger.debug('Prism主题已加载，跳过');
            return Promise.resolve(true);
        }
        
        // 如果已经在加载中，避免重复加载
        if (window.prismThemeLoading) {
            logger.debug('Prism主题正在加载中，跳过');
            return Promise.resolve(true);
        }
        
        // 标记为正在加载
        window.prismThemeLoading = true;
        
        try {
            const version = this.resourceConfig?.versions?.prism || '1.29.0';
            
            // 使用传入的主题配置获取URL
            let urls = this._getResourceUrls('styles', 'prism-theme', themeConfig);
            if (!urls || !urls.primaryUrl) {
                urls = this._getDefaultPrismThemeUrls(version);
                logger.debug('⚠️ 未找到有效的Prism主题URL，使用默认值');
            }
            
            // 构建选项对象
            const options = {
                fallbacks: urls.fallbackUrls || [],
                localFallback: urls.localUrl,
                attributes: {
                    'data-resource-group': 'code',
                    'data-resource-id': 'prism-theme',
                    'data-resource-type': 'prism',
                    'data-name': 'prism-theme',
                    'data-local-fallback': urls.localUrl
                }
            };

            logger.debug(`Prism主题URL: ${urls.primaryUrl} ，本地回退URL: ${urls.localUrl}`);
            if (urls.fallbackUrls && urls.fallbackUrls.length > 0) {
                logger.debug(`Prism主题备用URLs（包括备用CDN和本地回退）: ${urls.fallbackUrls.join(', ')}`);
            }
            
            // 直接返回loadCss的Promise结果
            return styleResourceLoader.loadCss(urls.primaryUrl, options, true)
                .then(result => {
                    window.prismThemeLoaded = true;
                    window.prismThemeLoading = false;
                    return result;
                })
                .catch(error => {
                    logger.error('❌ Prism主题加载失败', error.message);
                    window.prismThemeLoaded = false;
                    window.prismThemeLoading = false;
                    return false;
                });
        } catch (error) {
            logger.error('❌ 加载Prism主题配置时出错', error.message);
            window.prismThemeLoaded = false;
            window.prismThemeLoading = false;
            return Promise.resolve(false);
        }
    }

    /**
     * 加载Prism语言组件
     * @private
     * @param {Object} prismComponentsConfig - Prism语言组件配置
     * @returns {Promise<boolean>} - 加载完成的Promise
     */
    _loadPrismLanguageComponents(prismComponentsConfig) {
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
        // 如果没有有效语言，则直接返回成功
        if (validLanguages.length === 0) {
            return Promise.resolve(true);
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
        
        // 直接使用本地路径作为基本路径
        const basePath = '/assets/libs/prism/components/';
        
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
        
        if (baseLangs.length > 0) {
            logger.debug(`基础语言(${baseLangs.length}个): ${baseLangs.join(', ')}`);
        }
        if (dependentLangs.length > 0) {
            logger.debug(`依赖型语言(${dependentLangs.length}个): ${dependentLangs.join(', ')}`);
        }
        if (normalLangs.length > 0) {
            logger.debug(`普通语言(${normalLangs.length}个): ${normalLangs.join(', ')}`);
        }
        
        // 加载单个语言组件的函数
        const loadLanguage = (langId) => {
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
                
                // 创建脚本元素
                const script = document.createElement('script');
                script.type = 'text/javascript';
                
                // 由于语言组件较多，为了减少网络请求，语言组件目前使用本地资源
                script.src = `${basePath}prism-${langId}.min.js`;
                
                script.onload = () => {
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
                };
                
                script.onerror = () => {
                    logger.error(`❌ 无法加载Prism ${langId} 语言组件`);
                    resolve({ loaded: false, skipped: false, langId });
                };
                
                document.head.appendChild(script);
            });
        };
        
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
                            logger.warn('某些基础语言组件未正确初始化，可能影响依赖型语言');
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
                          (loadedDependenciesCount > 0 ? `，以及 ${loadedDependenciesCount} 个依赖组件` : ''));
                
                // 主动触发高亮
                this.applyPrismHighlight();
                
                return totalSuccessCount > 0;
            })
            .catch(err => {
                logger.error('加载Prism语言组件时出错', err.message);
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

    /**
     * 应用Prism高亮 (内部方法)
     * @private
     */
    applyPrismHighlight() {
        // 延迟高亮处理，确保DOM已完全加载
        if (window.Prism) {
            setTimeout(() => {
                if (typeof window.Prism.highlightAll === 'function') {
                    try {
                        window.Prism.highlightAll();
                    } catch (e) {
                        logger.warn('Prism全局高亮处理失败', e);
                    }
                }
                
                // 处理标记为等待高亮的代码块
                document.querySelectorAll('.waiting-for-highlight').forEach(block => {
                    const codeElement = block.querySelector('code');
                    if (codeElement && typeof window.Prism.highlightElement === 'function') {
                        try {
                            window.Prism.highlightElement(codeElement);
                            block.classList.remove('waiting-for-highlight');
                            codeElement.classList.remove('no-highlight');
                        } catch (e) {
                            logger.warn('代码块高亮处理失败', e);
                        }
                    }
                });
            }, 200);
        }
    }
}

// 创建并导出单例实例
const prismLoader = new PrismLoader();

// 同时提供命名导出和默认导出，保持与其他加载器一致
export { prismLoader, PrismLoader };
export default prismLoader;