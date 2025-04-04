/**
 * @file resource-loader.js
 * @description 资源加载器类 - 负责加载和管理各种外部资源并提供统一的回退机制
 * @author 陆凯
 * @version 1.2.0
 * @created 2024-03-22
 * @modified 2024-05-01
 * 
 * 该模块负责优化资源加载:
 * - 提供CSS和JS资源加载的回退机制
 * - 处理CDN资源加载失败的情况
 * - 可选择性地预加载关键资源
 * - 监控资源加载性能
 * 
 * @CDN回退流程
 * -------------
 * 当从CDN加载资源时，系统采用以下回退流程以确保资源可靠加载：
 * 1. 首先尝试从主要CDN源(Primary URL)加载资源
 * 2. 如果主要源加载失败，尝试从备用CDN源(Fallback URLs)加载
 * 3. 如果所有CDN源都失败，最终回退到本地资源(Local URL)
 * 
 * 回退触发条件：
 * - 资源加载超时(通常为5秒)
 * - 资源加载错误(网络错误、404等)
 * - CDN不可用或被屏蔽
 * 
 * @实现规范
 * -------------
 * 回退URL的构建应遵循以下规范：
 * 
 * 1. 配置中必须使用统一的属性名：
 *    - 所有资源配置应使用"package"属性指定包名，避免使用"library"属性
 *    - 确保provider、package和path属性正确配置
 * 
 * 2. 备用URL必须与主URL不同：
 *    - 如果主URL使用jsdelivr，备用URL应优先使用cdnjs
 *    - 如果主URL使用cdnjs，备用URL应优先使用jsdelivr
 *    - 本地资源URL必须始终存在作为最终回退选项
 * 
 * 3. 错误处理：
 *    - 每个加载失败都必须被捕获并记录
 *    - 在所有回退选项都失败后，应给出明确的错误提示
 * 
 * @example
 * // 资源配置示例
 * {
 *   provider: 'jsdelivr',
 *   package: 'prismjs',    // 使用package而非library
 *   version: '1.29.0',
 *   path: 'prism.min.js'
 * }
 * 
 * 重构历史:
 * - 2024-04-14: 将CDN映射逻辑分离到cdn-mapper.js
 * - 2024-05-01: 将资源检查逻辑分离到resource-checker.js
 * - 2024-05-01: 将超时管理逻辑分离到resource-timeout.js
 */

// 导入集中式资源配置
import resourceConfig, { resourceStrategies } from '../config/resources.js';
import { CdnMapper } from './cdn-mapper.js';
import { resourceStyles } from './resource-styles.js';
import { resourceChecker } from './resource-checker.js';
import resourceTimeout from './resource-timeout.js';
import logger from './logger.js';

// 替换为从resources.js导入的策略
const RESOURCE_STRATEGIES = resourceStrategies.mapping;

class ResourceLoader {
    constructor() {
        this.loadedResources = new Set();
        this.failedResources = new Set();
        this.resourceConfig = resourceConfig;
        
        // 创建CDN映射器实例
        this.cdnMapper = new CdnMapper(resourceConfig);
        
        // 配置项：是否启用KaTeX本地资源
        this.katexLocalResourceConfirmed = false;
        
        // 添加防御性检查，确保依赖模块可用
        if (resourceChecker && typeof resourceChecker.updateConfig === 'function') {
        // 更新resourceChecker的配置
        resourceChecker.updateConfig({
            katexLocalResourceConfirmed: this.katexLocalResourceConfirmed
        });
        } else {
            logger.warn('⚠️ 资源检查器未初始化，跳过配置更新');
        }
        
        // 添加防御性检查，确保依赖模块可用
        if (resourceTimeout && typeof resourceTimeout.updateConfig === 'function') {
            // 配置资源超时管理器，使用内联函数而不是绑定方法
        resourceTimeout.updateConfig({
                timeoutCallback: (resourceType, url, priority) => {
                    logger.warn(`⏱️ 资源加载超时: ${url} (${resourceType}, 优先级: ${priority})`);
                    // 如果有必要，可以在这里添加更多的处理逻辑
                }
        });
        } else {
            logger.warn('⚠️ 资源超时管理器未初始化，跳过超时配置');
        }
        
        // 添加防御性检查，确保依赖模块可用
        if (resourceStyles && typeof resourceStyles.setDependencies === 'function') {
        // 设置resourceStyles的依赖
        resourceStyles.setDependencies({
            handleResourceError: this.handleResourceError.bind(this),
            setResourceTimeout: this.setResourceTimeout.bind(this),
            clearResourceTimeout: this.clearResourceTimeout.bind(this)
        });
        } else {
            logger.warn('⚠️ 资源样式处理器未初始化，跳过依赖设置');
        }
        
        // 初始化错误处理和资源扫描
        this.initializeErrorHandling();
        if (this.cdnMapper && typeof this.cdnMapper.scanExistingResources === 'function') {
        this.cdnMapper.scanExistingResources();
        }
        
        // 资源错误处理策略映射
        this.errorHandlers = {
            'font-awesome': () => resourceStyles && resourceStyles.injectFontAwesomeFallbackStyles(),
            'bootstrap-icons': () => resourceStyles && resourceStyles.injectBasicIconStyles(),
            // 保留其他现有错误处理器
        };
        
        // 记录已处理资源的回退状态
        this._resourceFallbackStatus = new Map();
        
        // 添加自动检查
        if (document.readyState === 'loading') {
            this.checkCriticalResources();
        } else {
            // 如果DOMContentLoaded已经触发
            setTimeout(() => this.checkCriticalResources(), 0);
        }
    }
    
    /**
     * 获取资源的加载策略
     * @param {string} resourceType - 资源类型
     * @returns {string} - 加载策略
     */
    getResourceStrategy(resourceType) {
        if (!resourceType) return RESOURCE_STRATEGIES.default;
        
        // 检查特定资源类型
        for (const [type, strategy] of Object.entries(RESOURCE_STRATEGIES)) {
            if (resourceType.includes(type)) return strategy;
        }
        
        // 回退到默认策略
        return RESOURCE_STRATEGIES.default;
    }
    
    /**
     * 检查关键资源
     * 这是一个统一的检查入口，替代原来分散的检查方法
     */
    checkCriticalResources() {
        // 检查Font Awesome
        this.checkFontAwesomeLoading();
        
        // 检查其他关键资源
        // 可以根据需要在这里添加其他资源的检查
    }
    
    /**
     * 初始化全局资源错误处理
     */
    initializeErrorHandling() {
        // 记录已处理的错误URL，避免重复处理
        const processedErrors = new Set();
        
        // 监听资源加载错误
        window.addEventListener('error', (event) => {
            if (event.target && (event.target.tagName === 'LINK' || event.target.tagName === 'SCRIPT')) {
                const url = event.target.href || event.target.src;
                if (url) {
                    // 检查是否已处理过该URL的错误
                    if (processedErrors.has(url)) {
                        logger.debug(`⏭️ 跳过重复处理的错误: ${url}`);
                        return;
                    }
                    
                    // 标记为已处理
                    processedErrors.add(url);
                    
                    // 设置超时清理，防止集合无限增长
                    setTimeout(() => processedErrors.delete(url), 5000);
                    
                    this.handleResourceError(event.target, url);
                }
            }
        }, true);
    }
    
    /**
     * 处理资源加载错误
     * @param {HTMLElement} element - 加载失败的DOM元素
     * @param {string} url - 资源URL
     */
    handleResourceError(element, url) {
        // 基本验证
        if (!element) {
            logger.error('❌ handleResourceError: 无效的元素');
            return;
        }
        
        // 如果元素已从DOM中移除，记录但不进一步处理
        if (!element.parentNode) {
            logger.warn(`⚠️ 资源 ${url} 加载失败，但元素已从DOM中移除`);
            return;
        }
    
        // 检查是否已经处理过这个URL，避免重复处理
        if (this.failedResources.has(url)) {
            logger.debug(`🔄 资源 ${url} 已被标记为失败，跳过重复处理`);
            return;
        }
        
        // 将URL添加到失败资源集合中
        this.failedResources.add(url);
        
        logger.warn(`⚠️ 资源加载失败: ${url}`);
        
        // 获取资源信息
        const resourceType = element.getAttribute('data-resource-type');
        const resourceId = element.getAttribute('data-resource-id') || this.getResourceBaseName(url);
        const localFallback = element.getAttribute('data-local-fallback');
        
        // 获取资源策略
        const strategy = this.getResourceStrategy(resourceType);
        
        // 根据策略和资源类型处理错误
        this.handleResourceByStrategy(element, url, resourceType, resourceId, strategy, localFallback);
    }
    
