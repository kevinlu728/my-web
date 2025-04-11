/**
 * @file resources.js
 * @description 集中管理所有外部资源配置和加载策略
 * 未来可能只保留配置信息，把工具函数移动到 resources-utils.js
 * @author 陆凯
 * @version 1.1.0
 * @created 2024-03-25
 * @modified 2024-05-04
 */

// 使用ES模块方式导入logger
import logger from '../utils/logger.js';

// 备用导入方式（如果ES模块导入失败）
// const logger = window.loggerModule || console;

/**
 * 资源版本配置
 * 所有外部库的版本都在这里统一管理
 */
export const versions = {
    // 基本图标样式
    fontAwesome: '6.5.1',
    bootstrap: '5.3.2',
    bootstrapIcons: '1.10.5',

    // 代码高亮
    prism: '1.29.0',
    
    // 数学公式渲染
    katex: '0.16.9',
    mathjax: '3.2.2',
    
    // 表格库
    gridjs: '6.0.6', // Grid.js最新稳定版本

    // 图表和可视化
    chartjs: '4.4.0',
    mermaid: '10.6.1',
    d3: '7.8.5',
    d3Cloud: '1.2.5',
    
    // 特效
    particles: '2.0.0',
    
    // 动画库
    animateCss: '4.1.1',
};

/**
 * CDN配置
 * 定义可用的CDN提供商及其URL模板
 */
export const cdnProviders = {
    jsdelivr: {
        name: 'jsDelivr',
        npmTemplate: 'https://cdn.jsdelivr.net/npm/{library}@{version}/{path}',
        githubTemplate: 'https://cdn.jsdelivr.net/gh/{user}/{repo}@{version}/{path}'
    },
    cdnjs: {
        name: 'CDNJS',
        template: 'https://cdnjs.cloudflare.com/ajax/libs/{library}/{version}/{path}'
    },
    unpkg: {
        name: 'UNPKG',
        template: 'https://unpkg.com/{library}@{version}/{path}'
    },
    local: {
        name: '本地资源',
        template: '/assets/libs/{library}/{path}'
    }
};

/**
 * 注意: 不同CDN提供商对文件路径的组织方式有所不同
 * - jsdelivr/unpkg 通常保留完整的npm包结构，包括dist/目录
 * - cdnjs 通常将主要文件放在根目录，省略dist/前缀
 * 因此，同一资源在不同CDN提供商的路径可能会有所不同，这是预期行为，不是配置错误。
 */

/**
 * 资源加载策略配置
 * 定义不同资源类型使用的加载策略
 */
export const resourceStrategies = {
    // 定义加载策略类型
    types: {
        'local-first': '优先使用本地资源，失败后使用CDN，最后使用备用方案',
        'cdn-first': '优先使用CDN资源，失败后使用本地资源，最后使用备用方案',
        'cdn-only': '只使用CDN资源，失败后使用备用方案，不尝试本地资源',
        'local-only': '只使用本地资源，失败后使用备用方案，不尝试CDN'
    },
    
    // 资源类型到策略的映射
    mapping: {
        'font-awesome': 'local-first',  // Font Awesome优先使用本地资源
        'bootstrap-icons': 'cdn-first', // 优先CDN资源
        'prism': 'cdn-first',
        'katex': 'cdn-first',
        'default': 'cdn-first'  // 默认策略
    },
    
    // 资源优先级定义
    priorities: {
        'font-awesome': 'high',
        'bootstrap-icons': 'high',
        'prism': 'medium',
        'katex': 'medium',
        'default': 'low'
    }
};

/**
 * 资源配置
 * 所有资源使用统一扁平化结构
 */
