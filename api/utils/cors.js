/**
 * @file cors.js
 * @description CORS处理工具
 * @created 2024-03-15
 */

/**
 * 设置CORS头
 * @param {Object} res - 响应对象
 * @param {string[]} [methods=['GET', 'OPTIONS', 'POST']] - 允许的HTTP方法
 */
function setCorsHeaders(res, methods = ['GET', 'OPTIONS', 'POST']) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods.join(','));
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
}

/**
 * 处理OPTIONS请求
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {boolean} 如果是OPTIONS请求并已处理则返回true，否则返回false
 */
function handleOptionsRequest(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

/**
 * 处理CORS逻辑（同时设置头和处理OPTIONS请求）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {string[]} [methods=['GET', 'OPTIONS', 'POST']] - 允许的HTTP方法
 * @returns {boolean} 如果是OPTIONS请求并已处理则返回true，否则返回false
 */
function handleCors(req, res, methods = ['GET', 'OPTIONS', 'POST']) {
  setCorsHeaders(res, methods);
  return handleOptionsRequest(req, res);
}

module.exports = {
  setCorsHeaders,
  handleOptionsRequest,
  handleCors
}; 