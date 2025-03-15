/**
 * @file validation.js
 * @description API请求验证工具
 * @created 2024-03-15
 */

/**
 * 验证请求体中是否存在必需的字段
 * @param {Object} body - 请求体对象
 * @param {string[]} requiredFields - 必需字段数组
 * @returns {Object|null} 如果验证失败返回错误对象，否则返回null
 */
function validateRequiredFields(body, requiredFields) {
  const missingFields = [];
  
  for (const field of requiredFields) {
    if (body[field] === undefined) {
      missingFields.push(field);
    }
  }
  
  if (missingFields.length > 0) {
    return {
      error: '缺少必需字段',
      missingFields,
      message: `请求缺少以下必需字段: ${missingFields.join(', ')}`
    };
  }
  
  return null;
}

/**
 * 验证HTTP方法
 * @param {string} method - 当前请求方法
 * @param {string[]} allowedMethods - 允许的方法数组
 * @returns {boolean} 如果方法有效则返回true，否则返回false
 */
function validateMethod(method, allowedMethods) {
  return allowedMethods.includes(method);
}

/**
 * 验证Notion数据库ID格式
 * @param {string} databaseId - 数据库ID
 * @returns {boolean} 如果格式有效则返回true，否则返回false
 */
function validateDatabaseId(databaseId) {
  // Notion数据库ID通常是32个字符长度，带有连字符的UUID格式
  return typeof databaseId === 'string' && 
         /^[a-zA-Z0-9]{8}-?[a-zA-Z0-9]{4}-?[a-zA-Z0-9]{4}-?[a-zA-Z0-9]{4}-?[a-zA-Z0-9]{12}$/.test(databaseId);
}

/**
 * 验证Notion页面ID格式
 * @param {string} pageId - 页面ID
 * @returns {boolean} 如果格式有效则返回true，否则返回false
 */
function validatePageId(pageId) {
  // Notion页面ID通常是32个字符长度，带有连字符的UUID格式
  return typeof pageId === 'string' && 
         /^[a-zA-Z0-9]{8}-?[a-zA-Z0-9]{4}-?[a-zA-Z0-9]{4}-?[a-zA-Z0-9]{4}-?[a-zA-Z0-9]{12}$/.test(pageId);
}

/**
 * 验证Notion块ID格式
 * @param {string} blockId - 块ID
 * @returns {boolean} 如果格式有效则返回true，否则返回false
 */
function validateBlockId(blockId) {
  // Notion块ID通常是32个字符长度，带有连字符的UUID格式
  return typeof blockId === 'string' && 
         /^[a-zA-Z0-9]{8}-?[a-zA-Z0-9]{4}-?[a-zA-Z0-9]{4}-?[a-zA-Z0-9]{4}-?[a-zA-Z0-9]{12}$/.test(blockId);
}

module.exports = {
  validateRequiredFields,
  validateMethod,
  validateDatabaseId,
  validatePageId,
  validateBlockId
}; 