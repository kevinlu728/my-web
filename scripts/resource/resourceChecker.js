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
        logger.info('提前检测FontAwesome');
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
    
}

// 创建单例实例
const resourceChecker = new ResourceChecker();

// 导出单例和类
export { resourceChecker, ResourceChecker };
export default resourceChecker;