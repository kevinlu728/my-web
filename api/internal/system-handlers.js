/**
 * @file system-handlers.js
 * @description 系统相关API的内部处理函数
 * @author 陆凯
 * @created 2024-03-15
 */

const { notionService } = require('../services/notion-service');
const { formatResponse, handleError, logRequest } = require('../utils/response');

/**
 * 清除缓存
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Promise<Object>} 响应对象
 */
async function clearCache(req, res) {
  logRequest(req, '清除缓存');
  
  try {
    notionService.clearCache();
    return formatResponse(res, { 
      message: '缓存清除成功',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * 获取系统状态
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Promise<Object>} 响应对象
 */
async function getSystemStatus(req, res) {
  logRequest(req, '获取系统状态');
  
  try {
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      notionApiConnected: true,
      version: '1.0.0'
    };
    
    // 可以添加额外的系统检查逻辑
    
    return formatResponse(res, status);
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  clearCache,
  getSystemStatus
}; 