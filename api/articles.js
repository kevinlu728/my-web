/**
 * @file articles.js
 * @description 获取Notion数据库中的文章列表
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-10
 */

const { Client } = require('@notionhq/client');

module.exports = async (req, res) => {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 从请求体中获取数据库ID
    const { database_id } = req.body;
    
    if (!database_id) {
      return res.status(400).json({ error: 'Missing database_id parameter' });
    }
    
    console.log(`Processing request for database: ${database_id}`);
    
    // 从环境变量或请求中获取API密钥
    const notionApiKey = process.env.NOTION_API_KEY || req.headers['x-notion-api-key'];
    
    if (!notionApiKey) {
      return res.status(401).json({ error: 'Missing Notion API key' });
    }
    
    // 初始化Notion客户端
    const notion = new Client({ auth: notionApiKey });
    
    // 查询数据库 - 直接返回原始响应，不做处理
    const response = await notion.databases.query({
      database_id: database_id,
      sorts: [
        {
          timestamp: 'last_edited_time',
          direction: 'descending',
        },
      ],
    });
    
    console.log(`Retrieved ${response.results.length} articles from Notion`);
    
    // 直接返回Notion API的原始响应
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in articles API:', error);
    
    // 返回适当的错误状态码和消息
    if (error.code === 'unauthorized') {
      return res.status(401).json({ error: 'Unauthorized: Invalid Notion API key' });
    } else if (error.code === 'object_not_found') {
      return res.status(404).json({ error: 'Database not found' });
    } else {
      return res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
  }
} 