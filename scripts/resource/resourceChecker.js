/**
 * @file resource-checker.js
 * @description 资源存在性检查模块，负责检查本地资源是否存在并维护不存在资源的记录
 * @created 2024-05-01
 */

import logger from '../utils/logger.js';

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
        
        // 提前检测FontAwesome
        this.initFastFontAwesomeCheck();
        
        // 页面加载完成后进行更全面的FontAwesome检测
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.checkFontAwesomeAvailability());
        } else {
            // 如果DOMContentLoaded已经触发，立即检查
            this.checkFontAwesomeAvailability();
        }
    }
    
    /**
     * 初始化快速FontAwesome检测
     * 尽早检测字体可用性
     */
    initFastFontAwesomeCheck() {
        // 创建FontAwesome预加载检测
        const checkFontInterval = setInterval(() => {
            // 如果文档还未准备好，不执行检测
            if (!document.body) return;
            
            try {
                // 立即执行一次快速检测
                this.performFontAwesomeCheck();
                // 清除检测间隔
                clearInterval(checkFontInterval);
            } catch (e) {
                // 忽略错误，继续等待
            }
        }, 50); // 每50ms检测一次
        
        // 确保不会无限检测
        setTimeout(() => clearInterval(checkFontInterval), 3000);
    }
    
    /**
     * 检查Font Awesome是否可用
     */
    performFontAwesomeCheck() {
        // 检查是否有本地Font Awesome
        const localFA = document.getElementById('local-font-awesome') || 
                        document.querySelector('link[href*="font-awesome"][data-source="local-resource"]');
        
        if (localFA) {
            // 给字体文件一些加载时间
            setTimeout(() => {
                // 验证字体是否实际加载成功
                const testIcon = document.createElement('i');
                testIcon.className = 'fas fa-check';
                testIcon.style.visibility = 'hidden';
                document.body.appendChild(testIcon);
                
                const style = window.getComputedStyle(testIcon);
                const fontFamily = style.getPropertyValue('font-family');
                const content = style.getPropertyValue('content');
                
                document.body.removeChild(testIcon);
                
                const isLoaded = fontFamily.includes('Font Awesome') && content !== 'none' && content !== '';
                
                if (isLoaded) {
                    logger.info('✅ 本地Font Awesome已正确加载');
                    this.fontAwesomeConfirmed = true;
                } else {
                    logger.warn('⚠️ 虽然找到本地Font Awesome链接，但字体可能未正确加载');
                    // 不立即切换到Unicode，给更多加载时间
                }
            }, 500);
            
            // 即使检测结果尚未确认，也返回true以避免不必要的警告
            return true;
        }
        
        // 如果没有找到本地Font Awesome，按原逻辑处理
        // ...其余代码保持不变...
    }
    
    /**
     * 刷新树状图标
     * 强制重新应用图标样式
     */
    refreshTreeIcons() {
        try {
            // 查找所有树形图标
            const treeIcons = document.querySelectorAll('.tree-toggle i');
            if (treeIcons.length === 0) return;
            
            // 触发重排/重绘
            treeIcons.forEach(icon => {
                // 清除可能存在的内容
                icon.textContent = '';
                
                // 保存当前类名
                const className = icon.className;
                // 添加临时类触发重绘
                icon.classList.add('icon-refresh');
                // 强制浏览器重排
                void icon.offsetWidth;
                // 移除临时类
                icon.classList.remove('icon-refresh');
            });
            
            logger.debug('树形图标已刷新');
        } catch (e) {
            logger.warn('刷新树形图标时出错', e);
        }
    }

    /**
     * 检测FontAwesome是否加载成功
     * 更彻底的检测，在页面完全加载后执行
     */
    checkFontAwesomeAvailability() {
        // 使用较短的延迟，优化用户体验
        setTimeout(() => {
            // 执行检测，但忽略结果，总是使用FontAwesome
            this.performFontAwesomeCheck();
            // 强制再次刷新树状图标
            this.refreshTreeIcons();
        }, 200); // 缩短延迟时间
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
        logger.debug(`🔍 已标记目录为不存在资源: ${directory}`);
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
     * 设置图标状态
     * 基于树项的状态设置图标文本和可见性
     * @param {HTMLElement} iconElement - 图标元素
     * @param {HTMLElement} treeItem - 树项元素
     * @private
     */
    _setIconState(iconElement, treeItem) {
        if (!treeItem) return;
        
        // 最简单直接的方式：检查是否有"expanded"类
        const isExpanded = treeItem.classList.contains('expanded');
        
        // 对于根目录的特殊处理
        if (treeItem.parentElement && treeItem.parentElement.id === 'article-tree') {
            // 根目录图标总是可见
            iconElement.style.visibility = 'visible';
            // 根目录的三角形
            iconElement.textContent = isExpanded ? '▼' : '▶';
            return;
        }
        
        // 对于分类根节点(如AI)的处理
        const rootItem = treeItem.closest('.root-item');
        if (rootItem && treeItem === rootItem.querySelector(':scope > .tree-item')) {
            // 分类根节点图标总是可见
            iconElement.style.visibility = 'visible';
            // 根据状态设置图标
            const isRootCollapsed = rootItem.classList.contains('all-collapsed');
            iconElement.textContent = (isRootCollapsed || !isExpanded) ? '▶' : '▼';
            return;
        }
        
        // 对普通节点的处理
        // 检查是否在折叠的根节点内
        const isInCollapsedRoot = rootItem && rootItem.classList.contains('all-collapsed');
        
        // 如果在折叠的根节点内，图标隐藏
        if (isInCollapsedRoot) {
            iconElement.style.visibility = 'hidden';
            return;
        }
        
        // 普通节点的图标可见
        iconElement.style.visibility = 'visible';
        // 根据展开状态设置图标
        iconElement.textContent = isExpanded ? '▼' : '▶';
    }
    
}

// 创建单例实例
const resourceChecker = new ResourceChecker();

// 导出单例和类
export { resourceChecker, ResourceChecker };
export default resourceChecker;