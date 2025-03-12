/**
 * @file [pageId].js
 * @description 文章内容API端点
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-10
 */

const { notionService } = require('../notion-service.js');

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
    const { pageId } = req.query;
    const pageSize = parseInt(req.query.page_size) || 10;
    const cursor = req.query.cursor;

    console.log(`Fetching article content for page ${pageId}`);
    
    const data = await notionService.getPageContent(pageId, pageSize, cursor);
    
    res.status(200).json({
      page: data.page,
      blocks: data.blocks,
      hasMore: data.hasMore,
      nextCursor: data.nextCursor
    });
  } catch (error) {
    console.error('Error fetching article content:', error);
    res.status(500).json({ 
      error: 'Error fetching article content', 
      message: error.message 
    });
  }
} 