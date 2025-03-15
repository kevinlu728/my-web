/**
 * @file database-handlers.js
 * @description 数据库API的内部处理函数
 * @author 陆凯
 * @created 2024-03-15
 * @updated 2024-03-16
 */

const { notionService } = require('../services/notion-service');
const { formatResponse, handleError, logRequest } = require('../utils/response');
const { validateRequiredFields } = require('../utils/validation');

/**
 * 获取所有数据库列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Promise<Object>} 响应对象
 */
async function getDatabases(req, res) {
  logRequest(req, '获取数据库列表');
  
  try {
    console.log('获取所有数据库列表');
    
    // 确保Notion API密钥可用
    if (!process.env.NOTION_API_KEY && req.notionConfig && req.notionConfig.apiKey) {
      // 如果环境变量中没有，但请求对象中有，则临时设置
      process.env.NOTION_API_KEY = req.notionConfig.apiKey;
      console.log('已从请求对象中获取API密钥');
    }
    
    if (!process.env.NOTION_API_KEY) {
      return formatResponse(res, {
        error: 'API密钥未设置',
        message: '请确保环境变量NOTION_API_KEY已正确设置'
      }, 400);
    }
    
    const data = await notionService.listDatabases();
    return formatResponse(res, data);
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * 获取数据库信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Promise<Object>} 响应对象
 */
async function getDatabaseInfo(req, res) {
  logRequest(req, '获取数据库信息');
  
  try {
    console.log('请求体:', req.body);
    
    // 获取数据库ID，优先使用请求中的，其次使用配置或环境变量中的
    let databaseId = req.body.databaseId;
    
    if (!databaseId && req.notionConfig && req.notionConfig.defaultDatabaseId) {
      databaseId = req.notionConfig.defaultDatabaseId;
      console.log(`使用配置中的数据库ID: ${databaseId}`);
    }
    
    if (!databaseId) {
      databaseId = process.env.NOTION_DATABASE_ID;
      console.log(`使用环境变量中的数据库ID: ${databaseId}`);
    }
    
    if (!databaseId) {
      return formatResponse(res, {
        error: '未提供数据库ID',
        message: '请在请求中提供databaseId或设置环境变量NOTION_DATABASE_ID'
      }, 400);
    }
    
    const data = await notionService.getDatabaseInfo(databaseId);
    return formatResponse(res, data);
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  getDatabases,
  getDatabaseInfo
}; 