export const resources = {
    // 样式资源
    styles: {
        'font-awesome': {
            type: 'css',
            priority: 'high',
            group: 'icons',
            source: {
                primary: {
                    provider: 'local',
                    library: 'font-awesome',
                    path: 'all.min.css'
                },
                fallbacks: []
            },
            attributes: {
                id: 'font-awesome-stylesheet',
                'data-resource-type': 'icon-font',
                'data-source': 'local-resource'
            },
            handlers: {
                onLoad: function() {
                    logger.info('✅ 本地Font Awesome资源已通过资源加载器成功加载');
                },
                onError: 'injectFontAwesomeFallbackStyles'
            }
        },
        'bootstrap-icons': {
            type: 'css',
            priority: 'high',
            group: 'icons',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    library: 'bootstrap-icons',
                    version: versions.bootstrapIcons,
                    path: 'font/bootstrap-icons.css'
                },
                fallbacks: [
                    {
                        provider: 'cdnjs',
                        library: 'bootstrap-icons',
                        version: versions.bootstrapIcons,
                        path: 'font/bootstrap-icons.min.css'
                    },
                    {
                        provider: 'local',
                        library: 'bootstrap-icons',
                        path: 'bootstrap-icons.css'
                    }
                ]
            },
            attributes: {
                'data-resource-type': 'bootstrap-icons',
                'data-local-fallback': '/assets/libs/bootstrap-icons/bootstrap-icons.css'
            }
        },
        'prism-theme': {
            type: 'css',
            priority: 'medium',
            group: 'code',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    library: 'prismjs',
                    version: versions.prism,
                    path: 'themes/prism-tomorrow.min.css'
                },
                fallbacks: [
                    {
                        provider: 'cdnjs',
                        library: 'prism',
                        version: versions.prism,
                        path: 'themes/prism-tomorrow.min.css'
                    },
                    {
                        provider: 'local',
                        library: 'prism',
                        path: 'themes/prism-tomorrow.min.css'
                    }
                ]
            },
            attributes: {
                'data-resource-type': 'prism',
                'data-local-fallback': '/assets/libs/prism/themes/prism-tomorrow.min.css'
            }
        },
        'katex-theme': {
            type: 'css',
            priority: 'high',
            group: 'math',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    library: 'katex',
                    version: versions.katex,
                    path: 'dist/katex.min.css' // jsdelivr保留完整的dist目录结构
                },
                fallbacks: [
                    {
                        provider: 'cdnjs',
                        library: 'KaTeX',
                        version: versions.katex,
                        path: 'katex.min.css' // cdnjs通常将文件放在根目录，省略dist前缀
                    }
                ]
            },
            attributes: {
                'data-resource-type': 'katex'
            }
        },
        'gridjs-theme': {
            type: 'css',
            priority: 'medium',
            group: 'table',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    library: 'gridjs',
                    version: versions.gridjs,
                    path: 'dist/theme/mermaid.min.css' // jsdelivr保留完整的dist/theme目录结构
                },
                fallbacks: [
                    {
                        provider: 'cdnjs',
                        library: 'gridjs',
                        version: versions.gridjs,
                        path: 'mermaid.min.css' // cdnjs通常将主题文件放在根目录
                    },
                    {
                        provider: 'local',
                        library: 'gridjs',
                        path: 'theme/mermaid.min.css'
                    }
                ]
            },
            attributes: {
                'data-resource-type': 'table',
                'data-local-fallback': '/assets/libs/gridjs/theme/mermaid.min.css'
            }
        },
    },
    
    // 脚本资源
    scripts: {
        'prism-core': {
            type: 'js',
            priority: 'medium',
            group: 'code',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    library: 'prismjs',
                    version: versions.prism,
                    path: 'prism.min.js'
                },
                fallbacks: [
                    {
                        provider: 'cdnjs',
                        library: 'prism',
                        version: versions.prism,
                        path: 'prism.min.js'
                    },
                    {
                        provider: 'local',
                        library: 'prism',
                        path: 'prism.min.js'
                    }
                ]
            },
            attributes: {
                'data-resource-type': 'prism',
                'data-local-fallback': '/assets/libs/prism/prism.min.js'
            }
        },
        'prism-components': {
            type: 'js',
            priority: 'medium',
            group: 'code',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    library: 'prismjs',
                    version: versions.prism,
                    path: 'components/prism-core.js'
                },
                fallbacks: [
                    {
                        provider: 'cdnjs',
                        library: 'prism',
                        version: versions.prism,
                        path: 'components/prism-core.js'
                    },
                    {
                        provider: 'local',
                        library: 'prism',
                        path: 'components/prism-core.js'
                    }
                ],
                components: [
                    { name: 'markup', path: 'components/prism-markup.min.js' },
                    { name: 'c', path: 'components/prism-c.min.js' },
                    { name: 'cpp', path: 'components/prism-cpp.min.js' },
                    { name: 'java', path: 'components/prism-java.min.js' },
                    { name: 'javascript', path: 'components/prism-javascript.min.js' },
                    { name: 'css', path: 'components/prism-css.min.js' },
                    { name: 'python', path: 'components/prism-python.min.js' }
                ],
                languageDependencies: {
                    'markup': [],  // HTML
                    'c': [],
                    'cpp': ['c'],
                    'java': [],
                    'javascript': [],
                    'typescript': ['javascript'],
                    'jsx': ['markup', 'javascript'],
                    'tsx': ['jsx', 'typescript'],
                    'css': [],
                    'kotlin': [],
                    'dart': [],
                    'swift': [],
                    'python': [],
                    'sql': [],
                    'json': [],
                    'markdown': ['markup'],
                },
                defaultLanguages: ['c', 'cpp', 'java', 'javascript', 'python'],
                attributes: {
                    'data-resource-type': 'prism',
                    'data-local-fallback': '/assets/libs/prism/components/'
                }
            },
            attributes: {
                'data-resource-type': 'prism',
                'data-local-fallback': '/assets/libs/prism/components/'
            }
        },
        'katex-core': {
            type: 'js',
            priority: 'medium',
            group: 'math',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    library: 'katex',
                    version: versions.katex,
                    path: 'dist/katex.min.js' // jsdelivr保留完整的dist目录结构
                },
                fallbacks: [
                    {
                        provider: 'cdnjs',
                        library: 'KaTeX',
                        version: versions.katex,
                        path: 'katex.min.js' // cdnjs通常将文件放在根目录，省略dist前缀
                    }
                ]
            },
            attributes: {
                'data-resource-type': 'katex'
            }
        },
        'katex-auto-render': {
            type: 'js',
            priority: 'low',
            group: 'math',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    library: 'katex',
                    version: versions.katex,
                    path: 'dist/contrib/auto-render.min.js' // jsdelivr保留完整的dist目录结构
                },
                fallbacks: [
                    {
                        provider: 'cdnjs',
                        library: 'KaTeX',
                        version: versions.katex,
                        path: 'contrib/auto-render.min.js' // cdnjs省略dist前缀但保留contrib子目录
                    }
                ]
            },
            attributes: {
                'data-resource-type': 'katex'
            }
        },
        'particles': {
            type: 'js',
            priority: 'medium',
            group: 'animation',
            source: {
                primary: {
                    provider: 'cdnjs',
                    library: 'particles.js',
                    version: versions.particles,
                    path: 'particles.min.js'
                },
                fallbacks: [
                    {
                        provider: 'local',
                        library: 'particles.js',
                        path: 'particles.min.js'
                    }
                ]
            },
            attributes: {
                'data-resource-type': 'animation'
            }
        },
        'gridjs-core': {
            type: 'js',
            priority: 'medium',
            group: 'table',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    library: 'gridjs',
                    version: versions.gridjs,
                    path: 'dist/gridjs.umd.js' // jsdelivr保留完整的dist目录结构
                },
                fallbacks: [
                    {
                        provider: 'cdnjs',
                        library: 'gridjs',
                        version: versions.gridjs,
                        path: 'gridjs.umd.js' // cdnjs通常将文件放在根目录，省略dist前缀
                    },
                    {
                        provider: 'local',
                        library: 'gridjs',
                        path: 'gridjs.umd.js'
                    }
                ]
            },
            attributes: {
                'data-resource-type': 'table',
                'data-local-fallback': '/assets/libs/gridjs/gridjs.umd.js'
            }
        },
    }
};

