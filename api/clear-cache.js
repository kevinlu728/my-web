/**
 * @file clear-cache.js
 * @description 清除缓存API端点
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-10
 */

const { notionService } = require('./notion-service.js');

module.exports = async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    notionService.clearCache();
    res.status(200).json({ message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('清除缓存失败:', error);
    res.status(500).json({ 
      error: '清除缓存失败', 
      message: error.message 
    });
  }
} 