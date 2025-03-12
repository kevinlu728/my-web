/**
 * @file databases.js
 * @description 数据库列表API端点
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-10
 */

const { notionService } = require('./notion-service.js');

module.exports = async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('获取所有数据库列表');
    
    const data = await notionService.listDatabases();
    console.log(`成功获取数据库列表，共 ${data.results?.length || 0} 个数据库`);
    
    res.status(200).json(data);
  } catch (error) {
    console.error('获取数据库列表失败:', error);
    res.status(500).json({ 
      error: '获取数据库列表失败', 
      message: error.message 
    });
  }
} 