/**
 * 获取资源URL
 * @param {string} resourceType - 资源类型 ('styles', 'scripts')
 * @param {string} resourceName - 资源名称
 * @param {string} [preferredProvider] - 首选提供商
 * @returns {Object} - 包含primary和fallbacks URL的对象
 */
export function getResourceUrl(resourceType, resourceName, preferredProvider) {
    // 防御性检查
    if (!resourceType || !resourceName) {
        logger.warn('⚠️ 获取资源URL时缺少必要参数');
        return { primary: '', fallbacks: [] };
    }
    
    // 获取资源集合
    const resourcesOfType = resources[resourceType];
    if (!resourcesOfType) {
        logger.warn(`⚠️ 未知的资源类型: ${resourceType}`);
        return { primary: '', fallbacks: [] };
    }
    
    // 获取特定资源
    const resource = resourcesOfType[resourceName];
    if (!resource) {
        logger.warn(`⚠️ 未找到资源: ${resourceType}.${resourceName}`);
        return { primary: '', fallbacks: [] };
    }
    
    const result = {
        primary: '',
        fallbacks: [],
        attributes: resource.attributes || {},
        priority: resource.priority || 'medium',
        group: resource.group || ''
    };
    
    // 处理特定资源逻辑，如组件
    if (resource.getUrls && typeof resource.getUrls === 'function') {
        return resource.getUrls();
    }
    
    // 如果没有source配置，返回空结果
    if (!resource.source || !resource.source.primary) {
        logger.warn(`⚠️ 资源 ${resourceName} 缺少source配置`);
        return result;
    }
    
    // 获取主要配置
    let primaryConfig = resource.source.primary;
    
    // 处理首选提供商
    if (preferredProvider && resource.source.fallbacks && resource.source.fallbacks.length > 0) {
        const preferred = [resource.source.primary, ...resource.source.fallbacks].find(config => 
            config.provider === preferredProvider);
        
        if (preferred) {
            primaryConfig = preferred;
        }
    }
    
    // 构建主URL
    result.primary = buildUrlFromConfig(primaryConfig, resourceType, resourceName);
    
    // 构建备用URL
    if (resource.source.fallbacks && resource.source.fallbacks.length > 0) {
        // 确保不包括已作为主URL的提供商
        const remainingFallbacks = resource.source.fallbacks.filter(config => 
            config.provider !== primaryConfig.provider);
        
        // 构建每个备用URL
        result.fallbacks = remainingFallbacks
            .map(config => buildUrlFromConfig(config, resourceType, resourceName))
            .filter(url => url); // 过滤掉空URL
    }
    
    return result;
}

