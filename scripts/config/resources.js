/**
 * @file resources.js
 * @description 集中管理所有外部资源配置和加载策略
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
    // CSS框架和样式
    bootstrap: '5.3.2',
    bootstrapIcons: '1.10.5',
    fontAwesome: '6.5.1',
    
    // 代码高亮
    prism: '1.29.0',
    
    // 数学公式渲染
    katex: '0.16.9',
    mathjax: '3.2.2',
    
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
        npmTemplate: 'https://cdn.jsdelivr.net/npm/{package}@{version}/{path}',
        githubTemplate: 'https://cdn.jsdelivr.net/gh/{user}/{repo}@{version}/{path}'
    },
    cdnjs: {
        name: 'CDNJS',
        template: 'https://cdnjs.cloudflare.com/ajax/libs/{library}/{version}/{path}'
    },
    unpkg: {
        name: 'UNPKG',
        template: 'https://unpkg.com/{package}@{version}/{path}'
    },
    local: {
        name: '本地资源',
        template: '/assets/libs/{library}/{path}'
    }
};

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
        'chartjs': 'cdn-first',
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
        'bootstrap-icons': {
            type: 'css',
            priority: 'high',
            group: 'icons',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    package: 'bootstrap-icons',
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
        'prism-theme': {
            type: 'css',
            priority: 'medium',
            group: 'code',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    package: 'prismjs',
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
                'data-resource-type': 'prism-theme',
                'data-local-fallback': '/assets/libs/prism/themes/prism-tomorrow.min.css'
            }
        },
        'katex': {
            type: 'css',
            priority: 'medium',
            group: 'math',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    package: 'katex',
                    version: versions.katex,
                    path: 'dist/katex.min.css'
                },
                fallbacks: [
                    {
                        provider: 'cdnjs',
                        library: 'KaTeX',
                        version: versions.katex,
                        path: 'katex.min.css'
                    },
                    {
                        provider: 'local',
                        library: 'katex',
                        path: 'katex.min.css'
                    }
                ]
            },
            attributes: {
                'data-resource-type': 'katex',
                'data-local-fallback': '/assets/libs/katex/katex.min.css'
            }
        }
    },
    
    // 脚本资源
    scripts: {
        'prism': {
            type: 'js',
            priority: 'medium',
            group: 'code',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    package: 'prismjs',
                    version: versions.prism,
                    path: 'prism.min.js'
                },
                fallbacks: [
                    {
                        provider: 'cdnjs',
                        package: 'prism',
                        version: versions.prism,
                        path: 'prism.min.js'
                    },
                    {
                        provider: 'local',
                        package: 'prism',
                        path: 'prism.min.js'
                    }
                ]
            },
            attributes: {
                'data-resource-type': 'code-highlight'
            }
        },
        'prism-components': {
            type: 'js',
            priority: 'medium',
            group: 'code',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    package: 'prismjs',
                    version: versions.prism,
                    path: 'components/prism-core.js'
                },
                fallbacks: [
                    {
                        provider: 'cdnjs',
                        package: 'prism',
                        version: versions.prism,
                        path: 'components/prism-core.js'
                    },
                    {
                        provider: 'local',
                        package: 'prism',
                        path: 'components/prism-core.js'
                    }
                ],
                components: [
                    { name: 'markup', path: 'components/prism-markup.min.js' },
                    { name: 'css', path: 'components/prism-css.min.js' },
                    { name: 'javascript', path: 'components/prism-javascript.min.js' },
                    { name: 'c', path: 'components/prism-c.min.js' },
                    { name: 'cpp', path: 'components/prism-cpp.min.js' },
                    { name: 'java', path: 'components/prism-java.min.js' },
                    { name: 'python', path: 'components/prism-python.min.js' }
                ],
                attributes: {
                    'data-resource-type': 'code-highlight-extensions'
                }
            },
            attributes: {
                'data-resource-type': 'code-highlight-extensions'
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
        'katex-core': {
            type: 'js',
            priority: 'medium',
            group: 'math',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    package: 'katex',
                    version: versions.katex,
                    path: 'dist/katex.min.js'
                },
                fallbacks: [
                    {
                        provider: 'cdnjs',
                        package: 'KaTeX',
                        version: versions.katex,
                        path: 'katex.min.js'
                    },
                    {
                        provider: 'local',
                        library: 'katex',
                        path: 'katex.min.js'
                    }
                ]
            },
            attributes: {
                'data-resource-type': 'katex-core'
            }
        },
        'katex-auto-render': {
            type: 'js',
            priority: 'low',
            group: 'math',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    package: 'katex',
                    version: versions.katex,
                    path: 'dist/contrib/auto-render.min.js'
                },
                fallbacks: [
                    {
                        provider: 'cdnjs',
                        package: 'KaTeX',
                        version: versions.katex,
                        path: 'contrib/auto-render.min.js'
                    },
                    {
                        provider: 'local',
                        library: 'katex',
                        path: 'contrib/auto-render.min.js'
                    }
                ]
            },
            attributes: {
                'data-resource-type': 'katex-auto-render'
            }
        },
        'mathjax': {
            type: 'js',
            priority: 'low',
            group: 'math',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    package: 'mathjax',
                    version: versions.mathjax,
                    path: 'es5/tex-mml-chtml.js'
                },
                fallbacks: [
                    {
                        provider: 'cdnjs',
                        library: 'mathjax',
                        version: versions.mathjax,
                        path: 'es5/tex-mml-chtml.js'
                    }
                ]
            },
            attributes: {
                'data-resource-type': 'mathjax'
            }
        },
        'chart': {
            type: 'js',
            priority: 'low',
            group: 'visualization',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    package: 'chart.js',
                    version: versions.chartjs,
                    path: 'dist/chart.umd.min.js'
                },
                fallbacks: [
                    {
                        provider: 'cdnjs',
                        library: 'Chart.js',
                        version: versions.chartjs,
                        path: 'chart.umd.min.js'
                    }
                ]
            },
            attributes: {
                'data-resource-type': 'chart'
            }
        },
        'mermaid': {
            type: 'js',
            priority: 'low',
            group: 'visualization',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    package: 'mermaid',
                    version: versions.mermaid,
                    path: 'dist/mermaid.min.js'
                },
                fallbacks: [
                    {
                        provider: 'cdnjs',
                        library: 'mermaid',
                        version: versions.mermaid,
                        path: 'mermaid.min.js'
                    }
                ]
            },
            attributes: {
                'data-resource-type': 'mermaid'
            }
        },
        'd3': {
            type: 'js',
            priority: 'low',
            group: 'visualization',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    package: 'd3',
                    version: versions.d3,
                    path: 'dist/d3.min.js'
                },
                fallbacks: [
                    {
                        provider: 'cdnjs',
                        library: 'd3',
                        version: versions.d3,
                        path: 'd3.min.js'
                    }
                ]
            },
            attributes: {
                'data-resource-type': 'd3'
            }
        },
        'd3-cloud': {
            type: 'js',
            priority: 'low',
            group: 'visualization',
            source: {
                primary: {
                    provider: 'jsdelivr',
                    package: 'd3-cloud',
                    version: versions.d3Cloud,
                    path: 'build/d3.layout.cloud.min.js'
                },
                fallbacks: [
                    {
                        provider: 'cdnjs',
                        library: 'd3-cloud',
                        version: versions.d3Cloud,
                        path: 'd3.layout.cloud.min.js'
                    }
                ]
            },
            attributes: {
                'data-resource-type': 'd3-cloud'
            }
        }
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
 * 从配置构建URL
 * @private
 * @param {Object} config - URL配置
 * @param {string} resourceType - 资源类型
 * @param {string} resourceName - 资源名称
 * @returns {string} - 构建的URL
 */
