/**
 * @file resources.js
 * @description 集中管理所有外部资源配置
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-25
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
    particles: '2.0.0'
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
 * 资源映射配置
 * 详细定义每个资源的各种CDN路径和本地路径
 */
export const resources = {
    // 样式资源
    styles: {
        'bootstrap-icons': {
            type: 'css',
            resourceId: 'bootstrap-icons.css',
            priority: 'high',
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
            ],
            attributes: {
                'data-resource-type': 'bootstrap-icons',
                'data-local-fallback': '/assets/libs/bootstrap-icons/bootstrap-icons.css'
            }
        },
        'font-awesome': {
            type: 'css',
            priority: 'critical',
            primary: {
                provider: 'cdnjs',
                library: 'font-awesome',
                version: versions.fontAwesome,
                path: 'css/all.min.css'
            },
            fallbacks: [
                {
                    provider: 'local',
                    library: 'font-awesome',
                    path: 'all.min.css'
                }
            ],
            attributes: {
                'data-resource-type': 'font-awesome',
                'data-local-fallback': '/assets/libs/font-awesome/all.min.css'
            }
        },
        'prism-theme': {
            type: 'css',
            resourceId: 'prism-tomorrow.min.css',
            priority: 'medium',
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
                    path: 'prism-tomorrow.min.css'
                }
            ]
        },
        'katex': {
            type: 'css',
            resourceId: 'katex.min.css',
            priority: 'medium',
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
            ],
            attributes: {
                'data-resource-type': 'katex',
                'data-local-fallback': '/assets/libs/katex/katex.min.css'
            }
        }
    },
    
    // 脚本资源
    scripts: {
        'prism-core': {
            type: 'js',
            priority: 'high',
            primary: {
                provider: 'jsdelivr',
                package: 'prismjs',
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
        'prism-components': {
            type: 'js',
            priority: 'medium',
            components: [
                { name: 'markup', path: 'components/prism-markup.min.js' },
                { name: 'css', path: 'components/prism-css.min.js' },
                { name: 'javascript', path: 'components/prism-javascript.min.js' },
                { name: 'c', path: 'components/prism-c.min.js' },
                { name: 'cpp', path: 'components/prism-cpp.min.js' },
                { name: 'java', path: 'components/prism-java.min.js' },
                { name: 'python', path: 'components/prism-python.min.js' }
            ],
            getUrls: function(component) {
                return [
                    cdnProviders.jsdelivr.npmTemplate
                        .replace('{package}', 'prismjs')
                        .replace('{version}', versions.prism)
                        .replace('{path}', component.path),
                    cdnProviders.cdnjs.template
                        .replace('{library}', 'prism')
                        .replace('{version}', versions.prism)
                        .replace('{path}', component.path),
                    cdnProviders.local.template
                        .replace('{library}', 'prism')
                        .replace('{path}', 'components/' + component.name + '.min.js')
                ];
            }
        },
        'katex-core': {
            type: 'js',
            priority: 'medium',
            primary: {
                provider: 'jsdelivr',
                package: 'katex',
                version: versions.katex,
                path: 'dist/katex.min.js'
            },
            fallbacks: [
                {
                    provider: 'cdnjs',
                    library: 'KaTeX',
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
        'katex-auto-render': {
            type: 'js',
            priority: 'low',
            primary: {
                provider: 'jsdelivr',
                package: 'katex',
                version: versions.katex,
                path: 'dist/contrib/auto-render.min.js'
            },
            fallbacks: [
                {
                    provider: 'cdnjs',
                    library: 'KaTeX',
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
        'mathjax': {
            type: 'js',
            priority: 'low',
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
        'chart': {
            type: 'js',
            priority: 'low',
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
        'mermaid': {
            type: 'js',
            priority: 'low',
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
        'd3': {
            type: 'js',
            priority: 'low',
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
        'd3-cloud': {
            type: 'js',
            priority: 'low',
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
        'particles': {
            type: 'js',
            priority: 'low',
            primary: {
                provider: 'jsdelivr',
                package: 'particles.js',
                version: versions.particles,
                path: 'particles.min.js'
            },
            fallbacks: [
                {
                    provider: 'cdnjs',
                    library: 'particles.js',
                    version: versions.particles,
                    path: 'particles.min.js'
                }
            ]
        }
    }
};

/**
 * 获取资源URL
 * @param {string} resourceType - 资源类型 ('styles' 或 'scripts')
 * @param {string} resourceName - 资源名称
 * @param {string} [preferredProvider] - 首选CDN提供商 (可选)
 * @returns {object} 资源URL对象，包含主URL和备用URL
 */
export function getResourceUrl(resourceType, resourceName, preferredProvider = null) {
    // 获取资源配置
    const resourcesOfType = resources[resourceType];
    if (!resourcesOfType || !resourcesOfType[resourceName]) {
        logger.error(`资源未找到: ${resourceType}.${resourceName}`);
        return null;
    }
    
    const resource = resourcesOfType[resourceName];
    const result = {
        primary: '',
        fallbacks: [],
        attributes: resource.attributes || {},
        resourceId: resource.resourceId || resourceName,
        priority: resource.priority || 'medium'
    };
    
    // 处理特殊资源类型（如Prism组件）
    if (resource.getUrls && typeof resource.getUrls === 'function') {
        return resource;
    }
    
    // 获取主URL
    let primaryConfig = resource.primary;
    
    // 如果指定了首选提供商并且有备用项，则查找匹配的提供商
    if (preferredProvider && resource.fallbacks) {
        const preferred = [resource.primary, ...resource.fallbacks].find(config => 
            config.provider === preferredProvider);
        
        if (preferred) {
            primaryConfig = preferred;
        }
    }
    
    // 构建主URL
    const provider = cdnProviders[primaryConfig.provider];
    
    if (primaryConfig.provider === 'jsdelivr') {
        result.primary = provider.npmTemplate
            .replace('{package}', primaryConfig.package)
            .replace('{version}', primaryConfig.version)
            .replace('{path}', primaryConfig.path);
    } else if (primaryConfig.provider === 'cdnjs') {
        result.primary = provider.template
            .replace('{library}', primaryConfig.library)
            .replace('{version}', primaryConfig.version)
            .replace('{path}', primaryConfig.path);
    } else if (primaryConfig.provider === 'unpkg') {
        result.primary = provider.template
            .replace('{package}', primaryConfig.package)
            .replace('{version}', primaryConfig.version)
            .replace('{path}', primaryConfig.path);
    } else if (primaryConfig.provider === 'local') {
        result.primary = provider.template
            .replace('{library}', primaryConfig.library)
            .replace('{path}', primaryConfig.path);
    }
    
    // 构建备用URL
    if (resource.fallbacks) {
        // 确保不包括已作为主URL的提供商
        const remainingFallbacks = resource.fallbacks.filter(config => 
            config.provider !== primaryConfig.provider);
        
        // 构建每个备用URL
        result.fallbacks = remainingFallbacks.map(fallbackConfig => {
            const fallbackProvider = cdnProviders[fallbackConfig.provider];
            
            if (fallbackConfig.provider === 'jsdelivr') {
                return fallbackProvider.npmTemplate
                    .replace('{package}', fallbackConfig.package)
                    .replace('{version}', fallbackConfig.version)
                    .replace('{path}', fallbackConfig.path);
            } else if (fallbackConfig.provider === 'cdnjs') {
                return fallbackProvider.template
                    .replace('{library}', fallbackConfig.library)
                    .replace('{version}', fallbackConfig.version)
                    .replace('{path}', fallbackConfig.path);
            } else if (fallbackConfig.provider === 'unpkg') {
                return fallbackProvider.template
                    .replace('{package}', fallbackConfig.package)
                    .replace('{version}', fallbackConfig.version)
                    .replace('{path}', fallbackConfig.path);
            } else if (fallbackConfig.provider === 'local') {
                return fallbackProvider.template
                    .replace('{library}', fallbackConfig.library)
                    .replace('{path}', fallbackConfig.path);
            }
            
            return '';
        }).filter(url => url); // 过滤掉空URL
    }
    
    return result;
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

export default {
    versions,
    cdnProviders,
    resources,
    getResourceUrl,
    getCriticalResources,
    getHighPriorityResources,
    getResourcesByPriority
}; 