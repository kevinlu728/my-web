/**
 * @file response.js
 * @description API响应格式化和错误处理工具
 * @created 2024-03-15
 */

/**
 * 统一格式化API成功响应
 * @param {Object} res - Express响应对象
 * @param {*} data - 响应数据
 * @param {number} [status=200] - HTTP状态码
 * @returns {Object} 格式化的响应
 */
function formatResponse(res, data, status = 200) {
  return res.status(status).json(data);
}

/**
 * 统一处理API错误
 * @param {Object} res - Express响应对象
 * @param {Error} error - 错误对象
 * @returns {Object} 格式化的错误响应
 */
function handleError(res, error) {
  console.error('API错误:', error);
  
  // 确定适当的状态码
  let statusCode = 500;
  if (error.message.includes('超时') || error.message.includes('timeout')) {
    statusCode = 504;
  } else if (error.message.includes('未找到') || error.message.includes('not found')) {
    statusCode = 404;
  } else if (error.message.includes('无效') || error.message.includes('invalid')) {
    statusCode = 400;
  }
  
  return res.status(statusCode).json({
    error: '请求处理失败',
    message: error.message,
    timestamp: new Date().toISOString()
  });
}

/**
 * 记录API请求信息
 * @param {Object} req - Express请求对象
 * @param {string} [context=''] - 额外上下文信息
 */
function logRequest(req, context = '') {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const body = JSON.stringify(req.body || {});
  
  console.log(`[${timestamp}] ${method} ${url} ${context}`);
  if (Object.keys(req.body || {}).length > 0) {
    console.log(`请求体: ${body.substring(0, 200)}${body.length > 200 ? '...' : ''}`);
  }
}

module.exports = {
  formatResponse,
  handleError,
  logRequest
}; 