function buildUrlFromConfig(config, resourceType, resourceName) {
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
                    .replace('{package}', config.package)
                    .replace('{version}', config.version)
                    .replace('{path}', config.path);
                
            case 'cdnjs':
                return provider.template
                    .replace('{library}', config.library)
                    .replace('{version}', config.version)
                    .replace('{path}', config.path);
                
            case 'unpkg':
                return provider.template
                    .replace('{package}', config.package)
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
 * 获取所有关键资源
 * 这些资源通常需要在页面初始化时预加载
 * @returns {Array} 关键资源列表
 */
export function getCriticalResources() {
    return [
        // 移除不再是关键资源的项目
        getResourceUrl('styles', 'bootstrap-icons'),
        // getResourceUrl('styles', 'katex'),
        // getResourceUrl('styles', 'prism-theme')
    ];
}

/**
 * 获取所有高优先级资源
 * 这些资源在页面加载后应立即加载
 * @returns {Array} 高优先级资源列表
 */
export function getHighPriorityResources() {
    const highPriorityResources = [];
    
    // 遍历所有样式资源
    Object.keys(resources.styles).forEach(name => {
        const resource = resources.styles[name];
        if (resource.priority === 'high') {
            highPriorityResources.push(getResourceUrl('styles', name));
        }
    });
    
    // 遍历所有脚本资源
    Object.keys(resources.scripts).forEach(name => {
        const resource = resources.scripts[name];
        if (resource.priority === 'high') {
            highPriorityResources.push(getResourceUrl('scripts', name));
        }
    });
    
    return highPriorityResources;
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
 * 获取特定组的所有资源
 * @param {string} groupName - 资源组名称
 * @returns {Array} 资源列表
 */
export function getResourcesByGroup(groupName) {
    const result = [];
    
    // 查找样式资源
    Object.keys(resources.styles).forEach(name => {
        const resource = resources.styles[name];
        if (resource.group === groupName) {
            result.push({
                type: 'styles',
                name: name,
                resource: getResourceUrl('styles', name)
            });
        }
    });
    
    // 查找脚本资源
    Object.keys(resources.scripts).forEach(name => {
        const resource = resources.scripts[name];
        if (resource.group === groupName) {
            result.push({
                type: 'scripts',
                name: name,
                resource: getResourceUrl('scripts', name)
            });
        }
    });
    
    return result;
}

// 导出资源配置
export default {
    versions,
    cdnProviders,
    resources,
    resourceStrategies,
    getResourceUrl,
    getCriticalResources,
    getHighPriorityResources,
    getResourcesByPriority,
    getResourcesByGroup
}; 