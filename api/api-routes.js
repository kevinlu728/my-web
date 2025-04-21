/**
 * @file api-routes.js
 * @description 统一的API路由入口点，用于减少Vercel部署的Serverless Functions数量
 * @author 陆凯
 * @created 2024-03-15
 * @version 1.0.0
 */

// 内联所有必要的依赖，避免在Vercel部署中出现依赖错误
// 这种方法可能影响代码大小，但能解决依赖解析问题
try {
  // 定义最关键的依赖，这些会在@notionhq/client内部被引用
  // 使用global对象使其在整个运行时可用
  if (!global.whatwgUrl) {
    try {
      global.whatwgUrl = require('whatwg-url');
      console.log('已全局加载: whatwg-url');
    } catch (e) {
      console.warn('无法加载whatwg-url:', e.message);
    }
  }
  
  if (!global.webidlConversions) {
    try {
      global.webidlConversions = require('webidl-conversions');
      console.log('已全局加载: webidl-conversions');
    } catch (e) {
      console.warn('无法加载webidl-conversions:', e.message);
    }
  }
  
  if (!global.tr46) {
    try {
      global.tr46 = require('tr46');
      console.log('已全局加载: tr46');
    } catch (e) {
      console.warn('无法加载tr46:', e.message);
    }
  }
  
  // 为了确保依赖被正确加载，在每个关键路径都显式加载依赖
  // 修补Node.js的模块加载系统
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  // 保存原始require方法，并使用自定义require方法覆盖
  Module.prototype.require = function patched(id) {
    if (id === 'whatwg-url') {
      if (global.whatwgUrl) {
        return global.whatwgUrl;
      }
    } else if (id === 'webidl-conversions') {
      if (global.webidlConversions) {
        return global.webidlConversions;
      }
    } else if (id === 'tr46') {
      if (global.tr46) {
        return global.tr46;
      }
    }
    
    // 如果不是我们处理的模块，调用原始的require
    return originalRequire.apply(this, arguments);
  };
  
  console.log('依赖加载成功: whatwg-url, webidl-conversions, tr46');
} catch (err) {
  console.warn('依赖加载警告 (可忽略):', err.message);
}

// 使用CommonJS兼容导入方式
const { Client } = require('@notionhq/client');
// 移除cors依赖
// const cors = require('cors');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 配置
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const API_VERSION = '2022-06-28';

// 检查环境配置
function checkEnvironment() {
  console.log('API服务初始化...');
  console.log('环境检查:');
  console.log('- 运行环境:', process.env.NODE_ENV || 'development');
  console.log('- NOTION_API_KEY:', NOTION_API_KEY ? '已设置' : '未设置');
  console.log('- NOTION_DATABASE_ID:', NOTION_DATABASE_ID ? '已设置' : '未设置');
  console.log('- API_VERSION:', API_VERSION);
  
  if (!NOTION_API_KEY) {
    console.error('错误: NOTION_API_KEY 环境变量未设置!');
  }
  
  if (!NOTION_DATABASE_ID) {
    console.error('错误: NOTION_DATABASE_ID 环境变量未设置!');
  }
  
  return {
    isConfigValid: !!NOTION_API_KEY && !!NOTION_DATABASE_ID,
    environment: process.env.NODE_ENV || 'development',
    hasApiKey: !!NOTION_API_KEY,
    hasDatabaseId: !!NOTION_DATABASE_ID
  };
}

// 执行环境检查
const environmentStatus = checkEnvironment();

// 初始化Notion客户端
const notion = new Client({
  auth: NOTION_API_KEY,
  notionVersion: API_VERSION
});

// 通用响应格式化
function formatResponse(status, data) {
  return {
    status,
    timestamp: new Date().toISOString(),
    data
  };
}

// 错误处理
function handleError(res, error) {
  // 添加详细的错误日志
  console.error('API错误:', error);
  console.error('错误堆栈:', error.stack);
  
  // 检查环境变量状态
  console.log('环境变量检查:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- NOTION_API_KEY 是否设置:', !!process.env.NOTION_API_KEY);
  console.log('- NOTION_DATABASE_ID 是否设置:', !!process.env.NOTION_DATABASE_ID);
  console.log('- API_VERSION:', API_VERSION);
  
  const status = error.status || 500;
  const message = error.message || '未知错误';
  
  return res.status(status).json({
    error: true,
    status,
    message,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    debug: {
      hasApiKey: !!process.env.NOTION_API_KEY,
      hasDatabaseId: !!process.env.NOTION_DATABASE_ID,
      apiVersion: API_VERSION
    }
  });
}

