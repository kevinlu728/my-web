/**
 * @file article-route-utils.js
 * @description 文章路由处理工具，处理URL和路由相关功能
 * @version 1.0.0
 * @created 2024-03-26
 * 
 * 该模块负责：
 * - 文章URL参数处理
 * - 路由状态与页面状态同步
 * - URL历史记录管理
 */

import { UrlUtils } from './url-utils.js';

/**
 * 文章路由工具类
 */
class ArticleRouteUtils {
  /**
   * 更新URL参数中的文章ID
   * @param {string} articleId - 文章ID
   */
  updateArticleParam(articleId) {
    if (!articleId) return;
    
    // 使用UrlUtils更新参数
    UrlUtils.updateParam('article', articleId);
    
    // 移除category参数，因为文章和分类是互斥的状态
    if (UrlUtils.getParam('category')) {
      UrlUtils.removeParam('category');
    }
  }

  /**
   * 更新URL参数中的分类
   * @param {string} category - 分类名称
   */
  updateCategoryParam(category) {
    if (!category) return;
    
    // 使用UrlUtils更新参数
    UrlUtils.updateParam('category', category);
    
    // 移除article参数，因为文章和分类是互斥的状态
    if (UrlUtils.getParam('article')) {
      UrlUtils.removeParam('article');
    }
  }

  /**
   * 从URL初始化状态
   * @param {Function} showArticleCallback - 显示文章的回调函数
   * @param {Function} selectCategoryCallback - 选择分类的回调函数
   * @returns {Promise<boolean>} 是否成功从URL初始化
   */
  async initializeFromUrl(showArticleCallback, selectCategoryCallback) {
    try {
      // 获取URL中的文章ID参数
      const articleId = UrlUtils.getParam('article');
      
      // 如果URL中有文章ID，则加载该文章
      if (articleId) {
        console.log('从URL加载文章:', articleId);
        
        if (typeof showArticleCallback === 'function') {
          await showArticleCallback(articleId);
          return true;
        }
      }
      
      // 获取类别参数
      const category = UrlUtils.getParam('category');
      if (category) {
        console.log('从URL选择类别:', category);
        
        if (typeof selectCategoryCallback === 'function') {
          selectCategoryCallback(category);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('从URL初始化失败:', error);
      return false;
    }
  }
  
  /**
   * 清除所有文章相关的URL参数
   */
  clearArticleParams() {
    UrlUtils.removeParam('article');
    UrlUtils.removeParam('category');
  }
  
  /**
   * 获取URL中的文章ID
   * @returns {string|null} 文章ID或null
   */
  getArticleId() {
    return UrlUtils.getParam('article');
  }
  
  /**
   * 获取URL中的分类
   * @returns {string|null} 分类名称或null
   */
  getCategory() {
    return UrlUtils.getParam('category');
  }
}

// 导出单例实例
export const articleRouteUtils = new ArticleRouteUtils(); 