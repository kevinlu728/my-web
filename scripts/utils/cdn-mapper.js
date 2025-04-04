/**
 * @file cdn-mapper.js
 * @description CDN映射工具，负责处理资源URL的生成和管理
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-04-14
 * 
 * 该模块负责CDN资源URL的处理：
 * - 提供CDN映射功能，将资源配置转换为实际URL
 * - 支持多种CDN提供商，包括jsDelivr、CDNJS、UNPKG和本地资源
 * - 支持资源回退机制，当首选CDN失败时自动尝试备用CDN
 * - 处理不同类型的资源URL构建（CSS、JS等）
 */

import logger from './logger.js';

/**
 * CDN映射器类
 */
export class CdnMapper {
    /**
     * 构造函数
     * @param {Object} resourceConfig - 资源配置对象
     */
    constructor(resourceConfig) {
        this.resourceConfig = resourceConfig;
        this.cdnMappings = {};
        
        // 初始化CDN映射
        this.initializeCdnMappings();
    }

    /**
     * 从资源配置初始化CDN映射
     */
    initializeCdnMappings() {
        if (!this.resourceConfig || !this.resourceConfig.resources) {
            logger.warn('⚠️ 资源配置无效，无法初始化CDN映射');
            return;
        }
        
        // 处理样式资源
        if (this.resourceConfig.resources.styles) {
            Object.keys(this.resourceConfig.resources.styles).forEach(styleName => {
                const style = this.resourceConfig.resources.styles[styleName];
                if (style.resourceId) {
                    const urls = this.buildUrlsFromConfig(style);
                    if (urls.length > 0) {
                        this.cdnMappings[style.resourceId] = urls;
                    }
                }
            });
        }
        
        // 处理脚本资源
        if (this.resourceConfig.resources.scripts) {
            Object.keys(this.resourceConfig.resources.scripts).forEach(scriptName => {
                const script = this.resourceConfig.resources.scripts[scriptName];
                if (script.resourceId) {
                    const urls = this.buildUrlsFromConfig(script);
                    if (urls.length > 0) {
                        this.cdnMappings[script.resourceId] = urls;
                    }
                }
            });
        }
    }
    
    /**
     * 从资源配置构建URL列表
     * @param {Object} resource - 资源配置
     * @returns {Array} URL列表
     */
    buildUrlsFromConfig(resource) {
        if (!resource) return [];
        
        return [resource.primary, ...(resource.fallbacks || [])].map(config => {
            if (!config || !config.provider) return '';
            
            return this.buildUrlFromProvider(config);
        }).filter(url => url);
    }
    
    /**
     * 根据提供商配置构建URL
     * @param {Object} config - 提供商配置
     * @returns {string} 构建的URL
     */
    buildUrlFromProvider(config) {
        if (!config || !config.provider) return '';
        
        const cdnProviders = this.resourceConfig.cdnProviders;
        
        if (config.provider === 'jsdelivr') {
            return cdnProviders.jsdelivr.npmTemplate
                .replace('{package}', config.package)
                .replace('{version}', config.version)
                .replace('{path}', config.path);
        } else if (config.provider === 'cdnjs') {
            return cdnProviders.cdnjs.template
                .replace('{library}', config.library)
                .replace('{version}', config.version)
                .replace('{path}', config.path);
        } else if (config.provider === 'unpkg') {
            return cdnProviders.unpkg.template
                .replace('{package}', config.package)
                .replace('{version}', config.version)
                .replace('{path}', config.path);
        } else if (config.provider === 'local') {
            return cdnProviders.local.template
                .replace('{library}', config.library)
                .replace('{path}', config.path);
        }
        
        if (config.component && config.component === 'core') {
            // 这里可能错误地构建了 components 路径
        }
        
        return '';
    }
    
    /**
     * 添加或更新CDN映射
     * @param {string} resourceType - 资源类型
     * @param {string} localFallback - 本地回退路径
     * @param {string} currentUrl - 当前URL
     */
    addOrUpdateMapping(resourceType, localFallback, currentUrl) {
        if (!resourceType) return;
        
        if (!this.cdnMappings[resourceType]) {
            this.cdnMappings[resourceType] = [];
        }
        
        // 添加当前URL（如果有）
        if (currentUrl && !this.cdnMappings[resourceType].includes(currentUrl)) {
            this.cdnMappings[resourceType].unshift(currentUrl);
        }
        
        // 添加本地回退路径（如果有）
        if (localFallback && !this.cdnMappings[resourceType].includes(localFallback)) {
            this.cdnMappings[resourceType].push(localFallback);
        }
    }
    
    /**
     * 从页面中扫描已存在的资源，提取它们的类型和本地回退路径
     */
    scanExistingResources() {
        // 寻找带有data-resource-type属性的资源
        const resourceElements = document.querySelectorAll('[data-resource-type]');
        
        resourceElements.forEach(element => {
            const resourceType = element.getAttribute('data-resource-type');
            const localFallback = element.getAttribute('data-local-fallback');
            
            if (resourceType && localFallback) {
                // 获取当前URL
                const currentUrl = element.href || element.src;
                
                // 更新映射
                this.addOrUpdateMapping(resourceType, localFallback, currentUrl);
            }
        });
    }
    
    /**
     * 获取资源的所有URL
     * @param {string} resourceType - 资源类型
     * @returns {Array} URL列表
     */
    getResourceUrls(resourceType) {
        return this.cdnMappings[resourceType] || [];
    }
    
    /**
     * 获取资源的下一个回退URL
     * @param {string} resourceType - 资源类型
     * @param {string} failedUrl - 失败的URL
     * @returns {string|null} 下一个URL，如果没有则返回null
     */
    getNextFallbackUrl(resourceType, failedUrl) {
        if (!resourceType || !failedUrl) return null;
        
        const urls = this.cdnMappings[resourceType] || [];
        const index = urls.indexOf(failedUrl);
        
        if (index >= 0 && index < urls.length - 1) {
            return urls[index + 1];
        }
        
        return null;
    }
    
    /**
     * 构建组件资源的URL列表
     * @param {Object} component - 组件配置
     * @param {function} getUrlsFunc - 获取URL的函数
     * @returns {Array} URL列表
     */
    buildComponentUrls(component, getUrlsFunc) {
        if (!component || typeof getUrlsFunc !== 'function') return [];
        
        try {
            return getUrlsFunc(component) || [];
        } catch (error) {
            logger.error(`构建组件URL时出错: ${error.message}`);
            return [];
        }
    }
}

export default CdnMapper; 