/**
 * @file url-utils.js
 * @description URL参数处理工具函数，提供URL查询参数的读取和更新功能
 * @version 1.0.0
 * @created 2024-03-20
 */

/**
 * URL参数工具类，提供URL参数的操作方法
 */
export class UrlUtils {
    /**
     * 更新URL参数
     * @param {string} key - 参数名
     * @param {string} value - 参数值
     * @param {boolean} [reload=false] - 是否重新加载页面
     */
    static updateParam(key, value, reload = false) {
        if (!key) return;
        
        const url = new URL(window.location.href);
        const params = url.searchParams;
        
        // 设置或更新参数
        params.set(key, value);
        
        // 构建新的URL
        const newUrl = `${url.pathname}${params.toString() ? '?' + params.toString() : ''}${url.hash}`;
        
        // 更新浏览器历史
        if (reload) {
            window.location.href = newUrl;
        } else {
            window.history.pushState({}, '', newUrl);
        }
        
        console.log(`URL参数已更新: ${key}=${value}`);
    }
    
    /**
     * 获取URL参数
     * @param {string} key - 参数名
     * @param {string} [defaultValue=''] - 默认值，当参数不存在时返回
     * @returns {string} 参数值
     */
    static getParam(key, defaultValue = '') {
        const url = new URL(window.location.href);
        return url.searchParams.get(key) || defaultValue;
    }
    
    /**
     * 删除URL参数
     * @param {string} key - 要删除的参数名
     * @param {boolean} [reload=false] - 是否重新加载页面
     */
    static removeParam(key, reload = false) {
        if (!key) return;
        
        const url = new URL(window.location.href);
        const params = url.searchParams;
        
        // 删除参数
        params.delete(key);
        
        // 构建新的URL
        const newUrl = `${url.pathname}${params.toString() ? '?' + params.toString() : ''}${url.hash}`;
        
        // 更新浏览器历史
        if (reload) {
            window.location.href = newUrl;
        } else {
            window.history.pushState({}, '', newUrl);
        }
        
        console.log(`URL参数已删除: ${key}`);
    }
    
    /**
     * 同时更新多个URL参数
     * @param {Object} paramsObject - 包含参数名和参数值的对象
     * @param {boolean} [reload=false] - 是否重新加载页面
     */
    static updateParams(paramsObject, reload = false) {
        if (!paramsObject || typeof paramsObject !== 'object') return;
        
        const url = new URL(window.location.href);
        const params = url.searchParams;
        
        // 设置所有参数
        Object.entries(paramsObject).forEach(([key, value]) => {
            if (value === null || value === undefined) {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });
        
        // 构建新的URL
        const newUrl = `${url.pathname}${params.toString() ? '?' + params.toString() : ''}${url.hash}`;
        
        // 更新浏览器历史
        if (reload) {
            window.location.href = newUrl;
        } else {
            window.history.pushState({}, '', newUrl);
        }
        
        console.log(`多个URL参数已更新`);
    }
    
    /**
     * 从当前URL中解析所有参数
     * @returns {Object} 包含所有参数的对象
     */
    static getAllParams() {
        const url = new URL(window.location.href);
        const params = {};
        
        for (const [key, value] of url.searchParams.entries()) {
            params[key] = value;
        }
        
        return params;
    }
    
    /**
     * 清除所有URL参数
     * @param {boolean} [reload=false] - 是否重新加载页面
     */
    static clearAllParams(reload = false) {
        const url = new URL(window.location.href);
        
        // 构建不带参数的URL
        const newUrl = url.pathname + url.hash;
        
        // 更新浏览器历史
        if (reload) {
            window.location.href = newUrl;
        } else {
            window.history.pushState({}, '', newUrl);
        }
        
        console.log('所有URL参数已清除');
    }
    
    /**
     * 保存当前状态到URL
     * @param {Object} state - 要保存的状态对象
     */
    static saveStateToUrl(state) {
        this.updateParams(state);
    }
    
    /**
     * 从URL恢复状态
     * @returns {Object} 从URL参数恢复的状态对象
     */
    static restoreStateFromUrl() {
        return this.getAllParams();
    }
}

// 导出单例实例，方便直接使用
export default UrlUtils; 