/**
 * @file [pageId].js
 * @description 文章内容API路由处理，根据页面ID获取Notion页面的完整内容
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-10
 */

// Notion API 文章内容接口
// 使用 CommonJS 风格导入，兼容 Vercel 环境
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// 基础配置
const config = {
  notion: {
    apiKey: process.env.NOTION_API_KEY || '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',
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_API_KEY || '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'}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    }
  }
};

// 获取所有块内容
async function getAllBlockChildren(blockId, pageSize = 100, startCursor = undefined, fetchAll = false) {
  let allBlocks = [];
  let hasMore = true;
  let nextCursor = startCursor;

  try {
    // 如果不是获取所有内容，只获取一页
    if (!fetchAll) {
      const response = await fetch(
        `https://api.notion.com/v1/blocks/${blockId}/children?page_size=${pageSize}${nextCursor ? `&start_cursor=${nextCursor}` : ''}`,
        {
          method: 'GET',
          headers: config.notion.headers
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch blocks: ${response.status}`);
      }

      const data = await response.json();
      return {
        blocks: data.results,
        hasMore: data.has_more,
        nextCursor: data.next_cursor
      };
    }

    // 获取所有内容的逻辑
    while (hasMore) {
      const response = await fetch(
        `https://api.notion.com/v1/blocks/${blockId}/children?page_size=${pageSize}${nextCursor ? `&start_cursor=${nextCursor}` : ''}`,
        {
          method: 'GET',
          headers: config.notion.headers
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch blocks: ${response.status}`);
      }

      const data = await response.json();
      allBlocks = allBlocks.concat(data.results);
      hasMore = data.has_more;
      nextCursor = data.next_cursor;
    }

    return {
      blocks: allBlocks,
      hasMore: false,
      nextCursor: null
    };
  } catch (error) {
    console.error('Error in getAllBlockChildren:', error);
    throw error;
  }
}

// 获取页面内容
async function getPageContent(pageId, pageSize = 10, cursor = undefined) {
  try {
    const [pageData, blocksData] = await Promise.all([
      fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        method: 'GET',
        headers: config.notion.headers
      }).then(res => {
        if (!res.ok) throw new Error(`Failed to fetch page: ${res.status}`);
        return res.json();
      }),
      getAllBlockChildren(pageId, pageSize, cursor, false)
    ]);

    return {
      page: pageData,
      ...blocksData
    };
  } catch (error) {
    console.error('Error in getPageContent:', error);
    throw error;
  }
}

// 导出处理函数
module.exports = async (req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只处理 GET 请求
  if (req.method === 'GET') {
    try {
      const { pageId } = req.query;
      const pageSize = parseInt(req.query.page_size) || 10;
      const cursor = req.query.cursor;

      console.log(`Fetching article content for page ${pageId} with pageSize ${pageSize} and cursor ${cursor}`);
      
      const data = await getPageContent(pageId, pageSize, cursor);
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
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 