/**
 * 获取指定优先级的资源
 * @param {string} priority - 资源优先级 ('critical', 'high', 'medium', 'low')
 * @returns {Array} 资源列表和类型
 */
export function getResourcesByPriority(priority) {
    const result = [];
    
    // 遍历所有样式资源
    Object.keys(resources.styles).forEach(name => {
        const resource = resources.styles[name];
        if (resource.priority === priority) {
            result.push({
                type: 'styles',
                name: name,
                resource: getResourceUrl('styles', name)
            });
        }
    });
    
    // 遍历所有脚本资源
    Object.keys(resources.scripts).forEach(name => {
        const resource = resources.scripts[name];
        if (resource.priority === priority) {
            result.push({
                type: 'scripts',
                name: name,
                resource: getResourceUrl('scripts', name)
            });
        }
    });
    
    return result;
}

/**
 * 跟踪资源回退状态
 * 用于记录每个资源已尝试过的CDN提供商
 * @private
 */
const _resourceFallbackStatus = new Map();

/**
 * 获取下一个可用的CDN URL
 * 用于在资源加载失败时尝试备用CDN
 * @param {string} resourceType - 资源类型 ('styles', 'scripts')
 * @param {string} resourceId - 资源ID或名称
 * @returns {string} 下一个可用的CDN URL，如果没有更多备用URL则返回空字符串
 */
export function getNextCdnUrl(resourceType, resourceId) {
    logger.debug(`🔍 尝试获取资源的备用CDN: ${resourceType}.${resourceId}`);
    
    // 构造资源的唯一标识符
    const resourceKey = `${resourceType}:${resourceId}`;
    
    // 获取或初始化回退状态
    if (!_resourceFallbackStatus.has(resourceKey)) {
        // 获取资源完整信息
        const resourceUrls = getResourceUrl(resourceType, resourceId);
        
        if (!resourceUrls || (!resourceUrls.primary && (!resourceUrls.fallbacks || !resourceUrls.fallbacks.length))) {
            logger.warn(`⚠️ 资源 ${resourceId} 无可用回退URL`);
            return '';
        }
        
        // 初始化状态：已尝试的URL集合和当前回退索引
        _resourceFallbackStatus.set(resourceKey, {
            triedUrls: new Set([resourceUrls.primary]), // 记录已尝试过的URL，包括主URL
            currentIndex: 0,
            fallbacks: resourceUrls.fallbacks || []
        });
    }
    
    // 获取当前回退状态
    const status = _resourceFallbackStatus.get(resourceKey);
    
    // 如果没有可用的回退或者已经用完所有回退
    if (!status.fallbacks || status.fallbacks.length === 0 || status.currentIndex >= status.fallbacks.length) {
        logger.warn(`⚠️ 资源 ${resourceId} 的所有CDN回退已用尽`);
        return '';
    }
    
    // 获取下一个回退URL
    const nextUrl = status.fallbacks[status.currentIndex];
    
    // 增加索引，为下次调用做准备
    status.currentIndex++;
    
    // 记录已尝试的URL
    status.triedUrls.add(nextUrl);
    
    logger.info(`🔄 为资源 ${resourceId} 使用备用CDN: ${nextUrl}`);
    return nextUrl;
}

