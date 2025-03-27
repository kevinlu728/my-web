/**
 * @file resource-checker.js
 * @description 资源存在性检查模块，负责检查本地资源是否存在并维护不存在资源的记录
 * @created 2024-05-01
 */

/**
 * 资源检查器类
 * 负责检查资源是否存在以及维护不存在资源的记录
 */
class ResourceChecker {
    /**
     * 初始化资源检查器
     * @param {Object} config - 配置对象
     */
    constructor(config = {}) {
        // 非存在资源列表
        this.nonExistentResources = new Set();
        
        // KaTeX本地资源是否确认存在
        this.katexLocalResourceConfirmed = config.katexLocalResourceConfirmed || false;
        
        // 初始化一些已知不存在的资源路径
        if (!this.katexLocalResourceConfirmed) {
            this.nonExistentResources.add('/assets/libs/katex/');
        }
        
        // 已知存在的本地资源路径
        this.knownLocalResources = [
            'styles/fallback.css',
            // 可以在这里添加其他已知存在的本地资源
        ];
    }

    /**
     * 检查本地资源是否存在
     * @param {string} localPath - 本地资源路径
     * @returns {boolean} 资源是否存在
     */
    checkLocalResourceExists(localPath) {
        // 此方法在浏览器环境中不能直接检查文件是否存在
        // 使用启发式方法判断
        
        // 检查常见的不存在路径模式
        if (localPath.includes('/katex/') && !this.katexLocalResourceConfirmed) {
            // 如果是katex路径且没有确认过本地存在，假设不存在
            return false;
        }
        
        // 检查是否匹配已知存在的本地资源
        return this.knownLocalResources.some(path => localPath.endsWith(path));
    }
    
    /**
     * 检查资源是否为已知不存在的资源
     * @param {string} resourcePath - 资源路径
     * @returns {boolean} 是否为已知不存在的资源
     */
    isNonExistentResource(resourcePath) {
        // 检查完整路径
        if (this.nonExistentResources.has(resourcePath)) {
            return true;
        }
        
        // 检查路径前缀
        for (const prefix of this.nonExistentResources) {
            if (resourcePath.startsWith(prefix)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 标记资源为不存在
     * @param {string} resourcePath - 资源路径
     */
    markResourceAsNonExistent(resourcePath) {
        // 从路径中提取目录部分
        const parts = resourcePath.split('/');
        parts.pop(); // 移除文件名
        const directory = parts.join('/') + '/';
        
        // 添加到不存在资源集合
        this.nonExistentResources.add(directory);
        console.debug(`🔍 已标记目录为不存在资源: ${directory}`);
    }
    
    /**
     * 添加已知存在的本地资源
     * @param {string} resourcePath - 资源路径
     */
    addKnownLocalResource(resourcePath) {
        if (!this.knownLocalResources.includes(resourcePath)) {
            this.knownLocalResources.push(resourcePath);
        }
    }
    
    /**
     * 更新配置
     * @param {Object} config - 新的配置参数
     */
    updateConfig(config) {
        if (config.katexLocalResourceConfirmed !== undefined) {
            this.katexLocalResourceConfirmed = config.katexLocalResourceConfirmed;
            
            // 如果确认KaTeX本地资源存在，从不存在列表中移除
            if (this.katexLocalResourceConfirmed) {
                const toRemove = [];
                for (const path of this.nonExistentResources) {
                    if (path.includes('/katex/')) {
                        toRemove.push(path);
                    }
                }
                
                toRemove.forEach(path => {
                    this.nonExistentResources.delete(path);
                });
            } else {
                // 如果确认KaTeX本地资源不存在，添加到不存在列表
                this.nonExistentResources.add('/assets/libs/katex/');
            }
        }
    }
    
    /**
     * 清除所有标记为不存在的资源
     */
    clearNonExistentResources() {
        this.nonExistentResources.clear();
    }
}

// 创建单例实例
const resourceChecker = new ResourceChecker();

// 导出单例和类
export { resourceChecker, ResourceChecker };
export default resourceChecker; 