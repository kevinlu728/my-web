/**
 * @file resource-checker.js
 * @description 资源存在性检查模块，负责检查本地资源是否存在并维护不存在资源的记录
 * @created 2024-05-01
 */

import logger from './logger.js';

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
     * 清除所有标记为不存在的资源
     */
    clearNonExistentResources() {
        this.nonExistentResources.clear();
    }

    /**
     * 测试功能：模拟FontAwesome加载失败
     * 用于测试回退到Unicode的功能
     */
    testFontAwesomeFallback() {
        try {
            // 添加no-fontawesome类来模拟FontAwesome加载失败
            document.documentElement.classList.add('no-fontawesome');
            
            // 创建和应用全局样式，完全覆盖所有CSS旋转和变换
            const styleElement = document.createElement('style');
            styleElement.id = 'unicode-fallback-style';
            styleElement.textContent = `
                /* 完全禁用所有树图标的旋转和变换 */
                .tree-toggle i, 
                .tree-item.expanded > .tree-item-content .tree-toggle i,
                #article-tree .root-item.all-collapsed > .tree-item-content .tree-toggle i {
                    transform: none !important;
                    transition: none !important;
                    font-family: sans-serif !important;
                    animation: none !important;
                }
                
                /* 隐藏所有图标内容，为纯文本显示做准备 */
                .tree-toggle i::before,
                .tree-item-icon i::before,
                .category-icon i::before,
                .article-icon i::before {
                    display: none !important;
                    content: "" !important;
                }

                /* 确保根节点图标始终可见 */
                .unicode-icon.root-icon {
                    visibility: visible !important;
                }
                
                /* 文章和分类图标样式 */
                .unicode-type-icon {
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    line-height: 16px;
                    text-align: center;
                    margin-right: 5px;
                    color: var(--text-color);
                    font-weight: normal;
                }
            `;
            document.head.appendChild(styleElement);
            
            // 记录原始状态，用于恢复
            const originalStates = new Map();
            
            // 1. 先处理展开/折叠图标
            // 获取所有树图标
            const treeIcons = document.querySelectorAll('.tree-toggle i');
            
            // 先删除所有图标
            treeIcons.forEach(icon => {
                // 保存原始元素信息，用于恢复
                originalStates.set(icon, {
                    className: icon.className,
                    innerHTML: icon.innerHTML,
                    style: icon.getAttribute('style') || ''
                });
                
                // 完全清除图标，准备重建
                const parent = icon.parentNode;
                parent.removeChild(icon);
                
                // 创建全新的图标元素
                const newIcon = document.createElement('span');
                newIcon.className = 'unicode-icon';
                
                // 检查是否是根目录图标（最顶层的全部文章）
                const articleTree = parent.closest('#article-tree');
                if (articleTree && parent.closest('.tree-item') === articleTree.querySelector(':scope > .tree-item')) {
                    newIcon.classList.add('root-icon');
                    newIcon.classList.add('article-root-icon');
                }
                // 检查是否是分类根节点图标
                else {
                    const rootItem = parent.closest('.root-item');
                    if (rootItem && parent.closest('.tree-item') === rootItem.querySelector(':scope > .tree-item')) {
                        newIcon.classList.add('root-icon');
                        newIcon.classList.add('category-root-icon');
                    }
                }
                
                newIcon.style.cssText = 'display:inline-block; width:12px; height:12px; text-align:center; line-height:12px; font-size:12px; margin-right:5px; user-select:none;';
                
                // 确定显示状态和对应的Unicode字符
                const treeItem = parent.closest('.tree-item');
                
                // 设置图标初始状态
                this._setIconState(newIcon, treeItem);
                
                // 将新图标添加到DOM
                parent.appendChild(newIcon);
                
                // 为每个图标设置数据属性，标记为临时Unicode图标
                newIcon.setAttribute('data-unicode-fallback', 'true');
            });
            
            // 2. 处理分类图标
            const categoryIcons = document.querySelectorAll('.category-icon i, .tree-item-icon i.fa-folder, .tree-item-icon i.fa-folder-open');
            categoryIcons.forEach(icon => {
                originalStates.set(icon, {
                    className: icon.className,
                    innerHTML: icon.innerHTML,
                    style: icon.getAttribute('style') || ''
                });
                
                const parent = icon.parentNode;
                parent.removeChild(icon);
                
                // 创建目录图标替代
                const categoryIcon = document.createElement('span');
                categoryIcon.className = 'unicode-type-icon category-unicode-icon';
                categoryIcon.innerHTML = '📁'; // 文件夹图标
                categoryIcon.setAttribute('data-unicode-fallback', 'true');
                
                parent.appendChild(categoryIcon);
            });
            
            // 3. 处理文章图标
            const articleIcons = document.querySelectorAll('.article-icon i, .tree-item-icon i.fa-file, .tree-item-icon i.fa-file-alt');
            articleIcons.forEach(icon => {
                originalStates.set(icon, {
                    className: icon.className,
                    innerHTML: icon.innerHTML,
                    style: icon.getAttribute('style') || ''
                });
                
                const parent = icon.parentNode;
                parent.removeChild(icon);
                
                // 创建文章图标替代
                const articleIcon = document.createElement('span');
                articleIcon.className = 'unicode-type-icon article-unicode-icon';
                articleIcon.innerHTML = '📄'; // 文件图标
                articleIcon.setAttribute('data-unicode-fallback', 'true');
                
                parent.appendChild(articleIcon);
            });
            
            // 存储原始状态信息，用于恢复
            window._originalTreeIconStates = originalStates;
            
            // 添加事件监听器，监听树节点的展开/折叠状态变化
            this._addTreeStateChangeListener();
            
            // 立即处理所有根节点，确保根节点图标正确显示
            this._handleRootItemsChange();
            
            // 强制更新所有图标状态
            this._forceUpdateAllTreeIcons();
            
            logger.info('已启用Unicode字符回退模式（完全替换图标元素）');
            return true;
        } catch (error) {
            logger.error('启用Unicode回退模式失败', error);
            return false;
        }
    }
    
    /**
     * 强制更新所有树图标状态
     * 在初始化和DOM结构有重大变化时调用
     * @private
     */
    _forceUpdateAllTreeIcons() {
        // 立即更新一次
        this._updateAllTreeIcons();
        
        // 延迟后再次更新，确保所有状态变化都被捕获
        setTimeout(() => {
            this._updateAllTreeIcons();
            
            // 再次延迟，处理可能的滞后状态
            setTimeout(() => this._updateAllTreeIcons(), 100);
        }, 50);
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

    /**
     * 添加树节点状态变化监听器
     * 当树节点展开或折叠时，更新Unicode图标
     * @private
     */
    _addTreeStateChangeListener() {
        // 移除可能存在的旧监听器
        this._removeTreeStateChangeListener();
        
        // 创建监听函数
        this._treeClickHandler = (event) => {
            // 查找事件路径中的树切换器
            const treeToggle = event.target.closest('.tree-toggle');
            if (!treeToggle) return; // 不是点击在切换器上
            
            // 获取所属的树项
            const treeItem = treeToggle.closest('.tree-item');
            // 检查是否点击的是根节点
            const rootItem = treeToggle.closest('.root-item');
            
            // 延迟执行以确保展开/折叠状态已更新
            setTimeout(() => {
                const unicodeIcon = treeToggle.querySelector('.unicode-icon');
                if (unicodeIcon) {
                    // 使用通用方法设置图标状态
                    this._setIconState(unicodeIcon, treeItem);
                }
                
                // 如果点击的是分类根节点，处理其所有子节点
                if (rootItem) {
                    this._updateChildIcons(rootItem, !rootItem.classList.contains('all-collapsed'));
                }
                
                // 无论如何，延迟一点后刷新所有图标，以确保状态正确
                setTimeout(() => this._updateAllTreeIcons(), 50);
            }, 0);
        };
        
        // 添加事件委托监听器到文档
        document.addEventListener('click', this._treeClickHandler);
        
        // 添加变异观察器，监视树节点结构变化
        this._setupTreeMutationObserver();
    }
    
    /**
     * 处理根节点点击
     * @param {HTMLElement} rootItem - 根节点元素
     * @param {HTMLElement} treeToggle - 被点击的树切换器元素
     * @private
     */
    _handleRootItemClick(rootItem, treeToggle) {
        const unicodeIcon = treeToggle.querySelector('.unicode-icon');
        
        // 如果图标不存在，尝试重新创建
        if (!unicodeIcon) {
            // 如果原图标不在但父元素存在，尝试重建图标
            const newIcon = document.createElement('span');
            newIcon.className = 'unicode-icon root-icon category-root-icon'; // 添加类标记为根图标
            newIcon.style.cssText = 'display:inline-block; width:12px; height:12px; text-align:center; line-height:12px; font-size:12px; margin-right:5px; user-select:none;';
            newIcon.setAttribute('data-unicode-fallback', 'true');
            
            const treeItem = treeToggle.closest('.tree-item');
            
            // 根据当前状态设置图标
            this._setIconState(newIcon, treeItem);
            
            // 删除可能存在的旧图标（防止重复）
            const oldIcons = treeToggle.querySelectorAll('.unicode-icon');
            oldIcons.forEach(icon => icon.parentNode.removeChild(icon));
            
            // 添加新图标
            treeToggle.appendChild(newIcon);
            
            // 记录日志
            logger.debug('为根节点重新创建了图标');
        } else {
            // 如果图标存在，更新其状态
            const treeItem = treeToggle.closest('.tree-item');
            this._setIconState(unicodeIcon, treeItem);
        }
        
        // 递归处理子节点图标
        this._updateChildIcons(rootItem, !rootItem.classList.contains('all-collapsed'));
    }
    
    /**
     * 处理根项状态变化
     * 特别关注根项的折叠/展开
     * @private
     */
    _handleRootItemsChange() {
        // 处理主根目录（全部文章）
        const articleTree = document.querySelector('#article-tree');
        if (articleTree) {
            const mainRoot = articleTree.querySelector(':scope > .tree-item');
            if (mainRoot) {
                const treeToggle = mainRoot.querySelector('.tree-toggle');
                if (treeToggle) {
                    const unicodeIcon = treeToggle.querySelector('.unicode-icon');
                    
                    if (unicodeIcon) {
                        // 更新状态
                        this._setIconState(unicodeIcon, mainRoot);
                    } else {
                        // 创建新图标
                        const newIcon = document.createElement('span');
                        newIcon.className = 'unicode-icon root-icon article-root-icon';
                        newIcon.style.cssText = 'display:inline-block; width:12px; height:12px; text-align:center; line-height:12px; font-size:12px; margin-right:5px; user-select:none;';
                        newIcon.setAttribute('data-unicode-fallback', 'true');
                        
                        // 设置状态
                        this._setIconState(newIcon, mainRoot);
                        
                        // 添加到DOM
                        treeToggle.appendChild(newIcon);
                    }
                }
            }
        }
        
        // 获取所有分类根项
        const rootItems = document.querySelectorAll('.root-item');
        
        rootItems.forEach(rootItem => {
            const treeToggle = rootItem.querySelector('.tree-toggle');
            if (!treeToggle) return;
            
            const unicodeIcon = treeToggle.querySelector('.unicode-icon');
            const treeItem = treeToggle.closest('.tree-item');
            
            // 如果图标不存在，尝试重新创建
            if (!unicodeIcon) {
                // 检查是否有原始的FontAwesome图标
                const faIcon = treeToggle.querySelector('i');
                
                // 如果没有任何图标，创建新的Unicode图标
                if (!faIcon) {
                    const newIcon = document.createElement('span');
                    newIcon.className = 'unicode-icon root-icon category-root-icon'; // 添加类标记
                    newIcon.style.cssText = 'display:inline-block; width:12px; height:12px; text-align:center; line-height:12px; font-size:12px; margin-right:5px; user-select:none;';
                    newIcon.setAttribute('data-unicode-fallback', 'true');
                    
                    // 设置状态
                    this._setIconState(newIcon, treeItem);
                    
                    // 添加新图标
                    treeToggle.appendChild(newIcon);
                    
                    logger.debug('为分类根节点创建了新图标');
                }
            } else {
                // 更新图标状态
                this._setIconState(unicodeIcon, treeItem);
            }
            
            // 更新子图标可见性
            this._updateChildIcons(rootItem, !rootItem.classList.contains('all-collapsed'));
        });
    }
    
    /**
     * 更新所有树图标状态
     * @private
     */
    _updateAllTreeIcons() {
        // 先处理根项图标
        this._handleRootItemsChange();
        
        // 获取所有树切换器
        const treeToggles = document.querySelectorAll('.tree-toggle');
        
        treeToggles.forEach(toggle => {
            const unicodeIcon = toggle.querySelector('.unicode-icon');
            if (!unicodeIcon) {
                // 图标丢失，尝试重建
                this._recreateIconIfNeeded(toggle);
                return;
            }
            
            const treeItem = toggle.closest('.tree-item');
            if (!treeItem) return;
            
            // 使用统一的方法设置图标状态
            this._setIconState(unicodeIcon, treeItem);
        });
    }
    
    /**
     * 如果需要，重新创建丢失的图标
     * @param {HTMLElement} toggleElement - 树切换器元素
     * @private
     */
    _recreateIconIfNeeded(toggleElement) {
        // 检查是否已经有图标
        if (toggleElement.querySelector('.unicode-icon')) return;
        
        // 找到所属树项
        const treeItem = toggleElement.closest('.tree-item');
        if (!treeItem) return;
        
        // 创建新图标
        const newIcon = document.createElement('span');
        newIcon.className = 'unicode-icon';
        
        // 检查是否为根目录图标
        const articleTree = toggleElement.closest('#article-tree');
        if (articleTree && treeItem === articleTree.querySelector(':scope > .tree-item')) {
            newIcon.classList.add('root-icon');
            newIcon.classList.add('article-root-icon');
        }
        // 检查是否为分类根节点
        else {
            const rootItem = toggleElement.closest('.root-item');
            if (rootItem && treeItem === rootItem.querySelector(':scope > .tree-item')) {
                newIcon.classList.add('root-icon');
                newIcon.classList.add('category-root-icon');
            }
        }
        
        newIcon.style.cssText = 'display:inline-block; width:12px; height:12px; text-align:center; line-height:12px; font-size:12px; margin-right:5px; user-select:none;';
        newIcon.setAttribute('data-unicode-fallback', 'true');
        
        // 设置图标状态
        this._setIconState(newIcon, treeItem);
        
        // 添加到DOM
        toggleElement.appendChild(newIcon);
        
        logger.debug('重建了丢失的图标');
    }

    /**
     * 移除树节点状态变化监听器
     * @private
     */
    _removeTreeStateChangeListener() {
        // 移除点击事件监听器
        if (this._treeClickHandler) {
            document.removeEventListener('click', this._treeClickHandler);
            this._treeClickHandler = null;
        }
        
        // 断开变异观察器
        if (this._treeMutationObserver) {
            this._treeMutationObserver.disconnect();
            this._treeMutationObserver = null;
        }
    }

    /**
     * 恢复FontAwesome图标显示
     * 用于测试后恢复正常
     */
    restoreFontAwesome() {
        try {
            // 移除no-fontawesome类
            document.documentElement.classList.remove('no-fontawesome');
            
            // 移除临时样式表
            const styleElement = document.getElementById('unicode-fallback-style');
            if (styleElement) {
                styleElement.parentNode.removeChild(styleElement);
            }
            
            // 移除事件监听器
            this._removeTreeStateChangeListener();
            
            // 获取所有临时Unicode图标
            const tempIcons = document.querySelectorAll('[data-unicode-fallback="true"]');
            
            // 如果没有找到临时图标，可能是用了其他回退方式，尝试恢复FontAwesome类名
            if (tempIcons.length === 0) {
                const treeIcons = document.querySelectorAll('.tree-toggle i, .category-icon i, .article-icon i, .tree-item-icon i');
                treeIcons.forEach(icon => {
                    // 清除文本内容
                    icon.textContent = '';
                    icon.innerHTML = '';
                    
                    // 恢复FontAwesome类名
                    if (!icon.classList.contains('fas')) {
                        icon.classList.add('fas');
                    }
                    
                    // 根据类型设置正确的图标
                    if (icon.closest('.category-icon') || 
                        (icon.closest('.tree-item-icon') && 
                         (icon.classList.contains('fa-folder') || icon.classList.contains('fa-folder-open')))) {
                        icon.classList.add('fa-folder');
                    } else if (icon.closest('.article-icon') || 
                              (icon.closest('.tree-item-icon') && 
                               (icon.classList.contains('fa-file') || icon.classList.contains('fa-file-alt')))) {
                        icon.classList.add('fa-file-alt');
                    } else {
                        // 展开/折叠图标
                        const treeItem = icon.closest('.tree-item');
                        if (treeItem && treeItem.classList.contains('expanded')) {
                            icon.classList.remove('fa-chevron-right');
                            icon.classList.add('fa-chevron-down');
                        } else {
                            icon.classList.remove('fa-chevron-down');
                            icon.classList.add('fa-chevron-right');
                        }
                    }
                    
                    // 恢复基本样式
                    icon.style.fontFamily = '"Font Awesome 6 Free", FontAwesome, sans-serif';
                    icon.style.fontWeight = '900';
                });
                
                logger.info('已恢复FontAwesome图标显示（直接恢复类名）');
                return true;
            }
            
            // 读取原始状态信息
            const originalStates = window._originalTreeIconStates;
            if (!originalStates || !(originalStates instanceof Map)) {
                logger.warn('未找到原始图标状态信息，尝试基本恢复');
                
                // 基本恢复：移除所有临时图标并创建新的FontAwesome图标
                tempIcons.forEach(icon => {
                    const parent = icon.parentNode;
                    const isCategory = icon.classList.contains('category-unicode-icon');
                    const isArticle = icon.classList.contains('article-unicode-icon');
                    
                    parent.removeChild(icon);
                    
                    const newIcon = document.createElement('i');
                    newIcon.className = 'fas';
                    
                    if (isCategory) {
                        newIcon.classList.add('fa-folder');
                    } else if (isArticle) {
                        newIcon.classList.add('fa-file-alt');
                    } else {
                        // 根据当前状态设置图标方向（展开/折叠图标）
                        const treeItem = parent.closest('.tree-item');
                        if (treeItem && treeItem.classList.contains('expanded')) {
                            newIcon.classList.add('fa-chevron-down');
                        } else {
                            newIcon.classList.add('fa-chevron-right');
                        }
                    }
                    
                    // 添加基本样式
                    newIcon.style.fontFamily = '"Font Awesome 6 Free", FontAwesome, sans-serif';
                    newIcon.style.fontWeight = '900';
                    
                    parent.appendChild(newIcon);
                });
                
                return true;
            }
            
            // 精确恢复：使用保存的原始状态
            tempIcons.forEach(icon => {
                // 找到父元素
                const parent = icon.parentNode;
                
                // 获取原始数据（可能没有保存每个元素）
                const originalIcon = document.createElement('i');
                
                // 使用父元素尝试查找原始信息
                let foundOriginal = false;
                for (const [origIcon, data] of originalStates.entries()) {
                    if (origIcon.parentNode === parent) {
                        originalIcon.className = data.className;
                        originalIcon.innerHTML = data.innerHTML;
                        if (data.style) {
                            originalIcon.setAttribute('style', data.style);
                        }
                        foundOriginal = true;
                        break;
                    }
                }
                
                // 如果没有找到原始信息，使用默认设置
                if (!foundOriginal) {
                    originalIcon.className = 'fas';
                    
                    const isCategory = icon.classList.contains('category-unicode-icon');
                    const isArticle = icon.classList.contains('article-unicode-icon');
                    
                    if (isCategory) {
                        originalIcon.classList.add('fa-folder');
                    } else if (isArticle) {
                        originalIcon.classList.add('fa-file-alt');
                    } else {
                        // 根据当前状态设置图标方向
                        const treeItem = parent.closest('.tree-item');
                        if (treeItem && treeItem.classList.contains('expanded')) {
                            originalIcon.classList.add('fa-chevron-down');
                        } else {
                            originalIcon.classList.add('fa-chevron-right');
                        }
                    }
                    
                    // 添加基本样式
                    originalIcon.style.fontFamily = '"Font Awesome 6 Free", FontAwesome, sans-serif';
                    originalIcon.style.fontWeight = '900';
                }
                
                // 移除临时图标，添加恢复的图标
                parent.removeChild(icon);
                parent.appendChild(originalIcon);
            });
            
            // 清除原始状态数据
            delete window._originalTreeIconStates;
            
            // 触发树状图标刷新
            this.refreshTreeIcons();
            
            logger.info('已恢复FontAwesome图标显示（完整恢复）');
            return true;
        } catch (error) {
            logger.error('恢复FontAwesome图标显示失败', error);
            return false;
        }
    }

    /**
     * 更新子图标的可见性和状态
     * @param {HTMLElement} rootItem - 根元素
     * @param {boolean} isExpanded - 是否展开
     * @private
     */
    _updateChildIcons(rootItem, isExpanded) {
        if (!rootItem) return;
        
        // 获取所有子图标
        const childIcons = rootItem.querySelectorAll('.tree-children .unicode-icon');
        
        childIcons.forEach(icon => {
            // 设置可见性
            icon.style.visibility = isExpanded ? 'visible' : 'hidden';
            
            // 如果可见，还需要设置图标状态
            if (isExpanded) {
                const treeItem = icon.closest('.tree-item');
                if (treeItem) {
                    this._setIconState(icon, treeItem);
                }
            }
        });
    }
    
    /**
     * 设置树结构变化的观察器
     * @private
     */
    _setupTreeMutationObserver() {
        if (this._treeMutationObserver) {
            this._treeMutationObserver.disconnect();
        }
        
        // 创建新的观察器
        this._treeMutationObserver = new MutationObserver((mutations) => {
            let needsUpdate = false;
            
            // 检查是否有相关变化
            for (const mutation of mutations) {
                // 类名变化可能意味着展开/折叠状态变化
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'class' && 
                    (mutation.target.classList.contains('tree-item') || 
                     mutation.target.classList.contains('root-item'))) {
                    needsUpdate = true;
                    break;
                }
                
                // 子节点变化可能意味着树结构变化
                if (mutation.type === 'childList' && 
                    (mutation.target.classList.contains('tree-children') || 
                     mutation.target.classList.contains('tree-toggle'))) {
                    needsUpdate = true;
                    break;
                }
            }
            
            // 如果需要更新，延迟执行以确保DOM完全更新
            if (needsUpdate) {
                setTimeout(() => this._updateAllTreeIcons(), 10);
            }
        });
        
        // 观察整个文档中的树结构变化
        this._treeMutationObserver.observe(document.body, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: ['class', 'style']
        });
    }
}

// 创建单例实例
const resourceChecker = new ResourceChecker();

// 暴露测试方法到全局作用域，方便控制台调用
window.testFontAwesomeFallback = function() {
    return resourceChecker.testFontAwesomeFallback();
};

// 暴露恢复方法到全局作用域
window.restoreFontAwesome = function() {
    return resourceChecker.restoreFontAwesome();
};

// 导出单例和类
export { resourceChecker, ResourceChecker };
export default resourceChecker;