// 移除CORS处理器
// const corsHandler = cors({
//   origin: '*',
//   methods: ['GET', 'POST', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// });

// 设置CORS头的函数
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// 主处理函数
module.exports = async (req, res) => {
  // 设置CORS头
  setCorsHeaders(res);
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { method, query, body, url } = req;
    const path = url.split('?')[0];
    
    console.log(`处理API请求: ${method} ${url}`);
    console.log('解析后的路径:', path);
    console.log('查询参数:', query);
    
    // 简化的/api/status端点 - 直接返回成功状态
    if (path === '/api/status') {
      console.log('处理API状态请求');
      return res.status(200).json({ 
        status: 'online',
        time: new Date().toISOString(),
        service: 'notion-blog-api',
        message: '服务正常运行中'
      });
    }
    
    // 检查环境配置是否有效
    if (!environmentStatus.isConfigValid && !path.includes('/hello') && !path.includes('/status')) {
      console.error('环境配置无效，API请求被拒绝');
      return res.status(500).json({
        error: true,
        message: '服务器配置错误：环境变量未正确设置',
        timestamp: new Date().toISOString(),
        config: environmentStatus
      });
    }
    
    // 根据路径路由到不同的处理逻辑
    if (path.includes('/hello') || path.includes('/status')) {
      // Hello API - 检查API状态
      return handleHelloApi(req, res);
    } else if (path.includes('/article-content') || (path.includes('/content') && query.type === 'article-content')) {
      // 文章内容API
      return handleArticleContentApi(req, res);
    } else if (path.includes('/blocks') && path.includes('/children')) {
      // 块内容API
      return handleBlockChildrenApi(req, res);
    } else if (path.includes('/articles')) {
      // 文章列表API
      return handleArticlesApi(req, res);
    } else if (path.includes('/photos')) {
      // 照片列表API
      return handlePhotosApi(req, res);
    } else if (path.includes('/database-info') || path.includes('/databases')) {
      // 数据库API
      return handleDatabaseApi(req, res);
    } else if (path.includes('/clear-cache')) {
      // 清除缓存API
      return handleClearCacheApi(req, res);
    } else {
      // 未知API路径
      return res.status(404).json({
        error: true,
        message: `未找到API路径: ${path}`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    return handleError(res, error);
  }
};

// Hello API处理器
async function handleHelloApi(req, res) {
  try {
    const response = {
      hello: {
        message: "Hello API 测试成功",
        time: new Date().toISOString(),
        method: req.method || 'ANY',
        environment: process.env.NODE_ENV || 'development',
        vercel: !!process.env.VERCEL || false,
        apiVersion: "1.0.0"
      },
      status: "online",
      time: new Date().toISOString(),
      service: {
        connected: !!NOTION_API_KEY && !!NOTION_DATABASE_ID,
        apiVersion: API_VERSION,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        databaseId: NOTION_DATABASE_ID ? NOTION_DATABASE_ID.substring(0, 9) + '...' : 'not set'
      },
      config: environmentStatus,
      env: {
        nodeEnv: process.env.NODE_ENV || 'development',
        hasNotionKey: !!NOTION_API_KEY,
        hasNotionDb: !!NOTION_DATABASE_ID
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    return handleError(res, error);
  }
}

// 文章内容API处理器
async function handleArticleContentApi(req, res) {
  try {
    const { pageId, cursor } = req.query;
    
    if (!pageId) {
      return res.status(400).json({
        error: true,
        message: "缺少必要的pageId参数"
      });
    }
    
    console.log(`[文章内容API] 请求参数: pageId=${pageId}, cursor=${cursor || '无'}`);
    
    // 获取页面信息
    const page = await notion.pages.retrieve({ page_id: pageId });
    
    // 获取页面块 - 如果有cursor参数，则使用cursor
    const blocksRequest = {
      block_id: pageId,
      page_size: 10 // 每次获取10个块
    };
    
    // 如果有cursor参数，添加到请求中
    if (cursor) {
      blocksRequest.start_cursor = cursor;
    }
    
    console.log(`[文章内容API] 获取块参数:`, blocksRequest);
    
    // 获取页面块
    const blocks = await notion.blocks.children.list(blocksRequest);
    
    return res.status(200).json({
      page,
      blocks: blocks.results,
      hasMore: blocks.has_more,
      nextCursor: blocks.next_cursor
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// 块内容API处理器
async function handleBlockChildrenApi(req, res) {
  try {
    const { blockId } = req.query;
    
    if (!blockId) {
      return res.status(400).json({
        error: true,
        message: "缺少必要的blockId参数"
      });
    }
    
    // 获取块的子块
    const response = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100
    });
    
    return res.status(200).json({
      blocks: response.results,
      results: response.results,
      hasMore: response.has_more,
      has_more: response.has_more,
      nextCursor: response.next_cursor,
      next_cursor: response.next_cursor
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// 文章列表API处理器
async function handleArticlesApi(req, res) {
  try {
    // 检查环境变量是否有效
    if (!environmentStatus.isConfigValid) {
      console.log('[文章列表API] 环境变量未正确配置，返回示例数据');
      return res.status(200).json({
        success: true,
        results: [
          {
            id: 'example-1',
            properties: {
              Title: {
                title: [{ plain_text: '示例文章 - 环境变量未配置' }]
              },
              Description: {
                rich_text: [{ plain_text: '这是一个示例文章。请配置正确的NOTION_API_KEY和NOTION_DATABASE_ID环境变量。' }]
              },
              Date: {
                date: { start: new Date().toISOString() }
              },
              Tags: {
                multi_select: [{ name: '示例' }, { name: 'API演示' }]
              },
              Status: {
                select: { name: 'published' }
              }
            }
          }
        ],
        articles: [
          {
            id: 'example-1',
            properties: {
              Title: {
                title: [{ plain_text: '示例文章 - 环境变量未配置' }]
              },
              Description: {
                rich_text: [{ plain_text: '这是一个示例文章。请配置正确的NOTION_API_KEY和NOTION_DATABASE_ID环境变量。' }]
              },
              Date: {
                date: { start: new Date().toISOString() }
              },
              Tags: {
                multi_select: [{ name: '示例' }, { name: 'API演示' }]
              },
              Status: {
                select: { name: 'published' }
              }
            }
          }
        ],
        hasMore: false,
        has_more: false,
        nextCursor: null,
        next_cursor: null,
        message: '返回示例数据 - 环境变量未正确配置'
      });
    }
    
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: true,
        message: "文章列表API仅支持POST方法"
      });
    }
    
    console.log('[文章列表API] 请求体:', JSON.stringify(req.body));
    console.log('[文章列表API] 请求头:', JSON.stringify(req.headers, null, 2));
    
    // 在处理请求参数的地方更新数据库ID获取逻辑
    let databaseId = req.body.databaseId || req.body.database_id || NOTION_DATABASE_ID;

    // 如果未提供，尝试从环境变量获取博客文章数据库ID
    if (!databaseId) {
      // 尝试获取博客文章专用数据库ID
      const blogArticlesId = process.env.NOTION_DATABASE_BLOGARTICALS_ID;
      databaseId = blogArticlesId || process.env.NOTION_DATABASE_ID;
    }
    
    const filter = req.body.filter;
    const sorts = req.body.sorts;
    const pageSize = req.body.pageSize || req.body.page_size || 100;
    const startCursor = req.body.startCursor || req.body.start_cursor;
    const limit = req.body.limit;
    
    // 记录解析后的参数
    console.log('[文章列表API] 解析后的参数:', {
      databaseId,
      originalDatabaseId: req.body.database_id,
      newDatabaseId: req.body.databaseId,
      defaultId: NOTION_DATABASE_ID,
      filter: !!filter,
      sorts: !!sorts,
      pageSize,
      startCursor,
      limit
    });
    
    if (!databaseId) {
      console.error('[文章列表API] 错误: 缺少databaseId参数');
      console.error('[文章列表API] 请求体详情:', req.body);
      console.error('[文章列表API] 环境变量检查:', {
        NOTION_DATABASE_ID_SET: !!NOTION_DATABASE_ID,
        NOTION_API_KEY_SET: !!NOTION_API_KEY
      });
      
      return res.status(400).json({
        error: true,
        message: "缺少必要的数据库ID参数",
        debug: {
          body: req.body,
          defaultDatabaseId: NOTION_DATABASE_ID ? '已设置' : '未设置'
        }
      });
    }
    
    console.log('[文章列表API] 使用数据库ID:', databaseId);
    
    // 构建查询参数
    const queryParams = {
      database_id: databaseId,
      page_size: Math.min(pageSize, 100) // Notion API限制最大100
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
    
    console.log('[文章列表API] 查询参数:', JSON.stringify(queryParams));
    
    try {
      console.log('[文章列表API] 发送请求到Notion API...');
      console.log('[文章列表API] Notion环境检查:', {
        API_KEY: NOTION_API_KEY ? '已设置(长度:' + NOTION_API_KEY.length + ')' : '未设置',
        DATABASE_ID: NOTION_DATABASE_ID ? '已设置(长度:' + NOTION_DATABASE_ID.length + ')' : '未设置',
        API_VERSION
      });
      
      const start = Date.now();
      const response = await notion.databases.query(queryParams);
      const duration = Date.now() - start;
      console.log(`[文章列表API] Notion响应时间: ${duration}ms`);
      console.log(`[文章列表API] 响应状态: 成功, 结果数量: ${response.results?.length || 0}`);
      
      // 处理结果 - 不限制返回数量
      const results = response.results;
      
      console.log(`[文章列表API] 获取到${results.length}篇文章`);
      
      // 为兼容性增加双重格式响应
      return res.status(200).json({
        success: true,
        results,
        articles: results, // 为兼容旧版本代码
        hasMore: response.has_more,
        has_more: response.has_more, // 兼容旧版本
        nextCursor: response.next_cursor,
        next_cursor: response.next_cursor // 兼容旧版本
      });
    } catch (notionError) {
      console.error('[文章列表API] Notion API错误:', notionError);
      console.error('[文章列表API] 错误详情:', {
        message: notionError.message,
        code: notionError.code,
        status: notionError.status,
        stack: notionError.stack,
        query: queryParams
      });
      
      return res.status(500).json({
        error: true,
        message: `Notion API错误: ${notionError.message}`,
        code: notionError.code,
        status: notionError.status,
        details: notionError.details,
        timestamp: new Date().toISOString(),
        params: queryParams,
        debug: {
          statusText: notionError.statusText || 'Unknown',
          hasApiKey: !!NOTION_API_KEY,
          hasDatabaseId: !!NOTION_DATABASE_ID
        }
      });
    }
  } catch (error) {
    console.error('[文章列表API] 处理错误:', error);
    console.error('[文章列表API] 错误堆栈:', error.stack);
    return handleError(res, error);
  }
}

// 照片列表API处理器
async function handlePhotosApi(req, res) {
  try {
    // 检查环境变量是否有效
    if (!environmentStatus.isConfigValid) {
      console.log('[照片列表API] 环境变量未正确配置，返回示例数据');
      return res.status(200).json({
        success: true,
        results: [
          {
            id: 'example-1',
            properties: {
              Title: {
                title: [{ plain_text: '示例照片 - 环境变量未配置' }]
              },
              Description: {
                rich_text: [{ plain_text: '这是一个示例照片。请配置正确的NOTION_API_KEY和NOTION_DATABASE_LIFEPHOTOS_ID环境变量。' }]
              },
              "Photo Date": {
                date: { start: new Date().toISOString() }
              },
              Category: {
                select: { name: 'Travel' }
              },
              "Thumbnail": {
                url: "https://img.clouddweller.cn/example.webp"
              }
            }
          }
        ],
        photos: [
          {
            id: 'example-1',
            properties: {
              Title: {
                title: [{ plain_text: '示例照片 - 环境变量未配置' }]
              },
              Description: {
                rich_text: [{ plain_text: '这是一个示例照片。请配置正确的NOTION_API_KEY和NOTION_DATABASE_LIFEPHOTOS_ID环境变量。' }]
              },
              "Photo Date": {
                date: { start: new Date().toISOString() }
              },
              Category: {
                select: { name: 'Travel' }
              },
              "Thumbnail": {
                url: "https://img.clouddweller.cn/example.webp"
              }
            }
          }
        ],
        hasMore: false,
        has_more: false,
        nextCursor: null,
        next_cursor: null,
        message: '返回示例数据 - 环境变量未正确配置'
      });
    }
    
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: true,
        message: "照片列表API仅支持POST方法"
      });
    }
    
    console.log('[照片列表API] 请求体:', JSON.stringify(req.body));
    console.log('[照片列表API] 请求头:', JSON.stringify(req.headers, null, 2));
    
    // 获取数据库ID
    let databaseId = req.body.lifeDatabaseId || req.body.databaseId || process.env.NOTION_DATABASE_LIFEPHOTOS_ID;
    
    const filter = req.body.filter;
    const sorts = req.body.sorts;
    const pageSize = req.body.pageSize || req.body.page_size || 100;
    const startCursor = req.body.startCursor || req.body.start_cursor;
    const limit = req.body.limit;
    
    // 记录解析后的参数
    console.log('[照片列表API] 解析后的参数:', {
      databaseId,
      originalLifeDatabaseId: req.body.lifeDatabaseId,
      newDatabaseId: req.body.databaseId,
      defaultId: process.env.NOTION_DATABASE_LIFEPHOTOS_ID,
      filter: !!filter,
      sorts: !!sorts,
      pageSize,
      startCursor,
      limit
    });
    
    if (!databaseId) {
      console.error('[照片列表API] 错误: 缺少databaseId参数');
      console.error('[照片列表API] 请求体详情:', req.body);
      console.error('[照片列表API] 环境变量检查:', {
        NOTION_DATABASE_LIFEPHOTOS_ID_SET: !!process.env.NOTION_DATABASE_LIFEPHOTOS_ID,
        NOTION_API_KEY_SET: !!NOTION_API_KEY
      });
      
      return res.status(400).json({
        error: true,
        message: "缺少必要的数据库ID参数",
        debug: {
          body: req.body,
          defaultDatabaseId: process.env.NOTION_DATABASE_LIFEPHOTOS_ID ? '已设置' : '未设置'
        }
      });
    }
    
    console.log('[照片列表API] 使用数据库ID:', databaseId);
    
    // 构建查询参数
    const queryParams = {
      database_id: databaseId,
      page_size: Math.min(pageSize, 100) // Notion API限制最大100
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
    
    console.log('[照片列表API] 查询参数:', JSON.stringify(queryParams));
    
    try {
      console.log('[照片列表API] 发送请求到Notion API...');
      console.log('[照片列表API] Notion环境检查:', {
        API_KEY: NOTION_API_KEY ? '已设置(长度:' + NOTION_API_KEY.length + ')' : '未设置',
        DATABASE_ID: process.env.NOTION_DATABASE_LIFEPHOTOS_ID ? '已设置(长度:' + process.env.NOTION_DATABASE_LIFEPHOTOS_ID.length + ')' : '未设置',
        API_VERSION
      });
      
      const start = Date.now();
      const response = await notion.databases.query(queryParams);
      const duration = Date.now() - start;
      console.log(`[照片列表API] Notion响应时间: ${duration}ms`);
      console.log(`[照片列表API] 响应状态: 成功, 结果数量: ${response.results?.length || 0}`);
      
      // 处理结果
      const results = response.results;
      
      console.log(`[照片列表API] 获取到${results.length}张照片`);
      
      // 为兼容性增加双重格式响应
      return res.status(200).json({
        success: true,
        results,
        photos: results, // 为兼容性添加photos字段
        hasMore: response.has_more,
        has_more: response.has_more, // 兼容旧版本
        nextCursor: response.next_cursor,
        next_cursor: response.next_cursor // 兼容旧版本
      });
    } catch (notionError) {
      console.error('[照片列表API] Notion API错误:', notionError);
      console.error('[照片列表API] 错误详情:', {
        message: notionError.message,
        code: notionError.code,
        status: notionError.status,
        stack: notionError.stack,
        query: queryParams
      });
      
      return res.status(500).json({
        error: true,
        message: `Notion API错误: ${notionError.message}`,
        code: notionError.code,
        status: notionError.status,
        details: notionError.details,
        timestamp: new Date().toISOString(),
        params: queryParams,
        debug: {
          statusText: notionError.statusText || 'Unknown',
          hasApiKey: !!NOTION_API_KEY,
          hasDatabaseId: !!process.env.NOTION_DATABASE_LIFEPHOTOS_ID
        }
      });
    }
  } catch (error) {
    console.error('[照片列表API] 处理错误:', error);
    console.error('[照片列表API] 错误堆栈:', error.stack);
    return handleError(res, error);
  }
}

// 数据库API处理器
async function handleDatabaseApi(req, res) {
  try {
    // 如果是获取数据库信息
    if (req.method === 'POST' && req.body && req.body.databaseId) {
      const { databaseId } = req.body;
      
      // 获取数据库详情
      const database = await notion.databases.retrieve({
        database_id: databaseId
      });
      
      return res.status(200).json({
        database,
        properties: database.properties
      });
    } 
    // 如果是获取数据库列表
    else {
      // 获取所有数据库
      const response = await notion.search({
        filter: {
          property: 'object',
          value: 'database'
        }
      });
      
      const databases = response.results.map(db => ({
        id: db.id,
        title: db.title.map(t => t.plain_text).join(''),
        created_time: db.created_time,
        last_edited_time: db.last_edited_time
      }));
      
      return res.status(200).json({
        databases,
        total: databases.length
      });
    }
  } catch (error) {
    return handleError(res, error);
  }
}

// 清除缓存API处理器
async function handleClearCacheApi(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: true,
        message: "清除缓存API仅支持POST方法"
      });
    }
    
    // 这里实际上不需要做任何事情，因为Vercel Functions是无状态的
    // 每次调用都会创建一个新的实例
    
    return res.status(200).json({
      message: "缓存已清除",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return handleError(res, error);
  }
} 