/**
 * @file [id].js
 * @description 获取Notion页面的详细内容
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-10
 */

const { Client } = require('@notionhq/client');

module.exports = async (req, res) => {
  // 获取页面ID
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Missing page ID' });
  }
  
  console.log(`Fetching content for page: ${id}`);
  
  try {
    // 从环境变量或请求中获取API密钥
    const notionApiKey = process.env.NOTION_API_KEY || req.headers['x-notion-api-key'];
    
    if (!notionApiKey) {
      return res.status(401).json({ error: 'Missing Notion API key' });
    }
    
    // 初始化Notion客户端
    const notion = new Client({ auth: notionApiKey });
    
    // 获取页面信息
    const page = await notion.pages.retrieve({ page_id: id });
    
    // 获取页面内容块
    const blocks = await notion.blocks.children.list({
      block_id: id,
      page_size: 100,
    });
    
    // 返回结果
    return res.status(200).json({
      page: page,
      blocks: blocks.results,
      hasMore: blocks.has_more,
      nextCursor: blocks.next_cursor
    });
  } catch (error) {
    console.error('Error fetching article content:', error);
    
    // 返回适当的错误状态码和消息
    if (error.code === 'unauthorized') {
      return res.status(401).json({ error: 'Unauthorized: Invalid Notion API key' });
    } else if (error.code === 'object_not_found') {
      return res.status(404).json({ error: 'Page not found' });
    } else {
      return res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
  }
} 