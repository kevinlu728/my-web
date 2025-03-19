/**
 * @file children.js
 * @description 块子元素API路由处理，根据块ID获取Notion块的子元素
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-10
 * 
 * @deprecated 此文件已弃用，不再使用。请勿修改此文件。
 * 新实现位于 api/services/notion-service.js (核心实现，getBlockChildren方法) 和
 * api/internal/content-handlers.js (处理器，getBlockChildren方法)。
 * 本地环境的路由定义现在位于 server/api/notion-api.mjs。
 * 
 * 调用链：
 * 客户端请求 -> server/core/server.mjs -> notionApiRouter -> 
 * server/api/notion-api.mjs -> contentHandlers.getBlockChildren -> 
 * api/internal/content-handlers.js -> notionService.getBlockChildren ->
 * api/services/notion-service.js -> Notion API
 */

// Notion API 块内容接口
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
      const { blockId } = req.query;
      console.log(`Fetching children blocks for block: ${blockId}`);
      
      const response = await fetch(`https://api.notion.com/v1/blocks/${blockId}/children?page_size=100`, {
        method: 'GET',
        headers: config.notion.headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch block children: ${response.status}`);
      }

      const data = await response.json();
      res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching block children:', error);
      res.status(500).json({ 
        error: 'Error fetching block children', 
        message: error.message 
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 