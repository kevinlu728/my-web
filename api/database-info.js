/**
 * @file database-info.js
 * @description 数据库信息API端点
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
    const { database_id } = req.body;
    
    if (!database_id) {
      return res.status(400).json({ error: '缺少数据库ID' });
    }
    
    console.log(`获取数据库信息，数据库ID: ${database_id}`);
    
    const data = await notionService.getDatabaseInfo(database_id);
    console.log(`成功获取数据库信息: ${database_id}`);
    
    res.status(200).json(data);
  } catch (error) {
    console.error('获取数据库信息失败:', error);
    res.status(500).json({ 
      error: '获取数据库信息失败', 
      message: error.message 
    });
  }
} 