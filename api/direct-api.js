/**
 * 直接API实现
 * 不依赖于@notionhq/client库，直接使用fetch调用Notion API
 * 用作备份方案，以防依赖问题无法解决
 */

const cors = require('cors');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 配置
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const API_VERSION = '2022-06-28';
const NOTION_API_BASE_URL = 'https://api.notion.com/v1';

// CORS处理
const corsHandler = cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

// 直接实现的Notion API调用
async function queryNotionDatabase(databaseId, params = {}) {
  const url = `${NOTION_API_BASE_URL}/databases/${databaseId}/query`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': API_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Notion API error: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}

async function getNotionPage(pageId) {
  const url = `${NOTION_API_BASE_URL}/pages/${pageId}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': API_VERSION
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Notion API error: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}

async function getBlockChildren(blockId) {
  const url = `${NOTION_API_BASE_URL}/blocks/${blockId}/children`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': API_VERSION
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Notion API error: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}

// 主处理函数
module.exports = async (req, res) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return corsHandler(req, res, () => {
      return res.status(200).end();
    });
  }
  
  // 应用CORS
  return corsHandler(req, res, async () => {
    try {
      const { method, query, body, url } = req;
      const path = url.split('?')[0];
      
      console.log(`[直接API] 处理请求: ${method} ${url}`);
      
      // 检查环境配置是否有效
      if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
        console.error('[直接API] 环境配置无效，API请求被拒绝');
        return res.status(500).json({
          error: true,
          message: '服务器配置错误：环境变量未正确设置',
          timestamp: new Date().toISOString(),
          config: {
            hasApiKey: !!NOTION_API_KEY,
            hasDatabaseId: !!NOTION_DATABASE_ID
          }
        });
      }
      
      // 根据路径路由到不同的处理逻辑
      if (path.includes('/hello') || path.includes('/status')) {
        // Hello API - 检查API状态
        const response = {
          hello: {
            message: "Hello API 测试成功",
            time: new Date().toISOString(),
            method: req.method || 'ANY',
            environment: process.env.NODE_ENV || 'development',
            vercel: !!process.env.VERCEL || false,
            apiVersion: "1.0.0",
            implementation: "direct-api"
          },
          status: "online",
          time: new Date().toISOString(),
          service: {
            connected: true,
            apiVersion: API_VERSION,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            databaseId: NOTION_DATABASE_ID ? NOTION_DATABASE_ID.substring(0, 9) + '...' : 'not set'
          },
          env: {
            nodeEnv: process.env.NODE_ENV || 'development',
            hasNotionKey: !!NOTION_API_KEY,
            hasNotionDb: !!NOTION_DATABASE_ID
          }
        };
        
        return res.status(200).json(response);
      } else if (path.includes('/articles')) {
        // 文章列表API
        if (req.method !== 'POST') {
          return res.status(405).json({
            error: true,
            message: "文章列表API仅支持POST方法"
          });
        }
        
        console.log('[直接API] 文章列表请求体:', JSON.stringify(req.body));
        
        const databaseId = req.body.databaseId || req.body.database_id || NOTION_DATABASE_ID;
        const filter = req.body.filter;
        const sorts = req.body.sorts;
        const pageSize = req.body.pageSize || req.body.page_size || 100;
        const startCursor = req.body.startCursor || req.body.start_cursor;
        const limit = req.body.limit;
        
        if (!databaseId) {
          return res.status(400).json({
            error: true,
            message: "缺少必要的数据库ID参数",
            debug: {
              body: req.body,
              defaultDatabaseId: NOTION_DATABASE_ID ? '已设置' : '未设置'
            }
          });
        }
        
        // 构建查询参数
        const queryParams = {
          page_size: Math.min(pageSize, 100)
        };
        
        if (startCursor) {
          queryParams.start_cursor = startCursor;
        }
        
        if (filter) {
          queryParams.filter = filter;
        }
        
        if (sorts) {
          queryParams.sorts = sorts;
        }
        
        try {
          const response = await queryNotionDatabase(databaseId, queryParams);
          
          // 处理结果
          const results = limit && limit < response.results.length 
            ? response.results.slice(0, limit) 
            : response.results;
          
          return res.status(200).json({
            success: true,
            results,
            hasMore: response.has_more,
            nextCursor: response.next_cursor
          });
        } catch (error) {
          console.error('[直接API] Notion API错误:', error);
          return res.status(500).json({
            error: true,
            message: `Notion API错误: ${error.message}`,
            timestamp: new Date().toISOString()
          });
        }
      } else if (path.includes('/article-content') || (path.includes('/content') && query.type === 'article')) {
        // 文章内容API
        const pageId = req.query.pageId || query.pageId;
        
        if (!pageId) {
          return res.status(400).json({
            error: true,
            message: "缺少必要的pageId参数"
          });
        }
        
        try {
          // 获取页面信息
          const page = await getNotionPage(pageId);
          
          // 获取页面块
          const blocks = await getBlockChildren(pageId);
          
          return res.status(200).json({
            page,
            blocks: blocks.results,
            hasMore: blocks.has_more,
            nextCursor: blocks.next_cursor
          });
        } catch (error) {
          console.error('[直接API] Notion API错误:', error);
          return res.status(500).json({
            error: true,
            message: `Notion API错误: ${error.message}`,
            timestamp: new Date().toISOString()
          });
        }
      } else if (path.includes('/blocks') && path.includes('/children')) {
        // 块内容API
        const blockId = req.query.blockId || query.blockId;
        
        if (!blockId) {
          return res.status(400).json({
            error: true,
            message: "缺少必要的blockId参数"
          });
        }
        
        try {
          const response = await getBlockChildren(blockId);
          
          return res.status(200).json({
            blocks: response.results,
            results: response.results,
            hasMore: response.has_more,
            has_more: response.has_more,
            nextCursor: response.next_cursor,
            next_cursor: response.next_cursor
          });
        } catch (error) {
          console.error('[直接API] Notion API错误:', error);
          return res.status(500).json({
            error: true,
            message: `Notion API错误: ${error.message}`,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        // 未知API路径
        return res.status(404).json({
          error: true,
          message: `未找到API路径: ${path}`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('[直接API] 处理错误:', error);
      return res.status(500).json({
        error: true,
        status: error.status || 500,
        message: error.message || '未知错误',
        timestamp: new Date().toISOString()
      });
    }
  });
}; 