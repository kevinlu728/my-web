/**
 * @file hello-handlers.js
 * @description 测试API的内部处理函数
 * @author 陆凯
 * @created 2024-03-15
 * @updated 2024-03-16
 */

const { formatResponse, logRequest } = require('../utils/response');

/**
 * 获取问候信息数据（不发送响应）
 * @returns {Object} 问候数据对象
 */
function getHelloData() {
  return {
    message: 'Hello API 测试成功',
    time: new Date().toISOString(),
    method: 'ANY',
    environment: process.env.NODE_ENV || 'development',
    vercel: true,
    apiVersion: '1.0.0'
  };
}

/**
 * 测试API问候
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Object} 响应对象
 */
function getHello(req, res) {
  logRequest(req, '测试API');
  
  return formatResponse(res, getHelloData());
}

module.exports = {
  getHello,
  getHelloData
}; 