/**
 * 从配置构建URL
 * @private
 * @param {Object} config - URL配置
 * @param {string} resourceType - 资源类型
 * @param {string} resourceName - 资源名称
 * @returns {string} - 构建的URL
 */
export function buildUrlFromConfig(config, resourceType, resourceName) {
    // 防御性检查
    if (!config || !config.provider) {
        logger.warn(`⚠️ 资源 ${resourceType}.${resourceName} URL配置无效`);
        return '';
    }
    
    // 获取提供商配置
    const provider = cdnProviders[config.provider];
    if (!provider) {
        logger.warn(`⚠️ 未知的CDN提供商: ${config.provider}`);
        return '';
    }
    
    try {
        // 处理不同提供商
        switch (config.provider) {
            case 'jsdelivr':
                return provider.npmTemplate
                    .replace('{library}', config.library)
                    .replace('{version}', config.version)
                    .replace('{path}', config.path);
                
            case 'cdnjs':
                return provider.template
                    .replace('{library}', config.library)
                    .replace('{version}', config.version)
                    .replace('{path}', config.path);
                
            case 'unpkg':
                return provider.template
                    .replace('{library}', config.library)
                    .replace('{version}', config.version)
                    .replace('{path}', config.path);
                
            case 'local':
                return provider.template
                    .replace('{library}', config.library)
                    .replace('{path}', config.path);
                
            default:
                logger.warn(`⚠️ 不支持的提供商: ${config.provider}`);
                return '';
        }
    } catch (error) {
        logger.error(`❌ 构建URL时出错 (${resourceType}.${resourceName}):`, error);
        return '';
    }
}

/**
 * 获取资源基本名称
 * @param {string} url - 资源URL
 * @returns {string} - 资源基本名称
 */
export function getResourceBaseName(url) {
    try {
        // 解析URL路径
        const urlPath = new URL(url).pathname;
        // 获取文件名
        const fileName = urlPath.split('/').pop();
        // 移除扩展名和版本号
        return fileName.replace(/\.(min|slim)?\.(js|css)(\?.*)?$/, '');
    } catch (error) {
        // 如果URL解析失败，使用简单方法提取
        const parts = url.split('/');
        return parts[parts.length - 1].split('.')[0];
    }
}

/**
 * 根据URL或资源类型获取资源优先级
 * @param {string} url - 资源URL
 * @param {string} resourceType - 资源类型
 * @returns {string} 资源优先级 ('critical', 'high', 'medium', 'low')
 */
export function getResourcePriorityByUrl(url, resourceType) {
    // 尝试从资源配置中获取优先级
    let priority = null;
    
    try {
        if (resourceType) {
            // 尝试从样式资源中查找优先级
            if (resources.styles) {
                Object.entries(resources.styles).forEach(([name, res]) => {
                    if (res.resourceId === resourceType || name === resourceType) {
                        priority = res.priority;
                    }
                });
            }
            // 尝试从脚本资源中查找优先级
            if (!priority && resources.scripts) {
                Object.entries(resources.scripts).forEach(([name, res]) => {
                    if (res.resourceId === resourceType || name === resourceType) {
                        priority = res.priority;
                    }
                });
            }
        }
        
        // 如果通过resourceType未找到，则通过URL进行启发式判断
        if (!priority) {
            if (url.includes('bootstrap') || url.includes('fontawesome') || resourceType?.includes('bootstrap') || resourceType?.includes('fontawesome')) {
                priority = 'high'; // Bootstrap和FontAwesome通常是高优先级
            } else if (url.includes('katex') || url.includes('math') || resourceType?.includes('katex')) {
                priority = 'medium'; // KaTeX是中等优先级
                logger.debug('📌 检测到KaTeX资源，设置为中等优先级');
            } else {
                priority = 'low'; // 默认为低优先级
            }
        }
    } catch (e) {
        logger.warn('获取资源优先级时出错', e);
        priority = 'medium'; // 出错时默认为中等优先级
    }
    
    return priority;
}

// 导出资源配置
export default {
    versions,
    cdnProviders,
    resources,
    resourceStrategies,
    getResourceUrl,
    getResourcesByPriority,
    getNextCdnUrl,
    buildUrlFromConfig,
    getResourceBaseName,
    getResourcePriorityByUrl
}; 