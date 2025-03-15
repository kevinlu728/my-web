/**
 * @file article-handlers.js
 * @description 文章API的内部处理函数
 * @author 陆凯
 * @created 2024-03-15
 * @updated 2024-03-16
 */

const { notionService } = require('../services/notion-service');
const { formatResponse, handleError, logRequest } = require('../utils/response');
const { validateRequiredFields } = require('../utils/validation');

/**
 * 获取文章列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Promise<Object>} 响应对象
 */
async function getArticles(req, res) {
  logRequest(req, '获取文章列表');
  
  try {
    // 1. 获取数据库ID，优先从请求中获取，其次从请求对象的notionConfig获取，最后尝试环境变量
    let databaseId = req.body.databaseId;
    
    // 如果请求中没有，尝试从req.notionConfig获取
    if (!databaseId && req.notionConfig && req.notionConfig.defaultDatabaseId) {
      databaseId = req.notionConfig.defaultDatabaseId;
      console.log(`使用请求对象中的数据库ID: ${databaseId}`);
    }
    
    // 如果仍然没有，尝试从环境变量获取
    if (!databaseId) {
      databaseId = process.env.NOTION_DATABASE_ID;
      console.log(`使用环境变量中的数据库ID: ${databaseId}`);
    }
    
    // 最终还是没有，则返回错误
    if (!databaseId) {
      return formatResponse(res, {
        error: '未提供数据库ID',
        message: '请在请求中提供databaseId或设置环境变量NOTION_DATABASE_ID'
      }, 400);
    }
    
    console.log(`使用数据库ID: ${databaseId}`);
    
    // 2. 调用服务获取数据
    const data = await notionService.queryDatabase(databaseId);
    
    // 3. 构建并返回响应
    return formatResponse(res, {
      success: true,
      results: data.results,
      hasMore: data.has_more,
      nextCursor: data.next_cursor
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  getArticles
}; 