    /**
     * 根据策略处理资源错误
     * @param {HTMLElement} element - 加载失败的DOM元素
     * @param {string} url - 资源URL
     * @param {string} resourceType - 资源类型
     * @param {string} resourceId - 资源ID
     * @param {string} strategy - 加载策略
     * @param {string} localFallback - 本地回退路径
     */
    handleResourceByStrategy(element, url, resourceType, resourceId, strategy, localFallback) {
        // 构造资源键，用于跟踪回退状态
        const resourceKey = `${resourceType || 'unknown'}-${resourceId}`;
        
        // 获取当前回退状态
        const currentStatus = this._resourceFallbackStatus.get(resourceKey) || {
            tried: new Set([url]), // 记录已尝试的URL
            step: 0 // 回退步骤，0=CDN, 1=本地, 2=备用
        };
        
        // 更新回退状态
        this._resourceFallbackStatus.set(resourceKey, currentStatus);
        
        // 根据策略和当前步骤决定下一步操作
        if (strategy === 'local-first') {
            // 本地优先策略
            if (currentStatus.step === 0) {
                // 本地资源失败，尝试CDN
                currentStatus.step = 1;
                this.tryLoadFromCDN(element, resourceType, resourceId);
            } else if (currentStatus.step === 1) {
                // CDN也失败，使用备用方案
                currentStatus.step = 2;
                this.applyFallbackMethod(element, resourceType, resourceId);
            }
            } else {
            // CDN优先策略
            if (currentStatus.step === 0) {
                // CDN失败，尝试本地资源
                currentStatus.step = 1;
                this.tryLoadFromLocal(element, resourceType, resourceId, localFallback);
            } else if (currentStatus.step === 1) {
                // 本地资源也失败，使用备用方案
                currentStatus.step = 2;
                this.applyFallbackMethod(element, resourceType, resourceId);
            }
        }
    }
    
    /**
     * 尝试从CDN加载资源
     * @param {HTMLElement} element - 原始元素
     * @param {string} resourceType - 资源类型
     * @param {string} resourceId - 资源ID
     */
    tryLoadFromCDN(element, resourceType, resourceId) {
        // 获取下一个CDN URL
        const cdnUrl = this.cdnMapper.getNextCdnUrl(resourceType, resourceId);
        
        if (!cdnUrl) {
            logger.warn(`⚠️ 没有可用的CDN资源: ${resourceType}-${resourceId}`);
            this.applyFallbackMethod(element, resourceType, resourceId);
            return;
        }
        
        logger.info(`🔄 尝试从CDN加载资源: ${cdnUrl}`);
        
        // 创建新元素并替换
        this.replaceResourceElement(element, cdnUrl, resourceType);
    }
    
    /**
     * 尝试从本地加载资源
     * @param {HTMLElement} element - 原始元素
     * @param {string} resourceType - 资源类型
     * @param {string} resourceId - 资源ID
     * @param {string} localFallback - 本地回退URL
     */
    tryLoadFromLocal(element, resourceType, resourceId, localFallback) {
        // 优先使用指定的本地回退路径
        let localUrl = localFallback;
        
        // 如果没有提供本地回退路径，尝试从预定义映射中获取
        if (!localUrl) {
            // 预定义的资源映射
            const localResourceMap = {
                'font-awesome': '/assets/libs/font-awesome/all.min.css',
                'bootstrap-icons': '/assets/libs/bootstrap-icons/bootstrap-icons.css',
                'prism-theme': '/assets/libs/prism/themes/prism-tomorrow.min.css',
                'prism': '/assets/libs/prism/prism.min.js',
                'katex': '/assets/libs/katex/katex.min.css'
            };
            
            localUrl = localResourceMap[resourceType];
        }
        
        if (!localUrl) {
            logger.warn(`⚠️ 没有可用的本地资源: ${resourceType}-${resourceId}`);
            this.applyFallbackMethod(element, resourceType, resourceId);
            return;
        }
        
        logger.info(`🔄 尝试从本地加载资源: ${localUrl}`);
        
        // 创建新元素并替换
        const newElement = this.replaceResourceElement(element, localUrl, resourceType);
        
        // 添加一个成功加载的事件监听器
        if (newElement) {
            newElement.addEventListener('load', () => {
                // 这里应该有成功加载的日志记录
                logger.info(`✅ 成功从本地加载资源: ${localUrl}`);
            });
        }
    }
    
    /**
     * 应用最终的备用方法
     * @param {HTMLElement} element - 原始元素
     * @param {string} resourceType - 资源类型
     * @param {string} resourceId - 资源ID
     */
    applyFallbackMethod(element, resourceType, resourceId) {
        logger.info(`🔄 应用备用方案: ${resourceType}-${resourceId}`);
        
        // 检查是否有特定的错误处理器
        if (resourceType && this.errorHandlers[resourceType]) {
            this.errorHandlers[resourceType]();
            return;
        }
        
        // 特殊资源处理
        if (resourceType === 'font-awesome' || resourceId.includes('font-awesome')) {
            resourceStyles.injectFontAwesomeFallbackStyles();
            document.documentElement.classList.add('no-fontawesome');
        } else if (resourceType === 'bootstrap-icons' || resourceId.includes('bootstrap-icons')) {
            resourceStyles.injectBasicIconStyles();
        } 
        // 可以继续添加其他资源类型的处理...
        
        // 通用处理 - 根据优先级处理
        const priority = element.getAttribute('data-priority') || 'medium';
        this.handleCriticalResourceFailure(resourceId, priority);
    }
    
    /**
     * 创建新的资源元素替换旧元素
     * @param {HTMLElement} oldElement - 旧元素
     * @param {string} localUrl - 本地URL
     * @param {string} resourceType - 资源类型
     * @param {boolean} isLocal - 是否为本地资源
     */
    replaceResourceElement(oldElement, localUrl, resourceType, isLocal = false) {
        // 创建新元素
        const newElement = document.createElement(oldElement.tagName);
        
        // 设置核心属性 - 确保使用原始的localUrl，不要拼接resourceType
        if (oldElement.tagName === 'LINK') {
            newElement.rel = 'stylesheet';
            newElement.href = localUrl; // 直接使用localUrl，不添加任何后缀
        } else {
            newElement.src = localUrl; // 直接使用localUrl，不添加任何后缀
        }
        
        // 复制其他属性
        Array.from(oldElement.attributes).forEach(attr => {
            // 跳过href/src属性，避免覆盖上面设置的值
            if (attr.name !== 'href' && attr.name !== 'src') {
                newElement.setAttribute(attr.name, attr.value);
            }
        });
        
        // 添加或更新data-resource-type属性
        if (resourceType) {
            newElement.setAttribute('data-resource-type', resourceType);
        }
        
        // 标记为本地资源
        if (isLocal) {
            newElement.setAttribute('data-local-resource', 'true');
        }
            
            // 替换元素
        if (oldElement.parentNode) {
            oldElement.parentNode.replaceChild(newElement, oldElement);
            return newElement;
        }
        
        return null;
    }
    
    /**
     * 获取本地资源URL
     * @param {string} resourceType - 资源类型
     * @param {string} resourceId - 资源ID
     * @returns {string|null} - 本地资源URL
     */
    getLocalResourceUrl(resourceType, resourceId) {
        // 预定义的资源映射
        const localResourceMap = {
            'font-awesome': '/assets/libs/font-awesome/all.min.css',
            'bootstrap-icons': '/assets/libs/bootstrap-icons/bootstrap-icons.css',
            'prism-theme': '/assets/libs/prism/themes/prism-tomorrow.min.css',
            'prism': '/assets/libs/prism/prism.min.js',
            'katex': '/assets/libs/katex/katex.min.css'
        };
        
        // 检查资源类型映射
        if (resourceType && localResourceMap[resourceType]) {
            return localResourceMap[resourceType];
        }
        
        // 检查资源ID映射
        for (const [type, url] of Object.entries(localResourceMap)) {
            if (resourceId && resourceId.includes(type)) {
                return url;
            }
        }
        
        // 尝试从资源配置中获取
        // 这里保留原有的获取逻辑
        return null;
    }
    
