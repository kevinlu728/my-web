/**
 * @file articles.js
 * @description 文章列表API路由处理，负责获取和过滤Notion数据库中的文章
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-10
 * 
 * @deprecated 此文件已弃用，不再使用。请勿修改此文件。
 * 新实现位于 api/services/notion-service.js (核心实现) 和
 * api/internal/article-handlers.js (处理器)。
 * 本地环境的路由定义现在位于 server/api/notion-api.mjs。
 * 
 * 调用链：
 * 客户端请求 -> server/core/server.mjs -> notionApiRouter -> 
 * server/api/notion-api.mjs -> articleHandlers.getArticles -> 
 * api/internal/article-handlers.js -> notionService.queryDatabase ->
 * api/services/notion-service.js -> Notion API
 */

// Notion API 文章列表接口
import fetch from 'node-fetch';

// 基础配置
const config = {
  notion: {
    apiKey: process.env.NOTION_API_KEY || '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',
    defaultDatabaseId: process.env.NOTION_DATABASE_ID || '1a932af826e680df8bf7f320b51930b9',
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_API_KEY || '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'}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    }
  }
};

// 查询数据库
async function queryDatabase(databaseId = config.notion.defaultDatabaseId) {
  try {
    console.log(`Querying Notion database: ${databaseId}`);
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: config.notion.headers,
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Notion API error: ${response.status}`, errorText);
      throw new Error(`请求失败: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in queryDatabase:', error);
    throw error;
  }
}

// Vercel API 处理函数
export default async function handler(req, res) {
  console.log('API route /api/articles called with method:', req.method);
  
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只处理 POST 请求
  if (req.method === 'POST') {
    try {
      console.log('Request body:', req.body);
      const databaseId = req.body?.database_id || config.notion.defaultDatabaseId;
      console.log('Using database ID:', databaseId);
      
      const data = await queryDatabase(databaseId);
      console.log('Notion API response received');
      
      if (data.results?.length > 0) {
        console.log(`Found ${data.results.length} articles`);
        data.results.sort((a, b) => {
          const timeA = new Date(a.created_time || 0);
          const timeB = new Date(b.created_time || 0);
          return timeB - timeA;
        });
      } else {
        console.log('No articles found in response');
      }
      
      res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching articles:', error);
      res.status(error.message.includes('超时') ? 504 : 500).json({ 
        error: 'Failed to fetch articles', 
        message: error.message 
      });
    }
  } else {
    console.log('Method not allowed:', req.method);
    res.status(405).json({ error: 'Method not allowed' });
  }
} 