    /**
     * 检查Font Awesome是否已加载
     */
    checkFontAwesomeLoading() {
        document.addEventListener('DOMContentLoaded', () => {
            // 如果已经有no-fontawesome类，说明已经确认失败并启用了备用图标
            if (document.documentElement.classList.contains('no-fontawesome')) {
                return;
            }
            
            // 使用延迟检查，确保字体有足够时间加载
            setTimeout(() => {
                // 创建测试元素
                const testIcon = document.createElement('i');
                testIcon.className = 'fas fa-check fa-fw';
                testIcon.style.visibility = 'hidden';
                document.body.appendChild(testIcon);
                
                // 获取计算样式
                const style = window.getComputedStyle(testIcon);
                const fontFamily = style.getPropertyValue('font-family');
                const content = style.getPropertyValue('content');
                
                // 清理测试元素
                document.body.removeChild(testIcon);
                
                // 如果不是Font Awesome字体或内容为空，说明加载失败
                if (!fontFamily.includes('Font Awesome') || content === 'none' || content === '') {
                    logger.info('📢 未检测到有效的Font Awesome，加载本地资源');
                    this.loadLocalFontAwesome();
                } else {
                    logger.info('✅ Font Awesome资源已成功加载');
                }
            }, 1000);
        });
    }
    
    /**
     * 获取资源基本名称
     * @param {string} url - 资源URL
     * @returns {string} - 资源基本名称
     */
    getResourceBaseName(url) {
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
     * 处理关键资源加载失败
     * @param {string} resourceName - 资源名称
     * @param {string} priority - 资源优先级，默认为null（自动检测）
     * @param {boolean} silent - 是否静默处理（不显示错误消息）
     */
    handleCriticalResourceFailure(resourceName, priority = null, silent = false) {
        // 检测资源的实际优先级
        let actualPriority = priority;
        if (!actualPriority) {
            actualPriority = this.getResourcePriorityByUrl(resourceName, resourceName);
        }
        
        // 对于已知本地不存在的KaTeX资源，设置为静默处理
        if (resourceName.includes('katex') && !this.katexLocalResourceConfirmed) {
            silent = true;
        }
        
        // 对于常见的基础资源，如果所有回退都失败，使用统一的回退样式文件
        if (!silent) {
            if (resourceName === 'bootstrap-icons.css' || resourceName.includes('fontawesome')) {
                resourceStyles.injectBasicIconStyles();
            } else if (resourceName === 'katex.min.css' || resourceName.includes('katex')) {
                resourceStyles.injectBasicKatexStyles();
            }
        }
        
        // 静默模式下不显示消息
        if (silent) {
            if (actualPriority === 'critical' || actualPriority === 'high') {
                logger.debug(`ℹ️ 静默处理 ${actualPriority} 优先级资源: ${resourceName}`);
            }
            return;
        }
        
        // 根据实际优先级选择适当的消息级别
        if (actualPriority === 'critical') {
            // 只有真正的关键资源才显示错误
            logger.error(`❌ 关键资源加载失败: ${resourceName}`);
        } else if (actualPriority === 'high') {
            logger.warn(`⚠️ 高优先级资源加载失败: ${resourceName}`);
        } else if (actualPriority === 'medium') {
            logger.debug(`ℹ️ 中优先级资源加载失败: ${resourceName}`);
        } else {
            logger.debug(`ℹ️ 低优先级资源加载失败: ${resourceName}`);
        }
    }
    
    /**
     * 根据URL或资源类型获取资源优先级
     * @param {string} url - 资源URL
     * @param {string} resourceType - 资源类型
     * @returns {string} 资源优先级 ('critical', 'high', 'medium', 'low')
     */
    getResourcePriorityByUrl(url, resourceType) {
        // 尝试从资源配置中获取优先级
        let priority = null;
        
        try {
            if (resourceType) {
                // 尝试从样式资源中查找优先级
        if (this.resourceConfig.resources && this.resourceConfig.resources.styles) {
                    Object.entries(this.resourceConfig.resources.styles).forEach(([name, res]) => {
                        if (res.resourceId === resourceType || name === resourceType) {
                            priority = res.priority;
                }
            });
        }
        
                // 尝试从脚本资源中查找优先级
                if (!priority && this.resourceConfig.resources && this.resourceConfig.resources.scripts) {
                    Object.entries(this.resourceConfig.resources.scripts).forEach(([name, res]) => {
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
    
    /**
     * 设置资源超时处理
     * 委托给resourceTimeout模块
     * @param {string} resourceType - 资源类型
     * @param {string} url - 资源URL
     * @param {string} priority - 资源优先级
     * @returns {number} 超时处理器ID
     */
    setResourceTimeout(resourceType, url, priority = 'medium') {
        return resourceTimeout.setResourceTimeout(resourceType, url, priority);
    }
    
    /**
     * 取消资源的超时处理
     * 委托给resourceTimeout模块
     * @param {string} url - 资源URL
     */
    clearResourceTimeout(url) {
        resourceTimeout.clearResourceTimeout(url);
    }

    /**
     * 非阻塞方式加载核心内容所需的资源
     * 这个方法不会阻止页面继续加载
     * @returns {Promise} 加载完成的Promise
     */
    loadNonBlockingCoreContent() {
        logger.debug('🔍 初始化非阻塞核心内容加载...');
        
        // 加载关键样式资源
        const stylesPromises = [];
        
        // 加载自定义字体和图标，不阻塞页面渲染
        stylesPromises.push(
            resourceStyles.loadCssNonBlocking('/assets/libs/bootstrap-icons/bootstrap-icons.css'),
            resourceStyles.loadCssNonBlocking('/assets/libs/prism/themes/prism-tomorrow.min.css')
        );
        
        // 加载关键脚本
        const scriptsPromises = [
            this.loadScript('/assets/libs/prism/prism.min.js', { async: true })
        ];
        
        // 合并所有Promise
        return Promise.all([...stylesPromises, ...scriptsPromises]).then(() => {
            logger.info('✅ 非阻塞核心内容资源加载完成');
            // 设置全局标志，指示内容已解锁
            window.contentUnblocked = true;
            
            // 触发内容解锁事件
            document.dispatchEvent(new Event('content-unblocked'));
            
            return true;
        }).catch(error => {
            logger.error('❌ 核心内容资源加载失败:', error);
            
            // 即使加载失败，也设置全局标志，以便初始化可以继续
            window.contentUnblocked = true;
            document.dispatchEvent(new Event('content-unblocked'));
            
            throw error; // 重新抛出错误以便调用者处理
        });
    }
    
    /**
     * 解除内容加载阻塞
     * 移除阻塞内容显示的CSS和其他限制
     */
    unblockContentLoading() {
        // 移除可能阻塞内容显示的元素或使其淡出
        const placeholders = document.querySelectorAll('.placeholder-content');
        placeholders.forEach(el => {
            // 平滑过渡
            el.style.transition = 'opacity 0.5s ease';
            el.style.opacity = '0';
            
            // 延迟后移除元素
            setTimeout(() => {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 550);
        });
        
        // 添加自定义事件通知页面内容可以显示了
        document.dispatchEvent(new CustomEvent('content-unblocked'));
        
        logger.debug('🎉 内容加载阻塞已解除，页面内容可以显示');
    }
    
    /**
     * 优先加载基本样式并解除内容阻塞
     * 这个方法确保基本样式尽快加载，而页面内容不被阻塞
     */
    prioritizeContentRendering() {
        logger.debug('🚀 优先处理内容渲染...');
        
        // 加载关键的回退样式
        resourceStyles.injectCriticalInlineStyles();
        
        // 立即解除内容阻塞
        setTimeout(() => {
            this.unblockContentLoading();
            // 设置全局标志，通知其他组件内容已解锁
            window.contentUnblocked = true;
        }, 50);
        
        // 加载高优先级资源，但不阻塞渲染
        setTimeout(() => {
            this.loadResourcesByPriority('high')
                .catch(error => logger.warn('加载高优先级资源时出错:', error));
            
            // 然后加载中优先级资源
            setTimeout(() => {
                this.loadResourcesByPriority('medium')
                    .catch(error => logger.warn('加载中优先级资源时出错:', error));
            }, 1000);
        }, 300);
        
        // 延迟加载低优先级资源
        setTimeout(() => {
            this.lazyLoadLowPriorityResources();
        }, 2000);
        
        return true;
    }
    
    /**
     * 初始化页面资源加载策略
     * 按照优先级逐步加载资源
     */
    initResourceLoadingStrategy() {
        if (this.isInitialized) {
            logger.debug('🔍 资源加载策略已初始化，跳过');
            return;
        }
        
        logger.debug('🚀 初始化资源加载策略...');
        this.isInitialized = true;
        
        // 1. 首先优先处理内容渲染，无论资源是否加载完成
        this.prioritizeContentRendering();
        
        // 2. 在DOM加载后（但不阻塞内容显示）继续加载资源
        document.addEventListener('DOMContentLoaded', () => {
            logger.debug('📃 DOM已加载，继续优化资源加载');
            
            // 确保所有关键元素都有资源组标记
            this.ensureResourceGroupMarkers();
            
            // 检查加载失败的资源
            setTimeout(() => {
                this.checkForFailedResources();
            }, 2000);
        });
        
        // 3. 监听页面完全加载事件
        window.addEventListener('load', () => {
            logger.debug('🏁 页面完全加载，设置基于可见性的后续资源加载');
            
            // 如果浏览器支持Intersection Observer，为可见性加载做准备
            if ('IntersectionObserver' in window) {
                this.setupVisibilityBasedLoading();
            }
        });
    }
    
    /**
     * 确保页面中的关键元素都有资源组标记
     * 这样可以根据可见性按需加载资源
     */
    ensureResourceGroupMarkers() {
        logger.debug('🔍 确保页面元素有正确的资源组标记...');
        
        // 确保this上下文可用
        const self = this;
        
        // 为代码块添加标记
        document.querySelectorAll('pre code, .code-block, code[class*="language-"]').forEach(el => {
            const parent = el.closest('pre') || el;
            if (!parent.hasAttribute('data-resource-group')) {
                parent.setAttribute('data-resource-group', 'code');
                logger.debug('📌 为代码块添加资源组标记: code');
            }
        });
        
        // 为数学公式添加标记
        document.querySelectorAll('.math, .formula, .katex').forEach(el => {
            if (!el.hasAttribute('data-resource-group')) {
                el.setAttribute('data-resource-group', 'math');
                logger.debug('📌 为数学公式添加资源组标记: math');
            }
        });
        
        // 为图表添加标记
        document.querySelectorAll('.chart, .chart-container').forEach(el => {
            if (!el.hasAttribute('data-resource-group')) {
                el.setAttribute('data-resource-group', 'chart');
                logger.debug('📌 为图表添加资源组标记: chart');
            }
        });
        
        // 为流程图添加标记
        document.querySelectorAll('.mermaid').forEach(el => {
            if (!el.hasAttribute('data-resource-group')) {
                el.setAttribute('data-resource-group', 'diagram');
                logger.debug('📌 为流程图添加资源组标记: diagram');
            }
        });
        
        // 为标签云添加标记
        document.querySelectorAll('.tag-cloud').forEach(el => {
            if (!el.hasAttribute('data-resource-group')) {
                el.setAttribute('data-resource-group', 'tagcloud');
                logger.debug('📌 为标签云添加资源组标记: tagcloud');
            }
        });
        
        // 确保body具有动画资源组标记
        if (!document.body.hasAttribute('data-resource-group')) {
            document.body.setAttribute('data-resource-group', 'animation');
            logger.debug('📌 为body添加资源组标记: animation');
        }
        
        // 为文章容器添加核心资源组标记
        const articleContainer = document.getElementById('article-container');
        if (articleContainer && !articleContainer.hasAttribute('data-resource-group')) {
            articleContainer.setAttribute('data-resource-group', 'core');
            logger.debug('📌 为文章容器添加资源组标记: core');
        }
        
        logger.debug('✅ 资源组标记完成');
    }
    
    /**
     * 设置基于可见性的资源加载
     * 当特定元素进入视口时加载相关资源
     */
    setupVisibilityBasedLoading() {
        // 先确保所有元素都有正确的资源组标记
        this.ensureResourceGroupMarkers();
        
        // 正确保存this引用
        const self = this;
        
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const resourceGroup = element.getAttribute('data-resource-group');
                    
                    if (resourceGroup) {
                        logger.info(`📋 懒加载资源组: ${resourceGroup}`);
                        
                        // 现在self正确引用ResourceLoader实例
                        self.loadResourceGroup(resourceGroup).then(() => {
                            logger.debug(`✅ 资源组 "${resourceGroup}" 已加载`);
                            
                            // 资源加载后初始化
                            if (resourceGroup === 'code' && window.Prism) {
                                window.Prism.highlightElement(element);
                            }
                            
                            observer.unobserve(element);
                        });
                    }
                }
            });
        }, {
            root: null,
            rootMargin: '100px',
            threshold: 0.1
        });
        
        document.querySelectorAll('[data-resource-group]').forEach(element => {
                observer.observe(element);
        });
        
        this.lazyLoadObserver = observer;
    }
    
    /**
     * 检查加载失败的资源
     * 这是一个额外的安全措施，检查任何可能的资源加载失败
     */
    checkForFailedResources() {
        logger.debug('🔍 检查资源加载状态...');
        
        // 确保this上下文可用
        const self = this;
        
        // 检查样式表
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            
            // 检查样式表是否加载成功
            let loaded = false;
            try {
                // 尝试访问样式表规则，如果加载失败会抛出错误
                Array.from(document.styleSheets).forEach(sheet => {
                    if (sheet.href === link.href) {
                        try {
                            // 尝试读取规则以确认加载成功
                            const rules = sheet.cssRules;
                            loaded = true;
                        } catch (e) {
                            // 对于跨域样式表，无法读取规则，但这不意味着加载失败
                            if (e.name === 'SecurityError') {
                                loaded = true; // 假设跨域样式表已加载
                            }
                        }
                    }
                });
            } catch (e) {
                logger.warn(`检查样式表加载状态时出错:`, e);
            }
            
            if (!loaded && !self.failedResources.has(href)) {
                logger.warn(`检测到可能失败的样式表: ${href}`);
                self.handleResourceError(link, href);
            }
        });
        
        // 检查脚本
        const scripts = document.querySelectorAll('script[src]');
        scripts.forEach(script => {
            const src = script.getAttribute('src');
            if (!src) return;
            
            // 目前没有可靠的方法检查脚本是否真正加载成功
            // 我们依赖onerror事件处理失败的脚本
        });
        
        logger.debug('🔍 资源加载状态检查完成');
    }
    
    /**
     * 根据资源名称获取所有可能的URL
     * @param {string} resourceType - 资源类型 ('styles' 或 'scripts')
     * @param {string} resourceName - 资源名称
     * @returns {object} - 包含主URL和备用URL的对象
     */
    getResourceUrls(resourceType, resourceName) {
        return this.resourceConfig.getResourceUrl(resourceType, resourceName);
    }
    
    /**
     * 加载指定资源
     * @param {string} resourceType - 资源类型 ('styles' 或 'scripts')
     * @param {string} resourceName - 资源名称
     * @param {object} options - 加载选项
     * @returns {Promise} 加载完成的Promise
     */
    loadResource(resourceType, resourceName, options = {}) {
        // 检查参数有效性
        if (!resourceType || !resourceName) {
            logger.warn(`⚠️ 无效的资源请求: 类型=${resourceType}, 名称=${resourceName}`);
            return Promise.resolve(); // 返回已解决的Promise，避免中断链
        }
        
        const resource = this.getResourceUrls(resourceType, resourceName);
        if (!resource) {
            logger.warn(`⚠️ 无效的资源请求: 类型=${resourceType}, 名称=${resourceName}`);
            return Promise.resolve(); // 返回已解决的Promise，避免中断链
        }
        
        // 处理特殊情况：resource.components数组和getUrls方法（例如prism-components）
        if (resource.components && typeof resource.getUrls === 'function') {
            logger.debug(`📦 加载组件集合: ${resourceName} (${resource.components.length}个组件)`);
            
            // 为每个组件创建加载Promise
            const componentPromises = resource.components.map(component => {
                // 使用CdnMapper构建组件URL
                const urls = this.cdnMapper.buildComponentUrls(component, resource.getUrls);
                if (!urls || urls.length === 0) {
                    logger.warn(`⚠️ 组件 ${component.name} 没有可用的URL`);
                    return Promise.resolve();
                }
                
                // 尝试加载第一个URL，如果失败则降级到后续URL
                return this.loadComponentWithFallback(urls, resource.type, component.name);
            });
            
            // 等待所有组件加载完成
            return Promise.all(componentPromises);
        }
        
        // 处理resource.primary是字符串的情况
        if (typeof resource.primary === 'string') {
            // 检查资源是否已经加载
            if (this.loadedResources.has(resource.primary)) {
                logger.debug(`🔍 资源已加载: ${resource.primary}`);
                return Promise.resolve();
            }
            
            // 检查资源是否已经失败
            if (this.failedResources.has(resource.primary)) {
                logger.warn(`⚠️ 资源加载失败: ${resource.primary}`);
                return Promise.resolve();
            }
            
            if (resource.primary.endsWith('.css')) {
                return resourceStyles.loadCss(resource.primary, resource);
            } else if (resource.primary.endsWith('.js')) {
                return this.loadScript(resource.primary, resource);
            }
        }
        // 处理resource.primary是对象的情况
        else if (typeof resource.primary === 'object' && resource.primary) {
            // 使用CdnMapper构建URL
            const url = this.cdnMapper.buildUrlFromProvider(resource.primary);
            
            if (url) {
                // 检查资源是否已经加载
                if (this.loadedResources.has(url)) {
                    logger.debug(`🔍 资源已加载: ${url}`);
                    return Promise.resolve();
                }
                
                // 检查资源是否已经失败
                if (this.failedResources.has(url)) {
                    logger.warn(`⚠️ 资源加载失败: ${url}`);
                    return Promise.resolve();
                }
                
                if (resource.type === 'css' || url.endsWith('.css')) {
                    return resourceStyles.loadCss(url, resource);
                } else if (resource.type === 'js' || url.endsWith('.js')) {
                    return this.loadScript(url, resource);
                }
            }
        }
        
        logger.warn('⚠️ 无效的资源 primary URL:', resource);
        return Promise.resolve(); // 返回已解决的Promise，避免中断链
    }
    
    /**
     * 递归加载组件及其回退资源
     * @param {Array} urls - 要尝试加载的URL列表
     * @param {string} type - 资源类型 ('css' 或 'js')
     * @param {string} componentName - 组件名称(用于日志)
     * @returns {Promise} 加载完成的Promise
     */
    loadComponentWithFallback(urls, type, componentName) {
        if (!urls || urls.length === 0) {
            return Promise.resolve();
        }
        
        // 使用第一个URL
        const url = urls[0];
        
        // 如果已经加载过这个URL，直接返回
        if (this.loadedResources.has(url)) {
            return Promise.resolve();
        }
        
        // 根据类型选择加载方法
        const loadPromise = type === 'css' ? 
            resourceStyles.loadCss(url, { priority: 'medium' }) : 
            this.loadScript(url, { priority: 'medium' });
        
        // 如果当前URL加载失败，尝试下一个URL
        return loadPromise.catch(() => {
            logger.debug(`⚠️ 组件 ${componentName} 加载失败，尝试下一个URL`);
            if (urls.length > 1) {
                // 递归尝试剩余的URL
                return this.loadComponentWithFallback(urls.slice(1), type, componentName);
            }
            return Promise.resolve(); // 所有URL都失败，但不阻断流程
        });
    }
    
    /**
     * 加载脚本
     * @param {string} url - 脚本URL
     * @param {Object} options - 配置选项
     */
    loadScript(url, options = {}) {
        // 如果只加载一次且已加载过，则直接返回成功
        if (options.once && this.loadedResources.has(url)) {
            logger.debug(`⏭️ 脚本 ${url} 已加载，跳过`);
            return Promise.resolve(true);
        }
        
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = url;
            
            // 设置脚本属性
            if (options.async) script.async = true;
            if (options.defer) script.defer = true;
            
            // 确保即使加载失败也会有本地回退路径
            if (options.attributes) {
                // 如果是Prism相关文件，确保有data-local-fallback属性
                if (url.includes('prism') && !options.attributes['data-local-fallback']) {
                    // 尝试构建一个本地回退路径
                    let localPath = url;
                    
                    // 如果是外部URL，尝试转换为本地路径
                    if (url.startsWith('http')) {
                        const fileName = url.split('/').pop();
                        if (url.includes('components')) {
                            localPath = `/assets/libs/prism/components/${fileName}`;
                        } else {
                            localPath = `/assets/libs/prism/${fileName}`;
                        }
                    }
                    
                    options.attributes['data-local-fallback'] = localPath;
                }
                
                // 设置其他自定义属性
                Object.entries(options.attributes).forEach(([key, value]) => {
                    script.setAttribute(key, value);
                });
            }
            
            // 设置加载和错误处理
            script.onload = () => {
                this.loadedResources.add(url);
                resolve(true);
            };
            
            script.onerror = () => {
                logger.warn(`❌ 脚本加载失败: ${url}`);
                // 错误处理由全局错误处理器处理
                resolve(false);
            };
            
            // 添加到文档中
            document.head.appendChild(script);
        });
    }

    loadResourceGroups(resourceGroups) {
        logger.debug(`🧩 开始加载资源组: ${resourceGroups.join(', ')}`);
        
        // 递归加载资源组
        const loadNext = (index) => {
            // 如果所有资源组都已加载，返回
            if (index >= resourceGroups.length) {
                return Promise.resolve();
            }
            
            // 获取当前资源组
            const group = resourceGroups[index];
            
            // 加载资源组，完成后递归加载下一个
            return this.loadResourceGroup(group)
                .then(() => loadNext(index + 1))
                .catch(error => {
                    logger.error(`❌ 加载资源组 "${group}" 时出错:`, error);
                    return loadNext(index + 1); // 继续加载下一个，不中断整个过程
                });
        };
        
        // 开始加载第一个资源组
        return loadNext(0);
    }

    /**
     * 检查当前页面是否为首页
     * @returns {boolean} 是否为首页
     */
    isHomePage() {
        // 检查URL路径判断是否为首页
        const path = window.location.pathname;
        return path === '/' || path === '/index.html' || path.endsWith('/home');
    }

    /**
     * 处理样式资源加载错误
     * @param {HTMLElement} element - 加载失败的元素
     * @param {string} url - 资源URL
     */
    handleStyleResourceError(element, url) {
        logger.warn(`❌ 样式资源加载失败: ${url}`);
        
        // 获取资源类型
        const resourceType = element.getAttribute('data-resource-type');
        
        // 处理不同类型的样式资源错误
        if (resourceType === 'icon-font') {
            logger.info('应用图标字体的回退样式');
            // 使用回退机制
            resourceStyles.injectFontAwesomeFallbackStyles();
        } else if (resourceType === 'math') {
            // 处理数学公式样式失败
            resourceStyles.injectBasicKatexStyles();
        } else {
            // 通用样式回退
            resourceStyles.injectCriticalInlineStyles();
        }
        
        // 移除失败的元素
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }

    /**
     * 加载本地Font Awesome资源
     */
    loadLocalFontAwesome() {
        // 检查是否已经存在
        if (document.getElementById('local-font-awesome')) {
            logger.debug('本地Font Awesome已存在，不重复加载');
            return;
        }
        
        logger.info('🔄 加载本地Font Awesome资源');
        
        // 移除任何可能存在的其他Font Awesome链接
        const existingLinks = document.querySelectorAll('link[href*="font-awesome"]:not([data-source="local-resource"])');
        if (existingLinks.length > 0) {
            logger.debug(`移除${existingLinks.length}个非本地Font Awesome资源`);
            existingLinks.forEach(link => {
                if (link.parentNode) link.parentNode.removeChild(link);
            });
        }
        
        // 创建新的链接元素指向本地资源
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/assets/libs/font-awesome/all.min.css';
        link.id = 'local-font-awesome';
        link.setAttribute('data-source', 'local-resource');
        
        // 添加加载和错误事件处理
        link.onload = () => logger.info('✅ 本地Font Awesome资源加载成功');
        link.onerror = () => {
            logger.error('🚨 本地Font Awesome资源加载失败，应用SVG备用方案');
            resourceStyles.injectFontAwesomeFallbackStyles();
        };
        
        // 添加到文档头部
        document.head.appendChild(link);
    }

    /**
     * 加载代码高亮相关资源
     * @returns {Promise} - 加载完成的Promise
     */
    loadCodeHighlightResources() {
        logger.info('📝 加载代码高亮资源');
        
        // 尝试从资源配置中获取Prism资源信息
        let prismConfig;
        let prismThemeConfig;
        
        try {
            prismConfig = this.resourceConfig.resources.scripts['prism'];
            prismThemeConfig = this.resourceConfig.resources.styles['prism-theme'];
            
            if (!prismConfig) {
                logger.warn('⚠️ 未在资源配置中找到prism配置，将使用默认值');
            }
        } catch (error) {
            logger.warn('⚠️ 获取Prism资源配置失败，将使用默认值', error);
        }
        
        // 检查是否已加载，与其他资源加载函数保持一致的风格
        if (window.prismLoaded && window.Prism) {
            logger.debug('✓ Prism已加载，仅确保样式加载完成');
            return this.loadPrismTheme(prismThemeConfig)
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
                return this._loadPrismCore(prismConfig);
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
                if (prismConfig && prismConfig.source && prismConfig.source.components) {
                    languages = prismConfig.source.components.map(comp => comp.name);
                    logger.debug(`✓ 从配置获取语言组件列表: ${languages.join(', ')}`);
                }
                
                logger.debug('✓ Prism核心库加载成功，加载语言组件');
                // 并行加载语言组件和主题
                return Promise.all([
                    this.loadPrismLanguageComponents(languages, prismConfig),
                    this.loadPrismTheme(prismThemeConfig)
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
                logger.error('❌ 代码高亮资源加载失败', error);
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
                    this.loadPrismTheme(themeConfig)
                        .then(() => {
                            this.applyPrismHighlight();
                            resolve(true);
                        })
                        .catch(() => {
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
     * @param {Object} config - Prism核心配置
     * @returns {Promise} - 加载完成的Promise
     */
    _loadPrismCore(config) {
        return new Promise(resolve => {
            try {
                // 如果有配置，从配置获取URL，否则使用默认URL
                let primaryUrl, fallbackUrls = [], localUrl;
                const version = this.resourceConfig?.versions?.prism || '1.29.0';
                
                // 第1步：首先尝试从配置获取主URL
                if (config && config.source) {
                    try {
                        const urlResult = this.resourceConfig.getResourceUrl('scripts', 'prism');
                        
                        if (typeof urlResult === 'string') {
                            primaryUrl = urlResult;
                        } else if (urlResult && typeof urlResult.primary === 'string') {
                            primaryUrl = urlResult.primary;
                        } else {
                            logger.warn('⚠️ 无法从配置获取有效的Prism URL');
                            primaryUrl = null;
                        }
                        
                        // 第2步：尝试获取不同于主URL的备用URL
                        if (config.source.fallbacks && Array.isArray(config.source.fallbacks)) {
                            for (let i = 0; i < config.source.fallbacks.length; i++) {
                                const fbConfig = config.source.fallbacks[i];
                                try {
                                    if (!fbConfig || typeof fbConfig !== 'object') {
                                        continue;
                                    }
                                    
                                    let fallbackUrl;
                                    
                                    // 尝试获取fallback URL
                                    if (typeof this.resourceConfig.getResourceUrl === 'function' && fbConfig.provider) {
                                        fallbackUrl = this.resourceConfig.getResourceUrl(
                                            'scripts', 'prism', fbConfig.provider
                                        );
                                    } else if (typeof this.resourceConfig.buildUrlFromConfig === 'function') {
                                        fallbackUrl = this.resourceConfig.buildUrlFromConfig(
                                            fbConfig, 'scripts', 'prism'
                                        );
                                    }
                                    
                                    // 只添加有效的且与主URL不同的备用URL
                                    if (typeof fallbackUrl === 'string' && fallbackUrl && fallbackUrl !== primaryUrl) {
                                        fallbackUrls.push(fallbackUrl);
                                    }
                                } catch (e) {
                                    logger.warn(`构建Prism fallback URL #${i}失败`, e);
                                }
                            }
                        }
                    } catch (e) {
                        logger.warn('构建Prism URL失败，使用默认值', e);
                        primaryUrl = null;
                        fallbackUrls = [];
                    }
                }
                
                // 第3步：如果未能获取主URL或本地URL，使用默认值
                if (!primaryUrl) {
                    primaryUrl = `https://cdn.jsdelivr.net/npm/prismjs@${version}/prism.min.js`;
                }
                
                // 确保有备用URL
                if (!fallbackUrls.length) {
                    fallbackUrls.push(`https://cdnjs.cloudflare.com/ajax/libs/prism/${version}/prism.min.js`);
                }
                
                // 始终设置本地URL作为最终回退
                localUrl = '/assets/libs/prism/prism.min.js';
                
                // 创建和添加脚本元素
                const prismScript = document.createElement('script');
                prismScript.src = primaryUrl;
                
                // 设置一个标志用于跟踪Prism是否加载成功
                window.prismCoreInitialized = false;
                
                // 检查函数 - 确认Prism是否正确初始化
                const checkPrismInitialized = () => {
                    if (window.Prism && typeof window.Prism.highlightAll === 'function') {
                        window.prismCoreInitialized = true;
                        return true;
                    }
                    return false;
                };
                
                prismScript.onload = () => {
                    // 确认Prism是否真正加载并初始化
                    if (checkPrismInitialized()) {
                        logger.debug(`✓ Prism核心库加载成功 (从 ${prismScript.src})`);
                        resolve(true);
                    } else {
                        // 虽然脚本加载了，但Prism对象未正确初始化
                        logger.warn(`⚠️ Prism脚本加载但未正确初始化 (从 ${prismScript.src})`);
                        
                        // 尝试本地资源作为可靠回退
                        prismScript.src = localUrl;
                        
                        prismScript.onload = () => {
                            if (checkPrismInitialized()) {
                                logger.debug(`✓ Prism核心库从本地加载成功`);
                                resolve(true);
                            } else {
                                logger.error('❌ Prism本地资源未能初始化核心功能');
                                resolve(false);
                            }
                        };
                        
                        prismScript.onerror = () => {
                            logger.error('❌ Prism本地资源加载失败');
                            resolve(false);
                        };
                    }
                };
                
                // 处理错误 - 尝试备用URL
                prismScript.onerror = () => {
                    logger.warn(`⚠️ Prism核心库加载失败，尝试备用源`);
                    
                    // 如果有备用URL，尝试加载
                    if (fallbackUrls.length > 0) {
                        const nextUrl = fallbackUrls.shift();
                        prismScript.src = nextUrl;
                        
                        prismScript.onerror = () => {
                            logger.warn(`⚠️ Prism备用源加载失败，尝试本地资源`);
                            prismScript.src = localUrl;
                            
                            prismScript.onerror = () => {
                                logger.error('❌ Prism所有加载尝试均失败');
                                resolve(false);
                            };
                        };
                    } else {
                        // 如果没有备用URL，直接尝试本地资源
                        logger.warn('⚠️ 无Prism备用URL, 尝试本地资源');
                        prismScript.src = localUrl;
                        
                        prismScript.onerror = () => {
                            logger.error('❌ Prism所有加载尝试均失败');
                            resolve(false);
                        };
                    }
                };
                
                document.head.appendChild(prismScript);
                
                // 添加超时保护
                setTimeout(() => {
                    if (!window.prismCoreInitialized) {
                        logger.warn('⏱️ Prism核心加载超时，尝试本地资源');
                        
                        // 移除之前的脚本元素
                        if (prismScript.parentNode) {
                            prismScript.parentNode.removeChild(prismScript);
                        }
                        
                        // 创建新的脚本元素，直接使用本地资源
                        const localScript = document.createElement('script');
                        localScript.src = localUrl;
                        
                        localScript.onload = () => {
                            if (checkPrismInitialized()) {
                                logger.debug(`✓ Prism核心库从本地超时回退加载成功`);
                                resolve(true);
                            } else {
                                logger.error('❌ Prism本地资源加载成功但初始化失败');
                                resolve(false);
                            }
                        };
                        
                        localScript.onerror = () => {
                            logger.error('❌ Prism本地资源加载失败');
                            resolve(false);
                        };
                        
                        document.head.appendChild(localScript);
                    }
                }, 5000);
            } catch (error) {
                logger.error('❌ 加载Prism时出错', error);
                resolve(false);
            }
        });
    }

    /**
     * 加载Prism语言组件
     * @param {Array<string>} languages - 要加载的语言列表
     * @param {Object} config - 配置对象
     * @returns {Promise} - 加载完成的Promise
     */
    loadPrismLanguageComponents(languages, config) {
        // 确保languages是有效数组
        if (!languages || !Array.isArray(languages) || languages.length === 0) {
            logger.debug('没有指定要加载的Prism语言组件');
            return Promise.resolve(true);
        }
        
        // 记录初始请求的语言数量
        const originalCount = languages.length;
        logger.debug(`准备加载${originalCount}个Prism语言组件: ${languages.join(', ')}`);
        
        // 确保语言数组有效
        const validLanguages = languages.filter(lang => typeof lang === 'string' && lang.trim());
        if (validLanguages.length === 0) {
            logger.warn('没有有效的Prism语言组件');
            return Promise.resolve(true);
        }
        
        // 处理语言依赖关系
        const allLanguages = [...validLanguages];
        // 跟踪组件的处理状态
        const processedComponents = new Map();
        
        // 依赖关系映射 - 为确保组件按正确顺序加载
        const dependencyMap = {
            'cpp': ['c'],           // C++依赖于C
            'java-extras': ['java'],
            'php-extras': ['php'],
            'jsx': ['javascript'],
            'tsx': ['jsx', 'typescript'],
            'scala': ['java']
        };
        
        // 添加所有依赖语言并记录状态
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
                
                // 使用本地路径
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
                logger.error('加载Prism语言组件时出错', err);
                return false;
            });
    }

    /**
     * 加载Prism语法高亮主题
     * @param {Object} themeConfig - 主题配置
     * @returns {Promise} - 加载完成的Promise
     */
    loadPrismTheme(themeConfig) {
        // 添加主题加载状态跟踪，避免重复加载
        if (window.prismThemeLoaded === true) {
            logger.debug('Prism主题已加载，跳过');
            return Promise.resolve(true);
        }

        // 标记正在加载中
        if (window.prismThemeLoading !== true) {
            window.prismThemeLoading = true;
        } else {
            logger.debug('Prism主题正在加载中，等待完成');
            return new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (window.prismThemeLoaded === true) {
                        clearInterval(checkInterval);
                        resolve(true);
                    }
                }, 100);
                
                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve(false);
                }, 5000);
            });
        }

        try {
            let themeUrl, fallbackUrls = [], localUrl;
            
            // 如果有主题配置，从配置获取URL
            if (themeConfig && themeConfig.source) {
                try {
                    // 从配置获取主URL
                    const urlResult = this.resourceConfig.getResourceUrl('styles', 'prism-theme');
                    
                    // 确保URL是字符串
                    if (typeof urlResult === 'string') {
                        themeUrl = urlResult;
                    } else if (urlResult && typeof urlResult.primary === 'string') {
                        themeUrl = urlResult.primary;
                        
                        if (Array.isArray(urlResult.fallbacks)) {
                            fallbackUrls = urlResult.fallbacks.filter(url => typeof url === 'string');
                        }
                    } else {
                        logger.warn('⚠️ 无法从配置获取有效的Prism主题URL');
                        themeUrl = null;
                    }
                    
                    // 获取本地URL
                    if (themeConfig.attributes && themeConfig.attributes['data-local-fallback']) {
                        localUrl = themeConfig.attributes['data-local-fallback'];
                    }
                    
                    if (themeUrl) {
                        logger.debug(`使用配置的Prism主题: ${themeUrl}`);
                    }
                } catch (e) {
                    logger.warn('从配置构建Prism主题URL失败，使用默认值', e);
                    themeUrl = null;
                }
            }
            
            // 如果无法从配置获取URL，使用默认值
            if (!themeUrl) {
                const version = this.resourceConfig.versions?.prism || '1.29.0';
                themeUrl = `https://cdn.jsdelivr.net/npm/prismjs@${version}/themes/prism-tomorrow.min.css`;
                fallbackUrls = [
                    `https://cdnjs.cloudflare.com/ajax/libs/prism/${version}/themes/prism-tomorrow.min.css`
                ];
                localUrl = `/assets/libs/prism/themes/prism-tomorrow.min.css`;
                logger.debug(`使用默认Prism主题URL: ${themeUrl}`);
            }
            
            // 构建选项对象
            const options = {};
            if (fallbackUrls && fallbackUrls.length > 0) {
                options.fallbacks = fallbackUrls;
            }
            if (localUrl) {
                options.localFallback = localUrl;
            }
            
            // 关键修复：确保返回Promise
            const loadPromise = resourceStyles.loadCssNonBlocking(themeUrl, options);
            
            // 如果loadCssNonBlocking没有返回Promise，创建一个新的Promise
            if (!loadPromise || typeof loadPromise.then !== 'function') {
                logger.debug('loadCssNonBlocking未返回Promise，创建新Promise');
                
                // 设置状态标记
                window.prismThemeLoaded = true;
                window.prismThemeLoading = false;
                
                return Promise.resolve(true);
            }
            
            // 正常处理Promise
            return loadPromise
                .then(result => {
                    window.prismThemeLoaded = true;
                    window.prismThemeLoading = false;
                    return result;
                })
                .catch(error => {
                    logger.error('❌ Prism主题加载失败', error);
                    window.prismThemeLoaded = false;
                    window.prismThemeLoading = false;
                    return false;
                });
        } catch (error) {
            logger.error('❌ 加载Prism主题时发生错误:', error);
            window.prismThemeLoaded = false;
            window.prismThemeLoading = false;
            return Promise.resolve(false);
        }
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

    /**
     * 处理资源加载超时
     * @param {string} resourceType - 资源类型
     * @param {string} url - 资源URL
     * @param {string} priority - 资源优先级
     */
    handleResourceTimeout(resourceType, url, priority) {
        logger.warn(`⏱️ 资源加载超时: ${url} (${resourceType}, 优先级: ${priority})`);
        
        // 根据资源类型和优先级采取不同的处理策略
        if (priority === 'high' || priority === 'critical') {
            // 对于高优先级资源，可能需要尝试备用方案
            logger.info(`🔄 高优先级资源超时，尝试备用方案: ${url}`);
            
            // 查找对应的DOM元素
            const elements = document.querySelectorAll(`link[href="${url}"], script[src="${url}"]`);
            if (elements.length > 0) {
                // 模拟错误事件触发回退机制
                elements.forEach(element => {
                    this.handleResourceError(element, url);
                });
            }
        } else {
            // 低优先级资源可以简单记录而不采取进一步行动
            logger.debug(`⏭️ 低优先级资源加载超时，不进行处理: ${url}`);
        }
    }

    /**
     * 按优先级加载资源
     */
    loadResourcesByPriority(priority) {
        logger.info(`📦 加载${priority}优先级资源`);
        
        let priorityResources = [];
        try {
            priorityResources = this.resourceConfig.getResourcesByPriority(priority) || [];
        } catch (error) {
            logger.error(`获取${priority}优先级资源时出错:`, error);
            return Promise.resolve([]);
        }
        
        if (priorityResources.length === 0) {
            logger.debug(`没有找到${priority}优先级的资源`);
            return Promise.resolve([]);
        }
        
        // 资源加载promises
        const loadPromises = priorityResources.map(resourceInfo => {
            const { type, name, resource } = resourceInfo;
            
            // 防御性检查：确保资源对象有效
            if (!resource || !resource.primary) {
                logger.warn(`⚠️ 跳过无效资源: ${name}`);
                return Promise.resolve(null);
            }
            
            // 对于样式资源
            if (type === 'styles') {
                return resourceStyles.loadCssNonBlocking(
                    resource.primary,
                    {
                        resourceType: name,
                        fallbacks: resource.fallbacks || [],
                        attributes: resource.attributes || {}
                    }
                );
            }
            
            // 对于脚本资源
            if (type === 'scripts') {
                return this.loadScript(
                    resource.primary,
                    {
                        async: true,
                        defer: true,
                        attributes: resource.attributes || {
                            'data-resource-type': name,
                            'data-resource-priority': priority
                        }
                    }
                );
            }
            
            return Promise.resolve(null);
        });
        
        return Promise.all(loadPromises);
    }

    /**
     * 懒加载低优先级资源
     * 仅在页面完全加载后执行
     */
    lazyLoadLowPriorityResources() {
        logger.info('🐢 开始懒加载低优先级资源');
        
        // 只有在页面完全加载后，才加载低优先级资源
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    this.loadResourcesByPriority('low');
                }, 2000); // 给页面加载后留出2秒缓冲时间
            });
            return;
        }
        
        // 如果页面已加载完成，延迟加载低优先级资源
        setTimeout(() => {
            this.loadResourcesByPriority('low');
        }, 1000);
    }

    /**
     * 加载特定资源组
     * @param {string} groupName - 资源组名称
     * @returns {Promise} - 加载完成的Promise
     */
    loadResourceGroup(groupName) {
        logger.info(`🧩 加载资源组: ${groupName}`);
        
        if (!groupName) {
            return Promise.reject(new Error('资源组名称不能为空'));
        }
        
        // 记录已尝试加载的资源组
        if (!this._loadedResourceGroups) {
            this._loadedResourceGroups = new Set();
        }
        
        // 如果已经加载过，直接返回成功
        if (this._loadedResourceGroups.has(groupName)) {
            logger.debug(`资源组 "${groupName}" 已加载，跳过`);
            return Promise.resolve(true);
        }
        
        // 根据资源组类型加载不同资源
        let loadPromise;
        
        switch (groupName) {
            case 'core':
                // core组被视为基础资源组，已在初始化时加载
                logger.debug(`基础资源组 "core" 已默认加载`);
                this._loadedResourceGroups.add(groupName);
                return Promise.resolve(true);
            
            case 'animation':
                // 简单地将animation组标记为已加载，不需要实际加载资源
                logger.debug('标记animation资源组为已加载');
                this._loadedResourceGroups.add(groupName);
                return Promise.resolve(true);
            
            case 'code':
                // 加载代码高亮相关资源
                loadPromise = this.loadCodeHighlightResources();
                break;
            
            case 'math':
                // 加载数学公式相关资源
                loadPromise = this.loadMathResources();
                break;
            
            case 'chart':
                // 加载图表相关资源
                loadPromise = this.loadChartResources();
                break;
            
            case 'diagram':
                // 加载图表相关资源
                loadPromise = this.loadDiagramResources();
                break;
            
            default:
                // 如果没有匹配的资源组，尝试基于名称推断
                if (groupName.includes('prism-')) {
                    // 加载特定的Prism语言
                    const language = groupName.replace('prism-', '');
                    loadPromise = this.loadPrismComponent(language);
                } else {
                    logger.warn(`⚠️ 未知的资源组: ${groupName}`);
                    return Promise.resolve(false);
                }
        }
        
        return loadPromise.then(result => {
            if (result) {
                // 标记资源组为已加载
                this._loadedResourceGroups.add(groupName);
            }
            return result;
        });
    }

    /**
     * 加载数学公式相关资源
     * @returns {Promise} - 加载完成的Promise
     */
    loadMathResources() {
        logger.info('🔢 加载数学公式资源');
        
        // 检查是否已加载KaTeX
        if (window.katex) {
            return Promise.resolve(true);
        }
        
        // 加载KaTeX资源
        return Promise.all([
            this.loadScript('/assets/libs/katex/katex.min.js', { async: true }),
            resourceStyles.loadCssNonBlocking('/assets/libs/katex/katex.min.css')
        ]).then(() => {
            // 加载自动渲染扩展
            return this.loadScript('/assets/libs/katex/contrib/auto-render.min.js', { async: true });
        }).then(() => {
            if (window.katex && window.renderMathInElement) {
                // 渲染页面中的所有数学公式
                setTimeout(() => {
                    window.renderMathInElement(document.body, {
                        delimiters: [
                            {left: "$$", right: "$$", display: true},
                            {left: "$", right: "$", display: false}
                        ]
                    });
                }, 200);
                return true;
            }
            return false;
        });
    }

    /**
     * 加载动画相关资源
     * @returns {Promise} - 加载完成的Promise
     */
    loadAnimationResources() {
        logger.info('🎭 加载动画效果资源');
        
        // 从资源配置获取动画组资源
        const animationResources = this.resourceConfig.getResourcesByGroup('animation');
        
        if (!animationResources || animationResources.length === 0) {
            logger.warn('⚠️ 没有找到动画资源配置');
            // 使用硬编码的回退方案
            return this.loadLegacyAnimationResources();
        }
        
        // 加载所有动画资源
        const promises = animationResources.map(res => {
            if (res.type === 'scripts') {
                return this.loadScript(res.resource.primary, { async: true });
            } else if (res.type === 'styles') {
                return resourceStyles.loadCssNonBlocking(res.resource.primary);
            }
            return Promise.resolve(false);
        });
        
        return Promise.all(promises).then(() => {
            // 初始化动画效果
            this.initializeAnimations();
            return true;
        });
    }

    /**
     * 加载遗留的动画资源（作为回退）
     * @private
     */
    loadLegacyAnimationResources() {
        // 现有的加载逻辑保持不变
        // ...
    }

    /**
     * 初始化页面上的各种动画效果
     * 这个方法在动画库加载后被调用
     */
    initializeAnimations() {
        // 如果有滚动动画元素，初始化它们
        const scrollAnimElements = document.querySelectorAll('[data-animation]');
        if (scrollAnimElements.length > 0) {
            logger.debug(`找到${scrollAnimElements.length}个滚动动画元素`);
            
            // 简单的滚动动画初始化
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        const animation = element.getAttribute('data-animation');
                        element.classList.add(animation, 'animated');
                        observer.unobserve(element);
                    }
                });
            }, { threshold: 0.1 });
            
            scrollAnimElements.forEach(element => {
                observer.observe(element);
            });
            
            logger.info('✅ 滚动动画已初始化');
        }
    }

    /**
     * 根据URL或元素标签判断资源类型
     * @private
     */
    _getResourceTypeFromUrl(url, element) {
        // 防御性检查
        if (!url) return 'unknown';
        
        // 确保Prism主题CSS被正确识别
        if (url.includes('/prism') && url.includes('.css') || 
            url.includes('/prism') && url.includes('theme')) {
            return 'prism-theme';
        }
        
        // 根据元素类型判断
        if (element) {
            if (element.tagName === 'LINK' && element.rel === 'stylesheet') {
                return 'css';
            }
            if (element.tagName === 'SCRIPT') {
                return 'js';
            }
        }
        
        // 根据URL扩展名判断
        const ext = url.split('.').pop().toLowerCase();
        if (['css'].includes(ext)) return 'css';
        if (['js'].includes(ext)) return 'js';
        
        return 'unknown';
    }

    // 添加这个辅助方法来处理带有回退的脚本加载
    loadScriptWithFallbacks(primaryUrl, fallbackUrls) {
        // 添加类型转换以确保fallbackUrls始终是数组
        const fallbacks = Array.isArray(fallbackUrls) ? fallbackUrls : [];
        
        // 先尝试主要URL
        return this.loadScript(primaryUrl, { async: true }).then(success => {
            if (success) {
                // 记录成功日志
                logger.info(`✅ 资源加载成功: ${primaryUrl}`);
                return true;
            }
            
            // 如果主URL失败且有回退URL，尝试回退
            if (fallbacks.length > 0) {
                // 记录日志
                logger.warn(`⚠️ 主资源加载失败，尝试回退: ${primaryUrl}`);
                
                // 尝试第一个回退URL，并递归处理其余回退URL
                const nextUrl = fallbacks[0];
                const remainingFallbacks = fallbacks.slice(1);
                return this.loadScriptWithFallbacks(nextUrl, remainingFallbacks);
            }
            
            // 所有尝试均失败
            logger.error(`❌ 所有资源加载尝试均失败`);
            return false;
        });
    }
}

// 创建一个单例实例并导出
const resourceLoader = new ResourceLoader();

// 导出单例和类
export { resourceLoader, ResourceLoader };
export default resourceLoader;
